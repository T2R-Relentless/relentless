# Bericht F32 (TSS im Logbuch) und F33 (ältere Garmin-Fahrten importieren)

Stand 15.11.2026 · Branch `feature/f32-f33-tss-historie` · nicht hochgeladen

## Eckdaten

| | |
|---|---|
| Basis-Branch | `main` mit Version 207 (Commit `357c1d5`). Er enthält F7 (FTP-Verlauf), F18 (Verlaufsgrafik), F26/F27, F28, F30 und F31. Kein Bezug fehlt. |
| Branch | `feature/f32-f33-tss-historie` |
| Version | 208 |
| Build-ID | `20261213090000` |
| Service Worker | `relentless-v45` |
| Commits | drei Commits: Logik und Oberfläche, Tests, Version mit Bericht |
| Netlify Function | **unverändert**, kein Deployment der Function nötig (Begründung unten) |

Abweichungen vom Prompt, weil das Repository anders aufgebaut ist:

| Prompt | Hier |
|---|---|
| `build.sh --check` | `python3 tools/build.py --check` |
| `tests/run-all.sh` | Browser-Tests (`runAll()`) |
| Versionsdateien unter `build/` | `src/js/44-version-neuigkeiten.js`, `src/js/26-statistik-update.js`, `public/version.json` |

## 1. Bestandsaufnahme

**TSS an mehreren Stellen, mit verschiedener FTP:**
- Beim Einlesen (`summarize`) mit der **aktuellen** FTP des Plans.
- Ohne Leistung aus dem Puls. Ohne Puls mit einem festen IF von 0,65 (eine Schätzung ohne Grundlage).
- Die Formkurve (`vzDaily`) nahm für bewertete Fahrten die Belastung der Bewertung, sonst den gespeicherten Wert.
- Wochensummen und Logbuch nahmen den gespeicherten Wert aus dem Fahrtenarchiv (`S.arch`).

**Verlaufsgrafik F18:**
- km, Zeit oder Hm je Woche oder Monat, 12 Perioden, mit Blättern, Vorjahr und Antippen als Filter.

**Garmin-Abruf:**
- Laufender Plan: 42 Tage mit Original-FIT-Datei je Fahrt (`S.man`).
- Einstieg: 90 Tage (`S.hist`).
- Seiten zu 50, höchstens 8 Seiten.
- Doppelschutz über `S.gm.ids` (die Garmin-IDs der letzten 400 Fahrten).
- Übernommen werden nur Radtypen (`gmBike`: cycl/biking/ride/bmx, ohne E-Bike).

**FTP-Verlauf F7:**
- `S.wf` beginnt beim ersten Aufruf mit dem Planstart bzw. dem Tag der Eingabe.

**Formkurve:**
- Sie rechnete höchstens 120 Tage zurück.
- Startwert ist der Schnitt der ersten 28 Tage, ohne Fahrten also fast 0.

**Speicher:**
- Eine importierte Zusammenfassung braucht im Mittel **208 Byte** (gemessen im Test mit 160 Fahrten: 33 KB).
- Eine vollständig eingelesene Fahrt liegt mit Bewertung und Kurzreihe bei mehreren KB; Höhenprofil und Strecke liegen in IndexedDB.

## 2. Einheitliche TSS-Rechnung `rideTss(ride)`

Eine Funktion (`src/js/43f-tss-historie.js`) für Logbuch, Formkurve, Wochensummen, Rückblicke und das Einlesen neuer Fahrten. Bewertungen geplanter Einheiten behalten ihre damalige TSS.

| Quelle | Wann | Rechnung |
|---|---|---|
| `power` | NP vorhanden und FTP bekannt | TSS = (Dauer_s × NP × IF) / (FTP × 3600) × 100, IF = NP / FTP. FTP = am Fahrtdatum gültiger Eintrag im Verlauf (`ftpAt`). Vor dem ersten Eintrag: erster Eintrag, als Schätzung gekennzeichnet. |
| `hr` | kein NP, Puls und Schwellenpuls (bzw. 88 % HFmax) bekannt | IF aus Puls/Schwellenpuls über die Bereichsgrenzen nach Coggan (69 % LTHR ≈ 56 % FTP, 83 % ≈ 75 %, 94 % ≈ 90 %, 100 % ≈ 100 %), dann TSS = Std. × IF² × 100. Gekennzeichnet „geschätzt (Puls)“. |
| `garmin` | weder Leistung noch verwertbarer Puls | Garmins `trainingStressScore`, gekennzeichnet „Garmin-Wert“ |
| `alt` | ältere Einträge ohne Quelle | gespeicherter Wert bleibt (keine stille Umbewertung) |
| `none` | nichts davon | keine TSS. Die Fahrt zählt nur bei km, Zeit und Hm. |

