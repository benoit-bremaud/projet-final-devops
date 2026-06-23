"""Fixtures pytest.

L'environnement est configure ICI, avant tout import de l'application, pour pointer
vers une base de TEST (`ynov_ci_test`) distincte de la base de dev. Les tests
unitaires (securite, schemas) n'utilisent pas de base ; seuls les tests d'integration
demandent la fixture `client`, qui cree le schema et lance l'app (TestClient declenche
le lifespan, donc le seed admin).

Connexion MySQL configurable par variables d'env (defauts = stack Docker locale avec
le port 3306 expose) :
  TEST_MYSQL_HOST (127.0.0.1), TEST_MYSQL_PORT (3306),
  TEST_MYSQL_USER (root), TEST_MYSQL_PASSWORD (change-me).
"""

import os

import mysql.connector
import pytest

TEST_DB = "ynov_ci_test"
_HOST = os.getenv("TEST_MYSQL_HOST", "127.0.0.1")
_PORT = int(os.getenv("TEST_MYSQL_PORT", "3306"))
_USER = os.getenv("TEST_MYSQL_USER", "root")
_PASSWORD = os.getenv("TEST_MYSQL_PASSWORD", "change-me")

ADMIN_EMAIL = "admin-test@example.com"
ADMIN_PASSWORD = "test-password-123"

# Configure l'app pour la base de test AVANT tout import de l'application.
os.environ["MYSQL_HOST"] = _HOST
os.environ["MYSQL_PORT"] = str(_PORT)
os.environ["MYSQL_DATABASE"] = TEST_DB
os.environ["MYSQL_USER"] = _USER
os.environ["MYSQL_PASSWORD"] = _PASSWORD
os.environ["ADMIN_EMAIL"] = ADMIN_EMAIL
os.environ["ADMIN_PASSWORD"] = ADMIN_PASSWORD
os.environ["JWT_SECRET"] = "test-secret"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"

# L'app lit MYSQL_PORT (db.py / config.py) : la connexion de test et l'app visent donc
# le meme port. Defaut 3306 (CI) ; en local, exporter TEST_MYSQL_PORT=3307 (port hote
# publie par le conteneur db, 3306 pouvant etre pris par un MySQL systeme).


def _server_connection(database=None):
    return mysql.connector.connect(
        host=_HOST, port=_PORT, user=_USER, password=_PASSWORD, database=database
    )


def _create_schema():
    connection = _server_connection()
    cursor = connection.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {TEST_DB}")
    cursor.execute(f"USE {TEST_DB}")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS utilisateur (
          id               INT AUTO_INCREMENT PRIMARY KEY,
          nom              VARCHAR(100) NOT NULL,
          prenom           VARCHAR(100) NOT NULL,
          email            VARCHAR(255) NOT NULL UNIQUE,
          date_naissance   DATE NOT NULL,
          ville            VARCHAR(100) NOT NULL,
          code_postal      VARCHAR(5)   NOT NULL,
          date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          email         VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL
        )
        """
    )
    connection.commit()
    cursor.close()
    connection.close()


def _drop_schema():
    connection = _server_connection()
    cursor = connection.cursor()
    cursor.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
    connection.commit()
    cursor.close()
    connection.close()


def _truncate_utilisateur():
    connection = _server_connection(database=TEST_DB)
    cursor = connection.cursor()
    cursor.execute("DELETE FROM utilisateur")
    connection.commit()
    cursor.close()
    connection.close()


@pytest.fixture(scope="session")
def _schema():
    """Cree la base de test et son schema pour la session, puis la supprime."""
    _create_schema()
    yield
    _drop_schema()


@pytest.fixture()
def client(_schema):
    """TestClient sur une base propre. Le lifespan seede l'admin au demarrage."""
    _truncate_utilisateur()
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
