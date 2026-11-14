# Bericht F28 – Formkurve auf dem Smartphone gut lesbar machen

Stand: 14.11.2026

## Versionen und Branches

| | |
|---|---|
| Basis-Branch | `main` bei `d4c5fcd` (v197). Er enthält B9 (Prognose bis zum Renntag, `vzRows`/`vzFuture`) und F17 (Event-Markierungen, Plan-Check, `seasonEvs`/`efList`). |
| Neuer Branch | `feature/f28-formkurve`, nur lokal |
| Version | 198 (`APP_VERSION` in `src/js/44-version-neuigkeiten.js`, `public/version.json`) |
| Build-ID | 20261119090000 (`APP_BUILD` in `src/js/26-statistik-update.js`, `public/version.json`). Neue Funktion, daher Fenster „Neu in Version 198“ und Update-Hinweis. |
| Service Worker | `relentless-v35` (`public/sw.js`) |
| Commits | `19d3d30` (Umsetzung), danach ein Commit mit Feinschliff, Bildern und diesem Bericht |

**Abweichungen vom Prompt, weil es die genannten Dateien im Repository nicht gibt:**
- `claude/backlog.md` fehlt.
- `build.sh`, `build/APP_VERSION`, `build/BUILD_ID`, `build/modules/wn/WHATSNEW.json` und `tests/run-all.sh` fehlen.
- So läuft es in diesem Repository:
  - Build mit `python3 tools/build.py` (`--check` prüft, ob `public/` aktuell ist).
  - Tests im Browser unter `tests/index.html` mit `runAll()`.
  - Neuigkeiten in `WN_DATA`.
  - Die neue Testdatei ist dort eingebunden.

## 1. Bestandsaufnahme

- **Zeichenfunktion:** `vzForm()` in `src/js/27-grafiken.js`. Sie wird nur auf der Seite „Formkurve“ (`sform`) gezeigt.
  - `stSubs` las bisher die Unterzeile „Fitness …, Form …“ per Textsuche aus `vzForm()`. Jetzt nimmt es die Werte direkt aus `vzRows()`, mit gleicher Ausgabe.
  - Plan-Check (`11-saison-check.js`, `formRows`), Saisonübersicht (`32-uebersicht-saison.js`) und die Überlastungswarnung (`06-sicherheit-belastung.js`) nutzen nur die Rechnung `vzRows()`, nicht die Zeichnung.
- **Daten je Tag** (`vzRows().rows`): `day`, `t` (gefahrene bzw. geplante TSS), `ctl`, `atl`, `tsb`, `f` (Prognose).
  - Events kommen aus `seasonEvs(p)` mit Priorität A/B/C, das Hauptevent ist A.
  - Die Einheit des Tages kommt aus dem Plan bzw. aus `genWeek` für spätere Wochen. Fahrtnamen kommen aus `S.man`/`S.hist`.
- **Grenzwerte der Form:** Die App hatte sie schon im Text (`state()` in `vzForm`): über +25, +5 bis +25, −10 bis +5, −30 bis −10, unter −30. Das sind genau die Werte aus dem Prompt, also unverändert übernommen (`VZ_BANDS`).
- **Manifest:** `"orientation": "portrait"`. In der Home-Bildschirm-App ist Querformat nicht möglich (Begründung unter 2g).
- **Tabelle für Screenreader:** Bisher gab es keine. Neu ist eine versteckte Tabelle mit einem Wert je Woche des gewählten Zeitraums.

## 2. Was umgesetzt ist

**a) Kennzahlen-Kacheln (2 × 2)**
- Die vier Kacheln: Fitness heute, Form heute (mit Wort), nächstes A-Event (Name, Datum, Fitness · Form am Renntag) und Saisonspitze (Fitness und Datum).
- Zahlen 30 px fett, Beschriftung 13 px.
- Ein Tipp springt zum Tag. Liegt er nicht im gezeigten Zeitraum, wechselt die Ansicht: heute → 8 Wochen, Renntag → Bis Renntag, Spitze → Saison.

