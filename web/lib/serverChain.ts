import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil, creditcoinTestnet } from "./chains";

interface FullDeployment {
  chainId: number;
  rpcUrl: string;
  usdc: Address;
  sourceEngagement: Address;
  campaignEscrow: Address;
  auctionHouse: Address;
  attestcoinSettlement: Address;
  treasury: Address;
  deployerPrivateKey?: `0x${string}`;
}

export function fullDeployment(): FullDeployment | null {
  const network = process.env.NEXT_PUBLIC_KERYX_NETWORK ?? "anvil";
  const file = join(process.cwd(), "..", "contracts", "deployments", `${network}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")) as FullDeployment; } catch { return null; }
}

export function serverChain() {
  const d = fullDeployment();
  if (!d) throw new Error("no deployment");
  const chain = d.chainId === 102031 ? creditcoinTestnet : anvil;
  const transport = http(d.rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const account = d.deployerPrivateKey ? privateKeyToAccount(d.deployerPrivateKey) : null;
  const walletClient = account ? createWalletClient({ account, chain, transport }) : null;
  return { d, chain, publicClient, walletClient, account };
}

export function devWritesAvailable(): boolean { return !!fullDeployment()?.deployerPrivateKey; }
