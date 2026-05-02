"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatWindowProps {
  documentId?: string;
  apiPath?: string;
  demoMode?: boolean;
  maxQuestions?: number;
  examplePrompts?: string[];
}

interface Source {
  index: number;
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

const DEMO_COUNT_KEY = "docqa.demoQuestionCount";

export function ChatWindow({
  documentId,
  apiPath = "/api/chat",
  demoMode = false,
  maxQuestions,
  examplePrompts = [],
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  // Lazy-initialize from localStorage
  const [questionsAsked, setQuestionsAsked] = useState<number>(() => {
    if (typeof window === "undefined" || !demoMode) return 0;
    const stored = Number(localStorage.getItem(DEMO_COUNT_KEY) ?? "0");
    return Number.isFinite(stored) ? stored : 0;
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: apiPath,
      body: documentId ? { documentId } : {},
    }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const limitReached =
    demoMode && maxQuestions !== undefined && questionsAsked >= maxQuestions;

  function send(text: string) {
    if (!text.trim() || status !== "ready" || limitReached) return;
    sendMessage({ text });
    setInput("");
    if (demoMode) {
      const next = questionsAsked + 1;
      setQuestionsAsked(next);
      localStorage.setItem(DEMO_COUNT_KEY, String(next));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="mt-12 sm:mt-16 text-center">
            <p className="text-zinc-600 text-sm mb-6">
              Ask a question about this document.
            </p>
            {examplePrompts.length > 0 && !limitReached && (
              <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    disabled={status !== "ready"}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-zinc-300 transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
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

      {/* Limit-reached banner */}
      {limitReached && (
        <div className="border-t border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <p className="text-sm text-zinc-400 text-center sm:text-left">
            You&apos;ve used all {maxQuestions} demo questions. Sign in to upload your own documents and keep chatting.
          </p>
          <Link
            href="/login"
            className="shrink-0 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-medium hover:bg-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Input */}
      {!limitReached && (
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4 flex flex-col gap-2"
        >
          <div className="flex gap-2 sm:gap-3">
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
          </div>
          {demoMode && maxQuestions !== undefined && (
            <p
              className="text-xs text-zinc-500 text-center"
              suppressHydrationWarning
            >
              Demo mode · {Math.max(0, maxQuestions - questionsAsked)} of {maxQuestions} questions left
            </p>
          )}
        </form>
      )}
    </div>
  );
}
