# Databricks Data Explorer Pattern

A production-ready pattern for building a clean, user-friendly data explorer UI within Databricks Apps, featuring Unity Catalog integration, domain-based organization, and a polished user experience.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABRICKS APP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────────────────────┐  ┌────────────┐ │
│  │   Sidebar   │  │           Main Content               │  │   Detail   │ │
│  │             │  │                                      │  │   Panel    │ │
│  │ • Catalog   │  │  ┌─────────────────────────────────┐ │  │            │ │
│  │ • Schemas   │  │  │  Search + Filters + View Toggle │ │  │ • Metadata │ │
│  │ • Domains   │  │  └─────────────────────────────────┘ │  │ • Columns  │ │
│  │             │  │  ┌─────────────────────────────────┐ │  │ • Tags     │ │
│  │             │  │  │     Table/Volume List View      │ │  │ • Actions  │ │
│  │             │  │  │         or Grid View            │ │  │            │ │
│  │             │  │  └─────────────────────────────────┘ │  │            │ │
│  └─────────────┘  └──────────────────────────────────────┘  └────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                        DATABRICKS SDK / REST API                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Unity Catalog   │  │     Volumes      │  │   Custom Metadata (Tags) │   │
│  │  Tables API      │  │       API        │  │   for Domain Concepts    │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. **Unified Search**
- Full-text search across table names, column names, and tags
- Real-time filtering as you type
- Column-aware search (find tables containing specific column names)

### 2. **Domain Organization**
- Logical grouping of tables by business domain (Finance, Marketing, etc.)
- Visual icons and color coding per domain
- Filter by domain to focus on relevant data assets

### 3. **Dual View Modes**
- **List View**: Dense, sortable table for power users
- **Grid View**: Visual cards for browsing and discovery

### 4. **Rich Metadata Display**
- Table type (Managed/External)
- Data format (Delta, Parquet, etc.)
- Row counts, storage size
- Column preview
- Tags and ownership

### 5. **Quick Actions**
- Copy full table path to clipboard
- Open in Catalog Explorer
- Launch SQL query

---

## Databricks API Integration

### Unity Catalog REST API Endpoints

```python
# In your Databricks App backend (Python/Flask or FastAPI)

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.catalog import *

w = WorkspaceClient()

# List all schemas in a catalog
@app.get("/api/schemas/{catalog_name}")
def list_schemas(catalog_name: str):
    schemas = w.schemas.list(catalog_name=catalog_name)
    return [
        {
            "name": s.name,
            "full_name": s.full_name,
            "comment": s.comment,
            "owner": s.owner
        }
        for s in schemas
    ]

# List tables in a schema
@app.get("/api/tables/{catalog_name}/{schema_name}")
def list_tables(catalog_name: str, schema_name: str):
    tables = w.tables.list(
        catalog_name=catalog_name,
        schema_name=schema_name
    )
    return [
        {
            "name": t.name,
            "full_name": t.full_name,
            "table_type": t.table_type.value,
            "data_source_format": t.data_source_format.value if t.data_source_format else None,
            "owner": t.owner,
            "updated_at": t.updated_at,
            "columns": [c.name for c in (t.columns or [])],
            # Custom domain from tags
            "domain": get_domain_from_tags(t.properties)
        }
        for t in tables
    ]

# List volumes in a schema
@app.get("/api/volumes/{catalog_name}/{schema_name}")
def list_volumes(catalog_name: str, schema_name: str):
    volumes = w.volumes.list(
        catalog_name=catalog_name,
        schema_name=schema_name
    )
    return [
        {
            "name": v.name,
            "full_name": v.full_name,
            "volume_type": v.volume_type.value,
            "owner": v.owner,
            "updated_at": v.updated_at
        }
        for v in volumes
    ]

# Get table statistics (row count, size)
@app.get("/api/tables/{full_name}/stats")
def get_table_stats(full_name: str):
    # Use SQL to get detailed stats
    stats = w.statement_execution.execute_statement(
        warehouse_id=WAREHOUSE_ID,
        statement=f"DESCRIBE DETAIL `{full_name}`"
    )
    return parse_stats(stats)
```

### REST API Equivalent (Direct HTTP)

