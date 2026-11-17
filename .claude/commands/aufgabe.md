---
description: Eine Aufgabe (Prompt aus dem T2R-Projekt oder Backlog-Nummer) auf eigenem Branch umsetzen, prüfen und als Pull Request vorbereiten
argument-hint: <Prompt-Text, Datei oder Backlog-Nummer>
---

Setze diese Aufgabe nach dem Ablauf in `docs/ENTWICKLUNG.md` um:

$ARGUMENTS

1. **Ausgangsstand:** `git switch main && git pull`, dann `python3 tools/check.py`. Ist main nicht grün, zuerst melden.
2. **Branch:** `feature/<nummer>-<kurzname>` für Funktionen, `fix/<kurzname>` für Fehler.
3. **Verstehen vor Bauen:** betroffene Dateien in `src/js/` suchen, bestehende Muster übernehmen. Unklare fachliche
   Entscheidungen (Trainingslogik, Planänderungen) nicht raten: als Frage sammeln und am Ende melden.
4. **Umsetzen** in kleinen Commits (Nachricht: `F34: was sich ändert`). Regeln aus `CLAUDE.md` gelten.
5. **Tests:** neue Logik bekommt Tests in `tests/<thema>.test.js` (in `tests/index.html` eintragen).
   `node tools/test.mjs --nur=<thema>` während der Arbeit, am Ende `node tools/test.mjs` komplett.
   Gewollte Textänderungen: `node tools/test.mjs --neu`, dann `git diff tests/snapshots` prüfen.
6. **Version:** `python3 tools/version.py neu` (neue Funktion, plus `WN_DATA` und `DYK`) oder `fix` (Fehlerkorrektur).
7. **Prüfen:** `python3 tools/check.py --gegen origin/main` und `node tools/test.mjs` müssen grün sein.
8. **Bericht** `claude/bericht-<nummer>-<kurzname>-<JJJJ-MM-TT>.md` nach `docs/vorlagen/bericht.md`.
9. **Pull Request vorbereiten**, aber nicht pushen: Zusammenfassung, offene Fragen und die Zeile
   „Zum Hochladen: ‚Ja, hochladen‘ antworten“ ausgeben. Erst nach dieser Freigabe `git push -u origin <branch>` und
   `gh pr create --fill` (Vorlage `.github/pull_request_template.md`).
