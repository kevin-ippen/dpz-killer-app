"""
INVERTED ARCHITECTURE APPROACH

Instead of mounting Chainlit in FastAPI, we:
1. Run Chainlit as the main app
2. Add custom API routes to Chainlit's FastAPI server
3. Serve React frontend from Chainlit's app

This approach works because Chainlit internally uses FastAPI, and we can
access and extend its app object.
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, backend_path)

# Import Chainlit FIRST
import chainlit as cl
from typing import Dict

# Import backend modules
from app.api.routes import items, metrics, chat as chat_api
from app.models.schemas import HealthResponse
from app.core.config import settings
from datetime import datetime
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Import Chainlit's internal FastAPI app
from chainlit.server import app as chainlit_fastapi_app

logger.info("✅ Accessed Chainlit's FastAPI app")

# ============================================================================
# ADD CUSTOM API ROUTES TO CHAINLIT'S APP
# ============================================================================

# Include backend API routers
chainlit_fastapi_app.include_router(items.router, prefix="/api")
chainlit_fastapi_app.include_router(metrics.router, prefix="/api")
chainlit_fastapi_app.include_router(chat_api.router, prefix="/api")

logger.info("✅ Added backend API routes to Chainlit app")

# Health check endpoints
@chainlit_fastapi_app.get("/health")
async def health_check():
    return {"status": "healthy"}

@chainlit_fastapi_app.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow()
    )

# ============================================================================
# SERVE REACT FRONTEND AT ROOT
# ============================================================================
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')

if os.path.exists(frontend_dist):
    # Mount static assets
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        chainlit_fastapi_app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    logger.info(f"✅ Serving frontend from: {frontend_dist}")

    # Note: Chainlit already has a catch-all route at /, so we can't override it
    # Instead, we'll add a /dashboard route for the React app
    @chainlit_fastapi_app.get("/dashboard")
    async def serve_dashboard():
        """Serve React app at /dashboard instead of /"""
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

    # Add route for dashboard sub-paths
    @chainlit_fastapi_app.get("/dashboard/{full_path:path}")
    async def serve_dashboard_spa(full_path: str):
        """Serve React app for dashboard client-side routing"""
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

    logger.info("✅ React dashboard available at /dashboard")
    logger.info("✅ Chainlit chat available at / (root)")
else:
    logger.warning(f"❌ Frontend dist directory not found: {frontend_dist}")

# ============================================================================
# CHAINLIT HANDLERS (Chat Logic)
# ============================================================================
from config import settings as chat_settings
from auth.ensure_identity import ensure_identity
from services.mas_client import mas_client
from services.mas_normalizer import normalize
from services.renderer import ChainlitStream

@cl.on_chat_start
async def on_chat_start():
    """Initialize chat session"""
    welcome_message = f"""# Welcome to Domino's Analytics Assistant! 🍕

I can help you analyze your business data across:
- 📊 **Executive & Finance** - CAC, ARPU, GMV, retention
- 📢 **Marketing Performance** - Campaign ROI, channel efficiency
- 👥 **Customer Analytics** - LTV, segmentation, churn
- 🏪 **Operations** - Store performance, delivery times
- 💰 **Sales** - Revenue trends, product mix

**Try asking:**
- "What's our total revenue this month?"
- "Show me CAC by marketing channel"
- "Which customer segment has highest ARPU?"

Ready to dive into your data!
"""
    await cl.Message(content=welcome_message).send()

@cl.on_message
async def on_message(message: cl.Message):
    """Handle incoming chat messages"""
    # Ensure valid authentication
    identity = await ensure_identity()
    if not identity:
        await cl.Message(
            content="❌ Authentication failed. Please refresh and try again.",
            author="System"
        ).send()
        return

    # Build messages with history
    messages = _build_messages_with_history(message.content)

    # Initialize renderer
    renderer = ChainlitStream()
    await renderer.start()

    try:
        # Stream response from MAS
        raw_events = mas_client.stream_raw(identity, messages)

        # Process normalized events
        async for event in normalize(raw_events):
            event_type = event.get("type")

            if event_type == "text.delta":
                await renderer.on_text_delta(event["delta"])
            elif event_type == "tool.call":
                await renderer.on_tool_call(event["name"], event.get("args", ""))
            elif event_type == "tool.output":
                await renderer.on_tool_output(event["name"], event.get("output", ""))
            elif event_type == "error":
                await renderer.on_error(event.get("message", "Unknown error"))

        # Finalize response
        await renderer.finish()

    except Exception as e:
        logger.error(f"[CHAT] Error: {e}", exc_info=True)
        await renderer.on_error(f"Failed to process query: {str(e)}")

def _build_messages_with_history(user_content: str):
    """Build message list with conversation history"""
    system_prompt = """You are an expert analytics assistant for Domino's Pizza business intelligence.

You have access to 5 specialized Genie Spaces:
1. **Executive & Finance** - CAC, ARPU, GMV, retention, LTV
2. **Marketing Performance** - Campaign ROI, channel efficiency, ROAS
3. **Customer Analytics** - Customer segmentation, LTV, churn, retention
4. **Operations** - Store performance, delivery times, ratings
5. **Sales** - Revenue trends, product mix, basket analysis

Guidelines:
- Provide data-driven insights with specific metrics
- Use bullet points for clarity
- Highlight key findings and trends
- Suggest relevant follow-up questions
- Be concise yet comprehensive
"""

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    if cl.chat_context.to_openai():
        history = cl.chat_context.to_openai()
        recent_history = history[-(chat_settings.hist_max_turns * 2):]

        total_chars = 0
        filtered_history = []
        for msg in reversed(recent_history):
            msg_chars = len(msg["content"])
            if total_chars + msg_chars > chat_settings.hist_max_chars:
                break
            filtered_history.insert(0, msg)
            total_chars += msg_chars

        messages.extend(filtered_history)

    # Add current message
    messages.append({"role": "user", "content": user_content})

    logger.debug(f"[CHAT] Built {len(messages)} messages")
    return messages

logger.info("✅ Chainlit handlers registered")
logger.info("=" * 60)
logger.info("Architecture: Chainlit as main app with custom routes")
logger.info("  - Chat UI: / (root)")
logger.info("  - Dashboard: /dashboard")
logger.info("  - API: /api/*")
logger.info("=" * 60)
