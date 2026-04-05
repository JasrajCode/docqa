import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { retrieveChunksForUser } from "@/lib/retrieval";
import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, documentId } = await req.json();
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

  // Retrieve relevant chunks
  const chunks = await retrieveChunksForUser(query, session.user.id, {
    documentId,
    topK: 5,
  });

  const context =
    chunks.length > 0
      ? chunks
          .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
          .join("\n\n---\n\n")
      : "No relevant content found in your documents.";

  const systemPrompt = `You are a helpful assistant that answers questions based on the user's uploaded documents.

Use ONLY the information in the document excerpts below to answer. If the answer is not in the excerpts, say so clearly — do not make up information.

At the end of your answer, cite which sources you used (e.g. "Based on Source 1 and Source 3").

Document excerpts:
${context}`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
