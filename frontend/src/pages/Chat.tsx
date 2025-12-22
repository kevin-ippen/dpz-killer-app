/**
 * Chat Page - Two-Panel Layout with MAS streaming
 *
 * Left panel: Conversation with compact previews
 * Right panel: Full-size charts, tables, and images (ResultCanvas)
 *
 * Connects to /api/chat/stream endpoint and displays streaming responses
 * from the Multi-Agent Supervisor (MAS) with Genie Spaces integration.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { ChatMessage, ActiveBlockRef, TextBlock } from "@/types/chat";
import { ResultCanvas } from "@/components/chat/ResultCanvas";
import { ChartPreview, TablePreview, ImagePreview } from "@/components/chat/BlockPreviews";
import { CitationPreview } from "@/components/chat/CitationPreview";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { parseMessageBlocks } from "@/utils/parseMessageBlocks";
import { fileApi } from "@/api/client";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
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
      blocks: [
        {
          id: "welcome-text",
          type: "text",
          markdown: `# Welcome to Domino's Analytics Assistant! 🍕

I can help you analyze your business data across:
- 📊 **Executive & Finance** - CAC, ARPU, GMV, retention
- 📢 **Marketing Performance** - Campaign ROI, channel efficiency
- 👥 **Customer Analytics** - LTV, segmentation, churn
- 🏪 **Operations** - Store performance, delivery times
- 💰 **Sales** - Revenue trends, product mix

**Try clicking the visualizations below to see them in the right panel!**`,
        },
        {
          id: "welcome-chart",
          type: "chart",
          title: "Monthly Revenue Trend",
          subtitle: "Last 6 months",
          specType: "recharts",
          spec: {
            type: "bar",
            data: [
              { month: "Jan", revenue: 45000 },
              { month: "Feb", revenue: 52000 },
              { month: "Mar", revenue: 48000 },
              { month: "Apr", revenue: 61000 },
              { month: "May", revenue: 58000 },
              { month: "Jun", revenue: 67000 },
            ],
            xKey: "month",
            yKey: "revenue",
            dataKey: "revenue",
          },
          meta: {
            primaryMeasure: "revenue",
            primaryDim: "month",
            timeframe: "Last 6 months",
          },
        },
        {
          id: "welcome-table",
          type: "table",
          columns: ["Channel", "CAC", "ROI", "Conversions"],
          rows: [
            ["Social Media", "$42", "3.2x", "1,234"],
            ["Email", "$28", "4.8x", "2,156"],
            ["Paid Search", "$68", "2.1x", "892"],
            ["Organic", "$15", "6.5x", "3,421"],
            ["Referral", "$22", "5.2x", "1,678"],
          ],
          meta: {
            title: "Marketing Channel Performance",
            subtitle: "Current month metrics",
          },
        },
      ],
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeBlock, setActiveBlock] = useState<ActiveBlockRef | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      blocks: [
        {
          id: `${Date.now()}-text`,
          type: "text",
          markdown: input.trim(),
        },
      ],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      blocks: [],
      toolCalls: [],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build message history (flatten for API)
      const messageHistory = messages
        .filter((m) => m.role !== "assistant" || m.content)
        .map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: null,
        }));

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
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();

          // Skip empty lines (SSE frame separators)
          if (!line) continue;

          // Only process data: lines
          if (!line.startsWith("data:")) continue;

          const jsonStr = line.slice(5).trim(); // Remove "data:" prefix
          if (jsonStr === "[DONE]") continue;

          let event;
          try {
            event = JSON.parse(jsonStr);
          } catch (e) {
            console.warn("[SSE] Failed to parse event:", jsonStr, e);
            continue;
          }

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== assistantMessageId) return msg;

              switch (event.type) {
                case "text.delta":
                  // Append text to content and update or create text block
                  const newContent = msg.content + event.delta;
                  const textBlockId = `${assistantMessageId}-text`;

                  let updatedBlocks = [...msg.blocks];
                  const textBlockIndex = updatedBlocks.findIndex(
                    (b) => b.type === "text" && b.id === textBlockId
                  );

                  if (textBlockIndex >= 0) {
                    // Update existing text block
                    updatedBlocks[textBlockIndex] = {
                      ...updatedBlocks[textBlockIndex],
                      markdown: newContent,
                    } as TextBlock;
                  } else {
                    // Create new text block
                    updatedBlocks.push({
                      id: textBlockId,
                      type: "text",
                      markdown: newContent,
                    });
                  }

                  return { ...msg, content: newContent, blocks: updatedBlocks };

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

                case "chart.reference":
                  // Genie chart reference received - create ChartBlock
                  const chartBlockId = `${assistantMessageId}-chart-${msg.blocks.filter(b => b.type === "chart").length}`;
                  return {
                    ...msg,
                    blocks: [
                      ...msg.blocks,
                      {
                        id: chartBlockId,
                        type: "chart",
                        title: event.title || "Query Result",
                        subtitle: event.subtitle || "Click to view",
                        specType: "recharts",
                        spec: null, // Will be hydrated on-demand
                        dataRef: {
                          type: "genie",
                          genie: event.genie,
                        },
                      },
                    ],
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
                  blocks: [
                    {
                      id: `${assistantMessageId}-error`,
                      type: "text",
                      markdown: `❌ Failed to get response: ${error.message}`,
                    },
                  ],
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;

      // Parse final content into blocks (extract tables, citations, etc.)
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          if (msg.id !== assistantMessageId) return msg;

          // Parse content into structured blocks and citations
          const { blocks, citations } = parseMessageBlocks(msg.content, assistantMessageId);

          // Prefetch PDF files from citations in the background
          if (citations.length > 0) {
            const filePaths = citations
              .filter(citation => citation.url && (citation.url.includes('.pdf') || citation.url.includes('/Volumes/')))
              .map(citation => citation.url);

            if (filePaths.length > 0) {
              console.log('[PREFETCH] Triggering background download for', filePaths.length, 'files');
              fileApi.prefetchFiles(filePaths)
                .then(result => console.log('[PREFETCH] Queued successfully:', result))
                .catch(err => console.warn('[PREFETCH] Failed to queue:', err));
            }
          }

          return {
            ...msg,
            blocks: blocks.length > 0 ? blocks : msg.blocks,
            citations: citations.length > 0 ? citations : msg.citations,
          };
        });

        return updatedMessages;
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen flex-col" style={{ background: "var(--color-bg-app)" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: "var(--color-border-subtle)", background: "rgba(15, 23, 42, 0.8)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="flex items-center gap-2 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              <Sparkles className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
              🍕 Domino's Analytics Assistant
            </h1>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Powered by Databricks Genie Spaces
            </p>
          </div>

          {/* Status indicator pill */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
            style={{
              border: "1px solid var(--color-border-subtle)",
              background: "rgba(15, 23, 42, 0.8)",
              borderRadius: "var(--radius-pill)",
              color: "var(--color-text-secondary)",
            }}
          >
            {isStreaming ? (
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--color-accent)" }} />
            ) : (
              <CheckCircle2 className="h-3 w-3" style={{ color: "var(--color-success)" }} />
            )}
            <span>{isStreaming ? "Thinking…" : "Ready"}</span>
          </span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div
        className="flex flex-1 min-h-0 border-t"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {/* LEFT PANEL: Chat messages */}
        <div
          className="flex flex-col border-r"
          style={{
            width: "min(50%, 48rem)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[42rem]"
                  style={
                    message.role === "user"
                      ? {
                          background: "var(--color-accent)",
                          color: "white",
                          borderRadius: "24px",
                          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                          padding: "0.75rem 1rem",
                        }
                      : {
                          background: "rgba(15, 23, 42, 0.96)",
                          border: "1px solid rgba(30, 41, 59, 0.9)",
                          borderRadius: "var(--radius-lg)",
                          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
                          color: "var(--color-text-primary)",
                          padding: "0.9rem 1rem",
                        }
                  }
                >
                  {/* Tool calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div
                      className="mb-2 pb-2 space-y-1.5"
                      style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.8)" }}
                    >
                      {message.toolCalls.map((tool, idx) => {
                        const isRunning = tool.status === "running";
                        const isComplete = tool.status === "complete";
                        const isError = tool.status === "error";

                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 font-medium"
                            style={{
                              fontSize: "10px",
                              borderRadius: "var(--radius-pill)",
                              border: isComplete
                                ? "1px solid rgba(34, 197, 94, 0.6)"
                                : isError
                                ? "1px solid rgba(239, 68, 68, 0.6)"
                                : "1px solid var(--color-border-subtle)",
                              background: isComplete
                                ? "rgba(34, 197, 94, 0.1)"
                                : isError
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(15, 23, 42, 0.8)",
                              color: isComplete
                                ? "rgb(134, 239, 172)"
                                : isError
                                ? "rgb(252, 165, 165)"
                                : "var(--color-text-secondary)",
                            }}
                          >
                            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                            {isComplete && <CheckCircle2 className="h-3 w-3" />}
                            {isError && <AlertCircle className="h-3 w-3" />}
                            <Database className="h-3 w-3 opacity-70" />
                            <span>
                              {tool.name === "execute_genie_query"
                                ? "Genie: querying space"
                                : tool.name}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Render blocks */}
                  {message.blocks.map((block) => {
                    if (block.type === "text") {
                      return (
                        <div key={block.id} className="prose prose-sm max-w-none">
                          <MarkdownRenderer>{block.markdown}</MarkdownRenderer>
                        </div>
                      );
                    }

                    if (block.type === "chart") {
                      return (
                        <ChartPreview
                          key={block.id}
                          block={block}
                          isActive={
                            activeBlock?.blockId === block.id &&
                            activeBlock?.messageId === message.id
                          }
                          onClick={() => setActiveBlock({ messageId: message.id, blockId: block.id })}
                        />
                      );
                    }

                    if (block.type === "table") {
                      return (
                        <TablePreview
                          key={block.id}
                          block={block}
                          isActive={
                            activeBlock?.blockId === block.id &&
                            activeBlock?.messageId === message.id
                          }
                          onClick={() => setActiveBlock({ messageId: message.id, blockId: block.id })}
                        />
                      );
                    }

                    if (block.type === "image") {
                      return (
                        <ImagePreview
                          key={block.id}
                          block={block}
                          isActive={
                            activeBlock?.blockId === block.id &&
                            activeBlock?.messageId === message.id
                          }
                          onClick={() => setActiveBlock({ messageId: message.id, blockId: block.id })}
                        />
                      );
                    }

                    return null;
                  })}

                  {/* Citations (footnotes) */}
                  {message.citations && message.citations.length > 0 && (
                    <div
                      className="mt-3 pt-3 space-y-1"
                      style={{ borderTop: "1px solid rgba(30, 41, 59, 0.8)" }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Sources
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {message.citations.map((citation) => (
                          <CitationPreview
                            key={citation.id}
                            citation={citation}
                            onClick={() =>
                              setActiveBlock({ messageId: message.id, blockId: citation.id })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className="mt-2 text-xs"
                    style={{
                      color:
                        message.role === "user"
                          ? "rgba(255, 255, 255, 0.7)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="border-t px-6 py-4"
            style={{
              borderColor: "var(--color-border-subtle)",
              background: "rgba(15, 23, 42, 0.8)",
            }}
          >
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
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-pill)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-accent)";
                  e.target.style.boxShadow = "0 0 0 3px var(--color-accent-soft)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--color-border-subtle)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="flex items-center gap-2 px-6 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                  borderRadius: "var(--radius-pill)",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = "var(--color-accent-strong)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-accent)";
                  e.currentTarget.style.transform = "translateY(0)";
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

        {/* RIGHT PANEL: Result Canvas */}
        <div className="flex-1 min-w-0">
          <ResultCanvas
            messages={messages}
            activeBlock={activeBlock}
            onBlockChange={setActiveBlock}
          />
        </div>
      </div>
    </div>
  );
}
