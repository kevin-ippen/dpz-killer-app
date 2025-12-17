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
    sys.path.insert(0, chat_app_path)

    # Import Chainlit and create the chat app
    import chainlit as cl
    from starlette.applications import Starlette
    from starlette.routing import Mount

    # Import chat-app/app.py which registers Chainlit handlers
    import app as chat_app_module

    # Get Chainlit's ASGI app
    from chainlit.server import app as chainlit_asgi_app

    # Mount both apps
    app = Starlette(
        routes=[
            Mount("/chat", chainlit_asgi_app),
            Mount("/", backend_app),
        ]
    )

    logger.info("✅ Chainlit mounted at /chat")
    logger.info("✅ Backend mounted at /")

except Exception as e:
    logger.warning(f"⚠️  Could not mount Chainlit: {e}")
    logger.info("   Using backend only - Chat tab will show error")
    app = backend_app

# Expose the app for Databricks Apps
__all__ = ["app"]
