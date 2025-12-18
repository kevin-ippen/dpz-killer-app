import React from "react";
import { ChartBlock, TablePreviewData } from "@/types/chat";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface ChartCardProps {
  block: ChartBlock;
  tablePreview?: TablePreviewData | null;
  loading?: boolean;
  error?: string | null;
}

export function ChartCard({ block, tablePreview, loading, error }: ChartCardProps) {
  // If we have a spec, try to render it
  const renderChart = () => {
    if (!block.spec) {
      return (
        <div
          className="flex items-center justify-center h-full text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          No chart data available
        </div>
      );
    }

    // For Recharts spec type
    if (block.specType === "recharts" && block.spec) {
      const { type, data, dataKey, xKey, yKey, ...chartProps } = block.spec;

      // Render based on chart type
      if (type === "bar") {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart data={data} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
              <XAxis dataKey={xKey || "name"} stroke="var(--color-text-secondary)" />
              <YAxis stroke="var(--color-text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(30, 41, 59, 0.9)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Legend />
              <Bar dataKey={dataKey || yKey || "value"} fill="var(--color-accent)" />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      }

      if (type === "line") {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={data} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
              <XAxis dataKey={xKey || "name"} stroke="var(--color-text-secondary)" />
              <YAxis stroke="var(--color-text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(30, 41, 59, 0.9)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey || yKey || "value"}
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
      }
    }

    // For VegaLite or other spec types, show placeholder for now
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-sm p-8"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <p className="mb-2">Chart rendering for {block.specType}</p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          (Spec available - renderer to be implemented)
        </p>
      </div>
    );
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.96)",
        border: "1px solid rgba(30, 41, 59, 0.9)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-soft)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      {(block.title || block.subtitle) && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}
        >
          {block.title && (
            <div
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {block.title}
            </div>
          )}
          {block.subtitle && (
            <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {block.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div
        className="p-4"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(30, 41, 59, 0.2) 100%)",
          backgroundImage: `
            linear-gradient(rgba(100, 116, 139, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 116, 139, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
          minHeight: "360px",
        }}
      >
        {renderChart()}
      </div>

      {/* Footer metadata */}
      {block.meta && (
        <div
          className="px-4 py-2 border-t text-xs flex items-center gap-4"
          style={{
            borderColor: "rgba(30, 41, 59, 0.8)",
            color: "var(--color-text-secondary)",
          }}
        >
          {block.meta.primaryMeasure && (
            <span>Measure: {block.meta.primaryMeasure}</span>
          )}
          {block.meta.primaryDim && <span>Dimension: {block.meta.primaryDim}</span>}
          {block.meta.timeframe && <span>Timeframe: {block.meta.timeframe}</span>}
        </div>
      )}

      {/* Table preview if available */}
      {tablePreview && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}
        >
          <details>
            <summary
              className="text-xs font-medium cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
            >
              View data ({tablePreview.rows.length} rows)
            </summary>
            <div className="mt-2 overflow-auto max-h-64">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "rgba(0, 100, 145, 0.2)" }}>
                    {tablePreview.columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: "0.25rem 0.5rem",
                          textAlign: "left",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablePreview.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderBottom: "1px solid rgba(30, 41, 59, 0.5)",
                            color: "var(--color-text-secondary)",
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
          </details>
        </div>
      )}
    </div>
  );
}
