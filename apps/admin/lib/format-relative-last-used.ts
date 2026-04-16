/** Relative time for "last used" style display; falls back to locale date string. */
export function formatRelativeLastUsed(
  iso: string,
  locale: string,
  t: (key: "justNow" | "minsAgo" | "hoursAgo" | "daysAgo", values?: { n: number }) => string
): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffMs / 86400_000);
  if (diffMins < 1) return t("justNow");
  if (diffMins < 60) return t("minsAgo", { n: diffMins });
  if (diffHours < 24) return t("hoursAgo", { n: diffHours });
  if (diffDays < 7) return t("daysAgo", { n: diffDays });
  const loc = locale === "ar" ? "ar" : "en-US";
  return date.toLocaleString(loc);
}
