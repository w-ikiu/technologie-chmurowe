# etap 1: builder - instaluje wszystkie zaleznosci
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY worker.js ./

# etap 2: runner - obraz produkcyjny bez narzedzi deweloperskich
FROM node:18-alpine AS runner
WORKDIR /app

ARG BUILD_DATE
ARG VERSION=v3
LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.title="product-dashboard-worker"

# tylko zaleznosci produkcyjne bez cache npm
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/worker.js ./

RUN chown -R node:node /app
USER node

CMD ["node", "worker.js"]
