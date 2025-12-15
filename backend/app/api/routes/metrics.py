"""
Metrics API routes for accessing dominos_analytics semantic layer

This module provides endpoints for querying metrics from Unity Catalog's
dominos_analytics schema, which contains pre-aggregated metrics and KPIs.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.repositories.databricks_repo import databricks_repo
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metrics", tags=["metrics"])


# ============================================================================
# Response Models
# ============================================================================

class MetricValue(BaseModel):
    """Single metric value"""
    label: str
    value: float
    format: str = "number"  # number, currency, percent


class TimeSeriesPoint(BaseModel):
    """Single point in time series"""
    timestamp: str
    value: float


class MetricResponse(BaseModel):
    """Metric response with metadata"""
    metric_name: str
    value: float
    format: str
    trend: Optional[List[TimeSeriesPoint]] = None


class DashboardMetrics(BaseModel):
    """Dashboard KPI metrics"""
    total_revenue: float
    total_orders: int
    avg_order_value: float
    customer_satisfaction: float


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/summary", response_model=DashboardMetrics)
async def get_dashboard_summary():
    """
    Get summary metrics for dashboard

    Queries daily_sales_fact for key KPIs:
    - Total revenue (last 6 months)
    - Total orders
    - Average order value
    - Customer satisfaction score (static for now)
    """
    try:
        # Query the raw daily_sales_fact table
        # Note: order_total is the final amount charged (includes tax, delivery, tip)
        # net_revenue is revenue after discounts
        query = """
        SELECT
            SUM(net_revenue) as total_revenue,
            COUNT(DISTINCT order_id) as total_orders,
            AVG(order_total) as avg_order_value
        FROM main.dominos_realistic.daily_sales_fact
        WHERE order_date >= DATE_SUB(CURRENT_DATE(), 180)
        """

        results = databricks_repo.execute_query(query)

        if not results or not results[0]:
            logger.warning("No results from database, using demo data")
            return DashboardMetrics(
                total_revenue=6120000.0,
                total_orders=86800,
                avg_order_value=27.45,
                customer_satisfaction=4.6
            )

        row = results[0]
        return DashboardMetrics(
            total_revenue=float(row.get("total_revenue") or 0),
            total_orders=int(row.get("total_orders") or 0),
            avg_order_value=float(row.get("avg_order_value") or 0),
            customer_satisfaction=4.6  # Static for now - add sentiment analysis later
        )

    except Exception as e:
        logger.error(f"Error fetching dashboard summary: {e}", exc_info=True)
        # Return demo data on error
        return DashboardMetrics(
            total_revenue=6120000.0,
            total_orders=86800,
            avg_order_value=27.45,
            customer_satisfaction=4.6
        )


@router.get("/revenue-trend")
async def get_revenue_trend(months: int = Query(6, ge=1, le=24)):
    """
    Get revenue trend over time

    Args:
        months: Number of months to fetch (default: 6, max: 24)

    Returns:
        Monthly revenue data points
    """
    try:
        query = f"""
        SELECT
            DATE_FORMAT(order_date, 'MMM yyyy') as month,
            SUM(net_revenue) as revenue,
            COUNT(DISTINCT order_id) as orders
        FROM main.dominos_realistic.daily_sales_fact
        WHERE order_date >= DATE_SUB(CURRENT_DATE(), {months * 30})
        GROUP BY DATE_TRUNC('MONTH', order_date), DATE_FORMAT(order_date, 'MMM yyyy')
        ORDER BY DATE_TRUNC('MONTH', order_date) ASC
        """

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning("No revenue trend data found, using demo data")
            return [
                {"month": "Jan", "revenue": 850000, "orders": 12500},
                {"month": "Feb", "revenue": 920000, "orders": 13200},
                {"month": "Mar", "revenue": 1050000, "orders": 14800},
                {"month": "Apr", "revenue": 980000, "orders": 13900},
                {"month": "May", "revenue": 1120000, "orders": 15600},
                {"month": "Jun", "revenue": 1200000, "orders": 16800},
            ]

        return results

    except Exception as e:
        logger.error(f"Error fetching revenue trend: {e}", exc_info=True)
        # Return demo data
        return [
            {"month": "Jan", "revenue": 850000, "orders": 12500},
            {"month": "Feb", "revenue": 920000, "orders": 13200},
            {"month": "Mar", "revenue": 1050000, "orders": 14800},
            {"month": "Apr", "revenue": 980000, "orders": 13900},
            {"month": "May", "revenue": 1120000, "orders": 15600},
            {"month": "Jun", "revenue": 1200000, "orders": 16800},
        ]


@router.get("/channel-breakdown")
async def get_channel_breakdown():
    """
    Get revenue breakdown by channel

    Returns revenue distribution across different order channels:
    - Mobile App
    - Online
    - Phone
    - Walk-in
    """
    try:
        query = """
        SELECT
            channel,
            SUM(net_revenue) as revenue
        FROM main.dominos_realistic.daily_sales_fact
        WHERE order_date >= DATE_SUB(CURRENT_DATE(), 30)
        GROUP BY channel
        ORDER BY revenue DESC
        """

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning("No channel breakdown data found, using demo data")
            return [
                {"channel": "Mobile App", "revenue": 450000},
                {"channel": "Online", "revenue": 380000},
                {"channel": "Phone", "revenue": 220000},
                {"channel": "Walk-in", "revenue": 150000},
            ]

        return results

    except Exception as e:
        logger.error(f"Error fetching channel breakdown: {e}", exc_info=True)
        # Return demo data
        return [
            {"channel": "Mobile App", "revenue": 450000},
            {"channel": "Online", "revenue": 380000},
            {"channel": "Phone", "revenue": 220000},
            {"channel": "Walk-in", "revenue": 150000},
        ]


# ============================================================================
# Semantic Layer Metrics (dominos_analytics schema)
# ============================================================================

@router.get("/cac-by-channel")
async def get_cac_by_channel():
    """
    Get Customer Acquisition Cost (CAC) by marketing channel

    Returns CAC metrics from the semantic layer metric view showing:
    - Total spend per channel
    - New customers acquired
    - CAC (cost per customer)
    - Performance grade

    Channels: Email, App, Search, Social, Display, TV
    """
    try:
        query = """
        SELECT
            channel,
            total_spend,
            new_customers,
            cac,
            cac_grade
        FROM main.dominos_analytics.metric_cac_by_channel
        ORDER BY cac ASC
        """

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning("No CAC data found")
            return []

        return results

    except Exception as e:
        logger.error(f"Error fetching CAC by channel: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/arpu-by-segment")
async def get_arpu_by_segment(
    year: Optional[int] = Query(None, description="Filter by year (e.g., 2024)")
):
    """
    Get Average Revenue Per User (ARPU) by customer segment

    Returns ARPU metrics showing:
    - Customer segment (Family, Young Professional, Student, Single)
    - ARPU (annual revenue per customer)
    - Customer count
    - Average orders per customer

    Args:
        year: Optional year filter (defaults to all years)
    """
    try:
        query = """
        SELECT
            customer_segment,
            order_year,
            arpu,
            customer_count,
            total_revenue,
            avg_orders_per_customer
        FROM main.dominos_analytics.metric_arpu_by_segment
        """

        if year:
            query += f" WHERE order_year = {year}"

        query += " ORDER BY arpu DESC"

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning(f"No ARPU data found for year {year if year else 'all'}")
            return []

        return results

    except Exception as e:
        logger.error(f"Error fetching ARPU by segment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cohort-retention")
async def get_cohort_retention(
    cohort_month: Optional[str] = Query(None, description="Filter by cohort month (YYYY-MM-DD)")
):
    """
    Get customer retention curves by acquisition cohort

    Returns retention metrics showing:
    - Cohort month (when customers were acquired)
    - Months since acquisition
    - Cohort size (initial customers)
    - Active customers (still ordering)
    - Retention rate percentage
    - Cumulative revenue

    Args:
        cohort_month: Optional cohort month filter (e.g., '2024-01-01')
    """
    try:
        query = """
        SELECT
            cohort_month,
            months_since_acquisition,
            cohort_size,
            active_customers,
            retention_rate_pct,
            total_revenue,
            avg_revenue_per_customer
        FROM main.dominos_analytics.metric_cohort_retention
        """

        if cohort_month:
            query += f" WHERE cohort_month = '{cohort_month}'"

        query += " ORDER BY cohort_month DESC, months_since_acquisition ASC"

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning(f"No cohort retention data found")
            return []

        return results

    except Exception as e:
        logger.error(f"Error fetching cohort retention: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gmv-trend")
async def get_gmv_trend(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get Gross Merchandise Value (GMV) trend over time

    Returns monthly GMV metrics showing:
    - Month
    - GMV (total transaction value before discounts)
    - Net revenue (after discounts)
    - Total discounts given
    - Discount rate percentage
    - Order count
    - Customer count

    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
    """
    try:
        query = """
        SELECT
            month,
            gmv,
            net_revenue,
            total_discounts,
            discount_rate_pct,
            order_count,
            customer_count
        FROM main.dominos_analytics.metric_gmv
        """

        where_clauses = []
        if start_date:
            where_clauses.append(f"month >= '{start_date}'")
        if end_date:
            where_clauses.append(f"month <= '{end_date}'")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY month ASC"

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning("No GMV trend data found")
            return []

        return results

    except Exception as e:
        logger.error(f"Error fetching GMV trend: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channel-mix")
