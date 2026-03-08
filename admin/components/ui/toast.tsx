"use client";

import { useEffect } from "react";
import { useToast as useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg",
            t.type === "success" && "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30",
            t.type === "error" && "border-destructive/50 bg-destructive/10",
            t.type === "info" && "border-primary/50 bg-primary/10"
          )}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => remove(t.id)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
