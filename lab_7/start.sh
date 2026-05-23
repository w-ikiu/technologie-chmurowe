#!/bin/bash
export MSYS_NO_PATHCONV=1

echo "zatrzymywanie i usuwanie starych kontenerow..."
docker stop nginx backend_1 backend_2 worker redis postgres 2>/dev/null
docker rm nginx backend_1 backend_2 worker redis postgres 2>/dev/null

echo "usuwanie starych sieci..."
docker network rm proxy-net app-net db-net 2>/dev/null

echo "tworzenie wolumenow..."
docker volume create pg_data 2>/dev/null
docker volume create backend_logs 2>/dev/null

# tworzenie trzech izolowanych sieci bridge z wlasnymi podsieciami i bramami
# proxy-net: nginx i oba backendy - ruch z zewnatrz wchodzi tutaj
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/24 \
  --gateway 172.20.0.1 \
  proxy-net

# app-net: oba backendy, worker i redis - warstwa aplikacji bez dostepu z zewnatrz
docker network create \
  --driver bridge \
  --subnet 172.21.0.0/24 \
  --gateway 172.21.0.1 \
  app-net

# db-net: oba backendy, worker i postgres - warstwa danych odizolowana od reszty
docker network create \
  --driver bridge \
  --subnet 172.22.0.0/24 \
  --gateway 172.22.0.1 \
  db-net

# postgres dostepny tylko w db-net - izolacja bazy danych
# statyczne ip i niestandardowy mac dla weryfikacji przez docker inspect
echo "uruchamianie postgres..."
docker run -d --name postgres \
  --network db-net \
  --ip 172.22.0.10 \
  --mac-address 02:42:ac:16:00:10 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -v pg_data:/var/lib/postgresql/data \
  postgres:15-alpine

# redis dostepny tylko w app-net - cache nie potrzebuje dostepu do db-net
# tmpfs zamiast named volume bo dane cache sa z natury ulotne
echo "uruchamianie redis..."
docker run -d --name redis \
  --network app-net \
  --ip 172.21.0.10 \
  --tmpfs /data \
  redis:7-alpine

echo "czekam na postgres..."
sleep 5

# backend_1 podlaczony do trzech sieci: proxy-net (nginx), app-net (redis), db-net (postgres)
echo "uruchamianie backend_1..."
docker run -d --name backend_1 \
  --network proxy-net \
  --ip 172.20.0.11 \
  -p 3000:3000 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -e POSTGRES_HOST=postgres \
  -e REDIS_URL=redis://redis:6379 \
  -v backend_logs:/app/logs \
  --tmpfs /app/tmp \
  wchelminska/backend:v2

docker network connect --ip 172.21.0.11 app-net backend_1
docker network connect --ip 172.22.0.11 db-net backend_1

# backend_2 identyczna konfiguracja co backend_1 - druga instancja dla load balancingu
echo "uruchamianie backend_2..."
docker run -d --name backend_2 \
  --network proxy-net \
  --ip 172.20.0.12 \
  -p 3001:3000 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -e POSTGRES_HOST=postgres \
  -e REDIS_URL=redis://redis:6379 \
  -v backend_logs:/app/logs \
  --tmpfs /app/tmp \
  wchelminska/backend:v2

docker network connect --ip 172.21.0.12 app-net backend_2
docker network connect --ip 172.22.0.12 db-net backend_2

# worker dziala tylko w app-net i db-net - brak podlaczenia do proxy-net
# brak wystawionego portu - niedostepny z zewnatrz
echo "uruchamianie worker..."
docker run -d --name worker \
  --network app-net \
  --ip 172.21.0.20 \
  -e REDIS_URL=redis://redis:6379 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=products \
  -e POSTGRES_HOST=postgres \
  wchelminska/backend:v2 \
  node -e "
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    client.connect().then(() => {
      console.log('worker uruchomiony, polaczony z redis');
      setInterval(() => console.log('worker dziala:', new Date().toISOString()), 10000);
    });
  "

docker network connect --ip 172.22.0.20 db-net worker

# nginx w proxy-net jako jedyny punkt wejscia z zewnatrz
# statyczne ip i niestandardowy mac dla weryfikacji przez docker inspect
echo "uruchamianie nginx..."
docker run -d --name nginx \
  --network proxy-net \
  --ip 172.20.0.10 \
  --mac-address 02:42:ac:14:00:10 \
  -p 80:80 \
  wchelminska/nginx:v2

echo ""
echo "srodowisko uruchomione!"
echo "frontend/api: http://localhost:80"
echo "backend_1 bezposrednio: http://localhost:3000"
echo "backend_2 bezposrednio: http://localhost:3001"
