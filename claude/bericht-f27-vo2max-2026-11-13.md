# Bericht F27 – VO2max schätzen und Entwicklung verfolgen

Stand: 13.11.2026

## Kurzfassung

- Neue Seite **Fortschritt → VO2max**:
  - Aktueller Wert mit Spanne, Methode, Quelle, Datum und Trend gegenüber vor 4 und 12 Wochen.
  - Verlauf über 3, 6 oder 12 Monate oder Allzeit, in ml/kg/min oder l/min.
  - Einordnung nach Alter und Geschlecht, dazu ein Trainer-Hinweis.
  - Kalibrierung mit Laborwert sowie Eingabe von Labor- und Garmin-Wert.
- Zwei neue Testeinheiten: **VO2max-Check: Rampe** und **VO2max-Check: 5 Minuten**.
  - Beide erscheinen als Grafik (F24) und lassen sich nach Garmin (FIT) und Zwift (ZWO) exportieren.
  - Eingeplant werden sie nur auf Knopfdruck, mit Schnappschuss und „Rückgängig“.
- Fahrten werden beim Einlesen automatisch ausgewertet:
  - Ein geplanter Test wird als Methode R bzw. F gespeichert.
  - Ein neuer 5-min-Bestwert mit Beleg für Ausbelastung ergibt eine Schätzung „aus Fahrt“.
- **237 von 237 Tests bestanden**, `build.py --check` ist aktuell. Lokal committet, nichts gepusht.

## Branch, Version, Commit

| | |
|---|---|
| Basis | `main` bei 825b96a. Das ist identisch mit `feature/f26-leistungsprofil`, inklusive Mean-Max-Bestwerten (F26), F5 und F7. |
| Branch | `feature/f27-vo2max` (lokal) |
| Version | 194 |
| Build-ID | 20261117090000 |
| Service Worker | relentless-v31 |
| Commit | ein Commit „v194: VO2max …“ auf dem Branch |

Wie bei F26 gibt es `build.sh`, `tests/run-all.sh`, `build/APP_VERSION` und `WHATSNEW.json` im Repository nicht. Ich habe stattdessen genutzt:
- `python3 tools/build.py --check`
- die Browser-Testseite `tests/index.html` (die neue Datei `tests/vo2max.test.js` ist dort eingebunden)
- `APP_VERSION`/`APP_SW`, `APP_BUILD`, `WN_DATA`, `public/sw.js` und `public/version.json`

**Wichtig:** Die maßgebliche Recherche `claude/recherche-vo2max-2026-11-13.md` gibt es im Repository nicht, ebenso wenig `claude/backlog.md`. Ich habe auch unter Dokumente, Downloads und Schreibtisch gesucht. Grundlage war deshalb die Kurzfassung im Prompt; alle Quellen habe ich selbst nachgeprüft, soweit sie zugänglich waren (siehe unten).

## Bestandsaufnahme

- **VO2max in der App:** bisher nur als Intervalltyp (`t:'vo2'`, Zone Z5) und in Texten. Es gab keine Schätzung.
- **Garmin-Abruf** (`netlify/functions/garmin.mjs` und die Erweiterung): liefert die Aktivitätsliste und die Original-FIT-Datei.
  - Leistung und Puls kommen mit 1 Hz. Die Liste behält nur feste Felder (`KEEP`: Dauer, Puls, Leistung …).
  - **Kein VO2max-Wert, keine HFmax und kein Ruhepuls aus dem Garmin-Profil.**
- **Vorhanden:** Mean-Max-Bestwerte (F26, `S.mm`), Gewichtsverlauf (F7, `S.wf`), Geschlecht (`sex`), Geburtsdatum (`birthDate`, Alter über `ageAt`) und HFmax (`hrMax`, Einstellungen).
  - Neue Profilfelder waren deshalb nicht nötig.

## Formeln und Quellen

Alle Formeln stehen mit DOI im Kopf von `src/js/27d-vo2max.js`.

