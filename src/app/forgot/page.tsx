import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Ahh, sh.it.">
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-stone-500">
        Remembered it? <Link href="/login" className="font-semibold text-stone-900 underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
