"use client";

import { useState } from "react";
import Link from "next/link";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount } from "wagmi";
import { Nav } from "@/components/Nav";
import { ChainBadge, Section, PageHeader } from "@/components/ui";
import { WalletButton } from "@/components/WalletButton";

export default function Onboarding() {
  const { address, isConnected } = useAccount();
  const [agent, setAgent] = useState<{ privateKey: `0x${string}`; address: `0x${string}` } | null>(null);
  const [copied, setCopied] = useState(false);

  function createAgent() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const next = { privateKey, address: account.address };
    localStorage.setItem("keryx.agent", JSON.stringify(next));
    setAgent(next);
  }

  async function copyKey() {
    if (!agent) return;
    await navigator.clipboard.writeText(agent.privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <Nav />
      <Section style={{ maxWidth: 780, paddingBottom: "4.5rem" }}>
        <PageHeader
          eyebrow="Get set up"
          title="Turn coding time into USDC."
          right={<ChainBadge />}
          lead="Connect a wallet for campaign actions, create a local earner key, then run Keryx beside Claude Code. Accepted engagement is anchored on the source chain and settled on Creditcoin."
        />

        <Step n="01" title="Connect your wallet" desc="Used to create campaigns and claim balances on the selected network.">
          {isConnected ? <span className="pill mono">{address}</span> : <WalletButton />}
        </Step>

        <Step
          n="02"
          title="Create your earner key"
          desc="This key identifies the local Keryx process. It is generated in your browser, shown once, and never uploaded."
        >
          {!agent ? (
            <button className="btn btn-primary" onClick={createAgent}>
              Create local key
            </button>
          ) : (
            <>
              <span className="pill mono" style={{ marginBottom: 10 }}>{agent.address}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <code
                  className="mono"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--color-border)",
                    padding: "0.6rem 0.7rem",
                    borderRadius: 7,
                    wordBreak: "break-all",
                    fontSize: "0.76rem",
                    color: "var(--color-text-dim)",
                  }}
                >
                  {agent.privateKey}
                </code>
                <button className="btn btn-ghost" onClick={copyKey}>
                  {copied ? "Copied" : "Copy key"}
                </button>
              </div>
            </>
          )}
        </Step>

        <Step
          n="03"
          last
          title="Start earning"
          desc="Install the extension, paste the key into Keryx: Connect agent, and keep the spinner visible."
        >
          <pre
            className="mono"
            style={{
              background: "#0d1117",
              border: "1px solid #21262d",
              color: "#c9d1d9",
              borderRadius: 9,
              padding: "0.95rem 1.1rem",
              overflowX: "auto",
              fontSize: "0.8rem",
              margin: "0 0 1rem",
            }}
          >
            <span style={{ color: "#3fb950" }}>$</span> keryx setup{`\n`}
            <span style={{ color: "#3fb950" }}>$</span> keryx start
          </pre>
          <Link href="/earn" className="btn btn-earn">
            Open earnings →
          </Link>
        </Step>
      </Section>
    </>
  );
}

/** One numbered setup step, using the same rail language as the landing. */
function Step({ n, title, desc, last, children }: { n: string; title: string; desc: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`step-row${last ? " step-row-end" : ""}`} style={last ? undefined : { paddingBottom: "2.4rem" }}>
      <span className="step-mark mono" style={{ color: "var(--color-cream)" }}>{n}</span>
      <div>
        <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</h2>
        <p style={{ margin: "0 0 1.1rem", color: "var(--color-text-dim)", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: "54ch" }}>
          {desc}
        </p>
        {children}
      </div>
    </div>
  );
}
