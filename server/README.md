# Keryx server

The server exposes the ad marketplace API and connects the Neon event index to the source-chain and Creditcoin layers.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /health | Service, Neon, source, and CTC configuration. |
| GET | /ad | Select a funded campaign by bid weight. |
| POST | /campaigns | Store a campaign creative after checking its on-chain hash. |
| POST | /report | Apply the earner daily cap and queue an impression or click. |
| GET | /earnings/:address | Read claimable USDC from CampaignEscrow. |
| GET | /auction | Read the live auction board. |
| GET | /activity | Read Neon events and indexed receipts. |
| POST | /settle/flush | Force source-event anchoring. |

## Data and settlement

DATABASE_URL must be a Neon PostgreSQL connection string. Tables are created on startup with the keryx_ prefix. The server aggregates capped events in Neon, writes a SourceEngagement event, and records the source transaction. The worker then gets an Attestcoin proof and calls AttestcoinSettlement.execute on Creditcoin. Pending batches remain retryable when a source transaction fails.

Run the API and worker separately:

~~~bash
pnpm start
pnpm worker
~~~

Run the checks:

~~~bash
pnpm typecheck
pnpm e2e
~~~
