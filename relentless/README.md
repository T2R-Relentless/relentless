# Relentless

Die App ist eine einzige statische HTML-Seite (`public/index.html`) mit Web-App-Manifest und Service Worker. Sie braucht kein Backend: Pläne, Einstellungen und hochgeladene Fahrten liegen nur im Browser des Nutzers (LocalStorage).

## Veröffentlichen

Jeder statische Hoster funktioniert (Cloudflare Pages/Workers, Netlify, GitHub Pages, eigener Webserver). Mit Cloudflare:

```
npx wrangler deploy
```

Lokal testen: `npx wrangler dev` und http://localhost:8787 öffnen, oder einfach `python3 -m http.server` im Ordner `public`.

## Fahrten

Aufgezeichnete Fahrten lädt der Nutzer als Datei hoch (FIT, GPX, TCX, auch als ZIP oder GZ). Die App wertet sie im Browser aus, gleicht sie mit dem Plan ab und kann daraus FTP, Trainingsumfang und Form schätzen.

## Garmin Connect

Garmins Personal API sendet keine CORS-Freigabe. Browser blockieren deshalb jeden direkten Aufruf aus einer Webseite. Die App nutzt darum zwei Wege:

- **Web-App auf Netlify:** Die Netlify Function `netlify/functions/garmin.mjs` (Adresse `/api/garmin`) ruft Garmin serverseitig auf. Der Nutzer fügt seinen persönlichen API-Schlüssel einmal in der App ein. Er liegt nur im Browser seines Geräts und wird bei jedem Abruf an die Funktion mitgeschickt. Die Funktion speichert und protokolliert ihn nicht, liest nur Aktivitätsliste und Originaldateien und nimmt nur Aufrufe von derselben Adresse an.
- **Claude-Desktop-App:** Erweiterung im Ordner `garmin-erweiterung` (als `garmin-relentless.mcpb` installieren).

Ohne die Funktion (z. B. bei anderen Hostern) bietet die App weiter den Datei-Upload an.

### Netlify mit Funktion veröffentlichen

Funktionen werden bei Netlify nur über Git oder die Netlify-Kommandozeile veröffentlicht, nicht per Drag-and-drop. `netlify.toml` legt fest: Seite aus `public`, Funktionen aus `netlify/functions`, kein Build-Schritt.

- Über GitHub: Diesen Ordner in ein GitHub-Repository laden und die Netlify-Seite unter „Project configuration → Build & deploy → Link repository“ damit verbinden. Jede Änderung im Repository wird automatisch veröffentlicht.
- Über die Kommandozeile: `npx netlify-cli deploy --prod` in diesem Ordner.
