# Front-end React image — Option B: optimized STATIC build served by nginx.
# Build context = app/ root (see compose), to reach package.json, public/ and src/.
#
# REACT_APP_API_URL is build-time in CRA, but the EC2 IP is only known at deploy.
# Trick: bake a placeholder (__API_URL__) at build time, then substitute the real
# URL at container START via entrypoint.sh (runtime config, no rebuild needed).

# --- Stage 1: build the static bundle ---
FROM node:20 AS build
WORKDIR /app
ENV BROWSER=none
# Placeholder baked into the bundle; replaced at container start.
ENV REACT_APP_API_URL=__API_URL__
COPY package.json ./
RUN npm install --omit=dev --silent
COPY public ./public
COPY src ./src
RUN npm run build

# --- Stage 2: serve the static files with nginx on port 3000 ---
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# nginx: listen on 3000, SPA fallback to index.html (client-side routing).
RUN printf 'server {\n  listen 3000;\n  root /usr/share/nginx/html;\n  location / {\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
COPY docker-mysql/webapp/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
