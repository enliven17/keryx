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

export function loadDeployment(): Deployment | null {
  const network = process.env.NEXT_PUBLIC_KERYX_NETWORK ?? "anvil";
  const file = join(process.cwd(), "..", "contracts", "deployments", `${network}.json`);
  if (!existsSync(file)) return null;
  try {
    const d = JSON.parse(readFileSync(file, "utf8")) as Deployment;
    return {
      chainId: d.chainId,
      rpcUrl: d.rpcUrl,
      usdc: d.usdc,
      sourceEngagement: d.sourceEngagement,
      campaignEscrow: d.campaignEscrow,
      auctionHouse: d.auctionHouse,
      attestcoinSettlement: d.attestcoinSettlement,
      treasury: d.treasury,
    };
  } catch {
    return null;
  }
}
