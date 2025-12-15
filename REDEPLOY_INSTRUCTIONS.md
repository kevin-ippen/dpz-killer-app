# How to Redeploy kindling-marketing-insights

## The Problem
The app is serving old JavaScript files with crashes. Logs show:
```
GET /assets/index-wbfesa7F.js   ← OLD (has crashes)
```

But latest git commit has:
```
frontend/dist/assets/index-CZNNMZta.js   ← NEW (crash fixes)
```

## Solution: Redeploy the App

### Option 1: Via Databricks UI (Easiest)

1. **Go to your app:**
   ```
   https://adb-984752964297111.11.azuredatabricks.net/apps/kindling-marketing-insights
   ```

2. **Stop the app:**
   - Click **Settings** or **Configuration**
   - Click **Stop** button
   - Wait for status to show "Stopped"

3. **Update source code:**
   - If using Git sync: Click **Pull from Git** or **Sync**
   - If using file upload: Upload the latest `/Users/kevin.ippen/projects/dpz-killer-app-deploy.zip`

4. **Start the app:**
   - Click **Start** or **Restart**
   - Wait 2-3 minutes for deployment

5. **Verify:**
   - Check logs for: `GET /assets/index-CZNNMZta.js`
   - Open dashboard, should not crash

### Option 2: Via Databricks CLI (If Available)

```bash
# If you have databricks CLI installed
databricks apps stop kindling-marketing-insights
databricks apps deploy kindling-marketing-insights --source-code-path /Users/kevin.ippen/projects/dpz-killer-app
databricks apps start kindling-marketing-insights
```

### Option 3: Recreate Deployment Package

If the UI isn't picking up changes:

```bash
cd /Users/kevin.ippen/projects
rm -f dpz-killer-app-deploy.zip

zip -r dpz-killer-app-deploy.zip dpz-killer-app \
  -x "dpz-killer-app/.git/*" \
  -x "dpz-killer-app/frontend/node_modules/*" \
  -x "dpz-killer-app/backend/.venv/*" \
  -x "dpz-killer-app/*/__pycache__/*" \
  -x "dpz-killer-app/*.pyc"

# Upload dpz-killer-app-deploy.zip via UI
```

## Verification Steps

After redeploying, check these in order:

1. **Check logs for correct file:**
   ```
   2025-12-15 XX:XX:XX APP ...
   INFO: "GET /assets/index-CZNNMZta.js HTTP/1.1" 200 OK
   ```
   ✅ Should see `index-CZNNMZta.js` NOT `index-wbfesa7F.js`

2. **Open dashboard in browser:**
   - Go to Overview tab
   - Change date range → should NOT crash
   - Go to Customers tab → should NOT crash
   - Go to Marketing tab → should NOT crash

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Console should have no errors
   - Network tab should show 200 status for all API calls

## What Changed in Latest Version (Commit 3505ad2)

**Crash Fixes:**
- Safe data access with optional chaining (`item?.gmv || 0`)
- Null checks on all reduce operations
- Safe division for percentage calculations

**Files Changed:**
- `frontend/dist/assets/index-CZNNMZta.js` (new file with fixes)
- `frontend/src/pages/Dashboard.tsx` (source code with fixes)

## Troubleshooting

### If Still Crashing After Redeploy:

1. **Hard refresh browser:**
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Firefox: Ctrl+F5
   - This clears cached JavaScript files

2. **Check browser cache:**
   - Open DevTools → Network tab
   - Check "Disable cache" checkbox
   - Reload page

3. **Check actual deployed files:**
   - In app logs, look for the served file name
   - Should be `index-CZNNMZta.js` not `index-wbfesa7F.js`

4. **Verify git commit on deployed app:**
   - If using Git sync, check which commit is deployed
   - Should be `3505ad2` or later

### If App Won't Start:

Check logs for errors like:
- `ModuleNotFoundError` → missing Python dependencies
- `FileNotFoundError` → frontend/dist not found
- Authentication errors → check app.yaml permissions

## Quick Test in Browser Console

After redeploying, open browser console and run:
```javascript
// Should NOT crash
const test = [{ gmv: 1000 }, null, { gmv: 2000 }];
const sum = test.reduce((s, item) => s + (item?.gmv || 0), 0);
console.log(sum); // Should print 3000
```

If this works, the new code is loaded. If it errors, old code is still cached.
