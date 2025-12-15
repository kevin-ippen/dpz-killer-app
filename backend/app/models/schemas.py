"""
Pydantic models for request/response validation

Define your data models here to match your Unity Catalog table schemas.
Pydantic provides automatic validation, serialization, and API documentation.

Example models are provided as templates - customize for your use case.
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ============================================================================
# Example Models - Replace with your domain models
# ============================================================================

class Item(BaseModel):
    """
    Example item model

    Replace this with your actual domain model matching your UC table schema.
    """
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True


class ItemDetail(Item):
    """Extended item model with computed fields"""
    url: Optional[str] = None
    score: Optional[float] = None


# ============================================================================
# Generic Response Models
# ============================================================================

class PaginatedResponse(BaseModel):
    """
    Generic paginated response model

    Use this for any list endpoint that supports pagination.
    """
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_more: bool


class ItemListResponse(BaseModel):
    """Example paginated response for items"""
    items: List[ItemDetail]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================================================
# Request Models
# ============================================================================

class SearchRequest(BaseModel):
    """Generic search request model"""
    query: str = Field(..., min_length=1, description="Search query")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum results")
    filters: Optional[dict] = Field(default=None, description="Optional filters")


class BulkOperationRequest(BaseModel):
    """Generic bulk operation request"""
    ids: List[str] = Field(..., min_items=1, description="List of IDs to process")
    operation: str = Field(..., description="Operation to perform")
    params: Optional[dict] = Field(default=None, description="Operation parameters")


# ============================================================================
# Response Models
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    environment: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime


class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool
    message: str
    data: Optional[Any] = None


# ============================================================================
# Model Serving Integration Models
# ============================================================================

class EmbeddingRequest(BaseModel):
    """Request model for embedding generation"""
    text: Optional[str] = None
    image_url: Optional[str] = None


class EmbeddingResponse(BaseModel):
    """Response model for embedding generation"""
    embedding: List[float]
    model: str
    dimension: int


class LLMRequest(BaseModel):
    """Request model for LLM inference"""
    prompt: str
    max_tokens: int = Field(default=512, ge=1, le=4096)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    system_prompt: Optional[str] = None


class LLMResponse(BaseModel):
    """Response model for LLM inference"""
    text: str
    model: str
    tokens_used: Optional[int] = None
