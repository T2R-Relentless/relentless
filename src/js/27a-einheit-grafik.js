/* ---------- F24 (13.11.2026): Aufbau einer Einheit als Blockgrafik ----------
   Jede Rad-Einheit wird in Abschnitte zerlegt (wkBlocks): Breite = Dauer, Höhe = Zielleistung in % FTP. Bereiche (z. B. 88–94 %)
   stehen auf ihrem Mittelwert, der Bereich steht im Hinweis beim Antippen. Ein- und Ausfahren sind Rampen (Trapez).
   Die Zerlegung folgt derselben Logik wie die TSS-Schätzung (tssSegs in 08-belastung.js): Einfahren, Intervalle mit Pausen,
   Serienpausen, Ausfahren, Rest der Zeit locker. Zonengrenzen wie in der App (VZ_ZP, 27-grafiken.js): Z1 < 55 %, Z2 55–75 %,
   Z3 75–90 %, Z4 90–105 %, Z5 105–120 %, ab 120 % Z6 (rot). Farben angelehnt an die bekannte Workout-Darstellung aus Zwift
   (grau, blau, grün, gelb, orange, rot), als CSS-Variablen für Hell und Dunkel.
   Eine Zeichenfunktion für alle Stellen: wkSvg(x, {mode:'full'|'mini', h, T, ftp, act}). */
