# Entwicklung von Relentless

Wie aus einer Idee eine veröffentlichte Version wird, wer was macht und woran man erkennt, dass etwas fertig ist.
Regeln für die Arbeit am Code stehen in `CLAUDE.md`, die Ordner in `LIESMICH.md`.

## Wer macht was

| Ort | Aufgabe |
|---|---|
| **claude.ai, Projekt „T2R“** | Ideen sammeln, fachlich (Sportwissenschaft) prüfen, Backlog pflegen (`claude/backlog.md`), Umsetzungs-Prompts schreiben (Vorlage `docs/vorlagen/prompt.md`), Berichte bewerten |
| **Claude Code auf dem Mac** | Prompt umsetzen: Branch, Code, Tests, Version, Bericht (`/aufgabe`) |
| **GitHub** `T2R-Relentless/relentless` | Einzige Quelle des Codes. Jede Änderung kommt als Pull Request, die CI prüft automatisch |
| **Netlify** | Baut zu jedem Pull Request eine Vorschau-Adresse und veröffentlicht `main` auf `teamrelentlessriders.netlify.app` |

## Agenten-Team: du entscheidest, das Team arbeitet

| Agent | Aufgabe | Darf ändern |
|---|---|---|
| `trainingswissenschaftler` | fachliche Regeln mit Quellen vorab, fachliche Abnahme danach | nichts |
| `entwickler` | Umsetzung in `src/`, Texte DE/EN, Hinweis, Neuigkeiten, Version | `src/`, `public/` |
| `tester` | Tests schreiben, alle Tests ohne Fenster, Vergleichsstände bewerten | `tests/` |
| `code-pruefer` | unabhängige Prüfung: Fehler, Daten, Sicherheit, Regeln | nichts |
| `design-pruefer` | Bildschirmfotos hell/dunkel/Englisch, T2R-Design, 375 pt, 44 pt, Kontrast | nur Bilder |
| `release-manager` | Push, Pull Request, CI, Vorschau, nach Merge Live-Version prüfen | Git/GitHub |

**Deine drei Entscheidungspunkte:**
1. **Starten:** Issue mit dem Label `umsetzen` versehen (Cloud, ohne Mac) oder in Claude Code `/aufgabe <Prompt>`.
2. **Rückfragen:** Das Team setzt bei Wertungsfragen die Empfehlung um und legt sie dir vor. Anders entscheiden:
   Kommentar `@claude B bitte` im Pull Request.
3. **Veröffentlichen:** In der Vorschau ansehen, dann im Pull Request **Squash and merge**. Nicht gewollt: Pull Request schließen.

Aus einer Idee wird eine Aufgabe mit `/idee <Text>` oder im T2R-Projekt in claude.ai; das Issue-Formular „Aufgabe“
nimmt beides auf.

## Ablauf einer Änderung

1. **Idee → Backlog:** Eintrag mit Nummer (`F` Funktion, `B` Fehler, `A` Prüfung), Beobachtung, Soll, Bezug.
2. **Prompt:** im Projekt nach `docs/vorlagen/prompt.md` schreiben. Ein Prompt = ein Thema = ein Branch.
   Lieber mehrere kleine Prompts als ein Sammel-Prompt, dann lassen sie sich einzeln prüfen und zurücknehmen.
3. **Umsetzen:** in Claude Code `/aufgabe <Prompt>`. Ergebnis: Branch mit Commits, grüne Prüfungen, Bericht,
   noch nicht hochgeladen.
4. **Freigabe zum Hochladen:** „Ja, hochladen“ → Branch wird gepusht und ein Pull Request angelegt. Die CI läuft.
5. **Auf dem iPhone ansehen:** Netlify schreibt die Adresse der Vorschau (Deploy Preview) in den Pull Request.
   Dort ausprobieren, ohne dass die echte App sich ändert. Die Vorschau hat eigenen Speicher, echte Daten bleiben unberührt.
6. **Veröffentlichen:** nach dem Test `/freigabe <PR>` → Übernahme auf `main` (ein Commit je Aufgabe), Netlify veröffentlicht,
   Version wird kontrolliert.
7. **Nachtragen:** Backlog-Status auf „erledigt (Version N)“, Release-Stand im Projekt aktualisieren.

Fehler in der veröffentlichten Version: in Netlify unter **Deploys** den letzten guten Stand öffnen →
**Publish deploy**. Das wirkt sofort, danach in Ruhe mit `fix/…` beheben.

## Fertig heißt

- `python3 tools/check.py --gegen origin/main` grün: Build passt zu `src/`, Versionen stimmen überall, gültiges
  JavaScript, keine doppelt deklarierten Funktionen, kein `eval`, Version erhöht.
