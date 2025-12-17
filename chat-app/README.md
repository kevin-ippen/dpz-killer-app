# Domino's Analytics Chat App

A Chainlit-powered chat interface for Domino's business intelligence, powered by Databricks Genie Spaces via Multi-Agent Supervisor (MAS).

## Features

- **5 Specialized Genie Spaces** for different analytics domains:
  - Executive & Finance Analytics
  - Marketing Performance Analytics
  - Customer Analytics
  - Operations Analytics
  - Sales Analytics

- **Streaming Responses** with real-time tool execution status
- **OBO Authentication** for secure access to Databricks resources
- **Conversation History** with intelligent token budget management
- **Premium UI** styled to match Domino's brand

## Architecture

```
User Query
    ↓
Chainlit UI (app.py)
    ↓
MAS Client (services/mas_client.py)
    ↓
Multi-Agent Supervisor Endpoint
    ↓
Genie Spaces (5 spaces)
    ↓
Streaming Response
```

## Setup

### 1. Install Dependencies

```bash
cd chat-app
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file:

```bash
# MAS Endpoint (you'll need to create this)
MAS_ENDPOINT_NAME=mas-genie-router

# Genie Space IDs (from create_genie_spaces_basic.py)
EXECUTIVE_SPACE_ID=your-space-id-here
MARKETING_SPACE_ID=your-space-id-here
CUSTOMER_SPACE_ID=your-space-id-here
OPERATIONS_SPACE_ID=your-space-id-here
SALES_SPACE_ID=your-space-id-here
```

### 3. Run Locally (Optional)

```bash
chainlit run app.py --port 8001
```

### 4. Deploy to Databricks Apps

See `../deployment_instructions.md` for deployment steps.

## File Structure

```
chat-app/
├── app.py                      # Main Chainlit application
├── config.py                   # Configuration management
├── requirements.txt            # Python dependencies
├── auth/
│   ├── identity.py            # Identity models
│   ├── ensure_identity.py     # Auth logic
│   └── __init__.py
├── services/
│   ├── mas_client.py          # MAS HTTP/SSE client
│   ├── mas_normalizer.py      # Event stream parser
│   ├── renderer.py            # Chainlit UI renderer
│   └── __init__.py
└── README.md                   # This file
```

## How It Works

### 1. User Authentication
- Databricks Apps forwards user access token via `x-forwarded-access-token` header
- OBO (On-Behalf-Of) token stored in session metadata
- Token validated on each request

### 2. Query Processing
- User sends message via Chainlit UI
- App builds message list with conversation history
- MAS Client streams request to MAS endpoint with OBO token

### 3. MAS Routing
- MAS analyzes query and routes to appropriate Genie Space(s)
- May query multiple spaces and synthesize results
- Streams back tool execution status + response text

### 4. Response Rendering
- Renderer shows tool execution progress (status message)
- Streams response text token-by-token (text message)
- Finalizes when stream completes

## Customization

### Change Genie Spaces
Update `config.py` to add/remove space IDs

### Modify System Prompt
Edit the `system_prompt` in `app.py` > `_build_messages_with_history()`

### Adjust Token Budget
Update `hist_max_turns` and `hist_max_chars` in `config.py`

### Style the UI
Create `.chainlit/config.toml` for theme customization (see next section)

## Next Steps

1. **Create MAS Endpoint** - Set up Multi-Agent Supervisor to route to your Genie Spaces
2. **Run Genie Space Creation** - Execute `../create_genie_spaces_basic.py` to create spaces
3. **Update Space IDs** - Add space IDs to `.env` or `config.py`
4. **Deploy to Databricks Apps** - Follow deployment instructions
5. **Embed in Dashboard** - Add iframe to React frontend

## Troubleshooting

### Authentication Fails
- Check that `x-forwarded-access-token` header is present
- Verify token hasn't expired (checked automatically)
- Ensure Databricks Apps OBO is enabled

### MAS Connection Fails
- Verify `MAS_ENDPOINT_NAME` matches your serving endpoint
- Check endpoint permissions (requires `CAN_QUERY`)
- Review MAS endpoint logs

### No Response Streaming
- Check MAS endpoint returns `text/event-stream` content type
- Verify SSE format: `data: {...}\n\n`
- Review logs for parsing errors

## Support

For issues or questions:
1. Check Chainlit docs: https://docs.chainlit.io
2. Review Databricks Genie docs: https://docs.databricks.com/genie
3. Check MAS configuration and logs
