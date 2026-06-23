"""Schemas Pydantic (validation d'entree et projections de sortie).

La validation serveur double la validation cliente (defense en profondeur) : une
entree invalide renvoie 422. `InscritPublic` est la projection publique (liste reduite),
`InscritComplet` la vue admin (avec PII).
"""

import re
from datetime import date

from pydantic import BaseModel, Field, field_validator

_NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$")
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_POSTAL_RE = re.compile(r"^\d{5}$")


class InscritCreate(BaseModel):
    """Corps du POST /inscrits (memes cles que l'etat du formulaire React)."""

    nom: str = Field(max_length=100)
    prenom: str = Field(max_length=100)
    email: str = Field(max_length=255)
    dateNaissance: str
    ville: str = Field(max_length=100)
    codePostal: str

    @field_validator("nom", "prenom", "ville")
    @classmethod
    def _valid_name(cls, value: str) -> str:
        if not _NAME_RE.match(value or ""):
            raise ValueError("valeur invalide")
        return value

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        if not _EMAIL_RE.match(value or ""):
            raise ValueError("email invalide")
        return value

    @field_validator("codePostal")
    @classmethod
    def _valid_postal(cls, value: str) -> str:
        if not _POSTAL_RE.match(value or ""):
            raise ValueError("code postal invalide")
        return value

    @field_validator("dateNaissance")
    @classmethod
    def _valid_date(cls, value: str) -> str:
        try:
            birth = date.fromisoformat(value)
        except (ValueError, TypeError):
            raise ValueError("date invalide")
        # Defense en profondeur : la regle des 18 ans (et un plafond plausible de
        # 120 ans) est imposee cote serveur, pas seulement cote front.
        today = date.today()
        age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        if age < 18 or age > 120:
            raise ValueError("age hors bornes (18 a 120 ans)")
        return value


class InscritPublic(BaseModel):
    """Projection publique : exactement les champs non sensibles (GET /inscrits)."""

    nom: str
    prenom: str
    ville: str


class InscritComplet(BaseModel):
    """Vue administrateur : tous les champs, PII comprises (GET /inscrits/admin)."""

    id: int
    nom: str
    prenom: str
    email: str
    date_naissance: date
    ville: str
    code_postal: str


class LoginRequest(BaseModel):
    """Corps du POST /auth/login."""

    email: str
    password: str


class Token(BaseModel):
    """Reponse du login : jeton d'acces JWT."""

    access_token: str
    token_type: str = "bearer"
