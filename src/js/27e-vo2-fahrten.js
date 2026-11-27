/* ---------- F38: VO2max-Trend aus gleichmäßigen Fahrten (Schritt 1: Abschnitte, Berechnung, Speicher, erste Anzeige) ----------
   Fachliche Grundlage: claude/vorschlag-vo2max-trend.md (Entscheidungen: nur gemessene HFmax, Kalibrierung nur mit Labor).
   Prinzip (Åstrand/Ryhming 1954; Swain/Leutholtz 1997, HFR = VO2R): je gleichmäßigem 5-min-Abschnitt
     VO2 (ml/kg/min)    = 10,8 × W/kg + 7                              (ACSM, Radergometer, submaximal)
     VO2max             = 3,5 + (VO2 − 3,5) × (HFmax − HFRuhe) / (HF − HFRuhe)
   Wert der Fahrt = Median der gültigen Abschnitte. Trend = Median der letzten 7 gültigen Fahrten in 42 Tagen (mindestens 3).
   Gespeichert werden je Fahrt die Rohpaare Watt:Puls (S.vo2r[Fahrt-ID] = {d, s:"W:HF,…", x, in, t, dec, sk, v}). HFmax,
   Ruhepuls und Gewicht wirken erst beim Rechnen: Ändern sie sich, rechnet die App ohne erneutes Laden der Dateien neu.
   Eigener Speicher statt S.vo2 (dort kürzt vo2Add auf 400 Einträge). Kein Einfluss auf vo2TrendAt, FTP, Zonen oder den Plan.
   Grenzen aus Tabelle 1.2 und Abschnitt 1.5 des Vorschlags. Vorsichtige Standards der App (Schritt 2, ohne Messung an echten
   Dateien; im Zweifel fällt ein Abschnitt oder die Fahrt weg, statt falsch zu zählen):
   - Puls unruhig: Abschnitt fällt weg bei Streuung um den gleitenden 30-s-Mittelwert über 4 Schlägen (SD) oder mehr als
     2 Sprüngen von 15 Schlägen und mehr in einer Sekunde. Puls „klebt“ an der Trittfrequenz: mehr als die Hälfte der Sekunden
     mit |Puls − Trittfrequenz| ≤ 3. Betrifft das mindestens 2 und mindestens ein Drittel der Abschnitte mit gleichmäßiger
     Leistung oder klebt der Puls in mindestens 30 % der getretenen Sekunden der ganzen Fahrt (mindestens 10 min), zählt die
     Fahrt nicht ('hrq', nur „Pulsdaten unruhig“, keine Vermutung zur Ursache).
   - Virtuelle Leistung (Zwift „zPower“ ohne Wattmesser) ist in den Dateien nicht sicher erkennbar (Untertyp 58 und Hersteller
     Zwift gibt es auch mit Smarttrainer). Rollenfahrten zählen deshalb mit; ein Schalter nimmt sie heraus (S.vo2rOpt.noIn).
   - Ruhepuls: Median der Morgenwerte (60 Tage, mindestens 5), sonst 60 mit breiterer Spanne und Hinweis.
   - Krank: „krank“ und „leicht erkältet“ (feel 'sick'/'neck') am Tag und 7 Tage danach; der Vermerk bleibt an der Fahrt (sk),
     auch wenn die Woche nicht mehr im Plan steht. Ältere Fahrten aus der Historie prüft nur der Ruhepuls am Morgen.
   - Drift: Entkopplung über die ganze Fahrt wie perfExt (auch wenn sie erst nach Minute 90 entsteht, schließt sie die Fahrt aus).
   - Medikamente, die den Puls senken: Schalter S.vo2rOpt.med schaltet den Trend ab.
   Die Funktionen dieses Blocks nutzen nur S, elog, wkL, mmKgAt, hrMaxOf, addD, iso, dstr, vo2List, vo2TypeAt, vo2PlanAt,
   MM_GAP und MM_SPIKE (tools/vo2r-messen.js lädt den Block mit Ersatzfunktionen). */
