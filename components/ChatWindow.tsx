"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatWindowProps {
  documentId: string;
}

interface Source {
  index: number;
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export function ChatWindow({ documentId }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { documentId },
    }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-zinc-600 text-sm mt-16">
            Ask a question about this document.
          </p>
        )}
        {messages.map((msg) => {
          const text = msg.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const sources =
            msg.role === "assistant"
              ? ((msg.metadata as { sources?: Source[] } | undefined)?.sources ??
                [])
              : [];

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-zinc-100 text-zinc-900 rounded-br-sm whitespace-pre-wrap"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-sm"
                  }
                `}
              >
                {msg.role === "user" ? (
                  text
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-zinc-950 prose-code:text-zinc-200 prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {text}
                    </ReactMarkdown>
                  </div>
                )}

                {sources.length > 0 && (
                  <details className="mt-3 pt-3 border-t border-zinc-700 text-xs">
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 select-none">
                      {sources.length} source{sources.length === 1 ? "" : "s"} used
                    </summary>
                    <div className="mt-2 space-y-2">
                      {sources.map((s) => (
                        <div
                          key={s.index}
                          className="bg-zinc-900 border border-zinc-700 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-zinc-300">
                              Source {s.index}
                            </span>
                            <span className="text-zinc-500 text-[11px]">
                              {(s.similarity * 100).toFixed(0)}% match · chunk #
                              {s.chunkIndex}
                            </span>
                          </div>
                          <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed line-clamp-6">
                            {s.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
        {status === "streaming" && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="text-zinc-500 text-sm animate-pulse">
                Thinking…
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4 flex gap-2 sm:gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Ask a question about this document…"
          className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status !== "ready" || !input.trim()}
          className="px-4 py-2.5 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-medium hover:bg-white transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
