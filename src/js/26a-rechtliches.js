/* ---------- F36: Impressum und Datenschutz ----------
   Erreichbar (wenn RL_LEGAL_ON) unter Mehr → Extras, unter Einstellungen → Datenschutz, aus der Statistik-Abfrage und vor der Planerstellung
   (Fußzeile der Planung). Als Fenster, damit es auch ohne Plan geht. Platzhalter sind gelb markiert und müssen vor der
   Veröffentlichung ersetzt werden; der Text ist ein Entwurf und juristisch zu prüfen.
   F37: Vorerst ausgeblendet (Entscheidung der Nutzerin bzw. des Nutzers). RL_LEGAL_ON = true schaltet alle Zugänge wieder ein:
   Mehr → Extras, Einstellungen → Datenschutz, Statistik-Abfrage, Fußzeile der Planung, Hinweis „priv“. */
const RL_LEGAL_ON = false;
let lglShow = null;
function lglOpen(k){ if (!RL_LEGAL_ON) return; if (!lglShow) { try { track('rechtliches-geoeffnet'); } catch (e) { elog(e); } } lglShow = k === 'ds' ? 'ds' : 'imp'; render(); }
function lglClose(){ lglShow = null; render(); }
const lglPh = t => `<mark style="background:#fff1a8;color:#5a4300;padding:0 3px;font-weight:600">[Platzhalter: ${t}]</mark>`;
const lglH = t => `<h4 class="hd mt-4 text-lg font-semibold">${t}</h4>`;
const lglP = t => `<p class="mt-1 text-sm" style="line-height:1.5">${t}</p>`;
function lglImp(){
  return lglH('Angaben nach § 5 Digitale-Dienste-Gesetz')
    + lglP(lglPh('Name bzw. Name des Vereins'))
    + lglP(lglPh('Straße und Hausnummer') + '<br>' + lglPh('Postleitzahl und Ort'))
    + lglH('Vertreten durch') + lglP(lglPh('Vertretungsberechtigte, z. B. Vorstand'))
    + lglH('Kontakt') + lglP('E-Mail: ' + lglPh('E-Mail-Adresse'))
    + lglH('Registereintrag') + lglP(lglPh('Vereinsregister, Registergericht und Nummer, falls vorhanden'))
    + lglH('Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV') + lglP(lglPh('Name und Anschrift'))
    + lglH('Hinweis zu den Trainingsplänen') + lglP('Die App erstellt Trainingsvorschläge automatisch. Sie ersetzen keine ärztliche Untersuchung und keine persönliche Trainingsberatung.');
}
function lglDs(){
  return lglH('1. Verantwortlich')
    + lglP(lglPh('Name bzw. Verein, Anschrift') + ', E-Mail: ' + lglPh('E-Mail-Adresse') + '. Einen Datenschutzbeauftragten gibt es ' + lglPh('nicht bzw. Name und Kontakt') + '.')
    + lglH('2. Grundsatz: Deine Daten bleiben im Gerät')
    + lglP('Die App hat kein Konto und keinen Server, der deine Pläne, Fahrten oder Werte speichert. Alles liegt im Speicher deines Browsers auf diesem Gerät (Local Storage und IndexedDB). Das ist nötig, damit die App funktioniert. Sicherungsdateien speicherst du selbst, sie gehen nirgendwohin.')
    + lglH('3. Bereitstellung der App (Netlify)')
    + lglP('Die App wird von Netlify, Inc. (USA) ausgeliefert. Beim Aufruf verarbeitet Netlify technisch notwendige Daten wie IP-Adresse, Zeitpunkt, aufgerufene Adresse und Browsertyp, um die Seite auszuliefern und vor Missbrauch zu schützen. Dazu gehört auch die regelmäßige Abfrage, ob es eine neue Version gibt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, unser Interesse an einem sicheren Betrieb. Für die Übermittlung in die USA gilt ' + lglPh('EU-US Data Privacy Framework bzw. Standardvertragsklauseln') + '. Speicherdauer bei Netlify: ' + lglPh('laut Netlify bzw. Tarif') + '.')
    + lglH('4. Anonyme Statistik (GoatCounter), nur mit Zustimmung')
    + lglP('Nur wenn du zustimmst, meldet die App einzelne Ereignisse wie „App geöffnet“ oder „Plan erstellt“ an GoatCounter (' + lglPh('Anbieter und Sitz') + '). Übertragen werden der Name des Ereignisses und die Bildschirmgröße, keine Trainingsdaten, keine Cookies. GoatCounter sieht dabei deine IP-Adresse und den Browsertyp. Ohne Zustimmung baut die App keine Verbindung zu GoatCounter auf. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit unter Einstellungen → Datenschutz widerrufen. Speicherdauer: ' + lglPh('laut GoatCounter') + '.')
    + lglH('5. Wetter (Open-Meteo), nur wenn du es einschaltest')
    + lglP('Schaltest du unter Einstellungen das Wetter ein, schickt die App den eingegebenen Ort bzw. die Koordinaten an Open-Meteo (' + lglPh('Anbieter und Sitz') + '), um die Vorhersage zu holen. Dabei sieht Open-Meteo deine IP-Adresse. Den Standort deines Geräts fragt die App nur, wenn du darauf tippst. Rechtsgrundlage ist ' + lglPh('Art. 6 Abs. 1 lit. b bzw. f DSGVO') + '.')
    + lglH('6. Garmin Connect, nur wenn du es verbindest')
    + lglP('Deinen persönlichen Garmin-Schlüssel speichert die App nur auf diesem Gerät. Bei jedem Abruf schickt sie ihn verschlüsselt an den Vermittler dieser App (eine Funktion bei Netlify unter /api/garmin). Der Vermittler holt damit bei Garmin (' + lglPh('Garmin-Gesellschaft und Sitz') + ') deine Aktivitätsliste und die Originaldateien und gibt sie direkt an dein Gerät weiter. Er speichert weder Schlüssel noch Fahrten und schreibt sie in kein Protokoll. Nur ein kurzlebiges Zugangstoken von Garmin hält er bis zu seinem Ablauf im Arbeitsspeicher, zusammen mit einem Prüfwert des Schlüssels, nicht mit dem Schlüssel selbst. Für die Begrenzung zu vieler Abrufe zählt er kurz die Aufrufe je IP-Adresse.')
    + lglP('Die Fahrten enthalten Puls und Strecke. Puls kann ein Gesundheitsdatum sein. Rechtsgrundlage ist ' + lglPh('Art. 6 Abs. 1 lit. a bzw. b und Art. 9 Abs. 2 lit. a DSGVO') + '. Unter Einstellungen → Garmin Connect trennst du die Verbindung und löschst den Schlüssel. Widerrufe ihn zusätzlich bei Garmin.')
    + lglH('7. Speicherdauer')
    + lglP('Daten im Gerät bleiben, bis du sie löschst: unter Einstellungen → Gefahrenzone mit „Alles zurücksetzen“ oder über die Browserdaten. Zur Speicherdauer bei Netlify und GoatCounter siehe oben.')
    + lglH('8. Deine Rechte')
    + lglP('Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Da wir deine Trainingsdaten nicht erhalten, kannst du sie in der App selbst einsehen, sichern und löschen.')
    + lglH('9. Beschwerderecht')
    + lglP('Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel bei ' + lglPh('zuständige Aufsichtsbehörde') + '.')
    + lglP('Stand: ' + lglPh('Datum'));
}
function lglModal(){
  if (!RL_LEGAL_ON || !lglShow) return '';
  const ds = lglShow === 'ds';
  return `<div class="exov" onclick="if(event.target===this)lglClose()" role="dialog" aria-modal="true" aria-labelledby="lglH"><div class="exbox" style="max-width:560px" data-nogl>
    <div class="flex items-center gap-2"><h3 id="lglH" class="hd min-w-0 flex-1 text-2xl font-semibold">Impressum und Datenschutz</h3><button style="min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;color:var(--mute)" aria-label="Schließen" onclick="lglClose()">${icX()}</button></div>
    <div class="mt-2 flex flex-wrap gap-2">${chip('Impressum', !ds, "lglOpen('imp')")}${chip('Datenschutz', ds, "lglOpen('ds')")}</div>
    <p class="mt-3 p-2 text-xs" style="background:var(--tint);border:1px solid var(--line)">Entwurf: Gelb markierte Platzhalter werden vor der Veröffentlichung ersetzt, der Text wird rechtlich geprüft.</p>
    ${ds ? lglDs() : lglImp()}
    <button class="ghost mt-5 w-full" style="min-height:44px" onclick="lglClose()">Schließen</button></div></div>`;
}
/* Kleiner Verweis unter der Planung (auch vor dem ersten Plan) */
const lglLink = () => !RL_LEGAL_ON ? '' : `<p class="mt-2 text-center text-xs"><button class="underline" style="background:none;border:0;color:var(--mute);min-height:44px;padding:0 8px" onclick="lglOpen('imp')">Impressum und Datenschutz</button></p>`;
