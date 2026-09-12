import { keccak256, toBytes, type Address } from "viem";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { store } from "./db.js";
import { waitForSourceReceipt, writeSourceEngagement } from "./chain.js";

let timer: NodeJS.Timeout | undefined;
let running = false;

/** Anchor accepted off-chain earning units as a source-chain event. */
export async function flushSourceEngagements(): Promise<number> {
  if (running) return 0;
  running = true;
  let anchored = 0;
  try {
    const batches = await store.takePending(config.settle.minImpressions);
    for (const batch of batches) {
      const receiptId = keccak256(
        toBytes(`keryx:${batch.campaign_id}:${batch.earner}:${Date.now()}:${randomUUID()}`),
      );
      try {
        const hash = await writeSourceEngagement({
          receiptId,
          campaignId: BigInt(batch.campaign_id),
          earner: batch.earner as Address,
          impressions: BigInt(batch.impressions),
          clicks: BigInt(batch.clicks),
        });
        const receipt = await waitForSourceReceipt(hash);
        if (receipt.status !== "success") throw new Error(`source transaction reverted: ${hash}`);

        // Keep the receipt indexed while the Attestcoin worker obtains its proof.
        await store.clearPending(batch.campaign_id, batch.earner);
        await store.recordReceipt({
          receipt_id: receiptId,
          campaign_id: batch.campaign_id,
          earner: batch.earner,
          impressions: batch.impressions,
          clicks: batch.clicks,
          source_tx_hash: hash,
          tx_hash: null,
        });
        anchored++;
      } catch (error) {
        console.error(`[source] failed campaign=${batch.campaign_id} earner=${batch.earner}:`, message(error));
        // Keep the batch for the next retry.
      }
    }
  } finally {
    running = false;
  }
  return anchored;
}

export function startSourceAnchorLoop(): void {
  if (timer) return;
  timer = setInterval(() => void flushSourceEngagements(), config.settle.intervalMs);
  console.log(`[source] anchor worker every ${config.settle.intervalMs}ms`);
}

export function stopSourceAnchorLoop(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}

export const startSettlementLoop = startSourceAnchorLoop;
export const stopSettlementLoop = stopSourceAnchorLoop;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
