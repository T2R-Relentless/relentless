# Umsetzung aus dem Audit: M3 (Steigerung der Intervalle) und M4 (Pläne bei wenig Zeit)

Stand 13.11.2026 · Branch `feature/training-m3-m4` (baut auf `feature/training-m1-m2-m7` auf) · Version 178, Build 20261113090000, Service Worker `relentless-v15` · **nicht veröffentlicht, kein Push, kein Merge.**

Grundlage: `claude/bericht-audit-trainingslogik-2026-11-12.md`, Maßnahmen M3 und M4. Alle Änderungen stehen in `src/js/05-plan-generator.js`.

## M3 – Die Einheiten werden über die Wochen schwerer

Bisher wechselte nur die Form der Einheit, die Belastungszeit blieb gleich. Jetzt folgt jede Einheit einer Leiter:

| Einheit | Stufen (Wiederholungen × Minuten) | Belastungszeit |
|---|---|---|
| Sweet Spot | 3×10 → 3×12 → 2×20 → 3×15 → 2×25 → 3×20 | 30 → 60 Min. |
| Schwelle | 3×8 → 3×10 → 2×15 → 2×18 → 2×20 → 3×15 | 24 → 45 Min. |
| VO2max | 4×3 → 5×3 → 4×4 → 5×4 → 6×4 | 12 → 24 Min. |
| VO2max 30/15 | 2×10 → 2×13 → 3×10 → 3×13 → 4×11 → 4×13 (Serien × Wiederholungen) | 10 → 26 Min. |

**Regeln**
- Sweet Spot steigt ab Planstart, Schwelle, VO2max und 30/15 ab der ersten Phase nach der Basis.
- Eine Stufe dauert ein bis drei Belastungswochen, je nach Länge des Plans. Entlastungswochen zählen nicht mit.
- Einstieg nach Niveau: unter 2,5 W/kg auf der ersten Stufe (die oberste Stufe und VO2max 4×8 entfallen), sonst auf der zweiten, ab 4 W/kg auf der dritten. Für dich (3,6 W/kg) beginnt Sweet Spot also wie bisher bei 3×12.
- Die Formen wechseln weiter: Over-Under, Kraftausdauer, Trittwechsel, Bergtempo, „am Berg“. Auch die Over-Under-Einheiten wachsen mit (2 bis 4 Serien).
- Eine Intervalleinheit dauert höchstens etwa ein Drittel der Wochenzeit (mindestens 60 Min.); sonst kürzt die App Ein- und Ausfahren und dann die Wiederholungen.
- Unverändert: Auffrischung in Entlastungswochen und im Tapering, Rampen, Antritte, lange Schwelle 3×15, Sweet Spot 2×30 und Tempo 2×40 (Ultra), VO2max 4×8 als Form auf den oberen Stufen.

**Dein Profil (A), Beispiele:** Woche 1 Sweet Spot 3×12 · Woche 6 Sweet Spot 2×20 · Woche 14 Sweet Spot 2×25 · ab Woche 19 Sweet Spot 3×20 · 30/15 von 2×13 (Woche 19) auf 4×13 (Woche 35) · in der Spitze Schwelle 3×15.

## M4 – Pläne bei wenig Zeit

1. **Long Ride:** Seine Länge kommt aus dem Event und wird nicht mehr mit „Wochenstunden durch 8“ gekürzt. Bei wenig Zeit darf er bis zu 45 % des Wochenbudgets dauern (bei höchstens zwei Trainingstagen 55 %). Er ist nie kürzer als bisher.
2. **Grundlage nie länger als der Long Ride:** Die Auffüll-Fahrten sind höchstens so lang wie der Long Ride der Woche.
3. **Budget nutzen:** Sind alle Trainingstage belegt und fehlt noch Zeit, verlängert die App erst den Long Ride (höchstens ein Viertel über dem Zielwert aus dem Event), dann Grundlagenfahrten, zuletzt das Ausfahren der Intervalleinheiten um bis zu 20 Min. („Heute mit längerem Ausfahren in Zone 2“).
4. **Zweite harte Einheit in der Basis:** Bei 3 bis 6 Std. pro Woche und mindestens drei Trainingstagen kommt ab Woche 5 eine kurze VO2max-Einheit dazu (4×4, 5×3 oder 8×2). Nicht unter 2,5 W/kg und nicht beim Ziel „Ausdauer“.
5. **Unter 5 Std.:** zwei harte Einheiten statt einer, wenn mindestens drei Trainingstage und 3 Std. vorhanden sind.
6. **Zwei Trainingstage:** Der Long Ride bekommt den Hinweis, die letzten 20 bis 30 Min. im Sweet Spot zu fahren, wenn die Beine gut sind.

## Vorher und nachher (Simulation der fünf Profile)

„Vorher“ ist Version 177. Zeit über Z2 = Anteil der Wochenzeit ab 76 % FTP. Fitness und Form nach der Struktur-Schätzung aus dem Audit.

