-- ============================================================================
-- Create metric_cohort_retention Table
-- ============================================================================
--
-- This table tracks customer retention by acquisition cohort
-- Calculates how many customers from each cohort month continue ordering
-- over subsequent months
--
-- Run this in Databricks SQL Editor or notebook
-- ============================================================================

CREATE OR REPLACE TABLE main.dominos_analytics.metric_cohort_retention AS
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
-- Verify the table
-- ============================================================================

SELECT
  cohort_month,
  months_since_acquisition,
  cohort_size,
  active_customers,
  retention_rate_pct
FROM main.dominos_analytics.metric_cohort_retention
WHERE cohort_month >= DATE_SUB(CURRENT_DATE(), 180)  -- Last 6 months
ORDER BY cohort_month DESC, months_since_acquisition ASC
LIMIT 50;

-- ============================================================================
-- Add table properties
-- ============================================================================

ALTER TABLE main.dominos_analytics.metric_cohort_retention
SET TBLPROPERTIES (
  'description' = 'Customer retention metrics by acquisition cohort',
  'created_by' = 'analytics_dashboard',
  'data_refresh' = 'Run monthly to update retention curves'
);

-- ============================================================================
-- Expected Output Schema
-- ============================================================================
-- cohort_month: DATE - Month when customers were acquired
-- months_since_acquisition: INT - 0, 1, 2, ... 12
-- cohort_size: INT - Number of customers in cohort
-- active_customers: INT - Customers still ordering in that month
-- retention_rate_pct: DECIMAL - Percentage retained
-- total_revenue: DECIMAL - Revenue from cohort in that month
-- avg_revenue_per_customer: DECIMAL - Average revenue per active customer
-- ============================================================================
