# Bericht – Formhöhepunkt bei zwei A-Rennen kurz hintereinander (v200)

Stand: 14.11.2026 · Branch `feature/doppel-tapering` (auf `main` bei `334f167`, v199), nur lokal

## Anlass
Die Formkurve zeigte die Saisonspitze (Fitness 71) am 29.08.2027, am Hauptevent (03.10.2027) aber nur Fitness 59. Die App wies darauf hin, bot aber keine Abhilfe an.

## Ursache
Nachgerechnet habe ich mit der Sicherungsdatei vom 14.11.2026. Sie wurde nur lokal verwendet, die Rennnamen sind anonymisiert, und nichts davon liegt im Repository.

Im Plan liegt ein A-Rennen am 19.09.2027, zwei Wochen vor dem Hauptevent. Der Plangenerator behandelt jedes A-Event einzeln. Daraus entstanden fünf leichte Wochen hintereinander:

| Woche ab | Bisher | TSS |
|---|---|---|
| 23.08. | letzte volle Woche | 560 |
| 30.08. | Entlastungswoche (Rhythmus 3:1) | 318 |
| 06.09. | Tapering 1 von 2 fürs 19.09. | 260 |
| 13.09. | Tapering 2 von 2, Rennen am 19.09. | 421 |
| 20.09. | Regeneration nach dem A-Rennen | 266 |
| 27.09. | Tapering fürs Hauptevent | 373 |

Das Zeitbudget (Winter 8 Std., Sommer 12 Std.) ist nicht die Ursache. September und Oktober zählen als Sommer.

## Lösung
Der Plan ändert sich nur nach Zustimmung.

- **Vorschlag auf der Formkurve** (unter dem gelben Hinweis):
  - „Formhöhepunkt näher ans Hauptevent legen“.
  - Eine Tabelle zeigt Fitness und Form an beiden Renntagen, jetzt und angepasst.
  - Der Knopf heißt „Plan so anpassen“.
- **Was die Anpassung macht** (Merker `p.tpShort` im Plan):
  - Folgt auf ein A-Event binnen drei Wochen das nächste, gibt es vor dem früheren nur eine Woche Tapering statt zwei (`phases` in `05-plan-generator.js`).
  - Fällt die Entlastungswoche des Rhythmus direkt vor dieses Tapering, tauscht sie mit der Woche davor (`tpSwap`, `recWk`, `rampOf` in `05-alter-rhythmus.js`). So liegt die letzte volle Woche direkt vor dem Tapering.
- **Sicherheit:**
  - Vor der Änderung legt die App einen Schnappschuss an, und es gibt einen Eintrag unter „Anpassungen“.
  - Die laufende Woche bleibt.
  - Danach steht an derselben Stelle „Tapering angepasst“ mit dem Knopf „Wieder zwei Wochen Tapering“.
  - Der Vorschlag erscheint nicht mehr, sobald das Tapering in zwei Wochen oder früher beginnt.
- **Ohne Zustimmung** ändert sich an keinem Plan etwas. Ohne den Merker rechnet der Generator wie bisher (die Vergleichsstände aller Szenarien sind unverändert bis auf Version und Build).
- Beide Varianten rechnet dieselbe Formrechnung (`vzRows`) wie Plan-Check und Saisonübersicht.

## Wirkung in deinem Plan

| | Jetzt | Angepasst |
|---|---|---|
| Hauptevent 03.10. | Fitness 59, Form +13 | **Fitness 63, Form +16** |
| Rennen 19.09. | Fitness 63, Form +21 | **Fitness 68, Form +13** |
| Woche ab 06.09. | 260 TSS (Tapering) | 537 TSS (volle Woche) |

- Die Saisonspitze bleibt Ende August bei etwa 71. Das ist bei zwei Rennen im Abstand von zwei Wochen nicht zu vermeiden, weil zwischen den Rennen kein Aufbau möglich ist.
- Am Hauptevent liegt die Fitness dann bei 89 % der Spitze (vorher 83 %). Der gelbe Hinweis verschwindet damit.
- Mehr brächte nur eine niedrigere Priorität: Das Rennen am 19.09. als B-Rennen ergibt am Hauptevent ebenfalls 63 / +16, aber am 19.09. nur Form +9. Das habe ich nicht eingebaut. Du kannst die Priorität in der Saisonübersicht selbst ändern.

## Dazu gehört
- Tipp in „Wusstest du schon?“ (`tpshort`): Er erscheint nur, wenn der Plan zwei A-Rennen binnen drei Wochen hat. Der Knopf springt direkt zum Vorschlag (DE/EN).
- Neuigkeiten-Eintrag 200 (DE/EN). Version 200, Build-ID 20261120090000, Service Worker `relentless-v37`.

## Tests
249 von 249 bestanden, zwei davon neu in `tests/formkurve.test.js`:
- Der Vorschlag rechnet, ohne den Plan zu ändern.
- Nach Zustimmung gibt es eine Woche Tapering, und die Entlastungswoche ist getauscht.
- Die laufende Woche bleibt unverändert.
- Eintrag unter „Anpassungen“ und Schnappschuss sind da.
- Die Rücknahme stellt den alten Plan her.
- Kein Vorschlag bei weit auseinanderliegenden Rennen, bei einem B-Rennen oder kurz vor dem Tapering.
- Englisch, Tipp und Neuigkeiten.

## Offene Punkte
- Ungeprüft: auf dem iPhone und der Netlify-Build.
- Die Regel greift nur für das zweite und spätere A-Event einer Saison, nicht wenn schon das erste A-Event der Saison binnen drei Wochen vor dem nächsten liegt.
- Der gelbe Hinweistext nennt weiter „Tapering ungewöhnlich lang oder der Umfang davor niedrig“. Er könnte künftig die erkannte Ursache nennen.
- Die Bilder mit deinen Plandaten liegen in `claude/privat/`. Der Ordner ist in `.gitignore` eingetragen und wird nicht hochgeladen.

## Veröffentlichen (nicht ausgeführt)
1. „Ja, hochladen“: Ich pushe nur den Branch.
2. „Ja in Main“: Ich merge nach `main`, Netlify baut daraus automatisch.
3. Danach auf dem iPhone: Formkurve öffnen und „Plan so anpassen“ antippen.
