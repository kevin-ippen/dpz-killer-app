import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface AxisConfig {
  key: string;
  label: string;
  color: string;
  format?: "currency" | "number" | "percent";
  type?: "bar" | "line";
}

interface ComboChartProps {
  title: string;
  description?: string;
  data: any[];
  xKey: string;
  leftYAxis: AxisConfig;
  rightYAxis: AxisConfig;
  isLoading?: boolean;
}

export function ComboChart({
  title,
  description,
  data,
  xKey,
  leftYAxis,
  rightYAxis,
  isLoading = false,
}: ComboChartProps) {
  // Calculate dynamic domains for both axes
  const leftDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 100];
    const values = data.map((item) => Number(item[leftYAxis.key]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [data, leftYAxis.key]);

  const rightDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 100];
    const values = data.map((item) => Number(item[rightYAxis.key]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [data, rightYAxis.key]);

  const formatValue = (value: number, format?: string) => {
    if (format === "currency") {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return formatCurrency(value);
    }
    if (format === "percent") {
      return `${value.toFixed(1)}%`;
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return formatNumber(value);
  };

  const formatTooltipValue = (value: any, format?: string) => {
    const numValue = Number(value);
    if (format === "currency") return formatCurrency(numValue);
    if (format === "percent") return `${numValue.toFixed(2)}%`;
    return formatNumber(numValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={xKey}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                yAxisId="left"
                domain={leftDomain}
                tick={{ fill: leftYAxis.color, fontSize: 12 }}
                tickLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(value) => formatValue(value, leftYAxis.format)}
                label={{
                  value: leftYAxis.label,
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: leftYAxis.color, fontSize: 12 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={rightDomain}
                tick={{ fill: rightYAxis.color, fontSize: 12 }}
                tickLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(value) => formatValue(value, rightYAxis.format)}
                label={{
                  value: rightYAxis.label,
                  angle: 90,
                  position: "insideRight",
                  style: { fill: rightYAxis.color, fontSize: 12 },
                }}
              />
              <Tooltip
                formatter={(value: any, name: string) => {
                  const axis = name === leftYAxis.key ? leftYAxis : rightYAxis;
                  return [formatTooltipValue(value, axis.format), axis.label];
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />

              {/* Render left axis (default to bar) */}
              {(leftYAxis.type || "bar") === "bar" ? (
                <Bar
                  yAxisId="left"
                  dataKey={leftYAxis.key}
                  fill={leftYAxis.color}
                  name={leftYAxis.label}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={leftYAxis.key}
                  stroke={leftYAxis.color}
                  name={leftYAxis.label}
                  strokeWidth={3}
                  dot={{ fill: leftYAxis.color, r: 4 }}
                />
              )}

              {/* Render right axis (default to line) */}
              {(rightYAxis.type || "line") === "line" ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={rightYAxis.key}
                  stroke={rightYAxis.color}
                  name={rightYAxis.label}
                  strokeWidth={3}
                  dot={{ fill: rightYAxis.color, r: 4 }}
                />
              ) : (
                <Bar
                  yAxisId="right"
                  dataKey={rightYAxis.key}
                  fill={rightYAxis.color}
                  name={rightYAxis.label}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
