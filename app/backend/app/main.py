"""Application FastAPI partagee (importee par uvicorn en Docker et par Vercel).

Au demarrage : verifie JWT_SECRET et seede l'administrateur (avec quelques essais,
le temps que la base soit prete). CORS restreint a une allowlist.
"""

import time
from contextlib import asynccontextmanager

import mysql.connector
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import auth, inscrits
from .seed import seed_admin

_SEED_RETRIES = 10
_SEED_DELAY_SECONDS = 3


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Demarrage : fail-closed sur JWT_SECRET, puis seed admin idempotent."""
    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET est requis au demarrage")
    # La base peut ne pas etre prete tout de suite : on retente le seed sur erreur
    # MySQL. Une config admin manquante n'est pas une erreur MySQL : elle echoue
    # immediatement (fail-closed, cf. seed_admin).
    last_error = None
    for _ in range(_SEED_RETRIES):
        try:
            seed_admin()
            break
        except mysql.connector.Error as error:
            last_error = error
            time.sleep(_SEED_DELAY_SECONDS)
    else:
        raise RuntimeError(f"Seed admin impossible apres plusieurs essais: {last_error}")
    yield


app = FastAPI(title="API Inscription", lifespan=lifespan)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inscrits.router)
app.include_router(auth.router)


@app.get("/")
def health() -> dict:
    """Sonde de vie simple (200 si l'app repond)."""
    return {"status": "ok"}
