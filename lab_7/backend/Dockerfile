# etap 1: instalacja zaleznosci (deps)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
# instalacja tylko paczek produkcyjnych (bez dev)
RUN npm install --omit=dev

# etap 2: obraz produkcyjny
FROM node:18-alpine AS production
WORKDIR /app

# argumenty oci
ARG BUILD_DATE
ARG VERSION=v2

# etykiety oci
LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.title="product-dashboard-backend"

# kopiujemy zaleznosci i kod
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./

# tworzymy foldery na wolumeny (dla named volume i tmpfs)
RUN mkdir -p /app/logs /app/tmp

# ograniczenie uprawnien
RUN chown -R node:node /app
USER node

EXPOSE 3000

# healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]