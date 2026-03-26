import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { LayoutSwitcher } from "@/components/layout/layout-switcher";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RS4IT MCP Hub — Admin",
  description: "Manage MCP tools, skills, and plugins",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LayoutSwitcher>{children}</LayoutSwitcher>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
