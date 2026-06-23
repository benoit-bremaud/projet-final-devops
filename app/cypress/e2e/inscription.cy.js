// Tests e2e online / offline contre la stack reelle.
//
// Deux passes (cf. pipeline) :
//  - ONLINE  : `cypress run` (sans env) -> parcours reel, l'inscription persiste.
//  - OFFLINE : `CYPRESS_offline=true` -> backend coupe, on attend le toast d'erreur.
// Chaque test se desactive (this.skip()) dans le mode qui n'est pas le sien.

describe('Inscription online / offline', () => {
  function fillForm(suffix) {
    cy.get('#nom').type('Online');
    cy.get('#prenom').type('Test');
    cy.get('#email').type(`e2e.${suffix}@example.com`);
    cy.get('#dateNaissance').type('1990-01-01');
    cy.get('#ville').type('Paris');
    cy.get('#codePostal').type('75001');
  }

  beforeEach(() => {
    cy.visit('/');
  });

  it('inscrit et persiste quand le backend repond (online)', function () {
    if (Cypress.env('offline')) {
      this.skip();
    }
    // Email unique pour eviter le 409 sur des executions repetees.
    fillForm(Date.now());
    cy.contains('button', "S'inscrire").click();
    cy.get('.toast').should('contain', 'Inscription réussie');
  });

  it('affiche un toast erreur reseau quand le backend est coupe (offline)', function () {
    if (!Cypress.env('offline')) {
      this.skip();
    }
    // Filet deterministe : meme si le back est coupe, on force l'echec reseau.
    cy.intercept('POST', '**/inscrits', { forceNetworkError: true }).as('post');
    fillForm('offline');
    cy.contains('button', "S'inscrire").click();
    cy.get('.toast--error').should('contain', 'Erreur reseau');
  });
});
