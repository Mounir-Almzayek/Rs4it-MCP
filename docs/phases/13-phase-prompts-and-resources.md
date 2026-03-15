# Phase 13 — Prompts and Resources (البرومبتات والموارد)

## الهدف

إضافة **Prompts** و **Resources** إلى الـ Hub مثلما توفّرها بلجنات Cursor (مثل Figma: "1 prompts, 25 resources enabled"). يصبح السيرفر يعرض في Cursor أدوات + برومبتات + موارد في قائمة واحدة، مع إمكانية تصفية حسب الدور لاحقاً.

---

## المخرجات المتوقعة

- **قدرات MCP**: تفعيل `prompts: { listChanged: true }` و `resources: { listChanged: true }` في استجابة `initialize`.
- **برومبتات مدمجة**: تسجيل برومبت (أو أكثر) على الـ McpServer عبر `registerPrompt`: اسم، وصف، وسكيما وسيطات اختيارية، وcallback يعيد `{ messages: [ { role, content: { type: "text", text } } ] }`.
- **موارد مدمجة**: تسجيل موارد ثابتة أو قوالب موارد عبر `registerResource`: URI ثابت (مثلاً `rs4it://registry`) أو قالب (مثلاً `rs4it://tool/{name}`)، وcallback يقرأ المحتوى ويعيد `{ contents: [ { uri, mimeType?, text } ] }`.
- **تسجيل في السيرفر**: في `createServer`، بعد تسجيل الأدوات والسكيلز والبلجنات، استدعاء دوال تسجيل البرومبتات والموارد المدمجة بحيث يظهران في `prompts/list` و `resources/list` و `resources/list_templates` و `resources/read`.
- **اختياري لاحقاً**: برومبتات/موارد ديناميكية من لوحة الإدارة (config + API) مع تصفية حسب الدور.

---

## المهام الفرعية

### 13.1 تفعيل القدرات

- [x] في `src/config/constants.ts`: إضافة `prompts: { listChanged: true }` و `resources: { listChanged: true }` إلى `DEFAULT_CAPABILITIES`.
- [x] التأكد أن `createServer` يمرّر هذه القدرات إلى `new McpServer(..., { capabilities })` دون حذف قدرة `tools`.

### 13.2 طبقة البرومبتات المدمجة

- [x] إنشاء مجلد `src/prompts/` مع ملف تعريف برومبت واحد على الأقل، مثلاً:
  - **الاسم**: `hub_help` أو `rs4it_instructions`
  - **الوصف**: تعليمات موجزة لاستخدام الـ Hub (أدوات، سكيلز، بلجنات).
  - **الوسيطات**: اختيارية (مثلاً `topic`: سلسلة لاختيار قسم المساعدة).
  - **Callback**: يرجع `{ messages: [ { role: "user", content: { type: "text", text: "..." } } ] }`.
- [x] إنشاء `src/prompts/index.ts` يصدر دالة `registerBuiltInPrompts(server: McpServer)` تستدعي `server.registerPrompt(...)` لكل برومبت مدمج.
- [x] استدعاء `registerBuiltInPrompts(server)` من `server.ts` بعد إنشاء الـ server وقبل `return server`.

### 13.3 طبقة الموارد المدمجة

- [x] إنشاء مجلد `src/resources/` مع مورد ثابت واحد على الأقل، مثلاً:
  - **الاسم**: `registry` أو `hub_registry`
  - **URI**: `rs4it://registry` (أو مسار موحد يتبع اصطلاح المشروع).
  - **المحتوى**: نص (مثلاً JSON أو markdown) يلخص قائمة الأدوات/السكيلز/البلجنات المتاحة (يُبنى من السجلات الحالية عند القراءة).
- [x] إنشاء `src/resources/index.ts` يصدر دالة `registerBuiltInResources(server: McpServer)` تستدعي `server.registerResource(name, uri, metadata, readCallback)`.
  - **readCallback**(uri, extra): يعيد `Promise<{ contents: [ { uri, mimeType: "application/json" | "text/plain", text } ] }>`.
- [x] استدعاء `registerBuiltInResources(server)` من `server.ts` (بعد تسجيل الأدوات حتى يكون السجل مليئاً إن لزم).
- [ ] اختيارياً: مورد قالب مثل `rs4it://tool/{name}` لقراءة وصف أداة بالاسم؛ يتطلب استخدام `ResourceTemplate` و `UriTemplate` من الـ SDK.

### 13.4 التكامل في السيرفر

- [x] في `src/server/server.ts`:
  - استيراد `registerBuiltInPrompts` و `registerBuiltInResources`.
  - بعد إنشاء `McpServer` وتسجيل كل الأدوات (المدمجة + الديناميكية + البلجنات)، استدعاء:
    - `registerBuiltInPrompts(server)`;
    - `registerBuiltInResources(server)`.
- [x] التحقق أن Cursor (أو عميل MCP) يظهر "X prompts, Y resources" عند الاتصال بالـ Hub.

### 13.5 التوثيق والاختيارات المستقبلية

- [x] تحديث `docs/architecture.md`: قسم قصير عن "Prompts and Resources" واصطلاح URIs (مثلاً `rs4it://...`).
- [x] تحديث `README.md`: ذكر أن الـ Hub يعرض أدوات + برومبتات + موارد.
- [x] توثيق في هذا الملف (Phase 13): إمكانية إضافة برومبتات/موارد ديناميكية من لوحة الإدارة لاحقاً مع تصفية حسب الدور.

---

## معايير الإكمال

- العميل يستقبل في `initialize` قدرات `prompts` و `resources`.
- `prompts/list` يعيد برومبتاً مدمجاً واحداً على الأقل؛ `prompts/get` يعيد رسائل صحيحة.
- `resources/list` يعيد مورداً مدمجاً واحداً على الأقل؛ `resources/read` مع URI المورد يعيد محتوى نصياً صحيحاً.
- في Cursor تظهر "X tools, Y prompts, Z resources" للسيرفر rs4it-hub (أو ما يعادلها).

---

## التبعيات

- Phase 01 (MCP Server) و Phase 05 (التوجيه): السيرفر يعمل ويجمع الأدوات.
- لا تعتمد على Phase 08/09 للبرومبتات/الموارد المدمجة الأولى؛ التصفية حسب الدور يمكن إضافتها لاحقاً للبرومبتات/الموارد الديناميكية.

---

## الملفات المقترحة

| الملف | الغرض |
|-------|--------|
| `src/config/constants.ts` | إضافة `prompts` و `resources` إلى DEFAULT_CAPABILITIES |
| `src/prompts/index.ts` | تصدير registerBuiltInPrompts(server) |
| `src/prompts/hub-help.ts` | تعريف برومبت مدمج (اسم، وصف، وسيطات، callback) |
| `src/resources/index.ts` | تصدير registerBuiltInResources(server) |
| `src/resources/registry-resource.ts` | مورد rs4it://registry مع readCallback يبني المحتوى من السجلات |
| `src/server/server.ts` | استدعاء registerBuiltInPrompts و registerBuiltInResources |

---

## ملاحظات

- **أسماء URIs**: استخدام اصطلاح مثل `rs4it://registry` و `rs4it://tool/{name}` يمنع التصادم مع ملفات أو موارد خارجية.
- **البرومبتات**: يمكن أن تكون نصوصاً ثابتة أو مبنية ديناميكياً (مثلاً حسب قائمة الأدوات الحالية).
- **الموارد**: للمحتوى النصي استخدام `mimeType: "application/json"` أو `"text/markdown"` أو `"text/plain"` حسب المحتوى.
