"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Settings } from "lucide-react";

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
    </div>
  );
}
