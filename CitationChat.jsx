import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// CITATION-AWARE CHAT UI WITH FILE PREVIEW
// For AgentBricks Multi-Agent Supervisor + Knowledge Assistant responses
// ============================================================================

// ============================================================================
// CITATION PARSER - Extracts sources from AgentBricks responses
// ============================================================================

/**
 * Parses AgentBricks/Knowledge Assistant responses to extract citations.
 * 
 * Supports multiple citation formats:
 * 1. Markdown-style: [Source: filename.pdf](path/to/file.pdf)
 * 2. Inline references: (Source: path/to/file.pdf, page 5)
 * 3. Footnote style: [1] path/to/document.pdf
 * 4. AgentBricks structured: {"sources": [{"path": "...", "page": N}]}
 * 5. XML-style: <source path="..." page="..." />
 */
export function parseCitations(content, structuredSources = null) {
  const citations = [];
  const seenPaths = new Set();
  
  // Pattern 1: Markdown links with source indicator
  // [Source: filename.pdf](path/to/file.pdf)
  // [1](volumes/docs/report.pdf)
  const markdownPattern = /\[(?:Source:\s*)?([^\]]+)\]\(([^)]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|png|jpe?g|gif))\)/gi;
  let match;
  while ((match = markdownPattern.exec(content)) !== null) {
    const path = match[2];
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      citations.push({
        id: `cite-${citations.length}`,
        label: match[1],
        path: path,
        type: getFileType(path),
        page: extractPageNumber(match[1]) || extractPageNumber(path),
        snippet: extractSnippetContext(content, match.index),
      });
    }
  }
  
  // Pattern 2: Inline source references
  // (Source: path/to/file.pdf, page 5)
  // (See: document.pdf p.12)
  const inlinePattern = /\((?:Source|See|Ref|Reference|From):\s*([^,)]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|png|jpe?g|gif))(?:,?\s*(?:p\.?|page\.?\s*)(\d+))?\)/gi;
  while ((match = inlinePattern.exec(content)) !== null) {
    const path = match[1].trim();
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      citations.push({
        id: `cite-${citations.length}`,
        label: getFileName(path),
        path: path,
        type: getFileType(path),
        page: match[2] ? parseInt(match[2]) : null,
        snippet: extractSnippetContext(content, match.index),
      });
    }
  }
  
  // Pattern 3: Footnote-style references
  // [1] /Volumes/data/report.pdf
  // [2]: document.pdf (page 5)
  const footnotePattern = /\[(\d+)\]:?\s*([^\s\n]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|png|jpe?g|gif))(?:\s*\(?(?:p\.?|page\.?\s*)(\d+)\)?)?/gi;
  while ((match = footnotePattern.exec(content)) !== null) {
    const path = match[2];
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      citations.push({
        id: `cite-${citations.length}`,
        label: `[${match[1]}] ${getFileName(path)}`,
        path: path,
        type: getFileType(path),
        page: match[3] ? parseInt(match[3]) : null,
        refNumber: parseInt(match[1]),
        snippet: extractSnippetContext(content, match.index),
      });
    }
  }
  
  // Pattern 4: XML-style source tags (common in structured agent outputs)
  // <source path="/path/to/file.pdf" page="5" />
  // <citation file="document.pdf" />
  const xmlPattern = /<(?:source|citation|ref)\s+(?:path|file|src)="([^"]+)"(?:\s+page="(\d+)")?[^>]*\/?>/gi;
  while ((match = xmlPattern.exec(content)) !== null) {
    const path = match[1];
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      citations.push({
        id: `cite-${citations.length}`,
        label: getFileName(path),
        path: path,
        type: getFileType(path),
        page: match[2] ? parseInt(match[2]) : null,
        snippet: extractSnippetContext(content, match.index),
      });
    }
  }
  
  // Pattern 5: Unity Catalog Volume paths
  // /Volumes/catalog/schema/volume/path/to/file.pdf
  const volumePattern = /\/Volumes\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[^\s\n]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|png|jpe?g|gif)/gi;
  while ((match = volumePattern.exec(content)) !== null) {
    const path = match[0];
    if (!seenPaths.has(path)) {
      seenPaths.add(path);
      citations.push({
        id: `cite-${citations.length}`,
        label: getFileName(path),
        path: path,
        type: getFileType(path),
        page: null,
        snippet: extractSnippetContext(content, match.index),
      });
    }
  }
  
  // Pattern 6: Structured sources from AgentBricks response metadata
  if (structuredSources && Array.isArray(structuredSources)) {
    for (const source of structuredSources) {
      const path = source.path || source.file || source.uri;
      if (path && !seenPaths.has(path)) {
        seenPaths.add(path);
        citations.push({
          id: `cite-${citations.length}`,
          label: source.title || source.name || getFileName(path),
          path: path,
          type: getFileType(path),
          page: source.page || source.pageNumber || null,
          chunk: source.chunk || source.excerpt || null,
          score: source.score || source.relevance || null,
          snippet: source.snippet || source.context || null,
        });
      }
    }
  }
  
  return citations;
}

