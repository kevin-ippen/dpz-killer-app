# Citation-Aware Chat UI Pattern

A production-ready pattern for building a chat interface that extracts citations from AgentBricks multi-agent responses and provides interactive file previews.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CITATION CHAT UI                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌─────────────────────────────┐  ┌────────────────────────┐   │
│  │  SOURCES   │  │         CHAT PANEL          │  │    PREVIEW PANEL       │   │
│  │  SIDEBAR   │  │                             │  │                        │   │
│  │            │  │  ┌───────────────────────┐  │  │  ┌──────────────────┐  │   │
│  │ Bookmarked │  │  │    Message Thread     │  │  │  │   PDF Viewer     │  │   │
│  │ ──────────│  │  │    with Citation      │  │  │  │   Image Viewer   │  │   │
│  │ • Doc A   │  │  │    Chips              │  │  │  │   Text Viewer    │  │   │
│  │ • Doc B   │  │  └───────────────────────┘  │  │  │   Data Viewer    │  │   │
│  │            │  │                             │  │  └──────────────────┘  │   │
│  │ All Sources│  │  ┌───────────────────────┐  │  │                        │   │
│  │ ──────────│  │  │    Input + Send       │  │  │  ┌──────────────────┐  │   │
│  │ • Doc C   │  │  └───────────────────────┘  │  │  │   File Metadata  │  │   │
│  │ • Doc D   │  │                             │  │  └──────────────────┘  │   │
│  └────────────┘  └─────────────────────────────┘  └────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           CITATION PARSER                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Markdown    │  │   Inline     │  │   XML Tags   │  │  Structured Sources  │ │
│  │  Links       │  │   Refs       │  │              │  │  from API            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│                      AGENTBRICKS MULTI-AGENT SUPERVISOR                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    Knowledge Assistant (RAG)                               │  │
│  │  Vector Search → Document Retrieval → Citation Generation → Response      │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. **Multi-Format Citation Parsing**
Automatically extracts file references from:
- Markdown links: `[Report](path/to/file.pdf)`
- Inline references: `(Source: document.pdf, page 5)`
- Footnotes: `[1] /Volumes/main/data/report.pdf`
- XML tags: `<source path="..." page="..." />`
- Unity Catalog paths: `/Volumes/catalog/schema/volume/file.pdf`
- Structured API sources

### 2. **Persistent Source Sidebar**
- All citations across the conversation are collected
- Bookmark important sources for quick access
- Sources persist even as conversation scrolls

### 3. **Rich File Preview**
- PDF viewer with page navigation and zoom
- Image viewer with zoom controls
- Text/Markdown preview
- Spreadsheet data preview
- File metadata display

### 4. **Interactive Citation Chips**
- Inline buttons for each cited source
- Relevance scores when available
- Page numbers for quick navigation
- Visual distinction for active/selected sources

---

## AgentBricks Integration

### Multi-Agent Supervisor Pattern

```python
# AgentBricks supervisor with knowledge assistant
from databricks.agents import AgentBricks

# Define the knowledge assistant agent
knowledge_agent = AgentBricks.create_agent(
    name="knowledge_assistant",
    type="rag",
    config={
        "vector_store_id": "vs_abc123",
        "return_sources": True,
        "max_sources": 5,
        "include_relevance_scores": True,
    }
)

# Create supervisor
supervisor = AgentBricks.create_supervisor(
    agents=[knowledge_agent],
    routing_strategy="auto",
)

# Query returns structured sources
response = supervisor.run("What were the Q3 revenue highlights?")
# response.content = "Based on the quarterly report..."
# response.sources = [
#   {"path": "/Volumes/main/reports/Q3.pdf", "page": 5, "score": 0.95},
#   ...
# ]
```

### Response Format with Citations

```json
{
  "content": "Based on the quarterly financial report, revenue increased by 23%...\n\n[Q3 Financial Summary](/Volumes/main/reports/Q3_2024.pdf)\n\n<source path=\"/Volumes/main/reports/Q3_2024.pdf\" page=\"5\" />",
  "sources": [
    {
      "path": "/Volumes/main/reports/financial/Q3_2024_Summary.pdf",
      "title": "Q3 2024 Financial Summary",
      "page": 5,
      "score": 0.95,
      "chunk": "Revenue for Q3 2024 reached $125M, representing a 23% increase..."
    },
    {
      "path": "/Volumes/main/reports/financial/enterprise_analysis.pdf",
      "title": "Enterprise Segment Analysis",
      "page": 12,
      "score": 0.88
    }
  ],
  "trace": [
    {
      "agent": "knowledge_assistant",
      "tool": "vector_search",
      "retrieved_documents": [...]
    }
  ]
}
```

---

## Backend API Endpoints

### Flask/FastAPI Implementation

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

app = FastAPI()

# AgentBricks client
AGENTBRICKS_ENDPOINT = "https://your-workspace.cloud.databricks.com/serving-endpoints/your-agent"

class ChatMessage(BaseModel):
    content: str
    conversation_id: Optional[str] = None

