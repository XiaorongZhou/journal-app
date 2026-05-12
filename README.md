# Journal App

A standalone online journaling app with tapes, stickers, text blocks, manual image stickers, URL preview cards, sharing, export, and a lightweight admin page.

Live site: [https://journal-glitter-ai.fly.dev/](https://journal-glitter-ai.fly.dev/)

## Features

- Bilingual app UI with Chinese and English modes
- Shareable journal links with server-side persistence
- Text blocks, emoji stickers, decorative tapes, and manual image stickers
- URL preview cards for saving links in the notebook
- Export the current page as PNG or PDF
- Lightweight `/admin` page protected by Basic Auth

## Local Development

```bash
cd /Users/alicia/Documents/Playground/journal_app
cp .env.example .env
python3 serve.py
```

Open: [http://127.0.0.1:8010](http://127.0.0.1:8010)

The app automatically reads `journal_app/.env` on startup.

Example `.env`:

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
```

## Deploy to Fly.io

This repository is ready to deploy directly to Fly.io.

### What is already configured

- `Dockerfile` runs `python serve.py`
- `fly.toml` points Fly to port `8080`
- `serve.py` listens on `0.0.0.0:$PORT` in production

### Deploy steps

```bash
cd /Users/alicia/Documents/Playground/journal_app
fly launch --no-deploy
fly secrets set ADMIN_PASSWORD='your-password'
fly deploy
```

If the Fly app already exists, you usually only need:

```bash
cd /Users/alicia/Documents/Playground/journal_app
fly secrets set ADMIN_PASSWORD='your-password'
fly deploy
```

## Admin Page

- URL: `/admin`
- Username defaults to `admin` unless overridden by `ADMIN_USERNAME`
- Password comes from `ADMIN_PASSWORD`

## Files

- `index.html`: app structure
- `style.css`: styles
- `app.js`: client-side logic
- `serve.py`: static server and APIs
- `admin.html`: admin dashboard
- `fly.toml`: Fly app config
- `Dockerfile`: container build file

## Notes

- `.env` and `journal_app.db` are ignored by `.gitignore`
- This app is now its own standalone git repository
