/* ---------- F26: Leistungsprofil (Bestwerte über 5 s bis 2 h als Netzdiagramm und Leistungskurve) ----------
   Datengrundlage: Für jede Fahrt mit Leistungsmesser die Mean-Max-Werte (höchster Durchschnitt über ein gleitendes Fenster)
   für MM_D, dazu der Zeitpunkt in der Fahrt (Sekunden ab Start). Gespeichert wird nur diese Tabelle je Fahrt in S.mm
   (gehört zum normalen Zustand und damit zu Spiegel, Schnappschüssen und Sicherungsdatei), nie die Sekundenreihe.
   Berechnung (mmSeries/mmCalc):
   - Zeitreihe auf 1 s: zwischen zwei Messpunkten gilt der Wert des ersten (wie streamOf), Lücken bis 10 s werden so gefüllt.
   - Eine Lücke über 10 s (Auto-Pause, Stopp) trennt die Fahrt in Abschnitte. Ein Fenster zählt nur innerhalb eines
     Abschnitts, Pausen werden also nicht überbrückt. Nullen bei echtem Rollen (aufgezeichnet, 0 W) bleiben drin.
   - Fehlende Leistung innerhalb eines Abschnitts zählt als 0 W (Aussetzer drücken den Wert, erhöhen ihn nie).
   - Einzelwerte über 2000 W gelten als Messfehler und zählen als 0 W; ab 5 solchen Sekunden ist die Fahrt markiert (q:'s').
   - 5-s-Wert über 2,2 × 1-min-Wert und zugleich über 1,5 × 15-s-Wert (kurzer Ausschlag statt Sprint): Fahrt markiert
     (q:'r'), ihre Werte unter 30 s zählen nicht für die Bestwerte, bis man sie im Logbuch bestätigt (ok).
   - Je Dauer ein Durchlauf mit laufender Summe (O(n)), eine 5-h-Fahrt sind etwa 16 × 18 000 Additionen.
   Ältere Fahrten: aus den gespeicherten Bestwerten (1, 3, 5, 20, 60 min) entsteht sofort ein Teilprofil (s:'a'). Diese Werte
   stammen aus der alten Berechnung, die Pausen bis 30 s herausschnitt. Mit Garmin lässt sich jede Fahrt nachberechnen. */
const MM_D = [5, 15, 30, 60, 120, 180, 300, 480, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200];
const MM_RAD = [15, 30, 60, 120, 180, 300, 600, 900, 1200, 1800, 2700, 3600];
const MM_MAX = 1500, MM_GAP = 10, MM_SPIKE = 2000;
const mmIx = t => MM_D.indexOf(t);
const mmEn = () => typeof lang === 'function' && lang() === 'en';
const mmLbl = t => t < 60 ? t + ' s' : t <= 5400 ? Math.round(t / 60) + ' min' : Math.round(t / 3600) + ' h';
const mmSayT = t => t < 60 ? t + wkL(' Sekunden', ' seconds') : t === 60 ? wkL('1 Minute', '1 minute') : t <= 5400 ? Math.round(t / 60) + wkL(' Minuten', ' minutes') : Math.round(t / 3600) + wkL(' Stunden', ' hours');
const mmNum = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(mmEn() ? 'en-GB' : 'de-DE', {minimumFractionDigits:d, maximumFractionDigits:d});
const mmDay = d => { try { return dOnly(d).toLocaleDateString(mmEn() ? 'en-GB' : 'de-DE', {day:'2-digit', month:'2-digit', year:'numeric'}); } catch (e) { elog(e); return d; } };

/* ---------- Berechnung ---------- */
function mmSeries(r){
  const pts = ((r && r.pts) || []).filter(q => q && q.t != null && isFinite(q.t)).sort((a, b) => a.t - b.t); if (pts.length < 2) return null;
  const T0 = pts[0].t, segs = []; let cur = null, spikes = 0, nP = 0, n = 0;
  for (let k = 1; k < pts.length; k++) {
    const dt = pts[k].t - pts[k - 1].t; if (dt <= 0) continue;
    if (dt > MM_GAP) { if (cur && cur.a.length) segs.push(cur); cur = null; continue; }
    if (!cur) cur = {t0:Math.round(pts[k - 1].t - T0), a:[]};
    let p = pts[k - 1].p != null ? pts[k - 1].p : pts[k].p; if (p != null && !(isFinite(p) && p >= 0)) p = null;
    const m = Math.round(dt); if (p != null && p > MM_SPIKE) { spikes += m; p = null; }
    for (let j = 0; j < m; j++) { cur.a.push(p == null ? 0 : p); if (p != null) nP++; n++; }
  }
  if (cur && cur.a.length) segs.push(cur);
  if (n < 60 || nP < .5 * n) return null;
  return {segs, spikes, n, nP};
}
/* Höchster Durchschnitt über D Sekunden in allen Abschnitten, dazu der Start des Fensters (Sekunden ab Fahrtbeginn) */
function mmMax(segs, D){
  let best = 0, at = 0;
  for (const s of segs) { const a = s.a; if (a.length < D) continue; let q = 0;
    for (let i = 0; i < a.length; i++) { q += a[i]; if (i >= D) q -= a[i - D]; if (i >= D - 1 && q > best) { best = q; at = s.t0 + i - D + 1; } } }
  return best > 0 ? [Math.round(best / D), at] : [0, 0];
}
function mmCalc(r){
  const sr = mmSeries(r); if (!sr) return null;
  const v = [], o = []; MM_D.forEach(D => { const [w, at] = mmMax(sr.segs, D); v.push(w); o.push(at); });
  if (!v.some(Boolean)) return null;
  const rec = {v, o, s:'f'}, d5 = v[0], d15 = v[1], m1 = v[3];
  if (sr.spikes >= 5) rec.q = 's';
  if (d5 && m1 && d5 > 2.2 * m1 && d15 && d5 > 1.5 * d15) rec.q = 'r';
  return rec;
}
/* Gewicht am Tag der Fahrt aus dem Verlauf Gewicht und FTP (F7), sonst das aktuelle Gewicht */
function mmKgAt(day){
  let H = []; try { H = (typeof wfHist === 'function' ? wfHist() : []).filter(h => h && h.kg > 0 && h.d).sort((a, b) => a.d.localeCompare(b.d)); } catch (e) { elog(e); }
  let kg = 0; H.forEach(h => { if (h.d <= day) kg = h.kg; });
  if (!kg && H.length) kg = H[0].kg;
  return kg || kgOf(S.p || S.d || {});
}
function mmPrune(){ const ks = Object.keys(S.mm || {}); if (ks.length <= MM_MAX) return; ks.sort((a, b) => String(S.mm[a].d).localeCompare(String(S.mm[b].d))).slice(0, ks.length - MM_MAX).forEach(k => { delete S.mm[k]; }); }
function mmPut(id, rec, meta){
  if (!id || !rec) return null; S.mm = S.mm && typeof S.mm === 'object' ? S.mm : {};
  const old = S.mm[id] || {}, day = (meta && (meta.day || meta.d)) || old.d || iso(0);
  const o = {d:day, n:String((meta && meta.n) || old.n || 'Radfahrt').slice(0, 50), kg:Math.round(mmKgAt(day) * 10) / 10, v:rec.v, o:rec.o || null, s:rec.s || 'f'};
  if (rec.q) o.q = rec.q; if (old.x) o.x = 1; if (old.ok) o.ok = 1;
  S.mm[id] = o; mmPrune(); return o;
}
/* Beim Einlesen einer Fahrt (summarize) und beim Nachladen von Garmin */
function mmKeep(a, r){ try { if (!a || !a.id) return; const rec = mmCalc(r); if (rec) mmPut(a.id, rec, a); } catch (e) { elog(e); } }
/* Teilprofil aus den gespeicherten Bestwerten älterer Fahrten */
function mmSeed(){
  let add = 0;
  try {
    S.mm = S.mm && typeof S.mm === 'object' ? S.mm : {};
    const K = [['m1', 60], ['m3', 180], ['m5', 300], ['m20', 1200], ['m60', 3600]];
    [...(S.arch || []), ...(S.hist || []), ...(S.man || [])].forEach(a => { if (!a || !a.id || S.mm[a.id]) return; const day = a.day || a.d; if (!day) return;
      const v = MM_D.map(() => 0); let any = false; K.forEach(([k, t]) => { const w = +a[k]; if (w > 0 && w < MM_SPIKE) { v[mmIx(t)] = Math.round(w); any = true; } });
      if (!any) return; mmPut(a.id, {v, o:null, s:'a'}, {day, n:a.n}); add++; });
  } catch (e) { elog(e); }
  return add;
}
let mmSeeded = false;
function mmAll(){ if (!mmSeeded) { mmSeeded = true; if (mmSeed()) setTimeout(() => { try { save(); } catch (e) { elog(e); } }, 0); } return S.mm || {}; }

