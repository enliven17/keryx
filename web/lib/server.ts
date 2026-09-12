import { config } from "./config";

const base = config.serverBase;

export interface AuctionBoardRow {
  campaignId: string;
  advertiser: string;
  pricePerBlock: string;
  balance: string;
  active: boolean;
}
export interface AuctionResponse {
  winner: { campaignId: string; price: string };
  board: AuctionBoardRow[];
}
export interface ActivityResponse {
  events: Array<{ campaign_id: string; surface: string | null; type: string; human_id: string; earner: string; created_at: number }>;
  receipts: Array<{ receipt_id: string; campaign_id: string; earner: string; impressions: number; clicks: number; tx_hash: string | null; settled_at: number }>;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const adServer = {
  auction: () => getJson<AuctionResponse>("/auction"),
  activity: () => getJson<ActivityResponse>("/activity"),
  earnings: (address: string) => getJson<{ address: string; accrued: string }>(`/earnings/${address}`),
  health: () => getJson<Record<string, unknown>>("/health"),

  /** Register a campaign creative (off-chain text/url; hash committed on-chain). */
  async registerCreative(body: { campaignId: string; advertiser: string; text: string; clickUrl: string; icon?: string }) {
    const res = await fetch(`${base}/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  },
};
