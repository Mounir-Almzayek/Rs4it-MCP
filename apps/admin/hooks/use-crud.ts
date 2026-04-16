"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";

interface UseCrudOptions<T> {
  endpoint: string;
  queryKey: string;
  transform?: (data: unknown) => T[];
}

interface CrudResult<T> {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  create: (item: Partial<T>) => Promise<void>;
  update: (name: string, item: Partial<T>) => Promise<void>;
  remove: (name: string) => Promise<void>;
  refetch: () => void;
}

export function useCrud<T extends { name: string }>({
  endpoint,
  queryKey,
  transform,
}: UseCrudOptions<T>): CrudResult<T> {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations("common");

  const query = useQuery<T[]>({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(t("crudFetchFailed", { key: queryKey }));
      const data = await res.json();
      return transform ? transform(data) : (data as T[]);
    },
  });

  const createMut = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("crudCreateFailed"));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.add("success", t("crudCreated"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ name, item }: { name: string; item: Partial<T> }) => {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Update failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.add("success", "Updated successfully");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("crudDeleteFailed"));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast.add("success", t("crudDeleted"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create: async (item) => { await createMut.mutateAsync(item); },
    update: async (name, item) => { await updateMut.mutateAsync({ name, item }); },
    remove: async (name) => { await deleteMut.mutateAsync(name); },
    refetch: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  };
}
