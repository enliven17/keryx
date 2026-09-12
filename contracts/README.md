# Keryx contracts

Foundry contracts for the Creditcoin and Attestcoin settlement flow.

## Contracts

- CampaignEscrow: holds campaign USDC, records bids, charges delivery, and stores claimable balances.
- AuctionHouse: ranks funded campaigns by their standing price per 1,000 impressions.
- SourceEngagement: emits replay-protected engagement events on a supported source chain.
- AttestcoinSettlement: an Attestcoin ASC. It verifies a source receipt through the native query verifier, decodes EngagementRecorded, charges the campaign, and splits the amount 50/50 between earner and treasury.
- MockUSDC: six-decimal local development token.

## Commands

~~~bash
./script/install-deps.sh
forge build
forge test
~~~

foundry.toml compiles with Solidity 0.8.28, optimizer, and via-IR because the Attestcoin decoder has a large proof argument set.

Deploy a local suite:

~~~bash
./script/dev-chain.sh
~~~

The script writes deployments/anvil.json, which is ignored because it contains private development keys. For Creditcoin, deploy the source emitter on its source chain, set SOURCE_ENGAGEMENT, and use CREDITCOIN_RPC_URL with CHAIN_ID=102031.

Deploy the source emitter separately on a supported source chain:

~~~bash
SOURCE_PRIVATE_KEY=0x... forge script script/DeploySource.s.sol:DeploySource \
  --rpc-url "$SOURCE_CHAIN_RPC_URL" --broadcast
~~~
