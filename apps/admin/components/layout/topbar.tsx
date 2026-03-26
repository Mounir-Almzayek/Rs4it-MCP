"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Topbar({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  const router = useRouter();
  const env = process.env.NODE_ENV ?? "development";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b bg-card px-6",
        className
      )}
    >
      <h1 className="text-lg font-semibold">
        {title ?? "RS4IT MCP Hub — Admin"}
      </h1>
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            Settings
          </Button>
        </Link>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            env === "production"
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
          )}
        >
          {env}
        </span>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
