import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/documents");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 mb-4">DocQA</h1>

      <p className="text-base sm:text-lg text-zinc-400 mb-8 max-w-md">
        Upload PDF documents and ask AI questions about them. Powered by
        semantic search and large language models.
      </p>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href="/demo"
          className="w-full px-6 py-3 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-white transition-colors"
        >
          Try the live demo
        </Link>

        <Link
          href="/login"
          className="w-full px-6 py-3 bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          Sign in
        </Link>
        
        <p className="text-xs text-zinc-600 mt-1">
          Sign in to upload your own documents
        </p>
      </div>
    </main>
  );
}
