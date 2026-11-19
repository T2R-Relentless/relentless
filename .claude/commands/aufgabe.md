---
description: Aufgabe vollständig mit dem Agenten-Team umsetzen – der Nutzer bekommt am Ende nur eine Entscheidungsvorlage
argument-hint: <Prompt-Text, Datei, Issue-Nummer oder Backlog-Nummer>
---

Du leitest das Agenten-Team (`.claude/agents/`). Ziel: Der Nutzer muss nur noch entscheiden, nicht eingreifen.
Arbeite selbstständig bis zur Entscheidungsvorlage; frag zwischendurch nur bei einer Entscheidung, die sich nicht
rückgängig machen lässt.

Aufgabe: $ARGUMENTS
(Issue-Nummer → `gh issue view <nr> --comments` lesen. Backlog-Nummer ohne Text → nachfragen, den Prompt einzufügen.)

## Ablauf
1. **Start:** `git switch main && git pull`, `python3 tools/check.py`. Branch `feature/<nr>-<kurzname>` bzw. `fix/<kurzname>`.
2. **Weg festlegen:** Agent `planer` mit dem vollen Prompt. Sein Plan bestimmt Reihenfolge, beteiligte Agenten, Prüfunterlagen,
   den frühen Zwischenstand und die Grenzen. Weicht der Ablauf hier davon ab, gilt der Plan. Sieht der Plan einen
   Zwischenstand für den Nutzer vor, ist das der einzige erlaubte Zwischenstand: zeigen, Frage stellen, warten.
3. **Fachlich vorab** – nur wenn Trainingslogik, Zahlen oder Trainingstipps betroffen sind:
   Agent `trainingswissenschaftler`, Auftrag A (Spezifikation). Blockierende Wertungsfragen sammeln, mit Empfehlung
   weiterarbeiten (die Empfehlung umsetzen, die Frage in die Entscheidungsvorlage).
4. **Umsetzen:** Agent `entwickler` mit Prompt, Plan und fachlichen Regeln.
5. **Testen:** Agent `tester` (neue Tests, komplette Suite, Vergleichsstände bewerten).
6. **Prüfen, parallel:** `code-pruefer`; `design-pruefer` bei sichtbaren Änderungen; `trainingswissenschaftler`
   Auftrag B bei Trainingslogik; `bewegungs-pruefer` bei Übungsbildern und -videos.
7. **Korrekturschleife:** Blockierende und wichtige Befunde an `entwickler`/`tester` zurück, danach nur die betroffenen
   Prüfer erneut, nur mit den geänderten Teilen. Vor der dritten Runde den `planer` erneut fragen (mit allen Befunden):
   Oft liegt die Ursache dann tiefer. Höchstens 3 Runden; bleibt etwas offen, kommt es als Risiko in die Vorlage.
8. **Abschluss:** Version (`tools/version.py`), `python3 tools/check.py --gegen origin/main` und `node tools/test.mjs` grün.
   Bericht `claude/bericht-<nr>-<kurzname>-<JJJJ-MM-TT>.md` (Vorlage `docs/vorlagen/bericht.md`, Bilder vom Design-Prüfer).
9. **Entscheidungsvorlage** nach `docs/vorlagen/entscheidung.md` als letzte Ausgabe – nichts weiter davor oder danach.
   Dann warten. Erst bei „Ja, hochladen“: Agent `release-manager` (Push, Pull Request, CI, Vorschau-Adresse).

## Regeln
- Agenten bekommen jeweils den vollen Prompt, den Plan, die fachlichen Regeln und die Befunde der Vorrunde mit.
- Den Nutzer nicht mit Zwischenständen behelligen. Fortschritt nur als kurze Statuszeile.
- Läuft die Aufgabe in der GitHub-Automatik (Issue mit Label `umsetzen` oder `@claude`), gilt das Label bzw. der
  Kommentar des Besitzers als „Ja, hochladen“ für Branch und Pull Request – nie für den Merge auf `main`.