function getFileName(path) {
  return path.split('/').pop().split('\\').pop();
}

function getFileType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const typeMap = {
    pdf: 'pdf',
    doc: 'word', docx: 'word',
    xls: 'excel', xlsx: 'excel',
    ppt: 'powerpoint', pptx: 'powerpoint',
    txt: 'text', md: 'text',
    csv: 'data', json: 'data',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  };
  return typeMap[ext] || 'file';
}

function extractPageNumber(text) {
  const pageMatch = text.match(/(?:p\.?|page\.?\s*)(\d+)/i);
  return pageMatch ? parseInt(pageMatch[1]) : null;
}

function extractSnippetContext(content, index, contextLength = 100) {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + contextLength);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet.replace(/\n+/g, ' ').trim();
}

// ============================================================================
// FILE TYPE ICONS
// ============================================================================

const FileIcons = {
  pdf: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 12h4M10 16h4M8 12h.01M8 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  word: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 13l2 5 2-5 2 5 2-5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  excel: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 12l8 8M16 12l-8 8" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  powerpoint: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="14" r="4" stroke="#F97316" strokeWidth="1.5"/>
    </svg>
  ),
  text: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  image: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  data: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 13h8M8 17h5" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  file: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
};

const Icons = {
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Bookmark: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  BookmarkFilled: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  ZoomIn: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  ZoomOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  RotateCw: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  Sidebar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  ),
  FileStack: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M12 18v-6M9 15l3 3 3-3"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z"/>
      <path d="M19 11l.5 1.5L21 13l-1.5.5L19 15l-.5-1.5L17 13l1.5-.5L19 11z"/>
    </svg>
  ),
};

// ============================================================================
// MOCK DATA & API
// ============================================================================

