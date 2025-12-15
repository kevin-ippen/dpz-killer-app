import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/charts/MetricCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { metricsApi } from "@/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

export function Dashboard() {
  // State for filters
  const [dateRange, setDateRange] = useState<string>("6");
  const [channel, setChannel] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: metricsApi.getSummary,
  });

  // Fetch revenue trend with date range filter
  const { data: revenueTrend, isLoading: trendLoading } = useQuery({
    queryKey: ["revenue-trend", dateRange],
    queryFn: () => metricsApi.getRevenueTrend(parseInt(dateRange)),
  });

  // Fetch channel breakdown
  const { data: channelBreakdown, isLoading: channelLoading } = useQuery({
    queryKey: ["channel-breakdown"],
    queryFn: metricsApi.getChannelBreakdown,
  });

  // Filter channel data based on selection
  const filteredChannelData = channel === "all"
    ? channelBreakdown
    : channelBreakdown?.filter((item) => item.channel === channel);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Overview of your Domino's performance metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 30 days</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel Filter */}
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="Mobile App">Mobile App</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Phone">Phone</SelectItem>
              <SelectItem value="Walk-in">Walk-in</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Revenue"
              value={metrics?.total_revenue || 0}
              format="currency"
              delta={{ value: 12.5, isPositive: true }}
              sparkline={revenueTrend?.slice(-6).map((d) => d.revenue) || []}
              loading={metricsLoading}
            />
            <MetricCard
              label="Total Orders"
              value={metrics?.total_orders || 0}
              format="number"
              delta={{ value: 8.3, isPositive: true }}
              sparkline={revenueTrend?.slice(-6).map((d) => d.orders) || []}
              loading={metricsLoading}
            />
            <MetricCard
              label="Avg Order Value"
              value={metrics?.avg_order_value || 0}
              format="currency"
              delta={{ value: 3.2, isPositive: true }}
              loading={metricsLoading}
            />
            <MetricCard
              label="Customer Satisfaction"
              value={metrics?.customer_satisfaction || 0}
              format="number"
              delta={{ value: -1.5, isPositive: false }}
              loading={metricsLoading}
            />
          </div>

          {/* Trend Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <LineChart
              title="Revenue Trend"
              data={revenueTrend || []}
              xKey="month"
              yKeys={["revenue"]}
              colors={["#3b82f6"]}
              format="currency"
              isLoading={trendLoading}
            />
            <LineChart
              title="Orders Trend"
              data={revenueTrend || []}
              xKey="month"
              yKeys={["orders"]}
              colors={["#10b981"]}
              format="number"
              isLoading={trendLoading}
            />
          </div>

          {/* Channel Breakdown */}
          <div className="grid gap-6">
            <BarChart
              title="Revenue by Channel"
              data={filteredChannelData || []}
              xKey="channel"
              yKeys={["revenue"]}
              colors={["#3b82f6"]}
              format="currency"
              isLoading={channelLoading}
            />
          </div>
        </TabsContent>

        {/* Sales Analysis Tab */}
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <LineChart
                  title="Revenue vs Orders"
                  data={revenueTrend || []}
                  xKey="month"
                  yKeys={["revenue", "orders"]}
                  colors={["#3b82f6", "#10b981"]}
                  format="currency"
                  isLoading={trendLoading}
                />
                <BarChart
                  title="Monthly Comparison"
                  data={revenueTrend?.slice(-12) || []}
                  xKey="month"
                  yKeys={["revenue"]}
                  colors={["#8b5cf6"]}
                  format="currency"
                  isLoading={trendLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional metrics */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6-8 PM</div>
                <p className="text-xs text-gray-500">35% of daily orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Pepperoni</div>
                <p className="text-xs text-gray-500">32% of revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28 min</div>
                <p className="text-xs text-gray-500">-2 min vs last month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <BarChart
                  title="Revenue by Channel (Last 30 Days)"
                  data={channelBreakdown || []}
                  xKey="channel"
                  yKeys={["revenue"]}
                  colors={["#3b82f6"]}
                  format="currency"
                  isLoading={channelLoading}
                />

                {/* Channel metrics grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {channelBreakdown?.map((ch) => (
                    <Card key={ch.channel}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {ch.channel}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${(ch.revenue / 1000).toFixed(0)}K
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {((ch.revenue / (channelBreakdown.reduce((sum, item) => sum + item.revenue, 0))) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Customer Segments</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New Customers</span>
                      <span className="text-sm font-semibold">24%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Returning Customers</span>
                      <span className="text-sm font-semibold">58%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">VIP Customers</span>
                      <span className="text-sm font-semibold">18%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Retention Rate</p>
                      <p className="text-2xl font-bold">68%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Lifetime Value</p>
                      <p className="text-2xl font-bold">$847</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Churn Rate</p>
                      <p className="text-2xl font-bold">4.2%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
