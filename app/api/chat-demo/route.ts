import { NextRequest, NextResponse } from "next/server";
import {
  retrieveChunksForUser,
  getDocumentLeadChunks,
  mergeChunks,
} from "@/lib/retrieval";
import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

const DEMO_USER_ID = process.env.DEMO_USER_ID;
const DEMO_DOCUMENT_ID = process.env.DEMO_DOCUMENT_ID;

// Per-IP server-side limits (defense-in-depth; the client-side counter is UX).
const HOURLY_MAX = 10;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const DAILY_MAX = 30;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!DEMO_USER_ID || !DEMO_DOCUMENT_ID) {
    return NextResponse.json(
      { error: "Demo mode is not configured." },
      { status: 503 }
    );
  }

  const ip = getClientIp(req);
  const hourly = checkRateLimit(`demo:h:${ip}`, HOURLY_MAX, HOURLY_WINDOW_MS);
  if (!hourly.ok) {
    return NextResponse.json(
      {
        error:
          "You've hit the hourly demo limit. Sign in to keep chatting, or come back in an hour.",
      },
      { status: 429 }
    );
  }
  const daily = checkRateLimit(`demo:d:${ip}`, DAILY_MAX, DAILY_WINDOW_MS);
  if (!daily.ok) {
    return NextResponse.json(
      {
        error:
          "Daily demo limit reached. Sign in to upload your own documents.",
      },
      { status: 429 }
    );
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const lastUserMessage = messages.findLast(
    (m: { role: string }) => m.role === "user"
  );
  const query =
    typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : lastUserMessage?.parts?.find((p: { type: string }) => p.type === "text")
          ?.text ?? "";

  const [leadChunks, semanticChunks] = await Promise.all([
    getDocumentLeadChunks(DEMO_DOCUMENT_ID, DEMO_USER_ID, 3),
    retrieveChunksForUser(query, DEMO_USER_ID, {
      documentId: DEMO_DOCUMENT_ID,
      topK: 8,
    }),
  ]);
  const chunks = mergeChunks(leadChunks, semanticChunks);

  const context =
    chunks.length > 0
      ? chunks
          .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
          .join("\n\n---\n\n")
      : "No relevant content found in the demo document.";

  const systemPrompt = `You are a helpful assistant that answers questions based on the demo document the user is exploring.

Use the document excerpts below as your primary source. If the excerpts don't directly answer the question, you may make reasonable inferences based on related context - but clearly flag these with phrases like "based on the document's framing, I'd infer…" or "the excerpts don't say directly, but they suggest…". Never invent specific facts, numbers, or quotes that aren't supported.

At the end of your answer, cite which sources you used (e.g. "Based on Source 1 and Source 3").

Document excerpts:
${context}`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  const sources = chunks.map((c, i) => ({
    index: i + 1,
    documentId: c.documentId,
    chunkIndex: c.chunkIndex,
    content: c.content,
    similarity: c.similarity,
  }));

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return { sources };
      }
    },
  });
}
