# Company MCP Platform — Documentation

هذا المجلد يحتوي على توثيق المشروع ومراحل التنفيذ.

## المحتويات

| المجلد / الملف | الوصف |
|----------------|--------|
| **[evolution-roadmap.md](evolution-roadmap.md)** | خارطة التطوّر: استضافة على سيرفر، بانل إدارة، أدوار (Phase 07–09) |
| **phases/** | مراحل التنفيذ: ٠٠–٠٦ (أساس) ثم ٠٧–٠٩ (استضافة، بانل، أدوار) — اتبع الترتيب |
| **[architecture.md](architecture.md)** | قرارات التصميم (عرض المهارات كأدوات ببادئة `skill:`) والطبقات |
| **[skill-template.md](skill-template.md)** | قالب إضافة مهارة جديدة دون تعديل قلب السيرفر |
| **[security.md](security.md)** | سياسة أمان الأدوات (workspace، blocklist) |
| **[requirements.md](requirements.md)** | متطلبات التشغيل ومتغيرات البيئة |
| **future/** | توسعات مستقبلية (فهرس، أولويات) وتذكير تحسينات الجودة — [future/README.md](future/README.md) |

## ترتيب المراحل

المراحل مصممة لتُنفَّذ بالترتيب لأن كل مرحلة تعتمد على سابقتها.

### الأساس (00–06) — مكتمل

1. **[00 - Overview & Setup](phases/00-overview-and-setup.md)** — نظرة عامة، المتطلبات، وإعداد المشروع
2. **[01 - MCP Server Layer](phases/01-phase-mcp-server.md)** — طبقة السيرفر ونقطة الدخول
3. **[02 - Tool Layer](phases/02-phase-tool-layer.md)** — طبقة الأدوات الذرية
4. **[03 - Skills Registry & Dynamic Skills](phases/03-phase-skills-registry.md)** — سجل المهارات والمهارات الديناميكية
5. **[04 - External MCP Plugins & NPX](phases/04-phase-external-plugins.md)** — الإضافات الخارجية وتشغيلها عبر NPX
6. **[05 - Integration & Routing](phases/05-phase-integration-routing.md)** — التكامل وتوجيه الطلبات
7. **[06 - Extensions & Future](phases/06-phase-extensions-future.md)** — التوسعات والسيناريوهات المستقبلية

### التطوّر (07–09) — استضافة، بانل، أدوار

انظر **[evolution-roadmap.md](evolution-roadmap.md)** للسياق والأهداف.

8. **[07 - Server Hosting](phases/07-phase-server-hosting.md)** — استضافة الـ Hub على سيرفر (HTTP/SSE)
9. **[08 - Admin Panel](phases/08-phase-admin-panel.md)** — بانل إدارة Tools + Skills + Plugins
10. **[09 - Roles & Visibility](phases/09-phase-roles-and-visibility.md)** — أدوار وفلترة الأدوات (مفيد لـ Cursor)

## الهيكلية المقابلة في الكود

```
rs4it mcp/
├── docs/              ← أنت هنا
│   ├── evolution-roadmap.md   ← خارطة 07–09
│   ├── phases/        ← 00–09
│   └── future/
├── src/
│   ├── server/        ← Phase 01, 07 (http-entry)
│   ├── tools/         ← Phase 02
│   ├── skills/        ← Phase 03
│   ├── plugins/       ← Phase 04
│   ├── config/        ← Phase 01, 05
│   ├── types/         ← مشترك، Phase 09 (roles)
│   └── admin/         ← Phase 08 (بانل/تكوين ديناميكي)
└── config/            ← إعدادات التشغيل (plugins, etc.)
```

---

*آخر تحديث: حسب مراحل التنفيذ في `phases/`*
