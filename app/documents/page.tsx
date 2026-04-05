import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DocumentCard } from "@/components/DocumentCard";
import { UploadDropzone } from "@/components/UploadDropzone";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="min-h-screen bg-zinc-900">
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">DocQA</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-100 mb-1">
            Your Documents
          </h2>
          <p className="text-zinc-500 text-sm">
            Upload a PDF to start asking questions about it.
          </p>
        </div>

        <UploadDropzone />

        {documents.length === 0 ? (
          <div className="mt-8 text-center py-16 text-zinc-600">
            No documents yet. Upload a PDF to get started.
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
