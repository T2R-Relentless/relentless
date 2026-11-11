# Garmin für Relentless in Claude Code

Derselbe Server wie die Erweiterung in der Claude-Desktop-App (Version 1.1.0, nur lesend, ohne Abhängigkeiten, Node ab 18).
Im Repository liegt er unter `relentless/garmin-erweiterung/`.

## Einrichten (einmalig, im Terminal auf dem Mac)

1. Ordner `garmin-relentless` an einen festen Ort legen, z. B. `~/garmin-relentless`.
2. Server anmelden. `DEIN_SCHLÜSSEL` durch den Garmin Personal API-Schlüssel ersetzen
   (connect.garmin.com > Einstellungen > Persönlicher API-Schlüssel):

       claude mcp add garmin --scope user --env GARMIN_PERSONAL_API_KEY=DEIN_SCHLÜSSEL -- node ~/garmin-relentless/server/index.js

3. Prüfen: `claude mcp list` zeigt `garmin`. In Claude Code dann z. B. „Prüfe die Garmin-Verbindung“.

## Werkzeuge

- `check_connection` – Schlüssel prüfen
- `list_activities` – Aktivitäten auflisten (start, limit ≤ 50, startDate, endDate, activityType)
- `get_activity_recording` – Originaldatei (ZIP mit FIT, Base64) einer Aktivität

In Claude Code heißen sie `mcp__garmin__…` (hier hießen sie `Garmin für Relentless`).

## Schlüssel

- `--scope user` speichert den Schlüssel in `~/.claude.json` auf dem Mac, nicht im Projekt.
- Den Schlüssel nie in eine `.mcp.json` im Repository schreiben. Soll der Server im Projekt stehen, dort nur
  `"env": {"GARMIN_PERSONAL_API_KEY": "${GARMIN_PERSONAL_API_KEY}"}` eintragen und die Variable in der Shell setzen.
- Entfernen: `claude mcp remove garmin`
