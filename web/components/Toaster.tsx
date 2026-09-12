"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { config } from "@/lib/config";

type ToastType = "loading" | "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  title: string;
  desc?: string;
  txHash?: string;
}
interface ToastApi {
  push: (t: Omit<Toast, "id">) => number;
  update: (id: number, patch: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);
export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used within <ToasterProvider>");
  return c;
}

let counter = 1;
const TTL: Record<ToastType, number> = { success: 4500, info: 4000, error: 9000, loading: 0 };

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const schedule = useCallback(
    (id: number, type: ToastType) => {
      if (TTL[type] > 0) setTimeout(() => dismiss(id), TTL[type]);
    },
    [dismiss],
  );
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = counter++;
      setToasts((prev) => [...prev, { ...t, id }]);
      schedule(id, t.type);
      return id;
    },
    [schedule],
  );
  const update = useCallback(
    (id: number, patch: Partial<Omit<Toast, "id">>) => {
      setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      if (patch.type) schedule(id, patch.type);
    },
    [schedule],
  );

  return (
    <Ctx.Provider value={{ push, update, dismiss }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 400 }}>
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

const ACCENT: Record<ToastType, string> = {
  loading: "var(--color-brand)",
  success: "var(--color-earn)",
  error: "var(--color-danger)",
  info: "var(--color-text-dim)",
};

function explorerUrl(txHash: string): string | null {
  if (config.network === "creditcoin") return `https://creditcoin-testnet.blockscout.com/tx/${txHash}`;
  return null; // anvil has no explorer
}

function ToastCard({ t, onClose }: { t: Toast; onClose: () => void }) {
  const accent = ACCENT[t.type];
  const link = t.txHash ? explorerUrl(t.txHash) : null;
  return (
    <div
      className="card"
      style={{
        display: "flex",
        gap: 12,
        padding: "0.85rem 1rem",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        borderLeft: `3px solid ${accent}`,
        animation: "keryx-toastin 0.25s ease",
        alignItems: "flex-start",
      }}
    >
      <div style={{ marginTop: 1 }}>
        {t.type === "loading" ? (
          <span
            style={{
              display: "inline-block",
              width: 15,
              height: 15,
              border: `2px solid var(--color-border-strong)`,
              borderTopColor: accent,
              borderRadius: "50%",
              animation: "keryx-spin 0.7s linear infinite",
            }}
          />
        ) : (
          <span style={{ color: accent, fontWeight: 800, fontSize: 15 }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "•"}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{t.title}</div>
        {t.desc && (
          <div style={{ fontSize: "0.76rem", color: "var(--color-text-dim)", marginTop: 2, wordBreak: "break-word" }}>{t.desc}</div>
        )}
        {t.txHash && (
          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", marginTop: 3 }}>
            tx {t.txHash.slice(0, 10)}…{t.txHash.slice(-6)}
            {link && (
              <>
                {" · "}
                <a href={link} target="_blank" rel="noreferrer" style={{ color: "var(--color-brand)" }}>
                  view
                </a>
              </>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", fontSize: 16, lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </div>
  );
}
