# Keryx demo

This runbook shows the campaign, auction, Neon, and source-event flow. The target contracts use Creditcoin-compatible EVM interfaces; the testnet deployment uses CTC.

## 1. Configure Neon

Create server/.env:

~~~dotenv
DATABASE_URL=postgresql://user:password@ep-example.eu-central-1.aws.neon.tech/keryx?sslmode=require
KERYX_NETWORK=anvil
~~~

The API creates the Keryx tables in Neon on startup.

## 2. Start the local stack

~~~bash
./scripts/dev-stack.sh
~~~

This starts Anvil, deploys CampaignEscrow, AuctionHouse, SourceEngagement, and AttestcoinSettlement, creates a funded demo campaign, and starts the server and web app.

Open http://localhost:3000, connect the local wallet, and open the Advertise page. The seeded campaign should appear in the auction.

## 3. Send an earning event

The CLI or extension signs every report with the local earner key before sending it to the API. This prevents one wallet from submitting events for another wallet. Start the CLI after onboarding:

~~~bash
keryx setup --server http://localhost:4021
keryx start
~~~

The response confirms that the signed event is pending source anchoring. The record is visible in Neon through GET /activity.

With a local source key configured, anchor it:

~~~bash
curl -X POST http://localhost:4021/settle/flush
~~~

That call writes EngagementRecorded to SourceEngagement. The Attestcoin worker can prove and settle events from a supported source chain. An Anvil-only transaction is useful for local plumbing, but cannot produce a public Attestcoin proof.

## 4. Testnet flow

The live deployment is already wired: SourceEngagement on Ethereum Sepolia
(`0x5049168e6c5f7B0fa0D104ad669ab37c3a9Bc946`, Attestcoin chain key 1) and the settlement suite on
Creditcoin testnet with the ASC at `0x42623b442fd0F3BC6796DA0a08a0074ba16f3209`. To redeploy, see
"Creditcoin testnet" in the README.

Point server/.env at it:

~~~dotenv
KERYX_NETWORK=creditcoin
CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CHAIN_ID=102031
SOURCE_CHAIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SOURCE_CHAIN_ID=11155111
SOURCE_CHAIN_KEY=1
SOURCE_START_BLOCK=11688111
DEPLOYER_PRIVATE_KEY=0x...
SOURCE_ENGAGEMENT_PRIVATE_KEY=0x...
DATABASE_URL=postgresql://...
~~~

The deployer wallet needs CTC on Creditcoin testnet, and the source wallet needs Sepolia ETH.
Start the stack and drive one paid impression:

~~~bash
NETWORK=creditcoin ./scripts/demo.sh
(cd server && node scripts/demo-flow.mjs 1)
~~~

`demo-flow.mjs` registers the creative, serves the ad, signs an impression as the earner, anchors
the batch on Sepolia, and prints both explorer links. The Attestcoin worker then polls
`/api/v1/attested-height/1`, waits out the proof builder's 32-block reorg window (~10 minutes),
requests the transaction proof, and calls `execute` on the ASC. The CTC transaction hash lands in
Neon and appears in `GET /activity` and on the /earn page.

The earner claims the accrued USDC with `claimAll()` on CampaignEscrow from /earn.