**Quellen:**
- Die TSS-Formel samt IF und NP ist von Coggan und steht in Allen & Coggan, *Training and Racing with a Power Meter* (VeloPress). Das Buch hat keine DOI.
- Das Fitness-/Ermüdungsmodell (CTL 42 Tage, ATL 7 Tage) folgt dem Impuls-Antwort-Modell nach Banister (Banister et al. 1975) in der Form des „Performance Manager“ von Coggan. So steht es schon in der Formkurve (F28).
- hrTSS ist keine gemessene Größe: Die Zuordnung Puls → Leistungsbereich ist eine Näherung nach Coggans Bereichen. Deshalb gilt sie als Schätzung.

**Änderungen gegenüber vorher:**
- Neue Fahrten ohne Leistung und ohne Puls bekommen **keine TSS** mehr statt IF 0,65.
- Mit einer Bewertung (Empfinden 1–10) zählt in der Formkurve wie bisher die Session-RPE-Schätzung (Foster et al. 2001).
- Ändert sich der FTP-Verlauf (auch „FTP damals“), rechnen Logbuch und Formkurve sofort neu, weil die TSS beim Lesen entsteht. Der Speicherwert im Archiv wird nachgezogen. Bewertungen bleiben.
- Mehrere Fahrten am Tag zählen alle (F30). Gruppen werden nicht doppelt gezählt: Die Bewertung einer Gruppe wird übersprungen, ihre Einzelfahrten zählen.

**TSS-Quellen in den Testdaten** (110 importierte Fahrten, Schwellenpuls eingetragen):

| Quelle | Fahrten | Anteil |
|---|---|---|
| Leistung | 74 | 67 % |
| Puls | 18 | 16 % |
| Garmin-Wert | 18 | 16 % |
| keine TSS | 0 | 0 % |

Ohne Schwellenpuls und maximale Herzfrequenz fallen die Puls-Fahrten auf den Garmin-Wert zurück (Test: 74 Leistung / 36 Garmin).

## 3. F32: TSS im Logbuch

**Verlaufsgrafik:**
- Der Messgrößen-Umschalter hat jetzt km · Zeit · Hm · **TSS**, der Zeitraum Woche · Monat · **Alles**.
- TSS-Balken je Woche bzw. Monat, aktuelle Periode hervorgehoben, Durchschnittslinie.
- **Geplanter TSS** steht als gestrichelter Umriss hinter dem Ist-Balken, nur für Perioden im Plan. Die laufende Woche kommt aus dem gespeicherten Plan, die übrigen aus dem Planer. Entlastungswochen erkennt man am niedrigeren Umriss.
- **Sprung-Hinweis:** Liegt eine Woche mehr als 30 % über dem Schnitt der 4 Wochen davor (und mindestens 30 TSS darüber), erscheint ein kleines Dreieck. Beim Antippen steht dort „Deutlich mehr als zuletzt: +X %“. Das ist ein **Richtwert**, kein Alarm. Feste Grenzwerte für Belastungssprünge sind wissenschaftlich umstritten, deshalb keine Quelle als Beleg.
- **Antippen** eines Balkens zeigt TSS Ist und Soll, die Zahl der Fahrten und wie viele davon geschätzt sind, und filtert die Liste wie bisher.
- **Alles:** Monatsbalken ab der ersten Fahrt, mindestens 12. Die Beschriftung wird bei vielen Monaten ausgedünnt, Blättern und Vorjahr entfallen dort.
- **VoiceOver:** Die versteckte Tabelle hat je Periode TSS, „deutlich mehr als zuletzt“ und eine Spalte „Geplant“.
- **Fitness-Linie (CTL) in der Grafik:** weggelassen. Auf 340 pt Breite brauchte sie eine zweite Achse neben Ist-Balken, Soll-Umriss und Durchschnitt. Das wäre nicht mehr lesbar. Die Formkurve (F28) zeigt CTL ausführlich.

