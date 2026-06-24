# Projet Final : Industrialisation & Automatisation « Zero Touch »

> Transcription du sujet (`Projet_Final_DevOps.pdf`) pour référence versionnée.
> **Niveau** : Master 2 Expert · **Mode** : Binôme / Trinôme · **Livrable** : dépôt GitHub public.

## 1. Mise en situation

Vous disposez désormais d'une architecture microservices complète. Vous avez validé la sécurité
de vos images (scan de vulnérabilités) et automatisé leur publication sur le registry Docker
hébergé sur AWS préalablement créé.

L'objectif est maintenant d'**automatiser la mise en production** de cette stack, en respectant
une contrainte majeure : **« No SSH »**. Aucun humain ne doit se connecter au serveur pour le
configurer. Toute l'infrastructure et le déploiement applicatif doivent être pilotés
automatiquement depuis une pipeline CI/CD.

**Mission** : concevoir et implémenter une chaîne de déploiement continu qui provisionne une
infrastructure éphémère sur AWS, la configure, et y déploie la dernière version de l'application,
le tout déclenché par un simple clic.

## 2. Architecture cible

- **Cloud Provider** : AWS (région **eu-west-3**).
- **Compute** : instance unique (type adapté au **Free Tier**).
- **OS** : dernière version LTS d'Ubuntu (récupération **dynamique**).
- **Network / Security** :
  - Exposition stricte des ports nécessaires à l'application et à l'administration.
  - Le **Frontend et l'API** doivent être accessibles publiquement, **le reste non**.
  - **SSH ouvert uniquement** pour l'outil de configuration (Ansible).
- **Application** : stack Docker Compose (images stockées sur un registre privé).

## 3. Cahier des charges technique

### Phase 1 — Infrastructure as Code (Terraform)

- **Contrainte 1** : l'AMI ne doit pas être hardcodée (recherche **dynamique** via data source).
- **Contrainte 2** : la clé SSH d'administration doit être **générée à la volée** par Terraform
  (pas de clé statique dans le repo).
- **Contrainte 3** : exposer en **output** les informations critiques pour l'étape suivante
  (IP publique, clé privée).

### Phase 2 — Configuration Management (Ansible)

- **Rôle** : installation du runtime Docker et des dépendances.
- **Sécurité** : authentification auprès du registre d'images privé (token ou identifiants).
- **Déploiement** : transfert et démarrage de la stack applicative.
- **Contrainte** : inventaire **dynamique ou généré** (pas d'IP en dur dans un fichier hosts).

### Phase 3 — Pipeline d'orchestration (GitHub Actions)

Un workflow unique `deploy.yml` déclenchable manuellement (`workflow_dispatch`), exécutant
séquentiellement :

1. **Build & Publish** : construction des images Docker et push vers le registre privé.
2. **Infrastructure Provisioning** : application du code Terraform.
3. **Bridge** : récupération sécurisée des secrets (clé SSH, IP) générés par Terraform pour les
   transmettre à Ansible.
4. **Configuration & Deployment** : exécution du playbook Ansible sur la nouvelle infrastructure.

## 4. Contraintes de réalisation

1. **Secret Management** : aucun secret (credentials AWS, token GitHub, clé SSH, identifiants,
   adresses IP) ne doit apparaître en clair dans le code ou les logs. Mécanismes natifs de
   **GitHub Secrets**.
2. **Environnement éphémère** : le `tfstate` peut être local au runner (perdu à la fin du job) ;
   chaque déploiement crée une nouvelle infrastructure.
3. **Adaptation applicative** : adapter le `docker-compose.yml` de développement pour qu'il
   **consomme les images du registre privé** en production (au lieu de builder localement).

## 5. Indices & coups de pouce

- **Pont Terraform → Ansible** : `terraform output -raw <output>` pour récupérer une valeur brute,
  stockée dans `$GITHUB_ENV` ou écrite dans un `inventory.ini` généré (`echo`).
- **Clé SSH volatile** : écrire la clé privée dans un fichier temporaire, puis `chmod 600 key.pem`
  (Ansible refuse une clé aux permissions trop ouvertes).
- **Inventaire dynamique** : un simple fichier texte généré par le script CI suffit :
  ```
  echo "[web]" > inventory.ini
  echo "$SERVER_IP ansible_user=ubuntu ansible_ssh_private_key_file=key.pem" >> inventory.ini
  ```
- **Vérification d'hôte SSH** : ajouter `-o StrictHostKeyChecking=no` (commandes SSH ou
  `ansible_ssh_common_args`) pour éviter le prompt de confirmation.

## 6. Attendus techniques (infra globale & pipeline)

- **Déploiement du registre Docker privé** : une infrastructure dédiée (**EC2 distincte**)
  provisionnée avec Terraform et configurée avec Ansible de manière sécurisée (reverse proxy
  **Nginx**, certificats **SSL/HTTPS**, **authentification par mot de passe**).
- **Déclenchement CI/CD manuel** : un workflow `deploy.yml` lancé via `workflow_dispatch` :
  - **Build & Push** des images du projet (Dockerfile front + Dockerfile back) vers le registre
    Docker AWS privé créé à l'étape précédente.
  - **Provisioning Terraform** d'une **seconde infrastructure** AWS (EC2 distincte) pour héberger
    les services (Frontend, Backend, Base de données, Adminer).
  - **Bridge CI/CD** : génération automatique d'un `inventory.ini` à la volée, basé sur les
    outputs (IP publique, clé SSH) de Terraform.
  - **Configuration Ansible** : exécution du playbook applicatif (authentification au registre
    privé, pull des images, lancement de la stack complète).
  - **Validation post-déploiement** : une étape de test (ex. `curl`) **en dehors d'Ansible**,
    pour s'assurer que le Frontend et le Backend répondent.
- **Sécurité stricte** : utilisation **exclusive** de GitHub Secrets — aucun identifiant, mot de
  passe ou clé (AWS, base de données, registre) codé en dur.

## 7. Critères d'évaluation

Le projet est validé **si et seulement si** :

1. **Pipeline vert** : le workflow s'exécute de bout en bout sans erreur.
2. **Application accessible** : l'URL fournie en fin de déploiement permet d'accéder au projet.
3. **Qualité du code** : découpage clair (`registry/`, `infra/`, `ansible/`, `.github/`).

## 8. Livrables

- **`rendu.txt`** : lien vers le repository GitHub + IP publique du projet + IP publique du registre.
- **Documentation globale** : un fichier clair présentant l'architecture finale (EC2 registre +
  EC2 applicative).
- **`.env.sample`** : listant précisément tous les secrets / variables à configurer pour exécuter
  le workflow de zéro, ainsi que le user et mot de passe de connexion au registre Docker.

> ⚠️ **Ne pas donner vos clés AWS** dans les livrables.