/* ---------- Zeiträume und Bestwerte ---------- */
let mmPer = '8w', mmUnit = 'w', mmView = 'net', mmSel = null, mmCf = '', mmCt = '';
function mmRange(k){
  const today = iso(0);
  if (k === '8w') return [iso(-55), today];
  if (k === 'season') return [today.slice(0, 4) + '-01-01', today];
  if (k === 'custom') { const f = mmCf || iso(-55), t = mmCt || today; return f <= t ? [f, t] : [t, f]; }
  return ['0000-01-01', '9999-12-31'];
}
const mmPerL = k => ({'8w':wkL('Letzte 8 Wochen', 'Last 8 weeks'), season:wkL('Diese Saison', 'This season'), all:wkL('Allzeit', 'All time'), custom:wkL('Eigener Zeitraum', 'Custom range')})[k];
/* Zählt der Wert an Stelle i dieser Fahrt? Ausgeschlossen: ganze Fahrt (x), markierte kurze Werte (q:'r' ohne Bestätigung) */
const mmCounts = (rec, i) => !!rec && !rec.x && rec.v && rec.v[i] > 0 && !(rec.q === 'r' && !rec.ok && MM_D[i] < 30);
function mmBest(from, to, opt){
  const all = mmAll(), out = MM_D.map(() => null), skip = opt && opt.skip;
  Object.entries(all).forEach(([id, r]) => { if (!r || !r.d || r.d < from || r.d > to || id === skip) return;
    MM_D.forEach((t, i) => { if (!mmCounts(r, i)) return; const w = r.v[i]; if (!out[i] || w > out[i].w) out[i] = {w, id, d:r.d, n:r.n, kg:r.kg || mmKgAt(r.d), o:r.o ? r.o[i] : null, s:r.s}; }); });
  return out;
}
const mmVal = (b, unit) => !b ? 0 : unit === 'kg' ? b.w / (b.kg || 75) : b.w;
/* Stand vor 8 Wochen zum Vergleich: 8 Wochen → die 8 Wochen davor; sonst derselbe Zeitraum, aber nur bis vor 56 Tagen */
function mmBefore(k){ const [f, t] = mmRange(k); if (k === '8w') return mmBest(iso(-111), iso(-56)); const e = t < iso(-56) ? t : iso(-56); return f <= e ? mmBest(f, e) : MM_D.map(() => null); }
/* Neue Bestwerte einer Fahrt: höher als alle früheren Fahrten (es muss mindestens eine frühere mit Wert geben) */
function mmPr(id){
  const all = mmAll(), r = all[id]; if (!r || r.s !== 'f' || r.x) return [];
  const prev = MM_D.map(() => 0); let any = false;
  Object.entries(all).forEach(([k, q]) => { if (k === id || !q || !q.d || q.d > r.d) return; if (q.d === r.d && k > id) return; MM_D.forEach((t, i) => { if (mmCounts(q, i) && q.v[i] > prev[i]) { prev[i] = q.v[i]; any = true; } }); });
  if (!any) return [];
  return MM_D.map((t, i) => mmCounts(r, i) && prev[i] > 0 && r.v[i] > prev[i] ? {t, w:r.v[i], was:prev[i]} : null).filter(Boolean);
}
/* Für die Fahrtbewertung: gleiche Form wie e.pr (l, w, was) */
function mmPrE(e){ try { const id = e && (e.rid || (e.a && e.a.id)); if (!id) return null; const L = mmPr(id); return L.length ? L.map(p => ({k:'mm' + p.t, l:mmLbl(p.t), w:p.w, was:p.was})) : null; } catch (er) { elog(er); return null; } }

/* ---------- Referenzwerte und Stufen ----------
   Schwelle (FTP in W/kg): Grenzen der Kategorien aus CMP_REF.cat (F21, Leistungsprofil-Tabelle nach Allen und Coggan,
   „Training and Racing with a Power Meter“), getrennt nach Männern und Frauen. Gemeinsame Quelle, nicht doppelt gepflegt.
   Andere Dauern: Grenze der FTP-Kategorie × Verhältnis (W/kg der Dauer ÷ W/kg FTP). Die Verhältnisse für 5 s, 1 min und
   5 min sind Näherungen aus den Eckzeilen (untrainiert, Weltklasse) der Coggan-Tabelle; sie werden nach der Lage der FTP
   zwischen „untrainiert“ (bot) und „Weltklasse“ (top) linear, zwischen den Dauern logarithmisch interpoliert. Sicherheit: niedrig bis mittel. Die Tabelle selbst ließ sich als
   Text nicht prüfen (nur als Bild veröffentlicht); Werte in MM_REF bei Bedarf gegen das Buch abgleichen.
   20 und 60 min: FTP ≈ 95 % des 20-min-Werts bzw. ≈ 60-min-Wert (Allen und Coggan). Ausdauer über 2 h: eigene Einteilung
   der App (Anteil der FTP, die du über 2 h hältst), keine belegte Tabelle. */
const MM_REF = {
  top:{m:6.4, f:5.69}, bot:{m:1.86, f:1.5},
  ratio:{m:{5:[5.47, 3.93], 60:[3.03, 1.80], 300:[1.25, 1.19], 1200:[1.053, 1.053], 3600:[1, 1], 7200:[.88, .9]},
         f:{5:[5.47, 3.41], 60:[3.03, 1.63], 300:[1.25, 1.16], 1200:[1.053, 1.053], 3600:[1, 1], 7200:[.88, .9]}},
  dur:[0, .65, .72, .78, .83, .88],
  src:'Allen H, Coggan A: Training and Racing with a Power Meter (Power Profile); Verhältnisse 5 s, 1 min, 5 min genähert; Sicherheit niedrig bis mittel'
};
const mmG = () => { try { return cmpGroup(S.p || S.d || {}); } catch (e) { elog(e); return ''; } };
function mmRatio(t, u, g){
  const R = MM_REF.ratio[g === 'f' ? 'f' : 'm'], ks = Object.keys(R).map(Number).sort((a, b) => a - b), at = k => R[k][0] + (R[k][1] - R[k][0]) * u;
  if (t <= ks[0]) return at(ks[0]); if (t >= ks[ks.length - 1]) return at(ks[ks.length - 1]);
  for (let j = 0; j < ks.length - 1; j++) if (t >= ks[j] && t <= ks[j + 1]) { const f = Math.log(t / ks[j]) / Math.log(ks[j + 1] / ks[j]); return at(ks[j]) + (at(ks[j + 1]) - at(ks[j])) * f; }
  return 1;
}
/* Kategoriegrenzen (8 Stück wie in CMP_REF.cat) und Obergrenze für eine Dauer in W/kg */
function mmBounds(t, g){
  const one = gg => { const B = CMP_REF.cat[gg].map(x => x[0]), lo = MM_REF.bot[gg], hi = MM_REF.top[gg], u = v => Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return {b:B.map(v => v * mmRatio(t, u(v), gg)), top:hi * mmRatio(t, 1, gg)}; };
  if (g === 'm' || g === 'f') return one(g);
  const a = one('m'), b = one('f'); return {b:a.b.map((v, k) => (v + b.b[k]) / 2), top:(a.top + b.top) / 2};
}
/* Kategorie 0–7 mit Anteil bis zur nächsten Grenze; Stufe 1–6 (untrainiert und Einsteiger = 1, Nationale Spitze und Weltklasse = 6) */
function mmScore(wkg, t, g){
  const {b, top} = mmBounds(t, g); let k = 0; b.forEach((v, j) => { if (wkg >= v) k = j; });
  const hi = k < b.length - 1 ? b[k + 1] : top, lo = b[k] || (b[1] * .6), fr = Math.max(0, Math.min(1, (wkg - lo) / Math.max(.01, hi - lo)));
  return {k, sc:k + fr, lv:Math.max(1, Math.min(6, k <= 1 ? 1 : k >= 6 ? 6 : k))};
}
const MM_LV = [['Einstieg', 'Entry'], ['Freizeit', 'Recreational'], ['Gut trainiert', 'Well trained'], ['Sehr gut trainiert', 'Very well trained'], ['Amateur-Elite', 'Amateur elite'], ['Spitze', 'Top level']];
/* Achsenwert im Netz: Lage zwischen „untrainiert“ (70 % der Einsteiger-Grenze) und der Grenze „Amateur-Elite“ derselben Dauer;
   darüber wächst die Achse gedämpft bis zum Rand. So zeigt die Form Stärken und Schwächen, statt dass kurze Dauern
   einfach größer sind, und Freizeitsportler füllen das Netz sichtbar aus. */
