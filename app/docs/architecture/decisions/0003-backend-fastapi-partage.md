# ADR 0003 — Backend FastAPI partagé, deux entrées ASGI

> **Feature** : Projet Individuel 2
> **Date** : 2026-06-18

## Statut

Accepté.

## Contexte

La même logique backend doit s'exécuter en **Docker** (développement et CI) et sur
**Vercel** (production via `@vercel/python`). Maintenir deux implémentations
entraînerait un drift inévitable entre dev et prod.

## Décision

Le cœur applicatif vit dans `backend/app/` et est importé par **deux entrées ASGI** :
uvicorn (image Docker) et `api/index.py` (`@vercel/python`), toutes deux via
`from backend.app.main import app`. Le contexte de build Docker est placé à la
**racine** du dépôt pour inclure `backend/`.

## Conséquences

- Zéro duplication de logique, parité dev / prod, une seule suite de tests pytest.
- Image Docker un peu plus large (contexte racine).
- Le chemin d'import partagé (`backend.app.main`) doit rester stable.

## Alternatives rejetées

- **Deux bases de code** (une Docker, une Vercel) : drift garanti.
- **Package Python publié et partagé** : sur-ingénierie pour ce périmètre.
