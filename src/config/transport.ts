/**
 * Transport and HTTP server configuration (Phase 07).
 * Reads PORT, MCP_TRANSPORT, and BASE_URL from environment.
 */

export type TransportKind = "stdio" | "http";

const DEFAULT_PORT = 3000;

/**
 * Port for the HTTP server when MCP_TRANSPORT=http.
 */
export function getPort(): number {
  const raw = process.env.PORT ?? process.env.MCP_PORT;
  if (raw === undefined) return DEFAULT_PORT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return DEFAULT_PORT;
  return n;
}

/**
 * Transport mode: stdio (default) or http.
 */
export function getTransportKind(): TransportKind {
  const v = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
  if (v === "http" || v === "https") return "http";
  return "stdio";
}

/**
 * Base URL of the Hub when served over HTTP (e.g. for docs or client config).
 * No trailing slash.
 */
export function getBaseUrl(): string {
  const base = process.env.BASE_URL;
  if (base && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  const port = getPort();
  return `http://localhost:${port}`;
}
