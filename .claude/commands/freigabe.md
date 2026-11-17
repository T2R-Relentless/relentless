---
description: Nach „Ja, hochladen“ einen geprüften Pull Request auf main übernehmen und die Auslieferung kontrollieren
argument-hint: <Branch oder PR-Nummer>
---

Nur ausführen, wenn die Nutzerin bzw. der Nutzer in diesem Gespräch ausdrücklich „Ja, hochladen“ geschrieben hat.
Sonst abbrechen und nachfragen.

Branch bzw. Pull Request: $ARGUMENTS

1. `gh pr checks` – die CI muss grün sein. Sonst abbrechen und Fehler zeigen.
2. Ist main inzwischen weiter: Branch auf main bringen (`git rebase origin/main`), `python3 tools/check.py --gegen origin/main`
   und `node tools/test.mjs` erneut, Version ggf. neu hochzählen, pushen, CI abwarten.
3. `gh pr merge --squash --delete-branch` (ein Commit je Aufgabe auf main, Nachricht mit Backlog-Nummer und Version).
4. Netlify baut main automatisch. Nach 2–3 Minuten `https://teamrelentlessriders.netlify.app/version.json` abrufen und
   prüfen, dass Version und Build dem neuen Stand entsprechen.
5. Kurz melden: Version, was neu ist, wie man es auf dem iPhone sieht (App ganz schließen und neu öffnen).
   Den Release-Stand für das T2R-Projekt als zwei, drei Zeilen zum Übernehmen ausgeben.
