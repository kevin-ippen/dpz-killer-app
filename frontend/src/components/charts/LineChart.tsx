import { useMemo } from "react";
import {
  LineChart as RechartsLineChart,
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

interface LineChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  format?: "currency" | "number";
  isLoading?: boolean;
}

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function LineChart({
  title,
  data,
  xKey,
  yKeys,
  colors = defaultColors,
  format = "number",
  isLoading = false,
}: LineChartProps) {
  // Calculate dynamic domain based on data
  const yDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 100];

    const allValues = data.flatMap((item) =>
      yKeys.map((key) => Number(item[key]) || 0)
    );

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // Add 10% padding to top for better visualization
    const padding = (maxValue - minValue) * 0.1;
    const min = Math.max(0, Math.floor(minValue - padding));
    const max = Math.ceil(maxValue + padding);

    return [min, max];
  }, [data, yKeys]);

  const formatValue = (value: number) => {
    if (format === "currency") {
      // Use compact format for large numbers in axis labels
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return formatCurrency(value);
    }

    // Use compact format for large numbers
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return formatNumber(value);
  };

  const formatTooltipValue = (value: any) => {
    const numValue = Number(value);
    if (format === "currency") {
      return formatCurrency(numValue);
    }
    return formatNumber(numValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={{ stroke: "#e5e7eb" }}
              tickFormatter={formatValue}
            />
            <Tooltip
              formatter={(value: any) => formatTooltipValue(value)}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
