import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export function exportData(
  format: ExportFormat,
  filename: string,
  columns: { key: string; label: string }[],
  rows: any[],
) {
  const headers = columns.map((c) => c.label);
  const body = rows.map((r) => columns.map((c) => formatCell(r[c.key])));

  if (format === "csv") {
    const csv = [headers, ...body]
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
    return;
  }
  if (format === "xlsx") {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return;
  }
  if (format === "pdf") {
    const doc = new jsPDF({ orientation: headers.length > 5 ? "landscape" : "portrait" });
    doc.setFontSize(14);
    doc.text(filename, 14, 14);
    autoTable(doc, { head: [headers], body, startY: 20, styles: { fontSize: 8 } });
    doc.save(`${filename}.pdf`);
  }
}

function formatCell(v: any) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
