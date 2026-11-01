import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, links } from "@/db";
import { LockScreen } from "@/components/LockScreen";

export const metadata = { title: "Locked link", robots: { index: false } };

// Where /go sends visitors of a locked link; on the right code it sends them back through /go.
export default async function LockedLink({ params }: PageProps<"/locked/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [link] = await db.select({ title: links.title, lockCode: links.lockCode }).from(links).where(eq(links.id, id));
  if (!link) notFound();
  return <LockScreen kind="link" id={id} title={link.title} next={`/go/${id}`} />;
}

export const instant = false;
