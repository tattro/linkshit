import Link from "next/link";

export const CONTACT_EMAIL = "hello@linksh.it";

export function SiteFooter({ creator = false }: { creator?: boolean }) {
  return (
    <footer className="bg-stone-100 px-6 py-10 text-center text-sm text-stone-500">
      {creator && (
        <p className="mb-6">
          Follow the degenerate who created this platform:{" "}
          <Link href="/trevor" className="font-bold text-stone-900 underline decoration-lime-400 decoration-4 underline-offset-4 hover:bg-lime-300">
            linksh.it/trevor
          </Link>
        </p>
      )}
      <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-stone-500">
        <Link href="/pricing" className="hover:text-stone-900">Pricing (lol, free)</Link>
        <Link href="/privacy" className="hover:text-stone-900">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-stone-900">Terms of Service</Link>
        <Link href="/accessibility" className="hover:text-stone-900">Accessibility</Link>
        <Link href="/contact" className="hover:text-stone-900">Contact</Link>
      </nav>
      <p className="mt-3 text-xs text-stone-500">&copy; 2026 linksh.it &middot; all your sh.it, one link</p>
    </footer>
  );
}
