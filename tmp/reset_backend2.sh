#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/elixir/bin:/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin
export MIX_ENV=prod
DB_PASSWORD="${BLOCKSCOUT_DB_PASSWORD:-${PGPASSWORD:-}}"
: "${DB_PASSWORD:?set BLOCKSCOUT_DB_PASSWORD or PGPASSWORD before running reset_backend2.sh}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${DB_PASSWORD}@localhost:5899/blockscout}"
export PGHOST='localhost'
export PGPORT='5899'
export PGUSER='postgres'
export PGPASSWORD="${DB_PASSWORD}"
export PGDATABASE='blockscout'
export ETHEREUM_JSONRPC_HTTP_URL='http://127.0.0.1:19080'
export SETH_RPC_URL='http://127.0.0.1:19080'
export SETH_LIVE_HEAD_RPC_URL='http://127.0.0.1:19080'
export SETH_NETWORK='3'
export SETH_SHARDS='root:1,shard3:3'
export SETH_POOL_COUNT_PER_SHARD='32'
cd /home/nickwest2025/explorer
echo '[reset2] drop/create/migrate start'
pm2 stop blockscout-backend
mix ecto.drop --force
mix ecto.create
mix ecto.migrate
echo '[reset2] restart backend'
pm2 restart blockscout-backend --update-env
pm2 save
echo '[reset2] done'
