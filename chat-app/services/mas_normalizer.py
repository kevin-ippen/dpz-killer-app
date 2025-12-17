"""
MAS Event Normalizer

Parses raw SSE events from MAS and normalizes them into structured events
for easier handling by the Chainlit renderer.
"""
import json
import logging
from typing import AsyncIterator, Dict, Any

logger = logging.getLogger(__name__)


async def normalize(raw_events: AsyncIterator[str]) -> AsyncIterator[Dict[str, Any]]:
    """
    Normalize raw SSE events from MAS into structured events

    Input (raw SSE):
        data: {"type": "text_delta", "delta": "Hello"}
        data: {"type": "tool_call", "name": "query_genie", "args": "..."}

    Output (normalized):
        {"type": "text.delta", "delta": "Hello"}
        {"type": "tool.call", "name": "query_genie", "args": "..."}

    Args:
        raw_events: Raw SSE event lines from MAS

    Yields:
        Normalized event dictionaries
    """
    async for line in raw_events:
        line = line.strip()

        # Skip empty lines and comments
        if not line or line.startswith(":"):
            continue

        # Parse SSE format: "data: {...}"
        if line.startswith("data:"):
            json_str = line[5:].strip()  # Remove "data:" prefix

            # Skip "[DONE]" marker
            if json_str == "[DONE]":
                logger.debug("[NORMALIZE] Received [DONE] marker")
                continue

            try:
                event = json.loads(json_str)

                # Normalize event type (convert underscores to dots)
                event_type = event.get("type", "")

                if event_type == "text_delta":
                    yield {
                        "type": "text.delta",
                        "delta": event.get("delta", "")
                    }

                elif event_type == "tool_call":
                    yield {
                        "type": "tool.call",
                        "name": event.get("name", "unknown_tool"),
                        "args": event.get("args", "")
                    }

                elif event_type == "tool_output":
                    yield {
                        "type": "tool.output",
                        "name": event.get("name", "unknown_tool"),
                        "output": event.get("output", "")
                    }

                elif event_type == "error":
                    yield {
                        "type": "error",
                        "message": event.get("message", "Unknown error")
                    }

                else:
                    # Pass through unknown event types
                    logger.warning(f"[NORMALIZE] Unknown event type: {event_type}")
                    yield event

            except json.JSONDecodeError as e:
                logger.error(f"[NORMALIZE] JSON decode error: {e}, line: {json_str}")
                continue
