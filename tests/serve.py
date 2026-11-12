#!/usr/bin/env python3
"""Lokaler Testserver für Relentless.

Startet einen Webserver im Projektordner (nicht nur public/), damit die Testseite die App laden kann:

    python3 tests/serve.py            # dann http://localhost:8765/tests/ öffnen

Bildschirmfotos für Berichte nimmt er als PUT /claude/bilder/<name>.png entgegen (nur PNG, nur von 127.0.0.1).
Zusätzlich nimmt er Vergleichsstände (Snapshots) der Tests entgegen: PUT /tests/snapshots/<name>.json schreibt die
Datei. Das geht nur von diesem Rechner aus (127.0.0.1) und nur für Dateinamen aus Buchstaben, Ziffern und Bindestrich.
Ohne Abhängigkeiten, Python ab 3.7.
"""
import http.server
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP_DIR = os.path.join(ROOT, 'tests', 'snapshots')
SNAP_RE = re.compile(r'^/tests/snapshots/([a-z0-9-]{1,60})\.json$')
SHOT_DIR = os.path.join(ROOT, 'claude', 'bilder')
SHOT_RE = re.compile(r'^/claude/bilder/([a-z0-9-]{1,80})\.png$')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # Beim Testen immer den aktuellen Stand laden
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_PUT(self):
        shot = SHOT_RE.match(self.path)
        if shot and self.client_address[0] in ('127.0.0.1', '::1'):
            n = int(self.headers.get('Content-Length') or 0)
            body = self.rfile.read(n) if 0 < n <= 20_000_000 else b''
            if not body.startswith(b'\x89PNG'):
                self.send_error(400, 'Kein PNG')
                return
            os.makedirs(SHOT_DIR, exist_ok=True)
            with open(os.path.join(SHOT_DIR, shot.group(1) + '.png'), 'wb') as f:
                f.write(body)
            self.send_response(204)
            self.end_headers()
            return
        m = SNAP_RE.match(self.path)
        if not m or self.client_address[0] not in ('127.0.0.1', '::1'):
            self.send_error(403, 'Nicht erlaubt')
            return
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 20_000_000:
            self.send_error(413, 'Ungültige Größe')
            return
        body = self.rfile.read(n)
        try:
            data = json.loads(body.decode('utf-8'))
        except ValueError:
            self.send_error(400, 'Kein gültiges JSON')
            return
        os.makedirs(SNAP_DIR, exist_ok=True)
        path = os.path.join(SNAP_DIR, m.group(1) + '.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write('\n')
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        if self.command == 'PUT' or (len(args) > 1 and str(args[1])[0] in '45'):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as srv:
        print(f'Relentless-Tests: http://localhost:{PORT}/tests/  (Beenden mit Ctrl+C)', flush=True)
        srv.serve_forever()
