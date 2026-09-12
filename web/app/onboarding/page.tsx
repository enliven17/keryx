"use client";

import { useState } from "react";
import Link from "next/link";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount } from "wagmi";
import { Nav } from "@/components/Nav";
import { Section, PageHeader } from "@/components/ui";
import { WalletButton } from "@/components/WalletButton";
import { config } from "@/lib/config";

export default function Onboarding() {
  const { address, isConnected } = useAccount();
  const [agent, setAgent] = useState<{ privateKey: `0x${string}`; address: `0x${string}` } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  function createAgent() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const next = { privateKey, address: account.address };
    localStorage.setItem("keryx.agent", JSON.stringify(next));
    setAgent(next);
  }

  async function copyCommand() {
    if (!agent) return;
    await navigator.clipboard.writeText(setupCommand(agent.privateKey).join("\n"));
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1800);
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
          title="Run the earner client"
          desc="The client polls for an ad, shows it in the agent's status surface, and signs each viewable impression with the key above. Pass that key explicitly, or the client will generate a different one and your earnings will land on an address you are not watching."
        >
          {!agent ? (
            <p style={{ margin: 0, color: "var(--color-text-faint)", fontSize: "0.88rem" }}>
              Create your earner key first — the command below is built from it.
            </p>
          ) : (
            <>
              <Terminal lines={[`cd keryx && pnpm install`]} label="Once, in a checkout of the repo" />
              <Terminal lines={setupCommand(agent.privateKey)} label="Then" onCopy={copyCommand} copied={copiedCmd} />
              <p style={{ margin: "0 0 1.2rem", color: "var(--color-text-dim)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                Now open a <strong style={{ color: "var(--color-text)" }}>new</strong> Claude Code
                session. The sponsored line replaces the thinking verb, which is read once at session
                start, so a session that is already running will not show it.{" "}
                <code style={{ fontSize: "0.85em" }}>node cli/bin/keryx.mjs uninstall</code> puts your
                settings back.
              </p>
            </>
          )}
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

/** The one command that matters, wired to this deployment and this earner key. */
function setupCommand(privateKey: string): string[] {
  // One line, so copy-and-paste survives a shell that does not honour continuations.
  return [`node cli/bin/keryx.mjs setup --server ${config.serverBase} --key ${privateKey}`];
}

function Terminal({
  lines,
  label,
  onCopy,
  copied,
}: {
  lines: string[];
  label?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div style={{ margin: "0 0 1.1rem" }}>
      {label && (
        <div className="eyebrow" style={{ marginBottom: "0.45rem" }}>
          {label}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <pre
          className="mono"
          style={{
            background: "#0d1117",
            border: "1px solid #21262d",
            color: "#c9d1d9",
            borderRadius: 9,
            padding: "0.95rem 1.1rem",
            paddingRight: onCopy ? "5.5rem" : "1.1rem",
            overflowX: "auto",
            fontSize: "0.78rem",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {lines.map((line, i) => (
            <span key={i}>
              {i === 0 && <span style={{ color: "#3fb950" }}>$ </span>}
              {line}
              {i < lines.length - 1 ? "\n" : null}
            </span>
          ))}
        </pre>
        {onCopy && (
          <button
            className="btn btn-ghost"
            onClick={onCopy}
            style={{ position: "absolute", top: 8, right: 8, fontSize: "0.74rem", padding: "0.35rem 0.7rem" }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
