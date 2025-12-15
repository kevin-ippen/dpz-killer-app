"""
Databricks Apps entry point

This file is required by Databricks Apps and imports the FastAPI application
from the backend module. It adds the backend directory to sys.path so that
the app module can be imported correctly.
"""
import sys
import os

# Add backend directory to Python path so 'app' module can be found
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Now we can import the app
from app.main import app

# Expose the app for Databricks Apps
__all__ = ["app"]
