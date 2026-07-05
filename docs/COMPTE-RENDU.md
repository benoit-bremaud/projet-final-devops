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
| --- | --- | --- |
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
| --- | --- | --- |
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

## 8. Matrice de conformité au sujet (exigence par exigence)

Chaque exigence du sujet (§2 → §8) a été **auditée contre le code réel** du dépôt, puis
**contre-vérifiée** (relecture sceptique de la preuve citée). Légende :
**✅ Conforme** · **🟡 Partiel** · **❌ Non conforme**.

**Synthèse : 32 ✅ · 1 🟡 · 0 ❌** sur 33 exigences.

### §2 — Architecture cible

| Exigence | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| Cloud AWS, région `eu-west-3` | ✅ | `provider "aws" { region = "eu-west-3" }` — `infra/main.tf:22-24`, `registry/main.tf:24-26` |
| Compute : instance unique, Free Tier | ✅ | Une seule `aws_instance` en `t3.micro` — `infra/main.tf:96-110` (t2.micro refusé sur ce compte, cf. §6) |
| OS : dernière LTS Ubuntu, dynamique | 🟡 | `data aws_ami` `most_recent`+Canonical mais filtre épinglé `noble-24.04` — `infra/main.tf:28-36`. Dynamique *dans* la 24.04 ; choix de repro (cf. §9) |
| Exposition stricte des ports | ✅ | Security Group ouvre **uniquement** 22/3000/8000 — `infra/main.tf:60-93` ; le compose prod ne publie que 3000/8000 |
| Front (3000) + API (8000) publics, reste non | ✅ | Adminer (8080) et MySQL (3306) ni dans le SG ni publiés — `infra/main.tf:84`, `app/docker-mysql/docker-compose.prod.yml` |
| SSH (22) ouvert **uniquement** pour Ansible | ✅ | Ingress 22 restreint à `var.ssh_ingress_cidr` — `infra/main.tf` ; le pipeline le surcharge avec l'IP du runner `/32` (`deploy.yml`, étape *Terraform apply*) → port 22 réservé à l'étape Ansible |
| Stack Compose tirée du registre privé | ✅ | `image: ${REGISTRY_HOST}/...` (aucun `build:`) — `docker-compose.prod.yml:29,57` |

### §3.1 — Infrastructure as Code (Terraform)

| Exigence | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| AMI non hardcodée (data source) | ✅ | `ami = data.aws_ami.ubuntu.id`, aucun `ami-xxxx` — `infra/main.tf:28-36,97` |
| Clé SSH générée à la volée | ✅ | `tls_private_key` RSA 4096 — `infra/main.tf:40-52` ; `*.pem` gitignorés, rien de versionné |
| Outputs IP publique + clé privée | ✅ | `instance_public_ip` + `ssh_private_key` (sensitive) — `infra/main.tf:114-123`, lus en `deploy.yml:68,70` |

### §3.2 — Configuration Management (Ansible)

| Exigence | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| Install runtime Docker + dépendances | ✅ | apt `docker.io` + `docker-compose-v2` — `ansible/deploy.yml:39-45` |
| Authentification au registre (sans fuite) | ✅ | `docker login --password-stdin` + `no_log: true` — `ansible/deploy.yml:61-67` |
| Transfert + démarrage de la stack | ✅ | Copie compose+SQL+`.env` (0600) puis `compose pull`/`up -d` — `ansible/deploy.yml:78-116` |
| Inventaire généré, aucune IP versionnée | ✅ | `inventory.ini` généré au Bridge — `deploy.yml:66-73` ; `**/inventory.ini` gitignoré |

### §3.3 / §6 — Pipeline d'orchestration (GitHub Actions)

| Exigence | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| Workflow unique `deploy.yml`, `workflow_dispatch` | ✅ | `deploy.yml:5-8`, job unique `deploy` |
| Build & Push (front + back) → registre | ✅ | Build api+webapp, push SHA+`latest` — `deploy.yml:44-52` |
| Provisioning Terraform 2e EC2 | ✅ | `terraform -chdir=infra init && apply` — `deploy.yml:60-63` |
| Bridge : outputs → `inventory.ini` + `key.pem` (chmod 600) | ✅ | `deploy.yml:66-73` |
| Configuration & Deployment Ansible | ✅ | `ansible-playbook -i inventory.ini` + extra-vars — `deploy.yml:89-101` |
| Validation `curl` front+back **hors Ansible** | ✅ | Étape `Validate` séparée, `exit 1` si KO — `deploy.yml:104-119` |

