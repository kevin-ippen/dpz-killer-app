/**
 * Customer Journey Funnel - Animated funnel showing conversion stages
 * Creative visualization with percentages and drop-off rates
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface FunnelStage {
  stage: string;
  value: number;
  color: string;
}

interface CustomerJourneyFunnelProps {
  data: FunnelStage[];
  isLoading?: boolean;
}

export function CustomerJourneyFunnel({ data, isLoading }: CustomerJourneyFunnelProps) {
  // Guard against undefined/null data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Journey Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-sm">No funnel data available</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Journey Funnel
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

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Customer Journey Funnel
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Conversion rates through the customer journey</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((stage, index) => {
            const width = (stage.value / maxValue) * 100;
            const conversionRate = index > 0 ? ((stage.value / data[index - 1].value) * 100).toFixed(1) : '100.0';
            const dropOff = index > 0 ? (100 - parseFloat(conversionRate)).toFixed(1) : '0.0';

            return (
              <div key={index} className="space-y-1">
                {/* Stage label and stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold">
                      {stage.value.toLocaleString()} users
                    </span>
                    {index > 0 && (
                      <>
                        <span className="text-green-600">{conversionRate}% convert</span>
                        <span className="text-red-600">{dropOff}% drop</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Funnel bar */}
                <div className="relative h-14 flex items-center">
                  <div
                    className="h-full rounded-r-lg transition-all duration-500 flex items-center justify-center text-white font-semibold text-sm"
                    style={{
                      width: `${width}%`,
                      backgroundColor: stage.color,
                      clipPath: index === data.length - 1
                        ? 'none'
                        : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)',
                    }}
                  >
                    {width > 20 && `${((stage.value / data[0].value) * 100).toFixed(0)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data[0]?.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Started</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data[data.length - 1]?.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Converted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {((data[data.length - 1]?.value / data[0]?.value) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Overall Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