async def get_channel_mix(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get order and revenue distribution by channel over time

    Returns channel mix metrics showing:
    - Month
    - Channel (Mobile App, Online, Phone, Walk-in)
    - Order count
    - Revenue
    - Percentage of total orders
    - Percentage of total revenue

    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
    """
    try:
        query = """
        SELECT
            month,
            channel,
            order_count,
            revenue,
            pct_of_orders,
            pct_of_revenue
        FROM main.dominos_analytics.metric_channel_mix
        """

        where_clauses = []
        if start_date:
            where_clauses.append(f"month >= '{start_date}'")
        if end_date:
            where_clauses.append(f"month <= '{end_date}'")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY month DESC, pct_of_revenue DESC"

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning("No channel mix data found")
            return []

        return results

    except Exception as e:
        logger.error(f"Error fetching channel mix: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attach-rate")
async def get_attach_rate(
    segment: Optional[str] = Query(None, description="Filter by customer segment"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get upsell attach rates (sides, desserts, beverages) by segment

    Returns attach rate metrics showing:
    - Month
    - Customer segment
    - Total orders
    - Sides attach rate percentage
    - Dessert attach rate percentage
    - Beverage attach rate percentage
    - Any add-on rate percentage

    Args:
        segment: Optional customer segment filter (Family, Young Professional, Student, Single)
        start_date: Optional start date filter
        end_date: Optional end date filter
    """
    try:
        query = """
        SELECT
            month,
            customer_segment,
            total_orders,
            sides_attach_rate_pct,
            dessert_attach_rate_pct,
            beverage_attach_rate_pct,
            any_addon_rate_pct
        FROM main.dominos_analytics.metric_attach_rate
        """

        where_clauses = []
        if segment:
            where_clauses.append(f"customer_segment = '{segment}'")
        if start_date:
            where_clauses.append(f"month >= '{start_date}'")
        if end_date:
            where_clauses.append(f"month <= '{end_date}'")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " ORDER BY month DESC, customer_segment"

        results = databricks_repo.execute_query(query)

        if not results:
            logger.warning("No attach rate data found")
            return []

        return results

    except Exception as e:
        logger.error(f"Error fetching attach rate: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Custom Query Endpoint
# ============================================================================

@router.get("/query")
async def execute_custom_query(
    schema: str = Query("dominos_realistic", description="Schema name (dominos_realistic or dominos_analytics)"),
    table: str = Query(..., description="Table name"),
    limit: int = Query(100, ge=1, le=10000, description="Maximum rows to return")
):
    """
    Execute a custom query against a specific table

    Args:
        schema: Schema name (dominos_realistic or dominos_analytics)
        table: Table name (e.g., "daily_sales_fact")
        limit: Maximum number of rows to return

    Returns:
        Query results as list of dictionaries
    """
    try:
        # Validate schema
        allowed_schemas = ["dominos_realistic", "dominos_analytics"]
        if schema not in allowed_schemas:
            raise HTTPException(
                status_code=400,
                detail=f"Schema '{schema}' not allowed. Allowed schemas: {allowed_schemas}"
            )

        # Validate table name to prevent SQL injection
        allowed_tables = {
            "dominos_realistic": [
                "daily_sales_fact",
                "campaigns_dim",
                "campaign_performance_daily",
                "customer_acquisition_source",
                "marketing_spend_daily",
            ],
            "dominos_analytics": [
                "metric_cac_by_channel",
                "metric_arpu_by_segment",
                "metric_cohort_retention",
                "metric_gmv",
                "metric_channel_mix",
                "metric_attach_rate",
                "sales_monthly_summary",
                "channel_performance_summary",
                "customer_segment_summary",
                "product_performance_summary",
            ]
        }

        if table not in allowed_tables.get(schema, []):
            raise HTTPException(
                status_code=400,
                detail=f"Table '{table}' not allowed in schema '{schema}'. Allowed tables: {allowed_tables[schema]}"
            )

        query = f"""
        SELECT *
        FROM main.{schema}.{table}
        LIMIT {limit}
        """

        results = databricks_repo.execute_query(query)
        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing custom query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
