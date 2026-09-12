import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Headless diagnosis channel: structured lines to ~/.keryx/debug.log (and the
// console when KERYX_DEBUG is set). The injected webview block relays its
// lifecycle here via the loopback /log route — the only way out of the sandbox.
const LOG_DIR = join(homedir(), ".keryx");
const LOG_FILE = join(LOG_DIR, "debug.log");

export function debugEnabled(): boolean {
  return process.env.KERYX_DEBUG === "1" || process.env.KERYX_DEBUG === "true";
}

function write(line: string): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line.endsWith("\n") ? line : line + "\n");
  } catch {
    /* logging must never throw */
  }
  if (debugEnabled()) {
    // eslint-disable-next-line no-console
    console.error(line.trimEnd());
  }
}

/** Structured log line: dlog(scope, event, fields?, opts?). */
export function dlog(
  scope: string,
  event: string,
  fields: Record<string, unknown> = {},
  opts: { corr?: string } = {},
): void {
  try {
    const rec = {
      ts: new Date().toISOString(),
      scope,
      event,
      ...(opts.corr ? { corr: opts.corr } : {}),
      ...fields,
    };
    write(JSON.stringify(rec));
  } catch {
    /* never throw */
  }
}

/** Raw passthrough (webview block relays its own pre-formatted JSON lines). */
export function dlogRaw(raw: string): void {
  write(raw);
}
