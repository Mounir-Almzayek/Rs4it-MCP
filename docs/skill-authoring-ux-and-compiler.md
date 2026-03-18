# Skill Authoring UX + Skill Compiler (Hybrid Cursor-like UX)

## الهدف

رفع تجربة إنشاء/تعديل الـ Skills لتصبح مثل Cursor (نص واحد → جرّب بسرعة) **مع الحفاظ على قوة MCP** (tools modular, routing, roles, policies).

**المبدأ الأساسي**

- **Authoring Experience (UX)**: المستخدم يكتب “Skill” كنص واحد.
- **Execution Architecture (MCP)**: النظام داخلياً يحوّل النص إلى خطة (IR) ويُنفّذها عبر tools/skills/plugins مع سياسات (Rules/Policies).

> النتيجة: UX بسيط للمستخدم + تنفيذ مضبوط وقابل للاختبار للنظام.

---

## لماذا لا نعتمد على Cursor نفسه كـ LLM للداشبورد؟

ممكن كحل داخلي للتجارب (developer-only) لكن **ليس كحل منتج**:

- **غير قابل للأتمتة/التوسع**: Cursor ليس خدمة API مضمونة للاستخدام من داشبورد/سيرفر.
- **الاعتمادية**: تحديثات Cursor/الـ UI/السياسات قد تغيّر السلوك بدون إشعار.
- **الخصوصية والحوكمة**: ربط “منتج” بمنصة IDE على أجهزة المطورين يصعّب الـ compliance والتدقيق.
- **الأداء والتكلفة**: ما في تحكم واضح بالـ caching والـ retries والـ fallbacks مثل خدمة LLM مستقلة.

الخيار الصحيح: **LLM خلف السيرفر عبر OpenRouter** (أو مزود آخر) + حوكمة كاملة داخل الـ Hub.

---

## المفاهيم (Entities) المطلوبة

### 1) Skill Spec (للمستخدم)

كيان واحد يظهر بالداشبورد كملف واحد أو نموذج واحد:

- `title` / `name`
- `skillText` (النص الحر)
- `examples` (اختياري)
- `constraints` (اختياري)
- `policySetIds` (اختياري: سياسات مرتبطة)

### 2) Skill IR (للمنظومة)

تمثيل وسيط داخلي (Intermediate Representation) قابل للتنفيذ:

- DAG / خطوات مرتبة
- لكل خطوة:
  - `kind`: tool | skill | pluginTool | llmTask (آخر حل)
  - `name`
  - `args` + `argsSchema`
  - `expects` (output schema)
  - `onError` (retry/abort/continue)

### 3) Policy (Rules) Engine

طبقة قواعد:

- **Soft rules**: حقن داخل prompt الترجمة.
- **Hard rules**: تحقق + منع + فلترة tools/params قبل التنفيذ.

أمثلة سياسات:

- منع الكتابة خارج `MCP_WORKSPACE_ROOT`
- منع `run_command` إلا allowlist
- فرض validation لكل input
- منع overwrite/delete إلا بإذن دور `admin`

---

## الـ UX النهائي (Progressive Disclosure)

### Default (لـ 90% من المستخدمين)

1. Textbox: “اشرح شو بدك السكيل يعمل”
2. زر **Generate**
3. يظهر **Preview**:
  - ملخص (1–3 أسطر)
  - خطوات بشرية (human steps)
  - تحذيرات/مخاطر (إن وجدت)
4. زر **Dry‑run** (بدون تنفيذ)
5. زر **Save**

### Advanced (Power users)

- Graph view (nodes/edges) أو Steps table
- عرض الأدوات المقترحة + args + schemas
- سياسة/قواعد مفعلة + سبب الرفض (إن وُجد)
- “Regenerate step” + “Disable step”

---

## الخطة التنفيذية على مراحل (Phased Roadmap)

> الهدف من التقسيم: أسرع قيمة للمستخدم، ثم hardening للأمان والأداء، ثم تحسينات advanced.

### Phase A — الأساسيات (IR + Compiler MVP)

**المخرجات**

- تعريف **IR Schema** ثابت (Zod/JSON Schema) داخل `src/types/`.
- “Skill Compiler” endpoint داخل الـ Hub:
  - Input: `skillText`, `policySetIds?`, `context?` (tool registry snapshot id)
  - Output: `ir`, `summary`, `risks[]`
