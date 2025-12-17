# Chainlit Chat App Deployment Guide

## Overview

This guide walks you through deploying the Chainlit-powered Genie Spaces chat integration to your Domino's Analytics dashboard.

## What You're Deploying

**Before:** Basic chat with generic LLM, no streaming, no history

**After:** Premium chat experience with:
- ✅ 5 specialized Genie Spaces (Executive, Marketing, Customer, Operations, Sales)
- ✅ Streaming responses with tool execution status
- ✅ Multi-Agent Supervisor (MAS) intelligent routing
- ✅ OBO authentication (secure, user-scoped)
- ✅ Conversation history persistence
- ✅ Domino's premium UI styling

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Databricks Apps (Single Deployment)         │
│                                                      │
│  ┌──────────────┐         ┌─────────────────────┐  │
│  │   FastAPI    │         │   Chainlit App      │  │
│  │   Backend    │         │   (at /chat)        │  │
│  │              │         │                     │  │
│  │  + React UI  │◄────────┤  - OBO Auth         │  │
│  │  (at /)      │ iframe  │  - MAS Client       │  │
│  │              │         │  - Genie Streaming  │  │
│  └──────────────┘         └─────────────────────┘  │
│                                                      │
│            (Both share OBO authentication)          │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

### ✅ Before Starting

1. **Genie Spaces created** (run `create_genie_spaces_basic.py`)
2. **MAS endpoint deployed** (see [MAS_SETUP_GUIDE.md](MAS_SETUP_GUIDE.md))
3. **Space IDs captured** from Genie Space creation
4. **Databricks CLI installed** (`databricks --version`)
5. **Permissions:**
   - `CAN_CREATE_APPS` on workspace
   - `CAN_QUERY` on MAS endpoint
   - `SELECT` on Unity Catalog schemas

---

## Step 1: Configure Environment Variables

### Update chat-app/.env (for local testing)

```bash
# Create .env file in chat-app directory
cd chat-app

cat > .env <<EOF
# MAS Endpoint
MAS_ENDPOINT_NAME=mas-genie-router

# Genie Space IDs (from create_genie_spaces_basic.py output)
EXECUTIVE_SPACE_ID=01234567-89ab-cdef-0123-456789abcdef
MARKETING_SPACE_ID=01234567-89ab-cdef-0123-456789abcdef
CUSTOMER_SPACE_ID=01234567-89ab-cdef-0123-456789abcdef
OPERATIONS_SPACE_ID=01234567-89ab-cdef-0123-456789abcdef
SALES_SPACE_ID=01234567-89ab-cdef-0123-456789abcdef
EOF
```

> **Note:** Get your space IDs by running:
> ```python
> from databricks.sdk import WorkspaceClient
> w = WorkspaceClient()
> for space in w.genie.list_spaces():
>     print(f"{space.title}: {space.space_id}")
> ```

---

## Step 2: Update app.yaml for Deployment

Update [app.yaml](app.yaml:1-47) to include Chainlit dependencies and MAS permissions:

```yaml
# Command to start the application (unchanged)
command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Unity Catalog permissions
resources:
  uc_securable:
    # Existing permissions
    - securable_type: SCHEMA
      securable_full_name: main.dominos_analytics
      privilege: SELECT

    - securable_type: SCHEMA
      securable_full_name: main.dominos_realistic
      privilege: SELECT

    # LLM endpoint (existing - can keep for fallback)
    - securable_type: SERVING_ENDPOINT
      securable_full_name: databricks-gpt-oss-120b
      privilege: EXECUTE

    # NEW: MAS endpoint for Genie Spaces routing
    - securable_type: SERVING_ENDPOINT
      securable_full_name: mas-genie-router
      privilege: EXECUTE

# Environment variables
env:
  # Existing vars
  - name: DATABRICKS_HTTP_PATH
    value: /sql/1.0/warehouses/148ccb90800933a1
  - name: CATALOG
    value: main
  - name: SCHEMA
    value: dominos_analytics
  - name: LLM_MODEL_NAME
    value: databricks-gpt-oss-120b

  # NEW: Chat app configuration
  - name: MAS_ENDPOINT_NAME
    value: mas-genie-router
  - name: EXECUTIVE_SPACE_ID
    value: YOUR_SPACE_ID_HERE
  - name: MARKETING_SPACE_ID
    value: YOUR_SPACE_ID_HERE
  - name: CUSTOMER_SPACE_ID
    value: YOUR_SPACE_ID_HERE
  - name: OPERATIONS_SPACE_ID
    value: YOUR_SPACE_ID_HERE
  - name: SALES_SPACE_ID
    value: YOUR_SPACE_ID_HERE
```

