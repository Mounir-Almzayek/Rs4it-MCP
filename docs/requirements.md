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

- **`MCP_WORKSPACE_ROOT`** (اختياري): مسار جذر الـ workspace لعمليات الملفات (create_file، read_file). إن لم يُعرّف، يُستخدم `process.cwd()` عند بدء السيرفر. انظر [docs/security.md](security.md).
- لاحقاً قد تُستخدم:
  - `MCP_PLUGINS_CONFIG`: مسار ملف إعداد الإضافات الخارجية.
  - `MCP_TRANSPORT`: ناقل الاتصال (مثلاً `stdio` أو `sse`).

## تشغيل السيرفر (بعد Phase 01)

- **الطريقة الافتراضية**: نقل **stdio** — السيرفر يقرأ من stdin ويكتب إلى stdout (مناسب لـ Cursor وغيره).
- بديل مستقبلي: نقل **SSE** إذا دعت الحاجة لاتصال عبر HTTP.

أوامر التشغيل:

```bash
npm run build   # بناء المشروع
npm run start   # تشغيل السيرفر (من dist/)
npm run dev     # تشغيل بتطوير سريع (tsx، دون بناء)
```

## التوثيق والمراحل

- مراحل التنفيذ مُعرّفة في **`docs/phases/`** ويجب اتباعها بالترتيب (00 → 01 → … → 06).
- الفهرس: [docs/README.md](README.md).
