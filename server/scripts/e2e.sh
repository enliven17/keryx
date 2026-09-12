#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "checking contracts"
(cd "$ROOT/contracts" && forge test)
echo "checking server"
(cd "$ROOT/server" && pnpm typecheck)
echo "Keryx checks passed"
