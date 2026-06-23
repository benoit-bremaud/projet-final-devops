# Image du front React (CRA). Contexte de build = racine du depot (cf. compose)
# pour acceder a package.json, public/ et src/.
FROM node:20

WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
# Evite que react-scripts tente d'ouvrir un navigateur dans le conteneur.
ENV BROWSER=none

# Seules les dependances runtime suffisent a `npm start` (pas cypress/jsdoc).
COPY package.json ./
RUN npm install --omit=dev --silent

COPY public ./public
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
