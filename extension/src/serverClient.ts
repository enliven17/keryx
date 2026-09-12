import { config } from "./config";
import { dlog } from "./log";
import { errMsg } from "./util/errMsg";
import { randomUUID } from "node:crypto";

export interface ServerAd {
  adId: string;
  campaignId: string;
  adText: string;
  clickUrl: string;
  icon: string | null;
  pricePerBlock: string;
}

export interface AdResponse {
  ad: ServerAd | null;
  viewThresholdMs?: number;
  reason?: string;
}

export interface ReportResult {
  ok: boolean;
  credited?: boolean;
  capped?: boolean;
  reason?: string;
  status: number;
}

export function buildReportMessage(body: {
  campaignId: string;
  type: "impression" | "click";
  earner: string;
  surface: string;
  eventUuid?: string;
  timestamp: number;
  nonce: string;
}): string {
  return [
    "Keryx report v1",
    `campaignId=${body.campaignId}`,
    `type=${body.type}`,
    `earner=${body.earner.toLowerCase()}`,
    `surface=${body.surface}`,
    `eventUuid=${body.eventUuid ?? ""}`,
    `timestamp=${body.timestamp}`,
    `nonce=${body.nonce}`,
  ].join("\n");
}

export async function fetchAd(): Promise<AdResponse> {
  try {
    const res = await fetch(`${config.serverBase}/ad`);
    if (!res.ok) return { ad: null, reason: `http ${res.status}` };
    return (await res.json()) as AdResponse;
  } catch (error) {
    dlog("server", "fetchAd.error", { msg: errMsg(error) });
    return { ad: null, reason: errMsg(error) };
  }
}

export async function pollKillswitch(): Promise<{ killed: boolean; reason: string | null }> {
  try {
    const res = await fetch(`${config.serverBase}/killswitch`);
    if (!res.ok) return { killed: false, reason: null };
    return (await res.json()) as { killed: boolean; reason: string | null };
  } catch {
    return { killed: false, reason: null };
  }
}

export async function readEarnings(address: string): Promise<bigint | null> {
  try {
    const res = await fetch(`${config.serverBase}/earnings/${address}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { accrued?: string };
    return body.accrued ? BigInt(body.accrued) : 0n;
  } catch {
    return null;
  }
}

export async function reportEvent(
  serverFetch: typeof fetch,
  earner: string,
  campaignId: string,
  type: "impression" | "click",
  surface: string,
  eventUuid?: string,
  signMessage?: (message: string) => Promise<`0x${string}` | null>,
): Promise<ReportResult> {
  try {
    const timestamp = Date.now();
    const nonce = randomUUID();
    const signature = signMessage ? await signMessage(buildReportMessage({ campaignId, type, earner, surface, eventUuid, timestamp, nonce })) : null;
    if (!signature) return { ok: false, reason: "earner key unavailable", status: 401 };
    const res = await serverFetch(`${config.serverBase}/report`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId, type, earner, surface, eventUuid, timestamp, nonce, signature }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    dlog("server", "report", { type, campaignId, status: res.status, credited: body.credited, capped: body.capped });
    return {
      ok: res.ok,
      credited: body.credited as boolean | undefined,
      capped: body.capped as boolean | undefined,
      reason: body.reason as string | undefined,
      status: res.status,
    };
  } catch (error) {
    dlog("server", "report.error", { type, msg: errMsg(error) });
    return { ok: false, reason: errMsg(error), status: 0 };
  }
}
