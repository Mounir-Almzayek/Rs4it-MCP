# Phase 10 — Admin Panel Authentication

## Goal

Introduce a **secure login system** for the admin panel that protects the panel UI and all its API endpoints, and allows admins to log in with username and password and change credentials from within the panel, without storing passwords in plain text.

---

## Expected Outputs

- **Admin login**: Ability to access the panel via username and password.
- **Secure storage**: Passwords are hashed only (bcrypt or argon2); plain text is never stored.
- **Credential change**: From inside the panel (after login) admins can change username and/or password.
- **Endpoint protection**: All panel API routes (e.g. `/api/tools`, `/api/skills`, `/api/plugins`, `/api/roles`, `/api/registry`) require authentication; unauthenticated requests return an error (e.g. 401).
- **Session or token auth**: Use either a session with a secure cookie or a token (JWT or other) passed in the header; documentation explains the chosen mechanism.
- **Redirect to login**: Visiting any panel page without auth redirects the user to the login page.
- **Documentation**: How to do initial credential setup, change them, and any environment variables.

---

## Sub-tasks

### 10.1 Credential storage

- [ ] Choose storage: encrypted config file, database (SQLite, etc.), or env vars for sensitive values only.
- [ ] Store **username** and **password hash** only; never store plain password.
- [ ] Use **bcrypt** or **argon2** for password hashing (resistant to rainbow tables and brute force).
- [ ] Define path or env var for credentials file/DB (e.g. `ADMIN_CREDENTIALS_PATH` or `ADMIN_DB_PATH`).

### 10.2 Login UI

- [ ] **Login page** (e.g. `/login`): username field, password field, login button.
- [ ] On success: create session or issue token, then redirect to the panel (e.g. `/` or `/dashboard`).
- [ ] On failure: show a clear error without revealing whether the mistake was username or password (security preference).
- [ ] Handle cases like disabled JavaScript or expired session (redirect to login).

### 10.3 Protecting panel and API routes

- [ ] **Middleware or HOC**: Check for valid session/token before allowing access to any protected page (except `/login`).
- [ ] **API protection**: Every route under `/api/*` (except e.g. `/api/auth/login` and maybe `/api/auth/health`) checks auth; if invalid return 401 Unauthorized.
- [ ] Centralize the check (read cookie or `Authorization: Bearer <token>` header) in one place (e.g. middleware or API route helper).

### 10.4 Session or token

- [ ] **Session option**: Use HTTP-only, Secure cookie in production, with a secret to sign the session; store session id on server or in encrypted session (e.g. Next.js or express-session).
- [ ] **Token option**: Issue JWT (or similar) after successful login; client sends it in `Authorization` header; verify signature and expiry on each protected API request.
- [ ] Define session/token lifetime and document it (e.g. 24 hours or 7 days with refresh).

### 10.5 Changing username and password

- [ ] From inside the panel (after login): page or section for **account settings** or **change credentials**.
- [ ] Form to change **username**: new value + confirm current password (or current password only); after verification update storage and re-login if needed.
- [ ] Form to change **password**: current password, new password, confirm new password; hash the new one and save.
- [ ] Protected API (e.g. `PUT /api/auth/credentials` or `PATCH /api/admin/me`) to apply changes; verify auth and current password before update.

### 10.6 Documentation and security

- [ ] Document in `docs/` (e.g. `docs/admin-auth.md` or a section in `docs/deployment.md`): how to do initial credential setup (first run or setup script).
- [ ] Document changing username and password from the panel.
- [ ] Recommendations: use HTTPS in production, do not expose the panel to the internet without auth, secure the credentials file/DB (readable only by the process).

---

## Completion Criteria

- Logging into the panel with username and password works; passwords are hashed (bcrypt or argon2) and never stored in plain text.
- All panel API routes (except login and declared essentials) require auth and return 401 when missing or invalid.
- Visiting any protected page without auth redirects to the login page.
- From inside the panel, username and password can be changed; changes are stored securely.
- Clear documentation for initial setup and credential changes.

---

## Dependencies

- **Phase 08** (admin panel) complete: panel app and API endpoints for managing tools, skills, plugins, etc.
- **Phase 09** (roles and visibility) is useful for context; panel auth is independent of MCP roles (panel roles = one or more admins per design).

---

## Suggested Files

| File / Folder | Purpose |
|---------------|---------|
| `admin/app/login/page.tsx` (or `admin/app/auth/login/page.tsx`) | Login page |
| `admin/app/api/auth/login/route.ts` | POST: verify credentials and issue session/token |
| `admin/app/api/auth/logout/route.ts` | POST: end session or invalidate token |
| `admin/app/api/auth/credentials/route.ts` (or `admin/.../me`) | GET/PUT: read or update username and password (protected) |
| `admin/middleware.ts` (Next.js) | Check auth and redirect to `/login` if needed |
| `admin/lib/auth.ts` (or `admin/lib/session.ts`) | Verify session/token, read user, auth helpers |
| `admin/lib/credentials.ts` (or server-only) | Read/write password hash and username (bcrypt/argon2) |
| `config/admin-credentials.json` or DB | Secure storage for username and hash (path from env) |
| `docs/admin-auth.md` | Panel auth docs, initial setup, credential change |

---

## Notes

- Initial setup: when no credentials file/DB exists, provide a script or setup page to create the first admin (username + password) then enable protection.
- Single admin vs multiple: can start with one admin account; the model can later be extended to multiple users with roles (admin, viewer, etc.) if desired.
- Relation to Phase 09: MCP roles (e.g. `developer`, `admin`) control tool visibility for clients; panel auth controls who can access the management UI only.
