# Bericht F29 – Reisemodus

Stand: 15.11.2026 (begonnen am 14.11.2026)

## Kurzfassung

Der Reisemodus ist gebaut und lokal getestet. Er ist nach dem Update aus, bis man ihn selbst einschaltet. Eine Reise ändert den Plan erst, wenn ihr Vorschlag angenommen wird. Alle 265 Tests sind grün, der Build-Check auch. Nichts ist gepusht oder veröffentlicht.

Nicht geprüft: iPhone, Netlify-Build, echte Garmin-Fahrten aus einer anderen Zeitzone.

## Stand

| | |
|---|---|
| Basis-Branch | `main` bei `95d0222` (Version 200) |
| Branch | `feature/f29-reisemodus` (nur lokal) |
| Version | 201 |
| Build-ID | 20261121090000 |
| Service Worker | relentless-v38 |

Auf der Basis sind alle Bezüge vorhanden: B6 (Zeitbudget), F17 (Events), F20 (Tipps), F23 (Mobilität), F28 (Formkurve). Es fehlt nichts.

`claude/backlog.md` gibt es im Repository weiterhin nicht. Grundlage war der Prompt.

Der Prompt nennt `build.sh`, `tests/run-all.sh`, `build/APP_VERSION` und `WHATSNEW.json`. Diese Dateien gibt es hier nicht. Verwendet habe ich die tatsächlichen Stellen: `python3 tools/build.py --check`, die Testseite `tests/index.html` (`runAll()`), `APP_VERSION`/`WN_DATA` in `src/js/44-version-neuigkeiten.js`.

## Abweichungen vom Prompt

1. **Kein eigener Schritt im Assistenten.** Das Zeitbudget ist kein eigener Schritt, sondern ein Abschnitt im Schritt „Alltag“. Die Frage „Bist du in der Saison unterwegs?“ steht direkt darunter. Ein zusätzlicher nummerierter Schritt hätte alle Schrittnummern verschoben (Bearbeiten einzelner Schritte, Prüfungen). In der Schnellplanung erscheint die Frage nicht, wie das Zeitbudget auch nicht.
2. **Verschieben nur innerhalb derselben Woche.** Harte Einheiten und der Long Ride rücken auf einen freien Tag derselben Woche vor oder hinter die Reise. Über die Wochengrenze verschiebt die App nicht. Findet sich kein Tag, wird die Einheit ersetzt.
3. **Vortag der Abreise nur bei langen Reisen locker.** Als lang gilt eine Reise über 4 Stunden oder ab 3 Zeitzonen. Bei einer kurzen Dienstreise bleibt der Long Ride am Tag davor stehen.
4. **Eigenes Rad dabei:** Die freie Zeit pro Tag gilt dann nicht, die Einheiten bleiben wie geplant. Nur Reisetage und die Tage nach einem Zeitzonenwechsel werden leicht.
5. **Kein Wiedereinstieg mit reduzierten Wochen.** Nach der Rückkehr sind ein bis zwei Tage locker. Mehrwöchige Entlastung wie nach Urlaub gibt es für Reisen nicht.
6. **Garmin-Workouts:** Die App schiebt keine Workouts in den Garmin-Kalender, sie bietet nur Dateien zum Herunterladen an. Die Dateien entstehen aus dem Plan und enthalten nach dem Annehmen die Reise-Einheiten. Der vorhandene Hinweis „Plan geändert: Workouts neu exportieren“ (Zwift) habe ich für Reisen nicht eigens getestet.
7. **Krafttraining und Mobilität aus dem Plan** bleiben an Reisetagen stehen, auch wenn ein Studio nötig wäre.
8. **Uhrzeiten:** Die App zeigt in Heute und Woche keine Uhrzeiten für Einheiten. Die Ortszeit steht deshalb als eigene Zeile am Reisetag und auf dem Start („Ortszeit 09:00 Uhr · Heimat: 15:00 Uhr“).

## Quellen

Jede Quelle habe ich am 14.11.2026 über eine Websuche geprüft (Titel, Zeitschrift, Jahr, DOI). Den Volltext habe ich nicht gelesen.

| Quelle | DOI | Wofür |
|---|---|---|
| Janse van Rensburg et al. 2021, Sports Med 51(10):2029–2050 | 10.1007/s40279-021-01502-0 | Reisemüdigkeit und Jetlag, Schwelle etwa 3 Zeitzonen, Licht, Schlaf, Koffein, kurzer Aufenthalt im Heimrhythmus |
| Waterhouse et al. 2007, Lancet 369(9567):1117–1129 | 10.1016/S0140-6736(07)60529-7 | Faustregel 1 Tag je Zeitzone, nach Westen schneller |
| Mujika & Padilla 2000, Sports Med 30(2):79–87 | 10.2165/00007256-200030020-00002 | Kurze Pausen kosten wenig Form |
| Bosquet et al. 2007, Med Sci Sports Exerc 39(8):1358–1365 | 10.1249/mss.0b013e31806010e0 | Umfang senken, Intensität halten |
| Spiering et al. 2021, J Strength Cond Res 35(5):1449–1458 | 10.1519/JSC.0000000000003964 | Wenig Training reicht, wenn die Intensität bleibt |
| Halson, Burke, Pearce 2019, Int J Sport Nutr Exerc Metab 29(2):228–235 | 10.1123/ijsnem.2018-0278 | Ernährung auf Reisen, Hygiene, Trinken |

