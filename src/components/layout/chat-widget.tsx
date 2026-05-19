"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  fallback?: boolean;
}

const SESSION_ID_KEY = "regimind:chat-session-id";

function getSessionId(): string {
  if (typeof window === "undefined") return "session-" + Date.now();
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = "session-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

function formatMarkdown(text: string): string {
  // Simple markdown-to-html conversion
  let html = text
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/(?<!\*)\*([^*]+)\)(?!\*)/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">$1</code>')
    // Line breaks → <br> but handle list items
    .replace(/\n• /g, '\n• ')
    .replace(/\n(\d+)\. /g, '\n$1. ');
  return html;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5 msg-bubble-enter", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5",
          isUser
            ? "bg-primary/15 text-primary"
            : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
        )}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0 max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/80 text-foreground rounded-tl-sm border border-border/50"
        )}
      >
        {message.fallback && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              Fallback Response
            </Badge>
          </div>
        )}
        <div
          className="whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
        />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <Bot className="size-3.5" />
      </div>
      <div className="bg-muted/80 rounded-xl rounded-tl-sm border border-border/50 px-4 py-3">
        <div className="typing-dot-wave">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  "What are ISO 13485 key requirements?",
  "How should I manage compliance gaps?",
  "Explain EU MDR changes",
  "Help with risk management",
];

interface ChatWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComplianceChatWidget({ open, onOpenChange }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [useSocket, setUseSocket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const sessionIdRef = useRef<string>("");

  // Initialize session ID
  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Try to connect to Socket.IO mini-service
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function connectSocket() {
      try {
        const { io } = await import("socket.io-client");
        const socket = io("/api/chat", {
          path: "/socket.io",
          transports: ["polling", "websocket"],
          query: { XTransformPort: "3003" },
          auth: { sessionId: sessionIdRef.current },
        });

        socket.on("connect", () => {
          if (mounted) {
            setSocketConnected(true);
            setUseSocket(true);
          }
        });

        socket.on("history", (history: ChatMessage[]) => {
          if (mounted && history.length > 0) {
            setMessages(history);
          }
        });

        socket.on("message", (msg: ChatMessage) => {
          if (mounted) {
            setMessages((prev) => [...prev, msg]);
            setIsTyping(false);
          }
        });

        socket.on("cleared", () => {
          if (mounted) {
            setMessages([]);
          }
        });

        socket.on("disconnect", () => {
          if (mounted) {
            setSocketConnected(false);
          }
        });

        socket.on("connect_error", () => {
          if (mounted) {
            setSocketConnected(false);
            setUseSocket(false);
            socket.disconnect();
          }
        });

        socketRef.current = socket as never;
      } catch {
        // Socket.IO not available, fall back to HTTP API
        if (mounted) {
          setUseSocket(false);
        }
      }
    }

    connectSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMessage: ChatMessage = {
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      if (useSocket && socketRef.current) {
        // Use Socket.IO
        (socketRef.current as unknown as { emit: (event: string, data: unknown) => void }).emit("message", {
          message: text.trim(),
          sessionId: sessionIdRef.current,
        });
      } else {
        // Fall back to HTTP API
        try {
          const res = await fetch("/api/chat/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text.trim(),
              sessionId: sessionIdRef.current,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setMessages((prev) => [...prev, data]);
          } else {
            throw new Error("API error");
          }
        } catch (err) {
          console.error("Chat message error:", err);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I'm having trouble connecting. Please check your network connection and try again.",
              timestamp: Date.now(),
              fallback: true,
            },
          ]);
        } finally {
          setIsTyping(false);
        }
      }
    },
    [isTyping, useSocket]
  );

  const handleClear = useCallback(() => {
    if (useSocket && socketRef.current) {
      (socketRef.current as unknown as { emit: (event: string, data: unknown) => void }).emit("clear", {
        sessionId: sessionIdRef.current,
      });
    }
    setMessages([]);
  }, [useSocket]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          className={cn(
            "fixed bottom-20 right-5 z-50",
            "flex items-center justify-center",
            "size-12 rounded-full shadow-lg",
            "bg-gradient-to-br from-primary to-primary/80",
            "text-primary-foreground",
            "hover:shadow-xl hover:scale-105",
            "active:scale-95",
            "transition-all duration-200",
            "group"
          )}
          title="Compliance Chat Assistant"
        >
          <MessageSquare className="size-5 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 border-2 border-background">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
          </span>
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div
          className={cn(
            "fixed z-50 border rounded-2xl chat-drawer-glass",
            "flex flex-col overflow-hidden",
            "transition-all duration-300 ease-out",
            isExpanded
              ? "inset-4 sm:inset-6 lg:inset-8"
              : "bottom-4 right-4 sm:right-5 w-[calc(100%-2rem)] sm:w-[380px] h-[520px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/25">
                <Bot className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  Compliance Assistant
                  <Sparkles className="size-3 text-primary" />
                </h3>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "size-1.5 rounded-full",
                      useSocket && socketConnected ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {useSocket && socketConnected ? "Connected" : "API Mode"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleClear}
                title="Clear chat"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onOpenChange(false)}
                title="Close"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                  <Sparkles className="size-6 text-primary" />
                </div>
                <div className="text-center space-y-2 max-w-[280px]">
                  <p className="text-sm font-medium">Compliance Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    Ask questions about regulations, risk management, compliance gaps, and more.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full max-w-[280px]">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-primary/20 transition-colors truncate"
                    >
                      <MessageSquare className="size-3 inline mr-1.5 text-muted-foreground" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={msg.timestamp + "-" + i} message={msg} />
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="px-3 py-3 border-t shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about compliance..."
                disabled={isTyping}
                className="h-9 text-sm flex-1"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="size-9 shrink-0"
              >
                {isTyping ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
