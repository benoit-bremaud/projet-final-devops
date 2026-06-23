import './App.css';

import { useEffect, useState } from 'react';

import {
  createRegistrant,
  deleteRegistrant,
  fetchRegistrants,
  fetchRegistrantsAdmin,
  login,
} from './api';
import { isPlausibleBirthDate, isValidEmail, isValidName, isValidPostalCode } from './validators';

/**
 * Initial (empty) form state, also used to reset the form after a successful submit.
 * @type {object}
 */
export const EMPTY_FORM = {
  nom: '',
  prenom: '',
  email: '',
  dateNaissance: '',
  ville: '',
  codePostal: '',
};

/**
 * User-facing validation error messages keyed by field name.
 * @type {object}
 */
export const ERROR_MESSAGES = {
  nom: 'Nom invalide',
  prenom: 'Prénom invalide',
  email: 'Email invalide',
  dateNaissance: 'Vous devez avoir au moins 18 ans',
  ville: 'Ville invalide',
  codePostal: 'Code postal invalide (5 chiffres attendus)',
};

const TOAST_DURATION_MS = 3000;
const VALIDATION_ERROR = 'Le formulaire contient des erreurs.';
const NETWORK_ERROR = 'Erreur reseau, reessayez plus tard.';
const DUPLICATE_ERROR = 'Cet email est déjà inscrit.';
const LOGIN_ERROR = 'Identifiants invalides.';
const SUCCESS_CREATE = 'Inscription réussie !';
const SUCCESS_DELETE = 'Suppression réussie !';
const DELETE_CONFIRM = 'Confirmer la suppression de cet inscrit ?';
const TOKEN_KEY = 'adminToken';

/**
 * Validates a registration form and returns an errors object.
 * @param {object} form - Form values keyed by field name.
 * @returns {object} Errors keyed by field name; empty object means valid.
 */
export function validateForm(form) {
  const errors = {};
  if (!isValidName(form.nom)) {
    errors.nom = ERROR_MESSAGES.nom;
  }
  if (!isValidName(form.prenom)) {
    errors.prenom = ERROR_MESSAGES.prenom;
  }
  if (!isValidEmail(form.email)) {
    errors.email = ERROR_MESSAGES.email;
  }
  if (!form.dateNaissance || !isPlausibleBirthDate(new Date(form.dateNaissance))) {
    errors.dateNaissance = ERROR_MESSAGES.dateNaissance;
  }
  if (!isValidName(form.ville)) {
    errors.ville = ERROR_MESSAGES.ville;
  }
  if (!isValidPostalCode(form.codePostal)) {
    errors.codePostal = ERROR_MESSAGES.codePostal;
  }
  return errors;
}

/**
 * Registration form + admin space.
 *
 * Public part: a controlled registration form (6 fields) validated client-side via
 * {@link validateForm} and persisted through {@link createRegistrant}; the public
 * registrant count is loaded on mount with {@link fetchRegistrants}.
 *
 * Admin part (hidden until requested): a login form that obtains a JWT via
 * {@link login}, then the full registrant list ({@link fetchRegistrantsAdmin}) with a
 * delete action ({@link deleteRegistrant}). The token lives in sessionStorage.
 *
 * @component
 * @returns {JSX.Element} The application UI.
 */
