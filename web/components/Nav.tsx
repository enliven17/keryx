"use client";

import { Navbar } from "./Navbar";
import { WalletButton } from "./WalletButton";
import { BalancePill } from "./BalancePill";

const links = [
  { href: "/earn", label: "Earn" },
  { href: "/advertise", label: "Advertise" },
  { href: "/auction", label: "Live auction" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav() {
  return (
    <>
      <Navbar
        links={links}
        right={
          <>
            <BalancePill />
            <WalletButton />
          </>
        }
      />
      {/* The bar is fixed, so the page owes it its height. */}
      <div className="nav-offset" aria-hidden />
    </>
  );
}
