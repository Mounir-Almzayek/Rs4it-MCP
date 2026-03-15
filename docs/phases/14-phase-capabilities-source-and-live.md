# Phase 14: Capabilities source attribution & live snapshot

## الهدف

1. **مصدر كل أداة/سكيل/برومبت/ريسورس**: في الداشبورد يظهر هل المصدر **يدوي** (من الـ registry الذي يحرره المستخدم) أم من **MCP مضمن** (بلجن خارجي).
2. **قائمة محدثة من الـ Hub**: كل ما يحدث عند عمل "كوكت" (اتصال) بالـ Hub، أو أي تعديل على الـ MCP المضاف من شركة خارجية، ينعكس فوراً على الداشبورد عبر **snapshot** يُكتب عند كل اتصال.

## الفوائد

- رؤية واضحة: أي أدوات من الـ registry (يدوي) وأيها من البلجنات (MCP خارجي).
- قائمة الأدوات المعروضة للـ AI محدثة في كل اتصال (لأن الـ Hub يبني السيرفر من الـ registry + البلجنات في بداية كل جلسة).
- أي تغيير في الـ MCP الخارجي (تحديث من الشركة) يظهر في الـ snapshot عند الاتصال التالي.

## التصميم

### 1. Hub: جمع الـ capabilities مع المصدر

- أثناء `createServer()` عند تسجيل كل أداة/سكيل/برومبت/ريسورس نضيف سجلة إلى مصفوفة مع حقل **source**:
  - **built-in**: أدوات مدمجة في الـ Hub.
  - **skill**: سكيلز مدمجة (أدوات من نوع skill:name).
  - **dynamic**: من الـ registry (يدوي) — أدوات، سكيلز، برومبتات، موارد.
  - **plugin**: من بلجن خارجي؛ مع **pluginId** لمعرفة أي MCP.

- بنية الـ snapshot (مثال):

```ts
interface CapabilitiesSnapshot {
  updatedAt: string; // ISO
  tools: Array<{
    name: string;
    description?: string;
    source: "built-in" | "skill" | "dynamic" | "plugin";
    pluginId?: string; // when source === "plugin"
  }>;
  prompts: Array<{ name: string; description?: string; source: "dynamic" }>;
  resources: Array<{ name: string; uri: string; description?: string; source: "dynamic" }>;
}
```

- `createServer(options)` يقبل اختيارياً `onCapabilitiesSnapshot?: (snapshot: CapabilitiesSnapshot) => void` ويستدعيها في نهاية البناء بعد تسجيل كل شيء.

### 2. Hub: كتابة الـ snapshot عند كل اتصال

- في `http-entry.ts` عند إنشاء الجلسة نمرر `onCapabilitiesSnapshot` لـ `createServer`.
- الـ callback يكتب الملف `config/mcp_capabilities_snapshot.json` (نفس مجلد الـ registry، عبر مسار موحد مع `getDynamicRegistryPath()`).

- مسار الملف: نفس دليل الـ config (مثلاً `path.join(path.dirname(getDynamicRegistryPath()), "mcp_capabilities_snapshot.json")`).

### 3. Admin: قراءة الـ snapshot وعرضه

- **API**: `GET /api/capabilities` يقرأ من نفس المسار المعتاد للـ config (بنفس منطق `readRegistry` في الأدمن) ملف `mcp_capabilities_snapshot.json` ويعيده. إن لم يوجد الملف نعيد `{ tools: [], prompts: [], resources: [], updatedAt: null }`.

- **الداشبورد**:
  - **صفحة "Live capabilities" أو توسيع "Registry Preview"**: جدول/كروت تعرض كل الأدوات (والسكيلز كأدوات) مع عمود **Source**: Built-in | Manual (dynamic) | Skill | Plugin: &lt;id&gt;.
  - في صفحة **Plugins**: بجانب كل بلجن نعرض "الأدوات من هذا الـ MCP" (من الـ snapshot حيث `source === "plugin"` و `pluginId === id`).
  - إظهار **updatedAt** ليعرف المستخدم آخر مرة تم فيها تحديث القائمة (آخر اتصال بالـ Hub).

### 4. التزامن مع التعديلات

- **إضافة/تعديل MCP في الداشبورد**: يحدث في الـ registry. عند **الاتصال التالي** للـ Hub، الـ Hub يقرأ الـ registry ويحمّل البلجنات الجديدة ويكتب الـ snapshot → الداشبورد يعرض الأدوات الجديدة بعد أول كوكت.
- **تحديث من شركة خارجية** (إصدار جديد من الـ MCP): عند إعادة تشغيل الـ Hub أو عند الاتصال التالي (حسب كيفية تحميل البلجنات)، الـ Hub يحصل على القائمة المحدثة من الـ MCP ويكتبها في الـ snapshot → تنعكس على الداشبورد فور قراءة الـ snapshot.

## الملفات المتوقعة

| المكون | الملفات |
|--------|---------|
| Hub | `src/types/capabilities-snapshot.ts`, `src/config/capabilities-snapshot.ts` (كتابة)، `src/server/server.ts` (جمع + استدعاء callback)، `src/server/http-entry.ts` (تمرير callback وكتابة) |
| Admin | `admin/lib/capabilities.ts` (قراءة من نفس مسار الـ config)، `admin/app/api/capabilities/route.ts`، تحديث صفحة Registry أو صفحة جديدة "Live capabilities"، تحديث صفحة Plugins لعرض أدوات كل بلجن من الـ snapshot |

## ملاحظات

- الـ snapshot يعكس **آخر جلسة تم إنشاؤها** (آخر اتصال). إذا لم يتصل أي عميل بعد إضافة بلجن جديد، الـ snapshot يبقى قديماً حتى يحدث اتصال. يمكن لاحقاً إضافة زر "Refresh capabilities" في الأدمن يفتح اتصالاً قصيراً بالـ Hub ليقوم بإنشاء جلسة مؤقتة وتحديث الـ snapshot (اختياري لاحقاً).
