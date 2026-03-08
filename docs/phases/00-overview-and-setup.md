# Phase 00 — Overview & Setup

## الهدف

إعداد بيئة المشروع والاعتماديات دون كتابة منطق الـ MCP Hub، والتأكد من وجود بنية مشروع واضحة وجاهزة للتنفيذ.

---

## المخرجات المتوقعة

- مشروع Node.js/TypeScript جاهز للتطوير
- هيكلية المجلدات كما في التقرير المعماري
- ملفات الاعتماديات (package.json) مع الإصدارات المناسبة
- دليل قراءة سريع للمراحل التالية

---

## المهام الفرعية

### 0.1 اختيار الـ Runtime واللغة

- [ ] تحديد: Node.js (إصدار LTS مدعوم، مثلاً 20.x)
- [ ] تحديد: TypeScript للمشروع بالكامل
- [ ] توثيق المتطلبات في `README.md` أو `docs/requirements.md`

### 0.2 تهيئة المشروع

- [ ] إنشاء أو تحديث `package.json`:
  - اسم المشروع (مثلاً `company-mcp-hub` أو `rs4it-mcp`)
  - نوع المشروع: `"type": "module"` إذا كان ES Modules
  - سكربتات: `build`, `start`, `dev`
- [ ] إضافة `tsconfig.json` مع إعدادات مناسبة (target, module, outDir, strict)
- [ ] عدم إضافة كود MCP فعلي في هذه المرحلة — فقط الهيكلية

### 0.3 الاعتماديات الأساسية (بدون تنفيذ كود MCP بعد)

- [ ] اختيار وتوثيق مكتبة MCP الرسمية للـ Server:
  - مثلاً: `@modelcontextprotocol/sdk` (أو البديل المعتمد في الشركة)
- [ ] إضافة كاعتماديات تطوير:
  - `typescript`
  - أداة بناء مثل `tsup` أو `esbuild` أو `tsc`
  - أداة تشغيل مثل `tsx` للتطوير
- [ ] توثيق الاعتماديات المخططة في `docs/phases/00-overview-and-setup.md` أو في جدول في الـ README

### 0.4 الهيكلية النهائية للمجلدات

التأكد من وجود المجلدات التالية (بدون كود داخلي أو مع `.gitkeep` فقط):

```
rs4it mcp/
├── docs/
│   ├── README.md
│   └── phases/
│       ├── 00-overview-and-setup.md
│       ├── 01-phase-mcp-server.md
│       ├── 02-phase-tool-layer.md
│       ├── 03-phase-skills-registry.md
│       ├── 04-phase-external-plugins.md
│       ├── 05-phase-integration-routing.md
│       └── 06-phase-extensions-future.md
├── src/
│   ├── server/      # MCP Server Layer
│   ├── tools/       # Tool Layer
│   ├── skills/      # Skill Layer
│   ├── plugins/     # Plugin Loader & communication
│   ├── config/      # Internal config loaders
│   └── types/       # Shared TypeScript types
├── config/          # Runtime config (e.g. mcp_plugins.json)
├── package.json
└── tsconfig.json
```

- [ ] التحقق من أن كل مجلد موجود وموثّق الغرض منه في هذا الملف أو في `docs/README.md`

### 0.5 التوثيق والمراجع

- [ ] إضافة ملف `docs/requirements.md` (اختياري) يلخص:
  - إصدار Node.js المطلوب
  - متغيرات البيئة إن وجدت
  - طريقة تشغيل السيرفر لاحقاً (مثلاً stdio vs SSE)
- [ ] الإشارة في الـ README الرئيسي إلى أن مراحل التنفيذ موجودة في `docs/phases/` وأن الترتيب مهم

---

## معايير الإكمال

- يمكن تشغيل `npm install` و `npm run build` (حتى لو البناء لا ينتج تنفيذ فعلي بعد)
- لا يوجد كود MCP أو أدوات أو مهارات — فقط الهيكلية والاعتماديات والتوثيق
- أي مطوّر يفتح المشروع يفهم من الـ README و `docs/` أين يبدأ (Phase 00 ثم 01، 02، ...)

---

## التبعيات

- لا توجد تبعيات على مراحل أخرى (هذه أول مرحلة).

---

## ملاحظات

- يمكن لاحقاً إضافة ESLint، Prettier، واختبارات في نهاية Phase 00 أو ضمن مرحلة مستقلة.
- إعداد Cursor أو أي عميل MCP للاتصال بالسيرفر يتم لاحقاً بعد Phase 01/05.
