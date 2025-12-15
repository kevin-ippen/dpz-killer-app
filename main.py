"""
Databricks Apps entry point

This file is required by Databricks Apps and imports the FastAPI application
from the backend module.
"""
from backend.app.main import app

# Expose the app for Databricks Apps
__all__ = ["app"]
