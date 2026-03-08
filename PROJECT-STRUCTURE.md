# هيكلية المشروع — Company MCP Platform

هذا الملف يوضح هيكلية المجلدات والملفات **بدون كود** — فقط البنية والغرض من كل جزء.

---

## الشجرة الكاملة

```
rs4it mcp/
├── README.md                    # نظرة عامة وبداية سريعة
├── PROJECT-STRUCTURE.md         # هذا الملف — شرح الهيكلية
│
├── docs/                        # التوثيق
│   ├── README.md                # فهرس التوثيق وترتيب المراحل
│   └── phases/                  # مراحل التنفيذ (فاز)
│       ├── 00-overview-and-setup.md
│       ├── 01-phase-mcp-server.md
│       ├── 02-phase-tool-layer.md
│       ├── 03-phase-skills-registry.md
│       ├── 04-phase-external-plugins.md
│       ├── 05-phase-integration-routing.md
│       └── 06-phase-extensions-future.md
│
├── src/                         # الكود المصدري (يُضاف لاحقاً حسب المراحل)
│   ├── server/                  # Phase 01 — MCP Server Layer
│   ├── tools/                   # Phase 02 — Tool Layer
│   ├── skills/                  # Phase 03 — Skill Layer
│   ├── plugins/                 # Phase 04 — External Plugins Loader
│   ├── config/                  # تحميل الإعدادات الداخلية
│   └── types/                   # أنواع TypeScript المشتركة
│
└── config/                      # إعدادات التشغيل (مثلاً mcp_plugins.json)
```

---

## غرض كل مجلد

| المسار | المرحلة | الغرض |
|--------|---------|--------|
| `src/server/` | 01 | نقطة الدخول، تهيئة MCP، استقبال الطلبات وتوجيهها |
| `src/tools/` | 02 | تعريف وتنفيذ الأدوات الذرية (create_file، run_command، إلخ) |
| `src/skills/` | 03 | سجل المهارات و handlers السير العمل المركّبة |
| `src/plugins/` | 04 | تشغيل إضافات MCP خارجية عبر NPX والتواصل معها (stdio) |
| `src/config/` | 01, 05 | تحميل ثوابت وإعدادات (اسم السيرفر، إعداد الإضافات، إلخ) |
| `src/types/` | مشترك | واجهات وأنواع للأدوات، المهارات، التوجيه، الإضافات |
| `config/` | 04 | ملفات إعداد قابلة للتعديل (مثلاً قائمة الإضافات وأوامر NPX) |
| `docs/phases/` | — | مراحل التنفيذ المفصّلة للبدء بالتنفيذ لاحقاً |

---

## المراحل وعلاقتها بالمجلدات

- **Phase 00**: إعداد المشروع (package.json، tsconfig، اعتماديات) — لا مجلدات جديدة.
- **Phase 01**: `src/server/`, `src/config/`, `src/types/`.
- **Phase 02**: `src/tools/`, توسيع `src/types/`.
- **Phase 03**: `src/skills/`, توسيع `src/types/`.
- **Phase 04**: `src/plugins/`, `config/` (ملف إعداد الإضافات).
- **Phase 05**: توجيه موحّد (قد يكون داخل `src/server/` أو `src/router.ts`).
- **Phase 06**: توثيق توسعات مستقبلية — لا هيكلية جديدة إلزامية.

---

*يُحدَّث هذا الملف عند إضافة مجلدات أو مراحل جديدة.*
