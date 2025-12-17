# You.com MCP Server Integration Guide

## Overview

Integrate the You.com MCP (Model Context Protocol) server with your Multi-Agent Supervisor to give your Genie Spaces chat the ability to search the web, get news, and retrieve external data.

### What This Adds to Your Chat

**Before:** Genie Spaces can only answer questions from your Unity Catalog data

**After:** Your chat can:
- 🌐 Search the web for external information
- 📰 Get latest news and current events
- 🔍 Research topics outside your database
- 📊 Combine internal data with external context

### Example Use Cases

1. **Competitive Analysis**
   - User: "What's our market share in pizza delivery?"
   - Genie: Answers from internal data
   - User: "How does that compare to Domino's competitors nationally?"
   - **You.com agent**: Searches web for industry reports, competitor news

2. **Market Trends**
   - User: "Should we invest more in plant-based options?"
   - Genie: Shows internal sales data for plant-based products
   - **You.com agent**: Researches current plant-based food trends, consumer sentiment

3. **External Events**
   - User: "Why did our sales drop last week in Florida?"
   - Genie: Shows sales data
   - **You.com agent**: Searches news for weather events, local incidents

---

## Architecture

```
User Query: "What are current pizza delivery trends?"
    ↓
Multi-Agent Supervisor (MAS)
    ↓
┌────────────┴─────────────┐
│  Analyzes Query          │
│  Determines needs:       │
│  - Internal data? → Genie│
│  - External data? → MCP  │
└────────────┬─────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────┐   ┌─────▼───────┐
│  Genie   │   │  You.com    │
│  Space   │   │  MCP Agent  │
│          │   │             │
│ Internal │   │ Web Search  │
│ UC Data  │   │ News/Trends │
└───┬──────┘   └─────┬───────┘
    │                │
    └────────┬───────┘
             ▼
    Combined Response
```

---

## Step 1: Understanding the You.com MCP Server

### What It Does

The MCP server provides these tools:

**1. `web_search`** - General web search
```python
@mcp.tool()
async def web_search(query: str) -> Dict[str, Any]:
    """Search the web using You.com's search API"""
```

**Use case:** "What are Domino's competitors doing?"

**2. `smart_search`** - AI-powered answers (Premium)
```python
async def smart_search_premium(
    query: str,
    instructions: str | None = None,
    conversation_id: str | None = None
)
```

**Use case:** "Explain current food delivery trends"

**3. `research`** - Deep research with citations (Premium)
```python
async def research_premium(query: str, instructions: str | None = None)
```

**Use case:** "Research impact of economic recession on restaurant spending"

**4. `news_search`** - Latest news articles (Premium)
```python
async def news_search_premium(query: str)
```

**Use case:** "Show me recent news about pizza industry"

### Key Features

- **FastMCP framework** - Python-based, easy to deploy on Databricks Apps
- **HTTP transport** - Compatible with AI Playground and MAS
- **Async operations** - Non-blocking, fast responses
- **Unity Catalog integration** - API key stored securely in UC
- **Already working** - Deployed and tested in your workspace

---

## Step 2: Deploy You.com MCP Server (If Not Already Done)

### Check if Already Deployed

```bash
databricks apps list | grep youcom
# or
databricks apps list | grep mcp-youcom
```

If already deployed, skip to Step 3.

### Deploy from Reference Repo

```bash
# Clone the reference repo (already in your workspace)
cd /Workspace/Users/your-email/
# The repo should already exist

# Sync to deployment location
databricks sync \
  /path/to/mcp-youdotcom-reference \
  /Workspace/Users/your-email/.bundle/mcp-youcom/dev/files/youdotcom_MCP

# Deploy as Databricks App
databricks apps deploy mcp-youcom
```

### Verify Deployment

```bash
# Check app status
databricks apps get mcp-youcom

# Should show: "state": "RUNNING"

# Get app URL
databricks apps get mcp-youcom --output json | jq -r '.url'
```

### Test MCP Server

