/* ---------- Rückblicke: Woche (kurz), Monat (ausführlich), Jahr (sehr detailliert) ----------
   Grundlage sind die eigenen Daten des Nutzers: Fahrtenarchiv (S.arch, bleibt dauerhaft, auch über die 6 Wochen der
   Fahrtenliste hinaus), Wochenbilanzen des Plans (p.wh), Bewertungen (p.exe), Zusatzfahrten (p.extra), FTP-Verlauf,
   Bestwerte, Anpassungen und Krankheitstage. Jeder Satz entsteht aus diesen Zahlen, nichts ist ein fester Textbaustein
   ohne Bezug. Lief es schlechter als geplant, ermutigt der Rückblick mit dem, was trotzdem gelungen ist. */
const RC_MON0 = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const RC_WD0 = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const RC_MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], RC_WD_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const RC_MON = new Proxy(RC_MON0, {get:(t, k) => (typeof lang === 'function' && lang() === 'en' && /^\d+$/.test(String(k))) ? `<span data-noi18n>${RC_MON_EN[k]}</span>` : /^\d+$/.test(String(k)) ? `<span data-noi18n>${t[k]}</span>` : t[k]});
const RC_WD = new Proxy(RC_WD0, {get:(t, k) => (typeof lang === 'function' && lang() === 'en' && /^\d+$/.test(String(k))) ? RC_WD_EN[k] : t[k]});
const rcN = n => `<span data-noi18n>${esc(n)}</span>`;
let rcSel = {w:null, m:null, y:null};
/* Fahrtenarchiv: kompakte Zusammenfassung jeder Fahrt, dauerhaft */
function rcArchSync(){
  try {
    S.arch = S.arch || []; const have = new Set(S.arch.map(a => a.id)); let add = 0;
    [...allActs(), ...(S.hist || [])].forEach(a => { if (!a || !a.id || !a.day || have.has(a.id)) return; have.add(a.id); add++;
      S.arch.push({id:a.id, d:a.day, h:a.ts ? new Date(a.ts).getHours() : null, n:String(a.n || 'Radfahrt').slice(0, 50), km:a.km || 0, hm:a.hm || 0, sec:a.sec || 0, tss:a.tss || 0, np:a.np || 0, m1:a.m1 || null, m5:a.m5 || null, m20:a.m20 || null, m60:a.m60 || null, ...(a.in ? {in:1} : {}), ...(a.gid ? {gid:String(a.gid).slice(0, 30)} : {}), ...(a.hmDev ? {hmDev:1} : {})}); });
    if (add) { S.arch.sort((a, b) => a.d.localeCompare(b.d)); if (S.arch.length > 2500) S.arch = S.arch.slice(-2500); }
  } catch (e) { elog(e); }
}
const rcRides = (from, to) => (S.arch || []).filter(a => a.d >= from && a.d <= to);
const rcSum = L => L.reduce((o, a) => ({n:o.n + 1, km:o.km + a.km, hm:o.hm + a.hm, sec:o.sec + a.sec, tss:o.tss + a.tss}), {n:0, km:0, hm:0, sec:0, tss:0});
const rcH = s => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : `0:${String(m).padStart(2, '0')}`; };
const rcKm = v => Math.round(v).toLocaleString('de-DE');
const rcPct = (a, b) => b ? Math.round(100 * a / b) : 0;
const rcMonKey = ds => ds.slice(0, 7);
const rcMonFrom = k => k + '-01', rcMonTo = k => { const [y, m] = k.split('-').map(Number); return lstr(new Date(y, m, 0, 12)); };
const rcMonName = k => (lang() === 'en' ? RC_MON_EN : RC_MON0)[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
const rcPrevMon = k => { const [y, m] = k.split('-').map(Number); return lstr(new Date(y, m - 2, 1, 12)).slice(0, 7); };
/* Wochenbilanzen des Plans mit Datum */
function rcWeeks(){
  const p = S.p; if (!p || !p.start) return [];
  const wh = {...(p.wh || {})}; if (hasStarted(p) && S.plan && S.wk) { try { wh[S.wk] = {...whSum(p, S.wk, S.plan, S.done || {}, S.actual || {}), live:1}; } catch (e) { elog(e); } }
  return Object.keys(wh).map(Number).sort((a, b) => a - b).map(w => ({...wh[w], w, from:addD(p.start, (w - 1) * 7), to:addD(p.start, (w - 1) * 7 + 6)}));
}
const rcEvals = () => { const p = S.p || {}; return [...Object.entries(p.exe || {}).map(([k, e]) => ({...e, k, day:(e.a && e.a.day) || null})), ...Object.values(p.exeP || {}).flat().filter(Boolean).map(e => ({...e, day:(e.a && e.a.day) || null}))].filter(e => e.day); };
const rcExtras = () => Object.values((S.p && S.p.extra) || {});
function rcZones(from, to){
  const z = [0, 0, 0, 0, 0, 0, 0]; let any = false;
  [...rcEvals().filter(e => e.day >= from && e.day <= to), ...rcExtras().filter(e => e.day >= from && e.day <= to)].forEach(e => { if (e.zp) { any = true; e.zp.forEach((v, i) => { z[i] += v; }); } });
  if (!any) return null; const t = z.reduce((q, v) => q + v, 0) || 1;
  return {lo:Math.round(100 * (z[0] + z[1]) / t), mid:Math.round(100 * z[2] / t), hi:Math.round(100 * (z[3] + z[4] + z[5] + z[6]) / t), sec:t};
}
function rcPrs(from, to){
  const out = []; [...rcEvals(), ...rcExtras()].forEach(e => { if (e.day >= from && e.day <= to && e.pr) e.pr.forEach(r => out.push({...r, day:e.day})); });
  const best = {}; out.forEach(r => { if (!best[r.k] || r.w > best[r.k].w) best[r.k] = r; }); return Object.values(best);
}
function rcCtl(ds){ let c = 0, prev = null; const A = S.arch || []; if (!A.length) return 0; const byD = {}; A.forEach(a => { byD[a.d] = (byD[a.d] || 0) + a.tss; });
  let d = A[0].d; while (d <= ds) { c += ((byD[d] || 0) - c) / 42; d = addD(d, 1); } return Math.round(c); }
function rcFtpAt(ds){ const p = S.p; if (!p) return null; const H = (p.ftpH || []).filter(h => h.d <= ds); return H.length ? H[H.length - 1].v : (p.ftpStart || p.ftp); }
function rcSick(from, to){ let n = 0; rcWeeks().forEach(r => { if (r.to >= from && r.from <= to && r.sick) n += r.sick; }); return n; }
function rcLogs(from, to){ const p = S.p || {}; let n = 0, tired = 0; rcWeeks().forEach(r => { if (r.to < from || r.from > to) return; const h = (p.logH || []).find(x => x.w === r.w), items = r.live ? (S.log || []) : (h ? h.items : []); n += items.length; tired += items.filter(l => /müde|platt|angeschlagen|Ausgelaugt|Check-in/i.test((l.title || '') + ' ' + (l.text || ''))).length; }); return {n, tired}; }
function rcEvents(from, to){ const p = S.p || {}, L = (p.subs || []).map(s => ({date:s.date, name:s.name, prio:s.prio || 'C'})); if (p.goal === 'event' && p.eventDate) L.push({date:p.eventDate, name:p.eventName || 'Hauptevent', prio:'A', main:1}); return L.filter(e => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date)); }
function rcStreak(){ const W = rcWeeks().filter(r => !r.live && r.n); let best = 0, cur = 0; W.forEach(r => { if (r.nd / r.n >= .8) { cur++; best = Math.max(best, cur); } else cur = 0; }); return {best, cur}; }
const rcTile = (v, l, sub) => `<div class="rct"><b>${v}</b><span>${l}</span>${sub ? `<i>${sub}</i>` : ''}</div>`;
const rcDelta = (a, b, unit) => { if (!b) return ''; const d = Math.round(100 * (a - b) / b); return d === 0 ? 'wie im Vormonat' : `${d > 0 ? '+' : '−'}${Math.abs(d)} % ${unit || 'zum Vormonat'}`; };
const rcSec = (t, body) => `<section class="panel p-4"><p class="eyebrow mb-2">${t}</p>${body}</section>`;
const rcList = L => `<ul class="rcl">${L.filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul>`;
function rcBar(rows, hiIdx){ const mx = Math.max(...rows.map(r => r[1]), 1), W = 320, H = 120, bw = W / rows.length;
  return `<svg viewBox="0 0 ${W} ${H + 18}" class="rcbar" role="img" aria-label="Stunden pro Monat">${rows.map((r, i) => { const h = Math.round((H - 14) * r[1] / mx); return `<rect x="${(i * bw + bw * .15).toFixed(1)}" y="${H - h}" width="${(bw * .7).toFixed(1)}" height="${h}" class="${esc(i === hiIdx ? 'rcb-hi' : 'rcb')}"/>${r[1] ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - h - 3}" text-anchor="middle" class="rcv">${Math.round(r[1])}</text>` : ''}<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H + 14}" text-anchor="middle" class="rcx">${r[0]}</text>`; }).join('')}</svg>`; }
