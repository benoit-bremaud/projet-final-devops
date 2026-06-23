# ADR 0001 — Seed de l'administrateur au démarrage de l'API

> **Feature** : Projet Individuel 2
> **Date** : 2026-06-18

## Statut

Accepté.

## Contexte

Le sujet impose qu'un administrateur soit créé au fresh init de la base, ses
identifiants étant passés en variables d'environnement. Le mécanisme MySQL
`/docker-entrypoint-initdb.d` n'exécute que du SQL pur : il ne peut pas calculer un
hash bcrypt. Stocker un hash directement dans une migration reviendrait à figer un
secret dans le dépôt (rotation impossible, empreinte exposée en clair).

## Décision

La table `admin` est créée en SQL **sans** mot de passe. Au démarrage de FastAPI (hook
de cycle de vie / lifespan), une fonction lit `ADMIN_EMAIL` et `ADMIN_PASSWORD` depuis
l'environnement, calcule un hash **bcrypt**, puis exécute un **UPSERT paramétré**
idempotent sur l'email. Si les variables manquent, le démarrage échoue
(**fail-closed**). La même fonction est réutilisée par l'entrée ASGI Vercel (cf. ADR
0003).

## Conséquences

- Aucun mot de passe en clair au repos, secret jamais commité, requête paramétrée.
- Rejouable à chaque fresh init et idempotent (pas de doublon d'admin).
- Léger couplage entre le démarrage et l'environnement, assumé et rendu explicite par
  le fail-closed.

## Alternatives rejetées

- **INSERT d'un hash pré-calculé en SQL** : secret figé dans le dépôt, rotation
  impossible.
- **Script d'initialisation séparé** : duplication de logique, non partagé avec
  l'entrée Vercel.
