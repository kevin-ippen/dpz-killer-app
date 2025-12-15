import { useState } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { generateId } from "@/lib/utils";
import { chatApi } from "@/api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call the real API with LLM endpoint
      const response = await chatApi.query(content, conversationId);

      // Update conversation ID if we got one back
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);

      // Show error message to user
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatContainer
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
