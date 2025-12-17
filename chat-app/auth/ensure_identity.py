"""
Identity management for Chainlit sessions

Ensures each chat session has valid OBO authentication headers
for making requests to Databricks services (MAS, Genie Spaces).
"""
import chainlit as cl
from auth.identity import Identity, OboTokenSource
from typing import Optional, Dict
import logging
import jwt
import datetime

logger = logging.getLogger(__name__)


def _is_token_expired(token: str) -> bool:
    """Check if the OBO token is expired"""
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        exp = datetime.datetime.fromtimestamp(decoded["exp"], datetime.timezone.utc)
        time_left = (exp - datetime.datetime.now(datetime.timezone.utc)).total_seconds()

        if time_left <= 0:
            logger.warning(f"[AUTH] Token expired {abs(time_left):.0f} seconds ago")
            return True
        else:
            logger.info(f"[AUTH] Token valid for {time_left:.0f} more seconds")
            return False
    except Exception as e:
        logger.error(f"[AUTH] Error checking token expiration: {e}")
        return True


async def ensure_identity() -> Optional[Identity]:
    """
    Ensure we have valid OBO authentication for the current session

    Returns:
        Identity object with OBO token source, or None if auth failed
    """
    if not cl.context.session:
        logger.error("[AUTH] No session context available")
        return None

    user = cl.context.session.user
    if not user:
        logger.warning("[AUTH] User not found for this session")
        return None

    # Extract OBO token and headers from user metadata
    if not user.metadata:
        logger.error("[AUTH] No metadata found on user - OBO auth not configured")
        return None

    stored_token = user.metadata.get("obo_token")
    stored_headers = user.metadata.get("headers")

    if not stored_token or not stored_headers:
        logger.error("[AUTH] No OBO token/headers in user metadata")
        return None

    # Check if token is still valid
    if _is_token_expired(stored_token):
        logger.error("[AUTH] OBO token is expired - user needs to re-authenticate")
        return None

    # Create token source from stored headers
    def _headers_getter() -> Dict[str, str]:
        return stored_headers

    token_source = OboTokenSource(_headers_getter)

    logger.info(f"[AUTH] Valid OBO authentication for user: {user.email}")
    return Identity(
        email=user.email or user.identifier,
        display_name=user.display_name,
        token_source=token_source
    )
