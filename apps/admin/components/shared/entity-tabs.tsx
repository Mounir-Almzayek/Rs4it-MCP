"use client";

import { cn } from "@/lib/utils";

export type EntityTab = "list" | "marketplace";

interface EntityTabsProps {
  tab: EntityTab;
  onTabChange: (t: EntityTab) => void;
  listLabel: string;
  marketplaceLabel: string;
  className?: string;
}

export function EntityTabs({
  tab,
  onTabChange,
  listLabel,
  marketplaceLabel,
  className,
}: EntityTabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-border", className)}>
      <button
        type="button"
        onClick={() => onTabChange("list")}
        className={cn(
          "relative px-4 py-2 text-sm font-medium transition-colors",
          tab === "list"
            ? "text-foreground after:absolute after:bottom-0 after:start-0 after:h-[1.5px] after:w-full after:bg-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {listLabel}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("marketplace")}
        className={cn(
          "relative px-4 py-2 text-sm font-medium transition-colors",
          tab === "marketplace"
            ? "text-foreground after:absolute after:bottom-0 after:start-0 after:h-[1.5px] after:w-full after:bg-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {marketplaceLabel}
      </button>
    </div>
  );
}
