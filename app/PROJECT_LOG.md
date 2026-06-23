# PROJECT_LOG — Projet Individuel 2 (Ynov CI/CD)

Journal de bord chronologique (entrée la plus récente en haut), en complément de
`git log`.

## 2026-06-18 — Étape C livrée, audit des tests et durcissement ciblé

- **En ligne et fonctionnel** : back sur Vercel, front sur GitHub Pages, MySQL de prod
  sur **Aiven** (TLS), images front et back publiées sur **Docker Hub**, couverture sur
  **Codecov**. Pipeline CI/CD verte (tests + infra + e2e + déploiements). `rendu.txt`
  rempli (6 liens, tous 200). Admin seedé sur Aiven (`loise.fenoll@ynov.com`).
- **UI / UX** : thème « retro-diner » (inspiré du projet breakfast-battle), tableau admin
  responsive (scroll horizontal), **confirmation de suppression** + **toast vert de
  succès**, message clair sur email déjà inscrit (409).
- **Couverture 100 %** back ET front (UT + IT + cas happy/sad/edge).
- **Audit multi-agents des tests** (5 dimensions, 42 findings dédupliqués). Décisions,
  vu qu'il s'agit d'un devoir déjà conforme :
  - **Retenu (corrigé + testé)** : règle des **18 ans imposée côté serveur** (défense en
    profondeur, contournable avant), **effacement de l'erreur de champ à la correction**
    (bug UX), **`max_length`** sur les champs (évite un 500 DataError).
  - **Dette assumée (documentée, non traitée)** : e2e plus « honnêtes » (parcours admin,
    stratégie offline réelle, doublon email en e2e), sécurité CI (Gitleaks/CodeQL/
    dependency-review), smoke test post-déploiement, garde JWT `sub`/`exp`, rate-limiting
    login, a11y (aria), normalisation email, `extra='forbid'`. Hors périmètre note.

## 2026-06-18 — Étapes A et B : app dockerisée + tests

- **Étape A (PR #2, mergée)** : app full-stack dockerisée. Backend FastAPI partagé
  `backend/app/` (POST/GET `/inscrits`, GET `/inscrits/admin`, POST `/auth/login`,
  DELETE) avec seed admin bcrypt au boot (UPSERT idempotent) et JWT HS256. Front React
  repointé sur `/inscrits` + espace admin (login, liste complète, suppression).
  Migrations SQL (`utilisateur` étendue date_naissance/ville/code_postal + table
  `admin`). Stack Docker 4 services healthy (projet `projet-ind-2-inscription`). Tests
  Jest à jour (43 verts).
- **Étape B (branche `test/projet-ind-2-tests`)** : tests back pytest (UT bcrypt/JWT/
  schemas + IT endpoints contre une base de test `ynov_ci_test`, couverture `--cov`) ;
  Cypress online/offline (`Cypress.env('offline')`) ; tests d'infra
  `docker-mysql/scripts/infra-tests.sh` (4 conteneurs healthy + smoke HTTP). Liste
  publique réduite affichée dans le front. Port 3306 exposé pour les IT.
- **Étape C (PR #3, cette PR)** : pipeline CI/CD GitHub Actions (UT+IT, infra, e2e
  Cypress, déploiement back Vercel + front GitHub Pages + images Docker Hub, couverture
  Codecov). MySQL de prod sur **Aiven** (et non AlwaysData).

## 2026-06-18 — Phase 0 UML terminée, PR docs ouverte

- Diagrammes complétés sous `docs/architecture/diagrams/inscription/` : `05-class.md`
  (classes Inscrit / InscritPublic / Administrateur, champs publics vs privés, marquage
  PII) et `06-data-flow.md` (frontières de confiance et flux PII / secret).
  `04-component.md` revalidé (statut « brouillon » passé à « validé »).
- 3 ADR ajoutés sous `docs/architecture/decisions/` : `0001` seed admin au démarrage de
  l'API (bcrypt + UPSERT idempotent via variables d'env), `0002` auth JWT HS256 +
  bcrypt, `0003` backend FastAPI partagé importé par deux entrées ASGI (uvicorn Docker +
  `api/index.py` Vercel).
- Phase 0 (UML d'abord) clôturée. Ouverture de la PR docs sur la branche
  `docs/projet-ind-2-uml-adr`, gate à merger avant la PR 1 (scaffold). Aucun code
  applicatif à ce stade.

## 2026-06-18 — Initialisation du dépôt et cadrage

- Création du dépôt `projet-individuel-2-inscription` (public) et premier commit
  (`chore(projet-ind-2): initialise le depot`, `27a1449`).
- Objectif : app d'inscription full-stack dockerisée (MySQL / Adminer / FastAPI /
  React). Le formulaire persiste en base (au lieu du localStorage) ; liste publique à
  infos réduites ; espace admin (JWT) pour voir les infos privées et supprimer un
  inscrit. Sujet noté 5 × /4 (UT+IT couverture, docker, infra, e2e Cypress,
  pipeline + déploiement en ligne).
- **Cadrage validé :**
  - Repo dédié, à seeder depuis le socle `docker-mysql/` du TP + réutilisation du
    formulaire React (`src/App.js`, `validators.js`, `api.js`, `App.css`, patterns Jest).
  - Auth admin JWT (OAuth2 Bearer), mots de passe bcrypt ; admin seedé au boot de
    l'API via variables d'environnement (UPSERT paramétré, idempotent).
  - Déploiement : front → GitHub Pages, back → Vercel (`@vercel/python`), DB prod →
    AlwaysData.
  - Backend partagé `backend/app/` importé par deux entrées ASGI (uvicorn pour Docker
    et `api/index.py` pour Vercel).
  - Livrables en français, Conventional Commits (scope `projet-ind-2`), branche depuis
    `main` + PR + squash, zéro secret en git.
- **Méthode : UML d'abord.** Phase 0 en cours. Diagrammes esquissés (chat précédent) :
  01 use-case, 02 séquence inscription, 03 séquence auth+suppression, 04 component.
  Restent : 05 class, 06 data-flow, + 3 ADR (seed admin, JWT/bcrypt, backend partagé).
- Plan d'action détaillé (8 PR) conservé hors dépôt (notes de travail locales).
- **Prochaine étape :** finir l'UML (05/06 + ADR), ouvrir la PR docs, puis dérouler les
  PR de build (scaffold → db+backend → frontend → docker → e2e → pipeline → déploiement).
