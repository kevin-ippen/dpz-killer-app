"""
Databricks Unity Catalog API Service
=====================================
Backend service for the Data Explorer component.
Designed to run within a Databricks App context.
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from functools import lru_cache
import os

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.catalog import (
    TableInfo,
    SchemaInfo,
    VolumeInfo,
    ColumnInfo,
)
from databricks.sdk.service.sql import StatementState

# Initialize workspace client (auto-configures in Databricks App context)
w = WorkspaceClient()


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class Domain:
    """Logical grouping for data assets"""
    id: str
    name: str
    icon: str
    color: str
    description: Optional[str] = None


@dataclass
class TableMetadata:
    """Enriched table information for the UI"""
    name: str
    full_name: str
    table_type: str
    data_source_format: Optional[str]
    owner: str
    domain: Optional[str]
    updated_at: str
    row_count: Optional[int]
    size_bytes: Optional[int]
    columns: List[str]
    column_details: Optional[List[Dict[str, Any]]]
    tags: List[str]
    comment: Optional[str]


@dataclass
class VolumeMetadata:
    """Enriched volume information for the UI"""
    name: str
    full_name: str
    volume_type: str
    owner: str
    updated_at: str
    file_count: Optional[int]
    size_bytes: Optional[int]
    comment: Optional[str]


@dataclass
class SchemaMetadata:
    """Schema information with statistics"""
    name: str
    full_name: str
    comment: Optional[str]
    owner: str
    table_count: int
    volume_count: int


# =============================================================================
# DOMAIN CONFIGURATION
# =============================================================================

# Define your organization's data domains
# These can be loaded from a config file or database
DEFAULT_DOMAINS = [
    Domain(id="finance", name="Finance", icon="💰", color="#10B981",
           description="Financial data, revenue, costs, budgets"),
    Domain(id="marketing", name="Marketing", icon="📊", color="#6366F1",
           description="Campaign data, attribution, channels"),
    Domain(id="operations", name="Operations", icon="⚙️", color="#F59E0B",
           description="Orders, fulfillment, logistics"),
    Domain(id="customers", name="Customers", icon="👥", color="#EC4899",
           description="Customer profiles, segments, behavior"),
    Domain(id="products", name="Products", icon="📦", color="#8B5CF6",
           description="Product catalog, inventory, pricing"),
    Domain(id="hr", name="Human Resources", icon="👔", color="#14B8A6",
           description="Employee data, payroll, performance"),
]


def get_domains() -> List[Dict[str, Any]]:
    """Return all configured domains"""
    return [asdict(d) for d in DEFAULT_DOMAINS]


# =============================================================================
# UNITY CATALOG API FUNCTIONS
# =============================================================================

def list_catalogs() -> List[Dict[str, str]]:
    """List all accessible catalogs"""
    catalogs = w.catalogs.list()
    return [
        {
            "name": c.name,
            "comment": c.comment,
            "owner": c.owner,
        }
        for c in catalogs
    ]


def list_schemas(catalog_name: str) -> List[Dict[str, Any]]:
    """List schemas in a catalog with table counts"""
    schemas = w.schemas.list(catalog_name=catalog_name)
    result = []
    
    for schema in schemas:
        # Skip internal schemas
        if schema.name in ("information_schema", "default"):
            continue
            
        # Get counts (could be optimized with parallel requests)
        tables = list(w.tables.list(
            catalog_name=catalog_name,
            schema_name=schema.name
        ))
        volumes = list(w.volumes.list(
            catalog_name=catalog_name,
            schema_name=schema.name
        ))
        
        result.append({
            "name": schema.name,
            "full_name": schema.full_name,
            "comment": schema.comment,
            "owner": schema.owner,
            "table_count": len(tables),
            "volume_count": len(volumes),
        })
    
    return result


def list_tables(
    catalog_name: str,
    schema_name: str,
    include_stats: bool = False,
    sql_warehouse_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    List tables in a schema with optional statistics.
    
    Args:
        catalog_name: Unity Catalog name
        schema_name: Schema name
        include_stats: Whether to fetch row counts and sizes (slower)
        sql_warehouse_id: Required if include_stats=True
    """
    tables = w.tables.list(
        catalog_name=catalog_name,
        schema_name=schema_name
    )
    
    result = []
    for table in tables:
        # Extract domain from tags/properties
        domain = _extract_domain(table)
        
        # Extract tags
        tags = _extract_tags(table)
        
        table_data = {
            "name": table.name,
            "full_name": table.full_name,
            "table_type": table.table_type.value if table.table_type else "UNKNOWN",
            "data_source_format": (
                table.data_source_format.value 
                if table.data_source_format else None
            ),
            "owner": table.owner,
            "domain": domain,
            "updated_at": _format_timestamp(table.updated_at),
            "columns": [col.name for col in (table.columns or [])],
            "column_details": [
                {
                    "name": col.name,
                    "type": col.type_text,
                    "nullable": col.nullable,
                    "comment": col.comment,
                }
                for col in (table.columns or [])
            ],
            "tags": tags,
            "comment": table.comment,
            "row_count": None,
            "size_bytes": None,
        }
        
        # Optionally fetch statistics
        if include_stats and sql_warehouse_id:
            stats = get_table_stats(table.full_name, sql_warehouse_id)
            table_data["row_count"] = stats.get("numRows")
            table_data["size_bytes"] = stats.get("sizeInBytes")
        
        result.append(table_data)
    
    return result


