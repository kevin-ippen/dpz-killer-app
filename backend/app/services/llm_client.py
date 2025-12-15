"""
LLM Client for Databricks Model Serving

This module provides a client for interacting with Databricks model serving endpoints,
specifically for the databricks-gpt-oss-120b model.
"""
from typing import List, Dict, Optional
import httpx
import logging
from app.core.config import settings
from databricks.sdk import WorkspaceClient

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Client for Databricks Model Serving LLM endpoints

    Handles authentication, request formatting, and response parsing
    for chat completion requests to Databricks model serving.
    """

    def __init__(self):
        """Initialize LLM client with configuration from settings"""
        self.endpoint = settings.LLM_ENDPOINT
        self.model_name = settings.LLM_MODEL_NAME
        self.timeout = settings.MODEL_SERVING_TIMEOUT

        # Use explicit token if available, otherwise use WorkspaceClient for service principal auth
        self.token = settings.DATABRICKS_TOKEN
        self._workspace_client = None

        if not self.endpoint:
            logger.warning("LLM_ENDPOINT not configured - chat will use fallback responses")
        if not self.token:
            logger.info("DATABRICKS_TOKEN not set - will use Databricks SDK default credentials")

    def _get_token(self) -> Optional[str]:
        """Get authentication token, using WorkspaceClient if explicit token not available"""
        if self.token:
            return self.token

        try:
            # Initialize WorkspaceClient with default credentials (service principal)
            if not self._workspace_client:
                logger.info("Initializing WorkspaceClient for authentication")
                self._workspace_client = WorkspaceClient()

            # Get token from the workspace client's auth config
            # The token might be a callable or direct value
            token = self._workspace_client.config.token
            if callable(token):
                token = token()

            if token:
                logger.info("Successfully obtained token from WorkspaceClient")
                return token
            else:
                logger.warning("WorkspaceClient token is None")
                return None
        except Exception as e:
            logger.error(f"Error getting token from WorkspaceClient: {e}", exc_info=True)
            return None

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500,
    ) -> str:
        """
        Send a chat completion request to the LLM endpoint

        Args:
            messages: List of message dicts with 'role' and 'content' keys
                     Example: [{"role": "user", "content": "What is revenue?"}]
            temperature: Sampling temperature (0-1), higher = more creative
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text response from the LLM

        Raises:
            httpx.HTTPError: If the request fails
        """
        if not self.endpoint:
            logger.error("LLM endpoint not configured")
            raise ValueError("LLM endpoint not configured")

        # Get authentication token (explicit or from WorkspaceClient)
        token = self._get_token()
        if not token:
            logger.error("Unable to obtain authentication token")
            raise ValueError("Authentication token not available")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        # Format request for Databricks model serving
        payload = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(f"Sending chat completion request to {self.endpoint}")
                logger.debug(f"Request payload: {payload}")

                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=headers,
                )

                response.raise_for_status()
                result = response.json()

                # Extract the generated text from the response
                # The response format may vary by model, adjust as needed
                if "choices" in result and len(result["choices"]) > 0:
                    message = result["choices"][0].get("message", {})
                    content = message.get("content", "")
                    return content
                elif "predictions" in result:
                    # Alternative format
                    return result["predictions"][0]
                else:
                    logger.error(f"Unexpected response format: {result}")
                    return "Sorry, I received an unexpected response format from the model."

        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling LLM endpoint: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Error calling LLM endpoint: {e}", exc_info=True)
            raise

    async def generate_analytics_response(
        self,
        user_query: str,
        context: Optional[str] = None
    ) -> str:
        """
        Generate a response for an analytics query

        Args:
            user_query: The user's natural language question
            context: Optional context about the data (e.g., recent results)

        Returns:
            LLM-generated response
        """
        # System prompt for analytics context
        system_prompt = """You are an expert data analyst assistant for Domino's Pizza analytics.
You help users understand their business data by answering questions about:
- Revenue and sales metrics
- Customer behavior and segmentation
- Order trends and patterns
- Channel performance (Mobile App, Online, Phone, Walk-in)
- Marketing campaign effectiveness

Be concise, data-driven, and helpful. Use bullet points when listing multiple items.
If you don't have specific data, acknowledge that and provide general guidance."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]

        # Add context if provided
        if context:
            messages.insert(1, {
                "role": "system",
                "content": f"Here is relevant data context:\n{context}"
            })

        return await self.chat_completion(messages=messages)


# Global LLM client instance
llm_client = LLMClient()
