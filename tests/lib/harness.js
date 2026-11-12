/* Relentless-Testumgebung (ohne Abhängigkeiten, läuft im Browser).
   Jeder Test bekommt eine frische App in einem unsichtbaren Rahmen. Darin gilt:
   - Speicher (localStorage, sessionStorage) nur im Arbeitsspeicher: echte Daten werden nie gelesen oder geändert.
   - Die Uhr steht still (Standard: Mittwoch, 11.11.2026, 9:30 Ortszeit) und lässt sich gezielt vorstellen.
   - Zufall ist reproduzierbar, Aufrufe an fremde Adressen sind gesperrt, Downloads werden nur mitgeschrieben.
   - Die App läuft als "about:srcdoc": Update-Prüfung, Statistik, Service Worker und Garmin-Web sind dadurch aus.
   Vergleichsstände (Snapshots) liegen in tests/snapshots/<datei>.json und werden mit tests/serve.py geschrieben. */
'use strict';
const R = window.R = {tests:[], snaps:{}, fresh:{}, used:{}, update:false, file:'', results:[]};
const NOW0 = new Date(2026, 10, 11, 9, 30, 0).getTime();
const at = (y, m, d, h = 9, mi = 30) => new Date(y, m - 1, d, h, mi, 0).getTime();

class Fail extends Error {}
function test(name, fn){ R.tests.push({name, fn, file:R.file}); }
const show = v => { const s = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v, null, 0); return s && s.length > 400 ? s.slice(0, 400) + ' …' : s; };
function eq(a, b, msg){ const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) throw new Fail(`${msg || 'Wert'}: erwartet ${show(b)}, erhalten ${show(a)}`); }
function ok(v, msg){ if (!v) throw new Fail(msg || 'Bedingung nicht erfüllt'); }
function near(a, b, tol, msg){ if (!(Math.abs(a - b) <= tol)) throw new Fail(`${msg || 'Wert'}: erwartet ${b} ± ${tol}, erhalten ${a}`); }
async function throws(fn, re, msg){
  let err = null; try { await fn(); } catch (e) { err = e; }
  if (!err) throw new Fail(`${msg || 'Aufruf'}: Fehler erwartet, aber keiner ausgelöst`);
  if (re && !re.test(String(err && err.message))) throw new Fail(`${msg || 'Aufruf'}: falsche Fehlermeldung "${err && err.message}"`);
  return err;
}

/* Stabile Darstellung für Vergleiche: Schlüssel sortiert */
function stable(v){ return JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, q) => (o[q] = x[q], o), {}) : x); }
/* Erste Abweichung zweier Texte mit etwas Umgebung */
function firstDiff(a, b){
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const cut = s => s.slice(Math.max(0, i - 80), i + 120).replace(/\n/g, '⏎');
  return `ab Zeichen ${i}:\n  erwartet: …${cut(b)}…\n  erhalten: …${cut(a)}…`;
}
async function loadSnaps(file){
  if (R.snaps[file]) return R.snaps[file];
  try { const r = await fetch(`snapshots/${file}.json`, {cache:'no-store'}); R.snaps[file] = r.ok ? await r.json() : {}; } catch (e) { R.snaps[file] = {}; }
  return R.snaps[file];
}
/* Wert mit dem gespeicherten Vergleichsstand prüfen. Im Aktualisieren-Modus wird nur mitgeschrieben. */
async function snap(file, key, value){
  const store = await loadSnaps(file); value = JSON.parse(stable(value));
  (R.fresh[file] = R.fresh[file] || {})[key] = value;
  if (R.update) return;
  if (!(key in store)) throw new Fail(`Vergleichsstand "${file} › ${key}" fehlt. Einmal „Vergleichsstände neu schreiben“ ausführen.`);
  const A = typeof value === 'string' ? value : stable(value), B = typeof store[key] === 'string' ? store[key] : stable(store[key]);
  if (A !== B) throw new Fail(`Abweichung bei "${file} › ${key}" ${firstDiff(A, B)}`);
}

