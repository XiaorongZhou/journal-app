#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent


def fetch_binary(url: str, timeout: int = 10, headers: dict[str, str] | None = None) -> tuple[bytes, str]:
    req_headers = {"User-Agent": "journal-app/1.0", "Accept": "image/*,*/*;q=0.8"}
    if headers:
        req_headers.update(headers)
    req = Request(url, headers=req_headers)
    with urlopen(req, timeout=timeout) as resp:  # nosec B310
        data = resp.read()
        content_type = resp.headers.get("Content-Type", "application/octet-stream")
        return data, content_type


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
        if parsed.path == "/api/image-proxy" or parsed.path.endswith("/api/image-proxy"):
            params = parse_qs(parsed.query)
            raw_url = (params.get("url", [""])[0] or "").strip()
            if not raw_url:
                self._send_json({"error": "Missing url parameter"}, status=400)
                return
            try:
                target = urlparse(raw_url)
                if target.scheme not in {"http", "https"}:
                    self._send_json({"error": "Unsupported URL scheme"}, status=400)
                    return
                if target.hostname in {"127.0.0.1", "localhost", "::1"}:
                    self._send_json({"error": "Local addresses are not allowed"}, status=400)
                    return
                referer_base = f"{target.scheme}://{target.netloc}/"
                data, content_type = fetch_binary(raw_url, headers={"Referer": referer_base})
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                self.wfile.write(data)
            except Exception as exc:
                self._send_json({"error": f"image proxy failed: {exc}"}, status=502)
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
