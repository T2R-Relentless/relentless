# Übungsvideos erzeugen

Die Videos in `public/img/uebungen/` zeigen eine 3D-Figur, die mit Blender gerendert wird. Die App braucht davon nichts außer den fertigen Dateien (`<id>.mp4`, `<id>.jpg`).

- **Werkzeuge (kostenlos, nicht Teil des Repos):** Blender 5.2, Erweiterung MPFB (MakeHuman) und das Paket „makehuman system assets“ (Lizenz CC0). Auf dem Entwicklungsrechner liegen sie unter `~/Documents/Relentless-3D/`.
- **Skripte:** `figur.py` (Dead Bug, Seitenansicht), `uebungen.py` mit `basis_teil.py` (übrige Übungen, freie Kamera). `render_review.sh <id> <bilder…>` rendert Video und Prüfbilder, `assets.sh <id>` kopiert das freigegebene Video samt Startbild in die App.
- **Regeln:** Was aufliegen soll, wird im Skript gemessen und automatisch auf die Matte gesetzt. Jede Übung geht vor dem Einbau durch die Fachprüfung (`.claude/agents/trainingswissenschaftler.md`), bis sie freigegeben ist.
- **In der App:** Eintrag in `EXVID` (`src/js/02a-uebungen-figur.js`) mit `h` (Zeitpunkt der Endposition in Sekunden) und `p` (Zeitfenster der Phase 1). Ohne Video zeigt die App die gezeichnete Figur.
