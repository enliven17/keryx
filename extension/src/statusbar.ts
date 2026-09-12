import * as vscode from "vscode";

/** USDC has 6 decimals; format base units as $X.XXXX. */
function fmtUsdc(base: bigint): string {
  const neg = base < 0n;
  const v = neg ? -base : base;
  const whole = v / 1_000_000n;
  const frac = (v % 1_000_000n).toString().padStart(6, "0").slice(0, 4);
  return `${neg ? "-" : ""}$${whole.toString()}.${frac}`;
}

export type StatusKind =
  | { kind: "disconnected" }
  | { kind: "incompatible"; version: string | null }
  | { kind: "killed" }
  | { kind: "earning"; accrued: bigint; capped?: boolean }
  | { kind: "connected"; accrued: bigint };

export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = "Keryx";
    this.set({ kind: "disconnected" });
    this.item.show();
  }

  set(s: StatusKind): void {
    switch (s.kind) {
      case "disconnected":
        this.item.text = "$(circle-slash) Keryx: Connect";
        this.item.tooltip = "Connect your Keryx agent to start earning";
        this.item.command = "keryx.connect";
        this.item.backgroundColor = undefined;
        break;
      case "incompatible":
        this.item.text = "$(warning) Keryx: incompatible";
        this.item.tooltip = `Claude Code ${s.version ?? "unknown"} is not patchable by this build`;
        this.item.command = "keryx.diagnose";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        break;
      case "killed":
        this.item.text = "$(circle-slash) Keryx: paused";
        this.item.tooltip = "Ads paused platform-wide. You'll resume earning automatically.";
        this.item.command = "keryx.status";
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        break;
      case "earning":
        this.item.text = `$(pulse) ${fmtUsdc(s.accrued)} USDC`;
        this.item.tooltip = s.capped
          ? "Per-earner earning cap reached for now — earnings resume next window."
          : "Accruing now. Click to claim.";
        this.item.command = "keryx.claim";
        this.item.backgroundColor = undefined;
        break;
      case "connected":
        this.item.text = `$(check) ${fmtUsdc(s.accrued)} USDC`;
        this.item.tooltip = "Keryx connected. Click to claim.";
        this.item.command = "keryx.claim";
        this.item.backgroundColor = undefined;
        break;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
