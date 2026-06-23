# Diagramme de séquence — inscription — UC4 + UC5 (auth admin + suppression)

> **Feature** : Projet Individuel 2
> **Réalise** : UC4 et UC5 (voir `01-use-case.md`)

## Context

Flux sécurisé : authentification admin (émission JWT) puis suppression d'un inscrit
(opération protégée par le token). Diagramme produit car le flux traverse plusieurs
composants, manipule un secret et comporte des branches d'autorisation.

## Diagramme

```mermaid
sequenceDiagram
  actor A as Administrateur
  participant F as Front React
  participant API as API FastAPI
  participant DB as MySQL

  Note over A,DB: Phase 1 - Authentification (UC4)
  A->>F: Saisit email + mot de passe
  F->>API: POST /auth/login (email, password)
  API->>DB: SELECT admin parametre WHERE email
  DB-->>API: hash stocke
  API->>API: Compare via bcrypt
  alt Identifiants invalides
    API-->>F: 401 Unauthorized
    F-->>A: "Identifiants invalides"
  else Identifiants valides
    API->>API: Genere un JWT signe
    API-->>F: 200 (token JWT)
    F->>F: Stocke le token
  end

  Note over A,DB: Phase 2 - Suppression (UC5, precondition: JWT valide)
  A->>F: Selectionne un inscrit et confirme
  F->>API: DELETE /inscrits/{id} (Authorization: Bearer token)
  API->>API: Verifie le JWT
  alt Token absent ou expire
    API-->>F: 401 Unauthorized
    F-->>A: Acces refuse
  else Token valide
    API->>DB: DELETE parametre WHERE id
    alt Inscrit inexistant
      DB-->>API: 0 ligne affectee
      API-->>F: 404 Not Found
      F-->>A: "Inscrit introuvable"
    else Suppression OK
      DB-->>API: Ligne supprimee
      API-->>F: 204 No Content
      F-->>A: Maj de la liste
    end
  end
```

## Notes

- Le mot de passe n'est jamais comparé en clair : bcrypt sur le hash stocké.
- Chaque opération protégée revérifie le JWT (autorisation côté serveur).
- Suppression par requête paramétrée ; 404 si l'id n'existe pas.
