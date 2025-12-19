/**
 * Parse message content into blocks (text, tables, citations, etc.)
 *
 * Extracts markdown tables, PDF citations, and other structured content from text
 * and creates appropriate block objects.
 */

import { ChatBlock, TableBlock, CitationBlock } from "@/types/chat";

interface ParsedContent {
  blocks: ChatBlock[];
  citations: CitationBlock[];
}

/**
 * Extract PDF citations from markdown links
 * Format: [Document Name, p. 42](https://…/volumes/hr/document.pdf?page=42)
 */
function extractCitations(content: string, messageId: string): CitationBlock[] {
  const citations: CitationBlock[] = [];

  // Regex to match markdown links to PDFs
  // Matches: [link text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.pdf[^)]*)\)/gi;

  let match;
  let citationIndex = 1;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1]; // e.g., "Employee Handbook, p. 42"
    const url = match[2]; // e.g., "https://.../ volumes/hr/employee_handbook.pdf?page=42"

    // Extract page number from link text or URL
    let page: number | undefined;

    // Try to extract from link text (e.g., "p. 42" or "page 42")
    const pageMatch = linkText.match(/p\.?\s*(\d+)|page\s+(\d+)/i);
    if (pageMatch) {
      page = parseInt(pageMatch[1] || pageMatch[2]);
    }

    // Also check URL query parameter
    const urlPageMatch = url.match(/[?&]page=(\d+)/i);
    if (urlPageMatch && !page) {
      page = parseInt(urlPageMatch[1]);
    }

    // Extract document title (remove page reference)
    const title = linkText.replace(/,?\s*p\.?\s*\d+|,?\s*page\s+\d+/i, '').trim();

    citations.push({
      id: `${messageId}-citation-${citationIndex}`,
      type: "citation",
      title: title || "Document",
      url: url,
      page: page,
      index: citationIndex,
    });

    citationIndex++;
  }

  return citations;
}

/**
 * Parse markdown text into blocks
 *
 * Detects and extracts:
 * - Markdown tables (lines with | separators)
 * - PDF citations (markdown links to .pdf files)
 * - Remaining text content
 */
export function parseMessageBlocks(content: string, messageId: string): ParsedContent {
  const blocks: ChatBlock[] = [];

  if (!content.trim()) {
    return { blocks, citations: [] };
  }

  // Extract citations first
  const citations = extractCitations(content, messageId);

  const lines = content.split("\n");
  let currentTextLines: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;
  let blockCounter = 0;

  const flushText = () => {
    if (currentTextLines.length > 0) {
      const textContent = currentTextLines.join("\n").trim();
      if (textContent) {
        blocks.push({
          id: `${messageId}-text-${blockCounter++}`,
          type: "text",
          markdown: textContent,
        });
      }
      currentTextLines = [];
    }
  };

  const flushTable = () => {
    if (tableLines.length >= 2) {
      try {
        const tableBlock = parseMarkdownTable(tableLines, `${messageId}-table-${blockCounter++}`);
        if (tableBlock) {
          blocks.push(tableBlock);
        }
      } catch (err) {
        console.warn("Failed to parse table:", err);
        // If parsing fails, treat as text
        currentTextLines.push(...tableLines);
      }
      tableLines = [];
    }
    inTable = false;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Detect table lines (start with |)
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      if (!inTable) {
        // Starting a new table
        flushText();
        inTable = true;
      }
      tableLines.push(line);
    } else {
      // Not a table line
      if (inTable) {
        // End of table
        flushTable();
      }
      currentTextLines.push(line);
    }
  }

  // Flush remaining content
  if (inTable) {
    flushTable();
  }
  flushText();

  // If no blocks were created, create a single text block
  if (blocks.length === 0 && content.trim()) {
    blocks.push({
      id: `${messageId}-text-0`,
      type: "text",
      markdown: content,
    });
  }

  return { blocks, citations };
}

/**
 * Parse markdown table into TableBlock
 */
function parseMarkdownTable(lines: string[], blockId: string): TableBlock | null {
  if (lines.length < 2) return null;

  // Parse header row (first line)
  const headerLine = lines[0].trim();
  const headers = headerLine
    .split("|")
    .slice(1, -1) // Remove empty first/last elements
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  if (headers.length === 0) return null;

  // Skip separator row (second line with dashes)
  // Parse data rows (remaining lines)
  const dataRows: string[][] = [];

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line
      .split("|")
      .slice(1, -1) // Remove empty first/last elements
      .map((c) => c.trim());

    // Only add row if it has the right number of columns
    if (cells.length === headers.length) {
      dataRows.push(cells);
    }
  }

  if (dataRows.length === 0) return null;

  return {
    id: blockId,
    type: "table",
    columns: headers,
    rows: dataRows,
    meta: {
      title: "Data Table",
      subtitle: `${dataRows.length} rows`,
    },
  };
}

/**
 * Update existing blocks with new parsed content
 *
 * This is useful for streaming scenarios where content is appended
 * and we need to re-parse the entire message.
 */
export function updateBlocksFromContent(
  content: string,
  messageId: string
): ChatBlock[] {
  // For now, just re-parse everything
  // In the future, could be smarter about incremental updates
  const { blocks } = parseMessageBlocks(content, messageId);
  return blocks;
}
