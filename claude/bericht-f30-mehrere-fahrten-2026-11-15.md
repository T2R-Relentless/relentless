# Bericht F30 – Mehrere Fahrten an einem Tag

Stand 15.11.2026 · Branch `fix/f30-mehrere-fahrten` · nicht hochgeladen

## Eckdaten

| | |
|---|---|
| Basis-Branch | `main` (Commit `bb7a7cc`, Version 205). Darauf liegen Garmin-Import, Logbuch (F5), Zusatzfahrten (B1/F3), Plananpassung mit Zustimmung (F4), Leistungsprofil (F26), VO2max (F27), Formkurve (F28) und Reisemodus (F29). Es fehlt kein Bezug. |
| Branch | `fix/f30-mehrere-fahrten` |
| Version | 206 (vorher 205) |
| Build-ID | `20261129090000` |
| Service Worker | `relentless-v43` |
| Commits | drei getrennte Commits: Logik, Tests, Version mit Bericht (Liste am Ende) |

Abweichungen vom Prompt, weil das Repository anders aufgebaut ist:

| Prompt | Hier |
|---|---|
| `build.sh --check` | `python3 tools/build.py --check` |
| `tests/run-all.sh` | Browser-Tests, `runAll()` auf `http://localhost:8765/tests/` |
| `build/APP_VERSION`, `build/BUILD_ID` | `src/js/44-version-neuigkeiten.js`, `src/js/26-statistik-update.js`, `public/version.json` |
| `build/modules/wn/WHATSNEW.json` | `WN_DATA` in `src/js/44-version-neuigkeiten.js` |

## 1. Ursache und heutiges Ergebnis

**Wie bisher zugeordnet wurde:** `exeAuto` (src/js/13-fahrt-bewertung.js) nahm für eine neue Fahrt die geplante Einheit am selben Tag, falls sie noch keine Bewertung hatte. Der Garmin-Abgleich und das Hochladen gehen die Fahrten nach Startzeit durch. Damit bekam immer die **erste** Fahrt des Tages die Einheit, jede weitere wurde Zusatzfahrt (`exeExtra`). Die Fahrt wurde nicht verglichen.

**Belastung vor F30:** Die Formkurve (`vzDaily`) zählte jede Fahrt einmal, bewertete Einheiten über einen Schlüssel aus Tag und Minuten ohne doppelte Zählung. Die Wochensumme und das Logbuch zählten ebenfalls alle Fahrten. Doppelt gezählt wurde also nichts. Falsch waren nur Bewertung, Erledigt-Haken und Rückmeldung.

**Testfall** (Plan: „Schwelle 3×12“, 75 Min.; Fahrt A 20 Min. locker, 8 Min. Pause, Fahrt B mit 3 × 12 Min. bei 100 % FTP):

| | vor F30 | mit F30 |
|---|---|---|
| Einheit erfüllt durch | A (Anfahrt) | B (Training) |
| Bewertung | 7/100, „Anderes Training als geplant“ | 100/100, „Sehr gut umgesetzt“ |
| B | Zusatzfahrt | bewertete Einheit |
| A | bewertete Einheit | Zusatzfahrt |
| Vorschlag „Zusammenführen“ | – | ja (8 Min. Pause) |
| Rückfrage | – | nein, die Zuordnung ist eindeutig (0,95 gegen 0,08) |

## 2. Datenmodell

Alles liegt im jeweiligen Plan unter `S.p.mf` und damit in der Sicherungsdatei. Die Fahrten selbst (`S.man`) bleiben unverändert. Neu ist bei frisch eingelesenen Fahrten nur das Feld `te` (Endzeit).

```
S.p.mf = {
  r:    { [Fahrt-ID]: {role:'auto'|'training'|'commute', sid, src:'auto'|'user', sc, why, prov} },
  g:    { [Gruppen-ID]: {gid, ids[], by:'user'|'suggestion-accepted', at, day, role, sid, src, sc, why} },
  pair: { 'A|B': 'sep'|'join' },      beantwortete Vorschläge, keine zweite Frage
  ask:  { [Tag]: {open, done, unit} }, Rückfrage
  sug:  { [Tag]: [A, B, Pause in Min.] },
  none: { [Einheit]: 1 },              „Keine – Einheit nicht gefahren“
  stale:{ … },                         frühere Anpassung, die auf der alten Zuordnung beruhte
  old:  {at, days[], st}               Hinweis für Tage vor dem Update
}
```