**b) Zeitraum**
- Umschalter mit 8 Wochen (−14 bis +42 Tage), 3 Monate (−30 bis +61), Bis Renntag (heute bis 7 Tage nach dem nächsten A-Event) und Saison.
- Die Auswahl wird gemerkt (`S.vzRng`, also auch in Sicherung und Schnappschüssen).
- Liegt ein Event im Zeitraum, endet das Fenster frühestens 7 Tage danach.
- Der Beginn liegt frühestens bei der ersten Zeile von `vzRows`, also höchstens 120 Tage zurück.
- **Nicht umgesetzt:** Verschieben mit zwei Fingern. Die Zeiträume decken das ab, und eine zweite Geste neben dem Wischen hätte die Bedienung unsicherer gemacht.

**c) Hauptgrafik**
- **Größe:**
  - Die Karte hat nur noch einen Rahmen mit 12 px Innenabstand.
  - Die SVG-Breite folgt der tatsächlichen Breite (viewBox ≈ Bildpunkte). Dadurch bleibt Schrift 12 px echt 12 pt.
  - Höhe 260 px, im Vollbild mehr.
- **Linien:**
  - Fitness: Türkis, 3 px.
  - Ermüdung: Pink, 1,5 px, 55 % Deckkraft, gestrichelt. Sie unterscheidet sich also auch in Stärke und Strichart.
  - In „Bis Renntag“ und „Saison“ ist die Ermüdung nur in der Anzeige geglättet (7 Tage, `vzSm7`), die Legende sagt „geglättet“.
- **Legende als Schalter-Chips** (44 px hoch): Fitness, Ermüdung, Form. Bei Fitness und Ermüdung steht ein ⓘ als Glossar-Knopf, der die vorhandenen Einträge CTL und ATL nutzt. Für „Form“ gibt es keinen Glossar-Eintrag.
- **Prognose:**
  - Die Linien sind ab heute gestrichelt, der Hintergrund ist leicht getönt und mit „Prognose“ beschriftet.
  - „Heute“ steht links der Linie. Ist links zu wenig Platz, stehen beide Beschriftungen rechts der Linie.
- **Achsen:**
  - y-Achse mit runden Werten (Schritt 5/10/20/25/50 …, höchstens vier Abschnitte, mindestens 10 % Luft).
  - x-Achse bei 8 Wochen mit den Montagen als Datum, sonst mit den Monaten, „Jan 27“ beim Jahreswechsel.
  - Beschriftungen, die sich überlappen würden, werden ausgelassen. Alle Achsenschriften sind 12 px groß.
- **Events:**
  - Jedes Event bekommt ein Fähnchen „A · Name“ und eine Linie durch beide Grafiken. A-Events sind dunkel und kräftig, B/C-Events hell mit gestrichelter Linie.
  - Bei wenig Platz zuerst das Hauptevent, dann A, B, C. Jedes Event bekommt zuerst seinen Buchstaben, Namen nur, wo Platz bleibt. Bei 375 pt in der Saisonansicht fehlt deshalb beim B-Event (30.05., zu nah am April-Event) der Buchstabe, die Linie bleibt.
  - Ein Tipp aufs Fähnchen öffnet den Plan-Check. Die Fähnchenleiste ist 40 px hoch, der Trefferbereich ±24 px.
- **Saisonspitze:** Punkt mit „Spitze 66“, wenn sie im Zeitraum liegt.

**d) Wischen**
- Antippen oder waagerechtes Wischen zeigt eine Linie durch beide Grafiken und einen Punkt auf der Fitness.
- Das feste Infofeld über der Grafik zeigt Datum (mit „Heute“/„Prognose“), Fitness, Ermüdung, Form mit Wort, TSS gefahren oder geplant (bzw. Ruhetag/keine Fahrt) und die Einheit des Tages.
- Die Auswahl bleibt stehen. Ein Tipp außerhalb der Grafik setzt sie auf heute zurück.
- `touch-action: pan-y`: Senkrechtes Scrollen bleibt der Seite.
- Aktualisierung über `requestAnimationFrame`, nur Linie, Punkt und Infofeld, nicht die ganze SVG. Ein Zeitgeber springt ein, wenn die Seite im Hintergrund keine Frames zeichnet.
- Mit der Tastatur: Pfeiltasten verschieben um einen Tag, mit Umschalttaste um 7 Tage.

