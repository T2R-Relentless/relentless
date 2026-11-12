/* ---------- Plan-Generator ---------- */
const D = (t,n,m,lo,hi,cad,st,tip) => ({t,n,m,lo,hi,cad,st,tip});
const REST = D('rest','Ruhetag',0,0,0,'','Komplett frei: Schlaf, Ernährung, 10 Min. Mobility.','Wer heute nichts tut, fährt morgen schneller.');
const REC  = D('rec','Rekom-Fahrt',45,45,55,'90–100 U/min','45 Min. im kleinen Gang, Puls unter 60 % HFmax, flach.','Kein Ehrgeiz. Die Beine sollen sich danach besser anfühlen als davor.');
const endOf = p => p.goal === 'event' ? p.eventDate : p.endDate;
function phases1(p){
  const t = Math.min(52, Math.max(2, Math.floor((new Date(endOf(p) + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 6048e5) + 1)), fit = p.goal === 'fitness', tp = p.goal === 'event' && t >= 8 ? 2 : 1, n = t - tp;
  let b = Math.max(1, Math.round(n * (fit ? .5 : .4))), k = fit || n < 3 ? 0 : Math.max(1, Math.round(n * .2)), u = n - b - k;
  if (u < 0) { u = 0; b = n - k; }
  const ev = p.goal === 'event', L = {
    base:['Basis','Aerobe Grundlage: viel Zone 2, wenig Intensität','#62c7ff'],
    build:['Aufbau','Je eine Intervalleinheit über der Schwelle und eine Sweet-Spot- oder Schwelleneinheit, Umfang steigt','#fbbf24'],
    peak:['Spitze', ev ? 'Eventspezifisch: lange Ritte, VO2max-Schärfe' : 'VO2max-Reize, maximale Leistung','#f87171'],
    taper:[ev ? 'Tapering' : p.goal === 'ftp' ? 'Test und Entlastung' : 'Abschluss','Umfang sinkt um etwa 40 bis 60 %, Intensität und Fahrhäufigkeit bleiben','#34d399']};
  let w = 1;
  return [['base',b],['build',u],['peak',k],['taper',tp]].filter(x => x[1] > 0).map(([key,c]) => { const o = {key,name:L[key][0],desc:L[key][1],color:L[key][2],from:w,to:w+c-1,weeks:c}; w += c; return o; });
}
/* ---------- Saisonplanung: mehrere A-Events = mehrere Formhöhepunkte ----------
   Ein A-Event (das Hauptevent): alle anderen Events sind Bausteine (B/C) auf dem Weg dorthin, Phasen wie bisher.
   Weitere A-Events vor dem Hauptevent: Die Saison wird in Abschnitte geteilt, jeder endet mit einem Tapering zum A-Event.
   Nach einem A-Event folgt eine Regenerationswoche. Reicht die Zeit bis zum nächsten A-Event für einen neuen Aufbau
   (ab 7 Wochen), gibt es Aufbau, Spitze und Tapering. Bei weniger Zeit hält die App die Form mit kurzen, knackigen
   Reizen und plant ein kurzes Tapering. Höchstens 52 Wochen. */
const SEASON_MIN = 7;
const seasWk = (p, ds) => Math.floor((new Date(ds + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 6048e5) + 1;
function seasonA(p){
  if (!p || p.goal !== 'event' || !p.start || !p.eventDate) return [];
  const subs = (p.subs || []).filter(s => s.prio === 'A' && s.date && s.date < p.eventDate && seasWk(p, s.date) >= 2).sort((a, b) => a.date.localeCompare(b.date));
  const out = [], seen = new Set(); subs.forEach(s => { const w = seasWk(p, s.date); if (!seen.has(w)) { seen.add(w); out.push({date:s.date, name:s.name, id:s.id, w}); } });
  out.push({date:p.eventDate, name:p.eventName || 'Hauptevent', main:true, w:seasWk(p, p.eventDate)});
  return out;
}
function phases(p){
  const A = seasonA(p); if (A.length < 2) return phases1(p);
  const tot = Math.min(52, A[A.length - 1].w), out = [];
  const add = (key, from, to, ev, extra) => { if (to < from || from > tot) return; to = Math.min(to, tot); const L = {base:['Basis', 'Aerobe Grundlage: viel Zone 2, wenig Intensität', '#62c7ff'], build:['Aufbau', 'Intervalle über der Schwelle und Sweet Spot, Umfang steigt', '#fbbf24'], peak:['Spitze', 'Eventspezifisch: lange Ritte, VO2max-Schärfe', '#f87171'], taper:['Tapering', 'Umfang sinkt um etwa 40 bis 60 %, Intensität und Fahrhäufigkeit bleiben', '#34d399']}[key];
    out.push({key, name:L[0], desc:L[1], color:L[2], from, to, weeks:to - from + 1, ev, ...(extra || {})}); };
  /* 1. Abschnitt: wie ein normaler Eventplan bis zum ersten A-Event */
  phases1({...p, eventDate:A[0].date}).forEach(x => out.push({...x, ev:A[0]}));
  for (let k = 1; k < A.length; k++) {
    const s = A[k - 1].w + 1, e = Math.min(tot, A[k].w), g = e - s + 1, ev = A[k];
    if (g <= 0) continue;
    if (g === 1) { add('taper', s, e, ev, {name:'Form halten', desc:'Direkt nach dem letzten A-Event: locker regenerieren und frisch ins nächste Event.', keep:1}); continue; }
    add('base', s, s, ev, {name:'Regeneration', desc:'Nach dem A-Event: weniger Umfang, locker fahren, Kopf frei bekommen.', color:'#a5b4fc', rec:1});
    const r = g - 1;
    if (g >= SEASON_MIN) { const tp = r >= 8 ? 2 : 1, pk = Math.max(1, Math.round((r - tp) * .3)), bu = r - tp - pk;
      add('build', s + 1, s + bu, ev, {name:'Wiederaufbau'}); add('peak', s + 1 + bu, s + bu + pk, ev); add('taper', e - tp + 1, e, ev); }
    else { add('peak', s + 1, e - 1, ev, {name:'Form halten', desc:'Zu wenig Zeit für einen neuen Aufbau: kurze, knackige Reize halten die Form.', color:'#fb923c', keep:1}); add('taper', e, e, ev, {desc:'Kurzes Tapering: eine Woche weniger Umfang, die Intensität bleibt.'}); }
  }
  return out;
}
/* Übersicht für Event-Seite und Planung */
function seasonInfo(p){
  const A = seasonA(p), subs = (p.subs || []).filter(s => s.date < p.eventDate), cnt = k => subs.filter(s => (s.prio || 'C') === k).length;
  const gaps = []; for (let k = 1; k < A.length; k++) { const g = A[k].w - A[k - 1].w; gaps.push({a:A[k - 1], b:A[k], g, keep:g < SEASON_MIN}); }
  return {A, nA:A.length, nB:cnt('B'), nC:cnt('C'), gaps, multi:A.length > 1};
}
function seasonNote(p){
  const si = seasonInfo(p); if (!si.multi) return si.nB + si.nC ? `<p class="text-sm">Ein Formhöhepunkt: <b data-noi18n>${esc(p.eventName || 'dein Hauptevent')}</b>. Alle anderen Events sind Bausteine auf dem Weg dorthin.</p>` : '';
  const close = si.gaps.filter(x => x.keep);
  return `<p class="text-sm"><b>${si.nA} Formhöhepunkte</b> in dieser Saison. Vor jedem A-Event plant die App ein Tapering, danach eine Woche Regeneration.</p>`
    + close.map(x => `<p class="mt-2 p-2.5 text-sm" style="background:#fff6dc;border:1px solid #d9a400">Zwischen <b data-noi18n>${esc(x.a.name)}</b> und <b data-noi18n>${esc(x.b.name)}</b> liegen nur ${x.g} Wochen. Für einen neuen Formaufbau braucht es etwa ${SEASON_MIN}. Die App hält deshalb deine Form mit kurzen, knackigen Einheiten und plant ein kurzes Tapering. Die Form erreicht trotzdem ihren Höhepunkt, aber nicht ganz so hoch wie nach einem vollen Aufbau.</p>`).join('');
}
const PRIO_C = {A:['#f87171', '#450a0a'], B:['#0b1c49', '#fff'], C:['#e6f7f6', '#007f8d']};
const prioBadge = k => `<b class="px-2 text-xs" style="background:${esc(PRIO_C[k || 'C'][0])};color:${esc(PRIO_C[k || 'C'][1])}">${k || 'C'}</b>`;
/* Nach dem letzten Event bzw. Planende: Übergangsphase und nächste Saison */
function seasonOver(p){
  const d = Math.round((new Date(iso(0) + 'T12:00:00') - new Date(endOf(p) + 'T12:00:00')) / 864e5), ev = p.goal === 'event';
  const t = d <= 14 ? (ev ? 'Saison geschafft!' : 'Plan geschafft!') : 'Zeit für das nächste Ziel';
  const x = d <= 14 ? `Jetzt kommt die Übergangsphase (noch etwa ${15 - d} Tage): fahr nach Lust und Laune, 2 bis 3 lockere Ausfahrten pro Woche, gern auch etwas anderes wie Laufen, Wandern oder Schwimmen. Keine Intervalle, kein Plan. So erholen sich Körper und Kopf, und du startest motiviert in die nächste Saison.`
    : 'Die Übergangsphase ist vorbei. Plane jetzt deine nächste Saison: Trag dein nächstes Hauptevent ein und dazu alle Rennen, die du fahren willst. Mit A-Events bekommst du mehrere Formhöhepunkte.';
  return `<section class="hero"><p class="eyebrow" style="color:var(--ice)">${ev ? esc(p.eventName || 'Dein Event') : 'Dein Plan'}</p><p class="hd mt-1 text-3xl font-semibold">${t}</p><p class="mt-2 text-sm" style="opacity:.85">${x}</p><div class="hact"><button class="hbtn" onclick="newPlan()">Nächste Saison planen</button></div></section>`;
}
const curWeek = p => { const t = phases(p).slice(-1)[0].to, dd = Math.round((new Date(lstr(new Date()) + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 864e5); return Math.min(t, Math.max(1, Math.floor(dd / 7) + 1)); };
const comSes = (p, i) => ({...D('com','Pendeln mit dem Rad', 2 * legOf(p, i), 45, 65, '85–95 U/min', 'Hin- und Rückweg locker fahren. Kleine Gänge, keine Sprints an Ampeln.', 'Pendeln ist günstiger Grundlagenumfang und kostet keine Extrazeit.'), parts:[{lbl:'Hinweg', m:legOf(p, i), st:'Locker zur Arbeit: kleine Gänge, keine Sprints an Ampeln.'}, {lbl:'Rückweg', m:legOf(p, i), st:'Locker nach Hause, die Beine ausrollen lassen.'}]});
const ivCore = v => v.seq ? v.seq.reduce((a, b) => a + b, 0) + (v.seq.length - 1) * v.rest : (v.sets || 1) * (v.reps * v.work + (v.reps - 1) * v.rest) + ((v.sets || 1) - 1) * (v.sr || 0);
const durT = m => m < 1 ? Math.round(m * 60) + ' Sek.' : m % 1 ? `${Math.floor(m)}:${String(Math.round(m % 1 * 60)).padStart(2, '0')} Min.` : m + ' Min.';
const ivTxt = v => v.seq ? vaSeqTxt(v) : `${v.wu} Min. einfahren · ${(v.sets || 1) > 1 ? v.sets + ' Serien à ' : ''}${v.reps}×${durT(v.work)} @ ${v.lo}–${v.hi} % · ${durT(v.rest)} ${v.rlo ? `@ ${v.rlo}–${v.rhi} % dazwischen (knapp unter der Schwelle, nicht locker)` : 'locker dazwischen'}${(v.sets || 1) > 1 ? ' · ' + v.sr + ' Min. Pause zwischen den Serien' : ''} · ${v.cd} Min. ausfahren`;
/* Intervalleinheit an eine Zeitgrenze anpassen: erst Ein-/Ausfahren kürzen, dann Wiederholungen, dann Intervalllänge. Passt nichts, wird es eine lockere Einheit. */
function fitIv(x, capM){
  if (!x.iv || x.m <= capM) return x;
  const tm = q => q.wu + ivCore(q) + q.cd; let v = {...x.iv};
  if (tm(v) > capM) v = {...v, wu:Math.min(v.wu, 10), cd:Math.min(v.cd, 5)};
  while (tm(v) > capM && (v.sets || 1) > 1) v = {...v, sets:v.sets - 1};
  while (tm(v) > capM && v.reps > 2) v = {...v, reps:v.reps - 1};
  while (tm(v) > capM && v.work >= 6) v = {...v, work:v.work - 2};
  if (tm(v) > capM || capM < 25) return {...D('base', 'Grundlage Z2', Math.max(20, Math.min(capM, 60)), 56, 72, '90 U/min', 'Locker in Zone 2. Für die geplanten Intervalle reicht die Zeit an diesem Tag nicht, darum heute locker.', 'Lieber kurz und locker als gehetzt.'), cut:1};
  const ws = v.work === x.iv.work, n = ws ? x.n.replace(/(\d+)×/, v.reps + '×') : x.n.replace(/(\d+)×(\d+)/, v.reps + '×' + v.work);
  return {...x, iv:v, m:Math.round(tm(v)), n:(v.sets || 1) !== (x.iv.sets || 1) ? n + ` (${v.sets || 1} Serie${(v.sets || 1) > 1 ? 'n' : ''})` : n, st:ivTxt(v) + ' Auf deine verfügbare Zeit angepasst.', cut:1};
}
/* ---------- Event-Anforderungsprofil: Strecke analysieren, Plan spezifisch ausrichten ---------- */
function findClimbs(c){
  const out = []; let d = 0, cur = null;
  const close = () => { if (cur && cur.riseC >= 25 && cur.lenC >= 300) out.push({km:cur.start / 1000, len:cur.lenC, hm:cur.riseC, g:cur.riseC / cur.lenC}); cur = null; };
  for (const [l, g] of c.seg) {
    if (g >= 20) { if (!cur) cur = {start:d, len:0, rise:0, lenC:0, riseC:0}; cur.len += l; cur.rise += l * g / 1000; cur.lenC = cur.len; cur.riseC = cur.rise; }
    else if (cur && g > -30 && cur.len - cur.lenC + l <= 500) { cur.len += l; cur.rise += l * g / 1000; }
    else close();
    d += l;
  }
  close(); return out;
}
const EVTY = {
  alpin:['Alpiner Langstrecken-Marathon', 'Lange Anstiege entscheiden. Gefragt sind Schwellenleistung über 20 bis 60 Minuten, W/kg und Ausdauer über viele Stunden.'],
  huegel:['Hügeliger Marathon', 'Wechsel aus mittleren Anstiegen und Flachstücken. Gefragt sind VO2max für Anstiege von 3 bis 10 Minuten, Schwelle und solide Ausdauer.'],
  punch:['Welliges Rennen mit kurzen Anstiegen', 'Viele kurze, steile Anstiege und Tempowechsel. Gefragt sind Spritzigkeit (30 Sekunden bis 2 Minuten über dem FTP), schnelle Erholung und VO2max.'],
  flach:['Schnelles, flaches Rennen', 'Hohes Tempo im Feld. Gefragt sind Tempohärte, Antritte nach Kurven oder Attacken und gutes Fahren im Windschatten.'],
  ultra:['Ultra-Distanz / 24 Stunden', 'Sehr lange Belastung mit gleichmäßigem Tempo. Gefragt sind Grundlagenausdauer, Fettstoffwechsel, Verpflegung und Pausenroutine.']
};
const _evpC = new Map();
function evProfile(p){
  if (!p || p.goal !== 'event' || !(p.dist > 0)) return null;
  const e = EVS.find(x => x.id === p.evId), key = [p.dist, p.hm, p.targetTime, p.ftp, p.weight, p.evId, p.fmt, p.draft, p.course ? p.course.seg.length + ':' + p.course.hm + ':' + (p.course.laps || 1) : 0].join('|');
  if (_evpC.has(key)) return _evpC.get(key);
  const hm = p.hm || 0, hk = hm / p.dist, tm = /^(\d+):(\d{1,2})$/.exec(String(p.targetTime || '').trim());
  let tev = e && e.dur ? e.dur : 0;
  if (!tev) { const r = evCheck({...p, targetTime:'5:00'}), est = r && r.real ? r.real : Math.round(p.dist / 25 * 60), tg = tm ? +tm[1] * 60 + +tm[2] : 0; tev = tg ? Math.round(Math.min(est * 1.6, Math.max(est * .75, tg))) : est; }
  const race = p.fmt ? p.fmt === 'race' : e ? !!e.race : /(rennen|race|preis|kriterium|criterium)/i.test(p.eventName || '');
  let climbs = null, nS = 0, nM = 0, nL = 0, tL = 0, sc;
  if (p.course && p.course.seg && p.course.seg.length) {
    const kg = kgOf(p), m = kg + MODEL.extra, cda = MODEL.cda0 * Math.pow(kg / 75, .312) * (DRAFT[p.draft] || DRAFT.grp)[0], P = (p.ftp || 200) * .9;
    climbs = findClimbs(p.course).map(c => ({...c, min:c.len / spdAt(P, c.g, m, cda) / 60}));
    climbs.forEach(c => { if (c.min < 3) nS++; else if (c.min <= 12) nM++; else { nL++; tL += c.min; } });
    const LP = p.course.laps || 1; nS *= LP; nM *= LP; nL *= LP; tL *= LP;
    const per = 100 / p.dist, sh = tL / tev;
    sc = {dur:tev < 150 ? 1 : tev < 300 ? 2 : 3, lng:sh > .3 ? 3 : sh > .15 ? 2 : sh > .04 ? 1 : 0, med:nM * per >= 5 ? 3 : nM * per >= 2 ? 2 : nM ? 1 : 0,
      spr:Math.min(3, (nS * per >= 8 ? 3 : nS * per >= 3 ? 2 : nS ? 1 : 0) + (race ? 1 : 0)), tmp:Math.min(3, (hk < 6 ? 2 : hk < 12 ? 1 : 0) + (race ? 1 : 0))};
  }
  let ty = e && e.ty ? e.ty : tev >= 720 ? 'ultra' : null;
  if (!ty) ty = sc ? (sc.lng >= 2 ? 'alpin' : hk < 6 && sc.lng === 0 && sc.med <= 1 ? 'flach' : sc.spr >= 2 && sc.lng <= 1 ? 'punch' : 'huegel')
    : hk >= 18 ? 'alpin' : hk >= 10 ? 'huegel' : hk >= 5 ? (race ? 'punch' : 'huegel') : 'flach';
  if (!sc) { const r = race ? 1 : 0, d = tev < 150 ? 1 : tev < 300 ? 2 : 3;
    sc = {alpin:{dur:d, lng:3, med:1, spr:r, tmp:0}, huegel:{dur:d, lng:hk >= 14 ? 2 : 1, med:2, spr:1 + r, tmp:1}, punch:{dur:d, lng:0, med:2, spr:Math.min(3, 2 + r), tmp:1 + r}, flach:{dur:d, lng:0, med:1, spr:1 + r, tmp:Math.min(3, 2 + r)}, ultra:{dur:3, lng:hk >= 15 ? 1 : 0, med:1, spr:0, tmp:2}}[ty]; }
  if (ty === 'ultra') sc.dur = 3;
  const lbP = ty === 'ultra' ? 360 : Math.min(360, Math.max(180, Math.round(tev * .8 / 15) * 15));
  const out = {ty, race, tev, hk, climbs, nS, nM, nL, tL, sc, lbP, est:!climbs};
  if (_evpC.size > 50) _evpC.clear(); _evpC.set(key, out); return out;
}
function setFmt(v){ S.d.fmt = v; save(); render(); }
const fmtChips = d => { const pr = evProfile({...d, fmt:undefined}), auto = pr ? (pr.race ? 'race' : 'mara') : 'mara', cur = d.fmt || auto;
  return `<div><p class="mb-2 text-sm" style="color:var(--mute)">Format des Events</p><div class="flex flex-wrap gap-2">${chip('Rennen mit Massenstart', cur === 'race', "setFmt('race')")}${chip('Marathon / Radrundfahrt', cur === 'mara', "setFmt('mara')")}</div></div>`; };
const EVMIX = {
  alpin:{build:'Schwelle und VO2max, die Intervalle werden schrittweise länger', peak:'Lange Schwelle 3×15 und VO2max', long:'lange Anstiege von 15 bis 30 Minuten bei 75 bis 85 % FTP'},
  huegel:{build:'VO2max und Sweet Spot, die Intervalle werden schrittweise länger', peak:'VO2max und Schwelle', long:'welliges Gelände, Anstiege in Zone 3'},
  punch:{build:'VO2max 30/15 und Sweet Spot, die Belastungszeit steigt schrittweise', peak:'', long:'6 bis 10 kurze Anstiege (30 bis 90 Sekunden) zügig drüberdrücken'},
  flach:{build:'VO2max 30/15 und Sweet Spot, die Belastungszeit steigt schrittweise', peak:'', long:'Gruppenfahrt mit 3×15 Minuten Gruppentempo bei 80 bis 88 % FTP'},
  ultra:{build:'Sweet Spot 2×30 und Tempo 2×40', peak:'Schwelle und Sweet Spot 2×30', long:'sehr gleichmäßig, Verpflegung und Licht wie im Rennen, ab und zu zwei lange Tage hintereinander'}
};
function evProfCard(p, compact){
  const r = evProfile(p); if (!r) return '';
  const t = EVTY[r.ty], dots = v => `<span aria-label="${esc(v)} von 3">${[1, 2, 3].map(i => `<span style="display:inline-block;width:14px;height:6px;margin-right:2px;background:${esc(i <= v ? 'var(--teal)' : 'var(--line)')}"></span>`).join('')}</span>`;
  const rows = [['Grundlagenausdauer', r.sc.dur], ['Lange Anstiege (Schwelle)', r.sc.lng], ['Mittlere Anstiege (VO2max)', r.sc.med], ['Spritzigkeit (Antritte, Rampen)', r.sc.spr], ['Tempohärte im Feld', r.sc.tmp]].map(([l, v]) => `<div class="flex items-center justify-between gap-2 text-sm"><span>${l}</span>${dots(v)}</div>`).join('');
  const mx = EVMIX[r.ty], peak = mx.peak || (r.ty === 'punch' ? (r.race ? 'im Wechsel eine rennnahe Woche (Over-Under mit Antritten und kurze Rampen) und eine Woche für die Dauerleistung (kurze VO2max-Intervalle und Schwelle)' : 'VO2max 30/15 und Rampen 8×1 Min.') : (r.race ? 'im Wechsel eine rennnahe Woche (Over-Under mit Antritten und maximale Antritte) und eine Woche für die Dauerleistung (kurze VO2max-Intervalle und Schwelle)' : 'VO2max 30/15 und Schwelle'));
  const facts = `${f1(p.dist)} km, ${(p.hm || 0).toLocaleString('de-DE')} hm (${f1(r.hk)} hm/km), geplante Dauer etwa ${hm2(r.tev)} Std. (${tMin(p.targetTime) && Math.abs(tMin(p.targetTime) - r.tev) > 2 ? 'aus deiner Zielzeit, auf ein realistisches Maß begrenzt' : 'nach deiner Zielzeit'}), ${r.race ? 'Rennen mit Massenstart' : 'Marathon / Radrundfahrt'}`;
  const cl = r.climbs ? (r.climbs.length ? `<p class="mt-3 text-sm"><b>Anstiege laut ${p.course.builtin ? 'hinterlegtem (rekonstruiertem) ' : ''}Streckenprofil${(p.course.laps || 1) > 1 ? ' (' + p.course.laps + ' Runden, Tabelle zeigt eine Runde)' : ''}:</b> ${r.nL} lange (über 12 Min.), ${r.nM} mittlere (3 bis 12 Min.), ${r.nS} kurze (unter 3 Min.).</p>
      <div class="mt-2 overflow-x-auto"><table class="text-xs"><thead><tr><th class="pr-2 text-left">ab km</th><th class="pr-2 text-left">Länge</th><th class="pr-2 text-left">hm</th><th class="pr-2 text-left">Ø Steigung</th><th class="text-left">Dauer bei 90 % FTP</th></tr></thead><tbody>${[...r.climbs].sort((a, b) => b.hm - a.hm).slice(0, 8).sort((a, b) => a.km - b.km).map(c => `<tr><td class="pr-2">${f1(c.km)}</td><td class="pr-2">${f1(c.len / 1000)} km</td><td class="pr-2">${Math.round(c.hm)}</td><td class="pr-2">${f1(c.g * 100)} %</td><td>${Math.round(c.min)} Min.</td></tr>`).join('')}</tbody></table></div>` : '<p class="mt-3 text-sm">Das Streckenprofil enthält keine nennenswerten Anstiege.</p>')
    : `<p class="mt-3 text-sm" style="color:var(--mute)">Ohne Streckenprofil geschätzt aus den Höhenmetern pro Kilometer${EVS.find(x => x.id === p.evId && x.ty) ? ' und der bekannten Charakteristik des Events' : ''}. Mit der GPX-Datei der Strecke erkennt die App die einzelnen Anstiege und wird genauer.</p>`;
  const inner = `<p class="hd text-xl font-semibold">${t[0]}</p><p class="mt-1 text-sm" style="color:var(--mute)">${facts}</p><p class="mt-2 text-sm">${t[1]}</p>${cl}
    <div class="mt-3 space-y-1.5">${rows}</div>
    ${compact ? '' : `<p class="mt-4 font-semibold">So ist dein Plan darauf ausgerichtet</p><ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
      <li>Basisphase: Grundlage und Sweet Spot, wie bei jedem Ziel.</li>
      <li>Aufbauphase: ${mx.build}.</li>
      <li>Spitzenphase: ${peak}, dazu eine Eventsimulation.</li>
      <li>Long Ride: wächst bis etwa ${mm(r.lbP)} (abgeleitet aus der erwarteten Eventdauer), Inhalt: ${mx.long}.</li>
      <li>Tapering: Umfang runter, kurze intensive Reize bleiben.</li></ul>
      <p class="mt-2 text-xs" style="color:var(--mute)">Grundlage ist das Prinzip der Spezifität: Je näher das Event rückt, desto mehr ähnelt das Training dessen Belastung. Kurze 30/15-Intervalle verbesserten bei trainierten Radfahrern die Leistung stärker als lange Intervalle gleicher Belastung (Rønnestad et al. 2020). Die Zuordnung der Intervalle zum Streckentyp ist eine Praxisregel, keine für jedes Event geprüfte Vorgabe.</p>`}`;
  return compact ? `<div class="panel p-4"><p class="eyebrow mb-2">Anforderungsprofil des Events</p>${inner}</div>` : fold('evp', 'Anforderungsprofil des Events', inner, true, t[0]);
}

/* Woche w erzeugen. Reihenfolge: Zeitbudget des Monats anwenden (Punkt 7, tbApply), Woche bauen (genWeekCore), dann
   gespeicherte Änderungen kommender Wochen einspielen (B4, woApply; nur für den aktiven Plan, nicht für Statistik-Läufe mit base). */
function genWeek(p, w, base){ const P = genWeekCore(tbApply(p, w), w, base); return !base && p && S.p && p === S.p ? sickCarry(woApply(P, w), p, w) : P; }
function genWeekCore(p, w, base){
  const o = (!base && S.ov && S.ov[w]) || {off:{}, com:{}};
  const cm0 = isComm(p), p0 = p;
  const so = w === 1 ? startOff(p0) : 0;
  p = {...p, avail: p.avail.map((a, i) => i >= so && !vacDay(p0, w, i) && (o.off[i] ? false : o.com[i] === true ? true : a) && capOf(p0, i) >= 30), commute: p.commute.map((c, i) => i >= so && cm0 && !vacDay(p0, w, i) && (o.off[i] ? false : o.com[i] === undefined ? c : o.com[i]))};
  if (!p.avail[p.longDay]) { const alt = [1,-1,2,-2,3,-3].map(d => (p.longDay + d + 7) % 7).find(j => p.avail[j]); p.longDay = alt === undefined ? -1 : alt; }
  const ph = phases(p), P = ph.find(x => w >= x.from && w <= x.to) || ph[ph.length-1], k = P.key, rec = (recWk(p, w) || (p.recW || []).includes(w) || !!P.rec) && k !== 'taper', ev = p.goal === 'event';
  const reE = reentOf(p0, w), ramp = Math.min(reE ? reE.f : 9, k === 'taper' ? (P.weeks === 2 ? [.65, .4][w - P.from] : .5) : rec ? .65 : rampOf(p, w)), sH = p.startH > 0 ? p.startH : (p.goal === 'fitness' && p.ffocus === 'restart' ? p.hours * .6 : 0), hE = sH > 0 && sH < p.hours ? Math.min(p.hours, sH * Math.pow(1.08, w - 1)) : p.hours, lcap = p.longMin > 0 ? Math.max(60, Math.round(p.longMin * Math.pow(1.12, w) / 15) * 15) : 9999, f = Math.min(1.4, Math.max(.6, hE / 8)) * ramp;
  const r15 = m => Math.max(45, Math.round(m * f / 15) * 15);
  const prof = ev ? (() => { const sp = P.ev && !P.ev.main ? segP(p0, P.ev) : p0; return evProfile(sp) || evProfile(p0); })() : null, ty = prof ? prof.ty : 'huegel', race = !!(prof && prof.race), lbP = prof ? prof.lbP : 270;
  const lb = {event:{base:Math.max(120, Math.round(lbP * .55 / 15) * 15),build:Math.round(lbP * .8 / 15) * 15,peak:lbP,taper:120}, ftp:{base:120,build:150,peak:180,taper:90}, fitness:p.ffocus === 'endur' && p.ftour ? {base:Math.max(90, Math.round(p.ftour * .55 / 15) * 15), build:Math.round(p.ftour * .8 / 15) * 15, peak:p.ftour, taper:90} : {base:120,build:150,peak:150,taper:90}}[p.goal][k], sim = ev && k === 'peak';
  /* M4 (Audit 12.11.2026): Der Long Ride richtet sich nach dem Event und nicht mehr nach Wochenstunden/8. Bei wenig Zeit darf er bis zu
     45 % des Wochenbudgets dauern (bei höchstens zwei Trainingstagen 55 %). Er wird dadurch nie kürzer als bisher. */
  const nDays = p.avail.map((a, i) => a || i === p.longDay).filter(Boolean).length;
  const lrM4 = Math.max(r15(lb), Math.max(45, Math.round(Math.min(lb * Math.max(1, Math.min(1.4, hE / 8)), Math.max(60, hE * 60 * (nDays <= 2 ? .55 : .45))) * ramp / 15) * 15));
  const LONG = D('long', sim ? 'Eventsimulation' : 'Long Ride', p.longMin > 0 ? Math.min(Math.max(45, Math.round(lb * ramp / 15) * 15), lcap) : Math.min(ty === 'ultra' ? 480 : 390, (p.longPri || (p.goal === 'fitness' && p.ffocus === 'endur')) ? Math.max(45, Math.round(lb * Math.max(1, Math.min(1.4, hE / 8)) * ramp / 15) * 15) : lrM4), 56, sim ? 82 : 75, '85–95 U/min', sim ? 'Profil wie beim Event, Anstiege bei 75–82 % FTP, Verpflegung wie am Eventtag.' : 'Konstant in Zone 2. Ab der ersten Stunde 30–60 g Kohlenhydrate pro Std., bei mehr als 2,5 Std. bis 90 g (Glukose-Fruktose-Mix, Verträglichkeit im Training testen).', 'Die erste Stunde muss sich zu leicht anfühlen.');
  const SST = {...D('sst','Sweet Spot 3×12',75,88,94,'85–95 U/min','15 Min. einfahren · 3×12 Min. @ 88–94 % · 5 Min. locker dazwischen · 10 Min. ausfahren','Schwere Gänge, runder Tritt.'), wm:36, iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}};
  const THR = {...D('thr','Schwelle 2×20',90,95,105,'80–90 U/min','20 Min. einfahren · 2×20 Min. @ 95–105 % · 10 Min. locker dazwischen · 15 Min. ausfahren','Leistung in der zweiten Hälfte halten.'), wm:40, iv:{reps:2, work:20, rest:10, lo:95, hi:105, wu:20, cd:15}};
  const VO2 = {...D('vo2','VO2max 5×4',75,106,120,'95–105 U/min','15 Min. einfahren · 5×4 Min. @ 106–120 % · 4 Min. locker dazwischen · 10 Min. ausfahren','Ab Minute 2 Leistung halten, nicht zu schnell starten.'), wh:20, iv:{reps:5, work:4, rest:4, lo:106, hi:120, wu:15, cd:10}};
  const VOL = {...D('vo2','VO2max 4×8',85,100,110,'90–100 U/min','15 Min. einfahren · 4×8 Min. @ 100–110 % (so hoch, dass du alle 4 Intervalle gleichmäßig schaffst) · 3 Min. locker dazwischen · 10 Min. ausfahren','Gleichmäßig starten, das vierte Intervall entscheidet.'), wh:32, iv:{reps:4, work:8, rest:3, lo:100, hi:110, wu:15, cd:10}};
  const VOS = {...D('vo2','VO2max 4×4',65,106,120,'95–105 U/min','15 Min. einfahren · 4×4 Min. @ 106–120 % · 3 Min. locker dazwischen · 10 Min. ausfahren','Lieber ein Intervall weniger als einbrechen.'), wh:16, iv:{reps:4, work:4, rest:3, lo:106, hi:120, wu:15, cd:10}};
  const OPN = {...VO2, n:'VO2max Auffrischung 3×3', m:60, st:'15 Min. einfahren · 3×3 Min. @ 106–115 % · 4 Min. locker dazwischen · 10 Min. ausfahren', tip:'Intensität bleibt, Umfang sinkt: So bleibst du scharf.', wh:9, iv:{reps:3, work:3, rest:4, lo:106, hi:115, wu:15, cd:10}};
  const TPO = {...THR, n:'Wettkampftempo 2×10', m:60, st:'15 Min. einfahren · 2×10 Min. @ 95–100 % · 5 Min. locker dazwischen · 10 Min. ausfahren', wm:20, iv:{reps:2, work:10, rest:5, lo:95, hi:100, wu:15, cd:10}};
  const THL = {...D('thr','Lange Schwelle 3×15',95,90,96,'75–90 U/min','','Wie ein langer Anstieg: gleichmäßig, im Sitzen, ruhig atmen.'), wm:45, iv:{reps:3, work:15, rest:5, lo:90, hi:96, wu:15, cd:10}};
  const SSL = {...D('sst','Sweet Spot 2×30',80,86,92,'80–90 U/min','','Lange Blöcke wie am Berg oder in der Nacht: Tempo halten, dabei essen und trinken.'), wm:60, iv:{reps:2, work:30, rest:10, lo:86, hi:92, wu:15, cd:10}};
  const V30 = {...D('vo2','VO2max 30/15',60,115,125,'100–110 U/min','','30 Sek. hart, 15 Sek. locker, ohne Pause durch die Serie. Die letzten Wiederholungen jeder Serie bringen am meisten.'), wh:20, iv:{sets:3, reps:13, work:.5, rest:.25, sr:3, lo:115, hi:125, wu:15, cd:10}};
  const RMP = {...D('vo2','Rampen 8×1 Min.',60,120,135,'90–100 U/min','','Wie kurze Anstiege im Rennen: zügig antreten, oben drüberdrücken.'), wh:8, iv:{reps:8, work:1, rest:3, lo:120, hi:135, wu:15, cd:10}};
  const ANA = {...D('vo2','Antritte 8×30 Sek.',60,150,200,'100–120 U/min','','Maximal antreten, aus dem Stand oder rollend. Volle Erholung dazwischen, sonst sinkt die Qualität.'), wh:4, iv:{reps:8, work:.5, rest:4.5, lo:150, hi:200, wu:20, cd:10}};
  const TMP = {...D('sst','Tempo 2×40',100,76,85,'85–95 U/min','','Gleichmäßig wie in einer langen Rennphase. Dabei 60–90 g Kohlenhydrate pro Stunde üben.'), wm:80, iv:{reps:2, work:40, rest:10, lo:76, hi:85, wu:15, cd:10}};
  const ivText = v => `${v.wu} Min. einfahren · ${(v.sets || 1) > 1 ? v.sets + ' Serien à ' : ''}${v.reps}×${durT(v.work)} @ ${v.lo}–${v.hi} % · ${durT(v.rest)} ${v.rlo ? `@ ${v.rlo}–${v.rhi} % dazwischen (knapp unter der Schwelle, nicht locker)` : 'locker dazwischen'}${(v.sets || 1) > 1 ? ' · ' + v.sr + ' Min. Pause zwischen den Serien' : ''} · ${v.cd} Min. ausfahren`;
  [SST, THR, VO2, VOL, VOS, OPN, TPO, THL, SSL, V30, RMP, ANA, TMP].forEach(x => { const v = x.iv; x.m = Math.round(v.wu + ivCore(v) + v.cd); x.st = ivText(v); });

  /* Varianten: gleicher Trainingsreiz, andere Struktur. Rotation nach Woche, damit sich nichts Woche für Woche wiederholt. */
  const mkV = (b, n, v, tip, cad) => { const iv = {...b.iv, ...v}, x = {...b, n, iv, tip:tip || b.tip, cad:cad || b.cad}; x.m = Math.round(iv.wu + ivCore(iv) + iv.cd); x.st = ivText(iv); const wk = Math.round((iv.sets || 1) * iv.reps * iv.work); if (x.t === 'vo2') x.wh = wk; else x.wm = wk; return x; };
  const OU = mkV({...THR, n:'Over-Under 3×10', tip:''}, 'Over-Under 3×10', {sets:3, reps:4, work:1, rest:2, rlo:88, rhi:94, lo:105, hi:110, sr:5, wu:15, cd:10}, 'Abwechselnd 1 Min. knapp über und 2 Min. knapp unter der Schwelle, ohne locker zu werden. Das simuliert Tempowechsel im Rennen: kurz drüber, dann unter Last weiterfahren.', '90–100 U/min, im Über-Teil gern etwas höher');
  const OUA = mkV({...THR, n:'Over-Under mit Antritten', tip:''}, 'Over-Under mit Antritten 3×8', {sets:3, reps:5, work:.5, rest:1.5, rlo:88, rhi:93, lo:115, hi:130, sr:5, wu:15, cd:10}, 'Alle 2 Minuten ein 30-Sekunden-Antritt, dazwischen knapp unter der Schwelle weiterfahren. Wie Attacken am Hügel oder im Feld.', 'Antritte 100–110, dazwischen 85–95 U/min');
  const OUL = mkV({...SST, n:'Over-Under leicht', tip:''}, 'Over-Under leicht 3×9', {sets:3, reps:3, work:1, rest:3, rlo:84, rhi:88, lo:98, hi:103, sr:5, wu:15, cd:10}, 'Der Einstieg in Over-Unders: 1 Min. an der Schwelle, 3 Min. Sweet Spot. Nicht locker werden zwischen den Wechseln.', '85–95 U/min');
  const SPR = mkV({...ANA, n:'Sprints', tip:''}, 'Sprints 3×3×12 Sek.', {sets:3, reps:3, work:.2, rest:3, lo:150, hi:250, sr:8, wu:20, cd:15}, 'Maximal, aus dem Rollen und im Wiegetritt. Zwischen den Sprints voll erholen (Zone 1), sonst sinkt die Qualität. Den Rest der Einheit locker in Zone 2.', 'Sprints 110–130 U/min');
  const VAR = {
    SST:[SST, OUL, mkV(SST, 'Sweet Spot 4×10 Kraftausdauer', {reps:4, work:10, rest:4}, 'Niedrige Trittfrequenz im großen Gang, sitzend und mit ruhigem Oberkörper. Das ist vor allem Abwechslung und Gewöhnung an schwere Anstiege: Studien finden keinen Leistungsvorteil gegenüber normaler Trittfrequenz. Bei Kniebeschwerden mit normaler Trittfrequenz fahren.', '60–70 U/min in den Intervallen'), mkV(SST, 'Sweet Spot 2×20', {reps:2, work:20, rest:6, lo:88, hi:93}, 'Lange Blöcke wie an einem Pass: ruhig atmen, gleichmäßig treten.', '75–85 U/min, wie am Berg'), mkV(SST, 'Sweet Spot 3×15 Trittwechsel', {reps:3, work:15, rest:5, lo:88, hi:93}, 'Gleiche Leistung, andere Trittfrequenz: So lernst du, je nach Gelände effizient zu treten.', 'Block 1: 85–95, Block 2: 65–75, Block 3: 100–105 U/min')],
    THR:[THR, OU, OUA, mkV(THR, 'Schwelle 3×12', {reps:3, work:12, rest:6}, 'Gleichmäßig wie ein Zeitfahren, jede Wiederholung gleich stark.', '90–100 U/min'), mkV(THR, 'Schwelle 4×10 Bergtempo', {reps:4, work:10, rest:5, lo:95, hi:100}, 'Wie ein langer Anstieg: am besten bergauf oder auf der Rolle mit schwerem Gang. Lieber am unteren Rand starten.', '70–80 U/min'), mkV(THR, 'Schwelle 5×6', {reps:5, work:6, rest:3, lo:100, hi:105}, 'Kurz an der Schwelle, knackig, aber kontrolliert. Hohe Trittfrequenz schont die Muskeln.', '95–105 U/min')],
    VO2:[VO2, V30, VOL, mkV(VO2, 'VO2max 6×3', {reps:6, work:3, rest:3, lo:110, hi:120}, 'Ab der zweiten Minute zählt es: hoch bleiben, nicht überziehen.', '100–110 U/min'), mkV(VO2, 'VO2max 4×5 am Berg', {reps:4, work:5, rest:5, lo:106, hi:115}, 'Lange VO2max-Intervalle, am besten an einem Anstieg: gleichmäßig, die letzte Minute beißen.', '80–90 U/min'), mkV(VO2, 'VO2max 5×3', {reps:5, work:3, rest:3, lo:110, hi:120}, 'Kurz und hart, volle Konzentration auf runden Tritt.', '105–115 U/min')],
    ANA:[ANA, SPR],
    OPN:[OPN, mkV(OPN, 'VO2max Auffrischung 4×2', {reps:4, work:2, rest:4, lo:108, hi:115}, '', '95–105 U/min'), mkV(OPN, 'Spritzig 5×1', {reps:5, work:1, rest:3, lo:115, hi:125}, 'Kurz und spritzig: die Beine wach halten, ohne zu ermüden.', '110–120 U/min')],
    VOS:[VOS, mkV(VOS, 'VO2max 5×3', {reps:5, work:3, rest:3, lo:110, hi:120}, '', '100–110 U/min'), mkV(VOS, 'VO2max 8×2', {reps:8, work:2, rest:2, lo:115, hi:125}, 'Viele kurze Wiederholungen: jede gleich stark, die letzte zählt.', '105–115 U/min')]
  };
  /* M3 (Audit 12.11.2026): Die Belastungszeit steigt in Stufen. Sweet Spot läuft ab Planstart, Schwelle, VO2max und 30/15 ab der ersten
     Phase nach der Basis. Eine Stufe dauert ein bis drei Belastungswochen, je nach Länge des Plans (ab 8 Belastungswochen mindestens
     zwei). Einstieg: unter 2,5 W/kg auf der ersten Stufe (und die oberste Stufe entfällt), sonst auf der zweiten, ab 4 W/kg auf der dritten.
     Die Form wechselt weiter (Over-Under, Kraftausdauer, Trittwechsel, Bergtempo), die Dosis folgt der Stufe. Sehr lange Einheiten
     werden auf etwa ein Drittel der Wochenzeit begrenzt (fitIv). Grundlage: progressive Belastungssteigerung; für Intervalle zählt
     die angesammelte Zeit im Zielbereich (Seiler et al. 2013). */
  const LAD = {sst:[[3, 10], [3, 12], [2, 20], [3, 15], [2, 25], [3, 20]], thr:[[3, 8], [3, 10], [2, 15], [2, 18], [2, 20], [3, 15]], vo2:[[4, 3], [5, 3], [4, 4], [5, 4], [6, 4]], v30:[[2, 10], [2, 13], [3, 10], [3, 13], [4, 11], [4, 13]]};
  const tot = ph[ph.length - 1].to, tpS = (ph.find(x => x.key === 'taper') || {from:tot + 1}).from, nb0 = (ph.find(x => x.key !== 'base' && x.key !== 'taper') || ph[0]).from;
  const isLoadW = q => { const F = ph.find(x => q >= x.from && q <= x.to); return !!F && F.key !== 'taper' && !F.rec && !recWk(p, q) && !(p.recW || []).includes(q); };
  const cntLoad = (a, b) => { let n = 0; for (let q = a; q <= b; q++) if (isLoadW(q)) n++; return n; };
  const wkgP = (p0.ftp || 200) / kgOf(p0), lvS = wkgP < 2.5 ? 0 : wkgP >= 4 ? 2 : 1;
  const stage = (L, from) => { const n = cntLoad(from, tpS - 1), i = Math.max(0, cntLoad(from, w) - 1), st = Math.min(3, Math.max(n >= 8 ? 2 : 1, Math.ceil(n / L))); return Math.max(0, Math.min(L - 1 - (lvS ? 0 : 1), Math.floor(i / st) + lvS)); };
  const ivCap = x => fitIv(x, Math.max(60, Math.round(hE * 60 * .33)));
  const ladder = (b, salt) => {
    const lw = loadWk(p, w) - 1 + salt, osets = s => 2 + (s >= 2 ? 1 : 0) + (s >= 4 ? 1 : 0);
    if (b === SST) { const s = stage(6, 1), [r, m] = LAD.sst[s], f = lw % 4, v = {reps:r, work:m, rest:m >= 20 ? 6 : 5};
      if (f === 1) return ivCap(mkV(OUL, `Over-Under leicht ${osets(s)}×9`, {sets:osets(s)}));
      if (f === 2 && m <= 15) return ivCap(mkV(SST, `Sweet Spot ${r}×${m} Kraftausdauer`, v, VAR.SST[2].tip, VAR.SST[2].cad));
      if (f === 3 && r === 3) return ivCap(mkV(SST, `Sweet Spot ${r}×${m} Trittwechsel`, v, VAR.SST[4].tip, VAR.SST[4].cad));
      return ivCap(mkV(SST, `Sweet Spot ${r}×${m}`, v, m >= 20 ? VAR.SST[3].tip : '', m >= 20 ? VAR.SST[3].cad : '')); }
    if (b === THR) { const s = stage(6, nb0), [r, m] = LAD.thr[s], f = lw % 4, v = {reps:r, work:m, rest:m >= 15 ? 10 : m >= 10 ? 6 : 5};
      if (f === 1) return ivCap(mkV(OU, `Over-Under ${osets(s)}×10`, {sets:osets(s)}));
      if (f === 3 && ev && race && !(k === 'peak' && (ty === 'punch' || ty === 'flach'))) return ivCap(mkV(OUA, `Over-Under mit Antritten ${osets(s)}×8`, {sets:osets(s)}));
      if (f === 2) return ivCap(mkV(THR, `Schwelle ${r}×${m} Bergtempo`, {...v, lo:95, hi:100}, VAR.THR[4].tip, VAR.THR[4].cad));
      return ivCap(mkV(THR, `Schwelle ${r}×${m}`, v)); }
    if (b === VO2) { const s = stage(5, nb0), [r, m] = LAD.vo2[s], f = lw % 3, v = {reps:r, work:m, rest:m, ...(m <= 3 ? {lo:110, hi:120} : {})};
      if (f === 2 && s >= 3 && lvS > 0) return ivCap(VOL);
      if (f === 1 && m >= 4) return ivCap(mkV(VO2, `VO2max ${r}×${m} am Berg`, {...v, lo:106, hi:115}, VAR.VO2[4].tip, VAR.VO2[4].cad));
      return ivCap(mkV(VO2, `VO2max ${r}×${m}`, v, m <= 3 ? VAR.VO2[3].tip : '', m <= 3 ? VAR.VO2[3].cad : '')); }
    const [sets, reps] = LAD.v30[stage(6, nb0)]; return ivCap(mkV(V30, 'VO2max 30/15', {sets, reps}));
  };
  const vPick = (b, salt) => { if (b === SST || b === THR || b === VO2 || b === V30) return ladder(b, salt); const pool = b === SST ? VAR.SST : b === THR ? VAR.THR : b === VO2 ? VAR.VO2 : b === VOS ? VAR.VOS : b === OPN ? VAR.OPN : b === ANA ? VAR.ANA : null; if (!pool) return b; const lw = loadWk(p, w); return pool[((lw - 1) + salt) % pool.length]; };
  /* M1: Rennen vom Typ „punch“ und „flach“ wechseln in der Spitze wochenweise zwischen einer rennnahen Woche (Over-Under mit Antritten, dazu Rampen
     bzw. Antritte) und einer Woche für die Dauerleistung (VO2max 30/15 und Schwelle). So bleibt die Schwellenleistung bis zum Rennen erhalten. */
  const pkA = loadWk(p, w) % 2 === 1;
  const HE = {alpin:{base:[SST], build:[THR, VO2], peak:[THL, VO2], taper:[OPN, TPO]}, huegel:{base:[SST], build:[VO2, SST], peak:[VO2, THR], taper:[OPN, TPO]},
    punch:{base:[SST], build:[V30, SST], peak:race ? (pkA ? [OUA, RMP] : [V30, THR]) : [V30, RMP], taper:[OPN, TPO]}, flach:{base:[SST], build:[V30, SST], peak:race ? (pkA ? [OUA, ANA] : [V30, THR]) : [V30, THR], taper:[OPN, TPO]},
    ultra:{base:[SST], build:[SSL, TMP], peak:[THR, SSL], taper:[OPN, TPO]}};
  if (ev && (k === 'build' || k === 'peak')) {
    const fuel = ' Ab der ersten Stunde 30–60 g Kohlenhydrate pro Std., bei mehr als 2,5 Std. bis 90 g.';
    LONG.st = sim ? {alpin:'Eventsimulation: lange Anstiege im geplanten Renntempo (80–88 % FTP), Abfahrten locker, Verpflegung wie am Eventtag.', huegel:'Profil wie beim Event, Anstiege bei 75–85 % FTP, Verpflegung wie am Eventtag.', punch:'Eventsimulation: welliges Profil oder Rundkurs, kurze Anstiege hart (bis 120 % FTP), im Flachen im Windschatten erholen, am Ende ein Zielsprint.', flach:'Eventsimulation in der Gruppe: lange Phasen bei 80–90 % FTP mit Tempowechseln und Antritten, Verpflegung wie am Renntag.', ultra:'Eventsimulation: langer Tag mit Rennverpflegung, Licht und Pausenroutine testen.'}[ty]
      : {alpin:'Mit 2–4 langen Anstiegen von 15–30 Min. bei 75–85 % FTP, sonst Zone 2.', huegel:'Welliges Gelände, Anstiege in Zone 3 (76–90 %), sonst Zone 2.', punch:'Welliges Gelände oder Gruppe: 6–10 kurze Anstiege (30–90 Sek.) zügig drüberdrücken, sonst Zone 2.', flach:'Am besten in der Gruppe: 3×15 Min. Gruppentempo bei 80–88 % FTP, sonst Zone 2. Windschatten und Führungswechsel üben.', ultra:'Sehr gleichmäßig in Zone 2, Verpflegung wie im Rennen. Ab und zu zwei lange Tage hintereinander oder eine Fahrt in die Dämmerung mit Licht.'}[ty] + fuel;
    if (!sim) LONG.n = {alpin:'Long Ride mit Anstiegen', huegel:'Long Ride, wellig', punch:'Long Ride mit Rampen', flach:'Long Ride mit Gruppentempo', ultra:'Long Ride, Ultra-Tempo'}[ty];
    if (!sim && ty !== 'ultra') LONG.hi = 85;
  }
  if (!(ev && (k === 'build' || k === 'peak')) && !rec && k !== 'taper' && !sim) {
    const LV = [null, ['Long Ride, negativer Split', 'Erste Hälfte locker in Zone 2, zweite Hälfte oberes Zone 2 (70–75 % FTP). So trainierst du, hinten raus stark zu bleiben.'], ['Long Ride, wellig', 'Welliges Gelände, an Anstiegen höchstens oberes Zone 2 (bis 75 % FTP), bergab locker rollen.'], ['Long Ride mit Verpflegungstraining', 'Konstant in Zone 2. Alle 20 Min. essen oder trinken, insgesamt 60 g Kohlenhydrate pro Stunde. So gewöhnt sich der Magen an die Rennverpflegung.']], lv = LV[(w - 1) % LV.length];
    if (lv) { LONG.n = lv[0]; LONG.cad = {['Long Ride, negativer Split']:'85–95, in der zweiten Hälfte 90–100 U/min', ['Long Ride, wellig']:'Anstiege 70–85, flach 85–95 U/min', ['Long Ride mit Verpflegungstraining']:'85–95 U/min'}[lv[0]] || LONG.cad; LONG.st = lv[1] + (LONG.m >= 120 ? ' Ab der ersten Stunde 30–60 g Kohlenhydrate pro Std.' : ''); }
  }
  VOL.st += ' Wähle die Leistung so, dass alle 4 Intervalle gleichmäßig gelingen.';
  if (nDays <= 2 && !rec && k !== 'taper' && !sim && LONG.m >= 90) LONG.st = 'Bei zwei Trainingstagen zählt jede Fahrt: Fahr die letzten 20 bis 30 Min. im Sweet Spot (88–94 % FTP), wenn die Beine gut sind. ' + LONG.st; /* vorangestellt, damit der Satz einzeln übersetzt wird */
  const lev = (ev && p.lev) || {};
  if (lev.fuel && k !== 'taper' && prof) { const tg = prof.tev > 150 ? 80 : 45, pk = (ph.find(x => x.key === 'peak' && x.to >= w) || P).from, gh = Math.round((40 + (tg - 40) * Math.min(1, (w - 1) / Math.max(1, pk - 1))) / 5) * 5; LONG.st += ` Darmtraining: diese Woche etwa ${gh} g Kohlenhydrate pro Stunde, mit den Produkten, die du auch im Rennen nutzt.`; }
  if (lev.caf && sim) LONG.st += ` Koffein testen: 60 Min. vor dem Start etwa ${Math.round(kgOf(p0) * 3 / 10) * 10} mg, so wie am Eventtag.`;
  if (lev.pace && sim) LONG.st += ' ' + paceTxt(p0, prof);
  const H = {event:HE[ty] || HE.huegel, ftp:{base:[SST],build:[VO2,THR],peak:[VOL,VO2],taper:[OPN]}, fitness:{endur:{base:[SST],build:[SST],peak:[SSL],taper:[]}, speed:{base:[SST],build:[VOS,SST],peak:[V30,THR],taper:[OPN]}, health:{base:[],build:[SST],peak:[SST],taper:[]}, restart:{base:[],build:[SST],peak:[VOS],taper:[]}}[p.ffocus] || {base:[SST],build:[VOS],peak:[VOS],taper:[]}};
  const fF = p.goal === 'fitness' ? p.ffocus : null, iF = !!p.intF && fF !== 'health' && fF !== 'restart';
  let hard = (rec ? (fF === 'health' || fF === 'restart' ? [] : [OPN]) : (fF === 'restart' && w <= 3 ? [] : H[p.goal][k])).slice(0, iF ? 2 : (hE < 5 && (nDays < 3 || hE < 3)) || fF === 'health' ? 1 : 2);
  /* M4: Bei wenig Zeit (bis 6 Std.) reicht eine Sweet-Spot-Einheit in der Basis nicht als Reiz. Ab Woche 5 kommt eine kurze VO2max-Einheit
     dazu (ab 3 Trainingstagen und 3 Std., nicht unter 2,5 W/kg und nicht beim Ziel „Ausdauer“). */
  if (!rec && k === 'base' && hard.length === 1 && hard[0] === SST && hE <= 6 && hE >= 3 && nDays >= 3 && w > 4 && wkgP >= 2.5 && fF !== 'endur') hard = [SST, VOS];
  hard = reentHard(hard, reE, SST);
  hard = hard.map((x, n) => rec || k === 'taper' ? (x === OPN ? vPick(x, Math.floor(w / rhyN(p))) : x) : vPick(x, n * 2));
  /* Intensität statt Umfang: mindestens 2 harte Einheiten, im Aufbau und in der Spitze eine dritte, kurze (bei gleicher Wochenzeit) */
  if (iF && !rec && k !== 'taper') { const ex = ev && (ty === 'punch' || ty === 'flach') ? RMP : VOS; if (hard.length < 2) hard = [...hard, hard.some(x => x.t === 'vo2') ? SST : ex]; if ((k === 'build' || k === 'peak') && p.avail.filter(Boolean).length >= 4) hard = [...hard, ex]; }
  const BV = [['Grundlage Z2', 'Gleichmäßig in Zone 2, Gespräch muss möglich sein.', 'Lieber zu leicht als zu hart.'],
    ['Grundlage mit Trittfrequenz', 'Zone 2, darin 5×2 Min. mit 105–115 U/min bei gleicher Leistung, dazwischen 3 Min. normal treten. Oberkörper ruhig, nicht hüpfen.', 'Hohe Trittfrequenz schult einen runden, ökonomischen Tritt.'],
    ['Grundlage mit Fahrtechnik', 'Zone 2. Dazu Technik üben: sauber in Kurven einlenken, vorausschauend schalten, freihändig trinken und essen, kurze Stücke im Stehen fahren.', 'Technik spart im Rennen Kraft und Nerven.'],
    ['Grundlage, ruhiger Einstieg', 'Erste Hälfte unteres Zone 2 (56–65 %), zweite Hälfte oberes Zone 2 (65–75 %). Nie darüber.', 'So lernst du, dir das Tempo einzuteilen.'],
    ['Grundlage mit Sprints', 'Zone 2, darin 2 Serien à 3×10 Sek. Maximalsprint aus dem Rollen, dazwischen je 3 Min. ganz locker, zwischen den Serien 10 Min. Zone 2. Die Sprints kurz und explosiv, nie müde sprinten.', 'Kurze Sprints verbessern die Spritzigkeit, ohne die Ausdauer zu stören, und kosten kaum Erholung.'],
    ['Grundlage, neue Strecke', 'Zone 2 auf einer Runde, die du noch nicht kennst, gern mit Freunden oder in einer ruhigen Gruppe. Gespräch muss möglich sein.', 'Abwechslung hält die Motivation hoch.']];
  const BVC = ['85–95 U/min', '90 U/min, Blöcke 105–115', 'frei, 80–100 U/min', '90–100 U/min', '85–95 U/min, Sprints 110–130', '85–95 U/min'];
  const baseVar = (m, i) => { const n = rec || k === 'taper' || m < 45 ? 0 : ((w - 1) * 3 + i) % BV.length, v = BV[n]; return D('base', v[0], m, 56, 75, BVC[n], v[1], v[2]); };
  const cap = i => capOf(p, i), capS = (x, i) => x.m <= cap(i) ? x : x.iv ? fitIv(x, cap(i)) : {...x, m: Math.max(30, cap(i)), st: x.st + ' Auf deine verfügbare Zeit gekürzt.'};
  const out = Array(7).fill(null), av = p.avail.map((a,i) => a || i === p.longDay), cm = p.commute.map((c,i) => c && av[i]);
  function splitDay(x, i){
    const L = legOf(p, i), cp = cap(i), y = {...x, unsplit: x};
    if (x.iv) {
      /* Hart zuerst, dann locker: Intervalle am Stück auf dem Hinweg, Rückweg Z1–Z2 (Hansen et al. 2005) */
      const v = x.iv; let reps = v.reps; const tm = n => v.wu + ivCore({...v, reps:n}) + v.cd;
      while (cp < 999 && Math.max(L, tm(reps)) + L > cp && reps > 2) reps--;
      let v2 = v; if (cp < 999 && Math.max(L, tm(reps)) + L > cp) { v2 = {...v, wu:10, cd:5}; while (v2.work > 8 && Math.max(L, v2.wu + ivCore({...v2, reps}) + v2.cd) + L > cp) v2 = {...v2, work:v2.work - 2}; }
      const full = Math.ceil(v2.wu + ivCore({...v2, reps}) + v2.cd), hm = Math.max(L, full), ext = full > L, pad = Math.max(0, L - full);
      y.n = x.n.replace(/(\d+)×(\d+)/, (z, a, b) => reps + '×' + (v2.work !== v.work ? v2.work : b)).replace(/^(\d+)×(?!\d)/, reps + '×');
      y.parts = [{lbl:'Hinweg', m:hm, iv:{...v2, reps, pad}, st: ivText({...v2, reps}) + (pad > 0 ? ' · danach ' + pad + ' Min. locker (Z1–Z2)' : '') + (ext ? '. Wähle dafür einen längeren Weg zur Arbeit (' + hm + ' Min.).' : '')},
        {lbl:'Rückweg', m:L, lo:45, hi:55, st:'Locker nach Hause (Z1–Z2), Beine ausrollen lassen. Keine Intensität.'}];
      y.tip = x.tip + ' Intervalle am Stück auf dem Hinweg, der Rückweg ist locker. So bleibt die Qualität der Intervalle erhalten.';
      y.m = hm + L; if (cp >= 999 || y.m <= cp) return y;
      x = {...D('base', 'Grundlage Z2', x.m, 56, 72, '90 U/min', '', 'Für Intervalle reicht die Zeit auf dem Arbeitsweg an diesem Tag nicht, darum locker.')}; Object.keys(y).forEach(k => delete y[k]); Object.assign(y, x, {unsplit:x});
    }
    {
      const tot = Math.max(2 * L, Math.min(x.m, cp)), a = Math.max(L, Math.round(tot / 2 / 5) * 5), t = x.t === 'rec' ? 'Sehr locker im kleinen Gang, Puls unter 60 % HFmax.' : 'Konstant in Zone 2, Gespräch muss möglich sein.' + (x.t === 'long' ? ' Auch in diesem Teil essen und trinken (30–60 g Kohlenhydrate pro Std.).' : '');
      y.parts = ['Hinweg', 'Rückweg'].map(lbl => ({lbl, m:a, st:t}));
    }
    y.m = y.parts[0].m + y.parts[1].m; y.tip = y.tip || (x.tip + ' An Pendeltagen fährst du die Einheit in zwei Teilen: Hinweg und Rückweg.');
    return y;
  }
  const put = (i, s) => { out[i] = cm[i] && s.t !== 'com' ? splitDay(s, i) : {...s}; };
  const isK = j => out[j] && ['long','sst','thr','vo2'].includes(out[j].t);
  if (p.longDay >= 0) put(p.longDay, capS(LONG, p.longDay));
  let nHard = 0;
  hard.forEach(s => {
    const capH = i => cm[i] && cap(i) < 999 ? cap(i) - legOf(p, i) : cap(i), c = [0,1,2,3,4,5,6].filter(i => av[i] && !out[i] && cap(i) >= 45), fit = c.filter(i => capH(i) >= s.m), pool = fit.length ? fit : c, good = pool.filter(i => !isK((i+6)%7) && !isK((i+1)%7));
    if (!good.length && nHard >= (iF ? 2 : 1)) return; nHard++;
    const adjH = i => [(i + 6) % 7, (i + 1) % 7].filter(j => out[j] && HARD.includes(out[j].t)).length;
    const pen = i => !cm[i] ? 0 : (s.iv && legOf(p, i) < 45 ? 2 : 1), near2 = i => gapOf(p) ? [(i + 5) % 7, (i + 2) % 7].filter(j => out[j] && HARD.includes(out[j].t)).length : 0, l = (good.length ? good : pool).sort((a,b) => pen(a) - pen(b) || adjH(a) - adjH(b) || near2(a) - near2(b) || a - b); if (l.length) put(l[0], capS(s, l[0]));
  });
  const a = (p.longDay + 1) % 7; if (p.longDay >= 0 && av[a] && !out[a] && !cm[a]) put(a, capS(REC, a));
  cm.forEach((c,i) => { if (c && !out[i]) out[i] = comSes(p, i); });
  let sum = out.reduce((x, y) => x + (y ? y.m : 0), 0); const target = hE * 60 * ramp;
  /* M4: Eine Grundlagenfahrt ist nie länger als der Long Ride der Woche */
  const lgMax = () => { const L = p.longDay >= 0 ? out[p.longDay] : null; return L && L.t === 'long' ? Math.max(60, L.m) : 120; };
  let rides = out.filter(Boolean).length; const need = k === 'taper' ? Math.min(5, av.filter(Boolean).length - 1) : 0;
  [0,1,2,3,4,5,6].filter(i => av[i] && !out[i]).forEach(i => {
    const more = sum < target - 20, cp = cap(i); if (cp < 30) return;
    if (more || rides < need) { const m = Math.min(cp, more ? Math.min(120, lgMax(), Math.max(45, Math.round((target - sum) / 15) * 15)) : 30); out[i] = baseVar(m, i); sum += m; rides++; }
  });
  /* Zusätzliche Zeit an Pendeltagen (Zeit pro Tag): als Umweg auf dem Heimweg nutzen, wenn noch Umfang fehlt */
  /* M4: Sind alle Trainingstage belegt und fehlt noch Wochenzeit, werden die vorhandenen Einheiten verlängert: erst der Long Ride (bis zur
     Hälfte der Wochenzeit, bei höchstens zwei Trainingstagen 60 %, und höchstens ein Viertel über dem Zielwert aus dem Event), dann Grundlagenfahrten, zuletzt das Ausfahren der Intervalleinheiten. */
  if (k !== 'taper' && sum < target - 20 && ![0,1,2,3,4,5,6].some(i => av[i] && !out[i] && cap(i) >= 30)) {
    const li = p.longDay, L = li >= 0 ? out[li] : null;
    if (L && L.t === 'long' && !L.parts) { const mx = Math.min(cap(li), ty === 'ultra' ? 480 : 390, Math.round(target * (nDays <= 2 ? .6 : .5) / 15) * 15, Math.max(L.m, Math.round(lb * Math.max(1, Math.min(1.4, hE / 8)) * 1.25 / 15) * 15)), add = Math.floor(Math.min(mx - L.m, target - sum) / 15) * 15; if (add >= 15) { out[li] = {...L, m:L.m + add}; sum += add; } }
    out.forEach((x, i) => { if (!x || x.t !== 'base' || x.parts) return; const add = Math.floor(Math.min(Math.min(cap(i), 120, lgMax()) - x.m, target - sum) / 15) * 15; if (add >= 15) { out[i] = {...x, m:x.m + add}; sum += add; } });
    out.forEach((x, i) => { if (!x || !x.iv || x.parts || !HARD.includes(x.t) || sum >= target - 10) return; const add = Math.floor(Math.min(20, cap(i) - x.m, target - sum) / 5) * 5;
      if (add >= 10) { const iv = {...x.iv, cd:x.iv.cd + add}; out[i] = {...x, iv, m:x.m + add, st:'Heute mit längerem Ausfahren in Zone 2, so nutzt du deine Wochenzeit. ' + ivText(iv)}; sum += add; } });
  }
  if (p.perDay) cm.forEach((c, i) => { const x = out[i]; if (!c || !x || x.t !== 'com' || !x.parts) return; const ex = Math.floor((cap(i) - x.m) / 5) * 5; if (ex < 15 || sum >= target - 15) return;
    const add = Math.min(ex, 120, Math.max(15, Math.round((target - sum) / 5) * 5)); out[i] = {...x, m:x.m + add, n:'Pendeln mit Umweg', parts:[x.parts[0], {...x.parts[1], m:x.parts[1].m + add, st:`Locker nach Hause mit einem Umweg von etwa ${add} Min. in Zone 2 (Gespräch muss möglich sein).`}], st:`Hinweg locker, auf dem Heimweg ein Umweg von etwa ${add} Min. in Zone 2.`, tip:'So nutzt du die zusätzliche Zeit an diesem Tag ohne extra Fahrt.'}; sum += add; });
  let res = out.map(x => x || {...REST});
  if (ev && k === 'taper' && w === P.to && p.eventDate && (!P.ev || P.ev.main)) {
    const e = (dOnly(p.eventDate).getDay() + 6) % 7, tm = /^(\d+):(\d{1,2})$/.exec(String(p.targetTime).trim()), em = tm ? +tm[1] * 60 + +tm[2] : prof && prof.tev > 0 ? Math.round(prof.tev / 5) * 5 : 480; /* M2: ohne Zielzeit die geschätzte Eventdauer statt pauschal 8 Std. */
    res = res.map((x, j) => j > e ? {...REST, n:'Erholung nach dem Event', st:'Locker auslaufen lassen, essen, schlafen.', tip:'Wiederaufbau vor dem nächsten Ziel.'}
      : j === e ? D('long', 'Eventtag: ' + p.eventName, em, 60, 85, '85–95 U/min', 'Erste Stunde bewusst kontrolliert, gleichmäßig pacen. Ab dem Start 30–60 g Kohlenhydrate pro Std., über 2,5 Std. bis 90 g (Glukose-Fruktose-Mix, im Training erprobt).', 'Du hast dich vorbereitet. Genieße es.')
      : j === e - 1 ? D('rec', 'Aktivierung vor dem Event', 30, 50, 60, '90 U/min', '30 Min. locker, dazu 3×1 Min. @ 106–110 %, danach Material und Verpflegung prüfen.', 'Früh ins Bett, nichts Neues essen.') : x);
  }
  if (lev.pace && prof) res = res.map(x => /^Eventtag/.test(x.n || '') ? {...x, st:paceTxt(p0, prof) + ' ' + x.st} : x);
  if (p.goal === 'fitness' && p.ffocus === 'endur' && p.ftour && k === 'taper' && w === P.to) { const j = p.longDay >= 0 ? p.longDay : 6; res[j] = D('long', 'Deine Zieltour: ' + hm2(p.ftour) + ' Std.', p.ftour, 56, 75, '85–95 U/min', 'Ruhig in Zone 2 starten, gleichmäßig fahren, ab der ersten Stunde 30–60 g Kohlenhydrate pro Std. und regelmäßig trinken. Pausen sind erlaubt.', 'Das ist dein Ziel. Genieße die Tour.'); if (j > 0 && res[j - 1].m && ['sst','thr','vo2'].includes(res[j - 1].t)) res[j - 1] = {...REC}; }
  /* M6: Urlaubstage kennzeichnen */
  res = res.map((x, j) => vacDay(p0, w, j) && !x.m ? {...REST, n:'Urlaub', st:'Keine Einheit geplant. Bewegung nach Lust und Laune, zum Beispiel Wandern oder Schwimmen.', tip:'Erholung gehört zum Training.', vac:1} : x);
  if (reE) res = res.map(x => x.m && (x.t === 'base' || x.t === 'long' || HARD.includes(x.t)) && !/^Eventtag|^Aktivierung/.test(x.n || '') ? {...x, tip:(x.tip || '') + (reE.src === 'vac' ? ' Wiedereinstieg nach dem Urlaub: weniger Umfang, damit du gut reinkommst.' : ' Wiedereinstieg nach der Pause: weniger Umfang, damit du gut reinkommst.')} : x);
  return applyCyc(placeTest(applySubs(fitBudget(res, p), p, w), p, w), p, w);
}
/* Wochenbudget: Die Summe der Einheiten darf die verfügbare Wochenzeit nicht überschreiten.
   Gekürzt wird zuerst Grundlage, dann Erholungsfahrt, dann der Long Ride. Event, Zieltour und Pendeln bleiben. */
function fitBudget(res, p){
  /* M2: Eventtag, Zieltour und A-Events zählen nicht zum Wochenbudget, sonst würden in der Rennwoche die Auffrischungseinheiten gestrichen */
  const evDay = x => /^Eventtag|^Deine Zieltour/.test(x.n || '') || (x.t === 'race' && x.subPrio === 'A');
  const cap = Math.round(p.perDay && p.dayMin ? dsum(p) : p.hours * 60); let sum = res.reduce((q, x) => q + (evDay(x) ? 0 : x.m || 0), 0); if (!(cap > 0) || sum <= cap) return res;
  const out = res.map(x => ({...x})), fixed = x => !x.m || x.parts || x.t === 'com' || x.t === 'race' || /^Eventtag|^Deine Zieltour|^Aktivierung/.test(x.n || '');
  const cut = (t, min) => { let ch = true; while (sum > cap && ch) { ch = false; for (const x of out) { if (sum <= cap) break; if (fixed(x) || x.t !== t || x.m - 15 < min) continue; x.m -= 15; sum -= 15; x.cut = 1; ch = true; } } };
  cut('base', 30);
  for (let i = 0; i < 7 && sum > cap; i++) if (out[i].t === 'rec' && !fixed(out[i])) { sum -= out[i].m; out[i] = {...REST}; }
  cut('long', 60);
  for (let i = 6; i >= 0 && sum > cap; i--) if (out[i].t === 'base' && !fixed(out[i])) { sum -= out[i].m; out[i] = {...REST}; }
  cut('long', 45);
  const hd = () => out.filter(x => HARD.includes(x.t) && !fixed(x));
  while (sum > cap && hd().length > 1) { const x = hd().sort((a, b) => a.m - b.m)[0], i = out.indexOf(x); sum -= x.m; out[i] = {...REST}; }
  out.forEach((x, i) => { if (sum > cap && HARD.includes(x.t) && !fixed(x)) { const y = fitIv(x, Math.max(30, x.m - (sum - cap))); sum -= x.m - y.m; out[i] = {...y, cut:1, cutDone:1}; } });
  out.forEach(x => { if (x.cut && x.m && !x.cutDone && !x.iv) x.st = (x.st || '') + ' Auf deine verfügbare Wochenzeit gekürzt.'; delete x.cutDone; });
  return out;
}

