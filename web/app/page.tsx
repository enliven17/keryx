import Link from "next/link";
import { Logo } from "@/components/ui";
import { ClaudeTui } from "@/components/ClaudeTui";
import { Navbar } from "@/components/Navbar";
import { HGutter, Reveal, Scrub, ScrubText, SplitText, VGutter } from "@/components/motion";

const FRAME: React.CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "0 clamp(1.6rem, 5vw, 3.5rem)" };

const NAV_LINKS = [
  { href: "/onboarding", label: "For earners" },
  { href: "/advertise", label: "For advertisers" },
  { href: "/auction", label: "Live auction" },
  { href: "/docs", label: "Docs" },
];

const STEPS = [
  {
    n: "01",
    chain: "Creditcoin",
    color: "var(--color-cream)",
    t: "Fund the escrow",
    d: "An advertiser locks USDC in CampaignEscrow and commits to a creative hash on-chain.",
  },
  {
    n: "02",
    chain: "Creditcoin",
    color: "var(--color-cream)",
    t: "Win the slot",
    d: "AuctionHouse ranks funded campaigns by price per thousand impressions. The highest live bid takes the spinner.",
  },
  {
    n: "03",
    chain: "Ethereum Sepolia",
    color: "var(--color-text-dim)",
    t: "Record the impression",
    d: "The earner signs a viewable impression. The server batches it and emits EngagementRecorded on the source chain.",
  },
  {
    n: "04",
    chain: "Creditcoin",
    color: "var(--color-earn)",
    t: "Prove, then pay",
    d: "Attestcoin proves that source receipt. Only a verified proof lets the settlement contract charge escrow and split it 50/50.",
  },
];

const PROOF = [
  {
    chain: "Ethereum Sepolia",
    event: "EngagementRecorded",
    hash: "0x94d5993d3248bdf8363bfd66e3236bfa65190f6aec6d3c55ef614db755ae3e46",
    href: "https://sepolia.etherscan.io/tx/0x94d5993d3248bdf8363bfd66e3236bfa65190f6aec6d3c55ef614db755ae3e46",
    accent: "var(--color-text-dim)",
  },
  {
    chain: "Creditcoin",
    event: "AttestcoinSettlement.execute",
    hash: "0xe75c826a62b75b48caa813bef11b99ef00a3da3284181b9792a8e26996b4c608",
    href: "https://creditcoin-testnet.blockscout.com/tx/0xe75c826a62b75b48caa813bef11b99ef00a3da3284181b9792a8e26996b4c608",
    accent: "var(--color-cream)",
  },
];

const VALUES = [
  {
    t: "Get paid to prompt",
    d: "Half of every charged campaign amount becomes claimable by the earner, straight to the connected wallet. No custodian in the middle.",
    c: "var(--color-earn)",
  },
  {
    t: "Verifiable delivery",
    d: "Accepted events are anchored on a source chain and proved cryptographically before the settlement contract touches escrow.",
    c: "var(--color-cream)",
  },
  {
    t: "Readable history",
    d: "Every creative, per-earner cap, source receipt and settlement transaction stays queryable from the dashboard.",
    c: "var(--color-text-dim)",
  },
];

