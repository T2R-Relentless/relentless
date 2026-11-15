# Bericht F31 – Events (Rennen) nachträglich anpassen

Stand 15.11.2026 · Branch `feature/f31-events-bearbeiten` · nicht hochgeladen

## Eckdaten

| | |
|---|---|
| Basis-Branch | `main` mit Version 206 (Commit `882fbc8`). Er enthält F17 (Events, Zielzeiten, Plan-Check), F28 (Formkurve), F29 (Reisemodus) und F30. Kein Bezug fehlt. |
| Branch | `feature/f31-events-bearbeiten` |
| Version | 207 |
| Build-ID | `20261206090000` |
| Service Worker | `relentless-v44` |
| Commits | drei Commits: Logik und Oberfläche, Tests, Version mit Bericht (Liste am Ende) |

Abweichungen vom Prompt, weil das Repository anders aufgebaut ist:

| Prompt | Hier |
|---|---|
| `build.sh --check` | `python3 tools/build.py --check` |
| `tests/run-all.sh` | Browser-Tests (`runAll()`) |
| `build/APP_VERSION`, `BUILD_ID` | `src/js/44-version-neuigkeiten.js`, `src/js/26-statistik-update.js`, `public/version.json` |
| `WHATSNEW.json` | `WN_DATA` |

## 1. Bestandsaufnahme

**Wo Events liegen:**
- Der Saisonhöhepunkt steht direkt im Plan (`S.p.eventName`, `eventDate`, `dist`, `hm`, `course`, `kind`).
- Alle anderen Events stehen in `S.p.subs` (`id`, `name`, `date`, `prio`, `dist`, `hm`, `kind`, `min`).
- Beide sind im Entwurf `S.d` gespiegelt.
- Angelegt wird im Assistenten (Schritt „Saison“, `subAdd`). Liegt ein neues Event nach dem Höhepunkt, wird es selbst zum Höhepunkt (`seasonSwap`).

**Bearbeiten vorher:**
- In der Event-Liste ging nur die Art (Chips).
- Im Assistenten ließen sich Events löschen und die Priorität umschalten, aber Name, Datum und Strecke nicht ändern.

**Abhängigkeiten:**
- Die Wochen werden aus dem Plan berechnet (`genWeek`). Die Phasen richten sich nach dem Datum des Höhepunkts, Tapering und Erholung nach dem Datum und der Priorität jedes Events (`applySubs`).
- Damit folgen alle kommenden Wochen, die Formkurve (F28, `vzFuture`), die Saisonübersicht, der Plan-Check (F17), „Tage bis“, die Reisemodus-Warnungen (F29) und die Garmin-Workouts (beim Export aus dem Plan erzeugt) einer Änderung von selbst.
- Gespeichert ist nur die laufende Woche (`S.plan`). Sie wird deshalb beim Annehmen ab morgen neu gesetzt.

**Zielzeit-Prognose:**
- Leistungsbilanz nach Martin et al. 1998 (doi:10.1123/jab.14.3.276) mit FTP am Eventtag, Gewicht, Distanz, Höhenmetern bzw. Streckenprofil und dem Windschatten der Art (Rennen/Jedermann im Feld, RTF in der Gruppe, Zeitfahren solo).
- Bei Events über 3 Std. gibt es einen Abschlag, wenn die längste Einheit im Plan kurz ist.

**FTP am Eventtag** (im Screenshot 275/278 W):
- `ftpProj`, ein Faustmodell. Möglicher Zuwachs = 1,5 % je Wochenstunde (4–20 %), gewichtet nach Leistungsniveau in W/kg. Er nähert sich mit der Zeit einem Plateau: 1 − e^(−Wochen/12).
- Deshalb liegt die Prognose über der eingetragenen FTP (F7), und zwar umso mehr, je weiter das Event entfernt ist.
- Die Karte sagt das jetzt unter dem Wert: „Prognose aus deiner FTP (265 W) und dem Planverlauf bis dahin“.

