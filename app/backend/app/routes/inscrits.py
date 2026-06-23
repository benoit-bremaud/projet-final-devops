"""Routes des inscrits : creation, liste publique reduite, liste admin, suppression."""

from fastapi import APIRouter, Depends, HTTPException, status
from mysql.connector import IntegrityError

from ..db import get_connection
from ..schemas import InscritComplet, InscritCreate, InscritPublic
from ..security import require_admin

router = APIRouter(prefix="/inscrits", tags=["inscrits"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_inscrit(payload: InscritCreate) -> dict:
    """Cree un inscrit (UC1). 409 si l'email existe deja (contrainte UNIQUE)."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        try:
            cursor.execute(
                "INSERT INTO utilisateur "
                "(nom, prenom, email, date_naissance, ville, code_postal) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    payload.nom,
                    payload.prenom,
                    payload.email,
                    payload.dateNaissance,
                    payload.ville,
                    payload.codePostal,
                ),
            )
            connection.commit()
            new_id = cursor.lastrowid
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email deja inscrit"
            )
        finally:
            cursor.close()
    finally:
        connection.close()
    return {"id": new_id}


@router.get("", response_model=list[InscritPublic])
def list_public() -> list:
    """Liste publique reduite (UC2) : nom, prenom, ville. Aucune PII."""
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT nom, prenom, ville FROM utilisateur ORDER BY id")
        rows = cursor.fetchall()
        cursor.close()
    finally:
        connection.close()
    return rows


@router.get("/admin", response_model=list[InscritComplet])
def list_admin(_: str = Depends(require_admin)) -> list:
    """Liste complete (UC3), avec PII. Reservee a l'administrateur authentifie."""
    connection = get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nom, prenom, email, date_naissance, ville, code_postal "
            "FROM utilisateur ORDER BY id"
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        connection.close()
    return rows


@router.delete("/{inscrit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inscrit(inscrit_id: int, _: str = Depends(require_admin)) -> None:
    """Supprime un inscrit (UC5). 404 si l'id n'existe pas. Reserve a l'admin."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM utilisateur WHERE id = %s", (inscrit_id,))
        connection.commit()
        affected = cursor.rowcount
        cursor.close()
    finally:
        connection.close()
    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inscrit introuvable"
        )
