# etap 1: builder - instaluje wszystkie zaleznosci
# tutaj bylyby tez devDependencies i narzedzia do budowania
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# instalacja wszystkich zaleznosci wraz z cache menedzera pakietow
RUN npm install

COPY server.js ./

# etap 2: runner - obraz produkcyjny
# kopiuje tylko to co potrzebne do uruchomienia bez narzedzi deweloperskich i cache
FROM node:18-alpine AS runner
WORKDIR /app

# argumenty i etykiety oci
ARG BUILD_DATE
ARG VERSION=v3
LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.title="product-dashboard-backend"

# instalacja tylko zaleznosci produkcyjnych bez cache npm
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# kopiowanie kodu z etapu builder
COPY --from=builder /app/server.js ./

# tworzymy folder na logi
RUN mkdir -p /app/logs && chown -R node:node /app
USER node

# healthcheck pingujacy endpoint health
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${BACKEND_PORT:-3000}/health || exit 1

CMD ["node", "server.js"]
