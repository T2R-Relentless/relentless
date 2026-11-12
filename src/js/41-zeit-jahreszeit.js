/* ---------- Backlog 07.11.2026, Punkt 7 (F6): verfügbare Trainingszeit je Jahreszeit ----------
   Zwei Profile, „Winter“ und „Sommer“, je mit Stunden pro Woche, Anzahl der Trainingstage und möglichen Wochentagen.
   Jeder Monat gehört zu einem Profil, einzelne Monate können eigene Stunden haben. Gespeichert im Plan (S.p.tb), damit
   es mit dem Plan in Bibliothek, Schnappschüssen und Sicherung liegt. Die Wochenplanung (genWeek) bekommt je Woche
   Stunden, Tage und den Long-Ride-Tag aus dem Budget des Monats. Beim ersten Öffnen werden die bisherigen festen Werte
   (Stunden und Wochentage) für beide Profile übernommen. Eine Budgetänderung gilt ab der nächsten Woche; für die
   laufende Woche macht die App einen Vorschlag, der erst nach Zustimmung umgesetzt wird. */
const TB_MON = () => ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
/* Gespeichertes Budget gültig? (alte oder beschädigte Sicherungen bekommen die Standardwerte) */
function tbOk(tb){ const pr = k => tb.prof[k] && tb.prof[k].h > 0 && tb.prof[k].days > 0 && Array.isArray(tb.prof[k].avail) && tb.prof[k].avail.length === 7;
  return !!(tb && typeof tb === 'object' && tb.prof && pr('w') && pr('s') && Array.isArray(tb.mon) && tb.mon.length === 12 && (!tb.dev || typeof tb.dev === 'object')); }
function tbInit(p){
  p = p || S.p; if (!p) return null;
  if (tbOk(p.tb)) return p.tb;
  const av = (p.avail || []).map(Boolean), n = av.filter(Boolean).length || 3, pr = {h:p.hours || 6, days:n, avail:av.length === 7 ? av : [false, true, false, true, false, true, true]};
  p.tb = {on:false, prof:{w:{...pr, avail:[...pr.avail]}, s:{...pr, avail:[...pr.avail]}}, mon:['w', 'w', 'w', 's', 's', 's', 's', 's', 's', 's', 'w', 'w'], dev:{}};
  return p.tb;
}
/* Budget eines Monats (0–11) */
function tbOf(tb, m){ const k = tb.mon[m] === 's' ? 's' : 'w', pr = tb.prof[k], d = tb.dev && tb.dev[m]; return {k, h:d && d.h > 0 ? d.h : pr.h, days:pr.days, avail:pr.avail, dev:!!(d && d.h > 0)}; }
/* Tage auswählen: aus den möglichen Wochentagen n Tage, möglichst gleichmäßig verteilt, der Long-Ride-Tag zuerst */
function tbDays(b, longDay){
  const al = [0, 1, 2, 3, 4, 5, 6].filter(i => b.avail[i]); if (!al.length) return [false, false, false, false, false, false, false];
  const n = Math.max(1, Math.min(b.days || al.length, al.length)); if (n >= al.length) return [0, 1, 2, 3, 4, 5, 6].map(i => !!b.avail[i]);
  const ch = [al.includes(longDay) ? longDay : al[al.length - 1]], dist = (a, c) => Math.min(Math.abs(a - c), 7 - Math.abs(a - c));
  while (ch.length < n) { let best = null, bd = -1; al.filter(i => !ch.includes(i)).forEach(i => { const d = Math.min(...ch.map(c => dist(i, c))); if (d > bd) { bd = d; best = i; } }); ch.push(best); }
  return [0, 1, 2, 3, 4, 5, 6].map(i => ch.includes(i));
}
/* Monat einer Planwoche (Wochenmitte) */
function tbMonOf(p, w){ const d = new Date(p.start + 'T12:00:00'); d.setDate(d.getDate() + (w - 1) * 7 + 3); return d.getMonth(); }
/* M10 (Audit 12.11.2026): Steigt das Budget von einem Monat zum nächsten deutlich (zum Beispiel Winter → Sommer), wächst die Wochenzeit
   stufenweise: je Woche höchstens 1 Std. oder 15 % mehr (das Größere). Sinkt das Budget, gilt es sofort. */
