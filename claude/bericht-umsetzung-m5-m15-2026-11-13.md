# Umsetzung aus dem Audit: M5 bis M15 (M7 war schon umgesetzt)

Stand 13.11.2026 · Branch `feature/training-m5-m15` (baut auf `feature/training-m3-m4` auf) · Version 179, Build 20261113150000, Service Worker `relentless-v16` · **nicht veröffentlicht, kein Push, kein Merge.** Ein Commit je Maßnahme (M9/M10, M11/M12 und M13–M15 jeweils zusammen).

## Was neu ist

### M5 – Belastung (TSS) realistischer
- **Geplante Einheiten:** Die Belastung wird aus dem Aufbau berechnet: Ein- und Ausfahren 60 % FTP, lockere Pausen 50 %, Belastungsphasen in der Mitte des Zielbereichs, kurze Wechsel (30/15) als Mittel der Serie, daraus Normalized Power. Renntage mit der haltbaren Intensität IF = 1 − 0,1 · ln(Std.). Beispiel: Schwelle 2×20 mit 85 Min. = 103 TSS (vorher 130); eine Stunde Antritte zählt jetzt weniger als eine Stunde an der Schwelle.
- **Fahrten ohne Wattmesser:** aus dem Durchschnittspuls im Verhältnis zum Schwellenpuls (Zuordnung der Pulsbereiche zu den Leistungsbereichen nach Coggan), sonst aus dem Empfinden nach der Fahrt (1 bis 10, Session-RPE nach Foster 2001), sonst wie bisher 42 TSS pro Stunde. Das wirkt auf Form-Kurve und Analyse; der Erklärtext ist angepasst.
- Folge: Geplante Wochenbelastung und Fitness-Prognose sind etwa 10 % niedriger als bisher angezeigt, aber näher an dem, was ein Wattmesser misst.

### M6 – Pausen, Urlaub, Krankheit
- **Pause erkennen:** Ist seit 7 Tagen oder mehr keine Fahrt und keine erledigte Einheit eingetragen (Urlaub ausgenommen, Plan läuft seit mindestens 14 Tagen), fragt die Startseite nach. **Nur mit Zustimmung** plant die App den Wiedereinstieg:
  - 7–13 Tage: eine Woche mit höchstens 70 % Umfang und einer harten Einheit.
  - 14–27 Tage: zwei Wochen (60 %, 80 %), nur Grundlage und Sweet Spot.
  - ab 28 Tagen: dazu der Vorschlag FTP −5 % und ein Fitness-Check zwei Wochen später (wieder nur mit Zustimmung).
  - „Nein, ich habe trainiert“ lässt den Plan unverändert.
- **Urlaub:** Einstellungen → Alltag und Planstart → „Urlaub und Pausen“. An Urlaubstagen keine Einheiten („Urlaub“), danach ab 7 Tagen automatisch ein Wiedereinstieg nach Länge. Endet der Urlaub spät in der Woche, beginnt der Wiedereinstieg in der Woche danach.
- **Krankheit am Wochenende:** „Krank“ am Samstag oder Sonntag bzw. „richtig platt“ am Sonntag macht auch Montag (und Dienstag) der nächsten Woche locker.

### M8 – Phasen
- Basis und Aufbau höchstens 12 Wochen, Spitze 3 bis 6 Wochen. Überzählige Wochen am Anfang heißen **„Allgemeine Vorbereitung“** (Grundlage, Kraft, Technik, Sweet Spot; bei wenig Wochenzeit zusätzlich die kurze VO2max-Einheit aus M4).
- Basis und Aufbau enden mit einer Entlastungswoche.
- **VO2max-Block** als Option in der Planung (sichtbar ab 3,5 W/kg und 8 Std. pro Woche): eine Aufbauwoche mit drei VO2max-Einheiten direkt vor einer Entlastungswoche, Long Ride in dieser Woche kurz und locker. Nur ab 5 Trainingstagen.
- Dein Plan (A): Allgemeine Vorbereitung W1–16 (bis Ende Februar), Basis W17–28, Aufbau W29–40, Spitze W41–45, Tapering W46–47.

