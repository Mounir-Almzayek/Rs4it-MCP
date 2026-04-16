"use client";

import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/lib/toast";
import { RefreshCw, Download, Upload, Check, AlertTriangle, XCircle } from "lucide-react";

interface SyncFile {
  filePath: string;
  entityType: string;
  entityName: string;
  status: "synced" | "modified" | "conflict" | "new";
  lastSync?: string;
}

export default function SyncPage() {
  const t = useTranslations("sync");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, refetch } = useQuery<{ files: SyncFile[] }>({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/sync/status");
      return res.json();
    },
  });

  const importMut = useMutation({
    mutationFn: async (files?: string[]) => {
      const res = await fetch("/api/sync/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error(t("importFailed"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-status"] });
      toast.add("success", t("importSuccess"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync/export", { method: "POST" });
      if (!res.ok) throw new Error(t("exportFailed"));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-status"] });
      toast.add("success", t("exportSuccess"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const files = data?.files ?? [];
  const modified = files.filter((f) => f.status === "modified");

  const statusIcon = {
    synced: <Check className="h-3.5 w-3.5 text-success" />,
    modified: <AlertTriangle className="h-3.5 w-3.5 text-primary" />,
    conflict: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    new: <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  const statusVariant = {
    synced: "success" as const,
    modified: "default" as const,
    conflict: "destructive" as const,
    new: "secondary" as const,
  };

  const statusLabel = (s: SyncFile["status"]) => {
    if (s === "new") return t("new");
    return t(s);
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {t("check")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => importMut.mutate(undefined)}
              disabled={modified.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              {t("importAll")}
            </Button>
            <Button variant="secondary" onClick={() => exportMut.mutate()} className="gap-1.5">
              <Upload className="h-4 w-4" />
              {t("exportAll")}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState icon={RefreshCw} message={t("noFiles")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{tc("status")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("filePath")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("entityType")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("entityName")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("lastSync")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr
                  key={file.filePath}
                  className="animate-card-reveal border-b border-border transition-colors hover:bg-secondary/30"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[file.status]} className="gap-1">
                      {statusIcon[file.status]}
                      {statusLabel(file.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{file.filePath}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{file.entityType}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{file.entityName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {file.lastSync ? new Date(file.lastSync).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {file.status === "modified" && (
                      <Button variant="ghost" size="sm" onClick={() => importMut.mutate([file.filePath])}>
                        {t("importToDb")}
                      </Button>
                    )}
                    {file.status === "conflict" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => importMut.mutate([file.filePath])}
                      >
                        {t("resolve")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
