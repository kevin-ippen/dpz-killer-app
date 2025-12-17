# Chainlit Chat Integration - Quick Start Checklist ✅

**Goal:** Get your Genie Spaces chat live in your dashboard in ~30 minutes

---

## Prerequisites Check

Before starting, verify you have:

```bash
# 1. Databricks CLI installed and configured
databricks --version
# Should show: Databricks CLI vX.X.X

# 2. Genie Spaces already created
# If not, run: python create_genie_spaces_basic.py

# 3. Your workspace has Genie enabled
# Check: https://<workspace>/genie
```

---

## Step 1: Get Your Genie Space IDs (5 min)

Run this Python script to get your space IDs:

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()
spaces = w.genie.list_spaces()

print("\n📋 Your Genie Space IDs:\n")
for space in spaces:
    print(f"- {space.title}")
    print(f"  Space ID: {space.space_id}\n")
```

**Save these IDs** - you'll need them in Step 3.

---

## Step 2: Create MAS Endpoint (10 min)

### Option A: Via Databricks UI (Easiest)

1. Go to your Databricks workspace → **Serving** tab
2. Click **Create serving endpoint**
3. Select **Multi-Agent Supervisor** (if available)
4. Configure:
   ```
   Name: mas-genie-router
   Spaces: [Add your 5 space IDs from Step 1]
   Enable streaming: ✅ Yes
   Size: Small (for dev) or Medium (for prod)
   ```
5. Click **Create** and wait ~2 minutes for it to be **READY**

### Option B: Via API (If MAS UI not available)

See [MAS_SETUP_GUIDE.md](MAS_SETUP_GUIDE.md) for advanced setup.

**Verify it works:**
```bash
databricks serving-endpoints get mas-genie-router | grep state
# Should show: "state": "READY"
```

---

## Step 3: Configure app.yaml (5 min)

Open `app.yaml` and add your space IDs:

```yaml
resources:
  uc_securable:
    # ... keep existing resources ...

    # ADD THIS: MAS endpoint permission
    - securable_type: SERVING_ENDPOINT
      securable_full_name: mas-genie-router
      privilege: EXECUTE

env:
  # ... keep existing vars ...

  # ADD THESE: Genie Space IDs
  - name: MAS_ENDPOINT_NAME
    value: mas-genie-router
  - name: EXECUTIVE_SPACE_ID
    value: YOUR_SPACE_ID_1
  - name: MARKETING_SPACE_ID
    value: YOUR_SPACE_ID_2
  - name: CUSTOMER_SPACE_ID
    value: YOUR_SPACE_ID_3
  - name: OPERATIONS_SPACE_ID
    value: YOUR_SPACE_ID_4
  - name: SALES_SPACE_ID
    value: YOUR_SPACE_ID_5
```

**Replace** `YOUR_SPACE_ID_X` with actual IDs from Step 1.

---

## Step 4: Test Locally (Optional, 5 min)

Only if you want to test before deploying:

```bash
# Terminal 1: Backend
pip install -r requirements.txt
cd frontend && npm run build && cd ..
uvicorn main:app --reload --port 8000

# Terminal 2: Chainlit
cd chat-app
pip install -r requirements.txt
chainlit run app.py --port 8001

# Open: http://localhost:8000 → Chat tab
```

**Test query:** "What's our total revenue?"

If it works locally, skip to Step 5. If not, see troubleshooting below.

---

## Step 5: Build & Deploy (5 min)

```bash
# Build frontend for production
cd frontend
npm install
npm run build
cd ..

# Deploy to Databricks Apps
python deploy_app.py

# The script will output your app URL
# Example: https://adb-123456.11.azuredatabricks.net/apps/dpz-analytics-app
```

Wait ~2 minutes for deployment to complete.

---

## Step 6: Verify & Test (5 min)

1. **Open your app URL** from Step 5

2. **Navigate to Chat tab**
   - Should see: "Welcome to Domino's Analytics Assistant! 🍕"

3. **Send test queries:**
   ```
   - "What's our total revenue this month?"
   - "Show me CAC by marketing channel"
   - "Which customer segment has highest ARPU?"
   ```

4. **Verify streaming:**
   - Status message appears: "🛠️ query_genie_space started"
   - Response streams token-by-token
   - Status clears when complete

5. **Test conversation history:**
   - Send follow-up: "Compare that to last month"
   - Should remember context

---

## ✅ Success Criteria

Your chat is working correctly if:

- [x] Chat tab loads without errors
- [x] You see the Chainlit welcome message
- [x] Test queries return relevant answers
- [x] Response streams (not all at once)
- [x] Follow-up questions work (remembers context)
- [x] Tool execution status appears ("🛠️ ... started")

---

## 🐛 Quick Troubleshooting

### Issue: Chat tab shows blank screen

**Quick fix:**
```bash
# Check deployment logs
databricks apps logs dpz-analytics-app | grep -i "error\|chainlit"

