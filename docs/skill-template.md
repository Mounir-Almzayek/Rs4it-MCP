# قالب إضافة مهارة جديدة

لإضافة مهارة جديدة دون تعديل قلب السيرفر:

## 1. إنشاء ملف المهارة

أنشئ ملفاً في `src/skills/` (مثلاً `src/skills/my-skill.ts`) على غرار المثال التالي.

```ts
/**
 * وصف مختصر للمهارة.
 */
import { z } from "zod";
import type { SkillDefinition } from "../types/skills.js";
import type { ToolCallResult } from "../types/tools.js";
import { executeTool } from "../tools/index.js";

export const MY_SKILL_NAME = "my_skill" as const;

const inputSchema = {
  param1: z.string().describe("وصف المعامل"),
  param2: z.number().optional().describe("معامل اختياري"),
};

export type MySkillArgs = z.infer<z.ZodObject<typeof inputSchema>>;

async function handler(args: MySkillArgs): Promise<ToolCallResult> {
  try {
    // استدعاء أدوات من الطبقة 02، مثلاً:
    const result = await executeTool("create_file", {
      path: "output.txt",
      content: `Result: ${args.param1}`,
    });
    if (result.isError) return result;

    return {
      content: [{ type: "text", text: "تم تنفيذ المهارة بنجاح." }],
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
  description: "وصف يظهر للـ AI عند tools/list.",
  inputSchema,
  handler,
};
```

## 2. تسجيل المهارة في السجل

في `src/skills/index.ts`:

1. استورد المهارة:  
   `import { mySkill } from "./my-skill.js";`
2. أضفها داخل `registerBuiltInSkills()`:  
   `registerSkill(mySkill);`

## 3. النتيجة

- ستظهر المهارة في `tools/list` تحت الاسم `skill:my_skill`.
- استدعاء `tools/call` بالاسم `skill:my_skill` ومعاملات صحيحة سينفّذ الـ handler ويرجع النتيجة.

لا حاجة لتعديل `src/server/server.ts` أو أي منطق MCP آخر.
