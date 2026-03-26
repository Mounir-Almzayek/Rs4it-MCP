"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, ShieldAlert } from "lucide-react";
import type { System2030SessionRecord } from "@/lib/system2030-sessions";

async function fetchSessions(): Promise<System2030SessionRecord[]> {
  const res = await fetch("/api/system2030-sessions");
  if (!res.ok) throw new Error("Failed to fetch System2030 sessions");
  return res.json();
}

function formatIso(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusBadge(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  const isActive = s === "active";
  const cls = isActive
    ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
    : "bg-amber-500/10 text-amber-700 border-amber-200";
  const label = status ?? "unknown";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export default function System2030ProgrammersPage() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["system2030-sessions"],
    queryFn: fetchSessions,
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => (data ?? []).map((s) => ({
    email: s.email,
    status: s.programmer?.status ?? null,
    name: s.programmer?.name ?? null,
    phone: s.programmer?.phone ?? null,
    difficulty: (s.programmer as any)?.difficulty_level ?? null,
    programmerId: s.programmer?.id ?? null,
    lastMeAt: s.lastMeAt ?? null,
    lastLoginAt: s.lastLoginAt ?? null,
    updatedAt: s.updatedAt,
    raw: s,
  })), [data]);

  const selected = useMemo(() => {
    if (!selectedEmail) return null;
    return (data ?? []).find((s) => s.email === selectedEmail) ?? null;
  }, [data, selectedEmail]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System2030 Programmers</h2>
          <p className="text-sm text-muted-foreground">
            Live snapshot from <code className="rounded bg-muted px-1">/auth/me</code> cached by the Hub (no passwords stored).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programmers</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm">Error: {String(error)}</p>}
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !rows.length ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <User className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2">No System2030 sessions recorded yet.</p>
              <p className="mt-1 text-sm">They appear after a client connects with <code className="rounded bg-muted px-1">X-MCP-Email</code>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Email</th>
                      <th className="p-3 text-left font-medium">Name</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-left font-medium">Last /me</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.email}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${selectedEmail === r.email ? "bg-muted/40" : ""}`}
                        onClick={() => setSelectedEmail(r.email)}
                      >
                        <td className="p-3 font-medium">{r.email}</td>
                        <td className="p-3 text-muted-foreground">{r.name ?? "—"}</td>
                        <td className="p-3">{statusBadge(r.status)}</td>
                        <td className="p-3 text-muted-foreground">{formatIso(r.lastMeAt ?? r.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4">
                {!selected ? (
                  <div className="rounded-md border p-4 text-sm text-muted-foreground">
                    Select a programmer to see details.
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Details</span>
                        {String(selected.programmer?.status ?? "").toLowerCase() !== "active" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <ShieldAlert className="h-4 w-4" />
                            Not active
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-muted-foreground">Email</div>
                        <div className="col-span-2 font-medium">{selected.email}</div>
                        <div className="text-muted-foreground">Programmer ID</div>
                        <div className="col-span-2">{selected.programmer?.id ?? "—"}</div>
                        <div className="text-muted-foreground">Name</div>
                        <div className="col-span-2">{selected.programmer?.name ?? "—"}</div>
                        <div className="text-muted-foreground">Phone</div>
                        <div className="col-span-2">{selected.programmer?.phone ?? "—"}</div>
                        <div className="text-muted-foreground">Difficulty</div>
                        <div className="col-span-2">{(selected.programmer as any)?.difficulty_level ?? "—"}</div>
                        <div className="text-muted-foreground">Status</div>
                        <div className="col-span-2">{statusBadge(selected.programmer?.status ?? null)}</div>
                        <div className="text-muted-foreground">Join date</div>
                        <div className="col-span-2">{formatIso((selected.programmer as any)?.join_date as any)}</div>
                        <div className="text-muted-foreground">Last login</div>
                        <div className="col-span-2">{formatIso(selected.lastLoginAt)}</div>
                        <div className="text-muted-foreground">Last /me</div>
                        <div className="col-span-2">{formatIso(selected.lastMeAt)}</div>
                      </div>

                      {selected.programmer?.description ? (
                        <div className="rounded-md border bg-muted/20 p-3">
                          <div className="text-muted-foreground text-xs mb-1">Description</div>
                          <div className="whitespace-pre-wrap">{String(selected.programmer.description)}</div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

