import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { handle } = await searchParams;
  return (
    <AuthShell title="Claim your spot">
      <SignupForm handle={typeof handle === "string" ? handle.toLowerCase() : ""} />
      <p className="mt-6 text-center text-sm text-stone-500">
        Already have one? <Link href="/login" className="font-semibold text-stone-900 underline">Log in</Link>
      </p>
    </AuthShell>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
