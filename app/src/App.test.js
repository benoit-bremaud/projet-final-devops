import { act, fireEvent, render, screen } from '@testing-library/react';

import { App, validateForm } from './App';
import { createRegistrant, fetchRegistrants } from './api';

// On simule tout le module API : les tests du composant ne font aucun appel
// reseau, on pilote les retours (succes / erreur) au cas par cas.
jest.mock('./api');

beforeEach(() => {
  // Defauts : aucun inscrit au montage, creation qui reussit.
  fetchRegistrants.mockResolvedValue([]);
  createRegistrant.mockResolvedValue({ id: 11 });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

/**
 * Renders the App and flushes the mount effect (fetchRegistrants) so the count
 * is settled and no act(...) warning is raised.
 */
async function renderApp() {
  render(<App />);
  await act(async () => {});
}

function fillFormWithValidValues() {
  fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Bremaud' } });
  fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Benoit' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'benoit@example.com' } });
  fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1981-05-22' } });
  fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Grasse' } });
  fireEvent.change(screen.getByLabelText('Code postal'), { target: { value: '06130' } });
}

function fillFormWithInvalidValues() {
  fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Jean123' } });
  fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Marie@' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'plop' } });
  fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '2020-01-01' } });
  fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Paris1' } });
  fireEvent.change(screen.getByLabelText('Code postal'), { target: { value: '1234' } });
}

describe('happy path', () => {
  describe('App component', () => {
    test('renders all form fields with their labels', async () => {
      await renderApp();

      expect(screen.getByLabelText('Nom')).toBeInTheDocument();
      expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Date de naissance')).toBeInTheDocument();
      expect(screen.getByLabelText('Ville')).toBeInTheDocument();
      expect(screen.getByLabelText('Code postal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeInTheDocument();
    });

    test('exposes a link to the documentation', async () => {
      await renderApp();

      const docLink = screen.getByRole('link', { name: /documentation/i });
      expect(docLink).toBeInTheDocument();
      expect(docLink).toHaveAttribute('href', '/docs/index.html');
    });

    test('submit button becomes enabled once every field is filled', async () => {
      await renderApp();
      fillFormWithValidValues();

      expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeEnabled();
    });

    test('loads the registrant count from the API on mount', async () => {
      fetchRegistrants.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await renderApp();

      expect(fetchRegistrants).toHaveBeenCalledTimes(1);
      expect(screen.getByText('2 inscrit(s)')).toBeInTheDocument();
    });

    test('submits a valid form: posts it, shows the toast, resets fields, increments the count', async () => {
      await renderApp();
      fillFormWithValidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });

      // 1) The form was posted to the API with the entered values.
      expect(createRegistrant).toHaveBeenCalledWith({
        nom: 'Bremaud',
        prenom: 'Benoit',
        email: 'benoit@example.com',
        dateNaissance: '1981-05-22',
        ville: 'Grasse',
        codePostal: '06130',
      });

      // 2) Success toast is visible.
      expect(screen.getByRole('alert')).toHaveTextContent(/inscription réussie/i);

      // 3) Form fields are reset to empty.
      expect(screen.getByLabelText('Nom')).toHaveValue('');
      expect(screen.getByLabelText('Email')).toHaveValue('');

      // 4) The count went from 0 to 1.
      expect(screen.getByText('1 inscrit(s)')).toBeInTheDocument();
    });

    test('hides the success toast after the configured duration', async () => {
      jest.useFakeTimers();
      render(<App />);
      await act(async () => {});
      fillFormWithValidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validateForm', () => {
    test('returns an empty errors object when the form is valid', () => {
      const validForm = {
        nom: 'Bremaud',
        prenom: 'Benoit',
        email: 'benoit@example.com',
        dateNaissance: '1981-05-22',
        ville: 'Grasse',
        codePostal: '06130',
      };

      expect(validateForm(validForm)).toEqual({});
    });
  });
});

describe('sad path', () => {
  describe('App component', () => {
    test('submit button is disabled when the form is empty', async () => {
      await renderApp();

      expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeDisabled();
    });

    test('displays an error message under each field when submitted with invalid values', async () => {
      await renderApp();
      fillFormWithInvalidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });

      const expectedErrors = [
        'Nom invalide',
        'Prénom invalide',
        'Email invalide',
        'Vous devez avoir au moins 18 ans',
        'Ville invalide',
        'Code postal invalide (5 chiffres attendus)',
      ];

      for (const message of expectedErrors) {
        const errorElement = screen.getByText(message);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveClass('error');
      }
      // A failed validation never reaches the API.
      expect(createRegistrant).not.toHaveBeenCalled();
    });

    test('shows an error toast on invalid submit and hides it after the duration', async () => {
      jest.useFakeTimers();
      render(<App />);
      await act(async () => {});
      fillFormWithInvalidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });

      const toast = screen.getByRole('alert');
      expect(toast).toHaveTextContent(/le formulaire contient des erreurs/i);
      expect(toast).toHaveClass('toast--error');

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('shows a network error toast and keeps the count when the API rejects', async () => {
      createRegistrant.mockRejectedValueOnce(new Error('Network Error'));

      await renderApp();
      fillFormWithValidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('toast--error');
      expect(toast).toHaveTextContent(/erreur reseau/i);
      // The count stays at 0 since the creation failed.
      expect(screen.getByText('0 inscrit(s)')).toBeInTheDocument();
    });

    test('shows a duplicate-email error toast when the API returns 409', async () => {
      createRegistrant.mockRejectedValueOnce({ response: { status: 409 } });

      await renderApp();
      fillFormWithValidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('toast--error');
      expect(toast).toHaveTextContent(/déjà inscrit/i);
    });

    test('clears a field error as soon as the user corrects it', async () => {
      await renderApp();
      fillFormWithInvalidValues();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
      });
      expect(screen.getByText('Nom invalide')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Bremaud' } });

      expect(screen.queryByText('Nom invalide')).not.toBeInTheDocument();
    });

    test('keeps the count at 0 when the mount fetch fails', async () => {
      fetchRegistrants.mockRejectedValueOnce(new Error('Network Error'));

      await renderApp();

      expect(screen.getByText('0 inscrit(s)')).toBeInTheDocument();
    });
  });

  describe('validateForm', () => {
    test('returns errors for every field when the form is empty', () => {
      const emptyForm = {
        nom: '',
        prenom: '',
        email: '',
        dateNaissance: '',
        ville: '',
        codePostal: '',
      };

      expect(validateForm(emptyForm)).toEqual({
        nom: 'Nom invalide',
        prenom: 'Prénom invalide',
        email: 'Email invalide',
        dateNaissance: 'Vous devez avoir au moins 18 ans',
        ville: 'Ville invalide',
        codePostal: 'Code postal invalide (5 chiffres attendus)',
      });
    });

    test('returns the dateNaissance error when the user is under 18', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-07T00:00:00Z'));

      const formWithMinor = {
        nom: 'Bremaud',
        prenom: 'Benoit',
        email: 'benoit@example.com',
        dateNaissance: '2009-05-07',
        ville: 'Grasse',
        codePostal: '06130',
      };

      expect(validateForm(formWithMinor)).toEqual({
        dateNaissance: 'Vous devez avoir au moins 18 ans',
      });
    });
  });
});
