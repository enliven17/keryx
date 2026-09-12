// Keryx Claude Code status line. Runs on every CC render, so it stays tiny and
// fast: read the cached ad, print it, and touch the heartbeat (proof the ad is
// on-screen, which gates earning in the daemon). Never throws. No network, no
// heavy imports.
import { readFileSync, writeFileSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DIR = join(homedir(), ".keryx");
const ESC = String.fromCharCode(27); // ESC, built from char code (no literal control byte in source)
const CONTROL = new RegExp("[" + String.fromCharCode(0) + "-" + String.fromCharCode(31) + "]", "g");

// Heartbeat = "Claude Code is rendering my status line right now" (ad visible).
try {
  writeFileSync(join(DIR, "heartbeat"), String(Date.now()));
} catch {
  /* never throw */
}

try {
  const o = JSON.parse(readFileSync(join(DIR, "current-ad.json"), "utf8"));
  const fresh =
    o && typeof o.ts === "number" && Date.now() - o.ts < 30000 && typeof o.adText === "string" && o.adText;
  if (fresh) {
    const strip = (s) => String(s).replace(CONTROL, " ");
    const text = "✦ " + strip(o.adText) + "  · sponsored";
    const url = o.clickUrl ? strip(o.clickUrl) : "";
    // OSC 8 hyperlink so the ad is clickable in supporting terminals.
    const out = url ? ESC + "]8;;" + url + ESC + "\\" + text + ESC + "]8;;" + ESC + "\\" : text;
    writeSync(1, out); // writeSync survives the imminent process exit
  }
} catch {
  /* no ad / not set up -> render nothing */
}
