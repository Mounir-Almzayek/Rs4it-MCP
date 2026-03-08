"use client";

import { cn } from "@/lib/utils";

export function Topbar({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  const env = process.env.NODE_ENV ?? "development";

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
      </div>
    </header>
  );
}
