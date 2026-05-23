#!/bin/bash

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_pg_data_${TIMESTAMP}.tar.gz"
BACKUP_DIR="$(pwd)/backups"

echo "Backup wolumenu pg_data"
echo "Sygnatura czasowa: ${TIMESTAMP}"

# tworzenie folderu na backupy jesli nie istnieje
mkdir -p "${BACKUP_DIR}"

# sprawdzenie czy wolumen istnieje
if ! docker volume inspect pg_data &>/dev/null; then
  echo "BLAD: Wolumen pg_data nie istnieje!"
  exit 1
fi

echo "Tworzenie archiwum..."

# uruchamiamy tymczasowy kontener alpine, montujemy wolumen jako read-only
# i tworzymy archiwum tar.gz w folderze backups na hoscie
MSYS_NO_PATHCONV=1 docker run --rm \
  -v pg_data:/data:ro \
  -v "${BACKUP_DIR}:/backup" \
  alpine \
  tar czf "/backup/${BACKUP_FILE}" -C /data .

if [ $? -eq 0 ]; then
  echo ""
  echo "Backup zapisany pomyslnie:"
  ls -lh "${BACKUP_DIR}/${BACKUP_FILE}"
  echo ""
  echo "Pelna sciezka: ${BACKUP_DIR}/${BACKUP_FILE}"
else
  echo "BLAD: Tworzenie backupu nie powiodlo sie!"
  exit 1
fi