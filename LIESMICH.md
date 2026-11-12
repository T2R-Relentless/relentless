# Relentless – Rennrad-Trainingsplan

Web-App (PWA) für Trainingspläne im Rennrad, von Team Relentless Riders. Läuft komplett im Browser, Daten bleiben auf dem
Gerät. Gehostet auf Netlify, nutzbar auch als Claude-Artefakt.

## Ordner

| Ordner | Inhalt |
|---|---|
| `src/` | **Quelltext, hier wird gearbeitet** |
| `src/index.html` | Gerüst der Seite mit Platzhaltern `{{include …}}` |
| `src/js/NN-name.js` | JavaScript in 50 Abschnitten, Reihenfolge nach Nummer (z. B. `05-plan-generator.js`, `25-garmin-connect.js`) |
| `src/css/` | Stylesheets (`app.css` eigenes Design, `tailwind.css` vorab erzeugt, Schrift `geist.css`) |
| `src/i18n/en.json` | Englisches Wörterbuch: `"deutscher Satz": "englischer Satz"`, Platzhalter `{0}`, `{1}` für Zahlen, Daten, Namen |
| `public/` | **Was veröffentlicht wird.** `index.html` wird gebaut, nicht von Hand bearbeiten. Dazu Service Worker, Manifest, Icons, Sprachdateien |
| `netlify/functions/garmin.mjs` | Garmin-Vermittler `/api/garmin` für die Web-App |
| `garmin-relentless/` | Garmin-Erweiterung für Claude Desktop und Claude Code |
| `tools/build.py` | Baut `public/index.html` aus `src/` |
| `tools/tts/generate.py` | Erzeugt fehlende Sprachdateien (Piper) |
| `claude/` | Berichte und Bildschirmfotos |
| `tests/` | Automatische Tests im Browser, siehe `tests/LIESMICH.md` |
| `assets/` | Originale (Logo) |

## Arbeitsablauf

1. In `src/` ändern.
2. Bauen:
   ```bash
   python3 tools/build.py
   ```
3. Testen: `python3 tests/serve.py`, dann `http://localhost:8765/tests/` öffnen und **Tests starten**.
   Die App selbst ist unter `http://localhost:8765/public/` erreichbar.
4. Bei gewollten Textänderungen die Vergleichsstände neu schreiben und mit `git diff tests/snapshots` prüfen.
5. `src/`, `public/index.html` und ggf. `tests/snapshots/` zusammen committen.

`python3 tools/build.py --check` meldet, ob `public/index.html` zum Stand in `src/` passt. Netlify führt den Build beim
Veröffentlichen selbst aus (`netlify.toml`).

## Gut zu wissen

- **Eine Datei für den Browser:** Der Build verbindet alles wieder zu einer einzigen `index.html`. Dadurch funktionieren
  Netlify, das Claude-Artefakt und der Offline-Cache des Service Workers unverändert. Alle JS-Dateien teilen sich einen
  globalen Bereich, Funktionen dürfen sich über Dateigrenzen hinweg aufrufen.
- **Tailwind ist vorab erzeugt** (`src/css/tailwind.css`) und enthält nur die Klassen, die beim Erzeugen benutzt wurden.
  Neue Gestaltung deshalb mit eigenen Regeln in `src/css/app.css` oder vorhandenen Klassen.
- **Neue Version veröffentlichen:** `APP_BUILD`/`APP_VERSION` (`src/js/26-statistik-update.js`, `src/js/44-version-neuigkeiten.js`),
  `public/version.json` und bei Bedarf den Eintrag für „Was ist neu“ (`WN_DATA`, ebenfalls `src/js/44-version-neuigkeiten.js`) anpassen.
  Ändern sich Dateien, die der Service Worker vorhält, die Cache-Version in `public/sw.js` erhöhen.
- **Neue gesprochene Sätze** in den Übungsansagen brauchen neue Sprachdateien. Ablauf: Test „Satzkatalog“ schlägt an →
  Vergleichsstände neu schreiben → `.tools/venv/bin/python tools/tts/generate.py` (erzeugt fehlende Dateien mit Piper und
  aktualisiert das Manifest; Einrichtung von Piper siehe Kopf des Skripts). `--check` prüft nur.
- **Fehlerprotokoll:** Abgefangene Fehler landen auf dem Gerät unter Einstellungen → Sprache, Darstellung, Hilfen →
  Fehlerprotokoll. Nutzer können es kopieren und mitschicken.
