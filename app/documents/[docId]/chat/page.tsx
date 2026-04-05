import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChatWindow } from "@/components/ChatWindow";
import Link from "next/link";

interface Props {
  params: Promise<{ docId: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { docId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const document = await prisma.document.findFirst({
    where: { id: docId, userId: session.user.id, status: "READY" },
  });
  if (!document) notFound();

  return (
    <div className="flex flex-col h-screen bg-zinc-850">
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link
          href="/documents"
          className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm"
        >
          ← Back
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold text-zinc-100 truncate">
            {document.title}
          </h1>
        </div>
      </header>
      <ChatWindow documentId={docId} />
    </div>
  );
}
