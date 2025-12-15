import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string | ReactNode;
  value: number;
  format?: "currency" | "number" | "percent";
  delta?: {
    value: number;
    isPositive: boolean;
  };
  sparkline?: number[];
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  format = "number",
  delta,
  sparkline,
}: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "percent":
        return formatPercent(val);
      default:
        return formatNumber(val);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Main Value */}
          <div className="text-3xl font-bold text-gray-900">
            {formatValue(value)}
          </div>

          {/* Delta (Change) */}
          {delta && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                delta.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {delta.isPositive ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
              <span>{formatPercent(Math.abs(delta.value))}</span>
              <span className="text-gray-500">vs last period</span>
            </div>
          )}

          {/* Sparkline (mini chart) */}
          {sparkline && sparkline.length > 0 && (() => {
            const max = Math.max(...sparkline);
            const min = Math.min(...sparkline);
            const range = max - min;

            // Calculate proper dimensions
            const numPoints = sparkline.length;
            const viewBoxWidth = 100; // Fixed width for consistency
            const viewBoxHeight = 50; // Reasonable height
            const padding = 5; // Padding to prevent edge clipping
            const usableWidth = viewBoxWidth - (padding * 2);
            const usableHeight = viewBoxHeight - (padding * 2);

            // Calculate points with proper spacing across full width
            const points = sparkline.map((val, idx) => {
              // Distribute points evenly across the usable width
              const x = padding + (idx / (numPoints - 1)) * usableWidth;

              // Scale y value with padding
              const normalizedY = range === 0 ? 0.5 : (val - min) / range;
              const y = padding + (1 - normalizedY) * usableHeight;

              return `${x.toFixed(2)},${y.toFixed(2)}`;
            }).join(" ");

            return (
              <div className="h-12 w-full">
                <svg
                  className="h-full w-full"
                  viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke={delta?.isPositive ? "#16a34a" : "#dc2626"}
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                </svg>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
