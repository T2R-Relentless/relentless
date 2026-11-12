/* ---------- Übersicht, Seiten, Startseite ---------- */
function rcPage(){
  rcArchSync(); const W = rcWeeks().filter(r => !r.live).reverse().slice(0, 8), M = [...new Set((S.arch || []).map(a => rcMonKey(a.d)))].sort().reverse().slice(0, 12), Y = [...new Set((S.arch || []).map(a => a.d.slice(0, 4)))].sort().reverse();
  const row = (on, t, sub) => `<button class="mrow" onclick="${on}"><span class="min-w-0 flex-1"><span class="block font-semibold">${t}</span><span class="block text-xs" style="color:var(--mute)">${sub}</span></span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`;
  const ws = W.map(r => row(`rcSel.w=${ja(r.w)};goPg('rc-w')`, `Woche ${r.w}${r.rec ? ', Erholungswoche' : ''}`, `${fmt(r.from)} · ${r.nd}/${r.n} Einheiten · ${rcH(r.dm * 60)} Std.`)).join('');
  const ms = M.map(k => { const q = rcSum(rcRides(rcMonFrom(k), rcMonTo(k))); return row(`rcSel.m='${ja(k)}';goPg('rc-m')`, rcMonName(k), `${q.n} ${q.n === 1 ? 'Fahrt' : 'Fahrten'} · ${rcKm(q.km)} km · ${rcH(q.sec)} Std.`); }).join('');
  const ys = Y.map(y => { const q = rcSum(rcRides(y + '-01-01', y + '-12-31')); return row(`rcSel.y=${ja(y)};goPg('rc-y')`, 'Jahresrückblick ' + y, `${q.n} Fahrten · ${rcKm(q.km)} km · ${rcKm(q.hm)} hm`); }).join('');
  if (!ws && !ms) return stEmpty('Sobald die erste Woche abgeschlossen ist oder Fahrten da sind, findest du hier deine Wochen-, Monats- und Jahresrückblicke.');
  return (ys ? `<p class="eyebrow mb-2">Jahre</p><div class="mlist">${ys}</div>` : '') + (ms ? `<p class="eyebrow mb-2 mt-5">Monate</p><div class="mlist">${ms}</div>` : '') + (ws ? `<p class="eyebrow mb-2 mt-5">Wochen</p><div class="mlist">${ws}</div>` : '');
}
function rcWeekPage(){
  const r = rcWeeks().find(q => q.w === rcSel.w) || rcWeeks().filter(q => !q.live).pop(); if (!r) return stEmpty('Noch keine abgeschlossene Woche.');
  return `<section class="panel p-4"><p class="eyebrow">Woche ${r.w} · ${fmt(r.from)} bis ${fmt(r.to)}</p>${whBody(r, true)}</section>`;
}
function rcHome(){
  try {
    if (!S.p || S.step !== 0) return ''; rcArchSync(); const t = iso(0), d = Number(t.slice(8, 10)), seen = S.rcSeen || {};
    const mon = Number(t.slice(5, 7)), y = Number(t.slice(0, 4));
    if ((mon === 12 && d >= 26) || (mon === 1 && d <= 15)) { const yy = mon === 12 ? y : y - 1, q = rcSum(rcRides(yy + '-01-01', yy + '-12-31')); if (q.n >= 5 && !seen['y' + yy]) return `<section class="panel p-4" style="border-top:3px solid #f2b134"><div class="flex items-start gap-2"><div class="min-w-0 flex-1"><p class="eyebrow">Jahresrückblick</p><p class="mt-0.5 font-semibold">Dein ${yy}: ${rcKm(q.km)} km, ${rcKm(q.hm)} Höhenmeter</p><p class="mt-1 text-sm" style="color:var(--mute)">Rekorde, Kapitel deiner Saison und was du ${yy + 1} angehen kannst.</p></div><button class="text-xl leading-none" style="color:var(--mute)" onclick="rcDone('y${ja(yy)}')" aria-label="Schließen">×</button></div><button class="btn mt-3 !w-auto" onclick="rcSel.y=${ja(yy)};rcDone('y${ja(yy)}',1);goPg('rc-y')">Ansehen</button></section>`; }
    if (d <= 7) { const pk = rcPrevMon(t.slice(0, 7)), q = rcSum(rcRides(rcMonFrom(pk), rcMonTo(pk))); if (q.n >= 2 && !seen['m' + pk]) return `<section class="panel p-4" style="border-top:3px solid var(--ice)"><div class="flex items-start gap-2"><div class="min-w-0 flex-1"><p class="eyebrow">Monatsrückblick</p><p class="mt-0.5 font-semibold">Dein ${RC_MON[Number(pk.slice(5)) - 1]}: ${q.n} Fahrten, ${rcH(q.sec)} Std.</p><p class="mt-1 text-sm" style="color:var(--mute)">Highlights, Fortschritte und dein Fokus für den neuen Monat.</p></div><button class="text-xl leading-none" style="color:var(--mute)" onclick="rcDone('m${ja(pk)}')" aria-label="Schließen">×</button></div><button class="btn mt-3 !w-auto" onclick="rcSel.m='${ja(pk)}';rcDone('m${ja(pk)}',1);goPg('rc-m')">Ansehen</button></section>`; }
  } catch (e) { elog(e); }
  return '';
}
function rcDone(k, keep){ S.rcSeen = {...(S.rcSeen || {}), [k]:1}; save(); if (!keep) render(); }
const RC_PAGES = {rc:() => rcPage(), 'rc-w':() => rcWeekPage(), 'rc-m':() => { rcArchSync(); return rcMonth(rcSel.m || rcPrevMon(iso(0).slice(0, 7))); }, 'rc-y':() => { rcArchSync(); return rcYear(rcSel.y || Number(iso(0).slice(0, 4))); }};
const RC_T = {rc:'Rückblicke', 'rc-w':'Wochenrückblick', 'rc-m':'Monatsrückblick', 'rc-y':'Jahresrückblick'};
Object.assign(IA_PAR, {rc:'state', 'rc-w':'rc', 'rc-m':'rc', 'rc-y':'rc'});
ST_ICO.rc = '<path d="M4 5h16v15H4z"/><path d="M4 9h16M9 3v4M15 3v4"/><path d="M8 13h3M8 16h6"/>';
function rcSub(){ try { const W = rcWeeks().filter(r => !r.live), last = W[W.length - 1], m = rcPrevMon(iso(0).slice(0, 7)); return [last ? `Woche ${last.w}: ${last.nd}/${last.n}` : '', (S.arch || []).some(a => rcMonKey(a.d) === m) ? RC_MON[Number(m.slice(5)) - 1] : '', 'Jahr'].filter(Boolean).join(' · '); } catch (e) { elog(e); return 'Woche, Monat, Jahr'; } }
/* Kurzer Ausblick für den Wochenrückblick auf der Startseite */
function rcNext(){ try { if (!S.plan) return ''; const L = S.plan.map((x, i) => [x, i]).filter(([x]) => x && x.m && (HARD.includes(x.t) || x.t === 'long' || x.t === 'race' || x.t === 'test')).slice(0, 2); return L.length ? `Diese Woche wichtig: ${L.map(([x, i]) => `„${rcN(x.n)}“ am ${DAYS[i]}`).join(', ')}.` : ''; } catch (e) { elog(e); return ''; } }
/* Bestehende Pläne: fehlender Start-Fitnesstest in der laufenden Woche nachtragen (einmalig) */
function tdFix(p){
  try {
    if (!p || S.step !== 0 || !S.plan || !hasStarted(p)) return; if (p.owedSince == null) { p.owedSince = S.wk; save(); }
    const due = testOwed(p); if (!due || !testDueWeek(p, S.wk) || S.plan.some(x => x && x.t === 'test')) return;
    const t = todayIdx(), ok = j => j >= t && addD(p.start, (S.wk - 1) * 7 + j) >= due && !S.done[j] && !(S.actual && S.actual[j]) && p.avail[j] && capOf(p, j) >= 55 && S.plan[j] && !S.plan[j].sub && S.plan[j].feel !== 'sick' && !/^Eventtag/.test(S.plan[j].n || '') && S.plan[j].fu == null;
    if (S.plan.some(x => x && (x.sub || /^Eventtag/.test(x.n || '')))) return;
    const c = [0, 1, 2, 3, 4, 5, 6].filter(ok), j = c.find(q => HARD.includes(S.plan[q].t)) ?? c.find(q => ['base', 'rec', 'tempo'].includes(S.plan[q].t)) ?? c.find(q => !S.plan[q].m);
    if (j == null) return;
    S.plan[j] = {...TESTX(), n:'Fitness-Check (nachgeholt): 20-Min-Test', adapted:true, orig:S.plan[j].m ? S.plan[j] : undefined};
    S.log.unshift({title:'Fitness-Check nachgeholt', day:j, text:`Der ausgefallene Fitness-Check steht jetzt am ${DAYS[j]}.`}); flashIdx = j; save();
  } catch (e) { elog(e); }
}
function t0Fix(p){
  try {
    if (!p || !p.test0 || p.t0fix || !S.plan || S.step !== 0 || Object.keys(p.res || {}).length || !testWeeks(p).includes(S.wk) || S.wk > 2) return;
    if (S.plan.some(x => x && x.t === 'test')) { p.t0fix = 1; return; }
    const t = todayIdx(), cand = S.plan.map((x, j) => ({x, j})).filter(({x, j}) => j >= t && !S.done[j] && !(S.actual && S.actual[j]) && p.avail[j] && capOf(p, j) >= 55 && !x.sub && !/^Eventtag/.test(x.n || ''));
    const pick = cand.find(({x}) => HARD.includes(x.t)) || cand.find(({x}) => x.t === 'base' || x.t === 'rec') || cand.find(({x}) => x.t === 'long') || cand.find(({x}) => !x.m);
    p.t0fix = 1;
    if (pick) { S.plan[pick.j] = {...TESTX(), orig:S.plan[pick.j].m ? S.plan[pick.j] : undefined}; S.log.unshift({title:'Fitnesstest eingeplant', day:pick.j, text:`Dein Fitnesstest zu Beginn fehlte in dieser Woche. Er steht jetzt am ${DAYS[pick.j]}.`}); }
    save();
  } catch (e) { elog(e); }
}
/* ---------- Anforderungsprofil für die ganze Saison ----------
   Jedes Event bekommt ein eigenes Profil (Typ, Dauer, Anforderungen). Die Saisonübersicht zeigt alle A- und B-Events
   nebeneinander und fasst zusammen, was die Saison insgesamt verlangt. Für jedes A-Event richtet sich das Training im
   Abschnitt davor nach dessen Profil (segP). */