function rcZoneBar(z){ if (!z) return ''; return `<div class="rcz"><i style="width:${esc(z.lo)}%;background:#00c2b2"></i><i style="width:${esc(z.mid)}%;background:#4f9dde"></i><i style="width:${esc(z.hi)}%;background:#e0464e"></i></div><p class="mt-1 text-xs" style="color:var(--mute)">Locker (Zone 1–2) ${z.lo} % · Tempo (Zone 3) ${z.mid} % · hart (ab Schwelle) ${z.hi} %</p>`; }
function rcZoneTxt(z){ if (!z) return 'Für die Intensitätsverteilung braucht die App bewertete Fahrten mit Leistungsdaten.';
  return z.lo >= 75 && z.hi >= 5 ? `Gut verteilt: ${z.lo} % locker und ${z.hi} % hart. So trainieren auch Profis, viel Grundlage und gezielte Spitzen.`
    : z.mid > 25 ? `${z.mid} % der Zeit lagen im mittleren Bereich. Das kostet Energie, bringt aber weniger als klar locker oder klar hart. Fahr die lockeren Einheiten ruhig noch etwas ruhiger.`
    : z.hi < 4 ? `Fast alles war locker (${z.lo} %). Für mehr Tempo fehlen die harten Reize: Die Intervalleinheiten lohnen sich besonders.`
    : `${z.lo} % locker, ${z.mid} % Tempo, ${z.hi} % hart.`; }
