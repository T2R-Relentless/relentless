# F19 – Karte der Strecke: Machbarkeit (nur geprüft, nicht umgesetzt)

Stand 12.11.2026, Branch `feature/sammel-2026-11-11`. Im Code wurde für F19 nichts geändert.

## 1. Datenquelle

| Weg | Liefert GPS? | Format | Inhalt je Punkt |
|---|---|---|---|
| Netlify-Funktion `/api/garmin`, Aktion `file` (`netlify/functions/garmin.mjs`) | ja | Original-Aktivität als ZIP mit FIT-Datei, Base64, höchstens 4,2 MB | Zeit, Position (lat/lon in Semicircles), Höhe, Distanz, Geschwindigkeit, Puls, Leistung, Trittfrequenz, Temperatur – je nach Gerät und Sensoren |
| Desktop-Erweiterung `get_activity_recording` (`garmin-relentless/server/index.js`) | ja | dieselbe ZIP/FIT-Datei | wie oben |
| Garmin `list_activities` | nein | nur Zusammenfassung (Distanz, Dauer, Höhenmeter, Leistung, Puls) | – |
| Hochgeladene Dateien (FIT, GPX, TCX) | ja (GPX/FIT immer, TCX seit F18) | wie hochgeladen | GPX: Position, Höhe, Zeit, oft Puls/Leistung in Erweiterungen; TCX: zusätzlich Distanz |

**Punkte je Fahrt:** Garmin-Geräte zeichnen meist im 1-Sekunden-Intervall auf (Einstellung „Jede Sekunde“) oder im „intelligenten“ Modus (etwa alle 1–10 s). Eine Stunde ergibt also bis zu 3.600 Punkte, eine 4-Stunden-Ausfahrt bis zu 14.400.

**Schon vorhanden:** Der FIT-Parser der App (`parseFIT`, `src/js/12-fahrten-hochladen.js`) liest je Datensatz bereits Zeit, Distanz, Höhe, Leistung, Puls, Temperatur und `lat`/`lon`. Die App **speichert die Positionen aber nicht**: Gespeichert werden je Fahrt nur Zusammenfassung, Bestwerte und für die Bewertung die Leistungsreihe (`streamOf`). Für eine Karte müsste die Linie beim Einlesen zusätzlich vereinfacht und abgelegt werden. Fahrten, die vor der Umsetzung hochgeladen wurden, hätten keine Karte (außer man lädt sie erneut).

## 2. Speicherbedarf (100 Fahrten, vereinfacht auf etwa 500 Punkte)

Vereinfachung mit Douglas-Peucker (Toleranz etwa 5–10 m) behält die Form der Strecke; 500 Punkte reichen für eine Handy-Karte.

| Speicherform je Punkt | je Fahrt (500 Punkte) | 100 Fahrten |
|---|---|---|
| JSON mit Zahlen (lat, lon auf 5 Nachkommastellen, Höhe ganzzahlig) | etwa 12–14 KB | etwa 1,2–1,4 MB |
| Kodiert wie „Encoded Polyline“ (Differenzen, etwa 5–7 Zeichen je Punkt inkl. Höhe) | etwa 3–4 KB | etwa 0,3–0,4 MB |
| zusätzlich Farbwerte je Punkt (Geschwindigkeit, Puls, Leistung oder Zone, 1 Byte kodiert) | +0,5–1 KB | +0,05–0,1 MB |

- **Ablage:** in IndexedDB (eigener Speicher neben dem Sicherungs-Spiegel), **nicht** in localStorage – dessen Grenze liegt in Safari bei etwa 5 MB für die ganze App.
- **Sicherungsdatei:** Mit kodierten Linien wächst sie um etwa 0,3–0,5 MB je 100 Fahrten. Optional „Sicherung ohne Karten“.

## 3. Kartendarstellung – Optionen

