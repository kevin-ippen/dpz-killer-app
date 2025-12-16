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
    bgColor: "bg-[#EBF4FD]",
    borderColor: "border-[#2F7FD9]",
    iconColor: "text-[#2F7FD9]",
    titleColor: "text-[#1D4D83]",
    textColor: "text-[#2666B1]",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-[#FBF7F0]",
    borderColor: "border-[#B59D81]",
    iconColor: "text-[#967E65]",
    titleColor: "text-[#523416]",
    textColor: "text-[#6B4A2C]",
  },
  info: {
    icon: Info,
    bgColor: "bg-[#D7E9FB]",
    borderColor: "border-[#2666B1]",
    iconColor: "text-[#2F7FD9]",
    titleColor: "text-[#1D4D83]",
    textColor: "text-[#2666B1]",
  },
  opportunity: {
    icon: TrendingUp,
    bgColor: "bg-[#EBF4FD]",
    borderColor: "border-[#2F7FD9]",
    iconColor: "text-[#2F7FD9]",
    titleColor: "text-[#2666B1]",
    textColor: "text-[#1D4D83]",
  },
  alert: {
    icon: AlertCircle,
    bgColor: "bg-[#FEF0EE]",
    borderColor: "border-[#EC3115]",
    iconColor: "text-[#EC3115]",
    titleColor: "text-[#D42C13]",
    textColor: "text-[#7B1A0B]",
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