Die Feldnamen aus dem Prompt entsprechen sich so: `assignedSessionId` ist `sid`, `assignSource` ist `src`, `assignScore` ist `sc` und `groupId` ist der Schlüssel in `g`. Eine Einheit heißt `Woche-Tag` bzw. `Woche-Tag-Teil` (Pendeltag).

Zuordnungen mit `src:'user'` gelten bei jedem weiteren Import und jeder Neuberechnung als fest. Ältere Sicherungen ohne `mf` laden unverändert. Die neue Logik greift dort erst bei neuen Importen oder nach Zustimmung (siehe 8).

## 3. Passwert

Für jede geplante Radeinheit des Tages und jede Fahrt bzw. Gruppe entsteht ein Wert von 0 bis 1. Zugeordnet wird die Kombination mit der höchsten Summe. Alle Kombinationen werden durchprobiert, je Tag sind es höchstens 2 Einheiten und wenige Fahrten. Bei Pendeltagen mit Hin- und Rückweg ergibt das eine eindeutige Kreuzzuordnung.

| Bestandteil | Gewicht strukturiert | Gewicht locker | Rechnung |
|---|---|---|---|
| Struktur | 0,50 | – | Intervallsuche wie in der Bewertung (`findIv`), Anteil der Intervalle im Zielbereich (im Ziel 1, darüber 0,6, knapp darunter 0,4, verfehlt 0) |
| Zonenverteilung | 0,20 | 0,45 | Soll aus den Blöcken der Einheit (`wkBlocks`), Ist aus 30-s-Mitteln. Ähnlichkeit = 1 − ½ · Σ \|Soll − Ist\| über die 7 Zonen. Ohne Leistung wird der IF verglichen. |
| Dauer | 0,20 | 0,35 | 1 − \|ln(Ist/Soll)\| / ln 2,5. Bei 40 % oder 250 % der Solldauer ist der Wert 0. |
| TSS | 0,10 | 0,20 | 1 − \|ln(Ist/Soll)\| / ln 3 |
| Tageszeit (nur Pendeltag) | 0,05 | 0,05 | Hinweg vor 12 Uhr, Rückweg danach. Nur schwach, weil Pendelzeiten schwanken. |
| Garmin-Workout | – | – | nicht genutzt, siehe 6 |

**Begründung:** Bei Intervalleinheiten verrät die Struktur am sichersten, welche Fahrt das Training war. Eine Anfahrt hat nie 3 × 12 Min. an der Schwelle. Bei lockeren Einheiten unterscheiden sich Fahrten vor allem in Dauer und Intensität, deshalb tragen dort Zonen und Dauer das Gewicht. Fehlt ein Bestandteil (z. B. keine Leistungsdaten), verteilt sich sein Gewicht auf die übrigen.

**Ausschluss:** Fahrten unter 10 Min. (`MF_MIN`) und als Pendeln markierte Fahrten erfüllen keine Einheit. Ihre Belastung zählt trotzdem.

**Ergebnisse der Testfälle:**

| Fall | Passwerte | Ergebnis |
|---|---|---|
| Anfahrt 20 Min. + Training 3×12 | Anfahrt 0,08 · Training 0,95 | Training zugeordnet, keine Rückfrage |
| Pendeln morgens 30 Min., Training abends (3 Std. Pause) | 0,03 · 0,95 | Training zugeordnet, kein Vorschlag „Zusammenführen“ |
| Pendeltag: Intervalle morgens, locker abends | Intervalle: Hinweg 0,69 / Rückweg 0,92 · Locker: Hinweg 0,93 / Rückweg 0,35 | Hinweg = locker, Rückweg = Intervalle. Nach Uhrzeit allein wäre es genau falsch herum gewesen. |
| zwei fast gleiche Grundlagenfahrten (60 und 59 Min.) | 0,99 · 0,99 | Rückfrage, vorläufige Wahl |
| Neustart im 2. Intervall, 2 Min. Pause | Teil 1 0,42 · Teil 2 0,38 | Rückfrage und Vorschlag „Zusammenführen“. Als Gruppe: 78/100, Intervall 1 und 3 erkannt. |

