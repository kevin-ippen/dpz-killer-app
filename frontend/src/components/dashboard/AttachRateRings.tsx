/**
 * Attach Rate Rings - Product cross-sell performance with ring visualizations
 * Based on MarketingDashboard.jsx pattern
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pizza, TrendingUp, TrendingDown } from "lucide-react";

interface AttachRateData {
  product: string;
  rate: number;
  revenue: number;
  trend?: number;
}

interface AttachRateRingsProps {
  data: AttachRateData[];
  isLoading?: boolean;
}

export function AttachRateRings({ data, isLoading }: AttachRateRingsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pizza className="h-4 w-4" />
            Product Attach Rates
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

  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pizza className="h-4 w-4" />
            Product Attach Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-sm">No attach rate data available</div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pizza className="h-4 w-4" />
          Product Attach Rates
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Cross-sell performance with pizza orders</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {data.map((item) => {
            const isPositive = (item.trend || 0) >= 0;
            const circumference = 2 * Math.PI * 35;
            const dashArray = (item.rate / 100) * circumference;

            return (
              <div key={item.product} className="flex items-center gap-3">
                {/* Ring visualization */}
                <div className="flex-shrink-0">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    {/* Background ring */}
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                    />
                    {/* Fill ring */}
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="8"
                      strokeDasharray={`${dashArray} ${circumference}`}
                      strokeDashoffset={circumference / 4}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                    <text
                      x="40"
                      y="40"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-base font-semibold fill-gray-900"
                    >
                      {item.rate}%
                    </text>
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.product}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(item.revenue)} revenue
                  </div>
                  {item.trend !== undefined && (
                    <div
                      className="flex items-center gap-1 text-xs font-medium mt-1"
                      style={{ color: isPositive ? '#10B981' : '#EF4444' }}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {isPositive ? '+' : ''}{item.trend.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
