"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

function LoginContent() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setConfigured(d.configured ?? false))
      .catch(() => setConfigured(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Invalid credentials");
        return;
      }
      window.location.href = from;
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Setup failed";
        if (res.status === 400 && msg === "Admin already configured") {
          window.location.href = "/login";
          return;
        }
        setError(msg);
        return;
      }
      window.location.href = "/";
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        setError(
          "Request timed out. Setup can take a few seconds; try again. If using Docker, check that the admin container can write to the config volume.",
        );
      } else {
        setError("Network error. Check the server and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (configured === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  const isSetup = !configured;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md border-border bg-background shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
            <Shield className="h-6 w-6 text-foreground" />
          </div>
          <CardTitle className="font-display text-xl">
            {isSetup ? t("setupTitle") : t("title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{isSetup ? t("setupSubtitle") : t("subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSetup ? handleSetup : handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            )}
            <div>
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSetup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                disabled={loading}
              />
            </div>
            {isSetup && (
              <div>
                <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1"
                  disabled={loading}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("pleaseWait") : isSetup ? t("createAccount") : t("signIn")}
            </Button>
            {isSetup && <p className="text-center text-xs text-muted-foreground">{t("setupNote")}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  const tc = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">{tc("loading")}</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
