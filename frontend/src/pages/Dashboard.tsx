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
  const [segment, setSegment] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Calculate date range for API calls
  const getDateRange = (months: string) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch dashboard metrics (with date filter so it updates)
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics", startDate, endDate, segment, channel],
    queryFn: metricsApi.getSummary,
  });

  // Fetch revenue trend with date range filter
  const { data: revenueTrend, isLoading: trendLoading } = useQuery({
    queryKey: ["revenue-trend", dateRange, startDate, endDate, segment, channel],
    queryFn: () => metricsApi.getRevenueTrend(parseInt(dateRange)),
  });

  // Fetch GMV trend (uses date range and all filters)
  const { data: gmvTrend, isLoading: gmvLoading } = useQuery({
    queryKey: ["gmv-trend", startDate, endDate, segment, channel],
    queryFn: () => metricsApi.getGmvTrend(startDate, endDate),
  });

  // Fetch channel mix (uses date range and channel filter) - TODO: Use in visualizations
  // const { data: channelMix } = useQuery({
  //   queryKey: ["channel-mix", startDate, endDate, channel, segment],
  //   queryFn: () => metricsApi.getChannelMix(startDate, endDate),
  // });

  // Fetch CAC by channel (with ALL filters so it updates)
  const { data: cacByChannel, isLoading: cacLoading } = useQuery({
    queryKey: ["cac-by-channel", startDate, endDate, segment, channel],
    queryFn: metricsApi.getCacByChannel,
  });

  // Fetch ARPU by segment (with ALL filters so it updates)
  const { data: arpuBySegment, isLoading: arpuLoading } = useQuery({
    queryKey: ["arpu-by-segment", startDate, endDate, segment, channel],
    queryFn: () => metricsApi.getArpuBySegment(),
  });

  // Fetch attach rate (uses date range and segment)
  const { data: attachRate, isLoading: attachLoading } = useQuery({
    queryKey: ["attach-rate", segment, startDate, endDate, channel],
    queryFn: () => metricsApi.getAttachRate(
      segment !== "all" ? segment : undefined,
      startDate,
      endDate
    ),
  });

  // Fetch channel breakdown (with ALL filters so it updates)
  const { data: channelBreakdown, isLoading: channelLoading } = useQuery({
    queryKey: ["channel-breakdown", startDate, endDate, segment, channel],
    queryFn: metricsApi.getChannelBreakdown,
  });

  // Filter channel data based on selection (client-side for now)
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

        {/* Filters */}
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

          {/* Customer Segment Filter */}
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All segments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="Family">Family</SelectItem>
              <SelectItem value="Young Professional">Young Professional</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Single">Single</SelectItem>
            </SelectContent>
          </Select>

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
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
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

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Acquisition Cost (CAC)</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                title="CAC by Marketing Channel"
                data={cacByChannel || []}
                xKey="channel"
                yKeys={["cac"]}
                colors={["#f59e0b"]}
                format="currency"
                isLoading={cacLoading}
              />

              {/* CAC metrics grid */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mt-6">
                {cacByChannel?.map((item) => (
                  <Card key={item.channel}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium">
                        {item.channel}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        ${Number(item?.cac || 0).toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.cac_grade}
                      </p>
                      <p className="text-xs text-gray-400">
                        {Number(item?.new_customers || 0).toLocaleString()} customers
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attach Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Upsell Attach Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attachRate && attachRate.length > 0 && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Sides Attach Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {Number(attachRate[0]?.sides_attach_rate_pct || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Beverage Attach Rate</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Number(attachRate[0]?.beverage_attach_rate_pct || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Dessert Attach Rate</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Number(attachRate[0]?.dessert_attach_rate_pct || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Based on {Number(attachRate[0]?.total_orders || 0).toLocaleString()} orders
                      {segment !== "all" && ` for ${segment} segment`}
                    </p>
                  </>
                )}
                {(!attachRate || attachRate.length === 0) && !attachLoading && (
                  <p className="text-gray-500">No attach rate data available for selected filters</p>
                )}
              </div>
            </CardContent>
          </Card>
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
                  {channelBreakdown?.map((ch) => {
                    const totalRevenue = channelBreakdown.reduce((sum, item) => sum + Number(item?.revenue || 0), 0);
                    const chRevenue = Number(ch?.revenue || 0);
                    const percentage = totalRevenue > 0 ? ((chRevenue / totalRevenue) * 100).toFixed(1) : '0.0';

                    return (
                      <Card key={ch.channel}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            {ch.channel}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${(chRevenue / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {percentage}% of total
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Average Revenue Per User (ARPU) by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                title="ARPU by Customer Segment"
                data={arpuBySegment || []}
                xKey="customer_segment"
                yKeys={["arpu"]}
                colors={["#10b981"]}
                format="currency"
                isLoading={arpuLoading}
              />

              {/* ARPU metrics grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                {arpuBySegment?.slice(0, 4).map((item) => (
                  <Card key={item.customer_segment}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {item.customer_segment}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${(item?.arpu || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Number(item?.customer_count || 0).toLocaleString()} customers
                      </p>
                      <p className="text-xs text-gray-400">
                        {Number(item?.avg_orders_per_customer || 0).toFixed(1)} orders/year
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* GMV Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Gross Merchandise Value (GMV) Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                title="GMV vs Net Revenue"
                data={gmvTrend || []}
                xKey="month"
                yKeys={["gmv", "net_revenue"]}
                colors={["#3b82f6", "#10b981"]}
                format="currency"
                isLoading={gmvLoading}
              />

              {/* GMV Summary */}
              {gmvTrend && gmvTrend.length > 0 && (() => {
                const totalGmv = gmvTrend.reduce((sum, item) => sum + Number(item?.gmv || 0), 0);
                const totalRevenue = gmvTrend.reduce((sum, item) => sum + Number(item?.net_revenue || 0), 0);
                const totalDiscount = gmvTrend.reduce((sum, item) => sum + Number(item?.discount_rate_pct || 0), 0);
                const totalOrders = gmvTrend.reduce((sum, item) => sum + Number(item?.order_count || 0), 0);

                const avgGmv = gmvTrend.length > 0 ? totalGmv / gmvTrend.length / 1000000 : 0;
                const avgRevenue = gmvTrend.length > 0 ? totalRevenue / gmvTrend.length / 1000000 : 0;
                const avgDiscount = gmvTrend.length > 0 ? totalDiscount / gmvTrend.length : 0;
                const ordersInMillions = totalOrders / 1000000;

                return (
                  <div className="grid gap-4 md:grid-cols-4 mt-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Avg GMV</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${!isNaN(avgGmv) && isFinite(avgGmv) ? avgGmv.toFixed(1) : '0.0'}M
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Avg Net Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${!isNaN(avgRevenue) && isFinite(avgRevenue) ? avgRevenue.toFixed(1) : '0.0'}M
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">Avg Discount Rate</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {!isNaN(avgDiscount) && isFinite(avgDiscount) ? avgDiscount.toFixed(1) : '0.0'}%
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {!isNaN(ordersInMillions) && isFinite(ordersInMillions) ? ordersInMillions.toFixed(1) : '0.0'}M
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
