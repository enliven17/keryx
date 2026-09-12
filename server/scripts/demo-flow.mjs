// Live end-to-end demo: register creative -> serve ad -> signed impression ->
// anchor on the source chain. Run against a started server:
//   node scripts/demo-flow.mjs [campaignId]
// EARNER_PRIVATE_KEY picks the earner wallet; a throwaway key is generated otherwise.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.KERYX_SERVER ?? "http://localhost:4021";
const campaignId = process.argv[2] ?? "1";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const network = process.env.KERYX_NETWORK ?? "creditcoin";
const dep = JSON.parse(readFileSync(join(root, "contracts", "deployments", `${network}.json`), "utf8"));
const earner = privateKeyToAccount(process.env.EARNER_PRIVATE_KEY ?? generatePrivateKey());

const api = async (path, init) => {
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
};
const post = (path, body) =>
  api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });

console.log(`server ${BASE} | earner ${earner.address}`);

const creative = { text: "Build with Creditcoin and Attestcoin", clickUrl: "https://creditcoin.org", icon: "*" };
console.log("creative:", await post("/campaigns", { campaignId, advertiser: dep.treasury, ...creative }));

const served = await api("/ad");
console.log("ad:", served.ad ? `${served.ad.adText} (campaign ${served.ad.campaignId})` : served.reason);

const body = {
  campaignId,
  type: "impression",
  earner: earner.address,
  surface: "claude-code",
  eventUuid: crypto.randomUUID(),
  timestamp: Date.now(),
  nonce: crypto.randomUUID(),
};
const message = [
  "Keryx report v1",
  `campaignId=${body.campaignId}`,
  `type=${body.type}`,
  `earner=${body.earner.toLowerCase()}`,
  `surface=${body.surface}`,
  `eventUuid=${body.eventUuid}`,
  `timestamp=${body.timestamp}`,
  `nonce=${body.nonce}`,
].join("\n");
console.log("report:", await post("/report", { ...body, signature: await earner.signMessage({ message }) }));

console.log("flush:", await post("/settle/flush"));
const { receipts = [] } = await api("/activity");
for (const r of receipts.filter((r) => r.earner.toLowerCase() === earner.address.toLowerCase())) {
  console.log(`receipt ${r.receipt_id}`);
  console.log(`  source ${dep.sourceExplorer}/tx/${r.source_tx_hash}`);
  console.log(`  target ${r.tx_hash ? `${dep.explorer}/tx/${r.tx_hash}` : "pending Attestcoin proof (run pnpm worker)"}`);
}