function mmAxis(wkg, t, g){ const {b, top} = mmBounds(t, g), lo = b[1] * .7, hi = b[5], x = (wkg - lo) / Math.max(.01, hi - lo);
  return Math.max(.05, Math.min(1.04, x <= .85 ? x : .85 + .19 * Math.min(1, (wkg - (lo + .85 * (hi - lo))) / Math.max(.01, top - (lo + .85 * (hi - lo)))))); }

/* ---------- Kategorien und Fahrertyp ---------- */
const MM_CAT = [
  {k:'spr', l:['Sprint', 'Sprint'], r:['5–15 s', '5–15 s'], t:5},
  {k:'att', l:['Angriff', 'Attack'], r:['30 s – 1 min', '30 s – 1 min'], t:60},
  {k:'vo2', l:['VO2max', 'VO2max'], r:['3–5 min', '3–5 min'], t:300},
  {k:'thr', l:['Schwelle', 'Threshold'], r:['20–60 min', '20–60 min'], t:3600},
  {k:'end', l:['Ausdauer', 'Endurance'], r:['90–120 min', '90–120 min'], t:7200}
];
const MM_TIP = {
  spr:['1× pro Woche 6–8 Sprints über 10–15 s aus dem Rollen, dazwischen 3–5 min locker.', 'Once a week 6–8 sprints of 10–15 s from a rolling start, 3–5 min easy in between.'],
  att:['1× pro Woche kurze harte Wechsel, z. B. 2 Serien 8× 30 s sehr hart / 30 s locker.', 'Once a week short hard efforts, e.g. 2 sets of 8× 30 s very hard / 30 s easy.'],
  vo2:['1× pro Woche VO2max-Intervalle, z. B. 5× 4 min bei 106–120 % FTP, gleich lange Pausen.', 'Once a week VO2max intervals, e.g. 5× 4 min at 106–120% FTP with equal rest.'],
  thr:['2× pro Woche Sweet Spot, z. B. 2× 20 min bei 88–94 % FTP.', 'Twice a week sweet spot, e.g. 2× 20 min at 88–94% FTP.'],
  end:['1 lange Grundlagenfahrt pro Woche, langsam verlängern, die letzten 20 min zügig fahren.', 'One long endurance ride per week, extend it gradually, ride the last 20 min briskly.']
};
/* Werte je Kategorie aus den Bestwerten (Watt, W/kg, Stufe, Punktzahl) */
function mmCats(B, g){
  const val = t => B[mmIx(t)], kgv = b => b ? b.kg || 75 : 75, out = {};
  /* Schwelle: FTP-Schätzung aus 20 min (× 0,95) bzw. 60 min */
  const b20 = val(1200), b60 = val(3600), ftp = Math.max(b20 ? b20.w * .95 : 0, b60 ? b60.w : 0), ftpB = b20 && (!b60 || b20.w * .95 >= b60.w) ? b20 : b60;
  MM_CAT.forEach(c => {
    let b = null, w = 0, note = '';
    if (c.k === 'spr') { b = val(5); w = b ? b.w : 0; if (!b && val(15)) { b = val(15); w = Math.round(b.w * 1.1); note = wkL('aus dem 15-s-Wert geschätzt', 'estimated from the 15 s value'); } }
    else if (c.k === 'att') { b = val(60); w = b ? b.w : 0; }
    else if (c.k === 'vo2') { b = val(300); w = b ? b.w : 0; }
    else if (c.k === 'thr') { b = ftpB; w = Math.round(ftp); }
    else { b = val(7200) || val(5400); w = b ? b.w : 0; }
    if (!b || !w) { out[c.k] = null; return; }
    const kg = kgv(b), wkg = w / kg;
    if (c.k === 'end') { if (!ftp) { out[c.k] = null; return; } const rr = w / ftp - (b === val(5400) && !val(7200) ? .03 : 0); let lv = 1; MM_REF.dur.forEach((v, j) => { if (rr >= v) lv = j + 1; }); out[c.k] = {w, wkg, lv:Math.min(6, lv), sc:null, rr, b, note}; return; }
    const s = mmScore(wkg, c.t, g); out[c.k] = {w, wkg, lv:s.lv, sc:s.sc, b, note};
  });
  return out;
}
/* Fahrertyp aus den vier Kategorien mit Tabellen (Sprint, Angriff, VO2max, Schwelle) und dem Gewicht */
function mmType(C, kg){
  const ks = ['spr', 'att', 'vo2', 'thr'].filter(k => C[k] && C[k].sc != null); if (ks.length < 3) return null;
  const sc = k => C[k].sc, top = ks.reduce((a, b) => sc(b) > sc(a) ? b : a), low = ks.reduce((a, b) => sc(b) < sc(a) ? b : a), spread = sc(top) - sc(low);
  const R = {spr:wkL('5 bis 15 Sekunden', '5 to 15 seconds'), att:wkL('30 Sekunden bis 1 Minute', '30 seconds to 1 minute'), vo2:wkL('3 bis 5 Minuten', '3 to 5 minutes'), thr:wkL('20 bis 60 Minuten', '20 to 60 minutes')};
  let t, strong;
  if (spread < .9) { t = ['Allrounder', 'All-rounder']; strong = wkL('ausgeglichen über alle Dauern', 'balanced across all durations'); }
  else if (top === 'spr') { t = ['Sprinter', 'Sprinter']; strong = wkL('stark von ', 'strong from ') + R.spr; }
  else if (top === 'att' || top === 'vo2') { t = ['Puncheur', 'Puncheur']; const both = C.att && C.vo2 && Math.abs(sc('att') - sc('vo2')) < .8; strong = wkL('stark ', 'strong ') + (both ? wkL('von 1 bis 5 Minuten', 'from 1 to 5 minutes') : wkL('bei ', 'at ') + R[top]); }
  else { const climb = kg > 0 && kg <= 66; t = climb ? ['Kletterer', 'Climber'] : ['Zeitfahrer', 'Time trialist']; strong = wkL('stark von ', 'strong from ') + R.thr + (climb ? wkL(', bezogen aufs Gewicht', ', relative to body weight') : ''); }
  const pot = spread < .9 ? '' : wkL(` Größtes Potenzial liegt bei ${R[low]}.`, ` Your biggest potential is at ${R[low]}.`);
  return {k:t[0], en:t[1], name:wkL(t[0], t[1]), top, low, txt:`${wkL(t[0], t[1])}: ${strong}.${pot}`};
}