### M9 – Gesundheit und Überlastung
- **Gesundheitshinweis** auf der Startseite bis „Verstanden“, danach dauerhaft unter Einstellungen → Gesundheitshinweis (wann ärztlich abklären, Warnzeichen, nicht mit Fieber).
- **„Viel Belastung, wenig Erholung“** erscheint erst, wenn mindestens zwei Zeichen zusammenkommen: Form an 10 von 14 Tagen unter −25; an 4 von 10 Tagen müde/platt; zwei harte Einheiten in 14 Tagen unter Soll; an 3 der letzten 5 Tage auffällige Morgenwerte. Angebot: Erholungswoche (mit Zustimmung) oder in einer Woche wieder prüfen.

### M10 – Übergang Winter → Sommer
- Steigt das Zeitbudget von einem Monat zum nächsten, wächst die Wochenzeit um höchstens 1 Std. oder 15 % pro Woche (das Größere). Beispiel 4 → 10 Std.: 5, 6, 7, 8, 9, 10. Sinkt das Budget, gilt es sofort.

### M11 – Ermüdungsresistenz
- **„Long Ride mit hartem Finale“** im Aufbau jede zweite Belastungswoche, für Events über 3 Std. und Rennen: die ersten zwei Drittel locker, dann 2×8 Min. (später 3×8) an der Schwelle. Der Text sagt offen, dass die beste Trainingsform dafür noch kaum untersucht ist.

### M12 – Kraft
- Nach 12 Wochen schwerem Krafttraining folgt die Erhaltung (eine Einheit pro Woche).
- In Wochen mit Eventtag, A- oder B-Rennen höchstens eine Einheit, nicht in den drei Tagen davor.
- Liegt die Krafteinheit am Tag einer harten Radeinheit: Hinweis „erst Rad, dann Kraft, möglichst mit einigen Stunden Abstand“.

### M13 – Plananpassung
- Die Prüfung beim Verschieben, bei Zusatzfahrten und beim Zeitbudget erkennt jetzt auch harte Tage über die Wochengrenze (Sonntag/Montag) und warnt bei weniger als 8 Std. pro Woche vor einer dritten harten Einheit.

### M14 – Hitze
- Ab 28 °C in der Trainingszeit (mit Ort und Vorhersage) zeigt die Startseite vor harten oder langen Einheiten Hinweise (früh/spät fahren, Intensität etwa 5 % senken, 500–1000 ml pro Stunde mit Salz, Warnzeichen) und bietet „Auf einen anderen Tag legen“ an. Auch die Prüfung beim Verschieben nennt Hitze.
- Neuer Tipp 10 bis 21 Tage vor Sommer-Events zur Hitzeanpassung (Racinais et al. 2015).

### M15 – Kleinigkeiten
- C-Rennen-Texte (Planung, Saisonkarte, Glossar): „ohne Tapering davor“ statt „Tag davor locker“.
- Kohlenhydratladen einheitlich: 36 bis 48 Std. vorher, 10 bis 12 g pro kg und Tag (Burke 2011), in Saisonprognose und Tipps.
- **Charakter der Strecke** in der Planung wählbar (automatisch, Alpin, Hügelig, Wellig mit kurzen Anstiegen, Flach, Ultra). Im Anforderungsprofil steht, wenn er von Hand festgelegt ist.
- Nach Saisonende zeigt die Karte eine konkrete Übergangsphase für zwei Wochen.

## Wirkung in der Simulation (Version 178 → 179)

