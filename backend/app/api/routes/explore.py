"""
Explore API routes for Unity Catalog asset browsing

Provides endpoints for discovering and accessing tables, volumes, and files
from Unity Catalog schemas.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from databricks.sdk import WorkspaceClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/explore", tags=["explore"])


# ============================================================================
# Response Models
# ============================================================================

class TableInfo(BaseModel):
    """Table metadata"""
    name: str
    full_name: str
    table_type: Optional[str] = None
    data_source_format: Optional[str] = None
    storage_location: Optional[str] = None
    comment: Optional[str] = None
    created_at: Optional[int] = None
    updated_at: Optional[int] = None


class VolumeInfo(BaseModel):
    """Volume metadata"""
    name: str
    full_name: str
    volume_type: Optional[str] = None
    storage_location: Optional[str] = None
    comment: Optional[str] = None
    created_at: Optional[int] = None
    updated_at: Optional[int] = None


class FileInfo(BaseModel):
    """File metadata within a volume"""
    name: str
    path: str
    is_directory: bool
    file_size: Optional[int] = None
    last_modified: Optional[int] = None


class SchemaAssets(BaseModel):
    """Assets within a schema"""
    catalog: str
    schema: str
    tables: List[TableInfo]
    volumes: List[VolumeInfo]


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/schemas", response_model=List[SchemaAssets])
async def get_all_schemas():
    """
    Get assets from all configured schemas using SQL information_schema:
    - main.dominos_analytics
    - main.dominos_realistic
    - main.dominos_files

    Uses SQL queries instead of SDK APIs to work with existing permissions.
    """
    try:
        from app.repositories.databricks_repo import databricks_repo

        schemas = [
            ("main", "dominos_analytics"),
            ("main", "dominos_realistic"),
            ("main", "dominos_files"),
        ]

        results = []

        for catalog, schema in schemas:
            try:
                schema_assets = get_schema_assets_sql(databricks_repo, catalog, schema)
                results.append(schema_assets)
            except Exception as e:
                logger.warning(f"Failed to fetch {catalog}.{schema}: {e}")
                # Continue with other schemas even if one fails
                results.append(SchemaAssets(
                    catalog=catalog,
                    schema=schema,
                    tables=[],
                    volumes=[]
                ))

        return results

    except Exception as e:
        logger.error(f"Error fetching schemas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def get_schema_assets_sql(repo, catalog: str, schema: str) -> SchemaAssets:
    """
    Get all tables and volumes from a schema using SQL information_schema queries.

    This approach uses the same SQL permissions as chat queries, avoiding
    potential SDK API permission issues.
    """
    tables = []
    volumes = []

    # Get tables from information_schema
    try:
        tables_query = f"""
        SELECT
            table_name,
            table_catalog || '.' || table_schema || '.' || table_name as full_name,
            table_type,
            comment
        FROM system.information_schema.tables
        WHERE table_catalog = '{catalog}'
        AND table_schema = '{schema}'
        ORDER BY table_name
        """

        table_results = repo.execute_query(tables_query)

        for row in table_results:
            tables.append(TableInfo(
                name=row.get("table_name"),
                full_name=row.get("full_name"),
                table_type=row.get("table_type"),
                comment=row.get("comment"),
            ))

        logger.info(f"Found {len(tables)} tables in {catalog}.{schema}")

    except Exception as e:
        logger.warning(f"Failed to list tables in {catalog}.{schema}: {e}")

    # Get volumes from information_schema
    try:
        volumes_query = f"""
        SELECT
            volume_name,
            volume_catalog || '.' || volume_schema || '.' || volume_name as full_name,
            volume_type,
            storage_location,
            comment
        FROM system.information_schema.volumes
        WHERE volume_catalog = '{catalog}'
        AND volume_schema = '{schema}'
        ORDER BY volume_name
        """

        volume_results = repo.execute_query(volumes_query)

        for row in volume_results:
            volumes.append(VolumeInfo(
                name=row.get("volume_name"),
                full_name=row.get("full_name"),
                volume_type=row.get("volume_type"),
                storage_location=row.get("storage_location"),
                comment=row.get("comment"),
            ))

        logger.info(f"Found {len(volumes)} volumes in {catalog}.{schema}")

    except Exception as e:
        logger.warning(f"Failed to list volumes in {catalog}.{schema}: {e}")

    return SchemaAssets(
        catalog=catalog,
        schema=schema,
        tables=tables,
        volumes=volumes
    )


@router.get("/volumes/{catalog}/{schema}/{volume}/files", response_model=List[FileInfo])
async def list_volume_files(
    catalog: str,
    schema: str,
    volume: str,
    path: str = Query("/", description="Path within the volume")
):
    """
    List files within a specific volume

    Args:
        catalog: Catalog name
        schema: Schema name
        volume: Volume name
        path: Path within the volume (default: root "/")
    """
    try:
        client = WorkspaceClient()

        # Construct volume path
        volume_path = f"/Volumes/{catalog}/{schema}/{volume}{path}"

        logger.info(f"Listing files in: {volume_path}")

        files = client.files.list_directory_contents(volume_path)

        return [
            FileInfo(
                name=f.name,
                path=f.path,
                is_directory=f.is_directory,
                file_size=f.file_size,
                last_modified=f.last_modified,
            )
            for f in files
        ]

    except Exception as e:
        logger.error(f"Error listing volume files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tables/{catalog}/{schema}/{table}/preview")
async def preview_table(
    catalog: str,
    schema: str,
    table: str,
    limit: int = Query(100, ge=1, le=1000, description="Number of rows to return")
):
    """
    Preview table data (first N rows)

    Args:
        catalog: Catalog name
        schema: Schema name
        table: Table name
        limit: Number of rows (default: 100, max: 1000)
    """
    try:
        from app.repositories.databricks_repo import databricks_repo

        full_name = f"{catalog}.{schema}.{table}"

        query = f"""
        SELECT *
        FROM {full_name}
        LIMIT {limit}
        """

        results = databricks_repo.execute_query(query)

        # Extract column names from first row (if exists)
        columns = list(results[0].keys()) if results else []

        return {
            "table": full_name,
            "columns": columns,
            "rows": results,
            "row_count": len(results)
        }

    except Exception as e:
        logger.error(f"Error previewing table {catalog}.{schema}.{table}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/proxy")
async def proxy_file(path: str = Query(..., description="Full Unity Catalog volume path")):
    """
    Proxy endpoint for Unity Catalog volume files (especially PDFs)

    This endpoint fetches files from Unity Catalog volumes with proper
    authentication and returns them with headers suitable for browser embedding.

    Args:
        path: Full path to file (e.g., /Volumes/main/schema/volume/file.pdf)

    Returns:
        File content with appropriate Content-Type headers
    """
    try:
        client = WorkspaceClient()

        logger.info(f"Proxying file from UC: {path}")

        # Read file content from Unity Catalog
        file_content = client.files.download(path).contents.read()

        # Determine content type based on file extension
        content_type = "application/octet-stream"
        if path.lower().endswith('.pdf'):
            content_type = "application/pdf"
        elif path.lower().endswith('.png'):
            content_type = "image/png"
        elif path.lower().endswith('.jpg') or path.lower().endswith('.jpeg'):
            content_type = "image/jpeg"
        elif path.lower().endswith('.txt'):
            content_type = "text/plain"
        elif path.lower().endswith('.json'):
            content_type = "application/json"

        # Return file with appropriate headers for embedding
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Content-Disposition": "inline",  # Display in browser, not download
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            }
        )

    except Exception as e:
        logger.error(f"Error proxying file {path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch file: {str(e)}")
