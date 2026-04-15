# Admin Refactor + Marketplace + i18n — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the admin dashboard with a Dark Luxury design system, bilingual support (AR/EN), shared components, skills upload, two-way .cursor sync, and a GitHub-based marketplace.

**Architecture:** Foundation-First — build infrastructure (design system + i18n), then refactor all pages using shared components, then add new features (upload, sync, marketplace). Each page follows the same decomposition: page shell + _components/ + _hooks/.

**Tech Stack:** Next.js 14, next-intl, Tailwind CSS, TanStack React Query, Zustand, Prisma/SQLite, JSZip, GitHub REST API, Google Fonts (Outfit, DM Sans, JetBrains Mono, IBM Plex Arabic)

**Spec:** `docs/superpowers/specs/2026-04-15-admin-refactor-marketplace-design.md`

---

## File Structure Overview

### New Files to Create

```
apps/admin/
├── messages/
│   ├── en.json
│   └── ar.json
├── i18n/
│   ├── request.ts
│   ├── routing.ts
│   └── navigation.ts
├── hooks/
│   ├── use-crud.ts
│   ├── use-debounce.ts
│   └── use-locale.ts
├── components/
│   └── shared/
│       ├── data-table.tsx
│       ├── entity-dialog.tsx
│       ├── entity-form.tsx
│       ├── confirm-delete.tsx
│       ├── search-input.tsx
│       ├── status-badge.tsx
│       ├── empty-state.tsx
│       ├── json-editor.tsx
│       ├── markdown-editor.tsx
│       └── marketplace-tab.tsx
│   └── layout/
│       └── page-header.tsx
├── app/
│   └── [locale]/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── login/page.tsx
│       ├── tools/
│       │   ├── page.tsx
│       │   ├── _components/
│       │   │   ├── tools-table.tsx
│       │   │   ├── tool-form.tsx
│       │   │   └── tool-dialog.tsx
│       │   └── _hooks/
│       │       └── use-tools.ts
│       ├── skills/
│       │   ├── page.tsx
│       │   ├── _components/ ...
│       │   └── _hooks/ ...
│       ├── (same pattern for all other pages)
│       ├── sync/
│       │   ├── page.tsx
│       │   ├── _components/ ...
│       │   └── _hooks/ ...
│       └── marketplace/
│           └── (embedded as tabs in each entity page)
```

### Files to Modify

```
apps/admin/
├── app/globals.css              # Dark Luxury theme CSS variables
├── app/layout.tsx               # Root layout (fonts, metadata only)
├── app/providers.tsx            # Add i18n provider wrapper
├── tailwind.config.ts           # New color tokens + font families
├── middleware.ts                 # Add next-intl locale detection
├── next.config.js               # Add next-intl plugin
├── package.json                 # Add dependencies
├── components/layout/sidebar.tsx # Redesign + i18n
├── components/layout/topbar.tsx  # Redesign + language switcher
├── components/ui/toast.tsx       # Dark theme update

apps/backend/
├── prisma/schema.prisma          # Add SyncState + InstalledPackage models
```

### Files to Delete (moved under [locale])

All current page files under `app/` will be replaced by versions under `app/[locale]/`. The old files are deleted after the new ones are confirmed working.

---

## LAYER 1: INFRASTRUCTURE

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/admin/package.json`

- [ ] **Step 1: Install next-intl and JSZip**

```bash
cd "apps/admin" && npm install next-intl jszip
```

- [ ] **Step 2: Verify package.json updated**

```bash
cat apps/admin/package.json | grep -E "next-intl|jszip"
```

Expected: Both packages appear in dependencies.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/package.json apps/admin/package-lock.json
git commit -m "chore: install next-intl and jszip dependencies"
```

---

### Task 2: Dark Luxury Design System — CSS Variables

**Files:**
- Modify: `apps/admin/app/globals.css`

- [ ] **Step 1: Replace globals.css with Dark Luxury theme**

Replace the entire content of `apps/admin/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Dark Luxury — base */
    --background: 240 6% 3.7%;         /* #09090b zinc-950 */
    --foreground: 0 0% 98%;            /* #fafafa zinc-50 */

    --card: 240 5.9% 10%;              /* #18181b zinc-900 */
    --card-foreground: 0 0% 98%;

    --popover: 240 5.9% 10%;
    --popover-foreground: 0 0% 98%;

    --primary: 29 47% 64%;             /* #d4a574 copper */
    --primary-foreground: 240 6% 3.7%;

    --secondary: 240 3.7% 15.9%;       /* #27272a zinc-800 */
    --secondary-foreground: 0 0% 98%;

    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;  /* #a1a1aa zinc-400 */

    --accent: 29 47% 64%;              /* copper */
    --accent-foreground: 240 6% 3.7%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;

    --success: 142 71% 45%;            /* #22c55e green-500 */
    --success-foreground: 0 0% 98%;

    --border: 240 3.7% 15.9%;          /* zinc-800 */
    --input: 240 3.7% 15.9%;
    --ring: 29 47% 64%;                /* copper */

    --border-subtle: 240 3.8% 46.1%;   /* zinc-600 for strong borders */

    --chart-1: 160 84% 39%;
    --chart-2: 29 47% 64%;
    --chart-3: 38 92% 50%;
    --chart-4: 189 94% 43%;
    --chart-5: 347 77% 50%;

    --radius: 0.625rem;
    --sidebar-width: 16rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}

/* Glow effect utility */
.glow-accent {
  box-shadow: 0 0 20px rgba(212, 165, 116, 0.1);
}

.glow-accent-strong {
  box-shadow: 0 0 30px rgba(212, 165, 116, 0.2);
}

/* Background gradient mesh */
.bg-mesh {
  background-image:
    radial-gradient(at 100% 0%, rgba(212, 165, 116, 0.05) 0%, transparent 50%),
    radial-gradient(at 0% 100%, rgba(212, 165, 116, 0.03) 0%, transparent 50%);
}

/* Staggered card reveal */
@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-card-reveal {
  animation: card-reveal 0.4s ease-out both;
}

/* Sidebar active bar */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.sidebar-active-bar {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6));
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

/* Smooth page transitions */
.page-enter {
  animation: page-fade-in 0.3s ease-out;
}

@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: hsl(var(--background));
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}
```

- [ ] **Step 2: Verify CSS loads correctly**

```bash
cd "apps/admin" && npx next build 2>&1 | head -20
```

