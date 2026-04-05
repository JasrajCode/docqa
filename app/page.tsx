import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/documents");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-4xl font-bold text-zinc-100 mb-4">DocQA</h1>
      <p className="text-lg text-zinc-400 mb-8 max-w-md">
        Upload PDF documents and ask AI questions about them. Powered by
        semantic search and large language models.
      </p>
      <Link
        href="/login"
        className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-white transition-colors"
      >
        Sign in with GitHub
      </Link>
    </main>
  );
}