## 2. Formular „Event bearbeiten“

Es gibt ein Formular für Anlegen, Bearbeiten und Duplizieren. Aufruf über den Stift auf jeder Karte (Vorlesetext „Event bearbeiten: Name“) oder durch Antippen des Titels. Neu ist der Knopf „Event hinzufügen“ unter der Liste.

| Feld | planrelevant | Hinweis |
|---|---|---|
| Name | nein | Umlaute und Sonderzeichen bleiben unverändert (bis 80 Zeichen) |
| Datum | ja | |
| Startzeit | nur mit Reisemodus | |
| Zeitzone | nur mit Reisemodus | nur dann sichtbar |
| Distanz, Höhenmeter | ja | |
| Streckenprofil (GPX, TCX, FIT) | ja | nur beim Saisonhöhepunkt, siehe unten |
| Priorität A/B/C | ja | mit einem Satz zur Tapering-Länge je Stufe |
| Art (Rennen, Jedermann, RTF, Zeitfahren) | ja | |
| Eigene Zielzeit | nein | steht neben der Prognose: „Dein Ziel 2:05 · Prognose 2:00 · nötig etwa 255 W FTP“ (gleiches Modell, Rückwärtsrechnung) |
| Notiz, Link | nein | Link nur mit http(s) |

**Prüfungen** mit verständlicher Meldung:
- Name und Datum fehlen
- Datum in der Vergangenheit oder vor dem Planstart
- gleicher Tag wie der Saisonhöhepunkt
- Distanz 1–2.000 km, Höhenmeter 0–20.000
- mehr als 10 % Ø-Steigung
- Zielzeit nicht im Format Std:Min
- Link ohne http(s), z. B. `javascript:`

**GPX:** Für den Saisonhöhepunkt umgesetzt, mit demselben Leser und derselben Ausdünnung wie im Assistenten (`buildCourse`). Das Höhenprofil fließt in Prognose und Anforderungsprofil ein. Für weitere Events nutzt der Planer kein Streckenprofil (dort zählen Distanz und Höhenmeter). Das bleibt ein Vorschlag.

## 3. Wirkung auf den Plan

- **Nicht planrelevante Änderungen** werden sofort gespeichert.
- **Planrelevante Änderungen** öffnen zuerst „So ändert sich dein Plan“:
  - Vorher/Nachher für Datum, Priorität, Zielzeit, Form am Eventtag (Planrechnung für beide Seiten, damit vergleichbar), FTP am Eventtag und Tapering
  - die Liste der betroffenen Wochen mit den geänderten Tagen (z. B. „Di: Schwelle 3×15 (1:40 Std.) → Erholung nach … (42 Min.)“)
  - Warnungen

Drei klar getrennte Knöpfe:

1. **Annehmen: Event und Plan ändern.** Die App legt einen Schnappschuss an (Liste der Sicherungen), ändert das Event und setzt die Tage der laufenden Woche ab morgen neu. Heute, Vergangenes und erledigte Einheiten bleiben. Danach zeigt sie 10 Minuten lang „Rückgängig“, das den Stand exakt wiederherstellt. Die Wochen danach ergeben sich aus dem Event.
2. **Ablehnen: Event ändern, Plan behalten.** Nicht planrelevante Felder werden gespeichert, die planrelevanten als offene Änderung (`pend`). Der Plan rechnet weiter mit den bisherigen Werten. Die Karte zeigt die neuen Werte mit der Warnung „Tapering und Prognose passen nicht zu den neuen“ und den Knöpfen „Plan jetzt anpassen“ bzw. „Änderung verwerfen“.
3. **Abbrechen: nichts ändern.**

