# Bericht Sammel-Prompt 11.11.2026 (B6–B10, F17–F23, F19)

Branch `feature/sammel-2026-11-11` (von `main`, Version 174, Build `20261107223000`, Service Worker `relentless-v11`).
Ein Commit je Punkt. Nicht veröffentlicht, kein Push, kein Merge. Etappe 1: B6, B9, B10, B7, B8. Etappe 2: F17, F18, F23, F20, F21, F22, F19 (nur Bericht). Neue Version **175**, Build `20261112120000`, Service Worker `relentless-v12`.

## Abbildung der Vorgaben auf dieses Repository

Der Sammel-Prompt nennt Dateien, die es hier nicht gibt. Abgestimmt am 12.11.2026: auf die vorhandene Struktur abbilden.

| Vorgabe | Hier |
|---|---|
| `claude/backlog.md`, `release-status.md`, frühere Berichte, `prompt-b6-…md` | nicht vorhanden; B6 ohne Prompt-Datei aus dem Titel und einer eigenen Bestandsaufnahme umgesetzt |
| Branch `feature/f16-stimme` / `fix/b6-zeitbudget-plan` | nicht vorhanden; Ausgang ist `main` mit Version 174 (neuer als 173) |
| `build.sh --check` | `python3 tools/build.py --check` |
| `tests/run-all.sh` | Browser-Tests: `python3 tests/serve.py`, dann `http://localhost:8765/tests/` |
| `build/tts/generate.py` | neu: `tools/tts/generate.py` (Piper lokal in `.tools/`, nicht im Repository) |
| `build/modules/wn/WHATSNEW.json` | `WN_DATA` in `src/js/44-version-neuigkeiten.js` (Eintrag kommt mit dem Versionssprung am Ende von Etappe 2) |

**Testergebnis am Ende:** 142 von 142 Tests bestehen, `tools/build.py --check` grün, Sprachkatalog vollständig
(`generate.py --check`: 476 de, 477 en, nichts fehlt). Etappe 1 endete mit 101 von 101.

---

## 1. B6 – Zeitbudget in der Planerstellung

**Bestandsaufnahme: Stellen, die mit verfügbarer Zeit rechnen**

| Stelle | Rechnete mit Zeitbudget? |
|---|---|
| Wochenplanung `genWeek` → `tbApply` (Stunden, Tage, Long-Ride-Tag des Monats) | ja |
| Plan-Check, Zielzeit- und FTP-Prognose (`hAv`, `planStats`, `tbScale`) | ja |
| Monatsübersicht „Stunden je Monat“ (`tbSeason`), Wochenansicht „geplant von … verfügbar“ (`tbWkH`) | ja |
| **Planung (Schritt „Dein Alltag“)**: Budget einstellbar? | **nein** – nur später in den Einstellungen; der erste Plan und seine Vorschau rechneten mit festen Stunden |
| Planung und laufender Plan: eigenes Budget-Objekt? | **nein** – geteilte Referenz, „Abbrechen“ konnte Budget-Änderungen nicht zurücknehmen |
| Fitness-Kachel (Ziel „Fitness“) | **nein** – fester Wert |
| Plan-Check-Erklärtext „Du hast … Std. verfügbar“ | **nein** – fester Wert |
| Mehr → Einstellungen (Kurzinfo) | **nein** – fester Wert |
| Fitness-Analyse in der Planung (Umfangssteigerung) | **nein** – fester Wert |

**Umsetzung:** Die Karte „Zeitbudget nach Jahreszeit“ steht jetzt auch in der ausführlichen Planung (Schritt „Dein
Alltag“, nicht in der Schnellplanung) und wirkt sofort auf Wochenvorschau und Prognose. In der Planung wird direkt der
Entwurf geändert (es läuft noch kein Plan), im laufenden Plan bleibt es beim Entwurf mit „Speichern“ und Vorschlag für die
laufende Woche (Zustimmung). Eigene Kopie des Budgets bei Planung, Bearbeiten und Übernahme. Die vier Anzeigen nutzen das
Budget (laufende Woche, Mittel, Winter/Sommer, Startmonat).

