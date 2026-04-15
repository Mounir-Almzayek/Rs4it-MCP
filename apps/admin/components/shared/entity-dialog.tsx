"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EntityDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function EntityDialog({ open, onClose, title, onSubmit, loading, children }: EntityDialogProps) {
  const t = useTranslations("common");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("loading") : t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
