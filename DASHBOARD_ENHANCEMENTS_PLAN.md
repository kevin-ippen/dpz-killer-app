# Dashboard Enhancement Plan - Epic AI Analytics Tool

## Issues Found & Fixes

### 1. ❌ CRITICAL: Filtering Doesn't Update Visualizations

**Problem:**
```typescript
// CAC query - no date/segment in queryKey, doesn't refetch on filter change
const { data: cacByChannel } = useQuery({
  queryKey: ["cac-by-channel"],  // ❌ Missing filters
  queryFn: metricsApi.getCacByChannel, // ❌ No date params
});

// Channel breakdown - no date filter at all
const { data: channelBreakdown } = useQuery({
  queryKey: ["channel-breakdown"], // ❌ Missing filters
  queryFn: metricsApi.getChannelBreakdown, // ❌ No date params
});
```

**Fix:**
```typescript
// Add filters to queryKey AND pass to backend
const { data: cacByChannel } = useQuery({
  queryKey: ["cac-by-channel", startDate, endDate, segment], // ✅ Refetch on change
  queryFn: () => metricsApi.getCacByChannel(startDate, endDate, segment),
});
```

### 2. ❌ Partial Months Shown

**Problem:** Current month shows incomplete data, skews trends

**Fix:**
```typescript
// Filter to complete months only
const filterCompleteMonths = (data: any[]) => {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "2025-12"

  return data.filter(item => {
    const itemMonth = item.month?.slice(0, 7);
    return itemMonth !== currentMonth;
  });
};
```

### 3. ❌ Missing Business Glossary Integration

**Problem:** Users don't understand metrics like CAC, ARPU, LTV

**Fix:** Add tooltip component with definitions
```typescript
<MetricTooltip term="CAC">
  <span className="text-sm font-medium">CAC</span>
</MetricTooltip>

// On hover: "Customer Acquisition Cost - The average cost to acquire
// a new customer through marketing channels. Lower is better.
// Industry benchmark: $5-25."
```

### 4. ❌ No Overlay Visualizations

**Problem:** Can't compare metrics like CAC vs LTV, GMV vs Net Revenue

**Fix:** Add combo charts
```typescript
// CAC vs LTV by Channel
<ComboChart
  data={marketingData}
  leftYAxis={{ key: "cac", label: "CAC ($)", color: "#ef4444" }}
  rightYAxis={{ key: "ltv", label: "LTV ($)", color: "#10b981" }}
  xKey="channel"
/>
```

### 5. ❌ Limited Filtering Options

**Problem:** Only have date/segment/channel, need more for "epic AI analytics"

**Fix:** Add advanced filters:
- Time grain (Daily/Weekly/Monthly/Quarterly)
- Comparison mode (vs Previous Period, vs Year Ago)
- Order type (Delivery/Carryout)
- Store region filters
- Campaign filters
- Saved filter presets

---

## Implementation Plan

### Phase 1: Fix Critical Filtering Issues (TODAY)

**A. Update All Query Keys with Filters**
```typescript
// Every query needs filters in queryKey for auto-refetch
const queries = [
  { name: "cac-by-channel", filters: [startDate, endDate, segment] },
  { name: "arpu-by-segment", filters: [startDate, endDate, segment] },
  { name: "channel-breakdown", filters: [startDate, endDate, channel] },
  { name: "revenue-trend", filters: [startDate, endDate] },
  { name: "gmv-trend", filters: [startDate, endDate] },
];
```

**B. Update Backend Endpoints to Accept Date Filters**
```python
# Backend: Add date filters to all endpoints
@router.get("/cac-by-channel")
async def get_cac_by_channel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    segment: Optional[str] = None
):
    query = """
    SELECT channel, SUM(total_spend) as total_spend, ...
    FROM main.dominos_analytics.metric_cac_by_channel
    WHERE 1=1
    """

    if start_date and end_date:
        query += f" AND month BETWEEN '{start_date}' AND '{end_date}'"
    if segment:
        query += f" AND customer_segment = '{segment}'"
```

**C. Filter to Complete Months**
```typescript
// Add to all time-series data
const completeData = useMemo(() => {
  if (!rawData) return [];
  return filterCompleteMonths(rawData);
}, [rawData]);
```

### Phase 2: Add Business Glossary Tooltips (TODAY)