const WK_Z = [[0, 55, 'Z1'], [55, 75, 'Z2'], [75, 90, 'Z3'], [90, 105, 'Z4'], [105, 120, 'Z5'], [120, 1e9, 'Z6']];
const wkZi = pc => { const k = WK_Z.findIndex(z => pc < z[1]); return k < 0 ? 5 : k; };
const wkL = (de, en) => (typeof lang === 'function' && lang() === 'en' ? en : de);
/* Abschnitt: d = Dauer in Sekunden, a/b = % FTP am Anfang/Ende (gleich bei festen Blöcken), lo/hi = Zielbereich, k = Art */
const wkB = (d, a, b, lo, hi, k, extra) => ({d:Math.round(d), a, b, lo, hi, k, ...(extra || {})});
function wkIv(iv, total, out, cad){
  const w = (iv.lo + iv.hi) / 2, rlo = iv.rlo || 40, rhi = iv.rhi || 55, r = iv.rlo ? (iv.rlo + iv.rhi) / 2 : 50, sets = iv.sets || 1; let used = 0;
  const add = (m, b) => { if (m > 0) { out.push(b); used += m; } };
  if (iv.wu) add(iv.wu, wkB(iv.wu * 60, 45, 70, 45, 70, 'wu'));
  if (iv.seq) iv.seq.forEach((m, q) => { add(m, wkB(m * 60, w, w, iv.lo, iv.hi, 'work', {no:q + 1, of:iv.seq.length, cad})); if (q < iv.seq.length - 1) add(iv.rest || 0, wkB((iv.rest || 0) * 60, r, r, rlo, rhi, iv.rlo ? 'under' : 'rest')); });
  else for (let s = 0; s < sets; s++) {
    for (let k = 0; k < iv.reps; k++) {
      add(iv.work, wkB(iv.work * 60, w, w, iv.lo, iv.hi, 'work', {no:k + 1, of:iv.reps, set:sets > 1 ? s + 1 : 0, sets, cad}));
      if (k < iv.reps - 1) add(iv.rest, wkB(iv.rest * 60, r, r, rlo, rhi, iv.rlo ? 'under' : 'rest'));
    }
    if (s < sets - 1) add(iv.sr || 3, wkB((iv.sr || 3) * 60, 50, 50, 40, 55, 'sr'));
  }
  if (iv.cd) add(iv.cd, wkB(iv.cd * 60, 65, 45, 45, 65, 'cd'));
  if (iv.pad) add(iv.pad, wkB(iv.pad * 60, 60, 60, 55, 65, 'easy'));
  if (total > used + .5) out.push(wkB((total - used) * 60, 60, 60, 55, 65, 'easy'));
}
/* Fitness-Check ohne Intervall-Struktur: Ablauf wie im Text der Einheit (TESTX0/TESTX in 06-fitness-checks.js) */
function wkTest(x, out){
  const st = String(x.st || ''), wu = /^15 Min/.test(st) ? 15 : 20, hard = /30 Min\. so hart/.test(st) ? 30 : 20, cd = 10;
  out.push(wkB((wu - 8) * 60, 45, 65, 45, 65, 'wu'));
  for (let k = 0; k < 3; k++) { out.push(wkB(60, 105, 105, 100, 110, 'work', {no:k + 1, of:3, opener:1})); out.push(wkB(k < 2 ? 120 : 60, 55, 55, 45, 60, 'rest')); }
  out.push(wkB(5 * 60, 50, 50, 40, 55, 'rest'));
  out.push(wkB(hard * 60, 102, 102, x.lo || 95, x.hi || 105, 'test', {cad:x.cad}));
  out.push(wkB(cd * 60, 60, 45, 45, 60, 'cd'));
  const used = wu + 5 + hard + cd; if (x.m > used + .5) out.push(wkB((x.m - used) * 60, 55, 55, 50, 60, 'easy'));
}
/* Einheiten mit gesteigerter zweiter Hälfte (Text im Plangenerator): erste Hälfte lo–hi, zweite Hälfte lo–hi, Trittfrequenz je Hälfte */
const WK_SPLIT = {'Long Ride, negativer Split':[56, 68, 70, 75, '85–95 U/min', '90–100 U/min'], 'Grundlage, ruhiger Einstieg':[56, 65, 65, 75, '90–100 U/min', '90–100 U/min']};
function wkBlocks(x){
  const out = []; if (!x || !(x.m > 0) || x.t === 'rest') return out;
  const steady = (m, lo, hi, k, extra) => { lo = lo || 56; hi = hi || 72; const mid = (lo + hi) / 2; out.push(wkB(m * 60, mid, mid, lo, hi, k || 'steady', {cad:x.cad, ...(extra || {})})); };
  if (x.parts) x.parts.forEach((q, j) => { const n0 = out.length; if (q.iv) wkIv(q.iv, q.m, out, x.cad); else steady(q.m, q.lo || x.lo, q.hi || x.hi); if (out[n0]) out[n0].part = q.lbl || (j ? 'Rückweg' : 'Hinweg'); });
  else if (x.vo2t && typeof vo2Blocks === 'function') vo2Blocks(x, out);
  else if (x.iv) wkIv(x.iv, x.m, out, x.cad);
  else if (x.t === 'test') wkTest(x, out);
  else if (x.t === 'race' || /^Eventtag/.test(x.n || '')) { const f = Math.max(.6, Math.min(1.02, 1 - .1 * Math.log(Math.max(1, x.m / 60)))) * (x.subPrio === 'C' ? 93 : 100); out.push(wkB(x.m * 60, f, f, Math.round(f - 5), Math.round(f + 5), 'race')); }
  else if (x.t === 'long' && x.fin) { const f = x.fin, t = f.reps * f.work + (f.reps - 1) * f.rest, w = (f.lo + f.hi) / 2; steady(x.m - t, 56, 75);
    for (let k = 0; k < f.reps; k++) { out.push(wkB(f.work * 60, w, w, f.lo, f.hi, 'work', {no:k + 1, of:f.reps, cad:x.cad})); if (k < f.reps - 1) out.push(wkB(f.rest * 60, 55, 55, 50, 60, 'rest')); } }
  else if (x.t === 'long' && x.hi >= 82) { const t = Math.min(60, x.m * .25), a = Math.round((x.m - t) * .6); steady(a, 56, 75); out.push(wkB(t * 60, 83, 83, 76, 88, 'tempo', {cad:x.cad})); steady(x.m - t - a, 56, 75); }
  else if (WK_SPLIT[x.n]) { const v = WK_SPLIT[x.n], h = Math.round(x.m / 2);
    steady(h, v[0], v[1], 'steady', {cad:v[4], part:wkL('1. Hälfte', '1st half')}); steady(x.m - h, v[2], v[3], 'steady', {cad:v[5], part:wkL('2. Hälfte', '2nd half')}); }
  else steady(x.m, x.lo, x.hi);
  return out.filter(b => b.d > 0);
}
const wkMid = b => (b.a + b.b) / 2;
/* Zeit je Zone in Sekunden (Rampen anteilig nach ihrem Mittelwert) */
function wkZoneSec(bl){ const z = WK_Z.map(() => 0); bl.forEach(b => { z[wkZi(wkMid(b))] += b.d; }); return z; }

