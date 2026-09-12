import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { isAddress, isHex, keccak256, recoverMessageAddress, toBytes, type Address, type Hex } from "viem";
import { z } from "zod";
import { config, deployment } from "./config.js";
import { store } from "./db.js";
import { addresses, readAccrued, readAuctionBoard, readCampaign, readWinner } from "./chain.js";
import { flushSourceEngagements, startSourceAnchorLoop } from "./settlement.js";

const app = new Hono();
app.use("*", cors());

function creativeHash(text: string, clickUrl: string): `0x${string}` {
  return keccak256(toBytes(`${text}\n${clickUrl}`));
}

app.get("/health", (c) => c.json({
  ok: true,
  service: "keryx-ad-server",
  network: config.network,
  chainId: deployment.chainId,
  contracts: addresses,
  database: "neon-postgres",
  settlement: "attestcoin",
  sourceChainId: config.sourceChainId,
  sourceChainKey: config.sourceChainKey,
  proofBuilderUrl: config.proofBuilderUrl,
}));

app.get("/killswitch", (c) => c.json({
  killed: process.env.KILLSWITCH === "true",
  reason: process.env.KILLSWITCH_REASON ?? null,
}));

app.get("/attestcoin", (c) => c.json({
  targetChainId: deployment.chainId,
  sourceChainId: config.sourceChainId,
  sourceChainKey: config.sourceChainKey,
  sourceContract: addresses.sourceEngagement,
  settlementContract: addresses.attestcoinSettlement,
  proofBuilderUrl: config.proofBuilderUrl,
  worker: Boolean(deployment.sourcePrivateKey && deployment.deployerPrivateKey),
}));

app.get("/ad", async (c) => {
  try {
    const board = await readAuctionBoard();
    const eligible = [];
    for (const bid of board) {
      if (!bid.active || BigInt(bid.pricePerBlock) === 0n || BigInt(bid.balance) < BigInt(bid.pricePerBlock)) continue;
      const creative = await store.getCreative(bid.campaignId);
      if (creative) eligible.push({ ...bid, creative });
    }
    if (eligible.length === 0) return c.json({ ad: null, reason: "no_live_campaign" });

    const total = eligible.reduce((sum, bid) => sum + Number(bid.pricePerBlock), 0);
    let cursor = Math.random() * total;
    let chosen = eligible[0];
    for (const bid of eligible) {
      cursor -= Number(bid.pricePerBlock);
      if (cursor <= 0) {
        chosen = bid;
        break;
      }
    }

    return c.json({
      ad: {
        adId: chosen.creative.creative_hash,
        campaignId: chosen.campaignId,
        adText: chosen.creative.text,
        clickUrl: chosen.creative.click_url,
        icon: chosen.creative.icon,
        pricePerBlock: chosen.pricePerBlock,
      },
      rotation: { live: eligible.length, viewThresholdMs: config.viewThresholdMs },
      viewThresholdMs: config.viewThresholdMs,
    });
  } catch (error) {
    return c.json({ ad: null, error: message(error) }, 502);
  }
});

const CreativeBody = z.object({
  campaignId: z.string().min(1),
  advertiser: z.string(),
  text: z.string().min(1).max(120),
  clickUrl: z.string().url(),
  icon: z.string().optional(),
});

app.post("/campaigns", async (c) => {
  const parsed = CreativeBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || !isAddress(parsed.data.advertiser)) {
    return c.json({ error: parsed.success ? "advertiser must be an EVM address" : parsed.error.flatten() }, 400);
  }
  const { campaignId, advertiser, text, clickUrl, icon } = parsed.data;
  const hash = creativeHash(text, clickUrl);

  try {
    const onChain = await readCampaign(BigInt(campaignId));
    if (onChain.advertiser !== "0x0000000000000000000000000000000000000000") {
      if (onChain.advertiser.toLowerCase() !== advertiser.toLowerCase()) {
        return c.json({ error: "advertiser does not own this campaign" }, 403);
      }
      if (onChain.creativeHash !== hash) {
        return c.json({ error: "creative hash mismatch with on-chain commitment", expected: onChain.creativeHash, got: hash }, 409);
      }
    }
  } catch {
    // The dashboard may register the creative before the campaign transaction is mined.
  }

  await store.upsertCreative({
    campaign_id: campaignId,
    advertiser,
    text,
    click_url: clickUrl,
    icon: icon ?? null,
    creative_hash: hash,
  });
  return c.json({ ok: true, creativeHash: hash });
});

const ReportBody = z.object({
  campaignId: z.string().min(1),
  type: z.enum(["impression", "click"]),
  earner: z.string(),
  surface: z.string().optional(),
  eventUuid: z.string().optional(),
  timestamp: z.number().int(),
  nonce: z.string().min(8).max(100),
  signature: z.string(),
});

