# Admin Panel Authentication — Phase 10

This document describes how to set up and use the login system for the admin panel.

## Requirements

- **SESSION_SECRET** (or **ADMIN_SESSION_SECRET**): Secret key for creating and signing the login session. Must be at least 16 characters. **Required** to enable authentication.
- **ADMIN_CREDENTIALS_PATH** (optional): Path to the credentials file (username and password hash). If not set, `../config/admin-credentials.json` is used relative to the panel’s working directory.

## Initial Setup

1. Set the **SESSION_SECRET** (or ADMIN_SESSION_SECRET) environment variable before starting the panel:
   ```bash
   export SESSION_SECRET="your-secret-at-least-16-chars"
   ```
   Or in `.env.local` inside the `admin/` folder:
   ```
   SESSION_SECRET=your-secret-at-least-16-chars
   ```

2. Start the panel (e.g. `npm run dev` from the `admin/` folder).

3. Open `/login` in the browser. If no credentials file exists yet, you will see the **Create admin account** page (username + password). Enter the details and click "Create account".

4. After creating the account you are logged in automatically and redirected to the panel.

## Logging In Later

- From any protected page without a valid session you are redirected to `/login`.
- Enter username and password then "Sign in".
- The session is valid for **24 hours** after which you need to log in again.

## Changing Username and Password

1. From the panel, go to **Settings** (from the sidebar or header).
2. **Change username**: Enter current password and the new username then "Update username".
3. **Change password**: Enter current password, new password and confirmation (at least 6 characters) then "Update password".

All changes are saved immediately; passwords are stored as **hash only** (bcrypt) and plain text is never stored.

## Logging Out

Use the **Log out** button in the header (top right) to end the session. You will be redirected to `/login`.

## API Protection

- All `/api/*` routes except `/api/auth/login`, `/api/auth/logout`, `/api/auth/setup`, and `/api/auth/status` require a valid session.
- Unauthenticated requests return **401 Unauthorized**.

## Security Recommendations

- Use **HTTPS** in production so the session and password are not sent over an unencrypted channel.
- Do not expose the panel to the internet without authentication; authentication is built into the panel.
- Protect the credentials file (`admin-credentials.json` or the path in ADMIN_CREDENTIALS_PATH): read/write only for the process.
- Choose a **SESSION_SECRET** that is random and strong (e.g. 32 characters) and do not share it or commit it to the repository.
