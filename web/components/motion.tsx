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
      {words.map((word, w) => (
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
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
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
