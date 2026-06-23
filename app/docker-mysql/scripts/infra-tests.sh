#!/usr/bin/env bash
# Tests d'infrastructure : verifie que les 4 conteneurs sont healthy et que les
# endpoints HTTP repondent (sans 5xx). A lancer apres `docker compose up -d --wait`.
# Usage : bash docker-mysql/scripts/infra-tests.sh
set -euo pipefail

PROJECT="projet-ind-2-inscription"
SERVICES=(db api adminer webapp)

echo "== Sante des conteneurs =="
for service in "${SERVICES[@]}"; do
  name="${PROJECT}-${service}-1"
  status=$(docker inspect --format '{{json .State.Health.Status}}' "$name" 2>/dev/null || echo '"absent"')
  echo "  $name -> $status"
  if ! echo "$status" | grep -q '"healthy"'; then
    echo "ECHEC: $name n'est pas healthy"
    exit 1
  fi
done

http_code() { curl -s --max-time 10 -o /dev/null -w '%{http_code}' "$1"; }

check_code() {
  local url="$1" expected="$2" got
  got=$(http_code "$url")
  if [ "$got" != "$expected" ]; then
    echo "ECHEC: $url -> $got (attendu $expected)"
    exit 1
  fi
  echo "  OK $url -> $got"
}

echo "== Smoke HTTP =="
check_code "http://localhost:8000/docs" 200       # API (Swagger)
check_code "http://localhost:8000/inscrits" 200   # liste publique
check_code "http://localhost:3000" 200            # front React
check_code "http://localhost:8080" 200            # Adminer

echo "== POST /inscrits ne renvoie jamais de 5xx =="
post_code=$(curl -s --max-time 10 -o /dev/null -w '%{http_code}' -X POST http://localhost:8000/inscrits \
  -H 'Content-Type: application/json' \
  -d '{"nom":"Infra","prenom":"Test","email":"infra.test@example.com","dateNaissance":"1990-01-01","ville":"Paris","codePostal":"75001"}')
echo "  POST /inscrits -> $post_code"
case "$post_code" in
  201|409|422) echo "  OK (code applicatif attendu)" ;;
  *) echo "ECHEC: code inattendu $post_code (5xx ?)"; exit 1 ;;
esac

echo "Tous les tests d'infra sont passes."
