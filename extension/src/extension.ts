import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { ClaudeCodeAdapter } from "./adapters/claude-code/adapter";
import type { PatchParams } from "./adapters/types";
import { locateClaudeCode } from "./locate";
import { Loopback, resolveLoopbackBase } from "./loopback";
import { AgentWallet } from "./wallet";
import { StatusBar } from "./statusbar";
import { Reporting } from "./reporting";
import { connectCommand } from "./connect";
import { fetchAd, pollKillswitch, readEarnings, type ServerAd } from "./serverClient";
import { config } from "./config";
import { dlog, debugEnabled } from "./log";
import { errMsg } from "./util/errMsg";

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  const statusBar = new StatusBar();
  ctx.subscriptions.push(statusBar);

  const wallet = new AgentWallet(ctx.secrets);
  await wallet.load();

  const target = locateClaudeCode();
  const adapter = new ClaudeCodeAdapter(target || "/__keryx_no_target__");

  // ── shared state ──────────────────────────────────────────────────────────
  let currentAd: ServerAd | null = null;
  let viewThresholdMs = 3000;
  let killed = false;
  let accrued = 0n;
  let capped = false;
  const loopback = new Loopback({
    onEvent: (kind, payload) => reporting.onEvent(kind, payload),
    onClick: (ct, surface, vms, uuid) => reporting.onClick(ct, surface, vms, uuid),
    getActivity: () => ({ ok: true }),
    getCurrentAd: () =>
      currentAd
        ? {
            adText: currentAd.adText,
            clickUrl: currentAd.clickUrl,
            iconUrl: currentAd.icon ?? "",
            adId: currentAd.adId,
            campaignId: currentAd.campaignId,
          }
        : null,
  });
  let lbInfo: { port: number; token: string } | null = null;

  const refreshStatus = (): void => {
    if (!wallet.connected) return statusBar.set({ kind: "disconnected" });
    if (!adapter.preflight().compatible) {
      return statusBar.set({ kind: "incompatible", version: adapter.version() });
    }
    if (killed) return statusBar.set({ kind: "killed" });
    statusBar.set({ kind: currentAd ? "earning" : "connected", accrued, capped });
  };

  const reporting = new Reporting(
    () => currentAd,
    () => wallet.serverFetch,
    () => wallet.address,
    (message) => wallet.signMessage(message),
    () => {
      capped = false;
      void refreshEarnings();
    },
    () => {
      capped = true;
      refreshStatus();
    },
  );

  const refreshEarnings = async (): Promise<void> => {
    if (!wallet.address) return;
    const a = await readEarnings(wallet.address);
    if (a !== null) accrued = a;
    refreshStatus();
  };

  // ── serving bring-up ────────────────────────────────────────────────────────
  const applyCurrentAd = async (): Promise<void> => {
    if (!currentAd || killed || !wallet.connected) return;
    const pf = adapter.preflight();
    if (!pf.compatible) {
      refreshStatus();
      return;
    }
    if (!lbInfo) {
      const started = await loopback.start({ preferredPort: 8791 });
      lbInfo = started;
    }
    const base = await resolveLoopbackBase(lbInfo.port, lbInfo.token);
    const corr = `${currentAd.adId}.${randomBytes(3).toString("hex")}`;
    const params: PatchParams = {
      tier: 1,
      adText: currentAd.adText,
      iconRef: "",
      iconUrl: currentAd.icon ?? "",
      clickToken: randomBytes(8).toString("hex"),
      clickUrl: currentAd.clickUrl,
      corr,
      loopbackPort: lbInfo.port,
      loopbackToken: lbInfo.token,
      loopbackBase: base,
      debug: debugEnabled(),
      bannerOn: false,
      viewThresholdMs,
    };
    const r = adapter.applyPatch(params);
    dlog("ext", "applyPatch", { ok: r.ok, reason: r.reason, adId: currentAd.adId });
    refreshStatus();
  };

  const refreshAd = async (): Promise<void> => {
    const resp = await fetchAd();
    const next = resp.ad;
    if (resp.viewThresholdMs) viewThresholdMs = resp.viewThresholdMs;
    const changed = (next?.adId ?? null) !== (currentAd?.adId ?? null);
    currentAd = next;
    if (changed) reporting.resetForNewAd();
    if (currentAd && changed) await applyCurrentAd();
    refreshStatus();
  };

  // ── killswitch ──────────────────────────────────────────────────────────────
  const checkKill = async (): Promise<void> => {
    const ks = await pollKillswitch();
    const was = killed;
    killed = ks.killed;
    if (killed && !was) {
      adapter.restore();
      dlog("ext", "killed", { reason: ks.reason });
    } else if (!killed && was) {
      await applyCurrentAd();
    }
    refreshStatus();
  };

  // ── commands ────────────────────────────────────────────────────────────────
  ctx.subscriptions.push(
    vscode.commands.registerCommand("keryx.connect", async () => {
      await connectCommand(wallet);
    }),
    vscode.commands.registerCommand("keryx.refresh", async () => {
      await refreshAd();
      await refreshEarnings();
    }),
    vscode.commands.registerCommand("keryx.signOut", async () => {
      await wallet.clear();
      adapter.restore();
      currentAd = null;
      refreshStatus();
      vscode.window.showInformationMessage("Keryx disconnected. Claude Code restored.");
    }),
    vscode.commands.registerCommand("keryx.restore", () => {
      const r = adapter.restore();
      vscode.window.showInformationMessage(
        r.restored ? "Claude Code restored to original." : `Nothing to restore (${r.reason ?? "clean"}).`,
      );
    }),
    vscode.commands.registerCommand("keryx.claim", async () => {
      const addr = wallet.address;
      const url = addr ? `${config.webUrl}/earn?claim=${addr}` : `${config.webUrl}/earn`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),
    vscode.commands.registerCommand("keryx.status", async () => {
      const pf = adapter.preflight();
      vscode.window.showInformationMessage(
        `Keryx — agent ${wallet.address ?? "(none)"} · CC ${pf.version ?? "?"} ${pf.compatible ? "compatible" : "INCOMPATIBLE"} · ` +
          `ad ${currentAd ? currentAd.campaignId : "none"} · ${killed ? "paused" : "active"} · accrued ${accrued} base USDC`,
      );
    }),
    vscode.commands.registerCommand("keryx.diagnose", () => {
      const d = adapter.diagnose ? adapter.diagnose() : null;
      const channel = vscode.window.createOutputChannel("Keryx");
      channel.appendLine(JSON.stringify(d ?? adapter.preflight(), null, 2));
      channel.show();
    }),
  );

  // ── boot ────────────────────────────────────────────────────────────────────
  const pf = adapter.preflight();
  dlog("ext", "activate", { target: !!target, compatible: pf.compatible, version: pf.version, connected: wallet.connected });
  refreshStatus();

  if (!pf.compatible) {
    statusBar.set({ kind: "incompatible", version: pf.version });
    return; // commands still registered; nothing to patch
  }

  // Prime the CSP relaxation so loopback telemetry works the instant an ad lands.
  try {
    adapter.prime?.();
  } catch {
    /* prime is best-effort */
  }

  try {
    await checkKill();
    await refreshAd();
    await refreshEarnings();
  } catch (e) {
    dlog("ext", "boot.error", { msg: errMsg(e) });
  }

  const timers = [
    setInterval(() => void checkKill(), config.killPollMs),
    setInterval(() => void refreshEarnings(), config.earningsPollMs),
    setInterval(() => void refreshAd(), config.adRotationMs),
  ];
  ctx.subscriptions.push({ dispose: () => timers.forEach(clearInterval) });
  ctx.subscriptions.push({ dispose: () => void loopback.stop() });
}

export function deactivate(): void {
  // Restore Claude Code on uninstall/disable so we never leave it patched.
  try {
    const target = locateClaudeCode();
    if (target) new ClaudeCodeAdapter(target).restore({ keepCsp: true });
  } catch {
    /* best-effort */
  }
}
