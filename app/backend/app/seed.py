"""Seed de l'administrateur au demarrage de l'API (cf. ADR 0001).

La table `admin` est creee en SQL sans mot de passe ; ici on lit ADMIN_EMAIL /
ADMIN_PASSWORD depuis l'environnement, on hache en bcrypt et on fait un UPSERT
parametre idempotent sur l'email. Fail-closed si les variables manquent.
"""

from .config import get_settings
from .db import get_connection
from .security import hash_password


def seed_admin() -> None:
    """Cree ou met a jour l'administrateur (idempotent) a partir de l'environnement."""
    settings = get_settings()
    if not settings.admin_email or not settings.admin_password:
        raise RuntimeError(
            "ADMIN_EMAIL et ADMIN_PASSWORD sont requis pour seeder l'administrateur"
        )
    password_hash = hash_password(settings.admin_password)
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO admin (email, password_hash) VALUES (%s, %s) "
            "ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
            (settings.admin_email, password_hash),
        )
        connection.commit()
        cursor.close()
    finally:
        connection.close()
