# Audit der Trainingsplan-Logik gegen die aktuelle Trainingslehre

Stand 12.11.2026 · Branch `audit/trainingslogik` (abgezweigt von `feature/sammel-2026-11-11`, Version 175) · **Phase 1: reines Audit. Am Code der App wurde nichts geändert, nichts veröffentlicht.**

Hinweise zum Ausgangsstand:

- `claude/backlog.md` und `claude/release-status.md` gibt es im Projekt nicht. Gelesen wurden `claude/bericht-sammel-2026-11-11.md` und `claude/bericht-f19-karte-machbarkeit.md`. Der Sammel-Prompt (inklusive B6) ist abgeschlossen; geprüft wurde der Stand danach.
- Die Simulation liegt in `tools/audit/` (`sim.html`, `sim.js`, `serve.py`, `auswertung.py`, Ergebnisse in `tools/audit/out/`). Sie lädt die unveränderte `public/index.html` in einen abgeschotteten Rahmen und ruft deren eigene Funktionen auf (`genWeek`, `phases`, `strOf`, `planCheck`, `seasonForecast`).
- Nicht geprüft: das Verhalten auf dem Gerät. Alle Aussagen stammen aus dem Code und aus der Simulation.

---

## 1. Zusammenfassung: die fünf wichtigsten Befunde

Vorweg: Das Grundgerüst ist solide. Die App plant Phasen, Entlastungswochen, ein Tapering mit erhaltener Intensität, legt harte Tage nie direkt hintereinander, hat regelmäßige Leistungstests, eine Abfrage des Befindens, Morgenwerte (Ruhepuls, HRV) und ein durchdachtes Krafttraining. Die Form am Renntag lag in allen Simulationen im Zielbereich (+6 bis +21). Die Befunde unten betreffen vor allem die **Inhalte und die Steigerung** über die Wochen.

**1. In den letzten zwei Monaten vor einem flachen oder welligen Rennen fehlt das Training der Dauerleistung.**
Für dein Rennen (76 km, etwa 2 Stunden) plant die App in der Spitzenphase neun Wochen lang nur sehr kurze Belastungen: 8 × 1 Minute, 8 × 30 Sekunden oder Sprints von 12 Sekunden. Einheiten an der Schwelle (FTP, die Leistung, die du etwa eine Stunde halten kannst) oder VO2max-Intervalle (3 bis 8 Minuten hart) kommen in dieser Zeit nicht mehr vor. Ein zweistündiges Rennen wird aber überwiegend mit hoher Dauerleistung gefahren, die Antritte kommen obendrauf. Die Trainingslehre verlangt in dieser Phase beides: rennnahe Antritte **und** den Erhalt der Schwellenleistung.

**2. Die Einheiten werden über die Wochen nicht schwerer.**
Im Aufbau fährst du 18 Wochen lang jede Woche dieselbe VO2max-Einheit (30/15-Intervalle, 3 Serien) und dazu wechselnde Sweet-Spot-Einheiten (Sweet Spot: knapp unter der Schwelle), immer mit 36 bis 45 Minuten Belastungszeit. Die App wechselt die Form, aber nicht die Dosis. Fortschritt entsteht jedoch durch allmähliche Steigerung (zum Beispiel 3 × 12 → 2 × 20 → 3 × 20 Minuten). Dazu passt: Die Phasen werden starr nach Prozenten verteilt. Bei 47 Wochen bis zum Rennen ergibt das 18 Wochen Basis und 18 Wochen Aufbau ohne inhaltliche Gliederung.

**3. Bei wenig Zeit ist der Plan zu locker und nutzt das Budget nicht aus.**
Im Winter mit 5 Stunden pro Woche plant die App nur eine intensive Einheit; die rechnerische Fitness fällt in der Simulation von 45 auf etwa 30 und erholt sich erst im Sommer. Die Forschung sagt: Wer wenig Zeit hat, braucht einen höheren Anteil intensiver Einheiten (zwei pro Woche sind gut verträglich). Außerdem ist der „Long Ride“ im Winter nur 45 bis 60 Minuten lang, während die normale Grundlagenfahrt am Vortag 2 Stunden dauert. Wer nur am Wochenende fahren kann (Profil E, 4 Stunden), bekommt nur 2,3 Stunden Training pro Woche geplant, also gut die Hälfte des Budgets.

**4. In der Rennwoche können Einheiten ungewollt gestrichen werden.**
Der Renntag zählt mit seiner vollen Dauer zum Wochenbudget. Ist das Rennen länger als das Budget (5 Stunden Budget, Radmarathon mit über 5 Stunden), streicht die App die Auffrischungseinheiten der Rennwoche fast vollständig. Ist keine Zielzeit eingetragen, rechnet die App den Renntag außerdem pauschal mit 8 Stunden. In der Simulation traf das vier von fünf Profilen (alle ohne Zielzeit).

**5. Die App kennt weder dein Alter noch längere Pausen, und sie warnt nicht bei anhaltender Überlastung.**
Es gibt kein Altersfeld; ein 55-Jähriger bekommt denselben Rhythmus (drei Belastungswochen, eine Entlastungswoche) wie ein 30-Jähriger, obwohl ältere Sportler meist mehr Erholung brauchen. Nach Krankheit passt die App nur die nächsten zwei Tage an. Nach zwei Wochen Pause (Urlaub, Infekt) läuft der Plan weiter, als wäre nichts gewesen. Bleibt die Form über Wochen stark negativ, gibt es keinen Hinweis. Ein allgemeiner Gesundheitshinweis vor dem ersten Plan fehlt.

Weitere Befunde mittlerer Bedeutung: Die Belastungsrechnung (TSS) überschätzt harte Einheiten um etwa 10 bis 15 %, ohne Leistungsmesser wird jede Fahrt gleich bewertet; Training der Ermüdungsresistenz („Durability“: Leistung am Ende langer Fahrten) fehlt; es gibt keine Anpassung an Hitze; Krafttraining liegt bei 13 bis 17 Einheiten pro Saison am selben Tag wie eine harte Radeinheit, ohne Hinweis zur Reihenfolge.

---

## 2. Logik-Landkarte: Regeln der Planung mit Fundstelle und Parametern

Dateien unter `src/js/`. „Z.“ = Zeile.

### 2.1 Planerzeugung

| Regel | Fundstelle | Parameter |
|---|---|---|
| Plandauer | `phases1`, 05-plan-generator.js Z. 6 | Wochen von Start bis Event, mindestens 2, höchstens 52 |
| Phasen (ein Event) | `phases1` | Tapering 2 Wochen ab 8 Wochen Plandauer, sonst 1. Rest: Basis 40 %, Spitze 20 %, Aufbau der Rest (Fitnessziel: Basis 50 %, keine Spitze) |
| Phasen (mehrere A-Events) | `phases`, `seasonA`, Z. 24–51 | Nach jedem A-Event 1 Woche Regeneration. Abstand ab 7 Wochen: Wiederaufbau, Spitze (30 %), Tapering (2 Wochen ab 8 Wochen Rest). Darunter: „Form halten“ und 1 Woche Tapering |
| Entlastungswoche | `genWeekCore` Z. 179 | jede 4. Woche (`w % 4 === 0`), zusätzlich manuell (`recW`), nie im Tapering. Unabhängig von Alter, Niveau und Phasengrenzen |
| Wochenumfang (Rampe) | Z. 180 | Faktor 0,88 / 0,94 / 1,0 / 0,65 je Woche im 4er-Block; Tapering 0,65 und 0,40 (2 Wochen) bzw. 0,5 (1 Woche) |
| Einstieg mit weniger Umfang | Z. 180 | mit bisherigem Umfang `startH`: +8 % pro Woche bis zum Budget; Long Ride ab bisher längster Fahrt +12 % pro Woche |
| Skalierung der Dauern | Z. 180–181 | `f = clamp(Stunden / 8; 0,6; 1,4) × Rampe`, Einheiten auf 15 Min. gerundet, mindestens 45 Min. |
| Long Ride | Z. 183–184 | Event: Basis 55 %, Aufbau 80 %, Spitze 100 % von `lbP`; `lbP` = 80 % der Eventdauer, 3 bis 6 Std. Dann × `f`. Obergrenze 6:30 Std. (Ultra 8 Std.). Spitze: „Eventsimulation“ |
| Eventtyp | `evProfile`, Z. 111–138 | aus Höhenmetern pro km (unter 5 flach, 5–10 wellig bzw. „punch“ bei Rennen, 10–18 hügelig, ab 18 alpin), mit GPX aus erkannten Anstiegen; ab 12 Std. Ultra |
| Harte Einheiten je Typ und Phase | `HE`, Z. 216–218 | Basis: Sweet Spot. Aufbau: alpin Schwelle + VO2max, hügelig VO2max + Sweet Spot, punch/flach 30/15 + Sweet Spot, Ultra Sweet Spot 2×30 + Tempo. Spitze: alpin lange Schwelle + VO2max, hügelig VO2max + Schwelle, punch (Rennen) Rampen 8×1 + Antritte 8×30 Sek., flach (Rennen) Antritte + 30/15. Tapering: VO2max-Auffrischung 3×3 + Wettkampftempo 2×10 |
| Anzahl harter Einheiten | Z. 237 | 2 pro Woche; nur 1 unter 5 Std. Budget oder beim Ziel „Gesundheit“; Entlastungswoche: 1 Auffrischung. Option „Intensität statt Umfang“ (`intF`): mindestens 2, im Aufbau und in der Spitze eine dritte kurze ab 4 Trainingstagen |
| Varianten-Rotation | `VAR`, `vPick`, Z. 207–215 | Sweet Spot 5, Schwelle 6, VO2max 6 Varianten, Wechsel nach Belastungswoche. 30/15, Rampen und Tempo haben keine Varianten. **Keine Steigerung der Belastungszeit** |
| Intervallformate | Z. 185–206 | Sweet Spot 3×12 @ 88–94 %; Schwelle 2×20 @ 95–105 %; VO2max 5×4 @ 106–120 %, 4×8 @ 100–110 %; 30/15: 3×13 @ 115–125 %; Rampen 8×1 Min. @ 120–135 %; Antritte 8×30 Sek.; Sprints 3×3×12 Sek.; Over-Under 3×(4×1 Min. über / 2 Min. unter) |
| Verteilung auf Tage | Z. 275–290 | 1. Long Ride am Wunschtag. 2. Harte Einheiten auf Tage ohne Schlüsseleinheit davor und danach. 3. Rekom-Fahrt am Tag nach dem Long Ride. 4. Rest mit Grundlage auffüllen (45–120 Min.) bis zum Wochenziel |
| Grundlagen-Varianten | `BV`, Z. 241–248 | Trittfrequenz 5×2 Min. @ 105–115 U/min, Fahrtechnik, Sprints 2×3×10 Sek., neue Strecke; Rotation |
| Rennwoche | Z. 295–300 | Eventtag = Zielzeit (ohne Zielzeit 480 Min.), Vortag 30 Min. Aktivierung mit 3×1 Min., danach Ruhe |
| Wochenbudget | `fitBudget`, Z. 307–321 | kürzt Grundlage, Rekom, Long Ride, zuletzt harte Einheiten, bis die Summe ins Budget passt. Der Eventtag zählt mit |
| Zwischenevents | `applySubs`, 08-zwischenevents.js Z. 11–33 | A: Tapering der Phase, danach 6 Tage locker. B: 2–3 Tage Mini-Tapering, 1–2 Tage Erholung. C: kein Tapering (Hilfetext sagt noch „Tag davor locker“). Rennen ab 90 Min. ersetzt den Long Ride |
| Zeitbudget nach Jahreszeit (F6/B6) | `tbApply`, 41-zeit-jahreszeit.js Z. 34–40 | je Woche Stunden, Tage und Long-Ride-Tag aus dem Monatsprofil (Monat der Wochenmitte). Kein Übergang zwischen den Profilen |
| Zyklus | `applyCyc`, 15-onboarding.js Z. 205–223 | harte Einheit aus selbst angegebenen Beschwerdetagen auf einen anderen Tag derselben Woche; Umfang unverändert |

### 2.2 Belastung, Form, Prognose

| Regel | Fundstelle | Parameter |
|---|---|---|
| Geplante Belastung (TSS) | `tss`, 08-zwischenevents.js Z. 115; `TYPES`, 01-daten-zustand.js | Minuten/60 × IF² × 100 mit festem IF je Typ über die **ganze** Dauer: Rekom/Pendeln 0,55, Grundlage 0,66, Long Ride 0,70, Sweet Spot 0,89, Schwelle 0,96, VO2max 1,0, Rennen 0,85, Test 0,88 |
| Belastung gefahrener Fahrten | 12-fahrten-hochladen.js Z. 110 | mit Leistung: NP/FTP. Ohne Leistung: **fester IF 0,65**, unabhängig von Puls oder Empfinden |
| Form | `vzRows`, 27-grafiken.js Z. 152–161 | CTL 42 Tage, ATL 7 Tage, TSB = CTL − ATL des Vortags; Startwert aus dem Mittel der ersten 28 Tage |
| Renntag-Hinweis | `vzRaceHint`, 27-grafiken.js Z. 166 | Hinweis bei Form unter 0, über +30 oder Fitness unter 85 % des Saisonhöchstwerts |
| FTP-Prognose | `ftpProj`, 11-plan-check-ziel.js Z. 22–28 | möglicher Zuwachs G = clamp(1,5 × Stunden; 4; 20) % × Niveaufaktor (unter 2,5 W/kg 1,4; bis 3,2: 1,0; bis 4,0: 0,7; bis 4,5: 0,5; darüber 0,35); Verlauf 1 − e^(−Wochen/12); Spanne ±40 % |
| Zielzeit | `evCheck`, `courseTime`, 10-streckenprofil.js Z. 80–112 | Leistungsbilanz (Martin et al. 1998): Crr 0,004, CdA 0,36 × (kg/75)^0,312, Windschatten-Faktor Solo 1 / Gruppe 0,7 / Peloton 0,5, 10 kg Rad und Ausrüstung; haltbare Intensität IF(T) = 1 − 0,10 × ln(Stunden) |
| Renntag-Hebel | `LEV`, 11-plan-check-ziel.js Z. 37–42 | Verpflegung +1,5 bis +3 %, Pacing +1,5 %, Koffein +2 % auf die Dauerleistung |
| Empfohlener Umfang | `hRec`, Z. 29–32 | Event bis 3 Std.: 5–8 Std./Woche; bis 6 Std.: 7–10; darüber 9–13; Ultra 10–15 |