Open AI Playground in your workspace and look for "You.com MCP Server" in the tools panel. Test with:

```
Query: "Search for: pizza delivery market size 2024"
Tool: web_search
```

---

## Step 3: Configure MAS to Use You.com MCP Agent

### Option A: Via MAS Configuration UI (If Available)

1. Navigate to **Serving** → Your MAS endpoint (`mas-genie-router`)
2. Go to **Agents** tab
3. Click **Add MCP Agent**
4. Configure:
   ```
   Name: You.com Web Search
   Type: MCP Server
   Endpoint: <your-mcp-youcom-app-url>
   Description: Searches web for external data, news, and research
   Tools:
     - web_search
     - smart_search_premium (if available)
     - news_search_premium (if available)
   ```

### Option B: Via Python API

If you're using a custom MAS implementation:

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Get MCP server app URL
mcp_app = w.apps.get("mcp-youcom")
mcp_url = mcp_app.url

# Register MCP agent with MAS
# This depends on your MAS implementation
# Example conceptual code:
mas_config = {
    "agents": [
        # Existing Genie Spaces...
        {
            "name": "you_com_web_search",
            "type": "mcp",
            "endpoint": mcp_url,
            "tools": ["web_search"],
            "description": "Searches the web for external information",
            "triggers": ["external", "web", "news", "current", "competitor"]
        }
    ]
}
```

### Option C: Via MAS Router Logic (Custom Implementation)

If you built a custom MAS router ([MAS_SETUP_GUIDE.md](MAS_SETUP_GUIDE.md)), add routing logic:

```python
# In your MAS router (mas_router.py)
import httpx

class GenieRouter:
    def __init__(self, space_mapping: Dict[str, str], mcp_url: str):
        self.spaces = space_mapping
        self.mcp_url = mcp_url  # You.com MCP app URL

    async def route_query(self, query: str) -> str:
        """Determine which agent to query"""
        query_lower = query.lower()

        # Keywords that trigger You.com MCP agent
        web_keywords = [
            'competitor', 'market share', 'industry', 'trend',
            'news', 'current', 'recent', 'latest', 'external',
            'what are', 'how do competitors', 'market research'
        ]

        if any(keyword in query_lower for keyword in web_keywords):
            return "mcp_youcom"  # Route to You.com MCP

        # Otherwise route to appropriate Genie Space
        if 'revenue' in query_lower or 'sales' in query_lower:
            return self.spaces['sales']
        # ... rest of Genie routing logic

    async def query_agent(self, agent_id: str, query: str):
        """Query either Genie Space or MCP agent"""
        if agent_id == "mcp_youcom":
            # Call You.com MCP server
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.mcp_url}/mcp/tools/web_search",
                    json={"query": query}
                )
                return response.json()
        else:
            # Call Genie Space
            return self.w.genie.execute_message(
                space_id=agent_id,
                content=query
            )
```

---

## Step 4: Update Chainlit App to Support MCP Tools

Your current Chainlit app needs to be aware of MCP tools for proper rendering.

### Update chat-app/config.py

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # NEW: You.com MCP configuration
    youcom_mcp_enabled: bool = os.getenv("YOUCOM_MCP_ENABLED", "true").lower() == "true"
    youcom_mcp_app_name: str = os.getenv("YOUCOM_MCP_APP_NAME", "mcp-youcom")
```

### Update chat-app/services/renderer.py

Add special handling for MCP tool calls:

```python
class ChainlitStream:
    # ... existing methods ...

    async def on_tool_call(self, name: str, args: str):
        """Handle tool call event"""
        logger.info(f"[RENDERER] Tool call: {name}")

        # Special icons for different tool types
        if "web_search" in name or "youcom" in name.lower():
            icon = "🌐"
            display_name = "Web Search"
        elif "genie" in name.lower():
            icon = "🛠️"
            display_name = name
        else:
            icon = "🔧"
            display_name = name

        # Add tool to status log
        self._status_lines.append(f"{icon} **{display_name}** started")
        await self._update_status()
```