/* ---------- FTP-Schätzung ----------
   Bevorzugt Critical Power (2-Parameter-Modell Arbeit = CP × t + W′, lineare Regression über die Bestwerte von 3 bis 20 min
   der letzten 8 Wochen; mindestens 3 Dauern, darunter 15 oder 20 min, r² ≥ 0,97, W′ 4–40 kJ). Gegenprobe und Ersatz:
   95 % des 20-min-Bestwerts. Unsicherheit: Spanne zwischen beiden Werten, mindestens ±2 %. */
function mmCp(B){
  const P = [180, 300, 480, 600, 900, 1200].map(t => B[mmIx(t)] ? [t, B[mmIx(t)].w] : null).filter(Boolean);
  if (P.length < 3 || !P.some(p => p[0] >= 900)) return null;
  const xs = P.map(p => p[0]), ys = P.map(p => p[0] * p[1]), n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  const cp = sxy / sxx, wp = my - cp * mx, r2 = syy ? sxy * sxy / (sxx * syy) : 1;
  return {cp, wp, r2, n, ok:cp > 80 && wp > 4000 && wp < 40000 && r2 >= .97 && cp < Math.min(...P.map(p => p[1]))};
}
/* War eine Bestwert-Fahrt maximal? Vollgas markiert, Test/Rennen, hohes Empfinden oder hoher Puls (wie maxEvid in 19-leistungsanalyse) */
function mmMaxEv(id){
  try { if (S.allOut && S.allOut[id]) return true; const l = S.lb && S.lb[id]; if (l && (l.t === 'test' || l.t === 'race')) return true;
    const r = [...(S.hist || []), ...(S.man || [])].find(q => q && q.id === id); if (r && typeof maxEvid === 'function' && (maxEvid(r, 'm20') || maxEvid(r, 'm12') || maxEvid(r, 'm7'))) return true; } catch (e) { elog(e); }
  return false;
}
function mmFtpEst(B){
  B = B || mmBest(...mmRange('8w')); const b20 = B[mmIx(1200)], cp = mmCp(B), v20 = b20 ? Math.round(b20.w * .95) : 0;
  let v = 0, mode = '';
  if (cp && cp.ok) { v = Math.round(cp.cp); mode = 'cp'; } else if (v20) { v = v20; mode = 'v20'; }
  if (!v) return null;
  const lo = Math.min(v, v20 || v, Math.round(v * .98)), hi = Math.max(v, v20 || v, Math.round(v * 1.02));
  const used = [b20, ...[180, 300, 600, 900].map(t => B[mmIx(t)])].filter(Boolean), ev = used.some(b => mmMaxEv(b.id));
  return {v, mode, cp, v20, b20, lo, hi, ev};
}
/* Vorschlag: nur bei mehr als 3 % Abweichung. Höher: übernehmen möglich. Niedriger: nur mit Beleg für maximale Anstrengung,
   sonst Hinweis auf einen Fitness-Check (Bestwerte aus Training sind meist keine Maximalwerte). */
function mmFtpSug(est, cur){
  if (!est || !(cur > 0)) return null; const d = est.v / cur - 1;
  if (Math.abs(d) <= .03) return {k:'ok', d};
  if (d > 0) return {k:'up', d};
  return est.ev ? {k:'down', d} : {k:'test', d};
}
function mmFtpTake(v){
  v = Math.round(+v); if (!(v >= 50 && v <= 600) || !S.p) return;
  try { bkPre(wkL('Vor dem Übernehmen der FTP-Schätzung', 'Before applying the FTP estimate')); } catch (e) { elog(e); }
  S.mmIgn = null; setFtpNow(v); try { track('ftp-aus-leistungsprofil'); } catch (e) { elog(e); }
}
function mmFtpTest(){
  if (!S.p || !hasStarted(S.p)) { goPg('ms'); return; }
  try { bkPre(wkL('Vor dem Einplanen eines Fitness-Checks', 'Before scheduling a fitness check')); } catch (e) { elog(e); }
  retest(S.wk - 1);
}
function mmFtpIgn(v){ S.mmIgn = {v:Math.round(+v), d:iso(0)}; save(); render(); }
const mmIgnored = est => { const g = S.mmIgn; return !!(g && est && Math.abs(est.v - g.v) <= Math.max(3, g.v * .01) && g.d >= iso(-30)); };

