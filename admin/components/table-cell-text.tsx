"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TRUNCATE_LEN = 60;

interface TableCellTextProps {
  text: string | undefined | null;
  /** Optional label for the dialog title (e.g. "Description") */
  label?: string;
  className?: string;
  /** Max width class for the cell, e.g. max-w-[200px] */
  maxWidthClass?: string;
}

export function TableCellText({
  text,
  label,
  className,
  maxWidthClass = "max-w-[200px]",
}: TableCellTextProps) {
  const [open, setOpen] = useState(false);
  const value = text ?? "";
  const isLong = value.length > TRUNCATE_LEN;

  return (
    <td className={cn("p-3", className)}>
      <span className={cn("block truncate", maxWidthClass)} title={value || undefined}>
        {value || "—"}
      </span>
      {isLong && (
        <>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            Show more
          </Button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title={label ? `Full ${label}` : undefined}
            className="max-w-2xl"
          >
            <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {value}
            </pre>
          </Dialog>
        </>
      )}
    </td>
  );
}
