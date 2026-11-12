# Umsetzung aus dem Audit: M2 (Rennwoche), M1 (Spitzenphase), M7 (Alter und Erholung)

Stand 12.11.2026 · Branch `feature/training-m1-m2-m7` (baut auf `audit/trainingslogik` auf) · Version 176, Build 20261112180000, Service Worker `relentless-v13` · **nicht veröffentlicht, kein Push, kein Merge.**

Grundlage: `claude/bericht-audit-trainingslogik-2026-11-12.md`, Maßnahmen M1, M2 und M7.

## Was sich ändert

### M2 – Rennwoche
- Der Renntag, die Zieltour und A-Events zählen nicht mehr zum Wochenbudget (`fitBudget`). Die Auffrischungseinheiten der Rennwoche bleiben vollständig.
- Ohne Zielzeit setzt die App den Renntag auf die geschätzte Eventdauer statt pauschal auf 8 Stunden (`genWeekCore`).
- Die Prognose der erreichbaren Zeit funktioniert jetzt auch ohne eingetragene Zielzeit (`evTime`). Der falsche Hinweis „Distanz und Höhenmeter fehlen“ entfällt; dadurch erscheint auch „bis zu … Min. schneller ohne mehr Training“ in diesen Fällen.

| Profil | Rennwoche vorher | Rennwoche jetzt |
|---|---|---|
| B (5 Std., Gran Fondo) | Dienstag gestrichen, Wettkampftempo 2×4, Renntag 8:00 Std. | VO2max-Auffrischung 3×3, Wettkampftempo 2×10, Renntag 5:10 Std. |
| D (7 Std., Radmarathon) | Dienstag gestrichen, Wettkampftempo 2×4, Renntag 8:00 Std. | Spritzig 5×1, Wettkampftempo 2×10, Renntag 5:20 Std. |
| C, E | Renntag 8:00 Std. | Renntag 4:15 bzw. 3:20 Std. |

Die Form am Renntag bleibt im Zielbereich (B +8, D +13, vorher +13 und +18; die höheren alten Werte kamen von den gestrichenen Einheiten).

### M1 – Spitzenphase für Rennen im Feld (Typ „wellig mit kurzen Anstiegen“ und „flach“)
- Bisher: jede Woche Rampen 8×1 Min. und Antritte bzw. Sprints, keine Schwellenarbeit.
- Jetzt im Wechsel:
  - rennnahe Woche: Over-Under mit Antritten (30-Sekunden-Antritte, dazwischen knapp unter der Schwelle) plus Rampen 8×1 Min. bzw. Antritte 8×30 Sek.,
  - Woche für die Dauerleistung: VO2max 30/15 plus eine Schwelleneinheit (wechselnde Formen).
- Dein Profil (A): Zeit ab 95 % FTP in der Spitze von 3 % auf 9 % der Wochenzeit, Zeit im Bereich 76–94 % von 10 % auf 13 %. Form am Renntag unverändert +13.
- Andere Eventtypen (alpin, hügelig, Ultra) und Marathons ohne Rennformat bleiben unverändert.

Beispiel Profil A, Wochen 37 bis 45: Test + Schwelle 5×6 · Over-Under mit Antritten + Rampen · 30/15 + Over-Under 3×10 · Entlastung · Over-Under mit Antritten + Rampen · 30/15 + Schwelle 3×12 · Over-Under mit Antritten + Rampen · Entlastung · 30/15 + Schwelle 5×6.

### M7 – Alter und Erholung
- Neues freiwilliges Feld **Geburtsjahr** in der Planung (Schnellplanung Schritt „Wie fit bist du gerade?“, ausführliche Planung Schritt „Dein aktueller Stand“), darunter zwei Einstellungen:
  - **Wochenrhythmus:** 3 Wochen Belastung und 1 Woche Entlastung (wie bisher) oder 2 Wochen Belastung und 1 Woche Entlastung.
  - **Abstand zwischen harten Einheiten:** normal oder mehr Abstand (möglichst zwei lockere Tage dazwischen).
