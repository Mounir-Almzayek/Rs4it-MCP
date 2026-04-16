"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { EmptyState } from "./empty-state";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyFn: (item: T) => string;
  searchFields?: (keyof T)[];
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  defaultPageSize?: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyFn,
  searchFields,
  emptyIcon,
  emptyMessage,
  isLoading,
  className,
  defaultPageSize = 10,
}: DataTableProps<T>) {
  const t = useTranslations("common");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchFields) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          String(item[field] ?? "").toLowerCase().includes(q)
        )
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        result = [...result].sort((a, b) => {
          const av = col.sortValue ? col.sortValue(a) : String(a[sortKey] ?? "");
          const bv = col.sortValue ? col.sortValue(b) : String(b[sortKey] ?? "");
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return result;
  }, [data, search, searchFields, sortKey, sortDir, columns]);

  // Reset page when search/filter changes
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const showFrom = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showTo = Math.min(safePage * pageSize, filtered.length);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {searchFields && (
        <SearchInput value={search} onChange={handleSearchChange} />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          message={emptyMessage ?? t("noResults")}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-2.5 text-start text-xs font-medium uppercase tracking-wider text-muted-foreground",
                        col.sortable && "cursor-pointer select-none hover:text-foreground",
                        col.className
                      )}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && sortKey === col.key && (
                          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => (
                  <tr
                    key={keyFn(item)}
                    className={cn(
                      "border-b border-border last:border-b-0 transition-colors hover:bg-secondary/40",
                      "animate-card-reveal"
                    )}
                    style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-2.5", col.className)}>
                        {col.render ? col.render(item) : String(item[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{t("rowsPerPage")}</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs">
                {t("showing", { from: showFrom, to: showTo, total: filtered.length })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={t("previous")}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (safePage <= 3) {
                    pageNum = i + 1;
                  } else if (safePage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = safePage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                        pageNum === safePage
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={t("next")}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
