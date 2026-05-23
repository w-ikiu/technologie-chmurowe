#!/bin/bash

BACKUP_FILE=$1

# sprawdzenie argumentu
if [ -z "$BACKUP_FILE" ]; then
  echo "Uzycie: ./restore.sh <sciezka_do_backupu.tar.gz>"
  echo "Przyklad: ./restore.sh ./backups/backup_pg_data_20240521_143022.tar.gz"
  exit 1
fi

# sprawdzenie czy plik istnieje
if [ ! -f "$BACKUP_FILE" ]; then
  echo "BLAD: Plik nie istnieje: $BACKUP_FILE"
  exit 1
fi

echo "Przywracanie danych z backupu"
echo "Plik: $BACKUP_FILE"
echo ""

# zatrzymanie kontenera postgres (zeby nie bylo konfliktow przy zapisie)
echo "[1/5] Zatrzymywanie kontenera postgres..."
docker stop postgres 2>/dev/null && echo "  -> postgres zatrzymany" || echo "  -> postgres nie byl uruchomiony"

# upewniamy sie ze wolumen istnieje
echo "[2/5] Sprawdzanie wolumenu pg_data..."
docker volume create pg_data 2>/dev/null
echo "  -> wolumen pg_data gotowy"

# czyszczenie wolumenu przed przywroceniem
echo "[3/5] Czyszczenie wolumenu pg_data..."
docker run --rm \
  -v pg_data:/data \
  alpine sh -c "rm -rf /data/* /data/..?* /data/.[!.]*" 2>/dev/null
echo "  -> wolumen wyczyszczony"

# przywracanie danych z archiwum
echo "[4/5] Przywracanie danych..."
BACKUP_ABS=$(realpath "$BACKUP_FILE")
BACKUP_DIR=$(dirname "$BACKUP_ABS")
BACKUP_FILENAME=$(basename "$BACKUP_ABS")

MSYS_NO_PATHCONV=1 docker run --rm \
  -v pg_data:/data \
  -v "${BACKUP_DIR}:/backup:ro" \
  alpine \
  tar xzf "/backup/${BACKUP_FILENAME}" -C /data

if [ $? -ne 0 ]; then
  echo "BLAD: Przywracanie nie powiodlo sie"
  exit 1
fi
echo "  -> dane przywrocone"

# uruchomienie kontenera postgres
echo "[5/5] Uruchamianie kontenera postgres..."
docker start postgres 2>/dev/null || \
  docker run -d --name postgres \
    --network product-net \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=admin \
    -e POSTGRES_DB=products \
    -v pg_data:/var/lib/postgresql/data \
    postgres:15-alpine
echo "  -> postgres uruchomiony"

# czekanie na gotowos bazy (max 30 sekund)
echo ""
echo "Czekam na gotowos bazy danych..."
MAX_WAIT=30
WAITED=0
until docker exec postgres psql -U admin -d products -c "SELECT 1" &>/dev/null; do
  sleep 2
  WAITED=$((WAITED + 2))
  echo "  ... czekam (${WAITED}s)"
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "BLAD: Baza nie odpowiada po ${MAX_WAIT}s!"
    exit 1
  fi
done

echo ""
echo "Weryfikacja przywrocionych danych"
docker exec postgres psql -U admin -d products -c "SELECT COUNT(*) AS liczba_rekordow FROM items;"
echo ""
echo "Szczegolowe dane:"
docker exec postgres psql -U admin -d products -c "SELECT * FROM items LIMIT 10;"

echo ""
echo "Przywracanie zakonczone sukcesem!"