---

## Step 3: Test Locally (Optional but Recommended)

### Terminal 1: Run Backend + Frontend

```bash
# Install dependencies
pip install -r requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Run backend (serves both backend API and frontend)
uvicorn main:app --reload --port 8000
```

### Terminal 2: Run Chainlit App

```bash
# Install Chainlit dependencies
cd chat-app
pip install -r requirements.txt

# Run Chainlit
chainlit run app.py --port 8001
```

### Test

1. Open http://localhost:8000 (main dashboard)
2. Navigate to Chat tab
3. Should see Chainlit iframe at http://localhost:8001
4. Send test query: "What's our total revenue?"

---

## Step 4: Build Frontend for Production

```bash
cd frontend
npm run build
cd ..
```

This creates `frontend/dist/` with production-optimized files.

---

## Step 5: Deploy to Databricks Apps

### Option A: Using deploy_app.py (Recommended)

```bash
# Deploy everything in one command
python deploy_app.py

# The script will:
# 1. Build frontend
# 2. Upload all files to DBFS
# 3. Deploy as Databricks App
# 4. Return app URL
```

### Option B: Using Databricks CLI

```bash
# Bundle the app
databricks bundle deploy --target production

# Get app URL
databricks apps get dpz-analytics-app --output json | jq -r '.url'
```

### Verify Deployment

1. Navigate to the app URL
2. Check logs: `databricks apps logs dpz-analytics-app`
3. Test chat: Navigate to Chat tab
4. Send query: "Show me CAC by channel"

---

## Step 6: Verify Chat Integration

### Check Mounted Routes

```bash
# View app logs
databricks apps logs dpz-analytics-app | grep "Multi-app"

# Should see:
# ✅ Multi-app routing configured:
#    - /chat     → Chainlit (Genie Spaces chat)
#    - /         → FastAPI backend + React frontend
```

### Test Chat Flow

1. **Open Chat Tab** in dashboard
2. **Send test queries:**
   - "What's our total revenue this month?"
   - "Show me CAC by marketing channel"
   - "Which customer segment has highest ARPU?"

3. **Verify streaming:**
   - Should see tool execution status (e.g., "🛠️ query_genie_space started")
   - Response should stream token-by-token
   - Status message should clear when complete

4. **Check conversation history:**
   - Send follow-up: "Compare that to last month"
   - Should maintain context

---

## Step 7: Monitor and Optimize

### Check MAS Endpoint Metrics

```bash
databricks serving-endpoints get mas-genie-router
```

Metrics to monitor:
- **Requests/min:** Should match chat usage
- **Latency p95:** Aim for <2s
- **Error rate:** Should be <1%

### Check Chainlit Logs

```bash
databricks apps logs dpz-analytics-app | grep "\[CHAT\]"
```

Look for:
- Authentication successes/failures
- MAS connection issues
- Streaming errors

### Optimize Performance

If slow responses:
1. **Scale up MAS endpoint:** Small → Medium
2. **Increase timeout:** Update `mas_timeout_s` in chat-app/config.py
3. **Reduce history:** Lower `hist_max_turns` to 5
4. **Cache common queries:** Add Redis cache layer

---

## Troubleshooting

### Issue: Chat iframe shows "Loading..." forever

**Symptoms:** White screen in chat tab
**Diagnosis:**
```bash
# Check if Chainlit mounted correctly
databricks apps logs dpz-analytics-app | grep "Chainlit"
```

**Fix:**
- Verify main.py mounts Chainlit at /chat
- Check requirements.txt includes chainlit==1.0.0
- Rebuild and redeploy

---

### Issue: Authentication fails (401 Unauthorized)

**Symptoms:** "Authentication failed. Please refresh the page."
**Diagnosis:**
```bash
# Check OBO auth logs
databricks apps logs dpz-analytics-app | grep "\[AUTH\]"
```

**Fix:**
- Verify x-forwarded-access-token header is present
- Check token expiration in logs
- Ensure app.yaml has correct permissions

---

### Issue: MAS connection fails (Connection refused)

