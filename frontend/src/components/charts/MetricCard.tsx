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
    <Card className="border border-[#F8F3E9] shadow-md hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#B59D81]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Value */}
          <div className="text-[2.75rem] font-light tracking-tight bg-gradient-to-br from-[#2F7FD9] to-[#2666B1] bg-clip-text text-transparent leading-none">
            {formatValue(value)}
          </div>

          {/* Delta (Change) */}
          {delta && (
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                delta.isPositive ? "text-[#2F7FD9]" : "text-[#EC3115]"
              )}
            >
              {delta.isPositive ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
              <span className="font-semibold">{formatPercent(Math.abs(delta.value))}</span>
              <span className="text-[#B59D81] font-light text-xs">vs last period</span>
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
              <div className="h-14 w-full rounded-lg overflow-hidden mt-2">
                <svg
                  className="h-full w-full"
                  viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                  preserveAspectRatio="none"
                >
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={delta?.isPositive ? "#2F7FD9" : "#EC3115"} />
                      <stop offset="100%" stopColor={delta?.isPositive ? "#1D4D83" : "#D42C13"} />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#sparklineGradient)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    opacity="0.8"
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
