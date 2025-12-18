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
    Ensure we have valid authentication for the current session

    For PAT environments, we create a dummy identity that will use
    the app's service principal credentials (from DATABRICKS_TOKEN env var)

    Returns:
        Identity object with token source, or None if auth failed
    """
    from config import settings

    # For PAT environments, create a simple identity using app credentials
    # The app's DATABRICKS_TOKEN will be used for MAS calls
    class AppTokenSource:
        """Token source that uses app's service principal token"""
        def bearer_token(self) -> str:
            return settings.databricks_token

    # Create a dummy identity for the session
    logger.info("[AUTH] Using app-level PAT authentication")
    return Identity(
        email="app-user@databricks.com",
        display_name="Analytics User",
        token_source=AppTokenSource()
    )
