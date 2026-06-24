# Compte-rendu — Projet Final DevOps « Zero-Touch »

> **TP** : Industrialisation & Automatisation « Zero-Touch » (M1 CI/CD).
> **Auteur** : `benoit-bremaud` (solo) · **Rendu** : 06/07/2026 · **Région AWS** : `eu-west-3`.
> Document narratif et pédagogique. Pour la vue structurelle (diagrammes UML), voir
> [`architecture/README.md`](architecture/README.md). Pour le contrat d'interface, voir
> [`CONVENTIONS.md`](CONVENTIONS.md).

## 1. Ce qui a été livré (résultat)

Une **pipeline GitHub Actions déclenchée en un clic** (`workflow_dispatch`) qui, sans aucune
intervention manuelle sur le serveur :

1. **construit** les images Docker du front (React) et du back (FastAPI), les **pousse** vers
   un **registre privé** ;
2. **provisionne** une EC2 neuve avec **Terraform** ;
3. **configure** cette EC2 et **déploie** la stack (front + API + MySQL + Adminer) avec **Ansible** ;
4. **valide** automatiquement que le front et l'API répondent.

**Résultat obtenu** : pipeline **verte de bout en bout**, application **accessible** sur l'IP
publique de l'EC2 (`http://<IP>:3000` pour le front, `http://<IP>:8000/docs` pour l'API).
Les trois critères d'évaluation (pipeline verte · app accessible · découpage clair) sont remplis.

## 2. Le problème, en une phrase

