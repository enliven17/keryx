# Keryx web

Next.js dashboard for the Creditcoin deployment.

The app provides wallet onboarding, campaign creation, the weighted auction board, earner activity, claimable USDC, and the Attestcoin configuration view. Wallet connectors support a local development account and an injected browser wallet.

Set:

~~~dotenv
NEXT_PUBLIC_KERYX_NETWORK=anvil
NEXT_PUBLIC_SERVER_BASE=http://localhost:4021
NEXT_PUBLIC_CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
NEXT_PUBLIC_CREDITCOIN_CHAIN_ID=102031
~~~

Run:

~~~bash
pnpm dev
pnpm typecheck
~~~
