# ADR 0002 — Authentification admin par JWT (HS256) + bcrypt

> **Feature** : Projet Individuel 2
> **Date** : 2026-06-18

## Statut

Accepté.

## Contexte

L'espace admin protège deux opérations : consulter la liste complète (avec PII) et
supprimer un inscrit. Le backend est déployé en serverless (Vercel) et le front est
servi sur une autre origine (GitHub Pages). Il faut donc une authentification **sans
état serveur**, simple à vérifier à chaque requête.

## Décision

`POST /auth/login` compare le mot de passe fourni au hash stocké via **bcrypt**, puis
émet un **JWT HS256** de courte durée signé par `JWT_SECRET`. Le schéma est **OAuth2
Bearer** : chaque route protégée revérifie le token côté serveur. Le token est conservé
en `sessionStorage` côté front. Le CORS est restreint à une allowlist (origine Pages +
localhost).

## Conséquences

- Stateless, compatible serverless ; autorisation revérifiée à chaque requête.
- Secret (`JWT_SECRET`) en variable d'environnement, jamais commité.
- Pas de révocation côté serveur, mitigée par la courte durée de vie du token.
- `sessionStorage` exposé en cas de XSS ; mitigé par l'absence d'injection (entrées
  validées, sortie React échappée), CSP envisageable ultérieurement.

## Alternatives rejetées

- **Sessions par cookie** : état serveur à maintenir, complications cross-origin /
  SameSite en contexte serverless + Pages.
- **Basic Auth** : identifiants renvoyés à chaque requête, pas de durée de vie.
