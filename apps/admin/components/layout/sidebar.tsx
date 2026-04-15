"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, Wrench, Sparkles, Puzzle, MessageSquare, Bot,
  TerminalSquare, FileText, BookOpen, Shield, Grid3X3, Users,
  BarChart3, LineChart, ListTree, Activity, Settings, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { labelKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    labelKey: "registryGroup",
    items: [
      { href: "/tools", labelKey: "tools", icon: Wrench },
      { href: "/skills", labelKey: "skills", icon: Sparkles },
      { href: "/plugins", labelKey: "plugins", icon: Puzzle },
      { href: "/prompts", labelKey: "prompts", icon: MessageSquare },
      { href: "/subagents", labelKey: "subagents", icon: Bot },
      { href: "/commands", labelKey: "commands", icon: TerminalSquare },
      { href: "/resources", labelKey: "resources", icon: FileText },
      { href: "/rules", labelKey: "rules", icon: BookOpen },
    ],
  },
  {
    labelKey: "accessGroup",
    items: [
      { href: "/roles", labelKey: "roles", icon: Shield },
      { href: "/permissions", labelKey: "permissions", icon: Grid3X3 },
      { href: "/mcp-users", labelKey: "mcpUsers", icon: Users },
    ],
  },
  {
    labelKey: "analyticsGroup",
    items: [
      { href: "/usage", labelKey: "usage", icon: BarChart3 },
      { href: "/analytics", labelKey: "analytics", icon: LineChart },
    ],
  },
  {
    labelKey: "systemGroup",
    items: [
      { href: "/sync", labelKey: "sync", icon: RefreshCw },
      { href: "/registry", labelKey: "registry", icon: ListTree },
      { href: "/status", labelKey: "status", icon: Activity },
      { href: "/settings", labelKey: "settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-e border-border bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="border-b border-border p-4">
        <Link href="/" className="flex flex-col items-center gap-2">
          <div className="relative">
            <Image
              src="/icon.svg"
              alt="RS4IT MCP Hub"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <div className="absolute -inset-1 -z-10 rounded-xl bg-primary/10 blur-sm" />
          </div>
          <span className="text-center text-[11px] font-medium text-muted-foreground leading-tight">
            MCP Hub
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        {/* Dashboard */}
        <div>
          <Link
            href="/"
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              pathname === "/"
                ? "bg-primary/10 text-primary glow-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {pathname === "/" && (
              <div className="sidebar-active-bar absolute inset-y-1 start-0 w-[3px] rounded-full" />
            )}
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {t("dashboard")}
          </Link>
        </div>

        {/* Groups */}
        {navGroups.map((group) => (
          <div key={group.labelKey} className="flex flex-col gap-0.5">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {t(group.labelKey)}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <div className="sidebar-active-bar absolute inset-y-0.5 start-0 w-[3px] rounded-full" />
                  )}
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
