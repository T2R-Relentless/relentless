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
    mv:x.moved && x.from != null ? x.from : null, vo:x.varOf ? lbTxt(x.varOf) : null, pid:pid || null, at:e.at || Date.now()};
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
      Object.entries(p.exe || {}).forEach(([key, e]) => { if (!e || !e.rid) return; const [w, i] = key.split('-').map(Number); if (!(over || !S.lb[e.rid])) return;
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
  (S.arch || []).forEach(a => m.set(a.id, {id:a.id, day:a.d, n:a.n, km:a.km || 0, sec:a.sec || 0, hm:a.hm || 0, tss:a.tss || 0, np:a.np || 0}));
  (S.man || []).forEach(a => { const o = m.get(a.id) || {}; m.set(a.id, {...o, id:a.id, day:a.day, n:a.n, km:a.km || 0, sec:a.sec || 0, hm:a.hm || 0, tss:a.tss || 0, np:a.np || 0, hr:a.hrAvg || null, ts:a.ts}); });
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
  const chip = (k, l) => `<button class="${lbF === k ? 'btn' : 'ghost'} !w-auto !px-3 !py-2 text-sm" style="min-height:44px" aria-pressed="${lbF === k}" onclick="lbF='${ja(k)}';render()">${l}</button>`;
  const pl = lbPlans();
  const sel = pl.length > 1 ? `<select class="inp !w-auto !py-2 text-sm" style="min-height:44px" aria-label="Nach Plan filtern" onchange="lbPid=this.value;render()"><option value="">Alle Pläne</option>${pl.map(([id, n]) => `<option value="${esc(id)}"${lbPid === id ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : '';
  if (!L.length) return `<section class="panel p-4"><div class="flex flex-wrap gap-2">${chip('all', 'Alle')}${chip('plan', 'Geplant')}${chip('x', 'Zusätzlich')}${sel}</div><p class="mt-3 text-sm" style="color:var(--mute)">${lbF === 'all' && !lbPid ? 'Noch keine Fahrten. Lade Fahrten hoch oder verbinde Garmin, dann erscheinen sie hier mit ihrer Bewertung.' : 'Keine Fahrten für diesen Filter.'}</p></section>`;
  const groups = []; L.forEach(a => { const mo = lbMon(a.day), g = groups[groups.length - 1]; if (g && g.mo === mo) g.l.push(a); else groups.push({mo, l:[a]}); });
  const head = g => { const R = g.l.filter(a => !a.sq), nS = g.l.length - R.length, s = R.reduce((o, a) => ({km:o.km + a.km, sec:o.sec + a.sec, hm:o.hm + a.hm}), {km:0, sec:0, hm:0}), e = new Date(g.mo + 'T12:00:00'); e.setDate(e.getDate() + 6);
    return `<div class="flex items-baseline gap-2 px-1 pt-3 text-xs" style="color:var(--mute)"><span class="eyebrow">Woche ab ${fmt(g.mo)}</span><span class="flex-1 text-right">${R.length ? `<span>${R.length} ${R.length === 1 ? 'Fahrt' : 'Fahrten'} · ${Math.round(s.km).toLocaleString('de-DE')} km · ${mm(Math.round(s.sec / 60))} · ${Math.round(s.hm).toLocaleString('de-DE')} hm</span>` : ''}${R.length && nS ? ' · ' : ''}${nS ? `<span>${nS} ${nS === 1 ? 'Übungseinheit' : 'Übungseinheiten'}</span>` : ''}</span></div>`; };
  const srow = a => { const l = S.lb[a.id], dt = new Date(a.day + 'T12:00:00'), wdn = SD[(dt.getDay() + 6) % 7];
    return `<div class="panel flex w-full items-center gap-3 p-3" style="min-height:44px"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${l.part ? '#d9a400' : '#0a8f6a'}" aria-hidden="true"></span><span class="w-12 shrink-0 text-xs" style="color:var(--mute)">${wdn} ${fmt(a.day).slice(0, 6)}</span><span class="min-w-0 flex-1"><span class="block truncate font-semibold" data-noi18n>${esc(l.n)}</span><span class="block text-xs" style="color:var(--mute)">${l.part ? 'Teilweise erledigt' : 'Erledigt'} · ${mm(Math.max(1, Math.round((l.sec || 0) / 60)))} · ${l.nEx} von ${l.nTot} Übungen</span></span></div>`; };
  const row = a => { const l = S.lb && S.lb[a.id], d = lbDot(a.id), dt = new Date(a.day + 'T12:00:00'), wdn = SD[(dt.getDay() + 6) % 7];
    const nm = l && l.k === 'p' ? `<span data-noi18n>${esc(l.n)}</span>` : l && l.k === 'x' ? 'Zusätzliche Fahrt' : `<span data-noi18n>${esc(a.n || 'Fahrt')}</span>`;
    return `<button class="panel flex w-full items-center gap-3 p-3 text-left" style="min-height:44px" onclick="lbOpenRide('${ja(a.id)}')"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${esc(d[0])}" title="${esc(d[1])}" aria-hidden="true"></span><span class="w-12 shrink-0 text-xs" style="color:var(--mute)">${wdn} ${fmt(a.day).slice(0, 6)}</span><span class="min-w-0 flex-1"><span class="block truncate font-semibold">${nm}</span><span class="block text-xs" style="color:var(--mute)">${blRideLine(a)}${l && l.k === 'p' && l.score != null ? ` · ${l.score}/100` : ''}${l && l.mv != null ? ` · verschoben von ${SD[l.mv]}` : ''}${l && l.vo ? ' · Variante' : ''}</span></span><span style="color:var(--mute)">${ic('chevR', 18)}</span></button>`; };
  return `<section class="panel p-4"><p class="text-sm" style="color:var(--mute)">Alle Fahrten mit ihrer Bewertung, neueste zuerst. Bewertungen bleiben gespeichert, auch nach einem Planwechsel.</p><div class="mt-3 flex flex-wrap gap-2">${chip('all', 'Alle')}${chip('plan', 'Geplant')}${chip('x', 'Zusätzlich')}${sel}</div></section>
    <div class="space-y-2">${groups.map(g => head(g) + g.l.map(a => a.sq ? srow(a) : row(a)).join('')).join('')}</div>`;
}
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
  return `<section class="panel p-4"><p class="hd text-xl font-semibold" data-noi18n>${esc((a && a.n) || (l && l.n) || 'Fahrt')}</p><div class="mt-3 grid grid-cols-2 gap-2">${grid}</div>${soll}${hints.length ? `<div class="mt-3 space-y-1 text-sm">${hints.map(h => `<div>${h}</div>`).join('')}</div>` : ''}${ev}${chart}</section>`;
}
/* Bewertungen sofort festhalten, sobald sie entstehen */
{ const _w = fn => function(){ const r = fn.apply(this, arguments); try { lbSync(false); } catch (e) { elog(e); } return r; };
  exeStore = _w(exeStore); exeExtra = _w(exeExtra); }
