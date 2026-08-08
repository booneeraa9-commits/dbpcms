import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

/**
 * Reusable export services. Any report describes itself as a title + columns +
 * rows, and these functions turn that into CSV, Excel, or PDF. Future modules
 * (e.g. grading reports) reuse these exact functions — no duplication.
 */
export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null | undefined>[];
  generatedAt?: Date;
  institution?: string;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** CSV (RFC-4180-ish: quotes doubled, fields with commas/quotes/newlines quoted). */
export function toCsv(report: ReportData): Buffer {
  const escape = (v: string): string =>
    /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines: string[] = [];
  lines.push(report.columns.map((c) => escape(c.header)).join(","));
  for (const row of report.rows) {
    lines.push(report.columns.map((c) => escape(cell(row[c.key]))).join(","));
  }
  // BOM so Excel opens UTF-8 correctly.
  return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf-8");
}

/** Excel workbook with a header row, frozen header, and auto widths. */
export async function toExcel(report: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = report.institution ?? "DBPCMS";
  wb.created = report.generatedAt ?? new Date();
  const ws = wb.addWorksheet(report.title.slice(0, 31) || "Report");

  ws.columns = report.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(14, c.header.length + 2),
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of report.rows) {
    const shaped: Record<string, string> = {};
    for (const c of report.columns) shaped[c.key] = cell(row[c.key]);
    ws.addRow(shaped);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Landscape A4 PDF table with a title, generated timestamp, and page numbers. */
export function toPdf(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header
    doc.fontSize(16).text(report.institution ?? "DBPCMS", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(13).fillColor("#111").text(report.title);
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(`Generated: ${(report.generatedAt ?? new Date()).toLocaleString()}`);
    doc.moveDown(0.5);
    doc.fillColor("#000");

    // Column widths proportional to declared widths (fallback equal).
    const totalWeight = report.columns.reduce((s, c) => s + (c.width ?? 14), 0);
    const colWidths = report.columns.map(
      (c) => ((c.width ?? 14) / totalWeight) * pageWidth,
    );

    const startX = doc.page.margins.left;
    const rowHeight = 20;

    const drawHeader = (y: number): void => {
      doc.fontSize(9).font("Helvetica-Bold");
      let x = startX;
      report.columns.forEach((c, i) => {
        doc.text(c.header, x + 2, y + 5, { width: colWidths[i]! - 4, ellipsis: true });
        x += colWidths[i]!;
      });
      doc
        .moveTo(startX, y + rowHeight)
        .lineTo(startX + pageWidth, y + rowHeight)
        .strokeColor("#999")
        .stroke();
      doc.font("Helvetica");
    };

    let y = doc.y;
    drawHeader(y);
    y += rowHeight;

    doc.fontSize(9);
    for (const row of report.rows) {
      // Page break if the next row won't fit.
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += rowHeight;
      }
      let x = startX;
      report.columns.forEach((c, i) => {
        doc.text(cell(row[c.key]), x + 2, y + 5, {
          width: colWidths[i]! - 4,
          ellipsis: true,
        });
        x += colWidths[i]!;
      });
      doc
        .moveTo(startX, y + rowHeight)
        .lineTo(startX + pageWidth, y + rowHeight)
        .strokeColor("#eee")
        .stroke();
      y += rowHeight;
    }

    if (report.rows.length === 0) {
      doc.moveDown().fontSize(11).fillColor("#666").text("No records match this report.");
    }

    doc.end();
  });
}

/** Chooses the right exporter and returns bytes + content type + filename. */
export async function exportReport(
  report: ReportData,
  format: "pdf" | "excel" | "csv",
): Promise<{ data: Buffer; contentType: string; filename: string }> {
  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const date = (report.generatedAt ?? new Date()).toISOString().slice(0, 10);
  if (format === "csv") {
    return {
      data: toCsv(report),
      contentType: "text/csv; charset=utf-8",
      filename: `${safeTitle}-${date}.csv`,
    };
  }
  if (format === "excel") {
    return {
      data: await toExcel(report),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${safeTitle}-${date}.xlsx`,
    };
  }
  return {
    data: await toPdf(report),
    contentType: "application/pdf",
    filename: `${safeTitle}-${date}.pdf`,
  };
}
