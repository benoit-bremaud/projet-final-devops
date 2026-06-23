"""Point d'entree ASGI pour Vercel (@vercel/python).

Reutilise le backend partage : Vercel sert directement l'application FastAPI `app`
(meme cible que uvicorn en Docker). Voir ADR 0003.
"""

from backend.app.main import app  # noqa: F401
