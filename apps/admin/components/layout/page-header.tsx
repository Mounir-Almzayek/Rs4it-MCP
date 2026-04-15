"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  createLabel?: string;
  onCreate?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, createLabel, onCreate, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        {onCreate && createLabel && (
          <Button onClick={onCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
