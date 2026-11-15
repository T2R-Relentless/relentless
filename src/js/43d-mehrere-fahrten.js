/* ---------- F30 (15.11.2026): Mehrere Fahrten an einem Tag ----------
   Fehler vorher: exeAuto ordnete die geplante Einheit der ersten Fahrt des Tages zu (Garmin-Abgleich und Hochladen gehen
   nach Startzeit vor), jede weitere Fahrt wurde Zusatzfahrt. Wer die Anfahrt eigens aufzeichnete, bekam die Anfahrt bewertet.
   Jetzt:
   - Belastung zählt immer komplett: Jede Fahrt bleibt eigener Datensatz in S.man (unverändert) und geht mit ihrem TSS in
     Woche, Formkurve und Logbuch ein. Die Zuordnung entscheidet nur, welche Fahrt die geplante Einheit erfüllt.
   - Passwert 0–1 je geplanter Einheit und Fahrt (bzw. Gruppe): Struktur (Intervalle erkannt), Zonenverteilung, Dauer, TSS,
     bei Pendeltagen schwach die Tageszeit. Zugeordnet wird die beste Kombination (kleine Zuordnungstabelle).
   - Zusammenführen nur als Vorschlag (Pause ≤ 30 Min.), Rückfrage nur bei Unsicherheit, Korrektur jederzeit.
   - Zuordnungen liegen im Plan (S.p.mf) und damit in der Sicherungsdatei:
     r[Fahrt-ID] = {role:'auto'|'training'|'commute', sid (Einheit „Woche-Tag[-Teil]“ oder null), src:'auto'|'user', sc, why, prov}
     g[Gruppen-ID] = {gid, ids, by:'user'|'suggestion-accepted', at, day, role, sid, src, sc, why}
     pair[„A|B“] = 'sep'|'join' (beantwortete Vorschläge), ask[Tag] = {open|done, unit}, sug[Tag] = [A, B], none[Einheit] = 1,
     stale[…] = frühere Anpassung, die auf der alten Zuordnung beruhte, old = Hinweis für Tage von vor dem Update.
   - Vom Nutzer gesetzte Zuordnungen (src 'user') überschreibt keine spätere Berechnung. */
Object.assign(IC_P, {
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
  unlink:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7"/><path d="M4 4l16 16"/>',
  commute:'<path d="M4 17h16M6 17V9l6-4 6 4v8"/><path d="M10 17v-4h4v4"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'
});
/* Konstanten (Begründung im Bericht F30) */
const MF_MIN = 600;           /* Fahrten unter 10 Min. erfüllen keine Einheit */
const MF_GAP = 1800;          /* Pause bis 30 Min.: Vorschlag „Zusammenführen“ */
const MF_ASK_GAP = .15;       /* Rückfrage, wenn die zwei besten Passwerte enger beieinander liegen … */
const MF_ASK_LOW = .4;        /* … oder der beste Wert darunter liegt */
const MF_WT = {iv:{st:.5, z:.2, d:.2, t:.1}, ez:{z:.45, d:.35, t:.2}, tm:.05};
const mfL = (de, en) => wkL(de, en);
const mfSec = {};             /* Sekundenreihen der zuletzt eingelesenen Fahrten (nur im Speicher) */
let mfMenu = null, mfUndo = null;

