import React from "react";
import { TableBlock } from "@/types/chat";
import { Download } from "lucide-react";

interface FullTableViewProps {
  block: TableBlock;
}

export function FullTableView({ block }: FullTableViewProps) {
  const { columns, rows, meta } = block;

  const handleDownloadCSV = () => {
    // Generate CSV content
    const csvRows = [
      columns.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ];
    const csvContent = csvRows.join("\n");

    // Create download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${meta?.title || "table"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.96)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-soft)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}
      >
        <div>
          <div
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {meta?.title ?? "Table"}
          </div>
          {meta?.subtitle && (
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {meta.subtitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {rows.length} rows
          </span>
          <button
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] border rounded-full transition-colors"
            style={{
              borderColor: "rgba(71, 85, 105, 0.8)",
              color: "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.8)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onClick={handleDownloadCSV}
          >
            <Download className="h-3 w-3" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-accent)", color: "white" }}>
              {columns.map((header) => (
                <th
                  key={header}
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "0.5rem 0.75rem",
                    textAlign: "left",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  background:
                    rowIdx % 2 === 0
                      ? "rgba(15, 23, 42, 0.9)"
                      : "rgba(30, 41, 59, 0.9)",
                }}
              >
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      color: "var(--color-text-primary)",
                      fontSize: "0.8rem",
                      padding: "0.45rem 0.75rem",
                      borderBottom: "1px solid rgba(30, 41, 59, 0.8)",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