function reportMessage(body: {
  campaignId: string;
  type: "impression" | "click";
  earner: string;
  surface?: string;
  eventUuid?: string;
  timestamp: number;
  nonce: string;
}): string {
  return [
    "Keryx report v1",
    `campaignId=${body.campaignId}`,
    `type=${body.type}`,
    `earner=${body.earner.toLowerCase()}`,
    `surface=${body.surface ?? ""}`,
    `eventUuid=${body.eventUuid ?? ""}`,
    `timestamp=${body.timestamp}`,
    `nonce=${body.nonce}`,
  ].join("\n");
}

app.post("/report", async (c) => {
  const parsed = ReportBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { campaignId, type, earner, surface, eventUuid, timestamp, nonce, signature } = parsed.data;
  if (!isAddress(earner)) return c.json({ error: "earner must be an EVM address" }, 400);
  if (!isHex(signature)) return c.json({ error: "signature must be a hex EIP-191 signature" }, 400);
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return c.json({ error: "report timestamp expired" }, 401);
  try {
    const recovered = await recoverMessageAddress({ message: reportMessage(parsed.data), signature: signature as Hex });
    if (recovered.toLowerCase() !== earner.toLowerCase()) return c.json({ error: "report signature does not match earner" }, 401);
  } catch {
    return c.json({ error: "invalid report signature" }, 401);
  }
  if (!(await store.consumeReportNonce(nonce, earner))) return c.json({ error: "report nonce already used" }, 409);

  const units = type === "click" ? 50 : 1;
  const accepted = await store.acceptEarningUnits(earner, units, config.perEarnerDailyCap);
  if (accepted === 0) {
    return c.json({ ok: true, credited: false, capped: true, earner, reason: "per_earner_cap_reached" });
  }

  const impressions = type === "click" && accepted >= 50 ? 0 : accepted;
  const clicks = type === "click" && accepted >= 50 ? 1 : 0;
  await store.addPending(campaignId, earner, impressions, clicks);
  await store.logEvent(campaignId, surface ?? null, type, earner);

  return c.json({
    ok: true,
    credited: true,
    capped: accepted < units,
    settlement: "source_event_pending",
    earner,
    campaignId,
    accepted,
  });
});

app.post("/trial/:campaignId", async (c) => {
  const campaignId = c.req.param("campaignId");
  const body = (await c.req.json().catch(() => null)) as { earner?: string } | null;
  if (!body?.earner || !isAddress(body.earner)) return c.json({ error: "earner must be an EVM address" }, 400);
  const granted = await store.tryIncrementUsage(`trial:${campaignId}`, body.earner, 1);
  if (!granted) return c.json({ ok: false, granted: false, reason: "free_trial_already_redeemed" }, 403);
  return c.json({ ok: true, granted: true, campaignId, earner: body.earner });
});

app.get("/earnings/:address", async (c) => {
  const address = c.req.param("address");
  if (!isAddress(address)) return c.json({ error: "invalid address" }, 400);
  try {
    const accrued = await readAccrued(address as Address);
    return c.json({ address, accrued: accrued.toString() });
  } catch (error) {
    return c.json({ error: message(error) }, 502);
  }
});

app.get("/auction", async (c) => {
  try {
    const [board, winner] = await Promise.all([readAuctionBoard(), readWinner()]);
    return c.json({ winner: { campaignId: winner.campaignId.toString(), price: winner.price.toString() }, board });
  } catch (error) {
    return c.json({ error: message(error) }, 502);
  }
});

app.get("/activity", async (c) => c.json({
  events: await store.recentEvents(25),
  receipts: await store.recentReceipts(50),
}));

app.post("/settle/flush", async (c) => c.json({ anchored: await flushSourceEngagements() }));

// Last line of defence: the ad server staying up matters more than any single
// failed background task, and Node exits on an unhandled rejection by default.
process.on("unhandledRejection", (reason) => console.error("[server] unhandled rejection:", reason));

if (deployment.sourcePrivateKey) startSourceAnchorLoop();

// One process on a single host: the Attestcoin worker runs beside the API
// rather than as a second service. Locally it stays a separate `pnpm worker`.
if (process.env.KERYX_RUN_WORKER === "true") {
  void import("./attestcoin-worker.js").catch((error) =>
    console.error("[server] worker failed to start:", message(error)),
  );
}
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[server] Keryx listening on http://localhost:${info.port} (${config.network})`);
  console.log(`[server] CTC settlement=${addresses.attestcoinSettlement} source=${addresses.sourceEngagement}`);
  console.log(`[server] database=Neon PostgreSQL sourceChain=${config.sourceChainId}`);
});

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export { app };
