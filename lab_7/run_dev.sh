#!/bin/bash
export MSYS_NO_PATHCONV=1

echo "Uruchamianie backendu w trybie deweloperskim"

# zatrzymanie i usuniecie starego kontenera dev (jesli istnieje)
docker stop backend-dev 2>/dev/null
docker rm backend-dev 2>/dev/null

# upewniamy sie ze siec i wolumeny istnieja (moga byc juz z start.sh)
docker network create product-net 2>/dev/null
docker volume create pg_data 2>/dev/null
docker volume create backend_logs 2>/dev/null

# upewniamy sie ze postgres i redis dzialaja
if ! docker ps --format '{{.Names}}' | grep -q '^postgres$'; then
  echo "Uruchamianie postgres..."
  docker run -d --name postgres \
    --network product-net \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=admin \
    -e POSTGRES_DB=products \
    -v pg_data:/var/lib/postgresql/data \
    postgres:15-alpine
  sleep 3
fi

if ! docker ps --format '{{.Names}}' | grep -q '^redis$'; then
  echo "Uruchamianie redis..."
  docker run -d --name redis \
    --network product-net \
    --tmpfs /data \
    redis:7-alpine
  sleep 1
fi

# uruchomienie backendu w trybie dev:
# - bind mount kodu zrodlowego z hosta (./backend/server.js -> /app/server.js)
# - nodemon sledzi zmiany i restartuje automatycznie
# - uzywamy obrazu node:18-alpine zamiast wlasnego, zeby miec nodemon bez przebudowy
echo ""
echo "Uruchamianie backend-dev z bind mount i nodemon..."
docker run -d --name backend-dev \
  --network product-net \
  -p 3000:3000 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -e POSTGRES_HOST=postgres \
  -e REDIS_URL=redis://redis:6379 \
  -v "$(pwd)/backend/server.js:/app/server.js" \
  -v "$(pwd)/backend/package.json:/app/package.json" \
  -v backend_logs:/app/logs \
  --tmpfs /app/tmp \
  -w /app \
  node:18-alpine \
  sh -c "npm install --quiet && npm install nodemon --quiet && npx nodemon --legacy-watch --watch /app/server.js server.js"

echo ""
echo "Backend dev uruchomiony na http://localhost:3000"
echo ""
echo "JAK UZYWAC HOT-RELOAD"
echo "1. Edytuj plik: ./backend/server.js"
echo "2. Zapisz plik"
echo "3. Nodemon automatycznie wykryje zmiane i zrestartuje serwer"
echo "4. Sprawdz efekt: curl http://localhost:3000/health"
echo ""
echo "Logi kontenera:"
docker logs -f backend-dev