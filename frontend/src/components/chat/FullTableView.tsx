import { useState } from "react";
import { TableBlock } from "@/types/chat";
import { Download, Table as TableIcon, BarChart3 } from "lucide-react";
import {
  tableToChartData,
  detectChartType,
  getChartColors,
  formatValue,
  ChartType,
} from "@/utils/tableToChart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FullTableViewProps {
  block: TableBlock;
}

type ViewMode = "table" | "chart";

export function FullTableView({ block }: FullTableViewProps) {
  const { columns, rows, meta } = block;

  // State for view mode and chart type
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [chartType, setChartType] = useState<ChartType>(() => detectChartType(block));

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

  // Generate chart data
  const { data, dataKeys } = tableToChartData(block, chartType);
  const colors = getChartColors(dataKeys.length);

  // Render chart based on type
  const renderChart = () => {
    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatValue(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
            <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} />
            <YAxis stroke="var(--color-text-secondary)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "6px",
              }}
              formatter={(value: any) => formatValue(value)}
            />
            <Legend />
            {dataKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[idx]}
                strokeWidth={2}
                dot={{ fill: colors[idx], r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Bar chart (default)
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
          <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(71, 85, 105, 0.5)",
              borderRadius: "6px",
            }}
            formatter={(value: any) => formatValue(value)}
          />
          <Legend />
          {dataKeys.map((key, idx) => (
            <Bar key={key} dataKey={key} fill={colors[idx]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
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
          {/* View mode toggle */}
          <div className="flex items-center gap-1 border rounded-full p-0.5" style={{ borderColor: "rgba(71, 85, 105, 0.5)" }}>
            <button
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full transition-all"
              style={{
                background: viewMode === "table" ? "var(--color-accent)" : "transparent",
                color: viewMode === "table" ? "white" : "var(--color-text-secondary)",
              }}
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-3 w-3" />
              Table
            </button>
            <button
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full transition-all"
              style={{
                background: viewMode === "chart" ? "var(--color-accent)" : "transparent",
                color: viewMode === "chart" ? "white" : "var(--color-text-secondary)",
              }}
              onClick={() => setViewMode("chart")}
            >
              <BarChart3 className="h-3 w-3" />
              Chart
            </button>
          </div>

          {/* Chart type selector (only show in chart mode) */}
          {viewMode === "chart" && (
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="text-[10px] px-2 py-1 border rounded-full"
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                borderColor: "rgba(71, 85, 105, 0.8)",
                color: "var(--color-text-secondary)",
              }}
            >
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="pie">Pie</option>
            </select>
          )}

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

      {/* Content (table or chart) */}
      <div className="flex-1 overflow-auto">
        {viewMode === "table" ? (
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
        ) : (
          <div style={{ width: "100%", height: "100%", padding: "1rem" }}>
            {renderChart()}
          </div>
        )}
      </div>
    </div>
  );
}
