"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileArchive, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/lib/toast";

interface UploadResult {
  created: string[];
  updated: string[];
  errors: string[];
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const t = useTranslations("skills");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".zip")) setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/skills/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add("error", data.error ?? t("uploadFailed"));
        return;
      }
      setResult(data);
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.add(
        "success",
        t("uploadSuccess", { created: data.created.length, updated: data.updated.length })
      );
    } catch (err) {
      toast.add("error", (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()} title={t("upload")}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("uploadDesc")}</p>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border py-10 transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          {file ? (
            <>
              <FileArchive className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("dropzone")}</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".zip" onChange={handleFileChange} className="hidden" />

        {result && (
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            {result.created.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                {t("created")}: {result.created.join(", ")}
              </div>
            )}
            {result.updated.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <AlertCircle className="h-4 w-4" />
                {t("updated")}: {result.updated.join(", ")}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {t("errors")}: {result.errors.join("; ")}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {tc("close")}
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? t("importing") : tc("upload")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
