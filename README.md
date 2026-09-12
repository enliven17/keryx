# Keryx

Keryx is a pay-per-attention marketplace for AI coding sessions. Advertisers fund USDC campaigns and bid for a coding spinner placement. Earners receive a 50% revenue share when a viewable impression is accepted.

The BUIDL CTC 2026 Fall integration uses Creditcoin as the settlement chain and Attestcoin for source-chain readability. Neon PostgreSQL stores creatives, earning caps, pending source batches, and the receipt index.

## Flow

~~~text
Claude Code / VS Code
        | viewable impression
        v
Keryx server --- Neon PostgreSQL
        | aggregate and anchor
        v
SourceEngagement event on a supported source chain
        | Attestcoin proof
        v
AttestcoinSettlement on Creditcoin ---> CampaignEscrow ---> earner claim
~~~

The server never calls the CTC settlement contract with an unproven report. It publishes an event on the configured source chain. The worker requests an Attestcoin proof and submits the proof to AttestcoinSettlement.execute.

## Workspace

| Directory | Purpose |
| --- | --- |
| contracts/ | Campaign escrow, weighted auction, source event emitter, and Attestcoin ASC. |
| server/ | Hono API, Neon data store, source event anchor, and Attestcoin worker. |
| web/ | Wallet dashboard for onboarding, campaigns, auction, claims, and activity. |
| extension/ | VS Code extension that injects the sponsored line and reports viewable events. |
| cli/ | Standalone status-line daemon for Claude Code. |

## Live

| | |
| --- | --- |
| Dashboard | https://keryx-jet.vercel.app |
| API | https://keryx-api-production-3731.up.railway.app |

The API and the Attestcoin worker run as one Railway service; the dashboard is
on Vercel. Both read the same Creditcoin deployment below.

## Deployed testnet addresses

