/**
 * Citation Parser for AgentBricks / Knowledge Assistant Responses
 * ================================================================
 * 
 * Extracts file references and citations from multi-agent supervisor
 * responses that include knowledge assistant outputs.
 * 
 * Supports multiple citation formats commonly found in LLM outputs.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {Object} Citation
 * @property {string} id - Unique identifier
 * @property {string} label - Display label
 * @property {string} path - File path (Unity Catalog Volume path or URL)
 * @property {string} type - File type (pdf, word, excel, image, etc.)
 * @property {number|null} page - Page number if specified
 * @property {string|null} chunk - Chunk/excerpt from the document
 * @property {number|null} score - Relevance score (0-1)
 * @property {string|null} snippet - Context snippet around the citation
 * @property {number|null} refNumber - Reference number if footnote-style
 */

/**
 * @typedef {Object} AgentBricksSource
 * @property {string} path - File path
 * @property {string} [title] - Document title
 * @property {string} [name] - File name
 * @property {number} [page] - Page number
 * @property {number} [pageNumber] - Alternative page number field
 * @property {string} [chunk] - Text chunk
 * @property {string} [excerpt] - Text excerpt
 * @property {number} [score] - Relevance score
 * @property {number} [relevance] - Alternative relevance field
 * @property {string} [snippet] - Context snippet
 */

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse citations from an AgentBricks response.
 * 
 * @param {string} content - The message content to parse
 * @param {AgentBricksSource[]|null} structuredSources - Optional structured sources from API
 * @param {Object} options - Parser options
 * @param {boolean} options.includeSnippets - Extract context snippets (default: true)
 * @param {number} options.snippetLength - Context length in chars (default: 100)
 * @param {string[]} options.volumePrefixes - Volume path prefixes to recognize
 * @returns {Citation[]} Array of parsed citations
 */
