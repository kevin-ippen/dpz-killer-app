# Chainlit Mounting Diagnostic Guide

## Current Status
Chainlit mount at `/chat` returns **404 Not Found** despite logs showing successful mounting.

---

## Diagnostic Test #1: Catch-All Route Test (ACTIVE)

**Changes Made:**
- Commented out entire SPA catch-all route in `main.py` (lines 154-178)
- Added diagnostic logging to `RootPathASGI` wrapper (line 87)

**What to Check After Deployment:**

### A. Access `/chat/` in the browser

**If it works (200 OK):**
- ✅ **Conclusion:** The catch-all route was interfering
- 🔧 **Fix:** Need to ensure mount is registered before catch-all
- ⚠️ **Note:** This shouldn't happen since mount is at line 95 and catch-all is at line 154

**If it still fails (404):**
- ❌ **Conclusion:** Either mount isn't working OR Chainlit is broken
- 📋 **Next step:** Check logs below

### B. Check logs for `🔍 RootPathASGI received...`

**If you see this log:**
```
🔍 RootPathASGI received http request: /
🔍 RootPathASGI received http request: /assets/...
```
- ✅ **Conclusion:** Mount IS receiving requests
- ❌ **Problem:** Chainlit itself is returning 404
- 📋 **Next step:** Look for Chainlit initialization errors

**If you DON'T see this log:**
- ❌ **Conclusion:** Mount is not receiving requests at all
- 🔧 **Fix:** Try alternative mounting approach (see below)

### C. Check for Chainlit startup errors

**Look for errors around:**
```
✅ Chainlit mounted at /chat with root_path middleware
...
🚀 Starting Domino's Analytics Dashboard
```

**Common errors:**
- `ModuleNotFoundError` - Missing dependencies
- `ImportError` - Issues in chat-app/app.py
- `ConfigurationError` - Issues in .chainlit/config.toml
- No error but mount silent - Chainlit may need root_path env var

---

## Diagnostic Test #2: Alternative Mount Strategy

If Test #1 shows the mount isn't receiving requests, try the alternative approach:

**File:** `main_alternative.py`

**Changes:**
1. Update `app.yaml` to use alternative entry point:
   ```yaml
   command: ["uvicorn", "main_alternative:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. Redeploy

**How This Differs:**
- Uses Starlette's explicit `Router` with `Mount` objects
- Routes defined as a list in priority order (more explicit)
- May handle mount precedence differently than FastAPI's `app.mount()`

**Expected Result:**
- If this works → FastAPI's mount has lower priority than decorated routes
- If this fails → Problem is with Chainlit itself, not mounting

---

## Diagnostic Test #3: Standalone Chainlit Test

Test if Chainlit works independently (local only):

```bash
cd /path/to/dpz-killer-app
python test_chainlit_standalone.py
```

Then access: http://localhost:8000

**If this works:**
- ✅ Chainlit is fine
- ❌ Problem is with how we're mounting it

**If this fails:**
- ❌ Chainlit initialization is broken
- 📋 Check errors for missing dependencies, config issues, etc.

---

## Known Issues & Root Causes

### Issue 1: FastAPI Route Priority
**Problem:** `@app.get()` routes may have higher priority than `app.mount()`

**Evidence:**
- Mount registered at line 95
- Catch-all at line 153
- But catch-all still intercepts `/chat`

**Fix:** Use Starlette Router with explicit Mount objects

### Issue 2: Chainlit Root Path Configuration
**Problem:** Chainlit may not know it's mounted at `/chat`

**Evidence:**
- Assets return 404 (looking for `/assets` instead of `/chat/assets`)
- No root_path env var set
- Custom RootPathASGI wrapper may not be working

**Fix Options:**
1. Set `os.environ["CHAINLIT_ROOT_PATH"] = "/chat"` before import
2. Configure root_path in `.chainlit/config.toml`
3. Use Chainlit's built-in mount support (if it exists)

### Issue 3: Chainlit Doesn't Support Mounting
**Problem:** Chainlit may be designed to run at root path only

**Evidence:**
- All mounting attempts fail
- Standalone test works but mounted doesn't
- No documentation on mounting Chainlit at subpaths

**Fix:** Deploy Chainlit as separate Databricks App:
1. Create new app for chat-app/
2. Use full URL in iframe: `https://workspace/apps/{app-id}/`
3. Configure CORS if needed

---

## Next Steps (Priority Order)

1. **Check current deployment logs** for Test #1 results
2. **If mount not receiving requests:** Try `main_alternative.py`
3. **If Chainlit returns 404:** Add `CHAINLIT_ROOT_PATH` env var
4. **If all mounting fails:** Run standalone test to verify Chainlit works
5. **If standalone works but mounting doesn't:** Deploy as separate app (fallback)

---

## Questions for Databricks Assistant

If mounting continues to fail, ask assistant:

1. **Does FastAPI's `app.mount()` have lower priority than `@app.get()` decorated routes?**
   - If yes, we need to use Starlette Router

2. **Does Chainlit support being mounted at a subpath?**
   - Check Chainlit docs for mounting examples
   - May need specific configuration

3. **What's the proper way to mount an ASGI sub-application in FastAPI?**
   - Should we use `Mount` from starlette.routing instead?
   - Is there middleware we need?

4. **Can we see the FastAPI route table?**
   - Print `app.routes` to see registration order
   - Check if mount appears before or after catch-all

---

## Files to Review

### Primary Files
1. **`main.py`** - Current implementation (lines 54-96 mount, 148-178 catch-all)
2. **`chat-app/app.py`** - Chainlit handlers (looks correct)
3. **`chat-app/.chainlit/config.toml`** - Chainlit config (no root_path setting)

### Alternative Files
4. **`main_alternative.py`** - Starlette Router approach
5. **`test_chainlit_standalone.py`** - Standalone verification

### Support Files
6. **`frontend/src/pages/Chat.tsx`** - Iframe that loads /chat/
7. **`chat-app/config.py`** - MAS endpoint configuration
8. **`chat-app/auth/ensure_identity.py`** - PAT authentication

---

## Success Criteria

✅ **Mount is working when:**
- Browser request to `/chat/` returns Chainlit UI (not 404)
- Logs show `🔍 RootPathASGI received http request: /`
- Iframe in Chat tab loads Chainlit interface
- Chat interactions work with MAS endpoint

---

## Fallback Plan: Separate App Deployment

If all mounting attempts fail, deploy Chainlit separately:

1. Create new `app.yaml` in `chat-app/`:
   ```yaml
   command: ["chainlit", "run", "app.py", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. Deploy as separate app:
   ```bash
   databricks apps deploy chat-app --source-path ./chat-app
   ```

3. Update `Chat.tsx` with new URL:
   ```typescript
   const CHAINLIT_URL = "https://workspace.databricks.net/apps/{chat-app-id}/"
   ```

4. Configure CORS if needed

**Pros:**
- ✅ Avoids mounting complexity
- ✅ Chainlit runs at root path as designed
- ✅ Independent scaling and deployment

**Cons:**
- ❌ Two separate apps to manage
- ❌ May need CORS configuration
- ❌ Cross-origin iframe restrictions

---

## Summary

We've isolated the issue to one of three root causes:
1. **Catch-all route interfering** (unlikely, but testing)
2. **Mount not working** (FastAPI vs Starlette routing)
3. **Chainlit initialization failing** (check logs for errors)

Current diagnostic changes will definitively identify which one.
