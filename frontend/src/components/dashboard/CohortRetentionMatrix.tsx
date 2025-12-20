/**
 * Cohort Retention Matrix - Month-over-month retention visualization
 * Based on MarketingDashboard.jsx pattern
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface CohortData {
  cohort_month: string;
  months_since_acquisition: number;
  retention_rate_pct: number;
}

interface CohortRetentionMatrixProps {
  data: CohortData[];
  isLoading?: boolean;
}

export function CohortRetentionMatrix({ data, isLoading }: CohortRetentionMatrixProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Cohort Retention
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

  // Group data by cohort
  const cohortMap = data.reduce((acc, row) => {
    const cohortKey = row.cohort_month;
    if (!acc[cohortKey]) {
      acc[cohortKey] = {};
    }
    acc[cohortKey][row.months_since_acquisition] = row.retention_rate_pct;
    return acc;
  }, {} as Record<string, Record<number, number>>);

  const cohorts = Object.keys(cohortMap).sort().slice(-6); // Last 6 cohorts
  const maxMonths = 6;

  const getColor = (value: number) => {
    if (value >= 80) return '#10B981';
    if (value >= 60) return '#3B82F6';
    if (value >= 40) return '#F59E0B';
    if (value >= 20) return '#EF4444';
    return '#6B7280';
  };

  const formatCohortLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Cohort Retention
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Customer retention by signup month</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Header row */}
          <div className="flex mb-2">
            <div className="w-20 flex-shrink-0 text-[10px] font-medium text-gray-500">Cohort</div>
            {Array.from({ length: maxMonths }, (_, i) => (
              <div key={i} className="w-16 flex-shrink-0 text-center text-[10px] font-medium text-gray-500">
                {i === 0 ? 'M0' : `M${i}`}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {cohorts.map((cohort) => (
            <div key={cohort} className="flex mb-1">
              <div className="w-20 flex-shrink-0 text-[11px] font-medium text-gray-700 flex items-center">
                {formatCohortLabel(cohort)}
              </div>
              {Array.from({ length: maxMonths }, (_, i) => {
                const value = cohortMap[cohort][i];
                const hasValue = value !== undefined;

                return (
                  <div
                    key={i}
                    className="w-16 flex-shrink-0 h-9 flex items-center justify-center text-[11px] font-medium rounded mx-0.5"
                    style={{
                      backgroundColor: hasValue ? `${getColor(value)}30` : 'transparent',
                      color: hasValue ? getColor(value) : '#9CA3AF',
                    }}
                    title={hasValue ? `${value.toFixed(1)}% retention` : 'No data'}
                  >
                    {hasValue ? `${value.toFixed(0)}%` : '—'}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-[10px] text-gray-500">
            <span style={{ color: '#10B981' }}>● 80%+</span>
            <span style={{ color: '#3B82F6' }}>● 60-79%</span>
            <span style={{ color: '#F59E0B' }}>● 40-59%</span>
            <span style={{ color: '#EF4444' }}>● &lt;40%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
