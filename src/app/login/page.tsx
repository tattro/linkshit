import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Welcome back">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-stone-500">
        New here? <Link href="/signup" className="font-semibold text-stone-900 underline">Claim a handle</Link>
      </p>
    </AuthShell>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