function rcGoalLine(ds){
  const p = S.p; if (!p) return '';
  if (p.goal === 'event' && p.eventDate) { const d = Math.round((new Date(p.eventDate + 'T12:00:00') - new Date(ds + 'T12:00:00')) / 864e5);
    if (d > 0) { let P = null; try { P = phases(p).find(x => S.wk >= x.from && S.wk <= x.to); } catch (e) { elog(e); } return `Bis ${rcN(p.eventName || 'zu deinem Event')} sind es noch ${d} Tage${P ? `, du bist in der ${P.name}-Phase` : ''}.`; }
    return `${p.eventName ? '<span data-noi18n>' + esc(p.eventName) + '</span>' : 'Dein Event'} liegt hinter dir.`; }
  return p.goal === 'ftp' ? `Dein Ziel: ${p.ftpTarget} W FTP bis ${fmt(p.endDate)}, aktuell ${p.ftp} W.` : `Dein Ziel läuft bis ${fmt(p.endDate)}.`;
}
/* ---------- Woche ---------- */
function rcWeekLines(r){
  const p = S.p, k = 'w' + r.w + p.start, pc = r.n ? r.nd / r.n : 1, L = [], rides = rcRides(r.from, r.to), s = rcSum(rides);
  const ev = rcEvals().filter(e => e.day >= r.from && e.day <= r.to && e.score != null).sort((a, b) => b.score - a.score)[0];
  const xr = rcExtras().filter(e => e.day >= r.from && e.day <= r.to), prs = rcPrs(r.from, r.to), st = rcStreak(), prev = rcWeeks().find(q => q.w === r.w - 1);
  if (r.sick) L.push(pickV([`Du warst diese Woche ${r.sick === 1 ? 'einen Tag' : r.sick + ' Tage'} krank. Gut, dass du pausiert hast.`, `${r.sick === 1 ? 'Ein Krankheitstag' : r.sick + ' Krankheitstage'} haben die Woche gebremst. Pause war die richtige Entscheidung.`], k));
  else if (pc >= .95) L.push(pickV([`Alle ${r.n} Einheiten erledigt, ${rcH(r.dm * 60)} Std. im Sattel. Genau so entsteht Form.`, `${r.nd} von ${r.n} Einheiten, ${rcH(r.dm * 60)} Std. Eine Woche wie aus dem Lehrbuch.`], k));
  else if (pc >= .7) L.push(`${r.nd} von ${r.n} Einheiten und ${rcH(r.dm * 60)} Std. Das Wichtigste der Woche ist drin.`);
  else if (r.nd) L.push(`${r.nd} von ${r.n} Einheiten, ${rcH(r.dm * 60)} Std. Weniger als geplant, aber jede Einheit zählt für deine Form.`);
  else L.push('Diese Woche kam kein geplantes Training zusammen. Das passiert, wichtig ist der nächste Schritt.');
  if (prs.length) L.push(`Neue Bestleistung: ${prs.map(q => `${q.l} ${q.w} W`).join(', ')}.`);
  else if (ev && ev.score >= 80) L.push(`Stärkste Einheit: „${rcN(ev.plan || 'Einheit')}“ mit ${ev.score}/100.`);
  else if (s.n && rides.length) { const lg = [...rides].sort((a, b) => b.sec - a.sec)[0]; if (lg.sec >= 5400) L.push(`Längste Fahrt: ${rcN(lg.n)}, ${rcKm(lg.km)} km in ${rcH(lg.sec)} Std.`); }
  if (xr.length) L.push(`Dazu ${xr.length === 1 ? 'eine Zusatzfahrt' : xr.length + ' Zusatzfahrten'} mit ${rcH(xr.reduce((q, e) => q + e.sec, 0))} Std.`);
  if (!r.sick && st.cur >= 3 && pc >= .8) L.push(`Das ist deine ${st.cur}. Woche in Folge mit mindestens 80 %.`);
  else if (!r.sick && prev && prev.n && pc > prev.nd / prev.n + .15) L.push('Deutlich mehr umgesetzt als in der Woche davor, stark.');
  else if (!r.sick && pc < .6) L.push('Tipp: Leg dir für nächste Woche die zwei wichtigsten Einheiten fest in den Kalender, der Rest ist Bonus.');
  return L.slice(0, 4);
}
/* ---------- Monat ---------- */
function rcMonth(mk){
  const from = rcMonFrom(mk), to = rcMonTo(mk) < iso(0) ? rcMonTo(mk) : iso(0), rides = rcRides(from, to), s = rcSum(rides), pk = rcPrevMon(mk), ps = rcSum(rcRides(rcMonFrom(pk), rcMonTo(pk)));
  const W = rcWeeks().filter(r => r.from >= addD(from, -3) && r.from <= to), n = W.reduce((q, r) => q + r.n, 0), nd = W.reduce((q, r) => q + r.nd, 0), good = W.filter(r => r.n && r.nd / r.n >= .8).length;
  const allM = [...new Set((S.arch || []).map(a => rcMonKey(a.d)))].filter(k => k < mk), best = allM.every(k => rcSum(rcRides(rcMonFrom(k), rcMonTo(k))).sec < s.sec);
  const sick = rcSick(from, to), lg = rcLogs(from, to), prs = rcPrs(from, to), z = rcZones(from, to), evs = rcEvents(from, to), xr = rcExtras().filter(e => e.day >= from && e.day <= to);
  const longest = [...rides].sort((a, b) => b.km - a.km)[0], climb = [...rides].sort((a, b) => b.hm - a.hm)[0], hardest = [...rides].sort((a, b) => b.tss - a.tss)[0];
  const bestEv = rcEvals().filter(e => e.day >= from && e.day <= to && e.score != null).sort((a, b) => b.score - a.score)[0];
  const f0 = rcFtpAt(addD(from, -1)), f1v = rcFtpAt(to), c0 = rcCtl(addD(from, -1)), c1 = rcCtl(to), kg = S.p ? kgOf(S.p) : 75;
  const days = new Set(rides.map(a => a.d)).size, wd = [0, 0, 0, 0, 0, 0, 0]; rides.forEach(a => { wd[(new Date(a.d + 'T12:00:00').getDay() + 6) % 7]++; }); const fav = wd.indexOf(Math.max(...wd));
  const pc = n ? nd / n : null, low = (pc != null && pc < .6) || sick >= 3, k = 'm' + mk;
  const head = !s.n ? 'Ein ruhiger Monat' : best && allM.length ? 'Dein bisher stärkster Monat' : low ? 'Ein Monat mit Gegenwind' : pc != null && pc >= .9 ? 'Ein Monat voller Konsequenz' : c1 > c0 + 3 ? 'Ein Monat, der dich fitter gemacht hat' : 'Dein Monat im Überblick';
  const intro = !s.n ? 'In diesem Monat sind keine Fahrten gespeichert. Lade Fahrten hoch oder verbinde Garmin, dann wird der Rückblick persönlich.'
    : low ? `${sick ? `${sick} ${sick === 1 ? 'Krankheitstag' : 'Krankheitstage'}${pc != null && pc < .6 ? ' und ein voller Alltag' : ''}` : 'Der Alltag'} haben den Plan ausgebremst. Trotzdem stehen ${s.n} Fahrten und ${rcH(s.sec)} Std. auf der Habenseite. Form verschwindet nicht so schnell, wie sie sich anfühlt: Ein ruhigerer Monat kostet kaum, wenn es jetzt weitergeht.`
    : `${s.n} Fahrten, ${rcKm(s.km)} km und ${rcH(s.sec)} Std.${pc != null ? ` Du hast ${nd} von ${n} geplanten Einheiten umgesetzt (${Math.round(pc * 100)} %).` : ''}${ps.sec ? ` Im Vergleich zum Vormonat ${rcDelta(s.sec, ps.sec, 'Trainingszeit')}.` : ''}`;
  const tiles = `<div class="rcg">${rcTile(s.n, 'Fahrten')}${rcTile(rcKm(s.km), 'km', ps.km ? rcDelta(s.km, ps.km) : '')}${rcTile(rcH(s.sec), 'Stunden', ps.sec ? rcDelta(s.sec, ps.sec) : '')}${rcTile(rcKm(s.hm), 'Höhenmeter')}${rcTile(Math.round(s.tss), 'TSS')}${n ? rcTile(nd + '/' + n, 'Einheiten', Math.round(pc * 100) + ' %') : rcTile(days, 'Trainingstage')}</div>`;
  const hl = rcList([
    longest && longest.km >= 30 ? `<b>Längste Fahrt:</b> ${rcN(longest.n)} am ${fmt(longest.d)}, ${rcKm(longest.km)} km in ${rcH(longest.sec)} Std.` : '',
    climb && climb.hm >= 500 && climb !== longest ? `<b>Meiste Höhenmeter:</b> ${rcN(climb.n)}, ${rcKm(climb.hm)} hm.` : climb && climb.hm >= 500 ? `<b>Dabei auch die meisten Höhenmeter:</b> ${rcKm(climb.hm)} hm.` : '',
    hardest && hardest.tss >= 120 && hardest !== longest ? `<b>Härteste Fahrt:</b> ${rcN(hardest.n)} mit TSS ${hardest.tss}.` : '',
    bestEv && bestEv.score >= 75 ? `<b>Beste Umsetzung:</b> „${rcN(bestEv.plan || 'Einheit')}“ mit ${bestEv.score}/100.` : '',
    ...prs.map(q => `<b>Bestleistung ${q.l}:</b> ${q.w} W (${f1(q.w / kg)} W/kg) am ${fmt(q.day)}, vorher ${q.was} W.`),
    f1v && f0 && f1v !== f0 ? `<b>FTP:</b> von ${f0} auf ${f1v} W (${f1v > f0 ? '+' : '−'}${Math.abs(f1v - f0)} W).` : '',
    ...evs.filter(e => e.date <= iso(0)).map(e => `<b>${e.prio === 'A' ? 'Formhöhepunkt' : e.prio + '-Rennen'}:</b> ${rcN(e.name)} am ${fmt(e.date)}.`),
    xr.length ? `<b>Zusatzfahrten:</b> ${xr.length} mit zusammen ${rcH(xr.reduce((q, e) => q + e.sec, 0))} Std. Motivation hast du offensichtlich.` : ''
  ]);
  const cons = `${W.length ? `<p class="text-sm">${good} von ${W.length} Wochen mit mindestens 80 % der Einheiten.${good === W.length && W.length >= 3 ? ' Keine Woche ausgelassen, das ist die Grundlage für jeden Fortschritt.' : good >= W.length / 2 ? ' Die Mehrheit der Wochen saß, darauf lässt sich aufbauen.' : ' Hier liegt dein größter Hebel: lieber jede Woche etwas als einzelne große Wochen.'}</p>` : ''}
    ${days ? `<p class="mt-2 text-sm">An ${days} Tagen warst du auf dem Rad${wd[fav] >= 2 ? `, am liebsten <span data-noi18n>${lang() === 'en' ? 'on ' + RC_WD_EN[fav] + 's' : RC_WD0[fav].toLowerCase() + 's'}</span>` : ''}.</p>` : ''}`;
  const form = c0 || c1 ? `<p class="text-sm">Deine Fitness (CTL) ging von ${c0} auf ${c1}${c1 > c0 + 2 ? ', klar nach oben. Das Training kommt an.' : c1 < c0 - 2 ? ', etwas nach unten. Nach einem ruhigeren Monat ist das normal, mit zwei, drei konstanten Wochen holst du es zurück.' : ', stabil.'}</p>` : '';
  const hard = low || lg.tired || sick ? `<p class="text-sm">${[sick ? `${sick} ${sick === 1 ? 'Tag' : 'Tage'} krank` : '', n - nd > 0 ? `${n - nd} ${n - nd === 1 ? 'Einheit' : 'Einheiten'} ausgefallen` : '', lg.tired ? `${lg.tired}× müde gemeldet` : ''].filter(Boolean).join(', ')}. ${pickV(['Rückschläge gehören dazu. Entscheidend ist, dass du dranbleibst, und das tust du gerade, indem du dir das hier ansiehst.', 'Kein Plan läuft glatt. Die App hat sich angepasst, und deine Form ist noch da. Jetzt zählt die nächste Woche, nicht die verpasste.', 'Das Leben geht manchmal vor. Wer nach einer schwierigen Phase locker wieder einsteigt, ist nach kurzer Zeit wieder in der Spur.'], k)}</p>` : '';
  const nk = (() => { const [y, m] = mk.split('-').map(Number); return lstr(new Date(y, m, 1, 12)).slice(0, 7); })(), nev = rcEvents(rcMonFrom(nk), rcMonTo(nk));
  const out = `<p class="text-sm">${rcGoalLine(to)}</p>${nev.length ? `<p class="mt-2 text-sm">Im ${RC_MON[Number(nk.slice(5)) - 1]} stehen an: ${nev.map(e => `<b>${rcN(e.name)}</b> (${fmt(e.date)}, ${e.prio})`).join(', ')}.</p>` : ''}<p class="mt-2 text-sm">${low ? 'Dein Fokus für den nächsten Monat: Regelmäßigkeit vor Umfang. Lieber jede Woche die wichtigsten zwei Einheiten als einzelne lange Ritte.' : z && z.mid > 25 ? 'Dein Fokus für den nächsten Monat: lockere Einheiten wirklich locker fahren, damit die harten richtig gut werden.' : pc != null && pc >= .9 ? 'Dein Fokus für den nächsten Monat: so weitermachen und auf Erholung achten. Konstanz ist dein größter Trumpf.' : 'Dein Fokus für den nächsten Monat: die geplanten Intervalle sauber treffen und die Long Rides mit Verpflegung üben.'}</p>`;
  return `<section class="panel p-5"><p class="eyebrow">${rcMonName(mk)}</p><p class="hd mt-1 text-2xl font-semibold">${head}</p><p class="mt-2 text-sm">${intro}</p>${s.n ? `<div class="mt-4">${tiles}</div>` : ''}</section>`
    + (s.n ? rcSec('Highlights', hl.replace('<ul class="rcl"></ul>', '<p class="text-sm" style="color:var(--mute)">Noch keine besonderen Werte. Mit Leistungsdaten erkennt die App auch Bestleistungen.</p>')) : '')
    + (W.length || days ? rcSec('Beständigkeit', cons) : '')
    + (s.n ? rcSec('Intensität und Form', rcZoneBar(z) + `<p class="mt-2 text-sm">${rcZoneTxt(z)}</p>` + (form ? `<div class="mt-2">${form}</div>` : '')) : '')
    + (hard ? rcSec('Was nicht nach Plan lief', hard) : '')
    + rcSec('Ausblick', out);
}
/* ---------- Jahr ---------- */
const RC_DIST = [[300, 'von Hamburg nach Berlin'], [600, 'von München nach Hamburg'], [900, 'von Flensburg nach Garmisch'], [1400, 'von Berlin nach Rom'], [2300, 'von Hamburg nach Madrid'], [3500, 'einmal quer durch Europa, von Lissabon nach Warschau'], [5000, 'von Berlin nach Teheran'], [8000, 'von Berlin nach Peking'], [12000, 'von Europa bis nach Australien']];
function rcYear(y){
  const from = y + '-01-01', to = (y + '-12-31') < iso(0) ? y + '-12-31' : iso(0), rides = rcRides(from, to), s = rcSum(rides), ps = rcSum(rcRides((y - 1) + '-01-01', (y - 1) + '-12-31')), k = 'y' + y;
  const months = Array.from({length:12}, (_, i) => { const mk = y + '-' + String(i + 1).padStart(2, '0'), L = rcRides(rcMonFrom(mk), rcMonTo(mk)), q = rcSum(L); return {mk, i, ...q}; });
  const bm = months.reduce((a, b) => b.sec > a.sec ? b : a), W = rcWeeks().filter(r => r.from >= addD(from, -3) && r.from <= to), n = W.reduce((q, r) => q + r.n, 0), nd = W.reduce((q, r) => q + r.nd, 0);
  const bwk = {}; rides.forEach(a => { const m = mondayOf(a.d); bwk[m] = (bwk[m] || 0) + a.sec; }); const bwd = Object.entries(bwk).sort((a, b) => b[1] - a[1])[0], bw = bwd ? {from:bwd[0], sec:bwd[1]} : null, st = rcStreak(), days = new Set(rides.map(a => a.d)).size, kg = S.p ? kgOf(S.p) : 75;
  const longest = [...rides].sort((a, b) => b.km - a.km)[0], climb = [...rides].sort((a, b) => b.hm - a.hm)[0], z = rcZones(from, to), prs = rcPrs(from, to), evs = rcEvents(from, to).filter(e => e.date <= iso(0));
  const best = k2 => Math.max(0, ...rides.map(a => a[k2] || 0)), b1 = best('m1'), b5 = best('m5'), b20 = best('m20'), f0 = rcFtpAt(from), f1v = rcFtpAt(to);
  const sick = rcSick(from, to), lg = rcLogs(from, to), xr = rcExtras().filter(e => e.day >= from && e.day <= to), hrs = rides.filter(a => a.h != null), morn = hrs.filter(a => a.h < 11).length, eve = hrs.filter(a => a.h >= 17).length;
  const wd = [0, 0, 0, 0, 0, 0, 0]; rides.forEach(a => { wd[(new Date(a.d + 'T12:00:00').getDay() + 6) % 7]++; }); const fav = wd.indexOf(Math.max(...wd));
  const dist = [...RC_DIST].reverse().find(d => s.km >= d[0]), ev8 = s.hm / 8849, wks = Math.max(1, Math.round((new Date(to + 'T12:00:00') - new Date((rides[0] ? rides[0].d : from) + 'T12:00:00')) / 6048e5));
  const pc = n ? nd / n : null;
  const head = !s.n ? `${y}: der Anfang` : ps.sec && s.sec > ps.sec * 1.15 ? `${y}: dein Jahr des Wachstums` : evs.length ? `${y}: dein Rennjahr` : pc != null && pc >= .85 ? `${y}: das Jahr der Konstanz` : `${y} im Rückblick`;
  const intro = !s.n ? 'Für dieses Jahr sind noch kaum Fahrten gespeichert. Ab jetzt sammelt die App alles, im nächsten Jahresrückblick steht hier deine ganze Saison.'
    : `${s.n} Fahrten, ${rcKm(s.km)} km, ${rcKm(s.hm)} Höhenmeter und ${rcH(s.sec)} Stunden im Sattel. ${dist ? `Das ist so weit wie ${dist[1]}` : `Das ist ein starker Anfang`}${ev8 >= 1 ? `, und du bist ${f1(ev8)}-mal auf den Mount Everest geklettert` : ''}. Im Schnitt ${rcH(s.sec / wks)} Std. pro Woche.${ps.sec ? ` Gegenüber ${y - 1}: ${rcDelta(s.sec, ps.sec, 'Trainingszeit')}.` : ''}`;
  const tiles = `<div class="rcg">${rcTile(s.n, 'Fahrten')}${rcTile(rcKm(s.km), 'km')}${rcTile(rcH(s.sec), 'Stunden')}${rcTile(rcKm(s.hm), 'Höhenmeter')}${rcTile(days, 'Trainingstage')}${rcTile(rcKm(s.tss), 'TSS gesamt')}</div>`;
  const chart = rcBar(months.map(m => [(lang() === 'en' ? RC_MON_EN : RC_MON0)[m.i].slice(0, 1), m.sec / 3600]), bm.sec ? bm.i : -1) + (bm.sec ? `<p class="mt-1 text-sm">Dein stärkster Monat war der <b>${RC_MON[bm.i]}</b> mit ${rcH(bm.sec)} Std. und ${rcKm(bm.km)} km.</p>` : '');
  const chapters = months.filter(m => m.sec).map(m => { const e = rcEvents(rcMonFrom(m.mk), rcMonTo(m.mk)).filter(x => x.date <= iso(0)), pr = rcPrs(rcMonFrom(m.mk), rcMonTo(m.mk)), lz = rcRides(rcMonFrom(m.mk), rcMonTo(m.mk)).sort((a, b) => b.km - a.km)[0];
    return (`<b>${RC_MON[m.i]}:</b> ${m.n} ${m.n === 1 ? 'Fahrt' : 'Fahrten'}, ${rcH(m.sec)} Std.${e.length ? `, ${e.map(x => rcN(x.name)).join(' und ')}` : ''}${pr.length ? `, Bestleistung über ${pr.map(q => q.l).join(' und ')}` : lz && lz.km >= 100 ? `, längste Fahrt ${rcKm(lz.km)} km` : ''}.`).replace(/\.\.$/, '.'); });
  const rec = rcList([
    longest ? `<b>Längste Fahrt:</b> ${rcN(longest.n)} am ${fmt(longest.d)}, ${rcKm(longest.km)} km in ${rcH(longest.sec)} Std.` : '',
    climb && climb.hm >= 300 ? `<b>Meiste Höhenmeter an einem Tag:</b> ${rcKm(climb.hm)} hm (${rcN(climb.n)}).` : '',
    bw ? `<b>Größte Trainingswoche:</b> ab ${fmt(bw.from)} mit ${rcH(bw.sec)} Std.` : '',
    b20 ? `<b>Beste 20 Minuten:</b> ${b20} W (${f1(b20 / kg)} W/kg)` : '', b5 ? `<b>Beste 5 Minuten:</b> ${b5} W (${f1(b5 / kg)} W/kg)` : '', b1 ? `<b>Beste Minute:</b> ${b1} W` : '',
    f0 && f1v ? `<b>FTP:</b> ${f0 === f1v ? `stabil bei ${f1v} W` : `von ${f0} auf ${f1v} W (${f1v > f0 ? '+' : '−'}${Math.abs(f1v - f0)} W, ${f1v > f0 ? '+' : '−'}${Math.abs(Math.round(100 * (f1v - f0) / f0))} %)`}, ${f1(f1v / kg)} W/kg` : '',
    prs.length ? `<b>Neue Bestleistungen im Jahr:</b> ${prs.length}` : ''
  ]);
  const evH = evs.length ? rcList(evs.map(e => `<b>${fmt(e.date)}:</b> ${rcN(e.name)} ${e.prio === 'A' ? '(Formhöhepunkt)' : '(' + e.prio + '-Rennen)'}`)) + `<p class="mt-2 text-sm">${evs.length === 1 ? 'Ein Ziel, auf das du monatelang hingearbeitet hast.' : `${evs.length} Startnummern in einem Jahr. Jedes Rennen hat dich etwas gelehrt.`}</p>` : '';
  const habit = `<p class="text-sm">${pc != null ? `${nd} von ${n} geplanten Einheiten umgesetzt (${Math.round(pc * 100)} %). ` : ''}${st.best >= 2 ? `Deine längste Serie: ${st.best} Wochen in Folge mit mindestens 80 %. ` : ''}${wd[fav] ? `Dein Lieblingstag: <span data-noi18n>${lang() === 'en' ? RC_WD_EN[fav] : RC_WD0[fav]}</span>. ` : ''}${hrs.length >= 5 ? (morn > eve * 1.5 ? 'Du bist eher Frühaufsteher auf dem Rad. ' : eve > morn * 1.5 ? 'Du trainierst am liebsten abends. ' : '') : ''}${xr.length ? `${xr.length === 1 ? 'Eine Zusatzfahrt zeigt' : xr.length + ' Zusatzfahrten zeigen'}, wie gern du fährst. ` : ''}</p>`
    + (sick || lg.n ? `<p class="mt-2 text-sm">${[sick ? `${sick} ${sick === 1 ? 'Krankheitstag' : 'Krankheitstage'}` : '', lg.n ? `${lg.n} ${lg.n === 1 ? 'Anpassung' : 'Anpassungen'} am Plan` : ''].filter(Boolean).join(' und ')}, weil das Leben nicht immer nach Plan läuft. Dass du danach weitergemacht hast, ist die eigentliche Leistung.</p>` : '');
  const pe = S.p && S.p.goal === 'event' && S.p.eventDate && S.p.eventDate > to ? S.p : null, gain = f0 && f1v ? Math.round(100 * (f1v - f0) / f0) : 0;
  const one = [gain >= 3 ? `Du bist ${gain} % stärker geworden` : gain <= -3 ? 'Deine Leistung hat etwas nachgegeben' : 'Du hast deine Leistung gehalten', pc != null ? (pc >= .85 ? 'und warst dabei beeindruckend konsequent' : pc >= .65 ? 'und bist meistens drangeblieben' : 'auch wenn nicht jede Woche lief') : '', ].filter(Boolean).join(' ') + (evs.length ? `, mit ${evs.length === 1 ? 'einem Rennen' : evs.length + ' Rennen'} als Höhepunkt${evs.length === 1 ? '' : 'en'}` : '') + '.';
  const nextY = !s.n ? '' : `<p class="text-sm"><b>Dein Jahr in einem Satz:</b> ${one}</p>${pe ? `<p class="mt-2 text-sm">Am ${fmt(pe.eventDate)} steht dein nächstes großes Ziel an: <b>${rcN(pe.eventName || 'dein Event')}</b>. Mit ${rcKm(s.km)} km aus ${y} in den Beinen startest du nicht bei null, sondern mitten in deiner Entwicklung.</p>` : ''}<p class="mt-2 text-sm">${z && z.mid > 25 ? 'Für das nächste Jahr: Polarisierter trainieren. Mehr wirklich lockere Kilometer, dafür die harten Einheiten gezielt und frisch.' : pc != null && pc < .7 ? 'Für das nächste Jahr: Ein Plan, der zu deinem Alltag passt, schlägt jeden ambitionierten Plan. Plane lieber eine Stunde weniger pro Woche und setz sie dafür konsequent um.' : b20 && b5 && b5 / b20 > 1.25 ? 'Für das nächste Jahr: Deine Stärke liegt in kurzen, harten Anstrengungen. Mit mehr Schwellen- und Sweet-Spot-Arbeit wird daraus auch Ausdauer am Berg.' : b20 && b5 && b5 / b20 < 1.12 ? 'Für das nächste Jahr: Du bist ein Ausdauertyp. Ein paar VO2max-Blöcke machen dich spritziger für Anstiege und Attacken.' : pe ? 'Für das nächste Jahr: Trag alle Rennen der Saison ein und markiere, welche dir wichtig sind. Mit A-Events plant die App mehrere Formhöhepunkte.' : 'Für das nächste Jahr: Auf dieser Grundlage lohnt sich ein klares Ziel mit A-Event. Plane die Saison mit Formhöhepunkten.'}</p><button class="btn mt-3 !w-auto" onclick="newPlan()">Nächste Saison planen</button>`;
  return `<section class="panel p-5"><p class="eyebrow">${fmt(from)} bis ${fmt(to)}</p><p class="hd mt-1 text-2xl font-semibold">${head}</p><p class="mt-2 text-sm">${intro}</p>${s.n ? `<div class="mt-4">${tiles}</div>` : ''}</section>`
    + (s.n ? rcSec('Dein Jahr Monat für Monat', chart) : '')
    + (chapters.length ? rcSec('Deine Saison in Kapiteln', rcList(chapters)) : '')
    + (s.n ? rcSec('Rekorde', rec) : '') + (evH ? rcSec('Deine Rennen', evH) : '')
    + (s.n ? rcSec('Gewohnheiten', habit) : '') + (s.n ? rcSec('Intensität', rcZoneBar(z) + `<p class="mt-2 text-sm">${rcZoneTxt(z)}</p>`) : '')
    + (nextY ? rcSec('Ausblick auf ' + (y + 1), nextY) : '');
}
