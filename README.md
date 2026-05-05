# Journal App / 电子手帐

A standalone online journaling app with tapes, stickers, text blocks, manual image stickers, URL preview cards, sharing, export, and a lightweight admin page.

独立的电子手帐应用，支持胶带、贴纸、文字块、手动贴图、网页预览卡、分享、导出，以及轻量后台页面。

## Features / 功能

- Bilingual UI: Chinese and English
- Shareable journal links with server-side persistence
- Text, emoji stickers, decorative tapes, manual image stickers
- URL preview cards for saving links in the notebook
- Export current page as PNG or PDF
- Lightweight `/admin` page protected by Basic Auth

- 中英双语界面
- 可分享的手帐链接，服务端持久化保存
- 文字、Emoji 贴纸、装饰胶带、手动贴图
- 网页 URL 预览卡，可把链接贴进手帐
- 当前页面可导出为 PNG 或 PDF
- 使用 Basic Auth 保护的轻量 `/admin` 后台

## Local Development / 本地运行

```bash
cd /Users/alicia/Documents/Playground/journal_app
cp .env.example .env
python3 serve.py
```

Open: [http://127.0.0.1:8010](http://127.0.0.1:8010)

打开地址：[http://127.0.0.1:8010](http://127.0.0.1:8010)

The app automatically reads `journal_app/.env` on startup.

应用启动时会自动读取 `journal_app/.env`。

Example `.env`:

`.env` 示例：

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
```

## Deploy to Fly.io / 部署到 Fly.io

This repository is ready to deploy directly to Fly.io.

这个独立仓库可以直接部署到 Fly.io。

### What is already configured / 已有配置

- `Dockerfile` runs `python serve.py`
- `fly.toml` points Fly to port `8080`
- `serve.py` listens on `0.0.0.0:$PORT` in production

- `Dockerfile` 会运行 `python serve.py`
- `fly.toml` 已配置 Fly 使用 `8080` 端口
- `serve.py` 在线上会监听 `0.0.0.0:$PORT`

### Deploy steps / 部署步骤

```bash
cd /Users/alicia/Documents/Playground/journal_app
fly launch --no-deploy
fly secrets set ADMIN_PASSWORD='your-password'
fly deploy
```

If the Fly app already exists, you usually only need:

如果 Fly app 已经存在，通常只需要：

```bash
cd /Users/alicia/Documents/Playground/journal_app
fly secrets set ADMIN_PASSWORD='your-password'
fly deploy
```

### Admin page / 后台页面

- URL: `/admin`
- Username defaults to `admin` unless overridden by `ADMIN_USERNAME`
- Password comes from `ADMIN_PASSWORD`

- 地址：`/admin`
- 用户名默认是 `admin`，除非你用 `ADMIN_USERNAME` 覆盖
- 密码来自 `ADMIN_PASSWORD`

## Files / 文件说明

- `index.html`: app structure / 页面结构
- `style.css`: styles / 样式
- `app.js`: client logic / 前端交互逻辑
- `serve.py`: static server + APIs / 静态服务器与接口
- `admin.html`: admin dashboard / 后台页面
- `fly.toml`: Fly app config / Fly 配置
- `Dockerfile`: container build / 容器构建文件

## Notes / 说明

- `.env` and `journal_app.db` are ignored by `.gitignore`
- This app is now its own standalone git repository

- `.env` 和 `journal_app.db` 已被 `.gitignore` 忽略
- 这个 app 现在已经是独立 git 仓库
