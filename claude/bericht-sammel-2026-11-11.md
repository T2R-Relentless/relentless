# Bericht Sammel-Prompt 11.11.2026 – Etappe 1 (Fehler B6, B9, B10, B7, B8)

Branch `feature/sammel-2026-11-11` (von `main`, Version 174, Build `20261107223000`, Service Worker `relentless-v11`).
Ein Commit je Punkt. Nicht veröffentlicht, kein Push, kein Merge. Etappe 2 (F17–F23, F19) folgt.

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

**Testergebnis am Ende von Etappe 1:** 101 von 101 Tests bestehen, `tools/build.py --check` grün, Sprachkatalog vollständig
(`generate.py --check`: 337 de, 337 en, nichts fehlt).

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

## Prüfliste iPhone (Etappe 1)

Die Versionsnummer wird erst am Ende von Etappe 2 erhöht; bis dahin zeigt die Versionszeile noch 174.

1. App vom Home-Bildschirm öffnen, Heute nach unten scrollen: Unter der Statusleiste ist eine klare Kante in der Farbe der
   Kopfzeile, nichts verschwimmt. Hell und dunkel prüfen, Querformat, Übungssequenz, ein Dialog.
2. In Safari (nicht installiert) dieselbe Seite: wie bisher.
3. Fortschritt → Formkurve: Linien laufen bis zum Event, Renntag-Linie am Eventdatum, keine überlappenden Monate.
4. Mehr → Plan anpassen → Alltag: Karte „Zeitbudget nach Jahreszeit“, Werte ändern, Vorschau ändert sich; Abbrechen
   verwirft die Änderung.
5. Kraft-Einheit starten (Stummschalter aus): Vorlauf mit Ansage, 3-2-1, „Los. … Satz 1 von 3 …“, „Fertig“ → Ton und
   „Satzpause, 1 Minute 30 …“, „Noch 10 Sekunden“, 3-2-1. Einmal mit „Stimme: Natürlich“, einmal mit „Systemstimme“.
6. „Wusstest du schon?“ → „Fahrten ansehen“: mit Fahrten die neueste Auswertung, ohne Fahrten das Logbuch mit Hinweis.