function mfSt(){
  if (!S.p) return null; const m = S.p.mf = S.p.mf && typeof S.p.mf === 'object' ? S.p.mf : {};
  ['r', 'g', 'pair', 'ask', 'sug', 'none', 'stale'].forEach(k => { if (!m[k] || typeof m[k] !== 'object' || Array.isArray(m[k])) m[k] = {}; });
  return m;
}
const mfMf = () => (S.p && S.p.mf) || {};
const mfRole = id => { const m = mfMf(), g = mfGid(id); if (g && m.g[g] && m.g[g].role === 'commute') return 'commute'; return (m.r && m.r[id] && m.r[id].role) || 'auto'; };
const mfIsCommute = id => mfRole(id) === 'commute';
function mfGid(id){ const g = mfMf().g; if (!g) return null; for (const k in g) if (g[k] && (g[k].ids || []).includes(id)) return k; return null; }
const mfRide = id => (S.man || []).find(a => a && a.id === id) || null;
const mfStart = a => Date.parse(a.ts);
const mfEnd = a => a.te ? Date.parse(a.te) : Date.parse(a.ts) + (a.sec || 0) * 1000;
const mfClock = a => { const d = new Date(a.ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const mfDayRides = day => (S.man || []).filter(a => a && a.day === day && a.ts).sort((p, q) => p.ts.localeCompare(q.ts));
const mfPairK = (a, b) => [a, b].sort().join('|');

/* ---- Sekundenreihen ---- */
function mfKeepSec(a){
  if (!a || !a.id || !a.vzSec) return; mfSec[a.id] = {p:a.vzSec.p, h:a.vzSec.h, ser:a.vzSer || null};
  const ks = Object.keys(mfSec); if (ks.length > 30) ks.slice(0, ks.length - 30).forEach(k => { delete mfSec[k]; });
}
/* Aus der gespeicherten Kurzreihe der Bewertung (alle B Sekunden ein Wert) wieder eine Sekundenreihe machen (Näherung) */
function mfExpand(s, k){ const a = s && s[k]; if (!a || !a.some(v => v != null)) return null; const o = []; a.forEach(v => { for (let j = 0; j < s.b; j++) o.push(v); }); return o.slice(0, s.n || o.length); }
function mfStream(id){
  if (mfSec[id]) return mfSec[id];
  const p = S.p || {}, L = [(p.extra || {})[id], ...Object.values(p.exe || {}).filter(e => e && e.rid === id && !e.grp), ...Object.values(p.exeP || {}).flat().filter(e => e && e.rid === id)];
  const e = L.find(z => z && z.ser && !z.ser.gaps); if (!e) return null;
  return {p:mfExpand(e.ser, 'p'), h:mfExpand(e.ser, 'h'), ser:e.ser, approx:1};
}
const mfHist = H => { if (!H) return null; const h = {}; let n = 0; H.forEach(v => { if (v == null || v < 35 || v > 230) return; const k = Math.round(v); h[k] = (h[k] || 0) + 1; n++; }); return n > 300 ? h : null; };
const mfHistAdd = L => { const h = {}; let n = 0; L.forEach(x => { if (!x) return; for (const k in x) { h[k] = (h[k] || 0) + x[k]; n += x[k]; } }); return n > 300 ? h : null; };

/* ---- Kandidat: eine Fahrt oder eine Gruppe (zusammengeführte Fahrten) ---- */
function mfCand(ids, gid){
  const rs = ids.map(mfRide).filter(Boolean); if (!rs.length) return null;
  const st = rs.map(a => mfStream(a.id)), one = rs.length === 1, a0 = rs[0], ftp = (S.p && S.p.ftp) || 0;
  const P = [], H = [], brk = []; let okP = true, okH = true;
  st.forEach((s, k) => { const n = s && (s.p || s.h) ? (s.p || s.h).length : 0; if (!n) { okP = okH = false; return; } if (k) brk.push(P.length); if (!s.p) okP = false; if (!s.h) okH = false;
    for (let j = 0; j < n; j++) { P.push(s.p ? s.p[j] : null); H.push(s.h ? s.h[j] : null); } });
  const sum = k => rs.reduce((q, a) => q + (a[k] || 0), 0), sec = sum('sec');
  let a;
  if (one) a = {...a0};
  else {
    /* NP der Gruppe = vierte Wurzel aus dem zeitgewichteten Mittel der vierten Potenzen der Einzel-NP. Das entspricht dem Mittel
       über alle 30-s-Fenster beider Fahrten, ohne dass ein Fenster über die Pause reicht und ohne die Pause als 0 W. */
    const wp = rs.filter(r => r.np > 0 && !r.est), npG = wp.length === rs.length ? Math.pow(rs.reduce((q, r) => q + Math.pow(r.np, 4) * r.sec, 0) / Math.max(1, sec), .25) : 0;
    const hrS = rs.filter(r => r.hrA > 0), hrA = hrS.length ? Math.round(hrS.reduce((q, r) => q + r.hrA * r.sec, 0) / hrS.reduce((q, r) => q + r.sec, 0)) : 0;
    const IF = npG && ftp ? npG / ftp : Math.sqrt(sum('tss') * 36 / Math.max(1, sec));
    a = {id:gid, n:rs.map(r => r.n).join(' + ').slice(0, 120), ts:a0.ts, te:rs[rs.length - 1].te || null, day:a0.day, sec, km:Math.round(sum('km') * 10) / 10, hm:sum('hm'), tss:sum('tss'),
      np:Math.round(npG), IF:Math.round(IF * 100) / 100, est:rs.some(r => r.est), hrA, hrW:mfHistAdd(rs.map(r => r.hrW)), hb:rs.map(r => r.hb).filter(Boolean).join(','), brk, grp:ids.slice(),
      tAvg:rs.some(r => r.tAvg != null) ? Math.round(rs.reduce((q, r) => q + (r.tAvg || 0) * r.sec, 0) / sec) : undefined, in:rs.every(r => r.in) ? 1 : undefined, src:a0.src};
    ['m1', 'm5', 'm20', 'm60'].forEach(k => { const v = Math.max(0, ...rs.map(r => r[k] || 0)); if (v) a[k] = v; });
  }
  const Pn = okP && P.length ? P : null, Hn = okH && H.length ? H : null;
  return {id:one ? a0.id : gid, ids:rs.map(r => r.id), rs, st, P:Pn, H:Hn, brk:one ? [] : brk, a, hist:mfHist(Hn) || (one ? a0.hrW || null : a.hrW), approx:st.some(s => s && s.approx)};
}
/* Kurzreihe für die Grafik einer Gruppe: Abschnitte hintereinander, die Pause als sichtbare Lücke (höchstens 10 Min.) */
function mfSerOf(c){
  if (!(c.P || c.H)) return null; const P = [], H = [], Z = [], gaps = [];
  c.rs.forEach((r, k) => { const s = c.st[k], n = s ? (s.p || s.h || []).length : 0;
    if (k) { const g = Math.max(0, Math.min(600, Math.round((mfStart(r) - mfEnd(c.rs[k - 1])) / 1000))) || 60; gaps.push([P.length, P.length + g]); for (let j = 0; j < g; j++) { P.push(null); H.push(null); Z.push(null); } }
    const z = s && s.ser && s.ser.z ? mfExpand(s.ser, 'z') : null;
    for (let j = 0; j < n; j++) { P.push(s.p ? s.p[j] : null); H.push(s.h ? s.h[j] : null); Z.push(z ? z[j] : null); } });
  const B = Math.max(5, Math.ceil(P.length / 600)), agg = arr => { if (!arr.some(v => v != null)) return null; const o = []; for (let s = 0; s < arr.length; s += B) { let n = 0, t = 0; for (let j = s; j < Math.min(arr.length, s + B); j++) if (arr[j] != null) { n++; t += arr[j]; } o.push(n ? Math.round(t / n) : null); } return o; };
  return {b:B, n:P.length, p:agg(P), h:agg(H), z:agg(Z), gaps};
}
/* Für das Speichern einer Bewertung (vzKeep): Sekundenreihe ohne Pause, Kurzreihe mit Lücke */
function mfAttach(a, c){
  const n = c.P ? c.P.length : c.H ? c.H.length : 0; if (!n) return a;
  Object.defineProperty(a, 'vzSec', {value:{p:c.P || new Array(n).fill(null), h:c.H || new Array(n).fill(null)}, enumerable:false, configurable:true});
  const ser = c.ids.length === 1 ? (c.st[0] && c.st[0].ser) || null : mfSerOf(c);
  if (ser) Object.defineProperty(a, 'vzSer', {value:ser, enumerable:false, configurable:true});
  return a;
}

/* ---- Passwert ---- */
const mfZi = pct => { const k = VZ_ZP.findIndex(z => pct < z[1]); return k < 0 ? VZ_ZP.length - 1 : k; };
function mfZoneSim(x, P, ftp){
  try { const bl = wkBlocks(x); if (!bl.length) return null; const ex = VZ_ZP.map(() => 0), ac = VZ_ZP.map(() => 0); let te = 0, ta = 0;
    bl.forEach(b => { ex[mfZi(wkMid(b))] += b.d; te += b.d; });
    let s = 0; for (let k = 0; k < P.length; k++) { s += P[k] || 0; if (k >= 30) s -= P[k - 30] || 0; if (k >= 29) { ac[mfZi(s / 30 / ftp * 100)]++; ta++; } }
    if (!te || !ta) return null; let d = 0; for (let k = 0; k < ex.length; k++) d += Math.abs(ex[k] / te - ac[k] / ta); return Math.max(0, 1 - d / 2);
  } catch (e) { elog(e); return null; }
}
function mfScore(u, c){
  const x = u.x, ftp = (S.p && S.p.ftp) || 0, a = c.a, P = c.P, hasP = !!(ftp && P && P.length > 120 && P.filter(v => v != null).length > .5 * P.length);
  const q = x.iv, ivOn = !!(q && q.work >= .5 && q.reps && x.t !== 'test'), W = ivOn ? MF_WT.iv : MF_WT.ez, pt = {};
  const dr = a.sec / 60 / Math.max(1, x.m || 1); pt.d = Math.max(0, 1 - Math.abs(Math.log(Math.max(.01, dr))) / Math.log(2.5));
  const pT = tss(x); if (pT > 0 && a.tss > 0) pt.t = Math.max(0, 1 - Math.abs(Math.log(a.tss / pT)) / Math.log(3));
  if (hasP) pt.z = mfZoneSim(x, P, ftp);
  if (pt.z == null) { const IFx = tssIF(x), IFa = a.np && ftp && !a.est ? a.np / ftp : a.IF || 0; if (IFx > 0 && IFa > 0) pt.z = Math.max(0, 1 - Math.abs(IFa - IFx) / .2); else delete pt.z; }
  if (ivOn && hasP) {
    const N = (q.sets || 1) * q.reps, Wn = Math.round(q.work * 60), v = P.map(z => z || 0), f = findIv(v, Wn, N, Math.round(Math.min(q.rest * 60, Wn) * .5), c.brk);
    let s = 0, nIn = 0; f.forEach(z => { const pc = z.p / ftp * 100; const st = pc < q.lo * .85 ? 0 : pc < q.lo * .97 ? .4 : pc > q.hi * 1.03 ? .6 : 1; s += st; if (st === 1) nIn++; });
    pt.st = s / N; pt.nIn = nIn; pt.N = N;
  }
  if (u.p != null && a.ts) { const h = new Date(a.ts).getHours(); pt.tm = (u.p === 0) === (h < 12) ? 1 : 0; }
  let sw = 0, sv = 0; [['st', W.st || 0], ['z', W.z], ['d', W.d], ['t', W.t], ['tm', MF_WT.tm]].forEach(([k, w]) => { if (pt[k] != null && w) { sw += w; sv += w * pt[k]; } });
  return {v:sw ? Math.round(sv / sw * 100) / 100 : 0, pt, dr:Math.round(dr * 100) / 100};
}
/* Erklärtext für die Detailansicht */
function mfWhy(u, c, sc){
  const x = u.x, q = x.iv, p = sc.pt, grp = c.ids.length > 1;
  const zn = q ? (VZ_ZP[mfZi((q.lo + q.hi) / 2)] || [])[3] || '' : '';
  if (p.st != null && p.nIn >= Math.ceil(p.N / 2)) return mfL(`Zugeordnet, weil hier die ${p.N} × ${exeNum(q.work)} Min. ${zn} erkannt wurden${grp ? ' (über beide Abschnitte, ohne die Pause)' : ''}.`, `Assigned because the ${p.N} × ${exeNum(q.work)} min ${zn === 'Schwelle' ? 'threshold' : zn === 'VO2max' ? 'VO2max' : zn === 'Tempo' ? 'tempo' : 'intervals'} were detected here${grp ? ' (across both sections, without the break)' : ''}.`);
  if (p.st != null) return mfL(`Zugeordnet, weil diese Fahrt am ehesten zur geplanten Einheit passt. Die Intervalle wurden aber nur teilweise erkannt (${p.nIn} von ${p.N}).`, `Assigned because this ride fits the planned session best. The intervals were only partly detected (${p.nIn} of ${p.N}).`);
  return mfL(`Zugeordnet, weil Dauer (${mm(Math.round(c.a.sec / 60))} von ${mm(x.m)}) und Intensität am besten zur geplanten Einheit passen.`, `Assigned because duration (${mm(Math.round(c.a.sec / 60))} of ${mm(x.m)}) and intensity fit the planned session best.`);
}

/* ---- Geplante Einheiten eines Tages ---- */
function mfWeekOf(day){ if (!S.p || !S.p.start || !day) return null; const d = Math.round((new Date(day + 'T12:00:00') - new Date(S.p.start + 'T12:00:00')) / 864e5); return d < 0 ? null : {w:Math.floor(d / 7) + 1, i:d % 7}; }
function mfUnits(day){
  if (!S.p || !S.plan) return []; const q = mfWeekOf(day); if (!q) return [];
  if (q.w === S.wk) { const x = S.plan[q.i]; if (!x || !(x.m > 0) || x.t === 'rest') return [];
    if (x.parts) return x.parts.map((p, k) => ({key:`${q.w}-${q.i}-${k}`, w:q.w, i:q.i, p:k, x:partX(x, k), n:`${x.n} · ${p.lbl}`}));
    return [{key:`${q.w}-${q.i}`, w:q.w, i:q.i, x, n:x.n}]; }
  if (q.w > S.wk) return [];
  const e = (S.p.exe || {})[q.w + '-' + q.i]; if (!e || !e.x || e.parts || !(e.x.m > 0)) return [];
  return [{key:`${q.w}-${q.i}`, w:q.w, i:q.i, x:e.x, n:e.x.n || e.plan, past:1}];
}
function mfCur(u){ if (u.p != null) return exePArr(u.w, u.i)[u.p] || null; const e = ((S.p && S.p.exe) || {})[u.key]; return e && !e.parts ? e : null; }

/* ---- Berechnen (ohne Ändern) ---- */
function mfCands(day, rides){
  const m = mfSt(), out = [], inG = new Set();
  Object.values(m.g).forEach(g => { if (!g || g.day !== day || g.role === 'commute') return; const c = mfCand(g.ids, g.gid); if (c && c.ids.length > 1) { out.push(c); c.ids.forEach(id => inG.add(id)); } });
  rides.forEach(a => { if (inG.has(a.id) || mfGid(a.id) || mfIsCommute(a.id) || (a.sec || 0) < MF_MIN) return; const c = mfCand([a.id]); if (c) out.push(c); });
  return out;
}
function mfBest(units, cands, fixed){
  const free = units.filter(u => !(u.key in fixed)), used = new Set(Object.values(fixed).filter(Boolean)), pool = cands.filter(c => !used.has(c.id));
  let best = {sum:-1, map:{}};
  const rec = (k, map, sum, taken) => {
    if (k === free.length) { if (sum > best.sum + 1e-9) best = {sum, map:{...map}}; return; }
    const u = free[k]; pool.forEach(c => { if (taken.has(c.id)) return; taken.add(c.id); map[u.key] = c.id; rec(k + 1, map, sum + c.sc[u.key].v, taken); taken.delete(c.id); });
    map[u.key] = null; rec(k + 1, map, sum, taken); delete map[u.key];
  };
  rec(0, {}, 0, new Set()); return {...best.map, ...fixed};
}
function mfCompute(day){
  const m = mfSt(); if (!m) return null; const units = mfUnits(day), rides = mfDayRides(day), cands = mfCands(day, rides);
  cands.forEach(c => { c.sc = {}; units.forEach(u => { c.sc[u.key] = mfScore(u, c); }); });
  const fixed = {};
  units.forEach(u => { if (m.none[u.key]) fixed[u.key] = null; });
  cands.forEach(c => { const r = c.ids.length > 1 ? m.g[c.id] : m.r[c.id]; if (r && r.src === 'user' && r.sid && units.some(u => u.key === r.sid)) fixed[r.sid] = c.id; });
  const map = mfBest(units, cands, fixed), ask = [];
  units.forEach(u => { if (u.key in fixed || cands.length < 2) return; const L = cands.map(c => c.sc[u.key].v).sort((p, q) => q - p);
    if (L[0] < MF_ASK_LOW || L[0] - L[1] < MF_ASK_GAP) ask.push(u.key); });
  return {day, units, rides, cands, map, fixed, ask};
}

/* ---- Anwenden ---- */
const MF_RE = () => mfL('Neu bewertet nach Änderung der Zuordnung. Der Plan bleibt, wie er ist.', 'Re-evaluated after the assignment changed. The plan stays as it is.');
function mfEvalStore(u, c, cur, re){
  const a = mfAttach({...c.a}, c), ftp = S.p.ftp, sv = exeShow; let e;
  if (!re && !u.past && !cur) {
    /* Erste Zuordnung des Tages: wie bisher (exeStore/exePStore, mit Rückmeldung zur Woche) */
    e = u.p != null ? exePStore(u.i, u.p, a, c.P, c.hist) : exeStore(u.i, a, c.P, c.hist);
  } else {
    e = exeEval(u.x, a, c.P, ftp, c.hist); try { vzKeep(e, a); } catch (er) { elog(er); }
    e.adj = MF_RE(); e.re = {at:Date.now(), was:cur ? cur.rid : null, wasN:cur ? cur.n : null, wasS:cur ? cur.score : null};
    if (u.p != null) { e.part = u.p; e.lbl = S.plan[u.i].parts[u.p].lbl; S.p.exeP = S.p.exeP || {}; const k = u.w + '-' + u.i, arr = S.p.exeP[k] = [...(S.p.exeP[k] || S.plan[u.i].parts.map(() => null))]; arr[u.p] = e; exeCombine(u.w, u.i); }
    else { S.p.exe = S.p.exe || {}; S.p.exe[u.key] = e;
      if (!u.past) { const x = S.plan[u.i]; S.done[u.i] = !!(e.dr >= .6 && hasStarted(S.p) && e.verdict !== 'wrong' && !(e.verdict === 'nodata' && x.t === 'test')); }
      /* Bewertung jetzt „deutlich unter dem Ziel“: Entschärfen nur als Vorschlag */
      if (!u.past && e.verdict === 'under') { const j = exeSoftIdx(u.i); if (j >= 0) e.acts.push([mfL(`„${S.plan[j].n}“ am ${DAYS[j]} reduzieren`, `Reduce “${S.plan[j].n}” on ${I_WD[SD[j]] || SD[j]}`), `mfSoften(${ja(j)})`, 0]); }
    }
    try { lbSync(false); } catch (er) { elog(er); }
  }
  exeShow = sv; if (!e) return null;
  if (c.ids.length > 1) e.grp = c.ids.slice(); else delete e.grp;
  return e;
}
function mfDrop(u, cur){
  if (u.p != null) { const k = u.w + '-' + u.i; if (S.p.exeP && S.p.exeP[k]) { S.p.exeP[k] = [...S.p.exeP[k]]; S.p.exeP[k][u.p] = null; if (!S.p.exeP[k].some(Boolean)) delete S.p.exeP[k]; } exeCombine(u.w, u.i); }
  else { delete S.p.exe[u.key]; if (!u.past && S.done) S.done[u.i] = false; }
  /* Eine frühere automatische Reduzierung beruhte auf der falschen Fahrt: Zurücknehmen anbieten */
  if (cur && /^Deshalb hat die App/.test(cur.adj || '') && !u.past && S.plan) { const j = S.plan.findIndex(y => y && y.adapted && y.orig && / \(reduziert\)$/.test(y.n || '')); if (j >= 0) mfSt().stale['soft-' + u.key] = {k:'soft', j, n:S.plan[j].orig.n, at:Date.now()}; }
}
function mfExtraOff(id){
  const x = S.p.extra && S.p.extra[id]; if (!x) return;
  if (x.prop && x.prop.st === 'ok') mfSt().stale['x-' + id] = {k:'x', rec:x, at:Date.now()};
  delete S.p.extra[id];
}
function mfApply(R, re){
  const m = mfSt(), ch = []; if (!R) return ch;
  const byId = Object.fromEntries(R.cands.map(c => [c.id, c])), assigned = new Set();
  R.units.forEach(u => { const nid = R.map[u.key]; if (nid) byId[nid].ids.forEach(id => assigned.add(id)); });
  /* Fahrten, die eine Einheit verlieren, merken: sie werden zusätzliche Fahrten */
  const lost = new Set();
  R.units.forEach(u => {
    const cur = mfCur(u), cid = cur ? cur.rid : null, nid = R.map[u.key] || null;
    if (cid === nid && !(nid && byId[nid] && !!cur.grp !== byId[nid].ids.length > 1)) { if (nid && byId[nid]) mfMark(byId[nid], u, R, false); return; }
    if (cur) { (cur.grp || [cid]).forEach(id => { if (!assigned.has(id)) lost.add(id); }); mfDrop(u, cur); }
    if (nid) { const c = byId[nid]; c.ids.forEach(id => mfExtraOff(id)); const e = mfEvalStore(u, c, cur, re); if (e) { e.mfWhy = mfWhy(u, c, c.sc[u.key]); mfMark(c, u, R, true); } }
    ch.push({u:u.key, from:cid, to:nid});
  });
  /* Nicht zugeordnete Rollen zurücksetzen (sid) */
  R.rides.forEach(a => { const r = m.r[a.id]; if (r && r.sid && !assigned.has(a.id) && !mfGid(a.id)) { r.sid = null; delete r.prov; } });
  Object.values(m.g).forEach(g => { if (g && g.day === R.day && g.sid && !g.ids.some(id => assigned.has(id))) { g.sid = null; delete g.prov; } });
  /* Zusätzliche Fahrten: wer keine Einheit (mehr) hat und kein Pendeln ist, wird wie bisher als Zusatzfahrt ausgewertet */
  R.rides.forEach(a => {
    if (assigned.has(a.id)) return;
    if (mfIsCommute(a.id)) { mfExtraOff(a.id); return; }
    const g = mfGid(a.id); if (g) { mfExtraOff(a.id); if (!assigned.has(a.id) && lost.has(a.id)) mfGroupExtra(g); return; }
    if (lost.has(a.id) || (re && !(S.p.extra || {})[a.id])) { const c = mfCand([a.id]); if (c) { try { exeExtra(mfAttach({...a}, c), c.P, c.hist); } catch (er) { elog(er); } } }
  });
  mfLbFix(R.day);
  return ch;
}
/* Gruppe ohne Einheit: als eine zusätzliche Fahrt auswerten */
function mfGroupExtra(gid){ const g = mfMf().g[gid]; if (!g) return; const c = mfCand(g.ids, gid); if (!c || (S.p.extra || {})[gid]) return; try { const e = exeExtra(mfAttach({...c.a}, c), c.P, c.hist); if (e) e.grp = c.ids.slice(); } catch (er) { elog(er); } }
function mfMark(c, u, R, fresh){
  const m = mfSt(), sc = c.sc[u.key], tgt = c.ids.length > 1 ? m.g[c.id] : (m.r[c.id] = m.r[c.id] || {role:'auto', src:'auto'});
  if (!tgt) return; tgt.sid = u.key; tgt.sc = sc.v; tgt.why = mfWhy(u, c, sc);
  if (tgt.src !== 'user') { tgt.src = 'auto'; if (R.ask.includes(u.key) && !(m.ask[R.day] && m.ask[R.day].done)) tgt.prov = 1; else delete tgt.prov; }
}
/* Logbuch: veraltete Einträge der Fahrten dieses Tages ersetzen */
function mfLbFix(day){
  try {
    S.lb = S.lb && typeof S.lb === 'object' ? S.lb : {}; const m = mfMf(), ids = mfDayRides(day).map(a => a.id);
    Object.values(m.g || {}).forEach(g => { if (g && g.day === day) ids.push(g.gid); });
    Object.keys(S.lb).forEach(k => { const l = S.lb[k]; if (l && l.k === 'p' && l.pid === S.pid && l.day === day && !Object.values(S.p.exe || {}).some(e => e && e.rid === k)) ids.push(k); });
    ids.forEach(id => { const l = S.lb[id]; if (l && (l.k === 'p' || l.k === 'x' || l.k === 'c') && (!l.pid || l.pid === S.pid)) delete S.lb[id]; });
    lbSync(false);
    mfDayRides(day).forEach(a => { if (mfIsCommute(a.id) && !mfGid(a.id)) S.lb[a.id] = {k:'c', day, n:lbTxt(a.n), t:null, score:null, grade:'', verdict:null, msgs:[], adj:'', ftp:(S.p && S.p.ftp) || null, sm:null, am:Math.round((a.sec || 0) / 60), hr:a.hrA || null, np:a.np || null, mv:null, vo:null, pid:S.pid || null, at:Date.now()}; });
  } catch (e) { elog(e); }
}
/* Merge-Vorschlag: aufeinanderfolgende Fahrten mit Pause bis MF_GAP, noch nicht beantwortet */
function mfSugg(day){
  const m = mfSt(), L = mfDayRides(day).filter(a => !mfIsCommute(a.id)); delete m.sug[day];
  for (let k = 1; k < L.length; k++) { const a = L[k - 1], b = L[k], gap = (mfStart(b) - mfEnd(a)) / 1000;
    if (gap < -60 || gap > MF_GAP || m.pair[mfPairK(a.id, b.id)]) continue; const ga = mfGid(a.id); if (ga && ga === mfGid(b.id)) continue;
    m.sug[day] = [a.id, b.id, Math.max(0, Math.round(gap / 60))]; break; }
  return m.sug[day] || null;
}
function mfResolve(day, o){
  o = o || {};
  try {
    const m = mfSt(); if (!m || !S.plan || S.step !== 0 || !day) return null;
    const rides = mfDayRides(day); if (!o.force && rides.length < 2) return null;
    const R = mfCompute(day); if (!R) return null;
    if (R.units.length) { mfApply(R, !!o.re);
      if (R.ask.length && !(m.ask[day] && m.ask[day].done)) m.ask[day] = {open:1, unit:R.ask[0], at:Date.now()}; else if (!R.ask.length && m.ask[day] && !m.ask[day].done) delete m.ask[day]; }
    else mfLbFix(day);
    mfSugg(day);
    return R;
  } catch (e) { elog(e); return null; }
}
/* Nach einem Import: betroffene Tage neu prüfen, Meldung für den Abgleich */
function mfAfterImport(days){
  const out = [];
  [...new Set(days)].filter(Boolean).sort().forEach(day => {
    const R = mfResolve(day); if (!R) return; const m = mfMf(), n = R.rides.length, dn = mfDayName(day);
    const parts = [];
    R.units.forEach(u => { const id = R.map[u.key], c = R.cands.find(z => z.id === id);
      if (c) parts.push(mfL(`„${c.a.n}“ zählt als „${u.n}“. ${mfWhy(u, c, c.sc[u.key])}`, `“${c.a.n}” counts as “${u.n}”. ${mfWhy(u, c, c.sc[u.key])}`)); });
    if (m.sug && m.sug[day]) parts.push(mfL('Ein Vorschlag „Zusammenführen“ wartet in der Woche.', 'A suggestion to merge rides is waiting in the week view.'));
    if (m.ask && m.ask[day] && m.ask[day].open && !m.ask[day].done) parts.push(mfL('Bitte prüfe in der Woche, welche Fahrt dein Training war.', 'Please check in the week view which ride was your training.'));
    out.push(mfL(`${dn}: ${n} Fahrten. `, `${dn}: ${n} rides. `) + parts.join(' '));
  });
  return out.join(' ');
}
const mfDayName = day => { const d = new Date(day + 'T12:00:00'), k = (d.getDay() + 6) % 7; return mfL(DAYS[k], I_WD[SD[k]] || DAYS[k]) + ' ' + fmt(day).slice(0, 6); };

/* ---- Änderungen durch den Nutzer: immer mit Schnappschuss und „Rückgängig“ ---- */
const MF_SK = ['done', 'plan', 'log', 'lb', 'pb', 'handled', 'cheerSeen', 'pending', 'pendInfo', 'actual'], MF_PK = ['exe', 'exeP', 'extra', 'mf', 'hrK'];
function mfSnap(why){
  const o = {S:{}, P:{}}; MF_SK.forEach(k => { o.S[k] = S[k] === undefined ? null : JSON.stringify(S[k]); }); MF_PK.forEach(k => { o.P[k] = S.p[k] === undefined ? null : JSON.stringify(S.p[k]); });
  const prev = bkUndo; try { bkPre(why); } catch (e) { elog(e); } bkUndo = prev;
  mfUndo = {at:Date.now(), why, o, pid:S.pid};
}
function mfUndoGo(){
  const u = mfUndo; if (!u || !S.p || u.pid !== S.pid) { mfUndo = null; return render(); }
  MF_SK.forEach(k => { if (u.o.S[k] === null) delete S[k]; else S[k] = JSON.parse(u.o.S[k]); });
  MF_PK.forEach(k => { if (u.o.P[k] === null) delete S.p[k]; else S.p[k] = JSON.parse(u.o.P[k]); });
  mfUndo = null; mfMenu = null; save(); render();
}
function mfUndoBar(){
  if (!mfUndo || Date.now() - mfUndo.at > 10 * 60e3) return '';
  return `<div class="flex items-center gap-2 text-sm" role="status" data-noi18n style="background:var(--tint);border:1px solid var(--ice);padding:8px 10px 8px 14px;margin:10px 16px 0;color:var(--ink)"><span class="min-w-0 flex-1">${esc(mfUndo.why)}</span><button class="ghost !px-3 !py-1 text-sm" style="min-height:44px" onclick="mfUndoGo()">${mfL('Rückgängig', 'Undo')}</button><button class="text-sm" style="color:var(--mute);min-width:44px;min-height:44px;background:none;border:0" aria-label="${esc(mfL('Hinweis schließen', 'Close notice'))}" onclick="mfUndo=null;render()">${ic('close', 16)}</button></div>`;
}
function mfDo(why, day, fn){
  if (!S.p) return; mfSnap(why); const m = mfSt();
  try { fn(m); } catch (e) { elog(e); }
  mfResolve(day, {force:1, re:1}); mfMenu = null;
  try { if (S.plan) analyze(); } catch (e) { elog(e); }
  save(); render();
}
const mfDayOf = id => { const a = mfRide(id); if (a) return a.day; const g = mfMf().g && mfMf().g[id]; return g ? g.day : null; };
/* Als Training werten (für eine bestimmte Einheit) */
function mfTrain(id, key){
  const day = mfDayOf(id), gid = mfMf().g && mfMf().g[id] ? id : mfGid(id);
  mfDo(mfL('Zuordnung geändert: als Training gewertet.', 'Assignment changed: counted as training.'), day, m => {
    const tgt = gid ? m.g[gid] : (m.r[id] = m.r[id] || {});
    Object.values(m.r).forEach(r => { if (r !== tgt && r.sid === key) { r.sid = null; r.src = 'auto'; } }); Object.values(m.g).forEach(g => { if (g !== tgt && g.sid === key) { g.sid = null; g.src = 'auto'; } });
    Object.assign(tgt, {role:'training', src:'user', sid:key}); delete tgt.prov; delete m.none[key]; m.ask[day] = {...(m.ask[day] || {}), open:0, done:1};
  });
}
function mfCommute(id){
  const day = mfDayOf(id); mfDo(mfL('Zuordnung geändert: als Anfahrt/Pendeln markiert.', 'Assignment changed: marked as commute.'), day, m => {
    /* Ganze Gruppe als Pendeln, oder ein Abschnitt: dieser wird aus der Gruppe gelöst */
    if (m.g[id]) { Object.assign(m.g[id], {role:'commute', src:'user', sid:null}); return; }
    const gid = mfGid(id); if (gid) { const g = m.g[gid], rest = g.ids.filter(x => x !== id); for (let k = 1; k < g.ids.length; k++) m.pair[mfPairK(g.ids[k - 1], g.ids[k])] = 'sep'; if (S.p.extra) delete S.p.extra[gid];
      if (rest.length >= 2) { const ng = 'g' + rest[0]; delete m.g[gid]; m.g[ng] = {...g, gid:ng, ids:rest}; } else delete m.g[gid]; }
    m.r[id] = {role:'commute', src:'user', sid:null}; });
}
function mfAutoBack(id){
  const day = mfDayOf(id); mfDo(mfL('Zuordnung wieder automatisch.', 'Assignment set back to automatic.'), day, m => {
    const gid = m.g[id] ? id : mfGid(id); if (gid) { Object.assign(m.g[gid], {role:'auto', src:'auto', sid:null}); return; } delete m.r[id]; });
}
function mfJoinRaw(m, a, b, by){
  const day = mfDayOf(a), ga = mfGid(a), gb = mfGid(b), ids = [...new Set([...(ga ? m.g[ga].ids : [a]), ...(gb ? m.g[gb].ids : [b])])].map(mfRide).filter(Boolean).sort((p, q) => p.ts.localeCompare(q.ts)).map(r => r.id);
  const old = [ga, gb].filter(Boolean).map(g => m.g[g]), sid = old.map(g => g.sid).find(Boolean) || ids.map(id => m.r[id] && m.r[id].sid).find(Boolean) || null, user = old.some(g => g.src === 'user') || ids.some(id => m.r[id] && m.r[id].src === 'user');
  [ga, gb].forEach(g => { if (g) { delete m.g[g]; if (S.p.extra) delete S.p.extra[g]; } }); ids.forEach(id => { delete m.r[id]; });
  const gid = 'g' + ids[0]; m.g[gid] = {gid, ids, by:by || 'user', at:Date.now(), day, role:'auto', sid, src:user && sid ? 'user' : 'auto'};
  for (let k = 1; k < ids.length; k++) m.pair[mfPairK(ids[k - 1], ids[k])] = 'join'; delete m.sug[day];
  return gid;
}
function mfJoin(a, b, by){ mfDo(mfL('Fahrten zusammengeführt.', 'Rides merged.'), mfDayOf(a), m => { mfJoinRaw(m, a, b, by); }); }
function mfSplit(gid){
  const g = mfMf().g && mfMf().g[gid]; if (!g) return; const day = g.day;
  mfDo(mfL('Fahrten wieder getrennt.', 'Rides split again.'), day, m => {
    for (let k = 1; k < g.ids.length; k++) m.pair[mfPairK(g.ids[k - 1], g.ids[k])] = 'sep';
    if (S.p.extra && S.p.extra[gid]) delete S.p.extra[gid]; delete m.g[gid]; g.ids.forEach(id => { delete m.r[id]; });
  });
}
function mfKeepSep(a, b){ const m = mfSt(), day = mfDayOf(a); m.pair[mfPairK(a, b)] = 'sep'; delete m.sug[day]; save(); render(); }
/* Antwort auf „Welche Fahrt war dein Training?“ */
function mfAnswer(day, v){
  const m = mfSt(), q = m.ask[day]; const key = q && q.unit; if (!key) return;
  if (v === 'both') { const L = mfDayRides(day).filter(a => !mfIsCommute(a.id) && a.sec >= MF_MIN); if (L.length < 2) return;
    return mfDo(mfL('Fahrten zusammengeführt und als Training gewertet.', 'Rides merged and counted as training.'), day, mm2 => { let g = null; L.slice(1).forEach(a => { g = mfJoinRaw(mm2, L[0].id, a.id, 'user'); });
      Object.values(mm2.r).forEach(r => { if (r.sid === key) { r.sid = null; r.src = 'auto'; } }); Object.assign(mm2.g[g], {role:'training', src:'user', sid:key}); delete mm2.none[key]; mm2.ask[day] = {...q, open:0, done:1}; }); }
  if (v === 'none') return mfDo(mfL('Einheit als nicht gefahren markiert.', 'Session marked as not ridden.'), day, mm2 => { mm2.none[key] = 1; mm2.ask[day] = {...q, open:0, done:1}; Object.values(mm2.r).forEach(r => { if (r.sid === key) { r.sid = null; r.src = 'auto'; } }); });
  if (v === 'keep') { m.ask[day] = {...q, open:0, done:1}; Object.values(m.r).concat(Object.values(m.g)).forEach(r => { if (r && r.sid === key) delete r.prov; }); save(); render(); return; }
  mfTrain(v, key);
}
/* Frühere Anpassung, die auf der falschen Zuordnung beruhte, zurücknehmen */
function mfStaleUndo(k){
  const m = mfSt(), s = m.stale[k]; if (!s) return;
  if (s.k === 'soft') { mfSnap(mfL('Frühere Reduzierung zurückgenommen.', 'Earlier reduction reverted.')); const x = S.plan[s.j]; if (x && x.orig) { S.plan[s.j] = x.orig; S.log.unshift({title:'Zuordnung: Reduzierung zurückgenommen', day:s.j, text:'Die Reduzierung beruhte auf der falschen Fahrt. Die Einheit läuft wieder wie geplant.'}); } delete m.stale[k]; save(); render(); return; }
  if (s.k === 'x') { mfSnap(mfL('Frühere Plananpassung zurückgenommen.', 'Earlier plan change reverted.')); const id = s.rec.id, keep = S.p.extra[id]; S.p.extra[id] = s.rec; const sv = bkUndo; try { xrUndo(id); } catch (e) { elog(e); } bkUndo = sv; if (keep) S.p.extra[id] = keep; else delete S.p.extra[id]; delete m.stale[k]; save(); render(); }
}
function mfStaleDrop(k){ delete mfSt().stale[k]; save(); render(); }
function mfSoften(j){ if (!S.plan || !S.plan[j] || S.done[j]) return; mfSnap(mfL('Einheit reduziert.', 'Session reduced.')); const old = exeSoften(j); S.log.unshift({title:'Bewertung: Einheit reduziert', day:j, text:`„${old.n}“ am ${DAYS[j]} reduziert, nach Zustimmung.`}); Object.values(S.p.exe || {}).forEach(e => { if (e && e.acts) e.acts = e.acts.filter(a => a[1] !== `mfSoften(${ja(j)})`); }); save(); render(); }

/* ---- Anzeige ---- */
const mfBtn = (fn, l, main, extra) => `<button class="${main ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}"${extra || ''}>${l}</button>`;
function mfUnitName(key){ const [w, i, p] = String(key).split('-').map(Number); const e = ((S.p && S.p.exe) || {})[w + '-' + i]; if (w === S.wk && S.plan && S.plan[i]) return S.plan[i].parts && !isNaN(p) ? `${S.plan[i].n} · ${S.plan[i].parts[p].lbl}` : S.plan[i].n; return e ? e.plan || (e.x && e.x.n) : ''; }
/* Status einer Fahrt (oder Gruppe) */
function mfState(id){
  const m = mfMf(), gid = m.g && m.g[id] ? id : mfGid(id), g = gid ? m.g[gid] : null, r = g || (m.r || {})[id] || {};
  const ev = Object.entries((S.p && S.p.exe) || {}).find(([, e]) => e && !e.parts && e.rid === (gid || id)) || Object.entries((S.p && S.p.exeP) || {}).map(([k, arr]) => [k, (arr || []).find(e => e && e.rid === (gid || id))]).find(([, e]) => e);
  const role = mfRole(gid ? gid : id);
  return {gid, g, r, ev:ev ? ev[1] : null, key:ev ? (ev[1].part != null ? ev[0] + '-' + ev[1].part : ev[0]) : null, role, extra:!!((S.p && S.p.extra) || {})[gid || id]};
}
function mfStateTxt(s){
  if (s.role === 'commute') return [mfL('Anfahrt/Pendeln', 'Commute'), 'var(--mute)', 'commute'];
  if (s.ev) return [mfL(`Training: ${mfUnitName(s.key)}`, `Training: ${mfUnitName(s.key)}`) + (s.ev.score != null ? ` · ${s.ev.score}/100` : '') + (s.r.prov ? mfL(' · vorläufig', ' · provisional') : ''), 'var(--teal)', 'target'];
  return [mfL('Zusätzliche Fahrt', 'Extra ride'), 'var(--mute)', 'chevR'];
}
/* Menü „Zuordnung“ für eine Fahrt oder Gruppe */
function mfMenuUi(id){
  const s = mfState(id), day = mfDayOf(id), units = mfUnits(day), others = mfDayRides(day).filter(a => a.id !== id && !(s.g && s.g.ids.includes(a.id)) && !mfIsCommute(a.id)), cid = s.gid || id, out = [];
  units.forEach(u => { if (s.key !== u.key || s.role === 'commute') out.push(mfBtn(`mfTrain('${ja(cid)}','${ja(u.key)}')`, units.length > 1 ? mfL(`Als Training werten: ${u.n}`, `Count as training: ${u.n}`) : mfL('Als Training werten', 'Count as training'))); });
  if (s.role !== 'commute') out.push(mfBtn(`mfCommute('${ja(cid)}')`, mfL('Als Anfahrt/Pendeln markieren', 'Mark as commute')));
  others.forEach(a => out.push(mfBtn(`mfJoin('${ja(s.g ? s.g.ids[0] : id)}','${ja(a.id)}')`, mfL(`Zusammenführen mit ${mfClock(a)} (${mm(Math.round(a.sec / 60))})`, `Merge with ${mfClock(a)} (${mm(Math.round(a.sec / 60))})`))));
  if (s.g) out.push(mfBtn(`mfSplit('${ja(s.gid)}')`, mfL('Trennen', 'Split')));
  if (s.r && s.r.src === 'user') out.push(mfBtn(`mfAutoBack('${ja(cid)}')`, mfL('Wieder automatisch zuordnen', 'Assign automatically again')));
  return `<div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="${esc(mfL('Zuordnung', 'Assignment'))}">${out.join('')}</div><p class="mt-1 text-xs" style="color:var(--mute)">${mfL('Die Fahrt selbst bleibt unverändert. Jede Änderung lässt sich rückgängig machen.', 'The ride itself stays unchanged. Every change can be undone.')}</p>`;
}
/* Block in der Detailansicht (Logbuch) */
function mfRideBlock(id){
  if (!S.p || !mfDayOf(id)) return ''; const s = mfState(id), [t, col, icn] = mfStateTxt(s), day = mfDayOf(id), n = mfDayRides(day).length, why = s.ev && (s.ev.mfWhy || s.r.why);
  if (n < 2 && s.role !== 'commute' && !s.g && !(s.r && s.r.src === 'user')) return '';
  const open = mfMenu === 'd' + id;
  return `<div class="mt-3 p-3" data-noi18n style="border:1px solid var(--line);border-left:3px solid ${esc(col)}"><p class="eyebrow">${mfL('Zuordnung', 'Assignment')}</p><p class="mt-1 flex items-center gap-2 text-sm font-semibold"><span style="color:${esc(col)}">${ic(icn, 18)}</span><span>${esc(t)}</span></p>${why ? `<p class="mt-1 text-sm">${esc(why)}</p>` : ''}${s.ev && s.ev.re ? `<p class="mt-1 text-xs" style="color:var(--mute)">${mfL('Neu bewertet nach Änderung der Zuordnung', 'Re-evaluated after the assignment changed')}${s.ev.re.wasN ? mfL(` (vorher „${esc(s.ev.re.wasN)}“${s.ev.re.wasS != null ? `, ${s.ev.re.wasS}/100` : ''})`, ` (before “${esc(s.ev.re.wasN)}”${s.ev.re.wasS != null ? `, ${s.ev.re.wasS}/100` : ''})`) : ''}.</p>` : ''}${s.role === 'commute' ? `<p class="mt-1 text-sm">${mfL('Zählt zur Belastung (Woche, Formkurve), aber nicht als Training und nicht zur Planerfüllung.', 'Counts towards load (week, fitness curve) but not as training or towards completing the plan.')}</p>` : ''}
    ${s.g ? `<p class="mt-1 text-sm">${mfL(`Zusammengeführt aus ${s.g.ids.length} Fahrten.`, `Merged from ${s.g.ids.length} rides.`)}</p>` : ''}
    <button class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" aria-expanded="${open}" onclick="mfMenu=${open ? 'null' : `'d${ja(id)}'`};render()">${ic('gear', 16)} ${mfL('Zuordnung ändern', 'Change assignment')}</button>${open ? mfMenuUi(id) : ''}</div>`;
}
/* Karte am Tag in der Woche (ersetzt dort die Zeilen der Zusatzfahrten, sobald mehrere Fahrten oder Pendeln im Spiel sind) */
function mfDayCard(w, i){
  if (!S.p || !S.p.start) return null; const day = wkDay(w, i), L = mfDayRides(day), m = mfMf();
  const groups = Object.values(m.g || {}).filter(g => g && g.day === day), anyC = L.some(a => mfIsCommute(a.id));
  if (L.length < 2 && !anyC && !groups.length) return null;
  const seen = new Set(), rows = [];
  L.forEach(a => { const g = mfGid(a.id); if (g) { if (seen.has(g)) return; seen.add(g); rows.push({id:g, g:m.g[g]}); } else rows.push({id:a.id, a}); });
  const row = o => { const s = mfState(o.id), [t, col, icn] = mfStateTxt(s), open = mfMenu === 'w' + o.id;
    const rs = o.g ? o.g.ids.map(mfRide).filter(Boolean) : [o.a], sec = rs.reduce((q, r) => q + (r.sec || 0), 0), km = rs.reduce((q, r) => q + (r.km || 0), 0), tssV = rs.reduce((q, r) => q + (r.tss || 0), 0);
    const nm = o.g ? rs.map(r => mfClock(r)).join(' + ') : mfClock(o.a);
    return `<div class="py-2" style="border-top:1px solid var(--line)"><div class="flex items-center gap-2"><button class="flex min-w-0 flex-1 items-center gap-2 text-left" style="background:none;border:0;padding:0;min-height:44px" onclick="lbOpenRide('${ja(o.id)}')"><span style="color:${esc(col)}">${ic(icn, 18)}</span><span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold">${esc(nm)} · ${esc(o.g ? mfL(`${rs.length} Abschnitte`, `${rs.length} sections`) : o.a.n)}</span><span class="block text-xs" style="color:var(--mute)">${f1(km)} km · ${mm(Math.round(sec / 60))} · TSS ${Math.round(tssV)} · <span style="color:${esc(col)}">${esc(t)}</span></span></span></button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" aria-expanded="${open}" aria-label="${esc(mfL('Zuordnung ändern', 'Change assignment'))}" onclick="mfMenu=${open ? 'null' : `'w${ja(o.id)}'`};render()">${mfL('Zuordnung', 'Assign')}</button></div>
      ${s.ev && (s.ev.mfWhy || s.r.why) && L.length > 1 ? `<p class="text-xs" style="color:var(--mute)">${esc(s.ev.mfWhy || s.r.why)}</p>` : ''}${open ? mfMenuUi(o.id) : ''}</div>`; };
  const sug = m.sug && m.sug[day], A = sug && mfRide(sug[0]), B = sug && mfRide(sug[1]);
  const mini = r => { const st = mfStream(r.id), p = st && st.ser && st.ser.p; if (!p) return ''; const mx = Math.max(1, ...p.filter(v => v != null)), n = p.length; let d = '', on = false; p.forEach((v, k) => { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + (k / Math.max(1, n - 1) * 100).toFixed(1) + ',' + (22 - v / mx * 20).toFixed(1); on = true; }); return `<svg viewBox="0 0 100 24" width="100%" height="24" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--teal)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`; };
  const sugUi = A && B ? `<div class="mt-2 p-2.5" style="border:1px solid var(--line);border-left:3px solid var(--teal);background:var(--tint)"><p class="text-sm font-semibold">${mfL('Gehören diese Fahrten zusammen?', 'Do these rides belong together?')}</p><p class="mt-1 text-xs" style="color:var(--mute)">${mfL(`${mfClock(A)} (${mm(Math.round(A.sec / 60))}) und ${mfClock(B)} (${mm(Math.round(B.sec / 60))}), ${sug[2]} Min. Pause dazwischen. Zusammengeführt bewertet die App sie als eine Einheit, die Pause zählt nicht mit.`, `${mfClock(A)} (${mm(Math.round(A.sec / 60))}) and ${mfClock(B)} (${mm(Math.round(B.sec / 60))}), ${sug[2]} min break in between. Merged, the app evaluates them as one session; the break does not count.`)}</p>
      <div class="mt-1 grid grid-cols-2 gap-2">${[A, B].map(r => `<div>${mini(r)}</div>`).join('')}</div><div class="mt-2 flex flex-wrap gap-2">${mfBtn(`mfJoin('${ja(A.id)}','${ja(B.id)}','suggestion-accepted')`, mfL('Zusammenführen', 'Merge'), true)}${mfBtn(`mfKeepSep('${ja(A.id)}','${ja(B.id)}')`, mfL('Getrennt lassen', 'Keep separate'))}</div></div>` : '';
  const q = m.ask && m.ask[day], askOn = q && q.open && !q.done && mfUnits(day).some(u => u.key === q.unit);
  const cand = askOn ? rows.filter(o => !mfIsCommute(o.id) && (o.g || (o.a.sec || 0) >= MF_MIN)) : [];
  const askUi = askOn ? `<div class="mt-2 p-2.5" style="border:1px solid var(--line);border-left:3px solid #d9a400;background:var(--tint)"><p class="text-sm font-semibold">${mfL('Welche Fahrt war dein Training?', 'Which ride was your training?')}</p><p class="mt-1 text-xs" style="color:var(--mute)">${mfL(`Für „${esc(mfUnitName(q.unit))}“ passen mehrere Fahrten ähnlich gut. Bis du antwortest, gilt die Wahl der App als vorläufig.`, `Several rides fit “${esc(mfUnitName(q.unit))}” similarly well. Until you answer, the app's choice is provisional.`)}</p>
      <div class="mt-2 flex flex-wrap gap-2">${cand.map(o => { const r = o.g ? o.g.ids.map(mfRide).filter(Boolean) : [o.a]; return mfBtn(`mfAnswer('${ja(day)}','${ja(o.id)}')`, `${r.map(mfClock).join(' + ')} · ${mm(Math.round(r.reduce((s2, z) => s2 + z.sec, 0) / 60))}`); }).join('')}${cand.length >= 2 && !cand.some(o => o.g) ? mfBtn(`mfAnswer('${ja(day)}','both')`, mfL('Beide zusammen', 'Both together')) : ''}${mfBtn(`mfAnswer('${ja(day)}','none')`, mfL('Keine – Einheit nicht gefahren', 'None – session not ridden'))}</div></div>` : '';
  const st = Object.entries(m.stale || {}).filter(([, s]) => s && ((s.k === 'soft' && w === S.wk) || (s.k === 'x' && s.rec && s.rec.day === day)));
  const stUi = st.map(([k, s]) => `<div class="mt-2 p-2.5 text-sm" style="border:1px solid var(--line);border-left:3px solid #c2410c"><p>${s.k === 'soft' ? mfL(`Die App hatte „${esc(s.n)}“ am ${DAYS[s.j]} reduziert. Das beruhte auf der vorher zugeordneten Fahrt.`, `The app had reduced “${esc(s.n)}”. That was based on the previously assigned ride.`) : mfL(`Eine Plananpassung („${esc(s.rec.prop ? s.rec.prop.text : s.rec.adj || '')}“) beruhte darauf, dass diese Fahrt zusätzlich war.`, `A plan change (“${esc(s.rec.prop ? s.rec.prop.text : s.rec.adj || '')}”) was based on this ride being an extra.`)}</p><div class="mt-2 flex flex-wrap gap-2">${mfBtn(`mfStaleUndo('${ja(k)}')`, mfL('Zurücknehmen', 'Revert'), true)}${mfBtn(`mfStaleDrop('${ja(k)}')`, mfL('Behalten', 'Keep'))}</div></div>`).join('');
  return `<div class="panel p-3" data-noi18n id="mf-${esc(day)}"><p class="eyebrow">${mfL(`${L.length} ${L.length === 1 ? 'Fahrt' : 'Fahrten'} an diesem Tag`, `${L.length} ${L.length === 1 ? 'ride' : 'rides'} on this day`)}</p>${rows.map(row).join('')}${sugUi}${askUi}${stUi}<p class="mt-2 text-xs" style="color:var(--mute)">${mfL('Belastung zählt immer für alle Fahrten. Die Zuordnung entscheidet nur, welche Fahrt die geplante Einheit erfüllt.', 'Load always counts for all rides. The assignment only decides which ride completes the planned session.')}</p></div>`;
}
/* Woche: Karte statt der Einzelzeilen der Zusatzfahrten */
{ const _x = xrDayRows; xrDayRows = function(w, i){ let c = null; try { c = mfDayCard(w, i); } catch (e) { elog(e); } return c != null ? c : _x(w, i); }; }

/* ---- Altdaten: Tage mit mehreren Fahrten von vor dem Update ---- */
function mfOldScan(){
  const m = mfSt(); if (!m || m.old) return m && m.old; if (!S.plan || S.step !== 0) return null;
  const by = {}; (S.man || []).forEach(a => { if (a && a.day && a.day <= iso(0) && (a.sec || 0) >= MF_MIN) by[a.day] = (by[a.day] || 0) + 1; });
  const days = Object.keys(by).filter(d => by[d] >= 2 && mfUnits(d).length).sort();
  m.old = {at:Date.now(), days, st:days.length ? 'open' : 'none'}; return m.old;
}
/* Vorschlag für einen alten Tag: neue Zuordnung gegen die jetzige */
function mfOldDiff(day){
  const R = mfCompute(day); if (!R) return null; const out = [];
  R.units.forEach(u => { const cur = mfCur(u), nid = R.map[u.key] || null, cid = cur ? cur.rid : null; const c = R.cands.find(z => z.id === nid);
    out.push({u, same:cid === nid, cur, c, why:c ? mfWhy(u, c, c.sc[u.key]) : ''}); });
  return {R, out, diff:out.some(o => !o.same)};
}
function mfOldApply(day){
  const m = mfSt(); mfDo(mfL(`Zuordnung für ${mfDayName(day)} übernommen.`, `Assignment for ${mfDayName(day)} applied.`), day, () => {});
  m.old.days = (m.old.days || []).filter(d => d !== day); if (!m.old.days.length) m.old.st = 'done'; save(); render();
}
function mfOldAll(){
  const m = mfSt(), L = (m.old && m.old.days || []).filter(d => { const x = mfOldDiff(d); return x && x.diff; }); if (!L.length) return;
  mfSnap(mfL(`Zuordnung für ${L.length} ${L.length === 1 ? 'Tag' : 'Tage'} übernommen.`, `Assignment applied for ${L.length} ${L.length === 1 ? 'day' : 'days'}.`));
  L.forEach(d => mfResolve(d, {force:1, re:1})); m.old.days = []; m.old.st = 'done'; try { if (S.plan) analyze(); } catch (e) { elog(e); } save(); render();
}
function mfOldClose(){ const m = mfSt(); if (m.old) m.old.st = 'done'; save(); render(); }
function mfOldCard(){
  try {
    const o = mfOldScan(); if (!o || o.st !== 'open' || !o.days.length) return '';
    const L = o.days.map(d => ({d, x:mfOldDiff(d)})).filter(z => z.x), dif = L.filter(z => z.x.diff), same = L.length - dif.length;
    const open = mfMenu === 'old';
    return `<section class="panel p-4" data-noi18n id="mf-old"><p class="font-semibold">${mfL(`An ${o.days.length} ${o.days.length === 1 ? 'Tag' : 'Tagen'} gab es mehrere Fahrten. Zuordnung prüfen?`, `There were several rides on ${o.days.length} ${o.days.length === 1 ? 'day' : 'days'}. Check the assignment?`)}</p>
      <p class="mt-1 text-sm" style="color:var(--mute)">${mfL('Seit diesem Update sucht die App bei mehreren Fahrten die, die am besten zur geplanten Einheit passt, statt einfach die erste zu nehmen. Ältere Tage ändert sie nur, wenn du zustimmst.', 'Since this update the app picks the ride that best fits the planned session instead of simply the first one. It only changes earlier days if you agree.')}${same ? mfL(` An ${same} ${same === 1 ? 'Tag' : 'Tagen'} passt die bisherige Zuordnung schon.`, ` On ${same} ${same === 1 ? 'day' : 'days'} the current assignment already fits.`) : ''}</p>
      ${open ? `<div class="mt-2 space-y-2">${dif.map(z => `<div class="p-2.5 text-sm" style="border:1px solid var(--line)"><p class="font-semibold">${esc(mfDayName(z.d))}</p>${z.x.out.filter(q => !q.same).map(q => `<p class="mt-1">${mfL('Bisher', 'Now')}: ${q.cur ? `„${esc(q.cur.n)}“${q.cur.score != null ? ` (${q.cur.score}/100)` : ''}` : mfL('keine Fahrt', 'no ride')} → ${mfL('neu', 'new')}: ${q.c ? `„${esc(q.c.a.n)}“` : mfL('keine Fahrt', 'no ride')}</p>${q.why ? `<p class="text-xs" style="color:var(--mute)">${esc(q.why)}</p>` : ''}`).join('')}<div class="mt-2">${mfBtn(`mfOldApply('${ja(z.d)}')`, mfL('Übernehmen', 'Apply'), true)}</div></div>`).join('')}</div>` : ''}
      <div class="mt-3 flex flex-wrap gap-2">${dif.length ? (open ? mfBtn('mfOldAll()', mfL(`Alle übernehmen (${dif.length})`, `Apply all (${dif.length})`), true) : mfBtn("mfMenu='old';render()", mfL(`Vorschläge ansehen (${dif.length})`, `View suggestions (${dif.length})`), true)) : ''}${mfBtn('mfOldClose()', mfL('Nicht mehr anzeigen', 'Don’t show again'))}</div></section>`;
  } catch (e) { elog(e); return ''; }
}
{ const _b = blWeekSum; blWeekSum = function(w){ let o = ''; try { if (w === S.wk) o = mfOldCard(); } catch (e) { elog(e); } return o + _b(w); }; }

/* ---- Logbuch: Gruppe als ein Eintrag, Pendeln mit eigenem Symbol ---- */
function mfLbFold(L){
  const g = mfMf().g || {}, mem = {}; Object.values(g).forEach(x => { if (x) x.ids.forEach(id => { mem[id] = x.gid; }); });
  if (!Object.keys(mem).length) return L; const out = [], done = new Set();
  L.forEach(a => { const gid = mem[a.id]; if (!gid) return out.push(a); if (done.has(gid)) return; done.add(gid); const r = mfLbGroupRow(gid); if (r) out.push(r); });
  return out;
}
function mfLbGroupRow(gid){
  const g = (mfMf().g || {})[gid]; if (!g) return null; const rs = g.ids.map(mfRide).filter(Boolean); if (!rs.length) return null;
  const s = k => rs.reduce((q, r) => q + (r[k] || 0), 0);
  return {id:gid, grp:g.ids.slice(), day:g.day, n:rs.map(r => r.n).join(' + '), km:Math.round(s('km') * 10) / 10, sec:s('sec'), hm:s('hm'), tss:s('tss'), np:0, ts:rs[0].ts, in:rs.every(r => r.in) ? 1 : 0};
}
function mfLbSections(gid){
  const g = (mfMf().g || {})[gid]; if (!g) return ''; const rs = g.ids.map(mfRide).filter(Boolean);
  return `<details class="mt-3" data-noi18n open><summary class="cursor-pointer text-sm font-semibold" style="color:var(--teal);min-height:44px">${mfL(`${rs.length} Abschnitte`, `${rs.length} sections`)}</summary><div class="mt-1 space-y-1">${rs.map((r, k) => `${k ? `<p class="text-xs" style="color:var(--mute)">${mfL('Pause', 'Break')} ${Math.max(0, Math.round((mfStart(r) - mfEnd(rs[k - 1])) / 60000))} ${mfL('Min.', 'min')}</p>` : ''}<div class="p-2.5 text-sm" style="background:var(--tint);border:1px solid var(--line)"><b>${esc(mfClock(r))}</b> · ${esc(r.n)}<br><span class="text-xs" style="color:var(--mute)">${blRideLine(r)} · TSS ${r.tss}${r.np ? ` · NP ${r.np} W` : ''}</span></div>`).join('')}</div></details>`;
}
const mfLbAny = () => Object.values((S.lb || {})).some(l => l && l.k === 'c');
/* Wusstest du schon? → Woche, Karte des Tages mit mehreren Fahrten, Knopf „Zuordnung“ */
function dykMf(){ navGo('week'); setTimeout(() => { try { const L = [...document.querySelectorAll('[id^="mf-"]')].filter(e => e.id !== 'mf-old'), e = L[L.length - 1]; if (e) { e.scrollIntoView({block:'center'}); const b = [...e.querySelectorAll('button')].find(x => /Zuordnung|Assign/.test(x.textContent)); if (b) b.focus({preventScroll:true}); } } catch (x) { elog(x); } }, 60); }
