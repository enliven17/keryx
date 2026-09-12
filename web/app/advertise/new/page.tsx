"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { keccak256, toBytes, parseUnits, createPublicClient, http, type Address } from "viem";
import { Nav } from "@/components/Nav";
import { Section, AdCreativeCard, ChainBadge } from "@/components/ui";
import { useDeployment } from "@/lib/hooks";
import { adServer } from "@/lib/server";
import { useToast } from "@/components/Toaster";
import { TxStepper, emptyStep, type TxStep } from "@/components/TxStepper";
import { CampaignEscrowAbi, AuctionHouseAbi, MockUSDCAbi } from "@/lib/abis";
import { wagmiConfig } from "@/lib/wagmi";
import { anvil, creditcoinTestnet } from "@/lib/chains";

function humanize(e: unknown): string {
  const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? String(e);
  if (/rejected|denied/i.test(msg)) return "You rejected the request in your wallet.";
  if (/insufficient funds|gas required|gas balance/i.test(msg))
    return "Not enough gas. Click “Get test USDC” (it tops up gas too), then retry.";
  return msg.split("\n")[0].slice(0, 160);
}

export default function NewCampaign() {
  const router = useRouter();
  const t = useToast();
  // useAccount().chainId is the wallet's REAL chain (useChainId() is only the config's).
  const { address, isConnected, chainId } = useAccount();
  const { deployment } = useDeployment();
  const { switchChainAsync } = useSwitchChain();
  const targetChainId = deployment?.chainId ?? 31338;
  const wrongNetwork = isConnected && !!chainId && chainId !== targetChainId;

  const [text, setText] = useState("Deploy this in 30s — vercel.com/new");
  const [url, setUrl] = useState("https://vercel.com/new");
  const [pricePerBlock, setPricePerBlock] = useState("0.60"); // USDC per 1000 impressions
  const [budget, setBudget] = useState("100"); // USDC
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<TxStep[] | null>(null); // non-null = stepper modal open
  const [flowDone, setFlowDone] = useState(false);
  const patch = (key: string, p: Partial<TxStep>) =>
    setSteps((s) => s?.map((x) => (x.key === key ? { ...x, ...p } : x)) ?? null);

  /** Mint test USDC + top up native gas. Returns ok. */
  async function fundWallet(): Promise<boolean> {
    if (!address) return false;
    const res = await fetch("/api/faucet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, amount: 1000 }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event("keryx:funded"));
      return true;
    }
    return false;
  }

  async function getFaucet() {
    if (!address) return;
    const id = t.push({ type: "loading", title: "Requesting test funds…" });
    const ok = await fundWallet();
    if (ok) t.update(id, { type: "success", title: "Funds arrived", desc: "+1,000 USDC and gas added to your wallet." });
    else t.update(id, { type: "error", title: "Faucet failed", desc: "Only available on the local dev chain." });
  }

  async function switchNetwork() {
    const id = t.push({ type: "loading", title: "Switching network…" });
    try {
      await switchChainAsync({ chainId: targetChainId });
      t.update(id, { type: "success", title: "On Keryx Local", desc: `Chain ${targetChainId}.` });
    } catch (e) {
      t.update(id, { type: "error", title: "Couldn't switch network", desc: humanize(e) });
    }
  }

  async function launch() {
    if (!isConnected || !address) {
      t.push({ type: "error", title: "Connect a wallet first", desc: "Top-right → or use “Continue with a dev wallet”." });
      return;
    }
    if (!deployment) {
      t.push({ type: "info", title: "Loading deployment…", desc: "Try again in a second." });
      return;
    }
    setBusy(true);
    setFlowDone(false);
    // The explicit checklist of what they're about to sign, and in what order.
    setSteps([
      emptyStep("approve", "Approve USDC", `Authorize the escrow to pull your ${budget} USDC budget.`),
      emptyStep("create", "Create campaign", "Register your ad on-chain (commits the creative)."),
      emptyStep("fund", `Fund ${budget} USDC`, "Deposit your budget into the campaign escrow."),
      emptyStep("bid", "Place opening bid", `Enter the auction at $${pricePerBlock} per 1,000 impressions.`),
      emptyStep("publish", "Publish creative", "Send your ad text to the Keryx ad-server.", true),
    ]);
    let activeKey = "approve";
    try {
      const chain = targetChainId === 102031 ? creditcoinTestnet : anvil;
      if (chainId !== targetChainId) {
        const sid = t.push({ type: "loading", title: `Switching to ${chain.name}…`, desc: "Approve the network switch." });
        await switchChainAsync({ chainId: targetChainId });
        t.update(sid, { type: "success", title: `On ${chain.name}` });
      }

      const walletClient = await getWalletClient(wagmiConfig, { chainId: targetChainId });
      if (!walletClient) throw new Error(`Wallet not available on ${chain.name}. Add the network or use a dev wallet.`);
      const pub = createPublicClient({ chain, transport: http(deployment.rpcUrl) });

      const escrow = deployment.campaignEscrow as Address;
      const auction = deployment.auctionHouse as Address;
      const usdc = deployment.usdc as Address;
      const budgetU = parseUnits(budget, 6);
      const priceU = parseUnits(pricePerBlock, 6);
      const creativeHash = keccak256(toBytes(`${text}\n${url}`));
      const wait = (hash: `0x${string}`) => pub.waitForTransactionReceipt({ hash });
      // Creditcoin's hashio relay intermittently 400s on eth_estimateGas for contract
      // calls — pin an explicit gas limit there so each tx submits cleanly. Keep it
      // modest: the wallet reserves limit×price, so an over-high limit shows a scary
      // (but unspent) fee. The normal wallet estimate is used for Creditcoin and local EVM.
      const write = (args: Parameters<typeof walletClient.writeContract>[0]) =>
        walletClient.writeContract({ ...args, account: walletClient.account, chain } as never);

      // ensure USDC + gas (silent unless empty)
      const bal = (await pub.readContract({ address: usdc, abi: MockUSDCAbi, functionName: "balanceOf", args: [address] })) as bigint;
      if (bal < budgetU) {
        const fid = t.push({ type: "loading", title: "Funding your wallet…", desc: "Test USDC + gas." });
        await fundWallet();
        await new Promise((r) => setTimeout(r, 600));
        t.update(fid, { type: "success", title: "Wallet funded", desc: "USDC + gas added." });
      }

      // One on-chain step: prompt → sign → confirm, with the checklist tracking it.
      const onchain = async (key: string, fn: () => Promise<`0x${string}`>) => {
        activeKey = key;
        patch(key, { state: "active" });
        const hash = await fn();
        patch(key, { state: "confirming", txHash: hash });
        await wait(hash);
        patch(key, { state: "done", txHash: hash });
      };

      await onchain("approve", () => write({ address: usdc, abi: MockUSDCAbi, functionName: "approve", args: [escrow, budgetU] }));

      const nextId = (await pub.readContract({ address: escrow, abi: CampaignEscrowAbi, functionName: "nextCampaignId" })) as bigint;
      const campaignId = nextId;
      await onchain("create", () => write({ address: escrow, abi: CampaignEscrowAbi, functionName: "createCampaign", args: [creativeHash] }));
      await onchain("fund", () => write({ address: escrow, abi: CampaignEscrowAbi, functionName: "fund", args: [campaignId, budgetU] }));
      await onchain("bid", () => write({ address: auction, abi: AuctionHouseAbi, functionName: "placeBid", args: [campaignId, priceU] }));

      activeKey = "publish";
      patch("publish", { state: "active" });
      await adServer.registerCreative({ campaignId: campaignId.toString(), advertiser: address, text, clickUrl: url });
      patch("publish", { state: "done" });

      setFlowDone(true);
      t.push({ type: "success", title: `Campaign #${campaignId} is live`, desc: "You're in the auction." });
    } catch (e) {
      patch(activeKey, { state: "error", error: humanize(e) });
    } finally {
      setBusy(false);
    }
  }

  function closeStepper() {
    const done = flowDone;
    setSteps(null);
    setFlowDone(false);
    if (done) router.push("/advertise");
  }

  const perImpr = (parseFloat(pricePerBlock || "0") / 1000).toFixed(4);
  const clickCost = (parseFloat(pricePerBlock || "0") / 1000) * 50;

  return (
    <>
      <Nav />
      {steps && (
        <TxStepper
          title="Launch campaign"
          steps={steps}
          done={flowDone}
          creditcoinExplorer={targetChainId === 102031}
          onClose={closeStepper}
        />
      )}
      <Section style={{ paddingTop: "2rem", paddingBottom: "3rem", maxWidth: 760 }}>
        <h1 style={{ margin: 0 }}>Create campaign</h1>
        <p style={{ color: "var(--color-text-dim)" }}>Bid in the on-chain auction; fund in USDC on Creditcoin. Clicks bill at 50× an impression.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "1.5rem" }}>
          {/* form */}
          <div>
            <label className="label">Ad text (max 120)</label>
            <input className="input" maxLength={120} value={text} onChange={(e) => setText(e.target.value)} />
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", margin: "0.25rem 0 1rem" }}>{text.length}/120</div>

            <label className="label">Destination URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} style={{ marginBottom: "1rem" }} />

            <label className="label">Bid — price per block (1 block = 1,000 impressions), USDC</label>
            <input className="input mono" value={pricePerBlock} onChange={(e) => setPricePerBlock(e.target.value)} style={{ marginBottom: "0.25rem" }} />
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", marginBottom: "1rem" }}>
              ≈ ${perImpr} / impression · ${clickCost.toFixed(4)} / click (50×)
            </div>

            <label className="label">Total budget, USDC</label>
            <input className="input mono" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ marginBottom: "1rem" }} />

            {wrongNetwork && (
              <div className="card" style={{ padding: "0.7rem 0.85rem", marginBottom: "0.75rem", borderColor: "var(--color-warn)", background: "rgba(148,104,0,0.06)" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--color-warn)", fontWeight: 600 }}>Your wallet is on the wrong network.</div>
                <div style={{ fontSize: "0.76rem", color: "var(--color-text-dim)", margin: "0.2rem 0 0.5rem" }}>
                  Keryx settles on chain {targetChainId}. Switch to continue (or use a dev wallet).
                </div>
                <button className="btn btn-ghost" onClick={switchNetwork}>Switch network</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={getFaucet} disabled={busy || !isConnected}>Get test USDC</button>
              <button className="btn btn-primary" onClick={launch} disabled={busy || !isConnected || !deployment}>
                {busy ? "Launching…" : "Fund & enter auction"}
              </button>
            </div>
            {!isConnected && <p style={{ color: "var(--color-warn)", fontSize: "0.82rem", marginTop: "0.75rem" }}>Connect a wallet to launch.</p>}
          </div>

          {/* preview */}
          <div>
            <label className="label">Live preview — Claude Code spinner</label>
            <AdCreativeCard text={text} url={url.replace(/^https?:\/\//, "")} earning="+$0.0006" />
            <div style={{ marginTop: "0.75rem", display: "flex", gap: 8, alignItems: "center" }}>
              <ChainBadge /> <span style={{ fontSize: "0.8rem", color: "var(--color-text-dim)" }}>settles on Creditcoin</span>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