// Simulated AgentBricks API
const AgentBricksAPI = {
  async sendMessage(message, conversationId) {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    
    // Mock response with citations
    const responses = [
      {
        content: `Based on the quarterly financial report, revenue increased by 23% year-over-year. 

According to the analysis in [Q3 Financial Summary](/Volumes/main/reports/financial/Q3_2024_Summary.pdf), the primary drivers were:

1. **Enterprise Growth**: Enterprise segment grew 34% (Source: /Volumes/main/reports/financial/enterprise_analysis.pdf, page 12)
2. **New Product Lines**: The AI platform contributed $45M in new revenue [Product Revenue Report](/Volumes/main/reports/products/ai_platform_revenue.xlsx)

<source path="/Volumes/main/reports/financial/Q3_2024_Summary.pdf" page="5" />

The CFO's commentary notes that operating margins improved to 18.5%, up from 15.2% last quarter. (See: /Volumes/main/reports/financial/cfo_commentary.pdf p.3)`,
        sources: [
          { path: '/Volumes/main/reports/financial/Q3_2024_Summary.pdf', title: 'Q3 2024 Financial Summary', page: 5, score: 0.95 },
          { path: '/Volumes/main/reports/financial/enterprise_analysis.pdf', title: 'Enterprise Segment Analysis', page: 12, score: 0.88 },
          { path: '/Volumes/main/reports/products/ai_platform_revenue.xlsx', title: 'AI Platform Revenue', score: 0.82 },
          { path: '/Volumes/main/reports/financial/cfo_commentary.pdf', title: 'CFO Commentary', page: 3, score: 0.79 },
        ]
      },
      {
        content: `The HR policy document outlines the updated remote work guidelines. 

Key changes effective January 2025 include:

- Flexible hybrid model with 2 days minimum in-office [HR Policy v3.2](/Volumes/main/hr/policies/remote_work_policy_v3.2.pdf)
- Updated equipment stipend of $1,500 annually (Source: /Volumes/main/hr/policies/equipment_policy.pdf, page 4)
- New wellness benefits detailed in the [Benefits Guide](/Volumes/main/hr/benefits/2025_benefits_guide.pdf)

<source path="/Volumes/main/hr/policies/remote_work_policy_v3.2.pdf" page="1" />

The policy was approved by the executive team on December 15th, 2024.`,
        sources: [
          { path: '/Volumes/main/hr/policies/remote_work_policy_v3.2.pdf', title: 'Remote Work Policy v3.2', page: 1, score: 0.97 },
          { path: '/Volumes/main/hr/policies/equipment_policy.pdf', title: 'Equipment Policy', page: 4, score: 0.85 },
          { path: '/Volumes/main/hr/benefits/2025_benefits_guide.pdf', title: '2025 Benefits Guide', score: 0.81 },
        ]
      },
      {
        content: `The technical architecture documentation provides details on the data pipeline.

The ingestion layer uses Delta Lake for reliability [Architecture Overview](/Volumes/main/engineering/docs/architecture_overview.pdf). Key components:

1. **Stream Processing**: Kafka → Spark Structured Streaming → Delta Tables
   (Source: /Volumes/main/engineering/docs/streaming_pipeline.pdf, page 8)

2. **Data Quality**: Great Expectations framework with 150+ validation rules
   [Data Quality Runbook](/Volumes/main/engineering/docs/data_quality_runbook.md)

3. **Monitoring Dashboard**: Real-time metrics shown in [Grafana Dashboards](/Volumes/main/engineering/dashboards/pipeline_monitoring.json)

<source path="/Volumes/main/engineering/docs/architecture_overview.pdf" page="15" />

The system processes approximately 2.5TB of data daily with 99.9% uptime.`,
        sources: [
          { path: '/Volumes/main/engineering/docs/architecture_overview.pdf', title: 'Architecture Overview', page: 15, score: 0.94 },
          { path: '/Volumes/main/engineering/docs/streaming_pipeline.pdf', title: 'Streaming Pipeline Guide', page: 8, score: 0.91 },
          { path: '/Volumes/main/engineering/docs/data_quality_runbook.md', title: 'Data Quality Runbook', score: 0.86 },
          { path: '/Volumes/main/engineering/dashboards/pipeline_monitoring.json', title: 'Pipeline Monitoring Config', score: 0.72 },
        ]
      }
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  },
  
  async getFilePreview(path) {
    // Simulate fetching file preview
    await new Promise(r => setTimeout(r, 500));
    
    const type = getFileType(path);
    const fileName = getFileName(path);
    
    // Return mock preview data
    return {
      path,
      name: fileName,
      type,
      size: Math.floor(Math.random() * 5000000) + 100000,
      lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      // For PDFs, return mock page info
      ...(type === 'pdf' && {
        pageCount: Math.floor(Math.random() * 50) + 5,
        previewUrl: `https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf`,
      }),
      // For images, return placeholder
      ...(type === 'image' && {
        previewUrl: `https://picsum.photos/800/600?random=${Math.random()}`,
        width: 800,
        height: 600,
      }),
      // For text/data, return mock content
      ...((type === 'text' || type === 'data') && {
        content: `# ${fileName}\n\nThis is a preview of the document content.\n\n## Section 1\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Section 2\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
      }),
    };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CitationChat({ 
  agentEndpoint = null,
  onCitationClick = null,
}) {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // All citations across the conversation (persistent)
  const [allCitations, setAllCitations] = useState([]);
  const [bookmarkedCitations, setBookmarkedCitations] = useState(new Set());
  
  // Preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);
  
  // UI state
  const [showSourcesSidebar, setShowSourcesSidebar] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Call AgentBricks API
      const response = await AgentBricksAPI.sendMessage(
        userMessage.content,
        'conversation-1'
      );
      
      // Parse citations from response
      const citations = parseCitations(response.content, response.sources);
      
      const assistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        citations: citations,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Add to persistent citations list (avoiding duplicates)
      setAllCitations(prev => {
        const existingPaths = new Set(prev.map(c => c.path));
        const newCitations = citations.filter(c => !existingPaths.has(c.path));
        return [...prev, ...newCitations];
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'error',
        content: 'Failed to get response. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle citation click
  const handleCitationClick = async (citation) => {
    setPreviewLoading(true);
    setPreviewFile(null);
    
    try {
      const preview = await AgentBricksAPI.getFilePreview(citation.path);
      setPreviewFile({
        ...preview,
        ...citation,
      });
      setPreviewPage(citation.page || 1);
      setPreviewZoom(100);
      
      if (onCitationClick) {
        onCitationClick(citation);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Toggle bookmark
  const toggleBookmark = (citationId) => {
    setBookmarkedCitations(prev => {
      const next = new Set(prev);
      if (next.has(citationId)) {
        next.delete(citationId);
      } else {
        next.add(citationId);
      }
      return next;
    });
  };

  // Format message content with clickable citations
  const formatMessageContent = (content, citations) => {
    if (!citations || citations.length === 0) {
      return <p style={styles.messageText}>{content}</p>;
    }
    
    // Simple rendering - in production, use a proper markdown parser
    // that preserves citation links and makes them interactive
    let formattedContent = content;
    
    // Remove XML-style source tags from display
    formattedContent = formattedContent.replace(/<(?:source|citation|ref)[^>]*\/?>/gi, '');
    
    // Split into paragraphs
    const paragraphs = formattedContent.split('\n\n');
    
    return (
      <div>
        {paragraphs.map((para, i) => (
          <p key={i} style={styles.messageText}>
            {para.split('\n').map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </p>
        ))}
        
        {/* Inline citation chips */}
        <div style={styles.citationChips}>
          {citations.map((citation) => (
            <button
              key={citation.id}
              onClick={() => handleCitationClick(citation)}
              style={{
                ...styles.citationChip,
                ...(previewFile?.path === citation.path ? styles.citationChipActive : {}),
              }}
            >
              {FileIcons[citation.type]?.() || FileIcons.file()}
              <span style={styles.citationChipLabel}>{citation.label}</span>
              {citation.page && (
                <span style={styles.citationChipPage}>p.{citation.page}</span>
              )}
              {citation.score && (
                <span style={styles.citationChipScore}>
                  {Math.round(citation.score * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={styles.container}>
      {/* Sources Sidebar (Persistent) */}
      <aside style={{
        ...styles.sourcesSidebar,
        ...(showSourcesSidebar ? {} : styles.sourcesSidebarCollapsed),
      }}>
        <div style={styles.sourcesSidebarHeader}>
          <div style={styles.sourcesSidebarTitle}>
            <Icons.FileStack />
            <span>Sources</span>
            <span style={styles.sourcesCount}>{allCitations.length}</span>
          </div>
          <button
            onClick={() => setShowSourcesSidebar(!showSourcesSidebar)}
            style={styles.sidebarToggle}
          >
            {showSourcesSidebar ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
          </button>
        </div>
        
        {showSourcesSidebar && (
          <div style={styles.sourcesList}>
            {allCitations.length === 0 ? (
              <div style={styles.sourcesEmpty}>
                <Icons.Sparkles />
                <p>Sources cited in the conversation will appear here</p>
              </div>
            ) : (
              <>
                {/* Bookmarked sources first */}
                {allCitations.filter(c => bookmarkedCitations.has(c.id)).length > 0 && (
                  <div style={styles.sourcesSection}>
                    <div style={styles.sourcesSectionLabel}>Bookmarked</div>
                    {allCitations
                      .filter(c => bookmarkedCitations.has(c.id))
                      .map(citation => (
                        <SourceItem
                          key={citation.id}
                          citation={citation}
                          isActive={previewFile?.path === citation.path}
                          isBookmarked={true}
                          onClick={() => handleCitationClick(citation)}
                          onBookmark={() => toggleBookmark(citation.id)}
                        />
                      ))}
                  </div>
                )}
                
                {/* All sources */}
                <div style={styles.sourcesSection}>
                  <div style={styles.sourcesSectionLabel}>All Sources</div>
                  {allCitations
                    .filter(c => !bookmarkedCitations.has(c.id))
                    .map(citation => (
                      <SourceItem
                        key={citation.id}
                        citation={citation}
                        isActive={previewFile?.path === citation.path}
                        isBookmarked={false}
                        onClick={() => handleCitationClick(citation)}
                        onBookmark={() => toggleBookmark(citation.id)}
                      />
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Chat Panel */}
      <main style={styles.chatPanel}>
        <div style={styles.chatHeader}>
          <h1 style={styles.chatTitle}>Knowledge Assistant</h1>
          <span style={styles.chatSubtitle}>Powered by AgentBricks</span>
        </div>
        
        <div style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <h2 style={styles.emptyTitle}>Ask about your documents</h2>
              <p style={styles.emptyText}>
                I can search through your knowledge base and cite sources.
                Try asking about financial reports, policies, or technical docs.
              </p>
              <div style={styles.suggestions}>
                {[
                  'What were the Q3 revenue highlights?',
                  'Summarize the remote work policy',
                  'Explain the data pipeline architecture',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(suggestion)}
                    style={styles.suggestion}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : {}),
                  ...(message.role === 'error' ? styles.errorMessage : {}),
                }}
              >
                {message.role === 'assistant' && (
                  <div style={styles.avatarAssistant}>
                    <Icons.Sparkles />
                  </div>
                )}
                <div style={styles.messageContent}>
                  {message.role === 'assistant'
                    ? formatMessageContent(message.content, message.citations)
                    : <p style={styles.messageText}>{message.content}</p>
                  }
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div style={styles.message}>
              <div style={styles.avatarAssistant}>
                <Icons.Sparkles />
              </div>
              <div style={styles.loadingIndicator}>
                <span style={styles.loadingDot} />
                <span style={{...styles.loadingDot, animationDelay: '0.2s'}} />
                <span style={{...styles.loadingDot, animationDelay: '0.4s'}} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about your documents..."
              style={styles.input}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              style={{
                ...styles.sendButton,
                ...(!inputValue.trim() || isLoading ? styles.sendButtonDisabled : {}),
              }}
            >
              <Icons.Send />
            </button>
          </div>
        </div>
      </main>

      {/* Preview Panel */}
      <aside style={{
        ...styles.previewPanel,
        ...(previewFile ? {} : styles.previewPanelEmpty),
      }}>
        {previewLoading ? (
          <div style={styles.previewLoading}>
            <div style={styles.spinner} />
            <span>Loading preview...</span>
          </div>
        ) : previewFile ? (
          <>
            <div style={styles.previewHeader}>
              <div style={styles.previewFileInfo}>
                {FileIcons[previewFile.type]?.() || FileIcons.file()}
                <div>
                  <h2 style={styles.previewTitle}>{previewFile.name}</h2>
                  <span style={styles.previewPath}>{previewFile.path}</span>
                </div>
              </div>
              <div style={styles.previewActions}>
                <button
                  onClick={() => toggleBookmark(previewFile.id)}
                  style={styles.previewAction}
                  title={bookmarkedCitations.has(previewFile.id) ? 'Remove bookmark' : 'Bookmark'}
                >
                  {bookmarkedCitations.has(previewFile.id) 
                    ? <Icons.BookmarkFilled /> 
                    : <Icons.Bookmark />}
                </button>
                <button style={styles.previewAction} title="Download">
                  <Icons.Download />
                </button>
                <button style={styles.previewAction} title="Open in new tab">
                  <Icons.ExternalLink />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  style={styles.previewAction}
                  title="Close"
                >
                  <Icons.X />
                </button>
              </div>
            </div>
            
            {/* Preview toolbar for PDFs */}
            {previewFile.type === 'pdf' && (
              <div style={styles.previewToolbar}>
                <div style={styles.pageNavigation}>
                  <button
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage <= 1}
                    style={styles.toolbarButton}
                  >
                    <Icons.ChevronLeft />
                  </button>
                  <span style={styles.pageInfo}>
                    Page {previewPage} of {previewFile.pageCount}
                  </span>
                  <button
                    onClick={() => setPreviewPage(p => Math.min(previewFile.pageCount, p + 1))}
                    disabled={previewPage >= previewFile.pageCount}
                    style={styles.toolbarButton}
                  >
                    <Icons.ChevronRight />
                  </button>
                </div>
                <div style={styles.zoomControls}>
                  <button
                    onClick={() => setPreviewZoom(z => Math.max(50, z - 25))}
                    style={styles.toolbarButton}
                  >
                    <Icons.ZoomOut />
                  </button>
                  <span style={styles.zoomInfo}>{previewZoom}%</span>
                  <button
                    onClick={() => setPreviewZoom(z => Math.min(200, z + 25))}
                    style={styles.toolbarButton}
                  >
                    <Icons.ZoomIn />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(100)}
                    style={styles.toolbarButton}
                  >
                    <Icons.RotateCw />
                  </button>
                </div>
              </div>
            )}
            
            {/* Preview content */}
            <div style={styles.previewContent}>
              {previewFile.type === 'pdf' && previewFile.previewUrl && (
                <iframe
                  src={`${previewFile.previewUrl}#page=${previewPage}`}
                  style={{
                    ...styles.pdfViewer,
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'top center',
                  }}
                  title="PDF Preview"
                />
              )}
              
              {previewFile.type === 'image' && previewFile.previewUrl && (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.name}
                  style={{
                    ...styles.imageViewer,
                    transform: `scale(${previewZoom / 100})`,
                  }}
                />
              )}
              
              {(previewFile.type === 'text' || previewFile.type === 'data') && previewFile.content && (
                <pre style={styles.textViewer}>
                  {previewFile.content}
                </pre>
              )}
              
              {!previewFile.previewUrl && !previewFile.content && (
                <div style={styles.noPreview}>
                  <div style={styles.noPreviewIcon}>
                    {FileIcons[previewFile.type]?.() || FileIcons.file()}
                  </div>
                  <p>Preview not available for this file type</p>
                  <button style={styles.downloadButton}>
                    <Icons.Download />
                    Download to view
                  </button>
                </div>
              )}
            </div>
            
            {/* File metadata */}
            <div style={styles.previewMeta}>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Size</span>
                <span style={styles.metaValue}>{formatBytes(previewFile.size)}</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Modified</span>
                <span style={styles.metaValue}>
                  {new Date(previewFile.lastModified).toLocaleDateString()}
                </span>
              </div>
              {previewFile.score && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Relevance</span>
                  <span style={styles.metaValue}>{Math.round(previewFile.score * 100)}%</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={styles.previewEmpty}>
            <div style={styles.previewEmptyIcon}>📄</div>
            <h3>Document Preview</h3>
            <p>Click on a cited source to preview it here</p>
          </div>
        )}
      </aside>
    </div>
  );
}

