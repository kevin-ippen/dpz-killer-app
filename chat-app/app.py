"""
Domino's Analytics Chat App - Main Chainlit Application

Provides a chat interface powered by Genie Spaces via Multi-Agent Supervisor (MAS).
Routes queries across 5 specialized Genie Spaces:
- Executive & Finance Analytics
- Marketing Performance Analytics
- Customer Analytics
- Operations Analytics
- Sales Analytics
"""
import chainlit as cl
import logging
from typing import List, Dict
from config import settings
from auth.ensure_identity import ensure_identity
from services.mas_client import mas_client
from services.mas_normalizer import normalize
from services.renderer import ChainlitStream

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# OBO Authentication Handler
# ============================================================================

# Skip OBO auth - will rely on app-level authentication
# OBO auth only works in Databricks Apps with proper OAuth setup
# For now, we'll use the app's service principal credentials
#
# @cl.header_auth_callback
# def auth_from_header(headers: Dict[str, str]) -> cl.User:
#     """OBO authentication (disabled for PAT environments)"""
#     pass


# ============================================================================
# Chat Session Management
# ============================================================================

@cl.on_chat_start
async def on_chat_start():
    """Initialize chat session with welcome message"""
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
- "What's our retention rate for Q4 cohorts?"

Ready to dive into your data!
"""

    await cl.Message(content=welcome_message).send()


@cl.on_message
async def on_message(message: cl.Message):
    """
    Handle incoming chat messages

    Sends user query to MAS, which routes to appropriate Genie Space(s)
    and streams back the response with tool execution status.
    """
    # Ensure valid authentication
    identity = await ensure_identity()
    if not identity:
        await cl.Message(
            content="❌ Authentication failed. Please refresh the page and try again.",
            author="System"
        ).send()
        return

    # Build messages with conversation history
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
        logger.error(f"[CHAT] Error processing message: {e}", exc_info=True)
        await renderer.on_error(f"Failed to process your query: {str(e)}")


def _build_messages_with_history(user_content: str) -> List[Dict[str, str]]:
    """
    Build message list with conversation history

    Includes system prompt and recent conversation history
    within configured token budget.

    Args:
        user_content: Current user message

    Returns:
        OpenAI-compatible message list
    """
    # System prompt
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

When you don't have specific data, acknowledge it and provide general guidance."""

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Add conversation history from Chainlit context
    if cl.chat_context.to_openai():
        history = cl.chat_context.to_openai()

        # Apply token budget (keep last N turns)
        recent_history = history[-(settings.hist_max_turns * 2):]  # 2 messages per turn

        # Apply character budget
        total_chars = 0
        filtered_history = []
        for msg in reversed(recent_history):
            msg_chars = len(msg["content"])
            if total_chars + msg_chars > settings.hist_max_chars:
                break
            filtered_history.insert(0, msg)
            total_chars += msg_chars

        messages.extend(filtered_history)

    # Add current user message
    messages.append({"role": "user", "content": user_content})

    logger.debug(f"[CHAT] Built message list with {len(messages)} messages")
    return messages


# ============================================================================
# Chat Settings (Optional)
# ============================================================================

@cl.on_settings_update
async def on_settings_update(settings: Dict):
    """Handle settings updates (placeholder for future features)"""
    logger.info(f"[SETTINGS] Updated: {settings}")
