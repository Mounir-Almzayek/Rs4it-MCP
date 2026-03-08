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

مثال `Dockerfile` بسيط:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/server/http-entry.js"]
```

البناء والتشغيل:

```bash
npm run build
docker build -t rs4it-mcp-hub .
docker run -p 3000:3000 -e MCP_WORKSPACE_ROOT=/workspace -v /path/to/workspace:/workspace rs4it-mcp-hub
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

- **Cursor**: حالياً يدعم Cursor الاتصال عبر **stdio** (تشغيل `npm run start` وإضافة السيرفر في إعدادات MCP). عند دعم Cursor لـ MCP عبر HTTP، يمكن إضافة رابط الـ Hub (مثل `https://your-domain/mcp`) في إعدادات العميل.
- أي عميل MCP يدعم **Streamable HTTP** يمكنه الاتصال برابط `BASE_URL/mcp` واتباع تدفق initialize ثم الطلبات مع `mcp-session-id`.

## التحقق من العمل

بعد التشغيل:

1. إرسال طلب `initialize` (POST إلى `/mcp` بجسم JSON-RPC لـ initialize).
2. استلام الرد مع هيدر `mcp-session-id`.
3. استدعاء `tools/list` و `tools/call` باستخدام نفس الهيدر.

يمكن استخدام عميل MCP أو أداة مثل `curl` أو سكربت اختبار للتحقق من `tools/list` واستدعاء أداة.
