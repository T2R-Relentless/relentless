# Übungen-Pilot – Version 214

**Ergebnis:** Sechs Übungen haben eine neue Figur mit Körperform, eine markierte Zielzone und eine gegliederte Anleitung: Clamshell, Dead Bug, Pallof Press, 90/90 Hüftwechsel, Open Book und Thread the Needle.
**Branch:** `feature/uebungen-pilot` (Commits e9c0c7a, ec378c3) · **Prüfungen:** check.py ✓ · 310 Browser-Tests ✓ (3 davon neu) · Code ✓ · Fachlich ✓ · Design: Sichtprüfung im Browser

## Was neu ist
- **Figur:** Arme, Beine und Rumpf haben Körperform. Die nahe Körperseite ist kräftig, die ferne grau. Der Zielmuskel ist türkis markiert, mit dem Hinweis „Hier spürst du es“. Matte, Band und Kissen sind gezeichnet.
- **Ansichten:**
  - Clamshell und 90/90 sind von vorn gezeichnet.
  - 90/90 hat zusätzlich einen Bogenpfeil für die Scheibenwischer-Bewegung.
  - Pallof zeigt das Band schräg zur Seite.
  - Bei liegenden Übungen ist der Bildausschnitt enger.
- **Text:** Merksatz, Ausgangsposition, Bewegung, Atmung, „Das solltest du spüren“, häufige Fehler, leichter/schwerer, „Warum für Radfahrer“ und Hinweis, jeweils in Deutsch und Englisch.
- **Schritte antippen:** Ein angetippter Bewegungsschritt hält die Animation in seiner Phase an. Erneutes Antippen gibt sie wieder frei.
- **Fachlich korrigiert:**
  - Clamshell: Winkel (Hüfte 45°, Knie 90°).
  - Keine Dosierung mehr in den Texten, die Zahl kommt allein aus der Routine. Damit ist der Widerspruch 15 zu 12 weg.
  - Die Nutzenaussagen sind vorsichtiger formuliert.

## Bewusst nicht geändert
- Die Sprachausgabe sagt dieselben Sätze wie bisher.
- Die anderen 39 Übungen sind unverändert.

## Offen
- Pallof: Der Pfosten steht in der Seitenansicht hinter den Armen. Auf dem iPhone prüfen, ob das verständlich ist.
- 90/90: Mit nur zwei Bildern wandern die Füße in der Mitte der Bewegung leicht zur Mitte.
- Die nicht mehr benötigten englischen Altsätze dieser 6 Übungen bleiben in `en.json`, bis der Pilot feststeht.
