# Diagramme de séquence — Zero-Touch — la pipeline en 5 étapes

> **Feature** : pipeline d'orchestration `deploy.yml` (issues #10 → #14).
> **Sujet** : §3 Phase 3 (orchestration), §6 (attendus pipeline).

## Context

Ce diagramme montre **ce qui se passe dans le temps** quand le Développeur clique sur
« Run workflow ». C'est la **réalisation** du cas d'utilisation UC1 (cf. 01). Chaque bloc
`Note` correspond à une étape du sujet et à une issue.

## Diagram

```mermaid
sequenceDiagram
  actor Dev as Développeur
  participant GH as GitHub Actions (runner)
  participant REG as EC2 #1 Registre
  participant AWS as AWS (API)
  participant APP as EC2 #2 Application

  Dev->>GH: Run workflow (workflow_dispatch, 1 clic)

  Note over GH,REG: 1. Build and Push (issue #10)
  GH->>GH: docker build front + back
  GH->>REG: docker login + docker push (port 443)

  Note over GH,AWS: 2. Provision (issue #11)
  GH->>AWS: terraform apply (EC2 + clé SSH + Security Group)
  AWS-->>GH: outputs (IP publique, clé privée)

  Note over GH: 3. Bridge (issue #12)
  GH->>GH: génère inventory.ini + key.pem (chmod 600)

  Note over GH,APP: 4. Deploy (issue #13)
  GH->>APP: ansible-playbook via SSH (port 22)
  APP->>APP: installe Docker + login registre
  APP->>REG: docker pull images (port 443)
  APP->>APP: docker compose up

  Note over GH,APP: 5. Validate (issue #14)
  GH->>APP: curl front (3000) + api (8000)
  APP-->>GH: 200 OK
  GH-->>Dev: URL de l'application déployée
```

## Notes

- **Séquentiel et sans humain** : tout s'enchaîne dans un seul job. La contrainte « No SSH
  humain » est respectée — la seule connexion SSH est celle d'**Ansible** (étape 4), pas d'un humain.
- **Le « Bridge » (étape 3)** est le point délicat : il transforme les *outputs* Terraform
  (IP, clé) en fichiers (`inventory.ini`, `key.pem`) qu'Ansible sait consommer. C'est le pont
  entre l'infra et la configuration.
- **La validation (étape 5) est hors Ansible** (exigence du sujet) : un `curl` direct depuis le
  runner garantit que le Front et l'API répondent vraiment.
- L'EC2 #2 **tire ses images** du registre (flèche APP → REG) : elle ne builde rien localement.
