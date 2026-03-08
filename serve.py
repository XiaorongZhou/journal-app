#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent

MOCK_POSTERS: list[dict] = [
    {
        "title": "Casablanca",
        "year": "1942",
        "id": "mock-casablanca-1942",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/CasablancaPoster-Gold.jpg",
        "source": "mock",
    },
    {
        "title": "A Streetcar Named Desire",
        "year": "1951",
        "id": "mock-a-streetcar-named-desire-1951",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/A%20Streetcar%20Named%20Desire%20%281951%29.jpg",
        "source": "mock",
    },
    {
        "title": "Dial M for Murder",
        "year": "1954",
        "id": "mock-dial-m-for-murder-1954",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Dial%20M%20For%20Murder.jpg",
        "source": "mock",
    },
    {
        "title": "Mister Roberts",
        "year": "1955",
        "id": "mock-mister-roberts-1955",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Mister%20Roberts%20%281955%20movie%20poster%29.jpg",
        "source": "mock",
    },
    {
        "title": "Giant",
        "year": "1956",
        "id": "mock-giant-1956",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Giant%20%281956%29%20poster.jpg",
        "source": "mock",
    },
    {
        "title": "The Searchers",
        "year": "1956",
        "id": "mock-the-searchers-1956",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/SearchersPoster-BillGold.jpg",
        "source": "mock",
    },
    {
        "title": "Strangers on a Train",
        "year": "1951",
        "id": "mock-strangers-on-a-train-1951",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Strangers%20on%20a%20Train%20%28film%29.jpg",
        "source": "mock",
    },
    {
        "title": "The Old Man and the Sea",
        "year": "1958",
        "id": "mock-the-old-man-and-the-sea-1958",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Old%20Man%20and%20the%20Sea%20%281958%20film%29.jpg",
        "source": "mock",
    },
    {
        "title": "Yankee Doodle Dandy",
        "year": "1942",
        "id": "mock-yankee-doodle-dandy-1942",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Yankee%20Doodle%20Dandy%20%281942%20poster%29.jpg",
        "source": "mock",
    },
    {
        "title": "The Music Man",
        "year": "1962",
        "id": "mock-the-music-man-1962",
        "poster_url": "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Music%20Man%20%281962%20film%20poster%20-%20three-sheet%29.jpg",
        "source": "mock",
    },
]


def fetch_json(url: str, timeout: int = 8) -> dict:
    req = Request(url, headers={"User-Agent": "journal-app/1.0"})
    with urlopen(req, timeout=timeout) as resp:  # nosec B310
        return json.loads(resp.read().decode("utf-8"))


def search_imdb_omdb(query: str, limit: int) -> list[dict]:
    api_key = os.environ.get("OMDB_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing OMDB_API_KEY. Set env var then retry.")

    params = urlencode({"apikey": api_key, "s": query, "type": "movie"})
    data = fetch_json(f"https://www.omdbapi.com/?{params}")
    if data.get("Response") != "True":
        raise ValueError(data.get("Error", "OMDb search failed"))

    posters: list[dict] = []
    for item in data.get("Search", []):
        poster_url = (item.get("Poster") or "").strip()
        if not poster_url or poster_url == "N/A":
            continue
        posters.append(
            {
                "title": item.get("Title", "Unknown"),
                "year": item.get("Year", ""),
                "id": item.get("imdbID", ""),
                "poster_url": poster_url,
                "source": "imdb",
            }
        )
        if len(posters) >= limit:
            break
    return posters


def parse_douban_payload(data: dict, limit: int) -> list[dict]:
    raw_items = data.get("subjects") or data.get("items") or data.get("results") or []
    posters: list[dict] = []

    for item in raw_items:
        images = item.get("images") if isinstance(item.get("images"), dict) else {}
        poster_url = (
            images.get("large")
            or images.get("medium")
            or images.get("small")
            or item.get("poster")
            or item.get("cover")
            or item.get("image")
            or ""
        )
        poster_url = str(poster_url).strip()
        if not poster_url:
            continue

        posters.append(
            {
                "title": item.get("title", "Unknown"),
                "year": str(item.get("year", "")),
                "id": str(item.get("id", "")),
                "poster_url": poster_url,
                "source": "douban",
            }
        )
        if len(posters) >= limit:
            break

    return posters


def search_mock_posters(query: str, limit: int) -> list[dict]:
    q = query.strip().lower()
    if not q:
        return MOCK_POSTERS[:limit]

    matched = [p for p in MOCK_POSTERS if q in p["title"].lower()]
    if matched:
        return matched[:limit]
    return MOCK_POSTERS[:limit]


def search_douban(query: str, limit: int) -> list[dict]:
    base = os.environ.get("DOUBAN_API_BASE", "https://api.douban.com/v2/movie/search").strip()
    params: dict[str, str] = {"q": query}
    api_key = os.environ.get("DOUBAN_API_KEY", "").strip()
    if api_key:
        params["apikey"] = api_key

    url = f"{base}?{urlencode(params)}"
    data = fetch_json(url)
    return parse_douban_payload(data, limit)


class JournalHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/posters/search" or parsed.path.endswith("/api/posters/search"):
            params = parse_qs(parsed.query)
            source = (params.get("source", ["imdb"])[0] or "imdb").strip().lower()
            query = (params.get("q", [""])[0] or "").strip()
            raw_limit = (params.get("limit", ["10"])[0] or "10").strip()

            if not query:
                self._send_json({"error": "Missing query parameter: q"}, status=400)
                return

            try:
                limit = max(1, min(20, int(raw_limit)))
            except ValueError:
                self._send_json({"error": "Invalid limit"}, status=400)
                return

            try:
                if source == "imdb":
                    try:
                        posters = search_imdb_omdb(query, limit)
                    except Exception:
                        posters = search_mock_posters(query, limit)
                elif source == "douban":
                    try:
                        posters = search_douban(query, limit)
                    except Exception:
                        posters = search_mock_posters(query, limit)
                elif source == "mock":
                    posters = search_mock_posters(query, limit)
                else:
                    self._send_json({"error": "Unsupported source. Use mock, imdb or douban."}, status=400)
                    return
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=502)
                return

            self._send_json({"ok": True, "source": source, "query": query, "posters": posters})
            return

        if parsed.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, format: str, *args) -> None:
        return


def run(host: str = "127.0.0.1", port: int = 8010) -> None:
    with ThreadingHTTPServer((host, port), JournalHandler) as server:
        print(f"Journal app serving at http://{host}:{port}")
        server.serve_forever()


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8010"))
    run(host=host, port=port)