Expected: Build completes without CSS errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/globals.css
git commit -m "style: replace design system with Dark Luxury theme"
```

---

### Task 3: Tailwind Config — Theme Tokens + Fonts

**Files:**
- Modify: `apps/admin/tailwind.config.ts`

- [ ] **Step 1: Update tailwind.config.ts with full theme**

Replace the entire content of `apps/admin/tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Outfit", "IBM Plex Arabic", "sans-serif"],
        body: ["DM Sans", "IBM Plex Arabic", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "card-reveal": "card-reveal 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/tailwind.config.ts
git commit -m "style: update tailwind config with Dark Luxury tokens and font families"
```

---

### Task 4: Font Setup — Root Layout

**Files:**
- Modify: `apps/admin/app/layout.tsx`

- [ ] **Step 1: Update root layout with new fonts**

Replace the entire content of `apps/admin/app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import { Outfit, DM_Sans, JetBrains_Mono, IBM_Plex_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RS4IT MCP Hub",
  description: "Manage MCP tools, skills, and plugins",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${ibmPlexArabic.variable} font-body`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

Note: We remove `lang` and `dir` from root — the `[locale]/layout.tsx` will set those. We also remove `LayoutSwitcher` from root — it moves into `[locale]/layout.tsx`.

- [ ] **Step 2: Commit**

```bash
git add apps/admin/app/layout.tsx
git commit -m "style: add Outfit, DM Sans, JetBrains Mono, IBM Plex Arabic fonts"
```

---

### Task 5: i18n Infrastructure — next-intl Setup

**Files:**
- Create: `apps/admin/i18n/routing.ts`
- Create: `apps/admin/i18n/request.ts`
- Create: `apps/admin/i18n/navigation.ts`
- Modify: `apps/admin/next.config.js`

- [ ] **Step 1: Create i18n/routing.ts**

Create `apps/admin/i18n/routing.ts`:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});
```

- [ ] **Step 2: Create i18n/request.ts**

Create `apps/admin/i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "ar")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create i18n/navigation.ts**

Create `apps/admin/i18n/navigation.ts`:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 4: Update next.config.js for next-intl**

Replace `apps/admin/next.config.js` with:

```javascript
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

module.exports = withNextIntl(nextConfig);
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/i18n/ apps/admin/next.config.js
git commit -m "feat: set up next-intl routing and config"
```

---

### Task 6: i18n — Translation Files

**Files:**
- Create: `apps/admin/messages/en.json`
- Create: `apps/admin/messages/ar.json`

- [ ] **Step 1: Create en.json**

Create `apps/admin/messages/en.json`:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "create": "Create",
    "edit": "Edit",
    "search": "Search...",
    "enable": "Enable",
    "disable": "Disable",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "loading": "Loading...",
    "noResults": "No results found",
    "confirm": "Confirm",
    "back": "Back",
    "close": "Close",
    "name": "Name",
    "description": "Description",
    "content": "Content",
    "actions": "Actions",
    "status": "Status",
    "source": "Source",
    "origin": "Origin",
    "updated": "Updated",
    "allowedRoles": "Allowed Roles",
    "allRoles": "Visible to all roles",
    "addRole": "Add role...",
    "upload": "Upload",
    "install": "Install",
    "update": "Update",
    "installed": "Installed",
    "refresh": "Refresh",
    "export": "Export",
    "import": "Import",
    "yes": "Yes",
    "no": "No",
    "readOnly": "Read-only",
    "admin": "Admin",
    "mcp": "MCP Plugin",
    "deleteConfirm": "Are you sure you want to delete \"{name}\"?",
    "deleteConfirmDesc": "This action cannot be undone."
  },
  "nav": {
    "dashboard": "Dashboard",
    "tools": "Tools",
    "skills": "Skills",
    "plugins": "Plugins",
    "prompts": "Prompts",
    "subagents": "Subagents",
    "commands": "Commands",
    "resources": "Resources",
    "rules": "Rules",
    "roles": "Roles",
    "permissions": "Permissions",
    "mcpUsers": "MCP Users",
    "usage": "Usage",
    "analytics": "Analytics",
    "registry": "Registry Preview",
    "status": "System Status",
    "settings": "Settings",
    "sync": "Sync",
    "marketplace": "Marketplace",
    "registryGroup": "Registry",
    "accessGroup": "Access & Roles",
    "analyticsGroup": "Analytics",
    "systemGroup": "System"
  },
  "dashboard": {
    "title": "Dashboard",
    "subtitle": "Overview of your MCP Hub",
    "quickActions": "Quick Actions",
    "totalTools": "Total Tools",
    "totalSkills": "Total Skills",
    "totalPlugins": "Total Plugins",
    "totalResources": "Total Resources",
    "totalRules": "Total Rules",
    "totalPrompts": "Total Prompts",
    "totalSubagents": "Total Subagents",
    "totalCommands": "Total Commands",
    "totalUsers": "Total Users",
    "totalRoles": "Total Roles",
    "updates": "Updates Available"
  },
  "tools": {
    "title": "Tools",
    "create": "Create Tool",
    "edit": "Edit Tool",
    "handler": "Handler Reference",
    "inputSchema": "Input Schema",
    "schemaPlaceholder": "JSON schema for tool input parameters"
  },
  "skills": {
    "title": "Skills",
    "create": "Create Skill",
    "edit": "Edit Skill",
    "upload": "Upload Skills",
    "uploadDesc": "Upload a .zip file containing skill folders",
    "contentPlaceholder": "Markdown content for this skill...",
    "definition": "Definition",
    "steps": "Steps",
    "dropzone": "Drag & drop a .zip file here, or click to browse",
    "preview": "Preview",
    "importing": "Importing...",
    "created": "Created",
    "updated": "Updated",
    "errors": "Errors",
    "skipExisting": "Skip existing",
    "updateExisting": "Update existing"
  },
  "plugins": {
    "title": "Plugins",
    "create": "Create Plugin",
    "edit": "Edit Plugin",
    "id": "Plugin ID",
    "command": "Command",
    "args": "Arguments",
    "cwd": "Working Directory",
    "env": "Environment",
    "timeout": "Timeout (ms)",
    "connected": "Connected",
    "failed": "Failed",
    "toolsCount": "{count} tools",
    "connectionError": "Connection Error"
  },
  "resources": {
    "title": "Resources",
    "create": "Create Resource",
    "edit": "Edit Resource",
    "uri": "URI",
    "mimeType": "MIME Type",
    "contentPlaceholder": "Resource content..."
  },
  "rules": {
    "title": "Rules",
    "create": "Create Rule",
    "edit": "Edit Rule",
    "globs": "Glob Patterns",
    "globsPlaceholder": "e.g., **/*.ts, src/**",
    "contentPlaceholder": "Markdown rule content..."
  },
  "prompts": {
    "title": "Prompts",
    "create": "Create Prompt",
    "edit": "Edit Prompt",
    "contentPlaceholder": "Prompt content..."
  },
  "subagents": {
    "title": "Subagents",
    "create": "Create Subagent",
    "edit": "Edit Subagent",
    "model": "Model",
    "readonly": "Read-only",
    "background": "Background",
    "contentPlaceholder": "Subagent prompt template..."
  },
  "commands": {
    "title": "Commands",
    "create": "Create Command",
    "edit": "Edit Command",
    "contentPlaceholder": "Command content..."
  },
  "roles": {
    "title": "Roles",
    "create": "Create Role",
    "edit": "Edit Role",
    "id": "Role ID",
    "inheritsFrom": "Inherits From",
    "defaultRole": "Default Role",
    "setDefault": "Set as default",
    "noDefault": "No default role"
  },
  "permissions": {
    "title": "Permissions Matrix",
    "capability": "Capability",
    "type": "Type",
    "noRoles": "No roles defined"
  },
  "mcpUsers": {
    "title": "MCP Users",
    "firstSeen": "First Seen",
    "lastUsed": "Last Used",
    "requests": "Requests",
    "noUsers": "No users connected yet"
  },
  "usage": {
    "title": "Usage",
    "entity": "Entity",
    "type": "Type",
    "invocations": "Invocations",
    "users": "Users",
    "recentInvocations": "Recent Invocations"
  },
  "analytics": {
    "title": "Analytics",
    "dateRange": "Date Range",
    "last7d": "Last 7 days",
    "last30d": "Last 30 days",
    "allTime": "All time",
    "totalInvocations": "Total Invocations",
    "uniqueEntities": "Unique Entities",
    "uniqueUsers": "Unique Users",
    "mostUsedType": "Most Used Type",
    "requestsOverTime": "Requests Over Time",
    "topEntities": "Top Entities",
    "userDistribution": "User Distribution"
  },
  "registry": {
    "title": "Registry Preview",
    "section": "{type} ({count})"
  },
  "statusPage": {
    "title": "System Status",
    "uptime": "System is running",
    "reload": "Trigger Reload",
    "reloading": "Reloading...",
    "pluginStatus": "Plugin Status"
  },
  "settings": {
    "title": "Settings",
    "credentials": "Credentials",
    "changeUsername": "Change Username",
    "changePassword": "Change Password",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm Password",
    "exportSettings": "Export Settings",
    "importSettings": "Import Settings",
    "exportDesc": "Download a JSON backup of your configuration",
    "importDesc": "Restore configuration from a JSON file",
    "selectExport": "Select what to export",
    "rolesConfig": "Roles configuration",
    "registryEntries": "Registry entries",
    "pluginConfigs": "Plugin configurations",
    "marketplace": "Marketplace",
    "sourceRepo": "Source Repository",
    "sourceRepoPlaceholder": "owner/repo",
    "githubToken": "GitHub Token (optional)",
    "githubTokenDesc": "For private repos or higher rate limit",
    "language": "Language"
  },
  "marketplace": {
    "title": "Marketplace",
    "browse": "Browse",
    "search": "Search packages...",
    "tags": "Tags",
    "version": "Version",
    "author": "Author",
    "install": "Install",
    "installed": "Installed",
    "update": "Update",
    "installing": "Installing...",
    "noPackages": "No packages found",
    "checkUpdates": "Check for Updates",
    "updatesAvailable": "{count} updates available",
    "noUpdates": "Everything is up to date",
    "details": "Details",
    "readme": "README"
  },
  "sync": {
    "title": "Sync Status",
    "check": "Check for Changes",
    "checking": "Checking...",
    "importAll": "Import All",
    "exportAll": "Export All",
    "importToDb": "Import to DB",
    "overwriteFile": "Overwrite File",
    "synced": "Synced",
    "modified": "Modified",
    "conflict": "Conflict",
    "resolve": "Resolve",
    "lastSync": "Last synced",
    "noFiles": "No synced files found",
    "filePath": "File Path",
    "entityType": "Entity Type",
    "entityName": "Entity Name",
    "chooseVersion": "Choose which version to keep"
  },
  "login": {
    "title": "RS4IT MCP Hub",
    "subtitle": "Sign in to continue.",
    "setupTitle": "Create admin account",
    "setupSubtitle": "Set username and password to protect the dashboard.",
    "username": "Username",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "signIn": "Sign in",
    "createAccount": "Create account",
    "pleaseWait": "Please wait...",
    "setupNote": "First-time setup may take a few seconds.",
    "passwordMismatch": "Passwords do not match",
    "passwordTooShort": "Password must be at least 6 characters"
  }
}
```

- [ ] **Step 2: Create ar.json**

Create `apps/admin/messages/ar.json`:

```json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "create": "إنشاء",
    "edit": "تعديل",
    "search": "بحث...",
    "enable": "تفعيل",
    "disable": "تعطيل",
    "enabled": "مفعّل",
    "disabled": "معطّل",
    "loading": "جاري التحميل...",
    "noResults": "لا توجد نتائج",
    "confirm": "تأكيد",
    "back": "رجوع",
    "close": "إغلاق",
    "name": "الاسم",
    "description": "الوصف",
    "content": "المحتوى",
    "actions": "إجراءات",
    "status": "الحالة",
    "source": "المصدر",
    "origin": "الأصل",
    "updated": "آخر تحديث",
    "allowedRoles": "الأدوار المسموحة",
    "allRoles": "مرئي لجميع الأدوار",
    "addRole": "إضافة دور...",
    "upload": "رفع",
    "install": "تثبيت",
    "update": "تحديث",
    "installed": "مثبّت",
    "refresh": "تحديث",
    "export": "تصدير",
    "import": "استيراد",
    "yes": "نعم",
    "no": "لا",
    "readOnly": "للقراءة فقط",
    "admin": "المدير",
    "mcp": "إضافة MCP",
    "deleteConfirm": "هل أنت متأكد من حذف \"{name}\"؟",
    "deleteConfirmDesc": "هذا الإجراء لا يمكن التراجع عنه."
  },
  "nav": {
    "dashboard": "لوحة التحكم",
    "tools": "الأدوات",
    "skills": "المهارات",
    "plugins": "الإضافات",
    "prompts": "الأوامر",
    "subagents": "الوكلاء",
    "commands": "الأوامر السريعة",
    "resources": "الموارد",
    "rules": "القواعد",
    "roles": "الأدوار",
    "permissions": "الصلاحيات",
    "mcpUsers": "مستخدمو MCP",
    "usage": "الاستخدام",
    "analytics": "التحليلات",
    "registry": "معاينة السجل",
    "status": "حالة النظام",
    "settings": "الإعدادات",
    "sync": "المزامنة",
    "marketplace": "المتجر",
    "registryGroup": "السجل",
    "accessGroup": "الوصول والأدوار",
    "analyticsGroup": "التحليلات",
    "systemGroup": "النظام"
  },
  "dashboard": {
    "title": "لوحة التحكم",
    "subtitle": "نظرة عامة على مركز MCP",
    "quickActions": "إجراءات سريعة",
    "totalTools": "إجمالي الأدوات",
    "totalSkills": "إجمالي المهارات",
    "totalPlugins": "إجمالي الإضافات",
    "totalResources": "إجمالي الموارد",
    "totalRules": "إجمالي القواعد",
    "totalPrompts": "إجمالي الأوامر",
    "totalSubagents": "إجمالي الوكلاء",
    "totalCommands": "إجمالي الأوامر السريعة",
    "totalUsers": "إجمالي المستخدمين",
    "totalRoles": "إجمالي الأدوار",
    "updates": "تحديثات متاحة"
  },
  "tools": {
    "title": "الأدوات",
    "create": "إنشاء أداة",
    "edit": "تعديل أداة",
    "handler": "مرجع المعالج",
    "inputSchema": "مخطط الإدخال",
    "schemaPlaceholder": "مخطط JSON لمعاملات الأداة"
  },
  "skills": {
    "title": "المهارات",
    "create": "إنشاء مهارة",
    "edit": "تعديل مهارة",
    "upload": "رفع مهارات",
    "uploadDesc": "ارفع ملف .zip يحتوي على مجلدات المهارات",
    "contentPlaceholder": "محتوى Markdown لهذه المهارة...",
    "definition": "التعريف",
    "steps": "الخطوات",
    "dropzone": "اسحب وأفلت ملف .zip هنا، أو انقر للاستعراض",
    "preview": "معاينة",
    "importing": "جاري الاستيراد...",
    "created": "تم الإنشاء",
    "updated": "تم التحديث",
    "errors": "أخطاء",
    "skipExisting": "تخطي الموجود",
    "updateExisting": "تحديث الموجود"
  },
  "plugins": {
    "title": "الإضافات",
    "create": "إنشاء إضافة",
    "edit": "تعديل إضافة",
    "id": "معرّف الإضافة",
    "command": "الأمر",
    "args": "المعاملات",
    "cwd": "مجلد العمل",
    "env": "المتغيرات البيئية",
    "timeout": "المهلة (مللي ثانية)",
    "connected": "متصل",
    "failed": "فشل",
    "toolsCount": "{count} أدوات",
    "connectionError": "خطأ في الاتصال"
  },
  "resources": {
    "title": "الموارد",
    "create": "إنشاء مورد",
    "edit": "تعديل مورد",
    "uri": "URI",
    "mimeType": "نوع MIME",
    "contentPlaceholder": "محتوى المورد..."
  },
  "rules": {
    "title": "القواعد",
    "create": "إنشاء قاعدة",
    "edit": "تعديل قاعدة",
    "globs": "أنماط Glob",
    "globsPlaceholder": "مثال: **/*.ts, src/**",
    "contentPlaceholder": "محتوى القاعدة بصيغة Markdown..."
  },
  "prompts": {
    "title": "الأوامر",
    "create": "إنشاء أمر",
    "edit": "تعديل أمر",
    "contentPlaceholder": "محتوى الأمر..."
  },
  "subagents": {
    "title": "الوكلاء",
    "create": "إنشاء وكيل",
    "edit": "تعديل وكيل",
    "model": "النموذج",
    "readonly": "للقراءة فقط",
    "background": "في الخلفية",
    "contentPlaceholder": "قالب أمر الوكيل..."
  },
  "commands": {
    "title": "الأوامر السريعة",
    "create": "إنشاء أمر سريع",
    "edit": "تعديل أمر سريع",
    "contentPlaceholder": "محتوى الأمر السريع..."
  },
  "roles": {
    "title": "الأدوار",
    "create": "إنشاء دور",
    "edit": "تعديل دور",
    "id": "معرّف الدور",
    "inheritsFrom": "يرث من",
    "defaultRole": "الدور الافتراضي",
    "setDefault": "تعيين كافتراضي",
    "noDefault": "لا يوجد دور افتراضي"
  },
  "permissions": {
    "title": "مصفوفة الصلاحيات",
    "capability": "القدرة",
    "type": "النوع",
    "noRoles": "لا توجد أدوار معرّفة"
  },
  "mcpUsers": {
    "title": "مستخدمو MCP",
    "firstSeen": "أول ظهور",
    "lastUsed": "آخر استخدام",
    "requests": "الطلبات",
    "noUsers": "لا يوجد مستخدمون متصلون بعد"
  },
  "usage": {
    "title": "الاستخدام",
    "entity": "الكيان",
    "type": "النوع",
    "invocations": "الاستدعاءات",
    "users": "المستخدمون",
    "recentInvocations": "الاستدعاءات الأخيرة"
  },
  "analytics": {
    "title": "التحليلات",
    "dateRange": "النطاق الزمني",
    "last7d": "آخر 7 أيام",
    "last30d": "آخر 30 يوم",
    "allTime": "الكل",
    "totalInvocations": "إجمالي الاستدعاءات",
    "uniqueEntities": "الكيانات الفريدة",
    "uniqueUsers": "المستخدمون الفريدون",
    "mostUsedType": "النوع الأكثر استخداماً",
    "requestsOverTime": "الطلبات عبر الزمن",
    "topEntities": "أعلى الكيانات",
    "userDistribution": "توزيع المستخدمين"
  },
  "registry": {
    "title": "معاينة السجل",
    "section": "{type} ({count})"
  },
  "statusPage": {
    "title": "حالة النظام",
    "uptime": "النظام يعمل",
    "reload": "إعادة تحميل",
    "reloading": "جاري إعادة التحميل...",
    "pluginStatus": "حالة الإضافات"
  },
  "settings": {
    "title": "الإعدادات",
    "credentials": "بيانات الاعتماد",
    "changeUsername": "تغيير اسم المستخدم",
    "changePassword": "تغيير كلمة المرور",
    "currentPassword": "كلمة المرور الحالية",
    "newPassword": "كلمة المرور الجديدة",
    "confirmPassword": "تأكيد كلمة المرور",
    "exportSettings": "تصدير الإعدادات",
    "importSettings": "استيراد الإعدادات",
    "exportDesc": "تنزيل نسخة احتياطية JSON من إعداداتك",
    "importDesc": "استعادة الإعدادات من ملف JSON",
    "selectExport": "اختر ما تريد تصديره",
    "rolesConfig": "إعدادات الأدوار",
    "registryEntries": "إدخالات السجل",
    "pluginConfigs": "إعدادات الإضافات",
    "marketplace": "المتجر",
    "sourceRepo": "المستودع المصدر",
    "sourceRepoPlaceholder": "owner/repo",
    "githubToken": "رمز GitHub (اختياري)",
    "githubTokenDesc": "للمستودعات الخاصة أو لزيادة حد الطلبات",
    "language": "اللغة"
  },
  "marketplace": {
    "title": "المتجر",
    "browse": "تصفح",
    "search": "ابحث عن حزم...",
    "tags": "العلامات",
    "version": "الإصدار",
    "author": "المؤلف",
    "install": "تثبيت",
    "installed": "مثبّت",
    "update": "تحديث",
    "installing": "جاري التثبيت...",
    "noPackages": "لا توجد حزم",
    "checkUpdates": "التحقق من التحديثات",
    "updatesAvailable": "{count} تحديثات متاحة",
    "noUpdates": "كل شيء محدّث",
    "details": "التفاصيل",
    "readme": "التوثيق"
  },
  "sync": {
    "title": "حالة المزامنة",
    "check": "التحقق من التغييرات",
    "checking": "جاري التحقق...",
    "importAll": "استيراد الكل",
    "exportAll": "تصدير الكل",
    "importToDb": "استيراد لقاعدة البيانات",
    "overwriteFile": "الكتابة فوق الملف",
    "synced": "متزامن",
    "modified": "معدّل",
    "conflict": "تعارض",
    "resolve": "حل",
    "lastSync": "آخر مزامنة",
    "noFiles": "لا توجد ملفات متزامنة",
    "filePath": "مسار الملف",
    "entityType": "نوع الكيان",
    "entityName": "اسم الكيان",
    "chooseVersion": "اختر النسخة التي تريد الاحتفاظ بها"
  },
  "login": {
    "title": "RS4IT MCP Hub",
    "subtitle": "سجّل الدخول للمتابعة.",
    "setupTitle": "إنشاء حساب المدير",
    "setupSubtitle": "عيّن اسم المستخدم وكلمة المرور لحماية لوحة التحكم.",
    "username": "اسم المستخدم",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "signIn": "تسجيل الدخول",
    "createAccount": "إنشاء حساب",
    "pleaseWait": "يرجى الانتظار...",
    "setupNote": "الإعداد الأول قد يستغرق بضع ثوانٍ.",
    "passwordMismatch": "كلمات المرور غير متطابقة",
    "passwordTooShort": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/messages/
git commit -m "feat: add English and Arabic translation files"
```

---

### Task 7: i18n — Middleware Update

**Files:**
- Modify: `apps/admin/middleware.ts`

- [ ] **Step 1: Update middleware.ts to integrate next-intl**

Replace the entire content of `apps/admin/middleware.ts` with:

```typescript
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookieEdge } from "@/lib/auth-edge";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ["/login", "/api/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/icon")) {
    return NextResponse.next();
  }

  // API routes — no locale prefix, just auth check
  if (pathname.startsWith("/api/")) {
    const authPublic = ["/api/auth/login", "/api/auth/logout", "/api/auth/setup", "/api/auth/status"];
    if (authPublic.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 16) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }
    const cookieValue = request.cookies.get("admin_session")?.value;
    const session = await verifySessionCookieEdge(cookieValue ?? null, secret);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Strip locale to check if path is public (login)
  const bare = stripLocale(pathname);
  if (bare === "/login" || bare.startsWith("/login/")) {
    return intlMiddleware(request);
  }

  // Auth check for all other pages
  const secret = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl, 302);
  }

  const cookieValue = request.cookies.get("admin_session")?.value;
  const session = await verifySessionCookieEdge(cookieValue ?? null, secret);

  if (!session) {
    // Detect locale from path or accept-language for redirect
    const locale = routing.locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("from", bare);
    return NextResponse.redirect(loginUrl, 302);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|favicon|icon|api/auth).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/middleware.ts
git commit -m "feat: integrate next-intl locale middleware with auth"
```

---

### Task 8: Locale Layout

**Files:**
- Create: `apps/admin/app/[locale]/layout.tsx`

- [ ] **Step 1: Create the locale-aware layout**

Create `apps/admin/app/[locale]/layout.tsx`:

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LayoutSwitcher } from "@/components/layout/layout-switcher";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div lang={locale} dir={dir} className={locale === "ar" ? "font-body" : "font-body"}>
      <NextIntlClientProvider messages={messages}>
        <LayoutSwitcher>{children}</LayoutSwitcher>
      </NextIntlClientProvider>
    </div>
  );
}
```

Note: The `<html>` lang/dir is set via root layout, but since next-intl handles the locale in URL, we use a wrapper div. The root `<html>` element is in `app/layout.tsx` without lang — that's fine for next-intl.

- [ ] **Step 2: Commit**

```bash
git add "apps/admin/app/[locale]/layout.tsx"
git commit -m "feat: create locale-aware layout with RTL support"
```

---

## LAYER 2: SHARED COMPONENTS

### Task 9: Shared Hook — use-crud

**Files:**
- Create: `apps/admin/hooks/use-crud.ts`

- [ ] **Step 1: Create use-crud.ts**

Create `apps/admin/hooks/use-crud.ts`:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/lib/toast";

interface UseCrudOptions<T> {
  /** API endpoint, e.g. "/api/tools" */
  endpoint: string;
  /** React Query cache key */
  queryKey: string;
  /** Transform raw API response to item array (default: identity) */
  transform?: (data: unknown) => T[];
}

interface CrudResult<T> {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  create: (item: Partial<T>) => Promise<void>;
  update: (name: string, item: Partial<T>) => Promise<void>;
  remove: (name: string) => Promise<void>;
  refetch: () => void;
}

export function useCrud<T extends { name: string }>({
  endpoint,
  queryKey,
  transform,
}: UseCrudOptions<T>): CrudResult<T> {
  const qc = useQueryClient();
  const toast = useToast();

  const query = useQuery<T[]>({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Failed to fetch ${queryKey}`);
      const data = await res.json();
      return transform ? transform(data) : (data as T[]);
    },
  });

  const createMut = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Create failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.add("success", "Created successfully");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ name, item }: { name: string; item: Partial<T> }) => {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Update failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.add("success", "Updated successfully");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Delete failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.add("success", "Deleted successfully");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create: async (item) => { await createMut.mutateAsync(item); },
    update: async (name, item) => { await updateMut.mutateAsync({ name, item }); },
    remove: async (name) => { await deleteMut.mutateAsync(name); },
    refetch: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  };
}
```

- [ ] **Step 2: Create use-debounce.ts**

Create `apps/admin/hooks/use-debounce.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

