"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/switch";

async function fetchUsername() {
  const res = await fetch("/api/auth/credentials");
  if (!res.ok) throw new Error("Failed to load");
  const d = await res.json();
  return (d as { username?: string }).username ?? "";
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [exportRoles, setExportRoles] = useState(true);
  const [exportDynamicRegistry, setExportDynamicRegistry] = useState(true);
  const [exportMcpPlugins, setExportMcpPlugins] = useState(true);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importIncludeRoles, setImportIncludeRoles] = useState(true);
  const [importIncludeDynamicRegistry, setImportIncludeDynamicRegistry] = useState(true);
  const [importIncludeMcpPlugins, setImportIncludeMcpPlugins] = useState(true);
  const [importPreviewLoaded, setImportPreviewLoaded] = useState(false);

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
        throw new Error((d as { error?: string }).error ?? "Update failed");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "credentials"] });
      toast.add("success", "Credentials updated");
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      if (variables.newUsername) {
        toast.add("info", "Sign in again with your new username");
      }
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const exportSettingsMutation = useMutation({
    mutationFn: async () => {
      const include: string[] = [];
      if (exportRoles) include.push("roles");
      if (exportDynamicRegistry) include.push("dynamicRegistry");
      if (exportMcpPlugins) include.push("mcpPlugins");
      const res = await fetch("/api/settings/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rs4it-hub-settings.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.add("success", "Settings exported");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const importSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("No file selected");
      const text = await importFile.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file");
      }
      const payload = parsed as {
        items?: { roles?: unknown; dynamicRegistry?: unknown; mcpPlugins?: unknown };
      };
      if (!payload.items) {
        throw new Error("File does not contain items");
      }
      const include: string[] = [];
      if (importIncludeRoles && payload.items.roles !== undefined) include.push("roles");
      if (importIncludeDynamicRegistry && payload.items.dynamicRegistry !== undefined)
        include.push("dynamicRegistry");
      if (importIncludeMcpPlugins && payload.items.mcpPlugins !== undefined)
        include.push("mcpPlugins");
      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          include,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Import failed");
      }
      return (await res.json()) as { applied?: string[] };
    },
    onSuccess: (data) => {
      const applied = data.applied ?? [];
      toast.add(
        "success",
        applied.length > 0
          ? `Imported: ${applied.join(", ")}`
          : "Import completed (no items applied)"
      );
      setImportFile(null);
      setImportPreviewLoaded(false);
      setImportIncludeRoles(true);
      setImportIncludeDynamicRegistry(true);
      setImportIncludeMcpPlugins(true);
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.add("error", "Enter a new username");
      return;
    }
    if (!currentPassword) {
      toast.add("error", "Current password is required");
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
      toast.add("error", "Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.add("error", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.add("error", "New password and confirmation do not match");
      return;
    }
    updateCredentialsMutation.mutate({
      currentPassword,
      newPassword,
      confirmNewPassword: confirmPassword,
    });
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImportFile(file ?? null);
    setImportPreviewLoaded(false);
    if (!file) return;
    file
      .text()
      .then((text) => {
        try {
          const parsed = JSON.parse(text) as {
            items?: { roles?: unknown; dynamicRegistry?: unknown; mcpPlugins?: unknown };
          };
          const items = parsed.items ?? {};
          const hasRoles = items.roles !== undefined;
          const hasDynamic = items.dynamicRegistry !== undefined;
          const hasPlugins = items.mcpPlugins !== undefined;
          setImportIncludeRoles(hasRoles);
          setImportIncludeDynamicRegistry(hasDynamic);
          setImportIncludeMcpPlugins(hasPlugins);
          setImportPreviewLoaded(true);
        } catch {
          setImportPreviewLoaded(false);
          toast.add("error", "Invalid settings file");
        }
      })
      .catch(() => {
        setImportPreviewLoaded(false);
        toast.add("error", "Failed to read file");
      });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Change admin username and password. Passwords are stored hashed only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Change username
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Current username: {isLoading ? "…" : username ?? "—"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeUsername} className="max-w-sm space-y-4">
            <div>
              <Label htmlFor="current-password-username">Current password</Label>
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
              <Label htmlFor="new-username">New username</Label>
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
              Update username
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter current password and choose a new one (at least 6 characters).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <div>
              <Label htmlFor="current-password-pw">Current password</Label>
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
              <Label htmlFor="new-password">New password</Label>
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
              <Label htmlFor="confirm-password">Confirm new password</Label>
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
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download a JSON snapshot of roles, dynamic registry, and MCP plugins. You can import
            it later into another Hub instance.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Include in export</p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={exportRoles}
                  onCheckedChange={(v) => setExportRoles(Boolean(v))}
                />
                <span>Roles configuration (roles.json)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={exportDynamicRegistry}
                  onCheckedChange={(v) => setExportDynamicRegistry(Boolean(v))}
                />
                <span>Dynamic registry (tools, skills, plugins, prompts, resources)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={exportMcpPlugins}
                  onCheckedChange={(v) => setExportMcpPlugins(Boolean(v))}
                />
                <span>MCP plugins registry (mcp_plugins.json)</span>
              </label>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => exportSettingsMutation.mutate()}
            disabled={
              exportSettingsMutation.isPending ||
              (!exportRoles && !exportDynamicRegistry && !exportMcpPlugins)
            }
          >
            {exportSettingsMutation.isPending ? "Exporting…" : "Export selected settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Import settings from a JSON file previously exported from this Hub. Selected items will
            overwrite existing configuration. Consider exporting a backup first.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="settings-import-file">Settings file (.json)</Label>
            <Input
              id="settings-import-file"
              type="file"
              accept="application/json"
              onChange={handleImportFileChange}
            />
          </div>

          {importFile && importPreviewLoaded && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Apply from file</p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={importIncludeRoles}
                    onCheckedChange={(v) => setImportIncludeRoles(Boolean(v))}
                  />
                  <span>Roles configuration</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={importIncludeDynamicRegistry}
                    onCheckedChange={(v) => setImportIncludeDynamicRegistry(Boolean(v))}
                  />
                  <span>Dynamic registry</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={importIncludeMcpPlugins}
                    onCheckedChange={(v) => setImportIncludeMcpPlugins(Boolean(v))}
                  />
                  <span>MCP plugins registry</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Import will overwrite existing data for the selected items. Usage history and MCP
                users are not affected.
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="destructive"
            onClick={() => importSettingsMutation.mutate()}
            disabled={
              importSettingsMutation.isPending ||
              !importFile ||
              (!importIncludeRoles && !importIncludeDynamicRegistry && !importIncludeMcpPlugins)
            }
          >
            {importSettingsMutation.isPending ? "Importing…" : "Import selected settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
