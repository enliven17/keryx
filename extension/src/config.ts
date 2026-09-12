import * as vscode from "vscode";

function cfg(envKey: string, settingKey: string, fallback: string): string {
  const env = process.env[envKey];
  if (env && env.trim()) return env.trim();
  const setting = vscode.workspace.getConfiguration("keryx").get<string>(settingKey);
  return setting && setting.trim() ? setting.trim() : fallback;
}

export const config = {
  get serverBase(): string {
    return cfg("KERYX_SERVER_BASE", "serverBase", "http://localhost:4021").replace(/\/+$/, "");
  },
  get webUrl(): string {
    return cfg("KERYX_WEB_URL", "webUrl", "http://localhost:3000").replace(/\/+$/, "");
  },
  killPollMs: 30_000,
  earningsPollMs: 30_000,
  adRotationMs: 60_000,
} as const;

export const AGENT_KEY_SECRET = "keryx.agent.privateKey";
