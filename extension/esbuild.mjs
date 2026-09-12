import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["vscode"],
  outfile: "dist/extension.js",
  target: "node18",
  sourcemap: true,
});

// The injected webview block is a shipped raw asset (NOT bundled) — the adapter
// reads + token-substitutes it at patch time.
const dest = "dist/adapters/claude-code/block.asset.js";
mkdirSync(dirname(dest), { recursive: true });
copyFileSync("src/adapters/claude-code/block.asset.js", dest);
console.log("built dist/extension.js + block.asset.js");
