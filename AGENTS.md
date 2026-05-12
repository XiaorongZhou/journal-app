# AGENTS.md

## Repo Purpose

This repository contains a standalone browser-based journaling app with:
- draggable notebook elements
- decorative tapes and emoji stickers
- editable text blocks
- manual image stickers and URL preview cards
- lightweight version history
- shareable journal links backed by SQLite
- a minimal `/admin` dashboard protected by Basic Auth

The repo is independent from the larger `Playground` repo. Work from this directory, not the parent workspace.

## Key Files

- `index.html`: app shell and UI structure
- `style.css`: all visual styling and responsive layout rules
- `app.js`: main client logic, state management, i18n, interactions, export, history, share flow
- `serve.py`: Python static server + API endpoints + SQLite persistence + admin auth
- `admin.html`: admin dashboard UI
- `fly.toml`: Fly.io app config
- `Dockerfile`: production container entrypoint
- `.env.example`: local env template

## Local Run

```bash
cd /Users/alicia/Documents/Playground/journal_app
cp .env.example .env
python3 serve.py
```

Default local URL:
- `http://127.0.0.1:8010`

The app reads `.env` automatically on startup.

## Local Git

This directory is its own git repo.

Configured identity in this repo:
- `user.name = XiaorongZhou`
- `user.email = xz296@cornell.edu`

Remote:
- `origin = https://github.com/XiaorongZhou/journal-app.git`

## Deployment

Fly app:
- `journal-glitter-ai`

Useful commands:

```bash
cd /Users/alicia/Documents/Playground/journal_app
fly secrets set ADMIN_PASSWORD='your-password' -a journal-glitter-ai
fly deploy -a journal-glitter-ai
```

Current deployed admin state last verified in-session:
- `ADMIN_USERNAME=bao`
- `ADMIN_PASSWORD` is set, but secret value was not retrieved

## Architecture Notes

### Frontend

The frontend is plain HTML/CSS/JS. There is no framework.

State is page-based:
- notebook items live in `pages`
- current page index is tracked in JS and persisted locally + remotely
- local storage is scoped by `journal_id`
- server sync uses `GET/PUT /api/journals/:id`

Images:
- large image blobs are stored in IndexedDB on the client
- item metadata persists in page JSON

### Backend

`serve.py` provides:
- static file serving
- journal read/write API
- admin journal listing API
- URL preview fetch endpoint(s)
- basic auth around `/admin` and admin APIs
- SQLite persistence in `journal_app.db`

## Current UX Direction

The app was being adapted to be more mobile-web friendly for quick jotting on the go.

Latest local, not-yet-reviewed-in-browser changes are in `style.css` only and include:
- notebook-first layout on narrow screens
- panel moved below the notebook on mobile
- horizontally scrollable top controls on mobile
- sticky/scannable tool tabs inside the panel
- larger mobile page-turn touch targets
- bottom-fixed selection toolbar on phones
- tighter spacing for phone screens at `980px`, `720px`, and `520px` breakpoints

## Known Caveat

The latest mobile CSS refactor was not browser-automation verified in the same session because the devtools browser tool was unavailable in that turn. Treat the current mobile layout as implemented but in need of visual QA on an actual narrow viewport.

## Recommended Verification After Layout Changes

After changing layout or interaction behavior, verify at minimum:
- desktop page load
- narrow mobile viewport layout
- page turn buttons are reachable on mobile
- selection toolbar remains usable on mobile
- emoji selector does not overflow awkwardly
- page list still usable in the Pages tab
- `/admin` still loads when auth is provided

## Safe Defaults For Future Agents

- Prefer editing `style.css` for layout work before touching JS.
- Do not assume the parent `Playground` git repo is the one to use; use the local repo in this directory.
- Avoid committing `.env` or `journal_app.db`.
- If debugging “missing journal” links, check `/api/journals/:id` first; a 404 there is a data issue, not usually a font issue.
