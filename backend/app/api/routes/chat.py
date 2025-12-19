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

    def get_genie_coordinates_from_conversation(self, conversation_id: str, space_id: str = None) -> dict:
        """
        Query Genie Space to get full coordinates from conversation_id

        Args:
            conversation_id: Genie conversation ID
            space_id: Optional space ID (if known)

        Returns:
            Dict with spaceId, conversationId, messageId, attachmentId
            Returns None if not found
        """
        try:
            logger.info(f"[GENIE] Querying conversation: {conversation_id}, space: {space_id}")

            # If we have space_id, use it directly
            if space_id:
                # Get conversation messages
                messages = self.client.genie.list_messages(
                    space_id=space_id,
                    conversation_id=conversation_id
                )

                # Find the most recent message with query results
                for message in reversed(list(messages)):
                    logger.debug(f"[GENIE] Message {message.id}: status={message.status}")

                    # Look for completed messages with attachments
                    if message.status == "COMPLETED":
                        # Get full message details to access attachments array
                        try:
                            msg_details = self.client.genie.get_message(
                                space_id=space_id,
                                conversation_id=conversation_id,
                                message_id=message.id
                            )

                            # Extract attachment_id from attachments array
                            # Per Genie API: attachments populated when status is COMPLETED
                            if hasattr(msg_details, 'attachments') and msg_details.attachments:
                                attachments = msg_details.attachments
                                logger.debug(f"[GENIE] Found {len(attachments)} attachments in message {message.id}")

                                # Use the first attachment (typically the query result)
                                for attachment in attachments:
                                    attachment_id = getattr(attachment, 'id', None)

                                    if attachment_id:
                                        logger.info(f"[GENIE] ✅ Found coordinates! message={message.id}, attachment={attachment_id}")
                                        return {
                                            "spaceId": space_id,
                                            "conversationId": conversation_id,
                                            "messageId": message.id,
                                            "attachmentId": attachment_id
                                        }
                            else:
                                logger.debug(f"[GENIE] Message {message.id} has no attachments array")

                        except Exception as msg_err:
                            logger.warning(f"[GENIE] Could not get message details for {message.id}: {msg_err}")
                            continue

            logger.warning(f"[GENIE] Could not find Genie coordinates for conversation {conversation_id}")
            return None

        except Exception as e:
            logger.error(f"[GENIE] Failed to query Genie Space: {e}", exc_info=True)
            return None

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

                    logger.info(f"[MAS] Response status: {response.status_code}")
                    logger.info("[MAS] Starting to iterate response...")

                    # Use aiter_text with small chunks for immediate streaming
                    buffer = ""
                    async for chunk in response.aiter_text():
                        buffer += chunk

                        # Process complete lines
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)

                            if not line.strip():
                                continue

                            # Handle SSE format
                            if line.startswith("data: "):
                                data = line[6:]  # Remove "data: " prefix

                                if data == "[DONE]":
                                    logger.info("[MAS] Received [DONE] signal")
                                    continue

                                try:
                                    event = json.loads(data)
                                    event_type = event.get("type", "")

                                    # Log ALL event types for debugging
                                    logger.info(f"[MAS] >>> Received event type: {event_type}")

                                    # MAS Response format: response.output_text.delta
                                    if event_type == "response.output_text.delta":
                                        delta = event.get("delta", "")
                                        if delta:
                                            logger.debug(f"[MAS] Text delta: {delta[:50]}")
                                            yield {
                                                "type": "text.delta",
                                                "delta": delta
                                            }

                                    # MAS Response format: response.output_item.done
                                    elif event_type == "response.output_item.done":
                                        item = event.get("item", {})
                                        item_type = item.get("type", "")

                                        # Function call completed (tool/agent invocation finished)
                                        if item_type == "function_call":
                                            tool_name = item.get("name", "unknown")
                                            logger.info(f"[MAS] Tool completed: {tool_name}")
                                            logger.info(f"[MAS] Item keys: {list(item.keys())}")
                                            logger.info(f"[MAS] Full item structure (first 1000 chars): {json.dumps(item, indent=2)[:1000]}")

                                            # Emit tool.output to mark completion (stops spinner)
                                            yield {
                                                "type": "tool.output",
                                                "name": tool_name,
                                                "output": "Complete"
                                            }

                                        # Message with content (skip - this duplicates streamed content)
                                        # The text was already streamed via response.output_text.delta events
                                        elif "content" in item:
                                            logger.debug("[MAS] Skipping output_item content (already streamed)")
                                            pass

                                    # MAS Function result
                                    elif event_type == "response.function_call_result" or event_type == "response.tool_result":
                                        logger.info(f"[MAS] === ENTERED function_call_result handler ===")
                                        result = event.get("result", {})
                                        tool_name = result.get("name", "agent")
                                        tool_output = result.get("output", "Complete")

                                        logger.info(f"[MAS] Tool result: {tool_name}")
                                        logger.info(f"[MAS] Tool output type: {type(tool_output)}")
                                        logger.info(f"[MAS] Tool output preview: {str(tool_output)[:500]}")

                                        # Emit standard tool.output for UI badge
                                        yield {
                                            "type": "tool.output",
                                            "name": tool_name,
                                            "output": str(tool_output)
                                        }

                                        # Special handling for Genie/analytics queries - extract chart reference
                                        # Match various tool names: execute_genie_query, agent-sales-analytics, etc.
                                        if any(keyword in tool_name.lower() for keyword in ["genie", "analytics", "sales", "query"]):
                                            logger.info(f"[MAS] Detected analytics/query tool: {tool_name}")
                                            logger.info(f"[MAS] Tool output structure: {json.dumps(tool_output, indent=2)[:1000]}")

                                            if isinstance(tool_output, dict):
                                                try:
                                                    # MAS tool output format (varies by MAS implementation)
                                                    # Check for Genie coordinates in the output
                                                    genie_ref = None
                                                    query_meta = None  # Optional query metadata (title, description, etc.)

                                                    # Pattern 0: New structured format with genie.attachments[]
                                                    # {"agent_name": "...", "genie": {"space_id": "...", "attachments": [{"attachment_id": "..."}]}}
                                                    if "genie" in tool_output and isinstance(tool_output["genie"], dict):
                                                        genie_obj = tool_output["genie"]
                                                        if all(k in genie_obj for k in ["space_id", "conversation_id", "message_id"]):
                                                            # Extract attachment_id from attachments array
                                                            attachment_id = None
                                                            if "attachments" in genie_obj and isinstance(genie_obj["attachments"], list) and len(genie_obj["attachments"]) > 0:
                                                                attachment_id = genie_obj["attachments"][0].get("attachment_id")

                                                            # Also check for direct attachment_id field (backward compatibility)
                                                            if not attachment_id:
                                                                attachment_id = genie_obj.get("attachment_id")

                                                            if attachment_id:
                                                                logger.info(f"[MAS] ✅ Pattern 0: Found genie object with attachments! attachment={attachment_id[:12]}...")
                                                                genie_ref = {
                                                                    "spaceId": genie_obj["space_id"],
                                                                    "conversationId": genie_obj["conversation_id"],
                                                                    "messageId": genie_obj["message_id"],
                                                                    "attachmentId": attachment_id
                                                                }

                                                                # Extract query metadata for display
                                                                query_meta = None
                                                                if "attachments" in genie_obj and genie_obj["attachments"][0].get("query"):
                                                                    query = genie_obj["attachments"][0]["query"]
                                                                    query_meta = {
                                                                        "title": query.get("title", "Query Result"),
                                                                        "description": query.get("description"),
                                                                        "query_text": query.get("query_text")
                                                                    }
                                                            else:
                                                                logger.warning(f"[MAS] Pattern 0: genie object found but no attachment_id")

                                                    # Pattern 1: Direct coordinates (backward compatibility)
                                                    if all(k in tool_output for k in ["space_id", "conversation_id", "message_id", "attachment_id"]):
                                                        genie_ref = {
                                                            "spaceId": tool_output["space_id"],
                                                            "conversationId": tool_output["conversation_id"],
                                                            "messageId": tool_output["message_id"],
                                                            "attachmentId": tool_output["attachment_id"]
                                                        }

                                                    # Pattern 2: Nested in 'result' or 'data'
                                                    elif "result" in tool_output and isinstance(tool_output["result"], dict):
                                                        res = tool_output["result"]
                                                        if all(k in res for k in ["space_id", "conversation_id", "message_id", "attachment_id"]):
                                                            genie_ref = {
                                                                "spaceId": res["space_id"],
                                                                "conversationId": res["conversation_id"],
                                                                "messageId": res["message_id"],
                                                                "attachmentId": res["attachment_id"]
                                                            }
                                                        # Pattern 2b: Conversation ID in nested result, query Genie
                                                        elif "conversation_id" in res:
                                                            conversation_id = res["conversation_id"]
                                                            space_id = res.get("space_id")
                                                            logger.info(f"[MAS] Found conversation_id in nested result, querying Genie Space...")
                                                            genie_ref = self.get_genie_coordinates_from_conversation(
                                                                conversation_id=conversation_id,
                                                                space_id=space_id
                                                            )

                                                    # Pattern 3: Query Genie Space using conversation_id
                                                    # If we have conversation_id but not full coordinates, query Genie API
                                                    elif "conversation_id" in tool_output:
                                                        conversation_id = tool_output["conversation_id"]
                                                        space_id = tool_output.get("space_id")  # Optional

                                                        logger.info(f"[MAS] Found conversation_id, querying Genie Space...")
                                                        genie_ref = self.get_genie_coordinates_from_conversation(
                                                            conversation_id=conversation_id,
                                                            space_id=space_id
                                                        )

                                                    if genie_ref:
                                                        logger.info(f"[MAS] ✅ Found Genie coordinates! Emitting chart reference: {genie_ref}")

                                                        # Use query metadata if available, otherwise use defaults
                                                        chart_title = query_meta.get("title", "Query Result") if query_meta else "Query Result"
                                                        chart_subtitle = query_meta.get("description", "Click to view chart") if query_meta else "Click to view chart"

                                                        yield {
                                                            "type": "chart.reference",
                                                            "genie": genie_ref,
                                                            "title": chart_title,
                                                            "subtitle": chart_subtitle,
                                                            "query_text": query_meta.get("query_text") if query_meta else None
                                                        }
                                                    else:
                                                        logger.warning(f"[MAS] ❌ No Genie coordinates found in tool output. Tool: {tool_name}")
                                                        logger.debug(f"[MAS] Full output keys: {list(tool_output.keys())}")

                                                except Exception as e:
                                                    logger.error(f"[MAS] Failed to extract Genie reference: {e}", exc_info=True)
                                            else:
                                                logger.warning(f"[MAS] Tool output is not dict, type: {type(tool_output).__name__}, value length: {len(str(tool_output))}")

                                    # OpenAI-compatible format (fallback for other endpoints)
                                    elif "choices" in event and event["choices"]:
                                        choice = event["choices"][0]
                                        if "delta" in choice and "content" in choice["delta"]:
                                            content = choice["delta"]["content"]
                                            if content:
                                                logger.info(f"[MAS] OpenAI text delta: {content[:50]}")
                                                yield {
                                                    "type": "text.delta",
                                                    "delta": content
                                                }

                                    # MAS Response format: response.output_item.added (tool/agent starting)
                                    elif event_type == "response.output_item.added":
                                        item = event.get("item", {})
                                        item_type = item.get("type", "")

                                        # Function call starting (tool/agent invocation begins)
                                        if item_type == "function_call":
                                            tool_name = item.get("name", "unknown")
                                            logger.info(f"[MAS] Tool started: {tool_name}")
                                            # Emit tool.call to show badge with spinner
                                            yield {
                                                "type": "tool.call",
                                                "name": tool_name,
                                                "args": item.get("arguments", {})
                                            }
                                        else:
                                            logger.debug(f"[MAS] Item added: {item_type}")

                                    # Ignore these event types (just metadata)
                                    elif event_type in ["response.created", "response.done"]:
                                        logger.debug(f"[MAS] Metadata event: {event_type}")
                                        pass

                                    # Log unhandled events
                                    else:
                                        logger.debug(f"[MAS] Unhandled event: {json.dumps(event)[:300]}")

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
