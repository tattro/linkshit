import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-mono text-xl font-bold tracking-tight ${className}`}>
      linksh<span className="text-lime-500">.</span>it
    </Link>
  );
}
