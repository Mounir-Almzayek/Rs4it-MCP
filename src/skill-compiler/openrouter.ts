import { z } from "zod";

const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().optional(),
        }),
      })
    )
    .default([]),
});

export async function openRouterChat(args: {
  model: string;
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter recommends these; safe to omit if unknown
      "HTTP-Referer": process.env["OPENROUTER_REFERRER"] ?? "http://localhost",
      "X-Title": process.env["OPENROUTER_TITLE"] ?? "rs4it-mcp-hub",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 1200,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${text || res.statusText}`);
  }

  const data = openRouterResponseSchema.parse(await res.json());
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("OpenRouter returned empty content");
  return content;
}

