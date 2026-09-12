import type { Metadata } from "next";
import { Reveal } from "@/components/motion";
import { Nav } from "@/components/Nav";
import { Section, PageHeader } from "@/components/ui";
import { DocsNav, type DocLink } from "@/components/DocsNav";
import { ContractDiagram, FlowDiagram, RevShareDiagram } from "@/components/diagrams";

export const metadata: Metadata = {
  title: "Keryx docs",
  description:
    "How Keryx turns AI coding wait time into proof-settled ad revenue: architecture, contracts, pricing, setup and API reference.",
};

const LINKS: DocLink[] = [
  { id: "overview", label: "Overview", group: "Introduction" },
  { id: "flow", label: "How settlement works" },
  { id: "why-two-chains", label: "Why two chains" },
  { id: "contracts", label: "Contracts", group: "Architecture" },
  { id: "pricing", label: "Pricing and revenue split" },
  { id: "data", label: "Data model" },
  { id: "quickstart", label: "Quickstart", group: "Running Keryx" },
  { id: "configuration", label: "Configuration" },
  { id: "deploy", label: "Deploying to Creditcoin" },
  { id: "api", label: "Server API", group: "Reference" },
  { id: "clients", label: "Earning clients" },
  { id: "addresses", label: "Deployed addresses" },
  { id: "limits", label: "Limits and caveats" },
];

