/**
 * MCP stdio↔HTTP proxy.
 * Reads JSON-RPC messages from stdin, forwards to the Hub via HTTP,
 * and writes responses back to stdout.
 * After the initialize handshake, triggers config sync.
 */

import { syncClientConfig } from "./config-sync.js";

export interface ProxyOptions {
  hubUrl: string;
  token?: string;
  clientType: string;
  role?: string;
  workspaceRoot: string;
}

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

/**
 * Start the stdio↔HTTP proxy.
 */
export function startProxy(options: ProxyOptions): void {
  const { hubUrl, token, clientType, role, workspaceRoot } = options;

  // The MCP endpoint URL (for JSON-RPC POST requests)
  const mcpUrl = hubUrl.endsWith("/mcp") ? hubUrl : `${hubUrl}/mcp`;

  // Session ID assigned by the server after initialize
  let sessionId: string | undefined;
  let configSynced = false;
  let pendingRequests = 0;
  let stdinEnded = false;

  log("Starting proxy → " + mcpUrl);

  // Read stdin line-by-line (JSON-RPC messages are newline-delimited)
  let buffer = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    // Process complete lines
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line) {
        pendingRequests++;
        handleMessage(line).finally(() => {
          pendingRequests--;
          maybeExit();
        });
      }
    }
  });

  process.stdin.on("end", () => {
    stdinEnded = true;
    maybeExit();
  });

  function maybeExit(): void {
    if (stdinEnded && pendingRequests === 0) {
      // Give config sync a moment to complete
      setTimeout(() => process.exit(0), 2000);
    }
  }

  async function handleMessage(raw: string): Promise<void> {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(raw) as JsonRpcMessage;
    } catch {
      log("Failed to parse stdin message");
      return;
    }

    log(`→ ${msg.method ?? "response"} (id=${msg.id ?? "none"})`);

    try {
      // Forward to Hub via HTTP POST
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (sessionId) {
        headers["mcp-session-id"] = sessionId;
      }

      const response = await fetch(mcpUrl, {
        method: "POST",
        headers,
        body: raw,
      });

      // Capture session ID from response
      const respSessionId = response.headers.get("mcp-session-id");
      if (respSessionId) {
        sessionId = respSessionId;
        log(`Session: ${sessionId}`);
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        // SSE response — parse events and write JSON data lines to stdout
        const text = await response.text();
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data) {
              write(data);
            }
          }
        }
      } else {
        // Regular JSON response
        const body = await response.text();
        if (body.trim()) {
          write(body.trim());
        }
      }

      log(`← ${response.status} ${msg.method ?? "response"}`);

      // After initialize response, trigger config sync
      if (msg.method === "initialize" && !configSynced) {
        configSynced = true;
        triggerConfigSync();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log(`Proxy error: ${errorMsg}`);

      // Send error response back to client if this was a request
      if (msg.id !== undefined) {
        const errorResponse: JsonRpcMessage = {
          jsonrpc: "2.0",
          id: msg.id,
          error: { code: -32603, message: `Proxy error: ${errorMsg}` },
        };
        write(JSON.stringify(errorResponse));
      }
    }
  }

  function triggerConfigSync(): void {
    syncClientConfig({
      hubUrl,
      clientType,
      token,
      role,
      workspaceRoot,
    })
      .then((count) => {
        log(`Config sync: ${count} files written to ${workspaceRoot}`);
      })
      .catch((err) => {
        log(`Config sync failed: ${err instanceof Error ? err.message : err}`);
      });
  }

  function write(data: string): void {
    process.stdout.write(data + "\n");
  }

  function log(msg: string): void {
    process.stderr.write(`[rs4it-proxy] ${msg}\n`);
  }
}
