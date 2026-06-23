"""Route d'authentification administrateur (UC4)."""

from fastapi import APIRouter, HTTPException, status

from ..db import get_connection
from ..schemas import LoginRequest, Token
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest) -> Token:
    """Verifie les identifiants (bcrypt) et emet un JWT en cas de succes, sinon 401."""
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT email, password_hash FROM admin WHERE email = %s",
            (payload.email,),
        )
        row = cursor.fetchone()
        cursor.close()
    finally:
        connection.close()

    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides"
        )
    return Token(access_token=create_access_token(payload.email))
