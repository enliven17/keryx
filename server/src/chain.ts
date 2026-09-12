import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbiItem,
  type Account,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config, deployment } from "./config.js";
import {
  AuctionHouseAbi,
  AttestcoinSettlementAbi,
  CampaignEscrowAbi,
  MockUSDCAbi,
  SourceEngagementAbi,
} from "./abis.js";

const targetNative = deployment.chainId === 102030 || deployment.chainId === 102031
  ? { name: "Creditcoin", symbol: "CTC", decimals: 18 }
  : { name: "Ether", symbol: "ETH", decimals: 18 };

export const settlementChain = defineChain({
  id: deployment.chainId,
  name: deployment.chainId === 102031 ? "Creditcoin Testnet" : `Keryx ${config.network}`,
  nativeCurrency: targetNative,
  rpcUrls: { default: { http: [deployment.rpcUrl] } },
});

export const publicClient: PublicClient = createPublicClient({
  chain: settlementChain,
  transport: http(deployment.rpcUrl),
});

const sourceChainId = config.sourceChainId;
export const sourceChain = defineChain({
  id: sourceChainId,
  name: sourceChainId === 11155111 ? "Ethereum Sepolia" : "Keryx Source Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [config.sourceRpcUrl] } },
});

export const sourcePublicClient: PublicClient = createPublicClient({
  chain: sourceChain,
  transport: http(config.sourceRpcUrl),
});

let targetAccount: Account | undefined;
if (deployment.deployerPrivateKey) targetAccount = privateKeyToAccount(deployment.deployerPrivateKey);

export const targetWallet: WalletClient | undefined = targetAccount
  ? createWalletClient({ account: targetAccount, chain: settlementChain, transport: http(deployment.rpcUrl) })
  : undefined;

let sourceAccount: Account | undefined;
if (deployment.sourcePrivateKey) sourceAccount = privateKeyToAccount(deployment.sourcePrivateKey);

export const sourceWallet: WalletClient | undefined = sourceAccount
  ? createWalletClient({ account: sourceAccount, chain: sourceChain, transport: http(config.sourceRpcUrl) })
  : undefined;

export const addresses = {
  usdc: deployment.usdc,
  sourceEngagement: deployment.sourceEngagement,
  campaignEscrow: deployment.campaignEscrow,
  auctionHouse: deployment.auctionHouse,
  attestcoinSettlement: deployment.attestcoinSettlement,
  treasury: deployment.treasury,
} as const;

export const engagementRecordedEvent = parseAbiItem(
  "event EngagementRecorded(bytes32 indexed receiptId,uint256 indexed campaignId,address indexed earner,uint256 impressions,uint256 clicks)",
);

export interface CampaignView {
  advertiser: Address;
  balance: bigint;
  pricePerBlock: bigint;
  creativeHash: `0x${string}`;
  active: boolean;
}

export async function readCampaign(campaignId: bigint): Promise<CampaignView> {
  const r = (await publicClient.readContract({
    address: addresses.campaignEscrow,
    abi: CampaignEscrowAbi,
    functionName: "campaigns",
    args: [campaignId],
  })) as [Address, bigint, bigint, `0x${string}`, boolean];
  return { advertiser: r[0], balance: r[1], pricePerBlock: r[2], creativeHash: r[3], active: r[4] };
}

export async function readWinner(): Promise<{ campaignId: bigint; price: bigint }> {
  const [campaignId, price] = (await publicClient.readContract({
    address: addresses.auctionHouse,
    abi: AuctionHouseAbi,
    functionName: "winner",
  })) as [bigint, bigint];
  return { campaignId, price };
}

export async function readAccrued(account: Address): Promise<bigint> {
  return (await publicClient.readContract({
    address: addresses.campaignEscrow,
    abi: CampaignEscrowAbi,
    functionName: "accrued",
    args: [account],
  })) as bigint;
}

export async function readAuctionBoard() {
  const [ids, advertisers, prices, balances, actives] = (await publicClient.readContract({
    address: addresses.auctionHouse,
    abi: AuctionHouseAbi,
    functionName: "board",
  })) as [bigint[], Address[], bigint[], bigint[], boolean[]];
  return ids.map((id, i) => ({
    campaignId: id.toString(),
    advertiser: advertisers[i],
    pricePerBlock: prices[i].toString(),
    balance: balances[i].toString(),
    active: actives[i],
  }));
}

export async function writeSourceEngagement(args: {
  receiptId: `0x${string}`;
  campaignId: bigint;
  earner: Address;
  impressions: bigint;
  clicks: bigint;
}): Promise<`0x${string}`> {
  if (!sourceWallet || !sourceAccount) throw new Error("SOURCE_ENGAGEMENT_PRIVATE_KEY is required");
  return sourceWallet.writeContract({
    account: sourceAccount,
    chain: sourceChain,
    address: addresses.sourceEngagement,
    abi: SourceEngagementAbi,
    functionName: "recordEngagement",
    args: [args.receiptId, args.campaignId, args.earner, args.impressions, args.clicks],
  });
}

export async function executeAttestcoin(args: {
  action: number;
  chainKey: bigint;
  blockHeight: bigint;
  txBytes: `0x${string}`;
  merkleRoot: `0x${string}`;
  siblings: Array<{ hash: `0x${string}`; isLeft: boolean }>;
  lowerEndpointDigest: `0x${string}`;
  continuityRoots: `0x${string}`[];
}): Promise<`0x${string}`> {
  if (!targetWallet || !targetAccount) throw new Error("DEPLOYER_PRIVATE_KEY is required for CTC execution");
  return targetWallet.writeContract({
    account: targetAccount,
    chain: settlementChain,
    address: addresses.attestcoinSettlement,
    abi: AttestcoinSettlementAbi,
    functionName: "execute",
    args: [
      args.action,
      args.chainKey,
      args.blockHeight,
      args.txBytes,
      args.merkleRoot,
      args.siblings,
      args.lowerEndpointDigest,
      args.continuityRoots,
    ],
  } as never);
}

export async function waitForTargetReceipt(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function waitForSourceReceipt(hash: `0x${string}`) {
  return sourcePublicClient.waitForTransactionReceipt({ hash });
}

export async function readNativeBalance(account: Address): Promise<bigint> {
  return publicClient.getBalance({ address: account });
}

export async function readUsdcBalance(account: Address): Promise<bigint> {
  return (await publicClient.readContract({
    address: addresses.usdc,
    abi: MockUSDCAbi,
    functionName: "balanceOf",
    args: [account],
  })) as bigint;
}

/** Send native currency for gas. Testnet faucet only; see the /faucet route. */
export async function sendNative(to: Address, value: bigint): Promise<`0x${string}`> {
  if (!targetWallet || !targetAccount) throw new Error("DEPLOYER_PRIVATE_KEY is required to fund");
  return targetWallet.sendTransaction({ account: targetAccount, chain: settlementChain, to, value });
}

/** Mint test USDC. Only the mock token exposes this, which is the point. */
export async function mintUsdc(to: Address, amount: bigint): Promise<`0x${string}`> {
  if (!targetWallet || !targetAccount) throw new Error("DEPLOYER_PRIVATE_KEY is required to mint");
  return targetWallet.writeContract({
    account: targetAccount,
    chain: settlementChain,
    address: addresses.usdc,
    abi: MockUSDCAbi,
    functionName: "mint",
    args: [to, amount],
  });
}