const _tbH = new Map();
function tbHours(p, w){
  const key = JSON.stringify([p.start, p.tb]); let L = _tbH.get(key); if (!L) { L = []; if (_tbH.size > 20) _tbH.clear(); _tbH.set(key, L); }
  for (let k = L.length + 1; k <= w; k++) { const t = tbOf(p.tb, tbMonOf(p, k)).h, prev = k > 1 ? L[k - 2] : t; L.push(t <= prev ? t : Math.min(t, Math.round((prev + Math.max(1, prev * .15)) * 2) / 2)); }
  return L[w - 1];
}
/* Plan für die Wochenplanung an das Budget anpassen */
function tbApply(p, w){
  if (!p || !p.tb || !p.tb.on || !tbOk(p.tb) || !p.start) return p;
  const b = tbOf(p.tb, tbMonOf(p, w)), av = tbDays(b, p.longDay);
  if (!av.some(Boolean)) return p;
  return {...p, hours:tbHours(p, w), avail:av, commute:(p.commute || []).map((c, i) => c && av[i]), longDay:av[p.longDay] ? p.longDay : [6, 5, 0, 4, 3, 2, 1].find(i => av[i])};
}
/* ---- Einstellungen → Alltag und Planstart: Bearbeiten (Entwurf), Speichern, Vorschlag für die laufende Woche ---- */
let tbD = null, tbMsg = '', tbProp = null;
/* B6: In der Planung (S.step > 0) gilt das Budget für den Entwurf S.d und wird direkt übernommen (es läuft noch kein Plan).
   Im laufenden Plan wird ein Entwurf bearbeitet und erst mit „Speichern“ übernommen (mit Vorschlag für die laufende Woche). */
