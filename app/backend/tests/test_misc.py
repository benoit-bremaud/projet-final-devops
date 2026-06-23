"""Tests complementaires : sonde de vie et branches fail-closed (defense en profondeur)."""

import pytest

from app.security import create_access_token
from app.seed import seed_admin


def test_health_endpoint(client):
    """GET / repond 200 avec un statut simple."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_access_token_requires_secret(monkeypatch):
    """create_access_token echoue si JWT_SECRET est absent (fail-closed)."""
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError):
        create_access_token("admin@example.com")


def test_seed_admin_requires_env(monkeypatch):
    """seed_admin echoue si ADMIN_EMAIL/ADMIN_PASSWORD manquent (fail-closed)."""
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    with pytest.raises(RuntimeError):
        seed_admin()


def test_lifespan_requires_jwt_secret(monkeypatch):
    """Le demarrage de l'app echoue si JWT_SECRET est absent (fail-closed)."""
    monkeypatch.delenv("JWT_SECRET", raising=False)
    from fastapi.testclient import TestClient

    from app.main import app

    with pytest.raises(RuntimeError):
        with TestClient(app):
            pass


def test_lifespan_fails_after_seed_retries(monkeypatch):
    """Si la base reste injoignable, le seed est retente puis echoue (fail-closed)."""
    import mysql.connector
    from fastapi.testclient import TestClient

    import app.main as main

    monkeypatch.setattr(main, "_SEED_RETRIES", 2)
    monkeypatch.setattr(main, "_SEED_DELAY_SECONDS", 0)

    def _unreachable_db():
        raise mysql.connector.Error("db indisponible")

    monkeypatch.setattr(main, "seed_admin", _unreachable_db)

    with pytest.raises(RuntimeError):
        with TestClient(main.app):
            pass
