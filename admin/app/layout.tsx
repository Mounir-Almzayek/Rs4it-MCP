import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/toast";
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
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar />
              <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
