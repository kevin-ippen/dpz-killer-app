import { MetricCard } from "@/components/charts/MetricCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";

// Demo data - will be replaced with API calls
const demoRevenueData = [
  { month: "Jan", revenue: 850000, orders: 12500 },
  { month: "Feb", revenue: 920000, orders: 13200 },
  { month: "Mar", revenue: 1050000, orders: 14800 },
  { month: "Apr", revenue: 980000, orders: 13900 },
  { month: "May", revenue: 1120000, orders: 15600 },
  { month: "Jun", revenue: 1200000, orders: 16800 },
];

const demoChannelData = [
  { channel: "Mobile App", revenue: 450000 },
  { channel: "Online", revenue: 380000 },
  { channel: "Phone", revenue: 220000 },
  { channel: "Walk-in", revenue: 150000 },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your Domino's performance metrics
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={6120000}
          format="currency"
          delta={{ value: 12.5, isPositive: true }}
          sparkline={[100, 120, 115, 140, 135, 150]}
        />
        <MetricCard
          label="Total Orders"
          value={86800}
          format="number"
          delta={{ value: 8.3, isPositive: true }}
          sparkline={[100, 105, 110, 108, 115, 120]}
        />
        <MetricCard
          label="Avg Order Value"
          value={27.45}
          format="currency"
          delta={{ value: 3.2, isPositive: true }}
        />
        <MetricCard
          label="Customer Satisfaction"
          value={4.6}
          format="number"
          delta={{ value: -1.5, isPositive: false }}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart
          title="Revenue Trend"
          data={demoRevenueData}
          xKey="month"
          yKeys={["revenue"]}
          colors={["#3b82f6"]}
          format="currency"
        />
        <LineChart
          title="Orders Trend"
          data={demoRevenueData}
          xKey="month"
          yKeys={["orders"]}
          colors={["#10b981"]}
          format="number"
        />
      </div>

      <div className="grid gap-6">
        <BarChart
          title="Revenue by Channel"
          data={demoChannelData}
          xKey="channel"
          yKeys={["revenue"]}
          colors={["#3b82f6"]}
          format="currency"
        />
      </div>
    </div>
  );
}