const VO2R = {minSec:2400, warm:600, seg:300, pre:180, maxSec:5400, kjkg:15, maxSeg:16, cov:.9, npap:1.05, zero:5, preTol:.10,
  hrLo:.65, hrHi:.90, wkgLo:1.5, wkgHi:4.5, drift:4, dec:8, heat:25, minSegs:4, iqr:.08, vLo:25, vHi:85, out:.15, win:42, nWin:7, nMin:3, rhrAss:60,
  hrSd:4, jump:15, jumps:2, cadTol:3, cadRide:.3};
const vo2rAll = () => { S.vo2r = S.vo2r && typeof S.vo2r === 'object' && !Array.isArray(S.vo2r) ? S.vo2r : {}; return S.vo2r; };
const vo2rAny = () => !!(S.vo2r && typeof S.vo2r === 'object' && Object.keys(S.vo2r).length);
function vo2rMed(a){ const s = a.filter(x => isFinite(x)).sort((x, y) => x - y), n = s.length; if (!n) return null; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
function vo2rQ(s, q){ const i = (s.length - 1) * q, a = Math.floor(i), b = Math.ceil(i); return s[a] + (s[b] - s[a]) * (i - a); }
/* VO2max eines Abschnitts (ml/kg/min) */
function vo2rCalc(w, hr, kg, hm, rhr){ if (!(w > 0 && kg > 0 && hm > rhr && hr > rhr)) return null; const vo2 = 10.8 * w / kg + 7; return 3.5 + (vo2 - 3.5) * (hm - rhr) / (hr - rhr); }

/* Fahrt auswerten (unabhängig von HFmax und Ruhepuls): 1-s-Reihe ohne Pausen, Ausschlüsse der Fahrt, gleichmäßige 5-min-Abschnitte */
function vo2rEval(r, kg){
  const pts = ((r && r.pts) || []).filter(q => q && q.t != null && isFinite(q.t)).sort((a, b) => a.t - b.t); if (pts.length < 2) return null;
  const p = [], h = [], c = [], brk = [], tc = [];
  for (let k = 1; k < pts.length; k++) {
    const dt = Math.round(pts[k].t - pts[k - 1].t); if (dt <= 0) continue;
    if (dt > MM_GAP) { brk.push(p.length); continue; }
    let w = pts[k - 1].p != null ? pts[k - 1].p : pts[k].p; if (w != null && (!(w >= 0) || w > MM_SPIKE)) w = null;
    const h0 = pts[k - 1].h != null ? pts[k - 1].h : pts[k].h, hh = h0 != null && h0 > 30 && h0 < 230 ? h0 : null;
    const c0 = pts[k - 1].c != null ? pts[k - 1].c : pts[k].c, cc = c0 != null && c0 >= 0 && c0 < 250 ? c0 : null;
    for (let j = 0; j < dt; j++) { p.push(w); h.push(hh); c.push(cc); }
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
  /* Puls klebt an der Trittfrequenz (typisch für Messung am Handgelenk): über die ganze Fahrt */
  { let nc = 0, lk = 0; for (let i = 0; i < n; i++) if (c[i] >= 50 && h[i] != null) { nc++; if (Math.abs(h[i] - c[i]) <= VO2R.cadTol) lk++; }
    if (nc >= 600 && lk >= VO2R.cadRide * nc) { o.x = 'hrq'; return o; } }
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
    if (vo2rHrBad(h, c, s0, e)) return 'bad';
    const h1 = hAv(s0, s0 + 120), h2 = hAv(e - 120, e), ha = hAv(s0, e); if (h1 == null || h2 == null || ha == null || h2 - h1 > VO2R.drift) return null;
    return Math.round(ap) + ':' + Math.round(ha * 10) / 10;
  };
  let bad = 0;
  for (let s0 = VO2R.warm; s0 + VO2R.seg <= end && segs.length < VO2R.maxSeg;) {
    if (cW[s0 + VO2R.seg] > lim) break;
    const s = okAt(s0); if (s === 'bad') { bad++; s0 += VO2R.seg; } else if (s) { segs.push(s); s0 += VO2R.seg; } else s0 += 30;
  }
  if (bad) o.hb = bad;
  if (bad >= 2 && bad * 3 >= bad + segs.length) { o.x = 'hrq'; return o; }
  o.s = segs.join(','); return o;
}

/* Pulsqualität eines Abschnitts [a, b): Streuung um den gleitenden 30-s-Mittelwert, Sprünge, Kleben an der Trittfrequenz */
function vo2rHrBad(h, c, a, b){
  let ss = 0, m = 0, jmp = 0, lk = 0;
  for (let k = a; k < b; k++) { if (h[k] == null) continue;
    let s = 0, q = 0; for (let j = Math.max(a, k - 15); j < Math.min(b, k + 15); j++) if (h[j] != null) { s += h[j]; q++; }
    const r = h[k] - s / q; ss += r * r; m++;
    if (k > a && h[k - 1] != null && Math.abs(h[k] - h[k - 1]) >= VO2R.jump) jmp++;
    if (c[k] >= 50 && Math.abs(h[k] - c[k]) <= VO2R.cadTol) lk++; }
  return !m || Math.sqrt(ss / m) > VO2R.hrSd || jmp > VO2R.jumps || lk > .5 * m;
}
/* Ruhepuls: Median der Morgenwerte der letzten 60 Tage (mindestens 5), sonst 60 als Annahme (breitere Spanne) */
function vo2rRhr(){
  const mo = S.mo || {}, a = iso(-60), b = iso(0), L = Object.keys(mo).filter(d => d >= a && d <= b).map(d => mo[d] && mo[d].hr).filter(x => x >= 30 && x <= 120);
  return L.length >= 5 ? {v:vo2rMed(L), ass:false, n:L.length} : {v:VO2R.rhrAss, ass:true, n:L.length};
}
const vo2rOpt = () => (S.vo2rOpt && typeof S.vo2rOpt === 'object' ? S.vo2rOpt : {});
const vo2rCtx = () => ({hm:hrMaxOf(), rhr:vo2rRhr(), med:!!vo2rOpt().med, noIn:!!vo2rOpt().noIn});
function vo2rOptTog(k){ if (k !== 'med' && k !== 'noIn') return; S.vo2rOpt = {...vo2rOpt(), [k]:!vo2rOpt()[k]}; if (!S.vo2rOpt[k]) delete S.vo2rOpt[k]; save(); render(); }
/* Krank-Tage („krank“, „leicht erkältet“) der laufenden und der vorigen Woche; Fahrt am Tag oder bis 7 Tage danach zählt nicht */
const vo2rIll = f => f === 'sick' || f === 'neck';
function vo2rSickDays(){
  const out = [];
  try { if (S.p && S.p.start && S.plan) S.plan.forEach((x, i) => { if (x && vo2rIll(x.feel)) out.push(dstr(i)); });
    if (S.p && S.p.start && S.prevPlan && S.prevPlan.plan) S.prevPlan.plan.forEach((x, i) => { if (x && vo2rIll(x.feel)) out.push(addD(S.p.start, (S.prevPlan.w - 1) * 7 + i)); }); } catch (e) { elog(e); }
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
  if (ctx.med) { o.x = 'med'; return o; }
  if (!ctx.hm) { o.x = 'nohm'; return o; }
  if (rec.in && ctx.noIn) { o.x = 'inoff'; return o; }
  if (vo2rRace(id)) { o.x = 'race'; return o; }
  if (rec.sk || vo2rSick(rec.d, sick)) { if (!rec.sk) rec.sk = 1; o.x = 'sick'; return o; } /* Vermerk bleibt, auch wenn die Woche aus dem Plan fällt */
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
  if (!vo2rAny() || !hrMaxOf() || vo2rOpt().med) return null;
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
    sick:['krank oder erkältet, oder in den 7 Tagen danach', 'sick or with a cold, or within the 7 days after'], rhr:['Ruhepuls am Morgen erhöht', 'resting heart rate raised that morning'],
    few:['zu kurz gleichmäßig (weniger als 4 passende 5-min-Abschnitte)', 'not steady for long enough (fewer than 4 suitable 5-min sections)'],
    spread:['Abschnitte streuen zu stark', 'sections vary too much'], implaus:['Ergebnis unplausibel', 'implausible result'],
    out:['Ausreißer, mehr als 15 % neben dem Trend', 'outlier, more than 15% away from the trend'], nohm:['keine gemessene HFmax eingetragen', 'no measured max HR set'],
    hrq:['Pulsdaten unruhig', 'heart-rate data unsteady'], nodata:['keine verwertbare Aufzeichnung', 'no usable recording'], inoff:['Rollenfahrt, nach deiner Einstellung nicht mitgezählt', 'indoor ride, left out by your setting'],
    med:['Puls durch Medikamente beeinflusst (deine Einstellung)', 'heart rate affected by medication (your setting)']};
  const m = M[x]; return m ? wkL(m[0], m[1]) : '';
}
/* Veränderung in 4 Wochen: erst ab 3 ml/kg/min und 5 % melden (Vorschlag 1.6; beide Schwellen, damit nichts unterhalb der
   Genauigkeit als Veränderung erscheint), sonst „unverändert im Rahmen der Genauigkeit“ */
