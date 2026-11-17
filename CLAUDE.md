# Relentless – Regeln für die Arbeit an der App

Trainingsplan-PWA in Vanilla JS. Quellen in `src/`, Build mit `python3 tools/build.py` (erzeugt `public/index.html`).
Ablauf, Namen und „Fertig heißt“: `docs/ENTWICKLUNG.md`. Befehle in Claude Code: `/aufgabe`, `/pruefen`, `/freigabe`.

## Prüfen (vor jedem Commit, die CI prüft dasselbe)
- `python3 tools/check.py --gegen origin/main` – Build aktuell, Versionen gleich, Syntax, doppelte Funktionen, kein eval, Version erhöht (Sekunden)
- `node tools/test.mjs` – alle Browser-Tests ohne Fenster (`--nur=plan` filtert, `--neu` schreibt Vergleichsstände neu)
- Version hochzählen nur mit `python3 tools/version.py fix` (Fehlerkorrektur) bzw. `neu` (neue Funktion)
- Jede Aufgabe auf eigenem Branch (`feature/f34-…`, `fix/…`), nie direkt auf `main`

## Grundregeln
- Keine Neuentwicklung von Grund auf. Bestehendes Design und Funktionen erhalten. Keine Dateien löschen oder unnötig überschreiben.
- Keine größeren Änderungen ohne Zustimmung. Planänderungen für laufende Pläne nur mit Zustimmung der Nutzerin bzw. des Nutzers.
- Kein Push, kein Merge, kein Deployment ohne ausdrückliche Freigabe („Ja, hochladen“).
- Daten bleiben im Gerät.
- Texte auf Deutsch und Englisch (`src/i18n/en.json`), SVG statt Emoji, hell und dunkel, ab 375 pt Breite, Tippflächen mindestens 44 pt.
- Bei jeder ausgelieferten Änderung die Version hochzählen (`APP_VERSION`/`APP_SW` in `src/js/44-version-neuigkeiten.js`, `public/sw.js`, `public/version.json`) – mit `tools/version.py`.
- Alle JS-Dateien teilen einen globalen Bereich: neue Funktionen mit Themen-Präfix benennen, keine vorhandenen Namen neu deklarieren.
- Kein `eval`/`new Function`: Die CSP der Website (netlify.toml) erlaubt kein `'unsafe-eval'`.

## Neue Funktionen
- Für jede neue Funktion einen Hinweis in „Wusstest du schon?“ anlegen (`DYK` in `src/js/28-tipps.js`, mit englischem Text).
  Der Knopf des Hinweises führt direkt zum passenden Feld (Anker über `dykSet`), nicht nur auf die Seite.
- Wird eine Seite durch neue Funktionen deutlich länger, die Seite neu gliedern (Unterseiten oder aufklappbare Abschnitte).

## Neuigkeiten-Fenster („Neu in dieser Version“)
- Neue Funktionen: Eintrag in `WN_DATA` und neue Build-ID (`APP_BUILD` in `src/js/26-statistik-update.js` und `public/version.json`),
  damit Fenster und Update-Hinweis erscheinen.
- Reine Fehlerkorrekturen: kein Eintrag in `WN_DATA` und Build-ID unverändert lassen, also kein Pop-up.
