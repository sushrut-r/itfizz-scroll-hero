#!/usr/bin/env python3
"""
Serve the exported site (docs/, or out/) at the ROOT of a port.

The export is built with PAGES_BASE_PATH=/itfizz-scroll-hero for GitHub Pages
project sites, so every asset URL in the HTML carries that prefix. This server
rewrites the prefix away, which means the sandbox preview can open the page at
`/` — no HTML surgery, no rebuild, instant start.

    python3 scripts/serve-root.py docs 3000 [--prefix /itfizz-scroll-hero]

Nothing here changes the deployed files: GitHub Pages keeps serving them with
the prefix; this is only how the preview sandbox reaches them.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import sys

DEFAULT_PREFIX = "/itfizz-scroll-hero"


class RootHandler(http.server.SimpleHTTPRequestHandler):
    """Strips a base path so the export is reachable at `/`."""

    prefix = DEFAULT_PREFIX

    def translate_path(self, path: str) -> str:
        # /itfizz-scroll-hero/_next/x.js  →  ./_next/x.js
        if self.prefix and path.startswith(self.prefix):
            path = path[len(self.prefix) :] or "/"
        return super().translate_path(path)

    def send_head(self):
        # Directory requests should land on index.html, with a trailing slash
        # so the page's relative URLs keep resolving.
        path = self.translate_path(self.path)
        if os.path.isdir(path) and not self.path.endswith("/"):
            self.send_response(301)
            self.send_header("Location", self.path + "/")
            self.end_headers()
            return None
        return super().send_head()

    def log_message(self, fmt: str, *args) -> None:  # quieter logs
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def end_headers(self) -> None:
        # The preview is proxied through a different host; never let a cached
        # 304 hide a rebuild.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("root", nargs="?", default="docs", help="directory to serve (docs/ or out/)")
    ap.add_argument("port", nargs="?", type=int, default=3000)
    ap.add_argument("--prefix", default=DEFAULT_PREFIX, help="base path to strip ('' for none)")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"! {root} does not exist — run the build/export first", file=sys.stderr)
        return 1

    handler = functools.partial(RootHandler, directory=root)
    RootHandler.prefix = args.prefix
    handler = functools.partial(RootHandler, directory=root)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", args.port), handler) as httpd:
        print(f"serving {root} at http://0.0.0.0:{args.port}  (prefix '{args.prefix}' stripped)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
