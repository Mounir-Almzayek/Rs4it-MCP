"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, ChevronDown } from "lucide-react";
import type { RoleDefinition } from "@/lib/roles";

interface AllowedRolesPickerProps {
  roles: RoleDefinition[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
  /** Entity type for helper text */
  entityLabel?: string;
}

export function AllowedRolesPicker({
  roles,
  value,
  onChange,
  disabled,
  className,
  entityLabel = "This",
}: AllowedRolesPickerProps) {
  const selectedIds = useMemo(() => new Set(value ?? []), [value]);
  const available = roles.filter((r) => !selectedIds.has(r.id));

  function add(id: string) {
    if (selectedIds.has(id)) return;
    onChange([...(value ?? []), id]);
  }

  function remove(id: string) {
    onChange((value ?? []).filter((x) => x !== id));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">Allowed Roles</Label>
      <p className="text-xs text-muted-foreground">
        {entityLabel} is visible only to selected roles. Leave empty for &quot;Visible to all roles&quot;.
      </p>
      <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2 min-h-[44px]">
        {(value ?? []).length === 0 ? (
          <span className="text-sm text-muted-foreground py-1.5">Visible to all roles</span>
        ) : (
          (value ?? []).map((id) => {
            const role = roles.find((r) => r.id === id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                {role?.name ?? id}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  disabled={disabled}
                  className="rounded-full p-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Remove ${id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })
        )}
      </div>
      {available.length > 0 && (
        <div className="relative group">
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) add(v);
              e.target.value = "";
            }}
            disabled={disabled}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 appearance-none pr-8"
            aria-label="Add role"
          >
            <option value="">Add role…</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? r.id}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      )}
    </div>
  );
}
