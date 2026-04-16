import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "./providers";

const instrumentSerif = localFont({
  src: "../public/fonts/InstrumentSerif-Regular.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Inter-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Inter-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../public/fonts/JetBrainsMono-Regular.ttf",
  variable: "--font-mono",
  display: "swap",
  weight: "400",
});

const ibmPlexArabic = localFont({
  src: [
    { path: "../public/fonts/IBMPlexSansArabic-400.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/IBMPlexSansArabic-500.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/IBMPlexSansArabic-600.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/IBMPlexSansArabic-700.ttf", weight: "700", style: "normal" },
  ],
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
        className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} ${ibmPlexArabic.variable} font-body`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
