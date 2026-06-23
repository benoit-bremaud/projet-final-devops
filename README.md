# Projet Final DevOps — Industrialisation & Automatisation « Zero Touch »

Déploiement **100 % automatisé** d'une application web (inscription : **React + FastAPI
+ MySQL + Adminer**) sur AWS, piloté par une **pipeline CI/CD GitHub Actions**
déclenchée en **un clic** (`workflow_dispatch`).

> **Contrainte majeure : « No SSH humain ».** Personne ne se connecte au serveur pour
> le configurer. Terraform provisionne, Ansible configure, la pipeline orchestre.
> **Zéro secret en dur** : tout passe par les **GitHub Secrets**.

Master 2 Expert — CI/CD · Rendu : **06/07/2026** · Binôme : `benoit-bremaud` & `Beehnood`.

## Architecture cible

```text
        ┌──────── GitHub Actions : deploy.yml  (workflow_dispatch = 1 clic) ─────────┐
        │ 1.Build+Push   2.terraform apply   3.Bridge(inventory+clé)  4.Ansible  5.curl │
        └─────┬───────────────────┬────────────────────┬─────────────────┬────────────┘
              │ push images       │ provisionne         │ ssh+configure   │ teste
              ▼                   ▼                     ▼                 ▼
   EC2 #1 — REGISTRE privé        EC2 #2 — APPLICATION (éphémère, recréée à chaque run)
   Nginx + SSL + auth (:443)      Frontend(3000) + Backend(8000) + MySQL + Adminer(8080)
   (déjà construit, cf registry/) pull les images depuis EC2 #1 → docker compose up
```

## Structure du dépôt

| Dossier | Rôle | Responsable |
| --- | --- | --- |
| `registry/` | EC2 #1 — registre Docker privé sécurisé (Terraform + Ansible) | benoit-bremaud |
| `infra/` | EC2 #2 — Terraform de l'application (AMI dynamique, clé générée, outputs) | benoit-bremaud |
| `ansible/` | Playbook applicatif (Docker, login registre, pull, `compose up`) | Beehnood |
| `app/` | Code applicatif (front + back + db) à builder en CI | Beehnood |
| `.github/workflows/deploy.yml` | Pipeline d'orchestration | benoit-bremaud |

## Le pipeline `deploy.yml` (5 étapes, séquentielles)

1. **Build & Push** — construit les images `app/` (front + back) → registre privé.
2. **Provision** — `terraform apply` dans `infra/` (tfstate local au runner = infra éphémère).
3. **Bridge** — génère `inventory.ini` + `key.pem` (`chmod 600`) depuis les outputs Terraform.
4. **Deploy** — exécute le playbook Ansible sur la nouvelle EC2 (login registre, pull, up).
5. **Validate** — `curl` du Frontend et du Backend, affiche l'URL d'accès.

## Exécuter le déploiement (de zéro)

1. Renseigner tous les **GitHub Secrets** listés dans [`.env.sample`](.env.sample).
2. (Pré-requis) Déployer **EC2 #1** une fois (cf. [`registry/README.md`](registry/README.md))
   et mettre son IP + identifiants dans les secrets.
3. GitHub → onglet **Actions** → workflow **Deploy** → **Run workflow**.
4. En fin de run, l'URL de l'application s'affiche.

## Sécurité

- **100 % GitHub Secrets** : aucun identifiant (AWS, registre, DB, JWT) en clair dans le code.
- `gitleaks` en garde-fou ; `.env.sample` ne contient que des **placeholders**.
- La clé SSH est **générée à la volée** par Terraform, jamais stockée dans le dépôt.

## Équipe & suivi

- **`benoit-bremaud`** — Infrastructure & Orchestration (registry, infra, pipeline, secrets).
- **`Beehnood`** — Application & Configuration (app, Ansible, doc).
- Le travail est suivi via les **Issues GitHub** (labels `phase:*`, `priority:*`, milestone du 06/07).