**Entscheidung:** Ohne die Prompt-Datei habe ich B6 so verstanden, dass das Budget schon beim Erstellen eines Plans gelten
soll. Fehlt etwas aus der ursprünglichen Vorgabe, bitte die Datei nachreichen.

**Tests:** `budget.test.js` (3): Einstellen in der Planung inkl. Vorschau und Übernahme, Abbrechen ohne Änderung,
Schnellplanung ohne Karte.

## 2. B9 – Formkurve bricht vor dem Event ab

**Ursache (nachgestellt mit heute = 09.11.2026, Event 03.10.2027):**
1. `vzFuture` erzeugte geplante Wochen nur bis `S.wk + 30`. 30 Wochen nach dem 09.11.2026 ist Mitte Juni 2027; danach
   rechnete die Kurve mit 0 TSS. Fitness fiel bis zum Event auf etwa 4 („Fitness etwa 4, Form +5“ – genau die Meldung).
2. Die Achse war auf 400 Tage ab Beginn begrenzt (Beginn bis 120 Tage zurück). Sie endete im September, und die
   Renntag-Linie stand am letzten Tag statt am 03.10.
3. Der angeschnittene Monat am linken Rand wurde immer beschriftet („Okt“ und „Nov“ übereinander).

B6 war nicht die Ursache; Zeitbudget und gespeicherte Änderungen kommender Wochen gehen über `genWeek` korrekt ein.

**Umsetzung:** `vzRows` (Rechnung) getrennt von `vzForm` (Grafik); jede Planwoche bis zum Ende; Achse bis Event + 7 Tage;
Renntag-Linie am Index des Eventdatums; angeschnittener erster Monat entfällt, wenn der nächste näher als 26 px liegt.

**Fachliche Prüfung:** Ziel am Renntag ist eine leicht positive Form (etwa +5 bis +25) bei einer Fitness nahe dem
Saisonhöchstwert. `vzRaceHint` zeigt einen Hinweis, wenn die Form negativ ist, über +30 liegt oder die Fitness unter 85 %
des Saisonhöchstwerts fällt. Der Plan wird dabei nicht verändert. Saison 2027 im Test: Fitness 64 bei Höchstwert 68,
Form +25 – plausibel, kein Hinweis.

**Quellen:** Banister EW et al. (1975): A systems model of training for athletic performance. Aust J Sports Med 7:57–61
(Impulse-Response-Modell) · Allen H, Coggan A: Training and Racing with a Power Meter, 2. Aufl. 2010 (CTL 42 Tage, ATL
7 Tage, TSB vor A-Rennen etwa +15 bis +25) · Mujika I, Padilla S (2003): Scientific bases for precompetition tapering
strategies. Med Sci Sports Exerc 35(7):1182–1187 · Bosquet L et al. (2007): Effects of tapering on performance: a
meta-analysis. Med Sci Sports Exerc 39(8):1358–1365.

**Tests:** `form.test.js` (6): lückenlose Tage bis nach dem Event, TSS je Woche = Plan (alle 47 Wochen), Renntag-Linie
auf dem Eventdatum (Position und Text), Beschriftungen bei Achsbeginn Ende September, Renntag-Einordnung, Seite de/en.

**Bilder:** `claude/bilder/b9-formkurve-{vorher,nachher}-{hell,dunkel}.png` (375 pt).

## 3. B10 – Kraftübungen ohne Töne und Ansage

**Reproduktion:** In allen Kraft-Einheiten (Studio und Zuhause, alle Phasen) erzeugte der Ablauf Signale, aber:
- Bei Wiederholungsübungen (fast alle Kraftübungen) zu Satzbeginn nur den Namen – ohne Satz, Wiederholungen, Seite.
- Satzpausen ohne Dauer, ohne „Noch 10 Sekunden“.
- iPhone: Kraft-Einheiten haben viele Sätze (über 100 Dateien). Nach der Vorlade-Wartezeit (1,5 s) waren die
  Sprachdateien oft noch nicht geladen; der Rückfall auf die Systemstimme blieb stumm, weil iOS sie nur freigibt, wenn die
  erste Ansage direkt aus einem Antippen kommt. Manifest und Schlüssel-Hash waren korrekt.

