"""
Databricks Data Service for Domino's Marketing Dashboard
=========================================================
Connects to Unity Catalog tables to fetch marketing analytics data.

Tables used:
- customer_metrics
- marketing_metrics_daily
- metric_* tables (arpu_by_segment, cac_by_channel, etc.)
- campaign_performance_daily
- marketing_spend_daily
- daily_sales_fact
"""

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import os

# Initialize workspace client
w = WorkspaceClient()

# Configuration
WAREHOUSE_ID = os.getenv("DATABRICKS_SQL_WAREHOUSE_ID")
CATALOG = os.getenv("DEFAULT_CATALOG", "main")
SCHEMA = os.getenv("DEFAULT_SCHEMA", "gold")


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class KPIMetrics:
    total_revenue: float
    total_orders: int
    avg_order_value: float
    customer_satisfaction: float
    revenue_change: float
    orders_change: float
    aov_change: float
    satisfaction_change: float


@dataclass
class ChannelMetrics:
    name: str
    revenue: float
    orders: int
    cac: float
    share: float


@dataclass
class SegmentMetrics:
    name: str
    customers: int
    arpu: float
    ltv: float
    retention: float


@dataclass
class CampaignMetrics:
    name: str
    spend: float
    revenue: float
    roas: float
    status: str
    campaign_type: str


# =============================================================================
# QUERY EXECUTION
# =============================================================================

def execute_query(query: str, timeout: str = "60s") -> List[Dict[str, Any]]:
    """Execute SQL query and return results as list of dicts."""
    try:
        result = w.statement_execution.execute_statement(
            warehouse_id=WAREHOUSE_ID,
            statement=query,
            wait_timeout=timeout
        )
        
        if result.status.state != StatementState.SUCCEEDED:
            raise Exception(f"Query failed: {result.status.error}")
        
        if not result.result or not result.result.data_array:
            return []
        
        columns = [col.name for col in result.manifest.schema.columns]
        return [dict(zip(columns, row)) for row in result.result.data_array]
        
    except Exception as e:
        print(f"Query error: {e}")
        raise


# =============================================================================
# KPI QUERIES
# =============================================================================

def get_kpi_metrics(
    start_date: str = None,
    end_date: str = None,
    compare_previous: bool = True
) -> Dict[str, Any]:
    """
    Fetch main KPI metrics for the dashboard header.
    
    Uses: metric_gmv, daily_sales_fact, customer_metrics
    """
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    if not start_date:
        start_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
    
    query = f"""
    WITH current_period AS (
        SELECT
            SUM(revenue) as total_revenue,
            SUM(order_count) as total_orders,
            AVG(avg_order_value) as avg_order_value
        FROM {CATALOG}.{SCHEMA}.daily_sales_fact
        WHERE date BETWEEN '{start_date}' AND '{end_date}'
    ),
    previous_period AS (
        SELECT
            SUM(revenue) as total_revenue,
            SUM(order_count) as total_orders,
            AVG(avg_order_value) as avg_order_value
        FROM {CATALOG}.{SCHEMA}.daily_sales_fact
        WHERE date BETWEEN DATE_SUB('{start_date}', INTERVAL 180 DAY) 
                       AND DATE_SUB('{end_date}', INTERVAL 180 DAY)
    ),
    satisfaction AS (
        SELECT AVG(satisfaction_score) as current_score
        FROM {CATALOG}.{SCHEMA}.customer_metrics
        WHERE last_updated >= '{start_date}'
    )
    SELECT
        c.total_revenue,
        c.total_orders,
        c.avg_order_value,
        s.current_score as customer_satisfaction,
        ((c.total_revenue - p.total_revenue) / p.total_revenue * 100) as revenue_change,
        ((c.total_orders - p.total_orders) / p.total_orders * 100) as orders_change,
        ((c.avg_order_value - p.avg_order_value) / p.avg_order_value * 100) as aov_change
    FROM current_period c
    CROSS JOIN previous_period p
    CROSS JOIN satisfaction s
    """
    
    results = execute_query(query)
    return results[0] if results else {}


