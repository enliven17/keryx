"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";
import { WalletButton } from "./WalletButton";
import { BalancePill } from "./BalancePill";

const links = [
  { href: "/earn", label: "Earn" },
  { href: "/advertise", label: "Advertise" },
  { href: "/auction", label: "Live Auction" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--color-border)",
        background: "rgba(251,251,252,0.85)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <Logo />
        <div style={{ display: "flex", gap: "1.25rem", flex: 1 }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: path.startsWith(l.href) ? 700 : 500,
                color: path.startsWith(l.href) ? "var(--color-text)" : "var(--color-text-dim)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <BalancePill />
        <WalletButton />
      </div>
    </nav>
  );
}
