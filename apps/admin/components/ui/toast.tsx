"use client";

import { useToast as useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-4 end-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 rounded-md border px-4 py-3 shadow-sm",
            t.type === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-900",
            t.type === "error" && "border-red-200 bg-red-50 text-red-900",
            t.type === "info" && "border-border bg-background text-foreground"
          )}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => remove(t.id)}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
