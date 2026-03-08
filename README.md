# RS4IT MCP Hub

**منصة موحّدة** تعرض قدرات الشركة لأدوات الذكاء الاصطناعي (مثل Cursor) عبر **بروتوكول MCP** (Model Context Protocol). نقطة اتصال واحدة تجمع أدوات محلية، مهارات مركّبة، وإضافات MCP خارجية مع إدارة كاملة من بانل ويب وضبط ظهور الأدوات حسب الأدوار.

---

## أهمية المشروع

- **طبقة واحدة للـ AI**: عميل واحد (Cursor أو غيره) يتصل بـ Hub واحد فيحصل على كل الأدوات والمهارات والإضافات دون توزيع الإعداد على عدة سيرفرات.
- **معيار MCP**: توافق مع [Model Context Protocol](https://modelcontextprotocol.io/) لضمان عمل الأدوات مع أي عميل داعم (stdio أو HTTP).
- **مرونة التشغيل**: تشغيل محلي (stdio) لـ Cursor، أو استضافة على HTTP لفرق متعددة مع أدوار وصلاحيات.
- **إدارة بلا كود**: إضافة أدوات ومهارات وإضافات وتعديل الأدوار من البانل دون إعادة نشر التطبيق.

---

## ما الذي يوفّره المشروع؟

| المكوّن | الوصف |
|--------|--------|
| **أدوات ذرية (Tools)** | عمليات بسيطة: إنشاء/قراءة ملف، تشغيل أمر، استعلام؛ مع أمان workspace وblocklist. |
| **مهارات (Skills)** | سير عمل مركّبة تستدعي أدوات (مثل إنشاء API endpoint كامل)؛ تظهر كأدوات بأسماء `skill:<name>`. |
| **إضافات MCP (Plugins)** | دمج سيرفرات MCP خارجية عبر NPX؛ أدواتها تظهر بادئة `plugin:<id>:<name>`. |
| **أدوار وظهور (Roles)** | أدوار مع وراثة (مثل `full_stack` ← `web_engineer` + `backend_engineer`)؛ فلترة الأدوات حسب دور المتصل. |
| **بانل إدارة (Admin)** | تطبيق Next.js لإدارة Tools، Skills، Plugins، Roles، ومصفوفة الصلاحيات مع مصادقة آمنة. |
| **استضافة HTTP** | تشغيل الـ Hub كخدمة شبكية (Streamable HTTP) للوصول عن بُعد. |

---

## الهيكلية والتدفق

```
┌─────────────┐     MCP (stdio أو HTTP)      ┌──────────────────┐
│  Cursor /   │ ◄──────────────────────────► │  RS4IT MCP Hub   │
│  عميل AI    │   tools/list · tools/call    │  (سيرفر موحّد)   │
└─────────────┘                              └────────┬─────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    ▼                                 ▼                                 ▼
             ┌─────────────┐                   ┌─────────────┐                   ┌─────────────┐
             │   Tools     │                   │   Skills     │                   │   Plugins    │
             │  (محلي)     │                   │  (سير عمل)  │                   │  (خارجي)    │
             └─────────────┘                   └─────────────┘                   └─────────────┘
                    │                                 │                                 │
                    └─────────────────────────────────┼─────────────────────────────────┘
                                                      ▼
                                             ┌──────────────────┐
                                             │  Admin Panel     │
                                             │  (إدارة + أدوار) │
                                             └──────────────────┘
```

- **العميل** يرسل طلبات `initialize` ثم `tools/list` و `tools/call`.
- **الـ Hub** يجمّع القوائم من الأدوات المحلية + المهارات (كأدوات) + أدوات الإضافات، ويفلتر حسب الدور إن وُجد.
- **البانل** يقرأ/يكتب التكوين الديناميكي (أدوات، مهارات، إضافات، أدوار) ويشارك الملفات مع الـ Hub.

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| **Hub (Core)** | Node.js 20+، TypeScript، [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) |
| **البانل** | Next.js 14، React، Tailwind CSS، TanStack Query، React Flow (رسم الأدوار) |
| **المصادقة** | جلسة موقّعة (HMAC)، bcrypt لكلمات المرور |
| **التشغيل** | stdio (محلي)، Streamable HTTP (استضافة)، Docker Compose |

---

## البدء السريع

### المتطلبات

- **Node.js 20.x** أو أحدث  
- تفاصيل إضافية: [docs/requirements.md](docs/requirements.md)

### تشغيل الـ Hub (محلي — stdio لـ Cursor)

```bash
npm install
npm run build
npm run start
```

أو في وضع التطوير:

```bash
npm run dev
```

### تشغيل بانل الإدارة

```bash
cd admin
npm install
cp .env.example .env
# عدّل .env وضع SESSION_SECRET (16 حرفاً على الأقل)
npm run dev
```

البانل يعمل على **http://localhost:3001**. أول مرة: ادخل إلى `/login` وأنشئ حساب المدير.

### تشغيل الـ Hub كخدمة HTTP

```bash
npm run build
npm run start:server
```

الـ Hub يستمع على المنفذ **3000**؛ نقطة MCP: `http://localhost:3000/mcp`.

### تشغيل كل شيء بـ Docker

```bash
cp .env.docker.example .env
# عدّل .env وضع SESSION_SECRET (مثلاً: openssl rand -base64 24)
docker compose up -d
```

- **Hub**: http://localhost:3000/mcp  
- **Admin**: http://localhost:3001  
التفاصيل: [docs/deployment.md](docs/deployment.md).

---

## هيكل المشروع

```
rs4it mcp/
├── src/                    # قلب الـ Hub
│   ├── server/             # نقطة الدخول (stdio + HTTP)، تجميع الأدوات وتوجيه الطلبات
│   ├── tools/              # أدوات ذرية (create_file، read_file، run_command)
│   ├── skills/             # سجل المهارات و handlers
│   ├── plugins/             # تحميل وإدارة إضافات MCP الخارجية
│   ├── config/             # تحميل التكوين (ديناميكي، أدوار، إضافات)
│   ├── types/              # أنواع TypeScript المشتركة
│   └── router.ts           # توجيه tools/call حسب الاسم
├── admin/                  # بانل إدارة (Next.js)
│   ├── app/                # الصفحات و API (login، tools، skills، roles، permissions، إلخ)
│   ├── components/         # واجهة المستخدم (layout، أدوار، مصفوفة صلاحيات)
│   └── lib/                # اتصال بالتكوين (registry، roles، credentials)
├── config/                 # إعدادات التشغيل (roles.json، dynamic-registry، mcp_plugins، إلخ)
├── docs/                    # التوثيق والمراحل
│   ├── phases/             # مراحل التنفيذ 00–10
│   ├── architecture.md     # المعمارية وقرارات التصميم
│   ├── deployment.md       # الاستضافة و Docker
│   └── admin-auth.md       # مصادقة البانل
└── scripts/                # سكربتات (مثل docker entrypoint)
```

---

## التوثيق والمراحل

| المستند | المحتوى |
|---------|---------|
| [docs/README.md](docs/README.md) | فهرس التوثيق وترتيب المراحل |
| [docs/requirements.md](docs/requirements.md) | المتطلبات ومتغيرات البيئة |
| [docs/architecture.md](docs/architecture.md) | المعمارية، التسمية، الأدوار |
| [docs/deployment.md](docs/deployment.md) | الاستضافة، Docker، reverse proxy |
| [docs/admin-auth.md](docs/admin-auth.md) | مصادقة البانل والإعداد الأولي |
| [docs/phases/](docs/phases/) | مراحل التنفيذ 00–10 (نظرة عامة، MCP، أدوات، مهارات، إضافات، توجيه، استضافة، بانل، أدوار، مصادقة) |

المراحل مُصمَّمة لتُنفَّذ بالترتيب؛ كل مرحلة تعتمد على سابقتها.

---

## حالة التنفيذ

| المرحلة | الوصف | الحالة |
|---------|--------|--------|
| 00 | نظرة عامة وإعداد المشروع | ✅ |
| 01 | طبقة MCP Server (stdio، initialize، tools/list، tools/call) | ✅ |
| 02 | طبقة الأدوات، أمان workspace و blocklist | ✅ |
| 03 | سجل المهارات، عرض المهارات كأدوات `skill:*` | ✅ |
| 04 | إضافات MCP خارجية (NPX، stdio) | ✅ |
| 05 | توجيه موحّد واتفاقية تسمية | ✅ |
| 06 | توثيق التوسعات المستقبلية | ✅ |
| 07 | استضافة الـ Hub على HTTP/SSE | ✅ |
| 08 | بانل إدارة (Tools، Skills، Plugins) | ✅ |
| 09 | أدوار وظهور (وراثة، فلترة حسب الدور) | ✅ |
| 10 | مصادقة البانل (تسجيل دخول، تغيير الاعتماد) | ✅ |

---

## لقطات الشاشة (Screenshots)

لقطات من واجهة البانل — من [docs/screen](docs/screen).

### 1 — Dashboard

![Dashboard](docs/screen/Screenshot%202026-03-08%20155253.png)

### 2

![Screenshot 2](docs/screen/Screenshot%202026-03-08%20155312.png)

### 3

![Screenshot 3](docs/screen/Screenshot%202026-03-08%20155332.png)

### 4

![Screenshot 4](docs/screen/Screenshot%202026-03-08%20155357.png)

### 5

![Screenshot 5](docs/screen/Screenshot%202026-03-08%20155413.png)

### 6

![Screenshot 6](docs/screen/Screenshot%202026-03-08%20155427.png)

---

## بعد النشر (Deployment): الربط مع Cursor

بعد استضافة الـ Hub على سيرفر (Docker أو PM2 أو Node مباشرة)، نربطه في **Cursor** كسيرفر MCP مخصّص:

1. **Cursor** → الإعدادات (`Ctrl + ,`) → **Tools & MCP** → **Add new MCP server**
2. **Type**: `streamableHttp`
3. **URL**: رابط نقطة الـ MCP (مثلاً `https://your-domain.com/mcp` أو `http://your-server:3000/mcp`)
4. **Headers** (اختياري): `X-MCP-Role` إذا استخدمت الأدوار
5. حفظ ثم **إعادة تشغيل Cursor** بالكامل

للتفاصيل (واجهة Cursor وملف `.cursor/mcp.json`): [docs/deployment.md — ربط Cursor أو عميل MCP آخر](docs/deployment.md#ربط-cursor-أو-عميل-mcp-آخر).

---

## الترخيص والحالة

- **الترخيص**: UNLICENSED (استخدام داخلي حسب سياسة المشروع).
- المشروع مبني على تقرير المعمارية **Company MCP Platform — System Architecture** ويُحدَّث مع كل مرحلة في `docs/phases/`.