| Methode | Formel | Quelle, geprüft |
|---|---|---|
| R Rampe | Männer 0,10 × PO − 0,60 × BW + 64,21 · Frauen 0,13 × PO − 0,83 × BW + 64,02 · ohne Angabe 0,12 × PO − 0,65 × BW + 59,78 | Jurov et al. 2023, Life 13(1):160, doi 10.3390/life13010160. **Volltext gelesen** (MDPI, Tabelle 1). |
| F 5 min | 16,6 + 8,87 × 5-min-W/kg | Sitko et al. 2022, doi 10.1123/ijspp.2020-0923. **Zusammenfassung auf PubMed gelesen**, Formel bestätigt. |
| F Spanne | Messung = Schätzung −3,8 … +17,2 | Borszcz et al. 2024, doi 10.1123/ijspp.2023-0330. **Zusammenfassung gelesen:** Bias −6,6, Übereinstimmungsgrenzen −17,2 bis +3,8 ml/kg/min bestätigt. |
| G Garmin | Wert von der Uhr, von Hand übernommen | Spanne laut deiner Kurzfassung |
| L Labor | Eingabe | Referenz |

**Borszcz-Formel nicht verwendet:**
- Die aktualisierte Formel nennt die Zusammenfassung nur („We provide an updated equation …“), ohne Koeffizienten.
- Der Volltext bei Human Kinetics war nicht zugänglich (403), Europe PMC ebenfalls nicht.
- Ich habe deshalb nichts geraten und Sitko verwendet. **Bitte den Volltext beschaffen**, dann tausche ich die Koeffizienten aus.

**Gegenprüfung Hawley & Noakes 1992 / Lamberts 2012:**
- Hawley & Noakes: Die Zusammenfassung nennt r = 0,97 zwischen Wpeak und VO2max bei 100 trainierten Fahrern, aber keine Formel.
- Lamberts 2012: nicht geprüft.
- Eine zahlenmäßige Gegenprüfung war deshalb nicht möglich.

**Nicht verwendet:** ACSM-Formel, Formeln nur aus Alter, Größe und Gewicht, Umrechnung aus der FTP.

## Rampenprotokoll und Pmax

**Protokoll laut Jurov** (Volltext, Methodenteil):
- 15 min einfahren, dann „modifiziertes Conconi-Protokoll“.
- Ab 17 Jahren und über 50 kg: Start **100 W, +20 W pro Minute**. Darunter: 60 W, +15 W pro Minute.
- Abbruch bei Erschöpfung oder wenn die Trittfrequenz unter 60 fällt.
- Genau so ist es in der Einheit umgesetzt. Bei Alter unter 17 oder unter 50 kg wählt die App 60 + 15.

**Pmax:** Jurov definiert PO nur als „maximal power output“, ohne Rechenregel.
- Die App nimmt den **besten 60-s-Durchschnitt**. Bei einer Rampe mit 1-min-Stufen entspricht das genau „letzte vollendete Stufe + 20 W × Anteil der angefangenen Stufe“ (Beispiel im Test: 14 Stufen bis 360 W, dann 30 s bei 380 W ergibt 370 W).
- Im ERG-Modus stimmt das exakt, frei gefahren ist es eine Näherung.

**Studiengruppe:**
- 496 Männer: 17,1 Jahre, 66,7 kg, 5,9 W/kg, VO2max 63,4 ± 5,5.
- 84 Frauen: 20,2 Jahre, 57,5 kg, 5,19 W/kg, VO2max 54,8 ± 7,0.
- Für ältere Freizeitfahrer liegt das außerhalb der Gruppe, deshalb die breitere Spanne (siehe unten).

## Spannen je Methode

**R:** ±1 Schätzfehler, ≈ ±4,0 ml/kg/min.
- Abgeleitet aus R² (0,456 Männer, 0,671 Frauen) und der Streuung der gemessenen Werte: SEE ≈ SD × √(1 − R²) ≈ 4,0. Das Paper zeigt den SEE nur als Grafik.
- Unter 4,8 W/kg Pmax (etwa Mittelwert minus 2 SD der Männer) × 1,5 = ±6.

**F:** asymmetrisch nach Borszcz: −3,8 / +17,2. Der Wert gilt als „eher Untergrenze“.
- Aus einer Fahrt statt einem Test nach oben weitere +5. Das ist eine Annahme der App: Die Fahrt war vielleicht nicht maximal.

**G:** ±5 %, über 60 ml/kg/min nach oben +10 % (aus deiner Kurzfassung, nicht selbst geprüft).

**L:** keine Spanne.

## Gültigkeit

**Rampe:**
- Spitzenpuls ≥ 95 % HFmax (wenn eingestellt), sonst muss der Puls bis zum Ende steigen.
- Die Rampe muss mindestens 4 min ohne Pause im selben Abschnitt laufen, die Leistung muss vorher sichtbar gestiegen sein.

