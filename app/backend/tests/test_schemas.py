"""Tests unitaires de validation des schemas Pydantic (defense en profondeur)."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas import InscritCreate


def _iso_years_ago(years):
    """Renvoie une date ISO situee `years` ans avant aujourd'hui."""
    today = date.today()
    try:
        return today.replace(year=today.year - years).isoformat()
    except ValueError:  # 29 fevrier -> annee cible non bissextile
        return today.replace(year=today.year - years, day=28).isoformat()

VALID = {
    "nom": "Curie",
    "prenom": "Marie",
    "email": "marie.curie@ynov.com",
    "dateNaissance": "1990-01-01",
    "ville": "Paris",
    "codePostal": "75005",
}


def test_inscrit_create_accepts_valid_payload():
    inscrit = InscritCreate(**VALID)
    assert inscrit.nom == "Curie"


@pytest.mark.parametrize(
    "field,value",
    [
        ("nom", "Jean123"),
        ("prenom", "Marie@"),
        ("email", "pas-un-email"),
        ("codePostal", "123"),
        ("codePostal", "7500A"),
        ("ville", "Paris1"),
        ("dateNaissance", "pas-une-date"),
    ],
)
def test_inscrit_create_rejects_invalid_field(field, value):
    payload = {**VALID, field: value}
    with pytest.raises(ValidationError):
        InscritCreate(**payload)


# --- Edge cases : noms valides particuliers (accents, trait d'union, apostrophe, espace) ---
@pytest.mark.parametrize(
    "field,value",
    [
        ("nom", "Jean-Pierre"),
        ("prenom", "O'Brien"),
        ("nom", "Étienne"),
        ("ville", "Aix en Provence"),
        ("ville", "L'Haÿ-les-Roses"),
    ],
)
def test_inscrit_create_accepts_special_names(field, value):
    InscritCreate(**{**VALID, field: value})


# --- Edge cases : bornes acceptees ---
@pytest.mark.parametrize(
    "field,value",
    [
        ("codePostal", "00000"),          # 5 chiffres avec zeros
        ("email", "a@b.co"),              # email minimal valide
        ("dateNaissance", "2000-02-29"),  # annee bissextile
    ],
)
def test_inscrit_create_accepts_edge_valid(field, value):
    InscritCreate(**{**VALID, field: value})


# --- Edge cases : bornes refusees ---
@pytest.mark.parametrize(
    "field,value",
    [
        ("codePostal", "1234"),           # 4 chiffres
        ("codePostal", "123456"),         # 6 chiffres
        ("email", "a@b"),                 # pas de point
        ("email", "a @b.co"),             # espace
        ("dateNaissance", "1990-13-01"),  # mois invalide
        ("dateNaissance", "2001-02-29"),  # 29 fevrier non bissextile
    ],
)
def test_inscrit_create_rejects_edge_invalid(field, value):
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, field: value})


# --- Sad path : champ manquant ou vide ---
def test_inscrit_create_rejects_missing_field():
    payload = {key: value for key, value in VALID.items() if key != "email"}
    with pytest.raises(ValidationError):
        InscritCreate(**payload)


@pytest.mark.parametrize(
    "field", ["nom", "prenom", "email", "ville", "codePostal", "dateNaissance"]
)
def test_inscrit_create_rejects_empty_string(field):
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, field: ""})


# --- Regle metier : 18 ans imposee cote serveur (defense en profondeur) ---
def test_inscrit_create_accepts_exactly_18_years_old():
    InscritCreate(**{**VALID, "dateNaissance": _iso_years_ago(18)})


def test_inscrit_create_rejects_minor():
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, "dateNaissance": _iso_years_ago(10)})


def test_inscrit_create_rejects_future_birthdate():
    today = date.today()
    future = today.replace(year=today.year + 1).isoformat()
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, "dateNaissance": future})


def test_inscrit_create_rejects_implausibly_old():
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, "dateNaissance": "1850-01-01"})


# --- Robustesse : longueurs max (evite un 500 DataError cote base) ---
@pytest.mark.parametrize("field", ["nom", "prenom", "ville"])
def test_inscrit_create_rejects_over_length_name(field):
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, field: "A" * 101})


def test_inscrit_create_rejects_over_length_email():
    with pytest.raises(ValidationError):
        InscritCreate(**{**VALID, "email": "a" * 250 + "@example.com"})
