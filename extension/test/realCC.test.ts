import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { ClaudeCodeAdapter } from "../src/adapters/claude-code/adapter";
import { locateClaudeCode } from "../src/locate";
import type { PatchParams } from "../src/adapters/types";

// Validates the version-specific bundle patching against the REAL Claude Code
// installed on this machine — on a COPY, so the live install is never touched.
// Skips cleanly when no Claude Code is present (CI without it).
const real = locateClaudeCode();

const params: PatchParams = {
  tier: 1,
  adText: "Deploy this in 30s — vercel.com/new",
  iconRef: "",
  iconUrl: "",
  clickToken: "ck",
  clickUrl: "https://vercel.com/new",
  corr: "0xabc.def",
  loopbackPort: 8791,
  loopbackToken: "lt0123456789abcdef",
  loopbackBase: "http://127.0.0.1:8791/keryx/lt0123456789abcdef",
  debug: false,
  bannerOn: false,
  viewThresholdMs: 3000,
};

describe.skipIf(!real)("real Claude Code bundle (copy)", () => {
  it("preflight + applyPatch + byte-exact restore on the installed CC", () => {
    const root = mkdtempSync(join(tmpdir(), "keryx-realcc-"));
    // Mirror the install layout so version() + sibling extension.js resolve.
    const ccDir = join(root, "anthropic.claude-code-2.1.999", "webview");
    mkdirSync(ccDir, { recursive: true });
    const target = join(ccDir, "index.js");
    copyFileSync(real!, target);
    // Copy the sibling extension.js if present (for the CSP relaxation path).
    const realExt = join(dirname(dirname(real!)), "extension.js");
    const sibling = join(root, "anthropic.claude-code-2.1.999", "extension.js");
    const hasExt = existsSync(realExt);
    if (hasExt) copyFileSync(realExt, sibling);

    const original = readFileSync(target);
    const a = new ClaudeCodeAdapter(target);

    // 1) detection works against the real bundle format
    expect(a.preflight().compatible).toBe(true);

    // 2) injection succeeds, fully substituted
    expect(a.applyPatch(params).ok).toBe(true);
    const patched = readFileSync(target, "utf8");
    expect(patched).toContain("/* KERYX-START */");
    expect(patched).not.toMatch(/__KERYX_[A-Z_]+__/);
    expect(patched).toContain("Deploy this in 30s");
    expect(a.isPatched()).toBe(true);

    // 3) the CSP relaxation lands (best-effort; only assert if the anchor matched)
    if (hasExt) {
      const ext = readFileSync(sibling, "utf8");
      // Either the anchor matched (connect-src inserted) or it didn't — both are
      // valid; if it inserted, CC's template var must still be present.
      if (ext.includes("connect-src http://127.0.0.1:*")) {
        expect(ext).toMatch(/\$\{[a-zA-Z_]\w*\}/);
      }
    }

    // 4) restore is byte-exact
    expect(a.restore().restored).toBe(true);
    expect(readFileSync(target).equals(original)).toBe(true);
    expect(a.isPatched()).toBe(false);
  });
});
