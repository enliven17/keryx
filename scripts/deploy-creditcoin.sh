#!/usr/bin/env bash
# Deploys Keryx to Creditcoin testnet and writes contracts/deployments/creditcoin.json.
#
#   DEPLOYER_PRIVATE_KEY=0x... SOURCE_ENGAGEMENT=0x... ./scripts/deploy-creditcoin.sh
#
# SOURCE_ENGAGEMENT is the emitter already deployed on the source chain; deploy it first with
#   SOURCE_PRIVATE_KEY=0x... forge script script/DeploySource.s.sol:DeploySource \
#     --rpc-url <source rpc> --broadcast
#
# `forge script` cannot run against Creditcoin: its blocks carry no `mixHash`, so Foundry's
# local fork rejects them with "prevrandao not set". Each step is therefore a direct
# `forge create` / `cast send`, which never forks the chain.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

: "${DEPLOYER_PRIVATE_KEY:?set DEPLOYER_PRIVATE_KEY}"
: "${SOURCE_ENGAGEMENT:?set SOURCE_ENGAGEMENT to the source-chain emitter address}"
RPC="${CREDITCOIN_RPC_URL:-https://rpc.cc3-testnet.creditcoin.network}"
CHAIN_ID="${CHAIN_ID:-102031}"
SOURCE_CHAIN_ID="${SOURCE_CHAIN_ID:-11155111}"
SOURCE_CHAIN_KEY="${SOURCE_CHAIN_KEY:-1}"
SOURCE_START_BLOCK="${SOURCE_START_BLOCK:-0}"
DEPLOYER=$(cast wallet address "$DEPLOYER_PRIVATE_KEY")
TREASURY="${TREASURY:-$DEPLOYER}"

create() { forge create "$1" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --legacy "${@:2}" 2>/dev/null | grep 'Deployed to:' | awk '{print $3}'; }
send()   { cast send --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --legacy "$@" >/dev/null 2>&1; }

forge build

USDC="${USDC_ADDRESS:-}"
if [ -z "$USDC" ]; then
  USDC=$(create src/mocks/MockUSDC.sol:MockUSDC)
  send "$USDC" "mint(address,uint256)" "$DEPLOYER" 1000000000000
fi
ESCROW=$(create src/CampaignEscrow.sol:CampaignEscrow --constructor-args "$USDC" "$DEPLOYER")
AUCTION=$(create src/AuctionHouse.sol:AuctionHouse --constructor-args "$ESCROW")
SETTLEMENT=$(create src/AttestcoinSettlement.sol:AttestcoinSettlement --constructor-args "$ESCROW" "$TREASURY" "$DEPLOYER")

send "$ESCROW" "setController(address,bool)" "$AUCTION" true
send "$ESCROW" "setController(address,bool)" "$SETTLEMENT" true
send "$SETTLEMENT" "setSourceEngagement(address)" "$SOURCE_ENGAGEMENT"

mkdir -p deployments
cat > deployments/creditcoin.json <<EOF
{
  "chainId": ${CHAIN_ID},
  "rpcUrl": "${RPC}",
  "explorer": "https://creditcoin-testnet.blockscout.com",
  "usdc": "${USDC}",
  "sourceEngagement": "${SOURCE_ENGAGEMENT}",
  "sourceChainId": ${SOURCE_CHAIN_ID},
  "sourceChainKey": ${SOURCE_CHAIN_KEY},
  "sourceStartBlock": ${SOURCE_START_BLOCK},
  "sourceExplorer": "https://sepolia.etherscan.io",
  "campaignEscrow": "${ESCROW}",
  "auctionHouse": "${AUCTION}",
  "attestcoinSettlement": "${SETTLEMENT}",
  "treasury": "${TREASURY}",
  "deployerPrivateKey": "${DEPLOYER_PRIVATE_KEY}",
  "sourcePrivateKey": "${SOURCE_ENGAGEMENT_PRIVATE_KEY:-$DEPLOYER_PRIVATE_KEY}",
  "sourceAddress": "${DEPLOYER}"
}
EOF

echo "wrote contracts/deployments/creditcoin.json"
cast call "$ESCROW" "controllers(address)(bool)" "$SETTLEMENT" --rpc-url "$RPC" 2>/dev/null | grep -q true \
  && echo "settlement wired as escrow controller" || { echo "wiring failed" >&2; exit 1; }
