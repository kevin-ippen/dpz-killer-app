# Dashboard Improvements Required

## Critical Data Issues

### 1. Revenue vs Orders Chart - Dual Axis Scaling (LINE 569-578)
**Problem**: Orders (17M units) appear as flat line near zero because they're on same scale as revenue ($164M)

**Fix**: Replace LineChart with ComboChart:
```tsx
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
```

### 2. AOV Calculation Discrepancy (LINE 493-497)
**Problem**: $886M ÷ 17M orders = $51.34, but dashboard shows $37
**Location**: `metrics?.avg_order_value` from backend API
**Action Required**: **BACKEND INVESTIGATION** - Check `/api/metrics/summary` endpoint calculation

### 3. December 2025 in "Complete Months" (LINE 153-156)
**Status**: ✅ Already fixed - `filterCompleteMonths` correctly excludes current month
**Verification Needed**: Ensure `completeRevenueTrend` and `completeGmvTrend` are used consistently

### 4. June 2025 Anomaly ($35M vs $120-150M) (LINE 260-264)
**Current**: Anomaly detection flags it
**Options**:
- Add data annotation explaining partial month/launch
- Exclude from aggregations if it's incomplete data
- Add filter to exclude/include June 2025

## Visual Consistency Issues

### 5. Inconsistent Revenue Color Coding
**Locations to fix**:
- LINE 518: Revenue trend - **KEEP** `#3b82f6` (blue) ✅
- LINE 555: Revenue by channel - **KEEP** `#3b82f6` (blue) ✅
- LINE 584: Monthly comparison bar - **CHANGE** `#8b5cf6` to `#3b82f6`

```tsx
// LINE 584 - Change purple to blue for consistency
colors={["#3b82f6"]}  // was: ["#8b5cf6"]
```

### 6. Customer Satisfaction Missing Scale (LINE 500-505)
**Fix**: Add denominator to label
```tsx
<MetricCard
  label={<MetricTooltip term="CSAT">Customer Satisfaction</MetricTooltip>}
  value={metrics?.customer_satisfaction || 0}
  format="rating"  // Add format type
  maxValue={5}  // Add max value prop
  delta={{ value: -1.5, isPositive: false }}
  loading={metricsLoading}
/>
```

Or simpler: Update label to "Customer Satisfaction (5/5)"

### 7. KPI Sparklines Lack Context (LINE 481, 489)
**Current**: Mini sparklines have no labels or scales
**Options**:
- Add hover tooltips showing time range
- Add min/max labels
- Show time range text below card ("Last 6 months")

### 8. Forecast Baseline Clarity (LINE 537-546)
**Issue**: Can't tell where actual data ends and forecast begins
**Fix Required**: In ForecastChart component, add:
- Different color/style for forecast section
- Vertical line marking forecast start
- Label showing "Forecast →"

### 9. Legend Placement Inconsistency
**Location**: Chart components (LineChart, BarChart, ComboChart)
**Fix**: Standardize legend position (e.g., always bottom-center)

### 10. AI Insights Metric Display (LINE 247-255, LINE 509)
**Issue**: Inconsistent formats: "8.0x" vs "$5.65" vs percentages
**Fix**: Review `generateInsights()` function formatting

### 11. Tab Styling Inconsistency (LINE 463-470)
**Issue**: Different text weight/color between active/inactive tabs
**Fix**: Update TabsList/TabsTrigger components for consistent styling

## Implementation Priority

### 🔴 CRITICAL (Do First)
1. Fix dual-axis Revenue vs Orders chart (ComboChart)
2. Investigate AOV calculation backend issue
3. Standardize revenue color to blue

### 🟡 HIGH (Do Next)
4. Add scale to Customer Satisfaction
5. Fix forecast baseline visual clarity
6. June 2025 annotation/exclusion

### 🟢 MEDIUM (Polish)
7. KPI sparkline context
8. Legend placement standardization
9. AI insights formatting
10. Tab styling consistency

## Frontend Chart Toggle Issue

**IMPORTANT**: Table/chart toggle was implemented in commit `c410d9a` but not yet deployed.

**Action Required**: Redeploy frontend with latest build from `/frontend/dist/`

**Verify**:
1. Ask question in chat that returns table
2. Click table to open in right panel
3. Look for [Table | Chart] toggle buttons in header
4. Click "Chart" to see bar/line/pie visualization
