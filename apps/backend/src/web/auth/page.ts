import type { RoleDefinition } from "../../types/roles.js";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderAuthPage(options: {
  email: string;
  role: string;
  roles: RoleDefinition[];
  adminRoleId: string;
}): string {
  const { email, role, roles, adminRoleId } = options;
  const optionsHtml = roles
    .map((r) => {
      const selected = r.id === role ? " selected" : "";
      return `<option value="${escapeHtml(r.id)}"${selected}>${escapeHtml(r.name || r.id)} (${escapeHtml(r.id)})</option>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RS4IT Hub · Login</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; background: #0b1020; color: #e6e9f2; }
    a { color: #9bbcff; }
    .wrap { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 32px 16px; }
    .card { width: 100%; max-width: 460px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
    .title { display:flex; align-items:center; gap:10px; margin: 0 0 6px; font-size: 18px; font-weight: 700; }
    .sub { margin: 0 0 18px; color: rgba(230,233,242,0.75); font-size: 13px; line-height: 1.45; }
    label { display:block; font-size: 12px; color: rgba(230,233,242,0.80); margin: 12px 0 6px; }
    input, select { width: 100%; box-sizing:border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color: #e6e9f2; outline: none; }
    input:focus, select:focus { border-color: rgba(155,188,255,0.8); box-shadow: 0 0 0 3px rgba(155,188,255,0.15); }
    .row { display:flex; gap:10px; margin-top: 16px; }
    .btn { flex:1; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); cursor:pointer; background: rgba(155,188,255,0.18); color:#e6e9f2; font-weight: 700; }
    .btn.secondary { background: transparent; }
    .msg { margin-top: 10px; min-height: 18px; font-size: 12px; color: #ffb4b4; }
    .hint { margin-top: 14px; font-size: 12px; color: rgba(230,233,242,0.70); }
    code { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); padding: 1px 6px; border-radius: 8px; }
    .hidden { display:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="title">RS4IT Hub Login</div>
      <p class="sub">Session is stored in secure cookies. Opening <code>/mcp</code> in a browser will redirect here instead of showing the raw <code>mcp-session-id</code> error.</p>

      <form id="f">
        <label>Email</label>
        <input name="email" value="${escapeHtml(email)}" placeholder="you@example.com" autocomplete="email" />

        <label>Role</label>
        <select name="role" id="role">
          <option value="">(no role)</option>
          ${optionsHtml}
        </select>

        <div id="adminGate" class="hidden">
          <label>Admin dashboard password</label>
          <input name="adminPassword" type="password" autocomplete="current-password" />
        </div>

        <label>System2030 password (required)</label>
        <input name="password" type="password" autocomplete="current-password" />

        <div class="row">
          <button class="btn" type="submit">Login</button>
          <button class="btn secondary" type="button" id="logout">Logout</button>
        </div>
        <div class="msg" id="msg"></div>
      </form>

      <div class="hint">
        Each new MCP initialize requires fresh auth from this page.
      </div>
    </div>
  </div>

  <script>
    const adminRoleId = ${JSON.stringify(adminRoleId)};
    const role = document.getElementById('role');
    const adminGate = document.getElementById('adminGate');
    const msg = document.getElementById('msg');
    const logout = document.getElementById('logout');
    const f = document.getElementById('f');

    function syncGate() {
      const v = String(role.value || '');
      adminGate.classList.toggle('hidden', v !== adminRoleId);
    }
    role.addEventListener('change', syncGate);
    syncGate();

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const data = Object.fromEntries(new FormData(f).entries());
      const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) { msg.textContent = await r.text(); return; }
      const params = new URLSearchParams(location.search);
      location.href = params.get('continue') || '/';
    });

    logout.addEventListener('click', async () => {
      await fetch('/auth/logout', { method: 'POST' });
      location.reload();
    });
  </script>
</body>
</html>`;
}

