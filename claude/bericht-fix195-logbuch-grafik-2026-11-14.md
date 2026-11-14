# Version 195 – Logbuch-Grafik und Streckenlinie (Fehlerkorrektur)

Branch `fix/logbuch-grafik`, nur lokal. Kein Push, kein Merge.

## 1. Verlaufsgrafik im Logbuch (`src/js/36-logbuch.js`, `src/css/app.css`)
- Die Pfeile stehen jetzt in einer eigenen Zeile über der Grafik, mit dem angezeigten Zeitraum dazwischen (z. B. „24.08. – 15.11.2026“). Die Grafik hat damit die volle Breite.
- Grafik höher (200 statt 150), Schrift größer, Achse links mit runden Werten und Hilfslinien. Über dem gewählten Balken steht sein Wert.
- Vorjahr: Die Balken sind orange statt blassgrau, mit Legende „aktuell / Vorjahr“. Darunter steht der Vergleich für die gewählte Periode, z. B. „Vorjahr (Nov 2025): 606 km · bisher −65 %“. In der laufenden Woche oder im laufenden Monat heißt es „bisher“.
- Ohne Fahrten im Vorjahreszeitraum erscheint ein Hinweis statt leerer Balken. So war es vermutlich auf dem iPhone: Die Fahrten im Logbuch reichen nicht bis ins Vorjahr zurück.
- Tippen auf einen Balken, Wischen und die Tabelle für Screenreader bleiben erhalten. Die Pfeile haben 44 × 44 pt.

## 2. Streckenlinie (`src/js/27b-strecke.js`)
- Den Schalter „Start und Ziel ausblenden (500 m)“ und die Kürzung (`trkHide`) habe ich entfernt. Die Linie zeigt immer die ganze Fahrt.
- Der DYK-Text „route“ ist angepasst (DE und EN).

## Version
- 195, Service Worker relentless-v32, `version.json` 195.
- Build-ID und `WN_DATA` unverändert, weil es eine Fehlerkorrektur ist. Es gibt also kein Pop-up.

## Tests
- 237 von 237 bestanden.
- Angepasst: `grafik.test.js` (F25 ohne Schalter), `logbook.test.js` (Pfeile, Achse, Vorjahresvergleich, Hinweis ohne Vorjahresdaten), `vo2max.test.js` (Version ≥ 194).
- In den Vergleichsständen `plan-*` hat sich nur die Versionsnummer geändert.

## Bilder
`claude/bilder/fix195-logbuch-hell.png`, `-vorjahr-hell.png`, `-vorjahr-dunkel.png`, `-vorjahr-leer.png` (375 pt).

## Ungeprüft
iPhone mit echten Daten, Netlify-Build.
