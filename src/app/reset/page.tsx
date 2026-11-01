import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { peekEmailToken } from "@/lib/auth";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "Reset password" };

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && (await peekEmailToken(token, "reset"));
  return (
    <AuthShell title="Pick a new password">
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-sm text-stone-600">
          That link already got flushed (expired or used).{" "}
          <Link href="/forgot" className="font-semibold text-stone-900 underline">Get a new one</Link>.
        </p>
      )}
    </AuthShell>
  );
}

export const instant = false;
