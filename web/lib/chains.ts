import { defineChain } from "viem";

const ANVIL_RPC = process.env.NEXT_PUBLIC_ANVIL_RPC ?? "http://127.0.0.1:8546";
const ANVIL_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ANVIL_CHAIN_ID ?? 31338);

export const anvil = defineChain({
  id: ANVIL_CHAIN_ID,
  name: "Keryx Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ANVIL_RPC] } },
});

export const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "CTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
  blockExplorers: {
    default: { name: "Creditcoin Explorer", url: "https://creditcoin-testnet.blockscout.com" },
  },
});

export const activeChain =
  (process.env.NEXT_PUBLIC_KERYX_NETWORK ?? "anvil") === "creditcoin" ? creditcoinTestnet : anvil;
