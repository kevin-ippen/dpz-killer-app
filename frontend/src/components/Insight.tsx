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
    bgColor: "bg-[#E6F3F9]",
    borderColor: "border-[#0B8CCC]",
    iconColor: "text-[#006491]",
    titleColor: "text-[#006491]",
    textColor: "text-[#004D6F]",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
    textColor: "text-amber-800",
  },
  info: {
    icon: Info,
    bgColor: "bg-[#CCE7F3]",
    borderColor: "border-[#006491]",
    iconColor: "text-[#006491]",
    titleColor: "text-[#004D6F]",
    textColor: "text-[#006491]",
  },
  opportunity: {
    icon: TrendingUp,
    bgColor: "bg-[#E6F3F9]",
    borderColor: "border-[#0B8CCC]",
    iconColor: "text-[#0B8CCC]",
    titleColor: "text-[#006491]",
    textColor: "text-[#004D6F]",
  },
  alert: {
    icon: AlertCircle,
    bgColor: "bg-[#FCE8EB]",
    borderColor: "border-[#E31837]",
    iconColor: "text-[#E31837]",
    titleColor: "text-[#C41230]",
    textColor: "text-[#9E0E26]",
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
