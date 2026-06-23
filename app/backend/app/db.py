"""Acces base MySQL.

On ouvre une connexion par requete (comme le socle du TP) : au moment de l'appel,
la base est prete, ce qui evite la course au demarrage. Toutes les requetes des
routes sont parametrees (aucune concatenation SQL).
"""

import mysql.connector

from .config import get_settings


def get_connection():
    """Ouvre une connexion MySQL a partir de la configuration d'environnement."""
    settings = get_settings()
    return mysql.connector.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        database=settings.mysql_database,
        user=settings.mysql_user,
        password=settings.mysql_password,
    )