export default function Landing() {
  return (
    <main style={{ position: "relative" }}>
      <Rails />
      <Navbar
        links={NAV_LINKS}
        right={
          <Link href="/onboarding" className="btn btn-white nav-cta">
            Start earning
          </Link>
        }
      />

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(7.5rem, 16vw, 11rem) 0 clamp(4rem, 9vw, 6.5rem)",
        }}
      >
        <div className="aurora" aria-hidden />

        <div style={{ ...FRAME, position: "relative", zIndex: 2 }}>
          <div className="hero-grid">
            <div>
              <h1 className="display" style={{ fontSize: "clamp(2.8rem, 6.4vw, 5.1rem)", margin: 0 }}>
                <SplitText text="Get paid" by="char" delay={160} />
                <br />
                <SplitText text="to" by="char" delay={460} />{" "}
                <span className="shine" style={{ animationDelay: "640ms, 1.8s" }}>
                  wait
                </span>
                .
              </h1>

              <Reveal delay={380}>
                <p
                  style={{
                    fontSize: "clamp(0.98rem, 1.25vw, 1.1rem)",
                    lineHeight: 1.55,
                    color: "var(--color-text-dim)",
                    maxWidth: 470,
                    margin: "1.5rem 0 0",
                  }}
                >
                  Your AI coding agent spends minutes thinking. Keryx turns that dead time into a
                  transparent ad marketplace. Earners keep half, and no payout moves until the
                  impression is proved on-chain.
                </p>
              </Reveal>

              <Reveal delay={460}>
                <div style={{ display: "flex", gap: "0.7rem", marginTop: "1.9rem", flexWrap: "wrap" }}>
                  <Link href="/onboarding" className="btn btn-white">
                    Start earning
                  </Link>
                  <Link href="/advertise/new" className="btn btn-ghost">
                    Advertise on Keryx →
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={560}>
              <div style={{ filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.75))" }}>
                <ClaudeTui />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <HGutter />

      {/*
        One section, one spine. The four steps and the settled transactions sit on
        the same dashed line, so the proof reads as where that path ended rather
        than as a separate claim about it.
      */}
      <section
        style={{
          ...FRAME,
          paddingTop: "clamp(3.5rem, 9vw, 6rem)",
          paddingBottom: "clamp(3.5rem, 9vw, 6rem)",
        }}
      >
        <div className="how-grid">
          <div className="how-aside">
            <span className="eyebrow">How it works</span>
            <h2
              className="display"
              style={{ fontSize: "clamp(1.9rem, 3.2vw, 3.1rem)", marginTop: "1.1rem", lineHeight: 1.04 }}
            >
              <ScrubText text="Replace the spinner." />
              <br />
              <span style={{ color: "var(--color-cream)" }}>
                <ScrubText text="Split the revenue." start={0.84} end={0.4} />
              </span>
            </h2>
            <Scrub start={0.86} end={0.52}>
              <p
                style={{
                  color: "var(--color-text-dim)",
                  fontSize: "0.93rem",
                  lineHeight: 1.65,
                  marginTop: "1.3rem",
                  maxWidth: "38ch",
                }}
              >
                Two chains, one receipt. The impression is written where Keryx can be audited, and
                the money moves where the proof lands.
              </p>
            </Scrub>
          </div>

          <div>
            {STEPS.map((s) => (
              // Each step owns its own trigger, so they resolve in the order the
              // reader reaches them rather than on a shared timer.
              <Scrub key={s.n} start={0.9} end={0.62} y={36}>
                <div className="step-row">
                  <span className="step-mark mono" style={{ color: s.color }}>
                    {s.n}
                  </span>
                  <div style={{ paddingTop: 1 }}>
                    <span className="chain-tag" style={{ color: s.color }}>
                      <span className="dot" style={{ background: "currentColor" }} />
                      {s.chain}
                    </span>
                    <h3
                      style={{
                        margin: "0.5rem 0 0.45rem",
                        fontSize: "1.22rem",
                        fontWeight: 600,
                        letterSpacing: "-0.025em",
                      }}
                    >
                      {s.t}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--color-text-dim)",
                        fontSize: "0.92rem",
                        lineHeight: 1.6,
                        maxWidth: "52ch",
                      }}
                    >
                      {s.d}
                    </p>
                  </div>
                </div>
              </Scrub>
            ))}

            {/* The same spine continues into the receipts: this is that path, already walked. */}
            <Scrub start={0.9} end={0.6} y={36}>
              <div className="step-row step-row-end">
                <span
                  className="step-mark"
                  style={{ color: "var(--color-earn)", borderColor: "var(--color-earn)" }}
                  aria-hidden
                >
                  ✓
                </span>
                <div style={{ paddingTop: 1 }}>
                  <span className="eyebrow">Proved on testnet</span>
                  <h3
                    style={{
                      margin: "0.6rem 0 0.5rem",
                      fontSize: "1.22rem",
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    One impression, end to end
                  </h3>
                  <p
                    style={{
                      margin: "0 0 1.35rem",
                      color: "var(--color-text-dim)",
                      fontSize: "0.92rem",
                      lineHeight: 1.6,
                      maxWidth: "52ch",
                    }}
                  >
                    A single viewable impression charged 600 USDC base units and split them 50/50.
                    Nothing moved until the source receipt was proved on Creditcoin.
                  </p>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {PROOF.map((p) => (
                      <ProofCard key={p.hash} {...p} />
                    ))}
                  </div>
                </div>
              </div>
            </Scrub>
          </div>
        </div>
      </section>

      <HGutter />

      {/* ─── Values, split by dashed rails ──────────────────── */}
      <section style={{ ...FRAME, position: "relative" }}>
        <div className="values-grid">
          {VALUES.map((v, i) => (
            <div key={v.t} style={{ position: "relative" }}>
              {i > 0 && <VGutter style={{ left: -13 }} />}
              <Reveal delay={i * 110}>
                <div style={{ padding: "clamp(2rem, 5vw, 3rem) clamp(0rem, 3vw, 1.9rem)" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: v.c, marginBottom: 18 }} />
                  <h3 style={{ margin: "0 0 0.7rem", fontSize: "1.28rem", fontWeight: 600, letterSpacing: "-0.025em" }}>
                    {v.t}
                  </h3>
                  <p style={{ margin: 0, color: "var(--color-text-dim)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                    {v.d}
                  </p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <HGutter />

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section
        style={{ position: "relative", overflow: "hidden", padding: "clamp(3.5rem, 9vw, 6rem) 0", textAlign: "center" }}
      >
        <div className="aurora" aria-hidden style={{ opacity: 0.5 }} />
        <div style={{ ...FRAME, position: "relative", zIndex: 2 }}>
          <h2 className="display" style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)", maxWidth: 800, margin: "0 auto" }}>
            <SplitText text="Reach people who are already paying attention." />
          </h2>
          <Reveal delay={220}>
            <p style={{ color: "var(--color-text-dim)", maxWidth: 560, margin: "1.5rem auto 2.2rem", lineHeight: 1.6 }}>
              Fund a campaign in USDC, bid for the spinner slot, and pay only for delivery that a
              cross-chain proof can stand behind.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/advertise/new" className="btn btn-white">
                Create a campaign →
              </Link>
              <Link href="/earn" className="btn btn-ghost">
                See your earnings
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <HGutter />

      <footer
        style={{
          ...FRAME,
          paddingTop: "2.3rem",
          paddingBottom: "2.3rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Logo size={17} />
        <span style={{ color: "var(--color-text-faint)", fontSize: "0.82rem" }}>
          Pay-per-attention, settled on Creditcoin
        </span>
      </footer>
    </main>
  );
}

/**
 * The dashed rails marking the page's outer margin. They span the whole document
 * rather than each section, so the line reads as one continuous edge, and they
 * sit well outside the text column so nothing crowds them.
 */
function Rails() {
  return (
    <div className="page-rails" aria-hidden>
      <VGutter style={{ left: "max(0.9rem, calc(50% - 650px))" }} />
      <VGutter style={{ right: "max(0.9rem, calc(50% - 650px))" }} />
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
      style={{ padding: "1.1rem 1.25rem", textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="dot" style={{ background: accent }} />
        <span className="chain-tag" style={{ color: "var(--color-text-dim)" }}>
          {chain}
        </span>
      </div>
      <div className="mono" style={{ fontSize: "0.88rem", marginBottom: 8 }}>
        {event}
      </div>
      <div className="mono" style={{ fontSize: "0.7rem", color: "var(--color-text-faint)", wordBreak: "break-all" }}>
        {hash}
      </div>
    </a>
  );
}
