"""
Configuration for Domino's Analytics Chat App

Simplified configuration for Chainlit + MAS + Genie Spaces integration.
Uses OBO authentication for Databricks Apps deployment.
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Databricks Configuration (auto-injected by Databricks Apps)
    databricks_host: str = os.getenv("DATABRICKS_HOST", "")
    databricks_token: str = os.getenv("DATABRICKS_TOKEN", "")

    # MAS (Multi-Agent Supervisor) Endpoint
    # This should be your MAS serving endpoint name that routes to Genie Spaces
    mas_endpoint_name: str = os.getenv("MAS_ENDPOINT_NAME", "mas-3d3b5439-endpoint")

    # Genie Space IDs (from create_genie_spaces_basic.py)
    # You'll need to update these with actual space IDs after running the creation script
    executive_space_id: str = os.getenv("EXECUTIVE_SPACE_ID", "")
    marketing_space_id: str = os.getenv("MARKETING_SPACE_ID", "")
    customer_space_id: str = os.getenv("CUSTOMER_SPACE_ID", "")
    operations_space_id: str = os.getenv("OPERATIONS_SPACE_ID", "")
    sales_space_id: str = os.getenv("SALES_SPACE_ID", "")

    # Chat Configuration
    hist_max_turns: int = 10  # Maximum conversation turns to keep in history
    hist_max_chars: int = 16000  # Maximum characters in history (token budget)

    # Request Timeouts
    mas_timeout_s: float = 120.0  # MAS request timeout (2 minutes)

    # Authentication (OBO only for Databricks Apps)
    enable_obo_auth: bool = True  # Always true for Databricks Apps

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()
