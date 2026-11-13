# Bericht F26 – Leistungsprofil (Bestwerte als Netz und Kurve)

Stand: 13.11.2026

## Kurzfassung

- Neue Seite **Fortschritt → Leistungsprofil**. Sie zeigt:
  - Bestwerte von 15 s bis 60 min als Netzdiagramm oder als Leistungskurve (5 s bis 2 h).
  - Zeiträume: letzte 8 Wochen, diese Saison, Allzeit oder ein eigener Zeitraum.
  - Umschalter zwischen Watt und W/kg.
  - Fahrertyp, fünf Kategorien mit Stufe und Trainingshinweis.
  - FTP-Schätzung mit Vorschlag.
- Unter Fortschritt gibt es eine kompakte Karte: kleines Netz und Fahrertyp, Antippen öffnet die Vollansicht.
- Im **Logbuch** zeigt jede Fahrt „Bestwerte dieser Fahrt“ (5 s, 1, 5, 20 und 60 min). Neue Bestwerte sind hervorgehoben. Jede Fahrt lässt sich aus den Bestwerten nehmen.
- Die **Fahrtbewertung** nennt neue Bestwerte jetzt über alle Dauern von 5 s bis 2 h, nicht mehr nur über 5 feste Dauern.
- Die FTP ändert sich nie von selbst. Der Ablauf:
  - „Übernehmen“ legt zuerst einen Schnappschuss an, danach gibt es 10 Minuten „Rückgängig“.
  - Eine Absenkung schlägt die App nur vor, wenn belegt ist, dass die Werte maximal gefahren wurden. Ohne diesen Beleg schlägt sie einen Test vor.
- Ergebnisse: **229 von 229 Tests bestanden**, `build.py --check` ist aktuell.

## Branch, Version, Commit

| | |
|---|---|
| Basis | `main` bei 66746b7. Dort ist `feature/f24-f25-grafik` bereits gemergt (gleiche Garmin-Leistungsdaten, Logbuch F5, Gewicht und FTP F7). |
| Neuer Branch | `feature/f26-leistungsprofil` (lokal, nicht gepusht) |
| Version | 193 |
| Build-ID | 20261116090000 |
| Service Worker | relentless-v30 |
| Commit | siehe `git log feature/f26-leistungsprofil` (ein Commit „v193: Leistungsprofil …“) |

**Abweichungen vom Prompt, weil das Repository es anders regelt:**

| Prompt | Repository |
|---|---|
| `build.sh --check` | `python3 tools/build.py --check` |
| `tests/run-all.sh` | Browser-Testseite `tests/index.html` (`runAll()`) |
| `build/APP_VERSION`, `build/BUILD_ID`, `WHATSNEW.json` | `APP_VERSION`/`APP_SW` in `src/js/44-version-neuigkeiten.js`, `APP_BUILD` in `src/js/26-statistik-update.js`, `WN_DATA`, `public/sw.js`, `public/version.json` |

Die neue Testdatei `tests/leistungsprofil.test.js` ist in `tests/index.html` eingebunden.

## 1. Bestandsaufnahme

**Bestwerte vorher**
- Beim Einlesen (`summarize`) entstehen `m1`, `m5`, `m20`, `m60`, dazu `m3`, `m7`, `m12` in `perfExt`.
- `S.pb` speichert Rekorde für 5 s bis 60 min. `vzKeep` erkennt neue Bestwerte in der Bewertung.
- Angezeigt wird das unter „Fortschritt → Bestwerte“ und als Abzeichen in der Bewertung.
- Das Archiv `S.arch` hält je Fahrt `m1`, `m5`, `m20`, `m60`.

**Pausen bisher:** `summarize` schneidet Lücken über 30 s heraus und hängt die Abschnitte aneinander. Fenster überbrücken damit Pausen.

**Garmin:** `get_activity_recording` liefert über die Erweiterung bzw. die Netlify Function die **Original-FIT-Datei mit 1 Hz**.
- Lücken entstehen durch Auto-Pause (keine Datensätze) oder Smart Recording (Abstand bis etwa 8 s).
- Die Datenmenge ist etwa 1 MB FIT je 2 h, wird aber nur kurz im Speicher gehalten.
- Der Abruf liegt in `gmRide`; F25 nutzt dieselbe Stelle (`trkFetch`). F26 hängt sich an beide Stellen und lädt nichts doppelt.

**Wie viele vorhandene Fahrten Leistungsdaten haben,** lässt sich nur auf dem Gerät sehen. Das Repository enthält keine Nutzerdaten. Die Seite zeigt die Zahl beim Nachberechnen an.