### §4 — Contraintes de réalisation

| Exigence | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| Aucun secret en clair (code/logs) | ✅ | `no_log`, stdin, output `sensitive` — `ansible/deploy.yml:67,103`, `infra/main.tf:119-123` |
| Environnement éphémère (tfstate local) | ✅ | Aucun backend distant ; anti-collision `name_prefix`/`key_name_prefix` — `infra/main.tf:50,57` |
| Compose dev → prod (pull, pas build) | ✅ | Variante prod remplace `build:` par `image:` — `docker-compose.prod.yml` |
| GitHub Secrets **exclusifs** | ✅ | Tous via `${{ secrets.* }}` — `deploy.yml:11-24` ; `.env.sample` = placeholders |
| Registre EC2 distincte : Nginx + SSL + auth | ✅ | EC2 dédiée, Nginx 443 SSL, htpasswd **bcrypt** — `registry/nginx.conf:5-9`, `registry/playbook.yml:46-67` |
| Dockerfile front + Dockerfile back | ✅ | `app/docker-mysql/{api,webapp}/Dockerfile` |

### §7 — Critères d'évaluation (les 3 décisifs)

| Critère | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| 1. Pipeline vert de bout en bout | ✅ | Runs `success` (`workflow_dispatch`), dernier 24/06 en 5 min 32 s |
| 2. Application accessible via l'URL | ✅ | Déploiement frais du 05/07/2026 — étape `Validate` : `api=200 web=200` dès le 1er essai. Frontend `http://15.224.100.97:3000` · API `http://15.224.100.97:8000/docs` — IP à jour dans `rendu.txt` |
| 3. Qualité du code : découpage clair | ✅ | `registry/` `infra/` `ansible/` `.github/` — `README.md:32-38` |

### §8 — Livrables

| Exigence | Statut | Ce qu'on a fait & où (preuve) |
| --- | :--: | --- |
| `rendu.txt` (repo + IP app + IP registre) | ✅ | `rendu.txt:5-7` — IP applicative à jour (`15.224.100.97`, déploiement 05/07/2026) |
| Documentation globale d'architecture | ✅ | `docs/architecture/README.md`, ce compte-rendu, diagramme 03 |
| `.env.sample` (secrets + user/pass registre) | ✅ | 11 secrets + `REGISTRY_USERNAME/PASSWORD` — `.env.sample` |
| Aucune clé AWS réelle livrée | ✅ | Placeholders only ; historique git vérifié (0 clé `AKIA`/`BEGIN PRIVATE KEY`) |

## 9. Pistes d'amélioration & plan de remédiation

**Écarts identifiés par l'audit (à traiter pour viser le sans-faute) :**

- **✅ R6 — corrigé.** L'ingress `22` est désormais restreint à `var.ssh_ingress_cidr`
  (`infra/main.tf`), surchargé dans le pipeline par l'IP du runner `/32`
  (`deploy.yml`, étape *Terraform apply*) : le port SSH n'est plus accessible qu'à l'étape
  Ansible. Validé localement (`terraform validate`) ; prouvé en réel au prochain déploiement.
- **🟡 R3 — AMI épinglée sur 24.04.** Choix volontaire de **reproductibilité** (un build figé
  reste rejouable à l'identique). Pour suivre automatiquement la prochaine LTS, élargir le filtre
  et trier sur la date de publication — au prix d'un comportement non déterministe.
- **✅ R32 / R34 — IP applicative rafraîchie.** Pipeline relancé le 05/07/2026 (run #6), étape
  `Validate` confirmée verte (`api=200 web=200` au 1er essai). IP `15.224.100.97` reportée dans
  `rendu.txt`. Rendu finalisé.

**Améliorations de fond (au-delà du barème) :**

- Remplacer l'`insecure-registries` (certificat auto-signé) par une **vraie autorité de
  certification** (Let's Encrypt) pour supprimer la confiance forcée côté Docker.
- Ajouter une étape de **`terraform destroy`** en fin de pipeline (ou un job planifié de
  nettoyage) pour garantir qu'aucune EC2 applicative ne reste facturée.
- Externaliser le `tfstate` (backend S3 + verrou DynamoDB) si le projet passe à plusieurs
  exécutions concurrentes — non nécessaire ici (déploiements séquentiels).
