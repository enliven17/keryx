# Keryx extension

The VS Code extension injects a sponsored line into the Claude Code status surface. A viewable line is deduplicated locally, reported with the earner EVM address, and queued by the Keryx server for source-chain anchoring.

The agent key is kept in VS Code SecretStorage. It identifies the earner wallet used for claimable balances; the key is never sent to the server.

Build and test:

~~~bash
pnpm build
pnpm typecheck
pnpm test
~~~
