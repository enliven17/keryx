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

Deploy SourceEngagement on a supported source testnet. Deploy the Creditcoin suite with:

~~~dotenv
KERYX_NETWORK=creditcoin
CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CHAIN_ID=102031
SOURCE_CHAIN_RPC_URL=https://rpc.sepolia.org
SOURCE_CHAIN_KEY=1
SOURCE_ENGAGEMENT=0x...
SOURCE_ENGAGEMENT_PRIVATE_KEY=0x...
DEPLOYER_PRIVATE_KEY=0x...
DATABASE_URL=postgresql://...
~~~

After writing contracts/deployments/creditcoin.json, run:

~~~bash
NETWORK=creditcoin ./scripts/demo.sh
~~~

The worker polls source receipts, requests proof data, calls execute on the CTC ASC, and records the target transaction in Neon. The earner can then claim the accrued USDC from /earn.