export function parseCitations(content, structuredSources = null, options = {}) {
  const {
    includeSnippets = true,
    snippetLength = 100,
    volumePrefixes = ['/Volumes/', '/dbfs/', 's3://', 'abfss://', 'gs://'],
  } = options;
  
  const citations = [];
  const seenPaths = new Set();
  
  // Helper to add citation if not duplicate
  const addCitation = (citation) => {
    if (!seenPaths.has(citation.path)) {
      seenPaths.add(citation.path);
      citations.push({
        ...citation,
        id: `cite-${citations.length}`,
      });
    }
  };
  
  // ========================================
  // Pattern 1: Markdown-style links
  // ========================================
  // [Source: filename.pdf](path/to/file.pdf)
  // [1](volumes/docs/report.pdf)
  // [Document Title](/Volumes/catalog/schema/vol/file.pdf)
  const markdownPattern = /\[([^\]]+)\]\(([^)]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|xml|html?|png|jpe?g|gif|webp|svg))\)/gi;
  
  let match;
  while ((match = markdownPattern.exec(content)) !== null) {
    addCitation({
      label: match[1].replace(/^Source:\s*/i, ''),
      path: normalizePath(match[2]),
      type: getFileType(match[2]),
      page: extractPageNumber(match[1]) || extractPageNumber(match[2]),
      snippet: includeSnippets ? extractSnippet(content, match.index, snippetLength) : null,
    });
  }
  
  // ========================================
  // Pattern 2: Inline parenthetical references
  // ========================================
  // (Source: path/to/file.pdf, page 5)
  // (See: document.pdf p.12)
  // (Ref: /Volumes/main/data/report.pdf)
  const inlinePattern = /\((?:Source|See|Ref|Reference|From|Citation):\s*([^,)]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|xml|html?|png|jpe?g|gif|webp|svg))(?:[,\s]+(?:p\.?|page\.?\s*)(\d+))?\)/gi;
  
  while ((match = inlinePattern.exec(content)) !== null) {
    addCitation({
      label: getFileName(match[1]),
      path: normalizePath(match[1].trim()),
      type: getFileType(match[1]),
      page: match[2] ? parseInt(match[2]) : null,
      snippet: includeSnippets ? extractSnippet(content, match.index, snippetLength) : null,
    });
  }
  
  // ========================================
  // Pattern 3: Footnote-style references
  // ========================================
  // [1] /Volumes/data/report.pdf
  // [2]: document.pdf (page 5)
  // ^[3] path/to/file.xlsx
  const footnotePattern = /\^?\[(\d+)\]:?\s*([^\s\n(]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|xml|html?|png|jpe?g|gif|webp|svg))(?:\s*\(?(?:p\.?|page\.?\s*)(\d+)\)?)?/gi;
  
  while ((match = footnotePattern.exec(content)) !== null) {
    addCitation({
      label: `[${match[1]}] ${getFileName(match[2])}`,
      path: normalizePath(match[2]),
      type: getFileType(match[2]),
      page: match[3] ? parseInt(match[3]) : null,
      refNumber: parseInt(match[1]),
      snippet: includeSnippets ? extractSnippet(content, match.index, snippetLength) : null,
    });
  }
  
  // ========================================
  // Pattern 4: XML-style source tags
  // ========================================
  // <source path="/path/to/file.pdf" page="5" />
  // <citation file="document.pdf" title="Report" />
  // <ref src="data.xlsx" />
  const xmlPattern = /<(?:source|citation|ref|document)\s+(?:[^>]*?)(?:path|file|src|uri)="([^"]+)"(?:[^>]*?)(?:page="(\d+)")?(?:[^>]*?)(?:title="([^"]+)")?[^>]*\/?>/gi;
  
  while ((match = xmlPattern.exec(content)) !== null) {
    addCitation({
      label: match[3] || getFileName(match[1]),
      path: normalizePath(match[1]),
      type: getFileType(match[1]),
      page: match[2] ? parseInt(match[2]) : null,
      snippet: includeSnippets ? extractSnippet(content, match.index, snippetLength) : null,
    });
  }
  
  // ========================================
  // Pattern 5: Unity Catalog Volume paths
  // ========================================
  // /Volumes/catalog/schema/volume/path/to/file.pdf
  for (const prefix of volumePrefixes) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const volumePattern = new RegExp(
      `${escapedPrefix}[a-zA-Z0-9_\\-./]+\\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|xml|html?|png|jpe?g|gif|webp|svg)`,
      'gi'
    );
    
    while ((match = volumePattern.exec(content)) !== null) {
      addCitation({
        label: getFileName(match[0]),
        path: normalizePath(match[0]),
        type: getFileType(match[0]),
        page: null,
        snippet: includeSnippets ? extractSnippet(content, match.index, snippetLength) : null,
      });
    }
  }
  
  // ========================================
  // Pattern 6: Quoted file references
  // ========================================
  // "quarterly_report.pdf"
  // 'financial_data.xlsx'
  // `technical_spec.md`
  const quotedPattern = /["'`]([a-zA-Z0-9_\-./]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md|csv|json|xml|html?|png|jpe?g|gif|webp|svg))["'`]/gi;
  
  while ((match = quotedPattern.exec(content)) !== null) {
    // Only add if it looks like a path (has slash) or is explicitly a file
    if (match[1].includes('/') || /^\w+\.\w+$/.test(match[1])) {
      addCitation({
        label: getFileName(match[1]),
        path: normalizePath(match[1]),
        type: getFileType(match[1]),
        page: null,
        snippet: includeSnippets ? extractSnippet(content, match.index, snippetLength) : null,
      });
    }
  }
  
  // ========================================
  // Pattern 7: Structured sources from API
  // ========================================
  if (structuredSources && Array.isArray(structuredSources)) {
    for (const source of structuredSources) {
      const path = source.path || source.file || source.uri || source.url;
      if (path) {
        addCitation({
          label: source.title || source.name || getFileName(path),
          path: normalizePath(path),
          type: getFileType(path),
          page: source.page || source.pageNumber || source.page_number || null,
          chunk: source.chunk || source.excerpt || source.text || null,
          score: source.score || source.relevance || source.similarity || null,
          snippet: source.snippet || source.context || null,
        });
      }
    }
  }
  
  return citations;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get file extension and map to type category
 */
export function getFileType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const typeMap = {
    // Documents
    pdf: 'pdf',
    doc: 'word',
    docx: 'word',
    
    // Spreadsheets
    xls: 'excel',
    xlsx: 'excel',
    csv: 'data',
    
    // Presentations
    ppt: 'powerpoint',
    pptx: 'powerpoint',
    
    // Text
    txt: 'text',
    md: 'text',
    markdown: 'text',
    
    // Data
    json: 'data',
    xml: 'data',
    yaml: 'data',
    yml: 'data',
    
    // Images
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    
    // Web
    html: 'web',
    htm: 'web',
  };
  
  return typeMap[ext] || 'file';
}

/**
 * Extract filename from path
 */
export function getFileName(path) {
  return path.split('/').pop().split('\\').pop();
}

/**
 * Normalize file path
 */
