import { NextResponse } from "next/server";
import { type Address } from "viem";
import { serverChain, devWritesAvailable } from "@/lib/serverChain";
import { MockUSDCAbi } from "@/lib/abis";

// Dev faucet: mint test USDC (MockUSDC) to an address so advertisers can fund
// campaigns on anvil. No-op on Creditcoin testnet, where funds come from the network faucet.
export async function POST(req: Request) {
  if (!devWritesAvailable()) {
    return NextResponse.json({ ok: false, error: "faucet only available on local dev" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const to = body?.address as Address | undefined;
  const amount = BigInt(body?.amount ?? 1000) * 1_000_000n; // default 1,000 USDC
  if (!to) return NextResponse.json({ error: "address required" }, { status: 400 });

  const { d, walletClient, publicClient, account } = serverChain();
  if (!walletClient || !account) return NextResponse.json({ error: "no signer" }, { status: 500 });

  const hash = await walletClient.writeContract({
    account,
    chain: walletClient.chain,
    address: d.usdc,
    abi: MockUSDCAbi,
    functionName: "mint",
    args: [to, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  // Also top up native gas so the wallet can actually send txs (the #1 "Gas
  // balance is not enough" gotcha for a freshly-connected wallet on anvil).
  let gasTx: `0x${string}` | undefined;
  try {
    const bal = await publicClient.getBalance({ address: to });
    if (bal < 200000000000000000n) {
      gasTx = await walletClient.sendTransaction({
        account,
        chain: walletClient.chain,
        to,
        value: 1000000000000000000n, // 1 native token for gas
      });
      await publicClient.waitForTransactionReceipt({ hash: gasTx });
    }
  } catch {
    /* gas top-up is best-effort */
  }

  return NextResponse.json({ ok: true, txHash: hash, minted: amount.toString(), gasTx, gasFunded: !!gasTx });
}
