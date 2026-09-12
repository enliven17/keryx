"use client";

import { useState } from "react";
import Link from "next/link";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount } from "wagmi";
import { Nav } from "@/components/Nav";
import { ChainBadge, Section } from "@/components/ui";
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
      <Section style={{ maxWidth: 760, paddingTop: "3rem", paddingBottom: "4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><ChainBadge /><span style={{ color: "var(--color-text-dim)", fontSize: "0.85rem" }}>Keryx onboarding</span></div>
        <h1 style={{ fontSize: "2.6rem", lineHeight: 1.05, marginBottom: "0.75rem" }}>Turn your coding time into CTC rewards.</h1>
        <p style={{ color: "var(--color-text-dim)", maxWidth: 580, fontSize: "1.05rem" }}>
          Connect a wallet for campaign actions, create a local earner key, then run Keryx beside Claude Code.
          Accepted engagement is anchored on the source chain and settled on Creditcoin through Attestcoin.
        </p>

        <div className="card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700 }}>1. Connect your wallet</div>
          <p style={{ color: "var(--color-text-dim)", fontSize: "0.85rem" }}>Use it to create campaigns and claim balances on the selected Creditcoin network.</p>
          {isConnected ? <div className="pill mono">{address}</div> : <WalletButton />}
        </div>

        <div className="card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
          <div style={{ fontWeight: 700 }}>2. Create your earner key</div>
          <p style={{ color: "var(--color-text-dim)", fontSize: "0.85rem" }}>The key identifies the local Keryx process. Store the private key safely; it is shown once and never uploaded.</p>
          {!agent ? (
            <button className="btn btn-primary" onClick={createAgent}>Create local key</button>
          ) : (
            <div>
              <div className="pill mono" style={{ marginBottom: 10 }}>{agent.address}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <code style={{ background: "var(--color-surface-2)", padding: "0.65rem", borderRadius: 7, wordBreak: "break-all", fontSize: "0.78rem" }}>{agent.privateKey}</code>
                <button className="btn btn-ghost" onClick={copyKey}>{copied ? "Copied" : "Copy key"}</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
          <div style={{ fontWeight: 700 }}>3. Start earning</div>
          <p style={{ color: "var(--color-text-dim)", fontSize: "0.85rem" }}>Install the extension, paste the key in Keryx: Connect agent, and keep the Claude Code spinner visible.</p>
          <pre style={{ background: "#0d1117", color: "#c9d1d9", borderRadius: 8, padding: "1rem", overflowX: "auto", fontSize: "0.8rem" }}>keryx setup{`\n`}keryx start</pre>
          <Link href="/earn" className="btn btn-earn">Open earnings →</Link>
        </div>
      </Section>
    </>
  );
}
