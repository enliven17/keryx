"use client";

import { Nav } from "@/components/Nav";
import { Section, ChainBadge } from "@/components/ui";
import { usePoll } from "@/lib/hooks";
import { adServer } from "@/lib/server";
import { fmtUsdc, perImpression, shortAddr } from "@/lib/format";

export default function AuctionPage() {
  const auction = usePoll(() => adServer.auction(), 3000);
  const board = [...(auction?.board ?? [])]
    .filter((c) => c.active)
    .sort((a, b) => Number(BigInt(b.pricePerBlock) - BigInt(a.pricePerBlock)));
  const winnerId = auction?.winner.campaignId;

  return (
    <>
      <Nav />
      <Section style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 style={{ margin: 0 }}>Live auction</h1>
          <ChainBadge />
        </div>
        <p style={{ color: "var(--color-text-dim)" }}>
          English-ascending. The highest funded bid wins every Claude Code spinner until outbid or out of budget.
          {auction && auction.winner.campaignId !== "0" && (
            <>
              {" "}Clearing price{" "}
              <strong className="mono">{fmtUsdc(auction.winner.price, { decimals: 4 })}</strong> / block.
            </>
          )}
        </p>

        <div className="card" style={{ marginTop: "1.25rem", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--color-text-dim)", fontSize: "0.78rem" }}>
                <th style={cell}>Rank</th>
                <th style={cell}>Campaign</th>
                <th style={cell}>Advertiser</th>
                <th style={cell}>Bid / block</th>
                <th style={cell}>Per impression</th>
                <th style={cell}>Budget left</th>
              </tr>
            </thead>
            <tbody>
              {board.length === 0 && (
                <tr><td style={cell} colSpan={6}><span style={{ color: "var(--color-text-faint)" }}>No live bids yet.</span></td></tr>
              )}
              {board.map((c, i) => {
                const live = c.campaignId === winnerId;
                return (
                  <tr key={c.campaignId} style={{ borderTop: "1px solid var(--color-border)", background: live ? "rgba(26,127,82,0.05)" : undefined }}>
                    <td style={cell}>{live ? <span className="pill" style={{ color: "var(--color-earn)", fontSize: "0.7rem" }}>#1 · live</span> : `#${i + 1}`}</td>
                    <td style={cell}>#{c.campaignId}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)" }}>{shortAddr(c.advertiser)}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)", fontWeight: live ? 700 : 400 }}>{fmtUsdc(c.pricePerBlock, { decimals: 4 })}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)" }}>{perImpression(c.pricePerBlock)}</td>
                    <td style={{ ...cell, fontFamily: "var(--font-mono)" }}>{fmtUsdc(c.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

const cell: React.CSSProperties = { padding: "0.75rem 1rem" };