**Liste und Detail:**
- Der Wochenkopf hat zusätzlich die TSS-Summe.
- Jede Fahrt zeigt TSS (mit „(geschätzt)“ ohne Leistung) und IF.
- Importierte Fahrten tragen das Symbol „importiert“. Der Filter-Chip „Importiert“ erscheint, sobald es welche gibt.
- Die Detailansicht nennt TSS mit Quelle, IF, NP, die verwendete FTP (mit Hinweis, wenn sie vor dem FTP-Verlauf geschätzt ist) und die Herkunft „Garmin, importiert“.

## 4. F33: Ältere Fahrten importieren

**Aufruf:**
- Einstellungen → Garmin, „Ältere Fahrten importieren“: 3 Monate (empfohlen) · 6 · 12 · Alles, mit dem Satz „Damit Fitness und Formkurve von Anfang an stimmen.“
- Im Assistenten erscheint dieselbe Karte im FTP-Schritt „aus Daten“, wenn Garmin verbunden ist und weniger als 6 Wochen Fahrten vorliegen.

**Ablauf:**
- Die App ruft Seite für Seite ab (50 Fahrten), mit 0,8 s Pause dazwischen.
- Bei Drosselung (Code `rate`, also Garmin-429 oder die Grenze der Function) wartet sie automatisch 15, 30, 60, 120 und 240 s und macht dann weiter.
- Der Fortschritt zeigt „124 Fahrten übernommen, ca. 310 insgesamt · zurück bis …“ mit Balken. Die Gesamtzahl ist geschätzt aus dem erreichten Datum, weil Garmin keine Gesamtzahl liefert.
- Der Import läuft weiter, während man die App nutzt, und lässt sich anhalten.
- Der Stand liegt in `S.imp`. Nach einem Neustart steht der Import auf „Unterbrochen“, „Fortsetzen“ macht bei der gespeicherten Seite weiter.

**Doppelschutz und Filter:**
- Garmin-IDs aus laufender Liste, Einstieg, Archiv und `S.gm.ids` werden nicht noch einmal übernommen. Vorhandene Fahrten werden nicht überschrieben.
- Wird eine importierte Zusammenfassung später als vollständige Fahrt eingelesen, ersetzt diese den Eintrag im Archiv. Das ist eine Fahrt, keine zwei.
- Nur Radtypen mit dem bestehenden Filter `gmBike`: z. B. `road_biking`, `cycling`, `gravel_cycling`, `mountain_biking`, `indoor_cycling`, `virtual_ride`, `track_cycling`, `cyclocross`, `bmx`. E-Bikes und andere Sportarten nicht.
- Andere Sportarten werden gezählt und genannt (Test: `running`, `e_bike_fitness`). Laufen als Belastung wäre ein Vorschlag für später.
- Fehlaufzeichnungen unter 5 Min. oder unter 1 km werden übersprungen. Rolle, Zwift und Indoor gelten ohne die km-Grenze.

**Datenumfang:**
- Nur die Zusammenfassung: Datum, Name, km, Hm, Bewegungszeit, NP, Ø-Leistung, Ø-Puls, Garmin-TSS, Typ.
- **Bestwerte (F26)** lassen sich für Fahrten mit Leistung der letzten 12 Monate auf Knopfdruck nachladen. Die App holt dafür jede Original-Datei einzeln, etwa 2 s je Fahrt mit Pause, und übernimmt die Werte still, ohne „Neuer Bestwert“.
- Ältere Fahrten laden ihre Daten wie bisher beim Öffnen (F25).
- VO2max (F27) wird aus der Historie nicht neu geschätzt. Das ist ein offener Punkt.

**Speicher und Dauer** (gemessen 208 Byte je Fahrt):

| Zeitraum | Fahrten (bei 3–4 je Woche) | Speicher | Abrufe | Dauer (geschätzt) |
|---|---|---|---|---|
| 3 Monate | etwa 40 | etwa 8 KB | 1 | 1–3 s |
| 12 Monate | etwa 160 | etwa 33 KB | 4 | 5–10 s |
| Bestwerte nachladen | | | 1 je Fahrt | 160 Fahrten etwa 6–8 Min. |

Das Archiv fasst jetzt bis zu 4.000 Fahrten (vorher 2.500).

