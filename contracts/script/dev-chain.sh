#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${KERYX_ANVIL_PORT:-8546}"
CHAIN_ID="${KERYX_CHAIN_ID:-31338}"
RPC="http://127.0.0.1:${PORT}"
LOG="${TMPDIR:-/tmp}/keryx-anvil.log"

pkill -f "anvil.*--port ${PORT}" 2>/dev/null || true
sleep 1
echo "starting Anvil on ${RPC} (chain ${CHAIN_ID})"
anvil --port "${PORT}" --chain-id "${CHAIN_ID}" >"${LOG}" 2>&1 &
ANVIL_PID=$!
sleep 2

DEPLOYER_PK=$(grep -m1 -A12 'Private Keys' "${LOG}" | grep -m1 '(0)' | awk '{print $2}')
SOURCE_PK=$(grep -m1 -A12 'Private Keys' "${LOG}" | grep -m1 '(1)' | awk '{print $2}')
SOURCE_ADDR=$(grep -m1 -A12 'Available Accounts' "${LOG}" | grep -m1 '(1)' | awk '{print $2}')
TREASURY=$(grep -m1 -A12 'Available Accounts' "${LOG}" | grep -m1 '(0)' | awk '{print $2}')

OUT=$(PRIVATE_KEY="${DEPLOYER_PK}" TREASURY="${TREASURY}" SOURCE_RECORDER="${SOURCE_ADDR}" \
  forge script script/Deploy.s.sol:Deploy --rpc-url "${RPC}" --broadcast 2>&1)
echo "${OUT}" | grep -iE 'MockUSDC|SourceEngagement|CampaignEscrow|AuctionHouse|AttestcoinSettlement|treasury'

addr() { echo "${OUT}" | grep -m1 "$1" | awk '{print $NF}'; }
mkdir -p deployments
cat > deployments/anvil.json <<EOF
{
  "chainId": ${CHAIN_ID},
  "rpcUrl": "${RPC}",
  "usdc": "$(addr 'MockUSDC')",
  "sourceEngagement": "$(addr 'SourceEngagement')",
  "campaignEscrow": "$(addr 'CampaignEscrow')",
  "auctionHouse": "$(addr 'AuctionHouse')",
  "attestcoinSettlement": "$(addr 'AttestcoinSettlement')",
  "treasury": "$(addr 'treasury')",
  "deployerPrivateKey": "${DEPLOYER_PK}",
  "sourcePrivateKey": "${SOURCE_PK}",
  "sourceAddress": "${SOURCE_ADDR}"
}
EOF
echo "wrote deployments/anvil.json"
echo "anvil pid ${ANVIL_PID}; use KERYX_NETWORK=anvil for the server"
