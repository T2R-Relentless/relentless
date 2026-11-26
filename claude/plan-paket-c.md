# Paket C · Ehrlicher Plan – Weg (Planer, 26.11.2026)

Der Nutzer hat alle Empfehlungen aus `claude/entscheidung-2026-11-25.md` angenommen.
Fachregeln stehen in `claude/fachregeln-schwaechen-2026-11.md`, die Aufgaben in `claude/schwaechen-prompts-2026-11-25.md`.
Branch: `feature/f35-ehrlicher-plan`, abgezweigt von origin/main mit Paket A (v223).

## Fertig, wenn
- **Geschätzte Werte:** Ein Plan ohne Eingaben zeigt an allen vier Stellen „geschätzt“: Heute, Einstellungen, Plan-Check, Fortschritt.
- **Woche 1–2:**
  - Keine Phase liegt über 85 %, außer dem Test.
  - Der Test liegt am 1. oder 2. Trainingstag.
  - Bei Einsteigern und beim Wiedereinstieg gibt es in Woche 1 keinen Maximaltest.
- **Plan-Check:** Ohne eigene Zielzeit erscheint nur „Prognose“ mit Spanne.
- **TSS:** Ötztaler mit 205 W ergibt etwa 584 statt 650.
- **Sweet Spot** heißt überall „Sweet Spot“.
- **Ruhetag:** Bei 12 Std. und 7 Tagen bleibt mindestens ein Ruhetag.
- **Altbestand:** Alte Pläne und alte Sicherungen laden ohne Planänderung.

## Ursache bzw. Grundlage
1. **Herkunftsfelder für FTP und Gewicht fehlen.**
   - `15-onboarding.js:18` und `load()` in `03-mobilitaet-kraft.js:139` setzen still 75 kg ein.
   - Eine einzige Ableitungsfunktion bestimmt die Herkunft. `load()`, `importPlans` und `importPlansV1` nutzen sie gemeinsam:
     - übernommener Test oder Fahrten mit Sicherheit ≥ „mittel“ → `gemessen`
     - `ftpKnown` → `eingegeben`
     - sonst → `geschätzt`
   - Ein altes Gewicht von 75 kg zählt als „geschätzt“, mit einem Tipp „Stimmt“.
2. **Zonengrenzen sind an etwa 15 Stellen kopiert** (Fachregeln 6.6).
   - Daraus wird eine Zonentabelle nach Coggan.
   - Sweet Spot bekommt ein eigenes Etikett.

## Reihenfolge
1. **Grundlage:** Herkunftsfelder, Migration und Zonentabelle.
2. **Punkt 2:** Fitnesstest als Standard (Entscheidung 4 B und 5 B) sowie FTP aus Fahrten ab „mittel“ gilt als gemessen (Entscheidung 6).
3. **Punkt 1:** Anzeigen „geschätzt“, Gewicht als Pflichtfeld ab 1.500 hm, Hinweis auf Heute.
4. **Punkt 5, Variante C:** Abschlag d = 0,04 in `evCheck`, `tssSegs` und `paceTxt`.
5. **Zwischenstand:** Blatt für den Nutzer.
6. **Punkte 3 und 4:** zuerst Punkt 3 (Regeln aus Entscheidung 7, Zeitlimit-Feld beim Event), danach Punkt 4 (Entscheidung 8, die Wochenprüfung erst nach Punkt 5).
7. **Punkt 6:** an den übrigen Stellen.
8. **Punkt 7:** Laufende Pläne bekommen nur einen Vorschlag mit Schnappschuss und werden nie selbst gedrosselt.
9. **Punkt 17,** danach **Punkt 13** (Wochenpaket als .fit-ZIP). Beide jeweils als eigener Commit.
10. **Abschluss:**
    - Ein Eintrag in WN_DATA mit Hinweis auf die Formeländerung.
    - Hinweise in „Wusstest du schon?“ mit Anker.
    - Englische Texte.
11. **Version:** erst ganz am Ende, nach einem Rebase auf main, mit `python3 tools/version.py neu`.

## Nicht tun
- Mehr-Menü bauen (nur Skizze).
- Punkt 12 (gehört in Paket B).
- Kalender-Abo.
- `* 2.js`-Kopien anfassen.

## Vorab messen
- Woche 1–2 und Fahrten pro Woche bei 3, 5, 8 und 12 Std. auf main simulieren.
- Ötztaler und Rund um Köln in der App gegen den Python-Nachbau rechnen.

## Grenzen
- Höchstens zwei Korrekturrunden.
- Danach neu planen und 17, 13 und 7 abtrennen.
