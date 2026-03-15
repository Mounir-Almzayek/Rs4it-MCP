"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Sparkles,
  Puzzle,
  MessageSquare,
  FileText,
  Shield,
  Users,
  BarChart3,
  Grid3X3,
  ListTree,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/prompts", label: "Prompts", icon: MessageSquare },
  { href: "/resources", label: "Resources", icon: FileText },
  { href: "/roles", label: "Roles", icon: Shield },
  { href: "/mcp-users", label: "MCP Users", icon: Users },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/permissions", label: "Permissions Matrix", icon: Grid3X3 },
  { href: "/registry", label: "Registry Preview", icon: ListTree },
  { href: "/status", label: "System Status", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
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
      </nav>
    </aside>
  );
}
