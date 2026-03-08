# Journal App

独立电子手帐应用目录，不依赖根目录 `app.py` 或 `astro_match_app`。
支持电影海报搜索并插入为贴纸（IMDb/豆瓣）。

## 运行

```bash
cd journal_app
export OMDB_API_KEY=你的key
python3 serve.py
```

默认地址：`http://127.0.0.1:8010`

## 电影海报 API 配置

- IMDb: 使用 OMDb 作为 IMDb 数据源代理，需设置 `OMDB_API_KEY`
- Douban: 默认请求 `https://api.douban.com/v2/movie/search`，可通过 `DOUBAN_API_BASE` 覆盖；如果需要鉴权可设置 `DOUBAN_API_KEY`

## 文件

- `index.html`: 页面结构
- `style.css`: 样式
- `app.js`: 交互逻辑（胶带、贴纸、文字、海报贴纸、自动排版、翻页）
- `serve.py`: 独立服务器（静态文件 + `/api/posters/search`）
