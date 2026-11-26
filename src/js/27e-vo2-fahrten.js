/* ---------- F38: VO2max-Trend aus gleichmäßigen Fahrten (Schritt 1: Abschnitte, Berechnung, Speicher, erste Anzeige) ----------
   Fachliche Grundlage: claude/vorschlag-vo2max-trend.md (Entscheidungen: nur gemessene HFmax, Kalibrierung nur mit Labor).
   Prinzip (Åstrand/Ryhming 1954; Swain/Leutholtz 1997, HFR = VO2R): je gleichmäßigem 5-min-Abschnitt
     VO2 (ml/kg/min)    = 10,8 × W/kg + 7                              (ACSM, Radergometer, submaximal)
     VO2max             = 3,5 + (VO2 − 3,5) × (HFmax − HFRuhe) / (HF − HFRuhe)
   Wert der Fahrt = Median der gültigen Abschnitte. Trend = Median der letzten 7 gültigen Fahrten in 42 Tagen (mindestens 3).
   Gespeichert werden je Fahrt die Rohpaare Watt:Puls (S.vo2r[Fahrt-ID] = {d, s:"W:HF,…", x, in, t, dec, sk, v}). HFmax,
   Ruhepuls und Gewicht wirken erst beim Rechnen: Ändern sie sich, rechnet die App ohne erneutes Laden der Dateien neu.
   Eigener Speicher statt S.vo2 (dort kürzt vo2Add auf 400 Einträge). Kein Einfluss auf vo2TrendAt, FTP, Zonen oder den Plan.
   Grenzen aus Tabelle 1.2 und Abschnitt 1.5 des Vorschlags. Nicht umgesetzt (offen): unruhiger Puls / Puls „klebt“ an der
   Trittfrequenz, Erkennung virtueller Leistung ohne Wattmesser, Ruhepuls-Eingabe in den Einstellungen.
   Die Funktionen dieses Blocks nutzen nur S, elog, wkL, mmKgAt, hrMaxOf, addD, iso, dstr, vo2List, vo2TypeAt, vo2PlanAt,
   MM_GAP und MM_SPIKE (tools/vo2r-messen.js lädt den Block mit Ersatzfunktionen). */
const VO2R = {minSec:2400, warm:600, seg:300, pre:180, maxSec:5400, kjkg:15, maxSeg:16, cov:.9, npap:1.05, zero:5, preTol:.10,
  hrLo:.65, hrHi:.90, wkgLo:1.5, wkgHi:4.5, drift:4, dec:8, heat:25, minSegs:4, iqr:.08, vLo:25, vHi:85, out:.15, win:42, nWin:7, nMin:3, rhrAss:60};
