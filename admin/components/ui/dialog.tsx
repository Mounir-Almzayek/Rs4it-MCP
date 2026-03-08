"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: DialogProps) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={title ? "dialog-title" : undefined}
        className={cn(
          "relative z-50 max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border bg-card p-6 shadow-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b pb-4">
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className={title ? "pt-4" : undefined}>{children}</div>
      </div>
    </div>
  );
}
