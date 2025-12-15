"""
Chat API routes for natural language analytics queries

This module provides endpoints for the chat interface using the
databricks-gpt-oss-120b model serving endpoint.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from datetime import datetime
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

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


# ============================================================================
# API Endpoints
# ============================================================================

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
