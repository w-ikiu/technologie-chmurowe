# etap 1: instalacja zaleznosci (deps)
FROM node:18-alpine AS deps
WORKDIR /app
# kopiujemy tylko pliki definicji pakietow
COPY package*.json ./
# instalujemy wszystkie zaleznosci
RUN npm install

# etap 2: budowanie aplikacji react (build)
FROM node:18-alpine AS build
WORKDIR /app
# kopiujemy node_modules z poprzedniego etapu
COPY --from=deps /app/node_modules ./node_modules
# kopiujemy kod aplikacji
COPY . .
# budujemy wersje produkcyjna
RUN npm run build

# etap 3: obraz nginx (production)
FROM nginx:alpine AS production

# argumenty budowania i metadane oci
ARG BUILD_DATE
ARG VERSION
ARG NODE_ENV=production

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.title="frontend-app"

# kopiujemy gotowy build
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# konfiguracja nginx dla uzytkownika non-root
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d
USER nginx

# eksponujemy port 8080
EXPOSE 8080

# healthcheck sprawdzajacy serwer www na porcie 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]