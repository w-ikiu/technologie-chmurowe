# etap 1: builder - instaluje zaleznosci
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# etap 2: runner - obraz produkcyjny bez narzedzi deweloperskich
FROM node:18-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src/ ./src/
RUN chown -R node:node /app
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
