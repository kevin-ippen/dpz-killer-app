# Domino's Marketing Analytics Dashboard

Enhanced visualization components for QSR marketing teams, featuring creative non-standard charts designed for pizza delivery analytics.

---

## Visualization Components

### Standard Components (MarketingDashboard.jsx)

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| **Order Heatmap** | 24×7 hour/day order patterns | `daily_sales_fact` with hour breakdown |
| **CAC Efficiency Gauge** | CAC vs benchmark by channel | `metric_cac_by_channel` |
| **Segment Comparison** | ARPU, LTV, Retention by segment | `metric_arpu_by_segment` |
| **Attach Rate Rings** | Cross-sell performance | `metric_attach_rate` |
| **Cohort Retention Matrix** | Month-over-month retention | `metric_cohort_retention` |
| **Marketing Funnel** | Impression → Order conversion | `marketing_touchpoints_fact` |
| **Campaign Scorecard** | Active campaign ROAS | `campaign_performance_daily` |
| **Channel Mix Donut** | Revenue distribution | `metric_channel_mix` |
| **Real-time Pulse** | Live operational stats | `orders_fact` (streaming) |

### Creative Components (CreativeVisualizations.jsx)

| Component | Purpose | Best For |
|-----------|---------|----------|
| **Pizza Slice Comparison** | Segment comparison as pizza slices | Executive presentations |
| **Delivery Tracker** | Live order pipeline visualization | Operations dashboards |
| **Promo Effectiveness Matrix** | Promo code ROI analysis | Marketing ops |
| **Customer Journey Sankey** | Traffic → Action → Outcome flow | Funnel optimization |
| **Competitive Radar** | Multi-metric competitor comparison | Strategy planning |
| **Daypart Wheel** | Revenue by time of day (clock) | Daypart marketing |
| **LTV:CAC Gauge** | Health indicator gauge | Financial reviews |
| **Menu Item Bubbles** | Volume vs Margin scatter plot | Menu optimization |

---

## Key Metrics for Pizza Marketing Teams

### Acquisition Metrics
```
┌─────────────────────────────────────────────────────────────────┐
│  CAC by Channel                                                  │
│  ───────────────                                                │
│  Email:            $5.65  ████████░░░░░░░░░░░░  (benchmark: $15)│
│  Push:             $3.20  █████░░░░░░░░░░░░░░░  (benchmark: $8) │
│  Social:          $22.45  ████████████████░░░░  (benchmark: $25)│
│  Search:          $28.90  ███████████████████░  (benchmark: $30)│
│  OOH:             $44.95  ██████████████████████(benchmark: $40)│
└─────────────────────────────────────────────────────────────────┘
```

### Customer Value Metrics
- **ARPU by Segment**: Families ($4,697) > Office Orders ($8,920) > Young Adults ($2,340)
- **LTV:CAC Ratio**: Target 5:1+ for healthy unit economics
- **Cohort Retention**: Month 1 drop-off is critical (typically 35-40% churn)

### Operational Metrics
- **Peak Hours**: Dinner (6-9 PM) = 42% of orders
- **Delivery Time**: Target <30 min for satisfaction
- **Attach Rate**: Breadsticks (34%), Wings (29%), Soda (42%)

---

## Data Architecture

### Required Tables

```sql
-- Core metrics tables
metric_gmv
metric_arpu_by_segment
metric_attach_rate
metric_cac_by_channel
metric_channel_mix
metric_churn_rate
metric_cohort_retention
metric_cross_category
metric_discount_impact
metric_dormancy
metric_items_per_order
metric_ltv_cac_ratio
metric_new_customer_rate
metric_order_frequency
metric_revenue_per_order_type

-- Fact tables
daily_sales_fact
campaign_performance_daily
marketing_spend_daily
marketing_touchpoints_fact

-- Dimension tables
campaigns_dim
customer_metrics

-- Attribution
channel_attribution_models
customer_acquisition_source
```

### Sample Table Schemas

```sql
-- metric_cac_by_channel
CREATE TABLE metric_cac_by_channel (
    date DATE,
    channel STRING,
    cac DECIMAL(10,2),
    conversions INT,
    spend DECIMAL(12,2),
    benchmark_cac DECIMAL(10,2)
);

-- metric_arpu_by_segment
CREATE TABLE metric_arpu_by_segment (
    date DATE,
    segment_name STRING,
    customer_count INT,
    arpu DECIMAL(10,2),
    ltv DECIMAL(10,2),
    retention_rate DECIMAL(5,2),
    churn_rate DECIMAL(5,2)
);

-- campaign_performance_daily
CREATE TABLE campaign_performance_daily (
    date DATE,
    campaign_id STRING,
    impressions BIGINT,
    clicks INT,
    conversions INT,
    revenue DECIMAL(12,2),
    ctr DECIMAL(5,4),
    conversion_rate DECIMAL(5,4)
);
```

---

