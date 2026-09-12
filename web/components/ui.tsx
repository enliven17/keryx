import Link from "next/link";
import { ReactNode } from "react";

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--color-text)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/keryx.svg" alt="" width={size + 8} height={size + 8} style={{ display: "block" }} />
      <span style={{ fontWeight: 600, fontSize: size, letterSpacing: "-0.02em" }}>Keryx</span>
    </Link>
  );
}

export function ChainBadge({ chain = "Creditcoin" }: { chain?: "Creditcoin" | "Keryx Local" }) {
  const color = chain === "Creditcoin" ? "var(--color-brand)" : "var(--color-earn)";
  return (
    <span className="pill" style={{ fontSize: "0.72rem" }}>
      <span className="dot" style={{ background: color }} />
      {chain}
    </span>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div style={{ padding: "1.15rem 1.3rem" }}>
      <div className="eyebrow">{label}</div>
      <div
        className="mono"
        style={{ fontSize: "1.7rem", fontWeight: 600, marginTop: 8, letterSpacing: "-0.02em", color: accent ?? "var(--color-text)" }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.78rem", color: "var(--color-text-faint)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/** Stats sitting in one framed row, divided by hairlines rather than boxed separately. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="card stat-row" style={{ overflow: "hidden" }}>
      {children}
    </div>
  );
}

/**
 * The heading every dashboard page opens on: a micro-label, a display title,
 * one line of orientation, and whatever status belongs on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  right,
}: {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header style={{ paddingTop: "clamp(2rem, 6vw, 3.2rem)", paddingBottom: "clamp(1.5rem, 4vw, 2.2rem)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginTop: "0.85rem" }}>
            {title}
          </h1>
        </div>
        {right && <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>{right}</div>}
      </div>
      {lead && (
        <p style={{ color: "var(--color-text-dim)", fontSize: "0.95rem", lineHeight: 1.6, margin: "1.1rem 0 0", maxWidth: "64ch" }}>
          {lead}
        </p>
      )}
    </header>
  );
}

/** Canonical preview of how an ad renders in the Claude Code spinner. */
export function AdCreativeCard({ text, url, earning }: { text: string; url?: string; earning?: string }) {
  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid #21262d",
        borderRadius: 10,
        padding: "0.85rem 1rem",
        fontFamily: "var(--font-mono)",
        fontSize: "0.82rem",
        color: "#c9d1d9",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#3fb950", animation: "keryx-pulse 1.4s infinite" }}>✶</span>
        <span style={{ color: "#79c0ff" }}>{text}</span>
        <span style={{ color: "#6e7681", fontSize: "0.7rem" }}>· sponsored</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#6e7681", fontSize: "0.72rem" }}>
        <span>thinking…</span>
        {earning && <span style={{ color: "#3fb950" }}>{earning} earned</span>}
        {url && <span>{url}</span>}
      </div>
    </div>
  );
}

export function Section({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(1.15rem, 4vw, 1.5rem)", ...style }}>{children}</div>;
}