export default function Docs() {
  return (
    <>
      <Nav />
      <Section style={{ maxWidth: 1180, paddingBottom: "6rem" }}>
        <PageHeader
          eyebrow="Documentation"
          title="Keryx, end to end"
          lead="Keryx pays people for the minutes their AI coding agent spends thinking. This is how the money is held, how delivery is proved, and how to run the whole thing yourself."
        />

        <div className="docs-layout">
          <DocsNav links={LINKS} />

          <Reveal delay={110}>
          <article className="prose">
            <section id="overview" className="doc-section">
              <h2>Overview</h2>
              <p>
                An AI coding agent leaves the developer staring at a spinner. Keryx sells that
                moment. An advertiser escrows USDC and bids for the slot; the editor shows one
                sponsored line while the agent works; the person who saw it keeps half of what the
                advertiser paid.
              </p>
              <p>
                The hard part is not showing an ad, it is proving one was shown. Ad networks settle
                on numbers their own server reports. Keryx cannot. The contract that moves money
                lives on Creditcoin and will not release a cent until a proof of the impression
                receipt verifies on-chain. The server can lie all it likes; the escrow does not
                listen to it.
              </p>
              <ul>
                <li>
                  <strong>Advertisers</strong> fund a campaign, commit a creative hash, and bid a
                  price per thousand impressions.
                </li>
                <li>
                  <strong>Earners</strong> run a local key beside Claude Code or VS Code and claim
                  accrued USDC whenever they like.
                </li>
                <li>
                  <strong>Nobody</strong>, including whoever runs the server, can move escrowed
                  funds without a verified receipt.
                </li>
              </ul>
            </section>

            <section id="flow" className="doc-section">
              <h2>How settlement works</h2>
              <p>
                One impression travels through four systems before it becomes a claimable balance.
                The editor reports it, the server batches it, a source chain records it, and
                Creditcoin pays for it.
              </p>

              <figure className="figure">
                <FlowDiagram />
                <figcaption>
                  The impression is written where it can be audited and the money moves where the
                  proof lands.
                </figcaption>
              </figure>

              <h3>1 · The editor reports</h3>
              <p>
                The extension shows the sponsored line in the agent&apos;s status area. Once it has
                been visible for <code>VIEW_THRESHOLD_MS</code> (3 seconds by default) the client
                signs an EIP-191 message with the earner&apos;s local key and posts it to{" "}
                <code>POST /report</code>. The signature is what binds the impression to a wallet,
                so one earner cannot submit events on another&apos;s behalf.
              </p>

              <h3>2 · The server batches</h3>
              <p>
                The server verifies the signature, burns the nonce, applies the per-earner daily cap
                and adds the units to a pending row in PostgreSQL. Batching matters: anchoring every
                single impression on a public chain would cost far more in gas than the impression
                is worth.
              </p>

              <h3>3 · The source chain records</h3>
              <p>
                On a timer, the server calls <code>recordEngagement</code> on{" "}
                <code>SourceEngagement</code>, deployed on Ethereum Sepolia. That emits{" "}
                <code>EngagementRecorded(receiptId, campaignId, earner, impressions, clicks)</code>.
                The contract only accepts calls from its configured recorder and rejects a
                receipt id it has already seen.
              </p>

              <h3>4 · Creditcoin verifies and pays</h3>
              <p>
                A worker waits for Attestcoin to attest the Sepolia block, fetches the transaction
                proof, and calls <code>execute</code> on the settlement contract. That contract
                hands the proof to the Creditcoin query verifier precompile at{" "}
                <code>0x…0FD2</code>. Only if the precompile confirms inclusion and continuity does
                it decode the log, charge the campaign, and credit the earner.
              </p>

              <div className="note">
                <p>
                  The proof builder holds a 32-block reorg window, so expect roughly ten minutes
                  between the source event and the Creditcoin settlement transaction. This is a
                  property of the attestation, not a queue you can drain.
                </p>
              </div>
            </section>

            <section id="why-two-chains" className="doc-section">
              <h2>Why two chains</h2>
              <p>
                A single chain would be simpler, and it would also be worth less. If Keryx wrote the
                impression directly on Creditcoin, the settlement contract would be trusting a
                transaction that Keryx itself signed: the same trust an ad network asks for today,
                with extra steps.
              </p>
              <p>
                Splitting it means the record and the money live apart. The impression lands on a
                chain Keryx does not control, the proof is produced by Attestcoin rather than by
                Keryx, and the contract holding the USDC only ever sees verified data. What the
                server can do is refuse to report an impression. What it cannot do is invent one.
              </p>
            </section>

            <section id="contracts" className="doc-section">
              <h2>Contracts</h2>
              <p>
                Four contracts, one of which lives on a different chain. Everything that moves money
                goes through <code>CampaignEscrow</code>, and only addresses it has marked as
                controllers may do so.
              </p>

              <figure className="figure">
                <ContractDiagram />
                <figcaption>Permissions, not just call paths: a controller is the only role that can charge or credit.</figcaption>
              </figure>

              <h3>CampaignEscrow</h3>
              <p>
                Holds campaign budgets and accrued balances. Advertisers call{" "}
                <code>createCampaign</code>, <code>fund</code>, <code>refund</code> and{" "}
                <code>closeCampaign</code>. Controllers call <code>setBid</code>,{" "}
                <code>charge</code> and <code>credit</code>. Earners call <code>claim</code> or{" "}
                <code>claimAll</code> and receive USDC directly. There is no withdrawal approval
                and no operator in the path.
              </p>

              <h3>AuctionHouse</h3>
              <p>
                Ranks funded campaigns by price per thousand impressions. <code>placeBid</code>{" "}
                writes through to the escrow, <code>board</code> returns every campaign for the
                dashboard, and <code>winner</code> returns the highest live bid. A campaign drops
                out of contention as soon as its balance can no longer cover its own bid.
              </p>

              <h3>AttestcoinSettlement</h3>
              <p>
                The Application Smart Contract. It extends <code>ASCBase</code>, so{" "}
                <code>execute</code> verifies the proof and rejects a query id it has already
                processed before any Keryx logic runs. The handler then checks the receipt status,
                finds the engagement log, and rejects it unless it came from the registered emitter
                address with the expected topic and data shape.
              </p>

              <h3>SourceEngagement</h3>
              <p>
                A deliberately small contract on the source chain: emit the engagement, gate on the
                recorder, and refuse a duplicate receipt id. It holds no funds, so a compromise of
                the recorder key produces junk events rather than stolen money, and those events
                still have to match a funded campaign to charge anything.
              </p>
            </section>

            <section id="pricing" className="doc-section">
              <h2>Pricing and revenue split</h2>
              <p>
                Advertisers bid a price per <em>block</em>, where a block is a thousand impressions.
                A click bills at fifty impressions. The arithmetic lives in one library so the
                contract, the server and the dashboard cannot drift apart.
              </p>

              <figure className="figure">
                <RevShareDiagram />
                <figcaption>Cost is floored by integer division and capped at the remaining balance.</figcaption>
              </figure>

              <pre>
                <code>{`units  = impressions + clicks * 50
cost   = units * pricePerBlock / 1000
earner = cost * 50%
treasury = cost - earner`}</code>
              </pre>
              <p>
                A worked example: a campaign bidding <code>0.6</code> USDC per thousand impressions
                is charged <code>600</code> base units for a single impression, which splits into{" "}
                <code>300</code> for the earner and <code>300</code> for the treasury. The split is
                executed inside the settlement contract, not computed off-chain and trusted.
              </p>
            </section>

            <section id="data" className="doc-section">
              <h2>Data model</h2>
              <p>
                PostgreSQL holds what the chain should not: creative copy, rate-limit counters and
                the index that ties a source receipt to its settlement transaction. The server
                creates these tables on startup.
              </p>
              <ul>
                <li>
                  <code>keryx_creatives</code>: ad text, destination URL and the creative hash the
                  advertiser committed on-chain.
                </li>
                <li>
                  <code>keryx_usage</code>: per-earner daily units and the trial redemption ledger.
                </li>
                <li>
                  <code>keryx_pending</code>: accepted units not yet anchored on the source chain.
                </li>
                <li>
                  <code>keryx_receipts</code>: receipt id, source transaction and, once proved, the
                  Creditcoin transaction.
                </li>
                <li>
                  <code>keryx_report_nonces</code>: spent nonces, so a signed report cannot be
                  replayed.
                </li>
              </ul>
            </section>

            <section id="quickstart" className="doc-section">
              <h2>Quickstart</h2>
              <p>
                You need Node.js 22 with pnpm, Foundry, and a PostgreSQL connection string. The
                local stack runs a Creditcoin-compatible chain on Anvil, so you can exercise
                campaigns, the auction and claims without touching a testnet.
              </p>
              <pre>
                <code>{`git clone https://github.com/<you>/keryx && cd keryx
pnpm install

export DATABASE_URL='postgresql://…'
./scripts/dev-stack.sh`}</code>
              </pre>
              <p>
                That starts Anvil on chain 31338, deploys the suite, seeds one funded campaign, and
                serves the dashboard on <code>localhost:3000</code> against the API on{" "}
                <code>localhost:4021</code>. Drive a full impression through it with:
              </p>
              <pre>
                <code>{`cd server && node scripts/demo-flow.mjs 1`}</code>
              </pre>
              <div className="note">
                <p>
                  A local chain proves the plumbing, not the proof. Attestcoin can only attest a
                  real source chain, so an Anvil transaction will never produce a settlement.
                </p>
              </div>
            </section>

            <section id="configuration" className="doc-section">
              <h2>Configuration</h2>
              <p>
                Copy <code>server/.env.example</code> to <code>server/.env</code>. Contract
                addresses are read from <code>contracts/deployments/&lt;network&gt;.json</code> and
                any environment variable overrides the file.
              </p>
              <pre>
                <code>{`DATABASE_URL=postgresql://…
KERYX_NETWORK=creditcoin

CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CHAIN_ID=102031
DEPLOYER_PRIVATE_KEY=0x…          # signs execute() on Creditcoin

SOURCE_CHAIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SOURCE_CHAIN_ID=11155111
SOURCE_CHAIN_KEY=1                 # Attestcoin's id for Sepolia
SOURCE_START_BLOCK=…               # the emitter's deployment block
SOURCE_ENGAGEMENT_PRIVATE_KEY=0x…  # signs recordEngagement on Sepolia

VIEW_THRESHOLD_MS=3000
PER_EARNER_DAILY_CAP=50000
SETTLE_INTERVAL_MS=15000`}</code>
              </pre>
              <p>
                <code>SOURCE_CHAIN_KEY</code> is Attestcoin&apos;s own chain identifier and is not
                the EVM chain id. On the Creditcoin testnet prover, <code>1</code> is Ethereum
                Sepolia and <code>3</code> is Ethereum mainnet.
              </p>
            </section>

            <section id="deploy" className="doc-section">
              <h2>Deploying to Creditcoin</h2>
              <p>Deploy the emitter on the source chain first, then the suite that points at it.</p>
              <pre>
                <code>{`# 1 · source chain, note the deployment block
cd contracts
SOURCE_PRIVATE_KEY=0x… forge script script/DeploySource.s.sol:DeploySource \\
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast

# 2 · Creditcoin suite, wired to that emitter
DEPLOYER_PRIVATE_KEY=0x… SOURCE_ENGAGEMENT=0x… SOURCE_START_BLOCK=<block> \\
  ./scripts/deploy-creditcoin.sh`}</code>
              </pre>
              <div className="note">
                <p>
                  <code>forge script</code> cannot run against Creditcoin. Its blocks carry no{" "}
                  <code>mixHash</code>, so Foundry&apos;s local fork rejects them with{" "}
                  <code>prevrandao not set</code>. The deploy script uses <code>forge create</code>{" "}
                  and <code>cast send</code> instead, which never fork the chain.
                </p>
              </div>
              <p>
                Blockscout on this instance rejects <code>forge verify-contract</code>, so verify by
                posting the standard JSON input to its API directly:
              </p>
              <pre>
                <code>{`forge verify-contract <address> <path>:<name> --show-standard-json-input > input.json
# POST input.json as files[0] to
#   <explorer>/api/v2/smart-contracts/<address>/verification/via/standard-input
# with compiler_version, license_type=mit and contract_name`}</code>
              </pre>
            </section>

            <section id="api" className="doc-section">
              <h2>Server API</h2>
              <p>
                A small HTTP surface. Everything that credits an earner requires a signature; the
                read endpoints are open so the dashboard can poll them.
              </p>
              <ul>
                <li>
                  <code>GET /health</code>: network, chain id and the resolved contract addresses.
                </li>
                <li>
                  <code>GET /attestcoin</code>: source chain, chain key, prover URL and whether the
                  worker has its keys.
                </li>
                <li>
                  <code>GET /ad</code>: picks a live campaign weighted by bid and returns the
                  creative to render.
                </li>
                <li>
                  <code>POST /campaigns</code>: registers creative copy; rejected if it does not
                  match the on-chain creative hash.
                </li>
                <li>
                  <code>POST /report</code>: a signed impression or click.
                </li>
                <li>
                  <code>GET /earnings/:address</code>: accrued balance read from the escrow.
                </li>
                <li>
                  <code>GET /auction</code>: the full board plus the current winner.
                </li>
                <li>
                  <code>GET /activity</code>: recent events and settled receipts.
                </li>
                <li>
                  <code>POST /settle/flush</code>: anchors pending batches immediately instead of
                  waiting for the timer.
                </li>
              </ul>

              <h3>Signing a report</h3>
              <p>
                The client signs this exact string with the earner key and sends it alongside the
                fields. A timestamp more than five minutes old is rejected, and each nonce is
                accepted once.
              </p>
              <pre>
                <code>{`Keryx report v1
campaignId=<id>
type=impression|click
earner=<lowercase address>
surface=<surface or empty>
eventUuid=<uuid or empty>
timestamp=<ms since epoch>
nonce=<uuid>`}</code>
              </pre>
            </section>

            <section id="clients" className="doc-section">
              <h2>Earning clients</h2>
              <p>
                Two ways to earn, both holding the key locally and never uploading it. Create the
                key from the onboarding page, then hand it to whichever client you run.
              </p>
              <h3>VS Code extension</h3>
              <p>
                Injects the sponsored line into the Claude Code surface, measures how long it was
                actually visible, and reports it. It patches the installed bundle in place and
                restores it byte for byte on uninstall.
              </p>
              <h3>CLI</h3>
              <p>A standalone status-line daemon for people who run Claude Code in a terminal.</p>
              <pre>
                <code>{`keryx setup --server http://localhost:4021
keryx start`}</code>
              </pre>
            </section>

            <section id="addresses" className="doc-section">
              <h2>Deployed addresses</h2>
              <p>
                Creditcoin testnet is chain <code>102031</code>. Every contract below is
                source-verified on its explorer.
              </p>
              <ul>
                <li>
                  <strong>AttestcoinSettlement</strong>:{" "}
                  <a
                    href="https://creditcoin-testnet.blockscout.com/address/0x42623b442fd0F3BC6796DA0a08a0074ba16f3209?tab=contract"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <code>0x42623b44…16f3209</code>
                  </a>
                </li>
                <li>
                  <strong>CampaignEscrow</strong>:{" "}
                  <a
                    href="https://creditcoin-testnet.blockscout.com/address/0x342bB1e97d4EE97a5876f684829D86e6a8d74bb0?tab=contract"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <code>0x342bB1e9…8d74bb0</code>
                  </a>
                </li>
                <li>
                  <strong>AuctionHouse</strong>:{" "}
                  <a
                    href="https://creditcoin-testnet.blockscout.com/address/0x4e511285F7f0cD16A2e7960bB1D09772D4d36655?tab=contract"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <code>0x4e511285…4d36655</code>
                  </a>
                </li>
                <li>
                  <strong>SourceEngagement</strong> (Sepolia):{" "}
                  <a
                    href="https://eth-sepolia.blockscout.com/address/0x5049168e6c5f7B0fa0D104ad669ab37c3a9Bc946?tab=contract"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <code>0x5049168e…3a9Bc946</code>
                  </a>
                </li>
              </ul>
            </section>

            <section id="limits" className="doc-section">
              <h2>Limits and caveats</h2>
              <ul>
                <li>
                  <strong>Settlement is not instant.</strong> The attestation window puts roughly
                  ten minutes between an impression and its payout.
                </li>
                <li>
                  <strong>The server can withhold.</strong> Proof stops it from inventing
                  impressions, not from declining to anchor one. An earner who is never reported is
                  never paid.
                </li>
                <li>
                  <strong>Daily caps are off-chain.</strong> <code>PER_EARNER_DAILY_CAP</code> is
                  enforced in the database, so it constrains a well-behaved server rather than a
                  hostile one.
                </li>
                <li>
                  <strong>USDC here is a mock.</strong> The testnet deployment mints its own ERC-20;
                  a production deployment would point <code>USDC_ADDRESS</code> at the real token.
                </li>
                <li>
                  <strong>Gas is paid by the operator.</strong> Anchoring and settling both cost
                  money, which is why impressions are batched rather than settled one by one.
                </li>
              </ul>
            </section>
          </article>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