- `node tools/test.mjs` grün: alle Browser-Tests, ohne Klicken, etwa 3 Minuten.
- Neue Logik hat Tests. Gewollte Textänderungen sind als Vergleichsstand übernommen und im Diff geprüft.
- Regeln aus `CLAUDE.md` erfüllt (DE/EN, hell/dunkel, 375 pt, 44 pt, SVG, Daten im Gerät, Zustimmung bei Planänderungen,
  Sicherungsdatei abwärtskompatibel, Hinweis in „Wusstest du schon?“, Neuigkeiten-Eintrag).
- Bericht in `claude/` nach `docs/vorlagen/bericht.md`.

## Befehle

| Befehl | Wozu |
|---|---|
| `python3 tools/build.py` | `public/index.html` aus `src/` bauen |
| `python3 tools/check.py [--gegen origin/main]` | schnelle Prüfungen (Sekunden) |
| `node tools/test.mjs [--nur=plan] [--neu]` | alle bzw. gefilterte Browser-Tests ohne Fenster; `--neu` schreibt Vergleichsstände neu |
| `python3 tools/version.py fix` / `neu` | Version an allen Stellen hochzählen (Fehlerkorrektur / neue Funktion) und neu bauen |
| `node tools/test.mjs --skript=x.js` | eigenes Skript auf der Testseite, z. B. Bildschirmfotos mit `boot()` und `shot()` |
| `python3 tests/serve.py` | Testseite und App im Browser (`/tests/`, `/public/`), z. B. zum Ansehen |

In Claude Code: `/idee`, `/aufgabe`, `/pruefen`, `/freigabe` (Dateien in `.claude/commands/`).

## Namen

- Branches: `feature/f34-kurzname`, `fix/kurzname`, `werkzeug/kurzname` (nur Werkzeuge/Doku).
- Commits: `F34: was sich ändert` bzw. `Fix: …`; die letzte Commit-Nachricht einer Version nennt sie (`… (Version 211)`).
- Berichte: `claude/bericht-f34-kurzname-JJJJ-MM-TT.md`, Bilder in `claude/bilder/`.

## Versionen

- `APP_VERSION` zählt jede ausgelieferte Änderung (Anzeige in den Einstellungen).
- `APP_BUILD` ändert sich nur bei neuen Funktionen. Nur dann erscheinen Update-Hinweis und Neuigkeiten-Fenster.
- `APP_SW` (Service-Worker-Cache) zählt mit `APP_VERSION` mit, damit das iPhone die neue Datei lädt.
- `tools/version.py` setzt alles gleichzeitig; `tools/check.py` meldet, wenn etwas auseinanderläuft.

## Einmal einzurichten (GitHub, Netlify)

- **GitHub → Settings → Branches → Add rule für `main`:** „Require a pull request before merging“ und „Require status
  checks to pass“ mit der Prüfung **Prüfungen / pruefen**. Dann kommt nichts Ungeprüftes mehr auf `main`.
- **Netlify → Site configuration → Build & deploy → Deploy Previews:** „Any pull request“ einschalten (Standard).
- **Agenten in der Cloud** (`.github/workflows/claude.yml`): Claude-GitHub-App für `T2R-Relentless` installieren,
  auf dem Mac `claude setup-token` ausführen und den Wert als Secret `CLAUDE_CODE_OAUTH_TOKEN` anlegen, Label `umsetzen`
  anlegen. Läuft über das Claude-Abo (Pro/Max) und zählt zu dessen Nutzungsgrenzen. Die App erlaubt auch claude.ai das Pushen.
- **Auf dem Mac** (für `/aufgabe` lokal): Node ab 22 (nodejs.org) und Google Chrome installieren, optional `gh` (GitHub CLI).
- Repo nicht in iCloud Drive ablegen (Synchronisationskopien „… 2.js“), z. B. `~/Entwicklung/relentless`.

## Bekannte technische Schulden (bei Gelegenheit, nicht auf einmal)

- **Ein globaler Bereich für 70 Dateien:** Funktionen rufen sich über Dateigrenzen auf. `tools/check.py` fängt doppelte
  Deklarationen ab. Neue Funktionen deshalb mit Themen-Präfix benennen (wie `wn…`, `vi…`, `dyk…`).
- **`public/index.html` ist eingecheckt** (2 MB) und erzeugt große Diffs. Nötig für das Claude-Artefakt; Netlify baut selbst.
- **Inline-Handler (`onclick="…"`)** erzwingen `'unsafe-inline'` in der CSP. Nur bei ohnehin anstehenden Umbauten ersetzen.
