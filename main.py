"""
Databricks Apps entry point

Imports the FastAPI backend application which serves:
1. API endpoints at /api/*
2. React frontend at /*
3. (Chainlit chat will be added later once backend works)
"""
import sys
import os

# Add backend directory to Python path BEFORE any imports
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

# Now import the backend app
from app.main import app as backend_app

# Use the backend app directly
# TODO: Add Chainlit mounting after backend deployment works
app = backend_app

# Expose the app for Databricks Apps
__all__ = ["app"]
