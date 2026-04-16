"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar({ title, className }: { title?: string; className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const env = process.env.NODE_ENV ?? "development";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/${locale}/login`;
  }

  function toggleLocale() {
    const next = locale === "en" ? "ar" : "en";
    router.replace(pathname, { locale: next });
  }

  return (
    <header
      className={cn(
        "flex h-12 items-center justify-between border-b border-border bg-background px-6",
        className
      )}
    >
      <h1 className="font-display text-lg tracking-tight text-foreground">
        {title ?? "RS4IT MCP Hub"}
      </h1>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLocale}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-3.5 w-3.5" />
          {locale === "en" ? "عربي" : "EN"}
        </Button>

        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </Link>

        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-medium",
            env === "production"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {env}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label={t("logOut")}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