**Schwellwerte für die Rückfrage:** Abstand der zwei besten Werte unter 0,15 (`MF_ASK_GAP`) oder bester Wert unter 0,4 (`MF_ASK_LOW`), und nur wenn mindestens zwei Fahrten in Frage kommen. In den eindeutigen Fällen liegen die Abstände bei 0,57 bis 0,92, in den unklaren bei 0 bis 0,04. 0,15 trennt beides mit viel Abstand. Unter 0,4 passt keine Fahrt richtig, dann soll die Person entscheiden.

**Pause für „Zusammenführen“:** bis 30 Min. (`MF_GAP`). Ampel, Kaffee oder Neustart des Geräts dauern wenige Minuten. Eine Pause von einer Stunde und mehr gehört meist zu getrennten Fahrten, etwa Pendeln morgens und Training abends. Die Einstellung 15/30/60 Min. ist nicht eingebaut, die Konstante steht an einer Stelle. Den GPS-Abgleich (Ende der ersten nahe am Start der zweiten) gibt es nicht, weil die Streckenlinie in einer anderen Datenbank liegt und Start/Ende nicht im Fahrtdatensatz stehen.

**Erklärtext** in Woche, Logbuch und Import-Meldung, z. B. „Zugeordnet, weil hier die 3 × 12 Min. Schwelle erkannt wurden.“ Bei lockeren Einheiten: „… weil Dauer (1 Std. von 1 Std.) und Intensität am besten zur geplanten Einheit passen.“

## 4. Zusammenführen

- Die Karte „Gehören diese Fahrten zusammen?“ steht in der Woche am Tag, mit Uhrzeit, Dauer, Pause und Mini-Profil der Leistung je Fahrt. Knöpfe: „Zusammenführen“ und „Getrennt lassen“. Die Antwort wird je Paar gemerkt. Die Import-Meldung weist auf den Vorschlag hin, ein blockierendes Fenster gibt es nicht.
- Die Gruppe ist nur eine Zuordnung. Jede Fahrt bleibt eigener Datensatz, „Trennen“ stellt die Einzelfahrten wieder her und berechnet die Zuordnung neu.

**Rechenweg der Gruppen-Kennwerte:**

| Wert | Rechnung |
|---|---|
| Dauer, Distanz, Höhenmeter, TSS, Zeit in Zonen | Summe der Einzelfahrten (Dauer = Bewegungszeit, ohne Pause) |
| NP | NP_G = (Σ NP_i⁴ · t_i / Σ t_i)^¼. Das ist das Mittel der vierten Potenzen über alle 30-s-Fenster beider Fahrten. Kein Fenster reicht über die Pause, und die Pause zählt nicht als 0 W. Im Testfall: 140 W (20 Min.) und 217 W (70 Min.) ergeben 206 W. |
| IF | NP_G / FTP |
| Ø-Puls | nach Bewegungszeit gewichtet; Pulsverteilung als Summe der Einzelverteilungen |
| Intervallsuche | auf der hintereinandergehängten Sekundenreihe ohne Pause, Fenster über eine Abschnittsgrenze sind ausgeschlossen (`findIv(…, brk)`) |
| Grafik (F24) | Abschnitte hintereinander mit sichtbarer Lücke (Pause, höchstens 10 Min. breit) |
| Bestwerte | keine eigenen. Es zählen die Werte der Einzelfahrten, die Gruppe zeigt deren Maximum. |

## 5. Rückfrage

Die Karte „Welche Fahrt war dein Training?“ steht am Tag. Zur Wahl stehen die Fahrten (Uhrzeit und Dauer), „Beide zusammen“ und „Keine – Einheit nicht gefahren“. Bis zur Antwort gilt die Wahl der App, gekennzeichnet als „vorläufig“. Die Antwort wird gemerkt, danach wird nicht erneut gefragt.

## 6. Was Garmin je Fahrt liefert und was genutzt wird

Die Erweiterung „Garmin für Relentless“ liefert die Original-FIT-Datei. Die App liest daraus die Sekundenwerte (Zeit, Leistung, Puls, Höhe, Position, Temperatur) und die Sitzung (Sport, Untertyp, Dauer, Distanz, Höhenmeter, NP). Die Aktivitätsliste liefert Kennung, Name, Startzeit und Typ.

