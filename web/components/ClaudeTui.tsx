"use client";

import { useEffect, useState } from "react";

// Real Claude Code thinking verbs — these are what Keryx's `spinnerVerbs` setting
// replaces with the ad. The animation cycles a few, then the thinking word BECOMES
// the sponsored line, then earns — showing the whole mechanic in one loop.
const VERBS = ["Pontificating", "Conjuring", "Reticulating", "Combobulating"];
const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const AD = { text: "Postgres, but serverless — neon.tech", host: "neon.tech" };

// 6 frames: 3 thinking verbs, then 3 holding the ad (so it lingers).
const FRAMES = 6;

export function ClaudeTui() {
  const [spin, setSpin] = useState(0);
  const [frame, setFrame] = useState(0);
  const [today, setToday] = useState(18.41);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const s = setInterval(() => setSpin((x) => (x + 1) % SPIN.length), 90);
    return () => clearInterval(s);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => {
        const next = (f + 1) % FRAMES;
        if (next === 3) {
          // verb → ad: a 5-second view just became an impression.
          setToday((v) => +(v + 0.0006).toFixed(4));
          setFlash(true);
          setTimeout(() => setFlash(false), 1100);
        }
        return next;
      });
    }, 1150);
    return () => clearInterval(t);
  }, []);

  const isAd = frame >= 3;
  const verb = VERBS[frame % VERBS.length];

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(17,17,27,0.20)",
        border: "1px solid #21262d",
        background: "#0d1117",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* title bar */}
      <div style={{ background: "#161b22", padding: "9px 13px", display: "flex", alignItems: "center", gap: 8 }}>
        <Dot c="#ff5f57" />
        <Dot c="#febc2e" />
        <Dot c="#28c840" />
        <span style={{ flex: 1, textAlign: "center", color: "#6e7681", fontSize: "0.72rem", marginRight: 28 }}>
          claude — agent.ts
        </span>
      </div>

      {/* terminal body */}
      <div style={{ padding: "16px 18px", fontSize: "0.82rem", lineHeight: 1.7, color: "#c9d1d9", minHeight: 232 }}>
        <div style={{ color: "#6e7681" }}>
          <span style={{ color: "#3fb950" }}>&gt;</span> refactor the auth handler in agent.ts
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <span style={{ color: "#5b8cff" }}>●</span>
          <span>I&apos;ll switch the handler to hono&apos;s <span style={{ color: "#79c0ff" }}>Request</span> type and tidy the imports.</span>
        </div>
        <div style={{ marginTop: 6, marginLeft: 18, color: "#6e7681" }}>
          ⎿ Updated <span style={{ color: "#c9d1d9" }}>agent.ts</span>
        </div>

        {/* THE thinking line — verb cycles, then becomes the ad */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 9, minHeight: 24 }}>
          <span style={{ color: isAd ? "#3fb950" : "#8b949e", width: 14, display: "inline-block" }}>
            {isAd ? "✦" : SPIN[spin]}
          </span>
          {isAd ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "2px 8px",
                margin: "-2px 0",
                borderRadius: 6,
                background: "rgba(63,185,80,0.12)",
                boxShadow: "inset 2px 0 0 #3fb950",
                transition: "background 0.3s ease",
              }}
            >
              <span style={{ color: "#79c0ff" }}>{AD.text}</span>
              <span style={{ color: "#6e7681", fontSize: "0.66rem", border: "1px solid #30363d", borderRadius: 4, padding: "0 5px" }}>sponsored</span>
            </span>
          ) : (
            <span style={{ color: "#8b949e" }}>
              {verb}… <span style={{ color: "#484f58", fontSize: "0.74rem" }}>(esc to interrupt)</span>
            </span>
          )}
          {/* earn flash */}
          <span
            style={{
              color: "#3fb950",
              fontSize: "0.74rem",
              marginLeft: 4,
              opacity: flash ? 1 : 0,
              transform: flash ? "translateY(0)" : "translateY(4px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            +$0.0006 earned
          </span>
        </div>

        {/* prompt box */}
        <div
          style={{
            marginTop: 18,
            border: "1px solid #30363d",
            borderRadius: 8,
            padding: "9px 12px",
            color: "#6e7681",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#3fb950" }}>&gt;</span>
          <span style={{ width: 7, height: 15, background: "#c9d1d9", display: "inline-block", animation: "keryx-blink 1.1s step-end infinite" }} />
        </div>
      </div>

      {/* status line */}
      <div style={{ background: "#5b8cff", color: "#fff", fontSize: "0.7rem", padding: "5px 14px", display: "flex", justifyContent: "space-between" }}>
        <span>⎇ main · 0 errors</span>
        <span style={{ display: "flex", gap: 14 }}>
          <span className="mono" style={{ color: "#d6ffe2" }}>+${today.toFixed(2)} today</span>
          <span>✦ Keryx · earning</span>
        </span>
      </div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span style={{ width: 11, height: 11, borderRadius: "50%", background: c, display: "inline-block" }} />;
}
