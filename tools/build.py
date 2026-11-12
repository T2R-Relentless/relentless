#!/usr/bin/env python3
"""Baut public/index.html aus den Quelldateien in src/.

Die App wird weiterhin als eine einzige HTML-Datei ausgeliefert (Netlify, Claude-Artefakt, Offline-Cache des Service
Workers bleiben unverändert). Bearbeitet wird aber in src/:

    src/index.html      Gerüst mit Platzhaltern {{include …}}
    src/css/*.css       Stylesheets
    src/js/NN-*.js      JavaScript, nach Nummer in dieser Reihenfolge zu einem Skript verbunden
    src/i18n/en.json    Englisches Wörterbuch (wird beim Bauen komprimiert eingebettet)

Aufruf:
    python3 tools/build.py          baut public/index.html
    python3 tools/build.py --check  prüft nur, ob public/index.html zum Stand in src/ passt (Rückgabewert 1, wenn nicht)

Regeln: Ein Platzhalter wird durch den Dateiinhalt ersetzt, ohne den einen Zeilenumbruch am Dateiende. Ein Platzhalter mit
Stern (js/*.js) verbindet alle passenden Dateien, sortiert nach Namen, mit je einem Zeilenumbruch dazwischen.
Ohne Abhängigkeiten, Python ab 3.7.
"""
import base64
import glob
import gzip
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'public', 'index.html')
INC = re.compile(r'\{\{include ([^}\s]+)\}\}')



def srcFiles(spec):
    """Quelldateien zu einem Muster, nach Name sortiert. Dateien mit Leerzeichen im Namen werden übersprungen: Das sind
    Kopien, die z. B. iCloud Drive bei Synchronisationskonflikten anlegt („08-belastung 2.js“). Die echten Quelldateien
    haben nie Leerzeichen im Namen."""
    out = []
    for f in sorted(glob.glob(os.path.join(SRC, spec))):
        if ' ' in os.path.basename(f):
            print('übersprungen (Leerzeichen im Namen, vermutlich Synchronisationskopie):', os.path.relpath(f, ROOT), file=sys.stderr)
            continue
        out.append(f)
    return out

def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        s = f.read()
    return s[:-1] if s.endswith('\n') else s


def i18n_blob(path):
    """Wörterbuch prüfen, kompakt serialisieren und reproduzierbar gzip-komprimieren (feste Zeit, keine Dateiname)."""
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in data.items()):
        raise SystemExit(f'{path}: muss ein Objekt aus Text-Paaren sein ("deutsch": "english")')
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=9, mtime=0, filename='') as g:
        g.write(raw)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def include(spec):
    if spec.endswith('.json.gz.b64'):
        return i18n_blob(os.path.join(SRC, spec[:-len('.gz.b64')]))
    if '*' in spec:
        files = srcFiles(spec)
        if not files:
            raise SystemExit(f'Keine Dateien für {spec}')
        return '\n'.join(read(f) for f in files)
    path = os.path.join(SRC, spec)
    if not os.path.isfile(path):
        raise SystemExit(f'Datei fehlt: src/{spec}')
    return read(path)


def build():
    tpl = read(os.path.join(SRC, 'index.html')) + '\n'
    return INC.sub(lambda m: include(m.group(1)), tpl)


def main():
    html = build()
    if '--check' in sys.argv:
        with open(OUT, encoding='utf-8', newline='') as f:
            cur = f.read()
        if cur != html:
            print('public/index.html passt nicht zu src/. Bitte "python3 tools/build.py" ausführen.')
            sys.exit(1)
        print('public/index.html ist aktuell.')
        return
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    js = srcFiles(os.path.join('js', '*.js'))
    print(f'public/index.html gebaut: {len(html.encode("utf-8")):,} Bytes aus {len(js)} JS-Dateien.'.replace(',', '.'))


if __name__ == '__main__':
    main()
