import { createConfig as createWagmiConfig, http } from "wagmi";
import { createConfig as createPrivyWagmiConfig } from "@privy-io/wagmi";
import { injected, mock } from "wagmi/connectors";
import { anvil, creditcoinTestnet } from "./chains";
import { privyEnabled } from "./privy";

export const DEV_ACCOUNT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;

const chains = [anvil, creditcoinTestnet] as const;
const transports = {
  [anvil.id]: http(),
  [creditcoinTestnet.id]: http(),
};

/** Privy owns the connector state, so this config declares none of its own. */
export const privyWagmiConfig = createPrivyWagmiConfig({ chains, transports, ssr: true });

/** Used when NEXT_PUBLIC_PRIVY_APP_ID is unset: browser wallet or a local dev account. */
export const wagmiConfig = createWagmiConfig({
  chains,
  multiInjectedProviderDiscovery: true,
  connectors: [mock({ accounts: [DEV_ACCOUNT], features: { reconnect: true } }), injected()],
  transports,
  ssr: true,
});

/**
 * The config the app actually mounted. Imperative wagmi-core actions
 * (`getWalletClient`, `getAccount`, …) take a config argument rather than
 * reading React context, and asking the config that is *not* mounted reports
 * no connection at all — which surfaces as "Connector not connected".
 */
export const activeWagmiConfig = privyEnabled ? privyWagmiConfig : wagmiConfig;
