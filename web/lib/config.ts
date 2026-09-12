// Public configuration for the Keryx Creditcoin deployment.
export const config = {
  network: process.env.NEXT_PUBLIC_KERYX_NETWORK ?? "anvil",
  serverBase: (process.env.NEXT_PUBLIC_SERVER_BASE ?? "http://localhost:4021").replace(/\/+$/, ""),
  creditcoinRpcUrl: process.env.NEXT_PUBLIC_CREDITCOIN_RPC_URL ?? "https://rpc.cc3-testnet.creditcoin.network",
  creditcoinChainId: Number(process.env.NEXT_PUBLIC_CREDITCOIN_CHAIN_ID ?? 102031),
} as const;
