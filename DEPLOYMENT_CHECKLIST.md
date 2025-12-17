# Deployment Checklist - Domino's Analytics Chat

## Your Configuration

**MAS Endpoint:** `mas-3d3b5439-endpoint`
**Agent Name:** `dpz-mas-router`
**Workspace:** `adb-984752964297111.11.azuredatabricks.net`

---

## Pre-Deployment Checklist

### ✅ MAS Endpoint Ready
- [x] MAS endpoint created: `mas-3d3b5439-endpoint`
- [ ] MAS endpoint status: READY
  ```bash
  databricks serving-endpoints get mas-3d3b5439-endpoint | grep state
  # Should show: "state": "READY"
  ```

### ✅ You.com External Connection Configured
- [x] You.com external connection created in Unity Catalog
- [ ] Connection name: ________________ (fill in your actual name)
- [ ] Test connection works:
  ```bash
  # Test in SQL:
  # SELECT * FROM youcom_connection.search('test query')
  ```

### ✅ Genie Spaces Created
- [ ] Executive & Finance Analytics space
- [ ] Marketing Performance Analytics space
- [ ] Customer Analytics space
- [ ] Operations Analytics space
- [ ] Sales Analytics space

Get space IDs:
```python
from databricks.sdk import WorkspaceClient
w = WorkspaceClient()
for space in w.genie.list_spaces():
    print(f"{space.title}: {space.space_id}")
```

### ✅ Configuration Files Updated
- [x] `chat-app/config.py` - MAS endpoint set to `mas-3d3b5439-endpoint`
- [x] `app.yaml` - MAS endpoint permission added
- [x] `app.yaml` - MAS_ENDPOINT_NAME env var set
- [ ] `app.yaml` - Genie Space IDs added (see below)

---

## Step 1: Add Genie Space IDs to app.yaml

Open `app.yaml` and add your space IDs to the `env:` section:

```yaml
env:
  # ... existing vars ...

  # Genie Space IDs (from create_genie_spaces_basic.py)
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

## Step 2: Build Frontend

```bash
cd /Users/kevin.ippen/projects/dpz-killer-app/frontend
npm install
npm run build
cd ..
```

**Verify build:**
```bash
ls -la frontend/dist
# Should see: index.html, assets/, etc.
```

---

## Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Verify Chainlit installed:**
```bash
python -c "import chainlit; print(chainlit.__version__)"
# Should show: 1.0.0 or similar
```

---

## Step 4: Test Locally (Optional but Recommended)

### Terminal 1: Run Backend + Frontend
```bash
export MAS_ENDPOINT_NAME=mas-3d3b5439-endpoint
export DATABRICKS_HOST=https://adb-984752964297111.11.azuredatabricks.net
export DATABRICKS_TOKEN=<your-token>

uvicorn main:app --reload --port 8000
```

### Terminal 2: Run Chainlit
```bash
cd chat-app
export MAS_ENDPOINT_NAME=mas-3d3b5439-endpoint
export DATABRICKS_HOST=https://adb-984752964297111.11.azuredatabricks.net
export DATABRICKS_TOKEN=<your-token>

chainlit run app.py --port 8001
```

### Test
1. Open http://localhost:8000
2. Navigate to Chat tab
3. Should see Chainlit iframe
4. Send test query: "What's our total revenue?"

**If local test works,** proceed to deployment.

**If local test fails,** check logs for errors before deploying.

---

## Step 5: Deploy to Databricks Apps

```bash
# Option A: Using deploy_app.py
python deploy_app.py

# Option B: Using databricks CLI
databricks bundle deploy --target production
```

**Wait for deployment** (~2-3 minutes)

---

## Step 6: Get App URL

```bash
databricks apps get dpz-analytics-app --output json | jq -r '.url'
```

**Save this URL** - you'll need it for testing.

---

## Step 7: Verify Deployment

### Check App Status
```bash
databricks apps get dpz-analytics-app

# Should show:
# "state": "RUNNING"
# "url": "https://..."
```

### Check Logs
```bash
databricks apps logs dpz-analytics-app | tail -50

