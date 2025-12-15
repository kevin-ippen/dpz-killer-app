# Competitor UI Analysis & Native Databricks Visualization Strategy

## Issue 1: Dashboard Crashing - FIXED ✅

**Root Cause:** Unsafe data access in reduce operations causing crashes when data was undefined/null

**Fixed:**
- Added optional chaining (`?.`) to all array reduce operations
- Added null coalescing (`|| 0`) for all numeric calculations
- Safer percentage calculations with zero-division checks
- Build successful and deployed

---

## Issue 2: Competitor UI Features Analysis

Based on the competitor analytics dashboard (Zenlytic-style interface), here are the key features to implement:

### 1. Natural Language Chat Interface ✅ (Already Have)
- **Current State:** We have chat working with databricks-gpt-oss-120b
- **Enhancement Needed:** Integrate with Genie for more intelligent SQL generation
- **Action:** Replace current chat with Genie Space embedding (Phase 2)

### 2. Dynamic Filter Pills/Tags (Missing - HIGH PRIORITY)
**What Competitor Has:**
```
[Total Gross Revenue] [Number of New Customers: 627] [LTV] [Marketing Channel]
```
- Clickable filter tags showing active filters
- Display current filter values inline
- Easy removal with X button

**What We Need:**
```typescript
// Add FilterPills component
<div className="flex gap-2 flex-wrap">
  {dateRange !== "6" && (
    <FilterPill
      label="Date Range"
      value={`Last ${dateRange} months`}
      onRemove={() => setDateRange("6")}
    />
  )}
  {segment !== "all" && (
    <FilterPill
      label="Segment"
      value={segment}
      onRemove={() => setSegment("all")}
    />
  )}
  {channel !== "all" && (
    <FilterPill
      label="Channel"
      value={channel}
      onRemove={() => setChannel("all")}
    />
  )}
</div>
```

### 3. Comparison Mode (Missing - MEDIUM PRIORITY)
**What Competitor Has:**
- "Now vs Trigger" date comparison
- Shows 04/01/2025 - 06/30/2025
- Allows comparing current period to previous period

**What We Need:**
```typescript
// Add comparison state
const [comparisonMode, setComparisonMode] = useState<'none' | 'previous_period' | 'year_over_year'>('none');

// Fetch comparison data
const { data: comparisonData } = useQuery({
  queryKey: ["comparison", startDate, endDate, comparisonMode],
  queryFn: () => fetchComparisonData(startDate, endDate, comparisonMode),
  enabled: comparisonMode !== 'none'
});

// Display: +12% vs Previous Period
```

### 4. Time Grain Selector (Missing - HIGH PRIORITY)
**What Competitor Has:**
- Radio buttons for: Daily, Weekly, Monthly, Quarterly, Yearly
- Additional options: Month of Year, Week of Year, Day of Year

**What We Need:**
```typescript
const [timeGrain, setTimeGrain] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');

// Update queries to use time grain
const { data: revenueTrend } = useQuery({
  queryKey: ["revenue-trend", dateRange, timeGrain],
  queryFn: () => metricsApi.getRevenueTrend(parseInt(dateRange), timeGrain),
});
```

**Backend Changes Needed:**
```python
# Add time grain parameter to endpoints
@router.get("/gmv-trend")
async def get_gmv_trend(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    time_grain: str = Query("monthly", regex="^(daily|weekly|monthly|quarterly|yearly)$")
):
    # Modify query to use DATE_TRUNC with time_grain
    query = f"""
    SELECT
        DATE_TRUNC('{time_grain.upper()}', month) as period,
        SUM(gmv) as gmv,
        SUM(net_revenue) as net_revenue
    FROM main.dominos_analytics.metric_gmv
    GROUP BY DATE_TRUNC('{time_grain.upper()}', month)
    ORDER BY period ASC
    """
```

### 5. Metric/Dimension Selector Sidebar (Missing - MEDIUM PRIORITY)
**What Competitor Has:**
- Right sidebar with searchable metrics
- "Clear Selected Fields" button
- Nested menus:
  - Marketing Spend Analysis
    - CPC, CAC, PROAS, ROAS
    - Total Marketing Spend
    - Spend (Daily, Weekly)

**What We Need:**
```typescript
// MetricSelector component
<div className="w-64 border-l bg-gray-50 p-4">
  <input
    type="text"
    placeholder="Search Metrics and Dimensions"
    className="w-full mb-4"
  />

  <Accordion>
    <AccordionItem value="marketing">
      <AccordionTrigger>Marketing Metrics</AccordionTrigger>
      <AccordionContent>
        <Checkbox label="CAC" checked={selectedMetrics.includes('cac')} />
        <Checkbox label="ROAS" checked={selectedMetrics.includes('roas')} />
        <Checkbox label="LTV" checked={selectedMetrics.includes('ltv')} />
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="revenue">
      <AccordionTrigger>Revenue Metrics</AccordionTrigger>
      <AccordionContent>
        <Checkbox label="GMV" checked={selectedMetrics.includes('gmv')} />
        <Checkbox label="Net Revenue" checked={selectedMetrics.includes('net_revenue')} />
        <Checkbox label="ARPU" checked={selectedMetrics.includes('arpu')} />
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</div>
```

