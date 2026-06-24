#!/bin/sh
set -eu

# Runtime config injection: replace the build-time placeholder with the real API
# URL (REACT_APP_API_URL, set at deploy time by the prod compose / Ansible).
if [ -n "${REACT_APP_API_URL:-}" ]; then
  # Escape characters special to the sed replacement (& | \) to stay safe.
  esc=$(printf '%s' "$REACT_APP_API_URL" | sed -e 's/[&|\\]/\\&/g')
  find /usr/share/nginx/html -type f -name '*.js' \
    -exec sed -i "s|__API_URL__|$esc|g" {} +
else
  echo "WARN: REACT_APP_API_URL not set; the front keeps the __API_URL__ placeholder." >&2
fi

exec nginx -g 'daemon off;'
