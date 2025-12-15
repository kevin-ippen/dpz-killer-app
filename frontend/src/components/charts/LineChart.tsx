import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface LineChartProps {
  title: string;
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  format?: "currency" | "number";
}

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function LineChart({
  title,
  data,
  xKey,
  yKeys,
  colors = defaultColors,
  format = "number",
}: LineChartProps) {
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
          <RechartsLineChart data={data}>
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
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
