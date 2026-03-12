# Template for Adding a New Skill

To add a new skill without modifying the server core:

## 1. Create the skill file

Create a file in `src/skills/` (e.g. `src/skills/my-skill.ts`) following this example.

```ts
/**
 * Short description of the skill.
 */
import { z } from "zod";
import type { SkillDefinition } from "../types/skills.js";
import type { ToolCallResult } from "../types/tools.js";
import { executeTool } from "../tools/index.js";

export const MY_SKILL_NAME = "my_skill" as const;

const inputSchema = {
  param1: z.string().describe("Parameter description"),
  param2: z.number().optional().describe("Optional parameter"),
};

export type MySkillArgs = z.infer<z.ZodObject<typeof inputSchema>>;

async function handler(args: MySkillArgs): Promise<ToolCallResult> {
  try {
    // Call tools from layer 02, e.g.:
    const result = await executeTool("create_file", {
      path: "output.txt",
      content: `Result: ${args.param1}`,
    });
    if (result.isError) return result;

    return {
      content: [{ type: "text", text: "Skill executed successfully." }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}

export const mySkill: SkillDefinition<MySkillArgs> = {
  name: MY_SKILL_NAME,
  description: "Description shown to the AI in tools/list.",
  inputSchema,
  handler,
};
```

## 2. Register the skill in the registry

In `src/skills/index.ts`:

1. Import the skill:  
   `import { mySkill } from "./my-skill.js";`
2. Add it inside `registerBuiltInSkills()`:  
   `registerSkill(mySkill);`

## 3. Result

- The skill will appear in `tools/list` under the name `skill:my_skill`.
- Calling `tools/call` with name `skill:my_skill` and valid arguments will run the handler and return the result.

No need to change `src/server/server.ts` or any other MCP logic.
