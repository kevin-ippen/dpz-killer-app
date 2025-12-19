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
from app.api.routes import items, metrics, chat, genie, explore
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
app.include_router(explore.router, prefix=settings.API_PREFIX)


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

    # Catch-all route for React Router (SPA routing)
    # This will match any path that doesn't have a more specific route
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """
        Serve React app for all non-API routes

        This enables client-side routing in the React app.
        More specific routes (like /api/* and /health) will match first.

        Note: /chat is handled by Chainlit mounting in main.py, so this won't
        be called for /chat/* paths when properly mounted.
        """
        # Don't serve React app for /chat paths - let them 404
        # (Chainlit mounting in main.py should handle these)
        if full_path.startswith("chat"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Chat endpoint should be handled by Chainlit mounting")

        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

else:
    logger.warning(f"Frontend dist directory not found: {frontend_dist}")
    logger.info("Run 'npm run build' in frontend directory to build the frontend")
