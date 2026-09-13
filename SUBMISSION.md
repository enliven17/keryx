# Keryx

**Keryx pays developers for the time their AI agent spends thinking. Half the ad revenue goes to them, and no payout moves until the impression is proved on-chain.**

| | |
| --- | --- |
| Dashboard | https://keryx-jet.vercel.app |
| API | https://keryx-api-production-3731.up.railway.app |
| Docs | https://keryx-jet.vercel.app/docs |
| Settlement chain | Creditcoin testnet (102031) |
| Source chain | Ethereum Sepolia (Attestcoin chain key 1) |
| Tracks | AI, DeFi |

---

## 1. The problem

An AI coding agent leaves you staring at a spinner. Ten seconds, thirty, sometimes minutes. Millions of developers spend hours a week in that state. The attention is real and it is worth something to somebody — it is worth nothing to the person spending it.

Selling that moment is the easy half. The hard half is proving it happened.

Every ad network on the internet settles on numbers its own server reports. The advertiser pays for impressions the network says it delivered; the publisher is paid whatever the network says it owes. Both parties trust the operator because there is no alternative available to them. Fraud in digital advertising is measured in tens of billions of dollars a year, and it is structural: the party with the incentive to inflate the count is the party holding the count.

Keryx removes that party from the settlement path.

---

## 2. What Keryx is

A pay-per-attention marketplace for AI coding sessions.

- **Advertisers** escrow USDC on Creditcoin, commit a creative hash on-chain, and bid a price per thousand impressions.
- **Earners** run a small client beside Claude Code or VS Code. One sponsored line appears in the agent's thinking indicator while it works.
- **Settlement** happens on Creditcoin, and only against a cryptographic proof that the impression was recorded on a different chain.

The revenue split is 50/50 between the earner and the protocol treasury, executed inside the settlement contract rather than computed off-chain and trusted.

---

## 3. How one impression travels

```
Claude Code / VS Code
        │  viewable impression, signed by the earner's local key
        ▼
Keryx server ──── Neon PostgreSQL        (batching, caps, receipt index)
        │  aggregate
        ▼
SourceEngagement on Ethereum Sepolia     (EngagementRecorded event)
        │  Attestcoin proof: inclusion + continuity
        ▼
AttestcoinSettlement on Creditcoin       (verify, then charge)
        │
        ▼
CampaignEscrow ──► earner 50% · treasury 50%
```

### 3.1 The editor reports

The client renders the sponsored line in the agent's status surface. Once it has been continuously visible for `VIEW_THRESHOLD_MS` (3 seconds by default), it signs an EIP-191 message with the earner's local key and posts it to `POST /report`:

```
Keryx report v1
campaignId=<id>
type=impression|click
earner=<lowercase address>
surface=<surface>
eventUuid=<uuid>
timestamp=<ms since epoch>
nonce=<uuid>
```

The signature binds the impression to a wallet, so one earner cannot submit events on another's behalf. Timestamps older than five minutes are rejected and each nonce is accepted once, so a captured report cannot be replayed.

Visibility is not self-declared. The CLI's status-line renderer writes a heartbeat file on every Claude Code render; the daemon only reports an impression while that heartbeat is fresh. If the terminal is not drawing the line, nothing accrues.

### 3.2 The server batches

The server verifies the signature, burns the nonce, applies a per-earner daily cap, and adds the units to a pending row in PostgreSQL.

Batching is not an optimisation, it is a requirement: anchoring every individual impression on a public chain would cost far more gas than the impression is worth.

### 3.3 The source chain records

On a timer, the server calls `recordEngagement` on `SourceEngagement`, deployed on Ethereum Sepolia. That emits:

```solidity
event EngagementRecorded(
    bytes32 indexed receiptId,
    uint256 indexed campaignId,
    address indexed earner,
    uint256 impressions,
    uint256 clicks
);
```

