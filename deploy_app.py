#!/usr/bin/env python3
"""
Deploy Databricks App using SDK

This script deploys the dpz-killer-app to Databricks Apps using the SDK API.
It uploads the source code and restarts the app.
"""
import os
import sys
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.apps import AppDeployment

APP_NAME = "kindling-marketing-insights"
SOURCE_PATH = os.path.dirname(os.path.abspath(__file__))

def main():
    print("=" * 60)
    print(f"Deploying {APP_NAME} to Databricks Apps")
    print("=" * 60)
    print()

    # Initialize workspace client (use DEFAULT profile from ~/.databrickscfg)
    print("🔐 Authenticating with Databricks...")
    try:
        ws = WorkspaceClient(profile="DEFAULT")
        print(f"✓ Connected to: {ws.config.host}")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        print("   Please configure Databricks authentication:")
        print("   - Set DATABRICKS_HOST and DATABRICKS_TOKEN env vars")
        print("   - Or configure ~/.databrickscfg")
        sys.exit(1)

    print()
    print(f"📦 Source directory: {SOURCE_PATH}")
    print()

    # Check if app exists
    print(f"🔍 Checking if app '{APP_NAME}' exists...")
    try:
        app = ws.apps.get(APP_NAME)
        print(f"✓ Found existing app")
        try:
            if hasattr(app, 'status') and app.status:
                print(f"  Status: {app.status.state}")
            elif hasattr(app, 'name'):
                print(f"  Name: {app.name}")
        except:
            pass  # Status not available, continue anyway
    except Exception as e:
        print(f"❌ App not found or error: {e}")
        print("   Please create the app first through Databricks UI")
        sys.exit(1)

    print()
    print("🚀 Deploying app...")
    print("   This will:")
    print("   - Upload source code from current directory")
    print("   - Update backend with fixed SQL queries")
    print("   - Update frontend with new metric endpoints")
    print("   - Restart the app")
    print()

    try:
        # Create deployment with source code path
        app_deployment = AppDeployment(source_code_path=SOURCE_PATH)

        # Deploy the app
        deployment = ws.apps.deploy(
            app_name=APP_NAME,
            app_deployment=app_deployment
        )

        print(f"✓ Deployment initiated")
        print(f"  Deployment ID: {deployment.deployment_id if hasattr(deployment, 'deployment_id') else 'N/A'}")
        print()
        print("⏳ Deployment in progress...")
        print("   The app will restart automatically")
        print("   This may take 2-3 minutes")
        print()

        # Wait for deployment to complete
        print("   You can monitor progress in Databricks UI:")
        print(f"   {ws.config.host}/apps/{APP_NAME}")
        print()

        print("=" * 60)
        print("✅ Deployment submitted successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Wait for app to restart (2-3 minutes)")
        print("  2. Check app logs for any errors")
        print("  3. Test the dashboard - filters should now work!")
        print("  4. New metric endpoints are available:")
        print("     - /api/metrics/cac-by-channel")
        print("     - /api/metrics/arpu-by-segment")
        print("     - /api/metrics/cohort-retention")
        print("     - /api/metrics/gmv-trend")
        print("     - /api/metrics/channel-mix")
        print("     - /api/metrics/attach-rate")
        print()

    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        print()
        print("Troubleshooting:")
        print("  - Check if you have permission to deploy apps")
        print("  - Verify the app exists in Databricks workspace")
        print("  - Check Databricks workspace connectivity")
        sys.exit(1)

if __name__ == "__main__":
    main()
