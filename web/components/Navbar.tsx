"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { Logo } from "./ui";

export type NavLink = { href: string; label: string };

/**
 * The bar morphs from a full-width transparent header into a floating pill as
 * the page leaves the top. A single `--nav-p` scrubs 0 → 1 over the first
 * 160px and every dimension is derived from it in CSS, so there is one
 * animated value rather than a dozen transitions racing each other.
 */
export function Navbar({ links, right }: { links: NavLink[]; right?: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.style.setProperty("--nav-p", String(Math.min(1, window.scrollY / 160)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty("--nav-p");
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="nav-shell" style={open ? ({ "--nav-p": 1 } as React.CSSProperties) : undefined}>
      <nav className="nav-bar" aria-label="Primary">
        <Logo size={19} />

        <div className="nav-links" style={{ flex: 1, justifyContent: "center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-links" style={{ gap: "0.9rem" }}>
          {right}
        </div>

        <button
          type="button"
          className="nav-burger"
          aria-expanded={open}
          aria-controls="nav-panel"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </nav>

      {open && (
        <div className="nav-panel" id="nav-panel">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>{right}</div>
        </div>
      )}
    </header>
  );
}
