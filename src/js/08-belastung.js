/* ---------- Audit 12.11.2026, M5: Belastung (TSS) realistischer schätzen ----------
   Geplante Einheiten: Bisher galt ein fester Intensitätsfaktor je Typ über die ganze Dauer (eine Stunde „Antritte 8×30 Sek.“ zählte wie eine
   Stunde an der Schwelle). Jetzt wird die Einheit in Abschnitte zerlegt: Ein- und Ausfahren 60 % FTP, lockere Pausen 50 %, Belastungsphasen in
   der Mitte des Zielbereichs, sehr kurze Wechsel (unter 1 Min.) als Mittel der Serie. Daraus Normalized Power (4.-Potenz-Mittel, Allen & Coggan)
   und TSS = Stunden × IF² × 100. Rennen und Eventtag: haltbare Intensität IF(T) = 1 − 0,1 · ln(Std.), wie in der Zielzeit-Prognose.
   Gefahrene Fahrten ohne Leistungsdaten: aus dem Durchschnittspuls im Verhältnis zum Schwellenpuls (Zuordnung der Puls- zu den
   Leistungsbereichen nach Coggan), sonst aus dem Empfinden (RPE 1 bis 10, Session-RPE nach Foster et al. 2001), sonst wie bisher IF 0,65. */
function tssSegs(x){
  const S = [], add = (m, q) => { if (m > 0) S.push([m, q]); };
  const one = (iv, total) => {
    const sets = iv.sets || 1, w = (iv.lo + iv.hi) / 2, r = iv.rlo ? (iv.rlo + iv.rhi) / 2 : 50; let used = 0; const a = (m, q) => { if (m > 0) { add(m, q); used += m; } };
    a(iv.wu || 0, 60);
    if (iv.seq) iv.seq.forEach((m, k) => { a(m, w); if (k < iv.seq.length - 1) a(iv.rest || 0, r); });
    else for (let s = 0; s < sets; s++) {
      if (iv.work < 1 && iv.rest < 1) { const t = iv.reps * iv.work + (iv.reps - 1) * iv.rest; a(t, (iv.reps * iv.work * w + (iv.reps - 1) * iv.rest * r) / t * 1.03); }
      else for (let k = 0; k < iv.reps; k++) { a(iv.work, w); if (k < iv.reps - 1) a(iv.rest, r); }
      if (s < sets - 1) a(iv.sr || 0, 50);
    }
    a(iv.cd || 0, 60); a(iv.pad || 0, 60); if (total > used + .5) add(total - used, 60);
  };
  const mid = (o, dl, dh) => ((o.lo || dl) + (o.hi || dh)) / 2;
  if (x.parts) x.parts.forEach(q => { if (q.iv) one(q.iv, q.m); else add(q.m, mid(q, x.lo || 56, x.hi || 72)); });
  else if (x.iv) one(x.iv, x.m);
  else if (x.t === 'race' || /^Eventtag/.test(x.n || '')) add(x.m, Math.max(.6, Math.min(1.02, 1 - .1 * Math.log(Math.max(1, x.m / 60)))) * (x.subPrio === 'C' ? 93 : 100));
  else if (x.t === 'long' && x.fin) { const f = x.fin, t = f.reps * f.work + (f.reps - 1) * f.rest; add(x.m - t, 65); for (let k = 0; k < f.reps; k++) { add(f.work, (f.lo + f.hi) / 2); if (k < f.reps - 1) add(f.rest, 55); } }
  else if (x.t === 'long' && x.hi >= 82) { const t = Math.min(60, x.m * .25); add(t, 83); add(x.m - t, 65); }
  else add(x.m, mid(x, 56, 72));
  return S;
}
function tssIF(x){ const S = tssSegs(x), tot = S.reduce((a, s) => a + s[0], 0); return tot ? Math.pow(S.reduce((a, s) => a + s[0] * Math.pow(s[1] / 100, 4), 0) / tot, .25) : 0; }
const tss = x => !x || !(x.m > 0) || x.t === 'rest' ? 0 : Math.round(x.m / 60 * Math.pow(tssIF(x), 2) * 100);
/* Puls im Verhältnis zum Schwellenpuls → Intensitätsfaktor (Bereichsgrenzen nach Coggan: 69 % LTHR ≈ 56 % FTP, 83 % ≈ 75 %, 94 % ≈ 90 %, 100 % ≈ 100 %) */
const HR_IF = [[.5, .4], [.69, .56], [.83, .75], [.94, .9], [1, 1], [1.06, 1.1]];
function hrIF(r){ if (!(r > 0)) return 0; if (r <= HR_IF[0][0]) return HR_IF[0][1]; for (let k = 1; k < HR_IF.length; k++) if (r <= HR_IF[k][0]) { const [a, b] = HR_IF[k - 1], [c, d] = HR_IF[k]; return b + (r - a) / (c - a) * (d - b); } return HR_IF[HR_IF.length - 1][1]; }
const RPE_IF = [0, .5, .55, .6, .65, .72, .78, .85, .92, 1, 1.05];
/* Belastung einer Fahrt ohne Leistungsdaten. Rückgabe {tss, IF, src:'hr'|'rpe'} oder null */
function loadEst(sec, o){
  o = o || {}; let L = 0; try { L = lthrOf() || (hrMaxOf() ? Math.round(hrMaxOf() * .88) : 0); } catch (e) { elog(e); }
  let IF = 0, src = '';
  if (o.hrAvg > 60 && L > 100) { IF = hrIF(o.hrAvg / L); src = 'hr'; }
  else if (o.rpe >= 1 && o.rpe <= 10) { IF = RPE_IF[Math.round(o.rpe)]; src = 'rpe'; }
  return src && sec > 0 ? {tss:Math.round(sec * IF * IF / 36), IF:Math.round(IF * 100) / 100, src} : null;
}
/* Belastung einer bewerteten Fahrt: mit Leistung wie gemessen, sonst Puls, sonst Empfinden */
function exeLoad(e){ if (!e) return 0; if (e.hasP) return e.tss || 0; const l = loadEst(e.sec, {hrAvg:e.hrAvg, rpe:e.rpe}); return l ? l.tss : e.tss || 0; }
