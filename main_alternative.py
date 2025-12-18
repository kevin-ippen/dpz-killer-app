"""
ALTERNATIVE MOUNTING APPROACH - Use if app.mount() doesn't work

Uses Starlette Router with explicit Mount objects instead of FastAPI's mount()
This creates a clearer route hierarchy and may handle precedence differently.
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
from fastapi.responses import FileResponse
from datetime import datetime
from starlette.applications import Starlette
from starlette.routing import Mount, Route
from starlette.responses import JSONResponse

# Import backend modules
from app.api.routes import items, metrics, chat as chat_api
from app.models.schemas import HealthResponse
from app.core.config import settings

# ============================================================================
# 1. INITIALIZE CHAINLIT FIRST
# ============================================================================
chainlit_asgi_app = None
try:
    chat_app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat-app')
    sys.path.insert(0, chat_app_path)

    # Import Chainlit
    import chainlit as cl

    # Import the chat app module to initialize Chainlit handlers
    import importlib.util
    spec = importlib.util.spec_from_file_location("chainlit_app", os.path.join(chat_app_path, 'app.py'))
    chat_app_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(chat_app_module)

    # Get Chainlit's ASGI app
    from chainlit.server import app as chainlit_asgi_app

    # Create wrapper that sets root_path
    class RootPathASGI:
        def __init__(self, app, root_path: str):
            self.app = app
            self.root_path = root_path

        async def __call__(self, scope, receive, send):
            if scope["type"] in ("http", "websocket"):
                logger.info(f"🔍 RootPathASGI wrapper: {scope['type']} {scope.get('path', 'unknown')}")
                scope["root_path"] = self.root_path
            await self.app(scope, receive, send)

    # Wrap Chainlit
    chainlit_asgi_app = RootPathASGI(chainlit_asgi_app, "/chat")
    logger.info("✅ Chainlit initialized")
except Exception as e:
    logger.error(f"❌ Could not initialize Chainlit: {e}")
    import traceback
    logger.error(traceback.format_exc())

# ============================================================================
# 2. CREATE BACKEND FASTAPI APP
# ============================================================================
backend_app = FastAPI(
    title="Domino's Analytics Dashboard API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
backend_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
backend_app.include_router(items.router, prefix="/api")
backend_app.include_router(metrics.router, prefix="/api")
backend_app.include_router(chat_api.router, prefix="/api")

# Health check endpoints
@backend_app.get("/health")
async def health_check():
    return {"status": "healthy"}

@backend_app.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow()
    )

# ============================================================================
# 3. CREATE STARLETTE ROUTER WITH EXPLICIT MOUNT HIERARCHY
# ============================================================================
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

# Root route (serve React app)
async def serve_root(request):
    index_path = os.path.join(frontend_dist, "index.html")
    return FileResponse(index_path)

# Build routes list with explicit priority order
routes = []

# 1. HIGHEST PRIORITY: Chainlit mount (must be first!)
if chainlit_asgi_app:
    routes.append(Mount("/chat", app=chainlit_asgi_app, name="chat"))
    logger.info("✅ Added /chat mount to Starlette routes")

# 2. Backend API
routes.append(Mount("/api", app=backend_app, name="api"))
routes.append(Mount("/health", app=backend_app, name="health"))

# 3. Static assets
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        routes.append(Mount("/assets", StaticFiles(directory=assets_dir), name="assets"))

# 4. Root route
routes.append(Route("/", serve_root))

# 5. LOWEST PRIORITY: SPA fallback (catch-all, defined last)
async def spa_fallback(request):
    """Serve React app for client-side routing"""
    # Don't serve SPA for paths that should have been caught by mounts
    path = request.url.path
    if path.startswith("/api") or path.startswith("/chat") or path.startswith("/assets"):
        return JSONResponse({"detail": "Not found"}, status_code=404)

    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse({"detail": "Frontend not built"}, status_code=404)

routes.append(Route("/{full_path:path}", spa_fallback))

# ============================================================================
# 4. CREATE MAIN STARLETTE APP WITH EXPLICIT ROUTES
# ============================================================================
app = Starlette(
    debug=settings.DEBUG,
    routes=routes
)

logger.info(f"✅ Starlette app created with {len(routes)} routes")
for i, route in enumerate(routes):
    logger.info(f"   {i+1}. {route}")

# ============================================================================
# APPLICATION LIFECYCLE EVENTS
# ============================================================================
@backend_app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("🚀 Starting Domino's Analytics Dashboard (Alternative Mount)")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    if settings.DATABRICKS_HOST:
        logger.info(f"✅ Databricks host: {settings.DATABRICKS_HOST}")

@backend_app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("Shutting down...")
    from app.repositories.databricks_repo import databricks_repo
    databricks_repo.close()
    logger.info("✅ Shutdown complete")
