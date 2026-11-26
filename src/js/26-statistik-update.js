/* ---------- Anonyme Nutzungsstatistik (GoatCounter): nur in der veröffentlichten Web-App, ohne Cookies, nur Ereignisnamen ----------
   F36: Nur nach Zustimmung. Solange niemand entschieden hat, baut die App keine Verbindung zu goatcounter.com auf (kein Skript,
   kein Pixel). Die Entscheidung liegt unter relentless.stats.consent ('ja' | 'nein'). Altdaten: relentless.stats.off = '1'
   gilt als „Nicht zählen“; wer bisher ohne eigene Wahl gezählt wurde (Statistik „an“), wird einmal neu gefragt. */
const GC_CODE = 'teamrelentlessriders', TR_KEY = 'relentless.stats.off', TR_CK = 'relentless.stats.consent';
function trConsent(){ try { const v = localStorage.getItem(TR_CK); if (v === 'ja' || v === 'nein') return v; if (localStorage.getItem(TR_KEY) === '1') return 'nein'; } catch (e) { elog(e); } return ''; }
const trOff = () => trConsent() !== 'ja';
/* Nur auf der eigenen Web-Adresse zählen: nicht im Claude-Artefakt, nicht lokal, nicht als Datei */
function trHost(){ try { return location.protocol === 'https:' && !(window.claude && window.claude.use) && !/claude|anthropic|localhost|127\.0\.0\.1/.test(location.hostname); } catch (e) { elog(e); return false; } }
let trQ = [], trLoaded = false, trPaged = false;
/* Zählung ohne fremdes Skript (F-09): Statt count.js von gc.zgo.at (hätte vollen Zugriff auf den Speicher der App, auch
   auf den Garmin-Schlüssel) ruft die App nur GoatCounters Zählpixel auf. Es lädt ein 1×1-Bild, führt keinen Code aus und
   bekommt nur Ereignisname, Titel und Bildschirmgröße. */
function trLoad(){ trLoaded = true; }
function trFlush(){
  const q = trQ; trQ = []; if (trOff()) return; try { if (navigator.webdriver) return; } catch (e) { elog(e); }
  q.forEach(v => { try {
    const u = new URL(`https://${GC_CODE}.goatcounter.com/count`); u.searchParams.set('p', v.path); u.searchParams.set('t', v.title || v.path);
    if (v.event) u.searchParams.set('e', 'true'); try { u.searchParams.set('s', [screen.width, screen.height, window.devicePixelRatio || 1].join(',')); } catch (e) { elog(e); }
    u.searchParams.set('rnd', Math.random().toString(36).slice(2, 8)); const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = u.href;
  } catch (e) { elog(e); } });
}
/* Ereignis zählen: nur ein fester Name, nie Inhalte, Zahlen oder Trainingsdaten */
function track(name, title){ if (!trHost() || trOff()) return; trQ.push({path:name, title:title || name, event:true}); trLoad(); trFlush(); }
function trPage(){ if (!trHost() || trOff() || trPaged) return; trPaged = true; let sa = false; try { sa = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) { elog(e); } trQ.push({path:sa ? '/app' : '/', title:sa ? 'Start als installierte App' : 'Start im Browser'}); trLoad(); trFlush(); }
function trSet(on){ try { localStorage.setItem(TR_CK, on ? 'ja' : 'nein'); if (on) localStorage.removeItem(TR_KEY); else localStorage.setItem(TR_KEY, '1'); } catch (e) { elog(e); } if (on) trPage(); render(); }
function trInit(){
  /* Gezählt wird direkt in den Funktionen (track(…)): finish, exeUpload, uploadRides, uploadHist, saveTest, npSaveHr,
     exportPlans, bkAddPlans/bkReplaceAll, instGo, setFtpSrc. Hier nur Seitenaufruf und Installation, beides nur nach Zustimmung. */
  try { window.addEventListener('appinstalled', () => track('app-installiert')); } catch (e) { elog(e); }
  trPage();
}
/* Abfrage beim ersten Start (und einmal für alle, die bisher ohne eigene Wahl gezählt wurden): zwei gleichwertige Knöpfe */
function trAskModal(){
  if (!trHost() || trConsent() || (typeof wnShow !== 'undefined' && wnShow)) return '';
  return `<div class="exov" role="dialog" aria-modal="true" aria-labelledby="trAskH"><div class="exbox" style="max-width:420px">
    <p class="eyebrow mb-2">Datenschutz</p><h3 id="trAskH" class="hd text-2xl font-semibold">Darf die App anonym zählen?</h3>
    <p class="mt-2 text-sm">Damit das Team sieht, ob die App genutzt wird, kann sie Ereignisse wie „App geöffnet“ oder „Plan erstellt“ an GoatCounter melden. Ohne Cookies, ohne Trainingsdaten, Zahlen oder Namen.</p>
    <p class="mt-2 text-sm" style="color:var(--mute)">Ohne deine Zustimmung baut die App keine Verbindung zu GoatCounter auf. Du kannst es jederzeit unter Einstellungen → Datenschutz ändern.</p>
    <div class="mt-4 grid grid-cols-2 gap-2"><button class="ghost w-full" style="min-height:44px" onclick="trSet(true)">Erlauben</button><button class="ghost w-full" style="min-height:44px" onclick="trSet(false)">Nicht zählen</button></div>
    ${RL_LEGAL_ON ? `<p class="mt-3 text-center text-sm"><button class="underline" style="background:none;border:0;color:var(--mute);min-height:44px" onclick="lglOpen('ds')">Datenschutzerklärung lesen</button></p>` : ''}</div></div>`;
}
function privSettings(){
  const c = trConsent(), on = c === 'ja';
  return fold('priv', 'Datenschutz', `<p class="text-sm">Deine Pläne, Fahrten und Werte speichert die App nur auf diesem Gerät. Sie hat kein Konto und keinen Server, der deine Daten aufbewahrt. Nur einzelne Funktionen schicken Daten zur Verarbeitung weiter: das Wetter deinen Ort an Open-Meteo, Garmin Connect deinen Schlüssel über den Vermittler dieser App an Garmin.</p>
    <p class="mt-2 text-sm">Wenn du es erlaubst, zählt die App anonym einige Ereignisse mit <a class="underline" target="_blank" rel="noopener" href="https://www.goatcounter.com">GoatCounter</a>, etwa „App geöffnet“, „Plan erstellt“ oder „Fahrt bewertet“. Gezählt werden nur diese Namen, ohne Cookies und ohne Trainingsdaten, Zahlen oder Namen. Dabei sieht GoatCounter wie jede Website deine IP-Adresse und den Browsertyp. Ohne Zustimmung baut die App keine Verbindung zu GoatCounter auf.</p>
    <div id="trChips" class="mt-3 flex flex-wrap gap-2">${chip('Statistik erlauben', on, 'trSet(true)')}${chip('Nicht zählen', c === 'nein', 'trSet(false)')}</div>
    ${!c ? '<p class="mt-2 text-xs" style="color:var(--mute)">Noch nicht entschieden: Bis dahin zählt die App nichts.</p>' : ''}${trHost() ? '' : '<p class="mt-2 text-xs" style="color:var(--mute)">Hier (in Claude oder lokal) zählt die App nie, unabhängig von dieser Einstellung.</p>'}
    ${RL_LEGAL_ON ? `<button class="ghost mt-3 !w-auto text-sm" style="min-height:44px" onclick="lglOpen()">Impressum und Datenschutzerklärung</button>` : ''}`, false, [on ? 'anonyme Statistik an' : c === 'nein' ? 'Statistik aus' : 'noch nicht entschieden']);
}