```javascript
// Frontend API service for direct REST calls

const DATABRICKS_HOST = window.location.origin; // In Databricks App context

const api = {
  async listSchemas(catalogName) {
    const response = await fetch(
      `${DATABRICKS_HOST}/api/2.1/unity-catalog/schemas?catalog_name=${catalogName}`,
      { credentials: 'include' }
    );
    return response.json();
  },

  async listTables(catalogName, schemaName) {
    const response = await fetch(
      `${DATABRICKS_HOST}/api/2.1/unity-catalog/tables?catalog_name=${catalogName}&schema_name=${schemaName}`,
      { credentials: 'include' }
    );
    return response.json();
  },

  async getTableDetails(fullName) {
    const response = await fetch(
      `${DATABRICKS_HOST}/api/2.1/unity-catalog/tables/${encodeURIComponent(fullName)}`,
      { credentials: 'include' }
    );
    return response.json();
  },

  async listVolumes(catalogName, schemaName) {
    const response = await fetch(
      `${DATABRICKS_HOST}/api/2.1/unity-catalog/volumes?catalog_name=${catalogName}&schema_name=${schemaName}`,
      { credentials: 'include' }
    );
    return response.json();
  }
};
```

---

## Implementing "Domains" in Unity Catalog

Domains are a logical grouping concept. Here are three approaches to implement them:

### Option 1: Tags (Recommended)

Use Unity Catalog tags to assign domains to tables:

```sql
-- Assign a domain tag to a table
ALTER TABLE main.gold.customers SET TAGS ('domain' = 'customers');
ALTER TABLE main.gold.orders SET TAGS ('domain' = 'operations');
ALTER TABLE main.gold.revenue_daily SET TAGS ('domain' = 'finance');
```

```python
# Query tables by domain
def get_tables_by_domain(domain: str):
    return w.tables.list(
        catalog_name="main",
        schema_name="gold"
    )
    # Filter by tag in application layer
    return [t for t in tables if t.properties.get('domain') == domain]
```

### Option 2: Table Properties

Store domain in table properties:

```sql
ALTER TABLE main.gold.customers 
SET TBLPROPERTIES ('domain' = 'customers', 'domain_owner' = 'customer_team');
```

### Option 3: External Metadata Store

For more complex domain hierarchies, use a separate metadata table:

```sql
CREATE TABLE main.metadata.table_domains (
    full_table_name STRING,
    domain_id STRING,
    domain_name STRING,
    sub_domain STRING,
    data_steward STRING,
    last_certified DATE
);

-- Query with domain info
SELECT t.*, d.domain_name, d.data_steward
FROM main.information_schema.tables t
LEFT JOIN main.metadata.table_domains d 
  ON t.table_name = d.full_table_name
WHERE t.table_schema = 'gold';
```

---

## Databricks ONE Lake & Advanced Features

### Accessing External Tables & Federated Data

```python
# List external locations
external_locations = w.external_locations.list()

# For federated queries (Lakehouse Federation)
# Tables from external systems appear in Unity Catalog
federated_tables = w.tables.list(
    catalog_name="salesforce_catalog",  # Federated catalog
    schema_name="accounts"
)
```

### Getting Table Lineage

```python
# Table lineage (requires lineage feature)
lineage = w.lineage.list_table_lineage(
    table_name="main.gold.customers"
)

# Returns upstream and downstream dependencies
upstream = lineage.upstream_tables
downstream = lineage.downstream_tables
```

### SQL Warehouse Integration for Stats

```python
# Get detailed table statistics using SQL
def get_table_stats(full_name: str):
    result = w.statement_execution.execute_statement(
        warehouse_id=SQL_WAREHOUSE_ID,
        statement=f"""
        DESCRIBE DETAIL `{full_name}`
        """,
        wait_timeout="30s"
    )
    
    # Parse result for:
    # - numFiles
    # - sizeInBytes
    # - numRows (for Delta tables)
    # - partitionColumns
    # - lastModified
    return parse_describe_detail(result)
```

---

## Frontend Implementation Notes

### Project Structure

