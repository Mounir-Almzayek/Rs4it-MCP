import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CACHE_TTL = 5 * 60 * 1000;
const repoCache = new Map<string, { data: PkgRecord[]; ts: number }>();

function getGithubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type PkgRecord = Record<string, unknown>;

/** Normalise user input to "owner/repo" form. */
function parseRepo(input: string): string | null {
  if (!input) return null;
  // Full URL: https://github.com/owner/repo
  const urlMatch = input.match(/github\.com\/([^/]+\/[^/]+)/);
  if (urlMatch) return urlMatch[1].replace(/\.git$/, "");
  // Short form: owner/repo
  if (/^[^/]+\/[^/]+$/.test(input.trim())) return input.trim();
  return null;
}

/** Known content files → package type mapping. */
const FILE_TYPE_MAP: Record<string, string> = {
  "SKILL.md": "skill",
  "PROMPT.md": "prompt",
  "RULE.md": "rule",
  "CONTENT.md": "tool", // default, may be overridden by metadata
};

const KNOWN_FILES = new Set(Object.keys(FILE_TYPE_MAP));

interface TreeEntry {
  path: string;
  type: string;
  sha?: string;
}

/**
 * Use GitHub Git Trees API to discover all packages in a repo.
 * Single API call returns all files recursively.
 */
async function discoverPackages(repo: string): Promise<PkgRecord[]> {
  const cached = repoCache.get(repo);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // Get default branch first
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: getGithubHeaders(),
  });
  if (!repoRes.ok) throw new Error(`Repository not found: ${repo} (${repoRes.status})`);
  const repoJson = (await repoRes.json()) as { default_branch?: string };
  const branch = repoJson.default_branch ?? "main";

  // Fetch full tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
    { headers: getGithubHeaders() },
  );
  if (!treeRes.ok) throw new Error(`Failed to read repository tree (${treeRes.status})`);
  const treeJson = (await treeRes.json()) as { tree?: TreeEntry[] };
  const tree = treeJson.tree ?? [];

  // Find content files and group by directory
  const dirMap = new Map<string, { contentFile: string; hasMetadata: boolean; metadataSha?: string }>();

  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const parts = entry.path.split("/");
    const fileName = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join("/");
    if (!dir) continue; // skip root-level files

    if (KNOWN_FILES.has(fileName)) {
      const existing = dirMap.get(dir);
      if (!existing) {
        dirMap.set(dir, { contentFile: fileName, hasMetadata: false });
      }
    } else if (fileName === "metadata.json") {
      const existing = dirMap.get(dir);
      if (existing) {
        existing.hasMetadata = true;
        existing.metadataSha = entry.sha;
      } else {
        dirMap.set(dir, { contentFile: "", hasMetadata: true, metadataSha: entry.sha });
      }
    }
  }

  // Batch-fetch metadata.json files (using blob API for efficiency)
  const metadataPromises: Array<{ dir: string; promise: Promise<Record<string, unknown> | null> }> = [];
  for (const [dir, info] of dirMap) {
    if (!info.contentFile) continue; // dir only has metadata.json, no content file
    if (info.hasMetadata && info.metadataSha) {
      metadataPromises.push({
        dir,
        promise: fetch(`https://api.github.com/repos/${repo}/git/blobs/${info.metadataSha}`, {
          headers: getGithubHeaders(),
        })
          .then(async (r) => {
            if (!r.ok) return null;
            const blob = (await r.json()) as { content?: string };
            const text = Buffer.from(blob.content ?? "", "base64").toString("utf-8");
            return JSON.parse(text) as Record<string, unknown>;
          })
          .catch(() => null),
      });
    }
  }

  const metadataResults = await Promise.all(metadataPromises.map((m) => m.promise));
  const metadataMap = new Map<string, Record<string, unknown>>();
  metadataPromises.forEach((m, i) => {
    if (metadataResults[i]) metadataMap.set(m.dir, metadataResults[i]!);
  });

  // Build package list
  const packages: PkgRecord[] = [];
  for (const [dir, info] of dirMap) {
    if (!info.contentFile) continue;
    const meta = metadataMap.get(dir) ?? {};
    const dirName = dir.split("/").pop() ?? dir;
    const inferredType = FILE_TYPE_MAP[info.contentFile] ?? "tool";
    // metadata.type can override inferred type (especially for CONTENT.md)
    const type = typeof meta.type === "string" ? meta.type : inferredType;

    packages.push({
      name: String(meta.name ?? dirName),
      type,
      description: String(meta.description ?? ""),
      version: String(meta.version ?? "1.0.0"),
      author: String(meta.author ?? repo.split("/")[0]),
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      path: dir,
    });
  }

  packages.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  repoCache.set(repo, { data: packages, ts: Date.now() });
  return packages;
}

export async function GET(request: NextRequest) {
  if (!requireSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = request.nextUrl;
    const repoInput = searchParams.get("repo") ?? "";
    const type = searchParams.get("type");
    const search = searchParams.get("search")?.toLowerCase();
    const tag = searchParams.get("tag");

    const repo = parseRepo(repoInput);
    if (!repo) {
      return NextResponse.json({ packages: [], tags: [], popular: [], source: "empty" });
    }

    const allPkgs = await discoverPackages(repo);

    // Type-scoped list
    const typeFiltered = type ? allPkgs.filter((p) => p.type === type) : allPkgs;

    const allTags = Array.from(
      new Set(typeFiltered.flatMap((p) => (Array.isArray(p.tags) ? (p.tags as string[]) : []))),
    ).sort();

    let packages = [...typeFiltered];
    if (tag) packages = packages.filter((p) => Array.isArray(p.tags) && (p.tags as string[]).includes(tag));
    if (search) {
      const tokens = search.split(/[\s\-_]+/).filter(Boolean);
      packages = packages.filter((p) => {
        const name = String(p.name ?? "").toLowerCase();
        const desc = String(p.description ?? "").toLowerCase();
        const tagStr = Array.isArray(p.tags) ? (p.tags as string[]).join(" ").toLowerCase() : "";
        const haystack = `${name} ${desc} ${tagStr}`;
        return tokens.every((tok) => haystack.includes(tok));
      });
    }

    return NextResponse.json({ packages, tags: allTags, popular: [], source: "github" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { packages: [], tags: [], popular: [], source: "error", error: (e as Error).message },
      { status: 502 },
    );
  }
}
