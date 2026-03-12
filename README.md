# Year Planner Online

A polished annual planner for mapping the whole year on one screen.

This version stays **local-first** for day-to-day UX, while adding an optional **account-backed server-side persistence path** for Vercel using Neon Postgres.

## What changed

- **Guided planning UI** — annual vision, definition of success, quarterly focus, monthly themes, and reusable routines.
- **Local autosave still works** — the planner remains fast and resilient in the browser.
- **Authoritative account sync** — authenticated users save/load via `/api/planner/account`, with a canonical server revision instead of timestamp-based conflict guesses.
- **Lightweight account auth** — email + password, server-side hashing, and HttpOnly session cookies.
- **Legacy anonymous planner route hardened** — `/api/planner/[plannerId]` remains readable for compatibility, but anonymous writes are deprecated by default.
- **Neon Postgres persistence** — planner state, users, sessions, and sync revisions are stored server-side via `DATABASE_URL` in Vercel env vars.
- **No client-side secrets** — database credentials never ship to the browser.
- **Improved mobile/day editing UX** — clearer note affordances, touch-friendlier editing, and a safer mobile default view for new local planners.
- **Clearer trust framing** — local-first messaging, calmer sync status, and explicit source-of-truth choices when a real revision mismatch exists.
- **JSON export/import and browser snapshots** — still available as portable backups.

## Persistence model

The planner now supports three layers:

1. **Local-first browser autosave** for regular editing.
2. **Optional account-backed cloud save/load** through the app's own serverless API route.
3. **JSON export/import** for portable backups.

That means you can keep the snappy browser UX while also saving a server-backed copy without exposing database credentials in frontend code.

## Environment

Set this in Vercel project environment variables:

- `DATABASE_URL` — Neon Postgres connection string
- `LEGACY_ANON_PLANNER_MODE` — optional; defaults to `readonly`. Set to `write` only if you intentionally need temporary legacy anonymous writes during migration.

Do **not** put these in client-side env vars or committed source files.

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/>.

If you want the API routes to work locally too, provide `DATABASE_URL` in your local environment before deploying/testing server routes.

## Production build

```bash
npm run build
```

## Deployment

This repo is intended for Vercel deployment.

- Static frontend: CRA build output
- Account sync API route: `api/planner/account.js`
- Legacy compatibility route: `api/planner/[plannerId].js`
- Database: Neon Postgres via Vercel server environment
