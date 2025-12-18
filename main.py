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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime

# Import backend modules
from app.api.routes import items, metrics, chat as chat_api
from app.models.schemas import HealthResponse
from app.core.config import settings

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
app.include_router(items.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")

logger.info("✅ API routes registered")

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

    # SPA fallback for client-side routing
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """
        Serve React app for client-side routing

        Exclude API and asset paths.
        """
        # Don't serve SPA for these paths
        if (full_path.startswith("api/") or
            full_path.startswith("assets/") or
            full_path == "health"):
            raise HTTPException(status_code=404, detail="Not found")

        # Serve index.html for all other routes (SPA routing)
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