import Link from "next/link";
import { Logo } from "@/components/ui";
import { ClaudeTui } from "@/components/ClaudeTui";
import { HGutter, Reveal, SplitText, VGutter } from "@/components/motion";

const FRAME: React.CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "0 1.75rem" };

const MARQUEE = [
  "Creditcoin settlement",
  "Attestcoin proofs",
  "Neon PostgreSQL",
  "USDC escrow",
  "Claude Code",
  "VS Code",
  "Non-custodial claims",
  "Weighted auction",
];

const STEPS = [
  { n: "01", t: "Fund", d: "An advertiser escrows USDC on Creditcoin and commits to a creative hash on-chain." },
  { n: "02", t: "Bid", d: "The auction ranks funded campaigns by price per thousand impressions." },
  { n: "03", t: "Record", d: "A viewable impression is signed by the earner and anchored on the source chain." },
  { n: "04", t: "Prove", d: "Attestcoin proves the receipt, and only then does the ASC release escrow." },
];

const VALUES = [
  {
    t: "Get paid to prompt",
    d: "Half of every charged campaign amount becomes claimable by the earner, straight to the connected wallet. No custodian in the middle.",
    c: "var(--color-earn)",
  },
  {
    t: "Verifiable delivery",
    d: "Accepted events are anchored on a source chain and proved through Attestcoin before the Creditcoin contract touches escrow.",
    c: "var(--color-brand)",
  },
  {
    t: "Neon-backed history",
    d: "Neon PostgreSQL keeps creatives, per-earner caps, source receipts and settlement status queryable from the dashboard.",
    c: "var(--color-spend)",
  },
];

