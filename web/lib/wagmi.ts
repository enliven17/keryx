import { createConfig, http } from "wagmi";
import { injected, mock } from "wagmi/connectors";
import { anvil, creditcoinTestnet } from "./chains";

export const DEV_ACCOUNT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;

export const wagmiConfig = createConfig({
  chains: [anvil, creditcoinTestnet],
  multiInjectedProviderDiscovery: true,
  connectors: [mock({ accounts: [DEV_ACCOUNT], features: { reconnect: true } }), injected()],
  transports: {
    [anvil.id]: http(),
    [creditcoinTestnet.id]: http(),
  },
  ssr: true,
});
