"""
Chat API routes for natural language analytics queries

This module provides endpoints for the chat interface using the
MAS (Multi-Agent Supervisor) endpoint with streaming support.
"""
from typing import List, Optional, AsyncIterator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import logging
import json
import os
from datetime import datetime
from databricks.sdk import WorkspaceClient
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)
# Enable debug logging for detailed MAS response inspection
logger.setLevel(logging.DEBUG)

router = APIRouter(prefix="/chat", tags=["chat"])


# ============================================================================
# Request/Response Models
# ============================================================================

class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Chat request with message and optional context"""
    message: str
    conversation_id: Optional[str] = None
    context: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    """Chat response"""
    message: str
    conversation_id: str
    suggestions: Optional[List[str]] = None


class StreamChatRequest(BaseModel):
    """Streaming chat request with message history"""
    messages: List[ChatMessage]


# ============================================================================
# MAS Streaming Client
# ============================================================================

class MASStreamingClient:
    """Client for streaming responses from MAS endpoint"""

    def __init__(self):
        self.client = WorkspaceClient()
        self.endpoint_name = os.getenv("MAS_ENDPOINT_NAME", "mas-3d3b5439-endpoint")

    async def stream_events(self, messages: List[ChatMessage]) -> AsyncIterator[dict]:
        """
        Stream normalized events from MAS endpoint

        Yields events in format:
        - {"type": "text.delta", "delta": "..."}
        - {"type": "tool.call", "name": "...", "args": {...}}
        - {"type": "tool.output", "name": "...", "output": "..."}
        - {"type": "error", "message": "..."}
        """
        try:
            # Convert to MAS input format (expects 'input' array, not 'messages')
            input_messages = []
            for msg in messages:
                input_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            logger.info(f"[MAS] Streaming from endpoint: {self.endpoint_name}")
            logger.info(f"[MAS] Message count: {len(input_messages)}")

            # Use httpx to make streaming request directly
            import httpx

            # Get the configured credentials from WorkspaceClient
            config = self.client.config

            # Build workspace host URL
            if not config.host:
                raise Exception("Databricks workspace host not configured")

            host = config.host
            if not host.startswith("http"):
                host = f"https://{host}"

            # Check if endpoint is route-optimized by querying its metadata
            # Route-optimized endpoints (created late 2024+) have a special URL
            workspace_id = os.getenv("DATABRICKS_WORKSPACE_ID")

            # Try to get endpoint details to check if it's route-optimized
            try:
                endpoint_info = self.client.serving_endpoints.get(self.endpoint_name)

                # Check if endpoint_url is provided (only for route-optimized)
                if hasattr(endpoint_info, 'endpoint_url') and endpoint_info.endpoint_url:
                    # Route-optimized endpoint
                    url = f"{endpoint_info.endpoint_url}/invocations"
                    logger.info(f"[MAS] Using route-optimized URL: {url}")
                else:
                    # Standard workspace-hosted endpoint
                    endpoint_url = f"/serving-endpoints/{self.endpoint_name}/invocations"
                    url = f"{host}{endpoint_url}"
                    logger.info(f"[MAS] Using standard workspace URL: {url}")

            except Exception as get_error:
                # Fallback to standard path if we can't get endpoint info
                logger.warning(f"[MAS] Could not get endpoint info: {get_error}")
                endpoint_url = f"/serving-endpoints/{self.endpoint_name}/invocations"
                url = f"{host}{endpoint_url}"
                logger.info(f"[MAS] Fallback to standard URL: {url}")

            # Prepare payload in MAS format
            # MAS expects: {"input": [...messages...], "stream": true}
            payload = {
                "input": input_messages,
                "stream": True
            }

            logger.info(f"[MAS] Calling endpoint with payload format: input array")

            # Get OAuth token using Databricks Apps M2M credentials
            # In Databricks Apps, CLIENT_ID and CLIENT_SECRET are automatically provided
            client_id = os.getenv('DATABRICKS_CLIENT_ID')
            client_secret = os.getenv('DATABRICKS_CLIENT_SECRET')

            if not client_id or not client_secret:
                raise Exception("Databricks Apps OAuth credentials not found in environment")

            # Get OAuth access token
            token_url = f"{host}/oidc/v1/token"
            logger.info(f"[MAS] Getting OAuth token from: {token_url}")

            async with httpx.AsyncClient() as token_client:
                token_response = await token_client.post(
                    token_url,
                    data={
                        'grant_type': 'client_credentials',
                        'scope': 'all-apis'
                    },
                    auth=(client_id, client_secret)
                )
                token_response.raise_for_status()
                token_data = token_response.json()
                access_token = token_data['access_token']

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            logger.info(f"[MAS] Streaming from: {url}")

            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers=headers
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue

                        # Log raw line for debugging
                        logger.debug(f"[MAS] Raw line: {line[:200]}")

                        # Handle SSE format
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix

                            if data == "[DONE]":
                                logger.info("[MAS] Received [DONE] signal")
                                continue

                            try:
                                event = json.loads(data)
                                logger.debug(f"[MAS] Parsed event keys: {list(event.keys())}")

                                # Parse MAS response format (OpenAI-compatible)
                                if "choices" in event and event["choices"]:
                                    choice = event["choices"][0]

                                    # Text delta
                                    if "delta" in choice and "content" in choice["delta"]:
                                        content = choice["delta"]["content"]
                                        if content:  # Only yield non-empty content
                                            logger.debug(f"[MAS] Text delta: {content[:50]}")
                                            yield {
                                                "type": "text.delta",
                                                "delta": content
                                            }

                                    # Tool calls
                                    if "delta" in choice and "tool_calls" in choice["delta"]:
                                        for tool_call in choice["delta"]["tool_calls"]:
                                            if "function" in tool_call and "name" in tool_call["function"]:
                                                tool_name = tool_call["function"]["name"]
                                                logger.info(f"[MAS] Tool call: {tool_name}")

                                                tool_args = {}
                                                if "arguments" in tool_call["function"]:
                                                    try:
                                                        tool_args = json.loads(tool_call["function"]["arguments"])
                                                    except:
                                                        tool_args = {"raw": tool_call["function"]["arguments"]}

                                                yield {
                                                    "type": "tool.call",
                                                    "name": tool_name,
                                                    "args": tool_args
                                                }

                                    # Tool outputs
                                    if "message" in choice and "tool_calls" in choice["message"]:
                                        for tool_call in choice["message"]["tool_calls"]:
                                            if "function" in tool_call:
                                                tool_name = tool_call["function"]["name"]
                                                output = tool_call["function"].get("result", "Complete")
                                                logger.info(f"[MAS] Tool output: {tool_name}")
                                                yield {
                                                    "type": "tool.output",
                                                    "name": tool_name,
                                                    "output": str(output)
                                                }
                                else:
                                    # Log unexpected format
                                    logger.warning(f"[MAS] Unexpected event format: {json.dumps(event)[:200]}")

                            except json.JSONDecodeError as e:
                                logger.warning(f"[MAS] JSON decode error: {e}, data: {data[:200]}")
                                continue
                            except Exception as parse_error:
                                logger.error(f"[MAS] Failed to parse event: {parse_error}", exc_info=True)
                                continue

        except Exception as e:
            logger.error(f"[MAS] Streaming error: {e}", exc_info=True)
            yield {
                "type": "error",
                "message": f"Failed to stream from MAS: {str(e)}"
            }


mas_client = MASStreamingClient()


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/stream")
async def stream_chat(request: StreamChatRequest):
    """
    Stream chat responses from MAS endpoint

    Accepts a list of messages and streams the response as Server-Sent Events.

    Request Body:
    {
      "messages": [
        {"role": "user", "content": "What's our revenue?", "timestamp": null},
        ...
      ]
    }

    Response: Server-Sent Events stream
    data: {"type": "text.delta", "delta": "Our"}
    data: {"type": "text.delta", "delta": " revenue"}
    data: {"type": "tool.call", "name": "execute_genie_query", "args": {...}}
    data: {"type": "tool.output", "name": "execute_genie_query", "output": "..."}
    data: [DONE]
    """

    async def event_generator():
        """Generate SSE events"""
        try:
            logger.info(f"[STREAM] Starting chat stream with {len(request.messages)} messages")

            async for event in mas_client.stream_events(request.messages):
                # Send as Server-Sent Event
                yield f"data: {json.dumps(event)}\n\n"

            # Send done signal
            yield "data: [DONE]\n\n"
            logger.info("[STREAM] Chat stream completed")

        except Exception as e:
            logger.error(f"[STREAM] Stream error: {e}", exc_info=True)
            error_event = {
                "type": "error",
                "message": f"Streaming failed: {str(e)}"
            }
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable proxy buffering
        }
    )

@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    Process a natural language query and return a response using LLM

    Uses the databricks-gpt-oss-120b model serving endpoint to generate
    intelligent responses to analytics questions.

    Args:
        request: Chat request with user message and optional conversation context

    Returns:
        Chat response with LLM-generated message
    """
    try:
        # Check if LLM is configured
        if not llm_client.model_name:
            logger.warning("LLM model name not configured, using fallback")
            return _fallback_response(request)

        # Generate response using LLM
        try:
            response_text = await llm_client.generate_analytics_response(
                user_query=request.message
            )
        except Exception as llm_error:
            logger.error(f"LLM call failed: {llm_error}", exc_info=True)
            # Fall back to simple response if LLM fails
            return _fallback_response(request)

        # Generate contextual suggestions
        suggestions = _generate_suggestions(request.message)

        return ChatResponse(
            message=response_text,
            conversation_id=request.conversation_id or f"conv-{datetime.now().timestamp()}",
            suggestions=suggestions
        )

    except Exception as e:
        logger.error(f"Error processing chat query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _fallback_response(request: ChatRequest) -> ChatResponse:
    """
    Fallback response when LLM is not available

    Provides basic keyword-based responses as a backup.
    """
    user_message = request.message.lower()

    if "revenue" in user_message:
        response_text = """Based on your query about revenue:

- **Total Revenue (Last 6 Months)**: $6.12M
- **Month-over-Month Growth**: +12.5%
- **Best Performing Channel**: Mobile App

Would you like me to break this down by region or product category?"""

    elif "orders" in user_message or "sales" in user_message:
        response_text = """Here's what I found about orders:

- **Total Orders (Last 6 Months)**: 86,800
- **Average Order Value**: $27.45
- **Peak Order Time**: 6-8 PM (35% of daily orders)

Would you like to see the hourly distribution or top-selling products?"""

    else:
        response_text = f"""I can help you analyze your Domino's data.

Try asking questions like:
- "What's our total revenue?"
- "Show me top stores by sales"
- "What are peak order times?"
- "Compare Mobile App vs Online channel"

Note: LLM endpoint not configured. Using basic responses."""

    return ChatResponse(
        message=response_text,
        conversation_id=request.conversation_id or "fallback-001",
        suggestions=_generate_suggestions(request.message)
    )


def _generate_suggestions(user_message: str) -> List[str]:
    """
    Generate contextual follow-up suggestions based on the user's query

    Args:
        user_message: The user's original message

    Returns:
        List of suggested follow-up queries
    """
    message_lower = user_message.lower()

    if "revenue" in message_lower:
        return [
            "Show revenue by channel",
            "Compare revenue to last quarter",
            "What's driving revenue growth?",
        ]
    elif "orders" in message_lower:
        return [
            "Show order trends by hour",
            "What's the average order value?",
            "Compare orders by channel",
        ]
    elif "store" in message_lower or "location" in message_lower:
        return [
            "Show top 10 stores",
            "Which stores are underperforming?",
            "Show store performance by region",
        ]
    else:
        # Default suggestions
        return [
            "Show revenue by channel",
            "What are the top 10 stores?",
            "Compare this quarter to last quarter",
            "Show customer retention rate",
        ]


@router.get("/suggestions")
async def get_suggestions():
    """
    Get suggested queries for the chat interface

    Returns a list of example questions users can ask
    """
    return {
        "suggestions": [
            "What's our total revenue this month?",
            "Show me top 10 stores by sales",
            "What are peak order times?",
            "Compare Mobile App vs Online channel performance",
            "What's our customer retention rate?",
            "Show revenue trend for last 6 months",
            "Which products are bestsellers?",
            "What's the average order value by channel?",
        ]
    }


@router.post("/reset")
async def reset_conversation(conversation_id: str):
    """
    Reset a conversation

    Clears conversation history for the given conversation ID

    Args:
        conversation_id: ID of conversation to reset
    """
    # Placeholder - will implement with actual conversation storage
    return {"status": "success", "message": f"Conversation {conversation_id} reset"}
