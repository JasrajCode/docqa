import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";
import Link from "next/link";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/documents");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <span className="mb-6 text-2xl font-bold text-zinc-100 select-none">
        DocQA
      </span>
      <div className="w-full max-w-sm bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Sign in</h1>
        <p className="text-zinc-500 text-sm mb-6">
          Choose how you&apos;d like to sign in
        </p>
        <LoginButton />
      </div>
      <Link
        href="/"
        className="mt-6 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        ← Back to home
      </Link>
    </main>
  );
}
