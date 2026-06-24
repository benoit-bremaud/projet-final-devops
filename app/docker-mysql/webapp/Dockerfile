# Front-end React image (CRA). Build context = app/ root (see compose),
# to reach package.json, public/ and src/.
FROM node:20

WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
# Prevent react-scripts from opening a browser inside the container.
ENV BROWSER=none

# Option A (runtime injection via the dev server). Accessing the CRA dev server
# through the EC2 public IP would otherwise fail:
#  - HOST=0.0.0.0                      -> bind on all interfaces
#  - DANGEROUSLY_DISABLE_HOST_CHECK    -> accept a Host header != localhost
#                                         (avoids "Invalid Host header")
#  - WDS_SOCKET_PORT=0                 -> avoid the HMR websocket failing behind a public IP
# REACT_APP_API_URL is NOT baked here: it is injected at RUNTIME by the prod
# compose (set to http://<instance_public_ip>:8000 by Ansible at deploy time).
ENV HOST=0.0.0.0
ENV DANGEROUSLY_DISABLE_HOST_CHECK=true
ENV WDS_SOCKET_PORT=0

# Runtime deps are enough for `npm start` (no cypress/jsdoc).
COPY package.json ./
RUN npm install --omit=dev --silent

COPY public ./public
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