**e) Form-Grafik**
- Gleiche x-Achse, 130 px hoch, im Vollbild 170 px.
- Die Bereiche liegen als dezente Bänder im Hintergrund. Die Nulllinie ist kräftig, beschriftet sind 0, +25 und −30.
- Darstellung:
  - Bei 8 Wochen Tagesbalken in der Farbe des Bereichs.
  - Sonst eine Fläche um die Nulllinie (vier Pfade statt hunderter Balken), Plus grün über null, Minus orange unter null.
  - Die Prognose ist jeweils blasser.
- **Abweichung:** Die Bereichsnamen stehen als Legende direkt unter der Grafik, nicht am rechten Rand. Bei 260–370 px Breite hätten Beschriftungen am Rand über den Daten gelegen oder 70 px Breite gekostet, die beide Grafiken gemeinsam brauchen. Das Infofeld nennt beim Wischen zusätzlich das Wort, z. B. „frisch“.

**f) Text**
- Der Einleitungssatz ist kürzer („Ab heute gestrichelt …“), dazu ein Satz zum Wischen.
- Der Renntag-Satz bleibt wörtlich, die Übersetzung ändert sich nicht.
- Der gelbe Hinweiskasten bekommt den Knopf „Plan-Check öffnen“.

**g) Vollbild**
- Der Knopf „Vergrößern“ öffnet eine Vollbildansicht mit Umschalter, Chips, Infofeld und beiden Grafiken in größerer Höhe. Schließen mit ✕ oder Escape.
- **Querformat nicht umgesetzt.** Das Manifest legt Hochformat fest. Wird das geändert, dreht sich die ganze installierte App, auch Übungsabläufe und Formulare, die nicht dafür gebaut sind. Das wäre eine größere Änderung mit Nebenwirkungen, und iOS übernimmt Manifest-Änderungen erst nach Neuinstallation. Das Vollbild im Hochformat funktioniert.
- In der installierten App bleibt die Statusleiste sichtbar. Der Scrollbereich `#sc` beginnt unter der Safe Area.

**Weiteres**
- „Wusstest du schon?“: Der vorhandene Tipp `form` nennt jetzt Zeiträume und Wischen (DE/EN). Der Knopf führt wie bisher direkt zur Formkurve.
- Neuigkeiten: Eintrag 198 (DE/EN) mit Sprung zur Formkurve.

## 3. Barrierefreiheit, Hell/Dunkel, Leistung

- **VoiceOver:** Die Grafiken stehen in einem Bereich mit `role="img"` und Zusammenfassung, z. B. „Formkurve, 8 Wochen. Fitness heute 38, Form plus 2, neutral. Am Renntag 18. April 2027 Fitness etwa 64, Form plus 15.“ Auf Englisch: „Form chart, 8 weeks. …“. Dazu die Tabelle je Woche.
- **Kontrast:**
  - Text nutzt die App-Farben (`--ink`, `--mute`) wie die übrigen Seiten.
  - Linien: Fitness in Türkis (`--teal`) ist kräftig. Die Ermüdung ist mit 55 % bewusst zurückgenommen. Eine Messung von 3:1 nach WCAG habe ich nicht gemacht.
  - Die Bänder liegen bei 7–16 % Deckkraft.
  - Im Dunkeln haben Renntag-Linie und Formflächen eigene Farben. Die Renntag-Linie war zuerst orange und ist korrigiert.