def get_gmv_trend(
    start_date: str,
    end_date: str,
    granularity: str = 'daily'
) -> List[Dict[str, Any]]:
    """
    Fetch GMV trend data.
    
    Uses: metric_gmv
    """
    group_by = {
        'daily': 'date',
        'weekly': 'DATE_TRUNC("week", date)',
        'monthly': 'DATE_TRUNC("month", date)'
    }[granularity]
    
    query = f"""
    SELECT
        {group_by} as period,
        SUM(gmv) as gmv,
        SUM(order_count) as orders,
        AVG(gmv / NULLIF(order_count, 0)) as aov
    FROM {CATALOG}.{SCHEMA}.metric_gmv
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    GROUP BY {group_by}
    ORDER BY period
    """
    
    return execute_query(query)


# =============================================================================
# CHANNEL ANALYTICS
# =============================================================================

def get_channel_performance(
    start_date: str,
    end_date: str
) -> List[Dict[str, Any]]:
    """
    Fetch channel performance metrics.
    
    Uses: metric_channel_mix, metric_cac_by_channel
    """
    query = f"""
    SELECT
        cm.channel,
        cm.revenue,
        cm.orders,
        cm.revenue_share,
        cac.cac,
        cac.conversions
    FROM {CATALOG}.{SCHEMA}.metric_channel_mix cm
    LEFT JOIN {CATALOG}.{SCHEMA}.metric_cac_by_channel cac
        ON cm.channel = cac.channel
        AND cm.date = cac.date
    WHERE cm.date BETWEEN '{start_date}' AND '{end_date}'
    """
    
    return execute_query(query)


def get_channel_attribution(
    start_date: str,
    end_date: str,
    model: str = 'last_touch'
) -> List[Dict[str, Any]]:
    """
    Fetch attribution data by channel.
    
    Uses: channel_attribution_models
    """
    query = f"""
    SELECT
        channel,
        attributed_revenue,
        attributed_orders,
        attribution_weight
    FROM {CATALOG}.{SCHEMA}.channel_attribution_models
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
        AND model_type = '{model}'
    GROUP BY channel
    ORDER BY attributed_revenue DESC
    """
    
    return execute_query(query)


# =============================================================================
# CUSTOMER ANALYTICS
# =============================================================================

def get_customer_segments(
    start_date: str = None
) -> List[Dict[str, Any]]:
    """
    Fetch customer segment metrics.
    
    Uses: metric_arpu_by_segment, customer_metrics
    """
    query = f"""
    SELECT
        segment_name,
        customer_count,
        arpu,
        ltv,
        retention_rate,
        churn_rate
    FROM {CATALOG}.{SCHEMA}.metric_arpu_by_segment
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_arpu_by_segment)
    ORDER BY arpu DESC
    """
    
    return execute_query(query)


def get_cohort_retention(
    num_cohorts: int = 6
) -> List[Dict[str, Any]]:
    """
    Fetch cohort retention matrix.
    
    Uses: metric_cohort_retention
    """
    query = f"""
    SELECT
        cohort_month,
        month_number,
        retention_rate,
        customer_count
    FROM {CATALOG}.{SCHEMA}.metric_cohort_retention
    WHERE cohort_month >= DATE_SUB(CURRENT_DATE(), INTERVAL {num_cohorts} MONTH)
    ORDER BY cohort_month, month_number
    """
    
    return execute_query(query)


def get_ltv_cac_ratio() -> Dict[str, Any]:
    """
    Fetch LTV/CAC ratio metrics.
    
    Uses: metric_ltv_cac_ratio
    """
    query = f"""
    SELECT
        avg_ltv,
        avg_cac,
        ltv_cac_ratio,
        payback_months
    FROM {CATALOG}.{SCHEMA}.metric_ltv_cac_ratio
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_ltv_cac_ratio)
    """
    
    results = execute_query(query)
    return results[0] if results else {}


