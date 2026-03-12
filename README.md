# Year Planner Online

A local-first annual planner for mapping the year on one screen.

This version is tuned for actually using the planner regularly, not just coloring a few days and forgetting it exists.

## What’s improved

- **Guided planning UI** — annual vision, definition of success, quarterly focus, and monthly themes.
- **Reusable routines** — create repeatable weekday/weekend templates and apply them across the whole year.
- **Planner dashboard** — quick stats, current month focus, and better cues for how the planner is being used.
- **Safer persistence** — browser autosave, downloadable JSON backups, and in-browser restore snapshots.
- **Mobile-ready layout** — cleaner panels, responsive controls, and a more polished overall interface.
- **Still private and database-free** — no backend, no hidden sync, no client-side secrets.

## Persistence model

This app intentionally stays **database-free** and **local-first**.

The safe workflow is:

1. Use the browser autosave for day-to-day work.
2. Export JSON backups after meaningful updates.
3. Store those backups anywhere you already trust: iCloud Drive, Dropbox, Google Drive, git, Syncthing, etc.

That gives you cross-device portability **without** putting API keys or write tokens into the browser.

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/>.

## Production build

```bash
npm run build
```

## GitHub Pages

This repo is deployed to GitHub Pages at:

**https://stan-gray.github.io/year-planner-online/**

The GitHub Actions workflow builds on push to `main` and deploys the static `build/` output.
