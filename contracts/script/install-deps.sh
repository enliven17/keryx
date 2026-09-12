#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
echo "Foundry dependencies installed"