- [ ] **Step 3: Create use-locale.ts**

Create `apps/admin/hooks/use-locale.ts`:

```typescript
"use client";

import { useLocale as useNextIntlLocale } from "next-intl";

export function useDir() {
  const locale = useNextIntlLocale();
  return locale === "ar" ? "rtl" : "ltr";
}

export function useIsRtl() {
  const locale = useNextIntlLocale();
  return locale === "ar";
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/hooks/
git commit -m "feat: add shared hooks — use-crud, use-debounce, use-locale"
```

---

### Task 10: Shared Components — Data Table

**Files:**
- Create: `apps/admin/components/shared/data-table.tsx`

- [ ] **Step 1: Create data-table.tsx**

Create `apps/admin/components/shared/data-table.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { EmptyState } from "./empty-state";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  /** Render cell content. Default: item[key] */
  render?: (item: T) => React.ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Sort value extractor. Default: item[key] */
  sortValue?: (item: T) => string | number;
  /** Column width class */
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Unique key extractor */
  keyFn: (item: T) => string;
  /** Enable search — provide fields to search in */
  searchFields?: (keyof T)[];
  /** Empty state icon */
  emptyIcon?: React.ComponentType<{ className?: string }>;
  /** Empty state message override */
  emptyMessage?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class for table wrapper */
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyFn,
  searchFields,
  emptyIcon,
  emptyMessage,
  isLoading,
  className,
}: DataTableProps<T>) {
  const t = useTranslations("common");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchFields) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(q)
        )
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        result = [...result].sort((a, b) => {
          const av = col.sortValue ? col.sortValue(a) : String(a[sortKey] ?? "");
          const bv = col.sortValue ? col.sortValue(b) : String(b[sortKey] ?? "");
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return result;
  }, [data, search, searchFields, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {searchFields && (
        <SearchInput value={search} onChange={setSearch} />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          message={emptyMessage ?? t("noResults")}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-start font-medium text-muted-foreground",
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                      col.className
                    )}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr
                  key={keyFn(item)}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-secondary/30",
                    "animate-card-reveal"
                  )}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.render ? col.render(item) : String(item[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/components/shared/data-table.tsx
git commit -m "feat: add shared DataTable component with sorting and search"
```

