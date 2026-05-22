import type { Metadata } from "next";
import RouteHistoryTracker from "@/components/navigation/RouteHistoryTracker";
import ExtensionGuardScript from "@/components/settings/ExtensionGuardScript";
import ThemeScript from "@/components/settings/ThemeScript";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: {
    default: "GrantOS",
    template: "%s · GrantOS",
  },
  description: "Onchain grant enforcement protocol built on Arbitrum.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <ExtensionGuardScript />
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100" suppressHydrationWarning>
        <Web3Provider>
          <Suspense fallback={null}>
            <RouteHistoryTracker />
          </Suspense>
          <main className="flex min-h-screen flex-1 flex-col">
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}
