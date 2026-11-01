import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { verify } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Welcome back">
      {verify === "expired" && (
        <p className="mb-4 rounded-xl bg-amber-100 p-3 text-sm">
          That confirmation link has expired or was already used. Log in and hit &ldquo;Resend link&rdquo; for a fresh one.
        </p>
      )}
      <LoginForm />
      <p className="mt-6 text-center text-sm text-stone-500">
        New here? <Link href="/signup" className="font-semibold text-stone-900 underline">Claim a handle</Link>
      </p>
    </AuthShell>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