- Validator صارم:
  - أي IR غير مطابق → Repair pass (LLM) ثم validate مرة ثانية

**معايير الإكمال**

- يمكن إدخال نص skill والنتيجة تكون IR صالح + preview واضح.
- لا يوجد تنفيذ في هذه المرحلة (compile فقط).

**ملاحظات أداء**

- نموذج LLM “سريع” للـ compile، وfallback “أقوى” عند فشل الإصلاح.
- Temperature منخفض + JSON-only output.

---

### Phase B — Dry‑Run + Policies (Rules حقيقية)

**المخرجات**

- Policy engine (soft+hard) يشتغل:
  - قبل الترجمة (inject)
  - بعد الترجمة (validate/filter)
  - قبل التنفيذ (preflight)
- Dry‑run endpoint:
  - يتحقق من: صلاحيات الدور، توفر الأدوات، schemas، paths/commands
  - يعيد: قائمة “Ok/Blocked” مع السبب (machine + human)

**معايير الإكمال**

- أي خطة تحاول مخالفة سياسة: تظهر للمستخدم سبب واضح قبل الحفظ/التنفيذ.

---

### Phase C — Execution Engine (تنفيذ حتمي من IR)

**المخرجات**

- Executor داخل Hub:
  - ينفّذ IR خطوة بخطوة عبر `routeToolCall`
  - retries/timeouts
  - نتيجة موحّدة + trace id
- تخزين execution trace (على الأقل في ملف/JSON) لعرضه في الداشبورد

**معايير الإكمال**

- نفس IR يعطي نفس تسلسل الاستدعاءات (deterministic قدر الإمكان).
- الأخطاء ترجع بشكل واضح مع step id وسبب الفشل.

---

### Phase D — Admin Panel UX (Cursor-like Authoring)

**المخرجات**

- صفحة Skill Editor:
  - textbox + generate/preview/dry‑run/save
  - advanced toggle
- “Explain why” (اختياري) يشرح اختيار الأدوات باختصار
- ربط الـ skill spec مع dynamic registry بحيث يظهر كـ `skill:<name>` مثل Phase 03

**معايير الإكمال**

- إنشاء Skill جديد بدون “تقسيم يدوي إلى 10 tools”.
- تعديل Skill ثم regenerate/dry‑run ثم save خلال دقائق.

---

### Phase E — Performance & Cost (Caching + Incremental)

**المخرجات**

- Cache compile:
  - key = hash(skillText + policy versions + tool registry snapshot version + compiler prompt version)
  - TTL + invalidation عند تغير registry/policies
- Incremental compile:
  - عند تعديل بسيط: إعادة توليد خطوة/جزء بدل كامل IR (إن أمكن)
- Streaming preview:
  - summary ثم steps ثم risks

**معايير الإكمال**

- إعادة فتح Skill محفوظ وإظهار IR بسرعة (بدون استدعاء LLM غالباً).
- تكلفة LLM تنخفض بشكل واضح مع الاستخدام المتكرر.

---

### Phase F — Quality Harness (قياس وتحسين مستمر)

**المخرجات**

- مجموعة “Golden Skills” + سيناريوهات (نجاح/فشل)
- مقاييس:
  - success rate
  - median latency (compile/dry‑run/run)
  - cost per compile
  - % تعديلات المستخدم بعد generate
- تحسين prompts/policies بناءً على النتائج

**معايير الإكمال**

- dashboard داخلي أو تقرير دوري يوضح التحسن/التدهور عبر الإصدارات.

---

## اختيار LLM عبر OpenRouter (استراتيجية عملية)

**Model routing**

- Compile: model سريع/اقتصادي
- Repair: model أقوى عند فشل الـ schema أو تعقيد عالي
- Explain (اختياري): model سريع

**Guardrails**

- JSON schema output only
- deterministic settings (temperature منخفض)
- max tokens مضبوط
- redact secrets من context

---

## نقاط التكامل مع وثائقكم الحالية

- **Skills كـ tools** موجودة (Phase 03 + `docs/architecture.md`).
- **Roles/Visibility** (Phase 09) يجب أن تدخل ضمن Policies/Hard rules.
- **Prompts/Resources** (Phase 13) مفيدة لتزويد “Compiler Prompt” و “Registry Snapshot Resource”.
- **Usage tracking** (Phase 12) يستخدم لتقييم نجاح/تكلفة الـ compiler + executor.

