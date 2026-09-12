import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Loopback } from "../src/loopback";
import { Reporting } from "../src/reporting";
import type { ServerAd } from "../src/serverClient";
import type { LoopbackMetricKind } from "../src/loopback";

const ad: ServerAd = {
  adId: "0xcreative",
  campaignId: "1",
  adText: "Deploy this in 30s",
  clickUrl: "https://vercel.com/new",
  icon: null,
  pricePerBlock: "600000",
};

const tick = () => new Promise((r) => setTimeout(r, 20));

// ── Reporting: dedupe + credit-vs-ignore logic (no HTTP) ────────────────────────
describe("Reporting (loopback event → source report)", () => {
  let calls: Array<{ url: string; body: any }>;
  let reporting: Reporting;

  beforeEach(() => {
    calls = [];
    const fakeFetch = (async (url: any, init?: any) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
      return new Response(JSON.stringify({ ok: true, credited: true, humanId: "0x4fa2" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    reporting = new Reporting(
      () => ad,
      () => fakeFetch,
      () => "0x1111111111111111111111111111111111111111",
      async () => "0x1234",
      () => {},
      () => {},
    );
  });

  it("view_threshold_met reports one impression and dedupes the repeat", async () => {
    reporting.onEvent("view_threshold_met", { surface: "overlay", eventUuid: undefined });
    reporting.onEvent("view_threshold_met", { surface: "overlay" });
    await tick();
    const impressions = calls.filter((c) => c.body?.type === "impression");
    expect(impressions.length).toBe(1);
    expect(impressions[0].url).toContain("/report");
    expect(impressions[0].body).toMatchObject({ campaignId: "1", surface: "overlay" });
  });

  it("error_impression (stuck-session safety net) also credits as an impression", async () => {
    reporting.onEvent("error_impression", { surface: "overlay" });
    await tick();
    expect(calls.filter((c) => c.body?.type === "impression").length).toBe(1);
  });

  it("non-credit events (view_tick/rendered/viewable) do not report", async () => {
    (["impression_rendered", "impression_viewable", "view_tick"] as LoopbackMetricKind[]).forEach(
      (k) => reporting.onEvent(k, { surface: "overlay" }),
    );
    await tick();
    expect(calls.length).toBe(0);
  });

  it("click reports a click (billed 50x server-side)", async () => {
    reporting.onClick("ck", "overlay", 1200, undefined);
    await tick();
    const clicks = calls.filter((c) => c.body?.type === "click");
    expect(clicks.length).toBe(1);
    expect(clicks[0].body.campaignId).toBe("1");
  });

  it("resetForNewAd lets the next ad's first impression bill again", async () => {
    reporting.onEvent("view_threshold_met", { surface: "overlay" });
    await tick();
    reporting.resetForNewAd();
    reporting.onEvent("view_threshold_met", { surface: "overlay" });
    await tick();
    expect(calls.filter((c) => c.body?.type === "impression").length).toBe(2);
  });
});

// ── Loopback: the webview→extension HTTP bridge routes correctly ─────────────────
describe("Loopback routing (webview ping → onEvent/onClick)", () => {
  let lb: Loopback;
  let port: number;
  let token: string;
  let events: Array<{ kind: string; surface?: string }>;
  let clicks: Array<{ ct: string }>;

  beforeEach(async () => {
    events = [];
    clicks = [];
    lb = new Loopback({
      onEvent: (kind, p) => events.push({ kind, surface: p.surface }),
      onClick: (ct) => clicks.push({ ct }),
      getActivity: () => ({}),
      getCurrentAd: () => null,
    });
    ({ port, token } = await lb.start({ preferredPort: 8799 }));
    expect(port).toBeGreaterThan(0);
  });
  afterEach(async () => {
    await lb.stop();
  });

  // Connection: close avoids undici keep-alive socket reuse against the minimal server.
  const hit = (route: string, qs = "") =>
    fetch(`http://127.0.0.1:${port}/keryx/${token}/${route}${qs}`, {
      headers: { connection: "close" },
    });

  it("dispatches a metric route to onEvent with parsed surface", async () => {
    const res = await hit("view_threshold_met", "?surface=overlay&visible_ms=3100");
    expect(res.status).toBe(204);
    expect(events).toEqual([{ kind: "view_threshold_met", surface: "overlay" }]);
  });

  it("dispatches the click route to onClick", async () => {
    const res = await hit("click", "?ct=abc&surface=overlay");
    expect(res.status).toBe(204);
    expect(clicks).toEqual([{ ct: "abc" }]);
  });

  it("rejects an unknown token path with 404", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/keryx/wrongtoken/view_tick`, {
      headers: { connection: "close" },
    });
    expect(res.status).toBe(404);
  });
});
