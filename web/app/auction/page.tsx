"use client";

import { Nav } from "@/components/Nav";
import { Section, ChainBadge, PageHeader } from "@/components/ui";
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
      <Section style={{ paddingBottom: "4rem" }}>
        <PageHeader
          eyebrow="Marketplace"
          title="Live auction"
          right={<ChainBadge />}
          lead={
            <>
              English-ascending. The highest funded bid holds every Claude Code spinner until it is
              outbid or runs out of budget.
              {auction && auction.winner.campaignId !== "0" && (
                <>
                  {" "}
                  Clearing price is{" "}
                  <strong className="mono" style={{ color: "var(--color-text)" }}>
                    {fmtUsdc(auction.winner.price, { decimals: 4 })}
                  </strong>{" "}
                  per thousand impressions.
                </>
              )}
            </>
          }
        />

        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Campaign</th>
                <th>Advertiser</th>
                <th>Bid / block</th>
                <th>Per impression</th>
                <th>Budget left</th>
              </tr>
            </thead>
            <tbody>
              {board.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <span style={{ color: "var(--color-text-faint)" }}>No live bids yet.</span>
                  </td>
                </tr>
              )}
              {board.map((c, i) => {
                const live = c.campaignId === winnerId;
                return (
                  <tr key={c.campaignId} style={live ? { background: "rgba(52,211,153,0.06)" } : undefined}>
                    <td>
                      {live ? (
                        <span className="pill" style={{ color: "var(--color-earn)", fontSize: "0.7rem", borderColor: "rgba(52,211,153,0.35)" }}>
                          <span className="dot" style={{ background: "var(--color-earn)" }} />
                          live
                        </span>
                      ) : (
                        <span className="mono" style={{ color: "var(--color-text-faint)" }}>{i + 1}</span>
                      )}
                    </td>
                    <td className="mono">#{c.campaignId}</td>
                    <td className="mono" style={{ color: "var(--color-text-dim)" }}>{shortAddr(c.advertiser)}</td>
                    <td className="mono" style={{ fontWeight: live ? 700 : 400 }}>{fmtUsdc(c.pricePerBlock, { decimals: 4 })}</td>
                    <td className="mono" style={{ color: "var(--color-text-dim)" }}>{perImpression(c.pricePerBlock)}</td>
                    <td className="mono">{fmtUsdc(c.balance)}</td>
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

