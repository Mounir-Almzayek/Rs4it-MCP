import type { Metadata } from "next";
import { Outfit, DM_Sans, JetBrains_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { LayoutSwitcher } from "@/components/layout/layout-switcher";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RS4IT MCP Hub",
  description: "Manage MCP tools, skills, and plugins",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${ibmPlexArabic.variable} font-body`}
      >
        <Providers>
          <LayoutSwitcher>{children}</LayoutSwitcher>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
