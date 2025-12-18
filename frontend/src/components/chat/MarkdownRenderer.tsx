import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  children: string;
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div
      className="prose prose-invert prose-sm max-w-none"
      style={{
        color: "var(--color-text-primary)",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style headers
          h1: ({ node, ...props }) => (
            <h1 style={{ color: "var(--color-text-primary)", marginBottom: "0.5em" }} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 style={{ color: "var(--color-text-primary)", marginBottom: "0.5em" }} {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 style={{ color: "var(--color-text-primary)", marginBottom: "0.5em" }} {...props} />
          ),
          // Style code blocks
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  style={{
                    background: "rgba(0, 100, 145, 0.15)",
                    color: "var(--color-accent)",
                    padding: "0.1em 0.3em",
                    borderRadius: "3px",
                    fontSize: "0.9em",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <pre
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(30, 41, 59, 0.8)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1em",
                  overflow: "auto",
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Style links
          a: ({ node, ...props }) => (
            <a
              style={{
                color: "var(--color-accent)",
                textDecoration: "underline",
              }}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Style lists
          ul: ({ node, ...props }) => (
            <ul style={{ color: "var(--color-text-primary)" }} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol style={{ color: "var(--color-text-primary)" }} {...props} />
          ),
          // Style paragraphs
          p: ({ node, ...props }) => (
            <p style={{ color: "var(--color-text-primary)", marginBottom: "0.75em" }} {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
