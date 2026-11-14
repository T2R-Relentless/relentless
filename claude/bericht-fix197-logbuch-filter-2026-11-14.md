# Version 197 – Filter Geplant/Zusätzlich im Logbuch (Fehlerkorrektur)

Branch `fix/logbuch-filter`, nur lokal.

- Ursache:
  - Der Filter wirkte nur auf die Liste unter der Grafik, nicht auf die Grafik.
  - Fahrten ohne Zuordnung zum Plan (z. B. ältere Garmin-Fahrten ohne Bewertung) fielen bei „Geplant“ und bei „Zusätzlich“ heraus. Deshalb „Keine Fahrten für diesen Filter“.
- Neu (`lbFOk` in `src/js/36-logbuch.js`):
  - „Geplant“ umfasst die Einheiten aus dem Plan, auch Kraft und Mobilität. „Zusätzlich“ umfasst alle übrigen Fahrten, auch die ohne Zuordnung.
  - Derselbe Filter wirkt jetzt auf Liste, Grafik, Kopfzeile und Durchschnitt, ebenso die Auswahl nach Plan.
  - Unter der Grafik steht, wenn ein Filter aktiv ist, z. B. „Gefiltert: nur zusätzliche Fahrten“.
- Andere Stellen, die `lbSums` mit eigenen Optionen aufrufen (z. B. der Vergleich), bleiben ungefiltert.
- Version 197, Service Worker v34. Build-ID und WN unverändert, also kein Pop-up.
- Tests: 240 von 240 bestanden, einer davon neu. In den Vergleichsständen hat sich nur die Version geändert.
- Bild: `claude/bilder/fix197-filter-zusaetzlich.png`.
- Ungeprüft: iPhone mit echten Daten.
