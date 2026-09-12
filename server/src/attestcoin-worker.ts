import { proofProvider } from "@gluwa/usc-sdk";
import { config, deployment } from "./config.js";
import { store } from "./db.js";
import {
  addresses,
  engagementRecordedEvent,
  executeAttestcoin,
  sourcePublicClient,
  waitForTargetReceipt,
} from "./chain.js";

type SourceEvent = {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  args: {
    receiptId: `0x${string}`;
    campaignId: bigint;
    earner: `0x${string}`;
    impressions: bigint;
    clicks: bigint;
  };
};

let nextBlock = config.sourceStartBlock;
let running = false;

const proofBuilder = new proofProvider.service.ProofBuilder(
  config.sourceChainKey,
  config.proofBuilderUrl,
);

/** Highest source block Attestcoin has attested. Proofs below it are servable. */
async function attestedHeight(): Promise<bigint> {
  const res = await fetch(`${config.proofBuilderUrl}/api/v1/attested-height/${config.sourceChainKey}`);
  if (!res.ok) throw new Error(`attested-height ${res.status}`);
  const { attestedHeight: height } = (await res.json()) as { attestedHeight: number };
  return BigInt(height);
}

export async function processAttestcoinEvents(): Promise<number> {
  if (running || !deployment.deployerPrivateKey) return 0;
  running = true;
  let settled = 0;
  let hadFailure = false;
  try {
    const latest = await sourcePublicClient.getBlockNumber();
    if (latest < nextBlock) return 0;
    const toBlock = latest < nextBlock + 999n ? latest : nextBlock + 999n;
    const logs = await sourcePublicClient.getLogs({
      address: addresses.sourceEngagement,
      event: engagementRecordedEvent,
      fromBlock: nextBlock,
      toBlock,
    }) as unknown as SourceEvent[];

    const attested = await attestedHeight();
    for (const log of logs) {
      const { receiptId, campaignId, earner, impressions, clicks } = log.args;
      const existing = await store.getReceipt(receiptId);
      if (existing?.tx_hash) continue;
      if (log.blockNumber > attested) {
        // Attestcoin has not attested this source block yet; retry on the next tick.
        console.log(`[attestcoin] receipt=${receiptId} waiting for attestation (block ${log.blockNumber} > ${attested})`);
        hadFailure = true;
        continue;
      }

      try {
        const response = await proofBuilder.getProof(log.transactionHash);
        if (!response.success || !response.data) throw new Error("Attestcoin proof builder returned no proof");
        const proof = response.data as {
          chainKey: number | bigint;
          headerNumber: number | bigint;
          txBytes: `0x${string}`;
          merkleProof: { root: `0x${string}`; siblings: Array<{ hash: `0x${string}`; isLeft: boolean }> };
          continuityProof: { lowerEndpointDigest: `0x${string}`; roots: `0x${string}`[] };
        };

        const targetHash = await executeAttestcoin({
          action: 0,
          chainKey: BigInt(proof.chainKey),
          blockHeight: BigInt(proof.headerNumber),
          txBytes: proof.txBytes,
          merkleRoot: proof.merkleProof.root,
          siblings: proof.merkleProof.siblings,
          lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
          continuityRoots: proof.continuityProof.roots,
        });
        const targetReceipt = await waitForTargetReceipt(targetHash);
        if (targetReceipt.status !== "success") throw new Error(`CTC transaction reverted: ${targetHash}`);

        await store.recordReceipt({
          receipt_id: receiptId,
          campaign_id: campaignId.toString(),
          earner,
          impressions: Number(impressions),
          clicks: Number(clicks),
          source_tx_hash: log.transactionHash,
          tx_hash: targetHash,
        });
        console.log(`[attestcoin] settled receipt=${receiptId} source=${log.transactionHash} target=${targetHash}`);
        settled++;
      } catch (error) {
        hadFailure = true;
        console.error(`[attestcoin] receipt=${receiptId} failed:`, message(error));
      }
    }
    if (!hadFailure) nextBlock = toBlock + 1n;
  } finally {
    running = false;
  }
  return settled;
}

export function startAttestcoinWorker(): void {
  console.log(`[attestcoin] watching source chain from block ${nextBlock}`);
  // Same reason as the anchor loop: a source-RPC or prover hiccup is a retry,
  // not a reason to exit. `nextBlock` only advances on a clean pass, so nothing
  // is skipped by failing a tick.
  const run = () =>
    processAttestcoinEvents().catch((error) => console.error("[attestcoin] tick failed:", message(error)));
  void run();
  setInterval(run, config.sourcePollMs);
}

startAttestcoinWorker();

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
