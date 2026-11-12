#!/usr/bin/env python3
"""Audit-Server (nur für die Simulation der Trainingslogik, ändert nichts an der App).

    python3 tools/audit/serve.py      # dann http://localhost:8790/tools/audit/sim.html

Liefert den Projektordner aus und nimmt Ergebnisse als PUT /tools/audit/out/<name>.json entgegen (nur 127.0.0.1).
"""
import http.server, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'tools', 'audit', 'out')
RE = re.compile(r'^/tools/audit/out/([a-z0-9-]{1,60})\.json$')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def do_PUT(self):
        m = RE.match(self.path)
        if not m or self.client_address[0] not in ('127.0.0.1', '::1'): return self.send_error(403)
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 20_000_000: return self.send_error(413)
        data = json.loads(self.rfile.read(n).decode('utf-8'))
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, m.group(1) + '.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        self.send_response(204); self.end_headers()
    def log_message(self, *a): pass

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
