# Architecture — Projet Final DevOps « Zero-Touch »

> **TP** : Industrialisation & Automatisation « Zero-Touch » (CI/CD).
> **Sujet** : `Projet_Final_DevOps.pdf` (non versionné).
> **Langue** : cette étude de conception est rédigée en **français** (convention des
> livrables de cours, cf. `CLAUDE.md`). Le **code** reste en anglais.
>
> 📖 **Pour le récit pédagogique** (résultat, décisions, pièges, relance) :
> voir le [compte-rendu](../COMPTE-RENDU.md). Ce README-ci est la **vue structurelle** (diagrammes).

## But du TP

Déployer une application web (inscription : **React + FastAPI + MySQL + Adminer**) sur AWS,
**100 % automatiquement**, via une pipeline GitHub Actions déclenchée en **un clic**
(`workflow_dispatch`). Contrainte majeure : **« No SSH humain »** — personne ne se connecte
au serveur pour le configurer ; Terraform provisionne, Ansible configure, la pipeline
orchestre. **Zéro secret en dur** : tout passe par les GitHub Secrets.

## Architecture cible (en deux phrases)

Deux serveurs AWS (région `eu-west-3`) :

- **EC2 #1 — le registre** Docker privé sécurisé (Nginx + SSL + authentification) : il
  **stocke** les images. Persistant.
- **EC2 #2 — l'application** (éphémère, recréée à chaque déploiement) : elle **exécute** la
  stack en **tirant ses images** du registre.

## Index des diagrammes

| # | Diagramme | Question à laquelle il répond |
|---|---|---|
| [01](diagrams/zero-touch/01-use-case.md) | Cas d'utilisation | **Qui** déclenche **quoi** ? (acteurs et objectifs) |
| [02](diagrams/zero-touch/02-sequence-pipeline.md) | Séquence | Que fait la pipeline, **étape par étape**, dans le temps ? |
| [03](diagrams/zero-touch/03-component.md) | Composants / déploiement | **Où** tourne **quoi** ? (serveurs, services, ports) |
| [06](diagrams/zero-touch/06-data-flow-secrets.md) | Flux de données | Comment circulent les **secrets** sans être codés en dur ? |

## Correspondance avec le sujet

- **§2 Architecture cible** → diagramme **03** (composants / déploiement).
- **§3 Cahier des charges (Terraform / Ansible / Pipeline)** → diagramme **02** (séquence).
- **§4 Secret Management (zéro secret en dur)** → diagramme **06** (flux des secrets).
- **§6 Attendus (build & push, provision, bridge, deploy, validate)** → diagramme **02**.

Cette documentation matérialise le livrable « Documentation globale » exigé au §8 du sujet
(issue #16).