**5 min:**
- Kein Sprintstart: Die ersten 30 s liegen nicht über 130 % des Mittels.
- Keine Pause (Lücke über 10 s trennt Abschnitte, wie in F26) und keine Unterbrechung mit über 10 s unter 20 W.
- Puls-Kriterium wie bei der Rampe.

**Aussetzer und Werte über 2000 W** zählen wie in F26.

**Ungültige Werte** bleiben gespeichert, mit Grund und blass im Verlauf, aber nicht im Trend.

**Rückfrage:** Nach einem Test fragt die App 14 Tage lang „Warst du am Limit?“. „Eher nicht“ macht den Wert ungültig.

## Schätzung aus Fahrten

Nur wenn beides zutrifft:
1. **Neuer 5-min-Bestwert der letzten 8 Wochen**
2. **Beleg für Ausbelastung:** Puls-Kriterium, Einheit VO2max/Rennen/Test am selben Tag oder als „Vollgas“ markiert. Ohne Sprintstart und ohne Unterbrechung.

Sonst gibt es keinen Wert. Gekennzeichnet ist er mit „aus einer Fahrt, nicht aus einem Test“, mit breiterer Spanne.

## Garmin

- Der Abruf liefert **keinen VO2max-Wert**.
- Abrufbar wäre er vermutlich als Feld der Aktivitätsliste (Garmin Connect zeigt „VO2max“ je Aktivität). Die Netlify Function filtert es aber über `KEEP` heraus.
  - Man müsste das Feld dort ergänzen und prüfen, ob die Personal API es liefert.
  - Das kostet nichts, braucht aber einen Function-Deploy und einen Test mit echtem Konto. **Wie verlangt nicht gebaut.**
- Stattdessen gibt es **„Garmin-Wert übernehmen“** (von Hand, Methode G, eigene Form und Linie im Verlauf).
- **Hinweis auf falsche HFmax:** Lag der Spitzenpuls einer Fahrt über der eingestellten HFmax, erklärt die Karte, dass das Garmins Schätzung und die Pulsprüfung verfälscht.

## Laborwert und Kalibrierung

**Eingabe:** Datum, Wert in ml/kg/min oder l/min, Gewicht (vorbelegt aus dem Verlauf), optional Pmax, Ort/Notiz. Plausibel sind 15–95 ml/kg/min.

**Kalibrierung:**
- Laborwert und Feldwert derselben Methode im Abstand von höchstens 14 Tagen ergeben einen Versatz (Labor − Feld).
- Er gilt für Werte dieser Methode ab 14 Tage vor bis 12 Monate nach dem Labortest. Danach erscheint „abgelaufen, neuer Labortest empfohlen“.
- Abschaltbar. Der Rohwert ist im Detail sichtbar („kalibriert am …, Rohwert …“).

## Anzeige

**Angezeigter Wert:** gültige Werte der letzten 12 Wochen, Priorität L > R > F-Test > G > F-Fahrt, bei Gleichstand der neueste. Gibt es keinen, nimmt die App den neuesten gültigen Wert und markiert ihn als „älter als 12 Wochen“.

**Trend:**
- Zeitgewichtetes Mittel mit Halbwertszeit 21 Tage, **je Methode getrennt** und nur aus gültigen Werten.
- Grund: Sitko unterschätzt im Mittel um 6,6. Ein gemeinsamer Trend über alle Methoden würde Scheinverluste zeigen.
- Der Vergleich „vor 4/12 Wochen“ nutzt den Trend der Methode des angezeigten Werts.

**Verlauf:** Formen und Farben je Methode, Spannen als Fehlerbalken. Markiert sind:
- Entlastungswochen (Band)
- Events aus F17 (Linie mit Priorität)
- FTP-Änderungen aus F7 (Dreieck)

Dazu der Hinweis, warum ml/kg/min vom Gewicht abhängt.

**Einordnung:**
- **FRIEND-Register, Fahrradergometer** (Kaminsky et al. 2017, Mayo Clin Proc 92(2):228–233, doi 10.1016/j.mayocp.2016.10.003, 4494 Tests).
  - Zugänglich war nur die Zusammenfassung: Median 20–29 Jahre Männer 41,9, Frauen 31,0; 70–79 Jahre 19,5 bzw. 14,8; etwa 10 % Abnahme je Jahrzehnt.
  - Die Mediane dazwischen interpoliert die App geometrisch. **Die Perzentiltabelle war nicht zugänglich** (Elsevier/Mayo 403, nicht in PMC).
  - **Vorschlag:** Tabelle beschaffen, dann ergänze ich echte Perzentile.
