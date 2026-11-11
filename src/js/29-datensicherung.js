/* ---------- Datensicherung ----------
   1 Vollständige Sicherungsdatei (v2): Zustand, alle Pläne, Einstellungen, Fahrten, Bestwerte, Hinweis-Einstellungen;
     Garmin-Schlüssel nur auf Wunsch. Laden: „Alles wiederherstellen“ oder „Nur Pläne hinzufügen“. v1-Dateien bleiben lesbar.
   2 Zweite Kopie im Gerät: Spiegel in IndexedDB, dauerhafter Speicher angefordert. Fehlt der normale Speicher, wird automatisch
     aus dem Spiegel wiederhergestellt.
   3 Tägliche Schnappschüsse (die letzten 7) in IndexedDB, wiederherstellbar unter „Meine Pläne“.
   4 Vor Zurücksetzen, Plan löschen und Sicherung laden: automatischer Schnappschuss und „Rückgängig“.
   5 Erinnerung nach wichtigen Änderungen (neuer oder angepasster Plan, 5 neue Bewertungen) oder spätestens nach 14 Tagen. */
const BK_SIDE = ['relentless.dyk', 'relentless.gmtip', 'relentless.inst.hide', 'relentless.stats.off'], BK_GK = 'relentless.garmin.key';
let bkImp = null, bkUndo = null, bkList = null, bkAsk = null, bkMsg = '', bkTimer = null, bkReady = false;
/* Beim Laden der Seite festhalten, ob der normale Speicher leer war (bevor die App etwas hineinschreibt) */
const bkEmpty0 = (() => { try { return !localStorage.getItem(K) && !localStorage.getItem(LIBK); } catch (e) { elog(e); return false; } })();
const bkLS = k => { try { return localStorage.getItem(k); } catch (e) { elog(e); return null; } };
/* Rohdaten aus dem Speicher (Zeichenketten, unverändert) */
function bkRaw(withKey){
  const side = {}; BK_SIDE.forEach(k => { const v = bkLS(k); if (v != null) side[k] = v; });
  if (withKey) { const g = bkLS(BK_GK); if (g) side[BK_GK] = g; }
  return {state:bkLS(K), lib:bkLS(LIBK), side};
}
/* Wiederherstellen schreibt mehrere Schlüssel. Scheitert einer (z. B. Speicher voll), werden alle auf den alten Stand
   zurückgesetzt, damit nie ein Mischstand entsteht (F-12). */
function bkWriteRaw(r){
  const keys = [K, LIBK, REVK, BK_GK, ...BK_SIDE], old = {}; keys.forEach(k => { old[k] = bkLS(k); });
  try {
    if (r.state != null) localStorage.setItem(K, r.state); else localStorage.removeItem(K);
    if (r.lib != null) localStorage.setItem(LIBK, r.lib); else localStorage.removeItem(LIBK);
    BK_SIDE.forEach(k => localStorage.removeItem(k));
    Object.entries(r.side || {}).forEach(([k, v]) => { if (BK_SIDE.includes(k) || k === BK_GK) localStorage.setItem(k, v); });
    localStorage.setItem(REVK, String(+(old[REVK] || 0) + 1));
  } catch (e) {
    keys.forEach(k => { try { localStorage.removeItem(k); } catch (x) { elog(x); } });
    keys.forEach(k => { try { if (old[k] != null) localStorage.setItem(k, old[k]); } catch (x) { elog(x); } });
    throw e;
  }
}
const bkPlansOf = lib => { try { const o = typeof lib === 'string' ? JSON.parse(lib) : lib; return o && o.plans ? Object.keys(o.plans).length : 0; } catch (e) { elog(e); return 0; } };