function segP(p, ev){
  if (!ev || ev.main) return p;
  const s = (p.subs || []).find(x => x.id === ev.id) || {name:ev.name, date:ev.date}, e = EVS.find(x => (x.n + (x.v ? ' ' + x.v : '')) === s.name);
  return {...p, evId:e ? e.id : '', eventName:s.name, eventDate:s.date, dist:Number(s.dist) || (e ? e.km : 0), hm:Number(s.hm) || (e && e.hm != null ? e.hm : 0), course:undefined, targetTime:'', fmt:undefined, startTime:undefined, _seg:1};
}
function seasonEvs(p){
  const A = [], main = {id:'main', name:p.eventName || 'Hauptevent', date:p.eventDate, prio:'A', main:true, pp:p};
  (p.subs || []).filter(s => s.date < p.eventDate).forEach(s => { const pp = segP(p, {id:s.id, name:s.name, date:s.date}); A.push({id:s.id, name:s.name, date:s.date, prio:s.prio || 'C', pp}); });
  return [...A, main].sort((a, b) => a.date.localeCompare(b.date)).map(x => ({...x, r:(() => { try { return evProfile(x.pp); } catch (e) { elog(e); return null; } })()}));
}
let epSel = 'main';
const EP_DIM = [['dur', 'Ausdauer'], ['lng', 'Lange Anstiege'], ['med', 'Mittlere Anstiege'], ['spr', 'Spritzigkeit'], ['tmp', 'Tempohärte']];
function epBars(sc){ return `<div class="flex gap-1" aria-hidden="true">${EP_DIM.map(([k, l]) => `<span title="${esc(l)}" style="display:inline-block;width:10px;height:${esc(4 + (sc[k] || 0) * 5)}px;align-self:flex-end;background:${esc(sc[k] >= 3 ? 'var(--teal)' : sc[k] >= 2 ? 'var(--ice)' : 'var(--line)')}"></span>`).join('')}</div>`; }
function epPage(){
  const p = S.p, all = seasonEvs(p), multi = all.length > 1;
  if (!multi) return iaNoHead(evProfCard(p)) || '<section class="panel p-4"><p class="text-sm" style="color:var(--mute)">Trag Strecke und Höhenmeter deines Events ein (Plan anpassen), dann zeigt die App das Anforderungsprofil.</p></section>';
  const L = all.filter(x => x.r), peaks = L.filter(x => x.prio === 'A'), focus = peaks.length ? peaks : L;
  if (!L.find(x => x.id === epSel)) epSel = 'main';
  /* 1. Saison im Überblick */
  const rows = L.map(x => `<button class="flex w-full items-center gap-2 py-2.5 text-left text-sm" style="background:none;border:0;border-top:1px solid var(--line)" onclick="epSel='${ja(x.id)}';render();setTimeout(()=>{const el=document.getElementById('ep-det');if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},40)">${prioBadge(x.prio)}<span class="min-w-0 flex-1"><b data-noi18n>${esc(x.name)}</b>${x.main ? ' <span class="text-xs" style="color:var(--teal)">Höhepunkt</span>' : ''}<br><span class="text-xs" style="color:var(--mute)"><span>${fmt(x.date)}</span> · <span>${EVTY[x.r.ty][0]}</span> · <span>${f1(x.pp.dist)} km${x.pp.hm ? ', ' + Number(x.pp.hm).toLocaleString('de-DE') + ' hm' : ''} · ca. ${hm2(x.r.tev)} Std.</span></span></span>${epBars(x.r.sc)}<span aria-hidden="true" style="color:var(--mute)">›</span></button>`).join('');
  const over = `<section class="panel p-4"><p class="eyebrow">Deine Saison im Überblick</p><p class="mt-1 text-sm" style="color:var(--mute)">${L.length} Events, davon ${peaks.length} ${peaks.length === 1 ? 'Formhöhepunkt' : 'Formhöhepunkte'}. Die Balken zeigen Ausdauer, lange Anstiege, mittlere Anstiege, Spritzigkeit und Tempohärte. Tippe auf ein Event für sein Profil.</p><div class="mt-2">${rows}</div></section>`;
  /* 2. Was die Saison verlangt */
  const mx = k => focus.reduce((a, x) => (x.r.sc[k] || 0) > (a ? a.r.sc[k] || 0 : -1) ? x : a, null);
  const dims = EP_DIM.map(([k, l]) => { const x = mx(k); return {k, l, v:x ? x.r.sc[k] || 0 : 0, x}; });
  const top = dims.filter(d => d.v >= 2).sort((a, b) => b.v - a.v), longest = focus.reduce((a, x) => x.r.tev > a.r.tev ? x : a), types = [...new Set(focus.map(x => x.r.ty))];
  const dots = v => `<span aria-label="${esc(v)} von 3">${[1, 2, 3].map(i => `<span style="display:inline-block;width:14px;height:6px;margin-right:2px;background:${esc(i <= v ? 'var(--teal)' : 'var(--line)')}"></span>`).join('')}</span>`;
  const need = `<section class="panel p-4"><p class="eyebrow">Was deine Saison verlangt</p>
    <div class="mt-2 space-y-1.5">${dims.map(d => `<div class="flex items-center justify-between gap-2 text-sm"><span>${d.l}${d.v >= 2 && d.x ? ` <span class="text-xs" style="color:var(--mute)">(<span data-noi18n>${esc(d.x.name)}</span>)</span>` : ''}</span>${dots(d.v)}</div>`).join('')}</div>
    <p class="mt-3 text-sm">${types.length > 1 ? `Deine Formhöhepunkte sind unterschiedlich: ${types.map(t => EVTY[t][0]).join(', ')}. Deshalb richtet die App das Training vor jedem A-Event nach dessen eigenem Profil aus.` : `Alle Formhöhepunkte sind vom Typ <span>${EVTY[types[0]][0]}</span>. Das Training bleibt über die Saison gleich ausgerichtet und wird von Höhepunkt zu Höhepunkt schärfer.`} Dein längstes Event ist <b data-noi18n>${esc(longest.name)}</b> mit etwa ${hm2(longest.r.tev)} Std. In den Wochen davor werden deine Long Rides am längsten.</p>
    ${top.length ? `<p class="mt-2 text-sm">Am wichtigsten: ${top.slice(0, 2).map((d, i) => i && d.l !== 'Lange Anstiege' && d.l !== 'Mittlere Anstiege' ? d.l.toLowerCase() : i ? d.l.charAt(0).toLowerCase() + d.l.slice(1) : d.l).join(' und ')}.</p>` : ''}</section>`;
  /* 3. Detail des gewählten Events */
  const x = L.find(q => q.id === epSel) || L[L.length - 1], chips = L.map(q => chip(q.main ? 'Höhepunkt' : q.name.length > 18 ? q.name.slice(0, 17) + '…' : q.name, q.id === x.id, `epSel='${ja(q.id)}';render()`)).join('');
  const role = x.main ? 'Dein Saisonhöhepunkt. Auf ihn läuft die ganze Saison hinaus.' : x.prio === 'A' ? 'Ein Formhöhepunkt. In den Wochen davor richtet sich das Training nach diesem Profil, danach folgt eine Woche Regeneration.' : x.prio === 'B' ? 'Ein B-Rennen: wichtig, aber kein Höhepunkt. Davor gibt es 2 bis 3 ruhigere Tage, danach Erholung. Das Training richtet sich nach dem nächsten A-Event.' : 'Ein C-Rennen: ein harter Trainingstag. Das Training richtet sich nach dem nächsten A-Event.';
  const card = x.prio === 'A' ? iaNoHead(evProfCard(x.pp)) : `<section class="panel p-4">${iaNoHead(evProfCard(x.pp, true)).replace('<div class="panel p-4"><p class="eyebrow mb-2">Anforderungsprofil des Events</p>', '').replace(/<\/div>$/, '')}</section>`;
  const det = `<div id="ep-det" class="mt-5"><p class="eyebrow mb-2">Profil je Event</p><div class="flex flex-wrap gap-2">${chips}</div><p class="mt-3 text-sm"><b data-noi18n>${esc(x.name)}</b>, ${fmt(x.date)}. ${role}</p>${!x.main && !x.pp.hm ? '<p class="mt-1 text-xs" style="color:var(--mute)">Ohne Höhenmeter geschätzt. Trag sie beim Event ein (Events bearbeiten), dann wird das Profil genauer.</p>' : ''}<div class="mt-3">${card}</div></div>`;
  return over + `<div class="mt-4">${need}</div>` + det;
}
function epSub(p){ try { const all = seasonEvs(p).filter(x => x.r), A = all.filter(x => x.prio === 'A'); if (all.length < 2) return null; const ty = [...new Set(A.map(x => x.r.ty))]; return `<span>${A.length} ${A.length === 1 ? 'Formhöhepunkt' : 'Formhöhepunkte'}:</span> ${ty.map(t => `<span>${EVTY[t][0]}</span>`).join(', ')}`; } catch (e) { elog(e); return null; } }
/* ---------- Ernährung und Pacing für alle Events der Saison ----------
   Bei Saisonplänen wählt man oben das Event; Tabs, Mengen und Zeitpunkte richten sich nach dessen Dauer, Profil und
   Datum. Eine Saisonübersicht zeigt pro Event die Strategie und warnt bei kurzen Abständen. */
