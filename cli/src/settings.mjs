import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CLAUDE_SETTINGS, SETTINGS_BACKUP, STATUSLINE, ensureDir } from "./config.mjs";

// Keryx writes TWO surfaces into ~/.claude/settings.json:
//   1. statusLine  — a clickable line at the bottom of the TUI on every render
//                    (always-on; our renderer + heartbeat live here).
//   2. spinnerVerbs — replaces Claude Code's "thinking" verb (Conjuring…,
//                    Pontificating…) with the ad text. CC >= 2.1.143 reads this
//                    at session start; schema { mode: "replace", verbs: [...] }.
//                    This is the "ad becomes the thinking word" surface.
// Prior values are backed up once and restored on `keryx uninstall`.

function readSettings() {
  if (!existsSync(CLAUDE_SETTINGS)) return {};
  try {
    return JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8"));
  } catch {
    throw new Error(
      `${CLAUDE_SETTINGS} is not valid JSON (JSONC comments unsupported here) — set "statusLine" and "spinnerVerbs" manually.`,
    );
  }
}

function writeSettings(obj) {
  mkdirSync(dirname(CLAUDE_SETTINGS), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(obj, null, 2));
}

function backupOnce(obj) {
  ensureDir();
  if (!existsSync(SETTINGS_BACKUP)) {
    writeFileSync(
      SETTINGS_BACKUP,
      JSON.stringify({ statusLine: obj.statusLine ?? null, spinnerVerbs: obj.spinnerVerbs ?? null }, null, 2),
    );
  }
}

/** Install both surfaces. `adText` becomes the spinner (thinking-word) verb. */
export function installSurfaces(adText) {
  ensureDir();
  const obj = readSettings();
  backupOnce(obj);
  obj.statusLine = { type: "command", command: `node ${STATUSLINE}`, padding: 0 };
  if (adText) obj.spinnerVerbs = { mode: "replace", verbs: [adText] };
  writeSettings(obj);
}

/** Refresh just the spinner verb (the daemon calls this on rotation). Never throws;
 *  no-ops if unchanged so we don't churn the user's settings file. */
export function setSpinnerVerbs(adText) {
  if (!adText) return false;
  try {
    const obj = readSettings();
    if (obj.spinnerVerbs?.verbs?.[0] === adText) return false;
    backupOnce(obj);
    obj.spinnerVerbs = { mode: "replace", verbs: [adText] };
    writeSettings(obj);
    return true;
  } catch {
    return false;
  }
}

/** Restore the prior statusLine + spinnerVerbs (uninstall). */
export function removeSurfaces() {
  if (!existsSync(CLAUDE_SETTINGS)) return;
  let obj;
  try {
    obj = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8"));
  } catch {
    return;
  }
  let prior = {};
  try {
    prior = JSON.parse(readFileSync(SETTINGS_BACKUP, "utf8"));
  } catch {
    /* no backup */
  }
  if (prior.statusLine) obj.statusLine = prior.statusLine;
  else delete obj.statusLine;
  if (prior.spinnerVerbs) obj.spinnerVerbs = prior.spinnerVerbs;
  else delete obj.spinnerVerbs;
  writeSettings(obj);
}
