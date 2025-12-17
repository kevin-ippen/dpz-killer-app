"""
Identity and authentication models for OBO (On-Behalf-Of) auth
"""
from pydantic import BaseModel, Field
from typing import Protocol, Dict, Callable, Any


class TokenSource(Protocol):
    """Protocol for bearer token providers"""
    def bearer_token(self) -> str: ...


class OboTokenSource:
    """
    OBO token source that extracts token from Databricks App headers

    In Databricks Apps, the user's access token is forwarded via
    the x-forwarded-access-token header for secure OBO authentication.
    """

    def __init__(self, headers_getter: Callable[[], Dict[str, str]]):
        self._headers_getter = headers_getter

    def bearer_token(self) -> str:
        """Extract bearer token from forwarded headers"""
        headers = self._headers_getter() or {}
        return headers.get("x-forwarded-access-token", "")


class Identity(BaseModel):
    """
    User identity with authentication context

    Stores user email, display name, and token source for making
    authenticated requests to Databricks services (MAS, Genie, etc.)
    """
    email: str
    display_name: str
    # Token source for obtaining bearer tokens
    # Using Field(repr=False) prevents tokens from appearing in logs
    # Type Any is used since TokenSource is a Protocol and can't be used directly in Pydantic
    token_source: Any = Field(repr=False)

    class Config:
        arbitrary_types_allowed = True  # Allow arbitrary types