## 2. Datengrundlage

**Speicher:** `S.mm[Fahrt-ID] = {d, n, kg, v:[16 Werte], o:[16 Startzeitpunkte in s], s:'f'|'a', q?, x?, ok?}`.
- Etwa 125 Byte je Fahrt, höchstens 1500 Fahrten (`MM_MAX`).
- Dauern: 5 s, 15 s, 30 s, 1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120 min.
- Die Sekundenreihe wird nicht gespeichert.

**Berechnung (`mmSeries`, `mmCalc`)**
- Pro Dauer ein Durchlauf mit laufender Summe, also O(n). Eine 5-h-Fahrt brauchte im Test etwa 1 ms (Desktop-Browser). Auf dem iPhone ist das ungeprüft, aber unkritisch.
- Pausen über 10 s trennen die Fahrt in Abschnitte. Ein Fenster zählt nur innerhalb eines Abschnitts.
- Lücken bis 10 s werden mit dem letzten Wert gefüllt.
- Nullen beim Rollen bleiben drin. Fehlende Leistung innerhalb eines Abschnitts zählt als 0 W.

**Ausreißer**
- Einzelwerte über 2000 W zählen als 0 W. Ab 5 solchen Sekunden ist die Fahrt als „fraglich“ markiert.
- Ist der 5-s-Wert größer als 2,2 × 1-min-Wert **und** größer als 1,5 × 15-s-Wert, gilt das als kurzer Ausschlag, nicht als Sprint. Werte unter 30 s zählen dann nicht, bis man sie im Logbuch bestätigt.
- Jede Fahrt lässt sich ganz aus den Bestwerten nehmen.

**Gewicht:** Für W/kg zählt das Gewicht am Tag der Fahrt aus dem Verlauf Gewicht und FTP (`S.wf`, F7).

**Bestehende Fahrten**
- Sofort: Teilprofil aus den gespeicherten Werten 1, 3, 5, 20 und 60 min (`s:'a'`).
- Mit Garmin: Knopf „Nachberechnen“ lädt jede Fahrt einzeln und berechnet alle Dauern. Mit Fortschrittsanzeige, abbrechbar und später fortsetzbar.
- Wie viele Fahrten nachberechnet wurden, lässt sich erst auf dem Gerät feststellen. Hier lief es nur mit Testdaten.

**Sicherung:** `S.mm` gehört zum Zustand und ist damit automatisch in Sicherungsdatei, Spiegel und Schnappschüssen. Die Formatnummer bleibt 4, weil keine neue Datei-Sektion nötig war. v1 bis v3 und v4 ohne `mm` laden weiter, die App ergänzt das Teilprofil aus dem Archiv.

## 3. Grafik

**Skalierung des Netzes**
- Jede Achse ist relativ zu den Referenzwerten **derselben Dauer** skaliert. 0 entspricht etwa „untrainiert“ (70 % der Einsteiger-Grenze), 85 % des Radius der Grenze „Amateur-Elite“. Darüber wächst die Achse gedämpft bis zum Rand.
- Grund: Mit Watt-Skala ist kurz immer größer. Mit Skala bis „Weltklasse“ klebt ein Freizeitprofil in der Mitte (so in der ersten Version gesehen und verworfen).
- So zeigt die Form Stärken und Schwächen.

**Weitere Merkmale**
- Zwei Flächen: Allzeit hinten (Navy, kräftiger), gewählter Zeitraum vorne (Eisblau, heller).
- Ring in drei Bereichen mit T2R-Farben: kurz Eisblau, mittel Petrol, lang Navy. Keine Strava-Farben.
- Achsen ohne Wert sind grau gestrichelt, mit Hinweis unter der Grafik.
- Antippen einer Achse zeigt:
  - Wert und W/kg
  - Datum und Startminute in der Fahrt
  - Link zur Fahrt im Logbuch
  - Veränderung zum Stand vor 8 Wochen in W und %
- Die Leistungskurve hat eine logarithmische x-Achse (5 s bis 2 h) und eine gestrichelte FTP-Linie. Beim Wischen erscheint der Wert je Dauer.
- VoiceOver liest eine Textzusammenfassung, auf Deutsch und Englisch.
- Die Zielwert-Linie für das A-Event ist **nicht umgesetzt**. Die Planung enthält kein Leistungsziel je Dauer.

## 4. Kategorien, Referenzwerte, Fahrertyp

