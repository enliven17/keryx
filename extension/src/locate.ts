import { homedir } from "node:os";
import { join } from "node:path";
import { readdirSync, existsSync } from "node:fs";
import { compareClaudeCodeInstall } from "./util/claudeCodeVersion";

// readdir-based glob for `<root>/anthropic.claude-code-*/webview/index.js`.
// Returns absolute paths; never throws.
export function globClaudeCode(root: string): string[] {
  try {
    if (!existsSync(root)) return [];
    const out: string[] = [];
    for (const name of readdirSync(root)) {
      if (!name.startsWith("anthropic.claude-code-")) continue;
      const idx = join(root, name, "webview", "index.js");
      if (existsSync(idx)) out.push(idx);
    }
    return out;
  } catch {
    return [];
  }
}

/** Locate the installed Claude Code VS Code extension's patchable webview bundle.
 *  Covers local (.vscode/.cursor) and remote/server hosts. Returns the newest
 *  install, or null. `KERYX_CC_TARGET` overrides for testing/portable installs. */
export function locateClaudeCode(): string | null {
  const explicit = process.env.KERYX_CC_TARGET;
  if (explicit && existsSync(explicit)) return explicit;
  for (const root of [
    join(homedir(), ".vscode", "extensions"),
    join(homedir(), ".vscode-insiders", "extensions"),
    join(homedir(), ".vscode-server", "extensions"),
    join(homedir(), ".vscode-server-insiders", "extensions"),
    join(homedir(), ".cursor", "extensions"),
    join(homedir(), ".cursor-server", "extensions"),
  ]) {
    try {
      const hits = globClaudeCode(root).sort(compareClaudeCodeInstall);
      if (hits.length) return hits[hits.length - 1];
    } catch {
      /* ignore */
    }
  }
  return null;
}
