"""
Explore API routes for Unity Catalog asset browsing

Provides endpoints for discovering and accessing tables, volumes, and files
from Unity Catalog schemas.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
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
    Get assets from all configured schemas:
    - main.dominos_analytics
    - main.dominos_realistic
    - main.dominos_files
    """
    try:
        client = WorkspaceClient()

        schemas = [
            ("main", "dominos_analytics"),
            ("main", "dominos_realistic"),
            ("main", "dominos_files"),
        ]

        results = []

        for catalog, schema in schemas:
            try:
                schema_assets = await get_schema_assets(client, catalog, schema)
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


async def get_schema_assets(client: WorkspaceClient, catalog: str, schema: str) -> SchemaAssets:
    """Get all tables and volumes from a schema"""
    tables = []
    volumes = []

    # Get tables
    try:
        table_list = client.tables.list(catalog_name=catalog, schema_name=schema)
        for table in table_list:
            tables.append(TableInfo(
                name=table.name,
                full_name=table.full_name,
                table_type=table.table_type.value if table.table_type else None,
                data_source_format=table.data_source_format.value if table.data_source_format else None,
                storage_location=table.storage_location,
                comment=table.comment,
                created_at=table.created_at,
                updated_at=table.updated_at,
            ))
    except Exception as e:
        logger.warning(f"Failed to list tables in {catalog}.{schema}: {e}")

    # Get volumes
    try:
        volume_list = client.volumes.list(catalog_name=catalog, schema_name=schema)
        for volume in volume_list:
            volumes.append(VolumeInfo(
                name=volume.name,
                full_name=volume.full_name,
                volume_type=volume.volume_type.value if volume.volume_type else None,
                storage_location=volume.storage_location,
                comment=volume.comment,
                created_at=volume.created_at,
                updated_at=volume.updated_at,
            ))
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