### 2.3 Testen, Rückmeldung, Anpassung

| Regel | Fundstelle | Parameter |
|---|---|---|
| Fitness-Checks | `testWeeks`, `placeTest`, 06-fitness-checks.js | ab 9 Wochen Plandauer in Woche 5, 13, 21 … (alle 8 Wochen, nach der Entlastungswoche), nicht im Tapering. 20-Min-Test × 0,95, Rampentest × 0,75 oder direkter Wert; ersetzt eine harte Einheit. Ohne Leistungsmesser: 30-Min-Test für den Schwellenpuls |
| Bewertung des Tests | `expAt`, `saveTest` | Vergleich mit Prognose-Korridor ±2 %; Übernahme nur nach Zustimmung; „unter Korridor“: Erholungswoche oder Wiederholung anbieten |
| FTP aus Fahrten | `anaCalc`, 14-ftp-wattmesser.js Z. 74; `cpModel`, `hrFtp`, `ftpCalc`, 19-leistungsanalyse.js | Critical Power / 1,06, 20-Min-Bestwert × 0,95, Hochrechnung aus Puls; mit Angabe der Sicherheit |
| Bewertung der Fahrt | `exeEval`, `exeAdapt`, 13-fahrt-bewertung.js Z. 92–175 | „unter Soll“: nächste harte Einheit −25 %; zweimal in 14 Tagen: Erholungswoche oder FTP −3 % vorschlagen. Zwei harte Einheiten deutlich über Soll in 21 Tagen: höheren FTP vorschlagen |
| Befinden | `feelPlan`, `feelDay`, 22-einstellungen-befinden-pendeln.js Z. 106–180 | müde: ein Intervall weniger; platt: 60 Min. locker statt hart, Folgetag locker; leicht erkältet: Rekom; krank: Ruhetag, danach 2 lockere Tage, Test frühestens nach 7 Tagen. Nur innerhalb der laufenden Woche |
| Morgenwerte | `morStat`, `morHint`, 19-leistungsanalyse.js Z. 149–187 | Ruhepuls ab +5 über dem eigenen Mittel, HRV-7-Tage-Schnitt unter Mittel − 0,5 SD, schlechter Schlaf → Vorschlag „heute locker“ vor harter Einheit |
| Zusatzfahrten und Verschieben (F4/F9) | `paCheck`, 40-anpassung-zustimmung.js Z. 10–18; `mvCheck`, 37-einheit-verschieben.js | Warnung bei zwei harten Tagen in Folge (hart = Sweet Spot, Schwelle, VO2max, Long Ride, Rennen), beim Wegfall des letzten Ruhetags, bei mehr als 110 % des Budgets, bei Regen oder Kälte. Geprüft wird nur Montag bis Sonntag, **nicht über die Wochengrenze** |
| Varianten (F10) | `vaStim`, `vaEq`, 39-varianten.js | Tausch gegen eine Einheit mit gleichem Reiz (Zone und Belastungszeit) |
| Kraft (F11) | `strOf`, `strSession`, 03-mobilitaet-kraft.js Z. 88–108 | Woche 1–4 Technik (außer „erfahren“), Basis Maximalkraft 3–4 × 6–8, Aufbau 3 × 6–8, Spitze und Entlastung 1 × pro Woche (Erhaltung 2 × 5–6), Tapering keine. Tageswahl per Punktwert: nie am Tag vor einer harten Einheit, bevorzugt am Tag danach; mindestens 2 Tage Abstand |
| Wetter | `wxDay`, 23-wetter-kleidung.js | Kleidungsempfehlung, Hinweis auf die Rolle bei Nässe und Frost. Keine Regel für Hitze |

---

## 3. Simulationsergebnisse

### 3.1 Methode und Annahmen

- Stichtag 12.11.2026. Pläne wie über die Planung angelegt, dann jede Woche mit `genWeek` erzeugt.
- **Zwei Belastungswerte:** „TSS App“ ist die Rechnung der App. „TSS Struktur“ ist eine eigene Schätzung aus dem Aufbau jeder Einheit (Einfahren 60 %, Pausen 50 %, Belastungsphasen in der Mitte des Zielbereichs, Normalized Power als 4.-Potenz-Mittel). Beide sind Näherungen.
- **Zonen:** Z1–2 bis 75 % FTP, Z3/Sweet Spot 76–94 %, Z4+ ab 95 %. Gezählt wird Zeit im Bereich inklusive Ein- und Ausfahren. Long Rides mit Tempoanteilen: 25 % der Zeit (höchstens 60 Min.) in Z3 (Annahme).
- **Form:** CTL/ATL wie in der App, mit „TSS Struktur“. Der Startwert der Fitness ist eine Annahme je Profil (A 45, B 20, C 75, D 40, E 22). Er verschiebt die Kurve am Anfang, nicht die Befunde.
- **Profil A:** Dein tatsächliches Winter- und Sommerbudget kenne ich nicht. Angenommen: Winter (November bis März) 5 Std., Sommer 8 Std., je 4 Tage (Di, Do, Sa, So), 450 Höhenmeter, Rennen im Feld, Kraft 2 × pro Woche. Mit 450 hm stuft die App das Rennen als „wellig mit kurzen Anstiegen“ ein; unter 380 hm wäre es „flach“ (Spitze dann: Antritte + 30/15).
- Die Profile B bis E haben keine Zielzeit. Dadurch setzt die App den Renntag auf 8 Stunden (siehe Befund 5).

### 3.2 Überblick

| Kennzahl | A Nutzer | B Einsteiger | C Ambitioniert | D Masters | E Wochenende |
|---|--:|--:|--:|--:|--:|
| Wochen / Phasen (Basis–Aufbau–Spitze–Taper) | 47 / 18–18–9–2 | 25 / 9–9–5–2 | 42 / zwei Höhepunkte | 30 / 11–11–6–2 | 13 / 4–5–2–2 |
| Budget (Std.) | 5 / 8 | 5 | 12 | 7 | 4 |
| Geplant in Belastungswochen (Std., % vom Budget) | 4,5 / 6,6 (87 %) | 4,7 (94 %) | 10,4 (88 %) | 6,5 (94 %) | 2,4 (62 %) |
| Verteilung Z1–2 / Z3 / Z4+ (ohne Taper) | 84 / 12 / 4 | 77 / 15 / 8 | 87 / 10 / 3 | 82 / 13 / 5 | 73 / 16 / 11 |
| Harte Tage pro Woche: Basis / Aufbau / Spitze | 1 / 2 / 2 | 1 / 2 / 2 | 1 / 2 / 2 | 1 / 2 / 2 | 1 / 1 / 1 |
| Längste Einheit (ohne Renntag) | 3:00 | 2:45 | 5:00 | 3:45 | 1:45 |
| Erwartete Eventdauer | 1:50–2:00 | 5:10 | 4:15 | 5:20 | 3:20 |
| Höchster CTL-Anstieg pro Woche (ohne Rennwoche) | +3,2 | +2,2 | +3,7 | etwa +2 | +1,0 |
| Entlastungswoche: Umfang / TSS | −28 % / −34 % | −33 % / −40 % | −28 % / −34 % | −33 % / −39 % | −34 % / −38 % |
| Tiefste Form (TSB) im Plan | −20 | −13 | −24 | −17 | −12 |
| Form am Hauptevent | +13 | +13 | +21 (A-Event davor +20) | +18 | +7 |
| Fitness am Event / Höchstwert davor | 47 / 51 | 35 / 37 | 66 / 72 | 43 / 48 | 20 / 21 |
| TSS App gegenüber Struktur (Belastungswochen) | +11 bis +13 % | +12 bis +15 % | +7 bis +9 % | +11 bis +13 % | +12 bis +21 % |
| Harte Tage direkt hintereinander | 0 | 0 | 0 | 0 | 0 |
| Kraft am selben Tag wie harte Radeinheit | 13 von 72 | 0 von 23 | 17 von 61 | 9 von 45 | – |
| FTP-Prognose bis zum Event | 305 → 322 W (+5,6 %) | 165 → 178 W (+7,9 %) | 294 → 315 W (+7,1 %) | 234 → 253 W (+8,1 %) | 210 → 216 W (+2,9 %) |

„Fitness am Event“ ist der Wert am Morgen des Renntags vor dem Rennen, „Höchstwert“ der höchste Wochenendwert davor.

### 3.3 Auffälligkeiten je Profil

**A – Nutzerprofil.** Winter (Woche 1–20): 4,2 bis 4,9 Std., eine Sweet-Spot-Einheit, Fitness fällt von 45 auf etwa 30. Wechsel Winter → Sommer in Woche 21: Wochenzeit von 4,8 auf 6,5 Std. (+35 %), CTL +3,2 in der Woche; das ist verträglich, aber ohne Übergang. Aufbau Woche 19–36: jede Belastungswoche „VO2max 30/15“ unverändert plus eine Sweet-Spot-Variante. Spitze Woche 37–45: Rampen 8×1 Min., Antritte 8×30 Sek. oder Sprints 3×3×12 Sek.; Zeit ab 95 % FTP nur 2–3 % der Woche. In 24 von 47 Wochen ist eine Grundlagenfahrt länger als der Long Ride. Zielzeit: 2:00 Std. braucht laut App 256 W FTP (vorhanden 305 W), Prognose 1:50 Std. im Feld.

**B – Einsteiger.** Ab Woche 10 zwei harte Einheiten bei 4,8 Std.: 31–36 % der Zeit über Zone 2, in der Spitze bis 25 % ab Schwelle (VO2max 4×8 plus Schwelle 4×10 in einer Woche). Längste Fahrt 2:45 Std. für ein Event von über 5 Std.; die App weist selbst darauf hin. Rennwoche: Dienstagseinheit gestrichen, Donnerstag auf 2×4 Min. gekürzt (Befund 5).

**C – Ambitioniert.** 12 Wochen Basis mit einer Sweet-Spot-Einheit bei 10 Std. (93–99 % in Z1–2). Zwei Formhöhepunkte mit Form +20 und +21; Fitness am zweiten Höhepunkt wieder auf dem Niveau des ersten. Eine Woche mit drei harten Tagen (B-Rennen plus zwei Intervalleinheiten, Woche 26). Krafttraining bleibt im Wiederaufbau zwischen den Rennen bei zwei Einheiten pro Woche.

**D – Masters.** Identische Struktur wie bei einem 30-Jährigen mit 7 Std.: 3:1-Rhythmus, zwei harte Tage plus Long Ride, Kraft 2 × pro Woche. Tiefste Form −17.

**E – nur Wochenende.** Samstag eine harte Einheit (60–71 Min.), Sonntag Long Ride 60–105 Min. Summe 2,2 bis 2,9 Std. bei 4 Std. Budget. Die Option „Intensität statt Umfang“ (E2) ändert bei zwei Trainingstagen nichts.

Die vollständigen Wochentabellen stehen im Anhang.

---

## 4. Befunde je Prüfpunkt

Bewertung: ✓ konsistent · ⚠ teilweise · ✗ widerspricht der Lehre · ○ fehlt. Quellenkürzel in eckigen Klammern, siehe Abschnitt 6.

### Belastungssteuerung und Periodisierung

**1. Intensitätsverteilung – ⚠**
- *Gut:* Die Verteilung ist pyramidal (viel locker, weniger Z3, wenig Z4+) und ändert sich je Phase. Das ist belegt: Pyramidale und polarisierte Verteilung schneiden im Mittel gleich ab [Rosenblat 2025]; für Freizeitsportler eher pyramidal, für Leistungsstärkere eher polarisiert (Untergruppen-Befund, nicht gesichert).
- *Problem 1:* Wenig Zeit führt zu **weniger** statt mehr Intensität (unter 5 Std. nur eine harte Einheit). Die Option `intF` gleicht das nur aus, wenn der Nutzer sie findet, und wirkt bei zwei Trainingstagen nicht. Bei geringem Umfang sind zwei bis drei intensive Einheiten pro Woche wirksam und verträglich [Seiler 2010; Stöggl & Sperlich 2014]. Betroffen: A (Winter), E.
- *Problem 2:* Die Spitzenphase für „punch“ und „flach“ mit Rennformat enthält fast keine Zeit ab Schwelle (A: 2–3 %).
- *Problem 3:* 12 bis 18 Wochen Basis mit nur einer Sweet-Spot-Einheit unabhängig vom Niveau (C: 4,2 W/kg, 10 Std.).
- *Evidenzlage:* Die optimale Verteilung ist nicht geklärt; die Unterschiede zwischen den Modellen sind klein [Rosenblat 2025]. Gesichert ist: überwiegend lockeres Training plus regelmäßige intensive Reize.

**2. Progression – ⚠**
- *Gut:* CTL-Anstieg höchstens +3,7 pro Woche, kein Profil über dem Praxisrichtwert von 5 bis 8 [Allen, Coggan & McGregor 2019; Praxisregel ohne Studienbeleg]. Einstieg mit +8 % pro Woche bei bekanntem bisherigem Umfang. Umfang kommt vor Intensität.
- *Problem 1:* Der Wochenumfang steigt über den Plan nicht. Jeder 4-Wochen-Block hat dieselbe Rampe (88–94–100–65 %). Mehr Belastung entsteht nur durch den Phasenwechsel.
- *Problem 2:* Wechsel Winter → Sommer ohne Übergang (A: +35 % Wochenzeit in einer Woche). Der CTL-Anstieg bleibt im Rahmen, weil die Woche davor zufällig eine Entlastungswoche ist. Bei größerem Unterschied (zum Beispiel 4 → 10 Std.) wäre der Sprung deutlich zu hoch.
- *Problem 3:* Bei 5 Std. liegt die Belastung unter dem angenommenen Ausgangsniveau; die Fitness sinkt über den Winter (abhängig vom Startwert, siehe 3.1).

