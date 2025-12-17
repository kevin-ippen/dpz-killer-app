"""
Databricks Apps entry point - Multi-app mount

This file mounts TWO applications:
1. FastAPI backend + React frontend (main app)
2. Chainlit chat app (mounted at /chat)

Both apps share the same Databricks Apps OBO authentication.
"""
import sys
import os
import logging

logger = logging.getLogger(__name__)

# Get absolute paths
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(script_dir, 'backend')
chat_app_path = os.path.join(script_dir, 'chat-app')

# Add to Python path if not already there
for path in [backend_path, chat_app_path]:
    if path not in sys.path:
        sys.path.insert(0, path)
        logger.info(f"Added to Python path: {path}")

# Import the FastAPI backend app
try:
    from app.main import app as backend_app
    logger.info("✅ Backend app imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import backend app: {e}")
    logger.error(f"   sys.path: {sys.path}")
    logger.error(f"   backend_path exists: {os.path.exists(backend_path)}")
    raise

# Try to import and mount Chainlit app
try:
    import chainlit.cli
    from starlette.applications import Starlette
    from starlette.routing import Mount

    # Set Chainlit root path
    os.environ["CHAINLIT_ROOT_PATH"] = chat_app_path

    # Import the Chainlit app module (registers handlers)
    sys.path.insert(0, chat_app_path)
    import app as chainlit_module  # chat-app/app.py

    # Get Chainlit's internal ASGI app
    from chainlit.server import app as chainlit_asgi_app

    logger.info("✅ Chainlit app loaded successfully")

    # Create a Starlette app that mounts both
    app = Starlette(
        routes=[
            # Mount Chainlit at /chat
            Mount("/chat", chainlit_asgi_app, name="chat"),
            # Mount backend/frontend at root
            Mount("/", backend_app, name="main"),
        ]
    )

    logger.info("✅ Multi-app routing configured:")
    logger.info("   - /chat     → Chainlit (Genie Spaces chat)")
    logger.info("   - /         → FastAPI backend + React frontend")

except ImportError as e:
    logger.warning(f"⚠️  Chainlit not available: {e}")
    logger.info("   Using FastAPI backend only")
    logger.info("   Install Chainlit: pip install -r chat-app/requirements.txt")

    # Fallback: just use the backend app
    app = backend_app

except Exception as e:
    logger.error(f"❌ Error loading Chainlit app: {e}", exc_info=True)
    logger.info("   Falling back to FastAPI backend only")

    # Fallback: just use the backend app
    app = backend_app

# Expose the app for Databricks Apps
__all__ = ["app"]
