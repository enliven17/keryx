"use client";

import { ReactNode, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { privyConfig, privyEnabled, PRIVY_APP_ID } from "@/lib/privy";
import { privyWagmiConfig, wagmiConfig } from "@/lib/wagmi";
import { ToasterProvider } from "@/components/Toaster";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // privyEnabled is inlined at build time, so the branch never changes at runtime.
  if (!privyEnabled) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToasterProvider>{children}</ToasterProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={privyWagmiConfig}>
          <ToasterProvider>{children}</ToasterProvider>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
