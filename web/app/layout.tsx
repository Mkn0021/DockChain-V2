import "./globals.css";
import type { Metadata } from "next";

import { AlertProvider } from "@/components/providers/AlertProvider";

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
    <html lang="en">
      <body className="antialiased">
        <AlertProvider>{children}</AlertProvider>
      </body>
    </html>
  );
}