| Profil | Stand | Budgetnutzung | Std./Woche | harte Tage Basis (ab W5) | Grundlage länger als Long Ride | Zeit über Z2 | längste Einheit | max. ΔCTL | tiefste Form | Fitness am Event | Form am Event |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| A Nutzer | vorher | 87 % | 5,8 | 1,0 | 24 Wochen | 20 % | 3:00 | +3,2 | −20 | 47 | +13 |
| A Nutzer | jetzt | 94 % | 6,3 | 2,0 | 0 Wochen | 24 % | 3:45 | +3,6 | −25 | 49 | +17 |
| B Einsteiger | vorher | 94 % | 4,7 | 1,0 | 10 Wochen | 25 % | 2:45 | +2,2 | −13 | 41 | +8 |
| B Einsteiger | jetzt | 95 % | 4,7 | 1,0 | 0 Wochen | 24 % | 2:45 | +1,9 | −13 | 42 | +8 |
| C Ambitioniert | vorher | 88 % | 10,5 | 1,0 | 5 Wochen | 15 % | 5:00 | +3,7 | −24 | 67 | +21 |
| C Ambitioniert | jetzt | 93 % | 11,1 | 1,0 | 0 Wochen | 16 % | 5:00 | +3,3 | −26 | 69 | +21 |
| D Masters | vorher | 96 % | 6,7 | 1,0 | 7 Wochen | 19 % | 3:45 | +2,4 | −17 | 48 | +13 |
| D Masters | jetzt | 96 % | 6,7 | 1,0 | 0 Wochen | 21 % | 3:45 | +2,3 | −18 | 49 | +13 |
| E Wochenende | vorher | 62 % | 2,5 | – | 0 Wochen | 28 % | 1:45 | +1,0 | −12 | 23 | +7 |
| E Wochenende | jetzt | 88 % | 3,5 | – | 0 Wochen | 22 % | 2:30 | +1,4 | −16 | 28 | +9 |

Die Akzeptanzkriterien aus dem Audit sind erfüllt: Profil E nutzt 88 % des Budgets (Ziel 85 %), bei Profil A ist der Long Ride in jeder Woche die längste lockere Fahrt, und ab Woche 5 stehen zwei harte Einheiten im Plan. Der CTL-Anstieg bleibt bei allen Profilen unter +4 pro Woche, die Form am Renntag im Zielbereich.

## Was du wissen solltest

- **Laufende Pläne ändern sich ab der nächsten Woche.** Die gespeicherte laufende Woche bleibt, wie sie ist; kommende Wochen werden mit den neuen Regeln erzeugt. Anders als bei M7 gibt es dafür keine Rückfrage in der App, nur den Hinweis unter „Was ist neu“. Wenn du lieber eine Zustimmung pro Plan möchtest, müsste das ergänzt werden.
- **Dein Sommer wird fordernder:** tiefste Form −25 statt −20, Sweet Spot ab Woche 19 bei 3×20 (97 Min.). Das liegt im üblichen Rahmen eines Aufbaus, ist aber spürbar mehr als bisher.
- **Sweet Spot erreicht bei langen Plänen früh die oberste Stufe** (bei dir Woche 19) und bleibt dort. Eine feinere Gliederung langer Phasen wäre M8.
- **Der Long Ride ist im Sommer länger als das Rennen** (bis 3:45 Std. für dein 2-Stunden-Rennen), weil die Zeit an vier Tagen sonst nicht unterkommt. Die Obergrenze liegt ein Viertel über dem Zielwert aus dem Event.
- **Ziel „Fit und gesund“:** Der Long Ride wird auch dort länger (im Testszenario 2:00 statt 1:15 Std.), bleibt aber im Tagesbudget.
- **Nicht umgesetzt:** „nach der Entlastungswoche eine Stufe zurück“ und die automatische Stufe nach Bewertung („unter Soll“ halten, „über Soll“ +1). Beides stand im Audit als Vorschlag.
- **Belastungsrechnung:** Die TSS-Werte der App überschätzen harte Einheiten weiterhin (M5 ist offen). Längere Einheiten vergrößern diesen Fehler etwas.
- Nicht auf dem iPhone geprüft.

## Tests
- 165 von 165 Tests bestehen (8 neue in `tests/progress.test.js`), `python3 tools/build.py --check` ist grün.
- Vergleichsstände neu geschrieben und geprüft: Pläne aller fünf Szenarien (Stufen, längere Long Rides), davon abhängige Seiten, Form am Renntag der Saison (+15 statt +14), Monatssummen des Zeitbudgets.
- 15 neue englische Wörterbucheinträge; alle erzeugten Einheitennamen und Beschreibungen von fünf Profilen sowie das Anforderungsprofil auf Englisch ohne Lücken geprüft.
- Simulation: `tools/audit/out/simulation.json` und `tabellen.md` (neu), `simulation-v177.json` (vorher), Vergleich mit `python3 tools/audit/vergleich.py`.
