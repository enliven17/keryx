#!/usr/bin/env node
// Keryx CLI for the Claude Code status surface.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ensureDir, readConfig, writeConfig, STATUSLINE, PIDFILE, LOGFILE, AD_CACHE } from "../src/config.mjs";
import { installSurfaces, removeSurfaces } from "../src/settings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const daemon = join(here, "..", "src", "daemon.mjs");
const statusline = join(here, "..", "src", "statusline.mjs");
const flag = (name, fallback) => {
  const index = process.argv.indexOf("--" + name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const has = (name) => process.argv.includes("--" + name);
const server = String(flag("server", process.env.KERYX_SERVER_BASE || "http://localhost:4021")).replace(/\/+$/, "");

function provision() {
  const privateKey = generatePrivateKey();
  return { privateKey, address: privateKeyToAccount(privateKey).address };
}

function saveConfig(privateKey) {
  writeConfig({ agentPrivateKey: privateKey, serverBase: server });
}

function startDaemon() {
  ensureDir();
  const fd = openSync(LOGFILE, "a");
  const child = spawn(process.execPath, [daemon], { detached: true, stdio: ["ignore", fd, fd] });
  writeFileSync(PIDFILE, String(child.pid));
  child.unref();
  return child.pid;
}

function stopDaemon() {
  try {
    const pid = Number(readFileSync(PIDFILE, "utf8"));
    process.kill(pid);
    unlinkSync(PIDFILE);
    return pid;
  } catch {
    return null;
  }
}

async function setup() {
  ensureDir();
  let key = flag("key", null);
  if (!key) {
    const agent = provision();
    key = agent.privateKey;
    console.log("Created earner " + agent.address);
    console.log("Keep this key safe: " + key);
  }
  key = key.startsWith("0x") ? key : "0x" + key;
  privateKeyToAccount(key);
  saveConfig(key);
  copyFileSync(statusline, STATUSLINE);
  let adText = "";
  try {
    const response = await fetch(server + "/ad");
    adText = (await response.json())?.ad?.adText || "";
  } catch {}
  installSurfaces(adText);
  const address = privateKeyToAccount(key).address;
  if (!has("no-daemon")) {
    const pid = startDaemon();
    console.log("Keryx is ready · earner " + address + " · daemon pid " + pid);
  } else {
    console.log("Keryx is configured. Run keryx start to begin.");
  }
}

async function status() {
  const cfg = readConfig();
  if (!cfg) return console.log("Keryx is not configured. Run keryx setup.");
  const address = privateKeyToAccount(cfg.agentPrivateKey).address;
  const base = String(cfg.serverBase || server).replace(/\/+$/, "");
  const earn = await fetch(base + "/earnings/" + address).then((response) => response.json()).catch(() => null);
  const ad = await fetch(base + "/ad").then((response) => response.json()).catch(() => null);
  const running = (() => { try { process.kill(Number(readFileSync(PIDFILE, "utf8")), 0); return true; } catch { return false; } })();
  const amount = earn?.accrued ? (Number(earn.accrued) / 1e6).toFixed(4) : "0.0000";
  console.log("Keryx status");
  console.log("  earner:   " + address);
  console.log("  server:   " + base);
  console.log("  daemon:   " + (running ? "running" : "stopped"));
  console.log("  accrued:  $" + amount + " USDC");
  console.log("  ad now:   " + (ad?.ad ? "\"" + ad.ad.adText + "\"" : "none live"));
}

async function main() {
  const command = process.argv[2];
  try {
    if (command === "setup") return await setup();
    if (command === "provision") {
      const agent = provision();
      saveConfig(agent.privateKey);
      console.log("Created earner " + agent.address);
      console.log("Keep this key safe: " + agent.privateKey);
      return;
    }
    if (command === "start") return await import(daemon);
    if (command === "stop") return console.log(stopDaemon() ? "Keryx daemon stopped." : "No Keryx daemon is running.");
    if (command === "status") return await status();
    if (command === "uninstall") {
      stopDaemon();
      removeSurfaces();
      try { unlinkSync(AD_CACHE); } catch {}
      return console.log("Keryx status surfaces removed.");
    }
    console.log("Usage: keryx setup|provision|start|stop|status|uninstall");
  } catch (error) {
    console.error("Error: " + (error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
void main();