def get_churn_metrics(
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Fetch churn rate metrics.
    
    Uses: metric_churn_rate, metric_dormancy
    """
    query = f"""
    SELECT
        cr.churn_rate,
        cr.churned_customers,
        cr.total_customers,
        d.dormant_rate,
        d.at_risk_customers
    FROM {CATALOG}.{SCHEMA}.metric_churn_rate cr
    JOIN {CATALOG}.{SCHEMA}.metric_dormancy d
        ON cr.date = d.date
    WHERE cr.date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_churn_rate)
    """
    
    results = execute_query(query)
    return results[0] if results else {}


# =============================================================================
# MARKETING CAMPAIGN ANALYTICS
# =============================================================================

def get_campaign_performance(
    start_date: str,
    end_date: str,
    status_filter: str = None
) -> List[Dict[str, Any]]:
    """
    Fetch campaign performance metrics.
    
    Uses: campaign_performance_daily, campaigns_dim, marketing_spend_daily
    """
    status_clause = f"AND c.status = '{status_filter}'" if status_filter else ""
    
    query = f"""
    SELECT
        c.campaign_id,
        c.campaign_name,
        c.campaign_type,
        c.status,
        c.start_date,
        c.end_date,
        SUM(p.impressions) as impressions,
        SUM(p.clicks) as clicks,
        SUM(p.conversions) as conversions,
        SUM(p.revenue) as attributed_revenue,
        SUM(s.spend) as total_spend,
        CASE 
            WHEN SUM(s.spend) > 0 
            THEN SUM(p.revenue) / SUM(s.spend) 
            ELSE 0 
        END as roas,
        CASE 
            WHEN SUM(p.clicks) > 0 
            THEN SUM(p.conversions) / SUM(p.clicks) * 100 
            ELSE 0 
        END as conversion_rate
    FROM {CATALOG}.{SCHEMA}.campaigns_dim c
    JOIN {CATALOG}.{SCHEMA}.campaign_performance_daily p
        ON c.campaign_id = p.campaign_id
    JOIN {CATALOG}.{SCHEMA}.marketing_spend_daily s
        ON c.campaign_id = s.campaign_id
        AND p.date = s.date
    WHERE p.date BETWEEN '{start_date}' AND '{end_date}'
        {status_clause}
    GROUP BY c.campaign_id, c.campaign_name, c.campaign_type, c.status, c.start_date, c.end_date
    ORDER BY attributed_revenue DESC
    """
    
    return execute_query(query)


def get_marketing_funnel(
    start_date: str,
    end_date: str
) -> List[Dict[str, Any]]:
    """
    Fetch marketing funnel metrics.
    
    Uses: marketing_touchpoints_fact
    """
    query = f"""
    SELECT
        'Impressions' as stage,
        SUM(impressions) as value,
        1 as stage_order
    FROM {CATALOG}.{SCHEMA}.marketing_touchpoints_fact
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    
    UNION ALL
    
    SELECT
        'Clicks' as stage,
        SUM(clicks) as value,
        2 as stage_order
    FROM {CATALOG}.{SCHEMA}.marketing_touchpoints_fact
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    
    UNION ALL
    
    SELECT
        'Site Visits' as stage,
        SUM(site_visits) as value,
        3 as stage_order
    FROM {CATALOG}.{SCHEMA}.marketing_touchpoints_fact
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    
    UNION ALL
    
    SELECT
        'Add to Cart' as stage,
        SUM(add_to_cart) as value,
        4 as stage_order
    FROM {CATALOG}.{SCHEMA}.marketing_touchpoints_fact
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    
    UNION ALL
    
    SELECT
        'Checkout Started' as stage,
        SUM(checkout_started) as value,
        5 as stage_order
    FROM {CATALOG}.{SCHEMA}.marketing_touchpoints_fact
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    
    UNION ALL
    
    SELECT
        'Orders Completed' as stage,
        SUM(orders_completed) as value,
        6 as stage_order
    FROM {CATALOG}.{SCHEMA}.marketing_touchpoints_fact
    WHERE date BETWEEN '{start_date}' AND '{end_date}'
    
    ORDER BY stage_order
    """
    
    return execute_query(query)


# =============================================================================
# PRODUCT ANALYTICS
# =============================================================================

def get_attach_rates() -> List[Dict[str, Any]]:
    """
    Fetch product attach rates.
    
    Uses: metric_attach_rate
    """
    query = f"""
    SELECT
        product_category,
        product_name,
        attach_rate,
        revenue,
        order_count,
        attach_rate_change as trend
    FROM {CATALOG}.{SCHEMA}.metric_attach_rate
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_attach_rate)
    ORDER BY attach_rate DESC
    """
    
    return execute_query(query)


def get_cross_category_metrics() -> List[Dict[str, Any]]:
    """
    Fetch cross-category purchase patterns.
    
    Uses: metric_cross_category
    """
    query = f"""
    SELECT
        primary_category,
        secondary_category,
        cross_purchase_rate,
        basket_size_increase,
        revenue_lift
    FROM {CATALOG}.{SCHEMA}.metric_cross_category
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_cross_category)
    ORDER BY cross_purchase_rate DESC
    """
    
    return execute_query(query)


def get_items_per_order() -> Dict[str, Any]:
    """
    Fetch items per order metrics.
    
    Uses: metric_items_per_order
    """
    query = f"""
    SELECT
        avg_items_per_order,
        median_items_per_order,
        items_per_order_trend
    FROM {CATALOG}.{SCHEMA}.metric_items_per_order
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_items_per_order)
    """
    
    results = execute_query(query)
    return results[0] if results else {}


# =============================================================================
# TIME-BASED ANALYTICS
# =============================================================================

def get_hourly_heatmap(
    start_date: str,
    end_date: str
) -> List[Dict[str, Any]]:
    """
    Fetch order volume by hour and day of week.
    
    Uses: daily_sales_fact (with hour breakdown)
    """
    query = f"""
    SELECT
        DAYOFWEEK(order_timestamp) as day_of_week,
        HOUR(order_timestamp) as hour,
        COUNT(*) as order_count,
        SUM(order_total) as revenue
    FROM {CATALOG}.{SCHEMA}.orders_fact
    WHERE DATE(order_timestamp) BETWEEN '{start_date}' AND '{end_date}'
    GROUP BY DAYOFWEEK(order_timestamp), HOUR(order_timestamp)
    ORDER BY day_of_week, hour
    """
    
    return execute_query(query)


def get_order_frequency() -> List[Dict[str, Any]]:
    """
    Fetch customer order frequency distribution.
    
    Uses: metric_order_frequency
    """
    query = f"""
    SELECT
        frequency_bucket,
        customer_count,
        percentage,
        avg_order_value,
        total_revenue
    FROM {CATALOG}.{SCHEMA}.metric_order_frequency
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_order_frequency)
    ORDER BY frequency_bucket
    """
    
    return execute_query(query)


def get_revenue_by_order_type() -> List[Dict[str, Any]]:
    """
    Fetch revenue breakdown by order type.
    
    Uses: metric_revenue_per_order_type
    """
    query = f"""
    SELECT
        order_type,
        revenue,
        order_count,
        avg_order_value,
        revenue_share
    FROM {CATALOG}.{SCHEMA}.metric_revenue_per_order_type
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_revenue_per_order_type)
    ORDER BY revenue DESC
    """
    
    return execute_query(query)


# =============================================================================
# DISCOUNT ANALYTICS
# =============================================================================

def get_discount_impact() -> Dict[str, Any]:
    """
    Fetch discount impact metrics.
    
    Uses: metric_discount_impact
    """
    query = f"""
    SELECT
        discount_rate_bucket,
        order_count,
        avg_basket_size,
        revenue,
        margin_impact,
        customer_return_rate
    FROM {CATALOG}.{SCHEMA}.metric_discount_impact
    WHERE date = (SELECT MAX(date) FROM {CATALOG}.{SCHEMA}.metric_discount_impact)
    ORDER BY discount_rate_bucket
    """
    
    return execute_query(query)


# =============================================================================
# REAL-TIME METRICS (if available)
# =============================================================================

def get_realtime_metrics() -> Dict[str, Any]:
    """
    Fetch real-time operational metrics.
    
    Note: This assumes you have a streaming table or view
    that aggregates recent data.
    """
    query = f"""
    SELECT
        COUNT(*) as orders_last_hour,
        SUM(order_total) as revenue_last_hour,
        AVG(delivery_time_minutes) as avg_delivery_time,
        SUM(CASE WHEN status = 'in_delivery' THEN 1 ELSE 0 END) as active_deliveries
    FROM {CATALOG}.{SCHEMA}.orders_fact
    WHERE order_timestamp >= CURRENT_TIMESTAMP() - INTERVAL 1 HOUR
    """
    
    results = execute_query(query)
    return results[0] if results else {}


# =============================================================================
# AGGREGATED DASHBOARD DATA
# =============================================================================

def get_dashboard_data(
    start_date: str = None,
    end_date: str = None,
    time_range: str = '6months'
) -> Dict[str, Any]:
    """
    Fetch all data needed for the marketing dashboard in one call.
    """
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    
    if not start_date:
        days = {
            '30days': 30,
            '3months': 90,
            '6months': 180,
            '12months': 365,
        }.get(time_range, 180)
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    return {
        'kpis': get_kpi_metrics(start_date, end_date),
        'gmv_trend': get_gmv_trend(start_date, end_date, 'monthly'),
        'channels': get_channel_performance(start_date, end_date),
        'segments': get_customer_segments(),
        'cohort_retention': get_cohort_retention(),
        'ltv_cac': get_ltv_cac_ratio(),
        'campaigns': get_campaign_performance(start_date, end_date, 'active'),
        'funnel': get_marketing_funnel(start_date, end_date),
        'attach_rates': get_attach_rates(),
        'hourly_heatmap': get_hourly_heatmap(start_date, end_date),
        'realtime': get_realtime_metrics(),
    }


# =============================================================================
# FLASK/FASTAPI ENDPOINTS
# =============================================================================

"""
Example FastAPI integration:

