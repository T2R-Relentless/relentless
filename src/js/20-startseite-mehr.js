/* ---------- Navigation unten: Heute · Woche · Fortschritt · Mehr ---------- */
let pgFrom = null, wGrp = null, icsMsg = '';
const TABS = [null, 'week', 'logbook', 'state', 'more'];
const NAVI = {logbook:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>', home:'<path d="M3 11l9-7 9 7v10h-6v-6H9v6H3z"/>', week:'<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>', state:'<path d="M3 12h4l3-7 4 14 3-7h4"/>', more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'};
const svgI = (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${d}</svg>`;
function navGo(k){ PGP = {}; vw = null; pgFrom = null; pg = k || null; open = null; render(); scrollTop0(); }
function goBack(){ const par = PGP[pg] || (typeof PG_PAR !== 'undefined' && PG_PAR[pg]) || (typeof IA_PAR !== 'undefined' && IA_PAR[pg]); if (par) { pg = par; open = null; render(); scrollTop0(); return; } if (false) { pg = PG_PAR[pg]; open = null; render(); scrollTop0(); return; } const k = pgFrom; pgFrom = null; pg = k; open = null; render(); scrollTop0(); }
const tabOf = page => TABS.includes(page) ? page : TABS.includes(pgFrom) ? pgFrom : 'more';
const TABL = {null:'Heute', week:'Woche', logbook:'Logbuch', state:'Fortschritt', more:'Mehr'};
function navBar(page){
  const a = tabOf(page);
  return `<nav class="bnav" aria-label="Hauptnavigation"><div>${TABS.map(k => `<button class="${esc(a === k ? 'on' : '')}" onclick="navGo(${k ? `'${k}'` : 'null'})" aria-current="${a === k ? 'page' : 'false'}">${svgI(NAVI[k || 'home'])}<span>${TABL[k]}</span>${k === 'more' && S.pending ? '<i class="ndot" aria-hidden="true"></i>' : ''}</button>`).join('')}</div></nav>`;
}

/* ---------- Startseite ---------- */
function homePage(){
  const p = S.p;
  const gv = (() => { try { const c = planCheck(p, true); return c.ack ? null : c.verdict; } catch (e) { elog(e); return null; } })();
  const warn = gv === 'high' || gv === 'mid' ? `<button class="panel flex w-full items-center gap-3 p-4 text-left" style="border-left:4px solid ${esc(gv === 'high' ? '#c2410c' : '#d9a400')}" onclick="openGoal('dash')"><span class="min-w-0 flex-1"><span class="block font-semibold">${gv === 'high' ? 'Dein Ziel braucht eine Anpassung' : 'Dein Ziel ist in Reichweite'}</span><span class="text-sm" style="color:var(--mute)">${gv === 'high' ? 'Es gibt gute Wege dorthin. Sieh dir die Optionen an, mit Empfehlung.' : 'Mit ein paar Stellschrauben wird es sicherer. Sieh dir die Optionen an.'}</span></span><span aria-hidden="true" class="text-xl">›</span></button>` : '';
  return `${hlthCard()}${heatCard()}${ovlCard()}${gapCard()}${reentFtpCard()}${morHint()}${bkHint()}${typeof zxHomeNote === 'function' ? zxHomeNote() : ''}${pendingCard()}${xrHome()}${warn}${goalMsg && !pg ? `<p class="text-sm" style="color:var(--ok)">✓ ${esc(goalMsg)}</p>` : ''}${heroDay(p)}${mvTodayCard()}${mvModal()}${vaModal()}${weekStrip()}${reviewCard()}${rcHome()}${tipCard()}${dykCard()}
    <button class="panel gcard w-full p-5 text-left" onclick="goPg('${p.goal === 'event' ? (efList(p).length > 1 ? 'ev-saison' : 'event') : 'check'}')"><span class="min-w-0 flex-1">${goalCard(false)}</span><span aria-hidden="true" class="text-xl" style="color:var(--mute)">›</span></button>
    ${startCard()}`;
}
const shortM = m => m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : `${m}′`;
function weekStrip(){
  const p = S.p, started = hasStarted(p), plan = S.plan || [], t = started ? todayIdx() : -1, so = started ? 0 : startOff(p);
  const po = plan.map((x, i) => pOrig(plan, i)), n = po.filter(x => x && x.m).length, nd = po.filter((x, i) => x && x.m && started && (S.done[i] || (S.actual && S.actual[i]))).length;
  const cells = plan.map((x, i) => {
    const T = TYPES[x.t] || TYPES.rest, ride = x.m > 0, dn = started && ride && (S.done[i] || (S.actual && S.actual[i] && !(x.parts && exePNext(i) != null))), ex = strMap[i] || mobMap[i], pre = i < so;
    return `<button class="wsd${esc(i === t ? ' today' : '')}${esc(pre ? ' pre' : '')}${esc(started && ((i < t && ride && !dn) || (i <= t && !ride && po[i] && po[i].m > 0 && !S.done[i])) ? ' miss' : '')}" onclick="openDay(${ja(i)})" aria-label="${esc(DAYS[i])}: ${ride ? esc(x.n) + ', ' + mm(x.m) : 'Radfrei'}${esc(dn ? ', erledigt' : '')}"><span>${SD[i]}</span><i class="bar" style="background:${esc(ride ? T.c : 'var(--line)')}"></i><b>${ride ? shortM(x.m) : '–'}</b><em>${dn ? '✓' : !ride && started && xrAll().some(q => q.w === S.wk && q.i === i) ? '+' : ex ? '<i class="xd"></i>' : ''}</em></button>`;
  }).join('');
  return `<section><div class="mb-2 flex items-baseline justify-between"><p class="eyebrow">${started ? 'Diese Woche' : 'Startwoche'}</p><button class="text-sm font-semibold" style="color:var(--teal)" onclick="navGo('week')">${started ? `${nd} von ${n} erledigt` : 'Wochenplan'} ›</button></div><div class="wstrip">${cells}</div></section>`;
}

/* ---------- Mehr ---------- */
function morePage(){
  const p = S.p, ph = phases(p), tot = ph[ph.length - 1].to, cw = S.wk, ch = chkHead(p), pr = p.goal === 'event' ? evProfile(p) : null;
  const ns = (p.subs || []).filter(s => s.date >= iso(0) && s.date < p.eventDate).length, libN = Object.keys(readLib().plans).length, exN = Object.keys(EXI).length;
  const row = (k, t, sub, warn) => `<button class="mrow" onclick="goPg('${ja(k)}')"><span class="mi">${svgI(ICO[k])}</span><span class="min-w-0 flex-1"><span class="block font-semibold">${t}</span><span class="block text-xs" style="color:${esc(warn || 'var(--mute)')}">${sub}</span></span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`;
  const ms = testsOn(p) && testWeeks(p).length ? (() => { const tw = testWeeks(p), rs = Object.keys(p.res || {}).map(Number).sort((a, b) => b - a), lr = rs.length ? p.res[rs[0]] : null, nx = tw.find(w => w >= cw && !(p.res || {})[w]); return row('ms', 'Fitness-Checks', lr && !(nx === cw) ? `${ST[lr.st][0]} (${lr.ftp} W)` : nx ? (nx === cw ? 'Check diese Woche' : `Nächster Check: Woche ${nx}`) : 'Alle Checks erledigt'); })() : '';
  const grp = (t, rows) => `<p class="eyebrow mb-2 mt-5">${t}</p><div class="mlist">${rows}</div>`;
  return grp('Dein Plan', `${row('check', 'Plan-Check', ch[0], ch[1])}${p.goal === 'event' ? row('event', 'Event', `${pr ? EVTY[pr.ty][0] : 'Zielzeit und Strecke'}${ns ? ', ' + ns + ' Zwischenevent' + (ns > 1 ? 's' : '') : ''}`) : ''}${row('overview', 'Gesamtplan', `${tot} Wochen bis ${fmt(endOf(p))}`)}${ms}${cycOn(p) ? (c => row('cycle', 'Zyklus', `Tag ${c.day}, ${c.label}`))(cycInfo(p, iso(0))) : ''}${row('plans', 'Meine Pläne', `Plan anpassen, ${libN} gespeichert`)}`)
    + grp('Training', `${row('rides', 'Fahrten bewerten', (S.man || []).length ? (S.man || []).length + ' hochgeladen' : 'Fahrt hochladen und bewerten lassen', S.pending ? '#c0392b' : null)}${row('ex', 'Übungen', `${exN} Übungen mit Grafik`)}${row('science', 'Wissen', 'Ernährung, Training, Gesundheit')}`)
    + grp('Werkzeuge', row('tool-tire', 'Reifendruck', 'Startwert vorn und hinten für dein Rad'))
    + grp('App', `${row('export', 'Export', 'Kalender, Garmin und Zwift')}${row('settings', 'Einstellungen', `${p.tb && p.tb.on ? 'Winter ' + hStd(p.tb.prof.w.h) + ', Sommer ' + hStd(p.tb.prof.s.h) : hStd(p.hours)} Std. pro Woche, ${p.ftp} W`)}`)
    + grp('Team', `<a class="mrow" href="https://teamrelentlessriders.de" target="_blank" rel="noopener" onclick="try{track('homepage-geoeffnet')}catch(e){elog(e)}" style="text-decoration:none;color:inherit"><span class="mi">${svgI('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>')}</span><span class="min-w-0 flex-1"><span class="block font-semibold">Team Relentless Riders</span><span class="block text-xs" style="color:var(--mute)" data-noi18n>teamrelentlessriders.de</span></span><span aria-hidden="true" style="color:var(--mute)">↗</span></a>`);
}

/* ---------- Wochenrückblick ---------- */
function whSum(p, w, plan, done, actual){
  const sw = strWeek, sm = strOf(p, w, plan), mb = mobOf(p, w, plan, sm); strWeek = sw;
  let n = 0, nd = 0, pm = 0, dm = 0, pt = 0, dt = 0;
  plan.forEach((xc, i) => { const x = pOrig(plan, i); if (!x || !x.m) return; n++; pm += x.m; pt += tss(x); const a = actual && actual[i]; if (done[i] || a) { nd++; dm += a ? Math.round(a.sec / 60) : (xc && xc.m) || x.m; dt += a ? a.tss : tss(xc && xc.m ? xc : x); } });
  const kS = Object.keys(sm), kM = Object.keys(mb), sd = kS.filter(i => (S.strDone || {})[`${p.start}|${w}|${i}`]).length, md = kM.filter(i => (S.mobDone || {})[`${p.start}|${w}|${i}`]).length;
  const ex = Object.entries(p.exe || {}).filter(([k]) => k.split('-')[0] === String(w)).map(([, v]) => v);
  const exS = ex.filter(v => v.score != null), sc = exS.length ? Math.round(exS.reduce((a, v) => a + v.score, 0) / exS.length) : null;
  const hard = ex.filter(v => v.rpe && v.x && RPEX[v.x.t] && v.rpe > RPEX[v.x.t][1] + 1).length + ex.filter(v => v.feel === 'low').length;
  const rec = (w % 4 === 0 || (p.recW || []).includes(w));
  return {w, n, nd, pm, dm, pt, dt, s:kS.length, sd, mo:kM.length, md, sc, ne:ex.length, hard, rec, sick:plan.filter(x => x && x.feel === 'sick').length};
}
function whSnap(w){
  try { if (!S.p || !S.plan || !S.wk || S.wk === w || !hasStarted(S.p) || S.wk > w) return;
    S.p.wh = S.p.wh || {}; S.p.wh[S.wk] = whSum(S.p, S.wk, S.plan, S.done || {}, S.actual || {}); S.p.whNew = S.wk; } catch (e) { elog(e); }
}
function whMsg(r){
  const pc = r.n ? r.nd / r.n : 1;
  if (r.sick && pc < .9) return 'Diese Woche warst du krank. Richtig, dass du pausiert hast: Wer krank trainiert, fällt oft länger aus. Steig locker wieder ein, nachholen musst du nichts.';
  if (r.rec && pc >= .5) return 'Erholungswoche geschafft. In der Erholung passt sich dein Körper an das Training an, jetzt bist du bereit für den nächsten Block.';
  if (pc >= .9) return 'Starke Woche! Du hast fast alles umgesetzt. Genau diese Regelmäßigkeit macht dich schneller.';
  if (pc >= .6) return 'Solide Woche. Die wichtigsten Einheiten sitzen, der Plan läuft wie vorgesehen weiter.';
  if (pc > 0) return 'Diese Woche kam weniger zusammen als geplant. Das passiert jedem. Nachholen musst du nichts, starte einfach frisch in die neue Woche.';
  return 'In dieser Woche wurde keine Einheit erledigt. Warst du krank oder unterwegs? Unter Einstellungen kannst du den Planstart verschieben.';
}
function whBody(r, full){
  const tile = (v, l) => `<div class="rvt"><b>${v}</b><span>${l}</span></div>`;
  const hh = m => m % 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : String(m / 60);
  return `<div class="rvg">${tile(r.nd + '/' + r.n, 'Einheiten')}${tile(hh(r.dm), 'Std. von ' + hh(r.pm))}${r.sc != null ? tile(r.sc, 'Ø Bewertung') : tile(r.dt, 'TSS')}${r.s + r.mo ? tile((r.sd + r.md) + '/' + (r.s + r.mo), 'Kraft, Mobilität') : ''}</div>
    <p class="mt-3 text-sm">${(() => { try { const rr = r.from ? r : {...r, from:addD(S.p.start, (r.w - 1) * 7), to:addD(S.p.start, (r.w - 1) * 7 + 6)}; rcArchSync(); const L = rcWeekLines(rr); return L.length ? L.map(x => `<span>${x}</span>`).join(' ') : whMsg(r); } catch (e) { elog(e); return whMsg(r); } })()}${r.hard >= 2 ? ' Mehrere Einheiten fühlten sich härter an als vorgesehen. Achte diese Woche besonders auf Schlaf und Essen.' : ''}</p>${full ? '' : (n => n ? `<p class="mt-2 text-sm" style="color:var(--mute)">${n}</p>` : '')(rcNext())}`;
}
function reviewCard(){
  const p = S.p, w = p.whNew, r = w && p.wh ? p.wh[w] : null;
  if (!r || w !== S.wk - 1 || (p.whSeen || {})[w]) return '';
  return `<section class="panel p-4" style="border-top:3px solid var(--ice)"><div class="flex items-start gap-2"><div class="min-w-0 flex-1"><p class="eyebrow">Wochenrückblick</p><p class="mt-0.5 font-semibold">Woche ${w}${r.rec ? ', Erholungswoche' : ''}</p></div><button class="text-xl leading-none" style="color:var(--mute)" onclick="whClose(${ja(w)})" aria-label="Rückblick schließen">×</button></div>
    ${whBody(r)}<button class="mt-3 text-sm font-semibold" style="color:var(--teal)" onclick="rcSel.w=${ja(w)};whClose(${ja(w)});goPg('rc')">Alle Rückblicke ›</button></section>`;
}
function whClose(w){ S.p.whSeen = {...(S.p.whSeen || {}), [w]:1}; save(); render(); }

/* ---------- Tipp zu heute ---------- */
/* Krank: statt Ernährungstipp ein ermutigender Ausblick (wie viel Form kostet die Pause, wie geht es weiter, was steht als Nächstes an) */
function sickTip(p){
  const t = todayIdx(), plan = S.plan || [], j = plan.findIndex((x, i) => i > t && x && x.m > 0 && x.feel !== 'sick');
  const ev = p.goal === 'event' && p.eventDate ? Math.ceil((new Date(p.eventDate + 'T12:00:00') - Date.now()) / 6048e5) : 0;
  const a = 'Kurz krank zu sein kostet kaum Form. Deutlich sinkt die Ausdauer erst nach etwa zwei Wochen ohne Training, und was du dir aufgebaut hast, kommt danach schneller zurück als beim ersten Mal.';
  const b = ev >= 3 ? ` Bis zu deinem Event sind es noch ${ev} Wochen, genug Zeit: Ein paar Tage Pause ändern daran nichts.` : ev > 0 ? ' Auch so kurz vor dem Event gilt: Gesund an den Start zu gehen ist wichtiger als jede einzelne Einheit.' : '';
  const c = ` So geht es weiter: 24 Stunden fieberfrei, dann zwei lockere Tage, danach läuft der Plan normal weiter.${j >= 0 ? ` Als Nächstes steht ${DAYS[j]} ${esc(plan[j].n)} an. Bist du dann noch nicht fit, tippe dort auf „Befinden“, und die App passt die Einheit an.` : ''}`;
  return a + b + c;
}
function tipCard(){
  const p = S.p; if (!hasStarted(p) || !S.plan) return '';
  const x = S.plan[todayIdx()] || {}, sick = x.feel === 'sick';
  const ico = `<span class="tic">${svgI('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>', 20)}</span>`;
  if (sick) { const rodeSick = (() => { try { return allActs().some(a => a.day === iso(0)); } catch (e) { elog(e); return false; } })();
    return `<section class="tipc">${ico}<div class="min-w-0 flex-1"><p class="eyebrow">Gute Besserung</p><p class="mt-1 text-sm">${(rodeSick ? 'Heute ist eine Fahrt eingegangen, obwohl du dich krank eingetragen hast. Bist du wieder fit, tippe oben auf „Befinden“ und nimm „Krank“ zurück. Mit Fieber bitte nicht fahren. ' : '') + sickTip(p)}</p></div></section>`; }
  /* F20: Tipp aus dem Katalog (passend zum Tag, ohne schnelle Wiederholung) */
  let t = null; try { t = tipToday(false); } catch (e) { elog(e); } if (!t) return '';
  const en = lang() === 'en', b = (l, f) => `<button class="text-sm font-semibold" style="color:var(--teal);background:none;border:0;padding:0;min-height:44px" onclick="${f}">${l}</button>`;
  return `<section class="tipc">${ico}<div class="min-w-0 flex-1"><p class="eyebrow">Tipp zu heute · <span>${TIP_CAT[t[1]]}</span></p><p class="mt-1 text-sm" data-noi18n>${esc(tipText(t, en))}</p>
    <div class="mt-1 flex flex-wrap gap-x-4">${t[6] ? b('Mehr dazu ›', `wOpen('${ja(t[6])}')`) : ''}${b('Nächster Tipp', 'tipNext()')}${b('Nicht mehr zeigen', 'tipHide()')}</div></div></section>`;
}

/* ---------- Wissen in drei Gruppen ---------- */
const WGRP = [['ern', 'Ernährung', ['w-calc', 'w-alltag', 'w-vor', 'w-waehrend', 'w-nach', 'w-supp']], ['trn', 'Training', ['w-train', 'w-zonen', 'w-zeit', 'w-race']], ['ges', 'Gesundheit', ['w-erh', 'w-energie', 'w-sex']]];
const wGrpOf = id => (WGRP.find(g => g[2].includes(id)) || WGRP[0])[0];
function wOpen(id){ wGrp = wGrpOf(id); pgFrom = pg == null || TABS.includes(pg) ? pg : pgFrom; pg = 'science'; open = null; render(); setTimeout(() => wGo(id), 40); }
function wissenGrouped(p){
  const html = wissenPage(p), g = wGrp || 'ern', G = WGRP.find(x => x[0] === g);
  const blocks = {}; html.replace(/<details id="(w-[a-z]+)"[\s\S]*?<\/details>/g, (m, id) => { blocks[id] = m; return m; });
  const intro = (/^\s*<p[\s\S]*?<\/p>/.exec(html) || [''])[0];
  const tabs = `<div class="dtabs" role="tablist">${WGRP.map(([k, l]) => `<button role="tab" aria-selected="${k === g}" class="${esc(k === g ? 'on' : '')}" onclick="wGrp='${ja(k)}';render()">${l}</button>`).join('')}</div>`;
  return intro + tabs + G[2].map(id => blocks[id] || '').join('') + (blocks['w-src'] || '');
}

/* ---------- Fortschritt: Verlauf ---------- */
function wkOfDate(p, d){ return Math.floor((new Date(d + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 6048e5) + 1; }
function ftpTrack(){
  const p = S.p; if (!p) return; p.ftpH = p.ftpH || [{d:p.start, v:p.ftpStart || p.ftp}];
  if (p.ftpH[p.ftpH.length - 1].v !== p.ftp) p.ftpH.push({d:iso(0), v:p.ftp});
}
function progCard(){
  const p = S.p, ph = phases(p), tot = ph[ph.length - 1].to, cw = hasStarted(p) ? S.wk : 1;
  const W = 340, H = 170, L = 36, R = 8, Tp = 10, B = 22, X = w => L + (w - 1) * (W - L - R) / Math.max(1, tot - 1);
  const exp = []; for (let w = 1; w <= tot; w++) { try { exp.push(expAt(p, w)); } catch (e) { elog(e); exp.push(null); } }
  const fh = (p.ftpH || [{d:p.start, v:p.ftpStart || p.ftp}]).map(q => ({w:Math.max(1, Math.min(tot, wkOfDate(p, q.d))), v:q.v}));
  const tests = Object.entries(p.res || {}).map(([w, r]) => ({w:+w, v:r.ftp})).filter(r => r.v > 0);
  let goal = null; try { goal = p.goal === 'ftp' ? p.ftpTarget : p.goal === 'event' ? (evCheck(p) || {}).ftpNeed : null; } catch (e) { elog(e); }
  const vals = [...exp.filter(Boolean).flatMap(e => [e.lo, e.hi]), ...fh.map(q => q.v), ...tests.map(q => q.v), ...(goal ? [goal] : [])];
  const lo = Math.floor(Math.min(...vals) * .97 / 10) * 10, hi = Math.ceil(Math.max(...vals) * 1.02 / 10) * 10, Y = v => Tp + (hi - v) * (H - Tp - B) / Math.max(1, hi - lo);
  const band = exp.map((e, i) => e ? `${X(i + 1).toFixed(1)},${Y(e.hi).toFixed(1)}` : null).filter(Boolean).join(' ') + ' ' + exp.map((e, i) => e ? `${X(i + 1).toFixed(1)},${Y(e.lo).toFixed(1)}` : null).filter(Boolean).reverse().join(' ');
  let step = ''; fh.forEach((q, i) => { step += (i ? ` L${X(q.w).toFixed(1)},${Y(fh[i - 1].v).toFixed(1)} ` : 'M') + `${X(q.w).toFixed(1)},${Y(q.v).toFixed(1)}`; }); step += ` L${X(cw).toFixed(1)},${Y(fh[fh.length - 1].v).toFixed(1)}`;
  const yt = [lo, Math.round((lo + hi) / 20) * 10, hi], xt = [1, ...ph.slice(1).map(x => x.from), tot].filter((v, i, a) => a.indexOf(v) === i);
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pchart" role="img" aria-label="FTP-Verlauf">
    ${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="gl0"/><text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end" class="tx">${v}</text>`).join('')}
    ${ph.map(x => `<rect x="${X(x.from) - (x.from > 1 ? (W - L - R) / Math.max(1, tot - 1) / 2 : 0)}" y="${H - B + 4}" width="${(x.to - x.from + (x.from > 1 ? 1 : .5)) * (W - L - R) / Math.max(1, tot - 1)}" height="3" fill="${x.color}"/>`).join('')}
    ${xt.map(w => `<text x="${X(w)}" y="${H - 4}" text-anchor="middle" class="tx">${w}</text>`).join('')}
    <polygon points="${band}" class="band"/>
    ${goal ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}" class="goal"/><text x="${W - R}" y="${Y(goal) - 4}" text-anchor="end" class="tx tg">Ziel ${goal} W</text>` : ''}
    <line x1="${X(cw)}" x2="${X(cw)}" y1="${Tp}" y2="${H - B}" class="now"/>
    <path d="${step}" class="ftpl"/>
    ${tests.map(t => `<circle cx="${X(t.w)}" cy="${Y(t.v)}" r="4.5" class="tdot"/>`).join('')}</svg>`;
  /* Wochenumfang und Fitness */
  const wh = {...(p.wh || {})}; if (hasStarted(p) && S.plan) wh[S.wk] = whSum(p, S.wk, S.plan, S.done || {}, S.actual || {});
  const ws = Object.keys(wh).map(Number).filter(w => w <= cw).sort((a, b) => a - b);
  let vol = '';
  if (ws.length) {
    const mx = Math.max(...ws.map(w => Math.max(wh[w].pm, wh[w].dm)), 60), H2 = 120, bw = (W - L - R) / tot, Y2 = v => Tp + (H2 - Tp - B) * (1 - v / mx);
    let ctl = 0; const cl = []; for (let w = 1; w <= cw; w++) { const r = wh[w]; ctl += ((r ? r.dt : 0) / 7 - ctl) * (1 - Math.exp(-7 / 42)); if (r) cl.push([w, ctl]); }
    const cm = Math.max(...cl.map(c => c[1]), 1), Yc = v => Tp + (H2 - Tp - B) * (1 - v / cm * .9);
    vol = `<p class="mt-5 font-semibold">Wochenumfang und Fitness</p><svg viewBox="0 0 ${W} ${H2}" class="pchart" role="img" aria-label="Wochenumfang">
      ${[0, mx].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y2(v)}" y2="${Y2(v)}" class="gl0"/><text x="${L - 4}" y="${Y2(v) + 3}" text-anchor="end" class="tx">${Math.round(v / 60)} h</text>`).join('')}
      ${ws.map(w => { const r = wh[w], x0 = L + (w - 1) * bw + bw * .15, bwi = bw * .7; return `<rect x="${x0}" y="${Y2(r.pm)}" width="${bwi}" height="${Y2(0) - Y2(r.pm)}" class="bp"/><rect x="${x0}" y="${Y2(r.dm)}" width="${bwi}" height="${Y2(0) - Y2(r.dm)}" class="bd"/>`; }).join('')}
      ${cl.length > 1 ? `<polyline points="${cl.map(([w, v]) => `${(L + (w - .5) * bw).toFixed(1)},${Yc(v).toFixed(1)}`).join(' ')}" class="ctll"/>` : ''}
      ${xt.map(w => `<text x="${L + (w - .5) * bw}" y="${H2 - 6}" text-anchor="middle" class="tx">${w}</text>`).join('')}</svg>
      <div class="plg"><span><i class="lg-bp"></i>geplant</span><span><i class="lg-bd"></i>erledigt</span>${cl.length > 1 ? '<span><i class="lg-ctl"></i>Fitness (CTL, geschätzt)</span>' : ''}</div>`;
  }
  const revs = Object.keys(p.wh || {}).map(Number).sort((a, b) => b - a);
  const list = revs.length ? `<p class="mt-5 font-semibold">Wochenrückblicke</p><div class="mt-2 space-y-2">${revs.slice(0, 8).map(w => { const r = p.wh[w]; return `<details class="rvd"${w === revs[0] ? ' open' : ''}><summary><b>Woche ${w}</b><span>${r.nd}/${r.n} Einheiten · ${mm(r.dm)}${r.sc != null ? ' · Ø ' + r.sc + '/100' : ''}</span></summary>${whBody(r)}</details>`; }).join('')}</div>` : '<p class="mt-4 text-xs" style="color:var(--mute)">Ab jetzt speichert die App zum Ende jeder Woche einen Rückblick. Er erscheint dann hier und zu Wochenbeginn auf der Startseite.</p>';
  return `<section class="panel p-4"><h2 class="hd text-xl font-semibold">Verlauf</h2><p class="mt-0.5 text-sm" style="color:var(--mute)">FTP über den ganzen Plan, Woche ${cw} von ${tot}</p>${svg}
    <div class="plg"><span><i class="lg-ftp"></i>dein FTP</span><span><i class="lg-band"></i>erwarteter Korridor</span>${tests.length ? '<span><i class="lg-t"></i>Fitness-Check</span>' : ''}${goal ? '<span><i class="lg-goal"></i>' + (p.goal === 'event' ? 'nötig für Zielzeit' : 'Ziel-FTP') + '</span>' : ''}</div>
    <p class="mt-2 text-xs" style="color:var(--mute)">Der Korridor zeigt, wo dein FTP bei normalem Trainingsverlauf liegen sollte. Er rechnet ab dem letzten übernommenen Fitness-Check neu.</p>${vol}${list}</section>`;
}

