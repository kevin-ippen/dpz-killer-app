"""
Streaming Chat API - Direct MAS Integration (No Chainlit)

Provides a simple streaming endpoint that:
1. Accepts chat messages
2. Calls MAS endpoint
3. Streams responses as Server-Sent Events (SSE)
4. Returns formatted events for React component
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, AsyncIterator
import json
import logging
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]

class MASStreamClient:
    """Simple MAS streaming client"""

    def __init__(self):
        self.client = WorkspaceClient()

    async def stream_events(self, messages: List[Dict[str, str]], endpoint_name: str) -> AsyncIterator[Dict]:
        """
        Stream normalized events from MAS endpoint

        Yields events in format:
        - {"type": "text.delta", "delta": "..."}
        - {"type": "tool.call", "name": "...", "args": "..."}
        - {"type": "tool.output", "name": "...", "output": "..."}
        - {"type": "error", "message": "..."}
        """
        try:
            # Convert to Databricks SDK format
            sdk_messages = [
                ChatMessage(
                    role=ChatMessageRole.USER if msg["role"] == "user" else ChatMessageRole.ASSISTANT,
                    content=msg["content"]
                )
                for msg in messages
            ]

            # Stream from MAS
            response = self.client.serving_endpoints.query(
                name=endpoint_name,
                messages=sdk_messages,
                stream=True
            )

            for event in response:
                # Normalize events from MAS
                if hasattr(event, 'choices') and event.choices:
                    choice = event.choices[0]

                    # Text delta
                    if hasattr(choice, 'delta') and choice.delta:
                        if hasattr(choice.delta, 'content') and choice.delta.content:
                            yield {
                                "type": "text.delta",
                                "delta": choice.delta.content
                            }

                        # Tool calls
                        if hasattr(choice.delta, 'tool_calls') and choice.delta.tool_calls:
                            for tool_call in choice.delta.tool_calls:
                                if hasattr(tool_call, 'function'):
                                    # Tool started
                                    if hasattr(tool_call.function, 'name'):
                                        yield {
                                            "type": "tool.call",
                                            "name": tool_call.function.name,
                                            "args": getattr(tool_call.function, 'arguments', '')
                                        }

                    # Tool outputs (in message content)
                    if hasattr(choice, 'message') and choice.message:
                        if hasattr(choice.message, 'tool_calls') and choice.message.tool_calls:
                            for tool_call in choice.message.tool_calls:
                                if hasattr(tool_call, 'function'):
                                    # Tool completed (has result)
                                    yield {
                                        "type": "tool.output",
                                        "name": tool_call.function.name,
                                        "output": getattr(tool_call.function, 'result', 'Complete')
                                    }

        except Exception as e:
            logger.error(f"MAS streaming error: {e}", exc_info=True)
            yield {
                "type": "error",
                "message": str(e)
            }

mas_client = MASStreamClient()

@router.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    """
    Stream chat responses from MAS endpoint

    Request:
    {
      "messages": [
        {"role": "user", "content": "What's our revenue?"},
        ...
      ]
    }

    Response: Server-Sent Events stream
    data: {"type": "text.delta", "delta": "Our"}
    data: {"type": "text.delta", "delta": " revenue"}
    data: {"type": "tool.call", "name": "execute_genie_query"}
    data: {"type": "tool.output", "name": "execute_genie_query", "output": "..."}
    data: [DONE]
    """

    async def event_generator():
        """Generate SSE events"""
        try:
            # Get MAS endpoint name from env
            import os
            endpoint_name = os.getenv("MAS_ENDPOINT_NAME", "mas-3d3b5439-endpoint")

            async for event in mas_client.stream_events(request.messages, endpoint_name):
                # Send as SSE
                yield f"data: {json.dumps(event)}\n\n"

            # Send done signal
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}", exc_info=True)
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

@router.post("/chat/query")
async def query_chat(request: ChatRequest):
    """
    Non-streaming chat endpoint (for testing)

    Returns complete response at once instead of streaming.
    """
    try:
        import os
        endpoint_name = os.getenv("MAS_ENDPOINT_NAME", "mas-3d3b5439-endpoint")

        # Collect all events
        events = []
        async for event in mas_client.stream_events(request.messages, endpoint_name):
            events.append(event)

        # Combine text deltas
        content = ""
        tool_calls = []

        for event in events:
            if event["type"] == "text.delta":
                content += event["delta"]
            elif event["type"] == "tool.call":
                tool_calls.append(event)

        return {
            "content": content,
            "tool_calls": tool_calls,
            "events": events
        }

    except Exception as e:
        logger.error(f"Chat query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
