"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  enabled: boolean;
}

export function StatusBadge({ enabled }: StatusBadgeProps) {
  const t = useTranslations("common");
  return (
    <Badge variant={enabled ? "success" : "secondary"}>
      {enabled ? t("enabled") : t("disabled")}
    </Badge>
  );
}
