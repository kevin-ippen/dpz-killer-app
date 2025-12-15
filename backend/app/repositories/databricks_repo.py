"""
Databricks Unity Catalog Repository

This module provides a clean abstraction for accessing Unity Catalog tables
via Databricks SDK's statement execution API. It implements the repository pattern
for separation of concerns between data access and business logic.

Usage:
    from app.repositories.databricks_repo import databricks_repo

    # Query data
    results = databricks_repo.execute_query("SELECT * FROM catalog.schema.table LIMIT 10")

    # Access specific table
    data = databricks_repo.get_table_data("my_table", limit=100)
"""
from typing import List, Optional, Dict, Any
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class DatabricksRepository:
    """
    Repository for accessing Unity Catalog tables via Databricks SDK

    This class uses the SDK's statement execution API which automatically
    handles authentication using the same credentials as other SDK operations.

    Attributes:
        catalog: Unity Catalog catalog name
        schema: Unity Catalog schema name
        workspace_client: WorkspaceClient instance (lazy-loaded)
        warehouse_id: SQL warehouse ID extracted from http_path
    """

    def __init__(self):
        """Initialize repository with catalog and schema from settings"""
        self.catalog = settings.CATALOG
        self.schema = settings.SCHEMA
        self._workspace_client = None

        # Extract warehouse ID from http_path
        # Format: /sql/1.0/warehouses/{warehouse_id}
        if settings.DATABRICKS_HTTP_PATH:
            self.warehouse_id = settings.DATABRICKS_HTTP_PATH.split('/')[-1]
        else:
            self.warehouse_id = None

    def _get_workspace_client(self) -> WorkspaceClient:
        """Get or create WorkspaceClient for authentication"""
        if not self._workspace_client:
            logger.info("Initializing WorkspaceClient with default authentication")
            # WorkspaceClient automatically discovers credentials from environment
            # In Databricks Apps, it uses the service principal
            self._workspace_client = WorkspaceClient()
        return self._workspace_client

    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a SQL query and return results as list of dictionaries

        Uses SDK's statement execution API which handles auth automatically.

        Args:
            query: SQL query string (use :param_name for parameterized queries)
            params: Optional dictionary of query parameters

        Returns:
            List of dictionaries, where each dict represents a row

        Example:
            results = repo.execute_query(
                "SELECT * FROM catalog.schema.table WHERE id = :id",
                {"id": "123"}
            )
        """
        if not self.warehouse_id:
            raise ValueError("DATABRICKS_HTTP_PATH not configured")

        try:
            # Replace named parameters with values (simple string substitution)
            if params:
                for key, value in params.items():
                    # Basic SQL escaping
                    if isinstance(value, str):
                        escaped_value = value.replace("'", "''")
                        query = query.replace(f":{key}", f"'{escaped_value}'")
                    else:
                        query = query.replace(f":{key}", str(value))

            logger.debug(f"Executing query: {query}")

            ws = self._get_workspace_client()

            # Execute statement using SDK (handles auth automatically)
            statement = ws.statement_execution.execute_statement(
                warehouse_id=self.warehouse_id,
                statement=query,
                catalog=self.catalog,
                schema=self.schema
            )

            # Check if execution succeeded
            if statement.status.state != StatementState.SUCCEEDED:
                error_msg = f"Query failed with state: {statement.status.state}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)

            # Parse results
            if not statement.result or not statement.result.data_array:
                logger.debug("Query returned 0 rows")
                return []

            # Get column names
            columns = [col.name for col in statement.manifest.schema.columns]

            # Convert rows to list of dicts
            results = []
            for row in statement.result.data_array:
                # Handle both list and object row formats
                if isinstance(row, (list, tuple)):
                    row_values = row
                elif hasattr(row, 'values'):
                    row_values = row.values
                else:
                    try:
                        row_values = list(row)
                    except:
                        row_values = [row]

                results.append(dict(zip(columns, row_values)))

            logger.debug(f"Query returned {len(results)} rows")
            return results

        except Exception as e:
            logger.error(f"Query execution failed: {e}", exc_info=True)
            raise

    def get_table_data(
        self,
        table_name: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        where_clause: Optional[str] = None,
        order_by: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get data from a Unity Catalog table with optional filtering

        Args:
            table_name: Name of the table (without catalog/schema prefix)
            limit: Maximum number of rows to return
            offset: Number of rows to skip (for pagination)
            where_clause: SQL WHERE clause (without 'WHERE' keyword)
            order_by: SQL ORDER BY clause (without 'ORDER BY' keyword)

        Returns:
            List of dictionaries representing table rows

        Example:
            products = repo.get_table_data(
                "products",
                limit=10,
                where_clause="price > 100",
                order_by="price DESC"
            )
        """
        query_parts = [f"SELECT * FROM {self.catalog}.{self.schema}.{table_name}"]

        if where_clause:
            query_parts.append(f"WHERE {where_clause}")

        if order_by:
            query_parts.append(f"ORDER BY {order_by}")

        if limit:
            query_parts.append(f"LIMIT {limit}")

        if offset:
            query_parts.append(f"OFFSET {offset}")

        query = " ".join(query_parts)
        return self.execute_query(query)

    def get_count(
        self,
        table_name: str,
        where_clause: Optional[str] = None
    ) -> int:
        """
        Get count of rows in a table

        Args:
            table_name: Name of the table
            where_clause: Optional WHERE clause for filtering

        Returns:
            Number of rows matching the criteria
        """
        query = f"SELECT COUNT(*) as count FROM {self.catalog}.{self.schema}.{table_name}"

        if where_clause:
            query += f" WHERE {where_clause}"

        result = self.execute_query(query)
        return result[0]["count"] if result else 0

    def close(self):
        """
        Clean up resources

        The SDK's statement execution API doesn't maintain persistent connections,
        so there's nothing to close. This method is kept for API compatibility.
        """
        # No persistent connection to close with statement execution API
        # SDK handles connection lifecycle automatically
        self._workspace_client = None
        logger.info("Databricks repository resources cleaned up")


# Global repository instance
# Import and use this singleton instance throughout your application
databricks_repo = DatabricksRepository()