class Source(BaseModel):
    path: str
    title: Optional[str] = None
    page: Optional[int] = None
    score: Optional[float] = None
    chunk: Optional[str] = None

class ChatResponse(BaseModel):
    content: str
    sources: List[Source]
    conversation_id: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Send message to AgentBricks and return response with sources."""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            AGENTBRICKS_ENDPOINT,
            json={
                "messages": [{"role": "user", "content": message.content}],
                "conversation_id": message.conversation_id,
            },
            headers={"Authorization": f"Bearer {get_token()}"},
        )
        
    data = response.json()
    
    return ChatResponse(
        content=data["choices"][0]["message"]["content"],
        sources=data.get("sources", []),
        conversation_id=data.get("conversation_id", message.conversation_id),
    )


@app.get("/api/files/preview")
async def get_file_preview(path: str, page: int = 1):
    """Get file preview data for Unity Catalog volume files."""
    
    # Validate path is in allowed volumes
    if not path.startswith("/Volumes/"):
        raise HTTPException(400, "Invalid path")
    
    # Get file metadata
    file_info = await get_volume_file_info(path)
    
    # Generate preview based on type
    preview_data = await generate_preview(path, file_info["type"], page)
    
    return {
        "path": path,
        "name": path.split("/")[-1],
        "type": file_info["type"],
        "size": file_info["size"],
        "lastModified": file_info["modified"],
        "pageCount": preview_data.get("pageCount"),
        "previewUrl": preview_data.get("url"),
        "content": preview_data.get("content"),
    }


async def get_volume_file_info(path: str):
    """Get file metadata from Unity Catalog volume."""
    from databricks.sdk import WorkspaceClient
    
    w = WorkspaceClient()
    
    # Parse volume path: /Volumes/{catalog}/{schema}/{volume}/{path}
    parts = path.split("/")
    catalog, schema, volume = parts[2], parts[3], parts[4]
    file_path = "/".join(parts[5:])
    
    # List files to get metadata
    files = w.files.list_directory_contents(
        directory_path=f"/Volumes/{catalog}/{schema}/{volume}"
    )
    
    for f in files:
        if f.path.endswith(file_path):
            return {
                "type": get_file_type(f.path),
                "size": f.file_size,
                "modified": f.last_modified,
            }
    
    raise HTTPException(404, "File not found")


async def generate_preview(path: str, file_type: str, page: int):
    """Generate preview for different file types."""
    
    if file_type == "pdf":
        # Option 1: Use pre-signed URL for direct PDF viewing
        presigned_url = await get_presigned_url(path)
        page_count = await get_pdf_page_count(path)
        return {
            "url": presigned_url,
            "pageCount": page_count,
        }
    
    elif file_type in ("image", "png", "jpg", "jpeg", "gif"):
        presigned_url = await get_presigned_url(path)
        return {"url": presigned_url}
    
    elif file_type in ("text", "md", "txt"):
        content = await read_text_file(path)
        return {"content": content}
    
    elif file_type in ("data", "json", "csv"):
        content = await read_text_file(path)
        return {"content": content}
    
    return {}
```

---

## Unity Catalog Volume File Access

### Generating Pre-signed URLs

```python
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.files import DownloadRequest

def get_presigned_url(volume_path: str, expiration_seconds: int = 3600) -> str:
    """
    Generate a pre-signed URL for a file in Unity Catalog volumes.
    
    Note: As of 2025, you may need to use the Files API or 
    generate a short-lived token for direct access.
    """
    w = WorkspaceClient()
    
    # Option 1: Direct download API
    # The Files API provides download capability
    download_response = w.files.download(volume_path)
    
    # Option 2: If using external storage, get underlying URL
    # This works for external volumes backed by cloud storage
    volume_info = w.volumes.read(volume_name)
    if volume_info.storage_location:
        # Generate cloud-specific presigned URL
        return generate_cloud_presigned_url(
            volume_info.storage_location,
            file_path,
            expiration_seconds
        )
    
    # Option 3: Proxy through your app
    return f"/api/files/download?path={volume_path}"


def read_volume_file(volume_path: str) -> bytes:
    """Read file content from Unity Catalog volume."""
    w = WorkspaceClient()
    
    response = w.files.download(volume_path)
    return response.contents.read()
```

### PDF Page Extraction

```python
import fitz  # PyMuPDF
from io import BytesIO

def get_pdf_page_count(volume_path: str) -> int:
    """Get total page count from PDF."""
    content = read_volume_file(volume_path)
    doc = fitz.open(stream=content, filetype="pdf")
    return doc.page_count


def extract_pdf_page_image(volume_path: str, page_num: int, dpi: int = 150) -> bytes:
    """Extract a specific page as an image for preview."""
    content = read_volume_file(volume_path)
    doc = fitz.open(stream=content, filetype="pdf")
    
    page = doc[page_num - 1]  # 0-indexed
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat)
    
    return pix.tobytes("png")
```

---

## Citation Parser Patterns

The parser handles multiple citation formats that LLMs commonly generate:

### Pattern 1: Markdown Links
```
[Q3 Financial Report](/Volumes/main/reports/Q3_2024.pdf)
[Source: Technical Spec](docs/spec.pdf)
```

### Pattern 2: Inline References
```
(Source: /Volumes/main/data/report.pdf, page 5)
(See: quarterly_analysis.xlsx p.12)
```

### Pattern 3: Footnotes
```
According to the analysis[1], revenue increased...

[1] /Volumes/main/reports/financial_analysis.pdf
[2]: /Volumes/main/data/metrics.csv (page 3)
```

### Pattern 4: XML Tags
```xml
<source path="/Volumes/main/reports/Q3.pdf" page="5" title="Q3 Report" />
<citation file="data.xlsx" />
```

### Pattern 5: Volume Paths (Auto-detected)
```
The data in /Volumes/main/gold/customers shows that...
Check /Volumes/analytics/reports/2024/summary.pdf for details.
```

---

## Frontend File Viewers

### PDF Viewer Options

```javascript
// Option 1: pdf.js (Mozilla)
import { Document, Page } from 'react-pdf';

function PDFViewer({ url, page, onPageChange }) {
  const [numPages, setNumPages] = useState(null);
  
  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
    >
      <Page pageNumber={page} />
    </Document>
  );
}

// Option 2: iframe with native browser PDF viewer
function SimplePDFViewer({ url, page }) {
  return (
    <iframe
      src={`${url}#page=${page}`}
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}

// Option 3: PDF.js viewer embed
function PDFJSViewer({ url, page }) {
  const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}#page=${page}`;
  return <iframe src={viewerUrl} style={{ width: '100%', height: '100%' }} />;
}
```

### Data File Viewer

```javascript
import Papa from 'papaparse';

function CSVViewer({ content }) {
  const data = useMemo(() => {
    const result = Papa.parse(content, { header: true });
    return result.data;
  }, [content]);
  
  return (
    <table>
      <thead>
        <tr>
          {Object.keys(data[0] || {}).map(col => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 100).map((row, i) => (
          <tr key={i}>
            {Object.values(row).map((val, j) => (
              <td key={j}>{val}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## State Management for Persistent Sources

```javascript
// Using React Context for global citation state

const CitationContext = createContext();

export function CitationProvider({ children }) {
  const [citations, setCitations] = useState([]);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [activePreview, setActivePreview] = useState(null);
  
  const addCitations = useCallback((newCitations) => {
    setCitations(prev => {
      const existingPaths = new Set(prev.map(c => c.path));
      const unique = newCitations.filter(c => !existingPaths.has(c.path));
      return [...prev, ...unique];
    });
  }, []);
  
  const toggleBookmark = useCallback((citationId) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(citationId)) {
        next.delete(citationId);
      } else {
        next.add(citationId);
      }
      return next;
    });
  }, []);
  
  const value = {
    citations,
    bookmarks,
    activePreview,
    addCitations,
    toggleBookmark,
    setActivePreview,
  };
  
  return (
    <CitationContext.Provider value={value}>
      {children}
    </CitationContext.Provider>
  );
}

export function useCitations() {
  return useContext(CitationContext);
}
```

---

## Performance Optimizations

### 1. Lazy Loading Previews
Only load file content when user clicks on a citation:

```javascript
const handleCitationClick = async (citation) => {
  setPreviewLoading(true);
  
  // Check cache first
  const cached = previewCache.get(citation.path);
  if (cached) {
    setPreviewFile(cached);
    setPreviewLoading(false);
    return;
  }
  
  // Fetch preview
  const preview = await api.getFilePreview(citation.path);
  previewCache.set(citation.path, preview);
  setPreviewFile(preview);
  setPreviewLoading(false);
};
```

### 2. Virtualized Source List
For conversations with many citations:

```javascript
import { FixedSizeList } from 'react-window';

function SourcesList({ citations }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SourceItem citation={citations[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={400}
      itemCount={citations.length}
      itemSize={60}
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 3. Pre-fetch on Hover
Start loading preview when user hovers:

```javascript
const handleCitationHover = (citation) => {
  // Prefetch after 200ms hover
  const timeout = setTimeout(() => {
    if (!previewCache.has(citation.path)) {
      api.getFilePreview(citation.path).then(preview => {
        previewCache.set(citation.path, preview);
      });
    }
  }, 200);
  
  return () => clearTimeout(timeout);
};
```

---

## Summary

This pattern provides:

1. **Robust Citation Parsing** - Handles 6+ citation formats from LLM outputs
2. **Persistent Sources** - Like Claude's UI, sources persist across the conversation
3. **Interactive Previews** - PDF, image, text, and data file viewers
4. **AgentBricks Integration** - Direct integration with multi-agent supervisor responses
5. **Unity Catalog Support** - Native support for Volume file paths

The design matches the Databricks aesthetic with the same dark theme and IBM Plex typography as the Data Explorer pattern.