- **Radsport-Vergleich:** Mittelwerte der Jurov-Gruppe.
- **Ton** wie in F21: ermutigend, bei Werten unter dem Median Fokus auf den Fortschritt.

**Trainer-Hinweis:**
- FTP im Verhältnis zur 5-min-Leistung der letzten 8 Wochen (Näherung für die Leistung bei VO2max). Gibt es eine Rampe, zusätzlich das Verhältnis zu ihrer Pmax.
- Über 85 %: VO2max-Block sinnvoll. Unter 75 %: Schwelle/Sweet Spot bringt mehr.
- **Die Grenzen sind Richtwerte der App aus deiner Vorgabe, keine belegten Schwellen.** So steht es auch in der App.
- Der Plan wird nicht geändert.
- **Bezug A1 (Audit):** Die Hinweise ändern nichts am Plan, wie dort gefordert. Ein VO2max-Block bliebe ein Vorschlag mit Zustimmung (Weg wie F4/M8).

## Ergebnis mit deinem Beispiel

5 min 369 W, 85 kg → Sitko **55,1 ml/kg/min** (Spanne 51,3–72,3, eher Untergrenze), absolut 4,68 l/min.

## Tests

**`tests/vo2max.test.js` mit 8 Tests**, alle bestanden:
- Formeln gegen Handrechnung (Sitko 55,1; Jurov Männer 59,21, Frauen 53,22, ohne Angabe 56,28; l/min) und Spannen.
- Gewicht zum Testdatum.
- Gültigkeit: ausbelastet, Sprintstart, Pause, Unterbrechung, niedriger Puls; Pmax 370 W aus einer halben Stufe.
- Geplanter Test beim Einlesen, „Eher nicht“, Schätzung aus Fahrt mit und ohne Puls-Beleg, kein neuer Bestwert.
- Priorität, Kalibrierung (±14 Tage, Abschalten, Verfall nach 12 Monaten), Trend ohne ungültige Werte.
- Testeinheiten, Grafik, FIT- und ZWO-Export, Einplanen mit Schnappschuss.
- Garmin fehlt bzw. vorhanden, Laborwert in l/min, unplausibler Wert, Sicherung und alte Formate.
- Seite, Formen je Methode, Einordnung, Trainer-Hinweis, Englisch, DYK-Knopf, Neuigkeiten 194.

**Gesamtlauf:** 237 von 237. Neu geschriebene Vergleichsstände: nur die neue Zeile „VO2max“ unter Fortschritt und Version 194 in den Einstellungen. Der F26-Test prüft die Version jetzt mit „≥ 193“.

**Sicherung:** `S.vo2` (Werte) und `S.vo2CalOff` gehören zum Zustand und sind damit in Sicherungsdatei, Spiegel und Schnappschüssen. Die Formatnummer bleibt 4.

**Bilder:** `claude/bilder/f27-{vo2max,leer-test-einplanen,laborwert,woche-rampe}-{light,dark}-{375,430}.png` (16 Bilder).

## Hinweise und Neuigkeiten

- DYK `vo2` mit dem Knopf „VO2max ansehen“, der direkt zu `#fx-v2` springt.
- Neuigkeiten 194 mit einem Eintrag (Knopf öffnet Fortschritt → VO2max).

## Offene Punkte

- Volltext Borszcz et al. 2024 beschaffen (aktualisierte Formel).
- FRIEND-Perzentiltabelle (Kaminsky 2017) beschaffen.
- Recherche-Datei `claude/recherche-vo2max-2026-11-13.md` fehlt im Repository.
- Garmin-VO2max automatisch abrufen: Feld in der Function ergänzen, mit echtem Konto prüfen, Function-Deploy.
- Nicht geprüft: iPhone, echte Rampen- und 5-min-Dateien, ERG-Export auf echter Rolle.
- Die Rampe ersetzt beim Einplanen eine Einheit dieser Woche. Plant die App die Woche neu (z. B. nach Sperren eines Tags), kann die Testeinheit wieder verschwinden. Das ist wie beim bestehenden Fitness-Check.

## Was du zum Veröffentlichen tun musst (nicht ausgeführt)

1. Bericht und Bilder ansehen. Wenn alles passt: „Ja, hochladen“.
2. Danach pushe ich den Branch und merge nach deiner Freigabe in `main`. Netlify baut aus `main`.
3. Die Netlify Function ist nicht geändert, ein Function-Deploy ist nicht nötig.
4. Nach dem Laden erscheinen der Update-Hinweis und „Neu in Version 194“.