let efSel = null;
function efList(p){ try { return seasonEvs(p).filter(x => x.r); } catch (e) { elog(e); return []; } }
function efPick(p){ const L = efList(p); if (!L.length) return null; let x = L.find(q => q.id === efSel); if (!x) { x = L.find(q => q.date >= iso(0)) || L[L.length - 1]; efSel = x.id; } return x; }
function efChips(L, x){ return `<div class="flex flex-wrap gap-2">${L.map(q => chip(`${q.prio} · ${q.main ? '<span>Höhepunkt</span>' : '<span data-noi18n>' + esc(q.name.length > 16 ? q.name.slice(0, 15) + '…' : q.name) + '</span>'}`, q.id === x.id, `efSel='${q.id}';evFT=null;render()`)).join('')}</div>`; }
function efStrat(q){
  const t = q.r.tev, gh = t > 150 ? 80 : t > 75 ? 45 : 30, load = (q.prio === 'A' || (q.prio === 'B' && t > 150)) && t > 90;
  return {gh, load, txt:`${t > 75 ? `${gh} g Kohlenhydrate pro Stunde` : 'Ein Gel oder Sportgetränk reicht'}${load ? `, davor ${t > 150 ? '2 Tage' : '1 Tag'} Kohlenhydrate laden (${t > 150 ? '8–10' : '6–8'} g pro kg)` : q.prio === 'C' ? ', normal essen wie an einem harten Trainingstag' : ', am Vortag kohlenhydratreich essen'}`};
}
function efOverview(L){
  const rows = L.map((q, i) => { const s = efStrat(q), nx = L[i + 1], gap = nx ? Math.round((new Date(nx.date) - new Date(q.date)) / 864e5) : 99;
    return `<div class="py-2.5 text-sm" style="border-top:1px solid var(--line)"><div class="flex items-center gap-2">${prioBadge(q.prio)}<b class="min-w-0 flex-1" data-noi18n>${esc(q.name)}</b><span class="text-xs" style="color:var(--mute)">${fmt(q.date)}</span></div><p class="mt-1">ca. ${hm2(q.r.tev)} Std.: ${s.txt}.</p>${gap <= 21 ? `<p class="mt-1 text-xs" style="color:#9a6a00">Nur ${gap} Tage bis zum nächsten Event: Nach diesem Rennen die Speicher schnell wieder füllen (in den ersten 4 Stunden 1–1,2 g Kohlenhydrate pro kg und Stunde plus Eiweiß) und in den Tagen danach nicht wenig essen.</p>` : ''}</div>`; }).join('');
  return `<section class="panel p-4"><p class="eyebrow">Ernährung über die Saison</p><p class="mt-1 text-sm" style="color:var(--mute)">Jedes Event bekommt eine eigene Strategie, abhängig von Dauer und Bedeutung. Kohlenhydratladen lohnt sich vor Formhöhepunkten und langen B-Rennen.</p><div class="mt-2">${rows}</div></section>`;
}
function efFuelPage(){
  const p = S.p, L = efList(p); if (L.length < 2) return null;
  const x = efPick(p), pp = x.pp, days = Math.ceil((new Date(x.date + 'T12:00:00') - Date.now()) / 864e5);
  if (evFT === null) evFT = days > 3 ? 0 : days >= 0 ? 1 : 2;
  const tabs = ['Vorbereitung', 'Renntag', 'Danach'].map((t, k) => chip(t, evFT === k, `evFT=${ja(k)};render()`)).join('');
  const s0 = efStrat(x); let body = ''; evFTon = true; try { body = eventFuelPlan(s0.load ? pp : {...pp, _noLoad:1}); } catch (e) { elog(e); } evFTon = false; if (evFT !== 1 && body.indexOf('<div class="evstep">') > 0) body = body.slice(body.indexOf('<div class="evstep">'));
  const note = x.prio === 'C' ? '<p class="mt-2 p-2.5 text-xs" style="background:var(--tint)">C-Rennen: Kein Kohlenhydratladen nötig. Iss am Vortag normal und nutze das Rennen, um deine Verpflegung für die wichtigen Events zu testen.</p>' : x.prio === 'B' && x.r.tev <= 150 ? '<p class="mt-2 p-2.5 text-xs" style="background:var(--tint)">B-Rennen unter 2,5 Std.: Ein kohlenhydratreicher Vortag reicht, richtiges Laden lohnt sich erst bei längeren Rennen.</p>' : '';
  return efOverview(L) + `<section class="panel mt-4 p-4" id="ef-det"><p class="eyebrow mb-2">Plan für ein Event</p>${efChips(L, x)}<p class="mt-3 text-sm"><b data-noi18n>${esc(x.name)}</b>, ${fmt(x.date)}${days >= 0 ? `, in ${days} ${days === 1 ? 'Tag' : 'Tagen'}` : ''}</p>${note}<div class="mt-3 flex flex-wrap gap-2">${tabs}</div><div class="mt-3 text-sm">${body}</div></section>`;
}
function efPacePage(){
  const p = S.p, L = efList(p); if (L.length < 2) return null;
  const x = efPick(p); let t = ''; try { t = paceTxt(x.pp, x.r); } catch (e) { elog(e); }
  return `<section class="panel p-4"><p class="eyebrow mb-2">Pacing je Event</p>${efChips(L, x)}<p class="mt-3 text-sm"><b data-noi18n>${esc(x.name)}</b>, <span>${fmt(x.date)}</span> · <span>${EVTY[x.r.ty][0]}</span>, <span>ca. ${hm2(x.r.tev)} Std.</span></p><p class="mt-2 text-sm">${t}</p><p class="mt-2 text-xs" style="color:var(--mute)">Grundlage: haltbarer Anteil der FTP über die erwartete Fahrzeit (IF ≈ 1 − 0,10 · ln Std.).${x.prio === 'C' ? ' Bei einem C-Rennen darfst du ruhig mutiger fahren und testen, was geht.' : ''}</p></section>`;
}
/* ---------- F17: Zielzeit, Form und Pacing für jedes Event der Saison ----------
   Je Event (A, B, C und Hauptevent) rechnet die App mit denselben Modellen wie beim Hauptevent:
   - FTP am Eventtag: ftpProj (Faustmodell des Plan-Checks) mit dem Mittel der geplanten Stunden über die Wochen bis dorthin.
   - Zielzeit: Leistungsbilanz nach Martin et al. 1998 (evTime) mit dieser FTP, Gewicht, Distanz, Höhenmetern und dem
     Windschatten der Event-Art: Rennen/Jedermann im Feld (Peloton), RTF in der Gruppe, Zeitfahren solo.
   - Ambitioniert: das Höhere aus oberem empfohlenem Wochenumfang (wie ambTarget, höchstens 14 Std.) und der oberen
     Spanne der FTP-Prognose (gutes Ansprechen auf das Training).
   - Form am Eventtag: Fitness (CTL) und Form (TSB) aus der Formkurve (vzRows), sobald genug Fahrten vorliegen.
   - Pacing: haltbarer Anteil der FTP über die erwartete Dauer, IF = 1 − 0,10 · ln(Std.); im Flachen IF − 8 bis IF,
     am Berg bis IF + 10 Prozentpunkte. Ohne Wattmesser Puls in % des Schwellenpulses (Friel: Zone 2 81–89 %,
     Zone 3 90–93 %, Zone 4 94–99 %), gewählt nach der Dauer.
   Fehlen Distanz oder Höhenmeter, fragt die App einmal danach (Karte in der Saisonübersicht) und rät nicht. */