/* ---------- Texte ---------- */
const wkMin = s => { const m = s / 60; return m < 1 ? wkL(Math.round(s) + ' Sek.', Math.round(s) + ' sec') : m % 1 ? wkL(f1(m) + ' Min.', (Math.round(m * 10) / 10) + ' min') : wkL(m + ' Min.', m + ' min'); };
const wkMinSay = s => { const m = Math.round(s / 60 * 10) / 10; return s < 60 ? wkL(Math.round(s) + ' Sekunden', Math.round(s) + ' seconds') : wkL(String(m).replace('.', ',') + (m === 1 ? ' Minute' : ' Minuten'), m + (m === 1 ? ' minute' : ' minutes')); };
const WK_KN = {wu:['einfahren', 'warm-up'], cd:['ausfahren', 'cool-down'], work:['Intervall', 'interval'], rest:['locker', 'easy'], under:['knapp unter der Schwelle', 'just below threshold'], sr:['Serienpause', 'set break'], easy:['locker', 'easy'], steady:['gleichmäßig', 'steady'], tempo:['Tempo', 'tempo'], race:['Renntempo', 'race pace'], test:['Testabschnitt', 'test effort']};
const wkKn = k => { const v = WK_KN[k] || WK_KN.steady; return wkL(v[0], v[1]); };
/* Zielangabe: Watt (aus FTP), sonst Puls (ohne Wattmesser), sonst Empfinden */
function wkTgt(b, ftp, x){
  const np = typeof noPwr === 'function' && noPwr(), lo = Math.min(b.lo, b.hi), hi = Math.max(b.lo, b.hi), pc = `${Math.round(lo)}–${Math.round(hi)} % FTP`;
  if (np) { const h = typeof hrRng === 'function' ? hrRng(lo, hi) : null; return h ? wkL('Puls ', 'HR ') + hrTxt(h) + ' · ' + pc : wkL('Empfinden ', 'RPE ') + rpeTxt(x || {t:'base'}) + ' · ' + pc; }
  return ftp ? `${Math.round(ftp * lo / 100)}–${Math.round(ftp * hi / 100)} W · ${pc}` : pc;
}
/* Zusammenfassung für VoiceOver: „Einheit 75 Minuten: 15 Minuten einfahren, 3 mal 12 Minuten bei 88 bis 94 Prozent FTP mit 5 Minuten Pause, 10 Minuten ausfahren“ */
function wkSay(x, bl){
  bl = bl || wkBlocks(x); if (!bl.length) return '';
  const pct = b => wkL(`bei ${Math.round(b.lo)} bis ${Math.round(b.hi)} Prozent FTP`, `at ${Math.round(b.lo)} to ${Math.round(b.hi)} percent FTP`), out = []; let i = 0;
  while (i < bl.length) {
    const b = bl[i];
    if (b.k === 'work') { let j = i, n = 0, rest = null; while (j < bl.length && (bl[j].k === 'work' || bl[j].k === 'rest' || bl[j].k === 'under' || bl[j].k === 'sr') && (bl[j].k !== 'work' || (bl[j].d === b.d && bl[j].lo === b.lo))) { if (bl[j].k === 'work') n++; else if (!rest && bl[j].k !== 'sr') rest = bl[j]; j++; }
      while (j > i + 1 && bl[j - 1].k !== 'work') j--;
      const sets = b.sets > 1 ? b.sets : 0, reps = sets ? n / sets : n;
      out.push((sets ? wkL(`${sets} Serien mit je `, `${sets} sets of `) : '') + wkL(`${reps} mal ${wkMinSay(b.d)} ${pct(b)}`, `${reps} times ${wkMinSay(b.d)} ${pct(b)}`) + (rest ? wkL(` mit ${wkMinSay(rest.d)} ${rest.k === 'under' ? 'knapp unter der Schwelle' : 'Pause'}`, ` with ${wkMinSay(rest.d)} ${rest.k === 'under' ? 'just below threshold' : 'recovery'}`) : ''));
      i = Math.max(j, i + 1); continue; }
    if (b.k === 'rest' || b.k === 'sr') { i++; continue; }
    out.push(b.k === 'wu' || b.k === 'cd' ? `${wkMinSay(b.d)} ${wkKn(b.k)}` : `${wkMinSay(b.d)} ${wkKn(b.k)} ${pct(b)}`);
    i++;
  }
  return wkL(`Einheit ${wkMinSay(x.m * 60)}: `, `Workout ${wkMinSay(x.m * 60)}: `) + out.join(', ');
}