**Umsetzung:**
- Satzbeginn: „Los. ‹Name›, Satz x von y, n Wiederholungen, linkes Bein / linke Seite.“ (+ Hinweis, falls er nicht
  schon in der Pause kam). 3-2-1-Töne und „Los“-Ton davor wie bisher.
- „Fertig, Seite wechseln“: Bestätigungston und „Seitenwechsel, jetzt rechts“ (bestand), „Fertig“: Bestätigungston.
- Satzpause: „Satzpause, 1 Minute 30. Als Nächstes: Satz 2 von 3.“, „Noch 10 Sekunden“, 3-2-1, „Los“.
- Übergang zur nächsten Übung und Zeitübungen unverändert (wie Mobilität/Stabi, F13).
- iOS-Freigabe beim Antippen von „Start“: stiller Ton über den AudioContext und eine stumme Ansage.
- Gilt auch für Mobilitätsübungen mit Wiederholungen (gleiche Logik).

**Sprachdateien:** 378 neue Dateien (189 de, 189 en) mit Piper (de_DE-thorsten-high, en_GB-cori-high), lokal
eingerichtet in `.tools/` (Python-venv, Stimmen je ~110 MB, nicht im Repository). Neues Skript `tools/tts/generate.py`
(Schlüssel wie `vcKey`, `--check`, `--prune`). Audio gesamt 12,8 MB (vorher 5,2 MB); geladen wird nur, was eine gestartete
Sequenz braucht. Neue Dateien: MP3 32 kbit/s, 22,05 kHz (LAME wählt das bei 32 kbit/s), Dauer im Manifest auf ±1 ms genau.

**Tests:** `sequence.test.js` (6): Ton- und Ansageplan aller 10 Kraft-Einheiten (5 Phasen × Studio/Zuhause), Beispiel aus
der Meldung, Ablauf mit „Fertig“-Taps über eine ganze Satzpause, Seitenwechsel, iOS-Freigabe, Dateien für alle
Kraft-Sätze de/en. Dazu Satzkatalog als Vergleichsstand (`voice-katalog.json`, Grundlage für `generate.py`).

**Nicht prüfbar hier:** Wiedergabe auf dem iPhone (Stummschalter, Systemstimme). Siehe Prüfliste.

## 4. B7 – Knopf „Fahrten ansehen“ ohne Funktion

**Befund:** Im Stand v174 führte der Knopf zur Seite „Fahrten bewerten“ und funktionierte im Test (auch als echter Klick).
Den Fehler auf dem iPhone konnte ich nicht nachstellen; vermutlich war dort ein älterer Stand installiert.

**Umsetzung nach Vorgabe:** „Fahrten ansehen“ öffnet die neueste bewertete Fahrt in der Detailansicht des Logbuchs.
Gibt es keine, öffnet sich das Logbuch mit „Noch keine bewertete Fahrt – nach deiner nächsten Fahrt findest du die
Auswertung hier.“ (de/en).

**Tests:** `hints.test.js` (6): beide Fälle; alle 26 Aktionen in „Wusstest du schon?“ führen ohne Fehler zu einer Ansicht
mit Inhalt; alle 13 „Mehr dazu“-Ziele in „Tipp zu heute“; alle „Zeigen“ in „Was ist neu“; alle Knöpfe der Startseite ohne
Fehler und ohne Eintrag im Fehlerprotokoll. Keine weitere fehlerhafte Aktion gefunden.

## 5. B8 – App verschwimmt am oberen Rand

