"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  loading?: boolean;
}

export function ConfirmDelete({ open, onClose, onConfirm, name, loading }: ConfirmDeleteProps) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }} title={t("delete")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium">{t("deleteConfirm", { name })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("deleteConfirmDesc")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? t("loading") : t("delete")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