export default function Landing() {
  return (
    <main>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(14px) saturate(1.4)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ ...FRAME, display: "flex", alignItems: "center", height: 62 }}>
          <Logo size={19} />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            <Link href="/onboarding" className="nav-link">For earners</Link>
            <Link href="/advertise" className="nav-link">For advertisers</Link>
            <Link href="/auction" className="nav-link">Live auction</Link>
            <Link href="/onboarding" className="btn btn-white">Start earning</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "6.5rem 0 4rem" }}>
        <div className="aurora" aria-hidden />
        <div className="grid-veil" aria-hidden />
        <Rails />

        <div style={{ ...FRAME, position: "relative", zIndex: 2, textAlign: "center" }}>
          <Reveal delay={80}>
            <span
              className="pill"
              style={{ borderColor: "rgba(124,131,240,0.35)", color: "var(--color-brand)" }}
            >
              <span className="dot" style={{ background: "var(--color-brand)", animation: "keryx-pulse 1.8s infinite" }} />
              Creditcoin × Attestcoin · BUIDL CTC 2026
            </span>
          </Reveal>

          <h1 className="display" style={{ fontSize: "clamp(3rem, 9vw, 7rem)", margin: "1.6rem 0 0" }}>
            <SplitText text="Get paid" by="char" delay={180} />
            <br />
            <SplitText text="to" by="char" delay={520} />{" "}
            <span className="shine" style={{ animationDelay: "760ms, 1.9s" }}>wait</span>.
          </h1>

          <Reveal delay={420}>
            <p
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.18rem)",
                lineHeight: 1.55,
                color: "var(--color-text-dim)",
                maxWidth: 580,
                margin: "1.9rem auto 0",
              }}
            >
              Your AI coding agent spends minutes thinking. Keryx turns that dead time into a
              transparent ad marketplace — earners keep half, and no payout moves until the
              impression is proved on-chain.
            </p>
          </Reveal>

          <Reveal delay={520}>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "2.2rem", flexWrap: "wrap" }}>
              <Link href="/onboarding" className="btn btn-white">Start earning</Link>
              <Link href="/advertise/new" className="btn btn-ghost">Advertise on Keryx →</Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={640}>
          <div style={{ position: "relative", zIndex: 2, maxWidth: 880, margin: "4rem auto 0", padding: "0 1.75rem" }}>
            <div style={{ filter: "drop-shadow(0 40px 90px rgba(124,131,240,0.24))" }}>
              <ClaudeTui />
            </div>
          </div>
        </Reveal>
      </section>

      <HGutter />

      {/* ─── Marquee ────────────────────────────────────────── */}
      <section style={{ padding: "1.4rem 0" }}>
        <div className="marquee-row">
          <div className="marquee">
            {[...MARQUEE, ...MARQUEE].map((label, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 1.7rem",
                  fontSize: "0.84rem",
                  color: "var(--color-text-dim)",
                  whiteSpace: "nowrap",
                }}
              >
                <span className="dot" style={{ background: "var(--color-brand)", opacity: 0.7 }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <HGutter />

      {/* ─── Four steps: heading column, dashed rail, step rows ─ */}
      <section style={{ position: "relative", ...FRAME, paddingTop: "5rem", paddingBottom: "5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 26px minmax(0, 1.45fr)", gap: 0 }}>
          <div style={{ paddingRight: "2rem", position: "sticky", top: 120, alignSelf: "start" }}>
            <span className="eyebrow">How it works</span>
            <h2
              className="display"
              style={{ fontSize: "clamp(1.9rem, 3.4vw, 3.4rem)", marginTop: "1.1rem", lineHeight: 1.04 }}
            >
              <SplitText text="Replace the spinner." />
              <br />
              <span style={{ color: "var(--color-cream)" }}>
                <SplitText text="Split the revenue." delay={200} />
              </span>
            </h2>
          </div>

          <div style={{ position: "relative" }}>
            <VGutter style={{ width: 26, left: 0 }} />
          </div>

          <div>
            {STEPS.map((s, i) => (
              <div key={s.n}>
                {i > 0 && <HGutter style={{ height: 12 }} />}
                <Reveal delay={i * 90}>
                  <div style={{ padding: "1.9rem 0 1.9rem 2.4rem" }}>
                    <span
                      className="mono"
                      style={{
                        display: "inline-block",
                        background: "var(--color-cream)",
                        color: "#0a0a0b",
                        padding: "0.1rem 0.45rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.n}
                    </span>
                    <h3 style={{ margin: "0.9rem 0 0.5rem", fontSize: "1.4rem", fontWeight: 600, letterSpacing: "-0.025em" }}>
                      {s.t}
                    </h3>
                    <p style={{ margin: 0, color: "var(--color-text-dim)", fontSize: "0.93rem", lineHeight: 1.6, maxWidth: "46ch" }}>
                      {s.d}
                    </p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HGutter />

      {/* ─── Proof ──────────────────────────────────────────── */}
      <section style={{ ...FRAME, padding: "5rem 1.75rem" }}>
        <span className="eyebrow">Proved on testnet</span>
        <h2 className="display" style={{ fontSize: "clamp(1.9rem, 4vw, 3.1rem)", margin: "1.1rem 0 1.2rem", maxWidth: 720 }}>
          <SplitText text="One impression, end to end." />
        </h2>
        <Reveal delay={160}>
          <p style={{ color: "var(--color-text-dim)", maxWidth: 620, lineHeight: 1.6, margin: "0 0 2.6rem" }}>
            A single viewable impression charged 600 USDC base units and split them 50/50. Nothing
            moved until Attestcoin proved the source receipt on Creditcoin.
          </p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <Reveal delay={120}>
            <ProofCard
              chain="Ethereum Sepolia"
              event="EngagementRecorded"
              hash="0x94d5993d3248bdf8363bfd66e3236bfa65190f6aec6d3c55ef614db755ae3e46"
              href="https://sepolia.etherscan.io/tx/0x94d5993d3248bdf8363bfd66e3236bfa65190f6aec6d3c55ef614db755ae3e46"
              accent="var(--color-text-dim)"
            />
          </Reveal>
          <Reveal delay={240}>
            <ProofCard
              chain="Creditcoin Testnet"
              event="AttestcoinSettlement.execute"
              hash="0xe75c826a62b75b48caa813bef11b99ef00a3da3284181b9792a8e26996b4c608"
              href="https://creditcoin-testnet.blockscout.com/tx/0xe75c826a62b75b48caa813bef11b99ef00a3da3284181b9792a8e26996b4c608"
              accent="var(--color-creditcoin)"
            />
          </Reveal>
        </div>
      </section>

      <HGutter />

      {/* ─── Values, split by dashed rails ──────────────────── */}
      <section style={{ ...FRAME, position: "relative", padding: "0 1.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {VALUES.map((v, i) => (
            <div key={v.t} style={{ position: "relative" }}>
              {i > 0 && <VGutter style={{ left: -13 }} />}
              <Reveal delay={i * 110}>
                <div style={{ padding: "3rem 1.9rem" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: v.c, marginBottom: 18 }} />
                  <h3 style={{ margin: "0 0 0.7rem", fontSize: "1.3rem", fontWeight: 600, letterSpacing: "-0.025em" }}>{v.t}</h3>
                  <p style={{ margin: 0, color: "var(--color-text-dim)", fontSize: "0.92rem", lineHeight: 1.65 }}>{v.d}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <HGutter />

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "6rem 0", textAlign: "center" }}>
        <div className="aurora" aria-hidden style={{ opacity: 0.5 }} />
        <Rails />
        <div style={{ ...FRAME, position: "relative", zIndex: 2 }}>
          <h2 className="display" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.2rem)", maxWidth: 800, margin: "0 auto" }}>
            <SplitText text="Reach people who are already paying attention." />
          </h2>
          <Reveal delay={220}>
            <p style={{ color: "var(--color-text-dim)", maxWidth: 560, margin: "1.5rem auto 2.2rem", lineHeight: 1.6 }}>
              Fund a campaign in USDC, bid for the spinner slot, and pay only for delivery that a
              cross-chain proof can stand behind.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/advertise/new" className="btn btn-white">Create a campaign →</Link>
              <Link href="/earn" className="btn btn-ghost">See your earnings</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <HGutter />

      <footer
        style={{ ...FRAME, padding: "2.3rem 1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
      >
        <Logo size={17} />
        <span style={{ color: "var(--color-text-faint)", fontSize: "0.82rem" }}>
          Keryx · BUIDL CTC 2026 Fall · settled on Creditcoin
        </span>
      </footer>
    </main>
  );
}

/** The two dashed rails that mark the content column's edges. */
function Rails() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      <VGutter style={{ left: "max(0px, calc(50% - 620px))" }} />
      <VGutter style={{ right: "max(0px, calc(50% - 620px))" }} />
    </div>
  );
}

function ProofCard({
  chain,
  event,
  hash,
  href,
  accent,
}: {
  chain: string;
  event: string;
  hash: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="card"
      style={{ padding: "1.4rem", textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="dot" style={{ background: accent }} />
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-dim)" }}>{chain}</span>
      </div>
      <div className="mono" style={{ fontSize: "0.9rem", marginBottom: 10 }}>{event}</div>
      <div className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", wordBreak: "break-all" }}>
        {hash}
      </div>
    </a>
  );
}
