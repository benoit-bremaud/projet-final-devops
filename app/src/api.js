import axios from 'axios';

// URL de base de l'API, injectee via variable d'environnement (REACT_APP_API_URL).
// On centralise ici toutes les sorties reseau du front : frontiere unique, testable
// (mock d'axios).
const API_URL = process.env.REACT_APP_API_URL;

/**
 * Recupere la liste publique reduite des inscrits (nom, prenom, ville).
 * @returns {Promise<object[]>} Le tableau des inscrits (infos reduites).
 */
export const fetchRegistrants = async () => {
  try {
    const response = await axios.get(`${API_URL}/inscrits`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Cree un inscrit via l'API.
 * @param {object} registrant - Les donnees du formulaire (6 champs).
 * @returns {Promise<object>} La reponse de l'API (ex: { id }).
 */
export const createRegistrant = async (registrant) => {
  try {
    const response = await axios.post(`${API_URL}/inscrits`, registrant);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Authentifie l'administrateur et recupere un jeton JWT.
 * @param {string} email - Email administrateur.
 * @param {string} password - Mot de passe administrateur.
 * @returns {Promise<object>} { access_token, token_type }.
 */
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Recupere la liste complete des inscrits (avec PII), reservee a l'admin.
 * @param {string} token - Jeton JWT de l'administrateur.
 * @returns {Promise<object[]>} Le tableau complet des inscrits.
 */
export const fetchRegistrantsAdmin = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/inscrits/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * Supprime un inscrit (operation protegee par le jeton admin).
 * @param {number} id - Identifiant de l'inscrit a supprimer.
 * @param {string} token - Jeton JWT de l'administrateur.
 * @returns {Promise<void>}
 */
export const deleteRegistrant = async (id, token) => {
  try {
    await axios.delete(`${API_URL}/inscrits/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};