**3. Entlastungswochen – ⚠**
- *Gut:* Umfang −28 bis −34 %, Belastung −34 bis −40 %, eine kurze intensive Auffrischung bleibt. Das entspricht der Empfehlung (Umfang senken, Intensität teilweise halten) [Mujika & Padilla 2003; Bosquet 2007 für das Prinzip].
- *Problem:* Starrer 3:1-Rhythmus nach Wochennummer, unabhängig von Alter, Niveau und Phasengrenzen. Kein 2:1 für Masters oder Einsteiger. Die Entlastungswoche kann direkt auf die erste Woche einer neuen Phase folgen (A: Aufbau beginnt in Woche 19, Woche 20 ist Entlastung).
- *Evidenzlage:* Für 3:1 gegenüber 2:1 gibt es keine vergleichenden Studien; es ist Trainerpraxis [Friel 2018]. Langsamere Erholung im Alter ist plausibel und mehrfach beschrieben, die Datenlage ist aber uneinheitlich [Borges 2016; Fell & Williams 2008].

**4. Periodisierungsmodell – ⚠**
- *Gut:* Klassisch-linear mit zunehmender Spezifität; für Freizeitsportler angemessen. Mehrere Formhöhepunkte mit Regeneration, Wiederaufbau und „Form halten“ sind sauber gelöst.
- *Problem:* Phasenlängen rein prozentual. Bei langen Plänen entstehen 18 Wochen Basis und 18 Wochen Aufbau ohne Untergliederung (Basis 1/2/3, Aufbau 1/2). Eine Spitzenphase von 9 Wochen ist doppelt so lang wie üblich (3 bis 6 Wochen).
- *Fehlt:* Blöcke mit gebündelter Intensität (zum Beispiel eine VO2max-Woche mit 3–5 Einheiten, danach Entlastung). Für trainierte Sportler zeigen Studien Vorteile [Rønnestad 2014 Block; Mølmen 2019], die Evidenz ist aber begrenzt (kleine Studien, überwiegend eine Arbeitsgruppe). Als Option für Fortgeschrittene sinnvoll, kein Muss.

**5. Tapering und Danach – ✓ mit einem Fehler (⚠)**
- *Gut:* 1 bis 2 Wochen, Intensität bleibt, Häufigkeit bleibt (Mindestzahl an Fahrten), Aktivierung am Vortag. Umfang: erste Taperwoche −26 bis −35 % gegenüber der stärksten Woche, zweite etwa −60 % ohne den Renntag. Form am Renntag +6 bis +21. Das deckt sich mit den Meta-Analysen: bis 21 Tage, Umfang −41 bis −60 %, Intensität und Häufigkeit erhalten [Bosquet 2007; Wang 2023]. Die erste Taperwoche liegt etwas unter dieser Spanne.
- *Gut:* B-Rennen mit Mini-Tapering, C-Rennen als Training, nach A-Events Regenerationswoche, nach Saisonende Hinweis auf die Übergangsphase (`seasonOver`).
- *Fehler:* Rennwoche und Wochenbudget (Zusammenfassung Nr. 4). Der Eventtag zählt in `fitBudget` zur Wochensumme; bei langen Events und kleinem Budget werden die Taper-Einheiten gestrichen. Ohne Zielzeit 480 Min. statt der geschätzten Dauer. Betroffen: B, C, D, E.
- *Kleinigkeit:* Der Hilfetext sagt bei C-Rennen noch „nur der Tag davor ist locker“; der Code lässt den Vortag seit F17 unverändert.
- *Fehlt:* Die Übergangsphase ist nur ein Text, kein Plan (2 bis 3 lockere Wochen).

**6. Formberechnung – ⚠**
- *Gut:* Zeitkonstanten 42 und 7 Tage, Form aus den Werten des Vortags, Zielbereich +5 bis +25 am Renntag mit Hinweisen. Die App nennt Quellen und begründet die Hinweise.
- *Problem 1:* Geplante Belastung mit festem IF je Typ über die ganze Dauer inklusive Ein- und Ausfahren. Eine 60-Minuten-Einheit „Antritte 8×30 Sek.“ zählt wie eine Stunde am FTP (TSS 60). Folge: Wochen-TSS 7 bis 15 % zu hoch, in Entlastungswochen bis 39 % (E), prognostizierte Fitness etwa 10 % zu hoch.
- *Problem 2:* Fahrten ohne Leistungsdaten bekommen immer IF 0,65. Ein Rennen und eine Kaffeefahrt gleicher Dauer zählen gleich. Üblich sind eine Schätzung aus dem Puls (hrTSS bzw. TRIMP) oder aus Empfinden × Dauer (Session-RPE) [Foster 2001; Banister 1991]. Puls, Schwellenpuls und RPE sind in der App vorhanden, werden dafür aber nicht genutzt.
- *Grenzen des Modells:* Der Zusammenhang zwischen CTL und Leistung ist individuell und nicht linear [Vermeire 2021; Passfield 2022]. Die App sollte CTL als Orientierung zeigen, nicht als Leistungsprognose. Sie tut das weitgehend.

### Inhalte der Einheiten

**7. Grundlage, Long Ride, Durability – ⚠ / ○**
- *Gut:* Long Ride aus der Eventdauer abgeleitet (80 %, 3 bis 6 Std.), Eventsimulation in der Spitze, Verpflegungstraining, Grundlagen-Varianten.
- *Problem 1:* Die Länge wird mit Wochenstunden/8 skaliert. Bei 5 Std. Budget wird aus 2:00 Std. Soll ein Long Ride von 45 bis 60 Min., während das Auffüllen eine Grundlagenfahrt von 120 Min. erzeugt (A: 24 von 47 Wochen, B: 10 von 25). Der „Long Ride“ ist dann nicht die längste Fahrt.
- *Problem 2:* Bei wenigen Tagen wird das Budget nicht auf die Tage verteilt (E: 62 %).
- *Problem 3:* Für lange Events bleibt die längste Fahrt weit unter der Eventdauer (B: 2:45 für 5:10 Std.). Die App warnt und bietet „Long Ride priorisieren“ an; das ist akzeptabel.
- *Fehlt (○):* Training der Ermüdungsresistenz: Intervalle am Ende langer Fahrten, harte letzte Stunde. Durability gilt als eigene Leistungskomponente [Maunder 2021; Jones 2024]; welche Trainingsform sie am besten verbessert, ist noch kaum durch Interventionsstudien belegt [Hunter 2025; Spragg 2023]. Die App misst Durability bereits (`durab`), trainiert sie aber nicht. Der „negative Split“ im Long Ride geht in die Richtung, bleibt aber in Zone 2.

**8. Schwelle und Sweet Spot – ✗ bei der Progression**
- *Gut:* Formate und Bereiche sind üblich (88–94 %, 95–105 %), Over-Unders vorhanden.
- *Problem:* Keine Steigerung der Zeit im Zielbereich. Sweet Spot rotiert zwischen 3×12 (36 Min.), 3×9 Over-Under leicht (9 Min. an der Schwelle), 4×10 (40), 2×20 (40) und 3×15 (45), über beliebig viele Wochen. Progressive Überlastung ist ein Grundprinzip [Bompa & Buzzichelli 2019; Seiler 2013 zur Bedeutung der akkumulierten Zeit]. Betroffen: alle Profile.
- *Evidenzlage zu Sweet Spot:* Schwellenlastiges Training schnitt in Vergleichsstudien nicht besser ab als polarisiertes oder pyramidales [Stöggl & Sperlich 2014]; als zeitsparender Reiz in der Basis ist es vertretbar. Der Hinweis der App zur niedrigen Trittfrequenz („kein Leistungsvorteil belegt“) ist korrekt [Kristoffersen 2014].

**9. VO2max – ⚠**
- *Gut:* Belegte Formate: 30/15 mit 3 × 13 Wiederholungen entspricht dem Protokoll von Rønnestad [Rønnestad 2020]; 4×8 Min. bei „höchster gleichmäßig haltbarer“ Leistung entspricht Seiler [Seiler 2013]; 5×4 und 6×3 sind Standard. Höchstens eine VO2max-Einheit pro Woche, Auffrischung im Tapering.
- *Problem 1:* 30/15 hat keine Varianten und keine Steigerung: 14-mal dieselbe Einheit im Aufbau (A).
- *Problem 2:* VO2max läuft im Aufbau durchgehend (A: 18 Wochen) statt als begrenzter Block; in der Spitze (punch/flach, Rennen) fällt es ganz weg. Für hochintensive Phasen gelten 6 bis 8 Wochen als sinnvoll, danach flacht die Anpassung ab (Praxisregel; Evidenz begrenzt).
- *Hinweis:* Der Bereich „106–120 %“ bei 5×4 ist sehr breit. Besser steuern über „so hart, dass alle Intervalle gleich gelingen“, wie es die App bei 4×8 schon tut.

**10. Event-Spezifik – ⚠**
- *Gut:* Anforderungsprofil aus Strecke und Format, Zuordnung der Intervalle zum Typ, Eventsimulation, Long Ride mit Gruppentempo, Over-Unders mit Antritten, Sprints. Die App kennzeichnet die Zuordnung selbst als Praxisregel.
- *Problem:* Für Rennen vom Typ „punch“ und „flach“ ersetzt die Spezifik die Dauerleistung, statt sie zu ergänzen (Zusammenfassung Nr. 1). Ein Jedermann-Rennen über 2 Std. im Feld verlangt eine Normalized Power von etwa 85 bis 93 % FTP plus viele Antritte. Sinnvoll wäre je Woche eine rennnahe Einheit (Over-Unders mit Antritten, 30/15 oder Rampen) **und** eine Schwellen- oder Sweet-Spot-Einheit.
- *Hinweis:* Die Einstufung hängt an der Schwelle 5 hm/km; ein Rennen mit 450 hm auf 76 km gilt als „wellig“, mit 370 hm als „flach“. Der Nutzer sieht den Typ und kann ihn nicht korrigieren.

**11. Trittfrequenz und Technik – ✓**
- Trittfrequenzblöcke (5×2 Min. @ 105–115 U/min), Fahrtechnik, Kraftausdauer mit niedriger Frequenz als Abwechslung mit korrektem Hinweis zur Evidenz, kurze Sprints in der Grundlage. Sprints in lockeren Fahrten sind durch Studien gestützt [Almquist 2020]. Dosierung angemessen.

**12. Kraft – ✓ / ⚠**
- *Gut:* Periodisierung wie in der Literatur: Technik, Maximalkraft (2 × pro Woche, schwere Lasten), Erhaltung 1 × pro Woche in der Spitze, nichts im Tapering [Rønnestad & Mujika 2014]. Kein Krafttraining am Tag vor einer harten Radeinheit (Simulation: 0 Fälle).
- *Problem 1:* 13 bis 17 Krafteinheiten pro Saison liegen am selben Tag wie eine harte Radeinheit (bei wenigen freien Tagen unvermeidlich). Es fehlt der Hinweis zur Reihenfolge: erst Rad, dann Kraft, möglichst mit mehreren Stunden Abstand.
- *Problem 2:* In der Aufbauphase bleibt es bei zwei schweren Einheiten pro Woche, auch wenn Rennen anstehen (C) und die Aufbauphase 18 Wochen dauert (A). Üblich: nach etwa 8 bis 12 Wochen Aufbau auf eine Erhaltungseinheit wechseln.
- *Evidenzlage:* Der Nutzen schweren Krafttrainings für Radfahrer ist gut belegt; zur besten Reihenfolge am selben Tag ist die Lage uneinheitlich.

### Individualisierung und Steuerung

**13. Testen – ✓**
- Tests alle 8 Wochen nach einer Entlastungswoche, drei Verfahren, Vergleich mit einem Korridor, Übernahme nur nach Zustimmung, Schätzung aus Fahrten (Critical Power), Schwellenpuls als Alternative ohne Leistungsmesser, Nachholen ausgefallener Tests.
- *Hinweise:* Der 20-Min-Test × 0,95 überschätzt den FTP bei manchen Sportlern, vor allem ohne die Vorbelastung von 5 Min. im Originalprotokoll; der Rampentest × 0,75 streut individuell [Borszcz 2018; MacInnis 2019]. Die App sagt, dass der Trend zählt; das ist angemessen. Ein Ankerpunkt für die aerobe Schwelle (LT1, obere Grenze der Zone 2) fehlt; die Entkopplung von Puls und Leistung wird immerhin ausgewertet.

**14. Rückmeldung und Unterbrechungen – ⚠ / ○**
- *Gut:* Befinden in vier Stufen mit Ursachenabfrage, Regel bei Infekten (oberhalb des Halses locker, mit Fieber Pause), Morgenwerte mit eigenem Normalbereich, RPE nach der Fahrt, Reaktion auf verfehlte Einheiten. Das ist mehr als viele Apps bieten und fachlich stimmig [Meeusen 2013; Schwellnus 2016; zur HRV-Steuerung Manresa-Rocamora 2021].
- *Fehlt (○):* Wiedereinstieg nach längerer Unterbrechung. Der Plan folgt dem Kalender. Nach 10 bis 14 Tagen ohne Training steht die nächste Woche in voller Höhe im Plan. Die Leistungsfähigkeit sinkt nach etwa zwei Wochen Pause messbar [Mujika & Padilla 2000]. Es fehlen: geplanter Urlaub, Krankheit über mehrere Tage, Verletzung, ein gestufter Wiedereinstieg.
- *Fehlt:* Verpasste Schlüsseleinheiten werden bewusst nicht nachgeholt (richtig), aber eine Woche mit vielen Ausfällen verändert die Folgewoche nicht.
- *Problem:* Die Anpassung nach Krankheit endet an der Wochengrenze (`j < 7`): Wer am Sonntag krank ist, hat am Montag die normale Einheit.

**15. Alter, Geschlecht, Niveau – ⚠ / ○**
- *Gut:* Zyklus zurückhaltend umgesetzt (nur selbst angegebene Beschwerdetage, Umfang unverändert), passend zur schwachen Evidenz [McNulty 2020]. Niveau fließt in die FTP-Prognose ein; für Frauen eigene Vergleichswerte.
- *Fehlt (○):* Alter. Kein Feld, keine Regel. Für Masters üblich: mehr Erholung zwischen harten Einheiten (2:1 oder 9-Tage-Rhythmus), Kraft ganzjährig, Intensität erhalten [Borges 2016; Friel 2015 als Praxisquelle]. Betroffen: D.
- *Problem:* Einsteiger (B) bekommen dieselben Formate wie Fortgeschrittene (VO2max 4×8, Schwelle 4×10). Die Anzahl harter Einheiten hängt nur an den Stunden, nicht am Niveau oder an der Trainingserfahrung.

