import { sql } from "drizzle-orm";

/** Accounts made from here on need a confirmed email before their pages go public. Older pages stay live. */
export const CONFIRM_REQUIRED_FROM = "2026-11-03T15:20:00Z";

/** SQL, for a query that includes the `users` table (written out in full: drizzle drops the table name in single-table selects, which would point at `acct`): true while this page's account (itself, or its owner for extra pages) hasn't confirmed its email. */
export const notLiveYet = sql<boolean>`exists (
  select 1 from users acct
  where acct.id = coalesce("users"."owner_id", "users"."id")
    and acct.email_verified_at is null
    and acct.created_at >= ${CONFIRM_REQUIRED_FROM}::timestamptz
)`;
