# Tests für Relentless

Automatische Prüfungen, die im Browser laufen. Es braucht nichts außer Python 3 (auf dem Mac vorhanden).

## Starten

```bash
python3 tests/serve.py
```

Dann im Browser `http://localhost:8765/tests/` öffnen und **Tests starten** klicken. Ein Durchlauf dauert etwa 15 Sekunden.

- `?nur=plan` führt nur Tests aus, deren Datei oder Name zum Suchbegriff passt (z. B. `?nur=storage`, `?nur=Szenario event`).
- `?auto` startet die Tests sofort beim Öffnen.

## Was geprüft wird

| Datei | Inhalt |
|---|---|
| `unit.test.js` | Datum (auch Sommerzeit), Maskierung gegen eingeschleusten Code, TSS, Zonen, Prüfsummen |
| `files.test.js` | Fahrten einlesen (TCX, GPX, ZIP, GZIP) mit von Hand gerechneten Werten, FIT- und ZWO-Export |
| `plan.test.js` | Fünf Planszenarien: Phasen, alle Wochen, Text jeder Seite, Englisch, Wochenwechsel, Saisonende |
| `storage.test.js` | Speichern und Laden, zweiter Tab, voller Speicher, mehrere Pläne, Sicherungsdatei, manipulierte Daten |
| `i18n.test.js` | Englische Übersetzung, Einzahl, Liste der noch fehlenden Übersetzungen |
| `voice.test.js` | Zu jedem gesprochenen Satz gibt es eine abspielbare Datei mit stimmender Dauer |

Die App läuft dabei in einem abgeschotteten Rahmen: eigener Speicher (deine echten Daten bleiben unberührt), angehaltene
Uhr (Mittwoch, 11.11.2026, 9:30), reproduzierbarer Zufall, keine Aufrufe ins Internet, Downloads werden nur mitgeschrieben.

## Vergleichsstände (Snapshots)

Viele Tests vergleichen mit gespeicherten Ständen in `tests/snapshots/`, z. B. den Text jeder Seite. Ändert sich etwas,
zeigt der Test die erste Abweichung.

- **Ungewollte Abweichung:** Fehler im Code, beheben.
- **Gewollte Änderung** (z. B. neuer Text): **Vergleichsstände neu schreiben** klicken und mit `git diff tests/snapshots`
  prüfen, dass sich genau das Gewollte geändert hat. Die Änderung zusammen mit dem Code committen.
