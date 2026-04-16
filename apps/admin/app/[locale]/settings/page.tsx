"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Settings, Download, Upload } from "lucide-react";

async function fetchUsername() {
  const res = await fetch("/api/auth/credentials");
  if (!res.ok) throw new Error("Failed to load");
  const d = await res.json();
  return (d as { username?: string }).username ?? "";
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tl = useTranslations("login");
  const queryClient = useQueryClient();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: username, isLoading } = useQuery({
    queryKey: ["auth", "credentials"],
    queryFn: fetchUsername,
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (payload: {
      currentPassword: string;
      newUsername?: string;
      newPassword?: string;
      confirmNewPassword?: string;
    }) => {
      const res = await fetch("/api/auth/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? t("updateFailed"));
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "credentials"] });
      toast.add("success", t("credentialsUpdated"));
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      if (variables.newUsername) {
        toast.add("info", t("signInAgainUsername"));
      }
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const exportDbMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/export");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? t("exportFailed"));
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `rs4it-hub-backup-${new Date().toISOString().slice(0, 10)}.db`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.add("success", t("dbExported")),
    onError: (e: Error) => toast.add("error", e.message),
  });

  const importDbMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error(t("noImportFile"));
      const buffer = await importFile.arrayBuffer();
      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: buffer,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? t("importFailed"));
      }
    },
    onSuccess: () => {
      toast.add("success", t("dbImported"));
      setImportFile(null);
      if (importFileRef.current) importFileRef.current.value = "";
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.add("error", t("enterUsername"));
      return;
    }
    if (!currentPassword) {
      toast.add("error", t("currentRequired"));
      return;
    }
    updateCredentialsMutation.mutate({
      currentPassword,
      newUsername: newUsername.trim(),
    });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.add("error", t("currentRequired"));
      return;
    }
    if (newPassword.length < 6) {
      toast.add("error", tl("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.add("error", t("passwordMismatchNew"));
      return;
    }
    updateCredentialsMutation.mutate({
      currentPassword,
      newPassword,
      confirmNewPassword: confirmPassword,
    });
  }


  return (
    <div className="page-enter space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("changeUsername")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("currentUsername", { value: isLoading ? "…" : username ?? "—" })}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeUsername} className="max-w-sm space-y-4">
            <div>
              <Label htmlFor="current-password-username">{t("currentPassword")}</Label>
              <Input
                id="current-password-username"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="new-username">{t("newUsernameLabel")}</Label>
              <Input
                id="new-username"
                type="text"
                autoComplete="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={username ?? "admin"}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={updateCredentialsMutation.isPending || !newUsername.trim()}
            >
              {t("updateUsername")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("changePasswordCardDesc")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <div>
              <Label htmlFor="current-password-pw">{t("currentPassword")}</Label>
              <Input
                id="current-password-pw"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={
                updateCredentialsMutation.isPending ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword
              }
            >
              {t("updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("dbExportTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("dbExportDesc")}</p>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={() => exportDbMutation.mutate()}
            disabled={exportDbMutation.isPending}
          >
            {exportDbMutation.isPending ? t("exporting") : t("dbExportBtn")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("dbImportTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("dbImportDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-2">
            <Label htmlFor="db-import-file">{t("dbFileLabel")}</Label>
            <Input
              ref={importFileRef}
              id="db-import-file"
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("dbImportWarning")}</p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => importDbMutation.mutate()}
            disabled={importDbMutation.isPending || !importFile}
          >
            {importDbMutation.isPending ? t("importing") : t("dbImportBtn")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
