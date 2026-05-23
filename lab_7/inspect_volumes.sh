#!/bin/bash

# lista named volumes aplikacji
VOLUMES=("pg_data" "backend_logs")

echo "     INSPEKCJA WOLUMENOW APLIKACJI"

for VOL in "${VOLUMES[@]}"; do
  echo ""
  echo "Wolumen: $VOL"

  # sprawdzenie czy wolumen istnieje
  if ! docker volume inspect "$VOL" &>/dev/null; then
    echo "  STATUS: nie istnieje"
    continue
  fi

  # lokalizacja na hoscie
  MOUNTPOINT=$(docker volume inspect "$VOL" --format '{{ .Mountpoint }}')
  echo "  Lokalizacja na hoscie: ${MOUNTPOINT}"

  # rozmiar danych (przez tymczasowy kontener)
  SIZE=$(MSYS_NO_PATHCONV=1 docker run --rm \
    -v "${VOL}:/data:ro" \
    alpine \
    du -sh /data 2>/dev/null | cut -f1)
  echo "  Rozmiar danych:        ${SIZE:-0B}"

  # data utworzenia wolumenu
  CREATED=$(docker volume inspect "$VOL" --format '{{ .CreatedAt }}')
  echo "  Utworzony:             ${CREATED}"

  # kontenery aktualnie uzywajace wolumenu
  echo "  Uzywajace kontenery:"
  CONTAINERS=$(docker ps -a --filter "volume=${VOL}" --format "    - {{.Names}} | status: {{.Status}}")
  if [ -z "$CONTAINERS" ]; then
    echo "    (brak aktywnych kontenerow)"
  else
    echo "$CONTAINERS"
  fi

done

echo ""
echo "PODSUMOWANIE WSZYSTKICH WOLUMENOW DOCKER:"
docker volume ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"