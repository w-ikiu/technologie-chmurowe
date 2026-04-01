# etap 1: instalacja zaleznosci (deps)
FROM node:18-alpine AS deps
WORKDIR /app
# kopiujemy tylko pliki definicji pakietow
COPY package*.json ./
# instalujemy wszystkie zaleznosci (takze te do budowania)
RUN npm install

# etap 2: budowanie aplikacji react (build)
FROM node:18-alpine AS build
WORKDIR /app
# kopiujemy gotowe node_modules z poprzedniego etapu
COPY --from=deps /app/node_modules ./node_modules
# kopiujemy reszte plikow zrodlowych aplikacji
COPY . .
# budujemy wersje produkcyjna (tu powstanie folder build)
RUN npm run build

# etap 3: obraz nginx (production)
FROM nginx:alpine AS production
# kopiujemy tylko gotowy build do folderu serwera nginx
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# konfiguracja nginx dla uzytkownika bez uprawnien roota
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d
USER nginx

EXPOSE 80

# healthcheck sprawdzajacy serwer www
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]