"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/** Adds `.in` the first time the element scrolls into view. CSS does the rest. */
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "span" | "p";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal ${inView ? "in" : ""} ${className}`.trim()}
      style={{ "--d": `${delay}ms`, ...style } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * Heading text that resolves out of blur one unit at a time.
 * `by="word"` reads as a sentence assembling; `by="char"` types itself in.
 * Words stay wrapped in a nowrap span so a line break never lands mid-word.
 */
export function SplitText({
  text,
  by = "word",
  gap,
  delay = 0,
  className = "",
  style,
}: {
  text: string;
  by?: "word" | "char";
  gap?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [settled, setSettled] = useState(false);
  const words = text.split(" ");
  const step = gap ?? (by === "char" ? 26 : 80);

  useEffect(() => {
    if (!inView) return;
    const units = by === "char" ? text.replace(/ /g, "").length : words.length;
    const t = setTimeout(() => setSettled(true), delay + units * step + 700);
    return () => clearTimeout(t);
  }, [inView, by, text, words.length, step, delay]);

  let i = 0;
  return (
    <span
      ref={ref}
      className={`split ${inView ? "in" : ""} ${settled ? "settled" : ""} ${className}`.trim()}
      style={{ "--gap": `${step}ms`, "--d": `${delay}ms`, ...style } as React.CSSProperties}
    >
      {words.flatMap((word, w) => [
        // The space is a real text node *between* wrappers. Inside one it would
        // be a trailing space in an inline-block and get trimmed away, which
        // runs the words together.
        ...(w > 0 ? [<span key={`s${w}`}> </span>] : []),
        <span key={w} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {by === "char" ? (
            word.split("").map((ch, c) => (
              <span key={c} className="u" style={{ "--i": i++ } as React.CSSProperties}>
                {ch}
              </span>
            ))
          ) : (
            <span className="u" style={{ "--i": i++ } as React.CSSProperties}>
              {word}
            </span>
          )}
        </span>,
      ])}
    </span>
  );
}

/** Paired dashed vertical rails, the grid language the sections share. */
export function VGutter({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="gutter-v" aria-hidden style={style}>
      <span className="dash-v dash-fade-v" style={{ height: "100%" }} />
      <span className="dash-v dash-fade-v" style={{ height: "100%" }} />
    </div>
  );
}

/** Paired dashed horizontal rails, full bleed across the section. */
export function HGutter({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="gutter-h" aria-hidden style={style}>
      <span className="dash-h" style={{ width: "100%" }} />
      <span className="dash-h" style={{ width: "100%" }} />
    </div>
  );
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-coupled reveal: the element resolves as it crosses the lower part of
 * the viewport, tied to scroll position rather than to a fixed duration. Unlike
 * `Reveal` it can be scrubbed back and forth, so the section assembles under the
 * reader's own scrolling. Transform and opacity only, and no pin: the wheel
 * keeps control of the page.
 */
export function Scrub({
  children,
  start = 0.94,
  end = 0.58,
  y = 44,
  className = "",
  style,
}: {
  children: ReactNode;
  /** Viewport fraction where the element begins to resolve (1 = the very bottom). */
  start?: number;
  /** Viewport fraction where it is fully resolved. */
  end?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = Math.max(1, (start - end) * vh);
      const p = Math.min(1, Math.max(0, (start * vh - rect.top) / span));
      el.style.opacity = String(p);
      el.style.transform = p === 1 ? "none" : `translateY(${(1 - p) * y}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [start, end, y]);

  return (
    <div ref={ref} className={`scrub ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

/**
 * The words of a heading resolving out of blur as the reader scrolls through
 * them, one after the next, rather than all at once on entry.
 */
export function ScrubText({
  text,
  start = 0.9,
  end = 0.45,
  className = "",
  style,
}: {
  text: string;
  start?: number;
  end?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const units = [...host.querySelectorAll<HTMLElement>(".u")];
    if (!units.length) return;

    if (reducedMotion()) {
      units.forEach((u) => {
        u.style.opacity = "1";
        u.style.filter = "none";
        u.style.transform = "none";
      });
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = Math.max(1, (start - end) * vh);
      const p = Math.min(1, Math.max(0, (start * vh - rect.top) / span));
      // Each word owns a slice of the range, with the slices overlapping so the
      // line reads as one sweep rather than a row of separate fades.
      const slice = 1 / (units.length + 1);
      units.forEach((u, i) => {
        const local = Math.min(1, Math.max(0, (p - i * slice) / (slice * 2)));
        u.style.opacity = String(local);
        u.style.filter = local === 1 ? "none" : `blur(${(1 - local) * 12}px)`;
        u.style.transform = local === 1 ? "none" : `translateY(${(1 - local) * 12}px)`;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [start, end, text]);

  return (
    <span ref={ref} className={`scrub-text ${className}`.trim()} style={style}>
      {words.flatMap((word, w) => [
        ...(w > 0 ? [<span key={`s${w}`}> </span>] : []),
        <span key={w} className="u" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {word}
        </span>,
      ])}
    </span>
  );
}
