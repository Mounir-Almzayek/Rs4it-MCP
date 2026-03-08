# Company MCP Platform — Documentation

هذا المجلد يحتوي على توثيق المشروع ومراحل التنفيذ.

## المحتويات

| المجلد / الملف | الوصف |
|----------------|--------|
| **phases/** | مراحل التنفيذ المفصّلة (فاز ٠ حتى ٦) — اتبعها بالترتيب عند البدء بالتنفيذ |

## ترتيب المراحل

المراحل مصممة لتُنفَّذ بالترتيب لأن كل مرحلة تعتمد على سابقتها:

1. **[00 - Overview & Setup](phases/00-overview-and-setup.md)** — نظرة عامة، المتطلبات، وإعداد المشروع
2. **[01 - MCP Server Layer](phases/01-phase-mcp-server.md)** — طبقة السيرفر ونقطة الدخول
3. **[02 - Tool Layer](phases/02-phase-tool-layer.md)** — طبقة الأدوات الذرية
4. **[03 - Skills Registry & Dynamic Skills](phases/03-phase-skills-registry.md)** — سجل المهارات والمهارات الديناميكية
5. **[04 - External MCP Plugins & NPX](phases/04-phase-external-plugins.md)** — الإضافات الخارجية وتشغيلها عبر NPX
6. **[05 - Integration & Routing](phases/05-phase-integration-routing.md)** — التكامل وتوجيه الطلبات
7. **[06 - Extensions & Future](phases/06-phase-extensions-future.md)** — التوسعات والسيناريوهات المستقبلية

## الهيكلية المقابلة في الكود

```
rs4it mcp/
├── docs/              ← أنت هنا
│   └── phases/
├── src/
│   ├── server/        ← Phase 01
│   ├── tools/         ← Phase 02
│   ├── skills/        ← Phase 03
│   ├── plugins/       ← Phase 04
│   ├── config/        ← Phase 01, 05
│   └── types/         ← مشترك
└── config/            ← إعدادات التشغيل (plugins, etc.)
```

---

*آخر تحديث: حسب مراحل التنفيذ في `phases/`*
