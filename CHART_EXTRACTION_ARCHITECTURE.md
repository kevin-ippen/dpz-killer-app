# Chart Extraction Architecture

## Overview

This document explains how we extract charts from Genie queries and display them in the two-panel UI, bypassing the limitation that MAS only returns text responses.

## The Problem

**MAS doesn't return charts directly:**
- MAS (Multi-Agent Supervisor) only streams text/markdown responses
- When MAS calls `execute_genie_query`, it gets back query results but **not** chart specifications
- Genie creates charts in the Genie UI, but those aren't sent via MAS streaming
- We need to **capture the Genie coordinates** and hydrate charts on-demand

## The Solution: Genie Coordinate Extraction

### Architecture Flow

```
User asks: "Show me revenue by channel"
         ↓
     MAS Endpoint
         ↓
   execute_genie_query tool called
         ↓
   Genie Space executes SQL query
         ↓
   Returns: {
     query_results: {...},
     space_id: "...",
     conversation_id: "...",
     message_id: "...",
     attachment_id: "..."
   }
         ↓
   Backend captures Genie coordinates
         ↓
   Emits: {
     type: "chart.reference",
     genie: {spaceId, conversationId, messageId, attachmentId},
     title: "Query Result"
   }
         ↓
   Frontend creates ChartBlock with dataRef
         ↓
   User clicks chart preview
         ↓
   FullChartView calls /api/genie/chart
         ↓
   Chart hydrates with real Genie data
```

## Implementation Details

### 1. Backend: Capture Genie Coordinates

**File:** `backend/app/api/routes/chat.py`

When MAS completes a `execute_genie_query` tool call, we:

```python
# Line 240: Tool result handler
elif event_type == "response.function_call_result":
    result = event.get("result", {})
    tool_name = result.get("name", "agent")
    tool_output = result.get("output", "Complete")

    # Special handling for Genie queries
    if tool_name == "execute_genie_query" and isinstance(tool_output, dict):
        # Extract Genie coordinates from tool output
        if all(k in tool_output for k in ["space_id", "conversation_id", "message_id", "attachment_id"]):
            genie_ref = {
                "spaceId": tool_output["space_id"],
                "conversationId": tool_output["conversation_id"],
                "messageId": tool_output["message_id"],
                "attachmentId": tool_output["attachment_id"]
            }

            # Emit chart reference event
            yield {
                "type": "chart.reference",
                "genie": genie_ref,
                "title": "Query Result",
                "subtitle": "Click to view chart"
            }
```

**Patterns we handle:**
- **Pattern 1:** Coordinates directly in tool output
- **Pattern 2:** Nested in `result` or `data` field
- **Pattern 3:** (Future) Stored from tool arguments

### 2. Frontend: Handle chart.reference Events

**File:** `frontend/src/pages/Chat.tsx`

During streaming, when we receive a `chart.reference` event:

```typescript
case "chart.reference":
  // Create ChartBlock with Genie coordinates
  const chartBlockId = `${assistantMessageId}-chart-${msg.blocks.filter(b => b.type === "chart").length}`;
  return {
    ...msg,
    blocks: [
      ...msg.blocks,
      {
        id: chartBlockId,
        type: "chart",
        title: event.title || "Query Result",
        subtitle: event.subtitle || "Click to view",
        specType: "recharts",
        spec: null, // Will be hydrated on-demand
        dataRef: {
          type: "genie",
          genie: event.genie, // {spaceId, conversationId, messageId, attachmentId}
        },
      },
    ],
  };
```

### 3. Chart Hydration: On-Demand Loading

**File:** `frontend/src/components/chat/FullChartView.tsx`

When user clicks a chart preview:

```typescript
useEffect(() => {
  if (!block.dataRef || block.spec) return;
  if (block.dataRef.type !== "genie") return;

  const { genie } = block.dataRef;

  // Call hydration endpoint
  const res = await fetch("/api/genie/chart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(genie), // Send Genie coordinates
  });

  const payload = await res.json(); // { spec, table }
  setSpec(payload.spec);
  setTablePreview(payload.table);
}, [block]);
```

### 4. Backend: Genie Chart Hydration