**A. Create Glossary Data File**
```typescript
// src/data/businessGlossary.ts
export const BUSINESS_GLOSSARY = {
  CAC: {
    term: "Customer Acquisition Cost",
    definition: "The average cost to acquire a new customer through marketing channels",
    formula: "Total Marketing Spend ÷ New Customers",
    benchmark: "$5-25 for QSR industry",
    icon: "💰"
  },
  ARPU: {
    term: "Average Revenue Per User",
    definition: "The average annual revenue generated per customer",
    formula: "Total Revenue ÷ Total Customers",
    benchmark: "$3,500-4,500 for pizza QSR",
    icon: "📊"
  },
  LTV: {
    term: "Lifetime Value",
    definition: "The total revenue a customer generates over their entire relationship",
    formula: "ARPU × Average Customer Lifespan",
    benchmark: "3-5x CAC for healthy business",
    icon: "💎"
  },
  // ... all 44 terms from dominos_business_info.md
};
```

**B. Create Tooltip Component**
```typescript
// src/components/MetricTooltip.tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function MetricTooltip({ term, children }) {
  const glossary = BUSINESS_GLOSSARY[term];

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="inline-flex items-center gap-1">
          {children}
          <InfoIcon className="h-4 w-4 text-gray-400" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{glossary.icon}</span>
            <h4 className="font-semibold">{glossary.term}</h4>
          </div>
          <p className="text-sm text-gray-600">{glossary.definition}</p>
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-xs font-mono">{glossary.formula}</p>
          </div>
          <p className="text-xs text-gray-500">
            <strong>Benchmark:</strong> {glossary.benchmark}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
```

**C. Add to All Metrics**
```typescript
// In Dashboard
<MetricCard
  label={
    <MetricTooltip term="CAC">
      Customer Acquisition Cost
    </MetricTooltip>
  }
  value={cacData}
/>
```

### Phase 3: Add Overlay Visualizations (TODAY)

**A. Create Combo Chart Component**
```typescript
// src/components/charts/ComboChart.tsx
export function ComboChart({
  title,
  data,
  xKey,
  leftYAxis,  // { key: "cac", label: "CAC ($)", color: "#ef4444" }
  rightYAxis, // { key: "ltv", label: "LTV ($)", color: "#10b981" }
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis yAxisId="left" label={{ value: leftYAxis.label, angle: -90 }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: rightYAxis.label, angle: 90 }} />

        <Bar yAxisId="left" dataKey={leftYAxis.key} fill={leftYAxis.color} />
        <Line yAxisId="right" dataKey={rightYAxis.key} stroke={rightYAxis.color} strokeWidth={3} />

        <Tooltip />
        <Legend />
      </RechartsComposedChart>
    </ResponsiveContainer>
  );
}
```

**B. Add Overlay Charts to Marketing Tab**
```typescript
// Marketing Tab: CAC vs LTV
<ComboChart
  title="CAC vs LTV by Channel (ROI Analysis)"
  data={enrichedData}
  xKey="channel"
  leftYAxis={{ key: "cac", label: "CAC ($)", color: "#ef4444" }}
  rightYAxis={{ key: "ltv", label: "LTV ($)", color: "#10b981" }}
/>

// Show efficiency ratio
{enrichedData.map(item => (
  <Badge color={item.ltv > item.cac * 3 ? "green" : "red"}>
    LTV:CAC = {(item.ltv / item.cac).toFixed(1)}x
  </Badge>
))}
```

**C. Add to Customers Tab**
```typescript
// GMV vs Net Revenue (shows discount impact)
<ComboChart
  title="GMV vs Net Revenue (Discount Impact)"
  data={gmvTrend}
  leftYAxis={{ key: "gmv", label: "GMV ($)", color: "#3b82f6" }}
  rightYAxis={{ key: "discount_rate_pct", label: "Discount %", color: "#f59e0b" }}
/>
```

### Phase 4: Advanced Filtering (NEXT)

**A. Add Filter Pills Component**
```typescript
// src/components/FilterPills.tsx
export function FilterPills({ filters, onRemove }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(filter => (
        <Badge key={filter.key} variant="secondary" className="flex items-center gap-2">
          <span className="text-xs">{filter.label}: {filter.value}</span>
          <button onClick={() => onRemove(filter.key)}>
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && (
        <Button variant="ghost" size="sm" onClick={() => onRemove('all')}>
          Clear All
        </Button>
      )}
    </div>
  );
}
```