**Sonderfälle:**
- **A-Event weniger als 3 Wochen entfernt:** Hinweis, dass kein voller Aufbau mehr passt. Bestmöglich ist die letzte harte Einheit 7–10 Tage vorher, danach Umfang senken und Intensität halten (Bosquet et al. 2007).
- **Zwei A-Events unter 28 Tagen Abstand:** Warnung mit Knopf „‚X‘ als B-Event“. Er rechnet den Vorschlag sofort mit dieser Änderung neu.
- **Saisonhöhepunkt wird B/C:** Pflichtfrage „Welches Event wird dein Saisonhöhepunkt?“ (Auswahl der Events oder „Keins – bleibt Höhepunkt“). Der Höhepunkt ist zugleich das Planende. Wählt man ein früheres Event, endet der Plan dort, und das bisherige Hauptevent fällt heraus. Der Vorschlag sagt das ausdrücklich. Ein Plan über den Höhepunkt hinaus gibt es im Planer nicht.
- **Event-Datum nach dem Planende:** Das Event wird neuer Saisonhöhepunkt, der Plan wird bis dahin verlängert, der bisherige Höhepunkt bleibt als A-Event. Wird der Höhepunkt selbst später gelegt, heißt der Hinweis „Der Plan wird bis … verlängert“.
- **Höhepunkt vorgezogen vor andere Events:** Die betroffenen Events werden mit „fällt aus dem Plan“ genannt.

## 4. Löschen, Duplizieren, Hinzufügen

- **Löschen:** erst eine Rückfrage, dann der Vorschlag mit „Löschen und Plan anpassen“, „Löschen, Plan behalten“ (offene Änderung, mit Wiederherstellen) oder „Abbrechen“. Den Saisonhöhepunkt kann man so nicht löschen. Die App erklärt, dass zuerst über die Priorität ein neuer Höhepunkt gewählt wird bzw. bei nur einem Event das Ziel unter „Plan anpassen“ geändert wird.
- **Duplizieren:** Kopie mit Datum + 1 Jahr auf den gleichen Wochentag (11.06.2027 Sa → 10.06.2028 Sa). Sie ist im Formular änderbar und wird als neues Event mit Vorschlag gespeichert.
- **Hinzufügen:** Knopf unter der Liste, gleiches Formular, gleicher Vorschlag.

## 5. Layout der Event-Karten

Jedes Event ist eine eigene Karte mit Rahmen und 12 px Abstand. Reihenfolge in der Karte:

1. Priorität, Name (bricht um), Stift
2. Datum mit „in X Tagen“ und Startzeit in eigener Zeile
3. Eckdaten mit Art
4. gegebenenfalls Warnung zu einer offenen Änderung
5. Zielzeit und Form
6. Pacing
7. Art-Chips
8. Notiz und Link
9. als letzte Zeile **innerhalb** der Karte „Anreise und Zeitzone“ (nur mit Reisemodus), abgesetzt durch eine Linie

Im Vergleich `f31-liste-vorher-375-hell.png` mit `f31-liste-nachher-*` sieht man, dass die Ausklappzeile vorher wie die Überschrift des nächsten Events wirkte.

## 6. Pacing je Art

Grundlage ist der haltbare Anteil der FTP über die erwartete Dauer: IF_solo = 1 − 0,10 · ln(Std.). Das ist ein **Richtwert** der App und war schon bisher so. Er liegt z. B. bei 1 Std. bei 100 %, bei 2 Std. bei 93 % und bei 8 Std. bei 79 %.

