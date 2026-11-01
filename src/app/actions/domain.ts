"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { addProjectDomain, domainsEnabled, domainStatus, normalizeDomain, removeProjectDomain, type DomainStatus } from "@/lib/domains";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";

export type DomainState = { error?: string; status?: DomainStatus } | undefined;

export async function connectDomain(_prev: DomainState, formData: FormData): Promise<DomainState> {
  const user = await requireUser();
  if (!domainsEnabled()) return { error: "Custom domains aren't switched on yet." };
  if (!(await rateLimit(`domain:user:${user.id}`, 10, 60 * 60))) return { error: TOO_MANY };
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  if (!domain) return { error: "That doesn't look like a domain. Try something like links.yoursite.com." };
  if (domain === user.customDomain) return { status: await domainStatus(domain) };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.customDomain, domain));
  if (taken) return { error: "That domain is already connected to another page." };
  const err = await addProjectDomain(domain);
  if (err) return { error: err };
  if (user.customDomain) await removeProjectDomain(user.customDomain);
  await db.update(users).set({ customDomain: domain }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  return { status: await domainStatus(domain) };
}

export async function checkDomain(): Promise<DomainState> {
  const user = await requireUser();
  if (!user.customDomain || !domainsEnabled()) return undefined;
  if (!(await rateLimit(`domaincheck:user:${user.id}`, 60, 60 * 60))) return { error: TOO_MANY };
  return { status: await domainStatus(user.customDomain) };
}

export async function disconnectDomain() {
  const user = await requireUser();
  if (!user.customDomain) return;
  if (domainsEnabled()) await removeProjectDomain(user.customDomain);
  await db.update(users).set({ customDomain: null }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
}