/* ---------- Grafik: Netzdiagramm ---------- */
const mmPolar = (cx, cy, r, i, n) => { const a = (-90 + i * 360 / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
function mmArc(cx, cy, r, a0, a1){ const p = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)], [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)},${y0.toFixed(1)}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; }
/* layers: [{B, cls}] von hinten nach vorne; vals: Beschriftung aus dem vordersten Layer */
function mmNetSvg(layers, opt){
  opt = opt || {}; const mini = !!opt.mini, g = mmG(), n = MM_RAD.length, W = mini ? 160 : 360, H = mini ? 160 : 340, cx = W / 2, cy = H / 2, R = mini ? 62 : 104;
  const front = layers[layers.length - 1], unit = opt.unit || 'w';
  const pts = Ls => MM_RAD.map((t, i) => { const b = Ls.B[mmIx(t)]; if (!b) return null; return mmPolar(cx, cy, R * mmAxis(b.w / (b.kg || 75), t, g), i, n); });
  let s = '';
  [.25, .5, .75, 1].forEach(f => { s += `<circle cx="${cx}" cy="${cy}" r="${(R * f).toFixed(1)}" class="mm-gr"/>`; });
  MM_RAD.forEach((t, i) => { const [x, y] = mmPolar(cx, cy, R, i, n), has = !!front.B[mmIx(t)]; s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="${has ? 'mm-ax' : 'mm-ax mm-na'}"/>`; });
  /* Äußerer Ring: kurz (15 s – 1 min), mittel (2–5 min), lang (10–60 min) */
  const step = 360 / n, rr = R + (mini ? 5 : 7), seg = (i0, i1, c) => `<path d="${mmArc(cx, cy, rr, -90 + (i0 - .5) * step + 1.5, -90 + (i1 + .5) * step - 1.5)}" class="mm-rg ${c}" style="stroke-width:${mini ? 4 : 6}px"/>`;
  s += seg(0, 2, 'mm-r1') + seg(3, 5, 'mm-r2') + seg(6, 11, 'mm-r3');
  layers.forEach(Ls => { const P = pts(Ls).filter(Boolean); if (P.length >= 3) s += `<polygon points="${P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="${Ls.cls}"/>`; });
  if (!mini) {
    const fp = pts(front); fp.forEach((p, i) => { if (p) s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${mmSel === i ? 4.5 : 2.6}" class="mm-dot${mmSel === i ? ' on' : ''}"/>`; });
    MM_RAD.forEach((t, i) => { const [x, y] = mmPolar(cx, cy, R + 24, i, n), b = front.B[mmIx(t)], dx = x - cx, an = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end', yy = y + (y < cy - R * .6 ? -6 : y > cy + R * .6 ? 6 : 0);
      const v = b ? (unit === 'kg' ? mmNum(b.w / (b.kg || 75), 1) : b.w + ' W') : '–';
      s += `<text x="${x.toFixed(1)}" y="${(yy - 1).toFixed(1)}" text-anchor="${an}" class="tx mm-dl">${mmLbl(t)}</text><text x="${x.toFixed(1)}" y="${(yy + 11).toFixed(1)}" text-anchor="${an}" class="mm-vl${b ? '' : ' mm-na'}">${v}</text>`; });
    /* Tippflächen: je Achse ein Kreissektor */
    MM_RAD.forEach((t, i) => { const a0 = -90 + (i - .5) * step, a1 = a0 + step, p = a => [cx + (R + 40) * Math.cos(a * Math.PI / 180), cy + (R + 40) * Math.sin(a * Math.PI / 180)], [x0, y0] = p(a0), [x1, y1] = p(a1);
      s += `<path d="M${cx},${cy}L${x0.toFixed(1)},${y0.toFixed(1)}A${R + 40},${R + 40} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}Z" class="mm-hit" onclick="mmPick(${i})"><title>${mmLbl(t)}</title></path>`; });
  }
  const lab = opt.label || '';
  return `<svg viewBox="0 0 ${W} ${H}" class="mm-net${mini ? ' mm-mini' : ''}" ${lab ? `role="img" aria-label="${esc(lab)}"` : 'aria-hidden="true"'}>${s}</svg>`;
}
function mmPick(i){ mmSel = mmSel === i ? null : i; render(); }

/* ---------- Grafik: Leistungskurve (X logarithmisch 5 s – 2 h) ---------- */
let mmCReg = null;
function mmCurveSvg(lines, unit, ftp, lab){
  const W = 340, H = 210, L = 36, R = 10, T = 12, Bm = 22, x0 = Math.log(5), x1 = Math.log(7200), X = t => L + (Math.log(t) - x0) / (x1 - x0) * (W - L - R);
  const vals = lines.flatMap(l => l.B.map(b => mmVal(b, unit))).filter(v => v > 0); if (!vals.length) return '';
  const fv = unit === 'kg' ? (ftp && S.p ? ftp / kgOf(S.p) : 0) : ftp, top = Math.max(...vals, fv || 0) * 1.08, Y = v => T + (H - T - Bm) * (1 - v / top);
  const yt = (() => { const st = unit === 'kg' ? (top > 12 ? 4 : 2) : top > 900 ? 200 : 100, o = []; for (let v = st; v < top; v += st) o.push(v); return o; })();
  let s = yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl0"/><text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="tx">${unit === 'kg' ? v : v}</text>`).join('');
  [5, 15, 60, 300, 1200, 3600, 7200].forEach(t => { s += `<text x="${X(t).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="tx">${t < 60 ? t + 's' : t < 3600 ? t / 60 + "'" : t / 3600 + 'h'}</text>`; });
  if (fv) s += `<line x1="${L}" x2="${W - R}" y1="${Y(fv).toFixed(1)}" y2="${Y(fv).toFixed(1)}" class="mm-ftp"/><text x="${W - R - 2}" y="${(Y(fv) - 4).toFixed(1)}" text-anchor="end" class="tx">FTP</text>`;
  lines.forEach(l => { let d = '', on = false; MM_D.forEach((t, i) => { const v = mmVal(l.B[i], unit); if (!v) return; /* fehlende Dauer: Linie zum nächsten Wert durchziehen */ d += (on ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(v).toFixed(1); on = true; }); if (d) s += `<path d="${d}" class="${l.cls}"/>`; });
  mmCReg = {lines:lines.map(l => ({B:l.B, n:l.n})), unit, X, L, R, W};
  return `<svg viewBox="0 0 ${W} ${H}" class="mm-cv" role="img" aria-label="${esc(lab || '')}" onpointermove="mmCurTip(event)" onpointerdown="mmCurTip(event)"><line class="mm-cur" x1="0" x2="0" y1="${T}" y2="${H - Bm}" style="display:none"/>${s}</svg>`;
}
function mmCurTip(ev){
  try {
    const g = mmCReg, svg = ev.currentTarget; if (!g || !svg) return; const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * svg.viewBox.baseVal.width;
    let bi = 0, bd = 1e9; MM_D.forEach((t, i) => { const d = Math.abs(g.X(t) - px); if (d < bd) { bd = d; bi = i; } });
    const cur = svg.querySelector('.mm-cur'); if (cur) { const x = g.X(MM_D[bi]).toFixed(1); cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.style.display = ''; }
    const tip = document.getElementById('mm-ctip'); if (!tip) return;
    tip.textContent = mmLbl(MM_D[bi]) + ': ' + g.lines.map(l => { const b = l.B[bi]; return l.n + ' ' + (b ? (g.unit === 'kg' ? mmNum(b.w / (b.kg || 75), 1) + ' W/kg' : b.w + ' W') : '–'); }).join(' · ');
  } catch (e) { elog(e); }
}

/* ---------- Texte ---------- */
function mmSay(B, per, C, T){
  const L = MM_RAD.map(t => { const b = B[mmIx(t)]; return b ? `${mmSayT(t)} ${b.w} ${wkL('Watt', 'watts')}` : null; }).filter(Boolean);
  if (!L.length) return wkL('Leistungsprofil: noch keine Werte.', 'Power profile: no values yet.');
  return wkL('Leistungsprofil ', 'Power profile ') + mmPerL(per).toLowerCase() + ': ' + L.join(', ') + '.' + (T ? ' ' + T.txt : '');
}
const mmSeg = lv => `<span class="mm-seg" aria-hidden="true">${[1, 2, 3, 4, 5, 6].map(k => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
const mmBtn = (on, l, fn, lab) => `<button class="${on ? 'btn' : 'ghost'} !w-auto !px-3 !py-2 text-sm" style="min-height:44px" aria-pressed="${on}" onclick="${fn}"${lab ? ` aria-label="${esc(lab)}"` : ''}>${l}</button>`;
function mmSet(k, v){ if (k === 'per') mmPer = v; else if (k === 'unit') mmUnit = v; else if (k === 'view') mmView = v; render(); }
function mmDates(){ const f = document.getElementById('mmCf'), t = document.getElementById('mmCt'); mmCf = f ? f.value : ''; mmCt = t ? t.value : ''; mmPer = 'custom'; render(); }

/* ---------- Seite „Leistungsprofil“ ---------- */
function mmPage(){
  const all = mmAll(), n = Object.keys(all).length;
  if (!n) return `<section class="panel p-4" id="fx-mm" data-noi18n><p class="text-sm" style="color:var(--mute)">${wkL('Noch keine Fahrten mit Leistungsdaten. Sobald du Fahrten mit Wattmesser hochlädst oder von Garmin abrufst, zeigt die App hier deine Bestwerte von 15 Sekunden bis 60 Minuten als Netz, deinen Fahrertyp und eine FTP-Schätzung.', 'No rides with power data yet. As soon as you upload rides with a power meter or fetch them from Garmin, this page shows your best efforts from 15 seconds to 60 minutes as a web, your rider type and an FTP estimate.')}</p></section>${mmFillUi()}`;
  const g = mmG(), [f, t] = mmRange(mmPer), B = mmBest(f, t), A = mmBest(...mmRange('all')), prev = mmBefore(mmPer);
  const C = mmCats(B, g), kg = (S.p && kgOf(S.p)) || 75, T = mmType(C, kg), any = B.some(Boolean);
  const tabs = `<div class="flex flex-wrap gap-2">${['8w', 'season', 'all', 'custom'].map(k => mmBtn(mmPer === k, mmPerL(k), `mmSet('per','${k}')`)).join('')}</div>`;
  const cust = mmPer === 'custom' ? `<div class="mt-2 grid grid-cols-2 gap-2"><label class="text-xs" style="color:var(--mute)">${wkL('Von', 'From')}<input id="mmCf" type="date" class="inp" style="min-height:44px" value="${esc(f)}" onchange="mmDates()"></label><label class="text-xs" style="color:var(--mute)">${wkL('Bis', 'To')}<input id="mmCt" type="date" class="inp" style="min-height:44px" value="${esc(t)}" onchange="mmDates()"></label></div>` : '';
  const sw = `<div class="mt-3 flex flex-wrap gap-2">${mmBtn(mmView === 'net', wkL('Netz', 'Web'), "mmSet('view','net')")}${mmBtn(mmView === 'cv', wkL('Kurve', 'Curve'), "mmSet('view','cv')")}<span style="width:8px"></span>${mmBtn(mmUnit === 'w', 'Watt', "mmSet('unit','w')")}${mmBtn(mmUnit === 'kg', 'W/kg', "mmSet('unit','kg')")}</div>`;
  const back = mmPer === 'all' ? [] : [{B:A, cls:'mm-pa', n:mmPerL('all')}], lines = [...back, {B, cls:mmPer === 'all' ? 'mm-pa mm-front' : 'mm-p8', n:mmPerL(mmPer)}];
  const say = mmSay(B, mmPer, C, T), ftp = S.p && S.p.ftp;
  const chart = !any ? `<p class="mt-3 text-sm" style="color:var(--mute)">${wkL('In diesem Zeitraum gibt es keine Fahrten mit Leistungsdaten.', 'There are no rides with power data in this period.')}</p>`
    : mmView === 'net' ? `<div class="mt-2">${mmNetSvg(lines, {unit:mmUnit, label:say})}</div><div class="mm-lg">${back.length ? `<span><i class="mm-k mm-ka"></i>${mmPerL('all')}</span>` : ''}<span><i class="mm-k ${mmPer === 'all' ? 'mm-ka' : 'mm-k8'}"></i>${mmPerL(mmPer)}</span></div><div class="mm-lg"><span>${wkL('Ring:', 'Ring:')}</span><span><i class="mm-k mm-kb mm-kr1"></i>${wkL('kurz', 'short')}</span><span><i class="mm-k mm-kb mm-kr2"></i>${wkL('mittel', 'medium')}</span><span><i class="mm-k mm-kb mm-kr3"></i>${wkL('lang', 'long')}</span></div>${mmDetail(B, prev)}`
    : `<div class="mt-2">${mmCurveSvg(lines, mmUnit, ftp, say)}</div><p id="mm-ctip" class="wk-tip text-xs" aria-live="polite">${wkL('Wische über die Kurve, dann siehst du den Wert je Dauer.', 'Swipe across the curve to see the value for each duration.')}</p><div class="mm-lg">${back.length ? `<span><i class="mm-k mm-ka"></i>${mmPerL('all')}</span>` : ''}<span><i class="mm-k ${mmPer === 'all' ? 'mm-ka' : 'mm-k8'}"></i>${mmPerL(mmPer)}</span>${ftp ? `<span><i class="mm-k mm-kf"></i>FTP ${ftp} W</span>` : ''}</div>`;
  const na = MM_RAD.filter(t2 => !B[mmIx(t2)]);
  const naT = any && na.length ? `<p class="mt-2 text-xs" style="color:var(--mute)">${wkL('Ohne Wert in diesem Zeitraum (graue Achse): ', 'No value in this period (grey axis): ')}${na.map(mmLbl).join(', ')}.</p>` : '';
  const head = `<section class="panel p-4" id="fx-mm" data-noi18n>${T ? `<p class="hd text-lg font-semibold">${esc(T.name)}</p><p class="mt-1 text-sm">${esc(T.txt.replace(/^[^:]+:\s*/, ''))}</p>` : `<p class="text-sm" style="color:var(--mute)">${wkL('Für den Fahrertyp braucht die App Bestwerte über kurze und lange Dauern.', 'For your rider type the app needs best efforts over short and long durations.')}</p>`}
    <div class="mt-3">${tabs}${cust}</div>${sw}${chart}${naT}
    <p class="sr-only">${esc(say)}</p></section>`;
  return head + mmCatsUi(C) + mmFtpUi() + mmFillUi() + mmInfo();
}
/* Antippen einer Achse: Wert, W/kg, Datum, Fahrt, Veränderung gegenüber vor 8 Wochen */
function mmDetail(B, prev){
  if (mmSel == null) return `<p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Tippe auf eine Dauer, dann siehst du Wert, Datum und Fahrt.', 'Tap a duration to see value, date and ride.')}</p>`;
  const t = MM_RAD[mmSel], b = B[mmIx(t)], p = prev[mmIx(t)];
  if (!b) return `<div class="mm-box mt-2 p-3 text-sm"><b>${mmLbl(t)}</b>: ${wkL('kein Wert in diesem Zeitraum. Fahr eine Anstrengung über diese Dauer, dann erscheint sie hier.', 'no value in this period. Ride an effort of this length and it shows up here.')}</div>`;
  const ch = p ? b.w - p.w : null, pc = p ? Math.round((b.w / p.w - 1) * 100) : null;
  const chT = ch == null ? wkL('Vor 8 Wochen gab es noch keinen Wert.', 'There was no value 8 weeks ago.') : ch === 0 ? wkL('Gleich wie vor 8 Wochen.', 'Same as 8 weeks ago.') : `${ch > 0 ? '+' : '−'}${Math.abs(ch)} W (${pc > 0 ? '+' : pc < 0 ? '−' : '±'}${Math.abs(pc)} %) ${wkL('gegenüber vor 8 Wochen', 'compared with 8 weeks ago')}.`;
  const at = b.o != null ? wkL(` nach ${Math.round(b.o / 60)} min`, ` after ${Math.round(b.o / 60)} min`) : '';
  return `<div class="mm-box mt-2 p-3 text-sm"><p><b>${mmLbl(t)}: ${b.w} W</b> · ${mmNum(b.w / (b.kg || 75), 2)} W/kg</p><p class="mt-1">${mmDay(b.d)}${at}, <button class="underline" style="color:var(--teal);background:none;border:0;padding:0;min-height:32px" onclick="lbOpenRide('${ja(b.id)}')">${esc(b.n)}</button></p><p class="mt-1" style="color:var(--mute)">${chT}</p></div>`;
}
function mmCatsUi(C){
  const rows = MM_CAT.map(c => { const x = C[c.k], nm = wkL(c.l[0], c.l[1]);
    if (!x) return `<div class="mm-cat"><div class="flex items-baseline gap-2"><span class="font-semibold">${nm}</span><span class="text-xs" style="color:var(--mute)">${c.r[0]}</span></div><p class="mt-1 text-xs" style="color:var(--mute)">${c.k === 'end' ? wkL('Braucht eine Fahrt über 90 Minuten mit Leistungsdaten.', 'Needs a ride over 90 minutes with power data.') : wkL('Noch kein Wert.', 'No value yet.')}</p></div>`;
    const lv = MM_LV[x.lv - 1], val = c.k === 'end' ? `${Math.round(x.rr * 100)} % FTP` : `${x.w} W · ${mmNum(x.wkg, 1)} W/kg`;
    return `<div class="mm-cat"><div class="flex items-baseline gap-2"><span class="font-semibold">${nm}</span><span class="text-xs" style="color:var(--mute)">${c.r[0]}</span><span class="flex-1"></span><span class="text-sm">${val}</span></div>
      <div class="mt-1 flex items-center gap-2">${mmSeg(x.lv)}<span class="text-xs" aria-label="${esc(wkL('Stufe', 'Level') + ' ' + x.lv + ' ' + wkL('von 6', 'of 6'))}">${wkL('Stufe', 'Level')} ${x.lv}/6 · ${esc(wkL(lv[0], lv[1]))}</span></div>
      ${x.note ? `<p class="text-xs" style="color:var(--mute)">${esc(x.note)}</p>` : ''}<p class="mt-1 text-xs">${esc(wkL(MM_TIP[c.k][0], MM_TIP[c.k][1]))}</p></div>`; }).join('');
  const g = mmG(), gT = g === 'm' ? wkL('Männer', 'men') : g === 'f' ? wkL('Frauen', 'women') : wkL('Erwachsene allgemein (Mittel aus Männern und Frauen)', 'adults in general (average of men and women)');
  return `<section class="panel mt-3 p-4" id="fx-mmcat" data-noi18n><p class="hd text-lg font-semibold">${wkL('Stärken und Trainingshinweise', 'Strengths and training tips')}</p><p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Stufen 1–6 nach W/kg im gewählten Zeitraum, Vergleichsgruppe: ', 'Levels 1–6 by W/kg in the selected period, comparison group: ')}${gT}. ${wkL('Ausdauer: Anteil deiner FTP, den du über 2 Stunden hältst.', 'Endurance: share of your FTP you hold over 2 hours.')}</p><div class="mt-2">${rows}</div></section>`;
}
function mmFtpUi(){
  const B = mmBest(...mmRange('8w')), est = mmFtpEst(B), cur = S.p && S.p.ftp; if (!est) return '';
  const sg = mmFtpSug(est, cur), b20 = est.b20, how = est.mode === 'cp' ? wkL(`Critical Power aus ${est.cp.n} Bestwerten von 3 bis 20 Minuten (W′ ${mmNum(est.cp.wp / 1000, 1)} kJ)`, `critical power from ${est.cp.n} best efforts of 3 to 20 minutes (W′ ${mmNum(est.cp.wp / 1000, 1)} kJ)`) : wkL(`95 % des 20-min-Werts`, `95% of the 20 min value`);
  const src = b20 ? wkL(`, 20 min ${b20.w} W am ${mmDay(b20.d)}`, `, 20 min ${b20.w} W on ${mmDay(b20.d)}`) : '';
  const rng = est.lo !== est.hi ? wkL(` Spanne etwa ${est.lo}–${est.hi} W.`, ` Range about ${est.lo}–${est.hi} W.`) : '';
  let act = '';
  if (sg && !mmIgnored(est)) {
    if (sg.k === 'ok') act = `<p class="mt-2 text-sm">${wkL(`Passt zu deiner eingestellten FTP von ${cur} W.`, `Matches your current FTP of ${cur} W.`)}</p>`;
    else if (sg.k === 'test') act = `<p class="mt-2 text-sm">${wkL(`Die Schätzung liegt ${Math.round(-sg.d * 100)} % unter deiner FTP von ${cur} W. Deine letzten Bestwerte sind wahrscheinlich keine Maximalwerte, deshalb schlägt die App keine Absenkung vor. FTP-Test einplanen?`, `The estimate is ${Math.round(-sg.d * 100)}% below your FTP of ${cur} W. Your recent best efforts are probably not maximal, so the app does not suggest lowering it. Schedule an FTP test?`)}</p><div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFtpTest()">${wkL('Test einplanen', 'Schedule test')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFtpIgn(${est.v})">${wkL('Ignorieren', 'Ignore')}</button></div>`;
    else act = `<p class="mt-2 text-sm"><b>${wkL('FTP prüfen', 'Check FTP')}:</b> ${wkL(`Die Schätzung liegt ${Math.round(Math.abs(sg.d) * 100)} % ${sg.d > 0 ? 'über' : 'unter'} deiner eingestellten FTP von ${cur} W.`, `The estimate is ${Math.round(Math.abs(sg.d) * 100)}% ${sg.d > 0 ? 'above' : 'below'} your current FTP of ${cur} W.`)}</p><div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFtpTake(${est.v})">${wkL(`${est.v} W übernehmen`, `Apply ${est.v} W`)}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFtpTest()">${wkL('Test einplanen', 'Schedule test')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFtpIgn(${est.v})">${wkL('Ignorieren', 'Ignore')}</button></div><p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Übernehmen speichert vorher einen Schnappschuss (10 Minuten „Rückgängig“). Kommende Einheiten rechnen dann mit dem neuen Wert, vergangene behalten ihren.', 'Applying saves a snapshot first (10 minutes to undo). Upcoming sessions then use the new value, past ones keep theirs.')}</p>`;
  }
  return `<section class="panel mt-3 p-4" id="fx-mmftp" data-noi18n><p class="hd text-lg font-semibold">${wkL('FTP aus dem Leistungsprofil', 'FTP from the power profile')}</p><p class="mt-1 text-sm">${wkL('ca.', 'about')} <b>${est.v} W</b>, ${how}${src}.${rng}</p><p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Aus den Bestwerten der letzten 8 Wochen. Die App ändert deine FTP nie von selbst.', 'From the best efforts of the last 8 weeks. The app never changes your FTP by itself.')}</p>${act}</section>`;
}
function mmInfo(){
  return `<details class="mt-3 text-xs" style="color:var(--mute)" data-noi18n><summary class="cursor-pointer text-sm" style="color:var(--teal);min-height:44px;display:flex;align-items:center">${wkL('Wie wird das berechnet?', 'How is this calculated?')}</summary><p class="mt-1">${wkL('Für jede Fahrt mit Wattmesser berechnet die App den höchsten Durchschnitt über 5 Sekunden bis 2 Stunden. Pausen über 10 Sekunden werden nicht überbrückt, Einzelwerte über 2000 W gelten als Messfehler. Im Netz liegt jede Achse zwischen „untrainiert“ und „Weltklasse“ derselben Dauer, so zeigt die Form deine Stärken. Die Stufen beruhen auf der Leistungsprofil-Tabelle nach Allen und Coggan (Training and Racing with a Power Meter); für 5 s, 1 min und 5 min sind sie genähert. Gespeichert werden nur die Bestwerte je Fahrt, alles bleibt auf diesem Gerät.', 'For every ride with a power meter the app calculates the highest average over 5 seconds to 2 hours. Pauses over 10 seconds are not bridged, single values above 2000 W count as measurement errors. In the web each axis runs from “untrained” to “world class” for that duration, so the shape shows your strengths. Levels are based on the power profile table by Allen and Coggan (Training and Racing with a Power Meter); for 5 s, 1 min and 5 min they are approximations. Only the best efforts per ride are stored, everything stays on this device.')}</p></details>`;
}

/* ---------- Ältere Fahrten mit Garmin nachberechnen (Fortschritt, abbrechbar, später fortsetzbar) ---------- */
let mmFill = null;
function mmTodo(){ const all = mmAll(); return (S.arch || []).filter(a => a && a.gid && !a.in && (!all[a.id] || (all[a.id].s === 'a' && !all[a.id].nf))).sort((a, b) => b.d.localeCompare(a.d)); }
async function mmFillGo(){
  if ((mmFill && mmFill.run) || typeof gmRide !== 'function' || !gmMode()) return;
  const L = mmTodo(); if (!L.length) return; mmFill = {run:1, i:0, n:L.length, ok:0, fail:0, msg:''}; render();
  for (const a of L) {
    if (!mmFill.run) break; mmFill.i++; render();
    try { const {r} = await gmRide({id:a.gid, n:''}); const rec = mmCalc(r); if (rec) { mmPut(a.id, rec, {d:a.d, n:a.n}); mmFill.ok++; } else { const o = S.mm[a.id]; if (o) o.nf = 1; else S.mm[a.id] = {d:a.d, n:String(a.n || '').slice(0, 50), v:MM_D.map(() => 0), o:null, s:'a', nf:1}; } }
    catch (e) { elog(e); mmFill.fail++; if (typeof GmErr === 'function' && e instanceof GmErr && e.code !== 'tool') { mmFill.msg = e.message; break; } }
    if (mmFill.i % 5 === 0) { try { save(); } catch (e) { elog(e); } }
  }
  mmFill.run = 0; try { save(); } catch (e) { elog(e); } render();
}
function mmFillStop(){ if (mmFill) mmFill.run = 0; render(); }
function mmFillUi(){
  const can = typeof gmMode === 'function' && !!gmMode(), L = can ? mmTodo() : [], part = Object.values(S.mm || {}).filter(r => r && r.s === 'a' && !r.nf).length;
  if (mmFill && mmFill.run) return `<section class="panel mt-3 p-4" data-noi18n role="status"><p class="font-semibold">${wkL('Ältere Fahrten werden nachberechnet', 'Recalculating older rides')}</p><p class="mt-1 text-sm">${wkL(`Fahrt ${mmFill.i} von ${mmFill.n} …`, `Ride ${mmFill.i} of ${mmFill.n} …`)}</p><div class="mm-bar mt-2"><i style="width:${Math.round(mmFill.i / mmFill.n * 100)}%"></i></div><button class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFillStop()">${wkL('Abbrechen', 'Cancel')}</button></section>`;
  const done = mmFill && !mmFill.run ? `<p class="mt-1 text-sm">${wkL(`Zuletzt: ${mmFill.ok} Fahrten nachberechnet${mmFill.fail ? `, ${mmFill.fail} nicht ladbar` : ''}.`, `Last run: ${mmFill.ok} rides recalculated${mmFill.fail ? `, ${mmFill.fail} could not be loaded` : ''}.`)}${mmFill.msg ? ' ' + esc(mmFill.msg) : ''}</p>` : '';
  if (can && L.length) return `<section class="panel mt-3 p-4" id="fx-mmfill" data-noi18n><p class="font-semibold">${wkL('Ältere Fahrten nachberechnen', 'Recalculate older rides')}</p><p class="mt-1 text-sm" style="color:var(--mute)">${wkL(`${L.length} Fahrten von Garmin haben bisher nur einzelne Bestwerte (1, 5, 20, 60 min). Die App lädt sie einzeln von Garmin und berechnet alle Dauern. Du kannst jederzeit abbrechen und später weitermachen.`, `${L.length} rides from Garmin only have a few best efforts so far (1, 5, 20, 60 min). The app loads them one by one from Garmin and calculates all durations. You can cancel at any time and continue later.`)}</p>${done}<button class="btn mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="mmFillGo()">${wkL('Nachberechnen', 'Recalculate')}</button></section>`;
  if (part) return `<p class="mt-3 text-xs" style="color:var(--mute)" data-noi18n>${wkL(`${part} ältere Fahrten haben nur einzelne Bestwerte (1, 5, 20, 60 min). Lädst du sie noch einmal hoch oder verbindest Garmin, berechnet die App alle Dauern.`, `${part} older rides only have a few best efforts (1, 5, 20, 60 min). Upload them again or connect Garmin and the app calculates all durations.`)}</p>${done}`;
  return done ? `<div data-noi18n>${done}</div>` : '';
}

/* ---------- Fortschritt: kompakte Karte ---------- */
function mmProgCard(){
  try {
    const all = mmAll(); if (!Object.keys(all).length) return '';
    const g = mmG(), B = mmBest(...mmRange('8w')), A = mmBest(...mmRange('all')), use = B.some(Boolean) ? B : A, C = mmCats(use, g), T = mmType(C, (S.p && kgOf(S.p)) || 75);
    const say = mmSay(use, B.some(Boolean) ? '8w' : 'all', C, T);
    return `<button class="panel mm-card mt-3 flex w-full items-center gap-3 p-3 text-left" onclick="goPg('sprof')" data-noi18n aria-label="${esc(wkL('Leistungsprofil öffnen. ', 'Open power profile. ') + say)}"><span style="flex:none;width:112px">${mmNetSvg([{B:A, cls:'mm-pa'}, {B:use, cls:'mm-p8'}], {mini:true})}</span><span class="min-w-0 flex-1"><span class="eyebrow block">${wkL('Leistungsprofil', 'Power profile')}</span><span class="mt-1 block font-semibold">${esc(T ? T.name : wkL('Deine Bestwerte', 'Your best efforts'))}</span><span class="mt-0.5 block text-xs" style="color:var(--mute)">${esc(T ? T.txt.replace(/^[^:]+:\s*/, '') : wkL('Bestwerte von 15 Sekunden bis 60 Minuten', 'Best efforts from 15 seconds to 60 minutes'))}</span></span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`;
  } catch (e) { elog(e); return ''; }
}

/* ---------- Logbuch: Bestwerte dieser Fahrt ---------- */
function mmMark(id, k){ const r = S.mm && S.mm[id]; if (!r) return; if (r[k]) delete r[k]; else r[k] = 1; save(); render(); }
function mmRideBlock(id){
  try {
    const r = mmAll()[id]; if (!r || !r.v || !r.v.some(Boolean)) return '';
    const pr = r.x ? [] : mmPr(id), prT = new Set(pr.map(p => p.t)), K = [5, 60, 300, 1200, 3600];
    const cells = K.map(t => { const i = mmIx(t), w = r.v[i], on = prT.has(t), cnt = mmCounts(r, i); return `<div class="mm-rc${on ? ' on' : ''}${w && !cnt ? ' off' : ''}"><span class="text-xs" style="color:var(--mute)">${mmLbl(t)}</span><span class="font-semibold">${w ? w + ' W' : '–'}</span>${on ? `<span class="text-xs">${wkL('Bestwert', 'Best')}</span>` : ''}</div>`; }).join('');
    const prL = pr.length ? `<div class="vz-pr mt-2 flex items-start gap-2 p-2.5 text-sm">${VZ_TROPHY}<span>${pr.length === 1 ? wkL('Neuer Bestwert', 'New best') : wkL(`${pr.length} neue Bestwerte`, `${pr.length} new bests`)}: ${pr.slice(0, 4).map(p => `${mmLbl(p.t)} <b>${p.w} W</b> <span style="opacity:.75">(${wkL('vorher', 'before')} ${p.was} W)</span>`).join(' · ')}</span></div>` : '';
    const q = r.q && !r.ok ? `<p class="mt-2 text-sm" role="note" style="border-left:3px solid #d9a400;padding-left:8px">${r.q === 'r' ? wkL('Leistungsdaten fraglich: Der 5-s-Wert ist im Verhältnis zu 15 s und 1 min ungewöhnlich hoch. Werte unter 30 s zählen deshalb nicht für die Bestwerte.', 'Power data questionable: the 5 s value is unusually high compared with 15 s and 1 min. Values under 30 s therefore do not count towards your bests.') : wkL('Leistungsdaten fraglich: Die Fahrt enthält mehrere Werte über 2000 W. Sie wurden als Messfehler weggelassen.', 'Power data questionable: the ride contains several values above 2000 W. They were left out as measurement errors.')}</p>` : '';
    const btns = `<div class="mt-2 flex flex-wrap gap-2">${r.q === 'r' ? `<button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${!!r.ok}" onclick="mmMark('${ja(id)}','ok')">${r.ok ? wkL('Kurze Werte doch nicht zählen', 'Do not count short values') : wkL('Werte stimmen', 'Values are correct')}</button>` : ''}<button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${!!r.x}" onclick="mmMark('${ja(id)}','x')">${r.x ? wkL('Wieder für Bestwerte zählen', 'Count for bests again') : wkL('Aus den Bestwerten nehmen', 'Exclude from bests')}</button></div>`;
    return `<div class="mt-3 p-3" id="fx-mmride" style="border:1px solid var(--line)" data-noi18n><p class="eyebrow">${wkL('Bestwerte dieser Fahrt', 'Best efforts of this ride')}</p>${r.x ? `<p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Diese Fahrt zählt nicht für deine Bestwerte.', 'This ride does not count towards your bests.')}</p>` : ''}<div class="mm-rg5 mt-2">${cells}</div>${r.s === 'a' ? `<p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Aus älteren Daten, nur einzelne Dauern.', 'From older data, only some durations.')}</p>` : ''}${prL}${q}${btns}</div>`;
  } catch (e) { elog(e); return ''; }
}

/* ---------- „Wusstest du schon?“: neue Bestwerte und Stärke (Wiederholung wie F21 frühestens nach 60 Tagen) ---------- */
function mmDyk(){
  const out = []; try {
    const all = mmAll(), recent = Object.keys(all).filter(id => all[id].d >= iso(-13)).sort((a, b) => all[b].d.localeCompare(all[a].d));
    for (const id of recent) { const pr = mmPr(id); if (pr.length) { const p = pr.reduce((a, b) => b.w / b.was > a.w / a.was ? b : a);
      out.push({id:'cmp-mmpr', de:`Neuer Bestwert über ${mmLbl(p.t)}: ${p.w} W am ${fmt(all[id].d)} (vorher ${p.was} W).`, en:`New best over ${mmLbl(p.t)}: ${p.w} W on ${mmDay(all[id].d)} (before ${p.was} W).`, go:'sprof'}); break; } }
    const C = mmCats(mmBest(...mmRange('8w')), mmG()), T = mmType(C, (S.p && kgOf(S.p)) || 75);
    if (T && T.top) { const c = MM_CAT.find(x => x.k === T.top); out.push({id:'cmp-mmtype', de:`Deine größte Stärke im Leistungsprofil: ${c.l[0]} (${c.r[0]}). Dein Fahrertyp: ${T.k}.`, en:`Your biggest strength in the power profile: ${c.l[1]} (${c.r[1]}). Your rider type: ${T.en}.`, go:'sprof'}); }
  } catch (e) { elog(e); }
  return out;
}
function dykMm(){ goPg('state'); goPg('sprof'); dykFocus('fx-mm'); }