**Korrektur zum Prompt:** Das Konsens-Statement steht in *Sports Medicine*, nicht im Br J Sports Med. Die DOI aus dem Prompt (10.1136/bjsports-2020-103163) gehört nicht dazu.

**Nur Richtwerte, ohne eigene Quelle:**
- Anpassung nach Westen halb so lang wie nach Osten (0,5 Tage je Zeitzone). Die Richtung stammt aus den Quellen, der genaue Faktor ist aus dem Gedächtnis angesetzt und nicht im Volltext nachgeprüft.
- Höchstens 5 Tage ohne harte Intervalle nach einem Zeitzonenwechsel.
- Ein bis zwei lockere Tage nach der Rückkehr.
- Grenze 4 Stunden Reisedauer.
- Aufbau und Dauer der Hotel-Einheiten (4–5 × 3 Min., 2–3 × 8 Min.).
- Lichtzeiten nach Richtung. Sie sind bewusst grob gehalten.
- Lauf mit Bergauf-Reizen auf langen Reisen.

Keine Dosierung von Melatonin oder Schlafmitteln, nur „nach ärztlicher Abklärung“. Keine Kalorienziele. Ein Test prüft beides für die Tipps.

## Planregeln

Die Regeln greifen beim Erzeugen jeder Woche, aber nur für angenommene Reisen. Deshalb rechnen Wochensummen, Formkurve und Event-Prognosen ohne weiteres Zutun mit.

- **Reisetag:** über 4 Stunden keine Einheit, dazu die Kurzroutine „Nach dem Flug“ (10 Min.). Bis 4 Stunden Mobilität (15 Min.), mit eigenem Rad höchstens eine lockere Stunde.
- **Aufenthalt ohne Rad:** harte Einheit → Kraft ohne Geräte, Grundlage → Stabilität, lockere Fahrt → Mobilität. Die Dauer richtet sich nach der freien Zeit (15/20/30/45 Min.).
- **Hotel-Ergometer oder Laufband:** VO2max → 4–5 × 3 Min., Schwelle und Sweet Spot → 2–3 × 8 Min., sonst 15–45 Min. locker. Unter 30 Min. freier Zeit keine Intervalle, höchstens zwei harte Reize pro Woche. Auf dem Laufband bergauf gehen statt laufen.
- **Laufen draußen:** nur locker, mit Hinweis zum vorsichtigen Einstieg. Ab mehr als 7 Tagen ein Bergauf-Reiz pro Woche.
- **Eigenes Rad:** Einheiten bleiben.
- **Schlüsseleinheiten:** auf einen freien Tag derselben Woche, nicht neben einen anderen harten Tag.
- **Zeitzonen ab 3 Stunden:** nach der Ankunft und nach der Rückkehr keine harten Intervalle (Dauer nach Faustregel, höchstens 5 Tage).
- **Nach der Rückkehr:** 1 Tag locker, 2 Tage ab 7 Tagen Reise oder ab 3 Zeitzonen.
- **Unberührt:** Eventtag, Aktivierung vor dem Event, Urlaubstage, von dir verschobene oder gesperrte Tage, alles vor heute.
- **Zeitbudget:** Ersatz ist nie länger als die ersetzte Einheit, Verschieben tauscht nur Tage. Ein Test prüft, dass keine Woche länger wird.

Annehmen legt vorher einen Schnappschuss an („Rückgängig“ 10 Minuten). Zusätzlich gibt es an der Reise dauerhaft „Anpassung zurücknehmen“. Ein Test prüft, dass danach alle Wochen exakt wie vorher sind.

## Neue Übungen, Sequenzen, Sprachdateien

- 4 neue Übungen mit Strichmännchen, Animation, Ausführung, Fehlern und Sprechtext: Wandsitzen, Liegestütz, Ausfallschritt rückwärts, Good Morning ohne Gewicht. Die App hat jetzt 45 Übungen.
- 11 Sequenzen: Kraft und Stabilität je 15/20/30/45 Min., Mobilität 15/20 Min., „Nach dem Flug oder nach langem Sitzen“ 10 Min. Ohne Geräte, ohne Sprünge, mit Sicherheitshinweis zu Stuhl, Bett und Wand. Ein Test prüft, dass die Dauer höchstens 25 % von der Angabe abweicht.
- 130 neue Sprachdateien mit Piper erzeugt (65 Deutsch, 65 Englisch). Insgesamt 541 und 542 Dateien, 18,2 MB.
- 28 Tipps in der neuen Kategorie „Unterwegs“, 24 davon mit Quelle.

## Garmin-Import und Zeitzonen

