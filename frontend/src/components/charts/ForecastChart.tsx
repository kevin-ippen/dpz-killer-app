import { useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ForecastPoint } from "@/lib/forecasting";
import { TrendingUp } from "lucide-react";

interface ForecastChartProps {
  title: string;
  historicalData: any[];
  forecastData: ForecastPoint[];
  xKey: string;
  yKey: string;
  format?: "currency" | "number";
  isLoading?: boolean;
}

export function ForecastChart({
  title,
  historicalData,
  forecastData,
  xKey,
  yKey,
  format = "number",
  isLoading = false,
}: ForecastChartProps) {
  // Combine historical and forecast data
  const combinedData = useMemo(() => {
    const historical = historicalData.map((d) => ({
      [xKey]: d[xKey],
      actual: Number(d[yKey] || 0),
      forecast: null,
      lowerBound: null,
      upperBound: null,
      isForecast: false,
    }));

    const forecast = forecastData.map((f) => ({
      [xKey]: f.period,
      actual: null,
      forecast: f.value,
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
      isForecast: true,
      confidence: f.confidence,
    }));

    return [...historical, ...forecast];
  }, [historicalData, forecastData, xKey, yKey]);

  // Calculate dynamic domain
  const yDomain = useMemo(() => {
    if (combinedData.length === 0) return [0, 100];

    const allValues = combinedData.flatMap((item) => [
      item.actual,
      item.forecast,
      item.upperBound,
    ].filter((v) => v !== null));

    if (allValues.length === 0) return [0, 100];

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;

    return [
      Math.max(0, Math.floor(minValue - padding)),
      Math.ceil(maxValue + padding),
    ];
  }, [combinedData]);

  const formatValue = (value: number) => {
    if (format === "currency") {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return formatCurrency(value);
    }

    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
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
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>
              {forecastData.length} period forecast (
              {forecastData[0]?.confidence || 95}% confidence)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={combinedData}>
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
                {/* Confidence Interval */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Lower Bound"
                />
                {/* Historical Data */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Actual"
                  connectNulls={false}
                />
                {/* Forecast Data */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Forecast"
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Forecast Summary */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {forecastData.map((forecast, idx) => {
                const trend =
                  idx > 0
                    ? ((forecast.value - forecastData[idx - 1].value) /
                        forecastData[idx - 1].value) *
                      100
                    : 0;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <p className="text-xs text-blue-600 font-medium">
                      {forecast.period}
                    </p>
                    <p className="text-lg font-bold text-blue-900 mt-1">
                      {formatValue(forecast.value)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {idx > 0 && (
                        <span
                          className={`text-xs font-medium ${
                            trend >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {trend >= 0 ? "+" : ""}
                          {trend.toFixed(1)}%
                        </span>
                      )}
                      <span className="text-xs text-blue-600">
                        ±{formatValue(forecast.upperBound - forecast.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