- **Tippflächen:** Umschalter, Chips, Vergrößern und Kacheln sind mindestens 44 px hoch. Die ⓘ-Knöpfe sind 32 × 44 px.
- **Leistung:**
  - Die Saison-Ansicht zeichnet die Form als 4 Pfade. Beim Wischen ändern sich nur Attribute von zwei Linien und einem Punkt plus das Infofeld.
  - Die Namen je Tag werden einmal beim Zeichnen berechnet.
  - Auf einem älteren iPhone ist das nicht geprüft.

## 4. Prüfung der Planlogik (nur bewertet, nichts geändert)

Grundlage sind Modellrechnungen, nicht deine echten Daten (die liegen nur auf deinem Gerät):
- Plan mit Event am 03.10.2027, FTP 260, 9 Std./Woche, A-Rennen am 25.04.2027.
- Fahrten ab 20.10.2026.
- Varianten mit Rhythmus und Zeitbudget.

| Variante | Saisonspitze | Renntag 03.10. | April-A-Event | Letzte 8 Wochen (Std./TSS) |
|---|---|---|---|---|
| 9 Std., Standard | 65 am 03.10. | CTL 65, Form +15 | CTL 56, Form +13 | 6,0/294 · 8,1/464 · 8,5/472 · 8,8/489 · 5,8/283 · 8,1/464 · 5,8/282 · 11,6/681* |
| Rhythmus 2:1 | 63 am 03.10. | CTL 63, Form +15 | CTL 55, Form +12 | ähnlich |
| Sommer 12 Std., September 6 Std. | **77 am 08.08.** | **CTL 65, Form +23** | CTL 61, Form +9 | 7,7/375 · 10,3/561 · 11,2/589 · 5,8/353 · **4,0/201 · 5,8/361 · 4,3/218** · 11,1/659* |
| Sommer 12 Std., Sep/Okt als Winter 6 Std. | 76 am 08.08. | CTL 65, Form +22 | CTL 47, **Form +4** | wie oben |

\* Die letzte Woche enthält den Renntag selbst.

- **Tapering oder Umfang?**
  - Das Tapering im Plan dauert 2 Wochen (Phasen „taper W46–47“), danach zählt nur der Renntag.
  - Den Abbau aus deinem Screenshot (Spitze etwa 71 im August, 59 am Renntag) erzeugt es im Standardfall nicht. Dort liegt die Spitze am Renntag.
  - Das Muster entsteht, sobald das **Zeitbudget im September deutlich unter dem Sommerwert liegt**. Dann fallen die Wochen vor dem Taper auf 4–6 Std. (200–360 TSS), und die Fitness sinkt ab Mitte August um etwa 15 %. Genau dann greift der Hinweis „Tapering ungewöhnlich lang oder der Umfang davor niedrig“.
  - Der Hinweistext nennt das Tapering zuerst, obwohl in diesem Fall der Umfang die Ursache ist.
- **Vorschlag, nicht umgesetzt:**
  - (1) Im Hinweis das Zeitbudget der letzten 6 Wochen nennen, wenn es dort sinkt („Im September planst du nur 4–6 Std. pro Woche“).
  - (2) Im Plan-Check eine Maßnahme „September-Budget anheben“ mit ihrer Wirkung in Fitnesspunkten anbieten.
  - (3) Prüfen, ob der Plan den Aufbau bei sinkendem Budget nach vorn ziehen soll, sodass die Spitze näher am Renntag liegt.
  - Dafür müsste ich deine Einstellungen kennen (Zeitbudget je Monat, Rhythmus).
- **April-A-Event:**
  - Im Standardfall liegt die Form am 25.04. bei +13, also frisch, mit Mini-Tapering.
  - Mit niedrigem Winterbudget (6 Std.) liegt sie bei +4, knapp unter „frisch“. Die Entlastung davor ist dann zu kurz bzw. die Fitness insgesamt niedrig.
  - In deinem Screenshot war das nicht ablesbar. Das neue Infofeld zeigt es jetzt beim Antippen des Fähnchentags.
