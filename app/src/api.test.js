import axios from 'axios';

import {
  createRegistrant,
  deleteRegistrant,
  fetchRegistrants,
  fetchRegistrantsAdmin,
  login,
} from './api';

// Remplace tout le module axios par des fonctions simulees (jest.fn()).
jest.mock('axios');

const API_URL = 'http://localhost:8000';

describe('api', () => {
  // On masque les console.error attendus (les fonctions loguent avant de
  // relancer) pour garder une sortie de test propre, et on reset les mocks.
  let consoleErrorSpy;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('fetchRegistrants', () => {
    it('retourne la liste publique reduite en cas de succes', async () => {
      const registrants = [{ nom: 'Curie', prenom: 'Marie', ville: 'Paris' }];
      axios.get.mockResolvedValueOnce({ data: registrants });

      await expect(fetchRegistrants()).resolves.toEqual(registrants);
      expect(axios.get).toHaveBeenCalledWith(`${API_URL}/inscrits`);
    });

    it("propage l'erreur en cas d'echec", async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(fetchRegistrants()).rejects.toThrow('Network Error');
    });
  });

  describe('createRegistrant', () => {
    it("cree l'inscrit et retourne la reponse de l'API", async () => {
      const payload = {
        nom: 'Bremaud',
        prenom: 'Benoit',
        email: 'benoit@example.com',
        dateNaissance: '1990-01-01',
        ville: 'Grasse',
        codePostal: '06130',
      };
      axios.post.mockResolvedValueOnce({ data: { id: 11 } });

      await expect(createRegistrant(payload)).resolves.toEqual({ id: 11 });
      expect(axios.post).toHaveBeenCalledWith(`${API_URL}/inscrits`, payload);
    });

    it("propage l'erreur en cas d'echec", async () => {
      axios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(createRegistrant({})).rejects.toThrow('Network Error');
    });
  });

  describe('login', () => {
    it('retourne le jeton en cas de succes', async () => {
      const token = { access_token: 'jwt-token', token_type: 'bearer' };
      axios.post.mockResolvedValueOnce({ data: token });

      await expect(login('admin@example.com', 'secret')).resolves.toEqual(token);
      expect(axios.post).toHaveBeenCalledWith(`${API_URL}/auth/login`, {
        email: 'admin@example.com',
        password: 'secret',
      });
    });

    it("propage l'erreur quand les identifiants sont invalides", async () => {
      axios.post.mockRejectedValueOnce(new Error('Request failed with status code 401'));

      await expect(login('admin@example.com', 'mauvais')).rejects.toThrow('401');
    });
  });

  describe('fetchRegistrantsAdmin', () => {
    it('appelle la route admin avec le jeton Bearer', async () => {
      const full = [
        {
          id: 1,
          nom: 'Curie',
          prenom: 'Marie',
          email: 'marie.curie@ynov.com',
          date_naissance: '1867-11-07',
          ville: 'Paris',
          code_postal: '75005',
        },
      ];
      axios.get.mockResolvedValueOnce({ data: full });

      await expect(fetchRegistrantsAdmin('jwt-token')).resolves.toEqual(full);
      expect(axios.get).toHaveBeenCalledWith(`${API_URL}/inscrits/admin`, {
        headers: { Authorization: 'Bearer jwt-token' },
      });
    });

    it("propage l'erreur en cas d'echec", async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(fetchRegistrantsAdmin('jwt-token')).rejects.toThrow('Network Error');
    });
  });

  describe('deleteRegistrant', () => {
    it('supprime via la route protegee avec le jeton Bearer', async () => {
      axios.delete.mockResolvedValueOnce({ status: 204 });

      await expect(deleteRegistrant(5, 'jwt-token')).resolves.toBeUndefined();
      expect(axios.delete).toHaveBeenCalledWith(`${API_URL}/inscrits/5`, {
        headers: { Authorization: 'Bearer jwt-token' },
      });
    });

    it("propage l'erreur en cas d'echec", async () => {
      axios.delete.mockRejectedValueOnce(new Error('Network Error'));

      await expect(deleteRegistrant(5, 'jwt-token')).rejects.toThrow('Network Error');
    });
  });
});
