# RS4IT MCP Admin - Full Refactor + Marketplace + i18n

**Date:** 2026-04-15
**Approach:** Foundation-First (infrastructure -> refactor -> features)
**Scope:** Design system, i18n, code refactoring, skills upload, two-way sync, GitHub marketplace

---

## 1. Design System (Dark + Luxury)

### Color Palette

| Role | Value | Usage |
|------|-------|-------|
| `--bg-base` | `#09090b` (zinc-950) | Main background |
| `--bg-surface` | `#18181b` (zinc-900) | Cards, surfaces |
| `--bg-elevated` | `#27272a` (zinc-800) | Elevated elements, hover |
| `--border-subtle` | `#3f3f46` (zinc-700) | Subtle borders |
| `--border-strong` | `#52525b` (zinc-600) | Strong borders |
| `--text-primary` | `#fafafa` (zinc-50) | Primary text |
| `--text-secondary` | `#a1a1aa` (zinc-400) | Secondary text |
| `--accent` | `#d4a574` (copper/amber) | Primary accent |
| `--accent-hover` | `#e8c49a` | Accent hover |
| `--success` | `#22c55e` | Success state |
| `--destructive` | `#ef4444` | Danger/delete |

### Typography

| Role | Font | Usage |
|------|------|-------|
| Display/Headings | `Outfit` | Geometric, modern, multiple weights |
| Body/Text | `DM Sans` | Readable, elegant |
| Code/Mono | `JetBrains Mono` | JSON values, code blocks |
| Arabic | `IBM Plex Arabic` | Matches geometric style |

### Component Style

- Cards: `border-zinc-800` + `bg-zinc-900/50` (semi-transparent)
- Primary buttons: copper accent with hover transition
- Subtle glow on important elements: `box-shadow: 0 0 20px rgba(212, 165, 116, 0.1)`
- Background gradient mesh: single corner with accent at 5% opacity

### Motion

- Page transitions via CSS `@starting-style` + `transition`
- Staggered card reveals on page load (incremental `animation-delay`)
- Smooth hover effects on cards (translate + shadow)
- Sidebar active indicator: animated gradient bar

---

## 2. i18n Architecture (Arabic + English)

### Library

`next-intl` - best fit for Next.js App Router.

### File Structure

```
apps/admin/
├── messages/
│   ├── en.json
│   └── ar.json
├── i18n/
│   ├── request.ts        # next-intl server config
│   ├── routing.ts        # locale routing config
│   └── navigation.ts     # localized Link, redirect, usePathname
├── middleware.ts           # Updated: next-intl locale detection + redirect
├── app/
│   ├── api/              # API routes stay OUTSIDE [locale] - no prefix needed
│   │   ├── tools/
│   │   ├── skills/
│   │   └── ...
│   └── [locale]/         # All UI pages under [locale]
│       ├── layout.tsx     # Sets dir="rtl/ltr" + font per locale
│       ├── page.tsx
│       ├── tools/
│       └── ...
```

**Note:** API routes (`/api/*`) remain at their current location outside the `[locale]` segment. Only UI pages move under `[locale]`.

### RTL Support

- `layout.tsx` sets `dir="rtl"` or `dir="ltr"` on `<html>` based on locale
- Use Tailwind `rtl:` modifier for spacing and alignment
- Sidebar flips to right side in Arabic
- Replace all `ml-*`/`mr-*` with `ms-*`/`me-*` (logical properties)

### Translation Structure

```json
{
  "common": { "save": "Save", "cancel": "Cancel", "delete": "Delete", "search": "Search", "create": "Create", "edit": "Edit", "enable": "Enable", "disable": "Disable", "loading": "Loading...", "noResults": "No results found", "confirm": "Confirm", "back": "Back" },
  "nav": { "dashboard": "Dashboard", "tools": "Tools", "skills": "Skills", "plugins": "Plugins", "prompts": "Prompts", "subagents": "Subagents", "commands": "Commands", "resources": "Resources", "rules": "Rules", "roles": "Roles", "permissions": "Permissions", "mcpUsers": "MCP Users", "usage": "Usage", "analytics": "Analytics", "registry": "Registry Preview", "status": "System Status", "settings": "Settings", "marketplace": "Marketplace", "sync": "Sync" },
  "tools": { "title": "Tools", "create": "Create Tool", "name": "Name", "description": "Description", "handler": "Handler", "inputSchema": "Input Schema", "enabled": "Enabled", "allowedRoles": "Allowed Roles", "source": "Source" },
  "skills": { "title": "Skills", "create": "Create Skill", "upload": "Upload Skill", "content": "Content", "definition": "Definition", "steps": "Steps" },
  "marketplace": { "title": "Marketplace", "browse": "Browse", "install": "Install", "installed": "Installed", "update": "Update", "search": "Search packages...", "tags": "Tags", "version": "Version", "author": "Author", "noPackages": "No packages found" },
  "sync": { "title": "Sync Status", "check": "Check for Changes", "importAll": "Import All", "exportAll": "Export All", "synced": "Synced", "modified": "Modified", "conflict": "Conflict", "resolve": "Resolve", "lastSync": "Last synced" }
}
```