**FTP damals:**
- Liegen importierte Fahrten mit Leistung vor dem ersten Eintrag im FTP-Verlauf, fragt die Karte einmal „Wie hoch war deine FTP damals ungefähr?“, mit Datum und Wert. Mehrere Einträge sind möglich.
- Vorschlag: 95 % des besten 20-Min.-Werts im Zeitraum, falls Bestwerte vorliegen. Er ist gekennzeichnet.
- „Aktuelle FTP verwenden“ lässt die Schätzung stehen.
- Einträge landen sortiert im Verlauf `S.wf` mit `back:1`. Die aktuelle FTP bleibt der letzte Eintrag.

**Anzeige und Tag:**
- Importierte Fahrten erscheinen im Logbuch ohne Plan-Bewertung und lösen keine Plananpassung aus.
- Der Tag kommt aus `startTimeLocal`. Eine Fahrt um 23:50 Ortszeit gehört zu diesem Tag, auch wenn sie in UTC schon am nächsten liegt (Test).

## 5. Auswirkungen

- **Formkurve:**
  - Sie rechnet ab der ältesten Fahrt, höchstens 2 Jahre zurück (vorher 120 Tage).
  - Nach dem Import erscheint einmal: „Mit deiner Historie: Fitness heute X (vorher Y). Form am Renntag … (vorher …)“.
  - Im Test steigt die Fitness von „keine Daten“ auf 84.
- **Plan:**
  - Nichts ändert sich automatisch (Test).
  - Weicht der Umfang der 6 Wochen vor dem Planstart um mehr als 30 % vom angenommenen Ausgangsumfang ab, gibt es einen Vorschlag: „Ausgangsumfang auf X Std. setzen?“.
  - Annehmen legt einen Schnappschuss an und ändert die kommenden Tage, danach gibt es 10 Minuten „Rückgängig“ (exakt, Test). Ablehnen ändert nichts.
- **Bestwerte, Leistungsprofil:** Nachgeladene Fahrten zählen im Leistungsprofil und im „Allzeit“-Bereich mit, ohne Feier.
- **Fortschritt, Wochensummen, Rückblicke, Prognosen (F17/F21):** Sie nutzen das Archiv und die Formkurve und sehen damit die importierten Fahrten.

## Garmin-Prüfung über die App-eigene Function

Ich habe die Function im Code geprüft (`netlify/functions/garmin.mjs`). Einen Live-Abruf mit deinem Schlüssel habe ich **nicht** gemacht: Der Schlüssel liegt nur in deinem Browser, und ich gebe ihn nicht weiter.

- **Zugang:** Garmins **Personal API** (`personal.connectapi.garmin.com`), Aktivitätsliste `activitylist-service/activities/search/activities` mit `start`, `limit` (höchstens 50), `startDate`, `endDate`. Dazu die Original-Datei über `download-service`. Das ist dieselbe Schnittstelle, die die Erweiterung nutzt, nicht die inoffizielle Connect-Webschnittstelle.
- **Felder:** Die Function gibt genau die Felder aus der Vorab-Prüfung weiter (`activityId`, `activityName`, `startTimeLocal`, `startTimeGMT`, `distance`, `duration`, `movingDuration`, `elevationGain`, `averageHR`, `maxHR`, `avgPower`, `maxPower`, `normPower`, `trainingStressScore`). Der Typ kommt verkürzt auf `typeKey`. Die App liest beide Formen.
- **Grenzen:** `start` bis 100.000 (das reicht für jede Historie), keine Zeitgrenze im Code. Die älteste abrufbare Fahrt bestimmt Garmin, laut deiner Vorab-Prüfung reicht es zurück bis Dezember 2022.
- **Drosselung:** Eigene Grenze von 120 Abrufen pro Minute und IP. Garmin-429 wird als `rate` weitergegeben. Der Import braucht für 12 Monate 4 Abrufe, das Nachladen der Bestwerte 1 je 2 s, also unter der Grenze. Bei `rate` wartet die App und macht weiter.
- **Abweichungen zur Erweiterung:** keine bei den Feldern. Die Erweiterung liefert zusätzlich `nextStart`, die Function auch.

**Ergebnis: keine Änderung an der Function nötig, kein Deployment der Function.** Die App wird wie immer über `main` ausgeliefert.

## 6. Tests

Neue Datei `tests/tss-historie.test.js` (8 Tests), eingetragen in `tests/index.html` und `tests/LIESMICH.md`:

