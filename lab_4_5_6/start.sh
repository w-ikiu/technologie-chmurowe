#!/bin/bash
export MSYS_NO_PATHCONV=1

# zatrzymanie i usuniecie starych kontenerow
docker stop frontend backend redis postgres 2>/dev/null
docker rm frontend backend redis postgres 2>/dev/null

# 1. tworzenie sieci
docker network create product-net 2>/dev/null

# 2. tworzenie nazwanych wolumenow
docker volume create pg_data
docker volume create backend_logs

# 3. uruchomienie bazy postgres
docker run -d --name postgres \
  --network product-net \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -v pg_data:/var/lib/postgresql/data \
  postgres:15-alpine

# 4. uruchomienie bazy redis
docker run -d --name redis \
  --network product-net \
  --tmpfs /data \
  redis:7-alpine

# chwila przerwy na start bazy
sleep 3

# 5. uruchomienie backendu
docker run -d --name backend \
  --network product-net \
  -p 3000:3000 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -e POSTGRES_HOST=postgres \
  -e REDIS_URL=redis://redis:6379 \
  -v backend_logs:/app/logs \
  --tmpfs /app/tmp \
  wchelminska/backend:v2

# 6. uruchomienie frontendu
docker run -d --name frontend \
  --network product-net \
  -p 8080:80 \
  -v "$(pwd)/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  wchelminska/frontend:v2