**16. Plananpassung (F4/F9/F10) – ⚠**
- *Gut:* Änderungen nur nach Zustimmung, mit Prüfung auf harte Doppeltage, Ruhetag, Budget und Wetter; Varianten mit gleichem Reiz. Der Generator selbst erzeugte in keiner Simulation zwei harte Tage in Folge.
- *Problem 1:* `paCheck` prüft nur innerhalb der Woche. Harte Einheit am Sonntag (nach Verschieben) und am Montag der Folgewoche wird nicht erkannt.
- *Problem 2:* Es gibt keine Regel für Mindesterholung nach sehr harten Tagen (zum Beispiel 48 Std. nach VO2max oder Rennen) und keine Obergrenze harter Tage pro Woche nach Zusatzfahrten. C hatte eine Woche mit drei harten Tagen durch ein B-Rennen.
- *Problem 3:* Beim Zusammenlegen zweier Einheiten („beide an diesem Tag“) wird die Belastung als Summe geführt, der Typ ist der der härteren Einheit; die TSS-Rechnung überschätzt dann zusätzlich.

**17. Realismus der Ziele – ✓**
- FTP-Prognose: +3 bis +8 % über die Plandauer, abhängig von Niveau und Umfang, mit Plateau. Das ist für trainierte Freizeitsportler realistisch bis vorsichtig; große Sprünge verspricht die App nicht. Der Korridor (±40 % des Zuwachses, ±2 % Messfehler) ist ehrlich.
- Zielzeit: physikalisches Modell mit Gewicht, Aerodynamik, Windschatten und einer Dauerleistungskurve; Annahmen sind in der App erklärt. Der Windschatten-Faktor 0,5 im Peloton ist konservativ: In der Mitte eines großen Feldes sinkt der Luftwiderstand auf 5 bis 10 % [Blocken 2018]; für Jedermann-Rennen mit Lücken ist 0,5 eine vernünftige Annahme.
- *Hinweis:* Die Renntag-Hebel (Verpflegung, Pacing, Koffein) werden multipliziert (bis etwa +6,6 %). Die Einzeleffekte sind belegt [Guest 2021 für Koffein], ihre Addierbarkeit nicht.
- *Kleinigkeit:* Ohne Zielzeit meldet der Plan-Check „Distanz und Höhenmeter fehlen“, obwohl beide eingetragen sind.

### Drumherum

**18. Ernährung – ✓ / ⚠**
- *Gut:* 30–60 g Kohlenhydrate pro Stunde, bei längeren Fahrten bis 90 g als Glukose-Fruktose-Mix, Darmtraining mit steigender Menge, Rennverpflegung in der Simulation üben, Koffein 3 mg/kg vorher testen. Das entspricht den Leitlinien [Burke 2011; Jeukendrup 2014; Thomas 2016].
- *Hinweis:* 120 g/h kommen nicht vor. Das ist vertretbar: Der Nutzen über 90 g/h ist für die Leistung nicht gesichert [Podlogar 2022; neuere Übersichten uneinheitlich].
- *Unstimmigkeit:* Carb Loading mit zwei Angaben: Tipp-Katalog 10–12 g/kg über 36–48 Std. [Burke 2011], Saisonprognose 8–10 g/kg (2 Tage) bzw. 6–8 g/kg (1 Tag). Beides vertretbar, sollte aber einheitlich sein.

**19. Hitze, Kälte, Rolle – ⚠ / ○**
- *Gut:* Wetter mit Kleidung, Hinweis auf die Rolle bei Nässe, Frost und Kälte; Hitze wird bei der Pulsbewertung berücksichtigt (5 Schläge Spielraum, Trend ohne heiße Fahrten).
- *Fehlt (○):* Anpassung der Einheit bei Hitze (Intensität senken, früher fahren, mehr trinken) und Hitzeanpassung vor heißen Events (10–14 Tage) [Racinais 2015; Périard 2021].
- *Fehlt:* Rolle als Planungsgröße im Winter. Lange Grundlagenfahrten im Winterprofil sind draußen oft nicht machbar; eine Rollen-Alternative (kürzer, strukturierter) wird nicht angeboten. Varianten für die Rolle gibt es einzeln (F10).

**20. Sicherheit – ⚠ / ○**
- *Gut:* Regel bei Fieber, Hinweise auf Arzt bei anhaltender Müdigkeit im Check-in, Tipp zu Übertraining mit Quelle, Plausibilitätsgrenzen der Eingaben, Budget-Obergrenze.
- *Fehlt (○):* Allgemeiner Gesundheitshinweis vor dem ersten Plan (ärztliche Abklärung bei Vorerkrankungen, ab etwa 35–40 Jahren bei Neueinstieg, Warnzeichen wie Brustschmerz oder Schwindel) [Löllgen 2020 (DGSP/EFSMA); Pelliccia 2021 (ESC)].
- *Fehlt (○):* Warnung bei anhaltender Überlastung: Form über längere Zeit unter etwa −25 bis −30, wiederholt „platt“ über mehr als eine Woche, auffällige Morgenwerte über mehrere Tage. Die Bausteine sind vorhanden, eine Regel über mehrere Wochen nicht. Übertraining lässt sich nicht an einem einzelnen Messwert festmachen [Meeusen 2013]; die Warnung sollte als Hinweis formuliert sein.
- *Fehlt:* Obergrenze für den CTL-Anstieg nach Zusatzfahrten.

---

## 5. Priorisierte Maßnahmenliste

Nutzen und Aufwand geschätzt. Aufwand: klein = bis etwa ½ Tag, mittel = 1–2 Tage, groß = mehrere Tage. Jede Maßnahme verändert Pläne und braucht deshalb deine Zustimmung und neue Vergleichsstände der Tests.

| Nr. | Maßnahme | Nutzen | Aufwand | Risiko |
|--:|---|---|---|---|
| M1 | Spitzenphase „punch“/„flach“ (Rennen): Dauerleistung erhalten | hoch | klein | gering |
| M2 | Rennwoche: Eventtag aus dem Wochenbudget nehmen, Dauer ohne Zielzeit schätzen | hoch | klein | gering |
| M3 | Progression der Intervalle innerhalb einer Phase | hoch | mittel | mittel |
| M4 | Wenig Zeit: Long Ride und Budgetnutzung, zweite harte Einheit | hoch | mittel | mittel |
| M5 | Belastungsrechnung: TSS aus der Struktur, Fahrten ohne Leistung aus Puls/RPE | mittel | mittel | mittel |
| M6 | Wiedereinstieg nach Pause, Krankheit über die Wochengrenze, Urlaub | hoch | mittel | gering |
| M7 | Alter und Erholungsrhythmus (2:1 wählbar) | mittel | mittel | gering |
| M8 | Lange Phasen gliedern, Spitze begrenzen, Entlastung an Phasen ausrichten | mittel | mittel | mittel |
| M9 | Warnung bei anhaltender Überlastung, Gesundheitshinweis | mittel | klein | gering |
| M10 | Übergang zwischen Winter- und Sommerbudget | mittel | klein | gering |
| M11 | Durability-Einheiten im Long Ride | mittel | klein | gering |
| M12 | Kraft: Hinweis zur Reihenfolge, Erhaltung bei langem Aufbau und in der Rennphase | gering | klein | gering |
| M13 | Prüfung harter Tage über die Wochengrenze, Obergrenze harter Tage | gering | klein | gering |
| M14 | Hitze: Hinweis und Anpassung | gering | klein | gering |
| M15 | Kleinigkeiten: Texte und einheitliche Angaben | gering | klein | keins |

**Empfohlene Reihenfolge:** zuerst M2 und M1 (kleine Eingriffe, großer Effekt, M2 ist ein Fehler), dann M3 und M4 (Kern der Trainingswirkung, zusammen planen), danach M6, M9, M10. M5 vor allem, wenn dir die Formkurve wichtig ist. M7, M8, M11–M15 nach Bedarf.

### Konkrete Beschreibung der Maßnahmen

**M1 – Spitzenphase mit Dauerleistung.** In `HE` (05-plan-generator.js Z. 216–218) für `punch` und `flach` mit `race`: statt `[RMP, ANA]` bzw. `[ANA, V30]` je Woche eine rennnahe und eine Dauerleistungs-Einheit: `punch: [OUA, RMP]` im Wechsel mit `[V30, THR]`; `flach: [OUA, ANA]` im Wechsel mit `[V30, THR]`. Antritte und Sprints zusätzlich in die Grundlagenfahrt („Grundlage mit Sprints“ in der Spitze bevorzugen). Text in `evProfCard` und `EVMIX` anpassen. Akzeptanz: In jeder Belastungswoche der Spitze mindestens 15 Min. Zeit ab 95 % FTP und eine Einheit mit Antritten. Tests: Vergleichsstände `plan` neu, neuer Test „Spitze enthält Schwellenreiz“.

**M2 – Rennwoche.** In `fitBudget` den Eventtag und die Aktivierung nicht in `sum` zählen (oder `cap` um die Eventdauer erhöhen). In `genWeekCore` Z. 296 statt `480` die geschätzte Dauer `prof.tev` verwenden, wenn keine Zielzeit vorliegt; dasselbe gilt für `tss` des Eventtags. Akzeptanz: Rennwoche von Profil B enthält beide Taper-Einheiten in voller Länge; Eventtag 310 statt 480 Min. Zusätzlich die Meldung im Plan-Check ohne Zielzeit korrigieren („Zielzeit fehlt“).

**M3 – Progression.** Jede harte Einheit bekommt Stufen statt einer festen Dosis. Vorschlag: Stufe = Belastungswoche innerhalb der Phase (ohne Entlastungswochen), gedeckelt.
- Sweet Spot: 3×10 → 3×12 → 3×15 → 2×20 → 3×20 → 2×30 (30 → 60 Min.).
- Schwelle: 3×8 → 3×10 → 2×15 → 2×20 → 3×15 → 3×20.
- VO2max lang: 4×3 → 5×3 → 4×4 → 5×4 → 6×4 → 4×8.
- 30/15: 2×10 → 3×10 → 3×13 → 4×13.
- Einstieg nach Niveau (unter 2,5 W/kg eine Stufe tiefer) und nach Entlastungswoche eine Stufe zurück, dann weiter.
- Die Varianten (F10) bleiben als Wahlmöglichkeit bei gleicher Belastungszeit.
- Regel für die Anpassung: Wird eine Einheit „unter Soll“ bewertet, Stufe halten; zweimal „über Soll“: Stufe +1 vorschlagen (nur nach Zustimmung).
- Akzeptanz: Zeit im Zielbereich steigt innerhalb einer Phase von Block zu Block; kein Sprung über 20 % pro Woche. Risiko: Pläne ändern sich deutlich; laufende Pläne nur ab der nächsten Woche umstellen, mit Hinweis in „Was ist neu“.

**M4 – Wenig Zeit.**
- Long Ride nicht mehr mit Stunden/8 skalieren, sondern: Ziel aus dem Event (`lb`), begrenzt auf etwa 45 % des Wochenbudgets (bei 2 Trainingstagen 55 %), mindestens so lang wie die längste Grundlagenfahrt der Woche. Auffüll-Grundlage höchstens so lang wie der Long Ride.
- Budget auf die verfügbaren Tage verteilen: Bleibt nach Long Ride und harten Einheiten Zeit übrig und sind keine Tage frei, die vorhandenen Einheiten verlängern (Aus- und Einfahren in Zone 2, bis 100 % der Rampe erreicht sind).
- Unter 5 Std. und ab 3 Trainingstagen: zwei harte Einheiten statt einer, sofern nicht „Gesundheit“ oder „Wiedereinstieg“ gewählt ist; die Option „Intensität statt Umfang“ kann dann entfallen oder als „dritte kurze Einheit“ bestehen bleiben.
- Bei 2 Trainingstagen: harte Einheit plus Long Ride mit Tempoanteil (zum Beispiel letzte 20–30 Min. Sweet Spot).
- Akzeptanz: Profil E nutzt mindestens 85 % des Budgets; Profil A im Winter: Long Ride ≥ längste Grundlagenfahrt, zwei harte Einheiten ab Woche 5.

**M5 – Belastungsrechnung.**
- `tss(x)` für Einheiten mit `iv` aus der Struktur berechnen (Ein-/Ausfahren, Pausen, Belastungsphasen; die Logik steht in `tools/audit/sim.js`, Funktion `real`). Für Einheiten ohne `iv` die Mitte des Zielbereichs.
- Fahrten ohne Leistung: Belastung aus Puls (Zeit × (Puls-Reserve-Anteil)², bezogen auf den Schwellenpuls), sonst aus RPE × Dauer, sonst wie bisher 0,65. Kennzeichnen, woher der Wert kommt.
- Akzeptanz: geplante TSS einer 60-Min-Einheit „Antritte“ unter 50; Formkurve verschiebt sich um höchstens etwa 10 %. Risiko: Vergangene und neue Werte sind nicht vergleichbar; einmalig neu berechnen.

**M6 – Unterbrechungen.**
- Erkennen: keine erledigte Einheit und keine Fahrt seit 7 oder mehr Tagen, oder „krank“ an 3 oder mehr Tagen.
- Vorschlag (nach Zustimmung): Wiedereinstieg je nach Dauer. 7–13 Tage: eine Woche mit 70 % Umfang, eine harte Einheit auf niedriger Stufe. 14–27 Tage: zwei Wochen (60 %, 80 %), nur Grundlage und Sweet Spot. Ab 28 Tagen: Plan neu aufsetzen bzw. Phasen neu berechnen, FTP −5 % vorschlagen und Test einplanen.
- Geplanter Urlaub: Zeitraum eintragen; die Woche davor normal, danach Wiedereinstieg; Entlastungswoche in den Urlaub legen.
- Krankheit über die Wochengrenze: `feelDay` auf die Folgewoche ausdehnen.