export function normalizePath(path) {
  // Remove leading/trailing whitespace
  let normalized = path.trim();
  
  // Handle relative paths that should be absolute
  if (!normalized.startsWith('/') && 
      !normalized.startsWith('http') && 
      !normalized.match(/^[a-z]+:\/\//i)) {
    // Could prepend a default volume path if needed
    // normalized = `/Volumes/default/files/${normalized}`;
  }
  
  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  return normalized;
}

/**
 * Extract page number from text
 */
export function extractPageNumber(text) {
  if (!text) return null;
  
  const patterns = [
    /(?:p\.?|page\.?\s*)(\d+)/i,
    /\#(\d+)/,
    /\[(\d+)\]/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

/**
 * Extract context snippet around a citation
 */
export function extractSnippet(content, index, length = 100) {
  const start = Math.max(0, index - length);
  const end = Math.min(content.length, index + length);
  
  let snippet = content.slice(start, end);
  
  // Add ellipsis
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  // Clean up whitespace
  return snippet.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================================
// AGENTBRICKS RESPONSE PARSER
// ============================================================================

/**
 * Parse a complete AgentBricks multi-agent response.
 * Handles the supervisor pattern with nested agent outputs.
 * 
 * @param {Object} response - AgentBricks API response
 * @returns {Object} Parsed response with citations
 */
export function parseAgentBricksResponse(response) {
  // Handle different response structures
  const content = response.content || 
                  response.message?.content || 
                  response.output?.content ||
                  response.result?.content ||
                  '';
  
  // Extract structured sources from various locations
  const structuredSources = 
    response.sources ||
    response.citations ||
    response.references ||
    response.metadata?.sources ||
    response.output?.sources ||
    response.knowledge_assistant?.sources ||
    [];
  
  // Parse agent trace for additional sources
  const tracesSources = extractSourcesFromTrace(response.trace || response.steps || []);
  
  // Combine all sources
  const allSources = [...structuredSources, ...tracesSources];
  
  // Parse citations
  const citations = parseCitations(content, allSources);
  
  return {
    content: cleanContentForDisplay(content),
    citations,
    rawSources: allSources,
    agentTrace: response.trace || response.steps || null,
  };
}

/**
 * Extract sources from agent execution trace
 */
function extractSourcesFromTrace(trace) {
  const sources = [];
  
  if (!Array.isArray(trace)) return sources;
  
  for (const step of trace) {
    // Knowledge assistant step
    if (step.agent === 'knowledge_assistant' || 
        step.tool === 'knowledge_search' ||
        step.type === 'retrieval') {
      
      const stepSources = 
        step.sources ||
        step.output?.sources ||
        step.result?.sources ||
        step.retrieved_documents ||
        [];
      
      sources.push(...stepSources);
    }
    
    // Recursive for nested steps
    if (step.steps) {
      sources.push(...extractSourcesFromTrace(step.steps));
    }
  }
  
  return sources;
}

/**
 * Clean content for display by removing citation markup
 */
export function cleanContentForDisplay(content) {
  let cleaned = content;
  
  // Remove XML-style source tags
  cleaned = cleaned.replace(/<(?:source|citation|ref|document)[^>]*\/?>/gi, '');
  
  // Remove empty lines left by removed tags
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

// ============================================================================
// CITATION GROUPING & SORTING
// ============================================================================

/**
 * Group citations by type
 */
export function groupCitationsByType(citations) {
  const groups = {};
  
  for (const citation of citations) {
    const type = citation.type || 'file';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(citation);
  }
  
  return groups;
}

/**
 * Group citations by directory/volume
 */
export function groupCitationsByDirectory(citations) {
  const groups = {};
  
  for (const citation of citations) {
    const parts = citation.path.split('/');
    // Get parent directory or volume
    const dir = parts.slice(0, -1).join('/') || '/';
    
    if (!groups[dir]) {
      groups[dir] = [];
    }
    groups[dir].push(citation);
  }
  
  return groups;
}

/**
 * Sort citations by relevance score
 */
export function sortCitationsByRelevance(citations) {
  return [...citations].sort((a, b) => {
    // Citations with scores come first
    if (a.score && !b.score) return -1;
    if (!a.score && b.score) return 1;
    if (a.score && b.score) return b.score - a.score;
    
    // Then by reference number if available
    if (a.refNumber && b.refNumber) return a.refNumber - b.refNumber;
    
    // Finally alphabetically
    return a.label.localeCompare(b.label);
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  parseCitations,
  parseAgentBricksResponse,
  getFileType,
  getFileName,
  normalizePath,
  extractPageNumber,
  extractSnippet,
  cleanContentForDisplay,
  groupCitationsByType,
  groupCitationsByDirectory,
  sortCitationsByRelevance,
};
