"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, mock } from "wagmi/connectors";
import { shortAddr } from "@/lib/format";
import { DEV_ACCOUNT } from "@/lib/wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    return (
      <div style={{ position: "relative" }}>
        <button className="btn btn-primary" disabled={isPending} onClick={() => setOpen((value) => !value)}>
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {open && (
          <div className="card" style={{ position: "absolute", right: 0, top: "2.4rem", padding: "0.4rem", zIndex: 40, minWidth: 220 }}>
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { connect({ connector: mock({ accounts: [DEV_ACCOUNT], features: { reconnect: true } }) }); setOpen(false); }}>
              Continue with local wallet
            </button>
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => { connect({ connector: injected() }); setOpen(false); }}>
              Use browser wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span className="pill mono"><span className="dot" style={{ background: "var(--color-earn)" }} />{shortAddr(address)}</span>
      <button className="btn btn-ghost" onClick={() => disconnect()}>Disconnect</button>
    </div>
  );
}