**M7 – Alter und Rhythmus.** Feld Geburtsjahr (freiwillig) in Planung und Einstellungen. Ab 50 Jahren Vorschlag: Rhythmus 2:1 (zwei Belastungswochen, eine Entlastungswoche), wählbar für alle; mindestens zwei lockere Tage zwischen sehr harten Einheiten (VO2max, Rennen); Kraft ganzjährig mindestens einmal pro Woche. `rec = w % 4 === 0` durch eine Funktion ersetzen, die Rhythmus und Phasengrenzen kennt. Text mit Hinweis auf die uneinheitliche Evidenz.

**M8 – Phasen.** Basis höchstens 12, Aufbau höchstens 12, Spitze 3 bis 6 Wochen; überzählige Wochen als „Allgemeine Vorbereitung“ (Grundlage, Kraft, Technik, eine Sweet-Spot-Einheit, freie Gestaltung) an den Anfang. Basis und Aufbau in Abschnitte mit eigener Stufe gliedern (M3). Entlastungswochen so legen, dass jede Phase mit einer Entlastungswoche endet. Optional für Fortgeschrittene (ab etwa 3,5 W/kg und 8 Std.): ein VO2max-Block im Aufbau (eine Woche mit drei VO2max-Einheiten, danach Entlastung).

**M9 – Warnungen und Hinweis.**
- Gesundheitshinweis einmalig beim ersten Plan (bestätigen), dauerhaft unter Mehr → Rechtliches/Wissen.
- Hinweis-Karte, wenn zwei der folgenden Punkte zutreffen: Form an 10 von 14 Tagen unter −25; „platt“ oder „müde“ an 4 oder mehr Tagen in 10 Tagen; zwei „unter Soll“ in 14 Tagen; Morgenwerte an 3 von 5 Tagen auffällig. Angebot: Erholungswoche einlegen (vorhanden: `addRecW`).

**M10 – Übergang im Zeitbudget.** In `tbApply`: Steigt das Budget zum Vormonat um mehr als 20 %, in zwei bis drei Wochen stufenweise anheben (je Woche höchstens +15 % bzw. +1 Std.). Sinkt es, sofort übernehmen.

**M11 – Durability.** In Aufbau und Spitze jede zweite Woche als Long-Ride-Variante: „Long Ride mit hartem Finale“ (letzte 30–45 Min. Sweet Spot oder 2–3 × 8 Min. Schwelle nach mindestens 60 % der Dauer). Für Events über 3 Std. und Rennen. Text mit Hinweis, dass die beste Trainingsform noch nicht belegt ist.

**M12 – Kraft.** Hinweis in der Krafteinheit, wenn am selben Tag eine harte Radeinheit liegt („erst Rad, dann Kraft, wenn möglich mit einigen Stunden Abstand“). Nach 12 Wochen Maximalkraft/Ausbau auf eine Erhaltungseinheit wechseln; in Wochen mit A- oder B-Rennen höchstens eine Einheit, nicht in den drei Tagen vor dem Rennen (teilweise vorhanden).

**M13 – Wochengrenze.** `paCheck` um den Sonntag der Vorwoche und den Montag der Folgewoche erweitern; Warnung ab drei harten Tagen pro Woche bei weniger als 8 Std. Budget.

**M14 – Hitze.** Bei Vorhersage ab etwa 28 °C für die Trainingszeit: Hinweis (früh fahren, Intensität nach Puls oder Gefühl um etwa 5 % senken, mehr trinken) und Angebot, eine harte Einheit auf die Rolle oder einen kühleren Tag zu legen (F9). Vor heißen Events: Tipp zur Hitzeanpassung zwei Wochen vorher.

**M15 – Kleinigkeiten.** Hilfetext C-Rennen an F17 anpassen (zwei Stellen in 08-zwischenevents.js); Carb-Loading-Angaben vereinheitlichen (32-uebersicht-saison.js und Tipp n15); Eventtyp in der Planung korrigierbar machen; Übergangsphase nach Saisonende als zwei bis drei lockere Wochen im Plan.

---

## 6. Quellenverzeichnis

Reviews, Meta-Analysen und Konsenspapiere zuerst genannt; Praxisquellen sind als solche gekennzeichnet.

- **Allen H, Coggan A, McGregor S (2019):** Training and Racing with a Power Meter. 3. Aufl. VeloPress. (Praxis-Lehrbuch; TSS, CTL/ATL, Richtwerte für den Belastungsanstieg ohne Studienbeleg)
- **Almquist NW et al. (2020):** Including sprints in low-intensity sessions during the transition period of elite cyclists. Eur J Appl Physiol 120:1065–1077 (und Folgearbeiten 2021).
- **Banister EW (1991):** Modeling elite athletic performance. In: Physiological Testing of the High-Performance Athlete. Human Kinetics. (TRIMP, Impulse-Response-Modell)
- **Blocken B et al. (2018):** Aerodynamic drag in cycling pelotons. J Wind Eng Ind Aerodyn 179:319–337.
- **Bompa TO, Buzzichelli C (2019):** Periodization: Theory and Methodology of Training. 6. Aufl. Human Kinetics. (Lehrbuch)
- **Borges N et al. (2016):** Age-related changes in performance and recovery kinetics in masters athletes: a narrative review. J Aging Phys Act 24:149–157.
- **Borszcz FK et al. (2018):** Functional threshold power in cyclists: validity of the concept and physiological responses. Int J Sports Med 39:737–742.
- **Bosquet L et al. (2007):** Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 39:1358–1365.
- **Burke LM et al. (2011):** Carbohydrates for training and competition. J Sports Sci 29(S1):S17–S27.
- **Fell J, Williams D (2008):** The effect of aging on skeletal-muscle recovery from exercise. J Aging Phys Act 16:97–115.
- **Foster C et al. (2001):** A new approach to monitoring exercise training. J Strength Cond Res 15:109–115. (Session-RPE)
- **Friel J (2015):** Fast After 50. VeloPress. · **Friel J (2018):** The Cyclist's Training Bible. 5. Aufl. VeloPress. (Praxisquellen)
- **Guest NS et al. (2021):** International Society of Sports Nutrition position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1.
- **Hunter B et al. (2025):** Durability as an index of endurance exercise performance: methodological considerations. Exp Physiol (Übersicht zur Messung; Trainingsstudien fehlen weitgehend).
- **Jeukendrup A (2014):** A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med 44(S1):S25–S33.
- **Jones AM (2024):** The fourth dimension: physiological resilience as an independent determinant of endurance exercise performance. J Physiol 602:4113–4128.
- **Kristoffersen M et al. (2014):** Low cadence interval training at moderate intensity does not improve cycling performance in highly trained veteran cyclists. Front Physiol 5:34.
- **Löllgen H et al. (2020):** Exercise prescription for health (EFSMA-Empfehlungen; Vorsorgeuntersuchung im Sport). Dazu DGSP-Leitlinie Vorsorgeuntersuchung im Sport.
- **MacInnis MJ, Thomas ACQ, Phillips SM (2019):** The reliability of 4-minute and 20-minute time trials and their relationships to functional threshold power in trained cyclists. Int J Sports Physiol Perform 14:38–45.
- **Manresa-Rocamora A et al. (2021):** Heart rate variability-guided training for enhancing cardiac-vagal modulation, aerobic fitness, and endurance performance: a methodological systematic review with meta-analysis. Int J Environ Res Public Health 18:10299.
- **Martin JC et al. (1998):** Validation of a mathematical model for road cycling power. J Appl Biomech 14:276–291.
- **Maunder E et al. (2021):** The importance of „durability“ in the physiological profiling of endurance athletes. Sports Med 51:1619–1628.
- **McNulty KL et al. (2020):** The effects of menstrual cycle phase on exercise performance in eumenorrheic women: a systematic review and meta-analysis. Sports Med 50:1813–1827.
- **Meeusen R et al. (2013):** Prevention, diagnosis and treatment of the overtraining syndrome: joint consensus statement of the ECSS and the ACSM. Med Sci Sports Exerc 45:186–205.
- **Mølmen KS et al. (2019):** Block periodization of endurance training – a systematic review and meta-analysis. Open Access J Sports Med 10:145–160.
- **Mujika I, Padilla S (2000):** Detraining: loss of training-induced physiological and performance adaptations. Part I/II. Sports Med 30:79–87 und 145–154.
- **Mujika I, Padilla S (2003):** Scientific bases for precompetition tapering strategies. Med Sci Sports Exerc 35:1182–1187.
- **Passfield L et al. (2022):** Validity of the training-load concept. Int J Sports Physiol Perform 17:507–514.
- **Pelliccia A et al. (2021):** 2020 ESC Guidelines on sports cardiology and exercise in patients with cardiovascular disease. Eur Heart J 42:17–96.
- **Périard JD et al. (2021):** Exercise under heat stress: thermoregulation, hydration, performance implications, and mitigation strategies. Physiol Rev 101:1873–1979.
- **Podlogar T et al. (2022):** Increased exogenous but unaltered endogenous carbohydrate oxidation with combined fructose-maltodextrin ingested at 120 g/h versus 90 g/h. Eur J Appl Physiol 122:2393–2401. Dazu **Podlogar T, Wallis GA (2022):** New horizons in carbohydrate research and application for endurance athletes. Sports Med 52(S1):5–23.
- **Racinais S et al. (2015):** Consensus recommendations on training and competing in the heat. Br J Sports Med 49:1164–1173.
- **Rønnestad BR, Mujika I (2014):** Optimizing strength training for running and cycling endurance performance: a review. Scand J Med Sci Sports 24:603–612.
- **Rønnestad BR, Hansen J, Ellefsen S (2014):** Block periodization of high-intensity aerobic intervals provides superior training effects in trained cyclists. Scand J Med Sci Sports 24:34–42.
- **Rønnestad BR et al. (2020):** Superior performance improvements in elite cyclists following short-interval vs effort-matched long-interval training. Scand J Med Sci Sports 30:849–857.
- **Rosenblat MA et al. (2025):** Which training intensity distribution intervention will produce the greatest improvements in maximal oxygen uptake and time-trial performance in endurance athletes? A systematic review and network meta-analysis of individual participant data. Sports Med, online Januar 2025, DOI 10.1007/s40279-024-02149-3. (13 Studien, 348 Teilnehmende; kein Unterschied zwischen polarisiert und pyramidal)
- **Schwellnus M et al. (2016):** How much is too much? (Part 2) IOC consensus statement on load in sport and risk of illness. Br J Sports Med 50:1043–1052.
- **Seiler S (2010):** What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 5:276–291.
- **Seiler S et al. (2013):** Adaptations to aerobic interval training: interactive effects of exercise intensity and total work duration. Scand J Med Sci Sports 23:74–83. (4×8 Min.)
- **Spragg J et al. (2023):** The relationship between training characteristics and durability in professional cyclists across a competitive season. Eur J Sport Sci 23:489–498.
- **Stöggl T, Sperlich B (2014):** Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. Front Physiol 5:33.
- **Thomas DT, Erdman KA, Burke LM (2016):** Nutrition and athletic performance. Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the ACSM. Med Sci Sports Exerc 48:543–568.
- **Vermeire KM et al. (2021):** Training progression in recreational cyclists: no linear dose-response relationship with training load. J Strength Cond Res 35:3500–3505.
- **Wang Z et al. (2023):** Effects of tapering on performance in endurance athletes: a systematic review and meta-analysis. PLoS One 18:e0282838.

Hinweis zur Belegqualität: Bei Rosenblat 2025, Wang 2023, Podlogar 2022 und Hunter 2025 habe ich Zusammenfassungen und Kernaussagen online gegengeprüft, nicht die Volltexte. Seitenzahlen und Jahrgänge der übrigen Quellen stammen aus meinem Wissensstand und sollten vor einer Veröffentlichung in der App einzeln geprüft werden.

---

## Anhang: Wochenverlauf der fünf Profile

Legende: (E) = Entlastungswoche, T = Fitness-Check. „TSS Struktur“, CTL, ΔCTL (Änderung zur Vorwoche) und „Form min“ (tiefster Tageswert der Woche) nach der Struktur-Schätzung. Zonen in Prozent der Wochenzeit. Kraft: tech = Technik, base = Maximalkraft, build = Ausbau, erh = Erhaltung, leicht = leichte Woche. Die letzte Woche enthält den Renntag (bei B bis E mit 8 Stunden angesetzt, siehe Befund 5).

### Anhang – Profil A – Nutzerprofil 3,6 W/kg, 76 km Jedermann-Rennen 03.10.2027, Ziel unter 2:00, Winter 5 h / Sommer 8 h, 4 Tage

Start 2026-11-09, 47 Wochen, Start-CTL (Annahme) 45. Phasen: Basis W1–18, Aufbau W19–36, Spitze W37–45, Tapering W46–47. Fitness-Checks in Woche [5, 13, 21, 29, 37].

| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | Basis | 4.2 | 230 | 204 | 86 | 14 | 0 | 1 | 2:00 | 43 | -2.3 | +0 | tech+tech |
| 2 | Basis | 4.8 | 252 | 224 | 91 | 6 | 3 | 1 | 1:45 | 41 | -1.6 | +4 | tech+tech |
| 3 | Basis | 4.8 | 261 | 232 | 86 | 14 | 0 | 1 | 1:45 | 40 | -1.2 | +3 | tech+tech |
| 4 | Basis (E) | 3.2 | 183 | 152 | 95 | 0 | 5 | 1 | 1:45 | 37 | -2.8 | +5 | leicht |
| 5 | Basis T | 4.0 | 213 | 193 | 92 | 0 | 8 | 1 | 2:00 | 36 | -1.5 | +4 | base+base |
| 6 | Basis | 4.6 | 254 | 226 | 84 | 16 | 0 | 1 | 2:00 | 35 | -0.5 | +1 | base+base |
| 7 | Basis | 4.9 | 264 | 236 | 88 | 12 | 0 | 1 | 1:45 | 35 | -0.2 | +1 | base+base |
| 8 | Basis (E) | 3.2 | 188 | 152 | 96 | 0 | 4 | 1 | 1:45 | 33 | -2.0 | +1 | leicht |
| 9 | Basis | 4.8 | 251 | 224 | 91 | 6 | 3 | 1 | 2:00 | 33 | -0.1 | +1 | base+base |
| 10 | Basis | 4.5 | 250 | 221 | 85 | 15 | 0 | 1 | 2:00 | 33 | -0.2 | -3 | base+base |
| 11 | Basis | 4.9 | 264 | 238 | 86 | 14 | 0 | 1 | 1:45 | 33 | +0.3 | -2 | base+base |
| 12 | Basis (E) | 3.2 | 183 | 148 | 97 | 0 | 3 | 1 | 1:45 | 31 | -1.8 | -1 | leicht |
| 13 | Basis T | 4.0 | 213 | 193 | 92 | 0 | 8 | 1 | 2:00 | 31 | -0.5 | -1 | base+base |
| 14 | Basis | 4.4 | 242 | 214 | 86 | 14 | 0 | 1 | 2:00 | 31 | +0.0 | -3 | base+base |
| 15 | Basis | 4.8 | 252 | 224 | 91 | 6 | 3 | 1 | 1:45 | 31 | +0.3 | -2 | base+base |
| 16 | Basis (E) | 3.2 | 183 | 152 | 95 | 0 | 5 | 1 | 1:45 | 29 | -1.4 | -2 | leicht |
| 17 | Basis | 4.3 | 238 | 211 | 84 | 16 | 0 | 1 | 2:00 | 30 | +0.1 | -3 | base+base |
| 18 | Basis | 4.4 | 242 | 217 | 85 | 15 | 0 | 1 | 2:00 | 30 | +0.2 | -4 | base+base |
| 19 | Aufbau | 4.8 | 309 | 267 | 73 | 14 | 13 | 2 | 1:30 | 31 | +1.4 | -2 | build+build |
| 20 | Aufbau (E) | 3.2 | 189 | 161 | 88 | 8 | 4 | 1 | 1:30 | 30 | -1.2 | -7 | leicht |
| 21 | Aufbau T | 6.5 | 376 | 348 | 76 | 19 | 5 | 2 | 2:15 | 33 | +3.2 | -6 | build+build |
| 22 | Aufbau | 6.4 | 391 | 352 | 73 | 19 | 7 | 2 | 2:15 | 36 | +2.8 | -14 | build+build |
| 23 | Aufbau | 6.8 | 415 | 375 | 73 | 20 | 7 | 2 | 2:30 | 39 | +2.9 | -18 | build+build |
| 24 | Aufbau (E) | 5.2 | 276 | 248 | 90 | 8 | 2 | 1 | 2:00 | 38 | -0.4 | -20 | leicht |
| 25 | Aufbau | 6.4 | 391 | 350 | 75 | 18 | 7 | 2 | 2:15 | 40 | +2.0 | -9 | build+build |
| 26 | Aufbau | 6.3 | 379 | 338 | 76 | 14 | 10 | 2 | 2:15 | 42 | +1.4 | -14 | build+build |
| 27 | Aufbau | 6.8 | 411 | 370 | 74 | 19 | 7 | 2 | 2:30 | 44 | +1.9 | -14 | build+build |
| 28 | Aufbau (E) | 5.2 | 276 | 252 | 89 | 8 | 3 | 1 | 2:00 | 43 | -1.1 | -15 | leicht |
| 29 | Aufbau T | 6.4 | 368 | 343 | 76 | 19 | 5 | 2 | 2:15 | 44 | +1.2 | -5 | build+build |
| 30 | Aufbau | 6.6 | 403 | 362 | 73 | 20 | 7 | 2 | 2:15 | 45 | +1.4 | -10 | build+build |
| 31 | Aufbau | 6.7 | 403 | 363 | 75 | 18 | 7 | 2 | 2:30 | 46 | +1.2 | -12 | build+build |
| 32 | Aufbau (E) | 5.2 | 281 | 253 | 89 | 8 | 3 | 1 | 2:00 | 45 | -1.5 | -13 | leicht |
| 33 | Aufbau | 6.3 | 379 | 338 | 76 | 14 | 10 | 2 | 2:15 | 46 | +0.7 | -3 | build+build |
| 34 | Aufbau | 6.5 | 399 | 357 | 74 | 19 | 7 | 2 | 2:15 | 47 | +1.0 | -7 | build+build |
| 35 | Aufbau | 6.7 | 403 | 365 | 74 | 19 | 7 | 2 | 2:30 | 48 | +1.1 | -10 | build+build |
| 36 | Aufbau (E) | 5.2 | 276 | 248 | 90 | 8 | 2 | 1 | 2:00 | 46 | -1.8 | -12 | leicht |
| 37 | Spitze T | 6.9 | 417 | 375 | 85 | 10 | 5 | 2 | 2:45 | 47 | +1.4 | -2 | erh |
| 38 | Spitze | 6.8 | 422 | 377 | 87 | 10 | 3 | 2 | 2:45 | 49 | +1.2 | -10 | erh |
| 39 | Spitze | 7.1 | 442 | 385 | 87 | 11 | 2 | 2 | 3:00 | 50 | +1.2 | -13 | erh |
| 40 | Spitze (E) | 5.5 | 288 | 265 | 88 | 9 | 3 | 1 | 2:00 | 48 | -1.7 | -14 | leicht |
| 41 | Spitze | 6.8 | 422 | 377 | 87 | 10 | 3 | 2 | 2:45 | 49 | +1.1 | -3 | erh |
| 42 | Spitze | 6.8 | 430 | 372 | 88 | 10 | 2 | 2 | 2:45 | 50 | +0.8 | -10 | erh |
| 43 | Spitze | 7.0 | 434 | 390 | 86 | 11 | 3 | 2 | 3:00 | 51 | +1.1 | -12 | erh |
| 44 | Spitze (E) | 5.5 | 293 | 265 | 88 | 9 | 2 | 1 | 2:00 | 49 | -1.9 | -13 | leicht |
| 45 | Spitze | 6.8 | 430 | 372 | 88 | 10 | 2 | 2 | 2:45 | 50 | +0.8 | -2 | erh |
| 46 | Taper | 4.8 | 295 | 239 | 90 | 0 | 10 | 2 | 2:00 | 48 | -2.3 | -9 |  |
| 47 | Taper | 4.1 | 265 | 288 | 52 | 24 | 24 | 3 | 2:00 | 47 | -0.8 | +1 |  |

Kennzahlen: Ø 5.4 Std./Woche (ohne Taper), Verteilung gesamt Z1–2 84 % / Z3–SST 12 % / Z4+ 4 %. Höchster CTL-Anstieg in einer Woche: +3.2 (Struktur), +3.2 (App). Harte Tage direkt hintereinander: 0, Schlüsseltage (inkl. Long Ride) hintereinander: 0. Kraft: 72 Einheiten, davon 0 am Tag vor einer harten Radeinheit, 13 am selben Tag.
- Eventtag: Jedermann-Rennen 76 km (W47): Form +13 (App-Rechnung +13), CTL 47 bei Höchstwert 51 (App 52/57)

Beispielwochen (Mo–So):
- W1 Basis (5 h Budget, 4 Tage): – | – | – | Sweet Spot 3×12 71′ | – +Kraft | Grundlage, neue Strecke 120′ | Long Ride 60′ +Kraft
- W4 Basis Entlastung (5 h Budget, 4 Tage): – | VO2max Auffrischung 3×3 42′ | – +Kraft | Grundlage Z2 105′ | – | – | Long Ride 45′
- W19 Aufbau (5 h Budget, 4 Tage): – | VO2max 30/15 60′ +Kraft | – | Over-Under leicht 3×9 62′ | – +Kraft | Grundlage, neue Strecke 75′ | Long Ride mit Rampen 90′
- W20 Aufbau Entlastung (5 h Budget, 4 Tage): – | VO2max Auffrischung 4×2 45′ | – +Kraft | Grundlage Z2 90′ | – | – | Long Ride mit Rampen 60′
- W21 Aufbau (8 h Budget, 4 Tage): – | Fitness-Check: 20-Min-Test 60′ +Kraft | – | Sweet Spot 4×10 Kraftausdauer 77′ | – +Kraft | Grundlage, neue Strecke 120′ | Long Ride mit Rampen 135′
- W24 Aufbau Entlastung (8 h Budget, 4 Tage): – | Spritzig 5×1 42′ | – +Kraft | Grundlage Z2 120′ | – | Grundlage Z2 45′ | Long Ride mit Rampen 105′
- W37 Spitze (8 h Budget, 4 Tage): – | Fitness-Check: 20-Min-Test 60′ | – | Sprints 3×3×12 Sek. 71′ | – +Kraft | Grundlage, neue Strecke 120′ | Eventsimulation 165′
- W40 Spitze Entlastung (8 h Budget, 4 Tage): – | VO2max Auffrischung 3×3 42′ | – +Kraft | Grundlage Z2 120′ | – | Grundlage Z2 45′ | Eventsimulation 120′
- W46 Taper (8 h Budget, 4 Tage): – | VO2max Auffrischung 3×3 42′ | – | Wettkampftempo 2×10 50′ | – | Grundlage Z2 120′ | Long Ride 75′
- W47 Taper (8 h Budget, 4 Tage): – | VO2max Auffrischung 4×2 45′ | – | Wettkampftempo 2×10 50′ | – | Aktivierung vor dem Event 30′ | Eventtag: Jedermann-Rennen 76 km 120′

### Anhang – Profil B – Einsteiger 2,2 W/kg, 5 h/Woche, Gran Fondo 120 km / 1.500 Hm in 24 Wochen

Start 2026-11-09, 25 Wochen, Start-CTL (Annahme) 20. Phasen: Basis W1–9, Aufbau W10–18, Spitze W19–23, Tapering W24–25. Fitness-Checks in Woche [5, 13, 21].

| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | Basis | 4.4 | 242 | 214 | 86 | 14 | 0 | 1 | 2:00 | 22 | +1.8 | -6 | tech |
| 2 | Basis | 4.8 | 252 | 224 | 91 | 6 | 3 | 1 | 1:45 | 23 | +1.6 | -11 | tech |
| 3 | Basis | 4.8 | 262 | 232 | 86 | 14 | 0 | 1 | 2:00 | 25 | +1.5 | -13 | tech |
| 4 | Basis (E) | 3.2 | 184 | 152 | 95 | 0 | 5 | 1 | 1:30 | 24 | -0.5 | -8 | leicht |
| 5 | Basis T | 4.2 | 225 | 204 | 92 | 0 | 8 | 1 | 2:00 | 25 | +0.7 | -7 | base |
| 6 | Basis | 4.6 | 254 | 226 | 84 | 16 | 0 | 1 | 2:00 | 26 | +1.1 | -9 | base |
| 7 | Basis | 4.7 | 254 | 225 | 87 | 13 | 0 | 1 | 2:00 | 27 | +0.9 | -9 | base |
| 8 | Basis (E) | 3.2 | 189 | 152 | 96 | 0 | 4 | 1 | 1:30 | 26 | -0.8 | -5 | leicht |
| 9 | Basis | 4.3 | 230 | 202 | 89 | 7 | 4 | 1 | 2:00 | 27 | +0.4 | -5 | base |
| 10 | Aufbau | 4.8 | 326 | 285 | 64 | 26 | 10 | 2 | 2:00 | 29 | +2.2 | -7 | build |
| 11 | Aufbau | 4.8 | 324 | 287 | 66 | 23 | 11 | 2 | 2:00 | 31 | +1.9 | -11 | build |
| 12 | Aufbau (E) | 3.2 | 187 | 160 | 86 | 12 | 3 | 1 | 1:30 | 30 | -1.2 | -12 | leicht |
| 13 | Aufbau T | 4.8 | 290 | 262 | 73 | 17 | 10 | 2 | 2:00 | 31 | +1.3 | -3 | build |
| 14 | Aufbau | 4.8 | 322 | 281 | 69 | 24 | 7 | 2 | 2:00 | 33 | +1.5 | -8 | build |
| 15 | Aufbau | 4.8 | 313 | 280 | 69 | 26 | 5 | 2 | 2:15 | 34 | +1.3 | -10 | build |
| 16 | Aufbau (E) | 3.2 | 187 | 164 | 84 | 12 | 5 | 1 | 1:30 | 32 | -1.5 | -11 | leicht |
| 17 | Aufbau | 4.3 | 306 | 268 | 64 | 29 | 8 | 2 | 2:00 | 33 | +1.0 | -5 | build |
| 18 | Aufbau | 4.9 | 325 | 284 | 68 | 22 | 10 | 2 | 2:00 | 35 | +1.2 | -5 | build |
| 19 | Spitze | 4.8 | 358 | 305 | 64 | 12 | 25 | 2 | 2:15 | 36 | +1.5 | -11 | erh |
| 20 | Spitze (E) | 3.2 | 194 | 167 | 82 | 13 | 4 | 1 | 1:45 | 34 | -1.8 | -10 | leicht |
| 21 | Spitze T | 4.5 | 305 | 270 | 69 | 12 | 18 | 2 | 2:15 | 35 | +0.8 | -3 | erh |
| 22 | Spitze | 4.9 | 353 | 306 | 67 | 13 | 20 | 2 | 2:30 | 37 | +1.5 | -8 | erh |
| 23 | Spitze | 4.7 | 322 | 283 | 69 | 21 | 10 | 2 | 2:45 | 37 | +0.8 | -9 | erh |
| 24 | Taper | 3.3 | 228 | 171 | 87 | 0 | 13 | 2 | 1:00 | 35 | -1.9 | -9 |  |
| 25 | Taper | 9.0 | 450 | 544 | 32 | 45 | 24 | 2 | 8:00 | 43 | +7.3 | +2 |  |

Kennzahlen: Ø 4.4 Std./Woche (ohne Taper), Verteilung gesamt Z1–2 77 % / Z3–SST 15 % / Z4+ 8 %. Höchster CTL-Anstieg in einer Woche: +7.3 (Struktur), +4.2 (App). Harte Tage direkt hintereinander: 0, Schlüsseltage (inkl. Long Ride) hintereinander: 0. Kraft: 23 Einheiten, davon 0 am Tag vor einer harten Radeinheit, 0 am selben Tag.
- Eventtag: Gran Fondo 120 (W25): Form +13 (App-Rechnung +13), CTL 43 bei Höchstwert 43 (App 45/45)

