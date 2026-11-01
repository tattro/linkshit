"use client";

import { useRouter } from "next/navigation";

/** "Hide this" on the Get started checklist. Remembered per browser for a year. */
export function SetupHide() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = "setup_hidden=1; path=/dashboard; max-age=31536000; samesite=lax";
        router.refresh();
      }}
      className="text-xs text-stone-500 underline"
    >
      Hide this
    </button>
  );
}
