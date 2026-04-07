#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/elixir/bin:/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin
DB_PASSWORD="${BLOCKSCOUT_DB_PASSWORD:-${PGPASSWORD:-}}"
: "${DB_PASSWORD:?set BLOCKSCOUT_DB_PASSWORD or PGPASSWORD before running reset_backend.sh}"
cd /home/nickwest2025/explorer
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/home/nickwest2025/backups
BACKUP_FILE="$BACKUP_DIR/blockscout-pre-reset-$TS.dump"
mkdir -p "$BACKUP_DIR"
echo "[reset] backup start $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -p 5899 -U postgres -Fc blockscout > "$BACKUP_FILE"
echo "[reset] stop backend"
pm2 stop blockscout-backend
echo "[reset] drop/create/migrate"
mix ecto.drop --force
mix ecto.create
mix ecto.migrate
echo "[reset] restart backend"
pm2 restart blockscout-backend --update-env
pm2 save
echo "[reset] done ts=$TS"
