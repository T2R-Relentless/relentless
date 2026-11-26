# Entscheidungsvorlage · Paket C „Ehrlicher Plan“ · 26.11.2026

Branch `feature/f35-ehrlicher-plan`, 14 Commits, nicht hochgeladen. Version 224, Cache v61, mit Fenster „Neu in dieser Version“.

## Was drin ist
| Punkt | Ergebnis |
|---|---|
| 1 Geschätzte Startwerte | „geschätzt“ an FTP und Gewicht (Heute, Einstellungen, Plan-Check, Fortschritt); Gewicht ab 1.500 hm Pflicht; Karte „Dein FTP ist geschätzt, Test einplanen“ |
| 2 Fitnesstest als Standard | Test vorausgewählt, am 2. Trainingstag; Testwoche ohne Einheiten über 85 %; Long Ride +15 Min./Woche (Hobby 2:00 → 3:15); ohne Messwert „Fahr nach Gefühl, Anstrengung x von 10“ |
| 3 Plan-Check | Ohne eigene Zielzeit nur „Prognose“ mit Spanne; sonst Auf Kurs / Knapp / Ziel gefährdet; Feld für das Zeitlimit des Veranstalters |
| 4 Lücke Training–Event | Warnung bei zu kurzer längster Fahrt bzw. zu schwacher Woche; Angebote schon in Schritt 4 (Wochenend-Blöcke, kürzere Strecke, mehr Zeit) |
| 5 Eventtag-Belastung (C) | Ötztaler 205 W: 11:20 → 12:05 Std., TSS 650 → 584, Berg 86 → 78 %; Hinweis im Neuigkeiten-Fenster |
| 6 Zonen | Ein Modell nach Coggan, „Sweet Spot“ eigenes Etikett; Puls aus HFmax als „grob“ gekennzeichnet |
| 7 Ruhetag | Neue Pläne mind. 1 freier Tag (auch Eventwoche); Schalter zum bewussten Abwählen; laufende Pläne nur Vorschlag ab Folgewoche mit Rückgängig |
| 13 Wochenpaket | „Ganze Woche als .fit-Paket“ (ZIP) in Woche und Export |
| 17 Event-Auswahl | „Ötztaler Radmarathon · 227 km · 5.500 hm“, Suche ab 20 Events, Höhenmeter-Feld bei „hm offen“ |

## Prüfungen
- `check.py --gegen origin/main` ✓ · 356 Browser-Tests ✓
- Fachabnahme Trainingswissenschaftler ✓ (nach 3 Korrekturrunden)
- Design ✓ (375 pt, hell/dunkel, DE/EN)
- Code-Prüfung ✓ (letzter Hinweis behoben)
- Alte Pläne und Sicherungen: Wochen bleiben unverändert (Test mit gespeichertem Stand aus Version 223)

## Gut zu wissen
- Bestehende Pläne: Einheiten unverändert, aber Prognose, Eventtag-Belastung und Pacing rechnen neu (so mit 9 C entschieden). App-gesetzte Zielzeiten zeigen jetzt „Prognose“ statt „Auf Kurs“.
- Ältere Fahrten zeigen andere Zonenanteile (Entscheidung 10).
- Das .fit-Paket ist nur im Aufbau geprüft, nicht auf einem Garmin-Gerät.
- Bei 320 pt bestehen ältere kleine Darstellungsfehler (Mindestbreite ist 375 pt).

## Deine Entscheidungen
1. **Paket C hochladen?** → **Empfehlung: Ja, hochladen.**
2. **Mehr-Menü (Skizze `claude/skizze-mehr-menue.html`):** Die Design-Prüfung empfiehlt, die Gliederung **nicht** nach 14 Tagen umzubauen, sondern immer gleich mit eingeklapptem „Werkzeuge“; Heute behält einen Link zum Plan-Check. → **Empfehlung: so bauen, als nächstes Paket.**
3. **Paket B** (Datenschutz, Impressum) wartet weiter auf deine Angaben fürs Impressum (Name/Verein, Anschrift, E-Mail, Vertretungsberechtigte). Die „Sicherung in eigener Cloud“ (12 B) kommt mit in Paket B. Paket B bekommt beim Hochladen Version 225.
