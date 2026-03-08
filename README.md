# Company MCP Platform (MCP Hub)

منصة موحّدة تعرّض قدرات الشركة لأدوات الذكاء الاصطناعي (مثل Cursor) عبر **بروتوكول MCP** (Model Context Protocol).

## الهدف

- **طبقة واحدة**: عميل واحد (مثل Cursor) يتصل بـ MCP Hub واحد.
- **أدوات ذرية**: تنفيذ عمليات بسيطة (إنشاء ملف، تشغيل أمر، استعلام، إلخ).
- **مهارات**: سير عمل مركّبة مبنية على الأدوات (مثل إنشاء API endpoint كامل).
- **إضافات خارجية**: دمج سيرفرات MCP أخرى وتشغيلها ديناميكياً عبر NPX.

## الهيكلية

```
Cursor AI  →  Company MCP Hub  →  Tools + Skills + External MCP Plugins
```

تفاصيل الهيكلية والمراحل في **[docs/](docs/)** و **[docs/phases/](docs/phases/)**.

## أين أبدأ؟

1. **مراحل التنفيذ**: اتبع الملفات في **`docs/phases/`** بالترتيب (00 → … → 06 أساس، ثم 07–09 استضافة/بانل/أدوار). الترتيب مهم لأن كل مرحلة تعتمد على سابقتها.
  الفهرس: [docs/README.md](docs/README.md)
2. **المتطلبات**: إصدار Node.js، الاعتماديات، وطريقة التشغيل موثّقة في [docs/requirements.md](docs/requirements.md).
3. **الهيكلية الحالية**: المجلدات جاهزة؛ الكود يُضاف حسب كل مرحلة.
  انظر: [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)

## المجلدات الرئيسية


| المجلد         | الغرض                                  |
| -------------- | -------------------------------------- |
| `src/server/`  | طبقة MCP Server — نقطة الدخول والتسجيل |
| `src/tools/`   | طبقة الأدوات الذرية                    |
| `src/skills/`  | سجل المهارات والـ handlers             |
| `src/plugins/` | تحميل والتواصل مع إضافات MCP الخارجية  |
| `src/config/`  | تحميل الإعدادات الداخلية               |
| `src/types/`   | أنواع TypeScript المشتركة              |
| `config/`      | إعدادات التشغيل (مثلاً قائمة الإضافات) |
| `docs/phases/` | مراحل التنفيذ المفصّلة                 |


## الحالة الحالية

- ✅ Phase 00: إعداد المشروع (package.json، tsconfig، اعتماديات، توثيق)
- ✅ Phase 01: طبقة MCP Server (stdio، initialize، tools/list، tools/call)
- ✅ Phase 02: طبقة الأدوات (create_file، read_file، run_command)، سجل مركزي، أمان workspace و blocklist
- ✅ Phase 03: سجل المهارات، مهارة create_api_endpoint، عرض المهارات كأدوات (skill:)
- ✅ Phase 04: إضافات MCP خارجية (NPX، stdio)، تحميل وإغلاق مع دورة الحياة
- ✅ Phase 05: توجيه موحّد (أدوات + مهارات + إضافات)، اتفاقية تسمية، routeToolCall للمهارات
- ✅ Phase 06: توثيق التوسعات المستقبلية وتحسينات الجودة (docs/future/)
- 📋 **التطوّر (07–09):** استضافة على سيرفر، بانل إدارة، أدوار — [docs/evolution-roadmap.md](docs/evolution-roadmap.md)
- ✅ **Phase 08:** بانل إدارة (Tools + Skills + Plugins) — تطبيق Next.js في **`admin/`**، تشغيل: `cd admin && npm run dev` (منفذ 3001)
- ✅ هيكلية المجلدات

---

*المشروع مبني على تقرير المعمارية: Company MCP Platform — System Architecture.*