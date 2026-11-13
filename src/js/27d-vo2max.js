/* ---------- F27: VO2max schätzen und Entwicklung verfolgen ----------
   Jede Zahl ist eine Schätzung, außer ein Laborwert. Angezeigt werden immer Methode, Datum, Quelle und Spanne.
   Methoden (Formeln mit Quelle, Einheiten: Leistung W, Gewicht kg, VO2max ml/kg/min):
   R  Rampentest: Jurov I, Toplišek J, Cvijić M. Prediction of Maximal Oxygen Consumption in Cycle Ergometry in Competitive
      Cyclists. Life 2023;13(1):160, doi 10.3390/life13010160 (Tabelle 1, im Volltext geprüft am 13.11.2026):
        Männer   VO2max = 0,10 × PO − 0,60 × BW + 64,21
        Frauen   VO2max = 0,13 × PO − 0,83 × BW + 64,02
        ohne Angabe VO2max = 0,12 × PO − 0,65 × BW + 59,78
      Protokoll des Papers (Erwachsene über 17 Jahre und über 50 kg): 15 min einfahren, Start 100 W, +20 W je Minute bis zur
      Erschöpfung (Abbruch auch, wenn die Trittfrequenz unter 60 fällt). Unter 17 Jahren oder unter 50 kg: 60 W, +15 W je Minute.
      PO ist im Paper „maximal power output“ ohne nähere Definition. Die App nimmt den besten 60-s-Durchschnitt: Bei einer
      Rampe mit 1-min-Stufen ist das genau letzte vollendete Stufe + Stufenhöhe × Anteil der angefangenen Stufe.
      Bestimmtheit R² 0,456 (Männer), 0,671 (Frauen), 0,589 (gesamt); SD der gemessenen VO2max 5,49 bzw. 7,02.
      Schätzfehler daraus SEE ≈ SD × √(1 − R²) ≈ 4,0 ml/kg/min (abgeleitet, im Paper nur als Grafik).
      Studiengruppe: 496 Männer (17,1 J., 66,7 kg, 5,9 W/kg, VO2max 63,4), 84 Frauen (20,2 J., 57,5 kg, 5,19 W/kg, 54,8).
   F  5-min-Maximaltest: Sitko S et al. Five-Minute Power-Based Test to Predict Maximal Oxygen Consumption in Road Cycling.
      IJSPP 2022;17(1):9–15, doi 10.1123/ijspp.2020-0923:  VO2max = 16,6 + 8,87 × 5-min-Leistung (W/kg).
      Externe Prüfung: Borszcz FK et al. IJSPP 2024;19(6):565–575, doi 10.1123/ijspp.2023-0330: unterschätzt im Mittel um
      6,6 ml/kg/min, 95-%-Übereinstimmungsgrenzen −17,2 bis +3,8 (Schätzung minus Messung). Deren aktualisierte Formel
      steht nur im Volltext und wird deshalb nicht verwendet.
   G  Garmin/Firstbeat: Wert von der Uhr bzw. aus Garmin Connect, von Hand übernommen (Garmin liefert ihn über den
      Abruf der App nicht). Spanne ±5 %, über 60 ml/kg/min nach oben +10 % (Unterschätzung bei Hochtrainierten).
   L  Laborwert (Spiroergometrie): Referenz.
   Nicht verwendet: ACSM-Formel, Formeln nur aus Alter/Größe/Gewicht, Umrechnung aus der FTP. */
const VO2_M = {L:{p:5, de:'Labor', en:'Lab'}, R:{p:4, de:'Rampentest', en:'Ramp test'}, F:{p:3, de:'5-min-Test', en:'5-min test'}, G:{p:2, de:'Garmin', en:'Garmin'}, FR:{p:1, de:'aus Fahrt', en:'from ride'}};
const VO2_SRC = {R:'Jurov et al. 2023, doi 10.3390/life13010160', F:'Sitko et al. 2022, doi 10.1123/ijspp.2020-0923; Spanne: Borszcz et al. 2024, doi 10.1123/ijspp.2023-0330', G:'Garmin/Firstbeat', L:'Labor'};
const VO2_SEE = 4.0, VO2_CALD = 14, VO2_CALMAX = 365;
const vo2N = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(mmEn() ? 'en-GB' : 'de-DE', {minimumFractionDigits:d, maximumFractionDigits:d});
/* ---------- Formeln (reine Funktionen) ---------- */
function vo2Jurov(po, kg, sex){
  if (!(po > 0 && kg > 0)) return null;
  if (sex === 'm') return .10 * po - .60 * kg + 64.21;
  if (sex === 'f') return .13 * po - .83 * kg + 64.02;
  return .12 * po - .65 * kg + 59.78;
}
const vo2Sitko = (p5, kg) => p5 > 0 && kg > 0 ? 16.6 + 8.87 * (p5 / kg) : null;
const vo2Abs = (v, kg) => v > 0 && kg > 0 ? v * kg / 1000 : null; /* l/min = ml/kg/min × kg / 1000 */
/* Spanne je Methode. R: ±1 SEE, außerhalb der Studiengruppe (unter 4,8 W/kg, etwa Mittel − 2 SD der Männer) × 1,5.
   F: nach Borszcz (Messung = Schätzung + 3,8 … + 17,2); aus einer Fahrt statt einem Test nach oben weitere +5 (Annahme der
   App: nicht sicher ausbelastet). G: ±5 %, über 60 nach oben +10 %. L: keine. */
function vo2Range(m, v, o){
  o = o || {};
  if (m === 'R') { const w = VO2_SEE * (o.wkg && o.wkg < 4.8 ? 1.5 : 1); return {low:v - w, high:v + w}; }
  if (m === 'F') return {low:v - 3.8, high:v + 17.2 + (o.ride ? 5 : 0)};
  if (m === 'G') return {low:v * .95, high:v * (v > 60 ? 1.10 : 1.05)};
  return {low:v, high:v};
}
const vo2Sex = () => { const p = S.p || S.d || {}; return p.sex === 'm' || p.sex === 'f' ? p.sex : ''; };

