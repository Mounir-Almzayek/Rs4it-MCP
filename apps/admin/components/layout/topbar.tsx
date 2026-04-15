"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar({ title, className }: { title?: string; className?: string }) {
  const t = useTranslations("nav");
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
        "flex h-14 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6",
        className
      )}
    >
      <h1 className="font-display text-lg font-semibold tracking-tight">
        {title ?? "RS4IT MCP Hub"}
      </h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLocale}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          {locale === "en" ? "عربي" : "EN"}
        </Button>

        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>

        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            env === "production"
              ? "bg-success/10 text-success"
              : "bg-primary/10 text-primary"
          )}
        >
          {env}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Log out"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
