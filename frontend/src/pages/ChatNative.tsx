/**
 * Native React Chat Component (Chainlit Replacement)
 *
 * Directly calls MAS endpoint with streaming support.
 * No Chainlit, no mounting issues, no iframe.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Database } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  status: "running" | "complete" | "error";
  output?: string;
}

export function ChatNative() {
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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

    try {
      // Call MAS endpoint with streaming
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: input },
          ],
        }),
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
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `❌ Failed to get response: ${error instanceof Error ? error.message : "Unknown error"}`,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#FDFAF5]">
      {/* Header */}
      <div className="border-b border-[#F8F3E9] bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-medium tracking-tight text-[#523416]">
              <Sparkles className="h-5 w-5 text-[#2F7FD9]" />
              Analytics Assistant
            </h1>
            <p className="text-sm font-light text-[#B59D81]">
              Powered by Databricks Genie Spaces
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-[#B59D81]">
            <span
              className={`h-2 w-2 rounded-full ${
                isStreaming ? "animate-pulse bg-[#2F7FD9]" : "bg-green-500"
              }`}
            />
            <span className="font-light">
              {isStreaming ? "Thinking..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-[#2F7FD9] text-white"
                  : "bg-white border border-[#F8F3E9] text-[#523416]"
              }`}
            >
              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-[#B59D81]"
                    >
                      {tool.status === "running" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Database className="h-3 w-3" />
                      )}
                      <span className="font-medium">
                        {tool.name === "execute_genie_query"
                          ? "Querying Genie Space"
                          : tool.name}
                      </span>
                      {tool.status === "complete" && (
                        <span className="text-green-600">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message content */}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(message.content),
                }}
              />

              {/* Timestamp */}
              <div className="mt-2 text-xs opacity-60">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#F8F3E9] bg-white px-6 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your analytics data..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-[#F8F3E9] bg-[#FDFAF5] px-4 py-3 text-[#523416] placeholder-[#B59D81] focus:border-[#2F7FD9] focus:outline-none focus:ring-2 focus:ring-[#2F7FD9] focus:ring-opacity-20 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex items-center gap-2 rounded-lg bg-[#2F7FD9] px-6 py-3 font-medium text-white transition-all hover:bg-[#2567B8] disabled:opacity-50 disabled:cursor-not-allowed"
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

// Simple markdown formatter (you can use a library like marked or react-markdown instead)
function formatMarkdown(text: string): string {
  return text
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
}