The contract accepts calls only from its configured recorder and rejects a `receiptId` it has already seen. It holds no funds, so compromising the recorder key produces junk events rather than stolen money — and those events still have to match a funded campaign before anything is charged.

### 3.4 Creditcoin verifies and pays

A worker watches the source chain, waits for Attestcoin to attest the block, fetches the transaction proof, and calls `execute` on the settlement contract. Everything that happens after that is described in the next section.

---

## 4. The Attestcoin integration

This is the core of the submission, so it is worth being precise about.

### 4.1 Why two chains

A single chain would be simpler and worth less. If Keryx wrote the impression directly onto Creditcoin, the settlement contract would be verifying a transaction that Keryx itself signed — the same trust an ad network asks for today, with extra steps and a blockchain logo.

Splitting the two means the record and the money live apart:

- the impression lands on a chain Keryx does not control;
- the proof is produced by Attestcoin, not by Keryx;
- the contract holding the USDC only ever sees verified data.

What the server can still do is refuse to report an impression. What it cannot do is invent one. That asymmetry is the entire design.

### 4.2 The Application Smart Contract

`AttestcoinSettlement` extends `ASCBase` from `@gluwa/asc-contracts`. Its `execute` entry point takes the proof produced by the Creditcoin proof generation API:

```solidity
function execute(
    uint8 action,
    uint64 chainKey,
    uint64 blockHeight,
    bytes calldata encodedTransaction,
    bytes32 merkleRoot,
    INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
    bytes32 lowerEndpointDigest,
    bytes32[] calldata continuityRoots
) external returns (bool);
```

`ASCBase` computes a stable query id from the proof, rejects any id it has already processed, and hands the proof to Creditcoin's **native query verifier precompile** at `0x0000000000000000000000000000000000000FD2`. The precompile checks two independent things:

- **inclusion** — a Merkle proof that this transaction really is inside that block;
- **continuity** — that the block really belongs to the chain Creditcoin has attested, so a forged block cannot be substituted.

Only when both hold does control reach our application logic.

### 4.3 What the ASC does with a verified receipt

`_processAndEmitEvent` receives the decoded source transaction and is deliberately strict:

1. the source receipt status must be `1` — a reverted source transaction proves nothing;
2. the receipt must contain an `EngagementRecorded` log;
3. that log must have come **from the registered emitter address**, with exactly four topics and 64 bytes of data. A log emitted by any other contract with a matching signature is rejected;
4. the campaign must exist, be funded, and carry a non-zero price.

Only then does it compute the cost, cap it at the campaign's remaining balance, charge the escrow, and credit the earner and the treasury. The whole path is one atomic transaction on Creditcoin.

### 4.4 Timing, honestly

The proof builder holds a 32-block reorg-protection window on Sepolia, so roughly **ten minutes** pass between the source event and the Creditcoin settlement. This is a property of the attestation, not a queue that can be drained. The worker polls `/api/v1/attested-height/1`, skips anything above the attested height, and advances its cursor only on a clean pass, so a failed tick retries rather than skips.

---

## 5. Contracts

