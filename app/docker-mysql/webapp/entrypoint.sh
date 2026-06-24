#!/bin/sh
set -e

# Runtime config injection: replace the build-time placeholder with the real API
# URL (REACT_APP_API_URL, set at deploy time by the prod compose / Ansible).
if [ -n "$REACT_APP_API_URL" ]; then
  find /usr/share/nginx/html -type f -name '*.js' \
    -exec sed -i "s|__API_URL__|$REACT_APP_API_URL|g" {} +
fi

exec nginx -g 'daemon off;'
