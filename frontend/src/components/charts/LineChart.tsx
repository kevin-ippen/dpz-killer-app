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
  ReferenceDot,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Anomaly } from "@/lib/anomalyDetection";
import { AlertTriangle } from "lucide-react";

interface LineChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  format?: "currency" | "number";
  isLoading?: boolean;
  anomalies?: Anomaly[];
  showAnomalies?: boolean;
}

// Domino's premium brand color palette
const defaultColors = ["#2F7FD9", "#EC3115", "#2666B1", "#B59D81"];

export function LineChart({
  title,
  data,
  xKey,
  yKeys,
  colors = defaultColors,
  format = "number",
  isLoading = false,
  anomalies = [],
  showAnomalies = true,
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
            {/* Anomaly Markers */}
            {showAnomalies && anomalies && anomalies.length > 0 && (
              <>
                {anomalies.map((anomaly, idx) => {
                  if (!data[anomaly.index]) return null;

                  const anomalyColor =
                    anomaly.severity === "high"
                      ? "#ef4444"
                      : anomaly.severity === "medium"
                      ? "#f59e0b"
                      : "#eab308";

                  return (
                    <ReferenceDot
                      key={`anomaly-${idx}`}
                      x={data[anomaly.index][xKey]}
                      y={anomaly.value}
                      r={8}
                      fill={anomalyColor}
                      stroke="white"
                      strokeWidth={2}
                      opacity={0.8}
                      label={{
                        value: "!",
                        fill: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    />
                  );
                })}
              </>
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
        )}
        {/* Anomaly Legend */}
        {showAnomalies && anomalies && anomalies.length > 0 && !isLoading && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 mb-2">
                  {anomalies.length} Anomal{anomalies.length === 1 ? "y" : "ies"} Detected
                </p>
                <div className="space-y-1 text-amber-800">
                  {anomalies.slice(0, 3).map((anomaly, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            anomaly.severity === "high"
                              ? "#ef4444"
                              : anomaly.severity === "medium"
                              ? "#f59e0b"
                              : "#eab308",
                        }}
                      />
                      <span className="text-xs">
                        {data[anomaly.index]?.[xKey]}: {anomaly.reason}
                      </span>
                    </div>
                  ))}
                  {anomalies.length > 3 && (
                    <p className="text-xs text-amber-600 mt-1">
                      +{anomalies.length - 3} more anomalies
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
