import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Deployment {
  chainId: number;
  rpcUrl: string;
  usdc: `0x${string}`;
  sourceEngagement: `0x${string}`;
  campaignEscrow: `0x${string}`;
  auctionHouse: `0x${string}`;
  attestcoinSettlement: `0x${string}`;
  treasury: `0x${string}`;
}

const ADDRESS_ENV = {
  usdc: "USDC_ADDRESS",
  sourceEngagement: "SOURCE_ENGAGEMENT",
  campaignEscrow: "CAMPAIGN_ESCROW",
  auctionHouse: "AUCTION_HOUSE",
  attestcoinSettlement: "ATTESTCOIN_SETTLEMENT",
  treasury: "TREASURY",
} as const;

/**
 * Addresses come from contracts/deployments/<network>.json when the repo is
 * checked out, and from the environment otherwise. A hosted build has no such
 * file — it holds deployer keys, so it is deliberately never committed.
 */
export function loadDeployment(): Deployment | null {
  const network = process.env.NEXT_PUBLIC_KERYX_NETWORK ?? "anvil";
  const file = join(process.cwd(), "..", "contracts", "deployments", `${network}.json`);

  let fromFile: Partial<Deployment> = {};
  if (existsSync(file)) {
    try {
      fromFile = JSON.parse(readFileSync(file, "utf8")) as Partial<Deployment>;
    } catch {
      fromFile = {};
    }
  }

  const env = process.env;
  const chainId = Number(env.CHAIN_ID ?? env.NEXT_PUBLIC_CREDITCOIN_CHAIN_ID ?? fromFile.chainId ?? 0);
  const rpcUrl = env.CREDITCOIN_RPC_URL ?? env.NEXT_PUBLIC_CREDITCOIN_RPC_URL ?? fromFile.rpcUrl ?? "";
  if (!chainId || !rpcUrl) return null;

  const out = { chainId, rpcUrl } as Deployment;
  for (const [key, name] of Object.entries(ADDRESS_ENV) as [keyof typeof ADDRESS_ENV, string][]) {
    const value = (env[name] ?? fromFile[key]) as `0x${string}` | undefined;
    if (!value) return null;
    out[key] = value;
  }
  return out;
}
