"""
STANDALONE CHAINLIT TEST

Run this to verify Chainlit works independently before mounting:
    cd /path/to/dpz-killer-app
    python test_chainlit_standalone.py

Then access: http://localhost:8000

If this works, Chainlit itself is fine and the issue is with mounting.
If this fails, there's an issue with Chainlit initialization or dependencies.
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add chat-app to path
chat_app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat-app')
sys.path.insert(0, chat_app_path)

logger.info(f"Loading Chainlit app from: {chat_app_path}")

# Import the chat app module to initialize Chainlit handlers
import importlib.util
spec = importlib.util.spec_from_file_location("chainlit_app", os.path.join(chat_app_path, 'app.py'))
chat_app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chat_app_module)

logger.info("✅ Chainlit handlers loaded")

# Get Chainlit's ASGI app
from chainlit.server import app

logger.info("✅ Starting Chainlit server on http://localhost:8000")
logger.info("   Press Ctrl+C to stop")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
