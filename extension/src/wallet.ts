import * as vscode from "vscode";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { AGENT_KEY_SECRET } from "./config";
import { dlog } from "./log";

/** Local EVM account used as the earner address for server reports. */
export class AgentWallet {
  private account: PrivateKeyAccount | null = null;

  constructor(private readonly secrets: vscode.SecretStorage) {}

  async load(): Promise<boolean> {
    const pk = await this.secrets.get(AGENT_KEY_SECRET);
    if (!pk) return false;
    try {
      this.account = privateKeyToAccount(pk as `0x${string}`);
      dlog("wallet", "loaded", { address: this.account.address });
      return true;
    } catch (error) {
      dlog("wallet", "load.error", { msg: String(error) });
      this.account = null;
      return false;
    }
  }

  async setKey(privateKey: string): Promise<boolean> {
    const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    try {
      privateKeyToAccount(pk as `0x${string}`);
    } catch {
      return false;
    }
    await this.secrets.store(AGENT_KEY_SECRET, pk);
    return this.load();
  }

  async clear(): Promise<void> {
    await this.secrets.delete(AGENT_KEY_SECRET);
    this.account = null;
  }

  get connected(): boolean {
    return this.account !== null;
  }

  get address(): `0x${string}` | null {
    return this.account?.address ?? null;
  }

  get serverFetch(): typeof fetch | null {
    return this.account ? fetch : null;
  }

  async signMessage(message: string): Promise<`0x${string}` | null> {
    return this.account ? this.account.signMessage({ message }) : null;
  }
}
