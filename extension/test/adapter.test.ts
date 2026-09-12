import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeCodeAdapter } from "../src/adapters/claude-code/adapter";
import type { PatchParams } from "../src/adapters/types";

// A minimal stand-in for Claude Code's webview/index.js: a >=2-element verb
// array containing one of our anchors, so preflight/findArray locate it.
const INDEX_FIX =
  'var X=1;var VERBS=["Accomplishing","Discombobulating","Brewing","Clauding","Booping"];' +
  "console.log(VERBS);var Y=2;\n";

// A stand-in for the sibling extension.js carrying CC's dynamic CSP template
// (`default-src 'none'; ${q}` shape) the adapter relaxes for loopback telemetry.
const EXT_FIX =
  "function getHtmlForWebview(){return `<meta http-equiv=\"Content-Security-Policy\" " +
  "content=\"default-src 'none'; ${q} img-src ${cspSource} data:;\">`;}\n";

function tmpInstall(): { target: string; sibling: string } {
  const root = mkdtempSync(join(tmpdir(), "keryx-cc-"));
  const dir = join(root, "anthropic.claude-code-2.1.200", "webview");
  mkdirSync(dir, { recursive: true });
  const target = join(dir, "index.js");
  const sibling = join(root, "anthropic.claude-code-2.1.200", "extension.js");
  writeFileSync(target, INDEX_FIX, "utf8");
  writeFileSync(sibling, EXT_FIX, "utf8");
  return { target, sibling };
}

const params: PatchParams = {
  tier: 1,
  adText: "Deploy this in 30s — vercel.com/new",
  iconRef: "",
  iconUrl: "",
  clickToken: "ck123",
  clickUrl: "https://vercel.com/new",
  corr: "0xdeadbeef.abc",
  loopbackPort: 8791,
  loopbackToken: "lt0123456789abcdef",
  loopbackBase: "http://127.0.0.1:8791/keryx/lt0123456789abcdef",
  debug: false,
  bannerOn: false,
  viewThresholdMs: 3000,
};

describe("ClaudeCodeAdapter (Keryx injection)", () => {
  let target: string;
  let sibling: string;
  beforeEach(() => {
    ({ target, sibling } = tmpInstall());
  });

  it("preflight is compatible on a fixture with an anchored verb array", () => {
    const pf = new ClaudeCodeAdapter(target).preflight();
    expect(pf.compatible).toBe(true);
    expect(pf.version).toBe("2.1.200");
  });

  it("preflight is incompatible when the verb array is absent", () => {
    writeFileSync(target, "var nothing = 1;\n");
    expect(new ClaudeCodeAdapter(target).preflight().compatible).toBe(false);
  });

  it("applyPatch injects the Keryx block with all placeholders substituted", () => {
    const a = new ClaudeCodeAdapter(target);
    expect(a.applyPatch(params).ok).toBe(true);
    const out = readFileSync(target, "utf8");
    expect(out).toContain("/* KERYX-START */");
    expect(out).toContain("/* KERYX-END */");
    // No unsubstituted placeholders survived.
    expect(out).not.toMatch(/__KERYX_[A-Z_]+__/);
    // Ad creative + click target + loopback are baked in.
    expect(out).toContain("Deploy this in 30s");
    expect(out).toContain("https://vercel.com/new");
    expect(out).toContain("/keryx/lt0123456789abcdef");
    // The verb array is left intact (a failed block falls back to CC's verbs).
    expect(out).toContain('"Discombobulating"');
  });

  it("relaxes the sibling CSP so loopback telemetry is reachable", () => {
    new ClaudeCodeAdapter(target).applyPatch(params);
    const ext = readFileSync(sibling, "utf8");
    expect(ext).toContain("connect-src http://127.0.0.1:*");
    // CC's own template variable is preserved.
    expect(ext).toContain("${q}");
  });

  it("isPatched: false → true after patch → false after restore", () => {
    const a = new ClaudeCodeAdapter(target);
    expect(a.isPatched()).toBe(false);
    a.applyPatch(params);
    expect(a.isPatched()).toBe(true);
    a.restore();
    expect(a.isPatched()).toBe(false);
  });

  it("restore is byte-exact and removes the backup", () => {
    const original = readFileSync(target);
    const originalExt = readFileSync(sibling);
    const a = new ClaudeCodeAdapter(target);
    a.applyPatch(params);
    expect(a.restore().restored).toBe(true);
    expect(readFileSync(target).equals(original)).toBe(true);
    expect(readFileSync(sibling).equals(originalExt)).toBe(true);
    expect(existsSync(target + ".keryx-backup")).toBe(false);
  });

  it("re-applying does not stack blocks (idempotent)", () => {
    const a = new ClaudeCodeAdapter(target);
    a.applyPatch(params);
    a.applyPatch({ ...params, adText: "Second creative", corr: "0xfeed.def" });
    const out = readFileSync(target, "utf8");
    expect(out.match(/\/\* KERYX-START \*\//g)?.length).toBe(1);
    expect(out).toContain("Second creative");
    expect(out).not.toContain("Deploy this in 30s");
  });

  it("prime relaxes CSP without injecting a block; restore reverts it", () => {
    const a = new ClaudeCodeAdapter(target);
    expect(a.prime().ok).toBe(true);
    expect(readFileSync(sibling, "utf8")).toContain("connect-src http://127.0.0.1:*");
    expect(a.isPatched()).toBe(false); // no ad block, only CSP
    a.restore(); // explicit restore (no keepCsp) reverts the primed CSP
    expect(readFileSync(sibling, "utf8")).not.toContain("connect-src http://127.0.0.1:*");
  });
});
