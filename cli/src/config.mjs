import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Everything Keryx keeps on disk lives under ~/.keryx.
export const DIR = join(homedir(), ".keryx");
export const CONFIG = join(DIR, "config.json");
export const AD_CACHE = join(DIR, "current-ad.json");
export const HEARTBEAT = join(DIR, "heartbeat");
export const PIDFILE = join(DIR, "daemon.pid");
export const LOGFILE = join(DIR, "daemon.log");
export const STATUSLINE = join(DIR, "statusline.mjs");
export const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
export const SETTINGS_BACKUP = join(DIR, "claude-statusline.backup.json");

export function ensureDir() {
  mkdirSync(DIR, { recursive: true });
}

export function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG, "utf8"));
  } catch {
    return null;
  }
}

export function writeConfig(c) {
  ensureDir();
  writeFileSync(CONFIG, JSON.stringify(c, null, 2));
}
