"""
Main entry point for Databricks App with Chainlit integration

This module:
1. Mounts Chainlit at /chat (FIRST to ensure proper routing)
2. Includes backend API routes at /api
3. Serves frontend static assets
4. Provides SPA fallback for client-side routing (excluding /chat)
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

# ============================================================================
# IMPORT ALL BACKEND MODULES FIRST (before Chainlit imports)
# ============================================================================
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
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
# 1. MOUNT CHAINLIT FIRST (before any catch-all routes!)
# ============================================================================
try:
    chat_app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat-app')
    sys.path.insert(0, chat_app_path)

    # Import Chainlit
    import chainlit as cl
    from starlette.middleware.wsgi import WSGIMiddleware
    from starlette.middleware import Middleware

    # Import the chat app module to initialize Chainlit handlers
    import importlib.util
    spec = importlib.util.spec_from_file_location("chainlit_app", os.path.join(chat_app_path, 'app.py'))
    chat_app_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(chat_app_module)

    # Get Chainlit's ASGI app
    from chainlit.server import app as chainlit_asgi_app

    # Wrap Chainlit app with root_path middleware so it knows it's at /chat
    from starlette.applications import Starlette as StarletteApp
    from starlette.routing import Mount

    # Create a wrapper that sets root_path
    class RootPathASGI:
        def __init__(self, app, root_path: str):
            self.app = app
            self.root_path = root_path

        async def __call__(self, scope, receive, send):
            if scope["type"] in ("http", "websocket"):
                # Set root_path so Chainlit knows it's mounted at /chat
                # FastAPI mount already stripped /chat from the path
                scope["root_path"] = self.root_path
            await self.app(scope, receive, send)

    # Wrap Chainlit with root_path
    chainlit_with_root = RootPathASGI(chainlit_asgi_app, "/chat")

    # Mount Chainlit at /chat - THIS MUST HAPPEN BEFORE CATCH-ALL ROUTES
    app.mount("/chat", chainlit_with_root, name="chat")

    logger.info("✅ Chainlit mounted at /chat with root_path middleware")
except Exception as e:
    logger.error(f"❌ Could not mount Chainlit: {e}")
    import traceback
    logger.error(traceback.format_exc())

# ============================================================================
# 2. INCLUDE BACKEND API ROUTES
# ============================================================================

# Include API routers under /api prefix
app.include_router(items.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")

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
# 3. SERVE FRONTEND STATIC ASSETS
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

    # ============================================================================
    # 4. SPA FALLBACK (exclude /api, /chat, /assets, /health)
    # ============================================================================
    # NOTE: This catch-all route MUST be defined AFTER all mounts (especially /chat)
    # Otherwise it will intercept requests before they reach the mounted apps
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """
        Serve React app for client-side routing

        Explicitly exclude:
        - /api/* - Backend API routes
        - /chat/* - Chainlit app (should never reach here due to mount)
        - /assets/* - Static assets
        - /health - Health check
        """
        # These paths should be handled by other routes/mounts
        # If we reach here, something is wrong with routing
        if (full_path.startswith("api/") or
            full_path.startswith("chat") or
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