/* ---------- Zeichnen ---------- */
/* Zeitachse mit Mindestbreite je Block: kurze Blöcke (z. B. 15 Sek. bei 30/15 in einer langen Einheit) werden auf minW
   verbreitert, die übrigen Blöcke anteilig schmaler. Die Achse folgt derselben Abbildung (Zeit → x), dadurch bleiben
   Markierungen und Blöcke deckungsgleich. */
function wkScale(bl, W, T, minW){
  const tot = bl.reduce((s, b) => s + b.d, 0), TT = Math.max(tot, T || 0); let k = W / TT, wide = new Set();
  for (let it = 0; it < 4; it++) { const small = bl.map((b, i) => i).filter(i => bl[i].d * k < minW); small.forEach(i => wide.add(i)); const fixed = wide.size * minW, rest = TT - [...wide].reduce((s, i) => s + bl[i].d, 0); if (rest <= 0) break; const k2 = (W - fixed) / rest; if (Math.abs(k2 - k) < 1e-6) break; k = k2; }
  const xs = [0]; bl.forEach((b, i) => xs.push(xs[i] + (wide.has(i) ? minW : b.d * k)));
  const ts = [0]; bl.forEach((b, i) => ts.push(ts[i] + b.d));
  const X = t => { if (t >= tot) return xs[bl.length] + (t - tot) * k; let i = 0; while (i < bl.length && ts[i + 1] < t) i++; const f = bl[i] && bl[i].d ? (t - ts[i]) / bl[i].d : 0; return xs[i] + f * (xs[i + 1] - xs[i]); };
  return {xs, ts, X, wide, tot, TT};
}
let wkReg = {}, wkN = 0;
const wkCls = k => 'wkz' + (k + 1);
function wkSvg(x, o = {}){
  try {
    const bl = o.blocks || wkBlocks(x); if (!bl.length) return '';
    const mini = o.mode === 'mini', W = mini ? 300 : 340, H = mini ? (o.h || 28) : (o.h || 132), L = mini ? 0 : 30, R = mini ? 0 : 6, T = mini ? 2 : 8, B = mini ? 0 : 18, pw = W - L - R, ph = H - T - B;
    const act = o.act && o.act.p && o.act.p.some(v => v != null) ? o.act : null, aTot = act ? act.p.length * act.b : 0;
    const sc = wkScale(bl, pw, Math.max(o.T || 0, aTot), mini ? 1.2 : 1.6), mx = Math.max(...bl.map(b => Math.max(b.a, b.b, b.hi * .97)));
    const top = Math.max(mini ? 125 : 130, mx * 1.08), Y = v => T + ph * (1 - Math.min(v, top) / top), base = T + ph;
    const ftp = o.ftp || (S.p && S.p.ftp) || 0, id = 'wk' + (++wkN); if (wkN > 400) { wkReg = {}; wkN = 1; }
    const op = act ? .38 : 1;
    const shapes = bl.map((b, i) => { const x0 = L + sc.xs[i], x1 = L + sc.xs[i + 1], c = wkCls(wkZi(wkMid(b))), g = mini ? 0 : Math.min(.6, (x1 - x0) * .15);
      return b.a === b.b ? `<rect x="${(x0 + g / 2).toFixed(1)}" y="${Y(b.a).toFixed(1)}" width="${Math.max(.6, x1 - x0 - g).toFixed(1)}" height="${(base - Y(b.a)).toFixed(1)}" class="${c}" fill-opacity="${op}"/>`
        : `<path d="M${x0.toFixed(1)},${base.toFixed(1)}L${x0.toFixed(1)},${Y(b.a).toFixed(1)}L${(x1 - g).toFixed(1)},${Y(b.b).toFixed(1)}L${(x1 - g).toFixed(1)},${base.toFixed(1)}Z" class="${c}" fill-opacity="${op}"/>`; }).join('');
    const say = esc(wkSay(x, bl) || (x && x.n) || '');
    let axes = '', line = '';
    if (!mini) {
      const np = typeof noPwr === 'function' && noPwr(), y100 = Y(100), step = sc.TT > 4 * 3600 ? 3600 : sc.TT > 2 * 3600 ? 1800 : sc.TT > 5400 ? 1200 : sc.TT > 2400 ? 900 : 600, xt = [];
      for (let t = 0; t <= sc.TT + 1; t += step) xt.push(t);
      const tl = t => t === 0 ? '0' : t % 3600 === 0 ? t / 3600 + ' h' : t >= 3600 ? Math.floor(t / 3600) + ':' + String(t % 3600 / 60).padStart(2, '0') : t / 60 + "'";
      axes = `<line x1="${L}" x2="${W - R}" y1="${base}" y2="${base}" class="wk-ax"/>`
        + `<line x1="${L}" x2="${W - R}" y1="${y100.toFixed(1)}" y2="${y100.toFixed(1)}" class="wk-ftp"/>`
        + `<text x="${L - 4}" y="${(y100 + 3).toFixed(1)}" text-anchor="end" class="tx">${np ? 'LTHR' : 'FTP'}</text><text x="${L - 4}" y="${(Y(50) + 3).toFixed(1)}" text-anchor="end" class="tx">50 %</text>`
        + bl.map((b, i) => { const x0 = L + sc.xs[i], x1 = L + sc.xs[i + 1]; return b.part && b.k === 'steady' && x1 - x0 > 70 ? `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${(Y(Math.max(b.a, b.b)) - 5).toFixed(1)}" text-anchor="middle" class="tx wk-pl">${esc(b.part)} · ${Math.round(b.lo)}–${Math.round(b.hi)} %</text>` : ''; }).join('')
        + xt.map(t => { const tx = L + sc.X(t), an = tx > W - R - 12 ? 'end' : 'middle'; return `<text x="${(an === 'end' ? W - R : tx).toFixed(1)}" y="${H - 5}" text-anchor="${an}" class="tx">${tl(t)}</text>`; }).join('');
    }
    if (act && ftp) { const k = Math.max(1, Math.round(20 / act.b)), sm = typeof vzSmooth === 'function' ? vzSmooth(act.p, k) : act.p; let d = '', on = false;
      sm.forEach((v, i) => { if (v == null) { on = false; return; } const t = (i + .5) * act.b; d += (on ? 'L' : 'M') + (L + sc.X(t)).toFixed(1) + ',' + Y(v / ftp * 100).toFixed(1); on = true; });
      line = `<path d="${d}" class="wk-act"/>`; }
    if (!mini) wkReg[id] = {bl, xs:sc.xs.map(v => v + L), ts:sc.ts, wide:sc.wide, ftp, x:x ? {t:x.t, cad:x.cad} : null, act:act && ftp ? {p:act.p, b:act.b} : null, X:null, sc};
    const svg = `<svg viewBox="0 0 ${W} ${H}" ${mini ? `preserveAspectRatio="none" style="width:100%;height:${H}px;display:block"` : ''} class="wk ${mini ? 'wk-mini' : 'pchart'}" ${mini && !o.label ? 'aria-hidden="true" focusable="false"' : `role="img" aria-label="${say}"`}${mini ? '' : ` data-wk="${id}" onpointerdown="wkTip(event,'${id}')" onpointermove="wkTip(event,'${id}')"`}>${shapes}${axes}${line}${mini ? '' : `<line class="wk-cur" x1="0" x2="0" y1="${T}" y2="${base}" style="display:none"/>`}</svg>`;
    if (mini) return `<span class="wk-mw" data-noi18n>${svg}</span>`;
    const tip = `<p class="wk-tip text-xs" id="${id}-t" aria-live="polite">${esc(wkL('Tippe oder wische über die Grafik für Details zu jedem Abschnitt.', 'Tap or swipe across the chart for details on each section.'))}</p>`;
    return `<div class="wk-box" data-noi18n>${svg}${tip}${o.noSum ? '' : wkSum(x, bl, act)}</div>`;
  } catch (e) { elog(e); return ''; }
}
/* Kennzahlen und Zonenleiste unter der Grafik */
function wkSum(x, bl, act){
  const zs = wkZoneSec(bl), tot = zs.reduce((s, v) => s + v, 0); if (!tot) return '';
  const IF = typeof tssIF === 'function' ? tssIF(x) : 0, ts = typeof tss === 'function' ? tss(x) : 0;
  const bar = zs.map((v, k) => v ? `<i class="${wkCls(k)}" style="width:${(v / tot * 100).toFixed(1)}%"></i>` : '').join('');
  const lg = zs.map((v, k) => v / tot >= .04 ? `<span><i class="${wkCls(k)}"></i>${WK_Z[k][2]} ${wkMin(Math.round(v / 60) * 60)}</span>` : '').join('');
  return `<p class="mt-1 text-xs" style="color:var(--mute)">${wkMin(x.m * 60)} · TSS ~${ts} · IF ${IF ? IF.toFixed(2).replace('.', wkL(',', '.')) : '–'}${act ? ' · ' + wkL('Linie: gefahrene Leistung (20 Sek. geglättet)', 'Line: power ridden (20 s smoothed)') : ''}</p><div class="wk-zb" aria-hidden="true">${bar}</div><div class="wk-zl">${lg}</div>`;
}
/* Antippen bzw. Wischen: Abschnitt unter dem Finger beschreiben und Markierung setzen */
function wkTip(ev, id){
  try {
    const g = wkReg[id], svg = ev.currentTarget || document.querySelector(`[data-wk="${id}"]`); if (!g || !svg) return;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (ev.clientX - r.left) / r.width * vb.width;
    let i = g.xs.findIndex((v, k) => k < g.bl.length && px >= v && px < g.xs[k + 1]); if (i < 0) i = px < g.xs[0] ? 0 : g.bl.length - 1;
    const b = g.bl[i], cur = svg.querySelector('.wk-cur'); if (cur) { cur.setAttribute('x1', px.toFixed(1)); cur.setAttribute('x2', px.toFixed(1)); cur.style.display = ''; }
    const at = Math.round(g.ts[i] / 60), name = b.k === 'work' ? (b.opener ? wkL('Kurz zügig', 'Short opener') : wkL('Intervall', 'Interval')) + ` ${b.no}/${b.of}` + (b.set ? wkL(` · Serie ${b.set}/${b.sets}`, ` · set ${b.set}/${b.sets}`) : '') : b.part && b.k === 'steady' ? b.part : wkKn(b.k).replace(/^./, c => c.toUpperCase());
    const ramp = b.a !== b.b ? wkL(` · steigt von ${Math.round(b.a)} auf ${Math.round(b.b)} %`, ` · from ${Math.round(b.a)} to ${Math.round(b.b)} %`).replace(/steigt von (\d+) auf (\d+)/, (m, a, c) => +a > +c ? `sinkt von ${a} auf ${c}` : m) : '';
    let ist = '';
    if (g.act) { const f = (px - g.xs[0]) / (g.xs[g.bl.length] - g.xs[0]), sec = g.ts[i] + Math.max(0, Math.min(1, (px - g.xs[i]) / Math.max(.01, g.xs[i + 1] - g.xs[i]))) * b.d, k = Math.floor(sec / g.act.b), v = g.act.p[k]; if (v != null && isFinite(f)) ist = wkL(` · gefahren ${Math.round(v)} W`, ` · ridden ${Math.round(v)} W`); }
    const t = `${name} · ${wkL('ab Min.', 'from min')} ${at} · ${wkMin(b.d)} · ${wkTgt(b, g.ftp, g.x)}${ramp}${b.cad && b.k !== 'rest' && b.k !== 'sr' ? wkL(' · Trittfrequenz ', ' · cadence ') + b.cad.replace(' U/min', wkL(' U/min', ' rpm')) : ''}${ist}${g.wide.has(i) ? wkL(' · Block zur besseren Sichtbarkeit breiter gezeichnet', ' · drawn wider so it stays visible') : ''}`;
    const el = document.getElementById(id + '-t'); if (el) el.textContent = t;
  } catch (e) { elog(e); }
}
/* Zusätzliche (ungeplante) Fahrt: gefahrene Leistung als Fläche, jede Spalte in der Farbe ihrer Zone */
function wkActSvg(ser, ftp){
  try {
    if (!ser || !ser.p || !ftp || !ser.p.some(v => v != null)) return '';
    const W = 340, H = 120, L = 30, R = 6, T = 8, B = 18, pw = W - L - R, ph = H - T - B, n = ser.p.length, k = Math.max(1, Math.round(20 / ser.b)), p = typeof vzSmooth === 'function' ? vzSmooth(ser.p, k) : ser.p;
    const pv = p.filter(v => v != null).sort((a, b) => a - b), top = Math.max(130, (pv[Math.floor(pv.length * .99)] || 0) / ftp * 108), Y = v => T + ph * (1 - Math.min(v, top) / top), base = T + ph, cw = pw / n;
    const cols = p.map((v, i) => v == null ? '' : `<rect x="${(L + i * cw).toFixed(1)}" y="${Y(v / ftp * 100).toFixed(1)}" width="${(cw + .3).toFixed(2)}" height="${(base - Y(v / ftp * 100)).toFixed(1)}" class="${wkCls(wkZi(v / ftp * 100))}"/>`).join('');
    const zs = WK_Z.map(() => 0); p.forEach(v => { if (v != null) zs[wkZi(v / ftp * 100)] += ser.b; }); const tot = zs.reduce((s, v) => s + v, 0);
    const say = wkL(`Gefahrene Leistung, ${wkMinSay(n * ser.b)}. `, `Power ridden, ${wkMinSay(n * ser.b)}. `) + zs.map((v, z) => v / tot >= .05 ? `${WK_Z[z][2]} ${Math.round(v / tot * 100)} %` : '').filter(Boolean).join(', ');
    return `<div class="wk-box" data-noi18n><p class="text-xs font-semibold" style="color:var(--mute)">${wkL('Leistung nach Zonen', 'Power by zone')}</p><svg viewBox="0 0 ${W} ${H}" class="wk pchart" role="img" aria-label="${esc(say)}">${cols}<line x1="${L}" x2="${W - R}" y1="${Y(100).toFixed(1)}" y2="${Y(100).toFixed(1)}" class="wk-ftp"/><text x="${L - 4}" y="${(Y(100) + 3).toFixed(1)}" text-anchor="end" class="tx">FTP</text><line x1="${L}" x2="${W - R}" y1="${base}" y2="${base}" class="wk-ax"/></svg><div class="wk-zb" aria-hidden="true">${zs.map((v, z) => v ? `<i class="${wkCls(z)}" style="width:${(v / tot * 100).toFixed(1)}%"></i>` : '').join('')}</div></div>`;
  } catch (e) { elog(e); return ''; }
}

