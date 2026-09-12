import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createPublicClient, createWalletClient, defineChain, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const network = process.argv[2] ?? "anvil";
const dep = JSON.parse(readFileSync(join(root, "contracts", "deployments", `${network}.json`), "utf8"));
if (!dep.deployerPrivateKey) throw new Error("deployment is missing deployerPrivateKey");

const chain = defineChain({
  id: dep.chainId,
  name: dep.chainId === 102031 ? "Creditcoin Testnet" : "Keryx Local",
  nativeCurrency: { name: dep.chainId === 102031 ? "Creditcoin" : "Ether", symbol: dep.chainId === 102031 ? "CTC" : "ETH", decimals: 18 },
  rpcUrls: { default: { http: [dep.rpcUrl] } },
});
const transport = http(dep.rpcUrl);
const publicClient = createPublicClient({ chain, transport });
const account = privateKeyToAccount(dep.deployerPrivateKey);
const wallet = createWalletClient({ account, chain, transport });
const artifact = (name) => JSON.parse(readFileSync(join(root, "contracts", "out", `${name}.sol`, `${name}.json`), "utf8"));
const wait = (hash) => publicClient.waitForTransactionReceipt({ hash });
const escrowAbi = artifact("CampaignEscrow").abi;
const auctionAbi = artifact("AuctionHouse").abi;
const tokenAbi = artifact("MockUSDC").abi;
const text = "Build with Creditcoin and Attestcoin";
const clickUrl = "https://creditcoin.org";
const hash = keccak256(toBytes(`${text}\n${clickUrl}`));

console.log(`seeding campaign on ${network} as ${account.address}`);
if (dep.chainId === 31338) {
  const balance = await publicClient.readContract({ address: dep.usdc, abi: tokenAbi, functionName: "balanceOf", args: [account.address] });
  if (balance < 100_000000n) await wait(await wallet.writeContract({ address: dep.usdc, abi: tokenAbi, functionName: "mint", args: [account.address, 1000_000000n], account, chain }));
}
const campaignTx = await wallet.writeContract({ address: dep.campaignEscrow, abi: escrowAbi, functionName: "createCampaign", args: [hash], account, chain });
await wait(campaignTx);
const campaignId = (await publicClient.readContract({ address: dep.campaignEscrow, abi: escrowAbi, functionName: "nextCampaignId" })) - 1n;
await wait(await wallet.writeContract({ address: dep.usdc, abi: tokenAbi, functionName: "approve", args: [dep.campaignEscrow, 100_000000n], account, chain }));
await wait(await wallet.writeContract({ address: dep.campaignEscrow, abi: escrowAbi, functionName: "fund", args: [campaignId, 100_000000n], account, chain }));
await wait(await wallet.writeContract({ address: dep.auctionHouse, abi: auctionAbi, functionName: "placeBid", args: [campaignId, 600000n], account, chain }));

const dataDir = join(root, "server", "data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, `${network}-campaign.json`), JSON.stringify({ network, campaignId: campaignId.toString(), advertiser: account.address, creative: { text, clickUrl, creativeHash: hash } }, null, 2));
console.log(`campaign #${campaignId} funded and added to the auction`);
