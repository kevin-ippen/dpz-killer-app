import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface BarChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  format?: "currency" | "number";
  stacked?: boolean;
}

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function BarChart({
  title,
  data,
  xKey,
  yKeys,
  colors = defaultColors,
  format = "number",
  stacked = false,
}: BarChartProps) {
  const formatValue = (value: number) => {
    if (format === "currency") {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={{ stroke: "#e5e7eb" }}
              tickFormatter={formatValue}
            />
            <Tooltip
              formatter={(value: any) => formatValue(value)}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
