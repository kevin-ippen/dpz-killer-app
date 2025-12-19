/**
 * Utility to convert table data to chart specifications
 */

import { TableBlock } from "@/types/chat";

export type ChartType = "bar" | "line" | "pie";

/**
 * Auto-detect the best chart type for the table data
 */
export function detectChartType(block: TableBlock): ChartType {
  const { columns, rows } = block;

  // Check if first column looks like dates/time
  const firstCol = rows.map((r) => r[0]?.toString() || "");
  const hasDatePattern = firstCol.some((val) =>
    /\d{4}[-/]\d{1,2}|Q[1-4]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(val)
  );

  if (hasDatePattern) {
    return "line"; // Time series -> line chart
  }

  // Check if we have exactly 2 columns (category + value) and few rows
  if (columns.length === 2 && rows.length <= 8) {
    return "pie"; // Simple category + value -> pie chart
  }

  // Default to bar chart
  return "bar";
}

/**
 * Parse a string value to number, handling various formats
 */
function parseNumericValue(value: string): number {
  if (!value || typeof value !== 'string') return 0;

  // Remove common formatting characters
  const cleaned = value
    .replace(/[$£€¥]/g, '')      // Currency symbols
    .replace(/,/g, '')            // Thousands separators
    .replace(/\s+/g, '')          // Whitespace
    .replace(/%$/g, '')           // Percentage sign at end
    .trim();

  // Handle empty or non-numeric strings
  if (!cleaned || cleaned === '-' || cleaned === 'N/A') return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert table data to Recharts-compatible format
 */
export function tableToChartData(block: TableBlock, chartType: ChartType = "bar") {
  const { columns, rows } = block;

  if (rows.length === 0 || columns.length === 0) {
    return { data: [], dataKeys: [] };
  }

  // For pie chart: use first two columns (label + value)
  if (chartType === "pie") {
    const data = rows.map((row) => ({
      name: row[0]?.toString() || "",
      value: parseNumericValue(row[1]?.toString() || "0"),
    })).filter(d => d.value > 0); // Filter out zero values
    return { data, dataKeys: ["value"] };
  }

  // For bar/line charts: first column is labels, rest are data series
  const data = rows.map((row, idx) => {
    const entry: any = {
      name: row[0]?.toString() || `Row ${idx + 1}`,
    };

    // Add each numeric column as a data series
    for (let i = 1; i < columns.length; i++) {
      const value = row[i]?.toString() || "";
      entry[columns[i]] = parseNumericValue(value);
    }

    return entry;
  });

  // Data keys are all columns except the first (which is labels)
  const dataKeys = columns.slice(1);

  return { data, dataKeys };
}

/**
 * Generate a color palette for multiple data series
 */
export function getChartColors(count: number): string[] {
  const colors = [
    "#FF6B35", // Domino's Red
    "#00A3E0", // Bright Blue
    "#FFA630", // Orange
    "#8B5CF6", // Purple
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#6366F1", // Indigo
  ];

  return colors.slice(0, count);
}

/**
 * Format numeric values for display
 */
export function formatValue(value: number): string {
  // If it looks like currency (large numbers), format with $
  if (value >= 1000) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(1)}K`;
  }

  // Round to 2 decimals
  return value.toFixed(2);
}