| Profil | Stand | Budgetnutzung | Std./Woche | harte Tage Basis (ab W5) | Zeit über Z2 | max. ΔCTL | tiefste Form | Fitness am Event | Form am Event |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| A Nutzer | vorher | 94 % | 6,3 | 2,0 | 24 % | +3,6 | −25 | 49 | +17 |
| A Nutzer | jetzt | 94 % | 6,2 | 1,7 | 19 % | +2,5 | −20 | 49 | +16 |
| B Einsteiger | vorher | 95 % | 4,7 | 1,0 | 24 % | +1,9 | −13 | 42 | +8 |
| B Einsteiger | jetzt | 95 % | 4,7 | 1,0 | 25 % | +2,0 | −13 | 41 | +8 |
| C Ambitioniert | beide | 93 % | 11,1 | 1,0 | 16 % | +3,3 | −26 | 69 | +21 |
| D Masters | vorher | 96 % | 6,7 | 1,0 | 21 % | +2,3 | −18 | 49 | +13 |
| D Masters | jetzt | 96 % | 6,7 | 1,0 | 21 % | +2,3 | −19 | 48 | +13 |
| E Wochenende | beide | 88 % | 3,5 | – | 22 % | +1,4 | −16 | 28 | +9 |

Die Struktur-Schätzung der Simulation und die App rechnen jetzt fast gleich (Verhältnis 1,00 statt 1,07 bis 1,21).

**Dein Profil (A):** Durch die 16 Wochen Allgemeine Vorbereitung steigt Sweet Spot im Winter nicht weiter (3×12 bleibt), die Leiter beginnt erst im März. Der Winter bleibt bei zwei harten Einheiten (Sweet Spot und kurze VO2max-Einheit). Im Sommer folgen Basis, Aufbau mit hartem Finale im Long Ride und die Spitze wie bisher. Insgesamt etwas weniger Intensität als in Version 178 (19 % statt 24 % der Zeit über Zone 2), die Form am Renntag bleibt bei +16.

## Was du wissen solltest
- **Laufende Pläne:** Wie bei M3/M4 gelten die neuen Regeln für kommende Wochen ohne Rückfrage (so hattest du es entschieden). Ausnahmen mit Zustimmung: Wiedereinstieg nach einer erkannten Pause, FTP-Senkung danach, Erholungswoche bei Überlastung.
- **Hitzehinweise** gibt es nur mit eingestelltem Ort (Wettervorhersage).
- **Nicht umgesetzt:** Hitzeanpassung als eigener Planbaustein (es gibt nur den Tipp), automatische Stufenwahl nach Bewertung (aus M3), der Hinweis zur Quelle der Belastung an jeder einzelnen Fahrt (nur im Erklärtext).
- **Grenzen:** Die Pause-Erkennung kennt nur eingetragene Fahrten und abgehakte Einheiten. Wer trainiert, aber nichts einträgt, bekommt die Frage und beantwortet sie mit „Nein, ich habe trainiert“.
- Nicht auf dem iPhone geprüft.

## Tests
- 177 von 177 Tests bestehen (12 neue in `tests/m5-m15.test.js`, Unit-Test zur Belastung angepasst), `python3 tools/build.py --check` grün.
- Vergleichsstände neu geschrieben: Pläne aller Szenarien (Belastung, Phasen), Startseiten (Gesundheitshinweis), Form am Renntag, Saisonprognose. Die Liste fehlender Übersetzungen hat keine neuen Einträge; 130 neue englische Einträge, darunter einige ältere Lücken aus dem Kraftblock.
- Simulation: `tools/audit/out/simulation.json`, Vergleich in `tools/audit/out/vergleich-v178-v179.md`.

## Quellen (neu in der App)
Foster C et al. (2001), J Strength Cond Res 15:109–115 · Mujika I, Padilla S (2000), Sports Med 30:79–87 · Rønnestad BR et al. (2014), Scand J Med Sci Sports 24:34–42 · Meeusen R et al. (2013), Med Sci Sports Exerc 45:186–205 · Pelliccia A et al. (2021), ESC-Leitlinie Sportkardiologie, Eur Heart J 42:17–96 · Maunder E et al. (2021), Sports Med 51:1619–1628 · Jones AM (2024), J Physiol 602:4113–4128 · Rønnestad BR, Mujika I (2014), Scand J Med Sci Sports 24:603–612 · Racinais S et al. (2015), Br J Sports Med 49:1164–1173 · Burke LM et al. (2011), J Sports Sci 29(S1):S17–S27.
