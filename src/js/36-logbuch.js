/* ---------- Backlog 07.11.2026, Punkt 2 (F5): Trainingslogbuch ----------
   Alle Fahrten, geplante wie zusätzliche, auch aus früheren Wochen und Plänen. Fahrtdaten kommen aus dem Fahrtenarchiv
   (S.arch). Bewertungen werden beim Entstehen dauerhaft in S.lb festgehalten (je Fahrt-ID), damit sie einen Planwechsel
   überstehen und Teil der Sicherung sind. Höchstens LB_MAX Einträge, die ältesten fallen zuerst weg. */
const LB_MAX = 1200;
let lbF = 'all', lbPid = '', lbSel = null;
const lbTxt = v => String(v == null ? '' : v).slice(0, 700);
/* Bewertung einer geplanten Einheit (p.exe) bzw. einer zusätzlichen Fahrt (p.extra) in einen Logbuch-Eintrag übersetzen */
function lbFromExe(e, w, i, pid){
  const x = e.x || {};
  return {k:'p', day:(e.a && e.a.day) || e.day || null, w, i, n:lbTxt(e.plan || x.n), t:x.t || null, score:e.score != null ? e.score : null, grade:lbTxt(e.grade), verdict:e.verdict || null,
    msgs:(e.msgs || []).slice(0, 10).map(lbTxt), adj:lbTxt(e.adj), ftp:e.ftp || null, sm:x.m || null, am:e.sec ? Math.round(e.sec / 60) : null, hr:e.hrAvg || null, np:e.np || null,
    mv:x.moved && x.from != null ? x.from : null, vo:x.varOf ? lbTxt(x.varOf) : null, pid:pid || null, at:e.at || Date.now(), px:lbUnit(x)};
}
/* F24: Aufbau der geplanten Einheit kompakt festhalten, damit das Soll-Profil auch nach Planwechseln gezeichnet werden kann */
function lbUnit(x){
  if (!x || !(x.m > 0)) return null; const iv = v => v ? Object.fromEntries(Object.entries(v).filter(([, y]) => typeof y === 'number' || (Array.isArray(y) && y.every(z => typeof z === 'number')))) : undefined;
  const o = {t:x.t || null, m:x.m, lo:x.lo || null, hi:x.hi || null, cad:x.cad ? lbTxt(x.cad).slice(0, 30) : null, n:lbTxt(x.n).slice(0, 80)};
  if (x.iv) o.iv = iv(x.iv); if (x.fin) o.fin = iv(x.fin); if (x.subPrio) o.subPrio = x.subPrio; if (x.t === 'test') o.st = lbTxt(x.st).slice(0, 300);
  if (x.parts) o.parts = x.parts.map(q => ({lbl:lbTxt(q.lbl).slice(0, 20), m:q.m, lo:q.lo || null, hi:q.hi || null, ...(q.iv ? {iv:iv(q.iv)} : {})}));
  return o;
}
function lbFromExtra(e, pid){
  return {k:'x', day:e.day || null, w:e.w != null ? e.w : null, i:e.i != null ? e.i : null, n:lbTxt(e.n), t:null, score:null, grade:'', verdict:null, cls:e.cls || 'z2',
    msgs:(e.msgs || []).slice(0, 10).map(lbTxt), adj:lbTxt(e.adj), prop:e.prop ? lbTxt(e.prop.text) : '', propSt:e.prop ? (e.prop.st || 'open') : '', ftp:(S.p && S.p.ftp) || null, sm:null, am:e.sec ? Math.round(e.sec / 60) : null,
    hr:e.hrAvg || null, np:e.np || null, mv:null, vo:null, pid:pid || null, at:e.at || Date.now()};
}
/* Bewertungen aus dem laufenden Plan (immer aktuell) und aus gespeicherten Plänen (nur fehlende) übernehmen */
function lbSync(withLib){
  try {
    S.lb = S.lb && typeof S.lb === 'object' ? S.lb : {};
    const take = (p, pid, over) => { if (!p) return;
      Object.entries(p.exe || {}).forEach(([key, e]) => { if (!e || !e.rid) return; const [w, i] = key.split('-').map(Number); if (!over && S.lb[e.rid] && !S.lb[e.rid].px && e.x) S.lb[e.rid].px = lbUnit(e.x); if (!(over || !S.lb[e.rid])) return;
        const n = lbFromExe(e, w, i, pid), prev = S.lb[e.rid], px = over && p === S.p && w === S.wk && S.plan ? S.plan[i] : null;
        /* Verschiebung und Variante stehen an der Einheit im Wochenplan, nicht in der Bewertung: übernehmen und behalten */
        if (px) { if (px.moved && px.from != null) n.mv = px.from; if (px.varOf) n.vo = lbTxt(px.varOf); }
        if (prev) { if (n.mv == null && prev.mv != null) n.mv = prev.mv; if (!n.vo && prev.vo) n.vo = prev.vo; }
        S.lb[e.rid] = n; });
      Object.values(p.extra || {}).forEach(e => { if (!e || !e.id) return; if (over || !S.lb[e.id]) S.lb[e.id] = lbFromExtra(e, pid); }); };
    if (withLib) { try { const lib = readLib(); Object.values(lib.plans || {}).forEach(pl => { if (pl && pl.snap) take(pl.snap.p, pl.id, false); }); } catch (e) { elog(e); } }
    take(S.p, S.pid, true);
    const ks = Object.keys(S.lb); if (ks.length > LB_MAX) ks.sort((a, b) => (S.lb[a].at || 0) - (S.lb[b].at || 0)).slice(0, ks.length - LB_MAX).forEach(k => { delete S.lb[k]; });
  } catch (e) { elog(e); }
}
/* Fahrten fürs Logbuch: Archiv plus laufende Liste, neueste zuerst */
function lbRides(){
  try { rcArchSync(); } catch (e) { elog(e); }
  const m = new Map();
  (S.arch || []).forEach(a => m.set(a.id, {id:a.id, day:a.d, n:a.n, km:a.km || 0, sec:a.sec || 0, hm:a.hm || 0, tss:a.tss || 0, np:a.np || 0, in:a.in ? 1 : 0, hmDev:a.hmDev ? 1 : 0}));
  (S.man || []).forEach(a => { const o = m.get(a.id) || {}; m.set(a.id, {...o, id:a.id, day:a.day, n:a.n, km:a.km || 0, sec:a.sec || 0, hm:a.hm || 0, tss:a.tss || 0, np:a.np || 0, hr:a.hrAvg || null, ts:a.ts, in:a.in || o.in ? 1 : 0, hmDev:a.hmDev || o.hmDev ? 1 : 0}); });
  return [...m.values()].filter(a => a.day).sort((a, b) => (b.day + (b.ts || '')).localeCompare(a.day + (a.ts || '')));
}
const lbKind = id => { const l = S.lb && S.lb[id]; return l ? l.k : ''; };
function lbDot(id){
  const l = S.lb && S.lb[id];
  if (!l) return ['#9aa7b8', 'ohne Bewertung'];
  if (l.k === 'x') { const c = XR_CLS[l.cls] || XR_CLS.z2; return [c[1], c[0]]; }
  if (l.score == null) return ['#9aa7b8', l.grade || 'bewertet'];
  return [l.score >= 80 ? '#0a8f6a' : l.score >= 60 ? '#d9a400' : '#c0392b', `${l.score}/100`];
}
/* Montag der Kalenderwoche eines Datums */
const lbMon = ds => { const d = new Date(ds + 'T12:00:00'), k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return lstr(d); };
function lbPlans(){
  const names = {}; try { const lib = readLib(); Object.values(lib.plans || {}).forEach(pl => { if (pl && pl.id) names[pl.id] = pl.name || 'Plan'; }); } catch (e) { elog(e); }
  if (S.pid) names[S.pid] = S.pname || names[S.pid] || 'Aktueller Plan';
  const used = new Set(Object.values(S.lb || {}).map(l => l.pid).filter(Boolean));
  return [...used].map(id => [id, names[id] || 'Früherer Plan']);
}
function lbPage(){
  lbSync(true);
  /* F11: Kraft-, Mobilitäts- und Stabilitätseinheiten (Sequenz) stehen als geplante Einheiten mit im Logbuch */
  const SS = Object.entries(S.lb || {}).filter(([, l]) => l && l.k === 's' && l.day).map(([id, l]) => ({id, day:l.day, n:l.n, km:0, sec:l.sec || 0, hm:0, sq:1, ts:'T99'}));
  let L = lbRides().concat(SS).sort((a, b) => (b.day + (b.ts || '')).localeCompare(a.day + (a.ts || '')));
  if (lbF === 'plan') L = L.filter(a => lbKind(a.id) === 'p' || lbKind(a.id) === 's'); else if (lbF === 'x') L = L.filter(a => lbKind(a.id) === 'x');
  if (lbPid) L = L.filter(a => S.lb[a.id] && S.lb[a.id].pid === lbPid);
  /* F18: Balken angetippt → nur diese Woche bzw. diesen Monat */
  if (lbCh.sel) L = L.filter(a => lbPerKey(lbCh.mode, a.day) === lbCh.sel);
  if (!lbCh.roll) L = L.filter(a => !a.in);
  const chip = (k, l) => `<button class="${lbF === k ? 'btn' : 'ghost'} !w-auto !px-3 !py-2 text-sm" style="min-height:44px" aria-pressed="${lbF === k}" onclick="lbF='${ja(k)}';render()">${l}</button>`;
  const pl = lbPlans();
  const sel = pl.length > 1 ? `<select class="inp !w-auto !py-2 text-sm" style="min-height:44px" aria-label="Nach Plan filtern" onchange="lbPid=this.value;render()"><option value="">Alle Pläne</option>${pl.map(([id, n]) => `<option value="${esc(id)}"${lbPid === id ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : '';
  if (!L.length) return lbHintUi() + (lbRides().length ? lbChart() : '') + `<section class="panel p-4"><div class="flex flex-wrap gap-2">${chip('all', 'Alle')}${chip('plan', 'Geplant')}${chip('x', 'Zusätzlich')}${sel}</div><p class="mt-3 text-sm" style="color:var(--mute)">${lbF === 'all' && !lbPid ? 'Noch keine Fahrten. Lade Fahrten hoch oder verbinde Garmin, dann erscheinen sie hier mit ihrer Bewertung.' : 'Keine Fahrten für diesen Filter.'}</p></section>`;
  const groups = []; L.forEach(a => { const mo = lbMon(a.day), g = groups[groups.length - 1]; if (g && g.mo === mo) g.l.push(a); else groups.push({mo, l:[a]}); });
  const head = g => { const R = g.l.filter(a => !a.sq), nS = g.l.length - R.length, s = R.reduce((o, a) => ({km:o.km + a.km, sec:o.sec + a.sec, hm:o.hm + a.hm}), {km:0, sec:0, hm:0}), e = new Date(g.mo + 'T12:00:00'); e.setDate(e.getDate() + 6);
    return `<div class="flex items-baseline gap-2 px-1 pt-3 text-xs" style="color:var(--mute)"><span class="eyebrow">Woche ab ${fmt(g.mo)}</span><span class="flex-1 text-right">${R.length ? `<span>${R.length} ${R.length === 1 ? 'Fahrt' : 'Fahrten'} · ${Math.round(s.km).toLocaleString('de-DE')} km · ${mm(Math.round(s.sec / 60))} · ${Math.round(s.hm).toLocaleString('de-DE')} hm</span>` : ''}${R.length && nS ? ' · ' : ''}${nS ? `<span>${nS} ${nS === 1 ? 'Übungseinheit' : 'Übungseinheiten'}</span>` : ''}</span></div>`; };
  const srow = a => { const l = S.lb[a.id], dt = new Date(a.day + 'T12:00:00'), wdn = SD[(dt.getDay() + 6) % 7];
    return `<div class="panel flex w-full items-center gap-3 p-3" style="min-height:44px"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${l.part ? '#d9a400' : '#0a8f6a'}" aria-hidden="true"></span><span class="w-12 shrink-0 text-xs" style="color:var(--mute)">${wdn} ${fmt(a.day).slice(0, 6)}</span><span class="min-w-0 flex-1"><span class="block truncate font-semibold" data-noi18n>${esc(l.n)}</span><span class="block text-xs" style="color:var(--mute)">${l.part ? 'Teilweise erledigt' : 'Erledigt'} · ${mm(Math.max(1, Math.round((l.sec || 0) / 60)))} · ${l.nEx} von ${l.nTot} Übungen</span></span></div>`; };
  const row = a => { const l = S.lb && S.lb[a.id], d = lbDot(a.id), dt = new Date(a.day + 'T12:00:00'), wdn = SD[(dt.getDay() + 6) % 7];
    const nm = l && l.k === 'p' ? `<span data-noi18n>${esc(l.n)}</span>` : l && l.k === 'x' ? 'Zusätzliche Fahrt' : `<span data-noi18n>${esc(a.n || 'Fahrt')}</span>`;
    return `<button class="panel flex w-full items-center gap-3 p-3 text-left" style="min-height:44px" onclick="lbOpenRide('${ja(a.id)}')"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${esc(d[0])}" title="${esc(d[1])}" aria-hidden="true"></span><span class="w-12 shrink-0 text-xs" style="color:var(--mute)">${wdn} ${fmt(a.day).slice(0, 6)}</span><span class="min-w-0 flex-1"><span class="block truncate font-semibold">${nm}</span><span class="block text-xs" style="color:var(--mute)">${blRideLine(a)}${l && l.k === 'p' && l.score != null ? ` · ${l.score}/100` : ''}${l && l.mv != null ? ` · verschoben von ${SD[l.mv]}` : ''}${l && l.vo ? ' · Variante' : ''}</span></span><span style="color:var(--mute)">${ic('chevR', 18)}</span></button>`; };
  return lbHintUi() + lbChart() + `<section class="panel mt-3 p-4"><p class="text-sm" style="color:var(--mute)">Alle Fahrten mit ihrer Bewertung, neueste zuerst. Bewertungen bleiben gespeichert, auch nach einem Planwechsel.</p><div class="mt-3 flex flex-wrap gap-2">${chip('all', 'Alle')}${chip('plan', 'Geplant')}${chip('x', 'Zusätzlich')}${sel}</div></section>
    <div class="space-y-2">${groups.map(g => head(g) + g.l.map(a => a.sq ? srow(a) : row(a)).join('')).join('')}</div>`;
}
/* B7: „Fahrten ansehen“ (Wusstest du schon?): die neueste bewertete Fahrt direkt in der Detailansicht, sonst das Logbuch
   mit Hinweis. Bewertet heißt: Eintrag in S.lb als geplante (p) oder zusätzliche (x) Fahrt. */
var lbHint = ''; /* var: goPg (18-navigation.js) setzt es zurück */
function lbLatestRated(){ lbSync(true); const r = lbRides().find(a => S.lb && S.lb[a.id] && (S.lb[a.id].k === 'p' || S.lb[a.id].k === 'x')); return r ? r.id : null; }
function dykRides(){ const id = lbLatestRated(); if (id) { lbHint = ''; return lbOpenRide(id); } lbHint = 'Noch keine bewertete Fahrt – nach deiner nächsten Fahrt findest du die Auswertung hier.'; goPg('logbook'); }
const lbHintUi = () => lbHint ? `<p class="mb-3 p-3 text-sm" role="status" style="border:1px solid var(--line);border-left:3px solid var(--teal)">${esc(lbHint)}</p>` : '';
/* Detailansicht einer Fahrt (aus Logbuch und Woche) */
function lbOpenRide(id){ lbSync(false); lbSel = id; try { xrSeen(id); } catch (e) { elog(e); } goPg('lb-ride'); }
function lbRidePage(){
  const id = lbSel, a = lbRides().find(r => r.id === id), l = (S.lb || {})[id];
  if (!a && !l) return `<section class="panel p-4"><p class="text-sm">Diese Fahrt ist nicht mehr gespeichert.</p></section>`;
  const r = a || {day:l.day, km:0, sec:(l.am || 0) * 60, hm:0, tss:0, np:l.np};
  const live = (S.p && S.p.extra && S.p.extra[id]) || Object.values((S.p && S.p.exe) || {}).find(e => e && e.rid === id) || null;
  const hr = r.hr || (l && l.hr), np = r.np || (l && l.np), kmh = r.sec > 0 ? r.km / (r.sec / 3600) : 0, dt = new Date(r.day + 'T12:00:00');
  const cell = (k, v) => `<div class="p-2.5" style="background:var(--tint);border:1px solid var(--line)"><div class="text-xs" style="color:var(--mute)">${k}</div><div class="font-semibold">${v}</div></div>`;
  const grid = [cell('Datum', `${DAYS[(dt.getDay() + 6) % 7]}, ${fmt(r.day)}`), cell('Dauer', mm(Math.round(r.sec / 60))), cell('Distanz', `${f1(r.km)} km`), cell('Höhenmeter', `${Math.round(r.hm || 0).toLocaleString('de-DE')} hm`),
    kmh ? cell('Schnitt', `${f1(kmh)} km/h`) : '', hr ? cell('Puls Ø', `${Math.round(hr)} bpm`) : '', np ? cell('Leistung (NP)', `${Math.round(np)} W`) : '', r.tss ? cell('Belastung', `TSS ${Math.round(r.tss)}`) : ''].join('');
  const hints = [];
  if (l && l.mv != null) hints.push(`Verschoben von ${DAYS[l.mv]}.`);
  if (l && l.vo) hints.push(`Variante von „${esc(l.vo)}“: gleicher Trainingsreiz, Belastung innerhalb von ±10 %. Die Intervalle wurden gegen die gefahrene Variante geprüft.`);
  const lx = S.p && S.p.extra && S.p.extra[id];
  if (l && l.adj && !l.prop) hints.push(`<b>Auswirkung auf den Plan:</b> ${l.adj}`);
  if (lx && lx.prop && typeof paUi === 'function') hints.push(paUi(lx));
  else if (l && l.prop) hints.push(`<b>${l.propSt === 'ok' ? 'Umgesetzte Plananpassung' : l.propSt === 'no' ? 'Abgelehnter Vorschlag' : l.propSt === 'undone' ? 'Zurückgenommene Plananpassung' : 'Vorgeschlagene Plananpassung'}:</b> ${l.prop}`);
  const soll = l && l.k === 'p' ? `<div class="mt-3 p-3" style="border:1px solid var(--line)"><p class="eyebrow">Soll und Ist</p><p class="mt-1 text-sm">Geplant: <b data-noi18n>${esc(l.n)}</b>${l.sm ? `, ${mm(l.sm)}` : ''}${l.ftp ? ` (FTP damals ${l.ftp} W)` : ''}</p><p class="text-sm">Gefahren: ${mm(Math.round(r.sec / 60))}${np ? `, ${Math.round(np)} W normalisiert` : ''}</p></div>` : '';
  const ev = l ? `<div class="mt-3"><p class="eyebrow">${l.k === 'x' ? 'Zusätzliche Fahrt' : 'Bewertung'}</p>${l.k === 'p' && l.score != null ? `<p class="mt-1 text-2xl font-semibold">${l.score}/100 <span class="text-base font-normal">${esc(l.grade || '')}</span></p>` : l.k === 'x' ? `<p class="mt-1 font-semibold">${(XR_CLS[l.cls] || XR_CLS.z2)[0]}</p>` : ''}<div class="mt-2 space-y-2 text-sm">${(l.msgs || []).map(m => `<p>${m}</p>`).join('')}</div></div>` : `<p class="mt-3 text-sm" style="color:var(--mute)">Für diese Fahrt gibt es keine Bewertung, zum Beispiel weil sie vor dem Planstart lag.</p>`;
  const chart = live && typeof vzRide === 'function' && (live.ser || live.zp || live.zh) ? `<div class="mt-3">${vzRide(live)}</div>` : '';
  /* F24: Soll-Profil mit gefahrener Leistung (FTP von damals), zusätzliche Fahrten: Leistung nach Zonen. F25: Höhenprofil und Strecke */
  const trk = typeof trkBlock === 'function' ? trkBlock(id, a) : '', tr = typeof trkC !== 'undefined' && trkC[id] && trkC[id] !== 'busy' ? trkC[id] : null;
  const ser = live && live.ser && live.ser.p ? {b:live.ser.b, p:live.ser.p} : tr && tr.pw ? tr.pw : null, ftp0 = (l && l.ftp) || (live && live.ftp) || (S.p && S.p.ftp) || 0;
  const prof = typeof wkSvg === 'function' ? (l && l.k === 'p' && l.px ? `<div class="mt-3"><p class="eyebrow">${wkL('Ablauf: Soll und Ist', 'Structure: planned and ridden')}</p>${wkSvg(l.px, {ftp:ftp0, act:ser, h:124})}</div>` : ser && ftp0 ? `<div class="mt-3">${wkActSvg(ser, ftp0)}</div>` : '') : '';
  return `<section class="panel p-4"><p class="hd text-xl font-semibold" data-noi18n>${esc((a && a.n) || (l && l.n) || 'Fahrt')}</p><div class="mt-3 grid grid-cols-2 gap-2">${grid}</div>${typeof mmRideBlock === 'function' ? mmRideBlock(id) : ''}${soll}${prof}${hints.length ? `<div class="mt-3 space-y-1 text-sm">${hints.map(h => `<div>${h}</div>`).join('')}</div>` : ''}${ev}${chart}${trk}</section>`;
}
/* Bewertungen sofort festhalten, sobald sie entstehen */
{ const _w = fn => function(){ const r = fn.apply(this, arguments); try { lbSync(false); } catch (e) { elog(e); } return r; };
  exeStore = _w(exeStore); exeExtra = _w(exeExtra); }
/* ---------- F18: Verlaufsgrafik im Logbuch (Kilometer, Zeit oder Höhenmeter je Woche bzw. Monat) ----------
   Woche = ISO-Woche Montag bis Sonntag (lbMon), Monat = Kalendermonat; gezählt wird nach dem Kalenderdatum der Fahrt
   (day, lokale Zeit), deshalb ohne Einfluss von Zeitumstellung und Jahreswechsel. Gezählt werden alle Fahrten im
   Logbuch (geplante und zusätzliche); Rolle/Indoor optional, Kraft und Mobilität nur bei der Zeit und nur mit
   „Alle Einheiten“. Zwölf Perioden je Ansicht, Pfeile oder Wischen blättern zurück. Antippen eines Balkens filtert die
   Liste darunter. Für Screenreader steht dieselbe Reihe als Tabelle bereit. */
var lbCh = {mode:'w', met:'km', off:0, sel:null, roll:true, all:false, yoy:false};
const lbPerKey = (mode, day) => mode === 'm' ? day.slice(0, 7) : lbMon(day);
/* Perioden einer Ansicht: 12 Schlüssel, neueste zuletzt; off = wie viele Zwölferblöcke zurück */
function lbPeriods(mode, off, today){
  const t = today || iso(0), out = [];
  if (mode === 'm') { const d = dOnly(t.slice(0, 7) + '-01'); d.setMonth(d.getMonth() - off * 12 - 11); for (let k = 0; k < 12; k++) { out.push(lstr(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); } }
  else { const m0 = lbMon(t); for (let k = 11; k >= 0; k--) out.push(addD(m0, -7 * (off * 12 + k))); }
  return out;
}
const lbPrevYear = (mode, key) => mode === 'm' ? (+key.slice(0, 4) - 1) + key.slice(4) : addD(key, -364);
/* Summen je Periode: {key: {km, sec, hm, n}} */
function lbSums(mode, o){
  o = o || lbCh; const S0 = {}, add = (k, km, sec, hm) => { const x = S0[k] || (S0[k] = {km:0, sec:0, hm:0, n:0}); x.km += km || 0; x.sec += sec || 0; x.hm += hm || 0; x.n++; };
  lbRides().forEach(a => { if (!a.day || (!o.roll && a.in)) return; add(lbPerKey(mode, a.day), a.km, a.sec, a.hm); });
  if (o.all) Object.values(S.lb || {}).forEach(l => { if (l && l.k === 's' && l.day && l.sec > 0) { const k = lbPerKey(mode, l.day), x = S0[k] || (S0[k] = {km:0, sec:0, hm:0, n:0}); x.sec += l.sec; } });
  return S0;
}
const LB_MET = {km:['Distanz', v => Math.round(v.km), v => `${Math.round(v).toLocaleString('de-DE')} km`], h:['Zeit', v => v.sec / 3600, v => hStd(Math.round(v * 4) / 4) + ' Std.'], hm:['Höhenmeter', v => Math.round(v.hm), v => `${Math.round(v).toLocaleString('de-DE')} hm`]};
const lbPerLbl = (mode, key, long) => { const MO = lang() === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  if (mode === 'm') { const m = +key.slice(5, 7) - 1; return long ? `${MO[m]} ${key.slice(0, 4)}` : MO[m]; }
  const e = addD(key, 6); return long ? `${fmt(key).slice(0, 6)}–${fmt(e)}` : fmt(key).slice(0, 6); };
function lbSet(k, v){ if (k === 'mode') { lbCh.mode = v; lbCh.off = 0; lbCh.sel = null; } else if (k === 'off') { lbCh.off = Math.max(0, Math.min(20, lbCh.off + v)); } else if (k === 'sel') lbCh.sel = lbCh.sel === v ? null : v; else lbCh[k] = v; render(); }
let lbSwX = null;
function lbSwS(e){ lbSwX = e.touches && e.touches[0] ? e.touches[0].clientX : null; }
function lbSwE(e){ const t = e.changedTouches && e.changedTouches[0]; if (lbSwX == null || !t) return; const dx = t.clientX - lbSwX; lbSwX = null; if (Math.abs(dx) > 45) lbSet('off', dx > 0 ? 1 : -1); }
function lbChart(){
  const o = lbCh, keys = lbPeriods(o.mode, o.off), sums = lbSums(o.mode, o), M = LB_MET[o.met], val = k => M[1](sums[k] || {km:0, sec:0, hm:0}), V = keys.map(val);
  const prev = o.yoy ? keys.map(k => val(lbPrevYear(o.mode, k))) : null, cur = lbPerKey(o.mode, iso(0)), wm = o.mode === 'm';
  /* Durchschnitt ab der ersten Periode mit Daten (leere Zeit vor der ersten Fahrt zählt nicht mit) */
  const first = Object.keys(sums).sort()[0], from = Math.max(0, keys.findIndex(k => first && k >= first)), Va = first && first <= keys[keys.length - 1] ? V.slice(from) : V, avg = Va.reduce((q, v) => q + v, 0) / Math.max(1, Va.length);
  /* Grafik über die volle Breite, Achse links mit runden Werten, Schrift größer als bei den übrigen Verlaufsgrafiken */
  const top0 = Math.max(1, ...V, ...(prev || [0])), st0 = top0 / 3, mg = Math.pow(10, Math.floor(Math.log10(st0))), stp = [1, 2, 2.5, 5, 10].map(f => f * mg).find(f => f >= st0) || 10 * mg;
  const mx = Math.max(stp * Math.ceil(top0 * 1.08 / stp), stp), W = 340, H = 200, L = 34, R = 4, T = 16, B = 24, bw = (W - L - R) / keys.length, Y = v => T + (H - T - B) * (1 - v / mx);
  const tk = v => o.met === 'h' ? `${Math.round(v * 10) / 10} h`.replace('.', wkL(',', '.')) : Math.round(v).toLocaleString(wkL('de-DE', 'en-GB'));
  const grid = []; for (let v = stp; v <= mx + 1e-9; v += stp) grid.push(`<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="lbc-gl"/><text x="${L - 4}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="tx">${esc(tk(v))}</text>`);
  const sk = o.sel || cur, sv = sums[sk] || {km:0, sec:0, hm:0, n:0}, isCur = sk === cur;
  const head = `${isCur ? (wm ? 'Dieser Monat' : 'Diese Woche') : lbPerLbl(o.mode, sk, true)}: ${Math.round(sv.km).toLocaleString('de-DE')} km · ${hm2(Math.round(sv.sec / 60))} h · ${Math.round(sv.hm).toLocaleString('de-DE')} Hm`;
  const bars = keys.map((k, i) => { const x = L + i * bw, y = Y(V[i]), on = k === sk, py = prev ? Y(prev[i]) : 0, cx = x + bw * (prev ? .52 : .14), cw = bw * (prev ? .38 : .72);
    return `${prev ? `<rect x="${(x + bw * .1).toFixed(1)}" y="${py.toFixed(1)}" width="${(bw * .38).toFixed(1)}" height="${Math.max(prev[i] > 0 ? 1.5 : 0, H - B - py).toFixed(1)}" class="lbc-prev"/>` : ''}<rect x="${cx.toFixed(1)}" y="${y.toFixed(1)}" width="${cw.toFixed(1)}" height="${Math.max(V[i] > 0 ? 1.5 : 0, H - B - y).toFixed(1)}" class="${on ? 'lbc-on' : 'lbc-bar'}" data-k="${esc(k)}"/>
      ${on && V[i] > 0 ? `<text x="${(prev ? x + bw / 2 : cx + cw / 2).toFixed(1)}" y="${(Math.min(y, prev ? py : y) - 4).toFixed(1)}" text-anchor="middle" class="tx lbc-val">${esc(tk(V[i]))}</text>` : ''}<rect x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H}" fill="transparent" style="cursor:pointer" onclick="lbSet('sel','${ja(k)}')"/>${i % (wm ? 1 : 2) === (wm ? 0 : 1) || on ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 7}" text-anchor="middle" class="tx"${on ? ' font-weight="700"' : ''}>${esc(lbPerLbl(o.mode, k))}</text>` : ''}`; }).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pchart lbc" aria-hidden="true" ontouchstart="lbSwS(event)" ontouchend="lbSwE(event)">${grid.join('')}${bars}<line x1="${L}" x2="${W - R}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}" class="lbc-avg"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="gl0"/></svg>`;
  const tbl = `<table class="sr-only"><caption>${M[0]} je ${wm ? 'Monat' : 'Woche'}</caption><thead><tr><th>${wm ? 'Monat' : 'Woche'}</th><th>${M[0]}</th>${prev ? '<th>Vorjahr</th>' : ''}</tr></thead><tbody>${keys.map((k, i) => `<tr><td>${esc(lbPerLbl(o.mode, k, true))}</td><td>${esc(M[2](V[i]))}</td>${prev ? `<td>${esc(M[2](prev[i]))}</td>` : ''}</tr>`).join('')}</tbody></table>`;
  const seg = (k, v, l) => `<button class="${o[k] === v ? 'on' : ''}" aria-pressed="${o[k] === v}" style="min-height:44px" onclick="lbSet('${k}','${v}')">${l}</button>`;
  const tog = (k, l) => chip(l, !!o[k], `lbSet('${k}',${o[k] ? 'false' : 'true'})`);
  const arrow = (d, l, dis) => `<button class="lbc-nav" aria-label="${l}"${dis ? ' disabled' : ''} onclick="lbSet('off',${d})">${ic(d > 0 ? 'chevL' : 'chevR', 18)}</button>`;
  /* Angezeigter Zeitraum zwischen den Pfeilen */
  const k0 = keys[0], k1 = keys[keys.length - 1], rng = wm ? `${lbPerLbl('m', k0, true)} – ${lbPerLbl('m', k1, true)}` : `${fmt(k0).slice(0, 6)} – ${fmt(addD(k1, 6))}`;
  /* Vorjahresvergleich für die gewählte Periode bzw. die aktuelle */
  let cmp = '';
  if (prev) { const yr = +(wm ? k1.slice(0, 4) : addD(k1, 6).slice(0, 4)), pk = lbPrevYear(o.mode, sk), pv = val(pk), cv = val(sk), anyP = prev.some(v => v > 0);
    const sw = (c, t) => `<span class="lbc-sw"><i class="${c}"></i>${t}</span>`;
    cmp = anyP ? `<div class="lbc-lg text-xs" data-noi18n>${sw('lbc-bar', wkL('aktuell', 'current'))}${sw('lbc-prev', wkL('Vorjahr', 'previous year'))}</div>`
      + `<p class="mt-1 text-sm" data-noi18n>${wkL('Vorjahr', 'Previous year')} (${esc(lbPerLbl(o.mode, pk, true))}): <b>${esc(M[2](pv))}</b>${pv > 0 ? ` · ${isCur ? wkL('bisher', 'so far') : wkL('jetzt', 'now')} <b>${cv >= pv ? '+' : '−'}${Math.abs(Math.round((cv - pv) / pv * 100))} %</b>` : ''}</p>`
        : `<p class="mt-1 text-sm" style="color:var(--mute)" data-noi18n>${wkL(`Für diesen Zeitraum im Vorjahr (${yr - 1}) sind keine Fahrten gespeichert. Der Vergleich erscheint, sobald dort Fahrten im Logbuch liegen, etwa über den Garmin-Abruf oder hochgeladene Dateien.`, `No rides are stored for this period in the previous year (${yr - 1}). The comparison appears once rides from then are in the logbook, e.g. via the Garmin import or uploaded files.`)}</p>`; }
  return `<section class="panel p-4" id="lb-chart"><p class="hd text-xl font-semibold" aria-live="polite">${head}</p>
    <div class="mt-3 flex items-center gap-2"><div class="dtabs flex-1">${seg('mode', 'w', 'Woche')}${seg('mode', 'm', 'Monat')}</div><div class="dtabs flex-1">${seg('met', 'km', 'km')}${seg('met', 'h', 'Zeit')}${seg('met', 'hm', 'Hm')}</div></div>
    <div class="mt-3 flex items-center justify-between gap-2">${arrow(1, 'Früher')}<span class="text-sm font-semibold" data-noi18n>${esc(rng)}</span>${arrow(-1, 'Später', o.off === 0)}</div>${svg}${tbl}
    <p class="mt-1 text-xs" style="color:var(--mute)"><span class="lbc-key"></span> Durchschnitt: ${esc(M[2](avg))} je ${wm ? 'Monat' : 'Woche'}</p>${cmp}
    <div class="mt-2 flex flex-wrap gap-2">${tog('roll', 'inkl. Rolle')}${o.met === 'h' ? tog('all', 'Alle Einheiten') : ''}${tog('yoy', 'Vorjahr')}${o.sel ? chip('Filter aufheben', false, "lbSet('sel',null)") : ''}</div></section>`;
}