/* ---------- Zeitreihe mit Puls (wie mmSeries: Lücken über 10 s trennen Abschnitte) ---------- */
function vo2Series(r){
  const pts = ((r && r.pts) || []).filter(q => q && q.t != null && isFinite(q.t)).sort((a, b) => a.t - b.t); if (pts.length < 2) return null;
  const segs = []; let cur = null;
  for (let k = 1; k < pts.length; k++) {
    const dt = pts[k].t - pts[k - 1].t; if (dt <= 0) continue;
    if (dt > MM_GAP) { if (cur) segs.push(cur); cur = null; continue; }
    if (!cur) cur = {p:[], h:[]};
    let p = pts[k - 1].p != null ? pts[k - 1].p : pts[k].p; if (p != null && (!(p >= 0) || p > MM_SPIKE)) p = null;
    const h0 = pts[k - 1].h != null ? pts[k - 1].h : pts[k].h, h = h0 != null && h0 > 30 && h0 < 230 ? h0 : null;
    for (let j = 0; j < Math.round(dt); j++) { cur.p.push(p == null ? 0 : p); cur.h.push(h); }
  }
  if (cur) segs.push(cur);
  return segs.length ? segs : null;
}
/* Bestes Fenster der Länge D: Abschnitt, Startindex, Mittel */
function vo2Win(segs, D){ let b = null; segs.forEach((s, si) => { const a = s.p; if (a.length < D) return; let q = 0; for (let i = 0; i < a.length; i++) { q += a[i]; if (i >= D) q -= a[i - D]; if (i >= D - 1 && (!b || q / D > b.w)) b = {si, i0:i - D + 1, w:q / D}; } }); return b; }
const vo2Avg = (arr, a, b) => { let s = 0, n = 0; for (let i = Math.max(0, a); i < Math.min(arr.length, b); i++) if (arr[i] != null) { s += arr[i]; n++; } return n ? s / n : null; };
const vo2Max = (arr, a, b) => { let m = 0; for (let i = Math.max(0, a); i < Math.min(arr.length, b); i++) if (arr[i] != null && arr[i] > m) m = arr[i]; return m || null; };
/* Puls-Kriterium: Spitzenpuls ≥ 95 % HFmax, wenn HFmax bekannt; sonst steigt der Puls bis zum Ende (letzte Minute ≥ Minute davor + 3) */
function vo2HrOk(h, a, b){
  const hm = hrMaxOf(), pk = vo2Max(h, a, b), last = vo2Avg(h, b - 60, b), prev = vo2Avg(h, b - 180, b - 120);
  if (pk == null) return {ok:null, why:wkL('keine Pulsdaten', 'no heart-rate data')};
  if (hm) return pk >= .95 * hm ? {ok:true, pk} : {ok:false, pk, why:wkL(`Spitzenpuls ${Math.round(pk)} unter 95 % deiner HFmax (${hm})`, `peak heart rate ${Math.round(pk)} below 95% of your max HR (${hm})`)};
  if (last != null && prev != null && last >= prev + 3) return {ok:true, pk};
  return {ok:false, pk, why:wkL('Puls stieg zum Ende nicht weiter an', 'heart rate did not keep rising towards the end')};
}
/* Rampentest auswerten: PO = bester 60-s-Durchschnitt; gültig bei Ausbelastung, Rampe ohne Pause (mindestens 5 min vor dem Ende im selben Abschnitt) */
function vo2EvalRamp(segs){
  const b = vo2Win(segs, 60); if (!b) return null; const s = segs[b.si], end = b.i0 + 60, why = [];
  if (b.i0 < 240) why.push(wkL('Rampe zu kurz oder mit Pause', 'ramp too short or interrupted'));
  const hr = vo2HrOk(s.h, b.i0 - 120, end); if (hr.ok === false) why.push(hr.why);
  /* Leistung muss in den 5 Minuten davor gestiegen sein (Rampe, kein Einzelsprint) */
  const p5 = vo2Avg(s.p, b.i0 - 300, b.i0 - 240); if (p5 != null && !(p5 < b.w - 40)) why.push(wkL('kein Anstieg der Leistung erkennbar', 'no rising power visible'));
  return {po:Math.round(b.w), valid:!why.length, note:why.join('; '), hr:hr.pk || null};
}
/* 5-min-Test auswerten: p5 = bester 300-s-Durchschnitt; kein Sprintstart (erste 30 s ≤ 130 % des Mittels), keine Pause (Fenster in einem Abschnitt) */
function vo2EvalFive(segs){
  const b = vo2Win(segs, 300); if (!b) return null; const s = segs[b.si], why = [];
  const f30 = vo2Avg(s.p, b.i0, b.i0 + 30); if (f30 != null && f30 > 1.3 * b.w) why.push(wkL('Sprintstart (erste 30 s über 130 % des Mittels)', 'sprint start (first 30 s above 130% of the mean)'));
  let zero = 0; for (let i = b.i0; i < b.i0 + 300; i++) if (s.p[i] < 20) zero++; if (zero > 10) why.push(wkL('Unterbrechung im Testabschnitt', 'interruption during the test effort'));
  const hr = vo2HrOk(s.h, b.i0, b.i0 + 300); if (hr.ok === false) why.push(hr.why);
  return {p5:Math.round(b.w), valid:!why.length, note:why.join('; '), hr:hr.pk || null, hrOk:hr.ok};
}

/* ---------- Speicher ---------- */
const vo2List = () => { S.vo2 = Array.isArray(S.vo2) ? S.vo2 : []; return S.vo2; };
function vo2Add(e){
  const L = vo2List(), i = L.findIndex(x => x.id === e.id); if (i >= 0) L[i] = {...L[i], ...e, limit:L[i].limit != null ? L[i].limit : e.limit}; else L.push(e);
  L.sort((a, b) => a.date.localeCompare(b.date)); if (L.length > 400) S.vo2 = L.slice(-400); return e;
}
function vo2Make(method, date, v, basis, o){
  o = o || {}; const kg = (basis && basis.weight) || mmKgAt(date), r = vo2Range(method, v, {wkg:basis && basis.p && kg ? basis.p / kg : 0, ride:o.src === 'ride'});
  return {id:o.id || ('v' + date + method + (basis && basis.rideId ? basis.rideId : Date.now().toString(36))), date, value:Math.round(v * 10) / 10, abs:Math.round(vo2Abs(v, kg) * 100) / 100, method, src:o.src || 'test',
    basis:{p:basis && basis.p || null, weight:Math.round(kg * 10) / 10, protocol:basis && basis.protocol || null, rideId:basis && basis.rideId || null},
    range:{low:Math.round(r.low * 10) / 10, high:Math.round(r.high * 10) / 10}, valid:o.valid !== false, note:o.note || '', limit:null};
}
/* Geplante VO2max-Einheit am Tag der Fahrt (laufende Woche) */
function vo2PlanAt(day){ try { if (!S.p || !S.plan) return null; for (let i = 0; i < 7; i++) if (dstr(i) === day && S.plan[i] && S.plan[i].vo2t) return S.plan[i]; } catch (e) { elog(e); } return null; }
const vo2TypeAt = day => { try { if (!S.p || !S.plan) return ''; for (let i = 0; i < 7; i++) if (dstr(i) === day && S.plan[i]) return S.plan[i].t || ''; } catch (e) { elog(e); } return ''; };
/* Beim Einlesen einer Fahrt: geplanter Test → Methode R bzw. F; sonst Schätzung aus der Fahrt, wenn neuer 5-min-Bestwert
   der letzten 8 Wochen und als Maximalanstrengung plausibel (Puls, Einheit VO2max/Rennen/Test, „Vollgas“ markiert). */
function vo2FromRide(a, r){
  try {
    if (!a || !a.id || !a.day) return null; const segs = vo2Series(r); if (!segs) return null;
    const x = vo2PlanAt(a.day), kg = mmKgAt(a.day);
    if (x && x.vo2t === 'R') { const ev = vo2EvalRamp(segs); if (!ev) return null; const v = vo2Jurov(ev.po, kg, vo2Sex());
      return vo2Add(vo2Make('R', a.day, v, {p:ev.po, weight:kg, protocol:'100+20 W/min', rideId:a.id}, {id:'v' + a.id + 'R', valid:ev.valid, note:ev.note})); }
    if (x && x.vo2t === 'F') { const ev = vo2EvalFive(segs); if (!ev) return null; const v = vo2Sitko(ev.p5, kg);
      return vo2Add(vo2Make('F', a.day, v, {p:ev.p5, weight:kg, protocol:'5 min', rideId:a.id}, {id:'v' + a.id + 'F', valid:ev.valid, note:ev.note})); }
    /* aus einer Fahrt */
    const ev = vo2EvalFive(segs); if (!ev) return null;
    const prev = mmBest(addD(a.day, -55), a.day, {skip:a.id})[mmIx(300)]; if (prev && ev.p5 <= prev.w) return null;
    const ty = vo2TypeAt(a.day), why = ev.hrOk === true || ['vo2', 'race', 'test'].includes(ty) || !!(S.allOut && S.allOut[a.id]);
    if (!why || /Sprintstart|sprint start|Unterbrechung|interruption/.test(ev.note)) return null;
    return vo2Add(vo2Make('F', a.day, vo2Sitko(ev.p5, kg), {p:ev.p5, weight:kg, protocol:'5 min aus Fahrt', rideId:a.id}, {id:'v' + a.id + 'FR', src:'ride', note:wkL('aus einer Fahrt, nicht aus einem Test', 'from a ride, not from a test')}));
  } catch (e) { elog(e); return null; }
}
const vo2Kind = e => e.method === 'F' && e.src === 'ride' ? 'FR' : e.method;

