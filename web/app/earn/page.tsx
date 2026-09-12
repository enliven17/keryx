"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Nav } from "@/components/Nav";
import { Section, Stat, ChainBadge, AdCreativeCard } from "@/components/ui";
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
      <Section style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
          <h1 style={{ margin: 0 }}>Earn</h1>
          <span className="pill mono" style={{ fontSize: "0.72rem" }}>
            <span className="dot" style={{ background: "var(--color-earn)" }} /> agent {shortAddr(agent.address)}
          </span>
          <ChainBadge />
        </div>

        {/* hero balance */}
        <div className="card" style={{ padding: "2rem", marginTop: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-dim)", fontWeight: 600 }}>Claimable USDC · earning now</div>
            <div className="mono" style={{ fontSize: "3rem", fontWeight: 700, color: "var(--color-earn)", lineHeight: 1.1 }}>
              {fmtUsdc(accrued, { decimals: 4 })}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-faint)" }}>settles on Creditcoin · 50% revenue share</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button className="btn btn-earn" disabled={claiming || accrued === 0n || viewOnly} onClick={claim} style={{ fontSize: "1rem", padding: "0.75rem 1.5rem" }}>
              {viewOnly ? "View only" : claiming ? "Claiming…" : accrued === 0n ? "Nothing to claim" : "Claim USDC"}
            </button>
          </div>
        </div>

        {/* stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginTop: "1rem" }}>
          <Stat label="Impressions" value={impressions} />
          <Stat label="Clicks" value={clicks} />
          <Stat label="Claimable" value={fmtUsdc(accrued, { decimals: 2 })} accent="var(--color-earn)" />
          <Stat label="Surfaces" value="Claude Code" sub="spinner overlay" />
        </div>

        {/* live activity */}
        <h2 style={{ fontSize: "1.2rem", marginTop: "2rem" }}>Live activity</h2>
        <div className="card" style={{ padding: "0.5rem 0", marginTop: "0.5rem" }}>
          {myEvents.length === 0 && (
            <div style={{ padding: "1.25rem", color: "var(--color-text-faint)", fontSize: "0.9rem" }}>
              Start your agent and watch this climb. Each viewable impression in the Claude Code spinner earns USDC.
            </div>
          )}
          {myEvents.slice(0, 12).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 1.1rem", borderTop: i ? "1px solid var(--color-border)" : "none", fontSize: "0.85rem" }}>
              <span>
                <span style={{ color: e.type === "click" ? "var(--color-spend)" : "var(--color-earn)", fontWeight: 600 }}>{e.type}</span>
                <span style={{ color: "var(--color-text-faint)" }}> · {e.surface ?? "spinner"} · campaign {e.campaign_id}</span>
              </span>
              <span className="mono" style={{ color: "var(--color-text-faint)" }}>{new Date(e.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "1.2rem", marginTop: "2rem" }}>What developers see</h2>
        <div style={{ marginTop: "0.5rem", maxWidth: 480 }}>
          <AdCreativeCard text="Deploy this in 30s — vercel.com/new" earning={fmtUsdc(accrued, { decimals: 4 })} />
        </div>
      </Section>
    </>
  );
}
