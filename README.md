# Journal App

独立电子手帐应用目录，不依赖根目录 `app.py` 或 `astro_match_app`。
支持手动贴图 URL 与粘贴截图插入为贴纸。

## 运行

```bash
cd journal_app
python3 serve.py
```

默认地址：`http://127.0.0.1:8010`

## 贴图方式

- 手动贴图 URL（http/https）
- 直接粘贴截图（`Cmd/Ctrl + V`）

## 文件

- `index.html`: 页面结构
- `style.css`: 样式
- `app.js`: 交互逻辑（胶带、贴纸、文字、贴图、自动排版、翻页）
- `serve.py`: 独立服务器（静态文件 + `/api/image-proxy`）
