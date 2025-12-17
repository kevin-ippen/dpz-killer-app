# Multi-Agent Supervisor (MAS) Setup Guide

## Overview

The Multi-Agent Supervisor (MAS) is a Databricks endpoint that intelligently routes natural language queries to appropriate Genie Spaces. This guide shows you how to create and configure a MAS endpoint for your Domino's Analytics chat app.

## Prerequisites

- ✅ 5 Genie Spaces created (run `create_genie_spaces_basic.py`)
- ✅ Databricks workspace with Genie enabled
- ✅ Serving Endpoints permissions (`CAN_CREATE_SERVING_ENDPOINT`)

## Architecture

```
User Query
    ↓
Chainlit App
    ↓
MAS Endpoint (serving endpoint)
    ↓
┌────────┴────────┐
│ Query Router     │ (LLM analyzes query)
└────────┬────────┘
         │
    ┌────┴────┐
    │ Selects │ appropriate Genie Space(s)
    └────┬────┘
         │
    ┌────┴──────────────────────────┐
    │  Genie Space(s) Query & Merge │
    └────┬──────────────────────────┘
         │
    Streaming Response
```

## Option 1: Use Databricks' Pre-built MAS (Recommended)

Databricks provides a managed MAS endpoint that you can configure with your Genie Spaces.

### Step 1: Create MAS Endpoint via UI

1. **Navigate to Serving** in your Databricks workspace
2. **Create Endpoint** → Select "Multi-Agent Supervisor"
3. **Configure:**
   - Name: `mas-genie-router`
   - Model: Select the latest MAS model
   - Size: Small (for development) or Medium (for production)

4. **Add Genie Spaces:**
   ```
   Executive & Finance Analytics: <space-id-1>
   Marketing Performance Analytics: <space-id-2>
   Customer Analytics: <space-id-3>
   Operations Analytics: <space-id-4>
   Sales Analytics: <space-id-5>
   ```

5. **Enable Streaming:** ✅ Check "Enable streaming responses"

6. **Deploy:** Click "Create" and wait for endpoint to be ready

### Step 2: Get Space IDs

Run this to get your space IDs:

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()
spaces = w.genie.list_spaces()

for space in spaces:
    print(f"{space.title}: {space.space_id}")
```

### Step 3: Test MAS Endpoint

```python
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import ChatMessage, ChatMessageRole

w = WorkspaceClient()

response = w.serving_endpoints.query(
    name="mas-genie-router",
    messages=[
        ChatMessage(role=ChatMessageRole.USER, content="What's our total revenue?")
    ],
    stream=True
)

for chunk in response:
    print(chunk)
```

## Option 2: Build Custom MAS (Advanced)

If you need custom routing logic, you can build a custom MAS endpoint.

### Step 1: Create MAS Router Code

```python
# mas_router.py
import mlflow
from typing import List, Dict
from databricks.sdk import WorkspaceClient

class GenieRouter:
    def __init__(self, space_mapping: Dict[str, str]):
        """
        Args:
            space_mapping: Dict mapping space names to space IDs
        """
        self.w = WorkspaceClient()
        self.spaces = space_mapping

    def route_query(self, query: str) -> str:
        """Determine which Genie Space(s) to query"""
        query_lower = query.lower()

        # Simple keyword-based routing (can be replaced with LLM)
        if any(word in query_lower for word in ['revenue', 'sales', 'gmv', 'orders']):
            return self.spaces['sales']
        elif any(word in query_lower for word in ['cac', 'arpu', 'ltv', 'retention']):
            return self.spaces['executive']
        elif any(word in query_lower for word in ['campaign', 'marketing', 'roas', 'channel']):
            return self.spaces['marketing']
        elif any(word in query_lower for word in ['customer', 'segment', 'churn']):
            return self.spaces['customer']
        elif any(word in query_lower for word in ['delivery', 'store', 'operations']):
            return self.spaces['operations']
        else:
            # Default to executive
            return self.spaces['executive']

    def query_genie(self, space_id: str, query: str):
        """Query a specific Genie Space"""
        # Use Genie API to query
        response = self.w.genie.execute_message(
            space_id=space_id,
            content=query
        )
        return response

