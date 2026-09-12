"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Nav } from "@/components/Nav";
import { Section, Stat, StatRow, ChainBadge, AdCreativeCard, PageHeader } from "@/components/ui";
import { useDeployment, usePoll } from "@/lib/hooks";
import { adServer } from "@/lib/server";
import { fmtUsdc, shortAddr } from "@/lib/format";
import { useToast } from "@/components/Toaster";
import { CampaignEscrowAbi } from "@/lib/abis";
import { anvil, creditcoinTestnet } from "@/lib/chains";

type Agent = { privateKey: `0x${string}`; address: `0x${string}` };

export default function Earn() {
  const { deployment } = useDeployment();
  const t = useToast();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem("keryx.agent");
    if (c) {
      setAgent(JSON.parse(c));
      return;
    }
    // Read-only view of any agent (e.g. the seeded demo agent): /earn?agent=0x…
    const q = new URLSearchParams(window.location.search).get("agent");
    if (q && /^0x[0-9a-fA-F]{40}$/.test(q)) {
      setAgent({ privateKey: "0x" as `0x${string}`, address: q as `0x${string}` });
      setViewOnly(true);
    }
  }, []);

  const earnings = usePoll(async () => (agent ? adServer.earnings(agent.address) : null), 4000, [agent?.address]);
  const activity = usePoll(() => adServer.activity(), 4000);
  const accrued = earnings?.accrued ? BigInt(earnings.accrued) : 0n;

  const myEvents = (activity?.events ?? []).filter(
    (e) => agent && e.earner.toLowerCase() === agent.address.toLowerCase(),
  );
  const impressions = myEvents.filter((e) => e.type === "impression").length;
  const clicks = myEvents.filter((e) => e.type === "click").length;

  async function claim() {
    if (!agent || !deployment || accrued === 0n) return;
    setClaiming(true);
    const amount = fmtUsdc(accrued, { decimals: 4 });
    const id = t.push({ type: "loading", title: `Claiming ${amount} USDC…`, desc: "Settling on-chain." });
    try {
      const chain = deployment.chainId === 102031 ? creditcoinTestnet : anvil;
      const account = privateKeyToAccount(agent.privateKey);
      const wallet = createWalletClient({ account, chain, transport: http(deployment.rpcUrl) });
      const pub = createPublicClient({ chain, transport: http(deployment.rpcUrl) });
      const hash = await wallet.writeContract({
        account,
        chain,
        address: deployment.campaignEscrow as Address,
        abi: CampaignEscrowAbi,
        functionName: "claimAll",
      });
      t.update(id, { desc: "Waiting for confirmation…", txHash: hash });
      await pub.waitForTransactionReceipt({ hash });
      t.update(id, { type: "success", title: `Claimed ${amount} USDC`, desc: "Sent to your agent wallet.", txHash: hash });
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? String(e);
      t.update(id, { type: "error", title: "Claim failed", desc: msg.split("\n")[0].slice(0, 140) });
    } finally {
      setClaiming(false);
    }
  }

  if (!agent) {
    return (
      <>
        <Nav />
        <Section style={{ paddingTop: "4rem", textAlign: "center" }}>
          <h1>No agent connected</h1>
          <p style={{ color: "var(--color-text-dim)" }}>Finish onboarding to create your local earner key.</p>
          <Link href="/onboarding" className="btn btn-primary">Start onboarding →</Link>
        </Section>
      </>
    );
  }

  return (
    <>
      <Nav />
      <Section style={{ paddingBottom: "4rem" }}>
        <PageHeader
          eyebrow="Your wallet"
          title="Earn"
          right={
            <>
              <span className="pill mono" style={{ fontSize: "0.72rem" }}>
                <span className="dot" style={{ background: "var(--color-earn)" }} /> {shortAddr(agent.address)}
              </span>
              <ChainBadge />
            </>
          }
        />

        {/* The balance is the page. Everything else explains it. */}
        <div
          className="card"
          style={{
            padding: "2.2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
            background: "linear-gradient(180deg, rgba(52,211,153,0.07), transparent 70%), var(--color-surface)",
          }}
        >
          <div>
            <span className="eyebrow">Claimable USDC</span>
            <div
              className="mono"
              style={{ fontSize: "clamp(2.4rem, 6vw, 3.4rem)", fontWeight: 600, color: "var(--color-earn)", lineHeight: 1.05, letterSpacing: "-0.03em", marginTop: 8 }}
            >
              {fmtUsdc(accrued, { decimals: 4 })}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-faint)", marginTop: 6 }}>
              50% revenue share · settles on Creditcoin
            </div>
          </div>
          <button
            className="btn btn-earn"
            disabled={claiming || accrued === 0n || viewOnly}
            onClick={claim}
            style={{ fontSize: "1rem", padding: "0.8rem 1.6rem" }}
          >
            {viewOnly ? "View only" : claiming ? "Claiming…" : accrued === 0n ? "Nothing to claim" : "Claim USDC"}
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <StatRow>
            <Stat label="Impressions" value={impressions} />
            <Stat label="Clicks" value={clicks} />
            <Stat label="Claimable" value={fmtUsdc(accrued, { decimals: 2 })} accent="var(--color-earn)" />
            <Stat label="Surface" value="Claude Code" sub="spinner overlay" />
          </StatRow>
        </div>

        <h2 className="section-title">Live activity</h2>
        <div className="card feed" style={{ overflow: "hidden" }}>
          {myEvents.length === 0 && (
            <div style={{ padding: "1.4rem 1.15rem", color: "var(--color-text-faint)", fontSize: "0.9rem" }}>
              Start your agent and watch this climb. Every viewable impression in the spinner earns USDC.
            </div>
          )}
          {myEvents.slice(0, 12).map((e, i) => (
            <div key={i} className="feed-row">
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  className="dot"
                  style={{ background: e.type === "click" ? "var(--color-spend)" : "var(--color-earn)", flexShrink: 0 }}
                />
                <span style={{ fontWeight: 600 }}>{e.type}</span>
                <span style={{ color: "var(--color-text-faint)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.surface ?? "spinner"} · campaign {e.campaign_id}
                </span>
              </span>
              <span className="mono" style={{ color: "var(--color-text-faint)", flexShrink: 0 }}>
                {new Date(e.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <h2 className="section-title">What developers see</h2>
        <div style={{ maxWidth: 480 }}>
          <AdCreativeCard text="Deploy this in 30s — vercel.com/new" earning={fmtUsdc(accrued, { decimals: 4 })} />
        </div>
      </Section>
    </>
  );
}
