#!/usr/bin/env python3
"""Version an allen Stellen gleichzeitig hochzählen (statt vier Dateien von Hand).

    python3 tools/version.py           zeigt den aktuellen Stand
    python3 tools/version.py fix       Fehlerkorrektur: APP_VERSION +1, Service-Worker-Cache +1, Build-ID bleibt
                                       (kein Neuigkeiten-Fenster, kein Update-Hinweis)
    python3 tools/version.py neu       Neue Funktion: zusätzlich neue Build-ID (Neuigkeiten-Fenster und Update-Hinweis);
                                       den Eintrag in WN_DATA (src/js/44-version-neuigkeiten.js) weiterhin selbst schreiben

Danach baut das Skript public/index.html neu. Stellen: src/js/44-version-neuigkeiten.js (APP_VERSION, APP_SW),
src/js/26-statistik-update.js (APP_BUILD), public/version.json, public/sw.js (Cache-Version V).
Die Build-ID wird als Text verglichen (neuer = größer). Sie wird deshalb nie kleiner als die bisherige, auch wenn die
bisherige in der Zukunft liegt.
"""
import datetime as dt
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F_VER = os.path.join(ROOT, 'src/js/44-version-neuigkeiten.js')
F_BUILD = os.path.join(ROOT, 'src/js/26-statistik-update.js')
F_JSON = os.path.join(ROOT, 'public/version.json')
F_SW = os.path.join(ROOT, 'public/sw.js')
FMT = '%Y%m%d%H%M%S'


def lies(p):
    with open(p, encoding='utf-8', newline='') as f:
        return f.read()


def schreib(p, s):
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s)


def ersetze(p, muster, neu):
    s = lies(p)
    s2, n = re.subn(muster, neu, s, count=1)
    if n != 1:
        raise SystemExit(f'Stelle nicht gefunden in {os.path.relpath(p, ROOT)}: {muster}')
    schreib(p, s2)


def stand():
    s = lies(F_VER)
    m = re.search(r"APP_VERSION\s*=\s*(\d+)\s*,\s*APP_SW\s*=\s*'([^']*?)(\d+)'", s)
    b = re.search(r"APP_BUILD\s*=\s*'(\d+)'", lies(F_BUILD))
    if not m or not b:
        raise SystemExit('Versionsangaben nicht gefunden')
    return int(m.group(1)), m.group(2), int(m.group(3)), b.group(1)


def neue_build_id(alt):
    jetzt = dt.datetime.now().replace(microsecond=0)
    try:
        nach_alt = dt.datetime.strptime(alt, FMT) + dt.timedelta(minutes=1)
    except ValueError:
        nach_alt = jetzt
    return max(jetzt, nach_alt).strftime(FMT)


def main():
    art = sys.argv[1] if len(sys.argv) > 1 else ''
    ver, sw_pre, sw_n, bid = stand()
    if art not in ('fix', 'neu'):
        print(f'Version {ver} · Build {bid} · Service Worker {sw_pre}{sw_n}')
        print('Hochzählen: python3 tools/version.py fix  (Fehlerkorrektur)  |  neu  (neue Funktion)')
        return
    ver2, sw2 = ver + 1, f'{sw_pre}{sw_n + 1}'
    bid2 = neue_build_id(bid) if art == 'neu' else bid
    ersetze(F_VER, r"(APP_VERSION\s*=\s*)\d+(\s*,\s*APP_SW\s*=\s*')[^']*(')", rf"\g<1>{ver2}\g<2>{sw2}\g<3>")
    ersetze(F_SW, r"(const V\s*=\s*')[^']*(')", rf"\g<1>{sw2}\g<2>")
    if bid2 != bid:
        ersetze(F_BUILD, r"(APP_BUILD\s*=\s*')\d+(')", rf"\g<1>{bid2}\g<2>")
    vj = json.loads(lies(F_JSON))
    vj['version'], vj['build'] = ver2, bid2
    schreib(F_JSON, json.dumps(vj, separators=(', ', ': ')))
    print(f'Version {ver} → {ver2} · Service Worker {sw_pre}{sw_n} → {sw2} · Build {bid}' + (f' → {bid2}' if bid2 != bid else ' (unverändert)'))
    if art == 'neu':
        print('Nicht vergessen: Eintrag in WN_DATA (src/js/44-version-neuigkeiten.js) und Hinweis in DYK (src/js/28-tipps.js).')
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build.py')], check=True)


if __name__ == '__main__':
    main()
