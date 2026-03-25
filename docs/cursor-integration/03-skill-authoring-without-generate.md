# Phase 03 — Skills Authoring (No Generate, Cursor-like Writing)

## الهدف
إزالة “AI Generate” من واجهة Skills، واستبدالها بتجربة أقرب لـ Cursor:

- Skill تُكتب كنص Markdown واضح (workflow/checklist).
- Skill يمكن أن تحتوي steps (tool/plugin) لكن بدون الاعتماد على compiler/tokens.
- CRUD يتم من admin أو من MCP admin tools (Phase 02).

## تغييرات واجهة Admin (Skills)
### 1) إزالة Generate
- حذف/إخفاء زر “AI Generate” وكل الحوارات المرتبطة به.
- حذف استدعاءات `/api/skill-compiler/*` من صفحة `admin/app/skills/page.tsx`.

### 2) تحسين نموذج Skill
الحقول الأساسية تبقى:
- `name`
- `description`
- `instructions` (Markdown)
- `inputSchema` (JSON)
- `steps` (tool/plugin targets)
- `allowedRoles`
- `enabled`

### 3) UX improvements (اختياري لكن موصى به)
- “Templates”: زر يدرج قالب Markdown جاهز للمهارة.
- “Validate steps”: زر يتحقق أن كل `step.target` موجود في registry (tools/list) لدور محدد.

## شكل كتابة Skill (Markdown convention)
مثال بنية مقترحة:

- **Purpose**
- **Inputs**
- **Steps (human)**: خطوات مكتوبة
- **Tool steps (runtime)**: خطوات تشغيل فعلية (optional)
- **Safety / Notes**