/* ---------- Kalibrierung mit Laborwert ----------
   Laborwert und Feldwert derselben Methode innerhalb von ±14 Tagen: Versatz = Labor − Feld. Gilt für Werte dieser Methode
   ab 14 Tage vor dem Labortest bis 12 Monate danach. Abschaltbar (S.vo2CalOff). Der Rohwert bleibt gespeichert. */
function vo2Cal(kind){
  if (S.vo2CalOff) return null; const L = vo2List(), labs = L.filter(e => e.method === 'L' && e.valid).sort((a, b) => b.date.localeCompare(a.date));
  for (const lab of labs) { const d0 = dOnly(lab.date), c = L.filter(e => vo2Kind(e) === kind && e.valid && Math.abs((dOnly(e.date) - d0) / 864e5) <= VO2_CALD).sort((a, b) => Math.abs(dOnly(a.date) - d0) - Math.abs(dOnly(b.date) - d0))[0];
    if (c) return {off:Math.round((lab.value - c.value) * 10) / 10, lab, pair:c}; }
  return null;
}
function vo2Adj(e){
  const kind = vo2Kind(e); if (kind === 'L') return {v:e.value, lo:e.range.low, hi:e.range.high, cal:null};
  const c = vo2Cal(kind); if (!c) return {v:e.value, lo:e.range.low, hi:e.range.high, cal:null};
  const age = (dOnly(e.date) - dOnly(c.lab.date)) / 864e5; if (age < -VO2_CALD || age > VO2_CALMAX) return {v:e.value, lo:e.range.low, hi:e.range.high, cal:null, exp:age > VO2_CALMAX ? c : null};
  return {v:e.value + c.off, lo:e.range.low + c.off, hi:e.range.high + c.off, cal:c};
}

/* ---------- Auswahl und Trend ---------- */
/* Angezeigter Wert: gültige Werte der letzten 12 Wochen nach Priorität L > R > F-Test > G > F-Fahrt, bei Gleichstand der neueste;
   gibt es dort keinen, der neueste gültige Wert überhaupt (als älter gekennzeichnet) */
function vo2Pick(L){
  L = (L || vo2List()).filter(e => e.valid && e.limit !== 'n'); if (!L.length) return null;
  const from = iso(-84), rec = L.filter(e => e.date >= from), pool = rec.length ? rec : L;
  const best = pool.reduce((a, b) => { const pa = VO2_M[vo2Kind(a)].p, pb = VO2_M[vo2Kind(b)].p; return pb > pa || (pb === pa && b.date > a.date) ? b : a; });
  return {e:best, old:!rec.length};
}
/* Geglätteter Trend je Methode (nur gültige Werte): zeitgewichtetes Mittel mit Halbwertszeit 21 Tage bis zum Stichtag */
function vo2TrendAt(kind, day, unit){
  const L = vo2List().filter(e => e.valid && e.limit !== 'n' && vo2Kind(e) === kind && e.date <= day); if (!L.length) return null;
  let s = 0, w = 0; L.forEach(e => { const age = (dOnly(day) - dOnly(e.date)) / 864e5; if (age > 120) return; const k = Math.pow(.5, age / 21), a = vo2Adj(e), v = unit === 'abs' ? a.v * e.basis.weight / 1000 : a.v; s += v * k; w += k; });
  return w ? s / w : null;
}
const vo2LastTest = () => vo2List().filter(e => e.valid && e.src === 'test' && (e.method === 'R' || e.method === 'F')).sort((a, b) => b.date.localeCompare(a.date))[0] || null;

/* ---------- Einordnung ----------
   FRIEND-Register, Fahrradergometer (Kaminsky LA et al. Mayo Clin Proc 2017;92(2):228–233, doi 10.1016/j.mayocp.2016.10.003,
   4494 Tests, USA): Median 20–29 J. Männer 41,9, Frauen 31,0; 70–79 J. 19,5 bzw. 14,8 ml/kg/min, Abnahme etwa 10 % je
   Jahrzehnt (Angaben der Zusammenfassung). Die Mediane dazwischen interpoliert die App geometrisch (abgeleitet, nicht aus
   der Tabelle; Perzentile außer dem Median waren nicht zugänglich). Radsport-Vergleich: Mittelwerte der Studiengruppe von
   Jurov et al. 2023 (wettkampforientierte, meist junge Fahrer). */
const VO2_NORM = {m:[41.9, 19.5], f:[31.0, 14.8], cyc:{m:63.4, f:54.8}};
function vo2Median(age, sex){
  if (!(age >= 20)) age = 25; const one = g => { const [a, b] = VO2_NORM[g], x = Math.max(0, Math.min(5, (Math.min(age, 79) - 25) / 10)); return a * Math.pow(b / a, x / 5); };
  return sex === 'm' || sex === 'f' ? one(sex) : (one('m') + one('f')) / 2;
}