## Frontend Integration

### React Hooks Pattern

```javascript
// hooks/useDashboardData.js
import { useState, useEffect } from 'react';

export function useDashboardData(timeRange) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?time_range=${timeRange}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [timeRange]);

  return { data, loading, error };
}
```

### Real-time Updates

```javascript
// For live metrics, use polling or WebSocket
function useRealtimeMetrics(intervalMs = 30000) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = () => {
      fetch('/api/realtime')
        .then(res => res.json())
        .then(setMetrics);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return metrics;
}
```

---

## Design Decisions

### Color Palette

```css
/* Primary brand (Domino's inspired) */
--dominos-red: #E31837;
--dominos-blue: #006491;

/* Dashboard palette (dark theme) */
--bg-primary: #0D0D0F;
--bg-card: #131316;
--bg-elevated: #1E1E24;
--border: #2A2A30;

/* Semantic colors */
--success: #10B981;  /* Green - positive metrics */
--warning: #F59E0B;  /* Yellow - attention needed */
--danger: #EF4444;   /* Red - negative/urgent */
--info: #3B82F6;     /* Blue - neutral data */

/* Segment colors */
--segment-families: #EC4899;
--segment-young: #3B82F6;
--segment-office: #10B981;
--segment-latenight: #F59E0B;
--segment-weekend: #8B5CF6;
```

### Typography

```css
/* Using IBM Plex Sans for consistency with Databricks */
font-family: 'IBM Plex Sans', -apple-system, sans-serif;

/* Scale */
--text-xs: 10px;    /* Labels, legends */
--text-sm: 12px;    /* Secondary info */
--text-base: 14px;  /* Body text */
--text-lg: 16px;    /* Card titles */
--text-xl: 20px;    /* Section headers */
--text-2xl: 24px;   /* Page title */
--text-3xl: 32px;   /* KPI values */
```

### Why These Visualizations?

| Viz Type | Why It Works for QSR Marketing |
|----------|--------------------------------|
| **Heatmap** | Instantly shows peak ordering times for daypart targeting |
| **Gauge** | C-suite understands "red/yellow/green" health indicators |
| **Cohort Matrix** | Retention is key for subscription (loyalty) programs |
| **Funnel** | Marketing spends millions on top-of-funnel—show the leak |
| **Radar** | Competitive positioning requires multi-metric view |
| **Bubbles** | Menu optimization needs volume AND margin perspective |

---

## Performance Tips

### 1. Pre-aggregate in Databricks

```sql
-- Create a dashboard-optimized view
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
    date,
    SUM(revenue) as total_revenue,
    SUM(orders) as total_orders,
    AVG(aov) as avg_order_value,
    -- Pre-calculate period-over-period changes
    LAG(SUM(revenue), 30) OVER (ORDER BY date) as revenue_30d_ago
FROM daily_sales_fact
GROUP BY date;
```

### 2. Use Materialized Views

```sql
-- Materialize expensive aggregations
CREATE MATERIALIZED VIEW mv_channel_performance
AS SELECT
    channel,
    SUM(revenue) as revenue,
    SUM(orders) as orders,
    AVG(cac) as avg_cac
FROM channel_metrics
GROUP BY channel;
```

### 3. Cache in Frontend

```javascript
// Use React Query or SWR for caching
import useSWR from 'swr';

function useCampaigns() {
  return useSWR('/api/campaigns', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 min cache
  });
}
```

### 4. Lazy Load Heavy Components

```javascript
const CohortMatrix = React.lazy(() => import('./CohortMatrix'));
const CompetitiveRadar = React.lazy(() => import('./CompetitiveRadar'));

// Wrap in Suspense
<Suspense fallback={<Skeleton />}>
  <CohortMatrix data={data} />
</Suspense>
```

---

## Files Included

```
dominos-dashboard/
├── MarketingDashboard.jsx      # Main dashboard with all standard visualizations
├── CreativeVisualizations.jsx  # Additional creative chart components
├── data_service.py             # Python backend for Databricks queries
└── README.md                   # This documentation
```

---

## Next Steps

1. **Connect to real data**: Update `data_service.py` with your actual table names
2. **Configure permissions**: Grant app service principal access to all metric tables
3. **Set up warehouse**: Ensure SQL warehouse is configured in app.yaml
4. **Customize segments**: Update segment names/colors to match your business
5. **Add drilling**: Implement click-through from charts to detail views
6. **Enable exports**: Add CSV/PDF export for stakeholder reports

---

## Questions for Your Team

Before finalizing, consider:

1. **What's the primary audience?** (Execs vs. Marketing Ops vs. Data Team)
2. **What decisions will this dashboard drive?** (Budget allocation? Campaign optimization?)
3. **What's the refresh frequency needed?** (Real-time? Daily? Weekly?)
4. **Are there competitor benchmarks you want to show?**
5. **Do you need drill-down to individual campaigns/channels?**
