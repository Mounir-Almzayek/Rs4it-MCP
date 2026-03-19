/**
 * Normalize inputSchema so the registry stores plain JSON Schema.
 * Converts Zod-serialized shape (_def.typeName, _def.description) to { type, description? }.
 * Ensures parameter descriptions show in MCP tooltips and the Edit form shows clean JSON.
 */

function normalizeProperty(prop: unknown): Record<string, unknown> {
  if (!prop || typeof prop !== "object") return { type: "string" };
  const p = prop as Record<string, unknown>;
  const def = p["_def"] as Record<string, unknown> | undefined;
  if (def && typeof def === "object") {
    const typeName = String(def["typeName"] ?? "ZodString");
    const description = typeof def["description"] === "string" ? def["description"] : undefined;
    const type =
      typeName === "ZodNumber" ? "number"
      : typeName === "ZodBoolean" ? "boolean"
      : typeName === "ZodArray" ? "array"
      : "string";
    return description ? { type, description } : { type };
  }
  if (typeof p["type"] === "string") {
    return {
      type: p["type"],
      ...(typeof p["description"] === "string" && { description: p["description"] }),
    };
  }
  return { type: "string" };
}

export function normalizeInputSchemaForRegistry(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return {};
  const hasProperties = "properties" in schema && schema["properties"] != null;
  const raw = hasProperties ? (schema["properties"] as Record<string, unknown>) : schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    out[k] = normalizeProperty(v);
  }
  return out;
}
