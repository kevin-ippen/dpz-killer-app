/**
 * Full PDF View Component
 *
 * Displays a PDF document in the right panel with optional page navigation
 * Uses react-pdf for proper rendering without iframe routing conflicts
 */

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { CitationBlock } from "@/types/chat";
import { ExternalLink, FileText, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FullPDFViewProps {
  block: CitationBlock;
}

export function FullPDFView({ block }: FullPDFViewProps) {
  const { title, url, page: initialPage } = block;
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a Unity Catalog volume path
  const isUCVolume = url.startsWith('/Volumes/') || url.includes('/Volumes/');

  // For Unity Catalog volumes, use proxy endpoint
  let pdfUrl = url;
  if (isUCVolume) {
    const encodedPath = encodeURIComponent(url);
    pdfUrl = `/api/explore/files/proxy?path=${encodedPath}`;
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => Math.max(1, Math.min(prevPageNumber + offset, numPages)));
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.96)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-soft)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <div>
            <div
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </div>
            {numPages > 0 && (
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Page {pageNumber} of {numPages}
              </div>
            )}
          </div>
        </div>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors"
          style={{
            borderColor: "rgba(71, 85, 105, 0.8)",
            color: "var(--color-text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.8)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          <ExternalLink className="h-3 w-3" />
          Open in New Tab
        </a>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex flex-col items-center p-4">
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 mt-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading PDF...</span>
          </div>
        )}

        {error && (
          <div className="text-red-400 mt-8 text-center">
            <p>{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Try opening in a new tab using the button above
            </p>
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>

      {/* Page Navigation */}
      {numPages > 1 && !error && (
        <div
          className="flex items-center justify-center gap-4 px-4 py-3 border-t"
          style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}
        >
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: "rgba(71, 85, 105, 0.8)",
              color: "var(--color-text-secondary)",
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Page {pageNumber} / {numPages}
          </span>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: "rgba(71, 85, 105, 0.8)",
              color: "var(--color-text-secondary)",
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
