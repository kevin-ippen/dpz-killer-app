"""
Chainlit UI Renderer for Streaming Responses

Handles rendering of MAS streaming events in the Chainlit UI:
- Status message (above) shows tool execution progress
- Text message (below) shows the actual response content
"""
import chainlit as cl
import logging
from typing import List

logger = logging.getLogger(__name__)


class ChainlitStream:
    """
    Renderer for streaming MAS responses in Chainlit UI

    Maintains two message elements:
    1. Status message (updated as tools execute)
    2. Text message (streams the actual response)
    """

    def __init__(self):
        self.status_msg: cl.Message = None  # Tool status message
        self.text_msg: cl.Message = None    # Actual response message
        self._status_lines: List[str] = []   # Tool execution log

    async def start(self):
        """Initialize the renderer (creates status message placeholder)"""
        self.status_msg = cl.Message(content="🔄 Processing your query...")
        await self.status_msg.send()

    async def on_tool_call(self, name: str, args: str):
        """
        Handle tool call event

        Args:
            name: Tool name (e.g., "query_genie_space")
            args: Tool arguments (JSON string)
        """
        logger.info(f"[RENDERER] Tool call: {name}")

        # Add tool to status log
        self._status_lines.append(f"🛠️ **{name}** started")
        await self._update_status()

    async def on_tool_output(self, name: str, output: str):
        """
        Handle tool output event

        Args:
            name: Tool name
            output: Tool output (may contain query results)
        """
        logger.info(f"[RENDERER] Tool output: {name}")

        # Update status log
        self._status_lines.append(f"✅ **{name}** completed")
        await self._update_status()

    async def on_text_delta(self, token: str):
        """
        Handle streaming text token

        Args:
            token: Next token in the response stream
        """
        # Create text message on first token
        if self.text_msg is None:
            self.text_msg = cl.Message(content="")
            await self.text_msg.send()

        # Stream token to message
        await self.text_msg.stream_token(token)

    async def on_error(self, message: str):
        """
        Handle error event

        Args:
            message: Error message
        """
        logger.error(f"[RENDERER] Error: {message}")
        error_msg = cl.Message(
            content=f"❌ **Error:** {message}",
            author="System"
        )
        await error_msg.send()

    async def finish(self):
        """Finalize the response"""
        # Remove status message once complete
        if self.status_msg:
            await self.status_msg.remove()

        # Ensure text message is finalized
        if self.text_msg:
            await self.text_msg.update()
            logger.info("[RENDERER] Response complete")

    async def _update_status(self):
        """Update the status message with current tool execution log"""
        if self.status_msg:
            # Show last 5 status lines to avoid clutter
            recent_lines = self._status_lines[-5:]
            content = "\n".join(recent_lines)
            self.status_msg.content = content
            await self.status_msg.update()