- Garmin liefert in der Aktivitätenliste `startTimeGMT` und `startTimeLocal`. Die App verwendet die GMT-Zeit. Die FIT-Datei enthält UTC-Zeitstempel.
- Bisher bestimmte die Zeitzone des Geräts **beim Import** den Tag einer Fahrt. Wer eine Fahrt aus New York erst zu Hause abgleicht, bekam für eine Abendfahrt den Folgetag.
- Neu: Liegt eine Fahrt in einer eingetragenen Reise mit Zeitzone, zählt der Kalendertag am Reiseziel. Außerhalb von Reisen und bei ausgeschaltetem Reisemodus bleibt alles wie bisher.
- Getestet: kurz vor und nach Mitternacht, über die Datumsgrenze (Auckland, Honolulu), Nacht der Umstellung auf Sommerzeit, die Wochen im März, in denen USA und Europa unterschiedlich umstellen.
- Nicht getestet: echte Garmin-Daten. `startTimeLocal` wird nicht ausgewertet, weil die Reise die Zeitzone schon vorgibt.

## Bei ausgeschaltetem Reisemodus verborgen

| Stelle | Geprüft |
|---|---|
| Start: Vorschlag, „Du bist unterwegs“, Ortszeit, Schlaf-Hinweis | Test |
| Woche: Knopf „Ich bin unterwegs“, Band am Tag, Ortszeit | Test |
| Tageskarte: Ersatzprogramm, Hinweis Puls und Gefühl | Test |
| Saisonplanung: Liste und Band „Reisen“ | Test |
| Events: „Anreise und Zeitzone“, Körperzeit, Packliste | Test |
| Formkurve: Band und „Reise: …“ im Infofeld | Test |
| Logbuch: Kennzeichnung „Reise“ | Test |
| Tipps „Unterwegs“ | Test |
| Tag einer Fahrt nach Zielzeitzone | Test |
| Plan, Formkurve, Prognose, Tipp-Auswahl identisch | Test, dazu die unveränderten Vergleichsstände der fünf Plan-Szenarien |

Sichtbar bleiben zwei Dinge: die Zeile „Reisemodus · Aus“ in den Einstellungen (dort schaltet man ein) und in der Planerstellung die Frage bzw. die Zeile „Reisemodus ist aus – in den Einstellungen änderbar“.

Eine Ausnahme: Wer beim Ausschalten „Nein, Plan so lassen“ wählt, behält die angenommenen Einheiten im Plan. Sie heißen weiter „Reisetag“ oder „Hotel-Ergometer“, nur Band und Hinweise fehlen.

## Tests

- 265 Tests, alle grün. 15 davon neu in `tests/reise.test.js`.
- `python3 tools/build.py --check`: aktuell.
- Vergleichsstände neu geschrieben und geprüft: In den fünf Plan-Szenarien ändern sich nur die Seite „Mehr“ („45 Übungen“) und die Einstellungen (neue Zeile „Reisemodus · Aus“). Der Sprachkatalog ist um 130 Sätze gewachsen.
- Englisch: keine fehlenden Übersetzungen auf den Reise-Seiten (177 neue Einträge im Wörterbuch).

Screenshots liegen in `claude/bilder/f29-*.png`, je 375 pt hell und 430 pt dunkel: Assistent, Schalter aus, Einstellungen aus, Woche aus, Formular, Vorschlag mit Jetlag-Hinweis, Woche mit Band, Formkurve, Sequenz, Event-Warnung, Saisonplanung, Start unterwegs.

## Offene Punkte

- iPhone, VoiceOver und Kontrast sind nicht am Gerät geprüft. Der Schalter hat Rolle, Zustand und Beschriftung.
- Die Screenshots 375 dunkel und 430 hell fehlen.
- Der Vorschlag ist auf dem Handy lang (eine Zeile je betroffenem Tag mit zwei Mini-Profilen).
- Mehrere Reisen direkt hintereinander sind nicht eigens getestet.
- Die Wattkacheln der Hotel-Einheit zeigen Puls und Empfinden statt Watt. Die Downloads (.fit, .zwo) enthalten weiter Wattziele.
- In englischen Reise-Karten stehen Dauern noch als „2:15 Std.“.

## Vorschläge

- Wiedereinstieg nach langen Reisen ohne Rad wie nach Urlaub (eine leichtere Woche).
- Verschieben über die Wochengrenze.
- Krafttraining im Studio an Reisetagen durch die Sequenz „Unterwegs“ ersetzen.

## Was du zum Veröffentlichen tun musst

Nicht ausgeführt. Der Ablauf wie bisher:

1. „Ja, hochladen“ – dann pushe ich den Branch `feature/f29-reisemodus`.
2. „Ja in Main“ – dann führe ich ihn per Fast-forward nach `main` und pushe. Netlify baut daraus automatisch.
3. Danach auf dem iPhone prüfen: Update-Hinweis und „Neu in Version 201“ mit dem Knopf „Einschalten“, eine Reise eintragen, Vorschlag annehmen und zurücknehmen, eine Sequenz „Unterwegs“ mit Ansage starten.