/* ---------- Neue Version erkennen (Web-App) ----------
   Auf dem iPhone bleibt eine Home-Bildschirm-App oft im Hintergrund geöffnet und lädt sich nicht neu. Die App fragt deshalb
   beim Start, beim Zurückkehren in den Vordergrund und alle 30 Minuten nach, ob es eine neuere Version gibt, und bietet „Neu laden“ an. */
/* F36: Zwei Felder. APP_BUILD ist nur die Reihenfolge-ID für den Update-Hinweis: Geräte vergleichen sie als Text mit
   version.json (neuer = größer), deshalb darf sie nie kleiner werden. Am 15.11.2026 wurde sie von Hand auf 20261213090000
   gesetzt (Datum in der Zukunft); alle folgenden IDs müssen darüber liegen, sonst sähen Geräte mit dieser ID keine Updates.
   APP_BUILT ist das echte Datum des Hochzählens (tools/version.py setzt es bei fix und neu aus der aktuellen Uhrzeit) und
   wird angezeigt. */
const APP_BUILD = '20261213090500';
const APP_BUILT = '20261126230515';
const updNewer = (remote, local) => /^\d{8,20}$/.test(String(remote || '')) && String(remote) > String(local);
let updNew = false, updAt = 0;
const updWeb = () => { try { return /^https?:$/.test(location.protocol) && !(window.claude && window.claude.use) && !/claude|anthropic/.test(location.hostname); } catch (e) { elog(e); return false; } };
async function updCheck(){
  if (!updWeb() || updNew || Date.now() - updAt < 60e3) return; updAt = Date.now();
  /* F-10: nur die kleine version.json abfragen (unter 100 Byte), nicht die ganze Seite */
  try { const r = await fetch(new URL('version.json', location.href).pathname + '?t=' + Date.now(), {cache:'no-store'}); if (!r.ok) return;
    const j = await r.json().catch(() => null), m = j && /^\d{8,20}$/.test(String(j.build)) ? [0, String(j.build)] : null;
    if (m && updNewer(m[1], APP_BUILD)) { updNew = true; updVer = +j.version || 0; try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(g => g && g.update()).catch(() => {}); } catch (e) { elog(e); } render(); }
  } catch (e) { elog(e); }
}
function updGo(){ try { track('update-geladen'); } catch (e) { elog(e); } location.reload(); }
const updBanner = () => updNew ? `<div class="flex items-center gap-2 text-sm" role="status" style="background:#00c2b2;color:#071747;padding:8px 12px 8px 16px;position:sticky;top:0;z-index:70"><span class="min-w-0 flex-1"><span class="block font-semibold">Neue Version verfügbar</span>${updVer ? `<span class="block text-xs">Du hast Version ${APP_VERSION}, neu ist ${updVer}.</span>` : ''}</span><button class="text-sm font-semibold" style="background:#071747;color:#fff;padding:7px 14px" onclick="updGo()">Neu laden</button></div>` : '';
function updInit(){
  if (!updWeb()) return;
  setTimeout(updCheck, 3000); setInterval(updCheck, 30 * 60e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updCheck(); });
  window.addEventListener('pageshow', e => { if (e.persisted) updCheck(); });
}

