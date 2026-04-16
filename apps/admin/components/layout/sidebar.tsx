"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, Wrench, Sparkles, Puzzle, MessageSquare, Bot,
  TerminalSquare, FileText, BookOpen, Shield, Grid3X3, Users,
  BarChart3, LineChart, Settings, RefreshCw,
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
      { href: "/settings", labelKey: "settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-e border-border bg-background">
      {/* Logo */}
      <div className="border-b border-border px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/icon.svg"
            alt="RS4IT MCP Hub"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="font-display text-base text-foreground">
            MCP Hub
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        {/* Dashboard */}
        <div>
          <Link
            href="/"
            className={cn(
              "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {pathname === "/" && (
              <div className="sidebar-active-bar absolute inset-y-1 start-0 w-[2px] rounded-full" />
            )}
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {t("dashboard")}
          </Link>
        </div>

        {/* Groups */}
        {navGroups.map((group) => (
          <div key={group.labelKey} className="flex flex-col gap-0.5">
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                    "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <div className="sidebar-active-bar absolute inset-y-0.5 start-0 w-[2px] rounded-full" />
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
