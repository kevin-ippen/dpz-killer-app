"""
LLM Client for Databricks Model Serving

This module provides a client for interacting with Databricks model serving endpoints,
specifically for the databricks-gpt-oss-120b model.
"""
from typing import List, Dict, Optional
import logging
from app.core.config import settings
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Client for Databricks Model Serving LLM endpoints

    Handles authentication, request formatting, and response parsing
    for chat completion requests to Databricks model serving.
    Uses Databricks SDK's serving client which handles auth automatically.
    """

    def __init__(self):
        """Initialize LLM client with configuration from settings"""
        self.model_name = settings.LLM_MODEL_NAME
        self.timeout = settings.MODEL_SERVING_TIMEOUT
        self._workspace_client = None

        if not self.model_name:
            logger.warning("LLM_MODEL_NAME not configured - chat will use fallback responses")

    def _get_workspace_client(self) -> WorkspaceClient:
        """Get or create WorkspaceClient with default authentication"""
        if not self._workspace_client:
            logger.info("Initializing WorkspaceClient for serving endpoint access")
            self._workspace_client = WorkspaceClient()
        return self._workspace_client

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
            Exception: If the request fails
        """
        if not self.model_name:
            logger.error("LLM model name not configured")
            raise ValueError("LLM model name not configured")

        try:
            ws = self._get_workspace_client()

            # Convert message dicts to SDK ChatMessage objects
            sdk_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")

                # Map role string to ChatMessageRole enum
                if role == "system":
                    message_role = ChatMessageRole.SYSTEM
                elif role == "assistant":
                    message_role = ChatMessageRole.ASSISTANT
                else:
                    message_role = ChatMessageRole.USER

                sdk_messages.append(ChatMessage(role=message_role, content=content))

            logger.info(f"Sending chat completion request to endpoint: {self.model_name}")

            # Use SDK's query method which handles auth automatically
            response = ws.serving_endpoints.query(
                name=self.model_name,
                messages=sdk_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )

            # Extract content from response
            if response.choices and len(response.choices) > 0:
                choice = response.choices[0]
                if choice.message and choice.message.content:
                    return choice.message.content
                else:
                    logger.error("Response choice has no message content")
                    return "Sorry, the model returned an empty response."
            else:
                logger.error("Response has no choices")
                return "Sorry, the model returned an unexpected response format."

        except Exception as e:
            logger.error(f"Error calling LLM endpoint via SDK: {e}", exc_info=True)
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
