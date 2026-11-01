# linksh.it

All your shit. One link. Users claim a handle and get a public page at `linksh.it/<handle>` listing their links.

## Stack

- Next.js 16 (App Router, server actions) + TypeScript + Tailwind CSS 4
- Postgres via Drizzle ORM
- Email + password auth with hashed, DB-backed session cookies (bcrypt)

## Features

- Claim a handle with a live availability check; reserved route names are blocked
- Add, edit, delete and reorder links; only http(s) and mailto URLs are accepted
- Schedule links (show from / hide after) and show YouTube, Spotify or SoundCloud links as embedded players
- Profile photo (cropped and shrunk in the browser, stored in Postgres), display name and bio
- Social icons row for 16 platforms
- Five themes plus custom colours, button shapes and fonts, with a live phone preview
- Analytics: page views and clicks per day, top links, referrers and countries
- Share card with QR code, plus generated link-preview images for every page
- Forgot-password and email verification via Resend
- Rate limiting on login, signup, resets and edits; a signup honeypot; unsafe-link blocking (with optional Google Safe Browsing)
- Admin panel at `/admin` to search accounts and ban or unban them

## Environment variables

See `.env.example`. Only `DATABASE_URL` is required. Set `ADMIN_EMAILS` to get the admin panel and `RESEND_API_KEY` to actually send emails.

## Running locally

```bash
cp .env.example .env          # point DATABASE_URL at a Postgres database
npm install
npm run db:migrate           # create tables (also runs on every build)
npm run dev
```

## Deploying

1. Create a Postgres database (Neon, Supabase or Vercel Postgres all work).
2. Import the repo into Vercel and set `DATABASE_URL`.
3. Deploy. The build runs pending migrations automatically.
4. Add `linksh.it` as a domain in Vercel and set the DNS records it shows you.

## Project layout

- `src/app/[handle]` – public profile pages
- `src/app/dashboard` – link and profile editor
- `src/app/actions` – server actions for auth and links
- `src/app/go/[id]` – click-tracking redirect
- `src/db/schema.ts` – database schema (migrations live in `drizzle/`)
- `src/lib/handles.ts` – handle rules and the reserved list

## Clickable preview

`preview/index.html` is a standalone, browser-only mock of the app (data lives in localStorage). Open it directly in a browser to click through the flows without a database.
