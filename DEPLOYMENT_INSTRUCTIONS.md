# Deployment Instructions for kindling-marketing-insights

## Quick Deploy via Databricks UI

Since the Databricks CLI is not installed locally, the easiest way to deploy is through the Databricks UI:

### Option 1: Direct File Upload (Fastest)

1. **Zip the project**:
   ```bash
   cd /Users/kevin.ippen/projects
   zip -r dpz-killer-app.zip dpz-killer-app -x "*.git*" "*/node_modules/*" "*/.venv/*" "*/__pycache__/*" "*.pyc"
   ```

2. **Upload via Databricks UI**:
   - Go to: https://adb-984752964297111.11.azuredatabricks.net/apps/kindling-marketing-insights
   - Click **Settings** or **Configuration**
   - Upload the zip file as source code
   - Click **Restart** to deploy

### Option 2: Git Sync (Recommended for future)

1. **Commit and push changes**:
   ```bash
   cd /Users/kevin.ippen/projects/dpz-killer-app
   git add .
   git commit -m "feat: add semantic layer metrics endpoints and fix SQL queries"
   git push
   ```

2. **Sync in Databricks**:
   - Go to app settings in Databricks UI
   - Click "Pull latest" or "Sync with Git"
   - Restart the app

### Option 3: Manual File Copy via Workspace (Alternative)

1. **Copy to Workspace**:
   - Upload files to `/Workspace/Users/your.email@domain.com/dpz-killer-app/`
   - Update app configuration to point to this workspace path

## What's Been Fixed

### Backend Changes
✅ Fixed SQL queries to use correct column names (`net_revenue`, `order_total`)
✅ Added 6 new semantic layer endpoints:
   - `/api/metrics/cac-by-channel` - Customer Acquisition Cost
   - `/api/metrics/arpu-by-segment` - Average Revenue Per User
   - `/api/metrics/cohort-retention` - Retention curves
   - `/api/metrics/gmv-trend` - Gross Merchandise Value
   - `/api/metrics/channel-mix` - Channel distribution
   - `/api/metrics/attach-rate` - Upsell metrics

### Frontend Changes
✅ Added API client methods for all new endpoints
✅ TypeScript types for all metrics
✅ Date range and segment filtering support
✅ Fresh build in `frontend/dist/`

## After Deployment

1. **Wait 2-3 minutes** for the app to restart

2. **Test the dashboard**:
   - Date range filters should now work
   - Real data from 164M row dataset
   - No more demo/fallback data

3. **Test new endpoints**:
   ```bash
   # Check if endpoints are available
   curl https://your-app-url/api/metrics/cac-by-channel
   curl https://your-app-url/api/metrics/arpu-by-segment
   ```

4. **Check logs** for any errors:
   - Look for SQL query results (should see actual data counts)
   - No more "AttributeError: _get_connection" errors
   - No more "column 'amount' not found" errors

## Troubleshooting

### If dashboard still shows demo data:
- Check app logs for SQL errors
- Verify Unity Catalog permissions in `app.yaml`
- Ensure SQL warehouse is running

### If new endpoints return 404:
- Verify deployment completed successfully
- Check that `backend/app/api/routes/metrics.py` was updated
- Restart the app again

### If frontend not loading:
- Check that `frontend/dist/` directory exists and has files
- Verify `backend/app/main.py` serves static files correctly

## Installing Databricks CLI (Optional for future deploys)

```bash
# Install Databricks CLI
pip install databricks-cli

# Configure
databricks configure --token

# Deploy
cd /Users/kevin.ippen/projects/dpz-killer-app
databricks apps deploy kindling-marketing-insights --source-code-path .
```