### Update chat-app/app.py System Prompt

Add context about external data capabilities:

```python
def _build_messages_with_history(user_content: str) -> List[Dict[str, str]]:
    system_prompt = """You are an expert analytics assistant for Domino's Pizza business intelligence.

You have access to:
1. **5 Genie Spaces** for internal data analysis (revenue, customers, marketing, etc.)
2. **You.com Web Search** for external information (competitors, trends, news, research)

When to use each:
- Use Genie Spaces for questions about YOUR internal Domino's data
- Use You.com for questions about:
  * Competitors and market positioning
  * Industry trends and external research
  * Current events and news
  * General knowledge or context

Combine internal and external data to provide comprehensive insights.

Guidelines:
- Start with internal data when available
- Use web search to add context or competitive insights
- Cite sources when using external data
- Be data-driven and specific"""

    messages = [{"role": "system", "content": system_prompt}]
    # ... rest of history logic
```

---

## Step 5: Update Deployment Configuration

### Update app.yaml

Add MCP app permissions:

```yaml
resources:
  uc_securable:
    # ... existing resources ...

    # NEW: Grant access to You.com MCP app
    - securable_type: APP
      securable_full_name: mcp-youcom
      privilege: CAN_USE

env:
  # ... existing vars ...

  # NEW: You.com MCP configuration
  - name: YOUCOM_MCP_ENABLED
    value: "true"
  - name: YOUCOM_MCP_APP_NAME
    value: mcp-youcom
```

---

## Step 6: Test the Integration

### Test 1: Internal Data Query (Should Use Genie)

**Query:** "What's our total revenue this month?"

**Expected:**
- Status: "🛠️ query_genie_space started"
- Uses: Sales Analytics Genie Space
- Result: Revenue data from Unity Catalog

---

### Test 2: External Data Query (Should Use You.com)

**Query:** "What are current trends in food delivery?"

**Expected:**
- Status: "🌐 Web Search started"
- Uses: You.com MCP web_search tool
- Result: Latest articles and research on food delivery trends

---

### Test 3: Combined Query (Should Use Both)

**Query:** "How does our customer retention compare to industry benchmarks?"

**Expected:**
- Status 1: "🛠️ query_genie_space started" (gets internal retention data)
- Status 2: "🌐 Web Search started" (searches industry benchmarks)
- Result: Comparison of internal vs. external data

---

## Step 7: Monitor and Optimize

### Check MCP Usage

```bash
# View MCP app logs
databricks apps logs mcp-youcom

# Look for tool calls
databricks apps logs mcp-youcom | grep "web_search"
```

### Check MAS Routing

```bash
# View MAS endpoint metrics
databricks serving-endpoints get mas-genie-router

# Check which agents are being called
databricks serving-endpoints get mas-genie-router --metrics
```

### Optimize Routing Logic

Based on usage patterns, refine which queries route to MCP vs. Genie:

**Good MCP queries:**
- Competitive analysis
- Industry trends
- News and current events
- General research

**Good Genie queries:**
- Internal metrics (revenue, CAC, ARPU)
- Customer data
- Historical trends
- Operational metrics

---

## Usage Examples

### Example 1: Competitive Intelligence

**User:** "What's our market share in pizza delivery?"

**Response:**
```
Based on internal data (Sales Analytics):
- Domino's controls 18% of pizza delivery market
- $2.6B annual revenue
- Growing 7-8% YoY

External research (You.com):
- Total US pizza delivery market: ~$15B (2024)
- Top 3: Pizza Hut (20%), Domino's (18%), Papa John's (12%)
- Industry growing at 5% CAGR
- Plant-based options driving 15% of growth

[Sources: Internal UC data, IBISWorld, QSR Magazine]
```

---

### Example 2: Marketing Strategy

**User:** "Should we increase our plant-based menu options?"

