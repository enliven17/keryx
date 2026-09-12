import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Keryx — get paid for waiting",
  description:
    "Your AI coding agent is thinking. Now it's earning. Sponsored messages settle on-chain in USDC. One human, one earner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Scroll reveals hide their content until JS reveals it. If JS never runs
            the page must still be readable, so the hidden state is gated on this.
            It is a data attribute rather than a class because React renders the
            class on <html> and would flag the difference as a hydration mismatch. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.js='1'" }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
