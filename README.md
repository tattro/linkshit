# linksh.it

All your shit. One link. Users claim a handle and get a public page at `linksh.it/<handle>` listing their links.

## Stack

- Next.js 16 (App Router, server actions) + TypeScript + Tailwind CSS 4
- Postgres via Drizzle ORM
- Email + password auth with hashed, DB-backed session cookies (bcrypt)

## Features

- Claim a handle with a live availability check; reserved route names are blocked
- Add, edit, delete and reorder links; only http(s) and mailto URLs are accepted
- Display name, bio and five themes, with a live phone preview in the dashboard
- Per-link click counting via `/go/<id>` redirects

## Running locally

```bash
cp .env.example .env          # point DATABASE_URL at a Postgres database
npm install
npx drizzle-kit migrate       # create tables
npm run dev
```

## Deploying

1. Create a Postgres database (Neon, Supabase or Vercel Postgres all work).
2. Import the repo into Vercel and set `DATABASE_URL`.
3. Run `npx drizzle-kit migrate` against the production database.
4. Add `linksh.it` as a domain in Vercel and set the DNS records it shows you.

## Project layout

- `src/app/[handle]` – public profile pages
- `src/app/dashboard` – link and profile editor
- `src/app/actions` – server actions for auth and links
- `src/app/go/[id]` – click-tracking redirect
- `src/db/schema.ts` – database schema (migrations live in `drizzle/`)
- `src/lib/handles.ts` – handle rules and the reserved list