### 6. Data Table Below Charts (Partially Have)
**What Competitor Has:**
```
Marketing Channel | Total Gross Revenue
TikTok           | $56.5k
Organic          | $274k
Email            | $109k
Facebook         | $492k
Paid Search      | $403k
```

**What We Need:**
- Add sortable tables below each chart
- Export to CSV functionality
- Inline editing for annotations/notes

### 7. Interactive Legends with Filtering
**What Competitor Has:**
- Click legend items to show/hide data series
- Hover for tooltips

**What We Need:**
- Use Recharts/Plotly for interactive charts (current BarChart/LineChart components need enhancement)

---

## Issue 3: Leveraging Native Databricks Visualizations

### YES! This is the BEST approach - Here's why:

#### Option 1: Embed Lakeview Dashboards (RECOMMENDED)
**What:**
- Databricks' native BI tool with rich visualizations
- Built on top of your Unity Catalog data
- Professional, interactive charts

**How to Embed:**
```typescript
// In your React app
<iframe
  src="https://your-workspace.databricks.com/sql/dashboards/abc123?embed=true"
  width="100%"
  height="800px"
  frameBorder="0"
/>
```

**Pros:**
- ✅ Fast - queries run on Databricks compute (not your app)
- ✅ Interactive out of the box (drill-downs, filters, cross-filters)
- ✅ Beautiful visualizations without custom code
- ✅ Direct connection to semantic layer
- ✅ Can share filters between dashboard and app using URL parameters
- ✅ Auto-refresh capabilities

**Setup Steps:**
```sql
-- 1. Create Lakeview Dashboard in Databricks UI
-- 2. Add visualizations using your metric views
SELECT channel, cac, cac_grade
FROM main.dominos_analytics.metric_cac_by_channel
ORDER BY cac ASC;

-- 3. Get embed URL from dashboard settings
-- 4. Pass filter parameters via URL:
https://workspace.databricks.com/sql/dashboards/abc123?embed=true&p_date_start=2024-01-01&p_date_end=2024-12-31
```

**Integration Pattern:**
```typescript
// Dashboard.tsx
const [dashboardUrl, setDashboardUrl] = useState('');

useEffect(() => {
  // Build URL with current filters
  const params = new URLSearchParams({
    embed: 'true',
    p_date_start: startDate,
    p_date_end: endDate,
    p_segment: segment !== 'all' ? segment : '',
    p_channel: channel !== 'all' ? channel : ''
  });

  setDashboardUrl(`${DATABRICKS_HOST}/sql/dashboards/${DASHBOARD_ID}?${params}`);
}, [startDate, endDate, segment, channel]);

return <iframe src={dashboardUrl} />;
```

#### Option 2: Embed Genie Spaces (BEST FOR CHAT + VIZ)
**What:**
- Natural language to SQL/visualization
- Built-in business glossary
- Intelligent query suggestions

**How to Embed:**
```typescript
<iframe
  src="https://your-workspace.databricks.com/genie/spaces/space-id?embed=true"
  width="100%"
  height="600px"
/>
```

**Pros:**
- ✅ Natural language queries ("Show me CAC by channel for Q2")
- ✅ Automatic chart type selection
- ✅ Business glossary integration (understands your metrics)
- ✅ Follow-up questions ("Now show LTV")
- ✅ Can save views and share

**Perfect for:** Replacing your current chat interface

#### Option 3: Use Databricks SQL Query API + Custom Viz
**What:**
- Keep your current approach but enhance visualizations
- Use libraries like Plotly, Recharts, or D3.js

**How:**
```typescript
// Install Plotly
npm install plotly.js-dist-min

// Use in Dashboard
import Plot from 'plotly.js-dist-min';

const PlotlyChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    Plot.newPlot(chartRef.current, [{
      x: data.map(d => d.channel),
      y: data.map(d => d.cac),
      type: 'bar',
      marker: {
        color: data.map(d => d.cac_grade === 'Excellent' ? 'green' : 'orange')
      }
    }], {
      title: 'CAC by Channel',
      xaxis: { title: 'Channel' },
      yaxis: { title: 'CAC ($)' }
    });
  }, [data]);

  return <div ref={chartRef} />;
};
```

**Pros:**
- ✅ Full control over styling
- ✅ Can match your brand exactly
- ✅ Custom interactions

**Cons:**
- ❌ More code to maintain
- ❌ Slower to build
- ❌ Need to handle all edge cases

---

## Recommended Architecture

### Hybrid Approach (BEST OF BOTH WORLDS)

