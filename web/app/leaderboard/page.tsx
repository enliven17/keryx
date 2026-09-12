"use client";

import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/motion";
import { Section, Stat, StatRow, ChainBadge, PageHeader } from "@/components/ui";
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
      <Section style={{ paddingBottom: "4rem" }}>
        <PageHeader
          eyebrow="Settled delivery"
          title="Leaderboard"
          right={<ChainBadge />}
          lead="Ranked from proved receipts only. A click counts as fifty impression-equivalents, the same weighting the settlement contract uses."
        />

        <Reveal delay={70}>
        <StatRow>
          <Stat label="Settled receipts" value={receipts.length} />
          <Stat label="Impression-equivalents" value={totalUnits.toLocaleString()} />
          <Stat label="Verified earners" value={byEarner.size} accent="var(--color-earn)" />
        </StatRow>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "0.5rem" }}>
          <Reveal delay={150}>
            <h2 className="section-title">Top earners</h2>
            <div className="card feed" style={{ overflow: "hidden" }}>
              {earners.length === 0 && <Empty label="No settled earnings yet." />}
              {earners.map(([addr, v], i) => (
                <Row
                  key={addr}
                  i={i}
                  left={shortAddr(addr)}
                  right={`${v.units.toLocaleString()} units`}
                  sub={`${v.impressions} impr · ${v.clicks} clicks`}
                />
              ))}
            </div>
          </Reveal>
          <Reveal delay={230}>
            <h2 className="section-title">Top campaigns</h2>
            <div className="card feed" style={{ overflow: "hidden" }}>
              {campaigns.length === 0 && <Empty label="No campaign delivery yet." />}
              {campaigns.map(([id, units], i) => (
                <Row key={id} i={i} left={`Campaign #${id}`} right={`${units.toLocaleString()} units`} />
              ))}
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

function Row({ i, left, right, sub }: { i: number; left: string; right: string; sub?: string }) {
  return (
    <div className="feed-row">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span className="mono" style={{ color: "var(--color-text-faint)", width: 18, fontSize: "0.78rem" }}>{i + 1}</span>
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
  return <div style={{ padding: "1.4rem 1.15rem", color: "var(--color-text-faint)", fontSize: "0.9rem" }}>{label}</div>;
}