### Language Switcher

- Toggle button in topbar (AR/EN)
- Saves preference in cookie
- Redirects between `/en/tools` and `/ar/tools`

---

## 3. Refactoring Architecture

### Problem

Every page (tools, skills, plugins...) is a single 400-800 line monolithic file containing state, fetch logic, tables, forms, and dialogs.

### New Page Structure

```
app/[locale]/tools/
├── page.tsx              # Page shell - composes components only
├── _components/
│   ├── tools-table.tsx   # Data table display
│   ├── tool-form.tsx     # Create/edit form
│   ├── tool-dialog.tsx   # Dialog wrapper
│   └── tool-filters.tsx  # Filters and search (if applicable)
└── _hooks/
    └── use-tools.ts      # API calls + mutations (useQuery/useMutation)
```

### Shared Components

```
components/
├── layout/
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   └── page-header.tsx        # Page title + create button + search
├── ui/                         # Existing shadcn components (button, card, input...)
├── shared/
│   ├── data-table.tsx          # Unified table: sorting, pagination, empty state
│   ├── entity-dialog.tsx       # Unified CRUD dialog (create/edit mode)
│   ├── entity-form.tsx         # Form wrapper: validation + submit + loading
│   ├── confirm-delete.tsx      # Unified delete confirmation
│   ├── role-picker.tsx         # Role badge selector (moved from roles/)
│   ├── search-input.tsx        # Search input with debounce
│   ├── status-badge.tsx        # Status badge (enabled/disabled/error)
│   ├── empty-state.tsx         # Empty state with icon and text
│   ├── json-editor.tsx         # JSON editor (for inputSchema etc.)
│   └── markdown-editor.tsx     # Markdown editor (for skills and rules)
```

### Shared Hooks

```
hooks/
├── use-crud.ts           # Generic CRUD hook: list, create, update, delete
│                          # Wraps useQuery + useMutation + cache invalidation
├── use-debounce.ts       # Debounced values (for search)
└── use-locale.ts         # Helper for current locale and direction
```

### use-crud.ts Interface

```typescript
const { items, isLoading, create, update, remove } = useCrud<Tool>({
  endpoint: '/api/tools',
  queryKey: 'tools',
});
```

### Golden Rule

Logic NEVER changes - it only moves to its correct location. Every API call, validation, and state management stays identical but in a separate file.

---

## 4. Skills Folder Upload

### Expected Skill Folder Structure

```
my-skill/
├── SKILL.md           # Main content (markdown + optional JSON block)
├── metadata.json      # Optional: name, description, allowedRoles, enabled
└── assets/            # Optional: attached files (future)
```

### Frontend - Upload UI

- "Upload Skill" button on skills page opens dialog
- Drag & drop or file picker for `.zip` files
- After upload: shows preview (name, description, content) before confirmation
- If skill already exists with same name: asks "Update or Skip?"

### Backend API

```
POST /api/skills/upload
Content-Type: multipart/form-data
Body: zip file
```

Processing:
1. Receive zip -> decompress in memory (`jszip` library)
2. Find `SKILL.md` at root or one level deep
3. Read `metadata.json` if present (or derive name from folder name)
4. Parse markdown -> extract JSON block if present
5. Upsert in DB (create or update)
6. Return result: `{ created: [...], updated: [...], errors: [...] }`

### Multi-Upload Support

Supports zip containing multiple skill folders:
```
skills-pack.zip
├── skill-a/
│   └── SKILL.md
├── skill-b/
│   └── SKILL.md
└── skill-c/
    ├── SKILL.md
    └── metadata.json
```

### Validation

- `SKILL.md` required - rejected without it
- Name must be kebab-case or snake_case
- Max file size: 5MB per zip
- JSON block must be valid if present

---

## 5. Two-Way Sync (.cursor <-> DB)

**Scope:** Sync covers `.cursor/` directory specifically (the primary use case). The existing client-config system also generates `.claude/` and `.github/copilot/` files, but two-way sync is only implemented for `.cursor/` since that's where manual edits happen.

### Direction 1: DB -> .cursor (existing)

- `sync_client_config` tool generates `.cursor/skills/`, `.cursor/rules/`, etc.
- Runs on MCP initialize or manually
- No changes needed - just add hash tracking after each write

### Direction 2: .cursor -> DB (new)

### Change Detection via Hash Tracking

New Prisma model:
```prisma
model SyncState {
  filePath    String   @id
  entityType  String
  entityName  String
  contentHash String
  syncedAt    DateTime
}
```

On each sync check:
1. Read every file in `.cursor/`
2. Compute current SHA-256 hash
3. Compare with `SyncState`

