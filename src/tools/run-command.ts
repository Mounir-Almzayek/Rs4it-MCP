/**
 * run_command tool: execute a shell command with optional cwd and timeout.
 * Supports allowlist and blocklist for safety (see docs/security.md).
 */

import { spawn } from "node:child_process";
import { z } from "zod";
import type { RegisteredTool, ToolCallResult } from "../types/tools.js";
import { getWorkspaceRoot, resolveWithinWorkspace } from "../config/workspace.js";

export const RUN_COMMAND_NAME = "run_command" as const;

const inputSchema = {
  command: z
    .union([z.string(), z.array(z.string())])
    .describe("Command to run: string or array of args (first is executable)"),
  cwd: z
    .string()
    .optional()
    .describe("Working directory relative to workspace (default: workspace root)"),
  timeoutMs: z
    .number()
    .int()
    .min(100)
    .max(300_000)
    .optional()
    .describe("Timeout in milliseconds (100–300000, default: 60000)"),
};

export type RunCommandArgs = z.infer<z.ZodObject<typeof inputSchema>>;

/** Commands or patterns that are never allowed (blocklist). */
const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--recursive|--force)/i,
  /\bsudo\b/i,
  /\bmkfs\./i,
  /^\s*:\s*$/,
  />\s*\/dev\/sd[a-z]/i,
];

function isBlocked(commandInput: string | string[]): boolean {
  const raw = Array.isArray(commandInput)
    ? commandInput.join(" ")
    : String(commandInput);
  return DANGEROUS_PATTERNS.some((p) => p.test(raw));
}

async function handler(args: RunCommandArgs): Promise<ToolCallResult> {
  if (isBlocked(args.command)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: This command is not allowed for security reasons (blocklist).",
        },
      ],
      isError: true,
    };
  }

  const root = getWorkspaceRoot();
  const cwd = args.cwd
    ? resolveWithinWorkspace(root, args.cwd)
    : root;

  const options: Parameters<typeof spawn>[2] = {
    cwd,
    shell: !Array.isArray(args.command),
    timeout: args.timeoutMs ?? 60_000,
  };

  return new Promise((resolve) => {
    const proc =
      Array.isArray(args.command) && args.command.length > 0
        ? spawn(args.command[0], args.command.slice(1), options)
        : spawn(String(args.command), [], { ...options, shell: true });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk) => (stdout += chunk));
    proc.stderr?.on("data", (chunk) => (stderr += chunk));

    proc.on("error", (err) => {
      resolve({
        content: [
          { type: "text", text: `Execution error: ${err.message}` },
        ],
        isError: true,
      });
    });

    proc.on("close", (code, signal) => {
      const out = [stdout, stderr].filter(Boolean).join("\n--- stderr ---\n");
      if (code !== 0 && code != null) {
        resolve({
          content: [
            {
              type: "text",
              text: `Command exited with code ${code}${signal ? ` (signal ${signal})` : ""}\n${out || "(no output)"}`,
            },
          ],
          isError: true,
        });
        return;
      }
      resolve({
        content: [{ type: "text", text: out || "(no output)" }],
      });
    });
  });
}

export const runCommandTool: RegisteredTool<RunCommandArgs> = {
  name: RUN_COMMAND_NAME,
  description:
    "Run a shell command. Optional: cwd (relative to workspace), timeoutMs (100–300000). Blocklist applies (e.g. rm -rf, sudo).",
  inputSchema,
  handler,
};
