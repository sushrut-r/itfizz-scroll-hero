#!/usr/bin/env python3
"""
Local preview server for the production export.

GitHub Pages serves a *project* site from https://<user>.github.io/<repo>/, so the
exported HTML references absolute asset paths like /itfizz-scroll-hero/_next/...
Serving `docs/` at the web root would 404 on every asset.

This server serves `docs/` at BOTH:
    http://localhost:<port>/                      ← convenient root preview
    http://localhost:<port>/<repo-name>/          ← exactly how Pages serves it

Usage:
    python3 scripts/preview-server.py [port] [--dir docs]
"""

import argparse
import http.server
import os
import socketserver
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPO = "itfizz-scroll-hero"


class ProjectSiteHandler(http.server.SimpleHTTPRequestHandler):
    """Strips the /<repo> prefix so the same files resolve at the root too."""

    repo_prefix = f"/{DEFAULT_REPO}"

    def translate_path(self, path: str) -> str:
        if path == self.repo_prefix or path.startswith(self.repo_prefix + "/"):
            path = path[len(self.repo_prefix):] or "/"
        return super().translate_path(path)

    def end_headers(self) -> None:
        # keep the preview embeddable and avoid stale assets while iterating
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # quieter logs
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", type=int, default=4100)
    parser.add_argument("--dir", default="docs", help="folder to serve (default: docs)")
    parser.add_argument("--repo", default=DEFAULT_REPO, help="sub-path to mirror")
    args = parser.parse_args()

    directory = (ROOT / args.dir).resolve()
    if not (directory / "index.html").exists():
        raise SystemExit(
            f"✗ {directory}/index.html not found — run `npm run deploy:gh` (or `npm run build`) first."
        )

    ProjectSiteHandler.repo_prefix = f"/{args.repo}"
    handler = partial(ProjectSiteHandler, directory=str(directory))

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", args.port), handler) as httpd:
        print(f"▸ serving {os.path.relpath(directory, ROOT)}/ on http://localhost:{args.port}/")
        print(f"  also reachable at http://localhost:{args.port}/{args.repo}/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
