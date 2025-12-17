"""
Multi-Agent Supervisor (MAS) Client for Genie Spaces

Handles communication with Databricks MAS endpoint which routes
queries across multiple Genie Spaces using OBO authentication.
"""
import httpx
import logging
from typing import List, Dict, Any, AsyncIterator
from config import settings
from auth.identity import Identity

logger = logging.getLogger(__name__)


class MASClient:
    """
    Client for Multi-Agent Supervisor (MAS) serving endpoints

    MAS routes natural language queries to appropriate Genie Spaces
    and streams back responses with tool execution status.
    """

    def __init__(self):
        self._base_url = f"https://{settings.databricks_host.replace('https://', '')}"
        self._endpoint = f"serving-endpoints/{settings.mas_endpoint_name}"
        self._timeout_s = settings.mas_timeout_s

    async def stream_raw(
        self,
        identity: Identity,
        messages: List[Dict[str, Any]]
    ) -> AsyncIterator[str]:
        """
        Stream raw SSE events from MAS endpoint

        Args:
            identity: User identity with OBO token source
            messages: OpenAI-compatible message list
                     [{"role": "user", "content": "What's our revenue?"}]

        Yields:
            Raw SSE event lines (data: {...})
        """
        url = f"{self._base_url}/{self._endpoint}/invocations"
        bearer_token = identity.token_source.bearer_token()

        if not bearer_token:
            raise ValueError("No bearer token available from identity")

        headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

        payload = {
            "input": messages,
            "stream": True
        }

        logger.info(f"[MAS] Streaming request to {self._endpoint}")
        logger.debug(f"[MAS] Messages: {messages}")

        async with httpx.AsyncClient(timeout=self._timeout_s) as http:
            try:
                async with http.stream("POST", url, headers=headers, json=payload) as resp:
                    resp.raise_for_status()

                    async for line in resp.aiter_lines():
                        if line.strip():
                            yield line

            except httpx.HTTPStatusError as e:
                logger.error(f"[MAS] HTTP error {e.response.status_code}: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"[MAS] Stream error: {e}", exc_info=True)
                raise


# Global MAS client instance
mas_client = MASClient()