| Contract | Chain | Address |
| --- | --- | --- |
| `AttestcoinSettlement` (ASC) | Creditcoin | [`0x42623b442fd0F3BC6796DA0a08a0074ba16f3209`](https://creditcoin-testnet.blockscout.com/address/0x42623b442fd0F3BC6796DA0a08a0074ba16f3209?tab=contract) |
| `CampaignEscrow` | Creditcoin | [`0x342bB1e97d4EE97a5876f684829D86e6a8d74bb0`](https://creditcoin-testnet.blockscout.com/address/0x342bB1e97d4EE97a5876f684829D86e6a8d74bb0?tab=contract) |
| `AuctionHouse` | Creditcoin | [`0x4e511285F7f0cD16A2e7960bB1D09772D4d36655`](https://creditcoin-testnet.blockscout.com/address/0x4e511285F7f0cD16A2e7960bB1D09772D4d36655?tab=contract) |
| `MockUSDC` (6 decimals) | Creditcoin | [`0x3ade9975CF961e4261d30fcF7C42BE7c71b522a9`](https://creditcoin-testnet.blockscout.com/address/0x3ade9975CF961e4261d30fcF7C42BE7c71b522a9?tab=contract) |
| `SourceEngagement` | Sepolia | [`0x5049168e6c5f7B0fa0D104ad669ab37c3a9Bc946`](https://eth-sepolia.blockscout.com/address/0x5049168e6c5f7B0fa0D104ad669ab37c3a9Bc946?tab=contract) |

All five are source-verified on their explorers.

**`CampaignEscrow`** holds campaign budgets and accrued balances. Advertisers call `createCampaign`, `fund`, `refund` and `closeCampaign`. Only addresses marked as *controllers* may call `setBid`, `charge` or `credit`. Earners call `claim` / `claimAll` and receive USDC directly — there is no withdrawal approval and no operator in the path.

**`AuctionHouse`** ranks funded campaigns by price per thousand impressions and is a controller of the escrow. A campaign drops out of contention as soon as its balance can no longer cover its own bid.

**`AttestcoinSettlement`** is the only other controller. It becomes able to move money exactly once per proved receipt, and never otherwise.

---

## 6. Economics

An advertiser bids a price per *block*, where one block is a thousand impressions. A click bills at fifty impressions. The arithmetic lives in one Solidity library so that the contract, the server and the dashboard cannot drift apart.

```
units    = impressions + clicks × 50
cost     = units × pricePerBlock ÷ 1000      // integer division, floors
charged  = min(cost, campaignBalance)
earner   = charged × 50%
treasury = charged − earner
```

Worked example, taken from the live deployment: a campaign bidding `0.60` USDC per thousand impressions is charged **600 base units** for a single impression, which splits into **300** for the earner and **300** for the treasury.

Abuse controls, stated plainly:

| Control | Where it lives | What it actually constrains |
| --- | --- | --- |
| EIP-191 signature per report | contract-independent, verified server-side | one earner reporting as another |
| Nonce, single use | PostgreSQL | replaying a captured report |
| 5-minute timestamp window | server | replaying an old report |
| Per-earner daily cap | PostgreSQL | one earner farming impressions |
| Render heartbeat | client | reporting an ad that is not on screen |
| Recorder-gated emitter | Sepolia contract | forging source events |
| Duplicate `receiptId` rejection | Sepolia contract | double-anchoring one batch |
| Query id dedupe | `ASCBase` on Creditcoin | replaying one proof twice |
| Balance cap on charge | Creditcoin contract | overdrawing a campaign |

The last four are enforced on-chain. The first five are enforced by the operator, and we say so rather than implying otherwise — see §10.

---

## 7. Proved on testnet

Three impressions have travelled the full path. Each was recorded on Sepolia, attested by Attestcoin, and settled on Creditcoin by the deployed worker with no manual step.

| Impression | Sepolia (`EngagementRecorded`) | Creditcoin (`execute` → `EngagementSettled`) |
| --- | --- | --- |
| 1 | [`0x94d5993d…ae3e46`](https://sepolia.etherscan.io/tx/0x94d5993d3248bdf8363bfd66e3236bfa65190f6aec6d3c55ef614db755ae3e46) | [`0xe75c826a…6b4c608`](https://creditcoin-testnet.blockscout.com/tx/0xe75c826a62b75b48caa813bef11b99ef00a3da3284181b9792a8e26996b4c608) |
| 2 | [`0x358906be…f30cea0`](https://sepolia.etherscan.io/tx/0x358906be250533c0b7737fc9a7a34b220b4d556b5b11fbd41d0531998f30cea0) | [`0xf6b6464b…5d98994f`](https://creditcoin-testnet.blockscout.com/tx/0xf6b6464b57838c3745c8891c2952359447cb8e0824d634ac01477b865d98994f) |
| 3 | [`0xa09fd018…0956127b`](https://sepolia.etherscan.io/tx/0xa09fd0180c590d2018c29374d499bc588520596f2695519c9463ee920956127b) | [`0x10202086…be3d108c`](https://creditcoin-testnet.blockscout.com/tx/0x10202086e0a73f0b37fa6924d2b179360db39bee42fa7c7f2815de80be3d108c) |

On-chain result after the three: the earner's accrued balance went `0 → 900` base units, and the campaign balance went `100.000000 → 99.998200` USDC. Three impressions, 600 units charged each, split 50/50 every time.

---

## 8. Architecture

| Component | Stack | Role |
| --- | --- | --- |
| `contracts/` | Solidity 0.8.28, Foundry | Escrow, auction, ASC, source emitter |
| `server/` | Hono, viem, `@gluwa/usc-sdk` | Ad selection, signed reports, source anchoring, Attestcoin worker |
| `web/` | Next.js 15, wagmi, Privy | Advertiser and earner dashboard, docs |
| `extension/` | TypeScript, esbuild | VS Code surface; patches the Claude Code bundle and restores it byte-for-byte |
| `cli/` | Node, viem | Standalone status-line daemon for terminal Claude Code |
| Database | Neon PostgreSQL | Creatives, caps, pending batches, receipt index |

Hosting: the API and the Attestcoin worker run as one Railway service; the dashboard is on Vercel. Both read the same Creditcoin deployment.

Tests: 11 Foundry tests (including the ASC's receipt decoding, foreign-emitter rejection, balance cap and revenue split), 17 extension unit tests, and 46 Playwright end-to-end tests across desktop and mobile.

---

## 9. Running it

```bash
pnpm install

# Local: Anvil on a Creditcoin-compatible chain, seeded campaign, dashboard on :3000
export DATABASE_URL='postgresql://…'
./scripts/dev-stack.sh

# Drive one paid impression through a running server
(cd server && node scripts/demo-flow.mjs 1)
```

Deploying to testnet is two steps — the source emitter first, then the suite that points at it:

```bash
# 1 · source chain; note the deployment block
(cd contracts && SOURCE_PRIVATE_KEY=0x… forge script script/DeploySource.s.sol:DeploySource \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast)

# 2 · Creditcoin suite, wired to that emitter
DEPLOYER_PRIVATE_KEY=0x… SOURCE_ENGAGEMENT=0x… SOURCE_START_BLOCK=<block> \
  ./scripts/deploy-creditcoin.sh
```

`forge script` cannot run against Creditcoin: its blocks carry no `mixHash`, so Foundry's local fork rejects them with `prevrandao not set`. The deploy script uses `forge create` and `cast send` instead, which never fork the chain. This is worth knowing before you spend an hour on it.

A local chain proves the plumbing, not the proof — Attestcoin can only attest a real source chain, so an Anvil transaction will never settle.

---

## 10. Limits

Stated rather than buried:

- **Settlement is not instant.** The attestation window puts roughly ten minutes between an impression and its payout.
- **The server can withhold.** Proof stops it from inventing impressions, not from declining to anchor one. An earner who is never reported is never paid. Making non-reporting detectable is the obvious next piece of work.
- **Daily caps are off-chain.** They constrain a well-behaved operator, not a hostile one.
- **USDC here is a mock.** The testnet deployment mints its own ERC-20; a production deployment points `USDC_ADDRESS` at the real token and nothing else changes.
- **Gas is paid by the operator.** Anchoring and settling both cost money, which is why impressions are batched rather than settled one by one.

---

## 11. Track fit

**AI.** Attention generated by an AI coding workflow becomes cross-chain data that Attestcoin proves, and that proof — not an oracle operator — is what releases escrowed funds. The trigger is autonomous: a worker watches a foreign chain and calls a Creditcoin contract with no human in the loop.

**DeFi.** Campaign funds are escrowed on Creditcoin, bids are ranked on-chain, charges are capped at the remaining balance, and the revenue split is executed by the contract. Earners claim non-custodially, directly from the escrow.