- **Genutzt:** Start- und Endzeit (neu `te` aus dem letzten Datenpunkt, bei älteren Fahrten Start + Bewegungszeit), Leistungs- und Pulsreihe, Dauer, TSS, NP.
- **Nicht genutzt:**
  - Laps: Der FIT-Leser wertet sie nicht aus. Die Intervallsuche aus der Leistung ist unabhängig davon, ob jemand die Lap-Taste drückt.
  - Kennung des gestarteten Garmin-Workouts: Der FIT-Leser liest die Workout-Nachricht nicht. Sie wäre ein starker Hinweis und ist als Vorschlag notiert.
- **Pausen:** Endzeit der einen und Startzeit der nächsten Fahrt kommen aus den Zeitstempeln und sind sicher. Bei älteren Fahrten ohne `te` ist die Endzeit geschätzt (Start + Bewegungszeit), die Pause wirkt dann etwas länger.
- **Sekundenreihen:** Sie liegen nur nach dem Einlesen im Speicher. Für spätere Neuberechnungen nutzt die App die gespeicherte Kurzreihe der Bewertung (5–8 s je Wert) und dehnt sie wieder auf Sekunden. Für 12-Min.-Intervalle ist das genau genug. Für Fahrten, deren Kurzreihe schon gelöscht ist (ältere Zusatzfahrten), rechnet der Passwert nur mit Dauer, TSS und IF.

## 7. Auswirkungen

- **Bewertung und Rückmeldung:** Sie werden nach jeder Zuordnungsänderung für die betroffene Einheit neu erstellt. Die Bewertung trägt den Vermerk „Neu bewertet nach Änderung der Zuordnung“, die Detailansicht nennt die vorherige Fahrt und deren Punkte. Eine Bewertung „deutlich unter dem Ziel“ nach einer Änderung reduziert keine Einheit mehr automatisch, sondern bietet einen Knopf zum Reduzieren an (mit Schnappschuss und „Rückgängig“).
- **Plananpassung (F4):**
  - Hatte die falsche Zuordnung eine Einheit automatisch reduziert, erscheint am Tag „Zurücknehmen / Behalten“.
  - War ein angenommener Vorschlag einer Zusatzfahrt betroffen (die Fahrt ist jetzt das Training), gilt dasselbe.
  - Offene Vorschläge verfallen mit der Zusatzfahrt. Angenommene Anpassungen bleiben, bis die Person sie zurücknimmt.
- **Belastung und Formkurve (F28):**
  - Es zählt die Summe aller Fahrten des Tages, gleich welche Rolle oder Gruppe.
  - Die Bewertung einer Gruppe wird in der Formkurve übersprungen, die Einzelfahrten zählen bereits. Der Test prüft: gleicher Tages-TSS getrennt, als Gruppe und mit Pendeln.
  - Pendeln zählt nicht zur Planerfüllung: Der Erledigt-Haken in `analyze` rechnet nur Fahrten ohne Pendeln, „Einheit nicht gefahren“ bleibt offen.
- **Bestwerte und Leistungsprofil (F26):** Sie werden je Einzelfahrt beim Einlesen berechnet, Pendelfahrten zählen mit. Gruppen erzeugen keine eigenen Bestwerte, also nichts über die Pause hinweg.
- **VO2max (F27):** Die Test- und Fahrtauswertung läuft weiter je Einzelfahrt beim Einlesen. Als Pendeln markierte Fahrten lösen keine Test-Auswertung aus und gelten nicht als „VO2max-Einheit gefahren“. Grenze: Beim Einlesen ist die Rolle noch unbekannt. Eine Anfahrt am Testtag wird deshalb wie bisher geprüft, die Rampen- bzw. 5-Min.-Erkennung verwirft lockere Fahrten aber.
- **Wochensummen, Logbuch-Grafik (F18), Historie:**
  - Alle Fahrten zählen mit ihren Kilometern, Stunden und Höhenmetern.
  - In der Logbuch-Liste erscheint eine Gruppe als **ein** Eintrag („2 Abschnitte“), und der Wochenkopf zählt sie als **eine** Fahrt. Die Detailansicht zeigt die Abschnitte aufgeklappt mit Pause.
  - Die Zeile „Gefahren: …“ in der Woche zählt weiter Einzelfahrten (dort geht es um Belastung).
  - Pendelfahrten haben im Logbuch ein eigenes Symbol und einen Filter-Chip „Pendeln“ (er erscheint, sobald es eine Pendelfahrt gibt).
