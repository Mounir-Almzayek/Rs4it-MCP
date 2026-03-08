# متطلبات المشروع — RS4IT MCP Hub

## إصدار Node.js

- **مطلوب**: Node.js **20.x** LTS أو أحدث (مثلاً 20.x، 22.x).
- يُفضّل استخدام [nvm](https://github.com/nvm-sh/nvm) أو [fnm](https://github.com/Schniz/fnm) لإدارة الإصدارات.

التحقق من الإصدار:

```bash
node -v
```

## اللغة والبناء

- **TypeScript** للمشروع بالكامل.
- البناء: `tsc` (خارج من `tsconfig.json`).
- التطوير: `tsx` لتشغيل ملفات `.ts` مباشرة دون بناء مسبق.

## الاعتماديات المخططة

| الحزمة | الاستخدام |
|--------|-----------|
| `@modelcontextprotocol/sdk` | مكتبة MCP الرسمية لبناء السيرفر (Phase 01+) |
| `typescript` | الترجمة والأنواع |
| `tsx` | تشغيل TypeScript أثناء التطوير (`npm run dev`) |

## متغيرات البيئة

- **`MCP_WORKSPACE_ROOT`** (اختياري): مسار جذر الـ workspace لعمليات الملفات (create_file، read_file). انظر [docs/security.md](security.md).
- **`MCP_PLUGINS_CONFIG`** (اختياري): مسار ملف إعداد الإضافات الخارجية (JSON). إن لم يُعرّف، يُستخدم `config/mcp_plugins.json` نسبةً لمجلد التشغيل.
- **الأدوار (Phase 09)**:
  - **`MCP_ROLE`** (اختياري، stdio): دور الاتصال (مثلاً `web_engineer`, `full_stack`). عند تعيينه، الـ Hub يعرض فقط الأدوات/المهارات/الإضافات المسموح لها لهذا الدور (مع الوراثة). إن لم يُعرّف، تُعرض كل الأدوات.
  - **`MCP_ROLES_CONFIG`** (اختياري): مسار ملف تعريف الأدوار والوراثة (JSON). إن لم يُعرّف، يُستخدم `config/roles.json`.
  - **HTTP**: العميل يمرّر الدور عبر هيدر **`X-MCP-Role`** أو عبر حقل **`params.role`** في طلب `initialize`؛ نفس الجلسة تستخدم هذا الدور طوال الاتصال.
- **للاستضافة على HTTP (Phase 07)**:
  - **`PORT`** أو **`MCP_PORT`** (اختياري): بورت السيرفر. الافتراضي: `3000`.
  - **`MCP_TRANSPORT`** (اختياري): `stdio` (افتراضي) أو `http`. يُستخدم عند تشغيل نقطة الدخول المناسبة فقط.
  - **`BASE_URL`** (اختياري): الرابط الأساسي للـ Hub (مثلاً `https://mcp.example.com`) للتوثيق أو إعداد العميل.

## تشغيل السيرفر (بعد Phase 01 و 07)

- **نقل stdio (محلي، مناسب لـ Cursor)**:
  - `npm run start` — تشغيل من `dist/`
  - `npm run dev` — تشغيل بتطوير سريع (tsx)
- **نقل HTTP (استضافة على سيرفر، Phase 07)**:
  - `npm run start:server` — تشغيل السيرفر الشبكي من `dist/`
  - `npm run dev:server` — تشغيل بتطوير سريع
  - انظر [docs/deployment.md](deployment.md) للاستضافة في الإنتاج.

أوامر البناء والتشغيل:

```bash
npm run build        # بناء المشروع
npm run start        # تشغيل stdio (محلي)
npm run start:server # تشغيل HTTP على بورت (مثلاً 3000)
npm run dev          # تطوير stdio
npm run dev:server   # تطوير HTTP
```

## التوثيق والمراحل

- مراحل التنفيذ مُعرّفة في **`docs/phases/`** ويجب اتباعها بالترتيب (00 → … → 09).
- الفهرس: [docs/README.md](README.md).
- استضافة HTTP في الإنتاج: [docs/deployment.md](deployment.md).
