// Keryx earning daemon. It keeps a sponsored line visible in the Claude Code
// status surface and reports viewable impressions to the source-event pipeline.
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { readConfig, AD_CACHE, HEARTBEAT, ensureDir } from "./config.mjs";
import { setSpinnerVerbs } from "./settings.mjs";

const cfg = readConfig();
if (!cfg?.agentPrivateKey) {
  console.error("[keryx] no config — run `keryx setup` first");
  process.exit(1);
}
ensureDir();

const account = privateKeyToAccount(cfg.agentPrivateKey);
const server = (cfg.serverBase || "http://localhost:4021").replace(/\/+$/, "");
const TICK_MS = 5000;
const VIEW_THRESHOLD_MS = 3000;
const IMPRESSION_INTERVAL_MS = 5000;
const HEARTBEAT_FRESH_MS = 12000;
const ROTATION_MS = 15000;
let displayAd = null;
let displaySince = 0;
let lastReportTs = 0;

function reportMessage({ campaignId, type, earner, surface, eventUuid, timestamp, nonce }) {
  return [
    "Keryx report v1",
    "campaignId=" + campaignId,
    "type=" + type,
    "earner=" + earner.toLowerCase(),
    "surface=" + surface,
    "eventUuid=" + (eventUuid || ""),
    "timestamp=" + timestamp,
    "nonce=" + nonce,
  ].join("\n");
}

async function getJson(path, init) {
  try {
    const response = await fetch(server + path, init);
    return await response.json();
  } catch {
    return null;
  }
}

function heartbeatAge() {
  try {
    return Date.now() - Number(readFileSync(HEARTBEAT, "utf8"));
  } catch {
    return Infinity;
  }
}

async function tick() {
  const adResponse = await getJson("/ad");
  const kill = await getJson("/killswitch");
  const candidate = kill?.killed ? null : adResponse?.ad ?? null;
  const now = Date.now();

  if (!candidate) {
    displayAd = null;
  } else if (!displayAd || now - displaySince >= ROTATION_MS) {
    if (!displayAd || candidate.adId !== displayAd.adId) {
      displaySince = now;
      lastReportTs = 0;
      setSpinnerVerbs(candidate.adText);
    }
    displayAd = candidate;
  }

  writeFileSync(AD_CACHE, JSON.stringify(displayAd
    ? { ...displayAd, ts: now }
    : { ts: now }));

  const ad = displayAd;
  if (!ad || heartbeatAge() >= HEARTBEAT_FRESH_MS) return;
  if (now - displaySince < VIEW_THRESHOLD_MS || now - lastReportTs < IMPRESSION_INTERVAL_MS) return;
  lastReportTs = now;

  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = await account.signMessage({ message: reportMessage({
    campaignId: ad.campaignId,
    type: "impression",
    earner: account.address,
    surface: "claude-cli-statusline",
    timestamp,
    nonce,
  }) });
  const body = await getJson("/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaignId: ad.campaignId, type: "impression", earner: account.address, surface: "claude-cli-statusline", timestamp, nonce, signature }),
  });
  if (body?.credited) {
    console.log(`[keryx] impression credited · "${ad.adText.slice(0, 36)}" · source event pending`);
  } else if (body?.capped) {
    console.log("[keryx] per-earner daily cap reached");
  } else {
    console.log(`[keryx] report not accepted (${body?.reason ?? "server unavailable"})`);
  }
}

console.log(`[keryx] daemon up · earner ${account.address} · server ${server}`);
void tick();
setInterval(() => void tick(), TICK_MS);
