"use client";

import { Nav } from "@/components/Nav";
import { Section, ChainBadge } from "@/components/ui";
import { usePoll } from "@/lib/hooks";
import { adServer } from "@/lib/server";
import { shortAddr } from "@/lib/format";

export default function Leaderboard() {
  const activity = usePoll(() => adServer.activity(), 4000);
  const receipts = activity?.receipts ?? [];

  // Aggregate settled receipts by earner (impression-equivalents delivered).
  const byEarner = new Map<string, { units: number; impressions: number; clicks: number }>();
  for (const r of receipts) {
    const cur = byEarner.get(r.earner) ?? { units: 0, impressions: 0, clicks: 0 };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    cur.units += r.impressions + r.clicks * 50;
    byEarner.set(r.earner, cur);
  }
  const earners = [...byEarner.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 15);

  const byCampaign = new Map<string, number>();
  for (const r of receipts) {
    byCampaign.set(r.campaign_id, (byCampaign.get(r.campaign_id) ?? 0) + r.impressions + r.clicks * 50);
  }
  const campaigns = [...byCampaign.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const totalUnits = receipts.reduce((s, r) => s + r.impressions + r.clicks * 50, 0);

  return (
    <>
      <Nav />
      <Section style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 style={{ margin: 0 }}>Leaderboard</h1>
          <ChainBadge />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginTop: "1.25rem" }}>
          {[
            { label: "Settled receipts", value: receipts.length },
            { label: "Impression-equivalents", value: totalUnits.toLocaleString() },
            { label: "Verified earners", value: byEarner.size },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: "1rem 1.1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)", fontWeight: 600 }}>{s.label}</div>
              <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem" }}>Top earners</h2>
            <div className="card" style={{ overflow: "hidden" }}>
              {earners.length === 0 && <Empty label="No settled earnings yet." />}
              {earners.map(([addr, v], i) => (
                <Row key={addr} i={i} left={shortAddr(addr)} right={`${v.units.toLocaleString()} units`} sub={`${v.impressions} impr · ${v.clicks} clicks`} />
              ))}
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem" }}>Top campaigns</h2>
            <div className="card" style={{ overflow: "hidden" }}>
              {campaigns.length === 0 && <Empty label="No campaign delivery yet." />}
              {campaigns.map(([id, units], i) => (
                <Row key={id} i={i} left={`Campaign #${id}`} right={`${units.toLocaleString()} units`} />
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function Row({ i, left, right, sub }: { i: number; left: string; right: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1rem", borderTop: i ? "1px solid var(--color-border)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ color: "var(--color-text-faint)", width: 20 }}>{i + 1}</span>
        <div>
          <div className="mono" style={{ fontSize: "0.88rem" }}>{left}</div>
          {sub && <div style={{ fontSize: "0.72rem", color: "var(--color-text-faint)" }}>{sub}</div>}
        </div>
      </div>
      <span className="mono" style={{ fontSize: "0.85rem", color: "var(--color-earn)" }}>{right}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: "1.25rem", color: "var(--color-text-faint)", fontSize: "0.9rem" }}>{label}</div>;
}