Beispielwochen (Mo–So):
- W1 Basis (5 h Budget, 4 Tage): – | – | – | Sweet Spot 3×12 71′ | – +Kraft | Grundlage, neue Strecke 120′ | Long Ride 75′
- W4 Basis Entlastung (5 h Budget, 4 Tage): – | VO2max Auffrischung 3×3 42′ | – +Kraft | Grundlage Z2 90′ | – | – | Long Ride 60′
- W10 Aufbau (5 h Budget, 4 Tage): – | VO2max 30/15 60′ | – | Sweet Spot 3×15 Trittwechsel 80′ | – +Kraft | Grundlage mit Fahrtechnik 30′ | Long Ride, wellig 120′
- W12 Aufbau Entlastung (5 h Budget, 4 Tage): – | Spritzig 5×1 42′ | – +Kraft | Grundlage Z2 60′ | – | – | Long Ride, wellig 90′
- W19 Spitze (5 h Budget, 4 Tage): – | VO2max 4×8 66′ | – | Schwelle 4×10 Bergtempo 90′ | – +Kraft | – | Eventsimulation 135′
- W20 Spitze Entlastung (5 h Budget, 4 Tage): – | VO2max Auffrischung 4×2 45′ | – +Kraft | Grundlage Z2 45′ | – | – | Eventsimulation 105′
- W24 Taper (5 h Budget, 4 Tage): – | Spritzig 5×1 42′ | – | Wettkampftempo 2×10 50′ | – | Grundlage Z2 60′ | Long Ride 45′
- W25 Taper (5 h Budget, 4 Tage): – | – | – | Wettkampftempo 2×4 28′ | – | Aktivierung vor dem Event 30′ | Eventtag: Gran Fondo 120 480′

### Anhang – Profil C – Ambitioniert 4,2 W/kg, 12 h/Woche, Saison mit A/B/C-Rennen

Start 2026-11-09, 42 Wochen, Start-CTL (Annahme) 75. Phasen: Basis W1–12, Aufbau W13–23, Spitze W24–29, Tapering W30–31, Regeneration W32–32, Wiederaufbau W33–38, Spitze W39–40, Tapering W41–42. Fitness-Checks in Woche [5, 13, 21, 28, 37].

| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | Basis | 6.4 | 326 | 287 | 91 | 9 | 0 | 1 | 2:30 | 70 | -5.0 | +0 | base+base |
| 2 | Basis | 10.5 | 501 | 457 | 96 | 3 | 1 | 1 | 2:45 | 69 | -0.6 | -0 | base+base |
| 3 | Basis | 10.8 | 521 | 476 | 94 | 6 | 0 | 1 | 2:45 | 69 | -0.1 | -4 | base+base |
| 4 | Basis (E) | 8.0 | 386 | 342 | 98 | 0 | 2 | 1 | 2:00 | 66 | -3.1 | +2 | leicht |
| 5 | Basis T | 10.2 | 483 | 448 | 97 | 0 | 3 | 1 | 2:30 | 66 | -0.2 | -2 | base+base |
| 6 | Basis | 10.8 | 525 | 481 | 93 | 7 | 0 | 1 | 2:45 | 66 | +0.5 | -7 | base+base |
| 7 | Basis | 10.7 | 513 | 469 | 94 | 6 | 0 | 1 | 2:45 | 67 | +0.2 | -8 | base+base |
| 8 | Basis (E) | 8.0 | 391 | 343 | 98 | 0 | 2 | 1 | 2:00 | 64 | -2.7 | -2 | leicht |
| 9 | Basis | 10.3 | 488 | 446 | 96 | 3 | 1 | 1 | 2:30 | 64 | +0.1 | -4 | base+base |
| 10 | Basis | 10.8 | 521 | 476 | 94 | 6 | 0 | 1 | 2:45 | 65 | +0.7 | -8 | base+base |
| 11 | Basis | 10.7 | 513 | 472 | 94 | 6 | 0 | 1 | 2:45 | 65 | +0.5 | -10 | base+base |
| 12 | Basis (E) | 8.0 | 386 | 339 | 99 | 0 | 1 | 1 | 2:00 | 63 | -2.5 | -3 | leicht |
| 13 | Aufbau T | 9.8 | 503 | 471 | 84 | 11 | 5 | 2 | 3:00 | 63 | +0.8 | -8 | build+build |
| 14 | Aufbau | 10.3 | 558 | 514 | 82 | 14 | 3 | 2 | 3:15 | 65 | +1.6 | -15 | build+build |
| 15 | Aufbau | 10.3 | 550 | 513 | 83 | 15 | 2 | 2 | 3:30 | 66 | +1.4 | -17 | build+build |
| 16 | Aufbau (E) | 7.7 | 377 | 350 | 91 | 7 | 2 | 1 | 2:15 | 64 | -2.5 | -10 | leicht |
| 17 | Aufbau | 10.1 | 552 | 510 | 82 | 15 | 3 | 2 | 3:00 | 65 | +1.5 | -12 | build+build |
| 18 | Aufbau | 10.2 | 550 | 506 | 81 | 14 | 5 | 2 | 3:15 | 67 | +1.2 | -15 | build+build |
| 19 | Aufbau | 10.4 | 561 | 520 | 82 | 11 | 7 | 2 | 3:30 | 68 | +1.3 | -16 | build+build |
| 20 | Aufbau (E) | 7.8 | 382 | 351 | 91 | 7 | 2 | 1 | 2:15 | 65 | -2.7 | -9 | leicht |
| 21 | Aufbau T | 10.0 | 523 | 490 | 83 | 14 | 3 | 2 | 3:00 | 66 | +0.9 | -9 | build+build |
| 22 | Aufbau | 9.4 | 559 | 521 | 75 | 16 | 8 | 3 | 2:00 | 68 | +1.5 | -3 | build+build |
| 23 | Aufbau | 10.4 | 562 | 522 | 82 | 16 | 2 | 2 | 3:30 | 69 | +1.2 | -18 | build+build |
| 24 | Spitze (E) | 7.7 | 380 | 350 | 90 | 9 | 1 | 1 | 2:45 | 66 | -2.8 | -10 | leicht |
| 25 | Spitze | 10.5 | 577 | 535 | 84 | 12 | 4 | 2 | 3:45 | 68 | +1.7 | -14 | erh |
| 26 | Spitze | 9.7 | 614 | 582 | 68 | 14 | 18 | 3 | 2:40 | 70 | +2.7 | -6 | erh |
| 27 | Spitze | 12.3 | 614 | 572 | 87 | 8 | 5 | 1 | 4:15 | 72 | +1.9 | -24 | erh |
| 28 | Spitze (E) T | 8.0 | 387 | 374 | 87 | 9 | 4 | 1 | 2:45 | 69 | -2.8 | -15 | leicht |
| 29 | Spitze | 10.5 | 585 | 538 | 83 | 9 | 8 | 2 | 3:45 | 71 | +1.3 | -13 | erh |
| 30 | Taper | 7.8 | 419 | 350 | 95 | 0 | 5 | 2 | 2:00 | 68 | -3.1 | -5 |  |
| 31 | Taper | 7.0 | 467 | 439 | 58 | 23 | 19 | 3 | 3:15 | 67 | -0.4 | +7 |  |
| 32 | Basis (E) | 5.2 | 221 | 205 | 100 | 0 | 0 | 0 | 1:00 | 61 | -5.8 | -4 | leicht |
| 33 | Aufbau | 10.3 | 553 | 511 | 84 | 11 | 5 | 2 | 3:30 | 63 | +1.9 | -8 | build+build |
| 34 | Aufbau | 10.5 | 571 | 525 | 81 | 15 | 5 | 2 | 3:30 | 65 | +1.9 | -16 | build+build |
| 35 | Aufbau | 10.8 | 585 | 548 | 80 | 15 | 5 | 2 | 3:45 | 67 | +2.1 | -20 | build+build |
| 36 | Aufbau (E) | 7.7 | 378 | 348 | 91 | 8 | 1 | 1 | 2:30 | 65 | -2.6 | -12 | leicht |
| 37 | Aufbau | 11.0 | 633 | 611 | 74 | 20 | 5 | 3 | 3:30 | 68 | +3.7 | -14 | build+build |
| 38 | Aufbau | 10.4 | 563 | 519 | 83 | 14 | 3 | 2 | 3:30 | 69 | +1.0 | -19 | build+build |
| 39 | Spitze | 11.7 | 629 | 581 | 85 | 11 | 4 | 2 | 5:00 | 72 | +2.3 | -24 | erh |
| 40 | Spitze (E) | 7.7 | 383 | 358 | 88 | 11 | 2 | 1 | 3:15 | 69 | -3.1 | -15 | leicht |
| 41 | Taper | 7.8 | 424 | 355 | 94 | 0 | 6 | 2 | 2:00 | 66 | -2.7 | +2 |  |
| 42 | Taper | 11.5 | 619 | 677 | 44 | 35 | 21 | 3 | 8:00 | 71 | +5.5 | +9 |  |

Kennzahlen: Ø 9.6 Std./Woche (ohne Taper), Verteilung gesamt Z1–2 87 % / Z3–SST 10 % / Z4+ 3 %. Höchster CTL-Anstieg in einer Woche: +5.5 (Struktur), +3.4 (App). Harte Tage direkt hintereinander: 0, Schlüsseltage (inkl. Long Ride) hintereinander: 1. Kraft: 61 Einheiten, davon 0 am Tag vor einer harten Radeinheit, 17 am selben Tag.
- A-Event: Klassiker A (W31): Form +20 (App-Rechnung +19), CTL 67 bei Höchstwert 74 (App 73/79)
- Eventtag: Hauptrennen 150 km (W42): Form +21 (App-Rechnung +19), CTL 71 bei Höchstwert 74 (App 75/79)

Beispielwochen (Mo–So):
- W1 Basis (12 h Budget, 6 Tage): – | – | – | Sweet Spot 3×12 71′ +Kraft | Grundlage mit Sprints 120′ | Long Ride 150′ | Rekom-Fahrt 45′ +Kraft
- W4 Basis Entlastung (12 h Budget, 6 Tage): – | VO2max Auffrischung 3×3 42′ | Grundlage Z2 120′ +Kraft | Grundlage Z2 120′ | Grundlage Z2 45′ | Long Ride 105′ | Rekom-Fahrt 45′
- W13 Aufbau (12 h Budget, 6 Tage): – | Fitness-Check: 20-Min-Test 60′ +Kraft | Grundlage mit Fahrtechnik 120′ | Over-Under leicht 3×9 62′ | Grundlage mit Sprints 120′ | Long Ride, wellig 180′ | Rekom-Fahrt 45′ +Kraft
- W16 Aufbau Entlastung (12 h Budget, 6 Tage): – | VO2max Auffrischung 3×3 42′ | Grundlage Z2 120′ +Kraft | Grundlage Z2 120′ | – | Long Ride, wellig 135′ | Rekom-Fahrt 45′
- W24 Spitze Entlastung (12 h Budget, 6 Tage): – | Spritzig 5×1 42′ | Grundlage Z2 120′ +Kraft | Grundlage Z2 90′ | – | Eventsimulation 165′ | Rekom-Fahrt 45′
- W25 Spitze (12 h Budget, 6 Tage): – | VO2max 5×4 61′ | Grundlage mit Fahrtechnik 120′ | Over-Under mit Antritten 3×8 61′ | Grundlage mit Sprints 120′ | Eventsimulation 225′ | Rekom-Fahrt 45′ +Kraft
- W30 Taper (12 h Budget, 6 Tage): – | Spritzig 5×1 42′ | Grundlage Z2 120′ | Wettkampftempo 2×10 50′ | Grundlage Z2 105′ | Long Ride 105′ | Rekom-Fahrt 45′
- W42 Taper (12 h Budget, 6 Tage): – | Spritzig 5×1 42′ | Grundlage Z2 90′ | Wettkampftempo 2×10 50′ | – | Aktivierung vor dem Event 30′ | Eventtag: Hauptrennen 150 km 480′

### Anhang – Profil D – Masters 55+, 3,0 W/kg, 7 h/Woche, Radmarathon 150 km / 2.000 Hm in 29 Wochen

Start 2026-11-09, 30 Wochen, Start-CTL (Annahme) 40. Phasen: Basis W1–11, Aufbau W12–22, Spitze W23–28, Tapering W29–30. Fitness-Checks in Woche [5, 13, 21].

| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | Basis | 5.7 | 290 | 255 | 89 | 11 | 0 | 1 | 2:00 | 40 | -0.4 | -4 | tech+tech |
| 2 | Basis | 6.5 | 322 | 285 | 93 | 5 | 2 | 1 | 2:00 | 40 | +0.2 | -5 | tech+tech |
| 3 | Basis | 6.8 | 343 | 305 | 90 | 10 | 0 | 1 | 2:00 | 40 | +0.6 | -7 | tech+tech |
| 4 | Basis (E) | 4.5 | 230 | 192 | 97 | 0 | 3 | 1 | 1:45 | 38 | -2.0 | -4 | leicht |
| 5 | Basis T | 6.2 | 306 | 277 | 95 | 0 | 5 | 1 | 2:00 | 39 | +0.2 | -3 | base+base |
| 6 | Basis | 6.6 | 335 | 299 | 89 | 11 | 0 | 1 | 2:00 | 39 | +0.6 | -5 | base+base |
| 7 | Basis | 6.9 | 346 | 308 | 91 | 9 | 0 | 1 | 2:00 | 40 | +0.8 | -8 | base+base |
| 8 | Basis (E) | 4.5 | 235 | 193 | 97 | 0 | 3 | 1 | 1:45 | 38 | -1.9 | -4 | leicht |
| 9 | Basis | 6.3 | 311 | 275 | 93 | 5 | 2 | 1 | 2:00 | 38 | +0.2 | -3 | base+base |
| 10 | Basis | 6.5 | 331 | 294 | 90 | 10 | 0 | 1 | 2:00 | 39 | +0.6 | -5 | base+base |
| 11 | Basis | 6.9 | 346 | 311 | 90 | 10 | 0 | 1 | 2:00 | 40 | +0.9 | -8 | base+base |
| 12 | Aufbau (E) | 4.5 | 235 | 205 | 87 | 11 | 2 | 1 | 2:00 | 38 | -1.5 | -4 | leicht |
| 13 | Aufbau T | 6.3 | 350 | 319 | 77 | 16 | 8 | 2 | 2:45 | 40 | +1.2 | -9 | build+build |
| 14 | Aufbau | 6.8 | 405 | 361 | 74 | 21 | 5 | 2 | 3:00 | 42 | +2.0 | -15 | build+build |
| 15 | Aufbau | 6.8 | 395 | 358 | 75 | 21 | 4 | 2 | 3:00 | 43 | +1.6 | -16 | build+build |
| 16 | Aufbau (E) | 4.5 | 235 | 209 | 85 | 11 | 3 | 1 | 2:00 | 41 | -2.0 | -11 | leicht |
| 17 | Aufbau | 5.8 | 366 | 325 | 70 | 25 | 6 | 2 | 2:45 | 42 | +0.9 | -8 | build+build |
| 18 | Aufbau | 6.7 | 397 | 353 | 73 | 20 | 7 | 2 | 3:00 | 44 | +1.4 | -13 | build+build |
| 19 | Aufbau | 6.9 | 406 | 366 | 75 | 15 | 10 | 2 | 3:00 | 45 | +1.5 | -15 | build+build |
| 20 | Aufbau (E) | 4.5 | 240 | 209 | 86 | 11 | 3 | 1 | 2:00 | 43 | -2.2 | -10 | leicht |
| 21 | Aufbau T | 6.5 | 370 | 338 | 74 | 21 | 5 | 2 | 2:45 | 44 | +1.0 | -9 | build+build |
| 22 | Aufbau | 6.7 | 397 | 357 | 74 | 21 | 5 | 2 | 3:00 | 45 | +1.2 | -12 | build+build |
| 23 | Spitze | 7.0 | 416 | 374 | 76 | 18 | 6 | 2 | 3:45 | 46 | +1.5 | -16 | erh |
| 24 | Spitze (E) | 4.7 | 248 | 220 | 85 | 13 | 2 | 1 | 2:30 | 44 | -2.2 | -11 | leicht |
| 25 | Spitze | 6.0 | 378 | 338 | 74 | 18 | 8 | 2 | 3:15 | 45 | +0.7 | -8 | erh |
| 26 | Spitze | 6.6 | 422 | 369 | 71 | 13 | 16 | 2 | 3:30 | 46 | +1.3 | -13 | erh |
| 27 | Spitze | 6.3 | 432 | 382 | 66 | 15 | 19 | 2 | 3:45 | 48 | +1.4 | -17 | erh |
| 28 | Spitze (E) | 4.7 | 248 | 223 | 84 | 13 | 3 | 1 | 2:30 | 45 | -2.3 | -9 | leicht |
| 29 | Taper | 4.6 | 280 | 215 | 90 | 0 | 10 | 2 | 1:15 | 43 | -2.2 | +2 |  |
| 30 | Taper | 9.0 | 450 | 544 | 32 | 45 | 24 | 2 | 8:00 | 49 | +6.1 | +6 |  |

Kennzahlen: Ø 6.0 Std./Woche (ohne Taper), Verteilung gesamt Z1–2 82 % / Z3–SST 13 % / Z4+ 5 %. Höchster CTL-Anstieg in einer Woche: +6.1 (Struktur), +3.0 (App). Harte Tage direkt hintereinander: 0, Schlüsseltage (inkl. Long Ride) hintereinander: 0. Kraft: 45 Einheiten, davon 0 am Tag vor einer harten Radeinheit, 9 am selben Tag.
- Eventtag: Radmarathon 150 (W30): Form +18 (App-Rechnung +19), CTL 49 bei Höchstwert 49 (App 52/55)

Beispielwochen (Mo–So):
- W1 Basis (7 h Budget, 5 Tage): – | – | – | Sweet Spot 3×12 71′ +Kraft | Grundlage mit Sprints 120′ | Long Ride 105′ | Rekom-Fahrt 45′ +Kraft
- W4 Basis Entlastung (7 h Budget, 5 Tage): – | VO2max Auffrischung 3×3 42′ | – | Grundlage Z2 105′ | – | Long Ride 75′ | Rekom-Fahrt 45′ +Kraft
- W12 Aufbau Entlastung (7 h Budget, 5 Tage): – | Spritzig 5×1 42′ | – | Grundlage Z2 60′ | – | Long Ride, wellig 120′ | Rekom-Fahrt 45′ +Kraft
- W13 Aufbau (7 h Budget, 5 Tage): – | Fitness-Check: 20-Min-Test 60′ +Kraft | – | Over-Under leicht 3×9 62′ | Grundlage mit Sprints 45′ | Long Ride, wellig 165′ | Rekom-Fahrt 45′ +Kraft
- W23 Spitze (7 h Budget, 5 Tage): – | VO2max 5×3 52′ | – | Over-Under 3×10 65′ | Grundlage mit Sprints 30′ | Eventsimulation 225′ | Rekom-Fahrt 45′ +Kraft
- W24 Spitze Entlastung (7 h Budget, 5 Tage): – | Spritzig 5×1 42′ | – | Grundlage Z2 45′ | – | Eventsimulation 150′ | Rekom-Fahrt 45′ +Kraft
- W29 Taper (7 h Budget, 5 Tage): – | VO2max Auffrischung 4×2 45′ | – | Wettkampftempo 2×10 50′ | Grundlage Z2 60′ | Long Ride 75′ | Rekom-Fahrt 45′
- W30 Taper (7 h Budget, 5 Tage): – | – | – | Wettkampftempo 2×4 28′ | – | Aktivierung vor dem Event 30′ | Eventtag: Radmarathon 150 480′

### Anhang – Profil E – Wenig Zeit: 4 h/Woche nur Samstag und Sonntag, Event 100 km / 800 Hm in 12 Wochen

Start 2026-11-09, 13 Wochen, Start-CTL (Annahme) 22. Phasen: Basis W1–4, Aufbau W5–9, Spitze W10–11, Tapering W12–13. Fitness-Checks in Woche [5].

| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | Basis | 2.2 | 143 | 118 | 73 | 27 | 0 | 1 | 1:11 | 21 | -0.6 | +0 |  |
| 2 | Basis | 2.3 | 143 | 116 | 80 | 13 | 7 | 1 | 1:15 | 21 | -0.6 | -1 |  |
| 3 | Basis | 2.5 | 163 | 136 | 74 | 26 | 0 | 1 | 1:17 | 21 | -0.0 | -2 |  |
| 4 | Basis (E) | 1.4 | 107 | 77 | 90 | 0 | 10 | 1 | 0:45 | 19 | -1.4 | -4 |  |
| 5 | Aufbau T | 2.2 | 138 | 129 | 71 | 14 | 15 | 1 | 1:15 | 19 | +0.0 | +1 |  |
| 6 | Aufbau | 2.5 | 173 | 152 | 72 | 15 | 13 | 1 | 1:30 | 20 | +0.6 | -3 |  |
| 7 | Aufbau | 2.4 | 160 | 143 | 74 | 16 | 11 | 1 | 1:30 | 20 | +0.3 | -7 |  |
| 8 | Aufbau (E) | 1.8 | 124 | 96 | 78 | 14 | 8 | 1 | 1:00 | 19 | -0.9 | -8 |  |
| 9 | Aufbau | 2.3 | 163 | 143 | 72 | 14 | 15 | 1 | 1:15 | 20 | +0.4 | -3 |  |
| 10 | Spitze | 2.8 | 186 | 164 | 67 | 16 | 17 | 1 | 1:45 | 20 | +0.8 | -6 |  |
| 11 | Spitze | 2.9 | 196 | 178 | 66 | 15 | 19 | 1 | 1:45 | 21 | +1.0 | -9 |  |
| 12 | Taper | 1.4 | 107 | 73 | 94 | 0 | 6 | 1 | 0:45 | 20 | -1.6 | -12 |  |
| 13 | Taper | 8.5 | 407 | 517 | 29 | 47 | 24 | 1 | 8:00 | 29 | +9.1 | -1 |  |

Kennzahlen: Ø 2.3 Std./Woche (ohne Taper), Verteilung gesamt Z1–2 73 % / Z3–SST 16 % / Z4+ 11 %. Höchster CTL-Anstieg in einer Woche: +9.1 (Struktur), +6.0 (App). Harte Tage direkt hintereinander: 0, Schlüsseltage (inkl. Long Ride) hintereinander: 12. Kraft: 0 Einheiten, davon 0 am Tag vor einer harten Radeinheit, 0 am selben Tag.
- Eventtag: Frühjahrsklassiker 100 (W13): Form +7 (App-Rechnung +7), CTL 29 bei Höchstwert 29 (App 29/29)

Beispielwochen (Mo–So):
- W1 Basis (4 h Budget, 2 Tage): – | – | – | – | – | Sweet Spot 3×12 71′ | Long Ride 60′
- W4 Basis Entlastung (4 h Budget, 2 Tage): – | – | – | – | – | VO2max Auffrischung 3×3 42′ | Long Ride 45′
- W5 Aufbau (4 h Budget, 2 Tage): – | – | – | – | – | Fitness-Check: 20-Min-Test 60′ | Long Ride, wellig 75′
- W8 Aufbau Entlastung (4 h Budget, 2 Tage): – | – | – | – | – | VO2max Auffrischung 4×2 45′ | Long Ride, wellig 60′
- W10 Spitze (4 h Budget, 2 Tage): – | – | – | – | – | VO2max 30/15 60′ | Eventsimulation 105′
- W12 Taper (4 h Budget, 2 Tage): – | – | – | – | – | Spritzig 5×1 42′ | Long Ride 45′
- W13 Taper (4 h Budget, 2 Tage): – | – | – | – | – | Aktivierung vor dem Event 30′ | Eventtag: Frühjahrsklassiker 100 480′

### Anhang – Profil E2 – wie E, mit Option „Intensität statt Umfang“ und 80 km (unter 3 Std.)

Start 2026-11-09, 13 Wochen, Start-CTL (Annahme) 22. Phasen: Basis W1–4, Aufbau W5–9, Spitze W10–11, Tapering W12–13. Fitness-Checks in Woche [5].

| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |
|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| 1 | Basis | 2.2 | 143 | 118 | 73 | 27 | 0 | 1 | 1:11 | 21 | -0.6 | +0 |  |
| 2 | Basis | 2.3 | 143 | 116 | 80 | 13 | 7 | 1 | 1:15 | 21 | -0.6 | -1 |  |
| 3 | Basis | 2.5 | 163 | 136 | 74 | 26 | 0 | 1 | 1:17 | 21 | -0.0 | -2 |  |
| 4 | Basis (E) | 1.4 | 107 | 77 | 90 | 0 | 10 | 1 | 0:45 | 19 | -1.4 | -4 |  |
| 5 | Aufbau T | 2.2 | 138 | 129 | 71 | 14 | 15 | 1 | 1:15 | 19 | +0.0 | +1 |  |
| 6 | Aufbau | 2.5 | 173 | 152 | 72 | 15 | 13 | 1 | 1:30 | 20 | +0.6 | -3 |  |
| 7 | Aufbau | 2.4 | 160 | 143 | 74 | 16 | 11 | 1 | 1:30 | 20 | +0.3 | -7 |  |
| 8 | Aufbau (E) | 1.8 | 124 | 96 | 78 | 14 | 8 | 1 | 1:00 | 19 | -0.9 | -8 |  |
| 9 | Aufbau | 2.3 | 163 | 143 | 72 | 14 | 15 | 1 | 1:15 | 20 | +0.4 | -3 |  |
| 10 | Spitze | 2.8 | 186 | 164 | 67 | 16 | 17 | 1 | 1:45 | 20 | +0.8 | -6 |  |
| 11 | Spitze | 2.9 | 196 | 178 | 66 | 15 | 19 | 1 | 1:45 | 21 | +1.0 | -9 |  |
| 12 | Taper | 1.4 | 107 | 73 | 94 | 0 | 6 | 1 | 0:45 | 20 | -1.6 | -12 |  |
| 13 | Taper | 8.5 | 407 | 517 | 29 | 47 | 24 | 1 | 8:00 | 29 | +9.1 | -1 |  |

Kennzahlen: Ø 2.3 Std./Woche (ohne Taper), Verteilung gesamt Z1–2 73 % / Z3–SST 16 % / Z4+ 11 %. Höchster CTL-Anstieg in einer Woche: +9.1 (Struktur), +6.0 (App). Harte Tage direkt hintereinander: 0, Schlüsseltage (inkl. Long Ride) hintereinander: 12. Kraft: 0 Einheiten, davon 0 am Tag vor einer harten Radeinheit, 0 am selben Tag.
- Eventtag: Frühjahrsklassiker 80 (W13): Form +7 (App-Rechnung +7), CTL 29 bei Höchstwert 29 (App 29/29)

Beispielwochen (Mo–So):
- W1 Basis (4 h Budget, 2 Tage): – | – | – | – | – | Sweet Spot 3×12 71′ | Long Ride 60′
- W4 Basis Entlastung (4 h Budget, 2 Tage): – | – | – | – | – | VO2max Auffrischung 3×3 42′ | Long Ride 45′
- W5 Aufbau (4 h Budget, 2 Tage): – | – | – | – | – | Fitness-Check: 20-Min-Test 60′ | Long Ride, wellig 75′
- W8 Aufbau Entlastung (4 h Budget, 2 Tage): – | – | – | – | – | VO2max Auffrischung 4×2 45′ | Long Ride, wellig 60′
- W10 Spitze (4 h Budget, 2 Tage): – | – | – | – | – | VO2max 30/15 60′ | Eventsimulation 105′
- W12 Taper (4 h Budget, 2 Tage): – | – | – | – | – | Spritzig 5×1 42′ | Long Ride 45′
- W13 Taper (4 h Budget, 2 Tage): – | – | – | – | – | Aktivierung vor dem Event 30′ | Eventtag: Frühjahrsklassiker 80 480′
