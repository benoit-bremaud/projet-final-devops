# Projet Individuel 2 - Inscription full-stack (Ynov CI/CD)

![CI/CD](https://github.com/benoit-bremaud/projet-individuel-2-inscription/actions/workflows/ci-cd.yml/badge.svg)
[![codecov](https://codecov.io/gh/benoit-bremaud/projet-individuel-2-inscription/branch/main/graph/badge.svg)](https://app.codecov.io/gh/benoit-bremaud/projet-individuel-2-inscription)

Application d'inscription full-stack dockerisée (MySQL / Adminer / FastAPI / React).
Le formulaire React persiste en base de données (a la place du `localStorage`), affiche
la liste publique reduite des inscrits, et propose un espace administrateur (JWT) pour
voir les informations privees et supprimer un inscrit.

## Fonctionnalites

- Formulaire d'inscription (6 champs) valide cote client **et** cote serveur.
- Persistance en **base MySQL** (POST `/inscrits`).
- **Liste publique reduite** (nom / prenom / ville), sans donnees personnelles.
- **Espace admin** : connexion JWT, vue complete avec PII (`/inscrits/admin`),
  suppression d'un inscrit (confirmation + message de succes).
- **Administrateur seede au fresh init** de la base via variables d'environnement
  (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), mot de passe hache en bcrypt.

## Architecture (Docker Compose, 4 services)

| Service   | Role                                   | Port hote |
|-----------|----------------------------------------|-----------|
| `db`      | MySQL 9.x (donnees)                    | 3307      |
| `adminer` | Console web de la base                 | 8080      |
| `api`     | Backend FastAPI partage (ASGI)         | 8000      |
| `webapp`  | Front React (CRA)                      | 3000      |

Le backend `backend/app/` est partage : servi par uvicorn en Docker et par Vercel
(`api/index.py`) en production.

## Lancer en local

Prerequis : Docker.

```bash
cd docker-mysql
cp .env.example .env      # valeurs de dev (a adapter)
docker compose up -d --build --wait
```

- Front : http://localhost:3000
- API (Swagger) : http://localhost:8000/docs
- Adminer : http://localhost:8080

## Tests

| Type                 | Outil                | Commande                                                        | Couverture |
|----------------------|----------------------|-----------------------------------------------------------------|------------|
| Unitaires + integration back | pytest       | `cd backend && pip install -r app/requirements-dev.txt && TEST_MYSQL_PORT=3307 pytest --cov=app` | **100 %**  |
| Unitaires + integration front | Jest / RTL  | `npm ci && npm test`                                            | **100 %**  |
| Infrastructure       | bash                 | `bash docker-mysql/scripts/infra-tests.sh`                      | -          |
| End-to-end           | Cypress              | `npx cypress run` (online) / `CYPRESS_offline=true npx cypress run` (offline) | - |

Les couvertures back et front sont remontees sur **Codecov** a chaque execution CI.

## Pipeline CI/CD (GitHub Actions)

Workflow unique `.github/workflows/ci-cd.yml` :

1. `front-tests` : tests front + upload couverture Codecov.
2. `back-tests` : tests back (service MySQL) + upload couverture Codecov.
3. `e2e` : `docker compose up` -> tests d'infra -> Cypress online puis offline.
4. `deploy-back` : deploiement du backend sur **Vercel** (push `main`).
5. `deploy-front` : build (jsdoc + CRA) et deploiement sur **GitHub Pages**.
6. `publish-images` : publication des images front et back sur **Docker Hub**.

La base MySQL de production est hebergee sur **Aiven** (TLS requis) ; les secrets sont
configures cote GitHub Actions et cote Vercel (jamais en clair dans le depot).

## Deploiement en ligne

- Front (GitHub Pages) : https://benoit-bremaud.github.io/projet-individuel-2-inscription/
- Back (Vercel) : https://projet-individuel-2-inscription.vercel.app
- Image Docker front : https://hub.docker.com/r/beniot/projet-ind-2-inscription-frontend
- Image Docker back : https://hub.docker.com/r/beniot/projet-ind-2-inscription-backend
- Couverture (Codecov) : https://app.codecov.io/gh/benoit-bremaud/projet-individuel-2-inscription

## Structure du depot

```text
backend/app/        backend FastAPI (config, db, securite, seed, schemas, routes)
backend/tests/      tests pytest (unitaires + integration)
src/                front React (App, api, validators) + tests
docker-mysql/       docker-compose, Dockerfiles, migrations SQL, tests d'infra
cypress/e2e/        tests end-to-end
api/index.py        point d'entree ASGI pour Vercel
docs/architecture/  diagrammes UML (Mermaid) et ADR
```
