import { ImpressionDedupe } from "./metrics/dedupe";
import { reportEvent, type ServerAd } from "./serverClient";
import type { LoopbackMetricKind, LoopbackMetricPayload } from "./loopback";
import type { AdSurface } from "./types/surface";
import { dlog } from "./log";

/** Sends deduplicated client events to the Keryx source-event pipeline. */
export class Reporting {
  private readonly dedupe = new ImpressionDedupe();

  constructor(
    private readonly getAd: () => ServerAd | null,
    private readonly getServerFetch: () => typeof fetch | null,
    private readonly getEarner: () => string | null,
    private readonly signMessage: (message: string) => Promise<`0x${string}` | null>,
    private readonly onCredited: () => void,
    private readonly onCapped: () => void,
  ) {}

  resetForNewAd(): void {
    this.dedupe.reset();
  }

  onEvent(kind: LoopbackMetricKind, payload: LoopbackMetricPayload): void {
    if (kind !== "view_threshold_met" && kind !== "error_impression") return;
    const ad = this.getAd();
    const serverFetch = this.getServerFetch();
    const earner = this.getEarner();
    if (!ad || !serverFetch || !earner) return;
    const surface = payload.surface ?? "overlay";
    if (!this.dedupe.shouldSend("impression", ad.adId, surface)) return;
    void this.fire(serverFetch, earner, ad.campaignId, "impression", surface, payload.eventUuid);
  }

  onClick(_clickToken: string, surface?: AdSurface, _visibleMs?: number, eventUuid?: string): void {
    const ad = this.getAd();
    const serverFetch = this.getServerFetch();
    const earner = this.getEarner();
    if (!ad || !serverFetch || !earner) return;
    void this.fire(serverFetch, earner, ad.campaignId, "click", surface ?? "overlay", eventUuid);
  }

  private async fire(
    serverFetch: typeof fetch,
    earner: string,
    campaignId: string,
    type: "impression" | "click",
    surface: string,
    eventUuid?: string,
  ): Promise<void> {
    const result = await reportEvent(serverFetch, earner, campaignId, type, surface, eventUuid, this.signMessage);
    if (result.credited) this.onCredited();
    else if (result.capped) this.onCapped();
    else if (!result.ok) dlog("reporting", "rejected", { status: result.status, reason: result.reason });
  }
}
