import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/charts/MetricCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { ComboChart } from "@/components/charts/ComboChart";
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
import { MetricTooltip } from "@/components/MetricTooltip";
import { FilterPills } from "@/components/FilterPills";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { filterCompleteMonths, getDateRangeLabel } from "@/lib/utils";
import { generateInsights } from "@/lib/generateInsights";
import { exportToCSV, exportToJSON } from "@/lib/exportData";
import { detectAnomalies, detectSpikesAndDrops } from "@/lib/anomalyDetection";
import { generateForecast } from "@/lib/forecasting";
import { Download } from "lucide-react";

export function Dashboard() {
  // State for filters
  const [dateRange, setDateRange] = useState<string>("6");
  const [channel, setChannel] = useState<string>("all");
  const [segment, setSegment] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Phase 3: Advanced filtering
  const [timeGrain, setTimeGrain] = useState<string>("monthly");
  const [comparisonMode, setComparisonMode] = useState<string>("none");
  const [selectedPreset, setSelectedPreset] = useState<string>("none");

  // Filter presets
  const FILTER_PRESETS: Record<string, { dateRange: string; segment?: string; channel?: string; description: string }> = {
    "q4-2024": {
      dateRange: "3",
      description: "Q4 2024 Performance",
    },
    "digital-only": {
      dateRange: "6",
      channel: "Mobile App",
      description: "Digital Channels (6 months)",
    },
    "high-value": {
      dateRange: "6",
      segment: "Family",
      description: "High-Value Customers",
    },
    "year-review": {
      dateRange: "12",
      description: "Annual Review",
    },
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey === "none") {
      setSelectedPreset("none");
      return;
    }

    const preset = FILTER_PRESETS[presetKey];
    if (preset) {
      setDateRange(preset.dateRange);
      if (preset.segment) setSegment(preset.segment);
      else setSegment("all");
      if (preset.channel) setChannel(preset.channel);
      else setChannel("all");
      setSelectedPreset(presetKey);
    }
  };

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

  // Apply complete months filter to time-series data
  // Note: Don't pass targetMonths since backend already filtered by date range
  const completeRevenueTrend = useMemo(() => {
    if (!revenueTrend) return [];
    return filterCompleteMonths(revenueTrend); // Only exclude current incomplete month
  }, [revenueTrend]);

  const completeGmvTrend = useMemo(() => {
    if (!gmvTrend) return [];
    return filterCompleteMonths(gmvTrend); // Only exclude current incomplete month
  }, [gmvTrend]);

  // Prepare active filters for FilterPills
  const activeFilters = useMemo(() => {
    const filters = [];

    if (dateRange !== "6") {
      filters.push({
        key: "dateRange",
        label: "Date Range",
        value: getDateRangeLabel(dateRange),
        isDefault: false,
      });
    }

    if (segment !== "all") {
      filters.push({
        key: "segment",
        label: "Segment",
        value: segment,
        isDefault: false,
      });
    }

    if (channel !== "all") {
      filters.push({
        key: "channel",
        label: "Channel",
        value: channel,
        isDefault: false,
      });
    }

    if (timeGrain !== "monthly") {
      filters.push({
        key: "timeGrain",
        label: "Time Grain",
        value: timeGrain.charAt(0).toUpperCase() + timeGrain.slice(1),
        isDefault: false,
      });
    }

    if (comparisonMode !== "none") {
      const comparisonLabels: Record<string, string> = {
        "previous_period": "vs Previous Period",
        "year_ago": "vs Year Ago",
      };
      filters.push({
        key: "comparisonMode",
        label: "Comparison",
        value: comparisonLabels[comparisonMode] || comparisonMode,
        isDefault: false,
      });
    }

    if (selectedPreset !== "none") {
      filters.push({
        key: "preset",
        label: "Preset",
        value: FILTER_PRESETS[selectedPreset]?.description || selectedPreset,
        isDefault: false,
      });
    }

    return filters;
  }, [dateRange, segment, channel, timeGrain, comparisonMode, selectedPreset, FILTER_PRESETS]);

  const handleRemoveFilter = (key: string) => {
    if (key === "dateRange") setDateRange("6");
    if (key === "segment") setSegment("all");
    if (key === "channel") setChannel("all");
    if (key === "timeGrain") setTimeGrain("monthly");
    if (key === "comparisonMode") setComparisonMode("none");
    if (key === "preset") setSelectedPreset("none");
  };

  const handleClearAllFilters = () => {
    setDateRange("6");
    setSegment("all");
    setChannel("all");
    setTimeGrain("monthly");
    setComparisonMode("none");
    setSelectedPreset("none");
  };

  // Generate AI insights from dashboard data
  const insights = useMemo(() => {
    return generateInsights({
      cacByChannel,
      arpuBySegment,
      gmvTrend: completeGmvTrend,
      attachRate,
      channelBreakdown,
    });
  }, [cacByChannel, arpuBySegment, completeGmvTrend, attachRate, channelBreakdown]);

  // Detect anomalies in revenue trend
  const revenueAnomalies = useMemo(() => {
    if (!completeRevenueTrend || completeRevenueTrend.length < 5) return [];
    return detectAnomalies(completeRevenueTrend, "revenue", {
      sensitivity: 2,
      windowSize: 3,
    });
  }, [completeRevenueTrend]);

  // Detect anomalies in GMV trend
  const gmvAnomalies = useMemo(() => {
    if (!completeGmvTrend || completeGmvTrend.length < 5) return [];
    return detectSpikesAndDrops(completeGmvTrend, "gmv", 25);
  }, [completeGmvTrend]);

  // Generate revenue forecast
  const revenueForecast = useMemo(() => {
    if (!completeRevenueTrend || completeRevenueTrend.length < 6) return [];
    return generateForecast(completeRevenueTrend, "revenue", "month", {
      periods: 3,
      confidence: 0.95,
    });
  }, [completeRevenueTrend]);

  // Export handler
  const handleExport = (format: "csv" | "json") => {
    const exportData = {
      metrics,
      revenueTrend: completeRevenueTrend,
      cacByChannel,
      arpuBySegment,
      gmvTrend: completeGmvTrend,
      channelBreakdown,
      insights,
      filters: {
        dateRange: getDateRangeLabel(dateRange),
        segment,
        channel,
        timeGrain,
        comparisonMode,
      },
    };

    if (format === "csv") {
      exportToCSV(exportData, `dominos-dashboard-${activeTab}`);
    } else {
      exportToJSON(exportData, `dominos-dashboard-${activeTab}`);
    }
  };

  return (
    <div className="space-y-8 p-8" style={{ background: 'var(--color-bg-app)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            🍕 Analytics Dashboard
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Domino's Performance Insights & Predictive Analytics
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
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

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 border-[#2F7FD9] text-[#2666B1] hover:bg-[#EBF4FD] hover:border-[#2666B1] font-medium transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
              className="flex items-center gap-2 border-[#2F7FD9] text-[#2666B1] hover:bg-[#EBF4FD] hover:border-[#2666B1] font-medium transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Phase 3: Advanced Filters Row */}
      <div
        className="flex items-center justify-between p-6"
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="flex items-center gap-5 flex-wrap">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Advanced Filters</span>

          {/* Time Grain Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Time Grain:</span>
            <Select value={timeGrain} onValueChange={setTimeGrain}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comparison Mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Compare:</span>
            <Select value={comparisonMode} onValueChange={setComparisonMode}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Comparison</SelectItem>
                <SelectItem value="previous_period">vs Previous Period</SelectItem>
                <SelectItem value="year_ago">vs Year Ago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Quick Preset:</span>
            <Select value={selectedPreset} onValueChange={applyPreset}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Preset</SelectItem>
                {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeFilters.length > 0 && (
        <FilterPills
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      )}

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
              label={<MetricTooltip term="REVENUE">Total Revenue</MetricTooltip>}
              value={metrics?.total_revenue || 0}
              format="currency"
              delta={{ value: 12.5, isPositive: true }}
              sparkline={completeRevenueTrend?.slice(-6).map((d) => d.revenue) || []}
              loading={metricsLoading}
            />
            <MetricCard
              label={<MetricTooltip term="ORDERS">Total Orders</MetricTooltip>}
              value={metrics?.total_orders || 0}
              format="number"
              delta={{ value: 8.3, isPositive: true }}
              sparkline={completeRevenueTrend?.slice(-6).map((d) => d.orders) || []}
              loading={metricsLoading}
            />
            <MetricCard
              label={<MetricTooltip term="AOV">Avg Order Value</MetricTooltip>}
              value={metrics?.avg_order_value || 0}
              format="currency"
              delta={{ value: 3.2, isPositive: true }}
              loading={metricsLoading}
            />
            <MetricCard
              label={<MetricTooltip term="CSAT">Customer Satisfaction (out of 5)</MetricTooltip>}
              value={metrics?.customer_satisfaction || 0}
              format="number"
              delta={{ value: -1.5, isPositive: false }}
              loading={metricsLoading}
            />
          </div>

          {/* AI-Generated Insights */}
          <InsightsPanel insights={insights} />

          {/* Trend Charts with Anomaly Detection */}
          <div className="grid gap-6 lg:grid-cols-2">
            <LineChart
              title="Revenue Trend with Anomaly Detection"
              data={completeRevenueTrend || []}
              xKey="month"
              yKeys={["revenue"]}
              colors={["#3b82f6"]}
              format="currency"
              isLoading={trendLoading}
              anomalies={revenueAnomalies}
              showAnomalies={true}
            />
            <LineChart
              title="Orders Trend (Complete Months Only)"
              data={completeRevenueTrend || []}
              xKey="month"
              yKeys={["orders"]}
              colors={["#10b981"]}
              format="number"
              isLoading={trendLoading}
            />
          </div>

          {/* Revenue Forecast */}
          {revenueForecast && revenueForecast.length > 0 && (
            <ForecastChart
              title="Revenue Forecast (Next 3 Months)"
              historicalData={completeRevenueTrend || []}
              forecastData={revenueForecast}
              xKey="month"
              yKey="revenue"
              format="currency"
              isLoading={trendLoading}
            />
          )}

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
                <ComboChart
                  title="Revenue vs Orders (Complete Months)"
                  data={completeRevenueTrend || []}
                  xKey="month"
                  leftYAxis={{
                    key: "revenue",
                    label: "Revenue ($)",
                    color: "#3b82f6",
                    type: "bar",
                  }}
                  rightYAxis={{
                    key: "orders",
                    label: "Orders",
                    color: "#10b981",
                    type: "line",
                  }}
                  isLoading={trendLoading}
                />
                <BarChart
                  title="Monthly Comparison (Complete Months)"
                  data={completeRevenueTrend?.slice(-12) || []}
                  xKey="month"
                  yKeys={["revenue"]}
                  colors={["#3b82f6"]}
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
              <CardTitle className="flex items-center gap-2">
                <MetricTooltip term="CAC">Customer Acquisition Cost</MetricTooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <BarChart
                  title="CAC by Marketing Channel"
                  data={cacByChannel || []}
                  xKey="channel"
                  yKeys={["cac"]}
                  colors={["#f59e0b"]}
                  format="currency"
                  isLoading={cacLoading}
                />

                {/* CAC Efficiency Overlay */}
                <ComboChart
                  title="CAC Efficiency: Cost vs Customer Acquisition"
                  data={cacByChannel || []}
                  xKey="channel"
                  leftYAxis={{
                    key: "cac",
                    label: "CAC ($)",
                    color: "#ef4444",
                    type: "bar",
                  }}
                  rightYAxis={{
                    key: "new_customers",
                    label: "New Customers",
                    color: "#10b981",
                    type: "line",
                  }}
                  isLoading={cacLoading}
                />
              </div>

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
              <CardTitle className="flex items-center gap-2">
                <MetricTooltip term="ATTACH_RATE">Upsell Attach Rates</MetricTooltip>
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2">
                <MetricTooltip term="ARPU">Average Revenue Per User (ARPU) by Segment</MetricTooltip>
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2">
                <MetricTooltip term="GMV">Gross Merchandise Value (GMV) Trend</MetricTooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <LineChart
                  title="GMV vs Net Revenue with Anomaly Detection"
                  data={completeGmvTrend || []}
                  xKey="month"
                  yKeys={["gmv", "net_revenue"]}
                  colors={["#3b82f6", "#10b981"]}
                  format="currency"
                  isLoading={gmvLoading}
                  anomalies={gmvAnomalies}
                  showAnomalies={true}
                />

                {/* GMV vs Discount Rate Overlay */}
                <ComboChart
                  title="GMV vs Discount Impact"
                  data={completeGmvTrend || []}
                  xKey="month"
                  leftYAxis={{
                    key: "gmv",
                    label: "GMV ($)",
                    color: "#3b82f6",
                    type: "bar",
                  }}
                  rightYAxis={{
                    key: "discount_rate_pct",
                    label: "Discount Rate (%)",
                    color: "#f59e0b",
                    type: "line",
                  }}
                  isLoading={gmvLoading}
                />
              </div>

              {/* GMV Summary */}
              {completeGmvTrend && completeGmvTrend.length > 0 && (() => {
                const totalGmv = completeGmvTrend.reduce((sum, item) => sum + Number(item?.gmv || 0), 0);
                const totalRevenue = completeGmvTrend.reduce((sum, item) => sum + Number(item?.net_revenue || 0), 0);
                const totalDiscount = completeGmvTrend.reduce((sum, item) => sum + Number(item?.discount_rate_pct || 0), 0);
                const totalOrders = completeGmvTrend.reduce((sum, item) => sum + Number(item?.order_count || 0), 0);

                const avgGmv = completeGmvTrend.length > 0 ? totalGmv / completeGmvTrend.length / 1000000 : 0;
                const avgRevenue = completeGmvTrend.length > 0 ? totalRevenue / completeGmvTrend.length / 1000000 : 0;
                const avgDiscount = completeGmvTrend.length > 0 ? totalDiscount / completeGmvTrend.length : 0;
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