/* ---------- Testeinheiten ---------- */
const vo2PmaxGuess = () => { const ftp = (S.p && S.p.ftp) || 200; return Math.round(ftp / .75 / 20) * 20; };
function vo2Unit(kind){
  const p = S.p || {}, age = typeof ageAt === 'function' ? ageAt(p, iso(0)) : 0, kg = kgOf(p), small = (age && age < 17) || kg < 50;
  if (kind === 'R') { const s0 = small ? 60 : 100, inc = small ? 15 : 20, pm = Math.max(s0 + inc * 6, vo2PmaxGuess()), ramp = Math.ceil((pm - s0) / inc) + 2;
    return {...D('vo2', 'VO2max-Check: Rampe', 15 + ramp + 10, 50, 150, '80–100 U/min', `15 Min. einfahren · Rampe ab ${s0} W, jede Minute +${inc} W, bis du die Trittfrequenz nicht mehr über 60 halten kannst · 10 Min. ausfahren. Am besten im ERG-Modus auf der Rolle.`, 'Ausgeruht, nach einem Ruhetag, mit Ventilator und Trinkflasche. Bei jedem Test gleiche Bedingungen: gleiche Rolle, ähnliche Uhrzeit.'), vo2t:'R', ramp:{s:s0, inc, pm}}; }
  return {...D('vo2', 'VO2max-Check: 5 Minuten', 45, 110, 130, '90–105 U/min', '15 Min. einfahren, darin 3× 30 s zügig · 5 Min. locker · 5 Min. so hart, wie du es gleichmäßig durchhältst · 15 Min. ausfahren. Draußen an einem gleichmäßigen Anstieg ohne Kreuzungen.', 'Nicht lossprinten: Die ersten 30 Sekunden kontrolliert, die letzte Minute alles geben. Ausgeruht und nach einem Ruhetag.'), vo2t:'F'};
}
/* Blöcke für die Grafik (F24): Rampe als Stufen in % FTP */
function vo2Blocks(x, out){
  const ftp = (S.p && S.p.ftp) || 200, pc = w => w / ftp * 100;
  if (x.vo2t === 'R') { const r = x.ramp || {s:100, inc:20, pm:vo2PmaxGuess()}; out.push(wkB(15 * 60, 45, 65, 45, 65, 'wu')); let k = 0;
    for (let w = r.s; w <= r.pm + r.inc; w += r.inc) { k++; out.push(wkB(60, pc(w), pc(w), pc(w), pc(w), 'test', {no:k})); }
    out.push(wkB(10 * 60, 60, 45, 45, 60, 'cd')); return; }
  out.push(wkB(9 * 60, 45, 65, 45, 65, 'wu')); for (let k = 0; k < 3; k++) { out.push(wkB(30, 110, 110, 105, 115, 'work', {no:k + 1, of:3, opener:1})); out.push(wkB(90, 55, 55, 45, 60, 'rest')); }
  out.push(wkB(5 * 60, 50, 50, 40, 55, 'rest')); out.push(wkB(5 * 60, 120, 120, 110, 130, 'test', {cad:x.cad})); out.push(wkB(15 * 60, 60, 45, 45, 60, 'cd'));
}
/* Garmin-Workout (FIT) und Zwift (ZWO) */
function vo2FitSteps(p, x){
  const st = [], T = m => Math.round(m * 60000), W = w => Math.round(w) + 1000, pw = pct => W(p.ftp * pct / 100), add = (name, min, lo, hi, it) => st.push({name, dur:0, dv:T(min), tt:4, tv:0, lo, hi, it});
  if (x.vo2t === 'R') { const r = x.ramp; add('Einfahren', 15, pw(50), pw(65), 2); for (let w = r.s; w <= r.pm + 5 * r.inc; w += r.inc) add(w + ' W', 1, W(w - 5), W(w + 5), 0); add('Ausfahren', 10, pw(45), pw(55), 3); return st; }
  add('Einfahren', 9, pw(50), pw(65), 2); for (let k = 0; k < 3; k++) { add('Zuegig', .5, pw(105), pw(115), 0); add('Locker', 1.5, pw(45), pw(60), 1); }
  add('Locker', 5, pw(45), pw(55), 1); add('5 Min maximal', 5, pw(110), pw(130), 0); add('Ausfahren', 15, pw(45), pw(55), 3); return st;
}
function vo2Zwo(p, x){
  const r2 = v => (Math.round(v) / 100).toFixed(2), b = [], pc = w => w / p.ftp * 100;
  if (x.vo2t === 'R') { const r = x.ramp; b.push(`<Warmup Duration="900" PowerLow="${r2(50)}" PowerHigh="${r2(65)}"/>`); for (let w = r.s; w <= r.pm + 5 * r.inc; w += r.inc) b.push(`<SteadyState Duration="60" Power="${r2(pc(w))}"/>`); b.push(`<Cooldown Duration="600" PowerLow="${r2(60)}" PowerHigh="${r2(45)}"/>`); }
  else { b.push(`<Warmup Duration="540" PowerLow="${r2(50)}" PowerHigh="${r2(65)}"/>`); b.push(`<IntervalsT Repeat="3" OnDuration="30" OffDuration="90" OnPower="${r2(110)}" OffPower="${r2(55)}"/>`); b.push(`<SteadyState Duration="300" Power="${r2(50)}"/>`); b.push(`<FreeRide Duration="300" FlatRoad="1"/>`); b.push(`<Cooldown Duration="900" PowerLow="${r2(60)}" PowerHigh="${r2(45)}"/>`); }
  return b;
}
/* Einplanen nur nach Zustimmung: Schnappschuss, dann eine Einheit der laufenden Woche (ab morgen, möglichst ein harter Tag) ersetzen */
let vo2Msg = '';
function vo2PlanTest(kind){
  const p = S.p; if (!p || !S.plan || !hasStarted(p)) { vo2Msg = wkL('Der Plan hat noch nicht begonnen.', 'The plan has not started yet.'); return render(); }
  const t = todayIdx(), cand = [];
  for (let j = t + 1; j < 7; j++) { const x = S.plan[j]; if (!x || !(x.m > 0) || (S.blocked && S.blocked[j]) || (S.done && S.done[j]) || x.t === 'race' || x.t === 'rest' || x.vo2t) continue; cand.push({j, sc:['vo2', 'thr', 'sst'].includes(x.t) ? 0 : x.t === 'long' ? 3 : 1}); }
  if (!cand.length) { vo2Msg = wkL('In dieser Woche ist ab morgen kein passender Tag frei. Plane den Test in der nächsten Woche ein.', 'There is no suitable day left this week. Schedule the test next week.'); return render(); }
  const pick = cand.sort((a, b) => a.sc - b.sc || a.j - b.j)[0];
  try { bkPre(wkL('Vor dem Einplanen eines VO2max-Tests', 'Before scheduling a VO2max test')); } catch (e) { elog(e); }
  const old = S.plan[pick.j]; S.plan[pick.j] = {...vo2Unit(kind), adapted:true, orig:old};
  S.log = S.log || []; S.log.unshift({title:'VO2max-Test eingeplant', day:pick.j, text:`${SD[pick.j]}: „${old.n}“ ersetzt durch „${S.plan[pick.j].n}“. Rückgängig über den Hinweis oben oder in den Sicherungen.`});
  vo2Msg = wkL(`Eingeplant am ${DAYS[pick.j]} statt „${old.n}“.`, `Scheduled on day ${pick.j + 1} instead of “${old.n}”.`);
  save(); render(); try { track('vo2-test-eingeplant'); } catch (e) { elog(e); }
}

/* ---------- Eingabe Laborwert / Garmin-Wert ---------- */
let vo2Form = null;
function vo2FormOpen(m){ vo2Form = {m:m || 'L', msg:''}; render(); setTimeout(() => { const el = document.getElementById('v2Val'); if (el) el.focus(); }, 30); }
function vo2Save(){
  const g = id => (document.getElementById(id) || {}).value || '', num = s => Number(String(s).replace(',', '.'));
  const m = vo2Form ? vo2Form.m : 'L', date = g('v2Date'), unit = g('v2Unit') || 'rel', raw = num(g('v2Val')), kg = num(g('v2Kg')) || mmKgAt(date || iso(0)), po = Math.round(num(g('v2Po'))) || null, note = String(g('v2Note')).slice(0, 120);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > iso(0)) { vo2Form.msg = wkL('Bitte ein Datum bis heute eintragen.', 'Please enter a date up to today.'); return render(); }
  const v = unit === 'abs' ? raw * 1000 / kg : raw;
  if (!(v >= 15 && v <= 95)) { vo2Form.msg = wkL('Der Wert liegt außerhalb von 15–95 ml/kg/min. Bitte Einheit prüfen.', 'The value is outside 15–95 ml/kg/min. Please check the unit.'); return render(); }
  if (!(kg >= 30 && kg <= 200)) { vo2Form.msg = wkL('Bitte ein Gewicht zwischen 30 und 200 kg eintragen.', 'Please enter a weight between 30 and 200 kg.'); return render(); }
  vo2Add(vo2Make(m, date, v, {p:po, weight:kg, protocol:m === 'L' ? 'Labor' : 'Garmin'}, {id:'v' + date + m + Date.now().toString(36), src:'manual', note}));
  vo2Form = null; save(); render();
}
function vo2Del(id){ S.vo2 = vo2List().filter(e => e.id !== id); save(); render(); }
function vo2Lim(id, a){ const e = vo2List().find(x => x.id === id); if (!e) return; e.limit = a; if (a === 'n') { e.valid = false; e.note = (e.note ? e.note + '; ' : '') + wkL('nach eigener Angabe nicht am Limit', 'not at the limit by your own account'); } save(); render(); }
function vo2CalTog(){ S.vo2CalOff = !S.vo2CalOff; save(); render(); }
let vo2Rng = '6', vo2Unit_ = 'rel';
function vo2Set(k, v){ if (k === 'rng') vo2Rng = v; else vo2Unit_ = v; render(); }