```
databricks-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DataExplorer/
│   │   │   │   ├── DataExplorer.jsx      # Main component
│   │   │   │   ├── Sidebar.jsx           # Schema/domain navigation
│   │   │   │   ├── TableList.jsx         # List view
│   │   │   │   ├── TableGrid.jsx         # Grid view
│   │   │   │   ├── DetailPanel.jsx       # Item details
│   │   │   │   ├── SearchBar.jsx         # Search + filters
│   │   │   │   └── hooks/
│   │   │   │       ├── useSchemas.js     # Schema fetching
│   │   │   │       ├── useTables.js      # Table fetching
│   │   │   │       └── useSearch.js      # Search/filter logic
│   │   │   └── index.js
│   │   ├── services/
│   │   │   └── databricksApi.js          # API client
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── main.py                           # Flask/FastAPI app
│   └── requirements.txt
└── app.yaml                              # Databricks App config
```

### Databricks App Configuration (app.yaml)

```yaml
# app.yaml for Databricks Apps
name: data-explorer
description: Unity Catalog Data Explorer
entrypoint: main:app

resources:
  - name: sql-warehouse
    sql_warehouse:
      warehouse_id: ${SQL_WAREHOUSE_ID}

permissions:
  - level: CAN_USE
    group_name: data_users
```

### React Hooks for Data Fetching

```javascript
// hooks/useTables.js
import { useState, useEffect } from 'react';
import { databricksApi } from '../services/databricksApi';

export function useTables(catalogName, schemaName) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schemaName) return;
    
    setLoading(true);
    databricksApi.listTables(catalogName, schemaName)
      .then(data => {
        setTables(data.tables || []);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [catalogName, schemaName]);

  return { tables, loading, error, refetch: () => {} };
}
```

---

## Performance Optimizations

### 1. Pagination for Large Catalogs

```python
# Backend pagination
@app.get("/api/tables/{catalog}/{schema}")
def list_tables_paginated(
    catalog: str, 
    schema: str, 
    page_token: str = None,
    max_results: int = 50
):
    tables = w.tables.list(
        catalog_name=catalog,
        schema_name=schema,
        max_results=max_results,
        page_token=page_token
    )
    return {
        "tables": [serialize_table(t) for t in tables],
        "next_page_token": tables.next_page_token
    }
```

### 2. Caching Table Metadata

```python
from functools import lru_cache
from datetime import timedelta

@lru_cache(maxsize=1000, ttl=timedelta(minutes=5))
def get_table_stats_cached(full_name: str):
    return get_table_stats(full_name)
```

### 3. Lazy Loading Details

Only fetch detailed column info when user selects a table:

```javascript
// Fetch full details only on selection
const handleTableSelect = async (table) => {
  setSelectedTable(table);
  
  // Lazy load detailed schema
  if (!table.columnsLoaded) {
    const details = await api.getTableDetails(table.full_name);
    setSelectedTable({ ...table, ...details, columnsLoaded: true });
  }
};
```

---

## Extending the Pattern

### Add Data Quality Indicators

```javascript
// Add quality score from your data quality tool
const tableWithQuality = {
  ...table,
  qualityScore: await getQualityScore(table.full_name),
  lastValidated: await getLastValidation(table.full_name)
};
```

### Add Usage Analytics

```sql
-- Track table popularity via query history
SELECT 
  object_name,
  COUNT(*) as query_count,
  COUNT(DISTINCT user_name) as unique_users
FROM system.access.audit
WHERE action_name = 'getTable'
GROUP BY object_name
ORDER BY query_count DESC;
```

### Integration with dbt

```javascript
// Show dbt model info if available
const dbtManifest = await loadDbtManifest();
const dbtModel = dbtManifest.nodes[`model.${table.name}`];

if (dbtModel) {
  table.dbtDescription = dbtModel.description;
  table.dbtTests = dbtModel.tests;
  table.dbtTags = dbtModel.tags;
}
```

---

## Summary

This Data Explorer pattern provides:

1. **Clean UX** - Professional, Databricks-native design language
2. **Unity Catalog Integration** - Full API support for schemas, tables, volumes
3. **Domain Organization** - Flexible via tags, properties, or external metadata
4. **Extensibility** - Easy to add lineage, quality, dbt integration
5. **Performance** - Pagination, caching, lazy loading built-in

The component is designed to work within Databricks Apps and leverage the platform's authentication and API access automatically.
