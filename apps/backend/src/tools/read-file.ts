/**
 * read_file tool: read file content from the workspace.
 */

import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { RegisteredTool, ToolCallResult } from "../types/tools.js";
import {
  getWorkspaceRoot,
  resolveWithinWorkspace,
} from "../config/workspace.js";

export const READ_FILE_NAME = "read_file" as const;

const inputSchema = {
  path: z.string().describe("Relative path of the file from the workspace root"),
  encoding: z
    .string()
    .optional()
    .default("utf-8")
    .describe("Encoding (e.g. utf-8)"),
};

export type ReadFileArgs = z.infer<z.ZodObject<typeof inputSchema>>;

async function handler(args: ReadFileArgs): Promise<ToolCallResult> {
  try {
    const root = getWorkspaceRoot();
    const filePath = resolveWithinWorkspace(root, args.path);
    const content = await readFile(filePath, {
      encoding: args.encoding as BufferEncoding,
    });
    return {
      content: [{ type: "text", text: content }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}

export const readFileTool: RegisteredTool<ReadFileArgs> = {
  name: READ_FILE_NAME,
  description:
    "Read the contents of a file from the workspace. Path must be relative to the workspace root.",
  inputSchema,
  handler,
};
