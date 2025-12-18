"""
Databricks Apps entry point - Multi-app mount

Mounts TWO applications:
1. FastAPI backend + React frontend at /
2. Chainlit chat app at /chat
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set CHAINLIT_ROOT_PATH BEFORE any chainlit imports
os.environ["CHAINLIT_ROOT_PATH"] = "/chat"

# Add backend directory to Python path BEFORE any imports
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

# Import the backend app
from app.main import app as backend_app
logger.info("✅ Backend app imported")

# Try to mount Chainlit
try:
    # Add chat-app to path
    chat_app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat-app')
    if chat_app_path not in sys.path:
        sys.path.insert(0, chat_app_path)

    logger.info(f"Chat app path: {chat_app_path}")
    logger.info(f"Chat app exists: {os.path.exists(os.path.join(chat_app_path, 'app.py'))}")

    # Import Chainlit (after CHAINLIT_ROOT_PATH is set)
    import chainlit as cl
    logger.info("✅ Chainlit imported")

    # Import Starlette for mounting
    from starlette.applications import Starlette
    from starlette.routing import Mount
    from starlette.responses import RedirectResponse

    # Import the chat app module using a unique name
    import importlib.util
    spec = importlib.util.spec_from_file_location("chainlit_app", os.path.join(chat_app_path, 'app.py'))
    chat_app_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(chat_app_module)
    logger.info("✅ Chat app module loaded")

    # Get Chainlit's ASGI app
    from chainlit.server import app as chainlit_asgi_app
    logger.info("✅ Chainlit ASGI app retrieved")

    # Create Starlette app with EXPLICIT route ordering
    # IMPORTANT: More specific routes MUST come before catch-alls
    app = Starlette(
        routes=[
            # Chainlit MUST be first and most specific
            Mount("/chat", chainlit_asgi_app, name="chat"),
            # Backend at root comes last (has catch-all for SPA routing)
            Mount("/", backend_app, name="main"),
        ]
    )

    logger.info("✅ Chainlit mounted at /chat")
    logger.info("✅ Backend mounted at /")

except Exception as e:
    import traceback
    logger.error(f"❌ Could not mount Chainlit: {e}")
    logger.error(f"   Traceback: {traceback.format_exc()}")
    logger.info("   Using backend only - Chat tab will show error")
    app = backend_app

# Expose the app for Databricks Apps
__all__ = ["app"]
