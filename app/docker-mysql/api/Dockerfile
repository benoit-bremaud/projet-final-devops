# Image de l'API : construit le backend partage (backend/app).
# Contexte de build = racine du depot (cf. docker-compose.yml) pour inclure backend/.
FROM python:3.11-slim

WORKDIR /srv

# curl sert au healthcheck (GET /docs) declare dans docker-compose.yml.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
