#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK="${NETWORK:-anvil}"
: "${DATABASE_URL:?Set DATABASE_URL to a Neon PostgreSQL connection string}"

if [ "$NETWORK" = "anvil" ]; then
  "$ROOT/contracts/script/dev-chain.sh"
elif [ "$NETWORK" != "creditcoin" ]; then
  echo "NETWORK must be anvil or creditcoin" >&2
  exit 1
fi

(cd "$ROOT/server" && node scripts/gen-abis.mjs)
(cd "$ROOT/web" && node scripts/gen-abis.mjs)
(cd "$ROOT/server" && KERYX_NETWORK="$NETWORK" pnpm start) &
SERVER_PID=$!
sleep 2
(cd "$ROOT/server" && node scripts/seed-campaign.mjs "$NETWORK")
(cd "$ROOT/server" && KERYX_NETWORK="$NETWORK" pnpm worker) &
WORKER_PID=$!
(cd "$ROOT/web" && NEXT_PUBLIC_KERYX_NETWORK="$NETWORK" pnpm dev) &
WEB_PID=$!
trap 'kill "$SERVER_PID" "$WORKER_PID" "$WEB_PID" 2>/dev/null || true' EXIT INT TERM
echo "Keryx $NETWORK demo"
echo "server: http://localhost:4021"
echo "web:    http://localhost:3000"
wait
