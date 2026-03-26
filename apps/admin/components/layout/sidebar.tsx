"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Puzzle,
  FileText,
  BookOpen,
  MessageSquare,
  Sparkles,
  Shield,
  Users,
  BarChart3,
  LineChart,
  Grid3X3,
  ListTree,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Registry",
    items: [
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/skills", label: "Skills", icon: Sparkles },
      { href: "/plugins", label: "Plugins", icon: Puzzle },
      { href: "/prompts", label: "Prompts", icon: MessageSquare },
      { href: "/resources", label: "Resources", icon: FileText },
      { href: "/rules", label: "Rules", icon: BookOpen },
    ],
  },
  {
    label: "Access & roles",
    items: [
      { href: "/roles", label: "Roles", icon: Shield },
      { href: "/permissions", label: "Permissions Matrix", icon: Grid3X3 },
      { href: "/mcp-users", label: "MCP Users", icon: Users },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/usage", label: "Usage", icon: BarChart3 },
      { href: "/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/registry", label: "Registry Preview", icon: ListTree },
      { href: "/status", label: "System Status", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <div className="border-b p-4">
        <Link href="/" className="flex flex-col items-center gap-1.5">
          <Image
            src="/icon.svg"
            alt="RS4IT MCP Hub"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="text-center text-xs font-medium text-muted-foreground leading-tight">
            One hub for all your MCP
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <div className="flex flex-col gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            Dashboard
          </Link>
        </div>
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