def get_table_details(full_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific table"""
    table = w.tables.get(full_name=full_name)
    
    return {
        "name": table.name,
        "full_name": table.full_name,
        "table_type": table.table_type.value if table.table_type else None,
        "data_source_format": (
            table.data_source_format.value 
            if table.data_source_format else None
        ),
        "owner": table.owner,
        "created_at": _format_timestamp(table.created_at),
        "updated_at": _format_timestamp(table.updated_at),
        "comment": table.comment,
        "properties": table.properties,
        "storage_location": table.storage_location,
        "columns": [
            {
                "name": col.name,
                "type": col.type_text,
                "nullable": col.nullable,
                "comment": col.comment,
                "partition_index": col.partition_index,
            }
            for col in (table.columns or [])
        ],
        "tags": _extract_tags(table),
        "domain": _extract_domain(table),
    }


def list_volumes(catalog_name: str, schema_name: str) -> List[Dict[str, Any]]:
    """List volumes in a schema"""
    volumes = w.volumes.list(
        catalog_name=catalog_name,
        schema_name=schema_name
    )
    
    return [
        {
            "name": v.name,
            "full_name": v.full_name,
            "volume_type": v.volume_type.value if v.volume_type else "UNKNOWN",
            "owner": v.owner,
            "updated_at": _format_timestamp(v.updated_at),
            "comment": v.comment,
            "storage_location": v.storage_location,
            # Note: file_count and size_bytes require additional API calls
            "file_count": None,
            "size_bytes": None,
        }
        for v in volumes
    ]


def get_table_stats(
    full_name: str,
    sql_warehouse_id: str
) -> Dict[str, Any]:
    """
    Get table statistics using DESCRIBE DETAIL.
    Works best with Delta tables.
    """
    try:
        result = w.statement_execution.execute_statement(
            warehouse_id=sql_warehouse_id,
            statement=f"DESCRIBE DETAIL `{full_name}`",
            wait_timeout="30s"
        )
        
        if result.status.state != StatementState.SUCCEEDED:
            return {}
        
        # Parse the result
        if result.result and result.result.data_array:
            row = result.result.data_array[0]
            columns = [c.name for c in result.manifest.schema.columns]
            data = dict(zip(columns, row))
            
            return {
                "numFiles": int(data.get("numFiles", 0)),
                "sizeInBytes": int(data.get("sizeInBytes", 0)),
                "numRows": int(data.get("numRows", 0)) if data.get("numRows") else None,
                "partitionColumns": data.get("partitionColumns"),
                "lastModified": data.get("lastModified"),
            }
    except Exception as e:
        print(f"Error getting stats for {full_name}: {e}")
    
    return {}


# =============================================================================
# DOMAIN MANAGEMENT
# =============================================================================

def set_table_domain(full_name: str, domain_id: str) -> bool:
    """
    Assign a domain to a table using tags.
    
    Note: Requires appropriate permissions on the table.
    """
    try:
        # Get current table
        table = w.tables.get(full_name=full_name)
        
        # Update properties with domain
        current_props = table.properties or {}
        current_props["domain"] = domain_id
        
        # Update table (requires ALTER permission)
        w.tables.update(
            full_name=full_name,
            properties=current_props
        )
        return True
    except Exception as e:
        print(f"Error setting domain for {full_name}: {e}")
        return False


def get_tables_by_domain(
    catalog_name: str,
    domain_id: str
) -> List[Dict[str, Any]]:
    """Get all tables in a catalog that belong to a specific domain"""
    all_tables = []
    
    # Iterate through all schemas
    schemas = w.schemas.list(catalog_name=catalog_name)
    for schema in schemas:
        if schema.name in ("information_schema", "default"):
            continue
            
        tables = list_tables(catalog_name, schema.name)
        domain_tables = [t for t in tables if t.get("domain") == domain_id]
        all_tables.extend(domain_tables)
    
    return all_tables


# =============================================================================
# SEARCH FUNCTIONALITY
# =============================================================================

def search_tables(
    catalog_name: str,
    query: str,
    schema_name: Optional[str] = None,
    domain_id: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Search tables by name, column names, or tags.
    
    This is an application-level search. For production use at scale,
    consider using Unity Catalog's search APIs or building a search index.
    """
    query_lower = query.lower()
    results = []
    
    schemas_to_search = []
    if schema_name:
        schemas_to_search = [schema_name]
    else:
        schemas = w.schemas.list(catalog_name=catalog_name)
        schemas_to_search = [
            s.name for s in schemas 
            if s.name not in ("information_schema", "default")
        ]
    
    for schema in schemas_to_search:
        tables = list_tables(catalog_name, schema)
        
        for table in tables:
            # Filter by domain if specified
            if domain_id and table.get("domain") != domain_id:
                continue
            
            # Search in name
            if query_lower in table["name"].lower():
                results.append(table)
                continue
            
            # Search in columns
            if any(query_lower in col.lower() for col in table.get("columns", [])):
                results.append(table)
                continue
            
            # Search in tags
            if any(query_lower in tag.lower() for tag in table.get("tags", [])):
                results.append(table)
                continue
            
            # Search in comment
            if table.get("comment") and query_lower in table["comment"].lower():
                results.append(table)
                continue
        
        if len(results) >= limit:
            break
    
    return results[:limit]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _extract_domain(table: TableInfo) -> Optional[str]:
    """Extract domain from table properties or tags"""
    props = table.properties or {}
    
    # Check properties
    if "domain" in props:
        return props["domain"]
    
    # Check for domain tag (Unity Catalog tags are in properties)
    for key, value in props.items():
        if key.lower() == "tag.domain":
            return value
    
    return None


def _extract_tags(table: TableInfo) -> List[str]:
    """Extract tags from table properties"""
    props = table.properties or {}
    tags = []
    
    for key, value in props.items():
        if key.startswith("tag."):
            tag_name = key[4:]  # Remove "tag." prefix
            tags.append(f"{tag_name}:{value}" if value else tag_name)
    
    return tags


def _format_timestamp(ts) -> Optional[str]:
    """Format timestamp for JSON serialization"""
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts.isoformat()
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000).isoformat()
    return str(ts)