- **Import-Meldung (B1):** Bei mehreren Fahrten nennt sie, welche Fahrt die Einheit erfüllt und warum, und ob ein Vorschlag oder eine Rückfrage wartet. Das gilt für den Garmin-Abgleich und das Hochladen von Dateien. Beim gezielten Hochladen zu einer Einheit gilt die Fahrt als vom Nutzer zugeordnet.

**Korrektur:** In der Woche am Tag und in der Detailansicht jeder Fahrt gibt es das Menü „Zuordnung“ mit „Als Training werten“ (Auswahl der Einheit, falls mehrere), „Als Anfahrt/Pendeln markieren“, „Zusammenführen mit …“, „Trennen“ und „Wieder automatisch zuordnen“. Jede Änderung legt einen Schnappschuss an (Liste der Sicherungen) und zeigt 10 Minuten lang „Rückgängig“, das genau den vorherigen Zustand herstellt.

## 8. Altdaten

Beim ersten Öffnen der Woche nach dem Update sucht die App vergangene Tage mit mindestens zwei Fahrten ab 10 Min. und einer geplanten Einheit. Sie bewertet **nichts** automatisch um. Stattdessen erscheint oben in der Woche einmal der Hinweis „An X Tagen gab es mehrere Fahrten. Zuordnung prüfen?“ mit:

- „Vorschläge ansehen“: je Tag bisherige und neue Fahrt mit Begründung und Knopf „Übernehmen“,
- „Alle übernehmen“,
- „Nicht mehr anzeigen“.

Jede Übernahme legt einen Schnappschuss an und bietet „Rückgängig“. Tage, an denen die bisherige Zuordnung schon passt, werden nur gezählt.

Grenze: Fahrten liegen 6 Wochen in `S.man`. Ältere Tage stehen im Logbuch, lassen sich aber nicht neu zuordnen. Vergangene Wochen werden mit der damals gespeicherten Einheit neu bewertet, Plananpassungen entstehen dabei nicht.

In den Testdaten (Testfall aus Punkt 1, als Stand vor dem Update gespeichert) ist es **1 Tag**. Der Test prüft Hinweis, Vorschlag, Übernahme und Rückgängig. Echte Nutzerdaten habe ich nicht.

## 9. Tests

Neue Datei `tests/mehrfahrten.test.js`, in `tests/index.html` und `tests/LIESMICH.md` aufgenommen. 13 Tests:

1. Testfall Anfahrt + Training: vorher Anfahrt zugeordnet (7/100), jetzt Training (100/100), Vorschlag „Zusammenführen“, keine Rückfrage, Meldung nennt den Grund, Karte in der Woche
2. Pause 3 Std.: kein Vorschlag, Training zugeordnet
3. Pendeltag mit zwei Einheiten: Kreuzzuordnung richtig, obwohl die Uhrzeit dagegen spricht
4. Zwei ähnliche Fahrten: Rückfrage, „vorläufig“, Antwort übernommen und gemerkt
5. Neustart mitten im 2. Intervall: Gruppe, kein Intervall über die Pause, Intervall 1 und 3 erkannt, Grafik mit Lücke
6. Gruppe: Summen, NP-Formel, Pause nicht als 0 W, Tages-TSS gleich (getrennt, Gruppe, Pendeln)
7. Pendeln: keine Zusatzfahrt, Logbuch „Pendeln“, Einheit bleibt offen, Belastung unverändert, Filter-Chip
8. Nutzerzuordnung übersteht neuen Import, Puls-Neuberechnung und Neuzuordnung
9. Rückgängig exakt (Zusammenführen, Pendeln, Als Training werten), Trennen stellt Einzelfahrten her
10. Bestwerte unverändert, Leistungsprofil nur je Fahrt, 20-Min.-Wert = Maximum
11. Logbuch: Gruppe als ein Eintrag, Wochenkopf „1 Fahrt“, Detail mit Erklärtext und Abschnitten
12. Sicherung: alter Stand ohne `mf` lädt, einmaliger Hinweis, nichts automatisch umbewertet, Übernehmen und Rückgängig, `mf` steht in der Sicherungsdatei
13. Englisch: Karte, Vorschlag und Menü übersetzt

