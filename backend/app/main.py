"""
Main FastAPI application for Databricks Apps

This module sets up the FastAPI application with:
- CORS middleware for frontend communication
- API route registration
- Health check endpoints
- Proper shutdown handling

For Databricks Apps deployment:
- The /api prefix is required for OAuth2 Bearer token authentication
- Environment variables are auto-injected from app.yaml
- Static files (frontend) are served from the root path
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import logging
import os

from app.core.config import settings
from app.api.routes import items, metrics, chat, genie
# NOTE: explore endpoints are defined directly in this file (main.py) not in explore.py
from app.models.schemas import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url=f"{settings.API_PREFIX}/docs",  # Swagger UI
    redoc_url=f"{settings.API_PREFIX}/redoc",  # ReDoc
    openapi_url=f"{settings.API_PREFIX}/openapi.json"
)

# Configure CORS
# For production, update settings.CORS_ORIGINS with specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api prefix
# Add your route modules here
app.include_router(items.router, prefix=settings.API_PREFIX)
app.include_router(metrics.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(genie.router, prefix=settings.API_PREFIX)
# NOTE: explore endpoints defined below in this file, not as separate router


# ============================================================================
# CRITICAL: Test endpoint to verify deployment
# ============================================================================
@app.get(f"{settings.API_PREFIX}/test")
async def test_endpoint():
    """
    Simple test endpoint - if this returns JSON, API routing works.
    If this returns HTML, SPA catch-all is broken.
    """
    return {
        "status": "API_ROUTING_WORKS",
        "message": "If you see this JSON, the API is working",
        "commit": "5f8cf45_test_endpoint"
    }


# ============================================================================
# Root Endpoints
# ============================================================================

# Root endpoint will be defined later if frontend exists
# Otherwise define API info endpoint here
_frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if not os.path.exists(_frontend_dist):
    @app.get("/")
    async def root():
        """
        Root endpoint

        Returns API info when frontend is not built.
        """
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "environment": settings.ENVIRONMENT,
            "docs": f"{settings.API_PREFIX}/docs"
        }


@app.get("/health")
async def health_check():
    """
    Health check endpoint

    Use this for monitoring and readiness probes.
    """
    return {"status": "healthy"}


@app.get(f"{settings.API_PREFIX}/health", response_model=HealthResponse)
async def api_health_check():
    """
    Detailed API health check

    Returns comprehensive health information including:
    - Application status
    - Version
    - Environment
    - Timestamp
    """
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow()
    )


@app.get(f"{settings.API_PREFIX}/debug/routes")
async def list_routes():
    """
    List all registered API routes (for debugging deployment issues)

    Returns list of routes to verify which endpoints are available
    """
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": route.name
            })
    return {
        "total_routes": len(routes),
        "routes": sorted(routes, key=lambda x: x["path"])
    }


@app.get(f"{settings.API_PREFIX}/debug/deployment")
async def deployment_info():
    """Check deployment version and config"""
    import sys
    import os
    return {
        "status": "deployed",
        "commit": "5ce3353_enhanced_explorer",  # Update this with each deployment
        "api_prefix": settings.API_PREFIX,
        "python_version": sys.version,
        "has_explore_endpoints": any("explore" in str(r.path) for r in app.routes if hasattr(r, "path")),
        "working_directory": os.getcwd(),
    }


# ============================================================================
# TEMPORARY: Explore Endpoints (workaround until explore.py gets deployed)
# ============================================================================

from typing import List
from pydantic import BaseModel
from fastapi.responses import Response

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

# In-memory cache for schema manifest
_schema_manifest_cache: List[SchemaAssets] | None = None
_cache_timestamp: float = 0


def generate_schema_manifest() -> List[SchemaAssets]:
    """
    Generate schema manifest using WorkspaceClient SDK.
    Called at startup and when cache expires.
    This is the canonical approach from Databricks SDK.
    """
    from databricks.sdk import WorkspaceClient
    import time

    logger.info("Generating schema manifest using WorkspaceClient SDK...")

    try:
        w = WorkspaceClient()  # Auto-configures in Databricks App context
    except Exception as e:
        logger.error(f"Failed to initialize WorkspaceClient: {e}")
        return []

    schemas_to_fetch = [
        ("main", "dominos_analytics"),
        ("main", "dominos_realistic"),
        ("main", "dominos_files"),
    ]

    results = []
    for catalog, schema_name in schemas_to_fetch:
        tables = []
        volumes = []

        # Get tables using SDK
        try:
            table_list = w.tables.list(catalog_name=catalog, schema_name=schema_name)
            for table in table_list:
                tables.append(TableInfo(
                    name=table.name,
                    full_name=table.full_name,
                    table_type=table.table_type.value if table.table_type else None,
                    comment=table.comment,
                ))
            logger.info(f"Found {len(tables)} tables in {catalog}.{schema_name}")
        except Exception as e:
            logger.warning(f"Failed to list tables in {catalog}.{schema_name}: {e}")

        # Get volumes using SDK
        try:
            volume_list = w.volumes.list(catalog_name=catalog, schema_name=schema_name)
            for volume in volume_list:
                volumes.append(VolumeInfo(
                    name=volume.name,
                    full_name=volume.full_name,
                    volume_type=volume.volume_type.value if volume.volume_type else None,
                    storage_location=volume.storage_location,
                    comment=volume.comment
                ))
            logger.info(f"Found {len(volumes)} volumes in {catalog}.{schema_name}")
        except Exception as e:
            logger.warning(f"Failed to list volumes in {catalog}.{schema_name}: {e}")

        results.append(SchemaAssets(catalog=catalog, schema=schema_name, tables=tables, volumes=volumes))

    logger.info(f"Schema manifest generated: {sum(len(s.tables) + len(s.volumes) for s in results)} total assets")
    return results


@app.get(f"{settings.API_PREFIX}/explore/schemas", response_model=List[SchemaAssets])
async def get_schemas_temp():
    """
    Get schema assets from pre-generated cache.
    Cache is populated at startup and auto-refreshes after 1 hour.
    """
    global _schema_manifest_cache, _cache_timestamp
    import time

    # Auto-refresh cache if empty or older than 1 hour
    cache_age = time.time() - _cache_timestamp
    if _schema_manifest_cache is None or cache_age > 3600:
        logger.info(f"Cache {'empty' if _schema_manifest_cache is None else f'stale ({cache_age:.0f}s old)'}, refreshing...")
        try:
            _schema_manifest_cache = generate_schema_manifest()
            _cache_timestamp = time.time()
        except Exception as e:
            logger.error(f"Failed to refresh schema manifest: {e}")
            if _schema_manifest_cache is None:
                raise HTTPException(status_code=500, detail="Failed to load schema manifest")

    return _schema_manifest_cache


@app.post(f"{settings.API_PREFIX}/explore/schemas/refresh")
async def refresh_schemas():
    """Force refresh the schema manifest cache (admin endpoint)"""
    global _schema_manifest_cache, _cache_timestamp
    try:
        _schema_manifest_cache = generate_schema_manifest()
        _cache_timestamp = time.time()
        total_assets = sum(len(s.tables) + len(s.volumes) for s in _schema_manifest_cache)
        return {
            "status": "success",
            "message": "Schema manifest refreshed",
            "schemas": len(_schema_manifest_cache),
            "total_assets": total_assets
        }
    except Exception as e:
        logger.error(f"Failed to refresh schema manifest: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get(f"{settings.API_PREFIX}/explore/tables/{{catalog}}/{{schema}}/{{table}}/preview")
async def preview_table_temp(catalog: str, schema: str, table: str, limit: int = 100):
    """TEMPORARY: Preview table data (workaround)"""
    try:
        from app.repositories.databricks_repo import databricks_repo
        full_name = f"{catalog}.{schema}.{table}"
        query = f"SELECT * FROM {full_name} LIMIT {limit}"
        results = databricks_repo.execute_query(query)
        columns = list(results[0].keys()) if results else []
        return {"table": full_name, "columns": columns, "rows": results, "row_count": len(results)}
    except Exception as e:
        logger.error(f"Error previewing table: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get(f"{settings.API_PREFIX}/explore/files/proxy")
async def proxy_file_temp(path: str):
    """TEMPORARY: Proxy Unity Catalog files (workaround)"""
    try:
        from databricks.sdk import WorkspaceClient
        client = WorkspaceClient()
        logger.info(f"Proxying file: {path}")
        file_content = client.files.download(path).contents.read()

        content_type = "application/pdf" if path.lower().endswith('.pdf') else "application/octet-stream"
        return Response(
            content=file_content,
            media_type=content_type,
            headers={"Content-Disposition": "inline", "Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        logger.error(f"Error proxying file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Application Lifecycle Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Application startup event

    Executed once when the application starts.
    Use for initialization tasks like:
    - Database connection validation
    - Cache warming
    - Background task setup
    """
    global _schema_manifest_cache, _cache_timestamp
    import time

    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Validate Databricks connection (optional)
    if settings.DATABRICKS_HOST:
        logger.info(f"Databricks host configured: {settings.DATABRICKS_HOST}")
    else:
        logger.warning("Databricks credentials not configured - data access will fail")

    # Pre-generate schema manifest at startup for faster Explorer page loads
    logger.info("Pre-generating schema manifest...")
    try:
        _schema_manifest_cache = generate_schema_manifest()
        _cache_timestamp = time.time()
        logger.info("Schema manifest pre-generated successfully")
    except Exception as e:
        logger.error(f"Failed to pre-generate schema manifest: {e}")
        logger.warning("Explorer page will generate manifest on first request")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown event

    Executed once when the application is shutting down.
    Use for cleanup tasks like:
    - Closing database connections
    - Flushing caches
    - Completing background tasks
    """
    logger.info("Shutting down application...")

    # Close Databricks connection
    from app.repositories.databricks_repo import databricks_repo
    databricks_repo.close()

    logger.info("Shutdown complete")


# ============================================================================
# Static Files (Frontend)
# ============================================================================

# Serve React frontend static files (when built)
# During development, Vite dev server handles this
frontend_dist = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
if os.path.exists(frontend_dist):
    from fastapi.responses import FileResponse

    # Mount static assets FIRST
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    logger.info(f"Serving frontend from: {frontend_dist}")

    # Serve React app at root
    @app.get("/")
    async def serve_root():
        """Serve React app at root"""
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

    # Serve PDF.js worker file (needed for react-pdf)
    @app.get("/pdf.worker.min.mjs")
    async def serve_pdf_worker():
        """Serve PDF.js worker file for react-pdf"""
        worker_path = os.path.join(frontend_dist, "pdf.worker.min.mjs")
        if os.path.exists(worker_path):
            return FileResponse(worker_path, media_type="application/javascript")
        raise HTTPException(status_code=404, detail="PDF worker not found")

    # Serve React app for specific frontend routes only
    # Do NOT use catch-all /{full_path:path} as it shadows API routes
    @app.get("/chat")
    @app.get("/dashboard")
    @app.get("/explore")
    async def serve_spa_routes():
        """Serve React app for specific SPA routes"""
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

else:
    logger.warning(f"Frontend dist directory not found: {frontend_dist}")
    logger.info("Run 'npm run build' in frontend directory to build the frontend")