# =============================================================================
# FLASK/FASTAPI INTEGRATION
# =============================================================================

# Example FastAPI integration
"""
from fastapi import FastAPI, HTTPException, Query
from typing import Optional

app = FastAPI(title="Data Explorer API")

@app.get("/api/catalogs")
def api_list_catalogs():
    return list_catalogs()

@app.get("/api/catalogs/{catalog_name}/schemas")
def api_list_schemas(catalog_name: str):
    return list_schemas(catalog_name)

@app.get("/api/catalogs/{catalog_name}/schemas/{schema_name}/tables")
def api_list_tables(
    catalog_name: str,
    schema_name: str,
    include_stats: bool = Query(False),
):
    warehouse_id = os.getenv("SQL_WAREHOUSE_ID") if include_stats else None
    return list_tables(catalog_name, schema_name, include_stats, warehouse_id)

@app.get("/api/tables/{full_name:path}")
def api_get_table(full_name: str):
    try:
        return get_table_details(full_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/search")
def api_search(
    catalog_name: str,
    q: str,
    schema_name: Optional[str] = None,
    domain: Optional[str] = None,
):
    return search_tables(catalog_name, q, schema_name, domain)

@app.get("/api/domains")
def api_domains():
    return get_domains()
"""


# =============================================================================
# USAGE EXAMPLE
# =============================================================================

if __name__ == "__main__":
    # Example usage
    catalog = "main"
    
    print("=== Catalogs ===")
    for cat in list_catalogs():
        print(f"  {cat['name']}")
    
    print("\n=== Schemas ===")
    for schema in list_schemas(catalog):
        print(f"  {schema['name']}: {schema['table_count']} tables")
    
    print("\n=== Tables in 'gold' schema ===")
    tables = list_tables(catalog, "gold")
    for t in tables[:5]:
        print(f"  {t['name']} ({t['table_type']}) - {len(t['columns'])} columns")
    
    print("\n=== Search for 'customer' ===")
    results = search_tables(catalog, "customer")
    for r in results:
        print(f"  {r['full_name']}")
