# Diagramme de séquence — inscription — UC1 S'inscrire

> **Feature** : Projet Individuel 2
> **Réalise** : UC1 (voir `01-use-case.md`)

## Context

Flux temporel de l'inscription (front -> API -> MySQL) avec ses branches d'erreur
(validation, réseau, doublon). Diagramme produit car le flux traverse plusieurs
composants et comporte des branches conditionnelles.

## Diagramme

```mermaid
sequenceDiagram
  actor V as Visiteur
  participant F as Front React
  participant API as API FastAPI
  participant DB as MySQL

  V->>F: Remplit le formulaire et clique "S'inscrire"
  F->>F: Validation cliente (validateForm)
  alt Champs invalides
    F-->>V: Affiche les erreurs par champ (rien envoye)
  else Champs valides
    F->>API: POST /inscrits (nom, prenom, email, ...)
    alt Erreur reseau ou serveur
      API-->>F: 5xx / timeout
      F-->>V: Toast "erreur reseau"
    else Email deja inscrit (contrainte UNIQUE)
      API->>DB: INSERT parametre dans utilisateur
      DB-->>API: Violation UNIQUE
      API-->>F: 409 Conflict
      F-->>V: Toast "email deja inscrit"
    else Insertion OK
      API->>DB: INSERT parametre dans utilisateur
      DB-->>API: Ligne creee
      API-->>F: 201 Created
      F-->>V: Toast succes + reset + maj liste
    end
  end
```

## Notes

- L'`INSERT` est paramétré (aucune concaténation SQL).
- Validation des deux côtés : cliente (UX) et serveur (sécurité, allowlist).
- Le doublon repose sur la contrainte `UNIQUE` de la colonne `email`.
