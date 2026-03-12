# Hosting the Hub in Production (Phase 07)

This document describes how to run and host the Hub as a network service (Streamable HTTP) in a production environment.

## Requirements

- Node.js 20.x or newer
- Project built: `npm run build`

## Running the Service

### Direct run (Node)

```bash
npm run build
npm run start:server
```

The server will listen on the port defined by `PORT` or `MCP_PORT` (default: `3000`).

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` or `MCP_PORT` | Listen port | `3000` |
| `BASE_URL` | Base URL (for docs or client setup) | `http://localhost:${PORT}` |
| `MCP_WORKSPACE_ROOT` | Workspace root for tools | — |
| `MCP_PLUGINS_CONFIG` | Path to plugins config | `config/mcp_plugins.json` |
| `MCP_ROLE` | Connection role (Phase 09, optional) | — |
| `MCP_ROLES_CONFIG` | Path to roles file (Phase 09) | `config/roles.json` |

### Endpoint

- **URL**: `http://<host>:<port>/mcp`
- **Protocol**: MCP Streamable HTTP (POST for requests, GET for SSE, DELETE to end session).
- The client sends an `initialize` request first (without `mcp-session-id` header), receives `mcp-session-id` in the response, and uses it for subsequent requests and the GET request for SSE.
- **Roles (Phase 09)**: To filter tools by role, send header **`X-MCP-Role`** (e.g. `web_engineer`) with the `initialize` request, or pass **`params.role`** in the request body. The session will be bound to that role and only tools allowed for it will be exposed.

## Running Behind a Process Manager (PM2)

Example using [PM2](https://pm2.keymetrics.io/):

```bash
npm run build
pm2 start dist/server/http-entry.js --name rs4it-mcp-hub
pm2 save
pm2 startup  # If needed, to start PM2 on boot
```

Adjust instance count or memory as needed, e.g.:

```bash
pm2 start dist/server/http-entry.js --name rs4it-mcp-hub -i 1 --max-memory-restart 300M
```

## Running in Docker

The project includes **Docker Compose** to run the Hub and admin panel together, with a shared config volume.

### Requirements

- Docker and Docker Compose (v2)
- `.env` file (copy from `.env.docker.example`) with **SESSION_SECRET** (required for the panel, at least 16 characters)

### Quick run

```bash
cp .env.docker.example .env
# Edit .env and set SESSION_SECRET (e.g.: openssl rand -base64 24)
docker compose up -d
```

- **Hub (MCP)**: `http://localhost:3000/mcp`
- **Admin Panel**: `http://localhost:3001` — First time: go to `/login` and create the admin account.

### Useful commands

```bash
docker compose up -d          # Run in background
docker compose ps             # Container status
docker compose logs -f hub    # Hub logs
docker compose logs -f admin  # Panel logs
docker compose down           # Stop and remove containers
docker compose down -v        # Stop and remove containers and config volume
```

### Docker layout

| Component | Description |
|-----------|-------------|
| **Hub** | Image from root `Dockerfile`: build TypeScript then run `node dist/server/http-entry.js`. Entrypoint initializes config directory from defaults on first run. |
| **Admin** | Image from `admin/Dockerfile`: Next.js standalone on port 3001. |
| **Volume `config_data`** | Mounted at `/app/config` (Hub) and `/config` (Admin); stores `roles.json`, `dynamic-registry.json`, `mcp_plugins.json`, `admin-credentials.json` so Hub and panel share the same config. |
| **Workspace** | Optional: mount host directory at `/workspace` for the Hub (file tools). Default in `.env`: `WORKSPACE_PATH=./workspace`. |

### Environment variables (Compose)

See `.env.docker.example`. Key ones:

- **SESSION_SECRET**: Required for panel authentication.
- **HUB_PORT**, **ADMIN_PORT**: Host ports (default 3000, 3001).
- **MCP_WORKSPACE_ROOT**: Inside the container; use a mount for local files.
- **WORKSPACE_PATH**: Host path to mount as `/workspace` (for file tools).

### Running the Hub only (no panel)

```bash
docker build -t rs4it-mcp-hub .
docker run -d -p 3000:3000 \
  -v rs4it_config:/app/config \
  -e MCP_WORKSPACE_ROOT=/workspace \
  -v /path/to/workspace:/workspace:ro \
  rs4it-mcp-hub
```

## Behind a Reverse Proxy (HTTPS)

To serve over HTTPS or a specific domain, put the Hub behind a reverse proxy (e.g. Nginx or Caddy):

- The Hub runs on `localhost:3000` (or the chosen port).
- The proxy forwards requests to `http://127.0.0.1:3000/mcp` (or the path you define).
- Configure SSL at the proxy; the Hub stays HTTP internally.

Minimal Nginx example:

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

## Security

- When exposing the service on the public network: use **HTTPS** (via reverse proxy) and avoid running the Hub directly on 0.0.0.0 without protection.
- Authentication and authorization will be detailed later (e.g. Phase 09 with roles).

## Connecting Cursor or Another MCP Client

After hosting the Hub on a server (e.g. `https://your-domain.com/mcp` or `http://your-server:3000/mcp`), add it as a **Custom MCP** server in Cursor as follows.

### From Cursor UI (recommended)

1. Open **Settings**: `Ctrl + ,` (Windows/Linux) or `Cmd + ,` (macOS).
2. Go to **Tools & MCP**.
3. Click **"Add new MCP server"**.
4. Fill in:
   - **Name**: A descriptive name, e.g. `rs4it-hub`.
   - **Type**: Choose **`streamableHttp`** (for HTTP-based servers).
   - **URL**: Your MCP endpoint, e.g.:
     - `https://your-domain.com/mcp` (if the Hub is behind a reverse proxy with HTTPS)
     - or `http://your-server-ip:3000/mcp` (direct).
   - **Headers** (optional): For role (Phase 09) add e.g.:
     - `X-MCP-Role`: `web_engineer` (or any role defined in `roles.json`).
5. Save and **restart Cursor completely** so the server appears and is used.

### From config file (project-specific)

You can put MCP config in `.cursor/mcp.json` at the project root:

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

- Change `url` to your actual Hub URL after deployment.
- `headers` and `X-MCP-Role` are optional (for filtering tools by role).

### Notes

- **Cursor** also supports **stdio** (local run: `npm run start` and add the server in MCP as a `node`/`npx` command).
- Any MCP client that supports **Streamable HTTP** can connect to `BASE_URL/mcp` and follow the initialize-then-requests flow with `mcp-session-id`.

## Verifying It Works

After starting:

1. Send an `initialize` request (POST to `/mcp` with JSON-RPC body for initialize).
2. Receive the response with `mcp-session-id` header.
3. Call `tools/list` and `tools/call` using the same header.

You can use an MCP client or a tool like `curl` or a test script to verify `tools/list` and calling a tool.