- Ab 50 Jahren schlägt die App 2:1 und mehr Abstand vor und stellt beides ein. Jede und jeder kann es ändern, auch unter 50. Die Karte sagt offen, dass die Studienlage nicht eindeutig ist.
- Ab 50 ohne Krafttraining im Plan: Hinweis, dass Krafttraining dann besonders wertvoll ist.
- Der Rhythmus wirkt überall, wo bisher „jede vierte Woche“ fest eingebaut war: Entlastungswochen, Umfangsrampe (94 % – 100 % – 65 %), Wechsel der Intervallformen, leichte Kraftwoche, Fitness-Checks (bei 2:1 in Woche 4, 10, 16 …, weiterhin nach einer Entlastungswoche), Ausweich-Wochen bei gesperrten Tagen, Erklärtext im Plan-Check.
- Bestehende Pläne bleiben, wie sie sind. Das Geburtsjahr lässt sich nur über „Plan anpassen“ eintragen; die App zeigt dort die Änderung und übernimmt sie erst mit dem Speichern, ab morgen.
- Gespeichert wird im Plan (`birthYear`, bei eigener Wahl `rhythm` und `gap2`), also nur auf dem Gerät, und in der Datensicherung.

Profil D (56 Jahre, 7 Std.): 9 statt 7 Entlastungswochen in 30 Wochen, Fitness am Event 48 (vorher 49), tiefste Form unverändert −17.

## Grenzen und offene Punkte
- **Mehr Abstand** wirkt nur, wenn die Woche es zulässt. Bei Profil D (Di, Do, Fr, Sa, So mit Long Ride am Samstag) bleiben die harten Einheiten auf Dienstag und Donnerstag, weil Freitag und Sonntag neben dem Long Ride liegen. Mit sechs oder sieben möglichen Tagen liegen sie auf Dienstag und Freitag (Test).
- Die Intensität der Einheiten und die Zahl harter Einheiten pro Woche sind für Ältere nicht verändert. Das ist Absicht: Intensität zu erhalten gilt für Masters als wichtig.
- Pulsbereiche werden nicht aus dem Alter geschätzt (Formeln sind individuell zu ungenau).
- Ein Wechsel des Rhythmus mitten im Plan zählt die Wochen weiter ab Planstart; die nächste Entlastungswoche kann dadurch früher oder später kommen.
- Nicht umgesetzt (weiter offen laut Audit): M3 bis M6 und M8 bis M15, darunter der veraltete Hilfetext zu C-Rennen.
- Nicht auf dem iPhone geprüft. Darstellung der neuen Karte bei 375 pt und im dunklen Modus habe ich nicht fotografiert.

## Tests
- 151 von 151 Tests bestehen (142 bisherige, 9 neue in `tests/age.test.js`), `python3 tools/build.py --check` ist grün.
- Vergleichsstände neu geschrieben, Unterschiede geprüft: Rennwochen der Szenarien (Wettkampftempo 2×10 statt 2×4, Renntag mit geschätzter Dauer), Form am Renntag der Saison (+14 statt +25, Hauptevent der Saisonprognose +7 statt +16; beide im Zielbereich +5 bis +25), Versionsnummer.
- 23 neue englische Wörterbucheinträge; die neuen Texte sind auf Deutsch und Englisch geprüft.
- Simulation neu gelaufen: `tools/audit/out/simulation.json` und `tabellen.md` (neuer Stand), `simulation-v175.json` und `tabellen-v175.md` (Stand des Audits).

## Geänderte Dateien
`src/js/05-alter-rhythmus.js` (neu), `05-plan-generator.js`, `03-mobilitaet-kraft.js`, `06-fitness-checks.js`, `11-plan-check-ziel.js`, `15-onboarding.js`, `16-dashboard-woche.js`, `26-statistik-update.js`, `44-version-neuigkeiten.js`, `src/i18n/en.json`, `public/index.html`, `public/sw.js`, `public/version.json`, `tests/age.test.js` (neu), `tests/index.html`, `tests/snapshots/*`, `tools/audit/*`.
