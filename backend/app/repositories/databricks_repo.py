"""
Databricks Unity Catalog Repository

This module provides a clean abstraction for accessing Unity Catalog tables
via Databricks SQL Connector. It implements the repository pattern for
separation of concerns between data access and business logic.

Usage:
    from app.repositories.databricks_repo import databricks_repo

    # Query data
    results = databricks_repo.execute_query("SELECT * FROM catalog.schema.table LIMIT 10")

    # Access specific table
    data = databricks_repo.get_table_data("my_table", limit=100)
"""
from typing import List, Optional, Dict, Any
from databricks import sql
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class DatabricksRepository:
    """
    Repository for accessing Unity Catalog tables via Databricks SQL

    This class manages the connection to Databricks SQL warehouse and provides
    methods for executing queries against Unity Catalog tables.

    Attributes:
        catalog: Unity Catalog catalog name
        schema: Unity Catalog schema name
        connection: Active Databricks SQL connection (lazy-loaded)
    """

    def __init__(self):
        """Initialize repository with catalog and schema from settings"""
        self.catalog = settings.CATALOG
        self.schema = settings.SCHEMA
        self.connection = None

    def _get_connection(self):
        """
        Get or create Databricks SQL connection

        Connection is created lazily on first use and reused for subsequent queries.
        Uses Databricks SDK's default credential provider which automatically
        discovers credentials from environment (Databricks Apps service principal).

        Returns:
            Active Databricks SQL connection

        Raises:
            ValueError: If required Databricks credentials are not set
        """
        if self.connection is None:
            # Try explicit credentials first (for local development)
            if settings.DATABRICKS_HOST and settings.DATABRICKS_TOKEN and settings.DATABRICKS_HTTP_PATH:
                logger.info(f"Connecting to Databricks SQL warehouse with explicit credentials: {settings.DATABRICKS_HOST}")
                self.connection = sql.connect(
                    server_hostname=settings.DATABRICKS_HOST,
                    http_path=settings.DATABRICKS_HTTP_PATH,
                    access_token=settings.DATABRICKS_TOKEN
                )
            elif settings.DATABRICKS_HTTP_PATH:
                # Use default credentials (Databricks Apps service principal)
                logger.info("Connecting to Databricks SQL warehouse with default credentials (service principal)")
                self.connection = sql.connect(
                    http_path=settings.DATABRICKS_HTTP_PATH
                )
            else:
                raise ValueError(
                    "Missing Databricks credentials. Set DATABRICKS_HTTP_PATH at minimum. "
                    "For local dev, also set DATABRICKS_HOST and DATABRICKS_TOKEN."
                )
        return self.connection

    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a SQL query and return results as list of dictionaries

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
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            logger.debug(f"Executing query: {query}")
            cursor.execute(query, params or {})

            # Get column names from cursor description
            columns = [desc[0] for desc in cursor.description]

            # Convert rows to list of dicts
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))

            logger.debug(f"Query returned {len(results)} rows")
            return results

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise

        finally:
            cursor.close()

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
        Close the database connection

        Should be called during application shutdown.
        Connection will be automatically recreated if needed after close.
        """
        if self.connection:
            logger.info("Closing Databricks SQL connection")
            self.connection.close()
            self.connection = None


# Global repository instance
# Import and use this singleton instance throughout your application
databricks_repo = DatabricksRepository()