| Art | Abschnitt | % FTP | bei 2 Std. | bei 8 Std. | Beleg |
|---|---|---|---|---|---|
| Rennen, Jedermann (Feld) | Ø im Feld | IF − 25 bis IF − 15 | 68–78 % | 54–64 % | **Richtwert**. Dass der Windschatten im Feld den Luftwiderstand stark senkt, belegen Blocken et al. 2018 (doi:10.1016/j.jweia.2018.06.011). Die Prozentspanne selbst ist nicht belegt. |
| | Führung, Lücken schließen | 95–105 % | | | Richtwert |
| | Antritte, kurze Rampen < 1 Min. | 110–130 % | | | Richtwert |
| | Lange Anstiege | bis IF + 5 (höchstens 100 %) | bis 98 % | | Richtwert |
| Zeitfahren (solo) | gleichmäßig | IF − 4 bis IF | 89–93 % | 75–79 % | Gleichmäßiges Pacing bei langen Belastungen: Abbiss & Laursen 2008 (doi:10.2165/00007256-200838030-00004) |
| | Anstiege, Gegenwind | bis IF + 5 | bis 98 % | | Etwa 5 % mehr am Berg und gegen den Wind spart Zeit: Atkinson et al. 2007 (doi:10.1080/02640410600944709) |
| RTF, Radmarathon | Ø im Flachen | IF − 15 bis IF − 8 | 78–85 % | 64–71 % | Richtwert |
| | Anstiege höchstens | IF + 2, nie über 85 % | 85 % | 81 % | Richtwert |
| | Verpflegung | 30–60 g KH/Std., über 2,5 Std. bis 90 g | | | Jeukendrup 2014 (doi:10.1007/s40279-014-0148-z) |

**Befund aus dem Screenshot:**
- Vorher wurden für den Jedermann (81 km, 2:05 Std., FTP-Prognose 275 W) 234–256 W „im Flachen“ empfohlen, also 85–93 % FTP als Ø.
- Jetzt heißt es: im Feld Ø etwa 187–215 W (68–78 %), dazu getrennt Führung, Antritte und Anstiege, mit dem Hinweis „Im Windschatten Kräfte sparen“.
- Ein Test prüft, dass der Feld-Ø bei 2 Std. höchstens 80 % FTP beträgt.
- Die Karte kennzeichnet alles als „Richtwerte, abhängig von Feld, Strecke und Tagesform“.

**Tapering:**
- Beim Saisonhöhepunkt 1 bis 2 Wochen weniger Umfang bei gleicher Intensität (Bosquet et al. 2007, doi:10.1249/mss.0b013e31806010e0).
- Bei weiteren A-Events zeigte die Karte bisher dasselbe. Der Planer macht dort aber 3 Tage Tapering und danach eine lockere Woche. Der Text sagt jetzt genau das.

Alle DOIs habe ich bei Crossref geprüft (Titel, Autor, Jahr stimmen). Eine geplante Quelle (Ebert et al. 2005) ließ sich dort nicht auflösen und ist nicht verwendet.

## 7. Tests

Neue Datei `tests/events.test.js` (12 Tests), in `tests/index.html` und `tests/LIESMICH.md` eingetragen:

1. Name, Notiz und Link ändern: kein Vorschlag, Struktur des Plans unverändert, Umlaute bleiben in Anzeige, Entwurf, Sicherungsdatei und nach dem Laden
2. A-Event um 2 Wochen verschoben: Vorschlag mit Wochenliste, Eventtag am neuen Datum, heute und Vergangenes unverändert, Rückgängig exakt
3. Ablehnen: Plan unverändert, Warnung auf der Karte, später „Plan jetzt anpassen“
4. Priorität A → B: kürzeres Tapering. Höhepunkt → B: Pflichtfrage, Hinweis zum Planende, „Keins“ ändert nichts, Rückgängig
5. A-Event in 14 Tagen: Hinweis
6. Zwei A-Events 21 Tage auseinander: Warnung, „als B-Event“ löst sie
7. Löschen und Duplizieren mit Rückgängig, Höhepunkt nicht direkt löschbar
8. Eigene Zielzeit neben der Prognose, Prognose unverändert
9. Pacing je Art: Feld ≤ 80 % bei 2 Std., Zeitfahren höher, Radmarathon-Anstiege ≤ 85 %, Hinweise je Art
10. Prüfungen (Vergangenheit, Steigung, Link, Name, Zielzeit)
11. Karten: je Event eine, Stift mit Vorlesetext, ohne Reisemodus keine „Anreise und Zeitzone“, mit Reisemodus als letzte Zeile in jeder Karte
12. Alte Sicherung ohne neue Felder lädt, Englisch