const vo2rAll = () => { S.vo2r = S.vo2r && typeof S.vo2r === 'object' && !Array.isArray(S.vo2r) ? S.vo2r : {}; return S.vo2r; };
const vo2rAny = () => !!(S.vo2r && typeof S.vo2r === 'object' && Object.keys(S.vo2r).length);
function vo2rMed(a){ const s = a.filter(x => isFinite(x)).sort((x, y) => x - y), n = s.length; if (!n) return null; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
function vo2rQ(s, q){ const i = (s.length - 1) * q, a = Math.floor(i), b = Math.ceil(i); return s[a] + (s[b] - s[a]) * (i - a); }
/* VO2max eines Abschnitts (ml/kg/min) */
function vo2rCalc(w, hr, kg, hm, rhr){ if (!(w > 0 && kg > 0 && hm > rhr && hr > rhr)) return null; const vo2 = 10.8 * w / kg + 7; return 3.5 + (vo2 - 3.5) * (hm - rhr) / (hr - rhr); }

/* Fahrt auswerten (unabhängig von HFmax und Ruhepuls): 1-s-Reihe ohne Pausen, Ausschlüsse der Fahrt, gleichmäßige 5-min-Abschnitte */
function vo2rEval(r, kg){
  const pts = ((r && r.pts) || []).filter(q => q && q.t != null && isFinite(q.t)).sort((a, b) => a.t - b.t); if (pts.length < 2) return null;
  const p = [], h = [], brk = [], tc = [];
  for (let k = 1; k < pts.length; k++) {
    const dt = Math.round(pts[k].t - pts[k - 1].t); if (dt <= 0) continue;
    if (dt > MM_GAP) { brk.push(p.length); continue; }
    let w = pts[k - 1].p != null ? pts[k - 1].p : pts[k].p; if (w != null && (!(w >= 0) || w > MM_SPIKE)) w = null;
    const h0 = pts[k - 1].h != null ? pts[k - 1].h : pts[k].h, hh = h0 != null && h0 > 30 && h0 < 230 ? h0 : null;
    for (let j = 0; j < dt; j++) { p.push(w); h.push(hh); }
    const t = pts[k].tc; if (t != null && t > -30 && t < 60) tc.push(t);
  }
  const n = p.length, o = {n}; if (n < 60) return null;
  if (tc.length > 60) o.t = Math.round(tc.reduce((a, b) => a + b, 0) / tc.length);
  const nP = p.filter(x => x != null).length, nH = h.filter(x => x != null).length;
  if (nP < .5 * n) { o.x = 'nopm'; return o; }
  if (nH < .5 * n) { o.x = 'nohr'; return o; }
  if (n < VO2R.minSec) { o.x = 'short'; return o; }
  if (nP < VO2R.cov * n || nH < VO2R.cov * n) { o.x = 'gap'; return o; }
  if (o.t >= VO2R.heat) { o.x = 'heat'; return o; }
  /* Prefix-Summen: Arbeit, vorhandene Werte, Puls */
  const v = p.map(x => x || 0), cW = [0], cP = [0], cH = [0], sH = [0];
  for (let i = 0; i < n; i++) { cW.push(cW[i] + v[i]); cP.push(cP[i] + (p[i] != null ? 1 : 0)); cH.push(cH[i] + (h[i] != null ? 1 : 0)); sH.push(sH[i] + (h[i] != null ? h[i] : 0)); }
  const hAv = (a, b) => cH[b] - cH[a] ? (sH[b] - sH[a]) / (cH[b] - cH[a]) : null;
  /* Entkopplung wie perfExt (dec): ab 60 min, Puls in über 80 % der Sekunden, VI ≤ 1,15; Hälften nach 10 min Einfahren */
  { let q = 0, q4 = 0, m = 0; for (let i = 0; i < n; i++) { q += v[i]; if (i >= 30) q -= v[i - 30]; if (i >= 29) { q4 += (q / 30) ** 4; m++; } }
    const np = m ? Math.pow(q4 / m, .25) : 0, ap = cW[n] / n;
    if (n >= 3600 && nH > .8 * n && ap > 0 && np / ap <= 1.15) {
      const seg = (a, b) => { let ps = 0, hs = 0, c = 0; for (let i = a; i < b; i++) if (h[i] != null && p[i] != null) { ps += p[i]; hs += h[i]; c++; } return c > 300 ? [ps / c, hs / c] : null; };
      const mid = 600 + Math.floor((n - 600) / 2), a = seg(600, mid), b = seg(mid, n);
      if (a && b && a[1] > 0 && b[1] > 0 && b[0] > 0) o.dec = Math.round(((a[0] / a[1]) / (b[0] / b[1]) - 1) * 1000) / 10;
    } }
  if (o.dec > VO2R.dec) { o.x = 'dec'; return o; }
  /* Abschnitte: nach 10 min, bis Minute 90 und bis 15 kJ/kg; 5 min ohne Pause, davor 3 min mit ±10 % Leistung */
  const lim = VO2R.kjkg * (kg || 75) * 1000, end = Math.min(n, VO2R.maxSec), segs = [];
  const brkIn = (a, b) => brk.some(i => i > a && i < b);
  const okAt = s0 => {
    const e = s0 + VO2R.seg, L = VO2R.seg; if (brkIn(s0 - VO2R.pre, e)) return null;
    if (cP[e] - cP[s0] < VO2R.cov * L || cH[e] - cH[s0] < VO2R.cov * L) return null;
    const ap = (cW[e] - cW[s0]) / L; if (ap < 40) return null;
    const pre = (cW[s0] - cW[s0 - VO2R.pre]) / VO2R.pre; if (Math.abs(pre / ap - 1) > VO2R.preTol) return null;
    let q = 0, q4 = 0, m = 0, run = 0, runMax = 0;
    for (let k = s0; k < e; k++) { q += v[k]; if (k >= s0 + 30) q -= v[k - 30]; if (k >= s0 + 29) { q4 += (q / 30) ** 4; m++; } run = v[k] < 20 ? run + 1 : 0; if (run > runMax) runMax = run; }
    if (runMax > VO2R.zero || Math.pow(q4 / m, .25) / ap > VO2R.npap) return null;
    const h1 = hAv(s0, s0 + 120), h2 = hAv(e - 120, e), ha = hAv(s0, e); if (h1 == null || h2 == null || ha == null || h2 - h1 > VO2R.drift) return null;
    return Math.round(ap) + ':' + Math.round(ha * 10) / 10;
  };
  for (let s0 = VO2R.warm; s0 + VO2R.seg <= end && segs.length < VO2R.maxSeg;) {
    if (cW[s0 + VO2R.seg] > lim) break;
    const s = okAt(s0); if (s) { segs.push(s); s0 += VO2R.seg; } else s0 += 30;
  }
  o.s = segs.join(','); return o;
}

/* Ruhepuls: Median der Morgenwerte der letzten 60 Tage (mindestens 5), sonst 60 als Annahme (breitere Spanne) */
function vo2rRhr(){
  const mo = S.mo || {}, a = iso(-60), b = iso(0), L = Object.keys(mo).filter(d => d >= a && d <= b).map(d => mo[d] && mo[d].hr).filter(x => x >= 30 && x <= 120);
  return L.length >= 5 ? {v:vo2rMed(L), ass:false, n:L.length} : {v:VO2R.rhrAss, ass:true, n:L.length};
}
const vo2rCtx = () => ({hm:hrMaxOf(), rhr:vo2rRhr()});
/* Krank-Tage der laufenden und der vorigen Woche (wie 06-sicherheit-belastung); Fahrt am Tag oder bis 7 Tage danach zählt nicht */
function vo2rSickDays(){
  const out = [];
  try { if (S.p && S.p.start && S.plan) S.plan.forEach((x, i) => { if (x && x.feel === 'sick') out.push(dstr(i)); });
    if (S.p && S.p.start && S.prevPlan && S.prevPlan.plan) S.prevPlan.plan.forEach((x, i) => { if (x && x.feel === 'sick') out.push(addD(S.p.start, (S.prevPlan.w - 1) * 7 + i)); }); } catch (e) { elog(e); }
  return out;
}
const vo2rSick = (day, L) => (L || vo2rSickDays()).some(s => day >= s && day <= addD(s, 7));
/* Ruhepuls am Morgen auffällig: wie morStat, mindestens 5 über dem Mittel der Tage 8 bis 37 davor (mindestens 7 Werte) */
function vo2rRhrHigh(day){
  const mo = S.mo || {}, t = mo[day]; if (!t || !(t.hr > 0)) return false;
  const a = addD(day, -37), b = addD(day, -8), L = Object.keys(mo).filter(d => d >= a && d <= b).map(d => mo[d].hr).filter(x => x > 0);
  return L.length >= 7 && t.hr >= L.reduce((q, x) => q + x, 0) / L.length + 5;
}
const vo2rRace = id => !!((S.allOut && S.allOut[id]) || (S.lb && S.lb[id] && (S.lb[id].t === 'test' || S.lb[id].t === 'race')));

/* Beim Einlesen bzw. Nachladen einer Fahrt: Rohdaten ablegen (a: {id, day|d, in}) */
function vo2rKeep(a, r){
  try {
    const id = a && a.id, day = a && (a.day || a.d); if (!id || !day || !r) return null;
    const ev = vo2rEval(r, mmKgAt(day)); if (!ev) return null;
    const rec = {d:day};
    if (ev.x) rec.x = ev.x; else if (ev.s) rec.s = ev.s;
    if (a.in) rec.in = 1; if (ev.t != null) rec.t = ev.t; if (ev.dec != null) rec.dec = ev.dec;
    if (!rec.x) { const ty = typeof vo2TypeAt === 'function' ? vo2TypeAt(day) : '', pl = typeof vo2PlanAt === 'function' ? vo2PlanAt(day) : null; if (ty === 'race' || ty === 'test' || pl) rec.x = 'race'; }
    if (vo2rSick(day)) rec.sk = 1;
    const res = vo2rRide(id, rec, vo2rCtx()); if (res.v != null) rec.v = Math.round(res.v * 10) / 10;
    vo2rAll()[id] = rec; return rec;
  } catch (e) { elog(e); return null; }
}
const vo2rHas = id => !!(S.vo2r && S.vo2r[id]);

/* Wert einer Fahrt mit aktueller HFmax, aktuellem Ruhepuls und Gewicht am Fahrtdatum */
function vo2rRide(id, rec, ctx, sick){
  const o = {id, d:rec.d, in:!!rec.in, v:null, x:rec.x || '', n:0};
  if (o.x) return o;
  if (!ctx.hm) { o.x = 'nohm'; return o; }
  if (vo2rRace(id)) { o.x = 'race'; return o; }
  if (rec.sk || vo2rSick(rec.d, sick)) { o.x = 'sick'; return o; }
  if (vo2rRhrHigh(rec.d)) { o.x = 'rhr'; return o; }
  const kg = mmKgAt(rec.d), hm = ctx.hm, rhr = ctx.rhr.v, vals = []; o.kg = kg;
  String(rec.s || '').split(',').forEach(q => { const [w, hr] = q.split(':').map(Number); if (!(w > 0 && hr > 0)) return; const wkg = w / kg;
    if (wkg < VO2R.wkgLo || wkg > VO2R.wkgHi || hr < VO2R.hrLo * hm || hr > VO2R.hrHi * hm || hr <= rhr + 10) return; const x = vo2rCalc(w, hr, kg, hm, rhr); if (x != null) vals.push(x); });
  o.n = vals.length; if (vals.length < VO2R.minSegs) { o.x = 'few'; return o; }
  const s = vals.slice().sort((a, b) => a - b), med = vo2rMed(s); o.v = med;
  if (vo2rQ(s, .75) - vo2rQ(s, .25) > VO2R.iqr * med) o.x = 'spread';
  else if (med < VO2R.vLo || med > VO2R.vHi) o.x = 'implaus';
  return o;
}
/* Alle Fahrten, nach Datum; Ausreißer (über 15 % neben dem Trend der Fahrten davor) bleiben gespeichert, zählen aber nicht */
function vo2rList(ctx){
  ctx = ctx || vo2rCtx(); const sick = vo2rSickDays(), L = Object.entries(vo2rAll()).map(([id, rec]) => vo2rRide(id, rec, ctx, sick)).sort((a, b) => a.d.localeCompare(b.d) || a.id.localeCompare(b.id)), good = [];
  L.forEach(o => { if (o.x || o.v == null) return; const t = vo2rTrendAt(good, o.d); if (t && Math.abs(o.v - t.v) / t.v > VO2R.out) { o.x = 'out'; return; } good.push(o); });
  return L;
}
/* Trend am Stichtag: Median der letzten 7 gültigen Fahrten in 42 Tagen, mindestens 3 */
function vo2rTrendAt(L, day){
  const a = addD(day, -VO2R.win), w = L.filter(o => !o.x && o.v != null && o.d <= day && o.d > a).slice(-VO2R.nWin);
  return w.length >= VO2R.nMin ? {v:vo2rMed(w.map(o => o.v)), n:w.length, from:w[0].d, to:w[w.length - 1].d} : null;
}
/* Kalibrierung nur mit Laborwert (Art T): Trend der Fahrten ±14 Tage um den Labortag (mindestens 3), Versatz Labor − Trend */
function vo2rCal(L){
  if (S.vo2CalOff) return null; L = L || vo2rList();
  const labs = vo2List().filter(e => e.method === 'L' && e.valid).sort((a, b) => b.date.localeCompare(a.date));
  for (const lab of labs) { const a = addD(lab.date, -VO2_CALD), b = addD(lab.date, VO2_CALD), w = L.filter(o => !o.x && o.v != null && o.d >= a && o.d <= b);
    if (w.length >= VO2R.nMin) { const med = vo2rMed(w.map(o => o.v)), near = w.slice().sort((x, y) => Math.abs(dOnly(x.d) - dOnly(lab.date)) - Math.abs(dOnly(y.d) - dOnly(lab.date)))[0];
      return {off:Math.round((lab.value - med) * 10) / 10, lab, pair:{date:near.d}, n:w.length}; } }
  return null;
}
const vo2rCalAt = (c, day) => { if (!c) return null; const age = (dOnly(day) - dOnly(c.lab.date)) / 864e5; return age >= -VO2_CALD && age <= VO2_CALMAX ? c : null; };
/* Spanne (Annahme der App, Vorschlag Abschnitt 2): ohne Kalibrierung ± max(5; 10 %), über 60 oben +5 %; mit Labor ± max(3; 6 %); Ruhepuls angenommen × 1,25 */
function vo2rRange(v, cal, ass){
  let w = cal ? Math.max(3, .06 * v) : Math.max(5, .10 * v); if (ass) w *= 1.25;
  return {lo:v - w, hi:v + w + (!cal && v > 60 ? .05 * v : 0)};
}
/* Zusammenfassung für die Anzeige: Trend heute (kalibriert, wenn möglich) */
function vo2rSum(){
  const ctx = vo2rCtx(), L = vo2rList(ctx), cal = vo2rCal(L), t = vo2rTrendAt(L, iso(0));
  if (!t) return {ctx, L, cal, tr:null};
  const c = vo2rCalAt(cal, iso(0)), v = t.v + (c ? c.off : 0);
  return {ctx, L, cal, tr:{...t, raw:t.v, v, cal:c, ...vo2rRange(v, c, ctx.rhr.ass)}};
}
/* Punkte und Trendlinie für den Verlauf (vo2Chart); unit 'abs' = l/min mit dem Gewicht am Tag */
function vo2rChart(from, unit){
  if (!vo2rAny() || !hrMaxOf()) return null;
  const ctx = vo2rCtx(), L = vo2rList(ctx), cal = vo2rCal(L), U = (v, kg) => unit === 'abs' ? v * kg / 1000 : v, today = iso(0);
  const dots = L.filter(o => o.v != null && (!o.x || o.x === 'out') && o.d >= from).map(o => ({d:o.d, v:U(o.v, o.kg), out:o.x === 'out'}));
  const days = [...new Set(L.filter(o => !o.x && o.v != null).map(o => o.d).concat([today]))].filter(d => d >= from && d <= today).sort(), line = [];
  days.forEach(d => { const t = vo2rTrendAt(L, d); if (!t) { line.push(null); return; } const c = vo2rCalAt(cal, d), v = t.v + (c ? c.off : 0), r = vo2rRange(v, c, ctx.rhr.ass), kg = mmKgAt(d); line.push({d, v:U(v, kg), lo:U(r.lo, kg), hi:U(r.hi, kg)}); });
  return {dots, line};
}
/* Grund einer fehlenden Schätzung in einem Satz */
function vo2rWhy(x){
  const M = {nopm:['kein Wattmesser', 'no power meter'], nohr:['keine Pulsdaten', 'no heart-rate data'], short:['zu kurz (unter 40 Minuten)', 'too short (under 40 minutes)'],
    gap:['Puls oder Leistung fehlen zu oft', 'heart rate or power missing too often'], heat:['zu heiß (25 °C oder mehr)', 'too hot (25 °C or more)'],
    dec:['Puls stieg im Verlauf zu stark (Entkopplung über 8 %)', 'heart rate drifted too much (decoupling above 8%)'], race:['Rennen, Test oder Vollgas', 'race, test or all-out'],
    sick:['krank oder in den 7 Tagen danach', 'sick or within the 7 days after'], rhr:['Ruhepuls am Morgen erhöht', 'resting heart rate raised that morning'],
    few:['zu kurz gleichmäßig (weniger als 4 passende 5-min-Abschnitte)', 'not steady for long enough (fewer than 4 suitable 5-min sections)'],
    spread:['Abschnitte streuen zu stark', 'sections vary too much'], implaus:['Ergebnis unplausibel', 'implausible result'],
    out:['Ausreißer, mehr als 15 % neben dem Trend', 'outlier, more than 15% away from the trend'], nohm:['keine gemessene HFmax eingetragen', 'no measured max HR set']};
  const m = M[x]; return m ? wkL(m[0], m[1]) : '';
}
/* Anzeige auf der Seite VO2max: eigene Zeile „Trend aus Fahrten“ (einfache Form, Schritt 1) */
function vo2rUi(){
  try {
    if (!vo2rAny()) return '';
    const box = b => `<section class="panel mt-3 p-4" id="fx-v2r"><p class="hd text-lg font-semibold">${wkL('Trend aus Fahrten', 'Trend from rides')}</p>${b}</section>`;
    if (!hrMaxOf()) return box(`<p class="mt-1 text-sm">${wkL('Für den Trend braucht die App deine gemessene HFmax (höchster Puls). Eine Schätzung nach Alter ist zu ungenau.', 'For the trend the app needs your measured max HR (highest heart rate). An estimate from age is too inaccurate.')}</p><p class="mt-1 text-sm" style="color:var(--mute)">${wkL('So bestimmst du sie: den höchsten Puls aus einem Rampentest, einem Rennen oder einem harten Anstieg am Ende eines Intervalls ablesen und unter Einstellungen → Training eintragen.', 'How to find it: take the highest heart rate from a ramp test, a race or a hard climb at the end of an interval and enter it under Settings → Training.')}</p>`);
    const s = vo2rSum(), last = s.L[s.L.length - 1], R = v => Math.round(v);
    const lastTx = last ? (last.x ? wkL(`Letzte Fahrt am ${mmDay(last.d)}: keine Schätzung, ${vo2rWhy(last.x)}.`, `Last ride on ${mmDay(last.d)}: no estimate, ${vo2rWhy(last.x)}.`) : wkL(`Letzte Fahrt am ${mmDay(last.d)}: etwa ${R(last.v)}.`, `Last ride on ${mmDay(last.d)}: about ${R(last.v)}.`)) : '';
    const rhr = s.ctx.rhr.ass ? wkL('Ruhepuls angenommen (60), deshalb ist die Spanne breiter. Mit mindestens 5 Morgenwerten rechnet die App mit deinem Ruhepuls.', 'Resting heart rate assumed (60), so the range is wider. With at least 5 morning values the app uses your resting heart rate.') : wkL(`Ruhepuls ${R(s.ctx.rhr.v)} (Median deiner Morgenwerte).`, `Resting heart rate ${R(s.ctx.rhr.v)} (median of your morning values).`);
    const main = s.tr ? `<p class="mt-1"><span class="hd font-semibold" style="font-size:1.6rem">≈ ${R(s.tr.v)}</span> <span class="text-sm">ml/kg/min · ${wkL('wahrscheinlich', 'likely')} ${R(s.tr.lo)}–${R(s.tr.hi)}</span></p><p class="text-sm" style="color:var(--mute)">${wkL(`Trend aus ${s.tr.n} gleichmäßigen Fahrten der letzten 6 Wochen · Schätzung`, `Trend from ${s.tr.n} steady rides over the last 6 weeks · estimate`)}${s.tr.cal ? ' · ' + wkL(`kalibriert mit Laborwert vom ${mmDay(s.tr.cal.lab.date)}`, `calibrated with lab value of ${mmDay(s.tr.cal.lab.date)}`) : ''}</p>`
      : `<p class="mt-1 text-sm">${wkL('Noch kein Trend. Dafür braucht die App mindestens 3 gleichmäßige Fahrten mit Wattmesser und Puls in 6 Wochen.', 'No trend yet. The app needs at least 3 steady rides with power meter and heart rate within 6 weeks.')}</p>`;
    return box(`${main}${lastTx ? `<p class="mt-1 text-sm">${esc(lastTx)}</p>` : ''}<p class="mt-1 text-xs" style="color:var(--mute)">${esc(rhr)} ${wkL('Die App vergleicht in gleichmäßigen Abschnitten deiner Fahrten Watt und Puls und rechnet hoch, wie viel Sauerstoff du bei deinem höchsten Puls aufnehmen würdest. Eine einzelne Fahrt sagt wenig, aussagekräftig ist der Verlauf über Wochen.', 'The app compares power and heart rate in steady sections of your rides and extrapolates how much oxygen you would take up at your highest heart rate. A single ride says little; what matters is the course over weeks.')}</p>`);
  } catch (e) { elog(e); return ''; }
}
