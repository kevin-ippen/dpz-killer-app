-- ============================================================================
-- Create metric_cohort_retention as a VIEW instead of TABLE
-- ============================================================================
--
-- Views are always current but slower (runs query each time)
-- For cohort retention, we actually want a TABLE that refreshes monthly
-- But this VIEW version is useful for testing if table is causing issues
--
-- ============================================================================

CREATE OR REPLACE VIEW main.dominos_analytics.metric_cohort_retention_view AS
WITH
-- Get first order date for each customer (their cohort)
customer_cohorts AS (
  SELECT
    customer_id,
    DATE_TRUNC('month', MIN(order_date)) as cohort_month
  FROM main.dominos_realistic.daily_sales_fact
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
),

-- Get all order months for each customer
customer_activity AS (
  SELECT
    customer_id,
    DATE_TRUNC('month', order_date) as order_month,
    SUM(net_sales) as month_revenue
  FROM main.dominos_realistic.daily_sales_fact
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id, DATE_TRUNC('month', order_date)
),

-- Combine cohorts with activity
cohort_activity AS (
  SELECT
    c.cohort_month,
    c.customer_id,
    a.order_month,
    a.month_revenue,
    DATEDIFF(MONTH, c.cohort_month, a.order_month) as months_since_acquisition
  FROM customer_cohorts c
  INNER JOIN customer_activity a ON c.customer_id = a.customer_id
),

-- Aggregate by cohort and months since acquisition
cohort_metrics AS (
  SELECT
    cohort_month,
    months_since_acquisition,
    COUNT(DISTINCT customer_id) as active_customers,
    SUM(month_revenue) as total_revenue
  FROM cohort_activity
  GROUP BY cohort_month, months_since_acquisition
),

-- Get cohort sizes (M0)
cohort_sizes AS (
  SELECT
    cohort_month,
    COUNT(DISTINCT customer_id) as cohort_size
  FROM customer_cohorts
  GROUP BY cohort_month
)

-- Final retention metrics
SELECT
  cm.cohort_month,
  cm.months_since_acquisition,
  cs.cohort_size,
  cm.active_customers,
  ROUND((cm.active_customers / cs.cohort_size) * 100, 2) as retention_rate_pct,
  cm.total_revenue,
  ROUND(cm.total_revenue / cm.active_customers, 2) as avg_revenue_per_customer
FROM cohort_metrics cm
INNER JOIN cohort_sizes cs ON cm.cohort_month = cs.cohort_month
WHERE
  cm.months_since_acquisition <= 12  -- Limit to 12 months
  AND cs.cohort_size >= 10  -- Only cohorts with at least 10 customers
ORDER BY
  cm.cohort_month DESC,
  cm.months_since_acquisition ASC;

-- ============================================================================
-- Quick Test
-- ============================================================================
-- This will be SLOW because it runs the full query
-- But proves the logic works

SELECT COUNT(*) as row_count
FROM main.dominos_analytics.metric_cohort_retention_view;
