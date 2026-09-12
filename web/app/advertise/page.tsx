"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Nav } from "@/components/Nav";
import { Section, ChainBadge } from "@/components/ui";
import { usePoll } from "@/lib/hooks";
import { adServer } from "@/lib/server";
import { fmtUsdc, perImpression, shortAddr } from "@/lib/format";

export default function Advertise() {
  const { address, isConnected } = useAccount();
  const auction = usePoll(() => adServer.auction(), 4000);
  const board = auction?.board ?? [];
  const winnerId = auction?.winner.campaignId;
  const mine = isConnected ? board.filter((c) => c.advertiser.toLowerCase() === address?.toLowerCase()) : [];

  return (
    <>
      <Nav />
      <Section style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Campaigns</h1>
          <div style={{ flex: 1 }} />
          <Link href="/advertise/new" className="btn btn-primary">+ New campaign</Link>
        </div>

        {!isConnected && (
          <p style={{ color: "var(--color-text-dim)", marginTop: "1rem" }}>Connect your wallet to see your campaigns.</p>
        )}

        {isConnected && mine.length === 0 && (
          <div className="card" style={{ padding: "2rem", marginTop: "1.25rem", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-dim)" }}>Reach developers where they wait. Create your first campaign.</p>
            <Link href="/advertise/new" className="btn btn-primary">Create a campaign →</Link>
          </div>
        )}

        {mine.length > 0 && (
          <div className="card" style={{ marginTop: "1.25rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--color-text-dim)", fontSize: "0.78rem" }}>
                  <th style={th}>Campaign</th>
                  <th style={th}>Status</th>
                  <th style={th}>Bid / block</th>
                  <th style={th}>Per impression</th>
                  <th style={th}>Remaining</th>
                  <th style={th}>Chain</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((c) => {
                  const live = c.campaignId === winnerId;
                  const status = !c.active ? "Ended" : live ? "Live" : c.balance === "0" ? "Out of budget" : "Queued";
                  return (
                    <tr key={c.campaignId} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td style={td}>#{c.campaignId}</td>
                      <td style={td}>
                        <span className="pill" style={{ fontSize: "0.72rem" }}>
                          <span className="dot" style={{ background: live ? "var(--color-earn)" : c.active ? "var(--color-warn)" : "var(--color-text-faint)" }} />
                          {status}
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtUsdc(c.pricePerBlock, { decimals: 4 })}</td>
                      <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{perImpression(c.pricePerBlock)}</td>
                      <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{fmtUsdc(c.balance)}</td>
                      <td style={td}><ChainBadge /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--color-text-faint)" }}>
          Advertiser {isConnected ? shortAddr(address) : "—"} · the winning bid shows in every Claude Code spinner until outbid or out of budget.
        </p>
      </Section>
    </>
  );
}

const th: React.CSSProperties = { padding: "0.75rem 1rem", fontWeight: 600 };
const td: React.CSSProperties = { padding: "0.75rem 1rem" };
