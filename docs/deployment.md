# استضافة الـ Hub في الإنتاج (Phase 07)

هذا الملف يوضح كيفية تشغيل واستضافة الـ Hub كخدمة شبكية (Streamable HTTP) في بيئة إنتاج.

## المتطلبات

- Node.js 20.x أو أحدث
- بناء المشروع: `npm run build`

## تشغيل الخدمة

### تشغيل مباشر (Node)

```bash
npm run build
npm run start:server
```

السيرفر سيعمل على البورت المُعرّف في `PORT` أو `MCP_PORT` (الافتراضي: `3000`).

### متغيرات البيئة

| المتغير | الوصف | الافتراضي |
|--------|--------|-----------|
| `PORT` أو `MCP_PORT` | بورت الاستماع | `3000` |
| `BASE_URL` | الرابط الأساسي (للتوثيق أو إعداد العميل) | `http://localhost:${PORT}` |
| `MCP_WORKSPACE_ROOT` | جذر الـ workspace للأدوات | — |
| `MCP_PLUGINS_CONFIG` | مسار ملف إعداد الإضافات | `config/mcp_plugins.json` |
| `MCP_ROLE` | دور الاتصال (Phase 09، اختياري) | — |
| `MCP_ROLES_CONFIG` | مسار ملف الأدوار (Phase 09) | `config/roles.json` |

### نقطة النهاية (Endpoint)

- **الرابط**: `http://<host>:<port>/mcp`
- **البروتوكول**: MCP Streamable HTTP (POST للطلبات، GET لـ SSE، DELETE لإنهاء الجلسة).
- العميل يرسل طلب `initialize` أولاً (بدون هيدر `mcp-session-id`)، ويستلم من الرد هيدر `mcp-session-id` لاستخدامه في الطلبات التالية وطلب GET لـ SSE.
- **الأدوار (Phase 09)**: لفلترة الأدوات حسب الدور، أرسل هيدر **`X-MCP-Role`** (مثلاً `web_engineer`) مع طلب `initialize`، أو مرّر **`params.role`** داخل الطلب. الجلسة ستُربط بهذا الدور وتُعرض فقط الأدوات المسموح لها.

## تشغيل خلف Process Manager (PM2)