const tbPl = () => !!(S.step && S.d);
function tbEdit(){ if (tbPl()) return tbInit(S.d); const tb = tbInit(); if (!tb) return null; if (!tbD) tbD = JSON.parse(JSON.stringify(tb)); return tbD; }
const tbDone = () => { if (tbPl()) save(); render(); };
function tbSet(k, f, v){ const d = tbEdit(); if (!d) return; if (k === 'on') d.on = !!v; else if (f === 'h') d.prof[k].h = Math.max(1, Math.min(40, Math.round(wfNum(v) * 2) / 2)); else if (f === 'days') d.prof[k].days = Math.max(1, Math.min(7, Math.round(wfNum(v)))); tbMsg = ''; tbDone(); }
function tbDay(k, i){ const d = tbEdit(); if (!d) return; const a = d.prof[k].avail; a[i] = !a[i]; if (!a.some(Boolean)) a[i] = true; tbMsg = ''; tbDone(); }
function tbMon(m){ const d = tbEdit(); if (!d) return; d.mon[m] = d.mon[m] === 's' ? 'w' : 's'; tbMsg = ''; tbDone(); }
function tbDev(m, v){ const d = tbEdit(); if (!d) return; d.dev = d.dev || {}; const h = Math.round(wfNum(v) * 2) / 2; if (h > 0) d.dev[m] = {h:Math.min(40, h)}; else delete d.dev[m]; tbMsg = ''; tbDone(); }
function tbCancel(){ tbD = null; tbMsg = ''; render(); }
function tbSave(){
  const p = S.p, d = tbD; if (!p || !d) return;
  p.tb = JSON.parse(JSON.stringify(d)); tbD = null;
  tbMsg = 'Gespeichert. Das Zeitbudget gilt ab der nächsten Woche.';
  /* laufende Woche: Vorschlag statt direkter Änderung */
  tbProp = null;
  if (S.plan && hasStarted(p)) {
    const t = todayIdx(), nw = genWeek(p, S.wk), keep = (x, i) => i < t || x.adapted || x.varOf || x.moved || S.done[i] || (S.actual && S.actual[i]) || x.blocked;
    const P = S.plan.map((x, i) => keep(x, i) ? x : nw[i]), ch = P.map((x, i) => paSig(x) !== paSig(S.plan[i]) ? i : -1).filter(i => i >= 0);
    if (ch.length) { const b = p.tb.on ? tbOf(p.tb, tbMonOf(p, S.wk)) : {h:p.hours}; tbProp = {w:S.wk, P, ch, base:S.plan.map(paSig), warns:paCheck(P, S.plan, {budget:Math.round(b.h * 60)}).warns}; tbMsg = 'Gespeichert. Das Zeitbudget gilt ab der nächsten Woche. Für diese Woche gibt es einen Vorschlag.'; }
  }
  save(); render();
}
function tbAccept(){
  const pr = tbProp; if (!pr || pr.w !== S.wk || S.plan.map(paSig).join() !== pr.base.join()) { tbProp = null; tbMsg = 'Der Vorschlag ist nicht mehr aktuell, der Plan hat sich inzwischen geändert.'; return render(); }
  bkPre('Vor dem Anpassen an das Zeitbudget');
  S.plan = pr.P; tbProp = null; tbMsg = 'Diese Woche ist an das Zeitbudget angepasst.';
  note('Zeitbudget', `Die Woche wurde an das neue Zeitbudget angepasst (${pr.ch.map(i => DAYS[i]).join(', ')}).`, -1); save(); render();
}
function tbDecline(){ tbProp = null; tbMsg = 'Diese Woche bleibt, wie sie ist. Das Zeitbudget gilt ab der nächsten Woche.'; render(); }
function tbCard(){
  const pl = tbPl(), p = pl ? S.d : S.p; if (!p) return '';
  const tb = (!pl && tbD) || tbInit(p), ed = !pl && !!tbD, M = TB_MON(), cur = new Date().getMonth();
  const prof = (k, l) => { const b = tb.prof[k];
    return `<div class="mt-3 p-3" style="border:1px solid var(--line)"><p class="font-semibold">${l}</p><div class="mt-2 grid grid-cols-2 gap-3">${field('Stunden pro Woche', `<input type="text" inputmode="decimal" class="inp" style="min-height:44px" value="${esc(String(b.h).replace('.', ','))}" onchange="tbSet('${k}','h',this.value)">`)}${field('Trainingstage', `<input type="number" inputmode="numeric" min="1" max="7" class="inp" style="min-height:44px" value="${esc(b.days)}" onchange="tbSet('${k}','days',this.value)">`)}</div>
      <p class="mt-2 text-xs" style="color:var(--mute)">Mögliche Wochentage</p><div class="mt-1 flex flex-wrap gap-1.5">${SD.map((d, i) => `<button class="${b.avail[i] ? 'btn' : 'ghost'} !w-auto !px-0 text-sm" style="min-width:44px;min-height:44px" aria-pressed="${!!b.avail[i]}" onclick="tbDay('${k}',${i})">${d}</button>`).join('')}</div></div>`; };
  const bar = `<div class="mt-2 grid gap-1" style="grid-template-columns:repeat(6,minmax(0,1fr))">${M.map((m, i) => { const b = tbOf(tb, i);
    return `<button class="${b.k === 's' ? 'btn' : 'ghost'} !w-auto !px-0 text-xs" style="min-height:52px;${i === cur ? 'outline:2px solid var(--ice);' : ''}" aria-label="${esc(m)}: ${b.k === 's' ? 'Sommer' : 'Winter'}" onclick="tbMon(${i})"><span class="block font-semibold">${m}</span><span class="block">${b.k === 's' ? 'S' : 'W'} · ${hStd(b.h)}${b.dev ? '*' : ''}</span></button>`; }).join('')}</div>`;
  const devRows = `<details class="mt-2"><summary class="cursor-pointer text-sm" style="color:var(--teal);min-height:44px;display:flex;align-items:center">Einzelne Monate abweichend</summary><div class="mt-2 grid grid-cols-2 gap-2">${M.map((m, i) => field(`${m} (Std./Woche)`, `<input type="text" inputmode="decimal" class="inp" style="min-height:44px" placeholder="${esc(hStd(tb.prof[tb.mon[i] === 's' ? 's' : 'w'].h))}" value="${esc(tb.dev && tb.dev[i] ? String(tb.dev[i].h).replace('.', ',') : '')}" onchange="tbDev(${i},this.value)">`)).join('')}</div><p class="mt-1 text-xs" style="color:var(--mute)">Leer lassen = Wert des Profils.</p></details>`;
  const prop = !pl && tbProp && tbProp.w === S.wk ? `<div class="mt-3 p-3 text-sm" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><p><b>Vorschlag für diese Woche:</b></p><ul class="mt-1 space-y-1">${tbProp.ch.map(i => `<li><span>${DAYS[i]}</span>: <span data-noi18n>${esc(S.plan[i].n || '')}</span> (<span>${S.plan[i].m ? mm(S.plan[i].m) : '–'}</span>) ${ic('chevR', 14)} <span data-noi18n>${esc(tbProp.P[i].n || '')}</span> (<span>${tbProp.P[i].m ? mm(tbProp.P[i].m) : '–'}</span>)</li>`).join('')}</ul>${tbProp.warns.map(w => `<p class="mt-1 flex gap-2">${ic('warn', 18, 'margin-top:2px;color:var(--teal)')}<span>${w}</span></p>`).join('')}<div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="tbAccept()">Annehmen</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="tbDecline()">Ablehnen</button></div></div>` : '';
  return `<section class="panel p-4" id="fx-tb"><p class="font-semibold">Zeitbudget nach Jahreszeit</p><p class="mt-1 text-sm" style="color:var(--mute)">Zwei Profile für Winter und Sommer. Jeder Monat gehört zu einem Profil, einzelne Monate können abweichen. Die Wochenplanung hält das Budget des jeweiligen Monats ein: bei wenig Zeit kürzere, intensivere Einheiten, bei mehr Zeit lange Ausfahrten.</p>
    <label class="mt-3 flex items-center gap-3" style="min-height:44px"><input type="checkbox" style="width:22px;height:22px" ${tb.on ? 'checked' : ''} onchange="tbSet('on',null,this.checked)"><span class="text-sm font-semibold">Zeitbudget nach Jahreszeit verwenden</span></label>
    ${tb.on ? prof('w', 'Winter') + prof('s', 'Sommer') + `<p class="mt-3 text-sm font-semibold">Monate</p><p class="text-xs" style="color:var(--mute)">Antippen wechselt zwischen Winter (W) und Sommer (S). * = eigener Wert.</p>${bar}${devRows}` : ''}
    ${ed ? `<div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-4" style="min-height:44px" onclick="tbSave()">Speichern</button><button class="ghost !w-auto !px-4" style="min-height:44px" onclick="tbCancel()">Verwerfen</button></div><p class="mt-1 text-xs" style="color:var(--mute)">Gilt nach dem Speichern ab der nächsten Woche. Für die laufende Woche schlägt die App eine Anpassung vor.</p>` : ''}
    ${pl && tb.on ? '<p class="mt-2 text-xs" style="color:var(--mute)">Gilt für den neuen Plan. Die Wochenvorschau oben und die Prognose rechnen schon damit. Die Stunden oben gelten dann nur noch als Ausgangswert.</p>' : ''}
    ${!pl && tbMsg ? `<p class="mt-2 text-sm" role="status">${esc(tbMsg)}</p>` : ''}${prop}</section>`;
}
/* ---- Gesamtplan: geplante und verfügbare Stunden je Monat ---- */
let tbSeaC = null;
function tbSeason(){
  const p = S.p; if (!p || !p.start) return '';
  let tot = 0; try { tot = phases(p).slice(-1)[0].to; } catch (e) { elog(e); return ''; }
  const key = JSON.stringify([p.start, p.hours, p.avail, p.tb, p.ftp, rhyOf(p), gapOf(p), S.wk, tot, (S.plan || []).map(x => x.m)]);
  if (!tbSeaC || tbSeaC.k !== key) {
    const pl = {}, av = {}, add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
    for (let w = 1; w <= tot; w++) {
      let L; try { L = w === S.wk && S.plan ? S.plan : genWeek(p, w, true); } catch (e) { elog(e); L = []; }
      for (let i = 0; i < 7; i++) { const d = new Date(p.start + 'T12:00:00'); d.setDate(d.getDate() + (w - 1) * 7 + i); const ym = d.getFullYear() + '-' + d.getMonth();
        add(pl, ym, L[i] && L[i].m && L[i].t !== 'rest' ? L[i].m : 0);
        add(av, ym, (p.tb && p.tb.on && tbOk(p.tb) ? tbOf(p.tb, d.getMonth()).h : p.hours) * 60 / 7); }
    }
    tbSeaC = {k:key, rows:Object.keys(av).map(ym => { const [y, m] = ym.split('-').map(Number); return {y, m, pl:pl[ym] || 0, av:av[ym]}; })};
  }
  const M = TB_MON(), mx = Math.max(1, ...tbSeaC.rows.map(r => Math.max(r.pl, r.av)));
  const row = r => `<div class="py-1.5" style="border-top:1px solid var(--line)"><div class="flex items-baseline gap-2 text-sm"><span class="w-16 shrink-0 font-semibold">${M[r.m]} ${String(r.y).slice(2)}</span><span class="flex-1">geplant ${hStd(r.pl / 60)} Std.</span><span style="color:var(--mute)">verfügbar ${hStd(Math.round(r.av / 30) / 2)} Std.</span></div>
    <div class="mt-1 h-2 rounded-full" style="background:var(--tint);position:relative"><div class="h-2 rounded-full" style="position:absolute;left:0;top:0;width:${(100 * r.av / mx).toFixed(1)}%;background:var(--line)"></div><div class="h-2 rounded-full" style="position:absolute;left:0;top:0;width:${(100 * Math.min(r.pl, mx) / mx).toFixed(1)}%;background:${r.pl > r.av * 1.1 ? '#e0464e' : 'var(--teal)'}"></div></div></div>`;
  return `<section class="panel mb-3 p-4"><p class="font-semibold">Stunden je Monat</p><p class="mt-1 text-xs" style="color:var(--mute)">Geplante Trainingszeit neben der verfügbaren Zeit${p.tb && p.tb.on && tbOk(p.tb) ? ' aus dem Zeitbudget (Winter und Sommer)' : ''}. Rot: mehr geplant als verfügbar.</p><div class="mt-2">${tbSeaC.rows.map(row).join('')}</div><button class="mt-2 text-sm font-semibold" style="color:var(--teal);background:none;border:0;min-height:44px" onclick="goPg('settings');goPg('set-ali')"><span class="inline-flex items-center gap-1"><span>Zeitbudget ändern</span>${ic('chevR', 16)}</span></button></section>`;
}
function tbSub(){ const tb = S.p && S.p.tb; if (!tb || !tb.on || !tbOk(tb)) return ''; return `Zeitbudget: Winter ${hStd(tb.prof.w.h)} Std., Sommer ${hStd(tb.prof.s.h)} Std. pro Woche`; }
/* Verfügbare Stunden für Prognose und Plan-Check: mit Zeitbudget der Mittelwert der Budgets aller Planwochen
   (je Woche aus dem Monat der Wochenmitte), sonst der feste Wert. tbWkH: Budget einer einzelnen Woche. */
const _tbAv = new Map();
function hAv(p){
  if (!p || !p.tb || !p.tb.on || !tbOk(p.tb) || !p.start) return p ? p.hours : 0;
  let tot = 0; try { tot = phases(p).slice(-1)[0].to; } catch (e) { elog(e); return p.hours; }
  const k = JSON.stringify([p.start, tot, p.tb]); if (_tbAv.has(k)) return _tbAv.get(k);
  let s = 0; for (let w = 1; w <= tot; w++) s += tbOf(p.tb, tbMonOf(p, w)).h;
  const v = tot ? Math.round(s / tot * 100) / 100 : p.hours; if (_tbAv.size > 30) _tbAv.clear(); _tbAv.set(k, v); return v;
}
function tbWkH(p, w){ return p && p.tb && p.tb.on && tbOk(p.tb) && p.start ? tbOf(p.tb, tbMonOf(p, w)).h : p.hours; }
/* Plan-Check-Maßnahmen „mehr/weniger Stunden“ wirken mit Zeitbudget auf beide Profile und die Monatswerte */
function tbScale(t, ch){
  if (!t || !t.tb || !t.tb.on || !tbOk(t.tb) || !(ch && ch.hours > 0)) return ch;
  const f = ch.hours / Math.max(.5, hAv(t)), r = h => Math.max(1, Math.min(40, Math.round(h * f * 2) / 2)), tb = JSON.parse(JSON.stringify(t.tb));
  tb.prof.w.h = r(tb.prof.w.h); tb.prof.s.h = r(tb.prof.s.h); Object.keys(tb.dev || {}).forEach(m => { tb.dev[m].h = r(tb.dev[m].h); });
  return {...ch, tb};
}