Comment passer d'un `git push` à une application **réellement en ligne sur AWS**, **sans qu'aucun
humain ne se connecte en SSH** au serveur, et **sans jamais écrire un seul secret dans le code** ?
Réponse : on fait faire le travail à trois outils — **Terraform** (créer l'infra), **Ansible**
(configurer le serveur), **GitHub Actions** (orchestrer le tout) — et on range tous les secrets
dans les **GitHub Secrets**.

## 3. L'architecture en clair

Deux serveurs AWS, deux rôles bien séparés (détail : diagramme
[03 — composants](architecture/diagrams/zero-touch/03-component.md)) :

| | EC2 #1 — Registre | EC2 #2 — Application |
|---|---|---|
| **Rôle** | **stocke** les images Docker | **exécute** la stack applicative |
| **Durée de vie** | **persistant** (gardé entre les déploiements) | **éphémère** (recréé à chaque run) |
| **Exposé au public** | `443` (HTTPS, via Nginx) | `3000` (front) + `8000` (API) |
| **Fermé** | `5000` (registre interne) | `8080` (Adminer) + `3306` (MySQL) |

Pourquoi séparer ? Le registre est **coûteux à reconstruire** (il contient l'historique des images)
et doit donc **survivre** ; l'application, elle, doit pouvoir être **détruite et recréée à
l'identique** à chaque déploiement — c'est l'« environnement éphémère » exigé par le sujet.

## 4. Le pipeline, étape par étape

Détail temporel : diagramme [02 — séquence](architecture/diagrams/zero-touch/02-sequence-pipeline.md).
En langage simple, un seul job enchaîne :

1. **Build & Push** — `docker build` du front et du back, puis `docker push` vers le registre privé.
   Chaque image porte deux tags : le **SHA du commit** (traçabilité) et `latest`.
2. **Provision** — `terraform apply` dans `infra/` crée l'EC2, une **clé SSH générée à la volée**
   et un **Security Group**. Le `tfstate` reste **local au runner** : l'infra est donc jetable.
3. **Bridge** (le pont) — l'étape délicate : elle transforme les *outputs* Terraform (IP publique,
   clé privée) en **fichiers** qu'Ansible sait lire : `inventory.ini` + `key.pem` (`chmod 600`).
4. **Deploy** — `ansible-playbook` se connecte en SSH (la **seule** connexion SSH, et elle est
   automatique), installe Docker, **se logue au registre**, `docker compose pull` puis `up -d`.
5. **Validate** — `curl` direct du front et de l'API (hors Ansible, exigence du sujet) : si l'un
   ne répond pas, le job **échoue** ; sinon l'**URL d'accès** est affichée dans le résumé du run.

## 5. La gestion des secrets

Détail : diagramme [06 — flux des secrets](architecture/diagrams/zero-touch/06-data-flow-secrets.md).
Principe : **une seule source**, les **GitHub Secrets**. Le code ne contient que des placeholders
(fichier [`.env.sample`](../.env.sample), garde-fou `gitleaks`). Cas particulier : la **clé SSH**
n'existe pas au départ — Terraform la **génère**, la renvoie en *output sensible*, le runner
l'écrit en `key.pem` juste pour Ansible, puis l'infra éphémère disparaît. La clé n'est **jamais**
versionnée.

## 6. Décisions & pièges rencontrés (le cœur du retour d'expérience)

| Problème rencontré | Cause réelle | Solution retenue |
|---|---|---|
| `t2.micro` **refusé** à l'`apply` (« not eligible for Free Tier ») | Sur **ce compte AWS précis**, le type Free Tier éligible est `t3.micro`, pas `t2.micro` — contre-intuitif et contraire à la doc générale | Passé toute l'infra en **`t3.micro`** (vérifié en live : le registre tourne dessus). Leçon : *la réalité du compte prime sur la doc*. |
| Déploiement **bloqué** « Start the stack », SSH injoignable | EC2 `t3.micro` = **1 Go de RAM** ; `npm start` (webpack ~700 Mo) + MySQL saturent la mémoire | Ajout d'un **fichier swap de 2 Go** dans le playbook Ansible. A servi de justification concrète au passage en Option B. |
| Front lourd et fragile au démarrage | Servir un **dev-server** (`npm start`) en production est un anti-pattern (lent, host-check à désactiver) | **Option A** (`npm start`) d'abord pour valider la chaîne, puis **Option B** : build **statique** servi par **nginx** (image multi-stage, démarrage rapide, surface réduite). |
| Front cassé alors que `curl /` renvoyait 200 | Le build statique honorait le champ `homepage` du `package.json` → les assets étaient cherchés sous `/projet-individuel-2-inscription/...` alors que nginx sert la racine → 404 masqué par le fallback SPA | Forcé **`ENV PUBLIC_URL=/`** dans le Dockerfile de build. Bug repéré par la revue de PR. |
| 2ᵉ exécution du pipeline en échec (`InvalidKeyPair.Duplicate`, `InvalidGroup.Duplicate`) | `tfstate` éphémère **+ noms de ressources fixes** → collision avec les ressources du run précédent non détruites | **`name_prefix` / `key_name_prefix`** sur la clé et le Security Group (noms uniques par run). C'est précisément l'« environnement éphémère » du sujet. |
| `Closes #6, #7, #8…` dans la PR n'a fermé **que #6** | GitHub exige le **mot-clé répété** avant **chaque** numéro (`Closes #6, Closes #7…`) | Issues restantes fermées manuellement. Leçon retenue pour les PR suivantes. |

## 7. Comment relancer le déploiement (de zéro)

1. **Pré-requis (une fois)** : déployer l'EC2 #1 registre (voir [`registry/README.md`](../registry/README.md)),
   noter son IP et ses identifiants.
2. **Configurer les GitHub Secrets** listés dans [`.env.sample`](../.env.sample)
   (`Settings > Secrets and variables > Actions`).
3. **GitHub → onglet Actions → workflow `Deploy` → Run workflow.**
4. En fin de run, l'**URL de l'application** s'affiche dans le résumé.
5. **Penser à détruire** les EC2 applicatives orphelines après les tests (coût Free Tier) ;
   l'EC2 #1 registre, elle, doit **rester** en place.

## 8. Correspondance avec les critères d'évaluation

- **Pipeline verte (1 clic)** → §4, diagramme 02, fichier `.github/workflows/deploy.yml`.
- **Application accessible via IP** → §1 et §3, validée par l'étape *Validate* (§4.5).
- **Découpage clair des responsabilités** → §3, structure du dépôt (`registry/`, `infra/`,
  `ansible/`, `app/`), diagramme 03.
- **Zéro secret en dur** → §5, diagramme 06, `.env.sample` + `gitleaks`.

## 9. Pistes d'amélioration (honnêteté technique)

- Remplacer l'`insecure-registries` (certificat auto-signé) par une **vraie autorité de
  certification** (Let's Encrypt) pour supprimer la confiance forcée côté Docker.
- Ajouter une étape de **`terraform destroy`** en fin de pipeline (ou un job planifié de
  nettoyage) pour garantir qu'aucune EC2 applicative ne reste facturée.
- Externaliser le `tfstate` (backend S3 + verrou DynamoDB) si le projet passe à plusieurs
  exécutions concurrentes — non nécessaire ici (déploiements séquentiels).
