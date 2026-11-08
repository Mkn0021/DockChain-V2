import "./globals.css";
import { MotionConfig } from "motion/react";

import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { AppWagmiProvider } from "@/components/providers/wagmi-provider";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DockChain",
  description: "Blockchain-based document signing and storage solution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black" suppressHydrationWarning>
      <body className="antialiased">
        <AppWagmiProvider>
          <QueryProvider>
            <ToastProvider>
              <MotionConfig reducedMotion="user">{children}</MotionConfig>
            </ToastProvider>
          </QueryProvider>
        </AppWagmiProvider>
      </body>
    </html>
  );
}
