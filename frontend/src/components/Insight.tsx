import { AlertCircle, CheckCircle, Info, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightType = "success" | "warning" | "info" | "opportunity" | "alert";

interface InsightProps {
  type: InsightType;
  title?: string;
  children: React.ReactNode;
  metric?: {
    value: string;
    trend?: "up" | "down";
  };
}

const insightConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    titleColor: "text-green-900",
    textColor: "text-green-800",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
    textColor: "text-amber-800",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    titleColor: "text-blue-900",
    textColor: "text-blue-800",
  },
  opportunity: {
    icon: TrendingUp,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    titleColor: "text-purple-900",
    textColor: "text-purple-800",
  },
  alert: {
    icon: AlertCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    textColor: "text-red-800",
  },
};

export function Insight({ type, title, children, metric }: InsightProps) {
  const config = insightConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg border-l-4",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex-shrink-0">
        <Icon className={cn("h-5 w-5", config.iconColor)} />
      </div>
      <div className="flex-1 space-y-1">
        {title && (
          <h4 className={cn("font-semibold text-sm", config.titleColor)}>
            {title}
          </h4>
        )}
        <p className={cn("text-sm", config.textColor)}>{children}</p>
        {metric && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-bold">{metric.value}</span>
            {metric.trend && (
              <span className="flex items-center gap-1">
                {metric.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