# Common causes:
# 1. Missing dependencies → Re-run: pip install -r requirements.txt
# 2. Main.py import error → Check: main.py line 28-41
```

---

### Issue: "Authentication failed"

**Quick fix:**
1. Refresh the page (OBO token might be expired)
2. Log out and back into Databricks workspace
3. Check app logs: `databricks apps logs dpz-analytics-app | grep "\[AUTH\]"`

---

### Issue: "Failed to process your query"

**Quick fix:**
```bash
# Verify MAS endpoint is ready
databricks serving-endpoints get mas-genie-router | grep state

# Should show "READY" - if not, wait a few minutes

# Check endpoint name matches
grep "MAS_ENDPOINT_NAME" app.yaml
# Should be: mas-genie-router
```

---

### Issue: Response not streaming (pops in all at once)

**Quick fix:**
1. Check MAS endpoint has streaming enabled (UI setting)
2. Verify: `databricks serving-endpoints get mas-genie-router | grep streaming`
3. If disabled, recreate endpoint with streaming enabled

---

## 📝 Post-Deployment Checklist

Once working, clean up your codebase:

### 1. Remove Old Chat Backend (Recommended)

```bash
# These files are no longer needed:
rm backend/app/api/routes/chat.py
rm backend/app/services/llm_client.py
rm frontend/src/components/chat/ChatContainer.tsx
rm frontend/src/components/chat/ChatInput.tsx
rm frontend/src/components/chat/ChatMessage.tsx
```

Update `backend/app/main.py`:
```python
# Remove this line:
app.include_router(chat.router, prefix=settings.API_PREFIX)
```

### 2. Update Documentation

Update your README to mention the new chat feature:

```markdown
## Features

- 📊 Executive Dashboard with key metrics
- 📈 Advanced Analytics with filtering
- 🤖 **NEW: AI-Powered Chat** - Ask questions in natural language
  - Powered by 5 specialized Genie Spaces
  - Streaming responses with tool visibility
  - Conversation history
```

### 3. Monitor Performance

Set up alerts for:
- MAS endpoint latency (target: <2s p95)
- Chat authentication failures (target: <0.1%)
- MAS error rate (target: <1%)

---

## 🚀 Next Steps

Now that chat is live:

### Week 1: Monitor & Iterate
1. Collect user feedback on chat quality
2. Review MAS routing accuracy (queries going to right space?)
3. Monitor response times and optimize if needed
4. Iterate on system prompt based on feedback

### Week 2: Optimize
1. Scale MAS endpoint if needed (Small → Medium)
2. Adjust token budget (`hist_max_turns` in config.py)
3. Add custom error messages for common issues
4. Create FAQ based on common queries

### Month 1: Enhance
1. Add chat history export feature
2. Implement saved queries/bookmarks
3. Create custom Genie Spaces for specific use cases
4. Add analytics on chat usage patterns

---

## 📚 Full Documentation

For detailed information, see:

- **[CHAT_INTEGRATION_SUMMARY.md](CHAT_INTEGRATION_SUMMARY.md)** - Complete implementation overview
- **[MAS_SETUP_GUIDE.md](MAS_SETUP_GUIDE.md)** - Detailed MAS endpoint setup
- **[CHAT_DEPLOYMENT_GUIDE.md](CHAT_DEPLOYMENT_GUIDE.md)** - Full deployment process
- **[chat-app/README.md](chat-app/README.md)** - Chainlit app technical docs

---

## ⏱️ Time Estimate

| Task | Time | Status |
|------|------|--------|
| Get Space IDs | 5 min | ☐ |
| Create MAS Endpoint | 10 min | ☐ |
| Configure app.yaml | 5 min | ☐ |
| Test Locally (optional) | 5 min | ☐ |
| Build & Deploy | 5 min | ☐ |
| Verify & Test | 5 min | ☐ |
| **Total** | **30 min** | |

---

**Ready? Start with Step 1! 🚀**