**Response:**
```
Internal Performance (Customer Analytics):
- Plant-based orders: 3% of total sales
- Growing 25% YoY (fastest growing category)
- Average order value 12% higher than regular pizzas
- Strong appeal to 25-34 demographic

Market Research (You.com):
- 46% of consumers interested in plant-based options
- Plant-based food market growing 11.9% annually
- Major competitors (Pizza Hut, Papa John's) expanding offerings
- Gen Z driving demand (67% interested)

**Recommendation:** Yes, expand plant-based options. Strong internal growth + major market opportunity.

[Sources: Internal sales data, Bloomberg, Plant Based Foods Association]
```

---

### Example 3: Crisis Response

**User:** "Why did Florida sales drop 30% last Tuesday?"

**Response:**
```
Internal Data (Operations Analytics):
- Florida sales: -30% on 2024-12-15
- Delivery times: +45 minutes average
- Order cancellations: +200%
- All stores affected equally

External Context (You.com News):
- Hurricane Milton made landfall Tuesday morning
- Florida emergency declared
- Major power outages across state
- Most businesses closed

**Analysis:** Sales drop due to hurricane, not operational issues. Expected to normalize within 3-5 days.

[Sources: Internal operations data, NOAA, CNN]
```

---

## Advanced: Custom Tool Integration

If you want to add more external data sources:

### Example: Add Weather API

```python
# In a new MCP server or extend existing one
@mcp.tool()
async def get_weather_data(
    location: str,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """Get weather data for correlation with sales"""
    # Call weather API
    # Return structured data
```

### Example: Add Social Media Sentiment

```python
@mcp.tool()
async def get_brand_sentiment(brand: str, days: int = 7) -> Dict[str, Any]:
    """Analyze social media sentiment for brand"""
    # Call social listening API
    # Return sentiment scores
```

---

## Troubleshooting

### Issue: MCP agent not being called

**Diagnosis:**
```bash
# Check MAS routing logic
databricks serving-endpoints get mas-genie-router --logs
```

**Fix:** Adjust routing keywords to trigger MCP agent more reliably

---

### Issue: 403 Forbidden from You.com API

**Diagnosis:**
```bash
# Check API key format
databricks apps logs mcp-youcom | grep "403"
```

**Fix:** Ensure API key preserves special characters (see [final_learnings.md](mcp-youdotcom-reference/final_learnings.md:128-149))

---

### Issue: Slow responses when using MCP

**Diagnosis:** Web searches take longer than UC queries

**Fix:**
1. Add timeout handling in MCP calls
2. Stream MCP responses incrementally
3. Cache common web searches

---

## Cost Considerations

### You.com API Pricing

- **Free Trial**: 1,000 calls/month (includes web search + news)
- **Basic Plan**: $X/month for Y calls
- **Premium Plan**: Adds smart_search, research tools

### Optimization Strategies

1. **Cache results**: Store common web searches for 24h
2. **Batch queries**: Combine multiple related searches
3. **Smart routing**: Only use MCP when truly needed (not for internal data)
4. **Rate limiting**: Set max MCP calls per user/day

---

## Summary

✅ **What You Get:**
- Web search capability in your chat
- External data enrichment
- Competitive intelligence
- News and trend analysis
- Combined internal + external insights

✅ **What You Don't Break:**
- Existing Genie Spaces still work
- Chat authentication unchanged
- UI/UX remains the same
- Deployment process same

✅ **Next Steps:**
1. Deploy You.com MCP server (if not done)
2. Configure MAS to route to MCP agent
3. Update Chainlit app system prompt
4. Test with combined queries
5. Monitor usage and optimize routing

---

## Resources

- **You.com MCP Reference:** [mcp-youdotcom-reference/](mcp-youdotcom-reference/)
- **Learnings Doc:** [final_learnings.md](mcp-youdotcom-reference/final_learnings.md)
- **You.com API Docs:** https://documentation.you.com/
- **FastMCP Framework:** https://github.com/jlowin/fastmcp
- **MCP Protocol:** https://modelcontextprotocol.io/

**Ready to give your chat superpowers with web search! 🌐**