| Option | Aufwand | Kosten | Datenschutz | Offline |
|---|---|---|---|---|
| **(a) Nur Linie und Höhenprofil als SVG**, ohne Kartenhintergrund | klein | keine | keine Anfragen nach außen | ja |
| **(b) Leaflet oder MapLibre mit OpenStreetMap-Kacheln** | mittel | keine Lizenzkosten; Nutzungsbedingungen beachten | jede Kachelanfrage verrät dem Kachelserver IP-Adresse und Gegend der Fahrt → Hinweis/Einwilligung nötig (DSGVO) | nein (Kacheln dürfen laut OSM-Richtlinie nicht vorab massenhaft gespeichert werden) |
| **(c) Kachelanbieter mit kostenlosem Kontingent und Schlüssel** (z. B. Anbieter für OSM-basierte Karten) | mittel | kostenlos bis zu einem monatlichen Kontingent, danach kostenpflichtig; Kontingente vor der Umsetzung auf den Anbieterseiten prüfen | wie (b), zusätzlich Auftragsverarbeitung prüfen; Schlüssel im Browser sichtbar oder über die Netlify-Funktion geschützt | nein |

**Zu (b):** Die Tile Usage Policy der OpenStreetMap Foundation erlaubt die direkte Nutzung von `tile.openstreetmap.org` nur in geringem Umfang. Sie verlangt Namensnennung („© OpenStreetMap-Mitwirkende“) und eine korrekte Kennung der App und verbietet Massenabrufe und Vorab-Downloads. Für eine öffentlich verteilte App mit vielen Nutzern ist ein eigener oder ein kommerzieller Kachelserver vorgesehen. Bibliotheken: Leaflet (Raster, klein, etwa 40 KB komprimiert) oder MapLibre GL (Vektor, deutlich größer, etwa 200 KB+). Beide sind kostenlos (BSD-Lizenz) und können per CDN oder eingebettet geladen werden.

## 4. Mögliche Funktionen

| Funktion | (a) SVG | (b)/(c) Karte |
|---|---|---|
| Linie eingefärbt nach Geschwindigkeit, Puls, Leistung oder Zone | ja | ja |
| Intervalle hervorgehoben (aus der Bewertung: Zielbereich je Abschnitt) | ja | ja |
| Start, Ziel, km-Marken | ja | ja |
| Höhenprofil synchron zur Linie (Tippen zeigt Punkt auf beiden) | ja | ja |
| Heatmap aller Fahrten | einfach als überlagerte Linien | ja, mit Kartenhintergrund deutlich aussagekräftiger |
| GPX-Export der Strecke | ja (aus gespeicherter Linie) | ja |
| Orientierung (Straßen, Orte) | nein – nur die Form | ja |

## 5. Aufwandsschätzung

| Stufe | Inhalt | Aufwand |
|---|---|---|
| **1 – klein** | Linie beim Einlesen vereinfachen und in IndexedDB speichern, Detailansicht mit SVG-Linie (Zonenfarben), Start/Ziel, km-Marken, Höhenprofil synchron, Sicherung erweitern, Tests | etwa 1–2 Arbeitstage |
| **2 – mittel** | zusätzlich Kartenhintergrund mit Leaflet, Kachelanbieter (Schlüssel über die Netlify-Funktion), Einwilligung und Hinweis in Datenschutz, Namensnennung, Verhalten offline (Linie ohne Karte) | etwa 2–4 Arbeitstage |
| **3 – groß** | Heatmap aller Fahrten, Intervall-Abschnitte auf der Karte, GPX-Export, ggf. Vektorkarten mit MapLibre und eigener Stil (hell/dunkel) | etwa 4–7 Arbeitstage |

## 6. Empfehlung

**Stufe 1 zuerst umsetzen.** Sie liefert den größten Nutzen ohne laufende Kosten, ohne Datenschutzfragen und offline. Daten und Ansicht sind so gebaut, dass Stufe 2 später nur den Kartenhintergrund ergänzt. Für Stufe 2 einen Kachelanbieter mit kostenlosem Kontingent wählen, statt `tile.openstreetmap.org` direkt zu nutzen. Die Karte lädt dann erst nach ausdrücklicher Zustimmung, mit Schalter in den Einstellungen.

Quellen: OpenStreetMap Foundation, Tile Usage Policy (operations.osmfoundation.org/policies/tiles); Douglas DH, Peucker TK (1973): Algorithms for the reduction of the number of points required to represent a digitized line or its caricature. Cartographica 10(2):112–122; Google Encoded Polyline Algorithm Format (developers.google.com/maps/documentation/utilities/polylinealgorithm); Garmin FIT SDK, Record Message (developer.garmin.com/fit).
