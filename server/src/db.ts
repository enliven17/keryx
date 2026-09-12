import { neon } from "@neondatabase/serverless";
import { config } from "./config.js";

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required for Neon PostgreSQL");
}

export const sql = neon(config.databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS keryx_usage (
    endpoint TEXT NOT NULL,
    subject TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_start BIGINT NOT NULL,
    last_accepted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (endpoint, subject)
  )`;
await sql`ALTER TABLE keryx_usage ADD COLUMN IF NOT EXISTS last_accepted INTEGER NOT NULL DEFAULT 0`;
await sql`
  CREATE TABLE IF NOT EXISTS keryx_creatives (
    campaign_id TEXT PRIMARY KEY,
    advertiser TEXT NOT NULL,
    text TEXT NOT NULL,
    click_url TEXT NOT NULL,
    icon TEXT,
    creative_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS keryx_pending (
    campaign_id TEXT NOT NULL,
    earner TEXT NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (campaign_id, earner)
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS keryx_receipts (
    receipt_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    earner TEXT NOT NULL,
    impressions INTEGER NOT NULL,
    clicks INTEGER NOT NULL,
    source_tx_hash TEXT,
    tx_hash TEXT,
    settled_at BIGINT NOT NULL
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS keryx_events_log (
    id BIGSERIAL PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    surface TEXT,
    type TEXT NOT NULL,
    earner TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS keryx_report_nonces (
    nonce TEXT PRIMARY KEY,
    earner TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Creative {
  campaign_id: string;
  advertiser: string;
  text: string;
  click_url: string;
  icon: string | null;
  creative_hash: string;
  created_at: number;
}

export interface PendingBatch {
  campaign_id: string;
  earner: string;
  impressions: number;
  clicks: number;
}

export interface ReceiptRecord {
  receipt_id: string;
  campaign_id: string;
  earner: string;
  impressions: number;
  clicks: number;
  source_tx_hash: string | null;
  tx_hash: string | null;
}

export const store = {
  async acceptEarningUnits(earner: string, units: number, cap: number): Promise<number> {
    const now = Date.now();
    const safeUnits = Math.max(0, Math.floor(units));
    const safeCap = Math.max(0, Math.floor(cap));
    // Postgres infers bare placeholders inside LEAST/GREATEST as text, so every
    // numeric parameter is cast explicitly.
    const rows = await sql`
      INSERT INTO keryx_usage (endpoint, subject, count, window_start, last_accepted)
      VALUES ('earning', ${earner}, LEAST(${safeUnits}::int, ${safeCap}::int), ${now}::bigint, LEAST(${safeUnits}::int, ${safeCap}::int))
      ON CONFLICT (endpoint, subject) DO UPDATE SET
        last_accepted = CASE
          WHEN keryx_usage.window_start <= ${now - DAY_MS}::bigint THEN LEAST(${safeUnits}::int, ${safeCap}::int)
          ELSE LEAST(${safeUnits}::int, GREATEST(0, ${safeCap}::int - keryx_usage.count))
        END,
        count = LEAST(${safeCap}::int, CASE
          WHEN keryx_usage.window_start <= ${now - DAY_MS}::bigint THEN 0
          ELSE keryx_usage.count
        END + ${safeUnits}::int),
        window_start = CASE
          WHEN keryx_usage.window_start <= ${now - DAY_MS}::bigint THEN ${now}::bigint
          ELSE keryx_usage.window_start
        END
      RETURNING last_accepted AS accepted`;
    return Number(rows[0]?.accepted ?? 0);
  },

  async tryIncrementUsage(endpoint: string, subject: string, limit: number): Promise<boolean> {
    const now = Date.now();
    const safeLimit = Math.max(0, Math.floor(limit));
    const rows = await sql`
      INSERT INTO keryx_usage (endpoint, subject, count, window_start, last_accepted)
      VALUES (${endpoint}, ${subject}, 1, ${now}::bigint, 1)
      ON CONFLICT (endpoint, subject) DO UPDATE SET
        count = CASE
          WHEN keryx_usage.window_start <= ${now - DAY_MS}::bigint THEN 1
          ELSE keryx_usage.count + 1
        END,
        window_start = CASE
          WHEN keryx_usage.window_start <= ${now - DAY_MS}::bigint THEN ${now}::bigint
          ELSE keryx_usage.window_start
        END,
        last_accepted = 1
      WHERE keryx_usage.window_start <= ${now - DAY_MS}::bigint
         OR keryx_usage.count < ${safeLimit}::int
      RETURNING count`;
    return rows.length > 0;
  },

  async upsertCreative(c: Omit<Creative, "created_at">): Promise<void> {
    await sql`
      INSERT INTO keryx_creatives (campaign_id, advertiser, text, click_url, icon, creative_hash, created_at)
      VALUES (${c.campaign_id}, ${c.advertiser}, ${c.text}, ${c.click_url}, ${c.icon}, ${c.creative_hash}, ${Date.now()})
      ON CONFLICT (campaign_id) DO UPDATE SET
        advertiser = EXCLUDED.advertiser,
        text = EXCLUDED.text,
        click_url = EXCLUDED.click_url,
        icon = EXCLUDED.icon,
        creative_hash = EXCLUDED.creative_hash`;
  },

  async getCreative(campaignId: string): Promise<Creative | undefined> {
    const rows = await sql`SELECT * FROM keryx_creatives WHERE campaign_id = ${campaignId}`;
    return rows[0] as Creative | undefined;
  },

  async addPending(campaignId: string, earner: string, impressions: number, clicks: number): Promise<void> {
    await sql`
      INSERT INTO keryx_pending (campaign_id, earner, impressions, clicks, updated_at)
      VALUES (${campaignId}, ${earner}, ${impressions}, ${clicks}, ${Date.now()})
      ON CONFLICT (campaign_id, earner) DO UPDATE SET
        impressions = keryx_pending.impressions + ${impressions},
        clicks = keryx_pending.clicks + ${clicks},
        updated_at = ${Date.now()}`;
  },

  async takePending(minImpressions: number): Promise<PendingBatch[]> {
    const rows = await sql`
      SELECT campaign_id, earner, impressions, clicks FROM keryx_pending
      WHERE impressions + clicks >= ${minImpressions}
      ORDER BY updated_at ASC`;
    return rows as PendingBatch[];
  },

  async clearPending(campaignId: string, earner: string): Promise<void> {
    await sql`DELETE FROM keryx_pending WHERE campaign_id = ${campaignId} AND earner = ${earner}`;
  },

  async recordReceipt(r: ReceiptRecord): Promise<void> {
    await sql`
      INSERT INTO keryx_receipts
        (receipt_id, campaign_id, earner, impressions, clicks, source_tx_hash, tx_hash, settled_at)
      VALUES (${r.receipt_id}, ${r.campaign_id}, ${r.earner}, ${r.impressions}, ${r.clicks}, ${r.source_tx_hash}, ${r.tx_hash}, ${Date.now()})
      ON CONFLICT (receipt_id) DO UPDATE SET
        source_tx_hash = COALESCE(EXCLUDED.source_tx_hash, keryx_receipts.source_tx_hash),
        tx_hash = COALESCE(EXCLUDED.tx_hash, keryx_receipts.tx_hash),
        settled_at = EXCLUDED.settled_at`;
  },

  async getReceipt(receiptId: string): Promise<ReceiptRecord | undefined> {
    const rows = await sql`SELECT receipt_id, campaign_id, earner, impressions, clicks, source_tx_hash, tx_hash
      FROM keryx_receipts WHERE receipt_id = ${receiptId}`;
    return rows[0] as ReceiptRecord | undefined;
  },

  async consumeReportNonce(nonce: string, earner: string): Promise<boolean> {
    const rows = await sql`
      INSERT INTO keryx_report_nonces (nonce, earner, created_at)
      VALUES (${nonce}, ${earner}, ${Date.now()})
      ON CONFLICT (nonce) DO NOTHING
      RETURNING nonce`;
    return rows.length > 0;
  },

  async logEvent(campaignId: string, surface: string | null, type: string, earner: string): Promise<void> {
    await sql`
      INSERT INTO keryx_events_log (campaign_id, surface, type, earner, created_at)
      VALUES (${campaignId}, ${surface}, ${type}, ${earner}, ${Date.now()})`;
  },

  async recentEvents(limit = 25): Promise<Array<Record<string, unknown>>> {
    return await sql`SELECT * FROM keryx_events_log ORDER BY id DESC LIMIT ${limit}` as Array<Record<string, unknown>>;
  },

  async recentReceipts(limit = 50): Promise<Array<Record<string, unknown>>> {
    return await sql`SELECT * FROM keryx_receipts ORDER BY settled_at DESC LIMIT ${limit}` as Array<Record<string, unknown>>;
  },
};
