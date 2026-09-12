import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil, creditcoinTestnet } from "./chains";
import { loadDeployment, type Deployment } from "./deployment";

type FullDeployment = Deployment & { deployerPrivateKey?: `0x${string}` };

/** The public deployment plus, on a local checkout only, the key the dev faucet signs with. */
export function fullDeployment(): FullDeployment | null {
  const base = loadDeployment();
  if (!base) return null;
  const key = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  return { ...base, deployerPrivateKey: key };
}

export function serverChain() {
  const d = fullDeployment();
  if (!d) throw new Error("no deployment");
  const chain = d.chainId === 102031 ? creditcoinTestnet : anvil;
  const transport = http(d.rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const account = d.deployerPrivateKey ? privateKeyToAccount(d.deployerPrivateKey) : null;
  const walletClient = account ? createWalletClient({ account, chain, transport }) : null;
  return { d, chain, publicClient, walletClient, account };
}

/** The faucet mints test USDC, so it exists only where a local chain does. */
export function devWritesAvailable(): boolean {
  const d = fullDeployment();
  return Boolean(d?.deployerPrivateKey && d.chainId !== 102031);
}