/* ---------- Anzeige ---------- */
const vo2ML = k => wkL(VO2_M[k].de, VO2_M[k].en);
/* Form je Methode (Form und Farbe, nicht nur Farbe) */
function vo2Shape(k, x, y, r){
  r = r || 4.5; const c = `class="v2-${k}"`;
  if (k === 'L') return `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${2 * r}" height="${2 * r}" ${c}/>`;
  if (k === 'R') return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" ${c}/>`;
  if (k === 'G') return `<path d="M${x.toFixed(1)},${(y - r - 1).toFixed(1)}l${r + 1},${r + 1}l${-r - 1},${r + 1}l${-r - 1},${-r - 1}z" ${c}/>`;
  return `<path d="M${x.toFixed(1)},${(y - r).toFixed(1)}l${r},${2 * r - 1}h${-2 * r}z" ${c}/>`;
}
function vo2Chart(unit, rng){
  const L = vo2List(); if (!L.length) return '';
  const W = 340, H = 200, Lm = 34, R = 10, T = 14, B = 22, today = iso(0), from = rng === 'all' ? L[0].date : addD(today, -({3:91, 6:182, 12:365}[rng] || 182)), t0 = dOnly(from).getTime(), t1 = dOnly(today).getTime() + 864e5 * 3;
  const X = d => Lm + (dOnly(d).getTime() - t0) / Math.max(864e5, t1 - t0) * (W - Lm - R), vis = L.filter(e => e.date >= from);
  const val = (e, v) => unit === 'abs' ? v * e.basis.weight / 1000 : v, ad = vis.map(e => ({e, a:vo2Adj(e)}));
  if (!ad.length) return `<p class="mt-2 text-sm" style="color:var(--mute)">${wkL('In diesem Zeitraum gibt es keine Werte.', 'No values in this period.')}</p>`;
  const vs = ad.flatMap(({e, a}) => [val(e, a.lo), val(e, a.hi), val(e, a.v)]), lo = Math.floor(Math.min(...vs) * .97), hi = Math.ceil(Math.max(...vs) * 1.02), Y = v => T + (H - T - B) * (1 - (v - lo) / Math.max(1, hi - lo));
  let s = '';
  /* Entlastungswochen als Band, Events (F17) als Linie, FTP-Änderungen (F7) als Marke unten */
  try { const p = S.p; if (p && p.start) (p.recW || []).forEach(w => { const a = addD(p.start, (w - 1) * 7), b = addD(a, 7); if (b < from || a > today) return; s += `<rect x="${Math.max(Lm, X(a)).toFixed(1)}" y="${T}" width="${Math.max(2, X(b) - Math.max(Lm, X(a))).toFixed(1)}" height="${H - T - B}" class="v2-rec"/>`; }); } catch (e) { elog(e); }
  try { (S.p ? efList(S.p) : []).forEach(x => { if (x.date < from || x.date > addD(today, 3)) return; s += `<line x1="${X(x.date).toFixed(1)}" x2="${X(x.date).toFixed(1)}" y1="${T}" y2="${H - B}" class="v2-ev"/><text x="${X(x.date).toFixed(1)}" y="${T - 3}" text-anchor="middle" class="tx">${esc(x.prio || 'E')}</text>`; }); } catch (e) { elog(e); }
  try { let last = null; (typeof wfHist === 'function' ? wfHist() : []).forEach(h => { if (h.ftp && last && Math.round(h.ftp) !== Math.round(last) && h.d >= from) s += `<path d="M${X(h.d).toFixed(1)},${H - B}l-4,6h8z" class="v2-ftp"><title>FTP ${Math.round(h.ftp)} W</title></path>`; if (h.ftp) last = h.ftp; }); } catch (e) { elog(e); }
  const st = (hi - lo) > 12 ? 5 : 2; for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) s += `<line x1="${Lm}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl0"/><text x="${Lm - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="tx">${unit === 'abs' ? vo2N(v, 1) : v}</text>`;
  /* Trendlinie je Methode aus gültigen Werten */
  ['L', 'R', 'F', 'G', 'FR'].forEach(k => { if (!ad.some(({e}) => vo2Kind(e) === k && e.valid)) return; let d = ''; const n = 24; for (let i = 0; i <= n; i++) { const day = lstr(new Date(t0 + (Math.min(t1 - 864e5 * 3, dOnly(today).getTime()) - t0) * i / n)), v = vo2TrendAt(k, day, unit); if (v == null) continue; d += (d ? 'L' : 'M') + X(day).toFixed(1) + ',' + Y(v).toFixed(1); } if (d) s += `<path d="${d}" class="v2-tr v2-${k}"/>`; });
  ad.forEach(({e, a}) => { const k = vo2Kind(e), x = X(e.date), y = Y(val(e, a.v)); if (a.hi > a.lo) s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${Y(val(e, a.hi)).toFixed(1)}" y2="${Y(val(e, a.lo)).toFixed(1)}" class="v2-eb"/>`; s += `<g${e.valid ? '' : ' class="v2-inv"'}>${vo2Shape(k, x, y)}<title>${esc(vo2ML(k) + ' ' + mmDay(e.date) + ': ' + vo2N(val(e, a.v), unit === 'abs' ? 2 : 1))}</title></g>`; });
  const mt = []; for (let d = new Date(t0); d.getTime() <= t1; d.setDate(d.getDate() + 1)) if (d.getDate() === 1) mt.push(lstr(d));
  const MON = mmEn() ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], every = Math.ceil(mt.length / 6);
  mt.forEach((d, i) => { if (i % every) return; s += `<text x="${X(d).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="tx">${MON[dOnly(d).getMonth()]}</text>`; });
  const say = wkL('Verlauf der VO2max: ', 'VO2max history: ') + ad.filter(x => x.e.valid).map(({e, a}) => `${mmDay(e.date)} ${vo2ML(vo2Kind(e))} ${vo2N(val(e, a.v), unit === 'abs' ? 2 : 1)}`).join(', ');
  const kinds = [...new Set(ad.map(x => vo2Kind(x.e)))], lg = kinds.map(k => `<span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">${vo2Shape(k, 6, 6.5, 4)}</svg>${vo2ML(k)}</span>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="v2-ch" role="img" aria-label="${esc(say)}">${s}</svg><div class="mm-lg">${lg}${ad.some(x => !x.e.valid) ? `<span>${wkL('blass = ungültig', 'faded = invalid')}</span>` : ''}<span><i class="mm-k v2-krec"></i>${wkL('Entlastungswoche', 'recovery week')}</span><span>▲ FTP</span></div>`;
}
function vo2Row(e){
  const a = vo2Adj(e), k = vo2Kind(e), lim = e.src === 'test' && e.limit == null && e.date >= iso(-14);
  return `<li class="py-2" style="border-top:1px solid var(--line)"><div class="flex items-baseline gap-2"><span class="text-sm font-semibold">${vo2N(a.v)} ml/kg/min</span><span class="text-xs" style="color:var(--mute)">${vo2ML(k)} · ${mmDay(e.date)}</span><span class="flex-1"></span>${e.src === 'manual' ? `<button class="text-xs underline" style="color:var(--teal);background:none;border:0;min-height:44px;min-width:44px" onclick="vo2Del('${ja(e.id)}')">${wkL('Löschen', 'Delete')}</button>` : ''}</div>
    <p class="text-xs" style="color:var(--mute)">${a.hi > a.lo ? wkL(`Spanne ${vo2N(a.lo)}–${vo2N(a.hi)}`, `range ${vo2N(a.lo)}–${vo2N(a.hi)}`) + ' · ' : ''}${e.abs ? vo2N(a.v * e.basis.weight / 1000, 2) + ' l/min · ' : ''}${e.basis.p ? (e.method === 'R' ? 'Pmax ' : e.method === 'F' ? wkL('5 min ', '5 min ') : 'Pmax ') + e.basis.p + ' W · ' : ''}${vo2N(e.basis.weight)} kg${a.cal ? ' · ' + wkL(`kalibriert am ${mmDay(a.cal.lab.date)} (Rohwert ${vo2N(e.value)})`, `calibrated on ${mmDay(a.cal.lab.date)} (raw ${vo2N(e.value)})`) : ''}</p>
    ${!e.valid ? `<p class="text-xs" style="color:#b7791f">${wkL('Nicht im Trend: ', 'Not in the trend: ')}${esc(e.note || wkL('vermutlich nicht ausbelastet', 'probably not maximal'))}</p>` : e.note ? `<p class="text-xs" style="color:var(--mute)">${esc(e.note)}</p>` : ''}
    ${lim ? `<div class="mt-1 flex flex-wrap items-center gap-2"><span class="text-sm">${wkL('Warst du am Limit?', 'Were you at your limit?')}</span><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="vo2Lim('${ja(e.id)}','y')">${wkL('Ja', 'Yes')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="vo2Lim('${ja(e.id)}','n')">${wkL('Eher nicht', 'Not really')}</button></div>` : ''}</li>`;
}
/* Hinweis bei vermutlich falscher HFmax (verfälscht Garmins Schätzung und die Pulsprüfung) */
function vo2HrWarn(){
  const hm = hrMaxOf(); let pk = 0; [...(S.man || []), ...(S.hist || [])].forEach(a => { if (a && a.hrMax > pk) pk = a.hrMax; });
  return hm && pk > hm + 2 ? `<p class="mt-2 p-2.5 text-sm" role="note" style="border:1px solid var(--line);border-left:3px solid #d9a400">${wkL(`In deinen Fahrten lag der Puls schon bei ${pk}, eingestellt ist eine HFmax von ${hm}. Ist die HFmax auch in Garmin zu niedrig, schätzt Garmin die VO2max falsch, und die App hält Tests eher für ausbelastet. HFmax prüfen unter Einstellungen → Training.`, `Your rides already reached a heart rate of ${pk}, but your max HR is set to ${hm}. If Garmin also has it too low, Garmin's VO2max estimate is off, and the app is more likely to treat tests as maximal. Check your max HR under Settings → Training.`)}</p>` : '';
}
function vo2Page(){
  const L = vo2List(), pk = vo2Pick(L), p = S.p || {}, sex = vo2Sex(), age = typeof ageAt === 'function' ? ageAt(p, iso(0)) : 0;
  let top;
  if (!pk) top = `<p class="text-sm" style="color:var(--mute)">${wkL('Noch kein Wert. Fahr einen VO2max-Test (Rampe oder 5 Minuten), trag einen Laborwert ein oder übernimm den Wert deiner Garmin-Uhr. Neue 5-min-Bestwerte aus harten Fahrten schätzt die App auch selbst.', 'No value yet. Ride a VO2max test (ramp or 5 minutes), enter a lab value or take over the value from your Garmin watch. The app also estimates new 5-min bests from hard rides.')}</p>`;
  else { const e = pk.e, a = vo2Adj(e), k = vo2Kind(e), tr = d => { const n = vo2TrendAt(k, iso(0)), o = vo2TrendAt(k, iso(-d)); return n != null && o != null && iso(-d) >= L.filter(x => vo2Kind(x) === k)[0].date ? n - o : null; }, t4 = tr(28), t12 = tr(84), sg = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + vo2N(Math.abs(v));
    const med = vo2Median(age, sex), cyc = sex ? VO2_NORM.cyc[sex] : null, rel = Math.round((a.v / med - 1) * 100);
    top = `<p class="eyebrow">${wkL('Deine VO2max', 'Your VO2max')}${pk.old ? wkL(' (älter als 12 Wochen)', ' (older than 12 weeks)') : ''}</p><p class="mt-1"><span class="hd font-semibold" style="font-size:2.3rem;line-height:1.1">${vo2N(a.v)}</span> <span class="text-sm">ml/kg/min</span>${e.abs ? ` <span class="text-sm" style="color:var(--mute)">· ${vo2N(a.v * e.basis.weight / 1000, 2)} l/min</span>` : ''}</p>
      <p class="mt-1 text-sm">${k === 'L' ? wkL('Laborwert', 'Lab value') : wkL('Schätzung', 'Estimate') + ' · ' + wkL('Spanne', 'range') + ` ${vo2N(a.lo)}–${vo2N(a.hi)}`} · ${vo2ML(k)} · ${mmDay(e.date)}${k === 'F' || k === 'FR' ? wkL(' · eher Untergrenze', ' · rather a lower bound') : ''}${a.cal ? ' · ' + wkL(`kalibriert am ${mmDay(a.cal.lab.date)}`, `calibrated on ${mmDay(a.cal.lab.date)}`) : ''}</p>
      <p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Methode', 'Method')}: ${esc(VO2_SRC[e.method] || '')}</p>
      ${t4 != null || t12 != null ? `<p class="mt-2 text-sm">${t4 != null ? wkL(`Gegenüber vor 4 Wochen: ${sg(t4)}`, `Compared with 4 weeks ago: ${sg(t4)}`) : ''}${t4 != null && t12 != null ? ' · ' : ''}${t12 != null ? wkL(`vor 12 Wochen: ${sg(t12)}`, `12 weeks ago: ${sg(t12)}`) : ''} <span style="color:var(--mute)">(${wkL('Trend derselben Methode', 'trend of the same method')})</span></p>` : ''}
      <p class="mt-2 text-sm">${rel >= 5 ? wkL(`Das sind etwa ${rel} % mehr als der Median ${sex === 'f' ? 'gleichaltriger Frauen' : sex === 'm' ? 'gleichaltriger Männer' : 'gleichaltriger Erwachsener'} (etwa ${vo2N(med, 0)}).`, `That is about ${rel}% more than the median for ${sex === 'f' ? 'women' : sex === 'm' ? 'men' : 'adults'} of your age (about ${vo2N(med, 0)}).`) : wkL(`Der Median ${sex === 'f' ? 'gleichaltriger Frauen' : sex === 'm' ? 'gleichaltriger Männer' : 'gleichaltriger Erwachsener'} liegt bei etwa ${vo2N(med, 0)}. Jede Trainingswoche bringt dich weiter.`, `The median for ${sex === 'f' ? 'women' : sex === 'm' ? 'men' : 'adults'} of your age is about ${vo2N(med, 0)}. Every week of training moves you forward.`)}${cyc ? wkL(` Wettkampf-Radfahrer${sex === 'f' ? 'innen' : ''} im Alter um ${sex === 'f' ? 20 : 17} Jahre lagen im Mittel bei ${vo2N(cyc)}.`, ` Competitive ${sex === 'f' ? 'female' : 'male'} cyclists aged around ${sex === 'f' ? 20 : 17} averaged ${vo2N(cyc)}.`) : ''}</p>
      <p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Vergleich: FRIEND-Register (Fahrradergometer, USA, Kaminsky et al. 2017), Median je Alter aus den veröffentlichten Eckwerten genähert; Radsport: Jurov et al. 2023.', 'Comparison: FRIEND registry (cycle ergometer, USA, Kaminsky et al. 2017), median by age approximated from the published values; cycling: Jurov et al. 2023.')}${!age ? wkL(' Ohne Geburtsdatum rechnet die App mit 25 Jahren.', ' Without a birth date the app assumes 25 years.') : ''}</p>`; }
  const lt = vo2LastTest(), due = !lt || lt.date < iso(-56);
  const plan = due && S.p ? `<section class="panel mt-3 p-4" id="fx-v2plan"><p class="font-semibold">${wkL('VO2max-Test einplanen?', 'Schedule a VO2max test?')}</p><p class="mt-1 text-sm" style="color:var(--mute)">${lt ? wkL(`Dein letzter gültiger Test war am ${mmDay(lt.date)}, vor mehr als 8 Wochen.`, `Your last valid test was on ${mmDay(lt.date)}, more than 8 weeks ago.`) : wkL('Du hast noch keinen VO2max-Test gemacht.', 'You have not done a VO2max test yet.')} ${wkL('Die App ersetzt dafür eine Einheit dieser Woche, vorher legt sie einen Schnappschuss an (10 Minuten „Rückgängig“).', 'The app replaces one session this week; it saves a snapshot first (10 minutes to undo).')}</p>
    <div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 text-sm" style="min-height:44px" onclick="vo2PlanTest('R')">${wkL('Rampentest (Rolle)', 'Ramp test (trainer)')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="vo2PlanTest('F')">${wkL('5-min-Test (auch draußen)', '5-min test (outdoors too)')}</button></div>${vo2Msg ? `<p class="mt-2 text-sm" role="status">${esc(vo2Msg)}</p>` : ''}
    <details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer text-sm" style="color:var(--teal);min-height:44px;display:flex;align-items:center">${wkL('So läuft der Test', 'How the test works')}</summary>${vo2Guide()}</details></section>` : '';
  const chips = ['3', '6', '12', 'all'].map(k => mmBtn(vo2Rng === k, k === 'all' ? wkL('Allzeit', 'All time') : k + wkL(' Monate', ' months'), `vo2Set('rng','${k}')`)).join('');
  const hist = L.length ? `<section class="panel mt-3 p-4" id="fx-v2hist"><p class="hd text-lg font-semibold">${wkL('Verlauf', 'History')}</p><div class="mt-2 flex flex-wrap gap-2">${chips}</div><div class="mt-2 flex flex-wrap gap-2">${mmBtn(vo2Unit_ === 'rel', 'ml/kg/min', "vo2Set('unit','rel')")}${mmBtn(vo2Unit_ === 'abs', 'l/min', "vo2Set('unit','abs')")}</div>
    <div class="mt-2">${vo2Chart(vo2Unit_, vo2Rng)}</div><p class="mt-1 text-xs" style="color:var(--mute)">${wkL('ml/kg/min hängt vom Gewicht ab: Nimmst du ab, steigt der Wert, ohne dass du fitter bist. l/min zeigt die Leistung von Herz und Lunge unabhängig vom Gewicht. Trendlinien nur aus gültigen Werten, je Methode getrennt.', 'ml/kg/min depends on body weight: lose weight and it rises without you being fitter. l/min shows heart and lung capacity independent of weight. Trend lines only from valid values, separately per method.')}</p>
    <ul class="mt-2">${L.slice().reverse().slice(0, 12).map(vo2Row).join('')}</ul></section>` : '';
  return `<section class="panel p-4" id="fx-v2" data-noi18n>${top}${vo2HrWarn()}</section><div data-noi18n>${plan}${hist}${vo2Coach()}${vo2CalUi()}${vo2FormUi()}${vo2Info()}</div>`;
}
function vo2Guide(){
  return `<ul class="mt-1 list-disc pl-4"><li>${wkL('Ausgeruht, nach einem Ruhetag oder lockeren Tag. Kein hartes Training am Vortag.', 'Rested, after a rest or easy day. No hard training the day before.')}</li><li>${wkL('Gleiche Bedingungen bei jedem Test: gleiche Rolle oder gleicher Anstieg, ähnliche Uhrzeit, Ventilator, Trinkflasche.', 'Same conditions every time: same trainer or climb, similar time of day, fan, bottle.')}</li><li>${wkL('Rampe: 15 min einfahren, dann ab 100 W jede Minute +20 W bis zur Erschöpfung (Protokoll nach Jurov et al. 2023). Unter 17 Jahren oder unter 50 kg: ab 60 W, +15 W.', 'Ramp: 15 min warm-up, then from 100 W add 20 W every minute until exhaustion (protocol of Jurov et al. 2023). Under 17 or under 50 kg: from 60 W, +15 W.')}</li><li>${wkL('5 Minuten: gleichmäßig, nicht lossprinten, ohne Unterbrechung.', '5 minutes: steady, no sprint start, no interruption.')}</li><li>${wkL('Gültig ist ein Test, wenn du ausbelastet warst: Spitzenpuls mindestens 95 % deiner HFmax oder Puls steigt bis zum Ende.', 'A test counts if you were maximal: peak heart rate at least 95% of your max HR or heart rate rising to the end.')}</li></ul>`;
}
/* Trainer-Hinweis: FTP im Verhältnis zur Leistung bei VO2max (pVO2max ≈ 5-min-Bestwert der letzten 8 Wochen bzw. Pmax der Rampe).
   Grenzen 85 % und 75 % sind Richtwerte der App (Vorgabe aus der Planung), keine belegten Schwellen. */
function vo2Coach(){
  const ftp = S.p && S.p.ftp; if (!ftp) return '';
  const b5 = mmBest(iso(-55), iso(0))[mmIx(300)], lt = vo2List().filter(e => e.valid && e.method === 'R' && e.date >= iso(-84)).pop();
  const pv = b5 ? b5.w : 0; if (!pv) return '';
  const r = ftp / pv, pc = Math.round(r * 100);
  const txt = r > .85 ? wkL('Deine FTP liegt schon nahe an deiner Leistung bei VO2max. Weitere FTP-Steigerung kommt vor allem über eine höhere VO2max: Ein Block mit 1–2 VO2max-Einheiten pro Woche (z. B. 5× 4 min) ist sinnvoll.', 'Your FTP is already close to your power at VO2max. Further FTP gains will mainly come from a higher VO2max: a block with 1–2 VO2max sessions per week (e.g. 5× 4 min) makes sense.')
    : r < .75 ? wkL('Zwischen FTP und deiner Leistung bei VO2max ist noch viel Raum. Schwellen- und Sweet-Spot-Arbeit bringt dir gerade mehr als zusätzliche VO2max-Intervalle.', 'There is still plenty of room between your FTP and your power at VO2max. Threshold and sweet spot work gives you more right now than extra VO2max intervals.')
    : wkL('FTP und Leistung bei VO2max sind ausgewogen. Beides weiter trainieren, wie es der Plan vorsieht.', 'FTP and power at VO2max are balanced. Keep training both as the plan intends.');
  return `<section class="panel mt-3 p-4" id="fx-v2coach"><p class="hd text-lg font-semibold">${wkL('Was das fürs Training heißt', 'What this means for training')}</p><p class="mt-1 text-sm">${wkL(`FTP ${ftp} W = ${pc} % deiner 5-min-Leistung (${pv} W, Näherung für die Leistung bei VO2max)${lt && lt.basis.p ? `, ${Math.round(ftp / lt.basis.p * 100)} % der Pmax im Rampentest (${lt.basis.p} W)` : ''}.`, `FTP ${ftp} W = ${pc}% of your 5-min power (${pv} W, an approximation of power at VO2max)${lt && lt.basis.p ? `, ${Math.round(ftp / lt.basis.p * 100)}% of ramp Pmax (${lt.basis.p} W)` : ''}.`)}</p><p class="mt-1 text-sm">${txt}</p><p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Richtwerte der App (über 85 % hoch, unter 75 % niedrig), keine belegten Grenzen. Den Plan ändert die App deshalb nicht.', 'App guide values (above 85% high, below 75% low), not established thresholds. The app therefore does not change your plan.')}</p></section>`;
}
function vo2CalUi(){
  const labs = vo2List().filter(e => e.method === 'L'); if (!labs.length) return '';
  const rows = ['R', 'F', 'G', 'FR'].map(k => { const c = vo2Cal(k); if (!c) return ''; const age = (dOnly(iso(0)) - dOnly(c.lab.date)) / 864e5; return `<li class="text-sm">${vo2ML(k)}: ${c.off >= 0 ? '+' : '−'}${vo2N(Math.abs(c.off))} ml/kg/min (${wkL('Labor', 'lab')} ${mmDay(c.lab.date)}, ${wkL('Feldwert', 'field value')} ${mmDay(c.pair.date)})${age > VO2_CALMAX ? ` · <b>${wkL('abgelaufen, neuer Labortest empfohlen', 'expired, new lab test recommended')}</b>` : ''}</li>`; }).join('');
  return `<section class="panel mt-3 p-4" id="fx-v2cal"><p class="hd text-lg font-semibold">${wkL('Kalibrierung mit Laborwert', 'Calibration with lab value')}</p><p class="mt-1 text-sm" style="color:var(--mute)">${wkL('Liegt ein Feldwert höchstens 14 Tage neben einem Laborwert, korrigiert die App spätere Werte dieser Methode um den Unterschied, für 12 Monate. Der Rohwert bleibt sichtbar.', 'If a field value lies within 14 days of a lab value, the app corrects later values of that method by the difference, for 12 months. The raw value stays visible.')}</p>${rows ? `<ul class="mt-2 list-disc pl-4">${rows}</ul>` : `<p class="mt-2 text-sm">${wkL('Noch kein Feldwert innerhalb von 14 Tagen um einen Laborwert.', 'No field value within 14 days of a lab value yet.')}</p>`}<label class="mt-2 flex items-center gap-2 text-sm" style="min-height:44px"><input type="checkbox" ${S.vo2CalOff ? '' : 'checked'} onchange="vo2CalTog()" style="width:22px;height:22px">${wkL('Kalibrierung verwenden', 'Use calibration')}</label></section>`;
}
function vo2FormUi(){
  if (!vo2Form) return `<div class="mt-3 flex flex-wrap gap-2"><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="vo2FormOpen('L')">${wkL('Laborwert eintragen', 'Enter lab value')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="vo2FormOpen('G')">${wkL('Garmin-Wert übernehmen', 'Take over Garmin value')}</button></div>`;
  const m = vo2Form.m, kg = mmKgAt(iso(0));
  return `<section class="panel mt-3 p-4" id="fx-v2form"><p class="hd text-lg font-semibold">${m === 'L' ? wkL('Laborwert eintragen', 'Enter lab value') : wkL('Garmin-Wert übernehmen', 'Take over Garmin value')}</p>${m === 'G' ? `<p class="mt-1 text-sm" style="color:var(--mute)">${wkL('Den Wert „VO2max Radfahren“ findest du in Garmin Connect unter Leistungswerte. Garmin schätzt ihn aus Puls und Leistung; er stimmt nur mit richtiger HFmax.', 'You find “VO2max cycling” in Garmin Connect under performance stats. Garmin estimates it from heart rate and power; it is only right with a correct max HR.')}</p>` : ''}
    <div class="mt-2 grid grid-cols-2 gap-2"><label class="text-xs" style="color:var(--mute)">${wkL('Datum', 'Date')}<input id="v2Date" type="date" class="inp" style="min-height:44px" value="${esc(iso(0))}" max="${esc(iso(0))}"></label><label class="text-xs" style="color:var(--mute)">VO2max<input id="v2Val" type="text" inputmode="decimal" class="inp" style="min-height:44px"></label>
    <label class="text-xs" style="color:var(--mute)">${wkL('Einheit', 'Unit')}<select id="v2Unit" class="inp" style="min-height:44px"><option value="rel">ml/kg/min</option><option value="abs">l/min</option></select></label><label class="text-xs" style="color:var(--mute)">${wkL('Gewicht (kg)', 'Weight (kg)')}<input id="v2Kg" type="text" inputmode="decimal" class="inp" style="min-height:44px" value="${esc(vo2N(kg))}"></label>
    ${m === 'L' ? `<label class="text-xs" style="color:var(--mute)">${wkL('Pmax im Labortest (W, optional)', 'Pmax in lab test (W, optional)')}<input id="v2Po" type="text" inputmode="numeric" class="inp" style="min-height:44px"></label>` : ''}<label class="text-xs" style="color:var(--mute)">${wkL('Ort / Notiz', 'Place / note')}<input id="v2Note" type="text" class="inp" style="min-height:44px" maxlength="120"></label></div>
    ${vo2Form.msg ? `<p class="mt-2 text-sm" role="alert" style="color:#c0392b">${esc(vo2Form.msg)}</p>` : ''}<div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-4 text-sm" style="min-height:44px" onclick="vo2Save()">${wkL('Speichern', 'Save')}</button><button class="ghost !w-auto !px-4 text-sm" style="min-height:44px" onclick="vo2Form=null;render()">${wkL('Abbrechen', 'Cancel')}</button></div></section>`;
}
function vo2Info(){
  return `<details class="mt-3 text-xs" style="color:var(--mute)"><summary class="cursor-pointer text-sm" style="color:var(--teal);min-height:44px;display:flex;align-items:center">${wkL('Wie genau ist das?', 'How accurate is this?')}</summary><p class="mt-1">${wkL('Gemessen wird die VO2max nur im Labor (Spiroergometrie). Alles andere sind Schätzungen, realistisch auf etwa 5–10 % genau. Rampentest: Formel nach Jurov et al. 2023 aus 580 Wettkampf-Radfahrern, Schätzfehler etwa ±4 ml/kg/min; für Fahrer weit unter 5 W/kg ist die Unsicherheit größer. 5-min-Test: Formel nach Sitko et al. 2022; eine unabhängige Prüfung (Borszcz et al. 2024) fand im Mittel 6,6 ml/kg/min zu wenig, darum gilt der Wert als Untergrenze. Garmin: ±5 %, bei sehr Fitten eher zu niedrig. Nicht verwendet werden Formeln nur aus Alter, Größe und Gewicht oder eine Umrechnung aus der FTP.', 'VO2max is only measured in a lab (cardiopulmonary exercise test). Everything else is an estimate, realistically within about 5–10%. Ramp test: equation of Jurov et al. 2023 from 580 competitive cyclists, error about ±4 ml/kg/min; for riders well below 5 W/kg the uncertainty is larger. 5-min test: equation of Sitko et al. 2022; an independent check (Borszcz et al. 2024) found it 6.6 ml/kg/min too low on average, so the value is a lower bound. Garmin: ±5%, rather too low for very fit riders. Not used: equations from age, height and weight only, or a conversion from FTP.')}</p></details>`;
}
/* Fortschritt: Untertitel der Zeile */
function vo2Sub(){ try { const pk = vo2Pick(); if (!pk) return wkL('Noch kein Wert · Test, Labor oder Garmin', 'No value yet · test, lab or Garmin'); const a = vo2Adj(pk.e); return `${vo2N(a.v)} ml/kg/min · ${vo2ML(vo2Kind(pk.e))} · ${mmDay(pk.e.date)}`; } catch (e) { elog(e); return 'VO2max'; } }
function dykVo2(){ goPg('state'); goPg('svo2'); dykFocus('fx-v2'); }
