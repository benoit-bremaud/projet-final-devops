# Diagramme de composants — inscription — structure et déploiement

> **Feature** : Projet Individuel 2
> **Statut** : validé (2026-06-18)

## Context

Structure du système (modules, dépendances, point de sortie réseau) et topologie de
déploiement (GitHub Pages / Vercel / AlwaysData). Répond à "comment c'est structuré",
pas à "qui veut quoi" (voir `01-use-case.md`).

## Diagramme

```mermaid
flowchart LR
  subgraph FRONT["Frontend React — src/ (deploye sur GitHub Pages)"]
    direction TB
    App["App (vue publique + espace admin)"]
    Form["RegistrationForm"]
    PubList["PublicList (infos reduites)"]
    AdminPanel["AdminPanel (login + liste complete + delete)"]
    ApiClient["api.js (client HTTP, unique sortie reseau)"]
    App --> Form
    App --> PubList
    App --> AdminPanel
    Form --> ApiClient
    PubList --> ApiClient
    AdminPanel --> ApiClient
  end

  subgraph BACK["Backend FastAPI — backend/app/ (partage Docker + Vercel)"]
    direction TB
    Main["main.py (app + CORS + lifespan seed)"]
    RInscrits["routes/inscrits.py"]
    RAuth["routes/auth.py"]
    Security["security.py (bcrypt + JWT)"]
    Seed["seed.py (UPSERT admin au boot)"]
    Db["db.py (requetes parametrees)"]
    Main --> RInscrits
    Main --> RAuth
    Main --> Seed
    RInscrits --> Db
    RInscrits --> Security
    RAuth --> Security
    RAuth --> Db
    Seed --> Security
    Seed --> Db
  end

  subgraph ENTRY["Points d'entree ASGI (importent la meme app)"]
    Uvicorn["docker-mysql/api (uvicorn, dev/CI)"]
    Vercel["api/index.py (@vercel/python, prod)"]
  end

  subgraph DATA["Donnees"]
    MySQL[("MySQL — conteneur (dev/CI) / AlwaysData (prod)")]
    Adminer["Adminer (dev uniquement)"]
  end

  ApiClient -->|"HTTP REST (JSON, JWT Bearer)"| Main
  Uvicorn -->|"importe backend.app.main:app"| Main
  Vercel -->|"importe backend.app.main:app"| Main
  Db --> MySQL
  Adminer --> MySQL
```

## Notes

- Une seule sortie réseau côté front (`api.js`) : frontière explicite et testable.
- Backend partagé importé par deux entrées ASGI (uvicorn Docker + `api/index.py`
  Vercel) : zéro duplication de logique.
- `security.py` centralise bcrypt + JWT (réutilisé par auth, routes protégées, seed).
- Même base logique, deux hébergements : conteneur MySQL en dev/CI, AlwaysData en prod.