/* ---------- App im Rahmen starten ---------- */
let SRC = null, bootN = 0;
/* Eindeutig je Laden der Testseite: IndexedDB-Namen früherer Läufe (z. B. Sicherungs-Spiegel) dürfen nie gefunden werden */
const RUN = Date.now().toString(36);
async function appSource(){ if (SRC == null) SRC = await (await fetch('../public/index.html', {cache:'no-store'})).text(); return SRC; }
/* Läuft im Rahmen, bevor die App startet. Wird als Text eingesetzt, darf also nichts von außen benutzen. */
function PRELUDE(cfg){
  const w = window;
  const mem = init => { const m = new Map(Object.entries(init || {})); return {get length(){ return m.size; }, key:i => [...m.keys()][i] ?? null, getItem:k => m.has(String(k)) ? m.get(String(k)) : null,
    setItem:(k, v) => { m.set(String(k), String(v)); }, removeItem:k => { m.delete(String(k)); }, clear:() => m.clear(), dump:() => Object.fromEntries(m)}; };
  Object.defineProperty(w, 'localStorage', {configurable:true, value:mem(cfg.store)});
  Object.defineProperty(w, 'sessionStorage', {configurable:true, value:mem()});
  const RD = w.Date; let now = cfg.now;
  class FD extends RD { constructor(...a){ if (a.length) super(...a); else super(now); } static now(){ return now; } }
  FD.parse = RD.parse; FD.UTC = RD.UTC; w.Date = FD; w.__setNow = t => { now = t; };
  let s = 0x2f6b1d3; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  try { const op = w.indexedDB.open.bind(w.indexedDB); w.indexedDB.open = (n, v) => op('relentless-test-' + cfg.n + '-' + n, v); } catch (e) {}
  w.__errs = []; w.addEventListener('error', e => w.__errs.push(String(e.message || e)));
  w.addEventListener('unhandledrejection', e => w.__errs.push('Promise: ' + String(e.reason && e.reason.message || e.reason)));
  const of = w.fetch.bind(w); w.fetch = (u, o) => { let url; try { url = new URL(typeof u === 'string' ? u : u.url, document.baseURI); } catch (e) { return Promise.reject(e); }
    if (url.origin !== cfg.origin) return Promise.reject(new TypeError('Netz im Test gesperrt: ' + url.origin)); return of(u, o); };
  w.__downloads = []; const blobs = new Map(), cu = w.URL.createObjectURL.bind(w.URL);
  w.URL.createObjectURL = b => { const u = cu(b); blobs.set(u, b); return u; };
  w.HTMLAnchorElement.prototype.click = function(){ if (this.download) w.__downloads.push({name:this.download, blob:blobs.get(this.href)}); };
  w.open = () => null; w.alert = () => {}; w.prompt = () => null; w.confirm = () => true; w.scrollTo = () => {};
}
/* Startet eine frische App. store: Inhalt des Speichers (z. B. von einem früheren Lauf), now: Uhrzeit */
async function boot({now = NOW0, store = null} = {}){
  const html = await appSource(), n = ++bootN;
  const pre = `<base href="${new URL('../public/', location.href).href}"><script>(${PRELUDE.toString()})(${JSON.stringify({now, store, n:RUN + '-' + n, origin:location.origin})});<\/script>`;
  const old = document.getElementById('app-frame'); if (old) old.remove();
  const f = document.createElement('iframe'); f.id = 'app-frame'; f.title = 'App unter Test';
  await new Promise((res, rej) => { f.onload = res; f.onerror = rej; f.srcdoc = html.replace('<head>', '<head>' + pre); document.getElementById('stage').appendChild(f); });
  const w = f.contentWindow;
  const app = {w, f,
    /* Ausdruck im globalen Bereich der App auswerten (sieht auch const/let wie S) */
    $:code => w.eval(code),
    errs:() => w.__errs.slice(),
    text:() => w.document.getElementById('app').innerText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
    store:() => w.localStorage.dump(),
    setNow:t => w.__setNow(t),
    tick:(ms = 0) => new Promise(r => setTimeout(r, ms)),
    page(k){ w.goPg(null); if (k) w.goPg(k); return app.text(); },
    async en(){ await w.i18nLoad(); w.setLang('en'); },
    noErrors(msg){ const e = w.__errs.filter(x => !/Netz im Test gesperrt/.test(x)); if (e.length) throw new Fail(`${msg || 'Laufzeitfehler'}: ${e.slice(0, 3).join(' | ')}`); }
  };
  return app;
}
/* Plan wie über die Planung anlegen: Standardwerte der App, darüber die Angaben des Szenarios */
function makePlan(app, d, subs){
  app.$(`S = load(true); S.d = Object.assign(S.d, ${JSON.stringify(d)}); S.step = 1;`);
  (subs || []).forEach(s => { app.$(`subForm = ${JSON.stringify({evId:'', dist:60, hm:'', ...s})}; subAdd();`); });
  app.w.finish();
  app.noErrors('Beim Anlegen des Plans');
}