1. `rideTss`: FTP aus dem Verlauf vor und nach einer Änderung, vor dem Verlauf als Schätzung, Beispiel der Vorab-Prüfung (3.636 s, NP 213 W, FTP 250 W → **73**), Puls, Garmin-Rückfall, keine Daten, alter Wert
2. Import: drei Seiten, eine Drosselung mit Wiederholung, Typfilter, Fehlaufzeichnung, Duplikat, Mitternacht, Rolle, alle TSS-Quellen, zweiter Import ohne Doppel
3. Anhalten, App-Neustart, Fortsetzen an der gespeicherten Seite, jede Fahrt genau einmal
4. Formkurve und Logbuch mit gleicher TSS, CTL ab der ältesten Fahrt, Info nach dem Import
5. Kein Planeingriff, Vorschlag Ausgangsumfang, Rückgängig exakt
6. FTP damals: Abfrage, neue TSS, Bewertung unverändert, Verlauf sortiert, aktuelle FTP bleibt, Abfrage danach erledigt
7. Logbuch: TSS-Kopf mit Soll, Umriss, Sprung, Tabelle für VoiceOver, Liste (TSS, IF, importiert), Wochenkopf, 12 Monate, Alles ab 2024, Filter „Importiert“, Detail
8. Sicherung mit 160 Fahrten (33 KB, 208 Byte je Fahrt), Import in der Sicherungsdatei, alter Stand ohne Quelle, Puls und Verlauf lädt

**Ergebnis:**
- Alle **303 Tests grün** (295 bisherige + 8 neue).
- `python3 tools/build.py --check`: aktuell.
- Neu geschrieben habe ich nur die Versionszeile in den fünf Plan-Vergleichsständen.
- Die bestehenden Formkurven- und Saisontests blieben ohne Änderung grün.

**Bildschirmfotos** in `claude/bilder/`, je 375 pt hell und 430 pt dunkel:

| Datei | Inhalt |
|---|---|
| `f32-grafik-woche-*` | Grafik mit TSS, 12 Wochen, mit Liste |
| `f32-balken-angetippt-*` | angetippter Balken |
| `f32-grafik-monat-*` | 12 Monate |
| `f32-grafik-alles-*` | Alles |
| `f32-fahrt-detail-*` | Fahrt-Detail |
| `f33-import-dialog-*` | Import-Dialog |
| `f33-fortschritt-*` | Fortschritt |
| `f33-info-ftp-damals-*` | Abfrage „FTP damals“, Info nach dem Import mit Vorschlag |

**Nicht geprüft:**
- echter Garmin-Abruf (die Tests nutzen eine Attrappe mit Seiten und simulierter 429)
- iPhone und VoiceOver auf dem Gerät
- Laufzeit bei sehr großer Historie (über 1.000 Fahrten) auf dem Handy

## Offene Punkte und Vorschläge

- **VO2max aus der Historie** (F27) nicht nachgerechnet. Möglich wäre es aus nachgeladenen 5-Min.-Bestwerten.
- **Laufen und andere Sportarten** als Belastung (rTSS) für die Formkurve.
- **Bestwerte nachladen** bei „Alles“ ist auf 12 Monate begrenzt. Ältere Fahrten laden ihre Daten beim Öffnen.
- Der Vorschlag zum Ausgangsumfang greift nur, wenn mindestens 4 Fahrten in den 6 Wochen vor dem Planstart liegen.
- Sehr alte Fahrten ohne Leistung und Puls haben jetzt keine TSS. Neue Fahrten ohne Sensoren bekommen erst durch das Empfinden in der Bewertung eine Belastung.

## Commits

```
F32/F33: einheitliche TSS, TSS im Logbuch, Import älterer Garmin-Fahrten
F32/F33: Tests für TSS und Garmin-Historie
F32/F33: Version 208, Neuigkeiten, Hinweise, Bericht
```

## Was du zum Veröffentlichen tun musst (nicht von mir ausgeführt)

1. Bericht und Bilder ansehen. Am besten in der App mit deinem Garmin-Konto „3 Monate“ importieren und das Logbuch mit TSS ansehen.
2. Freigabe geben („Ja in Main“). Dann pushe ich den Branch und bringe `main` per Fast-Forward auf den neuen Stand.
3. Netlify baut aus `main`. Die Function bleibt unverändert, ein eigenes Deployment der Function ist nicht nötig.
