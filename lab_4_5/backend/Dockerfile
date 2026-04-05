# etap 1: instalacja zaleznosci produkcyjnych (deps)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
# instalujemy tylko zaleznosci produkcyjne
RUN npm install --omit=dev

# etap 2: testowanie (test)
FROM deps AS test
WORKDIR /app
# instalujemy devdependencies uzywane w testach
RUN npm install
# kopiujemy reszte kodu, w tym testy
COPY . .
# uruchamiamy testy (niepowodzenie zatrzyma proces)
RUN npm test

# etap 3: obraz koncowy (production)
FROM node:18-alpine AS production
WORKDIR /app

# argumenty budowania i metadane oci
ARG BUILD_DATE
ARG VERSION
ARG NODE_ENV=production

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.title="backend-api"

# ustawienie zmiennej srodowiskowej
ENV NODE_ENV=$NODE_ENV

# kopiujemy tylko node_modules z etapu deps (bez testow i devdependencies)
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./

RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]