function vo2rChg(L){
  const n = vo2rTrendAt(L, iso(0)), o = vo2rTrendAt(L, iso(-28)); if (!n || !o) return null;
  const d = n.v - o.v; return {d, sig:Math.abs(d) >= Math.max(3, .05 * o.v)};
}
/* Rolle und Straße weichen um mehr als 5 % voneinander ab (je mindestens 3 Fahrten in 6 Wochen): Hinweis, kein Abgleich */
function vo2rInOut(L){
  const a = addD(iso(0), -VO2R.win), g = L.filter(o => !o.x && o.v != null && o.d > a), i = g.filter(o => o.in).map(o => o.v), r = g.filter(o => !o.in).map(o => o.v);
  if (i.length < VO2R.nMin || r.length < VO2R.nMin) return null; const mi = vo2rMed(i), mr = vo2rMed(r); return Math.abs(mi - mr) / mr > .05 ? {mi, mr} : null;
}
/* Hauptzahl oben auf der Seite, wenn es in 12 Wochen keinen Labor-, Test- oder Garmin-Wert gibt (vo2Page) */
function vo2rTop(pk){
  try {
    if (!vo2rAny() || !hrMaxOf() || vo2rOpt().med) return ''; const s = vo2rSum(); if (!s.tr) return ''; const R = Math.round;
    const why = pk ? wkL(`Dein letzter Einzelwert ist älter als 12 Wochen (${vo2ML(vo2Kind(pk.e))}, ${mmDay(pk.e.date)}), deshalb steht hier der Trend aus deinen Fahrten.`, `Your last single value is older than 12 weeks (${vo2ML(vo2Kind(pk.e))}, ${mmDay(pk.e.date)}), so the trend from your rides is shown here.`)
      : wkL('Noch kein Test-, Labor- oder Garmin-Wert, deshalb steht hier der Trend aus deinen Fahrten.', 'No test, lab or Garmin value yet, so the trend from your rides is shown here.');
    return `<p class="eyebrow">${wkL('Deine VO2max', 'Your VO2max')} · ${wkL('Trend aus Fahrten', 'Trend from rides')}</p><p class="mt-1"><span class="hd font-semibold" style="font-size:2.3rem;line-height:1.1">≈ ${R(s.tr.v)}</span> <span class="text-sm">ml/kg/min</span></p>
      <p class="mt-1 text-sm">${wkL('Schätzung', 'Estimate')} · ${wkL('wahrscheinlich', 'likely')} ${R(s.tr.lo)}–${R(s.tr.hi)}</p><p class="mt-1 text-xs" style="color:var(--mute)">${why}</p>`;
  } catch (e) { elog(e); return ''; }
}

