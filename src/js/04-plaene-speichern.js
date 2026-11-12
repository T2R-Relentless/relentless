/* ---------- Mehrere Pläne speichern ---------- */
const LIBK = 'kurbelwerk.plans.v1', PLAN_KEYS = ['p','wk','plan','done','ov','blocked','log','actual','handled','note','pending','pendInfo','v','strDone','mobDone','npDays'];
let storeErr = false, renId = null, renVal = '', delId = null, impMsg = '';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
let libRaw0 = null, libClean0 = null;
const readLibRaw = () => { try { const o = JSON.parse(localStorage.getItem(LIBK)); if (o && o.plans && typeof o.plans === 'object') return o; } catch (e) { elog(e); } return {v:1, active:null, plans:{}}; };
/* Bibliothek nur gesäubert herausgeben (F-01); das Ergebnis wird pro Rohtext zwischengespeichert */
const readLib = () => { try { const raw = localStorage.getItem(LIBK); if (raw !== libRaw0) { libRaw0 = raw; const o = raw ? secC(JSON.parse(raw)) : null; libClean0 = o && o.plans && typeof o.plans === 'object' ? JSON.stringify(o) : null; } if (libClean0) return JSON.parse(libClean0); } catch (e) { elog(e); libRaw0 = null; } return {v:1, active:null, plans:{}}; };
const planName = p => p.goal === 'event' ? (p.eventName || 'Event-Plan') : p.goal === 'ftp' ? 'FTP-Ziel ' + p.ftpTarget + ' W' : ({endur:'Ausdauer: ' + (p.ftour ? hm2(p.ftour) + '-Std.-Tour' : 'lange Touren'), speed:'Schneller werden', health:'Fit und gesund', restart:'Wiedereinstieg'}[p.ffocus] || 'Fitness') + ' bis ' + fmt(p.endDate);
const snapOf = () => { const o = {}; PLAN_KEYS.forEach(k => { if (S[k] !== undefined) o[k] = S[k]; }); return JSON.parse(JSON.stringify(o)); };
function writeLib(){
  if (!S.p) return; if (!S.pid) { S.pid = uid(); S.pname = S.pname || planName(S.p); }
  const lib = readLibRaw(), old = lib.plans[S.pid] || {};
  lib.plans[S.pid] = {id:S.pid, name:S.pname || planName(S.p), manual:!!S.pnameManual, created:old.created || Date.now(), updated:Date.now(), snap:snapOf()}; lib.active = S.pid;
  localStorage.setItem(LIBK, JSON.stringify(lib));
}
function applySnap(snap){ PLAN_KEYS.forEach(k => delete S[k]); Object.assign(S, secC(JSON.parse(JSON.stringify(snap)))); S.done = S.done || {}; S.log = S.log || []; S.blocked = S.blocked || {}; S.actual = S.actual || {}; }
function resetView(){ open = null; vw = null; askReset = false; renId = null; delId = null; impMsg = ''; }
function switchTo(id){
  save(); const e = readLib().plans[id]; if (!e) return;
  applySnap(e.snap); S.pid = id; S.pname = e.name; S.pnameManual = !!e.manual; S.newFrom = null; S.edit = false; S.step = 0; resetView(); save(); render(); scrollTop0();
}
function newPlan(){
  save(); const src = S.p || S.d || {}, keep = load(true).d; ['weight', 'ftp', 'sex', 'cycMode', 'cycLast', 'cycLen', 'cycSym', 'cycAdapt', 'hrMax', 'lthr', 'noPwr', 'lvl', 'strPlace', 'strLvl'].forEach(k => { if (src[k] != null) keep[k] = src[k]; }); keep.mode = null;
  S.newFrom = S.pid || null; PLAN_KEYS.forEach(k => delete S[k]); S.p = null; S.plan = null; S.done = {}; S.log = []; S.blocked = {}; S.actual = {}; S.note = '';
  S.pid = null; S.pname = ''; S.pnameManual = false; S.d = keep; S.edit = false; S.step = 1; resetView(); save(); render(); scrollTop0();
}
function cancelNew(){ const id = S.newFrom; S.newFrom = null; if (id && readLib().plans[id]) switchTo(id); else { S.step = 1; save(); render(); } }
function startRename(id){ renId = id; renVal = readLib().plans[id].name; render(); }
function setRen(v){ renVal = v; }
function doRename(id){ const n = renVal.trim().slice(0, 60); if (n) { const lib = readLib(); if (lib.plans[id]) { lib.plans[id].name = n; lib.plans[id].manual = true; try { localStorage.setItem(LIBK, JSON.stringify(lib)); } catch (e) { elog(e); storeErr = true; } if (S.pid === id) { S.pname = n; S.pnameManual = true; save(); } } } renId = null; render(); }
function dupPlan(id){ save(); const lib = readLib(), e = lib.plans[id]; if (!e) return; const nid = uid(); lib.plans[nid] = {...JSON.parse(JSON.stringify(e)), id:nid, name:(e.name + ' (Kopie)').slice(0, 60), created:Date.now(), updated:Date.now()}; try { localStorage.setItem(LIBK, JSON.stringify(lib)); } catch (x) { elog(x); storeErr = true; } render(); }
function askDelPlan(id){ delId = id; render(); }
function doDelPlan(id){
  bkPre('Vor dem Löschen eines Plans');
  const lib = readLib(); delete lib.plans[id]; const rest = Object.values(lib.plans).sort((a, b) => b.updated - a.updated);
  try { localStorage.setItem(LIBK, JSON.stringify(lib)); } catch (e) { elog(e); storeErr = true; } delId = null;
  if (S.pid === id) { if (rest.length) { S.pid = null; applySnap(rest[0].snap); S.pid = rest[0].id; S.pname = rest[0].name; S.step = 0; resetView(); save(); } else { const f = load(true); PLAN_KEYS.forEach(k => delete S[k]); S.p = null; S.plan = null; S.done = {}; S.log = []; S.pid = null; S.pname = ''; S.d = f.d; S.step = 1; S.edit = false; S.newFrom = null; save(); } }
  render();
}
async function exportPlansV1(){
  save(); const lib = readLib(); if (!Object.keys(lib.plans).length) return;
  const data = new TextEncoder().encode(JSON.stringify({app:'relentless', v:1, exported:new Date().toISOString(), active:lib.active, plans:Object.values(lib.plans)}, null, 1));
  try { await saveFile('relentless-plaene-' + iso(0) + '.json', data); impMsg = 'Sicherung gespeichert.'; S.bkAt = Date.now(); try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { elog(e); } } catch (e) { impMsg = e && e.code === 'declined' ? '' : 'Sicherung nicht möglich.'; } render();
}
function importPlansV1(inp){
  const f = inp.files && inp.files[0]; if (!f) return; if (f.size > BK_MAX) { impMsg = 'Die Datei ist zu groß für eine Relentless-Sicherung.'; inp.value = ''; return render(); } const r = new FileReader();
  r.onload = () => { try {
    const o = bkParse(r.result);
    const lib = readLib(); let n = 0; o.plans.forEach(e => { if (e && e.snap && e.snap.p && e.snap.p.goal) { const id = uid(); lib.plans[id] = {id, name:String(e.name || planName(e.snap.p)).slice(0, 60), created:e.created || Date.now(), updated:Date.now(), snap:e.snap}; n++; } });
    localStorage.setItem(LIBK, JSON.stringify(lib)); impMsg = n ? n + (n === 1 ? ' Plan' : ' Pläne') + ' aus der Sicherung hinzugefügt.' : 'Keine Pläne in der Datei gefunden.';
  } catch (e) { impMsg = (e && e.message) || 'Die Datei ist keine gültige Relentless-Sicherung.'; } inp.value = ''; render(); };
  r.readAsText(f);
}
function plansCard(){
  save(); const lib = readLib(), list = Object.values(lib.plans).sort((a, b) => a.created - b.created);
  const rows = list.map(e => {
    const p = e.snap.p, tot = phases(p).slice(-1)[0].to, act = e.id === S.pid, goal = p.goal === 'event' ? 'Event am ' + fmt(p.eventDate) : p.goal === 'ftp' ? 'FTP-Ziel bis ' + fmt(p.endDate) : 'Fitness bis ' + fmt(p.endDate);
    const name = renId === e.id ? `<div class="flex gap-2"><input class="inp" value="${esc(renVal)}" maxlength="60" oninput="setRen(this.value)"><button class="btn !px-3" onclick="doRename('${ja(e.id)}')">OK</button></div>` : `<div class="flex items-center gap-2"><span class="font-semibold" data-noi18n>${esc(e.name)}</span>${act ? '<span class="rounded-full px-2 text-xs font-semibold" style="background:var(--ice);color:#071747">Aktiv</span>' : ''}</div>`;
    const del = delId === e.id ? `<div class="mt-2 flex flex-wrap items-center gap-2 text-sm"><span style="color:#7a1f17">Plan „${esc(e.name)}“ endgültig löschen?</span><button class="ghost !px-3 !py-1.5" onclick="doDelPlan('${ja(e.id)}')">Ja, löschen</button><button class="ghost !px-3 !py-1.5" onclick="askDelPlan(null)">Abbrechen</button></div>` : `<div class="mt-2 flex flex-wrap gap-2">${act ? `<button class="btn !w-auto !px-3 !py-1.5 text-sm" onclick="edit()">Plan anpassen</button>` : `<button class="ghost !px-3 !py-1.5 text-sm" onclick="switchTo('${ja(e.id)}')">Öffnen</button>`}<button class="ghost !px-3 !py-1.5 text-sm" onclick="startRename('${ja(e.id)}')">Umbenennen</button><button class="ghost !px-3 !py-1.5 text-sm" onclick="dupPlan('${ja(e.id)}')">Kopie</button><button class="ghost !px-3 !py-1.5 text-sm" onclick="askDelPlan('${ja(e.id)}')">Löschen</button></div>`;
    return `<div class="rounded-xl p-3" style="background:${esc(act ? 'var(--tint)' : '#fff')};border:1px solid ${esc(act ? 'var(--ice)' : 'var(--line)')}">${name}<div class="mt-1 text-sm" style="color:var(--mute)">${goal}, Woche ${curWeek(p)} von ${tot}, ${p.ftp} W</div>${del}</div>`;
  }).join('');
  const inner = `<div class="space-y-2.5">${rows}</div>
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn" onclick="newPlan()">Neuen Plan erstellen</button><button class="ghost" onclick="exportPlans()">Sicherung speichern</button><label class="ghost cursor-pointer">Sicherung laden<input type="file" accept=".json,application/json" class="hidden" style="display:none" onchange="importPlans(this)"></label></div>
    ${impMsg ? `<p class="mt-2 text-sm" style="color:var(--ok)">${esc(impMsg)}</p>` : ''}
    ${storeErr ? '<p class="mt-2 text-sm" style="color:#c0392b">Speichern im Browser ist nicht möglich (privater Modus oder blockierte Daten). Speichere eine Sicherung.</p>' : ''}
    <p class="mt-3 text-xs" style="color:var(--mute)">Deine Daten liegen nur auf diesem Gerät. Die Sicherungsdatei (.json) enthält alles: Pläne, Einstellungen, Fahrten und Bestwerte. Lade sie auf einem neuen Handy unter „Sicherung laden“ und wähle „Alles wiederherstellen“. <button class="underline" onclick="reset()">Alles zurücksetzen</button></p>${bkKeyUi()}${bkLocalUi()}`;
  return `<p class="mb-3 text-sm" style="color:var(--mute)">Ziel, Termin, Trainingszeiten oder Fitnesswerte ändern: Tippe beim aktiven Plan auf „Plan anpassen“. Dein Fortschritt bleibt erhalten.</p>` + fold('plans', 'Meine Pläne (' + list.length + ')', inner, true);
}
let S = load(), busy = null, open = null, flashIdx = null, vw = null;

