#!/usr/bin/env python3
"""Schnelle Prüfungen vor jedem Commit und in der CI (ohne Browser, wenige Sekunden).

    python3 tools/check.py                      alle Prüfungen
    python3 tools/check.py --gegen origin/main  zusätzlich: Version erhöht, wenn sich die App gegenüber diesem Stand ändert

Geprüft wird:
  1. public/index.html passt zu src/ (wie tools/build.py --check)
  2. Versionsangaben stimmen überall überein (44-version-neuigkeiten.js, 26-statistik-update.js, version.json, sw.js)
  3. Das gebaute Skript ist gültiges JavaScript (node --check), falls Node installiert ist
  4. Keine Funktion ist in zwei Dateien deklariert (alle Dateien teilen sich einen globalen Bereich,
     die spätere Deklaration würde die frühere still ersetzen)
  5. Kein eval / new Function (die CSP der Website verbietet es)
  6. Keine Synchronisationskopien mit Leerzeichen im Namen in src/
  7. Mit --gegen: Ändert sich die App, muss APP_VERSION größer sein als im Vergleichsstand

Rückgabewert 1, wenn eine Prüfung fehlschlägt. Ohne Abhängigkeiten, Python ab 3.7.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import build  # noqa: E402

fehler = []
hinweise = []


def rel(p):
    return os.path.relpath(p, ROOT)


def lies(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def versionen():
    """Alle Versionsangaben aus den Quellen lesen."""
    v = {}
    s = lies('src/js/44-version-neuigkeiten.js')
    m = re.search(r"APP_VERSION\s*=\s*(\d+)\s*,\s*APP_SW\s*=\s*'([^']+)'", s)
    if m:
        v['APP_VERSION'], v['APP_SW'] = int(m.group(1)), m.group(2)
    m = re.search(r"APP_BUILD\s*=\s*'(\d+)'", lies('src/js/26-statistik-update.js'))
    if m:
        v['APP_BUILD'] = m.group(1)
    m = re.search(r"APP_BUILT\s*=\s*'(\d+)'", lies('src/js/26-statistik-update.js'))
    if m:
        v['APP_BUILT'] = m.group(1)
    vj = json.loads(lies('public/version.json'))
    v['version.json:version'], v['version.json:build'] = vj.get('version'), str(vj.get('build'))
    v['version.json:built'] = str(vj['built']) if vj.get('built') is not None else None
    m = re.search(r"const V\s*=\s*'([^']+)'", lies('public/sw.js'))
    if m:
        v['sw.js:V'] = m.group(1)
    return v


def pruefe_build():
    with open(build.OUT, encoding='utf-8', newline='') as f:
        cur = f.read()
    if build.comparable(cur) != build.comparable(build.build()):
        fehler.append('public/index.html passt nicht zu src/ → python3 tools/build.py ausführen und mit committen')


def pruefe_versionen():
    v = versionen()
    fehlt = [k for k in ('APP_VERSION', 'APP_SW', 'APP_BUILD', 'sw.js:V') if k not in v]
    if fehlt:
        fehler.append('Versionsangabe nicht gefunden: ' + ', '.join(fehlt))
        return v
    if v['APP_VERSION'] != v['version.json:version']:
        fehler.append(f"APP_VERSION {v['APP_VERSION']} ≠ public/version.json version {v['version.json:version']}")
    if v['APP_BUILD'] != v['version.json:build']:
        fehler.append(f"APP_BUILD {v['APP_BUILD']} ≠ public/version.json build {v['version.json:build']}")
    if v.get('APP_BUILT') != v.get('version.json:built'):
        fehler.append(f"APP_BUILT {v.get('APP_BUILT')} ≠ public/version.json built {v.get('version.json:built')} → python3 tools/version.py")
    if v['APP_SW'] != v['sw.js:V']:
        fehler.append(f"APP_SW '{v['APP_SW']}' ≠ public/sw.js '{v['sw.js:V']}'")
    return v


def app_skript():
    html = build.build()
    teile = re.findall(r'<script>(.*?)</script>', html, flags=re.S)
    return max(teile, key=len) if teile else ''


def pruefe_syntax():
    node = shutil.which('node')
    if not node:
        hinweise.append('Node nicht gefunden: Syntaxprüfung übersprungen')
        return
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(app_skript())
        tmp = f.name
    try:
        r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
        if r.returncode:
            # Zeilennummer im verbundenen Skript auf Quelldatei zurückführen
            msg = (r.stderr or r.stdout).strip()
            m = re.search(r':(\d+)\n', msg)
            wo = ''
            if m:
                zeile, n = int(m.group(1)), 0
                for p in build.srcFiles(os.path.join('js', '*.js')):
                    k = build.read(p).count('\n') + 1
                    if zeile <= n + k:
                        wo = f' (≈ {rel(p)}, Zeile {zeile - n})'
                        break
                    n += k
            fehler.append('JavaScript-Syntaxfehler' + wo + ':\n    ' + '\n    '.join(msg.splitlines()[-4:]))
    finally:
        os.unlink(tmp)


DEKL = re.compile(r'^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(', re.M)


def pruefe_doppelte_funktionen():
    wo = {}
    for p in build.srcFiles(os.path.join('js', '*.js')):
        for name in DEKL.findall(build.read(p)):
            wo.setdefault(name, []).append(os.path.basename(p))
    for name, dateien in sorted(wo.items()):
        if len(dateien) > 1:
            fehler.append(f'Funktion {name}() mehrfach deklariert: {", ".join(dateien)} (die letzte gewinnt still)')


def pruefe_eval():
    for p in build.srcFiles(os.path.join('js', '*.js')):
        for i, z in enumerate(build.read(p).split('\n'), 1):
            if re.search(r'(?<![\w.$])eval\s*\(|\bnew\s+Function\s*\(', z):
                fehler.append(f'{rel(p)}:{i}: eval/new Function ist durch die CSP verboten')


def pruefe_kopien():
    for p in glob.glob(os.path.join(ROOT, 'src', '**', '* *'), recursive=True):
        hinweise.append(f'Synchronisationskopie (wird nicht gebaut, bitte löschen): {rel(p)}')


def pruefe_gegen(ref, v):
    def git(*a):
        return subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True)
    if git('rev-parse', '--verify', ref + '^{commit}').returncode:
        hinweise.append(f'Vergleichsstand {ref} nicht vorhanden: Versionsprüfung übersprungen')
        return
    geaendert = git('diff', '--name-only', ref, '--', 'src', 'public').stdout.split()
    if not geaendert:
        return
    alt = git('show', f'{ref}:src/js/44-version-neuigkeiten.js').stdout
    m = re.search(r'APP_VERSION\s*=\s*(\d+)', alt)
    if m and v.get('APP_VERSION', 0) <= int(m.group(1)):
        fehler.append(f'App geändert ({len(geaendert)} Dateien), aber APP_VERSION nicht erhöht '
                      f'({v.get("APP_VERSION")} ≤ {m.group(1)} in {ref}) → python3 tools/version.py')


def main():
    pruefe_build()
    v = pruefe_versionen()
    pruefe_syntax()
    pruefe_doppelte_funktionen()
    pruefe_eval()
    pruefe_kopien()
    if '--gegen' in sys.argv:
        pruefe_gegen(sys.argv[sys.argv.index('--gegen') + 1], v)
    for h in hinweise:
        print('Hinweis:', h)
    for f in fehler:
        print('✗', f)
    if fehler:
        print(f'\n✗ {len(fehler)} Prüfung(en) fehlgeschlagen')
        sys.exit(1)
    print(f"✓ Prüfungen bestanden (Version {v.get('APP_VERSION')}, Build {v.get('APP_BUILD')}, {v.get('APP_SW')})")


if __name__ == '__main__':
    main()