# Look for:
# "✅ Chainlit app loaded successfully"
# "✅ Multi-app routing configured"
```

---

## Step 8: Test Chat Integration

### Test 1: Access Chat Tab
1. Open app URL from Step 6
2. Navigate to **Chat** tab
3. Should see: "Welcome to Domino's Analytics Assistant! 🍕"

**If blank screen:** Check app logs for Chainlit errors

---

### Test 2: Internal Data Query (Genie Space)
**Query:** "What's our total revenue this month?"

**Expected:**
- Status message: "🛠️ query_genie_space started"
- Response streams with revenue data
- Status clears when complete

**If error:** Check MAS endpoint permissions in app.yaml

---

### Test 3: External Data Query (You.com)
**Query:** "What are current trends in pizza delivery?"

**Expected:**
- Status message: "🌐 Web Search started" (or similar)
- Response includes external web data
- May take 5-10 seconds (web searches are slower)

**If error:** Check You.com external connection in UC

---

### Test 4: Conversation History
1. Send query: "What's our customer retention?"
2. Send follow-up: "Compare that to last quarter"

**Expected:**
- Second query understands context
- References previous answer

**If no context:** Check `hist_max_turns` in chat-app/config.py

---

## Step 9: Post-Deployment Cleanup (Optional)

### Remove Old Chat Backend
Since Chainlit replaces the old chat:

```bash
# Remove old chat files
rm backend/app/api/routes/chat.py
rm backend/app/services/llm_client.py
rm -rf frontend/src/components/chat/
```

Update `backend/app/main.py`:
```python
# Remove this line:
# app.include_router(chat.router, prefix=settings.API_PREFIX)
```

---

## Troubleshooting

### Issue: Chat tab shows blank screen

**Check:**
```bash
databricks apps logs dpz-analytics-app | grep -i "chainlit\|error"
```

**Common causes:**
- Chainlit not installed → Re-run `pip install -r requirements.txt`
- Import error in main.py → Check Python path setup
- Missing dependencies → Check requirements.txt

**Fix:** Redeploy after fixing

---

### Issue: "Authentication failed"

**Check:**
```bash
databricks apps logs dpz-analytics-app | grep "\[AUTH\]"
```

**Common causes:**
- OBO token expired → User needs to refresh page
- Headers not forwarded → Check Databricks Apps OBO setup

**Fix:** User refreshes page (OBO token auto-renewed)

---

### Issue: MAS connection refused

**Check:**
```bash
databricks serving-endpoints get mas-3d3b5439-endpoint | grep state
```

**Common causes:**
- Endpoint not ready → Wait for "READY" state
- Wrong endpoint name → Verify `mas-3d3b5439-endpoint` in config
- Missing permission → Check `EXECUTE` privilege in app.yaml

**Fix:** Wait for endpoint or update permissions

---

### Issue: No response streaming

**Check MAS endpoint logs:**
```bash
databricks serving-endpoints get mas-3d3b5439-endpoint --logs
```

**Common causes:**
- Streaming not enabled on MAS endpoint
- SSE parsing error
- Network timeout

**Fix:** Enable streaming on MAS endpoint

---

## Success Criteria

Your deployment is successful when:

- [x] App state is "RUNNING"
- [x] Chat tab loads with welcome message
- [x] Internal queries return data from Genie Spaces
- [x] External queries search the web via You.com
- [x] Responses stream token-by-token
- [x] Conversation history works
- [x] Status messages show tool execution

---

## Monitoring (Ongoing)

### Daily Checks
```bash
# Check app health
databricks apps get dpz-analytics-app | grep state

# Check error rate
databricks apps logs dpz-analytics-app | grep -i error | wc -l
# Should be low (<10 per day)
```

### Weekly Checks
```bash
# Check MAS endpoint metrics
databricks serving-endpoints get mas-3d3b5439-endpoint --metrics

# Monitor:
# - Request count (should grow with usage)
# - Latency p95 (target: <2s)
# - Error rate (target: <1%)
```

---

## Quick Commands Reference

```bash
# Deploy
python deploy_app.py

# Check status
databricks apps get dpz-analytics-app

# View logs
databricks apps logs dpz-analytics-app

# Get URL
databricks apps get dpz-analytics-app --output json | jq -r '.url'

# Check MAS endpoint
databricks serving-endpoints get mas-3d3b5439-endpoint

# Restart app
databricks apps restart dpz-analytics-app
```

---

## Next Steps After Deployment

1. **Share with team** - Send app URL to stakeholders
2. **Collect feedback** - What queries work well? What needs improvement?
3. **Monitor usage** - Which Genie Spaces are most popular?
4. **Iterate on prompts** - Improve system prompt based on usage
5. **Add more spaces** - Create specialized Genie Spaces for specific use cases

---

## Support

**If you encounter issues:**
1. Check troubleshooting section above
2. Review logs: `databricks apps logs dpz-analytics-app`
3. Check documentation:
   - [CHAT_DEPLOYMENT_GUIDE.md](CHAT_DEPLOYMENT_GUIDE.md)
   - [MAS_SETUP_GUIDE.md](MAS_SETUP_GUIDE.md)
   - [YOUCOM_MCP_INTEGRATION.md](YOUCOM_MCP_INTEGRATION.md)

**Your app is ready to deploy! 🚀**
