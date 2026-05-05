#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import socket
import ipaddress
import sqlite3
import base64
import binascii
import hmac
from html import unescape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent


def load_local_env(path: Path) -> None:
    if not path.exists():
        return
    try:
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if not key:
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
                value = value[1:-1]
            os.environ.setdefault(key, value)
    except OSError:
        return


load_local_env(ROOT / ".env")

DB_PATH = ROOT / "journal_app.db"
JOURNAL_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS journals (
                journal_id TEXT PRIMARY KEY,
                state_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def load_journal_state(journal_id: str) -> dict | None:
    with db_connect() as conn:
        row = conn.execute(
            "SELECT state_json, updated_at FROM journals WHERE journal_id = ?",
            (journal_id,),
        ).fetchone()
    if not row:
        return None
    payload = json.loads(row["state_json"])
    if isinstance(payload, dict):
        payload["_updated_at"] = row["updated_at"]
        return payload
    return None


def save_journal_state(journal_id: str, payload: dict) -> None:
    state_json = json.dumps(payload, ensure_ascii=False)
    with db_connect() as conn:
        conn.execute(
            """
            INSERT INTO journals (journal_id, state_json, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(journal_id) DO UPDATE SET
                state_json = excluded.state_json,
                updated_at = CURRENT_TIMESTAMP
            """,
            (journal_id, state_json),
        )
        conn.commit()


def list_journals(limit: int = 100) -> list[dict]:
    with db_connect() as conn:
        rows = conn.execute(
            """
            SELECT journal_id, state_json, created_at, updated_at
            FROM journals
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items: list[dict] = []
    for row in rows:
        page_count = 0
        item_count = 0
        current_page = 0
        try:
            payload = json.loads(row["state_json"])
            pages = payload.get("pages", [])
            if isinstance(pages, list):
                page_count = len(pages)
                item_count = sum(len(page) for page in pages if isinstance(page, list))
            current_page = int(payload.get("currentPage", 0) or 0)
        except Exception:
            pass
        items.append(
            {
                "journal_id": row["journal_id"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "page_count": page_count,
                "item_count": item_count,
                "current_page": current_page,
            }
        )
    return items


def fetch_binary(url: str, timeout: int = 10, headers: dict[str, str] | None = None) -> tuple[bytes, str]:
    req_headers = {"User-Agent": "journal-app/1.0", "Accept": "image/*,*/*;q=0.8"}
    if headers:
        req_headers.update(headers)
    req = Request(url, headers=req_headers)
    with urlopen(req, timeout=timeout) as resp:  # nosec B310
        data = resp.read()
        content_type = resp.headers.get("Content-Type", "application/octet-stream")
        return data, content_type


def fetch_text(url: str, timeout: int = 10, headers: dict[str, str] | None = None) -> tuple[str, str]:
    req_headers = {
        "User-Agent": "journal-app/1.0",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.7",
    }
    if headers:
        req_headers.update(headers)
    req = Request(url, headers=req_headers)
    with urlopen(req, timeout=timeout) as resp:  # nosec B310
        content_type = resp.headers.get("Content-Type", "text/html")
        charset = resp.headers.get_content_charset() or "utf-8"
        data = resp.read(900_000)
        return data.decode(charset, errors="replace"), content_type


def is_disallowed_host(hostname: str | None) -> bool:
    if not hostname:
        return True
    lowered = hostname.lower()
    if lowered in {"localhost", "127.0.0.1", "::1"}:
        return True
    try:
        infos = socket.getaddrinfo(hostname, None)
    except Exception:
        return False
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return True
    return False


META_TAG_RE = re.compile(r"<meta\b[^>]*>", re.IGNORECASE)
LINK_TAG_RE = re.compile(r"<link\b[^>]*>", re.IGNORECASE)
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r'([A-Za-z_:.-]+)\s*=\s*(".*?"|\'.*?\'|[^\s>]+)', re.DOTALL)


def parse_attrs(tag: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for match in ATTR_RE.finditer(tag):
        key = match.group(1).lower()
        value = match.group(2).strip().strip("'\"")
        attrs[key] = unescape(value)
    return attrs


def clean_inline_text(value: str) -> str:
    text = re.sub(r"\s+", " ", value or "").strip()
    return unescape(text)


def extract_preview(html: str, page_url: str) -> dict[str, str]:
    title = ""
    og_title = ""
    site_name = ""
    image = ""
    favicon = ""

    title_match = TITLE_RE.search(html)
    if title_match:
        title = clean_inline_text(title_match.group(1))

    for tag in META_TAG_RE.findall(html):
        attrs = parse_attrs(tag)
        key = (attrs.get("property") or attrs.get("name") or "").strip().lower()
        content = clean_inline_text(attrs.get("content", ""))
        if not key or not content:
            continue
        if key in {"og:title", "twitter:title"} and not og_title:
            og_title = content
        elif key == "og:site_name" and not site_name:
            site_name = content
        elif key in {"og:image", "twitter:image", "twitter:image:src"} and not image:
            image = content

    for tag in LINK_TAG_RE.findall(html):
        attrs = parse_attrs(tag)
        rel = (attrs.get("rel") or "").lower()
        href = attrs.get("href", "")
        if not href:
            continue
        if "icon" in rel and not favicon:
            favicon = href

    if image:
        image = urljoin(page_url, image)
    if favicon:
        favicon = urljoin(page_url, favicon)

    parsed = urlparse(page_url)
    host = parsed.hostname or ""
    screenshot = f"https://image.thum.io/get/width/900/crop/560/noanimate/{page_url}"
    return {
        "title": og_title or title or host or page_url,
        "site_name": site_name or host,
        "thumbnail_url": image or screenshot,
        "favicon_url": favicon,
    }


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

    def _send_admin_auth_required(self, message: str = "Authentication required", status: int = 401) -> None:
        body = message.encode("utf-8")
        self.send_response(status)
        self.send_header("WWW-Authenticate", 'Basic realm="Journal Admin"')
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _is_admin_authorized(self) -> bool:
        if not ADMIN_PASSWORD:
            self._send_admin_auth_required("ADMIN_PASSWORD is not configured", status=503)
            return False

        header = self.headers.get("Authorization", "")
        if not header.startswith("Basic "):
            self._send_admin_auth_required()
            return False

        token = header.split(" ", 1)[1].strip()
        try:
            decoded = base64.b64decode(token).decode("utf-8")
        except (ValueError, binascii.Error, UnicodeDecodeError):
            self._send_admin_auth_required("Invalid auth header")
            return False

        username, _, password = decoded.partition(":")
        if not (
            hmac.compare_digest(username, ADMIN_USERNAME)
            and hmac.compare_digest(password, ADMIN_PASSWORD)
        ):
            self._send_admin_auth_required("Invalid username or password")
            return False
        return True

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/admin/journals":
            if not self._is_admin_authorized():
                return
            params = parse_qs(parsed.query)
            try:
                limit = max(1, min(int((params.get("limit", ["100"])[0] or "100")), 300))
            except ValueError:
                limit = 100
            try:
                items = list_journals(limit=limit)
            except Exception as exc:
                self._send_json({"error": f"journal list failed: {exc}"}, status=500)
                return
            self._send_json({"ok": True, "items": items})
            return

        if parsed.path.startswith("/api/journals/"):
            journal_id = parsed.path.rsplit("/", 1)[-1].strip()
            if not JOURNAL_ID_RE.fullmatch(journal_id):
                self._send_json({"error": "Invalid journal id"}, status=400)
                return
            try:
                state = load_journal_state(journal_id)
            except Exception as exc:
                self._send_json({"error": f"journal load failed: {exc}"}, status=500)
                return
            if not state:
                self._send_json({"error": "Journal not found"}, status=404)
                return
            self._send_json({"ok": True, "journal_id": journal_id, "state": state})
            return

        if parsed.path == "/api/url-preview" or parsed.path.endswith("/api/url-preview"):
            params = parse_qs(parsed.query)
            raw_url = (params.get("url", [""])[0] or "").strip()
            if not raw_url:
                self._send_json({"error": "Missing url parameter"}, status=400)
                return
            if "://" not in raw_url:
                raw_url = f"https://{raw_url}"
            try:
                target = urlparse(raw_url)
                if target.scheme not in {"http", "https"}:
                    self._send_json({"error": "Unsupported URL scheme"}, status=400)
                    return
                if is_disallowed_host(target.hostname):
                    self._send_json({"error": "Local/private addresses are not allowed"}, status=400)
                    return
                html, content_type = fetch_text(raw_url, timeout=12)
                if "html" not in content_type.lower():
                    self._send_json({"error": "Target is not an HTML page"}, status=400)
                    return
                preview = extract_preview(html, raw_url)
                self._send_json({"ok": True, "url": raw_url, **preview})
            except Exception as exc:
                self._send_json({"error": f"url preview failed: {exc}"}, status=502)
            return

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
                if is_disallowed_host(target.hostname):
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
        elif parsed.path == "/admin":
            if not self._is_admin_authorized():
                return
            self.path = "/admin.html"
        return super().do_GET()

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/journals/"):
          self._send_json({"error": "Not found"}, status=404)
          return

        journal_id = parsed.path.rsplit("/", 1)[-1].strip()
        if not JOURNAL_ID_RE.fullmatch(journal_id):
            self._send_json({"error": "Invalid journal id"}, status=400)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0:
            self._send_json({"error": "Missing request body"}, status=400)
            return

        try:
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self._send_json({"error": "Invalid JSON body"}, status=400)
            return

        state = payload.get("state")
        if not isinstance(state, dict) or not isinstance(state.get("pages"), list):
            self._send_json({"error": "Invalid journal state"}, status=400)
            return

        try:
            save_journal_state(journal_id, state)
        except Exception as exc:
            self._send_json({"error": f"journal save failed: {exc}"}, status=500)
            return

        self._send_json({"ok": True, "journal_id": journal_id})

    def log_message(self, format: str, *args) -> None:
        return


def run(host: str = "127.0.0.1", port: int = 8010) -> None:
    init_db()
    with ThreadingHTTPServer((host, port), JournalHandler) as server:
        print(f"Journal app serving at http://{host}:{port}")
        server.serve_forever()


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8010"))
    run(host=host, port=port)
