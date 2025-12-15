"""
Application configuration and settings

This module provides centralized configuration management using Pydantic settings.
Environment variables are loaded from .env file or system environment.
"""
import os
from typing import Optional, List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings with environment variable support

    All settings can be overridden via environment variables.
    For local development, create a .env file in the backend directory.
    For Databricks Apps, these are auto-injected from app.yaml.
    """

    # Application Info
    APP_NAME: str = "Databricks App"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production

    # Databricks Configuration
    # These are auto-injected by Databricks Apps when deployed
    DATABRICKS_HOST: Optional[str] = os.getenv("DATABRICKS_HOST")
    DATABRICKS_TOKEN: Optional[str] = os.getenv("DATABRICKS_TOKEN")
    DATABRICKS_HTTP_PATH: Optional[str] = os.getenv("DATABRICKS_HTTP_PATH")

    # Unity Catalog Configuration
    # Update these to match your UC catalog and schema
    CATALOG: str = "main"
    SCHEMA: str = "default"

    # Define your UC tables here
    # Example: PRODUCTS_TABLE: str = "products"

    # UC Volumes for file storage (images, documents, etc.)
    # Example: IMAGES_VOLUME_PATH: str = "/Volumes/main/default/files/"

    # Model Serving Endpoints
    # LLM_MODEL_NAME is the serving endpoint name (not full URL)
    LLM_MODEL_NAME: Optional[str] = os.getenv("LLM_MODEL_NAME", "databricks-gpt-oss-120b")

    # API Configuration
    API_PREFIX: str = "/api"  # Required for Databricks Apps OAuth2
    API_VERSION: str = "v1"
    CORS_ORIGINS: List[str] = ["*"]  # Update for production with specific origins

    # Pagination Defaults
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Request Timeouts (seconds)
    REQUEST_TIMEOUT: int = 30
    MODEL_SERVING_TIMEOUT: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
# Import this in other modules: from app.core.config import settings
settings = Settings()
