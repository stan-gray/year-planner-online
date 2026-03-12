# Year Planner Online

A polished annual planner for mapping the whole year on one screen.

This version stays **local-first** for day-to-day UX, while adding an optional **account-backed server-side persistence path** for Vercel using Neon Postgres.

## What changed

- **Guided planning UI** — annual vision, definition of success, quarterly focus, monthly themes, and reusable routines.
- **Local autosave still works** — the planner remains fast and resilient in the browser.
- **Lightweight account auth** — email + password, server-side hashing, and HttpOnly session cookies.
- **Account-backed cloud planner** — authenticated users save/load via `/api/planner/account` instead of relying on a browser-local anonymous ID.
- **Legacy planner route preserved** — `/api/planner/[plannerId]` still works for compatibility with older saves.
- **Neon Postgres persistence** — planner state, users, and sessions are stored server-side via `DATABASE_URL` in Vercel env vars.
- **No client-side secrets** — database credentials never ship to the browser.
- **Lightweight schema bootstrap** — the API routes create the necessary tables automatically if needed.
- **Improved sync UX** — signed-in status, clear save state, conflict-choice flow, and debounced auto-sync.
- **JSON export/import and browser snapshots** — still available as portable backups.

## Persistence model

The planner now supports three safe layers:

1. **Local-first browser autosave** for regular editing.
2. **Optional account-backed cloud save/load** through the app's own serverless API route.
3. **JSON export/import** for portable backups.

That means you can keep the snappy browser UX while also saving a server-backed copy without exposing database credentials in frontend code.

## Environment

Set this in Vercel project environment variables:

- `DATABASE_URL` — Neon Postgres connection string

Do **not** put this in client-side env vars or committed source files.

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/>.

If you want the API route to work locally too, provide `DATABASE_URL` in your local environment before deploying/testing server routes.

## Production build

```bash
npm run build
```

## Deployment

This repo is intended for Vercel deployment.

- Static frontend: CRA build output
- API route: `api/planner/[plannerId].js`
- Database: Neon Postgres via Vercel server environment
