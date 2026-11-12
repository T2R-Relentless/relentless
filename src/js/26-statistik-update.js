/* ---------- Anonyme Nutzungsstatistik (GoatCounter): nur in der veröffentlichten Web-App, ohne Cookies, nur Ereignisnamen ---------- */
const GC_CODE = 'teamrelentlessriders', TR_KEY = 'relentless.stats.off';
const trOff = () => { try { return localStorage.getItem(TR_KEY) === '1'; } catch (e) { elog(e); return false; } };
/* Nur auf der eigenen Web-Adresse zählen: nicht im Claude-Artefakt, nicht lokal, nicht als Datei */
const trHost = () => { try { return location.protocol === 'https:' && !(window.claude && window.claude.use) && !/claude|anthropic|localhost|127\.0\.0\.1/.test(location.hostname); } catch (e) { elog(e); return false; } };
let trQ = [], trLoaded = false;
/* Zählung ohne fremdes Skript (F-09): Statt count.js von gc.zgo.at (hätte vollen Zugriff auf den Speicher der App, auch
   auf den Garmin-Schlüssel) ruft die App nur GoatCounters Zählpixel auf. Es lädt ein 1×1-Bild, führt keinen Code aus und
   bekommt nur Ereignisname, Titel und Bildschirmgröße. */
function trLoad(){ trLoaded = true; }
function trFlush(){
  const q = trQ; trQ = []; try { if (navigator.webdriver) return; } catch (e) { elog(e); }
  q.forEach(v => { try {
    const u = new URL(`https://${GC_CODE}.goatcounter.com/count`); u.searchParams.set('p', v.path); u.searchParams.set('t', v.title || v.path);
    if (v.event) u.searchParams.set('e', 'true'); try { u.searchParams.set('s', [screen.width, screen.height, window.devicePixelRatio || 1].join(',')); } catch (e) { elog(e); }
    u.searchParams.set('rnd', Math.random().toString(36).slice(2, 8)); const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = u.href;
  } catch (e) { elog(e); } });
}
/* Ereignis zählen: nur ein fester Name, nie Inhalte, Zahlen oder Trainingsdaten */
function track(name, title){ if (!trHost() || trOff()) return; trQ.push({path:name, title:title || name, event:true}); trLoad(); trFlush(); }
function trPage(){ if (!trHost() || trOff()) return; let sa = false; try { sa = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) { elog(e); } trQ.push({path:sa ? '/app' : '/', title:sa ? 'Start als installierte App' : 'Start im Browser'}); trLoad(); trFlush(); }
function trSet(on){ try { if (on) localStorage.removeItem(TR_KEY); else localStorage.setItem(TR_KEY, '1'); } catch (e) { elog(e); } render(); }
function trInit(){
  /* Gezählt wird direkt in den Funktionen (track(…)): finish, exeUpload, uploadRides, uploadHist, saveTest, npSaveHr,
     exportPlans, bkAddPlans/bkReplaceAll, instGo, setFtpSrc. Hier nur Seitenaufruf und Installation. */
  try { window.addEventListener('appinstalled', () => track('app-installiert')); } catch (e) { elog(e); }
  trPage();
}
function privSettings(){
  if (!trHost()) return '';
  const on = !trOff();
  return fold('priv', 'Datenschutz', `<p class="text-sm">Deine Pläne, Fahrten und Werte bleiben nur auf diesem Gerät. Die App hat kein Konto und keinen Server, der deine Daten speichert.</p>
    <p class="mt-2 text-sm">Damit das Team sieht, ob und wie die App genutzt wird, zählt sie anonym einige Ereignisse mit <a class="underline" target="_blank" rel="noopener" href="https://www.goatcounter.com">GoatCounter</a>, etwa „App geöffnet“, „Plan erstellt“ oder „Fahrt bewertet“. Gezählt werden nur diese Namen, ohne Cookies und ohne Trainingsdaten, Zahlen oder Namen. GoatCounter sieht dabei wie jede Website deine IP-Adresse und den Browsertyp, speichert sie aber nicht dauerhaft.</p>
    <div class="mt-3 flex flex-wrap gap-2">${chip('Statistik erlauben', on, 'trSet(true)')}${chip('Nicht zählen', !on, 'trSet(false)')}</div>`, false, [on ? 'anonyme Statistik an' : 'Statistik aus']);
}

/* ---------- Neue Version erkennen (Web-App) ----------
   Auf dem iPhone bleibt eine Home-Bildschirm-App oft im Hintergrund geöffnet und lädt sich nicht neu. Die App fragt deshalb
   beim Start, beim Zurückkehren in den Vordergrund und alle 30 Minuten nach, ob es eine neuere Version gibt, und bietet „Neu laden“ an. */
const APP_BUILD = '20261112180000';
let updNew = false, updAt = 0;
const updWeb = () => { try { return /^https?:$/.test(location.protocol) && !(window.claude && window.claude.use) && !/claude|anthropic/.test(location.hostname); } catch (e) { elog(e); return false; } };
async function updCheck(){
  if (!updWeb() || updNew || Date.now() - updAt < 60e3) return; updAt = Date.now();
  /* F-10: nur die kleine version.json abfragen (unter 100 Byte), nicht die ganze Seite */
  try { const r = await fetch(new URL('version.json', location.href).pathname + '?t=' + Date.now(), {cache:'no-store'}); if (!r.ok) return;
    const j = await r.json().catch(() => null), m = j && /^\d{8,20}$/.test(String(j.build)) ? [0, String(j.build)] : null;
    if (m && m[1] > APP_BUILD) { updNew = true; updVer = +j.version || 0; try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(g => g && g.update()).catch(() => {}); } catch (e) { elog(e); } render(); }
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