**File:** `backend/app/api/routes/genie.py`

The `/api/genie/chart` endpoint:

```python
@router.post("/chart")
async def hydrate_chart(request: GenieChartRequest):
    # Fetch query result from Genie Space
    query_result = fetch_genie_query_result(
        client=WorkspaceClient(),
        space_id=request.spaceId,
        conversation_id=request.conversationId,
        message_id=request.messageId,
        attachment_id=request.attachmentId
    )

    # Convert to Recharts spec
    spec = convert_to_recharts_spec(query_result)

    # Extract table preview
    table = extract_table_preview(query_result)

    return ChartHydrationResponse(spec=spec, table=table)
```

## Event Types

### New Event: `chart.reference`

```json
{
  "type": "chart.reference",
  "genie": {
    "spaceId": "01jg...",
    "conversationId": "01jg...",
    "messageId": "01jg...",
    "attachmentId": "01jg..."
  },
  "title": "Query Result",
  "subtitle": "Click to view chart"
}
```

### Existing Events:

- `text.delta` - Text streaming
- `tool.call` - Tool execution started
- `tool.output` - Tool execution completed
- `error` - Error occurred

## Data Structures

### ChartBlock with Genie Reference

```typescript
interface ChartBlock {
  id: string;
  type: "chart";
  title?: string;
  subtitle?: string;
  specType: "recharts" | "vegaLite" | "echarts";
  spec: any | null; // null until hydrated
  dataRef?: {
    type: "genie";
    genie: {
      spaceId: string;
      conversationId: string;
      messageId: string;
      attachmentId: string;
    };
  };
}
```

## Testing Strategy

### 1. Check MAS Tool Output Format

First, we need to verify what the `execute_genie_query` tool actually returns:

```python
# Add debug logging in chat.py
logger.info(f"[MAS] Full tool output: {json.dumps(tool_output, indent=2)}")
```

Deploy and ask: "What's our revenue by channel?"

Check backend logs for the tool output structure.

### 2. Verify Event Emission

Check that `chart.reference` events are emitted:

```javascript
// In Chat.tsx, add logging
console.log("[SSE] Received event:", event);
```

You should see `chart.reference` events in browser console after Genie queries.

### 3. Test Chart Hydration

Click a chart preview and verify:
- Loading state appears
- `/api/genie/chart` is called with correct coordinates
- Chart renders in right panel
- Table preview is available

## Debugging

### Backend Logs

```bash
# Watch backend logs for:
[MAS] Tool result: execute_genie_query
[MAS] Tool output type: <class 'dict'>
[MAS] Emitting chart reference: {...}
```

### Frontend Console

```javascript
// Should see:
[SSE] Received event: {type: "chart.reference", genie: {...}}
```

### Network Tab

```
POST /api/genie/chart
Request: {spaceId: "...", conversationId: "...", ...}
Response: {spec: {...}, table: {...}}
```

## Fallbacks

If Genie coordinates are **not** found in tool output:

1. **Option 1:** Fall back to table parsing (current behavior)
   - Tables are still extracted from markdown
   - User can view data, just not as charts

2. **Option 2:** Query Genie Space directly
   - Use Genie API to search for recent conversations
   - Match by query text/timestamp

3. **Option 3:** Store coordinates in tool arguments
   - Capture `args` from `response.output_item.added` event
   - Match tool call args with tool output

## Future Enhancements

1. **Chart type detection:** Analyze query results to suggest bar vs line vs scatter
2. **Multiple charts per query:** If Genie returns multiple attachments
3. **Real-time updates:** Subscribe to Genie Space for query result updates
4. **Chart customization:** Allow users to change chart type, colors, etc.
5. **Export options:** Download chart as PNG/SVG

## Key Files

- `backend/app/api/routes/chat.py:240-300` - Genie coordinate extraction
- `backend/app/api/routes/genie.py` - Chart hydration endpoint
- `frontend/src/pages/Chat.tsx:266-286` - chart.reference handler
- `frontend/src/components/chat/FullChartView.tsx` - On-demand hydration
- `frontend/src/types/chat.ts` - Block type definitions
