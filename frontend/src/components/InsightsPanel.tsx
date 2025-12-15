import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Insight, InsightType } from "./Insight";
import { Lightbulb } from "lucide-react";

export interface InsightData {
  id: string;
  type: InsightType;
  title?: string;
  message: string;
  metric?: {
    value: string;
    trend?: "up" | "down";
  };
}

interface InsightsPanelProps {
  insights: InsightData[];
  title?: string;
  description?: string;
}

export function InsightsPanel({
  insights,
  title = "AI-Generated Insights",
  description = "Key findings and recommendations based on your data",
}: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => (
            <Insight
              key={insight.id}
              type={insight.type}
              title={insight.title}
              metric={insight.metric}
            >
              {insight.message}
            </Insight>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
