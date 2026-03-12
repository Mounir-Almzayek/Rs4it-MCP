# Evolution Roadmap — Central and Flexible Hub

This document describes the direction of the platform after completing Phase 00–06: **hosting the Hub on a server** with an **admin panel** to change tools, skills, and plugins without deploying code, and optional **Roles** to control who sees what (useful for Cursor and others).

---

## Main Goals

| Goal | Description |
|------|-------------|
| **Server hosting** | Run the Hub as a network service (HTTP/SSE) instead of stdio only; developers connect to a single URL. |
| **Admin panel** | Web UI to add/edit/delete Tools, Skills, and External MCP Plugins without changing code or redeploying. |
| **Flexible change** | Any change in capabilities (tools, skills, plugins) is managed from the panel and reflected immediately for all connected clients. |
| **Roles (optional)** | Bind tools/skills/plugins to roles; Cursor (or any client) passes the user’s role and receives only the list of allowed tools, reducing noise and improving security. |

---

## How Cursor Benefits from Roles

- **Without roles:** Cursor calls `tools/list` and gets all tools; the AI chooses among them. The list can be large or include sensitive tools.
- **With roles:** The client sends a **role id** with the connection (or with the initialize request), e.g. `developer`, `admin`. The Hub filters `tools/list` by the permissions for that role and returns only allowed tools. Result:
  - Clearer interface for the AI (fewer, more relevant tools).
  - Security control: dangerous or administrative tools appear only for `admin` or specific roles.

---

## Order of New Phases (07 → 09)

Phases are designed to be executed in order:

| Phase | Content | Dependencies |
|-------|---------|---------------|
| **07** | [Server hosting (Server Hosting)](phases/07-phase-server-hosting.md) | HTTP/SSE transport, run as service, single entry point for clients. |
| **08** | [Admin panel (Admin Panel)](phases/08-phase-admin-panel.md) | UI to manage Tools + Skills + Plugins (add/edit/delete) and store config dynamically. |
| **09** | [Roles and tool visibility (Roles & Visibility)](phases/09-phase-roles-and-visibility.md) | Role model, binding tools/skills/plugins to roles, filtering `tools/list` by client role. |

---

## Phase Dependencies Summary

```
Phase 00–06 (complete)
       ↓
Phase 07: Server hosting  ←  Required for everyone to reach the same Hub
       ↓
Phase 08: Admin panel     ←  Depends on 07 if the panel configures the hosted Hub
       ↓
Phase 09: Roles & visibility  ←  Depends on 07 (and prefers 08 to manage role permissions from the panel)
```

---

## Notes

- You can run **07** then **08** then **09** in order, or run 07 then 09 (roles without panel, with static role configuration).
- The panel (08) can be a separate web app that talks to an API or shared database with the Hub.
- Roles (09) require an agreement between the Hub and the client (Cursor) on how to pass the role id (e.g. header or field in initialize).