- **Datum:**
  - Fähnchen, Linie und Event-Datum stimmen genau überein. Alle Tage sind Datumsstrings (`YYYY-MM-DD`) ohne Uhrzeit, die Grafik sucht die Zeile mit genau diesem String, also ohne Zeitzonenversatz.
  - Der Test prüft das für Saison und „Bis Renntag“: x-Position auf 0,1 px genau, mindestens 7 Tage dahinter.
  - Die abgeschnittene Renntag-Linie ist behoben, weil hinter jedem Event mindestens 7 Tage Platz bleiben.

## 5. Tests und Sichtprüfung

**Tests:** 246 von 246 bestanden.
- Neu ist `tests/formkurve.test.js` mit 7 Tests:
  - Zeiträume inklusive der 7 Tage nach einem Event
  - x-Beschriftung ohne Überlappung bei 320/375/430 pt in allen Zeiträumen
  - runder y-Maßstab
  - Glättung nur in der Anzeige (Formreihe und Plan-Check unverändert)
  - Formbereiche und Wörter an den Grenzen
  - Wischen (Tag aus x-Position, Ränder, Infofeld, zurück auf heute, `pan-y`)
  - Kacheln, Fähnchen, Vollbild, Ein- und Ausblenden, VoiceOver DE/EN
- Angepasst wurden:
  - `form.test.js`: Renntag-Linie für Saison und „Bis Renntag“. Der alte Monats-Test ist durch den neuen Überlappungstest ersetzt.
  - `season.test.js`: Event-Markierungen in der Saison-Ansicht.
  - `vo2max.test.js`: Build-ID-Prüfung ≥ statt =.
- In den Vergleichsständen `plan-*` haben sich nur Version und Build geändert.
- `python3 tools/build.py --check` meldet „aktuell“.

**Bilder** (375 pt, sofern nicht anders angegeben), in `claude/bilder/`:
- `f28-8w-hell.png`, `f28-8w-dunkel.png`
- `f28-3monate-hell.png`, `f28-3monate-dunkel.png` (mit Wischen)
- `f28-renntag-dunkel.png`
- `f28-saison-hell.png`, `f28-saison-dunkel.png`, `f28-saison-320.png` (320 pt)
- `f28-wischen-hell.png`
- `f28-vollbild-hell.png`, `f28-vollbild-dunkel.png`

**Vorher/Nachher zum Screenshot vom 14.11.2026:**

| Vorher | Nachher |
|---|---|
| etwa 300 × 120 pt für 11 Monate | Grafik über die volle Kartenbreite, 260 pt hoch, Zeitraum wählbar (Standard 8 Wochen) |
| y-Achse nur 0/50 | 0/20/40/60/80 |
| Monate klein und abgeschnitten | 12 pt, ohne Überlappung |
| winzige rote Striche als A-Markierung | Fähnchen mit Namen |
| Renntag-Linie am Rand | 7 Tage Platz dahinter |
| Ermüdung dominant | dünn und blass, geglättet in langen Zeiträumen |
| Formbalken ohne Bedeutung | Bänder mit Legende, Fläche statt hunderter Balken |
| Zahlen im Fließtext | vier Kacheln |
| kein Ablesen eines Tages | Wischen mit Infofeld |

## Offene Punkte

- Ungeprüft:
  - Auf einem echten iPhone (Wischen, Ruckeln auf älteren Geräten, Vollbild in der installierten App)
  - mit deinen echten Daten
  - der Netlify-Build
- Verschieben mit zwei Fingern und Querformat sind nicht umgesetzt (Begründung oben).
- Die Kontrastmessung nach WCAG fehlt.
- Abschnitt 4: Die Vorschläge zum Hinweistext und zum September-Budget brauchen deine Entscheidung.

## Was du zum Veröffentlichen tun musst (nicht ausgeführt)

1. Bilder ansehen und auf dem Handy prüfen. Zum Testen im Heimnetz kann ich `public/` lokal bereitstellen.
2. „Ja, hochladen“: Ich pushe nur den Branch `feature/f28-formkurve`.
3. „Ja in Main“: Ich merge per fast-forward nach `main` und pushe, Netlify baut daraus automatisch.
