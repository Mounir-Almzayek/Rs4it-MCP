/**
 * JSON for admin table cells. Empty / null / undefined → "" (TableCellText shows "—").
 */
export function jsonForTableCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
