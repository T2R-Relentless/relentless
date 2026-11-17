---
description: Alle Prüfungen und Tests laufen lassen und Fehler erklären
argument-hint: "[Testfilter, z. B. plan]"
---

1. `python3 tools/check.py --gegen origin/main`
2. `node tools/test.mjs` (mit `--nur=$ARGUMENTS`, wenn ein Filter angegeben ist)

Fehlschläge einzeln erklären: Ursache in `src/`, ob gewollt (dann Vergleichsstand neu schreiben und Diff zeigen) oder
Fehler (dann Vorschlag zur Behebung). Nichts committen, ohne zu fragen.
