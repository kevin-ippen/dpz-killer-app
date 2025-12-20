/**
 * Revenue Waterfall Chart - Shows revenue progression with deltas
 * Creative visualization for showing revenue flow
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface WaterfallData {
  label: string;
  value: number;
  isPositive: boolean;
}

interface RevenueWaterfallChartProps {
  data: WaterfallData[];
  isLoading?: boolean;
}

export function RevenueWaterfallChart({ data, isLoading }: RevenueWaterfallChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Waterfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate cumulative values
  let cumulative = 0;
  const bars = data.map((item, index) => {
    const start = cumulative;
    cumulative += item.value;
    const end = cumulative;
    return {
      ...item,
      start,
      end,
      height: Math.abs(item.value),
      index,
    };
  });

  const maxValue = Math.max(...bars.map(b => Math.abs(b.end)));
  const scale = 300 / maxValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Waterfall Analysis</CardTitle>
        <p className="text-xs text-gray-500 mt-1">Monthly revenue progression</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {bars.map((bar, i) => {
            const barHeight = Math.abs(bar.value) * scale;
            const offsetFromBaseline = bar.start * scale;

            return (
              <div key={i} className="flex items-center gap-4">
                {/* Label */}
                <div className="w-32 text-sm font-medium text-gray-700 truncate">
                  {bar.label}
                </div>

                {/* Bar visualization */}
                <div className="flex-1 relative h-12">
                  {/* Baseline */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />

                  {/* Bar */}
                  <div
                    className="absolute rounded transition-all duration-300"
                    style={{
                      left: `${offsetFromBaseline}px`,
                      width: `${barHeight}px`,
                      height: '32px',
                      top: bar.isPositive ? '4px' : 'auto',
                      bottom: bar.isPositive ? 'auto' : '4px',
                      backgroundColor: bar.isPositive ? '#10B981' : '#EF4444',
                      opacity: 0.8,
                    }}
                  />

                  {/* Connector line to next */}
                  {i < bars.length - 1 && (
                    <div
                      className="absolute h-px bg-gray-400"
                      style={{
                        left: `${bar.end * scale}px`,
                        width: '20px',
                        top: '50%',
                      }}
                    />
                  )}
                </div>

                {/* Value */}
                <div className="w-24 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {bar.isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className="text-sm font-semibold"
                      style={{ color: bar.isPositive ? '#10B981' : '#EF4444' }}
                    >
                      ${(bar.value / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Total: ${(bar.end / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