/* ---------- F38 Schritt 2: ältere Fahrten nachrechnen (Garmin, letzte 6 Monate, höchstens 150 je Lauf, abbrechbar) ----------
   Nur Fahrten, deren Rohdaten die App laden kann (Garmin-ID) und deren Zusammenfassung Leistung, Puls und mindestens 40 min zeigt.
   Neueste zuerst. Drosselung wie beim Import (IMP_WAIT), andere Fehler brechen den Lauf mit Meldung ab. Fahrten ohne verwertbare
   Aufzeichnung werden vermerkt (x 'nodata') und nicht erneut geladen; nicht ladbare Fahrten kommen beim nächsten Lauf wieder. */
const VO2RF = {days:183, max:150, pause:2000, waitF:1};
let vo2rFill = null;
function vo2rTodo(){
  try {
    if (typeof gmMode !== 'function' || !gmMode() || typeof rideAll !== 'function') return [];
    const from = iso(-VO2RF.days), have = S.vo2r && typeof S.vo2r === 'object' ? S.vo2r : {};
    return rideAll().filter(a => a && a.gid && a.id && a.day && a.day >= from && !have[a.id] && +a.np > 0 && (+a.hr > 0 || +a.hrA > 0) && +a.sec >= VO2R.minSec).sort((a, b) => b.day.localeCompare(a.day));
  } catch (e) { elog(e); return []; }
}
const vo2rGmBusy = () => (typeof mmFill !== 'undefined' && mmFill && mmFill.run) || (typeof impMm !== 'undefined' && !!impMm) || (typeof impBusy !== 'undefined' && impBusy);
async function vo2rFillGo(){
  if ((vo2rFill && vo2rFill.run) || typeof gmRide !== 'function' || !gmMode() || vo2rGmBusy()) return;
  const all = vo2rTodo(), L = all.slice(0, VO2RF.max); if (!L.length) return;
  const F = vo2rFill = {run:1, i:0, n:L.length, more:all.length - L.length, ok:0, v:0, fail:0, wait:0, err:'', stop:0}; render(); let tries = 0;
  try {
    for (let k = 0; k < L.length; k++) {
      if (F.stop || !gmMode()) break; const a = L[k];
      try {
        const {r} = await gmRide({id:a.gid, n:a.n || ''}); tries = 0;
        if (!vo2rHas(a.id)) { const rec = vo2rKeep({id:a.id, day:a.day, in:a.in}, r); if (!rec) vo2rAll()[a.id] = {d:a.day, x:'nodata', ...(a.in ? {in:1} : {})}; else if (!rec.x && rec.s) F.v++; }
        F.ok++;
      } catch (e) {
        if (e && e.code === 'rate' && tries < IMP_WAIT.length) { F.wait = Math.round(IMP_WAIT[tries++] * VO2RF.waitF); render(); await impSleep(F.wait); F.wait = 0; k--; continue; }
        elog(e); F.fail++; tries = 0;
        if (typeof GmErr === 'function' && e instanceof GmErr && e.code !== 'tool') { F.err = e.message || wkL('Garmin ist gerade nicht erreichbar.', 'Garmin is not reachable right now.'); break; }
      }
      F.i = k + 1; if (F.i % 5 === 0) { try { save(); } catch (e) { elog(e); } } render();
      if (k < L.length - 1 && !F.stop) await impSleep(VO2RF.pause);
    }
  } finally { F.run = 0; F.wait = 0; try { save(); } catch (e) { elog(e); } try { render(); } catch (e) { elog(e); } }
}
function vo2rFillStop(){ if (vo2rFill && vo2rFill.run) vo2rFill.stop = 1; render(); }
function vo2rFillUi(){
  const F = vo2rFill, btn = (fn, l, main) => `<button class="${main ? 'btn' : 'ghost'} mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}">${l}</button>`;
  if (F && F.run) return `<div class="mt-3 pt-3" style="border-top:1px solid var(--line)" id="fx-v2rfill" role="status"><p class="text-sm font-semibold" aria-live="polite">${wkL(`Ältere Fahrten werden ausgewertet: ${F.i} von ${F.n}`, `Analysing older rides: ${F.i} of ${F.n}`)}${F.v ? wkL(`, ${F.v} mit gleichmäßigen Abschnitten`, `, ${F.v} with steady sections`) : ''} …</p>
    <div class="mm-bar mt-2" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(F.i / Math.max(1, F.n) * 100)}"><i style="width:${Math.round(F.i / Math.max(1, F.n) * 100)}%"></i></div>
    ${F.wait ? `<p class="mt-1 text-xs" style="color:var(--mute)">${wkL(`Garmin bremst gerade. Die App wartet ${Math.round(F.wait / 1000)} Sek. und macht dann weiter.`, `Garmin is throttling. The app waits ${Math.round(F.wait / 1000)} s and then continues.`)}</p>` : ''}
    ${F.stop ? `<p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Wird nach dieser Fahrt angehalten …', 'Stopping after this ride …')}</p>` : btn('vo2rFillStop()', wkL('Abbrechen', 'Cancel'))}</div>`;
  const L = vo2rTodo(), busy = vo2rGmBusy();
  const done = F ? `<p class="mt-1 text-sm">${wkL(`Zuletzt: ${F.ok} ${F.ok === 1 ? 'Fahrt' : 'Fahrten'} ausgewertet, ${F.v} davon mit gleichmäßigen Abschnitten${F.fail ? `, ${F.fail} nicht ladbar` : ''}${F.stop ? ', abgebrochen' : ''}.`, `Last run: ${F.ok} ${F.ok === 1 ? 'ride' : 'rides'} analysed, ${F.v} of them with steady sections${F.fail ? `, ${F.fail} could not be loaded` : ''}${F.stop ? ', cancelled' : ''}.`)}${F.err ? ' ' + esc(F.err) : ''}</p>` : '';
  if (!L.length) return done ? `<div class="mt-3 pt-3" style="border-top:1px solid var(--line)" id="fx-v2rfill">${done}</div>` : '';
  const n = Math.min(L.length, VO2RF.max);
  return `<div class="mt-3 pt-3" style="border-top:1px solid var(--line)" id="fx-v2rfill"><p class="text-sm font-semibold">${wkL('Ältere Fahrten auswerten', 'Analyse older rides')}</p>
    <p class="mt-1 text-sm" style="color:var(--mute)">${wkL(`${L.length} ${L.length === 1 ? 'Fahrt' : 'Fahrten'} der letzten 6 Monate mit Wattmesser, Puls und mindestens 40 Minuten ${L.length === 1 ? 'ist' : 'sind'} noch nicht ausgewertet. Die App lädt ${L.length > n ? `die neuesten ${n}` : L.length === 1 ? 'sie' : 'sie einzeln'} von Garmin, etwa 2 Sek. je Fahrt. Du kannst jederzeit abbrechen und später weitermachen.`, `${L.length} ${L.length === 1 ? 'ride' : 'rides'} of the last 6 months with power meter, heart rate and at least 40 minutes ${L.length === 1 ? 'has' : 'have'} not been analysed yet. The app loads ${L.length > n ? `the newest ${n}` : L.length === 1 ? 'it' : 'them one by one'} from Garmin, about 2 s per ride. You can cancel at any time and continue later.`)}</p>${done}
    ${busy ? `<p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Gerade lädt die App schon andere Fahrten von Garmin. Danach geht es hier weiter.', 'The app is already loading other rides from Garmin. You can continue here afterwards.')}</p>` : btn('vo2rFillGo()', wkL('Ältere Fahrten auswerten', 'Analyse older rides'), true)}</div>`;
}

