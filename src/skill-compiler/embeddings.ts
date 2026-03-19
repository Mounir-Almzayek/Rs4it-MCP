/**
 * OpenRouter embeddings for vector search over the tool catalog.
 * Uses OPENROUTER_API_KEY and OPENROUTER_EMBEDDING_MODEL (default: openai/text-embedding-3-small).
 */

import type { ToolCatalogItem } from "./tool-catalog.js";

const EMBEDDING_MODEL =
  process.env["OPENROUTER_EMBEDDING_MODEL"] ??
  process.env["MCP_EMBEDDING_MODEL"] ??
  "openai/text-embedding-3-small";

function getApiKey(): string | undefined {
  return process.env["OPENROUTER_API_KEY"] ?? process.env["MCP_OPENROUTER_API_KEY"];
}

export function isEmbeddingAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Embed one or more texts via OpenRouter. Returns array of vectors (same order as input).
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY (or MCP_OPENROUTER_API_KEY) required for embeddings");

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env["OPENROUTER_REFERRER"] ?? "http://localhost",
      "X-Title": process.env["OPENROUTER_TITLE"] ?? "rs4it-mcp-hub",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.length === 1 ? texts[0] : texts,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter embeddings error ${res.status}: ${text || res.statusText}`);
  }

  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const list = data?.data;
  if (!Array.isArray(list)) throw new Error("OpenRouter embeddings: invalid response shape");

  return list.map((item) => {
    const emb = item?.embedding;
    if (!Array.isArray(emb)) throw new Error("OpenRouter embeddings: missing embedding in item");
    return emb;
  });
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedDocuments([text]);
  return vec;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Retrieve the top-k tools most relevant to the skill text using vector similarity.
 * Falls back to full catalog if embedding fails or topK >= catalog length.
 */
export async function retrieveRelevantTools(
  skillText: string,
  catalog: ToolCatalogItem[],
  options: { topK?: number }
): Promise<ToolCatalogItem[]> {
  const topK = Math.max(1, options.topK ?? 25);
  if (catalog.length === 0) return [];
  if (catalog.length <= topK) return catalog;

  const texts = catalog.map(
    (t) => `${t.name}: ${t.description ?? ""}`.trim()
  );
  let queryVec: number[];
  let docVecs: number[][];
  try {
    [queryVec, ...docVecs] = await embedDocuments([skillText, ...texts]);
  } catch {
    return catalog;
  }

  const withScore = catalog.map((tool, i) => ({
    tool,
    score: cosineSimilarity(queryVec, docVecs[i] ?? []),
  }));
  withScore.sort((a, b) => b.score - a.score);
  return withScore.slice(0, topK).map((x) => x.tool);
}
