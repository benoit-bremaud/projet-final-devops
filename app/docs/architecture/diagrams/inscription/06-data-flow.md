# Diagramme de flux de données — inscription — circulation et PII

> **Feature** : Projet Individuel 2
> **Statut** : validé (2026-06-18)

## Context

Circulation des données entre le visiteur / l'administrateur, le front, l'API et la
base, avec marquage des éléments sensibles : PII (données personnelles) et secrets
(mot de passe, JWT). Met en évidence les frontières de confiance et les flux à
protéger. Complète 05-class (structure) et 04-component (déploiement).

## Diagramme

```mermaid
flowchart LR
  Visiteur(("Visiteur"))
  Admin(("Administrateur"))

  subgraph NAV["Navigateur (non fiable)"]
    Front["Front React<br/>api.js (unique sortie reseau)"]
  end

  subgraph SRV["Serveur API (FastAPI, HTTPS)"]
    API["Validation + Auth + Projection"]
  end

  subgraph BDD["Donnees au repos"]
    DB[("MySQL<br/>utilisateur / admin")]
  end

  Visiteur -->|"saisie formulaire «PII»"| Front
  Front -->|"POST /inscrits «PII» (HTTPS, JSON)"| API
  API -->|"INSERT parametre «PII»"| DB

  Visiteur -->|"GET /inscrits"| Front
  API -->|"liste reduite (nom, prenom, ville), sans PII"| Front

  Admin -->|"identifiants «secret»"| Front
  Front -->|"POST /auth/login «secret» (HTTPS)"| API
  API -->|"JWT «secret» (Bearer)"| Front
  Admin -->|"GET /inscrits/admin (Bearer)"| Front
  API -->|"liste complete «PII»"| Front
  Admin -->|"DELETE /inscrits/{id} (Bearer)"| Front

  linkStyle 0,1,2,9 stroke:#c0392b,stroke-width:2px
  linkStyle 5,6,7 stroke:#e67e22,stroke-width:2px
```

## Notes

- Tags : `«PII»` = email, dateNaissance, codePostal ; `«secret»` = mot de passe + JWT.
  Rouge = flux porteur de PII, orange = flux porteur de secret.
- PII **en transit** : HTTPS (Pages vers Vercel). PII **au repos** : MySQL (conteneur
  en dev/CI, AlwaysData en prod), accès uniquement par requêtes paramétrées.
- La réponse publique (`GET /inscrits`) ne porte **aucune PII** : c'est la projection
  `InscritPublic` (cf. 05-class).
- Voir aussi : 04 (déploiement Pages / Vercel / AlwaysData), ADR 0002 (gestion du
  secret JWT).