/* Anzeige auf der Seite VO2max: Bereich „Trend aus Fahrten“ (Trend, Veränderung, letzte Fahrt, Nachrechnen, Einstellungen, Erklärung) */
function vo2rUi(){
  try {
    const fill = vo2rFillUi(); if (!vo2rAny() && !fill) return '';
    const O = vo2rOpt(), muted = t => `<p class="mt-1 text-xs" style="color:var(--mute)">${t}</p>`, chk = (k, on, l) => `<label class="mt-1 flex items-center gap-2 text-sm" style="min-height:44px"><input type="checkbox" ${on ? 'checked' : ''} onchange="vo2rOptTog('${k}')" style="width:22px;height:22px;flex:none">${l}</label>`;
    const opts = `<details class="mt-3" id="fx-v2ropt"${O.med || O.noIn ? ' open' : ''}><summary class="cursor-pointer text-sm" style="color:var(--teal);min-height:44px;display:flex;align-items:center">${wkL('Einstellungen für den Trend', 'Settings for the trend')}</summary>
      ${chk('noIn', !O.noIn, wkL('Rollenfahrten mitzählen', 'Count indoor rides'))}${muted(wkL('Smarttrainer und Wattmesser auf der Rolle zählen als Wattmesser. Leistung, die nur aus der Rollengeschwindigkeit geschätzt ist (z. B. Zwift „zPower“), erkennt die App nicht sicher. Fährst du so, nimm die Rollenfahrten heraus.', 'Smart trainers and power meters on the trainer count as power meters. Power estimated only from trainer speed (e.g. Zwift “zPower”) cannot be detected reliably. If you ride like that, leave indoor rides out.'))}
      ${chk('med', !!O.med, wkL('Mein Puls wird durch Medikamente beeinflusst', 'My heart rate is affected by medication'))}${muted(wkL('Dann schaltet die App den Trend aus Fahrten ab: Pulsbasierte Schätzungen sind dann nicht verwertbar. Bei Fragen zu Medikamenten und Training: Ärztin oder Arzt.', 'The app then switches the trend from rides off: heart-rate based estimates are not usable then. For questions about medication and training: ask your doctor.'))}</details>`;
    const info = `<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer text-sm" style="color:var(--teal);min-height:44px;display:flex;align-items:center">${wkL('Wie wird das berechnet?', 'How is this calculated?')}</summary>
      <p class="mt-1">${wkL('Die App vergleicht in gleichmäßigen Abschnitten deiner Fahrten Watt und Puls und rechnet hoch, wie viel Sauerstoff du bei deinem höchsten Puls (HFmax) aufnehmen würdest. So macht es auch Garmin.', 'The app compares power and heart rate in steady sections of your rides and extrapolates how much oxygen you would take up at your highest heart rate (max HR). Garmin works the same way.')}</p>
      <p class="mt-1">${wkL('Eine einzelne Fahrt sagt wenig. Hitze, Müdigkeit, Koffein oder Stress verschieben den Puls. Aussagekräftig ist nur der Verlauf über Wochen: der Median der letzten 7 passenden Fahrten in 6 Wochen.', 'A single ride says little. Heat, fatigue, caffeine or stress shift your heart rate. Only the course over weeks is meaningful: the median of the last 7 suitable rides within 6 weeks.')}</p>
      <p class="mt-1">${wkL('Es zählen nur Abschnitte von 5 Minuten mit gleichmäßiger Leistung und ruhigem Puls zwischen 65 und 90 % der HFmax, ab Minute 10 und höchstens bis Minute 90. Fahrten bei Hitze, mit starker Puls-Drift, Rennen und Tests sowie Fahrten in den 7 Tagen nach einem Krank-Tag zählen nicht.', 'Only 5-minute sections with steady power and calm heart rate between 65 and 90% of max HR count, from minute 10 and up to minute 90. Rides in heat, with strong heart-rate drift, races and tests, and rides in the 7 days after a sick day do not count.')}</p>
      <p class="mt-1">${wkL('Ein Labortest ist genauer. Mit einem Laborwert kalibriert die App den Trend. ml/kg/min heißt Milliliter Sauerstoff je Kilogramm Körpergewicht und Minute. Der Trend ändert nie FTP, Zonen oder deinen Plan.', 'A lab test is more accurate. With a lab value the app calibrates the trend. ml/kg/min means millilitres of oxygen per kilogram of body weight per minute. The trend never changes your FTP, zones or plan.')}</p></details>`;
    const box = b => `<section class="panel mt-3 p-4" id="fx-v2r"><p class="hd text-lg font-semibold">${wkL('Trend aus Fahrten', 'Trend from rides')}</p>${b}${fill}${opts}${info}</section>`;
    if (O.med) return box(`<p class="mt-1 text-sm">${wkL('Ausgeschaltet: Dein Puls wird nach deiner Angabe durch Medikamente beeinflusst. Pulsbasierte Schätzungen sind dann nicht verwertbar.', 'Switched off: by your account your heart rate is affected by medication. Heart-rate based estimates are not usable then.')}</p>`);
    if (!vo2rAny()) return box(`<p class="mt-1 text-sm">${wkL('Noch keine Fahrt ausgewertet. Die App schätzt deine VO2max aus gleichmäßigen Fahrten mit Wattmesser und Puls, als Trend über mehrere Wochen.', 'No ride analysed yet. The app estimates your VO2max from steady rides with power meter and heart rate, as a trend over several weeks.')}</p>`);
    if (!hrMaxOf()) return box(`<p class="mt-1 text-sm">${wkL('Für den Trend braucht die App deine gemessene HFmax (höchster Puls). Eine Schätzung nach Alter ist zu ungenau.', 'For the trend the app needs your measured max HR (highest heart rate). An estimate from age is too inaccurate.')}</p><p class="mt-1 text-sm" style="color:var(--mute)">${wkL('So bestimmst du sie: den höchsten Puls aus einem Rampentest, einem Rennen oder einem harten Anstieg am Ende eines Intervalls ablesen und unter Einstellungen → Training eintragen.', 'How to find it: take the highest heart rate from a ramp test, a race or a hard climb at the end of an interval and enter it under Settings → Training.')}</p>`);
    const s = vo2rSum(), last = s.L[s.L.length - 1], R = v => Math.round(v), ch = s.tr ? vo2rChg(s.L) : null, io = vo2rInOut(s.L);
    const lastTx = last ? (last.x ? wkL(`Letzte Fahrt am ${mmDay(last.d)}: keine Schätzung, ${vo2rWhy(last.x)}.`, `Last ride on ${mmDay(last.d)}: no estimate, ${vo2rWhy(last.x)}.`) : wkL(`Letzte Fahrt am ${mmDay(last.d)}: etwa ${R(last.v)}.`, `Last ride on ${mmDay(last.d)}: about ${R(last.v)}.`)) : '';
    const rhr = s.ctx.rhr.ass ? wkL('Ruhepuls angenommen (60), deshalb ist die Spanne breiter. Trag an mindestens 5 Morgen deinen Ruhepuls ein, dann rechnet die App mit deinem Wert.', 'Resting heart rate assumed (60), so the range is wider. Enter your resting heart rate on at least 5 mornings and the app uses your value.') : wkL(`Ruhepuls ${R(s.ctx.rhr.v)} (Median deiner Morgenwerte der letzten 60 Tage).`, `Resting heart rate ${R(s.ctx.rhr.v)} (median of your morning values of the last 60 days).`);
    const chTx = ch ? (ch.sig ? wkL(`Gegenüber vor 4 Wochen: etwa ${ch.d > 0 ? '+' : '−'}${R(Math.abs(ch.d))} ml/kg/min.`, `Compared with 4 weeks ago: about ${ch.d > 0 ? '+' : '−'}${R(Math.abs(ch.d))} ml/kg/min.`) : wkL('Gegenüber vor 4 Wochen: unverändert im Rahmen der Genauigkeit.', 'Compared with 4 weeks ago: unchanged within the accuracy.')) : '';
    const pk = vo2Pick(), atTop = !pk || pk.old; /* steht der Trend schon oben als Hauptzahl, hier nicht wiederholen */
    const main = s.tr ? `${atTop ? '' : `<p class="mt-1"><span class="hd font-semibold" style="font-size:1.6rem">≈ ${R(s.tr.v)}</span> <span class="text-sm">ml/kg/min · ${wkL('wahrscheinlich', 'likely')} ${R(s.tr.lo)}–${R(s.tr.hi)}</span></p>`}<p class="${atTop ? 'mt-1 ' : ''}text-sm" style="color:var(--mute)">${wkL(`Trend aus ${s.tr.n} gleichmäßigen Fahrten der letzten 6 Wochen · Schätzung`, `Trend from ${s.tr.n} steady rides over the last 6 weeks · estimate`)}${s.tr.cal ? ' · ' + wkL(`kalibriert mit Laborwert vom ${mmDay(s.tr.cal.lab.date)}`, `calibrated with lab value of ${mmDay(s.tr.cal.lab.date)}`) : ''}</p>${chTx ? `<p class="mt-1 text-sm">${chTx}</p>` : ''}`
      : `<p class="mt-1 text-sm">${wkL('Noch kein Trend. Dafür braucht die App mindestens 3 gleichmäßige Fahrten mit Wattmesser und Puls in 6 Wochen.', 'No trend yet. The app needs at least 3 steady rides with power meter and heart rate within 6 weeks.')}</p>`;
    const ioTx = io ? `<p class="mt-2 p-2.5 text-sm" role="note" style="border:1px solid var(--line);border-left:3px solid #d9a400">${wkL(`Rolle und Straße liegen um mehr als 5 % auseinander (etwa ${R(io.mi)} auf der Rolle, ${R(io.mr)} draußen). Auf der Rolle ohne Ventilator steigt der Puls, zwei Wattmesser messen oft etwas unterschiedlich. Betrachte beides getrennt.`, `Indoor and outdoor differ by more than 5% (about ${R(io.mi)} indoors, ${R(io.mr)} outdoors). Indoors without a fan heart rate rises, and two power meters often measure slightly differently. Look at both separately.`)}</p>` : '';
    return box(`${main}${lastTx ? `<p class="mt-1 text-sm">${esc(lastTx)}</p>` : ''}${ioTx}${muted(esc(rhr))}`);
  } catch (e) { elog(e); return ''; }
}
