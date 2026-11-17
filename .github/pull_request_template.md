## Was und warum

<!-- Backlog-Nummer(n), z. B. F34 / B11, und ein Satz zum Ziel -->

## Art

- [ ] Neue Funktion (`python3 tools/version.py neu`, Eintrag in `WN_DATA`, Hinweis in `DYK`)
- [ ] Fehlerkorrektur (`python3 tools/version.py fix`, kein Neuigkeiten-Eintrag)
- [ ] Nur Werkzeuge/Doku (keine Versionsänderung)

## Fertig, wenn

- [ ] `python3 tools/check.py` und `node tools/test.mjs` grün (die CI prüft beides)
- [ ] Neue Logik hat Tests, gewollte Textänderungen sind als Vergleichsstand (`tests/snapshots/`) geprüft
- [ ] Deutsch und Englisch (`src/i18n/en.json`), hell und dunkel, 375 pt, Tippflächen ≥ 44 pt, SVG statt Emoji
- [ ] Daten bleiben im Gerät; Sicherungsdatei: neue Felder enthalten, ältere Dateien weiter ladbar
- [ ] Bestehende Pläne werden nur mit Zustimmung geändert (Vorschlag, Schnappschuss, Rückgängig)
- [ ] Bericht in `claude/bericht-…md` (mit Bildschirmfotos, falls sichtbar)

## Auf dem iPhone prüfen (Netlify-Vorschau)

<!-- Was soll die Freigabe in der Vorschau konkret ausprobieren? -->
