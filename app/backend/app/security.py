"""Securite : hachage bcrypt des mots de passe et jetons JWT (HS256).

Centralise tout ce qui touche au secret (cf. ADR 0002) : reutilise par l'auth, les
routes protegees et le seed admin. Le mot de passe n'est jamais compare en clair.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

_bearer = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    """Hache un mot de passe en clair avec bcrypt (sel aleatoire)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifie un mot de passe contre son empreinte bcrypt, sans jamais le stocker."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str) -> str:
    """Emet un JWT HS256 signe, de courte duree, pour l'administrateur authentifie."""
    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET manquant")
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_ttl_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Dependance d'autorisation : exige un Bearer JWT valide, sinon 401."""
    settings = get_settings()
    if credentials is None or not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token manquant"
        )
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret, algorithms=["HS256"]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide"
        )
    return payload.get("sub")
