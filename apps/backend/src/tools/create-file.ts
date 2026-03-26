/**
 * create_file tool: create or overwrite a file within the workspace.
 */

import { writeFile } from "node:fs/promises";
import { z } from "zod";
import type { RegisteredTool, ToolCallResult } from "../types/tools.js";
import {
  getWorkspaceRoot,
  resolveWithinWorkspace,
} from "../config/workspace.js";

export const CREATE_FILE_NAME = "create_file" as const;

const inputSchema = {
  path: z.string().describe("Relative path of the file from the workspace root"),
  content: z.string().describe("Content to write to the file"),
  encoding: z
    .string()
    .optional()
    .default("utf-8")
    .describe("Encoding (e.g. utf-8)"),
};

export type CreateFileArgs = z.infer<z.ZodObject<typeof inputSchema>>;

async function handler(args: CreateFileArgs): Promise<ToolCallResult> {
  try {
    const root = getWorkspaceRoot();
    const filePath = resolveWithinWorkspace(root, args.path);
    await writeFile(filePath, args.content, {
      encoding: args.encoding as BufferEncoding,
    });
    return {
      content: [{ type: "text", text: `Created file: ${args.path}` }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}

export const createFileTool: RegisteredTool<CreateFileArgs> = {
  name: CREATE_FILE_NAME,
  description:
    "Create or overwrite a file at the given path within the workspace. Path must be relative to the workspace root.",
  inputSchema,
  handler,
};
