/**
 * CAC Efficiency Gauge - Shows CAC vs benchmark with visual bars
 * Based on MarketingDashboard.jsx pattern
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface CACData {
  channel: string;
  cac: number;
  benchmark?: number;
  new_customers?: number;
}

interface CACEfficiencyGaugeProps {
  data: CACData[];
  isLoading?: boolean;
}

export function CACEfficiencyGauge({ data, isLoading }: CACEfficiencyGaugeProps) {
  // Guard against undefined/null data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            CAC by Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-sm">No CAC data available</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            CAC by Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by CAC (ascending) - convert to numbers
  const sortedData = [...data].sort((a, b) => Number(a.cac) - Number(b.cac));

  // Set default benchmarks based on industry standards if not provided, convert CAC to number
  const dataWithBenchmarks = sortedData.map(item => ({
    ...item,
    cac: Number(item.cac) || 0,
    benchmark: Number(item.benchmark) || getBenchmark(item.channel),
    new_customers: Number(item.new_customers) || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          CAC by Channel
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Customer Acquisition Cost vs Industry Benchmark</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dataWithBenchmarks.map((item) => {
            const isEfficient = item.cac <= item.benchmark;
            const efficiency = ((item.benchmark - item.cac) / item.benchmark) * 100;
            const barWidth = Math.min((item.cac / 50) * 100, 100);
            const benchmarkPos = Math.min((item.benchmark / 50) * 100, 100);

            return (
              <div key={item.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{item.channel}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span
                        className="font-semibold"
                        style={{ color: isEfficient ? '#10B981' : '#EF4444' }}
                      >
                        ${item.cac.toFixed(2)}
                      </span>
                      <span>Benchmark: ${item.benchmark.toFixed(0)}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isEfficient ? '#10B981' : '#EF4444' }}
                  >
                    {isEfficient ? '✓' : '!'} {Math.abs(efficiency).toFixed(0)}%
                    {isEfficient ? ' under' : ' over'}
                  </span>
                </div>

                {/* Bar visualization */}
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: isEfficient ? '#10B981' : '#EF4444',
                    }}
                  />
                  {/* Benchmark line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                    style={{ left: `${benchmarkPos}%` }}
                    title={`Benchmark: $${item.benchmark}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get industry benchmark CAC by channel
function getBenchmark(channel: string): number {
  const benchmarks: Record<string, number> = {
    'Email': 15,
    'App': 8,
    'Push Notifications': 8,
    'Search': 30,
    'Social': 25,
    'Social Media': 25,
    'Display': 35,
    'TV': 45,
    'Radio': 35,
    'OOH': 40,
  };

  return benchmarks[channel] || 25; // Default benchmark
}