/* ---------- Ablauf ---------- */
async function runAll({update = false, only = null} = {}){
  R.update = update; R.fresh = {}; R.results = [];
  const list = document.getElementById('list'), sum = document.getElementById('sum'); list.innerHTML = ''; sum.textContent = 'läuft …';
  const t0 = performance.now();
  for (const t of R.tests) {
    if (only && !only.test(t.file + ' ' + t.name)) continue;
    const li = document.createElement('li'); li.textContent = `${t.file} › ${t.name} …`; list.appendChild(li);
    const s0 = performance.now(); let err = null;
    try { await t.fn(); } catch (e) { err = e; }
    const ms = Math.round(performance.now() - s0), res = {file:t.file, name:t.name, ok:!err, ms, msg:err ? String(err instanceof Fail ? err.message : (err && err.stack) || err) : ''};
    R.results.push(res); li.className = res.ok ? 'ok' : 'bad';
    li.textContent = `${res.ok ? '✓' : '✗'} ${t.file} › ${t.name} (${ms} ms)`;
    if (!res.ok) { const pre = document.createElement('pre'); pre.textContent = res.msg; li.appendChild(pre); }
  }
  const old = document.getElementById('app-frame'); if (old) old.remove();
  if (update) {
    for (const [file, v] of Object.entries(R.fresh)) {
      /* Nur die gelaufenen Einträge ersetzen, die übrigen Vergleichsstände der Datei bleiben (wichtig bei ?nur=…) */
      const merged = only ? {...(await loadSnaps(file)), ...v} : v;
      const r = await fetch(`snapshots/${file}.json`, {method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(merged)});
      if (!r.ok) R.results.push({file, name:'Vergleichsstand schreiben', ok:false, msg:'HTTP ' + r.status + ' (läuft tests/serve.py?)'});
    }
    R.snaps = {};
  }
  try { if (indexedDB.databases) for (const d of await indexedDB.databases()) if (/^relentless-test-/.test(d.name)) indexedDB.deleteDatabase(d.name); } catch (e) {}
  /* Jede eingebundene Testdatei muss Tests angemeldet haben, sonst wurde sie nicht geladen (z. B. Verbindungsabbruch) */
  const files = [...document.querySelectorAll('script[src$=".test.js"]')].map(x => x.getAttribute('src').replace('.test.js', '')), have = new Set(R.tests.map(t => t.file));
  files.filter(f => !have.has(f)).forEach(f => R.results.push({file:f, name:'Testdatei geladen', ok:false, msg:`${f}.test.js wurde nicht geladen. Seite neu laden.`}));
  const bad = R.results.filter(r => !r.ok).length, n = R.results.length;
  sum.textContent = `${n - bad} von ${n} bestanden${bad ? `, ${bad} fehlgeschlagen` : ''}${update ? ' · Vergleichsstände neu geschrieben' : ''} · ${(Math.round(performance.now() - t0) / 1000).toFixed(1)} s`;
  sum.className = bad ? 'bad' : 'ok';
  return {passed:n - bad, failed:bad, results:R.results};
}

/* ---------- Bildschirmfotos für Berichte ----------
   Die App hat alle Styles und Schriften eingebettet. Deshalb lässt sich ihr DOM als SVG-foreignObject in ein Bild zeichnen
   und als PNG speichern (tests/serve.py legt es unter claude/bilder/ ab). Breite in CSS-Pixeln (375 = iPhone), 2× Auflösung. */
async function shot(app, name, {width = 375, height = 0, scale = 2} = {}){
  const f = app.f; f.style.width = width + 'px'; f.parentNode.style.width = width + 'px'; await app.tick(60);
  const d = app.w.document, h = height || Math.min(4000, d.documentElement.scrollHeight);
  const html = new XMLSerializer().serializeToString(d.documentElement).replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/:root/g, 'html'); /* im Bild ist :root das SVG-Element, die Design-Variablen hängen aber an <html> */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = width * scale; c.height = h * scale; const g = c.getContext('2d'); g.scale(scale, scale); g.fillStyle = app.w.getComputedStyle(d.body).backgroundColor; g.fillRect(0, 0, width, h); g.drawImage(img, 0, 0);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const r = await fetch(`../claude/bilder/${name}.png`, {method:'PUT', body:blob}); if (!r.ok) throw new Fail('Bild nicht gespeichert: HTTP ' + r.status);
  f.style.width = ''; f.parentNode.style.width = ''; return `claude/bilder/${name}.png`;
}
