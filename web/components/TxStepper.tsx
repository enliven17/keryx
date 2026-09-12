"use client";

export type StepState = "idle" | "active" | "confirming" | "done" | "error";
export interface TxStep {
  key: string;
  title: string;
  desc: string;
  state: StepState;
  txHash?: string;
  error?: string;
  /** true for off-chain steps (no wallet signature). */
  offchain?: boolean;
}

/** A focused modal that shows a multi-signature flow as an explicit checklist:
 *  what each signature is for, which one you're on, and what's next — so signing
 *  4 txs in a row never feels random. */
export function TxStepper({
  title,
  steps,
  onClose,
  done,
  creditcoinExplorer,
}: {
  title: string;
  steps: TxStep[];
  onClose: () => void;
  done: boolean;
  creditcoinExplorer?: boolean;
}) {
  const hasError = steps.some((s) => s.state === "error");
  const allDone = steps.every((s) => s.state === "done");
  const idx = steps.findIndex((s) => s.state === "active" || s.state === "confirming");
  const current = idx >= 0 ? idx + 1 : allDone ? steps.length : 0;
  const activeStep = idx >= 0 ? steps[idx] : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,17,27,0.35)",
        display: "flex",
        // Top-dock (not centered) so the wallet's own centered confirm modal
        // doesn't cover the checklist — you can always see which step you're on.
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 100, // below the wallet modal: it stays interactive on top
        padding: "1rem",
        paddingTop: "4vh",
      }}
      onClick={done || hasError ? onClose : undefined}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 440, padding: "1.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{title}</h3>
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-faint)" }}>
            {allDone ? "complete" : `${Math.max(current, 1)} of ${steps.length}`}
          </span>
        </div>
        {activeStep ? (
          <p style={{ fontSize: "0.82rem", margin: "0 0 1.1rem" }}>
            <span style={{ color: "var(--color-brand)", fontWeight: 700 }}>
              Step {current} of {steps.length} — {activeStep.title}
            </span>
            <span style={{ color: "var(--color-text-dim)" }}>
              {" · "}
              {activeStep.state === "confirming"
                ? "confirming on-chain…"
                : activeStep.offchain
                  ? "working…"
                  : "confirm it in your wallet"}
            </span>
          </p>
        ) : (
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-dim)", margin: "0 0 1.1rem" }}>
            {allDone
              ? "All set — your campaign is live."
              : hasError
                ? "Something stopped the flow. You can close and retry."
                : "Approve each step in your wallet. Here's exactly what you're signing and what's next."}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {steps.map((s, i) => (
            <Row key={s.key} step={s} index={i} last={i === steps.length - 1} creditcoinExplorer={creditcoinExplorer} />
          ))}
        </div>

        {(done || hasError) && (
          <button className={`btn ${allDone ? "btn-earn" : "btn-ghost"}`} style={{ width: "100%", marginTop: "1.25rem" }} onClick={onClose}>
            {allDone ? "View campaign →" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ step, index, last, creditcoinExplorer }: { step: TxStep; index: number; last: boolean; creditcoinExplorer?: boolean }) {
  const active = step.state === "active" || step.state === "confirming";
  const link = step.txHash && creditcoinExplorer ? `https://creditcoin-testnet.blockscout.com/tx/${step.txHash}` : null;
  return (
    <div style={{ display: "flex", gap: 12, opacity: step.state === "idle" ? 0.5 : 1 }}>
      {/* rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Marker state={step.state} index={index} />
        {!last && <div style={{ width: 2, flex: 1, minHeight: 18, background: "var(--color-border)" }} />}
      </div>
      {/* body */}
      <div style={{ paddingBottom: last ? 0 : 14, flex: 1 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: active ? 700 : 600, color: step.state === "error" ? "var(--color-danger)" : "var(--color-text)" }}>
          {step.title}
          {step.offchain && <span style={{ fontSize: "0.68rem", color: "var(--color-text-faint)", fontWeight: 500 }}> · off-chain</span>}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)" }}>{step.desc}</div>
        {step.state === "active" && (
          <div style={{ fontSize: "0.74rem", color: "var(--color-brand)", marginTop: 2, fontWeight: 600 }}>
            {step.offchain ? "Working…" : "→ Confirm in your wallet"}
          </div>
        )}
        {step.state === "confirming" && (
          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", marginTop: 2 }}>
            confirming… {step.txHash?.slice(0, 10)}…{link && <a href={link} target="_blank" rel="noreferrer" style={{ color: "var(--color-brand)" }}> view</a>}
          </div>
        )}
        {step.state === "done" && step.txHash && (
          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", marginTop: 2 }}>
            confirmed {step.txHash.slice(0, 10)}…{link && <a href={link} target="_blank" rel="noreferrer" style={{ color: "var(--color-brand)" }}> view</a>}
          </div>
        )}
        {step.state === "error" && step.error && (
          <div style={{ fontSize: "0.74rem", color: "var(--color-danger)", marginTop: 2 }}>{step.error}</div>
        )}
      </div>
    </div>
  );
}

function Marker({ state, index }: { state: StepState; index: number }) {
  const base: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.72rem",
    fontWeight: 700,
    flexShrink: 0,
  };
  if (state === "done")
    return <div style={{ ...base, background: "var(--color-earn)", color: "#04211a" }}>✓</div>;
  if (state === "error")
    return <div style={{ ...base, background: "var(--color-danger)", color: "#2a0a0a" }}>✕</div>;
  if (state === "active" || state === "confirming")
    return (
      <div style={{ ...base, border: "2px solid var(--color-brand)" }}>
        <span style={{ width: 11, height: 11, border: "2px solid var(--color-border-strong)", borderTopColor: "var(--color-brand)", borderRadius: "50%", animation: "keryx-spin 0.7s linear infinite" }} />
      </div>
    );
  return <div style={{ ...base, border: "2px solid var(--color-border-strong)", color: "var(--color-text-faint)" }}>{index + 1}</div>;
}

export function emptyStep(key: string, title: string, desc: string, offchain = false): TxStep {
  return { key, title, desc, state: "idle", offchain };
}