**Ursache:** Die App enthält weder `backdrop-filter` noch einen Verlauf am oberen Rand (geprüft im Quelltext und per Test
über alle Elemente). Mit `black-translucent` läuft der Inhalt beim Scrollen unter die transparente Statusleiste. iOS 26
legt dort einen eigenen Weichzeichner über den Inhalt (Scroll-Edge-Effekt), der von der Webseite aus nicht abschaltbar ist.
Belege: [WebKit Bug 301994](https://bugs.webkit.org/show_bug.cgi?id=301994),
[WebKit Bug 305546](https://bugs.webkit.org/show_bug.cgi?id=305546),
[Glide-Forum](https://community.glideapps.com/t/webapp-status-bar-not-transparent-anymore/85272).

**Umsetzung:**
- Deckende Fläche `.sbar`, genau `env(safe-area-inset-top)` hoch, in der Kopfzeilenfarbe (hell `#071747`, dunkel
  `#071334`), ohne Unschärfe und Verlauf.
- In der installierten App (`display-mode: standalone`) scrollt nicht mehr die Seite, sondern ein Bereich `#sc`, der unter
  der Statusleiste beginnt. Damit läuft nie Inhalt unter die Statusleiste; die Kante ist klar.
- Übungssequenz (vollflächig) beginnt ebenfalls darunter; Dialoge liegen unter der deckenden Fläche.
- `window.scrollTo(0, 0)` an 17 Stellen durch `scrollTop0()` ersetzt; Begriffserklärungen rechnen mit dem Scrollbereich.
- Im Browser (nicht installiert) unverändert: alle Seiten-Vergleichsstände gleich.

**Tests:** `statusbar.test.js` (6) mit nachgestellter Statusleiste 47 pt: Lage, Höhe, Farbe hell/dunkel, nirgends
Unschärfe, Scrollbereich und Seitenwechsel, Übungssequenz, Begriffserklärung nach dem Scrollen, Browser unverändert.

**Bilder:** `claude/bilder/b8-statusleiste-{vorher,nachher}-{hell,dunkel}.png` (375 pt, Statusleiste 47 pt, Inhalt
gescrollt). „Vorher“ zeigt, dass der Inhalt in den Statusleistenbereich läuft; den Weichzeichner selbst zeichnet nur iOS,
er lässt sich außerhalb des iPhones nicht abbilden.

**Nicht prüfbar hier:** echtes iPhone (Notch, Dynamic Island, Querformat). Siehe Prüfliste.

---

## Werkzeuge, die dabei entstanden sind

- Bildschirmfotos für Berichte aus der Testumgebung (`shot()` in `tests/lib/harness.js`, Ablage `claude/bilder/`).
- Testumgebung: IndexedDB-Namen je Lauf eindeutig (vorher konnte ein späterer Lauf den Sicherungs-Spiegel eines früheren
  finden).

## 6. F17 – Zielzeiten und Prognosen für alle Events der Saison

**Umsetzung:** `seasonForecast` rechnet für jedes Event (A, B, C, Hauptevent) mit denselben Modellen wie beim Hauptevent:
FTP am Eventtag (`ftpProj` mit den geplanten Stunden bis dorthin), Zielzeit und Durchschnittsgeschwindigkeit
(Leistungsbilanz nach Martin et al. 1998 mit W/kg, Distanz, Höhenmetern), ambitioniertes Ziel, Form am Eventtag aus der
Formkurve, Pacing in Watt (ohne Wattmesser Puls in % des Schwellenpulses). Neue Seite Event → Saisonübersicht; die Karte
„Tage bis“ auf Heute zeigt das nächste Event und öffnet bei mehreren Events die Übersicht; die Formkurve markiert jedes Event.

**Entscheidungen:**
- Event-Art (Rennen, Jedermann, RTF, Zeitfahren) je Event wählbar, sonst aus dem Namen erkannt; sie bestimmt den
  Windschatten (Feld, Gruppe, solo).
- Ambitioniertes Ziel = das Höhere aus oberem empfohlenem Umfang und oberer Spanne der FTP-Prognose.
- Fehlen Distanz oder Höhenmeter, fragt die App einmal (mit „Später“) und zeigt keine Zielzeit.
- A/B/C gab es schon. Tapering: A volles (Saisonphasen), B kurzes (3 Tage), **C jetzt keines** (vorher ein lockerer Tag
  davor). Zeitbudget (B6) wirkt über die Wochenplanung mit.

**Ergebnis im Test** (Saison mit A 18.04., B 30.05., C 12.06., Hauptevent 10.07.): Form am Eventtag A +12, B +5, C +1,
Hauptevent +16 – passend zur Priorität.

**Pacing-Grundlage:** haltbarer Anteil der FTP über die Dauer, IF = 1 − 0,10 · ln(Std.) (Näherung an die
Leistungs-Dauer-Kurve); Pulsbereiche nach Friel (Zone 2 81–89 %, Zone 3 90–93 % des Schwellenpulses).

**Tests:** `season.test.js` (6). **Nicht umgesetzt:** Die Form am Eventtag erscheint erst, wenn die App aus Fahrten die
Fitness kennt (wie die Formkurve).

## 7. F18 – Verlaufsgrafik im Logbuch

**Umsetzung:** Balken der letzten 12 ISO-Wochen bzw. 12 Monate, aktuelle bzw. angetippte Periode hervorgehoben,
gestrichelte Durchschnittslinie (ab der ersten Periode mit Fahrten), großer Wert oben („Diese Woche: 142 km · 5:10 h ·
1.230 Hm“). Umschalter Woche/Monat und km/Zeit/Hm, Pfeile und Wischen, Antippen filtert die Liste, Schalter „inkl.
Rolle“, „Alle Einheiten“ (Kraft und Mobilität bei der Zeit), optional Vorjahr als blasse Reihe, Tabelle für Screenreader.

**Entscheidungen:** Gezählt wird nach dem Kalenderdatum der Fahrt, dadurch keine Effekte von Zeitumstellung und
Jahreswechsel. Rolle = Fahrt ohne gültige GPS-Position (neu beim Einlesen gespeichert; TCX liest jetzt Positionen).
Kein Strava-Logo, keine Strava-Namen.

**Tests:** `logbook.test.js` (7) inkl. ISO-Woche über den Jahreswechsel, Sommerzeit, Rolle, Durchschnitt.
**Bilder:** `claude/bilder/f18-logbuch-{woche,monat}-{hell,dunkel}.png`.
**Nicht umgesetzt:** Fahrten, die vor diesem Stand hochgeladen wurden, haben keine Rollen-Kennung und zählen als draußen.

## 8. F23 – Mobilitätsübungen

**Umsetzung:** 22 neue Übungen (Hüfte, Brustwirbelsäule, hintere Kette, Waden/Sprunggelenk, Schultern/Nacken,
Unterarme) mit deutschem und englischem Namen, Schritten, Fehlern, Nutzen, Hinweis bzw. Kontraindikation, Ansage und
Halbzeit-Merksatz, Strichfigur mit Animation im bestehenden Stil. Vier Routinen mit je drei Varianten: Vor der Fahrt
(5 Min., nur dynamisch), Nach der Fahrt (10 Min., 30–45 s halten), Ruhetag (20 Min., bis 60 s, zwei Durchgänge),
Schreibtisch (5 Min.). Im Plan nimmt der Mobilitäts-Platz je nach Tag die Ruhetag- oder Nach-der-Fahrt-Routine, die
Variante wechselt von Woche zu Woche; frei startbar unter Mehr → Übungen (nächste Variante, gespeichert in `S.mobRot`).

**Sprachdateien:** 139 neue Sätze je Sprache mit Piper erzeugt. Audio gesamt jetzt 16,5 MB (Anfang: 5,2 MB). Geladen
wird nur, was eine gestartete Sequenz braucht.

**Fachliche Grundlage:** vor Belastung dynamisch mobilisieren, statisches Halten über 60 s pro Muskel vor Leistung
vermeiden; danach bzw. am Ruhetag 30–60 s halten.
Quellen: Behm DG et al. (2016) Appl Physiol Nutr Metab 41(1):1–11 · Opplert J, Babault N (2018): Acute effects of
dynamic stretching on muscle flexibility and performance. Sports Med 48(2):299–325 · ACSM’s Guidelines for Exercise
Testing and Prescription, 11. Aufl. 2021 (Beweglichkeit: 10–30 s, 2–4 Wiederholungen, mindestens 2–3 Tage pro Woche) ·
Page P (2012): Current concepts in muscle stretching for exercise and rehabilitation. Int J Sports Phys Ther 7(1):109–119
· Bennell K et al. (1998): Intra-rater and inter-rater reliability of a weight-bearing lunge measure of ankle
dorsiflexion. Aust J Physiother 44:175–180 (Kniewandtest).

**Tests:** `mobility.test.js` (6): Vollständigkeit, Englisch, Dauer je Variante, dynamisch vorher, Rotation im Plan,
freier Start mit Logbuch, Hinweise im Detail. Geschätzte reine Übungszeit 3–16 Min.; mit Ansagen, Übergängen und
Seitenwechseln kommen etwa 20–30 % hinzu.
**Nicht umgesetzt:** Die Strichfiguren sind vereinfacht; bei 90/90, Nacken und Kinn zurück ist die Bewegung aus der
Seitenansicht nur angedeutet.

## 9. F20 – „Tipps zu heute“

**Ursache der Wiederholungen:** Es gab nur sechs feste Tipps, einen je Tagesart.

**Umsetzung:** Katalog mit 160 Tipps (Deutsch und Englisch) in neun Kategorien, getaggt nach Tagesart (Ruhetag,
Rekom, Grundlage, Intervalle, Long Ride, Kraft, Event in ≤ 7 Tagen, Renntag, Tag danach), Phase, Jahreszeit, Wetter (wenn
aktiviert) und Erfahrung. Auswahl: passende Tipps, zuerst ungesehene, sonst die ältesten, frühestens nach 60 Tagen;
gespeichert in `S.tips` (Zustand, Spiegel, Sicherung). „Mehr dazu“, „Nächster Tipp“, „Nicht mehr zeigen“.

**Fachliche Prüfung bestehender Tipps:** Der Eiweiß-Tipp wird jetzt als 0,3–0,4 g pro kg Körpergewicht und Mahlzeit
gerechnet (bei 75 kg 23–30 g, statt eines festen Werts aus 0,3 g/kg). Die übrigen alten Tipps sind in den Katalog
übernommen und mit Quellen versehen oder ohne Zahlen formuliert.

**Quellen:** 34 Einträge im Katalog (`TIP_SRC`), u. a. Jeukendrup 2014 und 2017, ACSM/AND/DC 2016, ISSN Protein 2017 und
Koffein 2021, ACSM Flüssigkeit 2007, Burke 2011, National Sleep Foundation 2015, Mah 2011, Seiler 2010, Allen & Coggan,
Bosquet 2007, Rønnestad & Mujika 2014, Foss & Hallén 2004, Blocken 2018, Baker 2017, Meeusen 2013, Barnes 2014, Bini 2011,
Olivier & Creighton 2017, StVO § 5 Abs. 4, StVZO § 67, Périard 2015, Marcora 2009, Blanchfield 2014, IOC RED-S 2018,
Park Tool (Kettenverschleiß), Behm 2016, Armstrong 1994, Kerksick 2018, Owens 2018, Castellani & Young 2016, Bishop 2003.

**Tests:** `tips.test.js` (6): ≥ 150 Tipps mit beiden Sprachen und gültigen Tags, keine Zahl ohne Quelle, „Mehr dazu“-Ziele,
90 simulierte Tage ohne Wiederholung solange ungesehene passende Tipps da sind (über 60 verschiedene), Speichern und
Sicherung, Eiweiß aus dem Gewicht.

## 10. F21 – Vergleich mit dem Durchschnitt

**Umsetzung:** In „Wusstest du schon?“ erscheinen Vergleiche: W/kg gegenüber untrainierten Erwachsenen bzw. Männern oder
Frauen, Kategorie der Leistungsprofil-Tabelle (nur mit Vergleichsgruppe), FTP seit Planstart, Strecke des Monats als
Luftlinie zwischen Städten, geschaffte Einheiten. Neue Einstellung „Vergleichsgruppe“ (Männer/Frauen/keine Angabe) unter
Gewicht und FTP; ohne Wahl gilt die Angabe „Geschlecht“ aus der Planung, sonst keine. Wiederholung frühestens nach
60 Tagen.

**Referenzwerte und Sicherheit:**

| Wert | Quelle | Sicherheit |
|---|---|---|
| FTP-Kategorien W/kg, Männer und Frauen (z. B. „gut trainiert“ ab 3,6 bzw. 3,1 W/kg) | Allen H, Coggan A: Training and Racing with a Power Meter, Power Profile | mittel – Erfahrungstabelle, keine repräsentative Bevölkerungsstudie |
| Untrainiert: Männer etwa 2,2, Frauen 1,8, Erwachsene allgemein 2,0 W/kg | Mitte der Kategorie „untrained“ derselben Tabelle | niedrig bis mittel – breite Spanne, abhängig von Alter und Gewicht |
| Luftlinien zwischen Städten | aus Koordinaten berechnet (Haversine) | hoch |

**Entscheidungen:** Das Beispiel im Prompt nennt etwa 2,4 W/kg für untrainierte Männer; die App nutzt die Mitte der
Kategorie (2,2 W/kg). Ein Altersbezug („deines Alters“) entfällt, weil die App kein Alter kennt und es keine belastbaren
altersbezogenen FTP-Normen gibt. Wochenumfang und VO2max-Vergleiche entfallen mangels belastbarer Bevölkerungsdaten.

**Tests:** `compare.test.js` (8): Beispielrechnungen (3,6 W/kg → „etwa 60 % mehr als ein untrainierter Mann“), Frauen,
ohne Gruppe kein geschlechtsbezogener Satz, „Keine Angabe“ überschreibt, unter dem Durchschnitt nur Fortschritt,
FTP-Zuwachs und Luftlinie, 60-Tage-Regel, Karte de/en.

## 11. F22 – Reifendruckrechner

**Umsetzung:** Mehr → Werkzeuge → Reifendruck, Profile Rennrad und Gravel, Eingaben wie gefordert (Fahrtart,
Untergrund trocken/nass, glatt/rau/Kopfstein, Gewicht Fahrer/Rad/Gepäck mit Fahrergewicht aus F7, Reifenbreite,
Karkasse, Laufradgröße, Hookless/Haken, Felgeninnenweite, Schlauch/Tubeless/Latex, optional Maxima). Ausgabe vorn und
hinten in bar (0,05) und psi (0,5) mit Begründung und Hinweis „Startwert – nach Gefühl …“. Gespeichert in `S.tire`.

**Modell (eigenes, keine Herstellerformel):** Ziel-Einfederung 15 % der Reifenhöhe (Berto), Gravel 18 %, Cyclocross
25 %; effektive Breite + 0,4 mm je mm Felgeninnenweite über 17 mm; Last statisch 45/55, vorn + 2 Prozentpunkte für Bremsen
und Lenken; Aufstandsfläche K · δ · √(R · r) mit K = 3,15 (einziger angepasster Wert); Faktoren für Untergrund (rau −7 %,
Kopfstein −15 %), Karkasse (dünn +3 %, verstärkt −5 %), Latex −3 %, Tubeless −5 %, Nässe −6 %.

**Plausibilität:** 75 + 8 kg, 28 mm auf 21 mm innen, tubeless, trocken → **vorn 4,0 / hinten 4,5 bar** (58 / 65,5 psi),
im geforderten Bereich 4,0–4,8 bar. Weitere: 25 mm Schlauch 19 mm innen 5,2/5,85 bar; Gravel 40 mm rau 1,8/2,0 bar;
Cyclocross 33 mm 1,75/1,95 bar; Kopfstein 30 mm 3,05/3,45 bar.
**Abweichungen:** Bertos Originaltabelle (2006, schmale Felgen, Reifen mit Schlauch) liegt für 28 mm etwa 10–20 % höher;
heutige Herstellerempfehlungen für breite Felgen und Tubeless liegen im Bereich des Modells. Mit rein statischer
45/55-Verteilung läge vorn bei 3,7 bar (unter dem üblichen Bereich), deshalb der dynamische Zuschlag vorn.

**Sicherheitsgrenzen:** Hookless höchstens 5 bar (72,5 psi) nach ETRTO Standards Manual (Tubeless Straight Side,
TSS-Felgen); nie über das eingetragene Maximum von Reifen oder Felge; Mindestdruck (Straße mit Schlauch 3,0 bar, tubeless
2,5 bar; Gravel/CX 1,8 bzw. 1,4/1,2 bar) gegen Durchschläge und Burping. Jede erreichte Grenze zeigt einen Warnhinweis;
sind vorn und hinten dadurch gleich, erklärt die App das.

**Quellen:** Berto F (2006): Tire pressure and handling. Bicycle Quarterly · ETRTO Standards Manual (Hookless/TSS
höchstens 5 bar) · Umrechnung 1 bar = 14,5038 psi.
**Tests:** `tire.test.js` (8). **Bilder:** `claude/bilder/f22-reifendruck-{hell,dunkel,hookless-hell}.png`.

## 12. F19 – Karte der Strecke

Nur geprüft, nicht umgesetzt. Eigener Bericht: `claude/bericht-f19-karte-machbarkeit.md`. Kurz: Die Garmin-Anbindung
liefert über die Original-FIT-Datei GPS, Höhe, Geschwindigkeit, Puls und Leistung je Sekunde; die App liest Positionen
bereits, speichert sie aber nicht. Empfehlung: zuerst Stufe 1 (SVG-Linie und Höhenprofil, offline, etwa 1–2 Arbeitstage).

---

## Was insgesamt nicht umgesetzt oder nicht geprüft ist

- Nichts davon wurde auf einem echten iPhone geprüft (Statusleiste, Töne und Systemstimme, Wischen in der Grafik).
- Nicht veröffentlicht, kein Push, kein Merge.
- 15 englische Übersetzungslücken aus der Zeit vor diesem Prompt bestehen weiter (Liste in `tests/snapshots/i18n.json`).
- Sprachdateien: Neue Dateien haben 22,05 kHz (die ersten 296: 24 kHz), beides spielt jeder Browser.

## Prüfliste iPhone

1. **Versionszeile** ganz unten in den Einstellungen: „Relentless · Version 175 · Build 12.11.2026, 12:00“. Nach dem Öffnen
   erscheint „Was ist neu“ mit sechs Punkten; jeder „Zeigen“-Knopf führt zur passenden Seite.
2. App vom Home-Bildschirm, Heute nach unten scrollen: klare Kante unter der Statusleiste in Kopfzeilenfarbe, nichts
   verschwimmt. Hell und dunkel, Querformat, Übungssequenz, ein Dialog. In Safari (nicht installiert) wie bisher.
3. Fortschritt → Formkurve: Linien bis zum Event, Renntag-Linie am Eventdatum, A/B/C-Markierungen, keine überlappenden
   Monate.
4. Heute: Karte „Tage bis“ zeigt das nächste Event; Antippen öffnet die Saisonübersicht mit Zielzeit, Form und Pacing je
   Event. Event-Art umschalten ändert die Zielzeit.
5. Mehr → Plan anpassen → Alltag: Karte „Zeitbudget nach Jahreszeit“; Abbrechen verwirft Änderungen.
6. Kraft-Einheit starten (Stummschalter aus): Vorlauf, 3-2-1, „Los. … Satz 1 von 3 …“, „Fertig“ → Ton und „Satzpause …“,
   „Noch 10 Sekunden“, 3-2-1. Einmal „Stimme: Natürlich“, einmal „Systemstimme“.
7. Mehr → Übungen: „Routinen zum Mitmachen“, eine Routine starten und beenden; neue Übungen mit Grafik und Hinweis.
8. Logbuch: Grafik Woche/Monat, km/Zeit/Hm, Balken antippen filtert, Wischen blättert, „inkl. Rolle“.
9. Heute: „Tipp zu heute“ – „Nächster Tipp“ und „Nicht mehr zeigen“; am nächsten Tag ein anderer Tipp.
10. Mehr → Einstellungen → Gewicht und FTP: „Vergleichsgruppe“ wählen; „Wusstest du schon?“ zeigt danach gelegentlich
    einen Vergleich.
11. Mehr → Werkzeuge → Reifendruck: Werte für das eigene Rad plausibel; Hookless mit hohem Gewicht zeigt die 5-bar-Warnung.
12. „Wusstest du schon?“ → „Fahrten ansehen“: neueste bewertete Fahrt bzw. Logbuch mit Hinweis.
