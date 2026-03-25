# Phase 01 — Add Rules (Admin + Storage + Visibility)

## الهدف
إضافة “Rules” ككيان جديد في RS4IT MCP Hub، مشابه في الروح لـ Cursor Rules:

- Rule تُكتب كنص Markdown.
- لها metadata: `name`, `description`, `enabled`, `allowedRoles?` (+ لاحقاً `globs?` إذا احتجناه).
- تظهر في لوحة الـ Admin ضمن تبويب جديد “Rules”.
- تدخل ضمن الـ Registry Preview وتكون قابلة للعرض عبر MCP (Resources/Prompts).

## قرار التخزين (نقطة قرار)
اختر واحد:

### Option A — داخل `config/dynamic-registry.json`
- إضافة `rules: []` داخل نفس ملف registry.
- **Pros**: مصدر واحد لكل شيء، preview سهل.
- **Cons**: تغيير شكل الملف.

### Option B — ملف جديد `config/rules.json`
- **Pros**: تغيير أقل للـ registry.
- **Cons**: preview صار يحتاج دمج مصدرين.

> تنفيذ هذه المرحلة سيفترض **Option A** ما لم نقرر عكس ذلك قبل البدء بالكود.

## نموذج البيانات (Data model)
حد أدنى:

- `name: string` (unique, stable)
- `description: string`
- `content: string` (markdown)
- `enabled: boolean`
- `allowedRoles?: string[]`
- `updatedAt?: string`
- `source?: "admin" | "mcp"`
- `origin?: string` (اختياري)

لاحقاً (اختياري):
- `globs?: string` (للتقريب من Cursor “apply when matching files”)

## الـ Admin UI/UX
### تبويب جديد
- إضافة صفحة: `admin/app/rules/page.tsx`

### CRUD
- List rules
- Create rule
- Edit rule
- Delete rule
- Toggle enabled
- Allowed roles picker

### Dashboard shortcuts
- إضافة بطاقة “Rules” في `admin/app/page.tsx`
- إضافة Quick action “Create Rule”

## Admin API routes
إضافة:
- `admin/app/api/rules/route.ts`:
  - `GET` → list
  - `POST` → create
- `admin/app/api/rules/[id]/route.ts`:
  - `PUT` → update
  - `DELETE` → delete

## Visibility / allowedRoles
- نفس validation المستخدمة حالياً بـ tools/skills/prompts/resources.
- rules تظهر/تُدار بالكامل في admin.
- بالـ MCP exposure: نطبّق نفس `isAllowedForRole` عند التقديم للـ client.

## MCP Exposure (كيف تظهر للـ client)
اختر واحد أو الاثنين:

### Option 1 — Resources
- `resources/list` تعرض rule كـ `rs4it://rules/<name>`
- `resources/read` يرجّع محتوى markdown

### Option 2 — Prompts
- `prompts/list` تعرض “rule prompt” كمرجع سريع

> أول نسخة: Resources عادة أبسط وأكثر وضوحاً.

## تعريف “Done”
- يوجد تبويب `Rules` في admin مع CRUD كامل + allowedRoles + enabled.
- التخزين يعمل وتظهر rules في registry preview.
- يمكن للـ Hub تقديم rules عبر MCP (Resources أو Prompts) مع role filtering.

