"use client";

import Link from "next/link";
import { Reveal } from "@/components/motion";
import { useAccount } from "wagmi";
import { Nav } from "@/components/Nav";
import { Section, PageHeader } from "@/components/ui";
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
      <Section style={{ paddingBottom: "4rem" }}>
        <PageHeader
          eyebrow="Advertisers"
          title="Campaigns"
          lead={
            <>
              The winning bid shows in every Claude Code spinner until it is outbid or runs out of
              budget. You are charged for delivery a cross-chain proof can stand behind.
            </>
          }
          right={
            <Link href="/advertise/new" className="btn btn-primary">
              New campaign
            </Link>
          }
        />

        <Reveal delay={80}>
        {!isConnected && (
          <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-dim)", margin: 0 }}>Connect your wallet to see your campaigns.</p>
          </div>
        )}

        {isConnected && mine.length === 0 && (
          <div className="card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 0.6rem", fontSize: "1.3rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Reach developers where they wait
            </h2>
            <p style={{ color: "var(--color-text-dim)", maxWidth: "44ch", margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
              Escrow USDC, commit a creative, and bid for the spinner slot. Nothing is charged until
              an impression is proved.
            </p>
            <Link href="/advertise/new" className="btn btn-primary">
              Create a campaign →
            </Link>
          </div>
        )}

        {mine.length > 0 && (
          <div className="card table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Bid / block</th>
                  <th>Per impression</th>
                  <th>Remaining</th>
                  <th>Chain</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((c) => {
                  const live = c.campaignId === winnerId;
                  const status = !c.active ? "Ended" : live ? "Live" : c.balance === "0" ? "Out of budget" : "Queued";
                  return (
                    <tr key={c.campaignId}>
                      <td className="mono">#{c.campaignId}</td>
                      <td>
                        <span className="pill" style={{ fontSize: "0.72rem" }}>
                          <span
                            className="dot"
                            style={{ background: live ? "var(--color-earn)" : c.active ? "var(--color-warn)" : "var(--color-text-faint)" }}
                          />
                          {status}
                        </span>
                      </td>
                      <td className="mono">{fmtUsdc(c.pricePerBlock, { decimals: 4 })}</td>
                      <td className="mono" style={{ color: "var(--color-text-dim)" }}>{perImpression(c.pricePerBlock)}</td>
                      <td className="mono">{fmtUsdc(c.balance)}</td>
                      <td className="mono" style={{ color: "var(--color-text-dim)" }}>Creditcoin</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        </Reveal>

        <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--color-text-faint)" }}>
          Advertiser {isConnected ? shortAddr(address) : "not connected"}
        </p>
      </Section>
    </>
  );
}