**Schwelle:** Grenzen der FTP-Kategorien aus `CMP_REF.cat` (F21) nach Allen und Coggan, „Training and Racing with a Power Meter“, getrennt nach Männern und Frauen. Es ist dieselbe Quelle wie in F21 und nicht doppelt gepflegt. Die Vergleichsgruppe kommt aus F21 (`cmpGroup`); ohne Angabe gilt das Mittel aus beiden.

**5 s, 1 min, 5 min:** FTP-Grenze × Verhältnis (W/kg der Dauer ÷ W/kg FTP).
- Die Verhältnisse stammen aus den Eckzeilen der Coggan-Tabelle (untrainiert, Weltklasse) und sind zwischen diesen interpoliert.
- **Wichtig: Die Coggan-Tabelle ließ sich online nur als Bild finden.** Die Eckwerte habe ich nicht gegen das Buch geprüft.
- Sicherheit „niedrig bis mittel“, so steht es auch im Code. Die Werte stehen an einer Stelle (`MM_REF`) und lassen sich leicht korrigieren.
- **Vorschlag:** einmal mit dem Buch abgleichen.

**Ausdauer:** eigene Einteilung der App, keine belegte Tabelle. Maßstab ist der Anteil der FTP über 2 h: unter 65 % Stufe 1, dann 65, 72, 78, 83 und 88 % für die Stufen 2 bis 6.

**Stufen 1–6:** untrainiert und Einsteiger = 1, Freizeit = 2, gut trainiert = 3, sehr gut = 4, Amateur-Elite = 5, nationale Spitze und Weltklasse = 6.

**Fahrertyp**
- Grundlage sind Sprint, Angriff, VO2max und Schwelle.
- Bei einem Abstand unter 0,9 Kategorien gilt der Typ als Allrounder.
- Sonst entscheidet die stärkste Kategorie:
  - Sprint → Sprinter
  - Angriff oder VO2max → Puncheur
  - Schwelle bis 66 kg → Kletterer
  - Schwelle über 66 kg → Zeitfahrer
- Dazu ein Satz zum größten Potenzial.
- Getestet mit fünf typischen Profilen.

## 5. FTP-Schätzung

- **Methode:** Critical Power, 2-Parameter-Modell (Arbeit = CP × t + W′). Lineare Regression über die Bestwerte von 3 bis 20 min der letzten 8 Wochen.
  - Bedingungen: mindestens 3 Dauern, darunter 15 oder 20 min, r² ≥ 0,97, W′ zwischen 4 und 40 kJ.
  - Gegenprobe bzw. Ersatz: 95 % des 20-min-Werts. Die Spanne zwischen beiden wird angezeigt.
- **Vorschlag:**
  - Ab 3 % Abweichung erscheint die Karte „FTP prüfen“ mit den Optionen Übernehmen, Test einplanen und Ignorieren.
  - Eine Absenkung wird nur angeboten, wenn eine Bestwert-Fahrt nachweislich maximal war: als Vollgas markiert, Test oder Rennen, oder hoher Puls bzw. hohes Empfinden (`maxEvid` aus F12).
  - Ohne diesen Nachweis erscheint der Hinweis auf einen FTP-Test.
- **Übernehmen:** Schnappschuss mit Rückgängig, dann `setFtpNow`. Kommende Einheiten rechnen neu, vergangene behalten ihren Wert (wie F7).
- **Test einplanen** nutzt das bestehende `retest` und plant einen Fitness-Check in der nächsten Woche. Auch dafür gibt es vorher einen Schnappschuss.
- **Hinweis:** Die bisherige FTP-Schätzung unter „FTP und Leistung“ (F12) bleibt unverändert. Beide Karten können unterschiedliche Werte zeigen: Die alte nutzt 6 Wochen und eine andere CP-Korrektur. Ich habe sie bewusst nicht zusammengelegt, das wäre eine größere Änderung.
  - **Vorschlag:** später eine gemeinsame Schätzung.

## Ergebnis mit den Nutzerwerten

Annahme: 75 kg, Vergleichsgruppe Männer, kein 5-s-Wert vorhanden.

| | Ergebnis |
|---|---|
| FTP-Schätzung | ca. **286 W** (Critical Power, W′ 23,7 kJ, r² 0,999). Gegenprobe 95 % von 303 W = **288 W**, Spanne 280–292 W. |
| Vorschlag | Eingestellt sind 305 W, die Schätzung liegt 6 % darunter. Ohne Beleg für maximale Werte schlägt die App einen **FTP-Test** vor und keine Absenkung. |
| Fahrertyp | **Puncheur**: stark bei 3 bis 5 Minuten. Größtes Potenzial liegt bei 5 bis 15 Sekunden. |

**Kategorien**