**Ergebnis:**
- Alle **283 Tests grün** (270 bisherige + 13 neue).
- `python3 tools/build.py --check`: aktuell.
- Die Vergleichsstände der fünf Plan-Szenarien sind neu geschrieben. Geändert hat sich je nur die Versionszeile (205 → 206).

**Bildschirmfotos** in `claude/bilder/`, je 375 pt hell und 430 pt dunkel:

| Datei | Inhalt |
|---|---|
| `f30-import-*` | Import-Meldung |
| `f30-woche-zusammen-*` | Woche mit zwei Fahrten und Karte „Gehören diese Fahrten zusammen?“ |
| `f30-woche-menue-*` | Menü „Zuordnung“ am Tag |
| `f30-rueckfrage-*` | „Welche Fahrt war dein Training?“ |
| `f30-logbuch-detail-*` | Detail mit Zuordnung und Erklärtext |
| `f30-logbuch-gruppe-liste-*`, `f30-logbuch-gruppe-detail-*` | Gruppe in der Liste und aufgeklappt |
| `f30-logbuch-pendeln-*`, `f30-woche-pendeln-*` | Pendelfahrt im Logbuch und in der Woche |
| `f30-altdaten-*` | Hinweis für Altdaten |

**Nicht geprüft:** iPhone, VoiceOver, echter Garmin-Abruf (die Tests nutzen synthetische Fahrten mit 1 Hz), echte Nutzerdaten.

## Offene Punkte und Vorschläge

- **Automatische Pendel-Erkennung** („Fahrten dieser Art künftig als Pendeln werten“): nicht eingebaut. Sinnvoll wäre: gleiche Start-/Zielgegend (aus der Streckenlinie in IndexedDB), ähnliche Dauer, mindestens dreimal markiert. Dann nur als Vorschlag, standardmäßig aus.
- **Garmin-Workout-Kennung** aus der FIT-Datei lesen (Workout-Nachricht). Wenn das übertragene Workout gestartet wurde, ist die Zuordnung sicher.
- **Einstellung Pausengrenze** 15/30/60 Min.: Die Konstante ist vorbereitet, eine Einstellung fehlt.
- Die Zeile „Gefahren: …“ in der Woche zählt Einzelfahrten, das Logbuch zählt Gruppen als eine Fahrt. Das ist so gewollt, könnte aber auffallen.
- Wird eine Gruppe als Pendeln markiert, gilt die ganze Gruppe als Pendeln. Wird ein Abschnitt markiert, löst die App ihn aus der Gruppe.
- Der Prompt nennt den Altdaten-Hinweis „z. B. in ‚Was ist neu‘“. Er steht in der Woche, weil er Knöpfe je Tag braucht. „Neu in dieser Version“ beschreibt die Funktion allgemein.
- Hinweis „Wusstest du schon?“ `mfday` (mit Englisch). Der Knopf führt zur Karte des Tages und setzt den Fokus auf „Zuordnung“. Er erscheint, wenn es heute oder gestern Fahrten gab.

## Commits

```
F30: Zuordnung bei mehreren Fahrten am Tag (Passwert, Zusammenführen, Rückfrage, Pendeln, Logbuch)
F30: Tests für mehrere Fahrten an einem Tag
F30: Version 206, Neuigkeiten, Hinweis, Bericht
```

## Was du zum Veröffentlichen tun musst (nicht von mir ausgeführt)

1. Bericht und Bilder ansehen. Am besten auf dem iPhone selbst einen Tag mit Anfahrt und Training prüfen.
2. Freigabe geben („Ja, hochladen“ bzw. „Ja in Main“). Dann pushe ich `fix/f30-mehrere-fahrten` und bringe `main` per Fast-Forward auf den neuen Stand.
3. Netlify baut aus `main`. Danach erscheint in der App der Update-Hinweis und „Neu in dieser Version“ (Version 206).
4. Nach dem Update in der Woche den Hinweis „An X Tagen gab es mehrere Fahrten“ prüfen. Übernommen wird nur, was du bestätigst.
