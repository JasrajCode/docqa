import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/documents");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Sign in</h1>
        <p className="text-zinc-500 text-sm mb-6">
          Use your GitHub account to access DocQA
        </p>
        <LoginButton />
      </div>
    </main>
  );
}
