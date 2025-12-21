"""
Main entry point for Databricks App

Clean version - no Chainlit mounting attempts!

This module:
1. Includes backend API routes at /api
2. Serves frontend static assets
3. Provides SPA fallback for client-side routing
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from datetime import datetime

# Import backend modules
from app.api.routes import metrics, chat as chat_api, genie
from app.models.schemas import HealthResponse
from app.core.config import settings

# Import for explore endpoints
from typing import List
from pydantic import BaseModel

# Create main FastAPI app
app = FastAPI(
    title="Domino's Analytics Dashboard",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API ROUTES
# ============================================================================

# Include API routers under /api prefix
app.include_router(metrics.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")
app.include_router(genie.router, prefix="/api")

logger.info("✅ API routes registered")

# ============================================================================
# EXPLORE ENDPOINTS (inline for Unity Catalog browsing)
# ============================================================================

class TableInfo(BaseModel):
    name: str
    full_name: str
    table_type: str | None = None
    comment: str | None = None

class VolumeInfo(BaseModel):
    name: str
    full_name: str
    volume_type: str | None = None
    storage_location: str | None = None
    comment: str | None = None

class SchemaAssets(BaseModel):
    catalog: str
    schema: str
    tables: List[TableInfo]
    volumes: List[VolumeInfo]

# Cache for schema manifest
_schema_cache: List[SchemaAssets] | None = None

@app.get("/api/explore/schemas", response_model=List[SchemaAssets])
async def get_explore_schemas():
    """Get all tables and volumes from configured schemas"""
    global _schema_cache

    if _schema_cache:
        return _schema_cache

    from databricks.sdk import WorkspaceClient

    try:
        w = WorkspaceClient()
        schemas_to_fetch = [
            ("main", "dominos_analytics"),
            ("main", "dominos_realistic"),
            ("main", "dominos_files"),
        ]

        results = []
        for catalog, schema_name in schemas_to_fetch:
            tables = []
            volumes = []

            try:
                for table in w.tables.list(catalog_name=catalog, schema_name=schema_name):
                    tables.append(TableInfo(
                        name=table.name,
                        full_name=table.full_name,
                        table_type=table.table_type.value if table.table_type else None,
                        comment=table.comment,
                    ))
            except Exception as e:
                logger.warning(f"Failed to list tables in {catalog}.{schema_name}: {e}")

            try:
                for volume in w.volumes.list(catalog_name=catalog, schema_name=schema_name):
                    volumes.append(VolumeInfo(
                        name=volume.name,
                        full_name=volume.full_name,
                        volume_type=volume.volume_type.value if volume.volume_type else None,
                        storage_location=volume.storage_location,
                        comment=volume.comment
                    ))
            except Exception as e:
                logger.warning(f"Failed to list volumes in {catalog}.{schema_name}: {e}")

            results.append(SchemaAssets(catalog=catalog, schema=schema_name, tables=tables, volumes=volumes))

        _schema_cache = results
        return results
    except Exception as e:
        logger.error(f"Failed to fetch schemas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/explore/tables/{catalog}/{schema}/{table}/preview")
async def preview_table(catalog: str, schema: str, table: str):
    """Preview table data"""
    from app.repositories.databricks_repo import databricks_repo
    try:
        query = f"SELECT * FROM {catalog}.{schema}.{table} LIMIT 100"
        results = databricks_repo.execute_query(query)
        columns = list(results[0].keys()) if results else []
        return {"table": f"{catalog}.{schema}.{table}", "columns": columns, "rows": results}
    except Exception as e:
        logger.error(f"Failed to preview table: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy"}

@app.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    """Detailed API health check"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow()
    )

# ============================================================================
# SERVE FRONTEND
# ============================================================================
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

if os.path.exists(frontend_dist):
    # Mount static assets (JS, CSS, images, etc.)
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    logger.info(f"✅ Serving frontend from: {frontend_dist}")

    # Serve React app at root
    @app.get("/")
    async def serve_root():
        """Serve React app at root"""
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

    # Serve PDF worker file
    @app.get("/pdf.worker.min.mjs")
    async def serve_pdf_worker():
        """Serve PDF.js worker file for react-pdf"""
        worker_path = os.path.join(frontend_dist, "pdf.worker.min.mjs")
        if os.path.exists(worker_path):
            return FileResponse(worker_path, media_type="application/javascript")
        raise HTTPException(status_code=404, detail="PDF worker not found")

    # Serve specific SPA routes (NO CATCH-ALL to avoid shadowing API)
    @app.get("/chat")
    @app.get("/dashboard")
    @app.get("/explore")
    async def spa_routes():
        """Serve React app for specific frontend routes"""
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend not built")
else:
    logger.warning(f"❌ Frontend dist directory not found: {frontend_dist}")
    logger.info("Run 'npm run build' in frontend directory to build the frontend")

# ============================================================================
# APPLICATION LIFECYCLE EVENTS
# ============================================================================
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("🚀 Starting Domino's Analytics Dashboard")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    if settings.DATABRICKS_HOST:
        logger.info(f"✅ Databricks host configured: {settings.DATABRICKS_HOST}")
    else:
        logger.warning("⚠️ Databricks credentials not configured")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("Shutting down application...")

    # Close Databricks connection
    from app.repositories.databricks_repo import databricks_repo
    databricks_repo.close()

    logger.info("✅ Shutdown complete")