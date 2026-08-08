/**
 * Export utilities — CSV download in the browser.
 * Simple, no dependencies. Works for any list of objects.
 */

function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends Record<string, any>>(rows: T[], columns?: { key: keyof T; label: string }[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => escapeCsvField(c.label)).join(',');
  const body = rows.map((row) =>
    cols.map((c) => escapeCsvField(row[c.key])).join(','),
  ).join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  // Add BOM so Excel reads UTF-8 correctly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * One-call helper: convert rows + download as CSV in one shot.
 */
export function exportCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T; label: string }[],
): void {
  const csv = toCsv(rows, columns);
  downloadCsv(filename, csv);
}
