"""Tests d'integration des endpoints contre une base de test (via TestClient)."""

import os

import pytest

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


def _payload(**overrides):
    base = {
        "nom": "Hopper",
        "prenom": "Grace",
        "email": "grace.hopper@ynov.com",
        "dateNaissance": "1906-12-09",
        "ville": "Arlington",
        "codePostal": "22201",
    }
    base.update(overrides)
    return base


def _token(client):
    response = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_create_then_public_list_is_reduced(client):
    assert client.post("/inscrits", json=_payload()).status_code == 201

    response = client.get("/inscrits")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    # Liste publique = projection reduite, sans PII.
    assert data[0] == {"nom": "Hopper", "prenom": "Grace", "ville": "Arlington"}


def test_duplicate_email_returns_409(client):
    assert client.post("/inscrits", json=_payload()).status_code == 201
    assert client.post("/inscrits", json=_payload()).status_code == 409


def test_invalid_payload_returns_422(client):
    assert client.post("/inscrits", json=_payload(email="pas-un-email")).status_code == 422


def test_login_ok_and_invalid_credentials(client):
    ok = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert ok.status_code == 200
    assert "access_token" in ok.json()

    bad = client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": "mauvais"}
    )
    assert bad.status_code == 401


def test_admin_list_requires_token(client):
    assert client.get("/inscrits/admin").status_code == 401


def test_admin_list_with_token_exposes_full_info(client):
    client.post("/inscrits", json=_payload())
    response = client.get(
        "/inscrits/admin", headers={"Authorization": f"Bearer {_token(client)}"}
    )
    assert response.status_code == 200
    row = response.json()[0]
    # La vue admin expose les PII.
    assert row["email"] == "grace.hopper@ynov.com"
    assert row["code_postal"] == "22201"
    assert "date_naissance" in row


def test_delete_protected_and_not_found(client):
    headers = {"Authorization": f"Bearer {_token(client)}"}
    new_id = client.post("/inscrits", json=_payload()).json()["id"]

    # Sans jeton : interdit.
    assert client.delete(f"/inscrits/{new_id}").status_code == 401
    # Avec jeton : supprime.
    assert client.delete(f"/inscrits/{new_id}", headers=headers).status_code == 204
    # Deja supprime : introuvable.
    assert client.delete(f"/inscrits/{new_id}", headers=headers).status_code == 404


# --- Sad path : corps invalide -> 422 ---
def test_create_missing_field_returns_422(client):
    payload = _payload()
    del payload["email"]
    assert client.post("/inscrits", json=payload).status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [
        ("nom", "Jean123"),
        ("prenom", "Marie@"),
        ("ville", "Paris1"),
        ("codePostal", "123"),
        ("dateNaissance", "pas-une-date"),
    ],
)
def test_create_rejects_invalid_field_returns_422(client, field, value):
    assert client.post("/inscrits", json=_payload(**{field: value})).status_code == 422


# --- Edge : la liste publique ne fuite jamais de PII ---
def test_public_list_never_exposes_pii(client):
    client.post("/inscrits", json=_payload())
    row = client.get("/inscrits").json()[0]
    assert set(row.keys()) == {"nom", "prenom", "ville"}


# --- Happy path : la suppression retire bien l'inscrit de la liste ---
def test_delete_actually_removes_from_public_list(client):
    client.post("/inscrits", json=_payload(email="premier@example.com"))
    second_id = client.post("/inscrits", json=_payload(email="second@example.com")).json()["id"]
    headers = {"Authorization": f"Bearer {_token(client)}"}

    assert client.delete(f"/inscrits/{second_id}", headers=headers).status_code == 204
    assert len(client.get("/inscrits").json()) == 1


# --- Sad path : authentification ---
def test_login_wrong_email_returns_401(client):
    response = client.post("/auth/login", json={"email": "inconnu@example.com", "password": "x"})
    assert response.status_code == 401


def test_login_missing_password_returns_422(client):
    assert client.post("/auth/login", json={"email": ADMIN_EMAIL}).status_code == 422


def test_admin_list_rejects_garbage_token(client):
    response = client.get("/inscrits/admin", headers={"Authorization": "Bearer jeton-bidon"})
    assert response.status_code == 401


def test_delete_rejects_garbage_token(client):
    response = client.delete("/inscrits/1", headers={"Authorization": "Bearer jeton-bidon"})
    assert response.status_code == 401
