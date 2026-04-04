# etap 1: instalacja zaleznosci produkcyjnych (deps)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
# instalujemy zaleznosci bez devdependencies
RUN npm install --omit=dev

# etap 2: obraz koncowy (production)
FROM node:18-alpine AS production
WORKDIR /app
# kopiujemy node_modules i kod aplikacji
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./

# zmiana wlasciciela plikow
RUN chown -R node:node /app
USER node

EXPOSE 3000

# healthcheck sprawdzajacy endpoint health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]