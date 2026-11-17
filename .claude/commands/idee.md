---
description: Aus einer Idee in Alltagssprache eine umsetzungsreife Aufgabe machen (Backlog-Eintrag + Prompt nach Vorlage)
argument-hint: <Idee oder Fehlerbeschreibung, gern mit Screenshot>
---

Idee: $ARGUMENTS

1. Nächste freie Nummer bestimmen (`F` Funktion, `B` Fehler): höchste Nummer aus `git log --oneline` und
   `gh issue list --state all` (falls `gh` vorhanden) + 1.
2. Im Code nachsehen, was es schon gibt und welche Stellen betroffen wären (kurz, mit Dateinamen).
3. Betrifft es Trainingslogik oder Trainingsinhalte: Agent `trainingswissenschaftler`, Auftrag A.
4. Prompt nach `docs/vorlagen/prompt.md` schreiben: konkrete, überprüfbare Soll-Punkte; offene Wertungsfragen mit
   Optionen und Empfehlung unter „Bereits entschieden“ (als Vorschlag markiert).
5. Ist `gh` vorhanden: als Issue anlegen (`gh issue create --title "<Nr>: <Titel>" --body-file <datei>` mit Label `aufgabe`)
   und die Adresse ausgeben. Sonst den Prompt ausgeben.

Am Ende nur: Nummer, Titel, Aufwand (klein/mittel/groß), die Entscheidungsfragen mit Empfehlung, und
„Zum Starten: Label `umsetzen` setzen bzw. `/aufgabe <Nr>`“.