| Kategorie | Wert | Stufe |
|---|---|---|
| Sprint | 876 W, aus 15 s geschätzt | 1 |
| Angriff | 557 W, 7,4 W/kg | 1 |
| VO2max | 369 W, 4,9 W/kg | 3 |
| Schwelle | 288 W, 3,8 W/kg | 3 |
| Ausdauer | – | keine Fahrt über 90 min |

Die niedrigen Stufen bei Sprint und Angriff sind typisch für die Coggan-Tabelle: Sie bewertet kurze Leistungen streng. Sie hängen außerdem an den nicht geprüften Verhältnissen (siehe oben).

## Tests

**Neue Datei `tests/leistungsprofil.test.js` mit 10 Tests:**
- Mean-Max gegen Handrechnung: Konstante, Intervalle, Pause über 10 s, Lücke bis 10 s, Aussetzer, Rollen mit 0 W, Laufzeit bei 5 h.
- Ausreißer über 2000 W, unplausibler 5-s-Wert, echter Sprint bleibt unmarkiert, Bestätigen und Ausschließen.
- Zeiträume mit Grenztagen (8 Wochen = 17.09. bis 11.11.2026) und Vergleich mit vor 8 Wochen.
- W/kg mit Gewichtsverlauf.
- CP/FTP mit den Nutzerwerten und Vorschlagslogik (ok, up, down, test), Übernehmen mit Schnappschuss.
- Fahrertyp für Sprinter, Puncheur, Zeitfahrer, Kletterer und Allrounder.
- Fahrt ohne Leistungsmesser, Einlesen, neue Bestwerte, Abzeichen in der Bewertung, Teilprofil, Liste zum Nachberechnen.
- Sicherung mit `mm`, ältere Formate.
- Seiten, Antippen, Kurve, W/kg, graue Achsen, Logbuch, Englisch.
- DYK-Knopf springt zu `#fx-mm`, Neuigkeiten 193, neuer Bestwert in „Wusstest du schon?“.

**Gesamtlauf:** 229 von 229 bestanden (55 s). Neu geschriebene Vergleichsstände:
- `plan-*`: Die Fortschrittsseite hat die neue Zeile „Leistungsprofil“.
- Die Einstellungen zeigen Version 193.
- Sonst keine Unterschiede.

**Sichtprüfung:** `claude/bilder/f26-{fortschritt,profil,kurve,logbuch}-{light,dark}-{375,430}.png` (16 Bilder).
- Beschriftungen überlappen sich bei 375 px nicht.
- Die Fortschrittskarte zeigt bei Testdaten unter „Bestwerte“ noch „keine Fahrten“. Die Testdaten liegen nur im Profil, echte Fahrten füllen beides.

## Hinweise und Neuigkeiten

- DYK `mmprof` mit dem Knopf „Leistungsprofil ansehen“: Er springt direkt zum Profil (`#fx-mm`).
- Gelegentlich erscheinen in „Wusstest du schon?“ ein neuer Bestwert der letzten 14 Tage und die größte Stärke. Wie bei F21 frühestens nach 60 Tagen wieder.
- Neuigkeiten 193 mit zwei Einträgen. Der Knopf öffnet Fortschritt → Leistungsprofil bzw. das Logbuch.

## Offene Punkte

- Coggan-Verhältnisse für 5 s, 1 min und 5 min gegen das Buch prüfen (`MM_REF` in `src/js/27c-leistungsprofil.js`).
- Nicht geprüft:
  - iPhone (Touch beim Wischen, Datumsauswahl im eigenen Zeitraum)
  - echte Garmin-Dateien
  - Nachberechnung mit dem echten Konto
  - Netlify-Build
- Ziel-Linie für das A-Event fehlt (kein Leistungsziel je Dauer in der Planung).
- Zwei FTP-Schätzungen nebeneinander (F12 und F26): **Vorschlag**, sie später zusammenzuführen.
- Seite „Bestwerte“ (alt) und „Leistungsprofil“ überschneiden sich: **Vorschlag**, die alte Seite später im Profil aufgehen zu lassen.

## Was du zum Veröffentlichen tun musst (nicht ausgeführt)

1. Bilder und diesen Bericht ansehen. Wenn alles passt: „Ja, hochladen“.
2. Danach würde ich den Branch pushen und, nach deiner Freigabe für `main`, mergen und pushen. Netlify baut dann aus `main`.
3. Eine Netlify Function ist nicht geändert, ein Function-Deploy ist also nicht nötig.
4. Nach dem Laden der App erscheinen der Update-Hinweis und das Fenster „Neu in Version 193“.
