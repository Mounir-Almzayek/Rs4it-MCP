"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Download, Check, Search, GitBranch,
  Package, X, ArrowRight, AlertCircle, Loader2,
  DownloadCloud, ChevronDown, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleDefinition } from "@/lib/roles";

interface MarketplacePackage {
  name: string;
  type: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  path: string;
  icon?: string;
  downloads?: number;
}

interface MarketplaceResponse {
  packages: MarketplacePackage[];
  tags: string[];
  popular: MarketplacePackage[];
  source?: string;
  error?: string;
}

interface MarketplaceTabProps {
  type: string;
  installedNames?: Set<string>;
  queryKeysToInvalidate?: string[][];
}

const REPO_STORAGE_KEY = "mcp-marketplace-repo";

function getSavedRepo(): string {
  try {
    return localStorage.getItem(REPO_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveRepo(repo: string) {
  try {
    localStorage.setItem(REPO_STORAGE_KEY, repo);
  } catch { /* noop */ }
}

export function MarketplaceTab({
  type,
  installedNames = new Set(),
  queryKeysToInvalidate = [],
}: MarketplaceTabProps) {
  const t = useTranslations("marketplace");
  const toast = useToast();
  const qc = useQueryClient();

  const [repoInput, setRepoInput] = useState("");
  const [activeRepo, setActiveRepo] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installingAll, setInstallingAll] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load saved repo on mount
  useEffect(() => {
    const saved = getSavedRepo();
    if (saved) {
      setRepoInput(saved);
      setActiveRepo(saved);
    }
  }, []);

  // Fetch available roles
  const { data: rolesData } = useQuery<{ config?: { roles?: RoleDefinition[] } }>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles", { cache: "no-store" });
      return res.json();
    },
  });
  const roles: RoleDefinition[] = rolesData?.config?.roles ?? [];

  const handleBrowse = useCallback(() => {
    const trimmed = repoInput.trim();
    if (!trimmed) return;
    setActiveRepo(trimmed);
    saveRepo(trimmed);
    setSearch("");
    setActiveTag(null);
  }, [repoInput]);

  const doInstall = useCallback(async (pkg: MarketplacePackage) => {
    const res = await fetch("/api/marketplace/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: pkg.type,
        name: pkg.name,
        version: pkg.version,
        path: pkg.path,
        repo: activeRepo,
        allowedRoles: selectedRoles.length > 0 ? selectedRoles : undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Install failed");
    }
    return res.json();
  }, [activeRepo, selectedRoles]);

  const installMut = useMutation({
    mutationFn: async (pkg: MarketplacePackage) => {
      setInstalling(pkg.name);
      return doInstall(pkg);
    },
    onSuccess: (_, pkg) => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["registry"] });
      for (const key of queryKeysToInvalidate) {
        qc.invalidateQueries({ queryKey: key });
      }
      toast.add("success", t("packageInstalled", { name: pkg.name }));
      setInstalling(null);
    },
    onError: (e: Error) => {
      toast.add("error", e.message);
      setInstalling(null);
    },
  });

  const { data, isLoading, error: queryError } = useQuery<MarketplaceResponse>({
    queryKey: ["marketplace", type, activeRepo, debouncedSearch, activeTag],
    queryFn: async () => {
      const params = new URLSearchParams({ type });
      if (activeRepo) params.set("repo", activeRepo);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/marketplace/browse?${params}`);
      const json = await res.json();
      if (!res.ok && !json.packages?.length) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json;
    },
    enabled: !!activeRepo,
    retry: 1,
    staleTime: 60_000,
  });

  const packages = data?.packages ?? [];
  const allTags = data?.tags ?? [];
  const source = data?.source;
  const notInstalledCount = packages.filter((p) => !installedNames.has(p.name)).length;

  const handleInstallAll = useCallback(async () => {
    const notInstalled = packages.filter((p) => !installedNames.has(p.name));
    if (notInstalled.length === 0) return;
    setInstallingAll(true);
    let successCount = 0;
    let failCount = 0;
    for (const pkg of notInstalled) {
      try {
        setInstalling(pkg.name);
        await doInstall(pkg);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setInstalling(null);
    setInstallingAll(false);
    qc.invalidateQueries({ queryKey: ["marketplace"] });
    qc.invalidateQueries({ queryKey: ["registry"] });
    for (const key of queryKeysToInvalidate) {
      qc.invalidateQueries({ queryKey: key });
    }
    if (successCount > 0) {
      toast.add("success", t("installAllSuccess", { count: successCount }));
    }
    if (failCount > 0) {
      toast.add("error", t("installAllPartial", { failed: failCount }));
    }
  }, [packages, installedNames, doInstall, qc, queryKeysToInvalidate, toast, t]);

  return (
    <div className="space-y-4">
      {/* Repo URL input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xl">
          <GitBranch className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBrowse();
            }}
            placeholder={t("repoPlaceholder")}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 ps-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button
          size="sm"
          onClick={handleBrowse}
          disabled={!repoInput.trim() || isLoading}
          className="gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {t("browse")}
        </Button>
      </div>

      {/* Role selector */}
      {roles.length > 0 && activeRepo && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">{t("assignRoles")}:</span>
          {selectedRoles.length > 0 ? (
            selectedRoles.map((id) => {
              const role = roles.find((r) => r.id === id);
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1 font-normal">
                  {role?.name ?? id}
                  <button
                    type="button"
                    onClick={() => setSelectedRoles((prev) => prev.filter((r) => r !== id))}
                    className="rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground">{t("allRoles")}</span>
          )}
          {roles.filter((r) => !selectedRoles.includes(r.id)).length > 0 && (
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setSelectedRoles((prev) => [...prev, e.target.value]);
                  e.target.value = "";
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-6 cursor-pointer"
              >
                <option value="">{t("addRole")}</option>
                {roles
                  .filter((r) => !selectedRoles.includes(r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? r.id}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {queryError && !data && (
        <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-xs">
            <p className="font-medium text-destructive">{t("connectionError")}</p>
            <p className="mt-0.5 text-muted-foreground">{(queryError as Error).message}</p>
          </div>
        </div>
      )}

      {/* Empty state — no repo entered */}
      {!activeRepo && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">{t("enterRepo")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("enterRepoDesc")}</p>
        </div>
      )}

      {activeRepo && (
        <>
          {/* Search + Install All bar */}
          {!isLoading && packages.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("search")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 ps-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {notInstalledCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInstallAll}
                  disabled={installingAll || !!installing}
                  className="gap-1.5 shrink-0"
                >
                  {installingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <DownloadCloud className="h-3.5 w-3.5" />
                  )}
                  {t("installAll", { count: notInstalledCount })}
                </Button>
              )}
            </div>
          )}

          {/* Tag filter bar */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  !activeTag
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {t("allCategories")}
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    activeTag === tag
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">{t("noPackages")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {source === "error" ? t("repoError") : t("noPackagesInRepo")}
              </p>
              {(search || activeTag) && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setActiveTag(null); }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground"
                >
                  {t("clearFilters")}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div>
              {debouncedSearch && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("showingResults", { count: packages.length })}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg, idx) => (
                  <PackageCard
                    key={pkg.name}
                    pkg={pkg}
                    isInstalled={installedNames.has(pkg.name)}
                    installing={installing}
                    onInstall={() => installMut.mutate(pkg)}
                    delay={idx * 30}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Package Card ─── */

interface PackageCardProps {
  pkg: MarketplacePackage;
  isInstalled: boolean;
  installing: string | null;
  onInstall: () => void;
  delay: number;
  t: ReturnType<typeof useTranslations<"marketplace">>;
}

function PackageCard({
  pkg, isInstalled, installing, onInstall, delay, t,
}: PackageCardProps) {
  const isInstalling = installing === pkg.name;

  return (
    <Card
      className="animate-card-reveal flex flex-col transition-all hover:border-foreground/20"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-1 flex-col p-4">
        {/* Header: avatar + name */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold uppercase text-muted-foreground">
            {pkg.icon ? (
              <img src={pkg.icon} alt="" className="h-9 w-9 rounded-md object-cover" />
            ) : (
              pkg.name.charAt(0)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-foreground">{pkg.name}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{pkg.author}</p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {pkg.description || t("noDescription")}
        </p>

        {/* Tags */}
        {pkg.tags?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {pkg.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {pkg.tags.length > 3 && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{pkg.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: version + type */}
        <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] text-muted-foreground">
          <span>v{pkg.version}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{pkg.type}</span>
        </div>
      </div>

      {/* Install button — full width bottom */}
      <div className="border-t border-border px-4 py-2.5">
        <Button
          variant={isInstalled ? "secondary" : "default"}
          size="sm"
          disabled={isInstalled || isInstalling}
          onClick={onInstall}
          className="w-full gap-1.5"
        >
          {isInstalling ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
          ) : isInstalled ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isInstalled ? t("installed") : t("install")}
        </Button>
      </div>
    </Card>
  );
}
