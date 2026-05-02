import { prisma } from "@/lib/prisma";
import { ChatWindow } from "@/components/ChatWindow";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = process.env.DEMO_USER_ID;
const DEMO_DOCUMENT_ID = process.env.DEMO_DOCUMENT_ID;
const DEMO_QUESTION_LIMIT = 10;

const EXAMPLE_PROMPTS = [
  "Summarize this paper in plain English",
  "What problem does this solve?",
  "How does the retrieval mechanism work?",
  "What datasets were used?",
];

export default async function DemoChatPage() {
  if (!DEMO_USER_ID || !DEMO_DOCUMENT_ID) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Demo unavailable</h1>
        <p className="text-zinc-500 mb-6">The demo isn&apos;t configured right now.</p>
        <Link
          href="/login"
          className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-medium hover:bg-white transition-colors"
        >
          Sign in instead
        </Link>
      </main>
    );
  }

  const document = await prisma.document.findFirst({
    where: { id: DEMO_DOCUMENT_ID, userId: DEMO_USER_ID, status: "READY" },
    select: { id: true, title: true },
  });

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
        <Link
          href="/demo"
          className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm shrink-0"
        >
          ← Back
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-zinc-100 truncate text-sm sm:text-base">
            {document?.title ?? "Demo document"}
          </h1>
          <p className="text-xs text-zinc-500">Demo mode</p>
        </div>
        <Link
          href="/login"
          className="shrink-0 px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Sign in
        </Link>
      </header>
      <ChatWindow
        apiPath="/api/chat-demo"
        demoMode
        maxQuestions={DEMO_QUESTION_LIMIT}
        examplePrompts={EXAMPLE_PROMPTS}
      />
    </div>
  );
}
