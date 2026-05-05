# Journal App

独立电子手帐应用目录，不依赖根目录 `app.py` 或 `astro_match_app`。
支持手动贴图 URL 与粘贴截图插入为贴纸。

## 运行

```bash
cd journal_app
# 可选：先复制 .env.example 为 .env 并填入后台密码
python3 serve.py
```

默认地址：`http://127.0.0.1:8010`

本地启动时会自动读取 `journal_app/.env`，例如：

```bash
cp .env.example .env
```

## 部署

- Fly.io 使用 `Dockerfile` 直接运行 `serve.py`
- 线上环境监听 `0.0.0.0:$PORT`
- 管理后台 `/admin` 受 Basic Auth 保护
- 在 Fly 上设置：

```bash
fly secrets set ADMIN_PASSWORD='your-password'
```

## 贴图方式

- 手动贴图 URL（http/https）
- 直接粘贴截图（`Cmd/Ctrl + V`）

## 文件

- `index.html`: 页面结构
- `style.css`: 样式
- `app.js`: 交互逻辑（胶带、贴纸、文字、贴图、自动排版、翻页）
- `serve.py`: 独立服务器（静态文件 + `/api/image-proxy`）
