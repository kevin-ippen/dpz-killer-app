"""
Genie API routes for chart hydration and data fetching

This module provides endpoints for fetching Genie Space query results
and converting them to chart specifications for visualization.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from databricks.sdk import WorkspaceClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/genie", tags=["genie"])


# ============================================================================
# Request/Response Models
# ============================================================================

class GenieChartRequest(BaseModel):
    """Request to hydrate a chart from Genie"""
    spaceId: str
    conversationId: str
    messageId: str
    attachmentId: str


class TablePreview(BaseModel):
    """Table preview data"""
    columns: list[str]
    rows: list[list]


class ChartHydrationResponse(BaseModel):
    """Response with chart spec and optional table data"""
    spec: dict
    table: Optional[TablePreview] = None


# ============================================================================
# Chart Hydration Logic
# ============================================================================

def fetch_genie_query_result(
    client: WorkspaceClient,
    space_id: str,
    conversation_id: str,
    message_id: str,
    attachment_id: str
) -> dict:
    """
    Fetch query result from Genie Space

    Uses Databricks SDK genie_spaces API to get query results.
    Falls back to executing the query if cached result expired.
    """
    try:
        logger.info(f"Fetching Genie query result: space={space_id}, conv={conversation_id}, msg={message_id}, attach={attachment_id}")

        # Try to get cached result first
        try:
            result = client.genie.get_message_query_result(
                space_id=space_id,
                conversation_id=conversation_id,
                message_id=message_id,
                attachment_id=attachment_id
            )
            logger.info("Retrieved cached query result from Genie")
            return result.as_dict()
        except Exception as cache_err:
            logger.warning(f"Cached result not available: {cache_err}, will execute query")

        # Fall back to executing the query
        execution_result = client.genie.execute_message_query(
            space_id=space_id,
            conversation_id=conversation_id,
            message_id=message_id,
            attachment_id=attachment_id
        )

        logger.info("Executed Genie query successfully")
        return execution_result.as_dict()

    except Exception as e:
        logger.error(f"Failed to fetch Genie query result: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch chart data from Genie: {str(e)}"
        )


def convert_to_recharts_spec(query_result: dict) -> dict:
    """
    Convert Genie query result to Recharts specification

    Args:
        query_result: Raw Genie query result with statement_response

    Returns:
        Recharts-compatible spec dict
    """
    try:
        # Extract statement response
        statement = query_result.get("statement_response")
        if not statement:
            raise ValueError("No statement_response in query result")

        manifest = statement.get("manifest", {})
        result_data = statement.get("result", {})

        # Get columns
        schema_cols = manifest.get("schema", {}).get("columns", [])
        columns = [col.get("name") for col in schema_cols]

        if not columns:
            raise ValueError("No columns found in query result")

        # Get data rows
        data_array = result_data.get("data_array", [])

        # Convert to list of dicts for Recharts
        chart_data = []
        for row in data_array:
            row_dict = {}
            for idx, col_name in enumerate(columns):
                row_dict[col_name] = row[idx] if idx < len(row) else None
            chart_data.append(row_dict)

        logger.info(f"Converted query result to chart data: {len(chart_data)} rows, {len(columns)} columns")

        # Determine chart type based on columns
        # Simple heuristic: if 2 columns, make a bar/line chart
        # First column is typically the dimension (x-axis)
        # Second column is the measure (y-axis)

        if len(columns) >= 2:
            x_key = columns[0]
            y_key = columns[1]

            # Default to bar chart
            spec = {
                "type": "bar",
                "data": chart_data,
                "xKey": x_key,
                "yKey": y_key,
                "dataKey": y_key
            }

            logger.info(f"Generated bar chart spec: xKey={x_key}, yKey={y_key}")

        else:
            # Single column - make a simple value display (not a typical chart)
            spec = {
                "type": "bar",
                "data": chart_data,
                "xKey": columns[0],
                "yKey": columns[0],
                "dataKey": columns[0]
            }
            logger.warning(f"Single column chart generated for: {columns[0]}")

        return spec

    except Exception as e:
        logger.error(f"Failed to convert query result to chart spec: {e}", exc_info=True)
        raise ValueError(f"Failed to convert to chart spec: {str(e)}")


def extract_table_preview(query_result: dict, limit: int = 100) -> Optional[TablePreview]:
    """
    Extract table preview from Genie query result

    Args:
        query_result: Raw Genie query result
        limit: Maximum number of rows to return

    Returns:
        TablePreview or None
    """
    try:
        statement = query_result.get("statement_response")
        if not statement:
            return None

        manifest = statement.get("manifest", {})
        result_data = statement.get("result", {})

        # Get columns
        schema_cols = manifest.get("schema", {}).get("columns", [])
        columns = [col.get("name") for col in schema_cols]

        # Get rows (limited)
        data_array = result_data.get("data_array", [])
        rows = data_array[:limit]

        return TablePreview(columns=columns, rows=rows)

    except Exception as e:
        logger.warning(f"Failed to extract table preview: {e}")
        return None


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/chart", response_model=ChartHydrationResponse)
async def hydrate_chart(request: GenieChartRequest):
    """
    Hydrate a chart by fetching data from Genie Space

    This endpoint takes Genie reference coordinates (spaceId, conversationId,
    messageId, attachmentId) and returns a chart specification ready for rendering
    along with an optional table preview of the underlying data.

    The chart spec is in Recharts format for easy visualization.
    """
    try:
        # Initialize Databricks client
        client = WorkspaceClient()

        # Fetch query result from Genie
        query_result = fetch_genie_query_result(
            client=client,
            space_id=request.spaceId,
            conversation_id=request.conversationId,
            message_id=request.messageId,
            attachment_id=request.attachmentId
        )

        # Convert to chart spec
        spec = convert_to_recharts_spec(query_result)

        # Extract table preview
        table = extract_table_preview(query_result)

        return ChartHydrationResponse(spec=spec, table=table)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chart hydration failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to hydrate chart: {str(e)}"
        )
