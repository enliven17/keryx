import * as vscode from "vscode";
import type { AgentWallet } from "./wallet";

/** Connect an agent key created during Keryx onboarding. */
export async function connectCommand(wallet: AgentWallet): Promise<void> {
  const value = await vscode.window.showInputBox({
    prompt: "Paste the Keryx agent private key",
    password: true,
    ignoreFocusOut: true,
    placeHolder: "0x...",
  });
  if (!value) return;
  if (!(await wallet.setKey(value.trim()))) {
    vscode.window.showErrorMessage("That private key is not valid.");
    return;
  }
  vscode.window.showInformationMessage(`Keryx connected: ${wallet.address}`);
}
