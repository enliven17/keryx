import type { PrivyClientConfig } from "@privy-io/react-auth";
import { activeChain, anvil, creditcoinTestnet } from "./chains";

/** Empty when the app is built without Privy credentials; the wallet UI then falls
 *  back to wagmi's injected/mock connectors so the local anvil demo still works. */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
export const privyEnabled = PRIVY_APP_ID.length > 0;

// Creditcoin is a plain EVM chain, so Privy takes it as a custom chain definition.
// Embedded wallets sign locally and wagmi submits through the chain's own RPC.
export const privyConfig: PrivyClientConfig = {
  supportedChains: [creditcoinTestnet, anvil],
  defaultChain: activeChain,
  loginMethods: ["wallet", "email"],
  embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" }, showWalletUIs: true },
  appearance: {
    showWalletLoginFirst: true,
    walletChainType: "ethereum-only",
    logo: "/icon.svg",
  },
};
