import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
export const NETWORK = process.env.KERYX_NETWORK ?? "anvil";

export interface Deployment {
  chainId: number;
  rpcUrl: string;
  usdc: `0x${string}`;
  sourceEngagement: `0x${string}`;
  campaignEscrow: `0x${string}`;
  auctionHouse: `0x${string}`;
  attestcoinSettlement: `0x${string}`;
  treasury: `0x${string}`;
  deployerPrivateKey?: `0x${string}`;
  sourcePrivateKey?: `0x${string}`;
}

function loadDeployment(): Deployment {
  const file = join(repoRoot, "contracts", "deployments", `${NETWORK}.json`);
  const base: Partial<Deployment> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const env = process.env;
  const deployment = {
    chainId: Number(env.CHAIN_ID ?? base.chainId ?? 31338),
    rpcUrl: env.CREDITCOIN_RPC_URL ?? env.RPC_URL ?? base.rpcUrl ?? "http://127.0.0.1:8546",
    usdc: (env.USDC_ADDRESS ?? base.usdc) as `0x${string}`,
    sourceEngagement: (env.SOURCE_ENGAGEMENT ?? base.sourceEngagement) as `0x${string}`,
    campaignEscrow: (env.CAMPAIGN_ESCROW ?? base.campaignEscrow) as `0x${string}`,
    auctionHouse: (env.AUCTION_HOUSE ?? base.auctionHouse) as `0x${string}`,
    attestcoinSettlement: (env.ATTESTCOIN_SETTLEMENT ?? base.attestcoinSettlement) as `0x${string}`,
    treasury: (env.TREASURY ?? base.treasury) as `0x${string}`,
    deployerPrivateKey: (env.DEPLOYER_PRIVATE_KEY ?? base.deployerPrivateKey) as `0x${string}` | undefined,
    sourcePrivateKey: (env.SOURCE_ENGAGEMENT_PRIVATE_KEY ?? base.sourcePrivateKey) as `0x${string}` | undefined,
  } satisfies Deployment;
  for (const key of ["usdc", "sourceEngagement", "campaignEscrow", "auctionHouse", "attestcoinSettlement"] as const) {
    if (!deployment[key]) throw new Error(`Missing deployment address: ${key}`);
  }
  return deployment;
}

export const deployment = loadDeployment();

export const config = {
  port: Number(process.env.PORT ?? 4021),
  network: NETWORK,
  databaseUrl: process.env.DATABASE_URL ?? "",
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4021}`,
  sourceRpcUrl: process.env.SOURCE_CHAIN_RPC_URL ?? deployment.rpcUrl,
  sourceChainId: Number(process.env.SOURCE_CHAIN_ID ?? (NETWORK === "anvil" ? deployment.chainId : 11155111)),
  sourceChainKey: Number(process.env.SOURCE_CHAIN_KEY ?? 1),
  proofBuilderUrl: process.env.CREDITCOIN_PROOF_BUILDER_URL ?? "https://proof-gen-api.cc3-testnet.creditcoin.network",
  sourceStartBlock: BigInt(process.env.SOURCE_START_BLOCK ?? 0),
  sourcePollMs: Number(process.env.SOURCE_POLL_MS ?? 15_000),
  settle: {
    minImpressions: Number(process.env.SETTLE_MIN_IMPRESSIONS ?? 1),
    intervalMs: Number(process.env.SETTLE_INTERVAL_MS ?? 15_000),
  },
  viewThresholdMs: Number(process.env.VIEW_THRESHOLD_MS ?? 3_000),
  perEarnerDailyCap: Number(process.env.PER_EARNER_DAILY_CAP ?? 50_000),
} as const;
