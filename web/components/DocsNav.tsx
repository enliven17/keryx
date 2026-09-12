"use client";

import { useEffect, useState } from "react";

export type DocLink = { id: string; label: string; group?: string };

/** Sidebar that tracks which section is in view and marks it. */
export function DocsNav({ links }: { links: DocLink[] }) {
  const [active, setActive] = useState(links[0]?.id ?? "");

  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    // Whichever heading last crossed the top quarter of the viewport is the one
    // the reader is in — simpler and steadier than tracking intersection ratios.
    const onScroll = () => {
      const line = window.innerHeight * 0.25;
      let current = sections[0].id;
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [links]);

  return (
    <nav className="docs-side" aria-label="Documentation">
      {links.map((l) => (
        <span key={l.id}>
          {l.group && <div className="group eyebrow">{l.group}</div>}
          <a href={`#${l.id}`} className={active === l.id ? "active" : undefined}>
            {l.label}
          </a>
        </span>
      ))}
    </nav>
  );
}
