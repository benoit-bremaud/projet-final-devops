"""Configuration lue depuis l'environnement.

Aucune valeur secrete n'est codee en dur. Les variables sont lues a l'appel
(`get_settings()`), ce qui garde l'import du module sans effet de bord et facilite
les tests. La politique fail-closed (variables admin/JWT obligatoires) est appliquee
au point d'usage : le seed admin et le demarrage de l'app (voir `main.py`, `seed.py`).
"""

import os


class Settings:
    """Regroupe la configuration runtime (base MySQL, admin a seeder, JWT, CORS)."""

    def __init__(self) -> None:
        self.mysql_host = os.getenv("MYSQL_HOST", "db")
        self.mysql_port = int(os.getenv("MYSQL_PORT", "3306"))
        self.mysql_database = os.getenv("MYSQL_DATABASE", "ynov_ci")
        self.mysql_user = os.getenv("MYSQL_USER", "root")
        self.mysql_password = os.getenv("MYSQL_PASSWORD", "")
        self.admin_email = os.getenv("ADMIN_EMAIL")
        self.admin_password = os.getenv("ADMIN_PASSWORD")
        self.jwt_secret = os.getenv("JWT_SECRET")
        self.jwt_ttl_minutes = int(os.getenv("JWT_TTL_MINUTES", "60"))
        origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        self.cors_origins = [o.strip() for o in origins.split(",") if o.strip()]


def get_settings() -> Settings:
    """Retourne une configuration fraiche lue depuis l'environnement courant."""
    return Settings()