/* ---------- Kraft, Stabilität, Mobilität: schlichte Zeitleiste der Übungen (Übung · Pause · Übung) ---------- */
function wkSeqSvg(kind, i){
  try {
    if (typeof sqSession !== 'function') return '';
    const se = sqSession(kind, i); if (!se || !se.items || !se.items.length) return '';
    const st = sqSteps(se, {...sqCfg(), voice:false, hints:false}).filter(s => s.t === 'ex' || s.t === 'tr' || s.t === 'rr');
    const segs = st.map(s => ({ex:s.t === 'ex', d:s.t === 'ex' ? (s.dur ? s.dur / 1000 : sqEst(s.d)) : s.dur / 1000, n:s.n || ''})), tot = segs.reduce((a, s) => a + s.d, 0); if (!tot) return '';
    const W = 340, H = 22; let x = 0;
    const rects = segs.map((s, k) => { const w = s.d / tot * W, r = `<rect x="${x.toFixed(1)}" y="${s.ex ? 2 : 8}" width="${Math.max(.8, w - .8).toFixed(1)}" height="${s.ex ? 18 : 6}" class="${s.ex ? 'wk-sx' + (se.items.findIndex(q => q.n === s.n) % 2) : 'wk-sp'}"/>`; x += w; return r; }).join('');
    const nEx = segs.filter(s => s.ex).length, say = wkL(`Ablauf ${wkMinSay(tot)}: ${se.items.length} Übungen, ${nEx} Durchgänge mit Pausen dazwischen. `, `Sequence ${wkMinSay(tot)}: ${se.items.length} exercises, ${nEx} efforts with breaks in between. `) + se.items.map(q => q.n).join(', ');
    return `<div class="wk-box" data-noi18n><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${H}px;display:block" class="wk" role="img" aria-label="${esc(say)}">${rects}</svg><p class="mt-1 text-xs" style="color:var(--mute)">${wkL('Ablauf etwa', 'About')} ${wkMin(Math.round(tot / 60) * 60)} · ${wkL('dunkle Balken = Übungen, schmale Balken = Pausen', 'dark bars = exercises, thin bars = breaks')}</p></div>`;
  } catch (e) { elog(e); return ''; }
}
