import { prisma } from "@/lib/prisma";
import { DocumentCard } from "@/components/DocumentCard";
import { UploadDropzone } from "@/components/UploadDropzone";
import Link from "next/link";

const DEMO_USER_ID = process.env.DEMO_USER_ID;
const DEMO_DOCUMENT_ID = process.env.DEMO_DOCUMENT_ID;

export default async function DemoPage() {
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

  const documents = await prisma.document.findMany({
    where: { userId: DEMO_USER_ID, id: DEMO_DOCUMENT_ID },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="min-h-screen bg-zinc-900">
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-semibold text-zinc-100">DocQA</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-zinc-400">Demo mode</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-1">
            Your Documents
          </h2>
          <p className="text-zinc-500 text-sm">
            Explore the demo document below - sign in to upload your own.
          </p>
        </div>

        <UploadDropzone disabled />

        {documents.length === 0 ? (
          <div className="mt-8 text-center py-16 text-zinc-600">
            Demo document not found.
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                demoMode
                chatHref="/demo/chat"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