const EV_KIND = {race:['Rennen', 'pel'], jed:['Jedermann', 'pel'], rtf:['RTF', 'grp'], tt:['Zeitfahren', 'solo']};
const evKindOf = (s, name) => s && EV_KIND[s.kind] ? s.kind : /zeitfahren|\bezf\b|\bitt\b|time trial/i.test(name || '') ? 'tt' : /\brtf\b|radtourenfahrt|tour\b/i.test(name || '') ? 'rtf' : /jedermann|marathon|gran fondo|granfondo|sportive/i.test(name || '') ? 'jed' : 'race';
function evSrc(p, x){ return x.main ? p : (p.subs || []).find(s => s.id === x.id) || null; }
/* Puls-Pacing nach Dauer (Minuten) in % des Schwellenpulses */
const evHrPct = t => t > 300 ? [78, 85] : t > 180 ? [81, 89] : t > 90 ? [85, 92] : [90, 96];
function seasonForecast(p){
  if (!p || p.goal !== 'event') return [];
  let L = []; try { L = seasonEvs(p); } catch (e) { elog(e); return []; }
  const st = planStats(p), live = hasStarted(p), cw = live ? curWeek(p) : 1, kg = kgOf(p), today = iso(0);
  let R = null; try { R = vzRows(); } catch (e) { elog(e); }
  const rt = hAv(p) > 0 && st.hAvg > 0 ? Math.min(1, st.hAvg / hAv(p)) : .87;
  return L.map(x => {
    const src = evSrc(p, x), pp = x.pp, kind = evKindOf(src, x.name), dr = EV_KIND[kind][1], past = x.date < today;
    const miss = !(pp.dist > 0) ? 'dist' : !(pp.hm > 0) && !(src && src.hm0) ? 'hm' : '';
    const o = {id:x.id, name:x.name, date:x.date, prio:x.prio, main:!!x.main, kind, past, miss, dist:pp.dist || 0, hm:pp.hm || 0, days:Math.round((dOnly(x.date) - dOnly(today)) / 864e5)};
    if (past) return o;
    const weeks = Math.max(0, seasWk(p, x.date) - cw), tev = x.r ? x.r.tev : 180;
    try { const pj = ftpProj(p, st.hAvg, weeks); o.ftp = Math.round(pj.mid); o.ftpLo = Math.round(pj.lo); o.ftpHi = Math.round(pj.hi); } catch (e) { elog(e); }
    if (!miss && o.ftp) {
      try { const lm = levMult(pp, tev), q = {...pp, targetTime:'5:00', draft:dr};
        const t = evTime(q, o.ftp * lm, kg, dr); if (t) { o.t = Math.ceil(t / 5) * 5; o.kmh = pp.dist / (t / 60); }
        /* ambitioniert: oberer empfohlener Umfang oder obere Spanne der FTP-Prognose (gutes Ansprechen auf Training), das Höhere */
        const hv = Math.min(14, Math.max(hAv(p), hRec(pp, tev)[1])), pa = ftpProj(p, hv * rt, weeks), ta = evTime(q, Math.max(pa.mid, o.ftpHi || 0) * lm, kg, dr);
        if (ta && (!o.t || ta < o.t)) o.tAmb = Math.floor(ta / 5) * 5; } catch (e) { elog(e); }
    }
    const T = o.t || tev, ifs = Math.max(.6, 1 - .1 * Math.log(Math.max(1, T / 60))), hi = Math.round(ifs * 100), F = o.ftp || p.ftp;
    o.pace = {lo:hi - 8, hi, cl:Math.min(100, hi + 10), wLo:Math.round(F * (hi - 8) / 100), wHi:Math.round(F * hi / 100), wCl:Math.round(F * Math.min(100, hi + 10) / 100)};
    const lt = p.lthr || 0; if (p.noPwr && lt) { const h = evHrPct(T); o.hr = {lo:Math.round(lt * h[0] / 100), hi:Math.round(lt * h[1] / 100)}; }
    const row = R && R.rows.find(r => r.day === x.date); if (row) o.form = {ctl:Math.round(row.ctl), tsb:Math.round(row.tsb)};
    o.taper = x.prio === 'A' ? 'volles Tapering (1 bis 2 Wochen weniger Umfang)' : x.prio === 'B' ? 'kurzes Tapering (3 Tage)' : 'kein Tapering, normal weiter trainieren';
    return o;
  });
}
/* Eingaben aus der Saisonübersicht: Event-Art, fehlende Distanz/Höhenmeter (einmal fragen) */
function evSet(id, k, v){
  const p = S.p; if (!p) return; const tgt = id === 'main' ? [p, S.d] : [(p.subs || []).find(s => s.id === id), ((S.d && S.d.subs) || []).find(s => s.id === id)];
  tgt.forEach(s => { if (!s) return;
    if (k === 'kind' && EV_KIND[v]) s.kind = v;
    if (k === 'dist') { const n = Math.round(wfNum(v) * 10) / 10; if (n > 0 && n < 2000) s.dist = n; }
    if (k === 'hm') { const n = Math.round(wfNum(v)); if (n >= 0 && n < 20000) { s.hm = n; s.hm0 = n === 0; } }
    if (k === 'skip') s.askSkip = 1; });
  save(); render();
}
function evSeasonPage(){
  const p = S.p, F = seasonForecast(p); if (!F.length) return '';
  const ask = F.find(o => !o.past && o.miss && !(evSrc(p, o) || {}).askSkip);
  const askCard = ask ? `<section class="panel p-4" style="border-left:3px solid var(--teal)"><p class="font-semibold">Angaben zu <span data-noi18n>${esc(ask.name)}</span></p><p class="mt-1 text-sm" style="color:var(--mute)">Für Zielzeit und Pacing braucht die App ${ask.miss === 'dist' ? 'Distanz und Höhenmeter' : 'die Höhenmeter'}. Sie schätzt sie nicht. Die Dauer des Eventtags im Plan richtet sich danach.</p>
    <div class="mt-3 grid grid-cols-2 gap-3">${field('Distanz (km)', `<input type="text" inputmode="decimal" class="inp" style="min-height:44px" value="${esc(ask.dist || '')}" onchange="evSet('${ja(ask.id)}','dist',this.value)">`)}${field('Höhenmeter', `<input type="text" inputmode="numeric" class="inp" style="min-height:44px" value="${esc(ask.hm || '')}" onchange="evSet('${ja(ask.id)}','hm',this.value)">`)}</div>
    <button class="ghost mt-3 !w-auto !px-3 text-sm" style="min-height:44px" onclick="evSet('${ja(ask.id)}','skip')">Später</button></section>` : '';
  const sg = v => (v > 0 ? '+' : '') + v;
  const row = o => { const dist = o.dist ? `${f1(o.dist)} km${o.hm ? ', ' + o.hm.toLocaleString('de-DE') + ' hm' : ''}` : 'Distanz fehlt';
    const cells = o.past ? `<p class="mt-1 text-xs" style="color:var(--mute)">vorbei</p>` : `<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
      <div class="p-2.5" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">Zielzeit</div><div class="font-semibold">${o.t ? `${hm2(o.t)} Std. · Ø ${f1(o.kmh)} km/h` : '–'}</div>${o.tAmb ? `<div class="text-xs">ambitioniert ${hm2(o.tAmb)} Std.</div>` : ''}</div>
      <div class="p-2.5" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">Form am Eventtag</div><div class="font-semibold">${o.form ? `Form ${sg(o.form.tsb)} · Fitness ${o.form.ctl}` : '–'}</div>${o.ftp ? `<div class="text-xs">FTP etwa ${o.ftp} W (${f1(o.ftp / kgOf(p))} W/kg)</div>` : ''}</div>
      <div class="p-2.5" style="background:var(--tint);grid-column:span 2"><div class="text-xs" style="color:var(--mute)">Pacing</div><div class="font-semibold">${o.hr ? `Puls ${o.hr.lo}–${o.hr.hi} bpm` : `${o.pace.wLo}–${o.pace.wHi} W im Flachen, am Berg bis ${o.pace.wCl} W`}</div><div class="text-xs">${o.taper}</div></div></div>
      <div class="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Art des Events">${Object.keys(EV_KIND).map(k => `<button class="${o.kind === k ? 'btn' : 'ghost'} !w-auto !px-3 !py-1.5 text-xs" style="min-height:44px" aria-pressed="${o.kind === k}" onclick="evSet('${ja(o.id)}','kind','${ja(k)}')">${EV_KIND[k][0]}</button>`).join('')}</div>`;
    return `<div class="py-3" style="border-top:1px solid var(--line)" data-ev="${esc(o.id)}"><div class="flex items-center gap-2">${prioBadge(o.prio)}<b class="min-w-0 flex-1" data-noi18n>${esc(o.name)}</b><span class="text-xs" style="color:var(--mute)">${fmt(o.date)}${o.past ? '' : `, in ${o.days} ${o.days === 1 ? 'Tag' : 'Tagen'}`}</span></div><p class="mt-0.5 text-xs" style="color:var(--mute)">${dist}${o.main ? ' · Saisonhöhepunkt' : ''}</p>${cells}</div>`; };
  const noForm = F.some(o => !o.past && !o.form) ? '<p class="mt-2 text-xs" style="color:var(--mute)">Die Form am Eventtag erscheint, sobald die App aus deinen Fahrten die Fitness kennt (Formkurve).</p>' : '';
  return askCard + `<section class="panel p-4"><p class="eyebrow">Alle Events der Saison</p><p class="mt-1 text-sm" style="color:var(--mute)">Zielzeit und Pacing rechnen mit deiner erwarteten FTP am jeweiligen Eventtag. Die Art des Events bestimmt den Windschatten: Rennen und Jedermann im Feld, RTF in der Gruppe, Zeitfahren solo.</p><div class="mt-2">${F.map(row).join('')}</div>${noForm}
    <p class="mt-2 text-xs" style="color:var(--mute)">Modell: Leistungsbilanz nach Martin et al. 1998, etwa ±10 %. FTP-Prognose: Faustmodell des Plan-Checks. Pacing: haltbarer Anteil der FTP über die Dauer.</p></section>`;
}