| Scenario | DB hash vs file | Meaning |
|----------|----------------|---------|
| No change | Match | Synced |
| Local change | File hash differs | File was manually edited |
| DB change | DB hash differs | Admin edited via dashboard |
| Conflict | Both differ | Both changed since last sync |

### Conflict Resolution

- **Local change only:** Show diff in admin -> choose "Import to DB" or "Overwrite file"
- **DB change only:** Write to file automatically (existing behavior)
- **Conflict:** Show both side-by-side -> admin chooses which version

### Backend APIs

```
GET  /api/sync/status     # List all files + their state (synced/modified/conflict)
POST /api/sync/import     # Import local changes to DB
POST /api/sync/export     # Write DB to files (existing behavior)
POST /api/sync/resolve    # Resolve conflict (choose version)
```

### Admin UI - Sync Page

- Table of all synced files
- Status column: synced / modified / conflict (with icons)
- Buttons: "Import All", "Export All", "Resolve" per conflict
- Last sync timestamp

### Trigger Mechanism

- **Manual:** "Check for Changes" button in admin
- **Automatic:** On each MCP initialize (existing) + change check
- **No file watcher** - avoids complexity and performance issues

---

## 6. GitHub Marketplace

### Source Repository Structure

A single GitHub repo serves as the official registry (e.g., `rs4it/mcp-marketplace`):

```
mcp-marketplace/
├── registry.json
├── skills/
│   ├── code-review/
│   │   ├── SKILL.md
│   │   └── metadata.json
│   ├── git-workflow/
│   │   └── ...
├── rules/
├── prompts/
├── plugins/
├── subagents/
├── commands/
└── tools/
```

### registry.json Format

```json
{
  "version": "1.0",
  "packages": [
    {
      "name": "code-review",
      "type": "skill",
      "description": "AI-powered code review workflow",
      "version": "1.2.0",
      "author": "rs4it",
      "tags": ["dev", "review", "quality"],
      "path": "skills/code-review",
      "icon": "code",
      "downloads": 340
    }
  ]
}
```

### Backend APIs

```
GET  /api/marketplace/browse?type=skill&search=...&tag=...
     # Fetches registry.json from GitHub (cached 5 min)
     # Filters and searches

GET  /api/marketplace/package/:type/:name
     # Fetches single package details + README content

POST /api/marketplace/install
     Body: { type: "skill", name: "code-review", version: "1.2.0" }
     # Downloads content from GitHub raw API
     # Upserts in DB
     # Returns result

GET  /api/marketplace/updates
     # Compares installed versions with registry.json
     # Returns list of packages with available updates
```

### GitHub API Integration

- GitHub REST API (no key needed for public repos, optional key for rate limit increase)
- `GET /repos/{owner}/{repo}/contents/{path}` - fetch content
- `GET /repos/{owner}/{repo}/contents/registry.json` - fetch registry
- In-memory cache (5 minutes) to reduce API calls

### Installed Package Tracking

```prisma
model InstalledPackage {
  id            String   @id @default(cuid())
  type          String
  name          String
  version       String
  sourceRepo    String
  installedAt   DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([type, name])
}
```

### Admin UI - Marketplace Tab (per section)

Each entity section (tools, skills, plugins, rules, prompts, subagents, commands) gets a "Marketplace" tab.

**Card Design (VS Code Extensions style):**
- Icon + name + short description
- Colored tags
- Version + Author
- "Install" button (or "Update" or "Installed" checkmark)

**Features:**
- Text search + tag filters + sort (newest, popular)
- Detail view on card click: full README + content preview + install button

### Marketplace Settings

- Settings page field to change source repo (default: `rs4it/mcp-marketplace`)
- Optional GitHub token field (for private repos or higher rate limit)

---

## Implementation Order (Foundation-First)

### Layer 1: Infrastructure
1. Install dependencies (`next-intl`, Google Fonts, `jszip`)
2. Set up design system (CSS variables, globals.css, tailwind.config.ts)
3. Set up i18n infrastructure (messages/, i18n/, [locale] routing)
4. Create translation files (en.json, ar.json) with all keys

### Layer 2: Refactor + Redesign
5. Extract shared components (data-table, entity-dialog, entity-form, etc.)
6. Extract shared hooks (use-crud, use-debounce, use-locale)
7. Refactor each page one by one (tools -> skills -> plugins -> resources -> rules -> prompts -> subagents -> commands -> roles -> permissions -> mcp-users -> usage -> analytics -> registry -> status -> settings)
8. Redesign layout (sidebar, topbar) with new theme
9. Apply i18n to all pages and components

### Layer 3: New Features
10. Prisma schema changes (SyncState, InstalledPackage models)
11. Skills upload API + UI
12. Sync system (backend APIs + admin sync page)
13. Marketplace (backend APIs + admin marketplace tabs)
14. Dashboard redesign with new cards + marketplace overview

### Layer 4: Polish
15. Animations and micro-interactions
16. RTL fine-tuning
17. Empty states and loading skeletons
18. Error handling and edge cases