**Ergebnis:**
- Alle **295 Tests grün** (283 bisherige + 12 neue).
- `python3 tools/build.py --check`: aktuell.
- Neu geschrieben habe ich nur zwei Gruppen von Vergleichsständen, beide gewollt:
  - Plan-Szenarien: Versionszeile, neue Karten, genauerer Tapering-Text bei A-Events
  - Saison-Prognose: Pacing-Werte je Art

**Bildschirmfotos** in `claude/bilder/`:

| Datei | Inhalt |
|---|---|
| `f31-liste-vorher-375-hell` | alte Karten |
| `f31-liste-nachher-*` | neue Karten mit Pacing je Art und eigener Zielzeit |
| `f31-formular-*` | Formular |
| `f31-vorschlag-datum-*` | Vorschlag nach Datumsänderung |
| `f31-loeschen-*` | Lösch-Rückfrage |

Die Bilder gibt es je in 375 pt hell und 430 pt dunkel, „vorher“ nur in 375 hell.

**Nicht geprüft:** iPhone, VoiceOver auf dem Gerät (nur Vorlesetexte im Code), Garmin-Export nach einer Änderung (er wird aus dem Plan erzeugt und folgt deshalb von selbst).

## Offene Punkte und Vorschläge

- **Streckenprofil auch für weitere Events.** Dafür müsste der Planer (`segP`) es nutzen. Bisher gilt es nur für den Saisonhöhepunkt.
- **Plan über den Saisonhöhepunkt hinaus** (Events danach weiter planen) gibt es nicht. Deshalb gilt: Wird ein früheres Event Höhepunkt, endet der Plan dort.
- **Warnung „Plan noch nach altem Datum“** steht auf der Event-Karte, nicht zusätzlich in der Plan-Check-Karte. Die Prognose dort rechnet bewusst mit dem geplanten Stand.
- **Die Woche wird neu gesetzt.** Beim Annehmen bekommt die laufende Woche ab morgen den neu berechneten Plan, wie bei „Plan anpassen“. Eigene Verschiebungen in diesen Tagen gehen dabei verloren. Der Schnappschuss und „Rückgängig“ fangen das auf.
- **Art per Chip** ist planrelevant (Windschatten, Prognose) und öffnet deshalb ebenfalls den Vorschlag, meist mit „An den kommenden Einheiten ändert sich nichts“. Wenn das zu umständlich ist, kann der Chip direkt speichern.
- **Pacing-Prozente im Feld** sind Richtwerte. Mit Leistungsdaten aus eigenen Rennen (F26) ließe sich das später persönlich kalibrieren.
- **„Wusstest du schon?“** hat den Hinweis `evedit` (mit Englisch). Der Knopf öffnet die Event-Liste und setzt den Fokus auf den Stift. „Neu in dieser Version“ hat den Eintrag 207.

## Commits

```
F31: Events bearbeiten (Formular, Vorschlag mit Rückgängig, Löschen, Duplizieren, Karten, Pacing je Art)
F31: Tests für Events bearbeiten
F31: Version 207, Neuigkeiten, Hinweis, Bericht
```

## Was du zum Veröffentlichen tun musst (nicht von mir ausgeführt)

1. Bericht und Bilder ansehen. Am besten auf dem iPhone ein Event verschieben und den Vorschlag durchspielen.
2. Freigabe geben („Ja in Main“). Dann pushe ich den Branch und bringe `main` per Fast-Forward auf den neuen Stand.
3. Netlify baut aus `main`. Danach erscheinen Update-Hinweis und „Neu in dieser Version“ (207).
