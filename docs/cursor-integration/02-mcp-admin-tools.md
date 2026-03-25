# Phase 02 — MCP Admin Tools (CRUD for Rules/Skills/Roles)

## الهدف
تقديم أدوات MCP جديدة تسمح بإنشاء/تعديل/حذف:

- Rules
- Skills (dynamic registry skills)
- Roles (roles.json)

من داخل Cursor chat مباشرة، بحيث تصبح التغييرات “shared” ومخزنة في ملفات المشروع (config).

## مبادئ أمان
هذه الأدوات **لازم** تكون مقيدة بدور (role) معيّن:

- افتراضياً: فقط role = `admin` يرى ويستعمل هذه الأدوات.
- منع أي “مستخدم عادي” من التعديل على config حتى لو يقدر يتصل بالـ Hub.

## أسماء الأدوات المقترحة (Tool naming)
- `admin_upsert_tool`
- `admin_delete_tool`
- `admin_publish_cursor_plugin_bundle`
- `admin_upsert_rule`
- `admin_delete_rule`
- `admin_upsert_skill`
- `admin_delete_skill`
- `admin_upsert_role`
- `admin_delete_role`
- (اختياري) `admin_set_default_role`

## المدخلات (Input schemas)
حد أدنى، كل tool يكون له schema واضح وموحد.

### Tool
`admin_upsert_tool`
- `name` (string, required)
- `description` (string)
- `handlerRef` (enum: create_file | read_file | run_command)
- `inputSchema` (object, optional)
- `enabled` (boolean, default true)
- `allowedRoles` (string[])

`admin_delete_tool`
- `name` (string, required)

### Cursor Plugin bundle (Team Marketplace)
`admin_publish_cursor_plugin_bundle`
- `repoName` (string, required) — repo folder name (kebab-case)
- `pluginName` (string, required) — Cursor plugin name (kebab-case)
- `description` (string)
- `version` (string)
- `authorName` (string)
- `outputDir` (string) — absolute path
- `overwrite` (boolean, default true)
- `includeSkills` (boolean, default true)
- `includeRules` (boolean, default true)
- `includeMcpConfig` (boolean, default false)
- `mcpServerName` (string, default "rs4it-hub")
- `mcpUrl` (string) — required if includeMcpConfig=true
- `mcpHeaders` (object)

### Rule
`admin_upsert_rule`
- `name` (string, required)
- `description` (string)
- `content` (string, markdown, required)
- `enabled` (boolean, default true)
- `allowedRoles` (string[])

`admin_delete_rule`
- `name` (string, required)

### Skill
`admin_upsert_skill`
- `name` (string, required)
- `description` (string)
- `instructions` (string, markdown)  // النص المكتوب الذي يشرح المهارة
- `steps` (array)                    // optional في أول نسخة إن قررنا markdown-first مع parser لاحقاً
- `inputSchema` (object)
- `enabled` (boolean)
- `allowedRoles` (string[])

`admin_delete_skill`
- `name` (string)

### Role
`admin_upsert_role`
- `id` (string)
- `name` (string)
- `inherits` (string[])

`admin_delete_role`
- `id` (string)

## سلوك “Upsert”
upsert = create إذا غير موجود + update إذا موجود.

## ربط التنفيذ (Implementation approach)
بدل إعادة اختراع CRUD:
- نفس منطق الـ Admin API (read/write registry + read/write roles config) يستعمله الـ MCP tools أيضاً.
- هذا يضمن أن أي شيء ينشأ من الشات يظهر مباشرة في الـ Dashboard والعكس.

## التحديث/الانعكاس على `tools/list`
ملاحظة MCP/clients:
- غالباً التغيير لن يظهر فوراً في قائمة tools عند Cursor إلا بعد reconnect / re-initialize.
- نضيف tool اختياري:
  - `admin_hint_reconnect` يرجع رسالة توصي بإعادة الاتصال للحصول على tool list محدث.

## تعريف “Done”
- هذه الأدوات تظهر فقط عند role مناسب.
- تشغيل upsert/delete يكتب فعلياً على config files ويظهر أثره في admin.
- لا يوجد تسريب للأدوات الإدارية لغير admin.

