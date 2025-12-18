# Implementation Plan: Chat UI Based on Databricks App Template

## DAB Template Analysis (e2e-chatbot-app-next)

### Stack
- **Runtime:** Node.js 20
- **Backend:** Express.js + TypeScript
- **Frontend:** React + Vite + TypeScript
- **AI:** Vercel AI SDK (`ai` package)
- **Database:** PostgreSQL via Lakebase (optional, falls back to ephemeral mode)
- **Auth:** Session-based with Databricks workspace integration

### Key Features
1. **Streaming Chat** - Server-Sent Events via Vercel AI SDK
2. **Message Persistence** - Stores chat history in Lakebase (optional)
3. **Multi-modal Input** - File uploads, images
4. **Tool Calling** - MCP (Model Context Protocol) integration
5. **Chat Management** - Multiple conversations, delete, share

### Architecture
```
Client (React + AI SDK hooks)
  ↓ POST /api/chat
Express Server
  ↓ streamText() from AI SDK
Databricks Serving Endpoint
```

---

## Our Stack (Different!)

- **Runtime:** Python 3.10
- **Backend:** FastAPI
- **Frontend:** React + Vite + TypeScript
- **AI:** Direct Databricks SDK calls
- **Database:** None yet (stateless)
- **Auth:** Databricks Apps native auth

---

## Adaptation Strategy

Since we have a **Python backend**, we can't use the Node.js template directly. Instead:

### What We'll Adopt (UI Patterns)
1. ✅ **Chat component structure** - Message list, input, streaming display
2. ✅ **Message rendering** - User/assistant bubbles, markdown, code blocks
3. ✅ **Tool call visualization** - Show when Genie Spaces are queried
4. ✅ **Streaming indicators** - Loading states, typing animation
5. ✅ **Error handling** - Clear error messages

### What We'll Adapt (Backend)
1. ✅ **SSE Streaming** - Python equivalent using FastAPI StreamingResponse
2. ✅ **MAS Integration** - Already have this (WorkspaceClient)
3. ✅ **Message normalization** - Already have this (mas_normalizer.py)
4. ✅ **Session management** - Use React state (no DB yet)

### What We'll Skip (For Now)
1. ⏭️ Database persistence - Keep stateless initially
2. ⏭️ Multi-modal input - Text only for MVP
3. ⏭️ Chat history sidebar - Single conversation for now
4. ⏭️ Share/delete features - Not needed yet

---

## Rollback Plan (Clean Up Chainlit Mess)

### Files to DELETE
```
chat-app/                              # Entire directory
main_alternative.py                    # Alternative mounting approach
main_native.py                         # Native chat version
test_chainlit_standalone.py            # Standalone test
CHAINLIT_DIAGNOSTIC_GUIDE.md          # Diagnostic guide
DEPLOY_SEPARATE_CHAINLIT.md          # Separate app guide
NATIVE_CHAT_VS_CHAINLIT.md           # Comparison doc
frontend/src/pages/Chat.tsx           # Old iframe version
backend/app/api/routes/chat_stream.py  # Keep but rename/revise
```

### Files to RESTORE/FIX
```
main.py                               # Remove Chainlit mounting code
requirements.txt                      # Remove Chainlit downgrades
frontend/src/App.tsx                  # Remove Chat import (temporarily)
```

### requirements.txt Changes

**REMOVE (Chainlit downgrades):**
```
chainlit==1.0.0
fastapi==0.100.1      # Upgrade back to latest
starlette==0.27.0     # Upgrade back to latest
httpx==0.24.1         # Upgrade back to latest
uvicorn==0.23.2       # Upgrade back to latest
```

**KEEP:**
```
databricks-sdk
pydantic
python-dotenv
```

**ADD (if needed):**
```
# None needed for basic streaming - FastAPI supports SSE natively
```

---

## New Implementation (Python + React)

### Backend: FastAPI SSE Endpoint

**File:** `backend/app/api/routes/chat.py` (already exists, revise)

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

router = APIRouter()

class ChatRequest(BaseModel):
    messages: list[dict[str, str]]

@router.post("/chat")
async def stream_chat(request: ChatRequest):
    async def event_generator():
        # Call MAS endpoint
        # Stream events as SSE
        # Format: data: {"type": "text.delta", "delta": "..."}\n\n
        pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

### Frontend: React Chat Component

**File:** `frontend/src/pages/Chat.tsx` (new clean version)

Adapted from DAB template's `chat.tsx` + `message.tsx` patterns:
- Use `fetch()` with SSE EventSource or manual parsing
- Message components with user/assistant styling
- Tool call badges (inspired by their approach)
- Streaming text accumulation

---

## Dependencies Required

### Backend (Python)
✅ **Already Have:**
- FastAPI
- Databricks SDK
- Pydantic

❌ **Don't Need:**
- Chainlit (removing)
- Any special SSE libraries (FastAPI built-in)

### Frontend (React)
✅ **Already Have:**
- React + Vite
- Tailwind CSS
- Lucide icons

❌ **Don't Need:**
- Vercel AI SDK (that's Node.js specific)
- Special streaming libraries (fetch() is enough)

### Databricks Resources
✅ **Already Have:**
- MAS endpoint: `mas-3d3b5439-endpoint`
- UC catalog/schema access
- Serving endpoint permissions

❌ **Don't Need (Yet):**
- Lakebase instance (no persistence yet)
- Additional endpoints

---

## Implementation Steps

### Phase 1: Clean Rollback (NOW)
1. ✅ Delete all Chainlit-related files
2. ✅ Restore clean main.py
3. ✅ Fix requirements.txt (upgrade FastAPI etc.)
4. ✅ Remove temporary diagnostic files

### Phase 2: Simple Chat MVP (NEXT)
1. ✅ Create clean SSE endpoint in `backend/app/api/routes/chat.py`
2. ✅ Create React chat component inspired by DAB patterns
3. ✅ Connect frontend to backend
4. ✅ Test streaming

### Phase 3: Polish (LATER)
1. ⏭️ Add tool call visualization
2. ⏭️ Improve markdown rendering
3. ⏭️ Add error handling
4. ⏭️ Consider adding persistence

---

## What Makes This Different (Better)

### vs Chainlit Approach
- ❌ Chainlit: Framework designed for root path only
- ✅ This: Simple React component, works anywhere

### vs Node.js Template
- ❌ Template: Full Node.js/TypeScript stack
- ✅ This: Adapted UI patterns for Python backend

### Result
- ✅ Native integration with our existing app
- ✅ No mounting complexity
- ✅ Full control over UI/UX
- ✅ Matches Domino's design system
- ✅ Clean, maintainable code

---

## Summary

**What we're doing:**
1. Rolling back ALL Chainlit attempts (clean slate)
2. Adopting UI patterns from DAB template
3. Implementing with our Python FastAPI + React stack
4. Keeping it simple - streaming chat MVP first

**What we're NOT doing:**
- Using the Node.js template as-is (wrong stack)
- Adding database persistence yet (can add later)
- Multi-modal input (future enhancement)

**Timeline:**
- Rollback: 10 minutes
- MVP implementation: 30 minutes
- Testing: 15 minutes

Ready to proceed!
