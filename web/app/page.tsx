import Link from "next/link";
import { Logo, Section } from "@/components/ui";
import { ClaudeTui } from "@/components/ClaudeTui";

export default function Landing() {
  return (
    <main style={{ overflowX: "hidden" }}>
      <nav style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(251,251,252,0.88)", position: "sticky", top: 0, zIndex: 30 }}>
        <Section style={{ paddingTop: "0.85rem", paddingBottom: "0.85rem", display: "flex", alignItems: "center" }}>
          <Logo size={22} />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            <Link href="/onboarding" className="nav-link">For earners</Link>
            <Link href="/advertise" className="nav-link">For advertisers</Link>
            <Link href="/onboarding" className="btn btn-primary">Start earning</Link>
          </div>
        </Section>
      </nav>

      <Section style={{ paddingTop: "4.5rem", paddingBottom: "4rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: "3.5rem", alignItems: "center" }}>
          <div>
            <span className="pill" style={{ color: "var(--color-brand)", background: "rgba(91,99,211,0.08)", borderColor: "rgba(91,99,211,0.2)", fontWeight: 600 }}>Creditcoin × Attestcoin</span>
            <h1 style={{ fontSize: "4.2rem", lineHeight: 0.98, letterSpacing: "-0.03em", margin: "1.4rem 0 0", fontWeight: 800 }}>Get paid<br />to wait.</h1>
            <p style={{ fontSize: "1.18rem", lineHeight: 1.5, color: "var(--color-text-dim)", marginTop: "1.4rem", maxWidth: 460 }}>
              Keryx turns AI coding wait time into a transparent ad marketplace. Users earn USDC, while source-chain engagement is verified before CTC settlement.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.9rem" }}>
              <Link href="/onboarding" className="btn btn-primary">Start earning</Link>
              <Link href="/advertise/new" className="btn btn-ghost">Advertise on Keryx →</Link>
            </div>
          </div>
          <ClaudeTui />
        </div>
      </Section>

      <Section style={{ paddingBottom: "3.5rem" }}>
        <div style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", padding: "1.4rem 0", display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", justifyContent: "center", color: "var(--color-text-dim)" }}>
          <Stat strong="5-second" rest="attention units" /><Sep /><Stat strong="50%" rest="earner share" /><Sep /><Stat strong="CTC" rest="settlement" /><Sep /><Stat strong="Neon" rest="event index" />
        </div>
      </Section>

      <Section style={{ paddingBottom: "3.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.2rem", letterSpacing: "-0.02em" }}>Replace the spinner. Split the revenue.</h2>
        <p style={{ fontSize: "1.05rem", color: "var(--color-text-dim)", maxWidth: 720, margin: "1rem auto 0", lineHeight: 1.6 }}>
          Advertisers escrow campaign funds and bid for placement. A viewable impression creates an earning record in Neon, then a source-chain event. Attestcoin proves that event for the CTC settlement contract.
        </p>
      </Section>

      <Section style={{ paddingBottom: "3.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
          {["Advertiser funds escrow", "Auction selects placement", "Source event records delivery", "Attestcoin settles on CTC"].map((step, i) => (
            <div key={step} className="card" style={{ padding: "1.1rem" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--color-brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", marginBottom: 10 }}>{i + 1}</div>
              <div style={{ fontSize: "0.88rem" }}>{step}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section style={{ paddingBottom: "3.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <Value title="Get paid to prompt" body="Half of the charged campaign amount becomes claimable by the earner. Claims go directly to the connected wallet." color="var(--color-earn)" />
          <Value title="Verifiable delivery" body="Accepted events are anchored on a source chain and proven through Attestcoin before the CTC contract charges escrow." color="var(--color-brand)" />
          <Value title="Neon-backed history" body="Neon PostgreSQL keeps campaign creatives, caps, source receipts, and settlement status available to the dashboard." color="var(--color-spend)" />
        </div>
      </Section>

      <Section style={{ paddingBottom: "3.5rem" }}>
        <div className="card" style={{ padding: "2.5rem", textAlign: "center", background: "var(--color-text)", border: "none" }}>
          <h2 style={{ color: "#fff", margin: "0 0 0.75rem" }}>Reach people when they are already paying attention.</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: 620, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>Fund a campaign in USDC, bid for the spinner slot, and pay for recorded delivery with a verifiable CTC settlement trail.</p>
          <Link href="/advertise/new" className="btn btn-primary">Create a campaign →</Link>
        </div>
      </Section>

      <Section style={{ paddingBottom: "3rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center", marginBottom: "1.5rem" }}>
          {["Creditcoin settlement", "Attestcoin proofs", "Neon PostgreSQL", "Non-custodial claims"].map((label) => <span key={label} className="pill" style={{ fontSize: "0.8rem" }}><span className="dot" style={{ background: "var(--color-brand)" }} />{label}</span>)}
        </div>
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}><Logo size={18} /><span style={{ color: "var(--color-text-faint)", fontSize: "0.82rem" }}>Keryx · BUIDL CTC 2026 Fall</span></div>
      </Section>
    </main>
  );
}

function Stat({ strong, rest }: { strong: string; rest: string }) { return <span><strong className="mono" style={{ color: "var(--color-text)" }}>{strong}</strong> {rest}</span>; }
function Sep() { return <span style={{ color: "var(--color-text-faint)" }}>·</span>; }
function Value({ title, body, color }: { title: string; body: string; color: string }) { return <div className="card" style={{ padding: "1.5rem" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginBottom: 14 }} /><h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>{title}</h3><p style={{ margin: 0, color: "var(--color-text-dim)", fontSize: "0.95rem", lineHeight: 1.55 }}>{body}</p></div>; }
