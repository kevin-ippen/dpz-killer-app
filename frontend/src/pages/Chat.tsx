/**
 * Chat Page - Native React implementation with MAS streaming
 *
 * Connects to /api/chat/stream endpoint and displays streaming responses
 * from the Multi-Agent Supervisor (MAS) with Genie Spaces integration.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Database, CheckCircle2, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  status: "running" | "complete" | "error";
  args?: Record<string, any>;
  output?: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `# Welcome to Domino's Analytics Assistant! 🍕

I can help you analyze your business data across:
- 📊 **Executive & Finance** - CAC, ARPU, GMV, retention
- 📢 **Marketing Performance** - Campaign ROI, channel efficiency
- 👥 **Customer Analytics** - LTV, segmentation, churn
- 🏪 **Operations** - Store performance, delivery times
- 💰 **Sales** - Revenue trends, product mix

**Try asking:**
- "What's our total revenue this month?"
- "Show me CAC by marketing channel"
- "Which customer segment has highest ARPU?"`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build message history
      const messageHistory = messages
        .filter((m) => m.role !== "assistant" || m.content) // Skip empty assistant messages
        .map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: null,
        }));

      // Add current user message
      messageHistory.push({
        role: "user",
        content: input.trim(),
        timestamp: null,
      });

      // Call streaming endpoint
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMessageId) return msg;

                switch (event.type) {
                  case "text.delta":
                    return { ...msg, content: msg.content + event.delta };

                  case "tool.call":
                    return {
                      ...msg,
                      toolCalls: [
                        ...(msg.toolCalls || []),
                        {
                          name: event.name,
                          status: "running",
                          args: event.args,
                        },
                      ],
                    };

                  case "tool.output":
                    return {
                      ...msg,
                      toolCalls: msg.toolCalls?.map((tool) =>
                        tool.name === event.name
                          ? { ...tool, status: "complete", output: event.output }
                          : tool
                      ),
                    };

                  case "error":
                    return {
                      ...msg,
                      content: msg.content + `\n\n❌ Error: ${event.message}`,
                      toolCalls: msg.toolCalls?.map((tool) =>
                        tool.status === "running" ? { ...tool, status: "error" } : tool
                      ),
                    };

                  default:
                    return msg;
                }
              })
            );
          } catch (e) {
            console.error("Failed to parse SSE event:", e);
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.error("Chat error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `❌ Failed to get response: ${error.message}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--color-bg-app)' }}>
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'var(--color-border-subtle)', background: 'rgba(15, 23, 42, 0.8)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              <Sparkles className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
              🍕 Domino's Analytics Assistant
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Powered by Databricks Genie Spaces
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span
              className={`h-2 w-2 rounded-full ${
                isStreaming ? "animate-pulse" : ""
              }`}
              style={{ background: isStreaming ? 'var(--color-accent)' : 'var(--color-success)' }}
            />
            <span className="font-medium">
              {isStreaming ? "Thinking..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-3xl px-5 py-4 ${
                message.role === "user"
                  ? ""
                  : ""
              }`}
              style={
                message.role === "user"
                  ? {
                      background: 'var(--color-accent)',
                      color: 'white',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-soft)',
                    }
                  : {
                      background: 'rgba(15, 23, 42, 0.96)',
                      border: '1px solid rgba(30, 41, 59, 0.8)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-soft)',
                      color: 'var(--color-text-primary)',
                    }
              }
            >
              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium"
                      style={{
                        background: 'var(--color-accent-soft)',
                        border: '1px solid var(--color-accent-border)',
                        borderRadius: 'var(--radius-pill)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {tool.status === "running" && (
                        <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
                      )}
                      {tool.status === "complete" && (
                        <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--color-success)' }} />
                      )}
                      {tool.status === "error" && (
                        <AlertCircle className="h-3 w-3" style={{ color: 'var(--color-danger)' }} />
                      )}
                      <Database className="h-3 w-3" style={{ color: 'var(--color-text-secondary)' }} />
                      <span>
                        {tool.name === "execute_genie_query"
                          ? "Querying Genie Space"
                          : tool.name}
                      </span>
                      {tool.status === "complete" && (
                        <span className="ml-auto" style={{ color: 'var(--color-success)' }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message content */}
              <div className="prose prose-sm max-w-none">
                {formatMarkdown(message.content)}
              </div>

              {/* Timestamp */}
              <div
                className="mt-2 text-xs"
                style={{
                  color: message.role === "user" ? "rgba(255, 255, 255, 0.7)" : "var(--color-text-muted)",
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4" style={{ borderColor: 'var(--color-border-subtle)', background: 'rgba(15, 23, 42, 0.8)' }}>
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your analytics data..."
            disabled={isStreaming}
            className="flex-1 px-4 py-3 outline-none transition-all disabled:opacity-50"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-accent)';
              e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border-subtle)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex items-center gap-2 px-6 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-accent)',
              color: 'white',
              borderRadius: 'var(--radius-pill)',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = 'var(--color-accent-strong)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-accent)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple markdown formatter
function formatMarkdown(text: string): JSX.Element {
  if (!text) return <></>;

  const lines = text.split("\n");
  const elements: JSX.Element[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check for markdown tables (lines starting with |)
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      let j = i;

      // Collect all consecutive table lines
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }

      // Parse and render table
      if (tableLines.length >= 2) {
        elements.push(renderTable(tableLines, i));
        i = j;
        continue;
      }
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {line.slice(4)}
        </h3>
      );
    }
    // Bullet points
    else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4" style={{ color: 'var(--color-text-primary)' }}>
          {formatInline(line.slice(2))}
        </li>
      );
    }
    // Empty lines
    else if (!line.trim()) {
      elements.push(<br key={i} />);
    }
    // Regular text
    else {
      elements.push(
        <p key={i} style={{ color: 'var(--color-text-primary)' }}>
          {formatInline(line)}
        </p>
      );
    }

    i++;
  }

  return <>{elements}</>;
}

// Render markdown table
function renderTable(tableLines: string[], key: number): JSX.Element {
  // Parse table rows
  const rows = tableLines.map((line) =>
    line
      .trim()
      .split("|")
      .slice(1, -1) // Remove empty first and last elements
      .map((cell) => cell.trim())
  );

  if (rows.length < 2) return <></>;

  const headers = rows[0];
  const dataRows = rows.slice(2); // Skip header and separator row

  return (
    <div
      key={key}
      className="overflow-x-auto my-4"
      style={{
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <table className="min-w-full border-collapse">
        <thead style={{ background: 'var(--color-accent)', color: 'white' }}>
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left font-semibold"
                style={{
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                background: rowIdx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'rgba(30, 41, 59, 0.4)',
              }}
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-4 py-2"
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                    borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Format inline markdown (bold, italic)
function formatInline(text: string): JSX.Element {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const before = remaining.slice(0, boldMatch.index);
      if (before) parts.push(before);
      parts.push(
        <strong key={key++} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice((boldMatch.index || 0) + boldMatch[0].length);
      continue;
    }

    // Italic *text*
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch) {
      const before = remaining.slice(0, italicMatch.index);
      if (before) parts.push(before);
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice((italicMatch.index || 0) + italicMatch[0].length);
      continue;
    }

    // No more formatting
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
}