Creditcoin testnet (chain 102031, explorer https://creditcoin-testnet.blockscout.com):

| Contract | Address |
| --- | --- |
| AttestcoinSettlement (ASC) | [`0x42623b442fd0F3BC6796DA0a08a0074ba16f3209`](https://creditcoin-testnet.blockscout.com/address/0x42623b442fd0F3BC6796DA0a08a0074ba16f3209?tab=contract) |
| CampaignEscrow | [`0x342bB1e97d4EE97a5876f684829D86e6a8d74bb0`](https://creditcoin-testnet.blockscout.com/address/0x342bB1e97d4EE97a5876f684829D86e6a8d74bb0?tab=contract) |
| AuctionHouse | [`0x4e511285F7f0cD16A2e7960bB1D09772D4d36655`](https://creditcoin-testnet.blockscout.com/address/0x4e511285F7f0cD16A2e7960bB1D09772D4d36655?tab=contract) |
| USDC (mock, 6 decimals) | [`0x3ade9975CF961e4261d30fcF7C42BE7c71b522a9`](https://creditcoin-testnet.blockscout.com/address/0x3ade9975CF961e4261d30fcF7C42BE7c71b522a9?tab=contract) |

All four are source-verified on Blockscout.

Ethereum Sepolia (source chain, Attestcoin chain key 1):

| Contract | Address |
| --- | --- |
| SourceEngagement | [`0x5049168e6c5f7B0fa0D104ad669ab37c3a9Bc946`](https://eth-sepolia.blockscout.com/address/0x5049168e6c5f7B0fa0D104ad669ab37c3a9Bc946?tab=contract) |

The ASC verifies every settlement through the Creditcoin native query verifier precompile at
`0x0000000000000000000000000000000000000FD2`; no server signature can move escrowed funds.

### One settlement, proved end to end

| Step | Chain | Transaction |
| --- | --- | --- |
| `EngagementRecorded` (1 viewable impression) | Sepolia | [`0x94d5993d…ae3e46`](https://sepolia.etherscan.io/tx/0x94d5993d3248bdf8363bfd66e3236bfa65190f6aec6d3c55ef614db755ae3e46) |
| `AttestcoinSettlement.execute` with the proof | Creditcoin | [`0xe75c826a…6b4c608`](https://creditcoin-testnet.blockscout.com/tx/0xe75c826a62b75b48caa813bef11b99ef00a3da3284181b9792a8e26996b4c608) |

The campaign bid 0.6 USDC per 1,000 impressions, so the ASC charged 600 base units and split them
50/50: 300 accrued to the earner, 300 to the treasury, and the campaign balance dropped from
100.000000 to 99.999400 USDC. Nothing moved until Attestcoin proved the Sepolia receipt.

## Requirements

- Node.js 22 and pnpm
- Foundry (forge, cast, and anvil)
- A Neon PostgreSQL database
- An EVM wallet for the Creditcoin deployment
- A funded source-chain wallet for SourceEngagement

Install dependencies:

~~~bash
pnpm install
~~~

Create server/.env from server/.env.example and set DATABASE_URL to the Neon connection string. The server creates its tables during startup.

## Local run

The local EVM uses Creditcoin-compatible contracts and chain configuration:

~~~bash
export DATABASE_URL='postgresql://...'
./scripts/dev-stack.sh
~~~

The stack starts Anvil on chain 31338, deploys the contracts, seeds one campaign, and serves the dashboard at http://localhost:3000. Local execution demonstrates campaign, auction, Neon, source-event, and claim plumbing. A real Attestcoin proof requires a supported source chain and an attested source block.

Run checks directly:

~~~bash
(cd contracts && forge build && forge test)  # 11 tests, incl. the ASC receipt decoding
(cd server && pnpm typecheck)
(cd web && pnpm typecheck)
(cd extension && pnpm typecheck && pnpm test)
~~~

## Creditcoin testnet

Creditcoin testnet uses chain ID 102031, currency CTC, RPC https://rpc.cc3-testnet.creditcoin.network,
and Blockscout https://creditcoin-testnet.blockscout.com.

Deploy the source emitter first, then the Creditcoin suite:

~~~bash
# 1. source chain (Sepolia). Note the deployment block for SOURCE_START_BLOCK.
(cd contracts && SOURCE_PRIVATE_KEY=0x... forge script script/DeploySource.s.sol:DeploySource   --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast)

# 2. Creditcoin suite, wired to that emitter.
DEPLOYER_PRIVATE_KEY=0x... SOURCE_ENGAGEMENT=0x... SOURCE_START_BLOCK=<block>   ./scripts/deploy-creditcoin.sh
~~~

`scripts/deploy-creditcoin.sh` writes `contracts/deployments/creditcoin.json`. It uses
`forge create` and `cast send` rather than `forge script`: Creditcoin blocks carry no `mixHash`,
so Foundry's local fork rejects them with `prevrandao not set`. Direct sends never fork the chain.

Then copy `server/.env.example` to `server/.env`, set `DATABASE_URL`, `KERYX_NETWORK=creditcoin`,
`SOURCE_START_BLOCK`, and the two keys, and start the stack:

~~~bash
DATABASE_URL='postgresql://...' NETWORK=creditcoin ./scripts/demo.sh
~~~

Drive one paid impression end to end against the running server:

~~~bash
(cd server && node scripts/demo-flow.mjs 1)
~~~

It registers the creative, serves an ad, signs an impression as the earner, anchors the batch on
Sepolia, and prints both explorer links. The Attestcoin worker settles on Creditcoin once the
source block is attested — the proof builder holds a 32-block reorg window, so expect roughly
ten minutes between the source event and the CTC settlement transaction.

All contracts are verified on Blockscout. To verify a redeployment, `forge verify-contract` cannot
reach this instance, so POST the standard JSON input to the Blockscout v2 API directly:

~~~bash
forge verify-contract <address> <path>:<name> --show-standard-json-input > input.json
# then POST input.json as files[0] to
# <explorer>/api/v2/smart-contracts/<address>/verification/via/standard-input
# with compiler_version=v0.8.28+commit.7893614a, license_type=mit, contract_name=<name>
~~~


## Hosting

The server and worker deploy as a single Railway service from the repo root,
with `KERYX_RUN_WORKER=true` so the Attestcoin worker shares the process:

~~~bash
railway up --service keryx-api
~~~

Contract addresses come from `contracts/deployments/<network>.json` on a local
checkout and from the environment otherwise, since that file holds deployer keys
and is never committed. A hosted deployment therefore needs the address
variables (`CAMPAIGN_ESCROW`, `AUCTION_HOUSE`, `ATTESTCOIN_SETTLEMENT`,
`SOURCE_ENGAGEMENT`, `USDC_ADDRESS`, `TREASURY`) alongside the keys.

The dashboard deploys to Vercel with the project's root directory set to `web`,
so the workspace lockfile at the repo root is the one that installs:

~~~bash
vercel deploy --prod
~~~

## Hackathon fit

Keryx maps to the AI and DeFi tracks. Attention events generated by an AI coding workflow
(Claude Code, VS Code) become cross-chain data that Attestcoin proves, and that proof — not an
oracle operator, not a server signature — is what releases escrowed USDC. Campaign funds are
escrowed on Creditcoin, bids are ranked on-chain, and the 50/50 revenue split is executed inside
the ASC. Every settlement path runs through the Attestcoin Protocol and ends on Creditcoin.