**B. Add Time Grain Selector**
```typescript
<Select value={timeGrain} onValueChange={setTimeGrain}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="daily">Daily</SelectItem>
    <SelectItem value="weekly">Weekly</SelectItem>
    <SelectItem value="monthly">Monthly</SelectItem>
    <SelectItem value="quarterly">Quarterly</SelectItem>
    <SelectItem value="yearly">Yearly</SelectItem>
  </SelectContent>
</Select>
```

**C. Add Comparison Mode**
```typescript
<ToggleGroup type="single" value={comparisonMode} onValueChange={setComparisonMode}>
  <ToggleGroupItem value="none">No Comparison</ToggleGroupItem>
  <ToggleGroupItem value="previous_period">vs Previous Period</ToggleGroupItem>
  <ToggleGroupItem value="year_ago">vs Year Ago</ToggleGroupItem>
</ToggleGroup>
```

**D. Add Saved Filter Presets**
```typescript
const FILTER_PRESETS = {
  "Q4 2024 Performance": { startDate: "2024-10-01", endDate: "2024-12-31" },
  "Digital Channels Only": { channels: ["Mobile App", "Online"] },
  "High-Value Customers": { segment: "Family", minArpu: 4000 },
};

<Select value={preset} onValueChange={loadPreset}>
  <SelectContent>
    {Object.keys(FILTER_PRESETS).map(name => (
      <SelectItem key={name} value={name}>{name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Phase 5: Number Formatting (Quick Fix)

**A. Update formatNumber to Always Use Commas**
```typescript
// src/lib/utils.ts
export function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatNumberWithDecimals(num: number, decimals: number = 2): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
```

---

## Key Epic AI Analytics Features to Add

### 1. Smart Insights Panel
```typescript
// Auto-generated insights based on data
<InsightsPanel>
  <Insight type="warning" icon="⚠️">
    Your CAC for Display ads ($26.83) is 5x higher than Email ($5.65).
    Consider reallocating budget.
  </Insight>
  <Insight type="success" icon="✅">
    Family segment ARPU increased 12% this quarter to $4,347.
  </Insight>
  <Insight type="info" icon="💡">
    Mobile App attach rate for sides (42%) is higher than other channels.
    Opportunity to promote sides on other channels.
  </Insight>
</InsightsPanel>
```

### 2. Anomaly Detection
```typescript
// Highlight unusual data points
<LineChart
  data={revenueTrend}
  anomalies={[
    { date: "2024-11-28", value: 1500000, reason: "Black Friday spike" },
    { date: "2024-12-10", value: 800000, reason: "20% below avg - investigate" }
  ]}
/>
```

### 3. Forecasting
```typescript
// Add ML-powered forecasts
<ForecastChart
  historical={revenueTrend}
  forecast={forecastedRevenue}
  confidence={95}
/>
```

### 4. Cohort Analysis Deep Dive
```typescript
// Interactive cohort heatmap
<CohortHeatmap
  data={cohortRetention}
  colorScale={["#fee", "#f88", "#f44", "#c00"]}
  onCellClick={(cohort, month) => showCohortDetail(cohort, month)}
/>
```

### 5. Attribution Modeling
```typescript
// Multi-touch attribution
<AttributionChart
  model="linear" // or first-touch, last-touch, time-decay
  channels={["Display", "Social", "Email", "Search"]}
  conversions={conversionData}
/>
```

---

## Priority Order for Implementation

**Phase 1 (Critical - Do First):**
1. Fix filtering to update all visualizations ⭐⭐⭐
2. Add complete months filter ⭐⭐
3. Fix comma formatting everywhere ⭐

**Phase 2 (High Impact):**
4. Business glossary tooltips ⭐⭐
5. Overlay visualizations (CAC vs LTV) ⭐⭐
6. Filter pills UI ⭐

**Phase 3 (Polish):**
7. Time grain selector
8. Comparison mode
9. Saved presets
10. Smart insights panel

**Phase 4 (Advanced):**
11. Anomaly detection
12. Forecasting
13. Cohort heatmap
14. Attribution modeling

---

## Expected Outcome

After these changes, marketers will have:
- ✅ Real-time filtering that actually works
- ✅ Clear metric definitions (no more "what's ARPU?")
- ✅ Overlay charts showing efficiency (CAC vs LTV)
- ✅ Complete month data (no partial month bias)
- ✅ Professional number formatting
- ✅ Advanced filtering (time grain, comparison, presets)
- ✅ Smart insights highlighting opportunities
- ✅ Epic AI analytics tool experience

This positions us as a **true Zenlytic competitor** with native Databricks power!