// ============================================================================
// SOURCE ITEM COMPONENT
// ============================================================================

function SourceItem({ citation, isActive, isBookmarked, onClick, onBookmark }) {
  return (
    <div
      style={{
        ...styles.sourceItem,
        ...(isActive ? styles.sourceItemActive : {}),
      }}
    >
      <button onClick={onClick} style={styles.sourceItemMain}>
        <span style={styles.sourceIcon}>
          {FileIcons[citation.type]?.() || FileIcons.file()}
        </span>
        <div style={styles.sourceInfo}>
          <span style={styles.sourceName}>{citation.label}</span>
          <span style={styles.sourcePath}>{citation.path}</span>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onBookmark(); }}
        style={{
          ...styles.bookmarkButton,
          ...(isBookmarked ? styles.bookmarkButtonActive : {}),
        }}
      >
        {isBookmarked ? <Icons.BookmarkFilled /> : <Icons.Bookmark />}
      </button>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#0D0D0F',
    color: '#E8E8EA',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  
  // Sources Sidebar
  sourcesSidebar: {
    width: '280px',
    borderRight: '1px solid #2A2A30',
    backgroundColor: '#131316',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  },
  sourcesSidebarCollapsed: {
    width: '48px',
  },
  sourcesSidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #2A2A30',
    minHeight: '56px',
  },
  sourcesSidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 600,
    fontSize: '15px',
  },
  sourcesCount: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#FF6B35',
    color: '#0D0D0F',
    borderRadius: '10px',
    fontWeight: 600,
  },
  sidebarToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'none',
    border: '1px solid #2A2A30',
    borderRadius: '6px',
    color: '#6B6B76',
    cursor: 'pointer',
  },
  sourcesList: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
  },
  sourcesEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    textAlign: 'center',
    color: '#6B6B76',
    gap: '12px',
    padding: '20px',
  },
  sourcesSection: {
    marginBottom: '20px',
  },
  sourcesSectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    marginBottom: '8px',
    paddingLeft: '4px',
  },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '4px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    transition: 'background-color 0.15s ease',
  },
  sourceItemActive: {
    backgroundColor: '#1E1E24',
  },
  sourceItemMain: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#E8E8EA',
    borderRadius: '8px',
  },
  sourceIcon: {
    color: '#6B6B76',
    flexShrink: 0,
  },
  sourceInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  sourceName: {
    fontWeight: 500,
    fontSize: '13px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sourcePath: {
    fontSize: '11px',
    color: '#6B6B76',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: '"IBM Plex Mono", monospace',
  },
  bookmarkButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    color: '#4A4A52',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 0.15s ease',
  },
  bookmarkButtonActive: {
    color: '#FF6B35',
  },
  
  // Chat Panel
  chatPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    borderRight: '1px solid #2A2A30',
  },
  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid #2A2A30',
    backgroundColor: '#131316',
  },
  chatTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
  },
  chatSubtitle: {
    fontSize: '12px',
    color: '#6B6B76',
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: '40px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '20px',
    fontWeight: 600,
  },
  emptyText: {
    margin: '0 0 24px',
    color: '#6B6B76',
    maxWidth: '400px',
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    maxWidth: '400px',
  },
  suggestion: {
    padding: '12px 16px',
    backgroundColor: '#1E1E24',
    border: '1px solid #2A2A30',
    borderRadius: '8px',
    color: '#B0B0B8',
    fontSize: '14px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  message: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    maxWidth: '800px',
  },
  userMessage: {
    marginLeft: 'auto',
    flexDirection: 'row-reverse',
  },
  errorMessage: {
    opacity: 0.7,
  },
  avatarAssistant: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#FF6B35',
    color: '#0D0D0F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageText: {
    margin: '0 0 12px',
    whiteSpace: 'pre-wrap',
  },
  citationChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
  },
  citationChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#1E1E24',
    border: '1px solid #2A2A30',
    borderRadius: '6px',
    color: '#B0B0B8',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  citationChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#261A14',
  },
  citationChipLabel: {
    maxWidth: '150px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  citationChipPage: {
    padding: '2px 6px',
    backgroundColor: '#2A2A30',
    borderRadius: '4px',
    fontSize: '10px',
  },
  citationChipScore: {
    padding: '2px 6px',
    backgroundColor: '#10B98120',
    color: '#10B981',
    borderRadius: '4px',
    fontSize: '10px',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 0',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#FF6B35',
    borderRadius: '50%',
    animation: 'pulse 1s ease-in-out infinite',
  },
  inputContainer: {
    padding: '16px 24px',
    borderTop: '1px solid #2A2A30',
    backgroundColor: '#131316',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#1E1E24',
    borderRadius: '12px',
    border: '1px solid #2A2A30',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#E8E8EA',
    fontSize: '14px',
    resize: 'none',
    minHeight: '24px',
    maxHeight: '120px',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    color: '#0D0D0F',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'opacity 0.15s ease',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  
  // Preview Panel
  previewPanel: {
    width: '450px',
    backgroundColor: '#131316',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  previewPanelEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    color: '#6B6B76',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #2A2A30',
    borderTopColor: '#FF6B35',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #2A2A30',
    gap: '12px',
  },
  previewFileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
    color: '#6B6B76',
  },
  previewTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#E8E8EA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  previewPath: {
    fontSize: '11px',
    color: '#6B6B76',
    fontFamily: '"IBM Plex Mono", monospace',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  previewActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  previewAction: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'none',
    border: '1px solid #2A2A30',
    borderRadius: '6px',
    color: '#6B6B76',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  previewToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#1A1A20',
    borderBottom: '1px solid #2A2A30',
  },
  pageNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    color: '#B0B0B8',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '12px',
    color: '#6B6B76',
    minWidth: '100px',
    textAlign: 'center',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  zoomInfo: {
    fontSize: '12px',
    color: '#6B6B76',
    minWidth: '40px',
    textAlign: 'center',
  },
  previewContent: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#0D0D0F',
  },
  pdfViewer: {
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: '#0D0D0F',
  },
  imageViewer: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  textViewer: {
    width: '100%',
    padding: '20px',
    margin: 0,
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#B0B0B8',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  noPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    color: '#6B6B76',
    textAlign: 'center',
    padding: '40px',
  },
  noPreviewIcon: {
    transform: 'scale(2)',
    marginBottom: '8px',
  },
  downloadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    color: '#0D0D0F',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  previewMeta: {
    display: 'flex',
    gap: '24px',
    padding: '12px 20px',
    borderTop: '1px solid #2A2A30',
    backgroundColor: '#131316',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
  },
  metaValue: {
    fontSize: '13px',
    color: '#E8E8EA',
  },
  previewEmpty: {
    textAlign: 'center',
    color: '#6B6B76',
  },
  previewEmptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
};

// Add keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
`;
document.head.appendChild(styleSheet);
