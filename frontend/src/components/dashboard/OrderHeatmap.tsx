/**
 * Order Heatmap - Shows order volume by hour and day of week
 * Based on MarketingDashboard.jsx pattern
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface HeatmapDataPoint {
  day: string;
  hour: number;
  dayIndex: number;
  value: number;
}

interface OrderHeatmapProps {
  data: HeatmapDataPoint[];
  isLoading?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function OrderHeatmap({ data, isLoading }: OrderHeatmapProps) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'rgba(59, 130, 246, 0.1)';
    if (intensity < 0.4) return 'rgba(59, 130, 246, 0.3)';
    if (intensity < 0.6) return 'rgba(59, 130, 246, 0.5)';
    if (intensity < 0.8) return 'rgba(59, 130, 246, 0.7)';
    return 'rgba(59, 130, 246, 0.9)';
  };

  const getDataPoint = (day: string, hour: number) => {
    return data.find(d => d.day === day && d.hour === hour);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Order Patterns by Hour
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Order Patterns by Hour
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Orders per hour, last 30 days</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Hour labels */}
          <div className="flex items-center mb-2">
            <div className="w-12 flex-shrink-0" />
            {HOURS.filter(h => h % 3 === 0).map(hour => (
              <div key={hour} className="flex-1 text-center text-[10px] text-gray-500">
                {hour === 0 ? '12a' : hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
              </div>
            ))}
          </div>

          {/* Grid */}
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-0.5">
              <div className="w-12 flex-shrink-0 text-[11px] text-gray-500">{day}</div>
              {HOURS.map(hour => {
                const point = getDataPoint(day, hour);
                return (
                  <div
                    key={hour}
                    className="flex-1 h-6 rounded-sm cursor-pointer transition-transform hover:scale-110"
                    style={{
                      backgroundColor: getColor(point?.value || 0),
                    }}
                    title={`${day} ${hour}:00 - ${point?.value || 0} orders`}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-gray-500">
            <span>Low</span>
            <div
              className="w-24 h-2 rounded"
              style={{
                background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.9))',
              }}
            />
            <span>High</span>
          </div>

          {/* Peak times callout */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <div className="text-[10px] text-gray-500">🌙 Peak Dinner</div>
              <div className="text-xs font-medium">6-9 PM (42%)</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">🌅 Peak Lunch</div>
              <div className="text-xs font-medium">11 AM-1 PM (18%)</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">🎉 Best Day</div>
              <div className="text-xs font-medium">Saturday (+35%)</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