/* ---------- IndexedDB ---------- */
function bkDb(){ return new Promise((res, rej) => { try { const r = indexedDB.open('relentless-backup', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('kv'); } catch (e) { elog(e); } }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function bkTx(mode, fn){ const db = await bkDb(); return new Promise((res, rej) => { const t = db.transaction('kv', mode), st = t.objectStore('kv'); let out; try { out = fn(st); } catch (e) { rej(e); } t.oncomplete = () => { db.close(); res(out && 'result' in out ? out.result : out); }; t.onerror = () => { db.close(); rej(t.error); }; }); }
const bkPut = (k, v) => bkTx('readwrite', st => st.put(v, k));
const bkGet = k => bkTx('readonly', st => st.get(k));
const bkDel = k => bkTx('readwrite', st => st.delete(k));
async function bkAll(){ const db = await bkDb(); return new Promise((res, rej) => { const out = [], t = db.transaction('kv', 'readonly'), c = t.objectStore('kv').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } }; t.oncomplete = () => { db.close(); res(out); }; t.onerror = () => { db.close(); rej(t.error); }; }); }

/* Spiegel nach jedem Speichern (gebündelt) und ein Schnappschuss pro Tag */
function bkMirrorSoon(){ clearTimeout(bkTimer); bkTimer = setTimeout(bkMirror, 1500); }
async function bkMirror(){
  if (!bkReady) return;
  try {
    const r = bkRaw(false); if (!r.state) return; await bkPut('mirror', {at:Date.now(), ...r});
    const day = iso(0), k = 'snap:d:' + day;
    if (bkPlansOf(r.lib) && !(await bkGet(k))) { await bkPut(k, {at:Date.now(), kind:'day', why:'Tägliche Sicherung', ...r}); await bkPrune(); }
  } catch (e) { elog(e); }
}
async function bkPrune(){
  try { const all = (await bkAll()).filter(([k]) => String(k).startsWith('snap:')), keep = (kind, n) => all.filter(([, v]) => v.kind === kind).sort((a, b) => b[1].at - a[1].at).slice(n).forEach(([k]) => bkDel(k));
    keep('day', 7); keep('pre', 8); } catch (e) { elog(e); }
}
/* Schnappschuss vor einer riskanten Aktion: Daten jetzt (synchron) erfassen, dann ablegen */
function bkPre(why){
  const r = bkRaw(false), k = 'snap:p:' + Date.now(); bkUndo = {k, why, at:Date.now()};
  const pr = bkPut(k, {at:Date.now(), kind:'pre', why, ...r}).then(bkPrune).catch(() => {}); bkList = null;
  return pr;
}
async function bkRestore(k){
  try { const v = await bkGet(k); if (!v) { bkMsg = 'Diese Sicherung gibt es nicht mehr.'; return render(); }
    const keep = bkLS(BK_GK); await bkPre('Vor dem Wiederherstellen'); bkWriteRaw({...v, side:{...(v.side || {}), ...(keep ? {[BK_GK]:keep} : {})}});
    try { track('sicherung-wiederhergestellt'); } catch (e) { elog(e); } location.reload();
  } catch (e) { elog(e); bkMsg = 'Wiederherstellen ist nicht möglich.'; render(); }
}
function bkUndoGo(){ if (bkUndo) bkRestore(bkUndo.k); }

/* ---------- Beim Start ---------- */
async function bkInit(){
  try { if (navigator.storage && navigator.storage.persist) { const p = await navigator.storage.persisted(); if (!p) navigator.storage.persist().catch(() => {}); } } catch (e) { elog(e); }
  try {
    /* Normaler Speicher leer, Spiegel vorhanden: automatisch wiederherstellen (einmal pro Sitzung) */
    if (bkEmpty0 && !sessionStorage.getItem('relentless.bk.auto')) {
      const m = await bkGet('mirror');
      if (m && m.state && bkPlansOf(m.lib)) { sessionStorage.setItem('relentless.bk.auto', '1'); bkWriteRaw({...m, side:{...(m.side || {}), ...(bkLS(BK_GK) ? {[BK_GK]:bkLS(BK_GK)} : {})}}); try { track('sicherung-automatisch'); } catch (e) { elog(e); } location.reload(); return; }
    }
  } catch (e) { elog(e); }
  bkReady = true; bkMirrorSoon();
}

/* ---------- Sicherungsdatei ---------- */
async function exportPlans(){
  save(); const raw = bkRaw(!!S.bkKey); if (storeErr || !raw.state) raw.state = JSON.stringify(S); if (!bkPlansOf(raw.lib) && !S.p) return;
  const body = {app:'relentless', v:3, exported:new Date().toISOString(), active:(readLib().active || null), state:JSON.parse(raw.state || 'null'), lib:JSON.parse(raw.lib || 'null'), side:raw.side, plans:Object.values(readLib().plans)};
  const data = new TextEncoder().encode(JSON.stringify(body));
  try { await saveFile('relentless-sicherung-' + iso(0) + '.json', data); track('sicherung-gespeichert'); impMsg = 'Sicherung gespeichert: Pläne, Einstellungen und Fahrten' + (S.bkKey ? ', mit Garmin-Schlüssel' : '') + '.'; S.bkAt = Date.now(); S.bkChg = 0; S.bkEx = bkExeN(); try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { elog(e); } }
  catch (e) { impMsg = e && e.code === 'declined' ? '' : 'Sicherung nicht möglich.'; }
  render();
}
function importPlans(inp){
  const f = inp.files && inp.files[0]; if (!f) return; if (f.size > BK_MAX) { impMsg = 'Die Datei ist zu groß für eine Relentless-Sicherung.'; inp.value = ''; return render(); } const r = new FileReader();
  r.onload = () => { try {
    const o = bkParse(r.result);
    bkImp = {o, name:f.name, full:o.v >= 2 && !!o.state, n:o.plans.filter(e => e && e.snap && e.snap.p && e.snap.p.goal).length, date:o.exported ? fmt(String(o.exported).slice(0, 10)) : ''};
  } catch (e) { impMsg = (e && e.message) || 'Die Datei ist keine gültige Relentless-Sicherung.'; } inp.value = ''; render(); };
  r.readAsText(f);
}
function bkAddPlans(){
  const o = bkImp.o; bkImp = null; bkPre('Vor dem Laden einer Sicherung');
  const lib = readLib(); let n = 0; o.plans.forEach(e => { if (e && e.snap && e.snap.p && e.snap.p.goal) { const id = uid(); lib.plans[id] = {id, name:String(e.name || planName(e.snap.p)).slice(0, 60), created:e.created || Date.now(), updated:Date.now(), snap:e.snap}; n++; } });
  try { localStorage.setItem(LIBK, JSON.stringify(lib)); } catch (e) { elog(e); storeErr = true; }
  impMsg = n ? n + (n === 1 ? ' Plan' : ' Pläne') + ' aus der Sicherung hinzugefügt.' : 'Keine Pläne in der Datei gefunden.'; try { track('sicherung-geladen'); } catch (e) { elog(e); } render();
}
async function bkReplaceAll(){
  const o = bkImp.o; bkImp = null; const keep = bkLS(BK_GK); await bkPre('Vor dem Wiederherstellen einer Sicherung');
  const side = {...(o.side || {})}; if (!side[BK_GK] && keep) side[BK_GK] = keep;
  try { bkWriteRaw({state:JSON.stringify(o.state), lib:JSON.stringify(o.lib || {v:1, active:o.active || null, plans:Object.fromEntries(o.plans.map(e => [e.id, e]))}), side}); try { track('sicherung-geladen'); } catch (e) { elog(e); } location.reload(); }
  catch (e) { elog(e); impMsg = 'Wiederherstellen ist nicht möglich (Speicher voll oder blockiert).'; render(); }
}
function bkModal(){
  if (bkImp) {
    const i = bkImp;
    return `<div class="exov" onclick="if(event.target===this){bkImp=null;render()}" role="dialog" aria-modal="true" aria-label="Sicherung laden"><div class="exbox" style="max-width:440px">
      <p class="eyebrow mb-2">Sicherung laden</p><h3 class="hd text-2xl font-semibold">Was soll passieren?</h3>
      <p class="mt-2 text-sm" style="color:var(--mute)"><span data-noi18n>${esc(i.name)}</span>${i.date ? ' · ' + i.date : ''} · ${i.n} ${i.n === 1 ? 'Plan' : 'Pläne'}${i.full ? ' mit Einstellungen und Fahrten' : ''}</p>
      <div class="mt-4 space-y-2">
        ${i.full ? `<button class="btn w-full text-left" onclick="bkReplaceAll()">Alles wiederherstellen<span class="block text-xs font-normal" style="opacity:.85">Ersetzt Pläne, Einstellungen und Fahrten auf diesem Gerät durch den Stand der Sicherung.</span></button>` : ''}
        <button class="${esc(i.full ? 'ghost' : 'btn')} w-full text-left" onclick="bkAddPlans()">Nur Pläne hinzufügen<span class="block text-xs font-normal" style="opacity:.85">Deine jetzigen Pläne und Einstellungen bleiben, die Pläne aus der Datei kommen dazu.</span></button>
        <button class="ghost w-full" onclick="bkImp=null;render()">Abbrechen</button></div>
      <p class="mt-3 text-xs" style="color:var(--mute)">Vorher speichert die App den jetzigen Stand im Gerät. Du kannst es also rückgängig machen.</p></div></div>`;
  }
  if (bkAsk) return `<div class="exov" onclick="if(event.target===this){bkAsk=null;render()}" role="dialog" aria-modal="true" aria-label="Früheren Stand wiederherstellen"><div class="exbox" style="max-width:420px">
      <h3 class="hd text-2xl font-semibold">Früheren Stand wiederherstellen?</h3>
      <p class="mt-2 text-sm">Die App kehrt zum Stand vom <b>${bkWhen(bkAsk.at)}</b> zurück. Alles, was du danach geändert hast, ersetzt sie. Den jetzigen Stand sichert sie vorher, du kannst also zurück.</p>
      <div class="mt-4 flex flex-wrap gap-2"><button class="btn !w-auto" onclick="bkRestore('${ja(bkAsk.k)}')">Wiederherstellen</button><button class="ghost" onclick="bkAsk=null;render()">Abbrechen</button></div></div></div>`;
  return '';
}
const bkWhen = t => { const d = new Date(t); return fmt(lstr(d)) + ', ' + d.toTimeString().slice(0, 5) + ' Uhr'; };
function bkUndoBar(){
  if (!bkUndo || Date.now() - bkUndo.at > 10 * 60e3) return '';
  return `<div class="flex items-center gap-2 text-sm" role="status" style="background:var(--tint);border:1px solid var(--ice);padding:8px 10px 8px 14px;margin:10px 16px 0;color:var(--ink)"><span class="min-w-0 flex-1">Vorheriger Stand gesichert (${esc(bkUndo.why.replace(/^Vor dem /, '').replace(/^Vor /, ''))}).</span><button class="ghost !px-3 !py-1 text-sm" onclick="bkUndoGo()">Rückgängig</button><button class="text-sm" style="color:var(--mute);padding:4px 6px;background:none;border:0" aria-label="Hinweis schließen" onclick="bkUndo=null;render()">✕</button></div>`;
}

/* ---------- Automatische Sicherungen im Gerät (Liste unter „Meine Pläne“) ---------- */
async function bkLoadList(){ try { bkList = (await bkAll()).filter(([k]) => String(k).startsWith('snap:')).map(([k, v]) => ({k, at:v.at, kind:v.kind, why:v.why, n:bkPlansOf(v.lib)})).sort((a, b) => b.at - a.at); } catch (e) { elog(e); bkList = []; } render(); }
function bkLocalUi(){
  if (bkList === null) { bkList = []; bkLoadList(); }
  const rows = bkList.slice(0, 12).map(s => `<div class="flex items-center gap-2 py-1.5 text-sm" style="border-top:1px solid var(--line)"><span class="min-w-0 flex-1"><span class="block">${bkWhen(s.at)}</span><span class="block text-xs" style="color:var(--mute)">${esc(s.why || '')} · ${s.n} ${s.n === 1 ? 'Plan' : 'Pläne'}</span></span><button class="ghost !px-3 !py-1 text-sm" onclick='bkAsk=${JSON.stringify({k:s.k, at:s.at})};render()'>Wiederherstellen</button></div>`).join('');
  return `<div class="mt-4"><p class="font-semibold">Automatische Sicherungen im Gerät</p><p class="mt-1 text-xs" style="color:var(--mute)">Die App legt jeden Tag und vor riskanten Aktionen (Zurücksetzen, Plan löschen, Sicherung laden) einen Stand im Gerät ab. Damit kannst du Fehler rückgängig machen. Schützt nicht, wenn du die App löschst oder das Handy wechselst: Dafür brauchst du die Sicherungsdatei.</p>${rows ? `<div class="mt-2">${rows}</div>` : '<p class="mt-2 text-xs" style="color:var(--mute)">Noch keine. Die erste entsteht heute automatisch.</p>'}${bkMsg ? `<p class="mt-2 text-sm" style="color:#c0392b">${esc(bkMsg)}</p>` : ''}</div>`;
}
function bkKeyUi(){
  if (!bkLS(BK_GK)) return '';
  return `<div class="mt-3 flex flex-wrap items-center gap-2 text-sm"><span style="color:var(--mute)">Garmin-Schlüssel in die Sicherungsdatei aufnehmen?</span>${chip('Nein', !S.bkKey, 'S.bkKey=false;save();render()')}${chip('Ja', !!S.bkKey, 'S.bkKey=true;save();render()')}</div>${S.bkKey ? '<p class="mt-1 text-xs" style="color:#9a6a00">Mit Schlüssel kann jeder, der die Datei hat, deine Garmin-Aktivitäten lesen. Bewahre sie sicher auf.</p>' : ''}`;
}

/* ---------- Erinnerung ---------- */
const bkExeN = () => { try { return Object.keys((S.p && S.p.exe) || {}).length; } catch (e) { elog(e); return 0; } };
function bkReason(){
  if (!S.p) return null; const now = Date.now(), last = S.bkAt || 0, snooze = S.bkSnooze || 0;
  if (now - snooze < 3 * 864e5) return null;
  if (!last) return now - (S.bkAt0 || now) > 2 * 864e5 ? 'Deine Pläne, Einstellungen und Fahrten liegen nur auf diesem Gerät.' : null;
  if ((S.bkChg || 0) > 0) return 'Du hast deinen Plan seit der letzten Sicherung geändert.';
  if (bkExeN() - (S.bkEx || 0) >= 5) return `Seit der letzten Sicherung sind ${bkExeN() - (S.bkEx || 0)} Fahrten bewertet worden.`;
  if (now - last >= 14 * 864e5) return `Deine letzte Sicherung ist ${Math.floor((now - last) / 864e5)} Tage alt.`;
  return null;
}
function bkHint(){
  const now = Date.now(); if (!S.bkAt0) { S.bkAt0 = now; try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { elog(e); } }
  const why = bkReason(); if (!why) return '';
  const ios = typeof instOs === 'function' && instOs() === 'ios';
  return `<section class="panel p-4" style="border-left:4px solid var(--ice)"><p class="font-semibold">Zeit für eine Sicherung</p><p class="mt-1 text-sm" style="color:var(--mute)">${why} Speichere eine Sicherungsdatei, dann geht auch bei einem neuen Handy nichts verloren.${ios ? ' Tipp: Wähle danach „In Dateien sichern“ und dann iCloud Drive.' : ''}</p><div class="mt-3 flex gap-2"><button class="btn !py-2" onclick="exportPlans()">Jetzt sichern</button><button class="ghost !py-2" onclick="S.bkSnooze=Date.now();save();render()">Später</button></div></section>`;
}
function bkMarkChange(){ S.bkChg = (S.bkChg || 0) + 1; }

