# Cursor-like Integration Plan (RS4IT MCP Hub)

## الهدف
تحويل RS4IT MCP Hub ليكون **قريب عملياً من تجربة Cursor** في:

- تبويب/نظام **Rules** (مفقود حالياً).
- Skills مكتوبة “كتابة” (markdown-first) بدل الاعتماد على توليد (Generate).
- CRUD لـ **Rules / Skills / Roles** عبر **MCP Tools** من داخل الشات، بحيث تصبح مشتركة ومخزّنة مركزياً.
- إبقاء **Tools & MCP Plugins** كما هي لكن مع توحيد “الـ visibility / allowedRoles” عبر كل الطبقات.

## مبادئ تصميم (غير قابلة للتفاوض)
- **No Generate**: نتخلى عن AI Generate في الـ Dashboard ونوقف اعتماده كمسار أساسي.
- **Role-based visibility**: أي كيان جديد (Rules) لازم يدعم `allowedRoles?` مثل Tools/Skills/Plugins.
- **Cursor-like authoring**: Rule/Skill تُكتب كنص (Markdown) مع metadata بسيطة.
- **MCP-first authoring**: إضافة/تعديل/حذف Rules/Skills/Roles يكون عبر MCP tools مخصصة.

## ما الذي سنبقيه كما هو؟
- Skills تستمر كـ tools داخل `tools/list` (مثلاً `skill:<name>`)، لأن هذا يطابق طبيعة MCP وCursor.
- Roles الحالية (config + inheritance) تبقى.
- dynamic registry يبقى المصدر المركزي لـ tools/skills/plugins/prompts/resources.

## ما الذي سنغيّره؟
- إضافة **Rules** ككيان أول-صف (first-class):
  - تخزين + CRUD + تبويب في admin + ظهور/استهلاك عبر MCP.
- إضافة “Admin MCP tools” لعمل CRUD للـ Rules/Skills/Roles.
- تعديل UI/UX: إزالة “AI Generate” من Skills page.

## مراحل التنفيذ (بالترتيب)
- **01**: تعريف Rules كنموذج بيانات + تخزين + Admin CRUD UI/API + ربطها بالـ registry preview.
- **02**: إضافة MCP tools إدارية: upsert/delete لـ rule/skill/role مع صلاحيات role-based.
- **03**: إعادة تصميم Skills authoring لتكون markdown-first (بدون Generate).
- **04**: دمج Rules في runtime:
  - خيار A: Rules كـ resources/prompts مرجعية للـ agent.
  - خيار B: Rules كـ policies تقيد execution (اختياري/لاحق).

## تعريف “Done” العام
- عند الاتصال بالـ Hub من Cursor:
  - تظهر أدوات الإدارة فقط لمن يملك role مناسب.
  - يمكن إنشاء Rule/Skill/Role من الشات عبر tools.
  - تبويب Rules في admin يعمل (list/create/edit/delete + allowedRoles).
  - لا يوجد UI يعتمد على Generate كمسار أساسي.

