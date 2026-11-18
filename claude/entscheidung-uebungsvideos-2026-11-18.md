# Übungsvideos für die 6 Pilotübungen · Version 215

**Ergebnis:** Clamshell, Dead Bug, Pallof Press, 90/90 Hüftwechsel, Open Book und Thread the Needle zeigen im Übungsfenster ein Video mit einer 3D-Figur in Relentless-Farben statt der Strichfigur.
**Ansehen:** `claude/uebungsvideos-uebersicht.jpg` und die 6 Videos in `public/img/uebungen/` · **Branch:** `fix/uebungen-figuren-boden` (lokal, nicht hochgeladen)
**Prüfungen:** check.py ✓ · 313 Browser-Tests ✓ · Fachlich ✓ (jede Übung freigegeben) · Code ✓ · Design ✓

## Deine Entscheidungen
1. **Hochladen?** – A: Ja, hochladen · B: Erst weiter nachbessern → **Empfehlung A**, wenn dir die 6 Videos gefallen.
2. **Als was ausliefern?** – A: Fehlerkorrektur ohne „Neu in dieser Version“ (wie beim Pilot entschieden) · B: neue Funktion mit Hinweis und Pop-up → **Empfehlung A**, solange nur 6 von 45 Übungen ein Video haben.

## Was sich ändert
- **Figur:** frei nutzbares 3D-Menschmodell (MakeHuman, Lizenz CC0), in Blender animiert. Shirt in Petrol, Hose in Navy, weiße Schuhe, Gesicht ohne Linien. Werkzeuge und Modell kosten nichts.
- **Bewegung:** echte Gelenkbewegung. Was aufliegen soll, wird im 3D-Modell gemessen und auf die Matte gesetzt.
- **App:**
  - Das Video läuft stumm in Endlosschleife.
  - Ein angetippter Bewegungsschritt hält es in der passenden Position an.
  - Die Übungsübersicht zeigt das Startbild.
  - In der geführten Sequenz läuft dasselbe Video.
- **Rückfall:** Lädt ein Video nicht, erscheint die gezeichnete Figur. Blockiert das Handy das automatische Abspielen, bekommt das Video Bedienelemente.
- **Text:** Beim 90/90 ist ein Satz der Ausgangsposition an das Bild angepasst (deutsch und englisch).
- **Größe:** 6 Videos und 6 Startbilder, zusammen etwa 850 KB.

## Worauf du achten kannst
- Thread the Needle: Die Kamera fährt näher heran, sobald der Arm unten ist. Prüfe den Rücksprung am Ende der Schleife.
- 90/90: die Sicht von vorn, die Füße bleiben stehen.
- Dunkler Modus: Das Video behält seinen hellen Bildgrund.

## Offen
- Ohne Netz laufen die Videos nicht, dann erscheint die gezeichnete Figur. Für Offline-Videos müsste der Service Worker erweitert werden.
- Das türkise Feld „Hier spürst du es“ gibt es im Video nicht. Der Text „Das solltest du spüren“ bleibt.
- Dead Bug ist eine reine Seitenansicht, die anderen fünf sind schräg von oben gesehen. Die Matten sind unterschiedlich groß.
- Beim 90/90 ist die Hosennaht im Schritt in der Bildmitte der Bewegung etwas unsauber.
- Auf dem iPhone ist noch nichts geprüft.
- Die übrigen 39 Übungen haben weiter die alte Strichfigur.
