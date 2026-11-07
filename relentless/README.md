# Relentless (ausgelieferte Web-App)

Dieser Ordner ist das, was Netlify veröffentlicht. Die App selbst ist eine einzige HTML-Seite (`public/index.html`) mit Web-App-Manifest, Service Worker (`public/sw.js`) und Versionsdatei (`public/version.json`). Dazu kommt ein kleiner Server-Teil: die Netlify Function `netlify/functions/garmin.mjs` für den Garmin-Abruf. Pläne, Einstellungen und Fahrten liegen nur im Browser des Nutzers (localStorage und IndexedDB), nicht auf dem Server.

`public/index.html` und `public/version.json` werden nicht von Hand bearbeitet, sondern mit `bash build/build.sh` im Repository erzeugt (siehe README im Repository-Hauptordner).

## Dateien

| Datei | Zweck |
| --- | --- |
| `public/index.html` | die App |
| `public/version.json` | Build-Nummer für die Update-Prüfung (unter 100 Byte statt der ganzen Seite) |
| `public/sw.js` | Offline-Betrieb; speichert nur Seite, Manifest und Icons, nichts mit wechselnden Adressen |
| `netlify.toml` | Veröffentlichung aus `public`, Funktionen aus `netlify/functions`, Sicherheits-Header (CSP, Clickjacking-Schutz u. a.) |
| `netlify/functions/garmin.mjs` | Garmin-Vermittler unter `/api/garmin` |
| `garmin-erweiterung/` | Erweiterung für die Claude-Desktop-App (als `garmin-relentless.mcpb` installieren) |
| `wrangler.toml` | ältere Konfiguration für Cloudflare; dort gibt es die Garmin-Funktion und die Sicherheits-Header nicht |

## Veröffentlichen

Netlify veröffentlicht diesen Ordner ohne eigenen Build-Schritt. Funktionen werden bei Netlify nur über Git oder die Netlify-Kommandozeile veröffentlicht, nicht per Drag-and-drop.

- Über GitHub: Repository mit der Netlify-Seite verbinden („Project configuration → Build & deploy → Link repository“). Jede Änderung wird automatisch veröffentlicht.
- Über die Kommandozeile: `npx netlify-cli deploy --prod` in diesem Ordner.

Bei jedem Update gehören `public/index.html` und `public/version.json` zusammen. Ändern sich `public/sw.js` oder `netlify.toml`, auch diese hochladen.

Lokal testen: `python3 -m http.server` im Ordner `public` (ohne Garmin-Funktion und ohne Header) oder der Testserver `tests/p2/server.js` im Repository (mit Headern und nachgebildetem Garmin).

## Fahrten

Aufgezeichnete Fahrten lädt der Nutzer als Datei hoch (FIT, GPX, TCX, auch als ZIP oder GZ, höchstens 50 MB, entpackt höchstens 150 MB). Die App wertet sie im Browser aus, gleicht sie mit dem Plan ab und schätzt daraus FTP, Trainingsumfang und Form.

## Garmin Connect

Garmins Personal API sendet keine CORS-Freigabe, Browser blockieren deshalb direkte Aufrufe. Zwei Wege:

- **Web-App auf Netlify:** `/api/garmin` ruft Garmin serverseitig auf. Der persönliche API-Schlüssel liegt nur im Browser des Geräts und wird bei jedem Abruf im Header mitgeschickt. Die Funktion speichert und protokolliert ihn nicht, liest nur Aktivitätsliste und Originaldateien, nimmt nur Aufrufe von derselben Adresse an (Origin bzw. `Sec-Fetch-Site`), begrenzt Aufrufe pro IP (120 pro Minute) und bricht nach 20 Sekunden ohne Garmin-Antwort ab. Die Herkunftsprüfung hält fremde Webseiten ab, ist aber keine Authentifizierung; geschützt sind die Daten durch den Schlüssel.
- **Claude-Desktop-App:** Erweiterung `garmin-erweiterung`, prüft Garmin-Antworten genauso streng.

Ohne Funktion (z. B. bei anderen Hostern) bleibt der Datei-Upload.
