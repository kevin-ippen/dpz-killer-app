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
    bgColor: "bg-[rgba(47,127,217,0.1)]",
    borderColor: "border-[#2F7FD9]",
    iconColor: "text-[#3b82f6]",
    titleColor: "text-[var(--color-text-primary)]",
    textColor: "text-[var(--color-text-secondary)]",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-[rgba(245,158,11,0.1)]",
    borderColor: "border-[#f59e0b]",
    iconColor: "text-[#f59e0b]",
    titleColor: "text-[var(--color-text-primary)]",
    textColor: "text-[var(--color-text-secondary)]",
  },
  info: {
    icon: Info,
    bgColor: "bg-[rgba(59,130,246,0.1)]",
    borderColor: "border-[#3b82f6]",
    iconColor: "text-[#3b82f6]",
    titleColor: "text-[var(--color-text-primary)]",
    textColor: "text-[var(--color-text-secondary)]",
  },
  opportunity: {
    icon: TrendingUp,
    bgColor: "bg-[rgba(16,185,129,0.1)]",
    borderColor: "border-[#10b981]",
    iconColor: "text-[#10b981]",
    titleColor: "text-[var(--color-text-primary)]",
    textColor: "text-[var(--color-text-secondary)]",
  },
  alert: {
    icon: AlertCircle,
    bgColor: "bg-[rgba(239,68,68,0.1)]",
    borderColor: "border-[#ef4444]",
    iconColor: "text-[#ef4444]",
    titleColor: "text-[var(--color-text-primary)]",
    textColor: "text-[var(--color-text-secondary)]",
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
