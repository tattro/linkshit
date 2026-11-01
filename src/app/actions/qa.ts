"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, questions, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export type QAState = { ok?: boolean; error?: string } | undefined;

function refresh(handle: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/${handle}`);
}

/** Public: an anonymous question. We keep no name, email or IP with it. */
export async function askQuestion(_prev: QAState, formData: FormData): Promise<QAState> {
  if (String(formData.get("company") ?? "")) return { ok: true }; // honeypot: pretend it worked
  const userId = Number(formData.get("userId"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 300);
  if (!Number.isInteger(userId) || userId <= 0) return { error: "Something went wrong." };
  if (body.length < 2) return { error: "Ask something first." };
  const ip = await clientIp();
  if (!(await rateLimit(`ask:ip:${ip}`, 10, 60 * 60))) return { error: "Slow down a bit and try again later." };
  if (!(await rateLimit(`ask:page:${userId}`, 200, 24 * 60 * 60))) return { error: "Too many questions today. Try tomorrow." };
  const [page] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.qaEnabled, true), isNull(users.bannedAt)));
  if (!page) return { error: "This page isn't taking questions right now." };
  await db.insert(questions).values({ userId, body });
  return { ok: true };
}

/** Turns the Q&A on or off and sets the button text. */
export async function updateQA(_prev: QAState, formData: FormData): Promise<QAState> {
  const user = await requireUser();
  await db.update(users).set({
    qaEnabled: formData.get("qaEnabled") === "on",
    qaPrompt: String(formData.get("qaPrompt") ?? "").trim().slice(0, 60),
  }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

/** Answers (or re-answers) a question, which publishes it to the page's feed. */
export async function answerQuestion(_prev: QAState, formData: FormData): Promise<QAState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 1000);
  if (!answer) return { error: "Write an answer first." };
  const [row] = await db.select({ answeredAt: questions.answeredAt }).from(questions)
    .where(and(eq(questions.id, id), eq(questions.userId, user.id)));
  if (!row) return { error: "That question is gone." };
  await db.update(questions).set({ answer, answeredAt: row.answeredAt ?? new Date() })
    .where(and(eq(questions.id, id), eq(questions.userId, user.id)));
  refresh(user.handle);
  return { ok: true };
}

/** Deletes a question (and its answer, if any) for good. */
export async function deleteQuestion(formData: FormData) {
  const user = await requireUser();
  await db.delete(questions).where(and(eq(questions.id, Number(formData.get("id"))), eq(questions.userId, user.id)));
  refresh(user.handle);
}
