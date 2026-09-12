"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract, useSwitchChain } from "wagmi";
import { useDeployment } from "@/lib/hooks";
import { MockUSDCAbi } from "@/lib/abis";
import { fmtUsdc } from "@/lib/format";
import type { Address } from "viem";

const chainName = (id?: number) => id === 102031 ? "Creditcoin" : id === 1 ? "Ethereum" : "Keryx Local";

export function BalancePill() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { deployment } = useDeployment();
  const expected = deployment?.chainId;
  const wrongNetwork = !!expected && !!chainId && chainId !== expected;
  const native = useBalance({ address });
  const usdc = useReadContract({
    address: deployment?.usdc as Address | undefined,
    abi: MockUSDCAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!deployment, refetchInterval: 4000 },
  });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const onFunded = () => { void usdc.refetch(); void native.refetch(); setFlash(true); setTimeout(() => setFlash(false), 2200); };
    window.addEventListener("keryx:funded", onFunded);
    return () => window.removeEventListener("keryx:funded", onFunded);
  }, [native.refetch, usdc.refetch]);

  if (!isConnected) return null;
  const usdcBal = (usdc.data as bigint | undefined) ?? 0n;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: flash ? "rgba(26,127,82,0.12)" : "transparent", borderRadius: 999, padding: "0 0.25rem" }}>
      {wrongNetwork ? (
        <button className="pill" onClick={() => expected && switchChain({ chainId: expected })} style={{ fontSize: "0.72rem", cursor: "pointer", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
          <span className="dot" style={{ background: "var(--color-danger)" }} />Switch to Creditcoin
        </button>
      ) : (
        <span className="pill" style={{ fontSize: "0.72rem" }}><span className="dot" style={{ background: "var(--color-brand)" }} />{chainName(chainId)}</span>
      )}
      <span className="pill mono" style={{ fontSize: "0.74rem" }}><span style={{ color: usdcBal > 0n ? "var(--color-earn)" : "var(--color-text-dim)" }}>{fmtUsdc(usdcBal)}</span><span style={{ color: "var(--color-text-faint)" }}>USDC</span></span>
    </div>
  );
}