**Symptoms:** "Failed to process your query: Connection refused"
**Diagnosis:**
```bash
# Check MAS endpoint status
databricks serving-endpoints get mas-genie-router | grep state
```

**Fix:**
- Verify MAS_ENDPOINT_NAME in env vars matches actual endpoint name
- Check endpoint is in "READY" state
- Verify `CAN_QUERY` permission in app.yaml

---

### Issue: No streaming (response appears all at once)

**Symptoms:** Response pops in completely, not token-by-token
**Diagnosis:**
```bash
# Check MAS streaming config
databricks serving-endpoints get mas-genie-router | grep streaming
```

**Fix:**
- Enable streaming on MAS endpoint
- Verify `Accept: text/event-stream` header in mas_client.py
- Check SSE parsing in mas_normalizer.py

---

### Issue: Chat history not working

**Symptoms:** Bot doesn't remember previous messages
**Diagnosis:** Check Chainlit context in app.py

**Fix:**
- Verify `_build_messages_with_history()` includes cl.chat_context
- Check `hist_max_turns` > 0 in config.py
- May need to add Lakebase for persistence (optional)

---

## Simplifications to Consider

### 1. Remove Old Chat Backend (Recommended)

Since Chainlit replaces the old chat, you can simplify:

**Remove these files:**
```bash
rm backend/app/api/routes/chat.py
rm backend/app/services/llm_client.py
rm frontend/src/components/chat/ChatContainer.tsx
rm frontend/src/components/chat/ChatInput.tsx
rm frontend/src/components/chat/ChatMessage.tsx
```

**Update backend/app/main.py:**
```python
# Remove this line:
app.include_router(chat.router, prefix=settings.API_PREFIX)
```

**Benefits:**
- Cleaner codebase
- Fewer dependencies
- No confusion between old and new chat

---

### 2. Consolidate Configuration

Move all Genie Space IDs to a single config file:

**Create chat-app/genie_spaces.json:**
```json
{
  "spaces": [
    {"name": "Executive & Finance", "id": "space-id-1"},
    {"name": "Marketing Performance", "id": "space-id-2"},
    {"name": "Customer Analytics", "id": "space-id-3"},
    {"name": "Operations", "id": "space-id-4"},
    {"name": "Sales", "id": "space-id-5"}
  ]
}
```

**Update config.py:**
```python
import json
from pathlib import Path

SPACES_CONFIG = json.loads(
    (Path(__file__).parent / "genie_spaces.json").read_text()
)
```

**Benefits:**
- Single source of truth
- Easier to update space IDs
- Can add space metadata (description, icon, etc.)

---

### 3. Add Health Check for Chat

Add a health endpoint to verify chat connectivity:

**Update chat-app/app.py:**
```python
@cl.on_chat_end
async def on_chat_end():
    """Log chat session end"""
    logger.info("[HEALTH] Chat session ended")

# Add custom health check
@app.get("/health")
async def chat_health():
    return {
        "status": "healthy",
        "mas_endpoint": settings.mas_endpoint_name,
        "spaces_configured": 5
    }
```

**Benefits:**
- Monitor chat availability
- Debug connectivity issues
- Include in overall app health check

---

## Next Steps

1. ✅ Chat deployed and working
2. ➡️ Monitor usage and performance
3. ➡️ Collect user feedback
4. ➡️ Iterate on system prompts for better responses
5. ➡️ Add advanced features:
   - Chat history export
   - Saved queries/bookmarks
   - Team chat sharing
   - Custom Genie Space creation

---

## Rollback Plan

If issues arise, you can quickly rollback:

```bash
# Revert to previous version
git checkout HEAD~1

# Rebuild frontend
cd frontend && npm run build && cd ..

# Redeploy
python deploy_app.py
```

Or simply disable Chainlit by commenting out in main.py:

```python
# try:
#     import chainlit.cli
#     ...
# except ImportError:
app = backend_app  # Use backend only
```

---

## Support Resources

- **Chainlit Docs:** https://docs.chainlit.io
- **Databricks Genie Docs:** https://docs.databricks.com/genie
- **MAS Setup Guide:** [MAS_SETUP_GUIDE.md](MAS_SETUP_GUIDE.md)
- **Deployment Issues:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**Congratulations! 🎉**

Your Domino's Analytics dashboard now has a premium, AI-powered chat experience backed by Databricks Genie Spaces!
