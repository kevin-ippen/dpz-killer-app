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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import logging
import os

from app.core.config import settings
from app.api.routes import items, metrics, chat
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


# ============================================================================
# Root Endpoints
# ============================================================================

@app.get("/")
async def root():
    """
    Root endpoint

    When deployed as Databricks App with frontend build, this will serve
    the React app's index.html. During development, returns API info.
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
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")

    # Validate Databricks connection (optional)
    if settings.DATABRICKS_HOST:
        logger.info(f"Databricks host configured: {settings.DATABRICKS_HOST}")
    else:
        logger.warning("Databricks credentials not configured - data access will fail")


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
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    # Serve index.html for all non-API routes (SPA routing)
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        Serve React app for all non-API routes

        This enables client-side routing in the React app.
        All routes that don't match /api/* or /health will serve index.html.
        """
        if full_path.startswith("api/") or full_path == "health":
            # Let FastAPI handle API routes
            return None

        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

        return {"error": "Frontend not built. Run 'npm run build' in frontend directory."}

    logger.info(f"Serving frontend from: {frontend_dist}")
else:
    logger.warning(f"Frontend dist directory not found: {frontend_dist}")
    logger.info("Run 'npm run build' in frontend directory to build the frontend")