---

### Task 11: Shared Components — UI Utilities

**Files:**
- Create: `apps/admin/components/shared/search-input.tsx`
- Create: `apps/admin/components/shared/empty-state.tsx`
- Create: `apps/admin/components/shared/status-badge.tsx`
- Create: `apps/admin/components/shared/confirm-delete.tsx`
- Create: `apps/admin/components/layout/page-header.tsx`

- [ ] **Step 1: Create search-input.tsx**

Create `apps/admin/components/shared/search-input.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  const t = useTranslations("common");
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("search")}
        className="ps-9"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create empty-state.tsx**

Create `apps/admin/components/shared/empty-state.tsx`:

```typescript
"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  message: string;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, message, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-muted-foreground", className)}>
      <Icon className="mb-3 h-10 w-10 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create status-badge.tsx**

Create `apps/admin/components/shared/status-badge.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  enabled: boolean;
}

export function StatusBadge({ enabled }: StatusBadgeProps) {
  const t = useTranslations("common");
  return (
    <Badge variant={enabled ? "success" : "secondary"}>
      {enabled ? t("enabled") : t("disabled")}
    </Badge>
  );
}
```

- [ ] **Step 4: Create confirm-delete.tsx**

Create `apps/admin/components/shared/confirm-delete.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  loading?: boolean;
}

export function ConfirmDelete({ open, onClose, onConfirm, name, loading }: ConfirmDeleteProps) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onClose={onClose} title={t("delete")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium">{t("deleteConfirm", { name })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("deleteConfirmDesc")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? t("loading") : t("delete")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create page-header.tsx**

Create `apps/admin/components/layout/page-header.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** "Create X" button label */
  createLabel?: string;
  onCreate?: () => void;
  /** Extra actions (right side) */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, createLabel, onCreate, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        {onCreate && createLabel && (
          <Button onClick={onCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/admin/components/shared/ apps/admin/components/layout/page-header.tsx
git commit -m "feat: add shared UI components — search, empty state, status badge, confirm delete, page header"
```

---

### Task 12: Shared Components — Entity Dialog + Form

**Files:**
- Create: `apps/admin/components/shared/entity-dialog.tsx`
- Create: `apps/admin/components/shared/json-editor.tsx`
- Create: `apps/admin/components/shared/markdown-editor.tsx`

- [ ] **Step 1: Create entity-dialog.tsx**

Create `apps/admin/components/shared/entity-dialog.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EntityDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function EntityDialog({ open, onClose, title, onSubmit, loading, children }: EntityDialogProps) {
  const t = useTranslations("common");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("loading") : t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create json-editor.tsx**

Create `apps/admin/components/shared/json-editor.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface JsonEditorProps {
  label: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  placeholder?: string;
  className?: string;
}

export function JsonEditor({ label, value, onChange, placeholder, className }: JsonEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  function handleChange(raw: string) {
    setText(raw);
    try {
      const parsed = JSON.parse(raw);
      setError(null);
      onChange(parsed);
    } catch {
      setError("Invalid JSON");
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn("font-mono text-xs min-h-[120px]", error && "border-destructive")}
        rows={6}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create markdown-editor.tsx**

Create `apps/admin/components/shared/markdown-editor.tsx`:

```typescript
"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MarkdownEditor({ label, value, onChange, placeholder, rows = 10, className }: MarkdownEditorProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-xs"
        rows={rows}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/shared/entity-dialog.tsx apps/admin/components/shared/json-editor.tsx apps/admin/components/shared/markdown-editor.tsx
git commit -m "feat: add entity dialog, JSON editor, and markdown editor components"
```

---

### Task 13: Redesign Sidebar

**Files:**
- Modify: `apps/admin/components/layout/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar with Dark Luxury design + i18n**

Replace the entire content of `apps/admin/components/layout/sidebar.tsx` with:

```typescript
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, Wrench, Sparkles, Puzzle, MessageSquare, Bot,
  TerminalSquare, FileText, BookOpen, Shield, Grid3X3, Users,
  BarChart3, LineChart, ListTree, Activity, Settings, RefreshCw, Store,
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/components/layout/sidebar.tsx
git commit -m "style: redesign sidebar with Dark Luxury theme and i18n"
```

---

### Task 14: Redesign Topbar + Language Switcher

**Files:**
- Modify: `apps/admin/components/layout/topbar.tsx`

- [ ] **Step 1: Rewrite topbar with language switcher**

Replace the entire content of `apps/admin/components/layout/topbar.tsx` with:

```typescript
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
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLocale}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          {locale === "en" ? "عربي" : "EN"}
        </Button>

        {/* Settings */}
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>

        {/* Environment badge */}
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

        {/* Logout */}
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/components/layout/topbar.tsx
git commit -m "style: redesign topbar with language switcher and Dark Luxury theme"
```

---

## LAYER 2b: PAGE REFACTORING

The page refactoring follows a repeatable pattern. Task 15 shows the **full detailed refactoring of the Tools page** as the reference implementation. All subsequent pages (Tasks 16-29) follow the exact same decomposition pattern.

### Task 15: Refactor Tools Page (Reference Implementation)

**Files:**
- Create: `apps/admin/app/[locale]/tools/page.tsx`
- Create: `apps/admin/app/[locale]/tools/_hooks/use-tools.ts`
- Create: `apps/admin/app/[locale]/tools/_components/tools-table.tsx`
- Create: `apps/admin/app/[locale]/tools/_components/tool-form.tsx`
- Create: `apps/admin/app/[locale]/tools/_components/tool-dialog.tsx`

- [ ] **Step 1: Create use-tools.ts hook**

Create `apps/admin/app/[locale]/tools/_hooks/use-tools.ts`:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/lib/toast";
import type { DynamicToolEntry, DynamicPluginEntry } from "@/lib/dynamic-registry-types";

interface UseToolsResult {
  tools: DynamicToolEntry[];
  pluginTools: Array<{ name: string; description: string; inputSchema: unknown; pluginId: string; pluginName: string }>;
  isLoading: boolean;
  create: (tool: Partial<DynamicToolEntry>) => Promise<void>;
  update: (name: string, tool: Partial<DynamicToolEntry>) => Promise<void>;
  remove: (name: string) => Promise<void>;
}

export function useTools(): UseToolsResult {
  const qc = useQueryClient();
  const toast = useToast();

  const toolsQuery = useQuery<DynamicToolEntry[]>({
    queryKey: ["tools"],
    queryFn: async () => {
      const res = await fetch("/api/tools");
      if (!res.ok) throw new Error("Failed to fetch tools");
      return res.json();
    },
  });

  const pluginsQuery = useQuery<DynamicPluginEntry[]>({
    queryKey: ["plugins"],
    queryFn: async () => {
      const res = await fetch("/api/plugins");
      if (!res.ok) throw new Error("Failed to fetch plugins");
      return res.json();
    },
  });

  const pluginStatusQuery = useQuery({
    queryKey: ["plugin-status"],
    queryFn: async () => {
      const res = await fetch("/api/plugin-status");
      if (!res.ok) return {};
      return res.json();
    },
  });

  // Derive plugin tools from status
  const pluginTools = (() => {
    const status = pluginStatusQuery.data;
    if (!status || !Array.isArray(status)) return [];
    const result: UseToolsResult["pluginTools"] = [];
    for (const ps of status) {
      if (ps.status === "connected" && Array.isArray(ps.tools)) {
        for (const t of ps.tools) {
          result.push({
            name: t.name,
            description: t.description ?? "",
            inputSchema: t.inputSchema ?? {},
            pluginId: ps.id,
            pluginName: ps.name ?? ps.id,
          });
        }
      }
    }
    return result;
  })();

  const createMut = useMutation({
    mutationFn: async (tool: Partial<DynamicToolEntry>) => {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tool),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Create failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tools"] });
      toast.add("success", "Tool created");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ name, tool }: { name: string; tool: Partial<DynamicToolEntry> }) => {
      const res = await fetch("/api/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tool, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Update failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tools"] });
      toast.add("success", "Tool updated");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/tools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Delete failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tools"] });
      toast.add("success", "Tool deleted");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  return {
    tools: toolsQuery.data ?? [],
    pluginTools,
    isLoading: toolsQuery.isLoading,
    create: async (tool) => { await createMut.mutateAsync(tool); },
    update: async (name, tool) => { await updateMut.mutateAsync({ name, tool }); },
    remove: async (name) => { await deleteMut.mutateAsync(name); },
  };
}
```

- [ ] **Step 2: Create tool-form.tsx**

Create `apps/admin/app/[locale]/tools/_components/tool-form.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { JsonEditor } from "@/components/shared/json-editor";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { RoleDefinition } from "@/lib/roles";

interface ToolFormData {
  name: string;
  description: string;
  handlerRef: string;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
  allowedRoles: string[];
}

interface ToolFormProps {
  form: ToolFormData;
  onChange: (form: ToolFormData) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function ToolForm({ form, onChange, roles, isEditing }: ToolFormProps) {
  const t = useTranslations("tools");
  const tc = useTranslations("common");

  function update<K extends keyof ToolFormData>(key: K, value: ToolFormData[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{tc("name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          disabled={isEditing}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>{tc("description")}</Label>
        <Input
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("handler")}</Label>
        <Input
          value={form.handlerRef}
          onChange={(e) => update("handlerRef", e.target.value)}
          placeholder="e.g., create_file"
          className="font-mono text-sm"
          required
        />
      </div>

      <JsonEditor
        label={t("inputSchema")}
        value={form.inputSchema}
        onChange={(v) => update("inputSchema", v)}
        placeholder={t("schemaPlaceholder")}
      />

      <div className="flex items-center gap-2">
        <Switch
          checked={form.enabled}
          onCheckedChange={(v) => update("enabled", v)}
        />
        <Label>{tc("enabled")}</Label>
      </div>

      <AllowedRolesPicker
        roles={roles}
        value={form.allowedRoles}
        onChange={(v) => update("allowedRoles", v)}
        entityLabel="Tool"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create tool-dialog.tsx**

Create `apps/admin/app/[locale]/tools/_components/tool-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ToolForm } from "./tool-form";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

const emptyForm = {
  name: "",
  description: "",
  handlerRef: "",
  inputSchema: {} as Record<string, unknown>,
  enabled: true,
  allowedRoles: [] as string[],
};

interface ToolDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (tool: Partial<DynamicToolEntry>) => Promise<void>;
  editing: DynamicToolEntry | null;
  roles: RoleDefinition[];
}

export function ToolDialog({ open, onClose, onSave, editing, roles }: ToolDialogProps) {
  const t = useTranslations("tools");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // Reset form when editing changes
  const key = editing?.name ?? "__new__";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        handlerRef: editing.handlerRef ?? "",
        inputSchema: (editing.inputSchema as Record<string, unknown>) ?? {},
        enabled: editing.enabled ?? true,
        allowedRoles: (editing.allowedRoles as string[]) ?? [],
      });
    } else {
      setForm(emptyForm);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await onSave({
        ...form,
        allowedRoles: form.allowedRoles.length > 0 ? form.allowedRoles : undefined,
      });
      setForm(emptyForm);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      title={editing ? t("edit") : t("create")}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <ToolForm
        form={form}
        onChange={setForm}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
```

- [ ] **Step 4: Create tools-table.tsx**

Create `apps/admin/app/[locale]/tools/_components/tools-table.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Wrench } from "lucide-react";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";

interface ToolsTableProps {
  tools: DynamicToolEntry[];
  isLoading: boolean;
  onEdit: (tool: DynamicToolEntry) => void;
  onDelete: (name: string) => void;
}

export function ToolsTable({ tools, isLoading, onEdit, onDelete }: ToolsTableProps) {
  const t = useTranslations("tools");
  const tc = useTranslations("common");

  const columns: Column<DynamicToolEntry>[] = [
    {
      key: "name",
      header: tc("name"),
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-foreground">{item.name}</span>
      ),
    },
    {
      key: "description",
      header: tc("description"),
      className: "max-w-[300px]",
      render: (item) => (
        <span className="line-clamp-2 text-muted-foreground">{item.description}</span>
      ),
    },
    {
      key: "handlerRef",
      header: t("handler"),
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">{item.handlerRef}</span>
      ),
    },
    {
      key: "source",
      header: tc("source"),
      render: (item) => (
        <Badge variant="outline" className="text-[10px]">
          {item.source === "mcp" ? tc("mcp") : tc("admin")}
        </Badge>
      ),
    },
    {
      key: "enabled",
      header: tc("status"),
      render: (item) => <StatusBadge enabled={item.enabled} />,
    },
    {
      key: "actions",
      header: tc("actions"),
      className: "w-[100px]",
      render: (item) =>
        item.source === "mcp" ? (
          <Badge variant="secondary" className="text-[10px]">{tc("readOnly")}</Badge>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(item.name)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <DataTable
      data={tools}
      columns={columns}
      keyFn={(t) => t.name}
      searchFields={["name", "description", "handlerRef"] as (keyof DynamicToolEntry)[]}
      emptyIcon={Wrench}
      isLoading={isLoading}
    />
  );
}
```

- [ ] **Step 5: Create the page shell**

Create `apps/admin/app/[locale]/tools/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { ToolsTable } from "./_components/tools-table";
import { ToolDialog } from "./_components/tool-dialog";
import { useTools } from "./_hooks/use-tools";
import { useQuery } from "@tanstack/react-query";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

export default function ToolsPage() {
  const t = useTranslations("tools");
  const { tools, isLoading, create, update, remove } = useTools();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicToolEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const rolesQuery = useQuery<RoleDefinition[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.roles ?? [];
    },
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(tool: DynamicToolEntry) {
    setEditing(tool);
    setDialogOpen(true);
  }

  async function handleSave(tool: Partial<DynamicToolEntry>) {
    if (editing) {
      await update(editing.name, tool);
    } else {
      await create(tool);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await remove(deleteTarget);
    setDeleteTarget(null);
  }

  return (
    <div className="page-enter space-y-6 p-6">
      <PageHeader
        title={t("title")}
        createLabel={t("create")}
        onCreate={openCreate}
      />

      <ToolsTable
        tools={tools}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={(name) => setDeleteTarget(name)}
      />

      <ToolDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        editing={editing}
        roles={rolesQuery.data ?? []}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        name={deleteTarget ?? ""}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add "apps/admin/app/[locale]/tools/"
git commit -m "refactor: decompose tools page into hook + components with i18n"
```

---

### Tasks 16-29: Refactor Remaining Pages

Each page follows the **exact same pattern** as Task 15 (Tools). The decomposition for each:

| Task | Page | Hook | Key Differences |
|------|------|------|-----------------|
| 16 | skills | `use-skills.ts` | Bulk save-all pattern (PUT array), markdown editor, upload button (added later in Task 33) |
| 17 | plugins | `use-plugins.ts` | Plugin status merge, reload after mutations, connection error display |
| 18 | resources | `use-resources.ts` | URI + MIME type fields, content textarea |
| 19 | rules | `use-rules.ts` | Globs field, markdown content |
| 20 | prompts | `use-prompts.ts` | Bulk save-all pattern |
| 21 | subagents | `use-subagents.ts` | Bulk save-all, model/readonly/background toggles |
| 22 | commands | `use-commands.ts` | Bulk save-all, markdown content |
| 23 | roles | `use-roles.ts` | Inheritance graph, default role, role ID normalization |
| 24 | permissions | `use-permissions.ts` | Matrix view — no shared DataTable, custom grid |
| 25 | mcp-users | (inline useQuery) | Read-only, auto-refresh 60s, no CRUD |
| 26 | usage | (inline useQuery) | Read-only, auto-refresh 30s, type badges |
| 27 | analytics | (inline useQuery) | Recharts, date range, stat cards |
| 28 | registry | (inline useQuery) | Read-only preview, multi-section |
| 29 | status + settings + dashboard + login | Various | Login: i18n only. Dashboard: new card layout. Settings: credential forms + marketplace config. Status: reload button |

**For each task:**

- [ ] **Step 1:** Create `_hooks/use-{entity}.ts` — extract all API calls, mutations, transforms from the current page
- [ ] **Step 2:** Create `_components/{entity}-table.tsx` — extract table/list rendering
- [ ] **Step 3:** Create `_components/{entity}-form.tsx` — extract form fields
- [ ] **Step 4:** Create `_components/{entity}-dialog.tsx` — extract dialog wrapper
- [ ] **Step 5:** Create `page.tsx` — page shell that composes components
- [ ] **Step 6:** Replace all hardcoded strings with `useTranslations()` calls
- [ ] **Step 7:** Commit

**Golden Rule:** The logic stays identical. Only the file location changes. Every `useState`, `useQuery`, `useMutation`, validation check, and API call is preserved exactly — just moved to its correct file.

---

## LAYER 3: NEW FEATURES

### Task 30: Prisma Schema — SyncState + InstalledPackage

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add SyncState model**

Add to the end of `apps/backend/prisma/schema.prisma`:

```prisma
model SyncState {
  filePath    String   @id
  entityType  String
  entityName  String
  contentHash String
  dbHash      String?
  syncedAt    DateTime @default(now())

  @@index([entityType])
}

model InstalledPackage {
  id          String   @id @default(cuid())
  type        String
  name        String
  version     String
  sourceRepo  String
  installedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([type, name])
}
```

- [ ] **Step 2: Create and run migration**

```bash
cd "apps/backend" && npx prisma migrate dev --name add_sync_state_and_installed_packages
```

- [ ] **Step 3: Generate Prisma client**

```bash
cd "apps/backend" && npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat: add SyncState and InstalledPackage Prisma models"
```

---

### Task 31: Skills Upload — Backend API

**Files:**
- Create: `apps/admin/app/api/skills/upload/route.ts`

- [ ] **Step 1: Create the upload route**

Create `apps/admin/app/api/skills/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

interface ParsedSkill {
  name: string;
  description?: string;
  content: string;
  definition?: unknown;
  enabled: boolean;
  allowedRoles?: string[];
}

function parseSkillMd(content: string): { definition?: unknown } {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return {};
  try {
    return { definition: JSON.parse(jsonMatch[1]) };
  } catch {
    return {};
  }
}

async function extractSkillsFromZip(buffer: ArrayBuffer): Promise<{ skills: ParsedSkill[]; errors: string[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const skills: ParsedSkill[] = [];
  const errors: string[] = [];

  // Find all SKILL.md files
  const skillFiles: { path: string; file: JSZip.JSZipObject }[] = [];
  zip.forEach((path, file) => {
    if (file.name.endsWith("SKILL.md") && !file.dir) {
      skillFiles.push({ path, file });
    }
  });

  for (const { path, file } of skillFiles) {
    try {
      const content = await file.async("string");
      const parts = path.split("/").filter(Boolean);

      // Derive name from parent folder or filename
      let name: string;
      if (parts.length >= 2) {
        name = parts[parts.length - 2]; // folder name
      } else {
        name = "unnamed-skill";
      }

      // Check for metadata.json in same directory
      const dir = parts.length >= 2 ? parts.slice(0, -1).join("/") + "/" : "";
      const metaFile = zip.file(dir + "metadata.json");
      let meta: Record<string, unknown> = {};
      if (metaFile) {
        try {
          meta = JSON.parse(await metaFile.async("string"));
        } catch { /* ignore bad metadata */ }
      }

      const parsed = parseSkillMd(content);

      skills.push({
        name: (meta.name as string) ?? name,
        description: (meta.description as string) ?? undefined,
        content,
        definition: parsed.definition,
        enabled: (meta.enabled as boolean) ?? true,
        allowedRoles: Array.isArray(meta.allowedRoles) ? meta.allowedRoles as string[] : undefined,
      });
    } catch (err) {
      errors.push(`Failed to parse ${path}: ${(err as Error).message}`);
    }
  }

  return { skills, errors };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { skills, errors } = await extractSkillsFromZip(buffer);

    if (skills.length === 0) {
      return NextResponse.json(
        { error: "No SKILL.md files found in zip", errors },
        { status: 400 }
      );
    }

    // Fetch existing skills to determine create vs update
    const existingRes = await fetch(`${hubBaseUrl()}/api/skills`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    const existingPayload = await existingRes.json().catch(() => ({ skills: [] }));
    const existingSkills: Array<{ name: string }> = Array.isArray(existingPayload?.skills)
      ? existingPayload.skills
      : [];
    const existingNames = new Set(existingSkills.map((s) => s.name));

    const created: string[] = [];
    const updated: string[] = [];

    // Merge skills into existing array
    const allSkills = [...existingSkills];
    for (const skill of skills) {
      if (existingNames.has(skill.name)) {
        // Update: replace in array
        const idx = allSkills.findIndex((s) => s.name === skill.name);
        if (idx !== -1) allSkills[idx] = { ...allSkills[idx], ...skill };
        updated.push(skill.name);
      } else {
        allSkills.push(skill as any);
        created.push(skill.name);
      }
    }

    // Save all skills back
    await fetch(`${hubBaseUrl()}/api/skills`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ skills: allSkills }),
      cache: "no-store",
    });

    return NextResponse.json({ created, updated, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Upload failed: " + (err as Error).message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/app/api/skills/upload/
git commit -m "feat: add skills zip upload API endpoint"
```

---

### Task 32: Skills Upload — Frontend UI

**Files:**
- Create: `apps/admin/app/[locale]/skills/_components/upload-dialog.tsx`

- [ ] **Step 1: Create upload-dialog.tsx**

Create `apps/admin/app/[locale]/skills/_components/upload-dialog.tsx`:

```typescript
"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileArchive, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/lib/toast";

interface UploadResult {
  created: string[];
  updated: string[];
  errors: string[];
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const t = useTranslations("skills");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".zip")) setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/skills/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add("error", data.error ?? "Upload failed");
        return;
      }
      setResult(data);
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.add("success", `${data.created.length} created, ${data.updated.length} updated`);
    } catch (err) {
      toast.add("error", (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title={t("upload")}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("uploadDesc")}</p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border py-10 transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          {file ? (
            <>
              <FileArchive className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("dropzone")}</span>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Results */}
        {result && (
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            {result.created.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                {t("created")}: {result.created.join(", ")}
              </div>
            )}
            {result.updated.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <AlertCircle className="h-4 w-4" />
                {t("updated")}: {result.updated.join(", ")}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {t("errors")}: {result.errors.join("; ")}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {tc("close")}
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? t("importing") : tc("upload")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add upload button to Skills page header**

In the skills page.tsx (when refactoring skills), add the upload button to PageHeader actions:

```typescript
import { UploadDialog } from "./_components/upload-dialog";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

// Inside the component:
const [uploadOpen, setUploadOpen] = useState(false);

// In JSX, add to PageHeader actions prop:
<PageHeader
  title={t("title")}
  createLabel={t("create")}
  onCreate={openCreate}
  actions={
    <Button variant="secondary" onClick={() => setUploadOpen(true)} className="gap-1.5">
      <Upload className="h-4 w-4" />
      {t("upload")}
    </Button>
  }
/>
<UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
```

- [ ] **Step 3: Commit**

```bash
git add "apps/admin/app/[locale]/skills/_components/upload-dialog.tsx"
git commit -m "feat: add skills zip upload dialog with drag-and-drop"
```

---

### Task 33: Sync System — Backend APIs

**Files:**
- Create: `apps/admin/app/api/sync/status/route.ts`
- Create: `apps/admin/app/api/sync/import/route.ts`
- Create: `apps/admin/app/api/sync/export/route.ts`

- [ ] **Step 1: Create sync status API**

Create `apps/admin/app/api/sync/status/route.ts`:

```typescript
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function GET() {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/sync/status`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ files: [], error: "Hub sync API not available" });
    }
    return NextResponse.json(await res.json());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ files: [], error: "Failed to fetch sync status" });
  }
}
```

- [ ] **Step 2: Create sync import API**

Create `apps/admin/app/api/sync/import/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${hubBaseUrl()}/api/sync/import`, {
      method: "POST",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create sync export API**

Create `apps/admin/app/api/sync/export/route.ts`:

```typescript
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function POST() {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/sync/export`, {
      method: "POST",
      headers: hubHeaders(),
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/api/sync/
git commit -m "feat: add sync status/import/export admin API routes"
```

---

### Task 34: Sync System — Frontend Page

**Files:**
- Create: `apps/admin/app/[locale]/sync/page.tsx`

- [ ] **Step 1: Create the sync page**

Create `apps/admin/app/[locale]/sync/page.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/lib/toast";
import { RefreshCw, Download, Upload, Check, AlertTriangle, XCircle } from "lucide-react";

interface SyncFile {
  filePath: string;
  entityType: string;
  entityName: string;
  status: "synced" | "modified" | "conflict" | "new";
  lastSync?: string;
}

export default function SyncPage() {
  const t = useTranslations("sync");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, refetch } = useQuery<{ files: SyncFile[] }>({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/sync/status");
      return res.json();
    },
  });

  const importMut = useMutation({
    mutationFn: async (files?: string[]) => {
      const res = await fetch("/api/sync/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-status"] });
      toast.add("success", "Imported successfully");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync/export", { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-status"] });
      toast.add("success", "Exported successfully");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const files = data?.files ?? [];
  const modified = files.filter((f) => f.status === "modified");
  const conflicts = files.filter((f) => f.status === "conflict");

  const statusIcon = {
    synced: <Check className="h-3.5 w-3.5 text-success" />,
    modified: <AlertTriangle className="h-3.5 w-3.5 text-primary" />,
    conflict: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    new: <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  const statusVariant = {
    synced: "success" as const,
    modified: "default" as const,
    conflict: "destructive" as const,
    new: "secondary" as const,
  };

  return (
    <div className="page-enter space-y-6 p-6">
      <PageHeader
        title={t("title")}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {t("check")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => importMut.mutate()}
              disabled={modified.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              {t("importAll")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => exportMut.mutate()}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" />
              {t("exportAll")}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState icon={RefreshCw} message={t("noFiles")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{tc("status")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("filePath")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("entityType")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("entityName")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("lastSync")}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr
                  key={file.filePath}
                  className="animate-card-reveal border-b border-border transition-colors hover:bg-secondary/30"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[file.status]} className="gap-1">
                      {statusIcon[file.status]}
                      {t(file.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{file.filePath}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{file.entityType}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{file.entityName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {file.lastSync ? new Date(file.lastSync).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {file.status === "modified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => importMut.mutate([file.filePath])}
                      >
                        {t("importToDb")}
                      </Button>
                    )}
                    {file.status === "conflict" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => importMut.mutate([file.filePath])}
                      >
                        {t("resolve")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/admin/app/[locale]/sync/"
git commit -m "feat: add sync status page with import/export controls"
```

---

### Task 35: Marketplace — Backend APIs

**Files:**
- Create: `apps/admin/app/api/marketplace/browse/route.ts`
- Create: `apps/admin/app/api/marketplace/install/route.ts`
- Create: `apps/admin/app/api/marketplace/updates/route.ts`

- [ ] **Step 1: Create marketplace browse API**

Create `apps/admin/app/api/marketplace/browse/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: { data: unknown; ts: number } | null = null;

function getSourceRepo(): string {
  return process.env.MARKETPLACE_REPO ?? "rs4it/mcp-marketplace";
}

function getGithubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchRegistry(): Promise<unknown> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const repo = getSourceRepo();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/registry.json`,
    { headers: getGithubHeaders() }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  const data = JSON.parse(content);
  cache = { data, ts: Date.now() };
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const search = searchParams.get("search")?.toLowerCase();
    const tag = searchParams.get("tag");

    const registry = (await fetchRegistry()) as { packages?: Array<Record<string, unknown>> };
    let packages = registry.packages ?? [];

    if (type) packages = packages.filter((p) => p.type === type);
    if (tag) packages = packages.filter((p) => Array.isArray(p.tags) && (p.tags as string[]).includes(tag));
    if (search) {
      packages = packages.filter((p) =>
        String(p.name ?? "").toLowerCase().includes(search) ||
        String(p.description ?? "").toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ packages });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ packages: [], error: (e as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Create marketplace install API**

Create `apps/admin/app/api/marketplace/install/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

function getSourceRepo(): string {
  return process.env.MARKETPLACE_REPO ?? "rs4it/mcp-marketplace";
}

function getGithubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchFileContent(path: string): Promise<string> {
  const repo = getSourceRepo();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: getGithubHeaders() }
  );
  if (!res.ok) throw new Error(`File not found: ${path}`);
  const json = await res.json();
  return Buffer.from(json.content, "base64").toString("utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, version, path } = body as {
      type: string; name: string; version: string; path: string;
    };

    if (!type || !name || !path) {
      return NextResponse.json({ error: "Missing type, name, or path" }, { status: 400 });
    }

    // Fetch the main content file
    const mainFile = type === "skill" ? "SKILL.md"
      : type === "rule" ? "RULE.md"
      : type === "prompt" ? "PROMPT.md"
      : "CONTENT.md";

    const content = await fetchFileContent(`${path}/${mainFile}`);

    // Try to fetch metadata.json
    let metadata: Record<string, unknown> = {};
    try {
      const metaContent = await fetchFileContent(`${path}/metadata.json`);
      metadata = JSON.parse(metaContent);
    } catch { /* no metadata */ }

    // Install to Hub based on type
    const entityName = (metadata.name as string) ?? name;
    const description = (metadata.description as string) ?? "";

    let endpoint: string;
    let payload: unknown;

    switch (type) {
      case "skill": {
        // Fetch existing skills and add/update
        const existing = await fetch(`${hubBaseUrl()}/api/skills`, { headers: hubHeaders(), cache: "no-store" });
        const data = await existing.json().catch(() => ({ skills: [] }));
        const skills = Array.isArray(data?.skills) ? data.skills : [];
        const idx = skills.findIndex((s: any) => s.name === entityName);
        const entry = { name: entityName, description, content, enabled: true, ...metadata };
        if (idx !== -1) skills[idx] = { ...skills[idx], ...entry };
        else skills.push(entry);
        endpoint = `${hubBaseUrl()}/api/skills`;
        payload = { skills };
        break;
      }
      case "rule": {
        const existing = await fetch(`${hubBaseUrl()}/api/registry`, { headers: hubHeaders(), cache: "no-store" });
        const reg = (await existing.json()) as { registry?: { rules?: any[] } };
        const registry = reg.registry ?? reg;
        const rules = (registry as any).rules ?? [];
        const entry = { name: entityName, description, content, enabled: true, ...metadata };
        const idx = rules.findIndex((r: any) => r.name === entityName);
        if (idx !== -1) rules[idx] = { ...rules[idx], ...entry };
        else rules.push(entry);
        endpoint = `${hubBaseUrl()}/api/registry`;
        payload = { registry: { ...(registry as any), rules } };
        break;
      }
      default:
        return NextResponse.json({ error: `Unsupported type: ${type}` }, { status: 400 });
    }

    // Write back
    await fetch(endpoint, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    // Track installed package via Hub (if available)
    try {
      await fetch(`${hubBaseUrl()}/api/marketplace/track`, {
        method: "POST",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: entityName, version, sourceRepo: getSourceRepo() }),
        cache: "no-store",
      });
    } catch { /* tracking is optional */ }

    return NextResponse.json({ installed: entityName, type, version });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create marketplace updates API**

Create `apps/admin/app/api/marketplace/updates/route.ts`:

```typescript
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

export async function GET() {
  try {
    const res = await fetch(`${hubBaseUrl()}/api/marketplace/updates`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ updates: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ updates: [] });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/api/marketplace/
git commit -m "feat: add marketplace browse/install/updates API routes"
```

---

### Task 36: Marketplace — Frontend Tab Component

**Files:**
- Create: `apps/admin/components/shared/marketplace-tab.tsx`

- [ ] **Step 1: Create marketplace-tab.tsx**

Create `apps/admin/components/shared/marketplace-tab.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "./search-input";
import { EmptyState } from "./empty-state";
import { useToast } from "@/lib/toast";
import { Store, Download, Check, ArrowUpCircle } from "lucide-react";

interface MarketplacePackage {
  name: string;
  type: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  path: string;
  icon?: string;
  downloads?: number;
}

interface MarketplaceTabProps {
  type: string;
  installedNames?: Set<string>;
}

export function MarketplaceTab({ type, installedNames = new Set() }: MarketplaceTabProps) {
  const t = useTranslations("marketplace");
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ packages: MarketplacePackage[] }>({
    queryKey: ["marketplace", type, search],
    queryFn: async () => {
      const params = new URLSearchParams({ type });
      if (search) params.set("search", search);
      const res = await fetch(`/api/marketplace/browse?${params}`);
      return res.json();
    },
  });

  const installMut = useMutation({
    mutationFn: async (pkg: MarketplacePackage) => {
      setInstalling(pkg.name);
      const res = await fetch("/api/marketplace/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: pkg.type, name: pkg.name, version: pkg.version, path: pkg.path }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Install failed");
      }
      return res.json();
    },
    onSuccess: (_, pkg) => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: [type + "s"] });
      toast.add("success", `${pkg.name} installed`);
      setInstalling(null);
    },
    onError: (e: Error) => {
      toast.add("error", e.message);
      setInstalling(null);
    },
  });

  const packages = data?.packages ?? [];

  return (
    <div className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder={t("search")} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : packages.length === 0 ? (
        <EmptyState icon={Store} message={t("noPackages")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, idx) => {
            const isInstalled = installedNames.has(pkg.name);
            return (
              <Card
                key={pkg.name}
                className="animate-card-reveal border-border bg-card/50 transition-all hover:glow-accent"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display font-semibold">{pkg.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pkg.description}</p>
                    </div>
                    <Button
                      variant={isInstalled ? "ghost" : "default"}
                      size="sm"
                      disabled={isInstalled || installing === pkg.name}
                      onClick={() => installMut.mutate(pkg)}
                      className="ms-2 shrink-0 gap-1"
                    >
                      {installing === pkg.name ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                      ) : isInstalled ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {isInstalled ? t("installed") : t("install")}
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {pkg.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>v{pkg.version}</span>
                    <span>{pkg.author}</span>
                    {pkg.downloads != null && <span>{pkg.downloads} downloads</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/components/shared/marketplace-tab.tsx
git commit -m "feat: add reusable MarketplaceTab component with card grid"
```

---

### Task 37: Integrate Marketplace Tabs into Entity Pages

- [ ] **Step 1: Add tab navigation to each entity page**

Each entity page (tools, skills, plugins, resources, rules, prompts, subagents, commands) gets a simple tab bar at the top:

```typescript
// Add to each page's imports
import { MarketplaceTab } from "@/components/shared/marketplace-tab";

// Add tab state
const [tab, setTab] = useState<"list" | "marketplace">("list");

// Add tab bar after PageHeader
<div className="flex gap-1 border-b border-border">
  <button
    onClick={() => setTab("list")}
    className={cn(
      "px-4 py-2 text-sm font-medium transition-colors",
      tab === "list" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
    )}
  >
    {t("title")}
  </button>
  <button
    onClick={() => setTab("marketplace")}
    className={cn(
      "px-4 py-2 text-sm font-medium transition-colors",
      tab === "marketplace" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
    )}
  >
    {tc("marketplace")}
  </button>
</div>

// Conditional render
{tab === "list" ? (
  // Existing table/form content
) : (
  <MarketplaceTab type="skill" installedNames={new Set(items.map(i => i.name))} />
)}
```

Apply this pattern to all 8 entity pages.

- [ ] **Step 2: Commit per page or batch**

```bash
git add "apps/admin/app/[locale]/"
git commit -m "feat: add marketplace tabs to all entity pages"
```

---

## LAYER 4: POLISH

### Task 38: Delete Old Pages + Clean Up

- [ ] **Step 1: Remove old page files**

After all `[locale]` pages are working and verified:

```bash
# Remove old non-locale pages (they've been recreated under [locale])
rm -f apps/admin/app/page.tsx
rm -rf apps/admin/app/tools/
rm -rf apps/admin/app/skills/
rm -rf apps/admin/app/plugins/
rm -rf apps/admin/app/resources/
rm -rf apps/admin/app/rules/
rm -rf apps/admin/app/prompts/
rm -rf apps/admin/app/subagents/
rm -rf apps/admin/app/commands/
rm -rf apps/admin/app/roles/
rm -rf apps/admin/app/permissions/
rm -rf apps/admin/app/mcp-users/
rm -rf apps/admin/app/usage/
rm -rf apps/admin/app/analytics/
rm -rf apps/admin/app/registry/
rm -rf apps/admin/app/status/
rm -rf apps/admin/app/settings/
rm -rf apps/admin/app/login/
```

Keep: `app/api/` (API routes stay in place), `app/layout.tsx`, `app/globals.css`, `app/providers.tsx`.

- [ ] **Step 2: Update middleware matcher**

Ensure the matcher in `middleware.ts` covers the new `[locale]` paths. The current matcher `["/((?!_next|favicon|icon|api/auth).*)"]` already handles this.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old non-locale page files"
```

---

### Task 39: Animations and Micro-interactions

- [ ] **Step 1: Add loading skeletons to pages**

Already handled by the `isLoading` state in DataTable and individual pages.

- [ ] **Step 2: Fine-tune RTL**

Verify all pages in Arabic mode:
- Sidebar is on the right
- Text is right-aligned
- Icons flip correctly with `start`/`end` logical properties
- Charts render correctly in RTL

- [ ] **Step 3: Test and fix any visual issues**

```bash
cd "apps/admin" && npm run build
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "style: polish animations, RTL support, and loading states"
```

---

## Summary

| Layer | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Infrastructure | 1-8 | Design system, fonts, i18n setup, translations, middleware, locale layout |
| 2: Shared Components | 9-14 | use-crud hook, DataTable, EntityDialog, SearchInput, EmptyState, StatusBadge, ConfirmDelete, PageHeader, JsonEditor, MarkdownEditor, Sidebar, Topbar |
| 2b: Page Refactoring | 15-29 | All 18 pages decomposed into page + _components + _hooks with i18n |
| 3: New Features | 30-37 | Prisma models, skills upload, sync system, marketplace APIs + UI |
| 4: Polish | 38-39 | Clean up old files, animations, RTL testing |
