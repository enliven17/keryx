#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${DATABASE_URL:?Set DATABASE_URL to a Neon PostgreSQL connection string}"

echo "starting local CTC-compatible EVM"
"$ROOT/contracts/script/dev-chain.sh"
(cd "$ROOT/server" && node scripts/gen-abis.mjs)
(cd "$ROOT/web" && node scripts/gen-abis.mjs)
(cd "$ROOT/server" && KERYX_NETWORK=anvil PUBLIC_URL=http://localhost:4021 pnpm start) &
SERVER_PID=$!
(cd "$ROOT/server" && node scripts/seed-campaign.mjs anvil)
(cd "$ROOT/web" && NEXT_PUBLIC_KERYX_NETWORK=anvil NEXT_PUBLIC_SERVER_BASE=http://localhost:4021 pnpm dev) &
WEB_PID=$!
trap 'kill "$SERVER_PID" "$WEB_PID" 2>/dev/null || true' EXIT INT TERM
echo "server: http://localhost:4021"
echo "web:    http://localhost:3000"
echo "press Ctrl+C to stop"
wait
