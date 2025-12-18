# Deploy Chainlit as Separate App (RECOMMENDED)

## Why This Approach?

After analyzing the working bi-hub-app reference implementation, we discovered:

1. **They run Chainlit directly**, not mounted as a sub-app:
   ```yaml
   command: ['chainlit', 'run', 'app.py']
   ```

2. **They include `user_api_scopes`** for serving endpoint access (which we removed earlier)

3. **Chainlit isn't designed to be mounted** at a subpath like `/chat` - it expects to run at root

**Solution:** Deploy Chainlit as a separate Databricks App and use its full URL in the iframe.

---

## Step 1: Deploy Chainlit App

The chat-app directory now has its own `app.yaml` configured to run Chainlit directly.

### Option A: Using Databricks CLI

```bash
cd /path/to/dpz-killer-app

# Deploy chat app
databricks apps deploy dpz-chat-app \
  --source-path ./chat-app \
  --description "Domino's Analytics Chat powered by Genie Spaces"
```

### Option B: Using Databricks UI

1. Go to Databricks workspace → **Apps**
2. Click **Create App**
3. Name: `dpz-chat-app`
4. Source: Upload `chat-app/` directory
5. Click **Deploy**

---

## Step 2: Get the Chat App URL

After deployment, you'll get a URL like:
```
https://adb-984752964297111.11.azuredatabricks.net/apps/{app-id}
```

Copy this URL - you'll need it for Step 3.

---

## Step 3: Update Main Dashboard to Use Chat App URL

### Update `frontend/src/pages/Chat.tsx`:

```typescript
// Change this line (currently line 20):
const CHAINLIT_URL = import.meta.env.VITE_CHAINLIT_URL || "/chat/";

// To use the separate app URL:
const CHAINLIT_URL = import.meta.env.VITE_CHAINLIT_URL || "https://adb-984752964297111.11.azuredatabricks.net/apps/{app-id}";
```

Replace `{app-id}` with your actual Chainlit app ID from Step 2.

### Rebuild frontend:

```bash
cd frontend
export PATH="/Users/kevin.ippen/.nvm/versions/node/v22.20.0/bin:$PATH"
npm run build
```

---

## Step 4: Simplify Main App (Remove Chainlit Mounting)

Since Chainlit is now separate, we can simplify `main.py`:

```python
# Remove these sections:
# - Lines 54-101: Chainlit mounting code
# - chat-app directory from deployment

# Keep:
# - Backend API routes
# - Frontend serving
# - SPA catch-all route
```

Create a simplified `main.py`:

```python
import sys
import os
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime

from app.api.routes import items, metrics, chat as chat_api
from app.models.schemas import HealthResponse
from app.core.config import settings

app = FastAPI(
    title="Domino's Analytics Dashboard",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(items.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow()
    )

# Serve frontend
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("assets/") or full_path == "health":
            raise HTTPException(status_code=404)
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_path)

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting Domino's Analytics Dashboard")

@app.on_event("shutdown")
async def shutdown_event():
    from app.repositories.databricks_repo import databricks_repo
    databricks_repo.close()
```

---

## Step 5: Update Main App Configuration

### Update `app.yaml`:

Remove chat-app related environment variables if any, keep only dashboard config:

```yaml
command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

resources:
  uc_securable:
    - securable_type: SCHEMA
      securable_full_name: bi_hub.sales_analytics
      privilege: USE
    - securable_type: CATALOG
      securable_full_name: bi_hub
      privilege: USE

env:
  - name: CATALOG_NAME
    value: "bi_hub"
  - name: SCHEMA_NAME
    value: "sales_analytics"
```

---

## Step 6: Redeploy Main Dashboard

```bash
cd /path/to/dpz-killer-app
databricks apps deploy dpz-killer-app --source-path .
```

---

## Benefits of Separate Apps

✅ **Simpler architecture** - No mounting complexity
✅ **Independent scaling** - Scale chat and dashboard separately
✅ **Easier debugging** - Issues isolated to specific app
✅ **Follows working pattern** - Matches bi-hub-app reference implementation
✅ **Proper Chainlit setup** - Runs at root as designed

---

## Potential Issues & Solutions

### Issue: Cross-origin iframe restrictions

**Symptom:** Iframe blocked by browser

**Solution:** Both apps are on same Databricks workspace, so same-origin policy applies. Should work fine.

### Issue: Authentication across apps

**Symptom:** Chat app shows authentication error

**Solution:** Both apps use workspace authentication automatically. Headers forwarded by Databricks.

### Issue: CORS errors

**Symptom:** API calls from chat fail

**Solution:** Not applicable - chat app doesn't call dashboard API, it calls MAS directly.

---

## Rollback Plan

If separate apps don't work, we can:

1. Keep chat as separate app
2. Deploy dashboard without chat tab
3. Users access chat app directly via bookmark/link

---

## Testing Checklist

After deployment:

- [ ] Main dashboard loads at root URL
- [ ] All dashboard tabs work (Home, Dashboard, Explore, Insights)
- [ ] Chat tab loads iframe with separate chat app URL
- [ ] Chat app shows welcome message
- [ ] Can send message and get response from MAS
- [ ] Chat history persists in conversation
- [ ] API endpoints work (/api/metrics/*, etc.)

---

## Summary

**Before:** Trying to mount Chainlit at `/chat` within main FastAPI app ❌
**After:** Deploy Chainlit separately, reference it via full URL ✅

This matches the working bi-hub-app implementation pattern.