```
+--------------------------------------------------+
|  Your Databricks App (FastAPI + React)           |
|                                                  |
|  +--------------------------------------------+  |
|  |  Custom UI Layer                           |  |
|  |  - Filter controls (date, segment, channel)|  |
|  |  - Navigation tabs                         |  |
|  |  - Custom KPI cards                        |  |
|  +--------------------------------------------+  |
|                     |                            |
|                     v                            |
|  +--------------------------------------------+  |
|  |  Embedded Lakeview Dashboard (iframe)      |  |
|  |  - Rich visualizations                     |  |
|  |  - Interactive charts                      |  |
|  |  - Drill-downs                             |  |
|  |  Filters passed via URL parameters         |  |
|  +--------------------------------------------+  |
|                     |                            |
|                     v                            |
|  +--------------------------------------------+  |
|  |  Embedded Genie Space (iframe)             |  |
|  |  - Natural language chat                   |  |
|  |  - Ad-hoc analysis                         |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
                     |
                     v
         +----------------------+
         |  Unity Catalog       |
         |  - Semantic Layer    |
         |  - Metric Views      |
         +----------------------+
```

### Implementation Plan

**Phase 1: Quick Wins (This Week)**
1. ✅ Fix dashboard crashes (DONE)
2. Create Lakeview dashboard with key visualizations
3. Embed Lakeview dashboard in "Overview" tab
4. Add filter pill UI
5. Pass filter parameters to embedded dashboard

**Phase 2: Enhanced Interactions (Next 2 Weeks)**
1. Add time grain selector
2. Implement comparison mode
3. Create separate Lakeview dashboards for each tab:
   - Marketing Dashboard (CAC, ROAS, attach rates)
   - Customer Dashboard (ARPU, cohort retention, LTV)
   - Operations Dashboard (store performance, delivery times)
4. Embed Genie Space for chat tab

**Phase 3: Custom Enhancements (Weeks 3-4)**
1. Add metric selector sidebar
2. Build custom KPI cards that combine data from multiple sources
3. Add export functionality
4. Implement saved views/bookmarks

### Code Example: Hybrid Dashboard

```typescript
// Dashboard.tsx
export function Dashboard() {
  const [dateRange, setDateRange] = useState("6");
  const [segment, setSegment] = useState("all");
  const [channel, setChannel] = useState("all");

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch summary metrics for KPI cards (custom)
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics", startDate, endDate],
    queryFn: () => metricsApi.getSummary(startDate, endDate),
  });

  // Build Lakeview dashboard URL with filters
  const lakeviewUrl = useMemo(() => {
    const params = new URLSearchParams({
      embed: 'true',
      p_date_start: startDate,
      p_date_end: endDate,
    });
    if (segment !== 'all') params.append('p_segment', segment);
    if (channel !== 'all') params.append('p_channel', channel);

    return `${DATABRICKS_HOST}/sql/dashboards/${LAKEVIEW_DASHBOARD_ID}?${params}`;
  }, [startDate, endDate, segment, channel]);

  return (
    <div className="space-y-6">
      {/* Custom header with filters */}
      <DashboardHeader
        dateRange={dateRange}
        setDateRange={setDateRange}
        segment={segment}
        setSegment={setSegment}
        channel={channel}
        setChannel={setChannel}
      />

      {/* Custom KPI cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard label="Total Revenue" value={metrics?.total_revenue} />
        <MetricCard label="Total Orders" value={metrics?.total_orders} />
        <MetricCard label="Avg Order Value" value={metrics?.avg_order_value} />
        <MetricCard label="Customer Satisfaction" value={metrics?.customer_satisfaction} />
      </div>

      {/* Embedded Lakeview Dashboard with native Databricks visualizations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <iframe
            src={lakeviewUrl}
            width="100%"
            height="800px"
            frameBorder="0"
            style={{ border: 'none' }}
          />
        </CardContent>
      </Card>

      {/* Embedded Genie for ad-hoc analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Ask Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <iframe
            src={`${DATABRICKS_HOST}/genie/spaces/${GENIE_SPACE_ID}?embed=true`}
            width="100%"
            height="600px"
            frameBorder="0"
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Action Items

1. **Immediate (Deploy crash fixes):**
   ```bash
   cd /Users/kevin.ippen/projects/dpz-killer-app
   git add -A
   git commit -m "fix: add safe data access to prevent dashboard crashes"
   git push origin main
   # Deploy to Databricks Apps
   ```

2. **Next Steps:**
   - Create Lakeview dashboard in Databricks UI with your metric views
   - Get embed URL
   - Replace custom charts with embedded dashboard
   - Add filter pills UI
   - Connect filter state to Lakeview URL parameters

3. **Week 2:**
   - Set up Genie Space with your business glossary
   - Embed Genie for chat
   - Add time grain selector
   - Implement comparison mode

This approach gives you:
- ✅ Professional visualizations without building from scratch
- ✅ Native Databricks performance (queries run on cluster, not app server)
- ✅ Interactive drill-downs and filters out of the box
- ✅ Easier to maintain (Databricks handles viz updates)
- ✅ Better user experience (smooth, fast, interactive)