# MLflow model wrapper
class MASModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        # Load your space IDs from environment or model artifacts
        self.router = GenieRouter({
            'executive': 'space-id-1',
            'marketing': 'space-id-2',
            'customer': 'space-id-3',
            'operations': 'space-id-4',
            'sales': 'space-id-5'
        })

    def predict(self, context, model_input):
        query = model_input['query'][0]
        space_id = self.router.route_query(query)
        response = self.router.query_genie(space_id, query)
        return response

# Register model
with mlflow.start_run():
    mlflow.pyfunc.log_model(
        "mas_router",
        python_model=MASModel(),
        registered_model_name="mas-genie-router"
    )
```

### Step 2: Deploy to Serving Endpoint

```python
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import (
    EndpointCoreConfigInput,
    ServedEntityInput
)

w = WorkspaceClient()

# Create serving endpoint
endpoint = w.serving_endpoints.create(
    name="mas-genie-router",
    config=EndpointCoreConfigInput(
        served_entities=[
            ServedEntityInput(
                entity_name="mas-genie-router",
                entity_version="1",
                scale_to_zero_enabled=True,
                workload_size="Small"
            )
        ]
    )
)

print(f"Endpoint created: {endpoint.name}")
```

## Configuring Chat App to Use MAS

### Update chat-app/config.py

```python
mas_endpoint_name: str = "mas-genie-router"
```

### Update app.yaml

```yaml
resources:
  uc_securable:
    # ... existing resources ...

    # Grant access to MAS endpoint
    - securable_type: SERVING_ENDPOINT
      securable_full_name: mas-genie-router
      privilege: EXECUTE
```

## Testing Your Setup

### 1. Test MAS Endpoint Directly

```bash
# Using Databricks CLI
databricks serving-endpoints query \
  --name mas-genie-router \
  --input '{"query": "What is our total revenue?"}'
```

### 2. Test via Chainlit App

```bash
cd chat-app
chainlit run app.py --port 8001
```

Open http://localhost:8001 and send a test query.

### 3. Test Streaming

```python
import httpx

url = "https://<workspace>/serving-endpoints/mas-genie-router/invocations"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "text/event-stream"
}
payload = {
    "input": [{"role": "user", "content": "Show me revenue trends"}],
    "stream": True
}

with httpx.stream("POST", url, headers=headers, json=payload) as response:
    for line in response.iter_lines():
        print(line)
```

## Troubleshooting

### MAS endpoint not routing correctly

**Symptoms:** Queries go to wrong Genie Space
**Fix:** Review routing logic in your MAS implementation

### Streaming not working

**Symptoms:** No SSE events received
**Fix:**
- Check `Accept: text/event-stream` header is set
- Verify `stream=True` in payload
- Check MAS endpoint logs

### Permission denied

**Symptoms:** 403 Forbidden when calling MAS
**Fix:**
- Add `CAN_QUERY` permission to MAS endpoint in app.yaml
- Verify OBO token is being passed correctly

### Timeout errors

**Symptoms:** Request times out after 30s
**Fix:**
- Increase `mas_timeout_s` in chat-app/config.py
- Check Genie Space query performance
- Consider scaling up MAS endpoint size

## Next Steps

1. ✅ MAS endpoint created and tested
2. ➡️ Deploy Chainlit app (see [CHAT_DEPLOYMENT_GUIDE.md](CHAT_DEPLOYMENT_GUIDE.md))
3. ➡️ Monitor MAS endpoint metrics
4. ➡️ Optimize routing logic based on usage patterns

## Resources

- [Databricks Genie Documentation](https://docs.databricks.com/genie)
- [Model Serving Documentation](https://docs.databricks.com/machine-learning/model-serving)
- [Chainlit Documentation](https://docs.chainlit.io)