export function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [registrants, setRegistrants] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  // Bumped on every error so the auto-hide timer restarts even when the error
  // toast is already visible (repeated failing submits within the duration).
  const [errorNonce, setErrorNonce] = useState(0);

  // Espace admin.
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [adminList, setAdminList] = useState([]);

  // Charge la liste publique reduite depuis l'API au montage.
  const loadPublicList = () =>
    fetchRegistrants()
      .then(setRegistrants)
      .catch(() => {
        // Erreur reseau au chargement : on garde une liste vide.
      });

  useEffect(() => {
    loadPublicList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timerId = setTimeout(() => setSuccessMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(timerId);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) return undefined;
    const timerId = setTimeout(() => setErrorMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(timerId);
  }, [errorMessage, errorNonce]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Efface l'erreur du champ des que l'utilisateur le corrige.
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const showError = (message) => {
    setSuccessMessage(null);
    setErrorMessage(message);
    setErrorNonce((n) => n + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm(form);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showError(VALIDATION_ERROR);
      return;
    }

    try {
      await createRegistrant(form);
      setRegistrants((current) => [
        ...current,
        { nom: form.nom, prenom: form.prenom, ville: form.ville },
      ]);
      setForm(EMPTY_FORM);
      setErrorMessage(null);
      setSuccessMessage(SUCCESS_CREATE);
    } catch (error) {
      // 409 = email deja inscrit (contrainte d'unicite cote API), sinon erreur reseau.
      showError(error?.response?.status === 409 ? DUPLICATE_ERROR : NETWORK_ERROR);
    }
  };

  const loadAdminList = async (authToken) => {
    try {
      const registrants = await fetchRegistrantsAdmin(authToken);
      setAdminList(registrants);
    } catch {
      // Jeton invalide ou expire : on deconnecte proprement.
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setAdminList([]);
      showError(NETWORK_ERROR);
    }
  };

  // Si un jeton est present au montage, on charge la liste complete.
  useEffect(() => {
    if (token) {
      loadAdminList(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { access_token: accessToken } = await login(loginEmail, loginPassword);
      sessionStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      setShowLogin(false);
      setLoginPassword('');
      loadAdminList(accessToken);
    } catch {
      showError(LOGIN_ERROR);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAdminList([]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(DELETE_CONFIRM)) {
      return;
    }
    try {
      await deleteRegistrant(id, token);
      loadAdminList(token);
      loadPublicList();
      setErrorMessage(null);
      setSuccessMessage(SUCCESS_DELETE);
    } catch {
      showError(NETWORK_ERROR);
    }
  };

  const isFormIncomplete = Object.values(form).some((value) => !value);

  return (
    <div className="App">
      <h1>Inscription</h1>

      {successMessage && (
        <div role="alert" className="toast">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="toast toast--error">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="nom">Nom</label>
          <input id="nom" name="nom" type="text" value={form.nom} onChange={handleChange} />
          {errors.nom && <span className="error">{errors.nom}</span>}
        </div>

        <div>
          <label htmlFor="prenom">Prénom</label>
          <input id="prenom" name="prenom" type="text" value={form.prenom} onChange={handleChange} />
          {errors.prenom && <span className="error">{errors.prenom}</span>}
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        <div>
          <label htmlFor="dateNaissance">Date de naissance</label>
          <input id="dateNaissance" name="dateNaissance" type="date" value={form.dateNaissance} onChange={handleChange} />
          {errors.dateNaissance && <span className="error">{errors.dateNaissance}</span>}
        </div>

        <div>
          <label htmlFor="ville">Ville</label>
          <input id="ville" name="ville" type="text" value={form.ville} onChange={handleChange} />
          {errors.ville && <span className="error">{errors.ville}</span>}
        </div>

        <div>
          <label htmlFor="codePostal">Code postal</label>
          <input id="codePostal" name="codePostal" type="text" value={form.codePostal} onChange={handleChange} />
          {errors.codePostal && <span className="error">{errors.codePostal}</span>}
        </div>

        <button type="submit" disabled={isFormIncomplete}>
          S'inscrire
        </button>
      </form>

      <p>{registrants.length} inscrit(s)</p>

      <ul className="public-list">
        {registrants.map((inscrit, index) => (
          <li key={index}>
            {inscrit.nom} {inscrit.prenom}
            {inscrit.ville ? ` (${inscrit.ville})` : ''}
          </li>
        ))}
      </ul>

      <section className="admin">
        {!token && !showLogin && (
          <button type="button" onClick={() => setShowLogin(true)}>
            Espace admin
          </button>
        )}

        {!token && showLogin && (
          <form onSubmit={handleLogin} noValidate className="admin-login">
            <h2>Connexion administrateur</h2>
            <div>
              <label htmlFor="adminEmail">Email administrateur</label>
              <input
                id="adminEmail"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="adminPassword">Mot de passe</label>
              <input
                id="adminPassword"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit">Se connecter</button>
            <button type="button" onClick={() => setShowLogin(false)}>
              Annuler
            </button>
          </form>
        )}

        {token && (
          <div className="admin-panel">
            <h2>Espace administrateur</h2>
            <button type="button" onClick={handleLogout}>
              Se deconnecter
            </button>
            <div className="table-wrap">
              <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Date de naissance</th>
                  <th>Ville</th>
                  <th>Code postal</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminList.map((inscrit) => (
                  <tr key={inscrit.id}>
                    <td>{inscrit.nom}</td>
                    <td>{inscrit.prenom}</td>
                    <td>{inscrit.email}</td>
                    <td>{inscrit.date_naissance}</td>
                    <td>{inscrit.ville}</td>
                    <td>{inscrit.code_postal}</td>
                    <td>
                      <button type="button" onClick={() => handleDelete(inscrit.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <footer className="app-footer">
        <a
          href={`${process.env.PUBLIC_URL}/docs/index.html`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Documentation
        </a>
      </footer>
    </div>
  );
}
