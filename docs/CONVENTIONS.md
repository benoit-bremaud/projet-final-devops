# Conventions d'interface — Contrat « Zero-Touch » (issue #2)

> **Source de vérité** des noms partagés entre l'infra, la CI, Ansible et l'app. Tout fichier
> (workflow, Terraform, playbook, `.env.sample`, compose) doit s'y conformer **à l'identique**.
> Objectif : empêcher les divergences (ex. `instance_ip` vs `instance_public_ip`).

## 1. Noms des images Docker

| Image | Référence |
|---|---|
| Backend (API FastAPI) | `${REGISTRY_HOST}/inscription-api:<tag>` |
| Frontend (React) | `${REGISTRY_HOST}/inscription-webapp:<tag>` |

- `<tag>` = `${{ github.sha }}` (traçabilité) **+** un tag `latest` poussé en parallèle.
- `REGISTRY_HOST` = `<IP_EC2_registre>:443`.

## 2. Format de l'`inventory.ini` (généré par la CI au Bridge, jamais versionné)

```ini
[web]
<IP_PUBLIQUE> ansible_user=ubuntu ansible_ssh_private_key_file=key.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

- Groupe **`[web]`** → le playbook applicatif cible `hosts: web`.
- À ne pas confondre avec `registry/inventory.ini.example` (groupe `[registry_hosts]`, EC2 #1).

## 3. Outputs Terraform `infra/` (contrat avec le Bridge #12)

| Output | Type | Usage |
|---|---|---|
| `instance_public_ip` | string | IP publique de l'EC2 applicative |
| `ssh_private_key` | string `sensitive` | clé privée → écrite en `key.pem` (chmod 600) sur le runner |

> ⚠️ Ne **pas** utiliser `instance_ip` / `private_key` (ce sont les noms de l'EC2 **registre**,
> pas de l'app).

## 4. Compute & réseau (Security Group de l'EC2 app)

- **Type d'instance** : `t3.micro` (le type **Free Tier éligible pour CE compte AWS** ; `t2.micro` est refusé à l'`apply` — vérifié en live).
- **Ports ouverts** (publics) : `22` (Ansible), `3000` (Frontend), `8000` (API).
- **Ports fermés** (jamais exposés) : `8080` (Adminer), `3306` (MySQL). → conforme à
  « Frontend et API publics, le reste non » (sujet §2).

## 5. GitHub Secrets (liste exhaustive — un seul nom par secret)

| Secret | Origine | Valeur figée |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user CI | — |
| `AWS_SECRET_ACCESS_KEY` | IAM user CI | — |
| `AWS_DEFAULT_REGION` | fixe | `eu-west-3` |
| `REGISTRY_HOST` | IP EC2 #1 | `<IP>:443` |
| `REGISTRY_USERNAME` | choisi | — |
| `REGISTRY_PASSWORD` | choisi (fort) | — |
| `MYSQL_ROOT_PASSWORD` | généré | — |
| `MYSQL_DATABASE` | fixe | `ynov_ci` |
| `ADMIN_EMAIL` | choisi | — |
| `ADMIN_PASSWORD` | choisi (fort) | — |
| `JWT_SECRET` | généré | — |

> `REACT_APP_API_URL` n'est **pas** un secret : c'est une variable de **build** du front
> (`http://<instance_public_ip>:8000`), injectée au build CRA (cf. issue #8).