مثال تشغيل باستخدام [PM2](https://pm2.keymetrics.io/):

```bash
npm run build
pm2 start dist/server/http-entry.js --name rs4it-mcp-hub
pm2 save
pm2 startup  # إن لزم، لبدء PM2 عند إقلاع النظام
```

تعديل عدد النسخ أو الذاكرة حسب الحاجة، مثلاً:

```bash
pm2 start dist/server/http-entry.js --name rs4it-mcp-hub -i 1 --max-memory-restart 300M
```

## تشغيل داخل حاوية (Docker)

المشروع يتضمن **Docker Compose** لتشغيل الـ Hub وبانل الإدارة معاً، مع حجم تخزين مشترك للتكوين.

### المتطلبات

- Docker و Docker Compose (v2)
- ملف `.env` (انسخ من `.env.docker.example`) مع **SESSION_SECRET** (مطلوب للبانل، 16 حرفاً على الأقل)

### التشغيل السريع

```bash
cp .env.docker.example .env
# عدّل .env وضع SESSION_SECRET (مثلاً: openssl rand -base64 24)
docker compose up -d
```

- **Hub (MCP)**: `http://localhost:3000/mcp`
- **Admin Panel**: `http://localhost:3001` — أول مرة: ادخل إلى `/login` وأنشئ حساب المدير.

### أوامر مفيدة

```bash
docker compose up -d          # تشغيل في الخلفية
docker compose ps             # حالة الحاويات
docker compose logs -f hub    # سجلات الـ Hub
docker compose logs -f admin  # سجلات البانل
docker compose down           # إيقاف وحذف الحاويات
docker compose down -v        # إيقاف وحذف الحاويات وحجم التكوين
```

### بنية Docker

| المكون | الوصف |
|--------|--------|
| **Hub** | صورة من `Dockerfile` (جذر المشروع): بناء TypeScript ثم تشغيل `node dist/server/http-entry.js`. Entrypoint يهيئ مجلد التكوين من قيم افتراضية عند أول تشغيل. |
| **Admin** | صورة من `admin/Dockerfile`: Next.js standalone على بورت 3001. |
| **Volume `config_data`** | يُ mont على `/app/config` (Hub) و `/config` (Admin)؛ يخزن `roles.json`, `dynamic-registry.json`, `mcp_plugins.json`, `admin-credentials.json` بحيث يتشارك الـ Hub والبانل نفس التكوين. |
| **Workspace** | اختياري: mount مجلد المضيف على `/workspace` للـ Hub (أدوات الملفات). الافتراضي في `.env`: `WORKSPACE_PATH=./workspace`. |

### متغيرات البيئة (Compose)

راجع `.env.docker.example`. الأهم:

- **SESSION_SECRET**: مطلوب لمصادقة البانل.
- **HUB_PORT**, **ADMIN_PORT**: بورتات المضيف (الافتراضي 3000، 3001).
- **MCP_WORKSPACE_ROOT**: داخل الحاوية؛ استخدم mount للملفات المحلية.
- **WORKSPACE_PATH**: مسار على المضيف لـ mount كـ `/workspace` (لأدوات الملفات).

### تشغيل الـ Hub فقط (بدون البانل)

```bash
docker build -t rs4it-mcp-hub .
docker run -d -p 3000:3000 \
  -v rs4it_config:/app/config \
  -e MCP_WORKSPACE_ROOT=/workspace \
  -v /path/to/workspace:/workspace:ro \
  rs4it-mcp-hub
```

## خلف Reverse Proxy (HTTPS)

لتقديم الخدمة عبر HTTPS أو نطاق معيّن، ضع الـ Hub خلف reverse proxy (مثل Nginx أو Caddy):

- الـ Hub يعمل على `localhost:3000` (أو البورت المختار).
- الـ proxy يوجه الطلبات إلى `http://127.0.0.1:3000/mcp` (أو المسار الذي تعرّفه).
- إعداد SSL على مستوى الـ proxy؛ الـ Hub يبقى HTTP داخلياً.

مثال إعداد Nginx (مقتضب):

```nginx
location /mcp {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## الأمان

- عند تعريض الخدمة للشبكة العامة: استخدم **HTTPS** (عبر reverse proxy) وتجنب تشغيل الـ Hub مباشرة على 0.0.0.0 دون حماية.
- المصادقة والصلاحيات ستُفصّل لاحقاً (مثلاً في Phase 09 مع الأدوار).

## ربط Cursor أو عميل MCP آخر

بعد استضافة الـ Hub على سيرفر (مثلاً `https://your-domain.com/mcp` أو `http://your-server:3000/mcp`)، يمكنك إضافةه كـ **MCP مخصّص (Custom MCP)** في Cursor كالتالي.

### من واجهة Cursor (مُفضّل)

1. افتح **الإعدادات**: `Ctrl + ,` (Windows/Linux) أو `Cmd + ,` (macOS).
2. اذهب إلى **Tools & MCP** (أدوات و MCP).
3. اضغط **"Add new MCP server"** (إضافة سيرفر MCP جديد).
4. املأ الحقول:
   - **Name**: اسم تعريفي، مثلاً `rs4it-hub`.
   - **Type**: اختر **`streamableHttp`** (للسيرفرات المعتمدة على HTTP).
   - **URL**: رابط نقطة الـ MCP على السيرفر، مثلاً:
     - `https://your-domain.com/mcp` (إذا الـ Hub خلف reverse proxy مع HTTPS)
     - أو `http://your-server-ip:3000/mcp` (اتصال مباشر).
   - **Headers** (اختياري): إذا احتجت هيدر دور (Phase 09) أضف مثلاً:
     - `X-MCP-Role`: `web_engineer` (أو أي دور معرّف في `roles.json`).
5. احفظ ثم **أعد تشغيل Cursor بالكامل** حتى يظهر السيرفر ويُستخدم.

### من ملف التكوين (لمشروع معيّن)

يمكن وضع تكوين MCP خاص بالمشروع في `.cursor/mcp.json` في جذر المشروع:

```json
{
  "mcpServers": {
    "rs4it-hub": {
      "url": "https://your-domain.com/mcp",
      "transport": "streamableHttp",
      "headers": {
        "X-MCP-Role": "web_engineer"
      }
    }
  }
}
```

- غيّر `url` إلى رابط الـ Hub الفعلي بعد الاستضافة.
- `headers` و `X-MCP-Role` اختياريان (لفلترة الأدوات حسب الدور).

### ملاحظات

- **Cursor** يدعم أيضاً الاتصال عبر **stdio** (تشغيل محلي: `npm run start` وإضافة السيرفر في MCP كأمر `node`/`npx`).
- أي عميل MCP يدعم **Streamable HTTP** يمكنه الاتصال برابط `BASE_URL/mcp` واتباع تدفق initialize ثم الطلبات مع `mcp-session-id`.

## التحقق من العمل

بعد التشغيل:

1. إرسال طلب `initialize` (POST إلى `/mcp` بجسم JSON-RPC لـ initialize).
2. استلام الرد مع هيدر `mcp-session-id`.
3. استدعاء `tools/list` و `tools/call` باستخدام نفس الهيدر.

يمكن استخدام عميل MCP أو أداة مثل `curl` أو سكربت اختبار للتحقق من `tools/list` واستدعاء أداة.
