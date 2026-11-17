# Bericht – Bedienkomfort (Version 212, Fehlerkorrektur)

## Eckdaten
- Branch `fix/bedienkomfort`, Version 212, Build unverändert (kein Neuigkeiten-Fenster)
- Prüfungen: `tools/check.py` ✓ · Browser-Tests 307/307 ✓

## Umsetzung
1. **Schnellplanung Schritt 2 kürzer:** Geschlecht, Alter und Erholung stehen eingeklappt unter „Weitere Angaben (optional)“ (`lightMoreUi`, `15-onboarding.js`). Offen, sobald dort etwas eingetragen ist; bleibt beim Antippen offen.
2. **Freie Trainingstage erklärt:** Ruhetag an einem als verfügbar angegebenen Tag zeigt „Du hättest Zeit, der Plan setzt hier bewusst eine Pause. Erholung gehört zum Training.“ (`restWhy`, `17-export-garmin-fit.js`).
3. **Install-Hinweis:** erscheint erst nach der Planerstellung (lag vorher über Karten und Feldern des Assistenten); Schließen-Knopf 44 × 44 pt mit SVG.
4. **SVG statt Textzeichen:** alle sichtbaren ⚠ und ✕ durch `icWarn()`/`icX()` ersetzt (36 Stellen); Schließen-Knöpfe mindestens 44 pt. Englische Texte ohne ⚠-Präfix ergänzt.

## Tests
Vergleichsstände neu geschrieben: nur Wegfall von „✕“ im Text, der neue Ruhetag-Satz (DE/EN) und die Versionsnummer.

## Offen
- Build-Datum „13.12.2026“ in den Einstellungen liegt in der Zukunft; ändert sich erst mit der nächsten neuen Funktion.
- Seiten mit vielen echten Fahrten (Logbuch, Leistungsprofil) nicht geprüft.