from fastapi import FastAPI, Query
from datetime import datetime, timedelta

app = FastAPI()

@app.get("/api/dashboard")
def get_dashboard(
    time_range: str = Query("6months"),
    start_date: str = Query(None),
    end_date: str = Query(None),
):
    return get_dashboard_data(start_date, end_date, time_range)

@app.get("/api/kpis")
def get_kpis(
    start_date: str = Query(None),
    end_date: str = Query(None),
):
    return get_kpi_metrics(start_date, end_date)

@app.get("/api/channels")
def get_channels(
    start_date: str,
    end_date: str,
):
    return get_channel_performance(start_date, end_date)

@app.get("/api/segments")
def get_segments():
    return get_customer_segments()

@app.get("/api/campaigns")
def get_campaigns(
    start_date: str,
    end_date: str,
    status: str = Query(None),
):
    return get_campaign_performance(start_date, end_date, status)

@app.get("/api/funnel")
def get_funnel(
    start_date: str,
    end_date: str,
):
    return get_marketing_funnel(start_date, end_date)

@app.get("/api/cohorts")
def get_cohorts(
    num_cohorts: int = Query(6),
):
    return get_cohort_retention(num_cohorts)

@app.get("/api/realtime")
def get_realtime():
    return get_realtime_metrics()
"""
