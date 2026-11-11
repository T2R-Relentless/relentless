/* ---------- Grafiken zu Fahrten: Verlauf mit Zielbereich, Zeit in Zonen, Bestwerte, Formkurve bis zum Event ----------
   Beim Einlesen einer Fahrt entsteht eine kompakte Zeitreihe (höchstens 600 Punkte, Watt, Puls, Höhe), die mit der Bewertung
   gespeichert wird (nur für die letzten 40 bewerteten Fahrten, damit der Speicher im Browser reicht). Die Sekundenwerte selbst
   werden nicht gespeichert, nur daraus berechnete Zonenzeiten und Bestwerte. */
const VZ_ZP = [[0, 55, 'Z1', 'Erholung', '#9aa7b8'], [55, 75, 'Z2', 'Grundlage', '#00c2b2'], [75, 90, 'Z3', 'Tempo', '#4f9dde'], [90, 105, 'Z4', 'Schwelle', '#f2b134'], [105, 120, 'Z5', 'VO2max', '#f07d3a'], [120, 150, 'Z6', 'Anaerob', '#e0464e'], [150, 9999, 'Z7', 'Sprint', '#8e3bbf']];
const VZ_ZH_L = [[0, 81, 'Z1', 'Erholung', '#9aa7b8'], [81, 90, 'Z2', 'Grundlage', '#00c2b2'], [90, 94, 'Z3', 'Tempo', '#4f9dde'], [94, 100, 'Z4', 'Schwelle', '#f2b134'], [100, 999, 'Z5', 'Hoch', '#e0464e']];
const VZ_ZH_M = [[0, 60, 'Z1', 'Erholung', '#9aa7b8'], [60, 70, 'Z2', 'Grundlage', '#00c2b2'], [70, 80, 'Z3', 'Tempo', '#4f9dde'], [80, 90, 'Z4', 'Schwelle', '#f2b134'], [90, 999, 'Z5', 'Hoch', '#e0464e']];
const VZ_PB = [['d5', 5, '5 Sek.'], ['m1', 60, '1 Min.'], ['m5', 300, '5 Min.'], ['m20', 1200, '20 Min.'], ['m60', 3600, '60 Min.']];

/* Sekundenreihe wie streamOf (gleiche Zeitbasis wie die Intervallsuche), dazu Puls und Höhe */
function vzAttach(a, r){
  try {
    const pts = r.pts.filter(q => q.t != null && isFinite(q.t)).sort((p, q) => p.t - q.t), P = [], H = [], Z = [];
    for (let k = 1; k < pts.length; k++) { const dt = pts[k].t - pts[k - 1].t; if (dt <= 0 || dt > 30) continue; const o = pts[k - 1], n = pts[k];
      const p = o.p != null ? o.p : n.p, h = o.h != null && o.h >= 35 && o.h <= 230 ? o.h : null, z = o.a != null ? o.a : n.a;
      for (let j = 0; j < Math.round(dt); j++) { P.push(p == null ? null : p); H.push(h); Z.push(z == null ? null : z); } }
    if (P.length < 120) return;
    const B = Math.max(5, Math.ceil(P.length / 600)), agg = arr => { if (!arr.some(v => v != null)) return null; const o = []; for (let s = 0; s < arr.length; s += B) { let n = 0, t = 0; for (let j = s; j < Math.min(arr.length, s + B); j++) if (arr[j] != null) { n++; t += arr[j]; } o.push(n ? Math.round(t / n) : null); } return o; };
    const ser = {b:B, n:P.length, p:agg(P), h:agg(H), z:agg(Z)};
    Object.defineProperty(a, 'vzSer', {value:ser, enumerable:false, configurable:true});
    Object.defineProperty(a, 'vzSec', {value:{p:P, h:H}, enumerable:false, configurable:true});
  } catch (e) { elog(e); }
}
const vzBest = (P, W) => { if (!P || P.length < W) return 0; let s = 0, b = 0; for (let k = 0; k < P.length; k++) { s += P[k] || 0; if (k >= W) s -= P[k - W] || 0; if (k >= W - 1 && s > b) b = s; } return Math.round(b / W); };
function vzHrZones(){ const L = lthrOf(), M = hrMaxOf(); return L ? {z:VZ_ZH_L, ref:L, k:'lthr'} : M ? {z:VZ_ZH_M, ref:M, k:'max'} : null; }
/* Bisherige Bestwerte: gespeicherte Rekorde plus alle Fahrten aus Einstieg und laufendem Plan (ohne die aktuelle) */
function vzPrev(a){
  const o = {}; const pb = S.pb || {};
  VZ_PB.forEach(([k]) => { if (pb[k] && pb[k].id !== a.id) o[k] = pb[k].w; });
  [...(S.hist || []), ...(S.man || [])].forEach(m => { if (!m || m.id === a.id || (a.ts && m.ts && m.ts > a.ts)) return; VZ_PB.forEach(([k]) => { if (k !== 'd5' && m[k] > (o[k] || 0)) o[k] = m[k]; }); });
  return o;
}
/* An die Bewertung hängen: Zeitreihe, Zonenzeiten, neue Bestwerte */
function vzKeep(e, a){
  try {
    if (!e || !a) return e;
    const ftp = S.p && S.p.ftp, sec = a.vzSec; e.ftp = ftp || null;
    if (a.vzSer) e.ser = a.vzSer;
    if (sec && ftp && sec.p.filter(v => v != null).length > .5 * sec.p.length) { const zp = VZ_ZP.map(() => 0); sec.p.forEach(v => { if (v == null) return; const pc = v / ftp * 100; zp[VZ_ZP.findIndex(z => pc < z[1])]++; }); e.zp = zp; }
    const hz = vzHrZones(); if (sec && hz && sec.h.filter(v => v != null).length > .5 * sec.h.length) { const zh = hz.z.map(() => 0); sec.h.forEach(v => { if (v == null) return; const pc = v / hz.ref * 100; zh[hz.z.findIndex(z => pc < z[1])]++; }); e.zh = zh; e.zhk = hz.k; }
    if (sec && e.hasP) {
      const prev = vzPrev(a), pr = [], cur = {}; VZ_PB.forEach(([k, W, l]) => { const v = vzBest(sec.p, W); if (!v) return; cur[k] = v; if (prev[k] && v > prev[k]) pr.push({k, l, w:v, was:prev[k]}); });
      if (pr.length) e.pr = pr;
      S.pb = {...(S.pb || {})}; VZ_PB.forEach(([k]) => { const v = cur[k]; if (v && (!S.pb[k] || v > S.pb[k].w) && (!prev[k] || v >= prev[k])) S.pb[k] = {w:v, day:a.day, n:a.n, id:a.id}; });
      if (pr.length) { try { track('bestwert'); } catch (er) { elog(er); } }
    }
    /* Speicher begrenzen: Zeitreihen nur für die 40 neuesten Bewertungen */
    const all = [...Object.values(S.p.exe || {}), ...Object.values(S.p.exeP || {}).flat().filter(Boolean)].filter(v => v && v.ser && v !== e).sort((p, q) => (q.at || 0) - (p.at || 0));
    all.slice(39).forEach(v => { delete v.ser; });
  } catch (er) { elog(er); }
  return e;
}

/* ---------- Grafik 1: Verlauf mit Zielbereich ---------- */
const vzSmooth = (arr, k) => { if (!arr) return null; if (k <= 1) return arr; const o = []; for (let i = 0; i < arr.length; i++) { let n = 0, t = 0; for (let j = Math.max(0, i - k + 1); j <= i; j++) if (arr[j] != null) { n++; t += arr[j]; } o.push(n ? t / n : null); } return o; };
const vzPath = (arr, X, Y) => { let d = '', on = false; arr.forEach((v, i) => { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); on = true; }); return d; };
const vzHm = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? h + ':' + String(m).padStart(2, '0') + ' h' : m + ' min'; };
function vzTrace(e){
  const s = e.ser; if (!s || !(s.p || s.h)) return '';
  const W = 340, H = 176, L = 30, R = 30, T = 10, Bm = 20, n = (s.p || s.h).length, B = s.b, X = i => L + i * (W - L - R) / Math.max(1, n - 1), Xs = sec => X(sec / B);
  const ftp = e.ftp || (S.p && S.p.ftp) || 0, hasP = !!(s.p && s.p.some(v => v != null) && ftp);
  const p = hasP ? vzSmooth(s.p, Math.max(1, Math.round(30 / B))) : null, h = s.h && s.h.some(v => v != null) ? vzSmooth(s.h, Math.max(1, Math.round(20 / B))) : null;
  const tg = []; let band = null;
  if (hasP && e.iv && e.iv.some(f => f.s != null) && e.ivT) e.iv.forEach(f => { if (f.s != null) tg.push({s:f.s, d:f.d, lo:e.ivT.lo * ftp / 100, hi:e.ivT.hi * ftp / 100, st:f.st}); });
  else if (hasP && e.x && e.x.lo && e.x.hi && ['base', 'long', 'rec', 'com', 'tempo', 'ss'].includes(e.x.t)) band = [e.x.lo * ftp / 100, e.x.hi * ftp / 100];
  const pv = p ? p.filter(v => v != null).sort((a, b) => a - b) : [], p98 = pv.length ? pv[Math.floor(pv.length * .98)] : 0;
  const top = hasP ? Math.max(p98 * 1.1, ...tg.map(t => t.hi * 1.08), band ? band[1] * 1.25 : 0, ftp * .9) : 0, Y = v => T + (H - T - Bm) * (1 - Math.min(v, top) / top);
  const hv = h ? h.filter(v => v != null) : [], hlo = hv.length ? Math.max(40, Math.floor((Math.min(...hv) - 10) / 10) * 10) : 0, hhi = hv.length ? Math.ceil((Math.max(...hv) + 5) / 10) * 10 : 1, Yh = v => T + (H - T - Bm) * (1 - (v - hlo) / Math.max(1, hhi - hlo));
  const zv = s.z ? s.z.filter(v => v != null) : [], zlo = zv.length ? Math.min(...zv) : 0, zhi = zv.length ? Math.max(...zv) : 1, Yz = v => H - Bm - (H - T - Bm) * .38 * (v - zlo) / Math.max(15, zhi - zlo);
  const elev = zv.length > 10 && zhi - zlo >= 15 ? (() => { let d = `M${X(0).toFixed(1)},${(H - Bm).toFixed(1)}`; s.z.forEach((v, i) => { if (v != null) d += `L${X(i).toFixed(1)},${Yz(v).toFixed(1)}`; }); return d + `L${X(n - 1).toFixed(1)},${(H - Bm).toFixed(1)}Z`; })() : '';
  const SC = {in:'#0a8f6a', over:'#c2410c', under:'#b7791f', miss:'#c0392b'};
  const ceil = !hasP && e.hrc && e.hrc.ceil && h ? Yh(e.hrc.ceil) : null;
  const tot = n * B, step = tot > 3 * 3600 ? 3600 : tot > 5400 ? 1800 : tot > 2400 ? 900 : 600, xt = []; for (let t = 0; t <= tot; t += step) xt.push(t);
  const yt = hasP ? [0, Math.round(ftp / 2), ftp].filter(v => v <= top) : [], ht = h ? [hlo, Math.round((hlo + hhi) / 20) * 10, hhi] : [];
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pchart vzc" role="img" aria-label="Verlauf der Fahrt">
    ${elev ? `<path d="${elev}" class="vz-el"/>` : ''}
    ${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="gl0"/><text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end" class="tx">${v === ftp && v ? 'FTP' : v}</text>`).join('')}
    ${!hasP ? ht.map(v => `<line x1="${L}" x2="${W - R}" y1="${Yh(v)}" y2="${Yh(v)}" class="gl0"/>`).join('') : ''}
    ${band ? `<rect x="${L}" y="${Y(band[1])}" width="${W - L - R}" height="${Math.max(2, Y(band[0]) - Y(band[1]))}" class="vz-band"/>` : ''}
    ${tg.map(t => `<rect x="${Xs(t.s).toFixed(1)}" y="${Y(t.hi).toFixed(1)}" width="${Math.max(2, Xs(t.s + t.d) - Xs(t.s)).toFixed(1)}" height="${Math.max(2, Y(t.lo) - Y(t.hi)).toFixed(1)}" fill="${SC[t.st] || '#0a8f6a'}" fill-opacity=".22" stroke="${SC[t.st] || '#0a8f6a'}" stroke-width="1"/>`).join('')}
    ${ceil != null ? `<line x1="${L}" x2="${W - R}" y1="${ceil}" y2="${ceil}" class="vz-ceil"/><text x="${W - R - 2}" y="${ceil - 3}" text-anchor="end" class="tx tg">Obergrenze ${e.hrc.ceil}</text>` : ''}
    ${h ? `<path d="${vzPath(h, X, Yh)}" class="vz-hr${esc(hasP ? '' : ' vz-hr1')}"/>` : ''}
    ${p ? `<path d="${vzPath(p, X, Y)}" class="vz-pw"/>` : ''}
    ${h ? ht.map(v => `<text x="${W - R + 4}" y="${Yh(v) + 3}" class="tx vz-ht">${v}</text>`).join('') : ''}
    ${xt.map(t => `<text x="${Xs(t)}" y="${H - 5}" text-anchor="middle" class="tx">${t ? (t >= 3600 && t % 3600 === 0 ? t / 3600 + ' h' : Math.floor(t / 3600) ? Math.floor(t / 3600) + ':' + String(t % 3600 / 60).padStart(2, '0') : t / 60 + "'") : '0'}</text>`).join('')}</svg>`;
  const lg = `<div class="plg">${p ? '<span><i class="vzl-pw"></i>Watt (30 s)</span>' : ''}${h ? '<span><i class="vzl-hr"></i>Puls</span>' : ''}${elev ? '<span><i class="vzl-el"></i>Höhe</span>' : ''}${tg.length || band ? '<span><i class="vzl-tg"></i>Zielbereich</span>' : ''}</div>`;
  const note = tg.length ? (() => { const c = k => tg.filter(t => t.st === k).length; return `${c('in')} von ${tg.length} Intervallen im Zielbereich${c('over') ? `, ${c('over')} darüber` : ''}${c('under') + c('miss') ? `, ${c('under') + c('miss')} darunter` : ''}.`; })() : band ? `Zielbereich ${Math.round(band[0])}–${Math.round(band[1])} W.` : !hasP && h ? 'Ohne Leistungsdaten zeigt die Grafik deinen Puls.' : '';
  return `<div class="mt-4"><p class="text-xs font-semibold" style="color:var(--mute)">Verlauf · ${vzHm(tot)}</p>${svg}${lg}${note ? `<p class="mt-1 text-xs" style="color:var(--mute)">${note}</p>` : ''}</div>`;
}

/* ---------- Grafik 2: Zeit in Zonen, Plan gegen Ist ---------- */
function vzTargetZone(e){
  const x = e.x || {}, mid = e.ivT ? (e.ivT.lo + e.ivT.hi) / 2 : x.lo && x.hi ? (x.lo + x.hi) / 2 : null; if (mid == null) return null;
  return VZ_ZP.findIndex(z => mid < z[1]);
}
function vzZones(e){
  const useP = !!(e.zp && e.zp.some(Boolean)), arr = useP ? e.zp : e.zh; if (!arr || !arr.some(Boolean)) return '';
  const Z = useP ? VZ_ZP : e.zhk === 'lthr' ? VZ_ZH_L : VZ_ZH_M, tot = arr.reduce((s, v) => s + v, 0), mx = Math.max(...arr);
  let tz = useP ? vzTargetZone(e) : null; if (!useP && e.x && ['base', 'long', 'rec', 'com'].includes(e.x.t)) tz = e.x.t === 'rec' ? 0 : 1;
  const rows = Z.map((z, k) => { const v = arr[k], pc = tot ? v / tot * 100 : 0, on = k === tz; return `<div class="vz-zr${esc(on ? ' on' : '')}"><span class="vz-zl"><b>${z[2]}</b> ${z[3]}</span><span class="vz-zb"><i style="width:${esc(mx ? Math.max(v ? 1.5 : 0, v / mx * 100) : 0)}%;background:${esc(z[4])}"></i></span><span class="vz-zv">${pc >= 1 ? Math.round(pc) + ' %' : v ? '<1 %' : '–'}</span></div>`; }).join('');
  let sum = '';
  if (tz != null && tz >= 0) {
    const pin = tot ? arr[tz] / tot * 100 : 0, z = Z[tz];
    if (e.iv && e.iv.length && useP) { const plan = e.iv.length * (e.iv[0].d || 0), got = arr.slice(tz).reduce((s, v) => s + v, 0); sum = plan ? `Ziel: ${Math.round(plan / 60)} Min. in ${z[2]} ${z[3]} oder höher. Gefahren: ${Math.round(got / 60)} Min.` : ''; }
    else { const easy = tz <= 1, below = arr.slice(0, tz).reduce((s, v) => s + v, 0) / Math.max(1, tot) * 100, above = arr.slice(tz + 1).reduce((s, v) => s + v, 0) / Math.max(1, tot) * 100;
      sum = `Ziel ${z[2]} ${z[3]}: ${Math.round(pin)} % der Fahrzeit dort` + (easy ? (above >= 15 ? `, ${Math.round(above)} % darüber. Für eine lockere Einheit war das zu viel Zeit in höheren Zonen.` : pin + below >= 75 ? '. Sauber locker gefahren.' : '.') : `${below >= 40 ? `, ${Math.round(below)} % darunter` : ''}.`); }
  }
  const sub = useP && e.zh && e.zh.some(Boolean) ? (() => { const Zh = e.zhk === 'lthr' ? VZ_ZH_L : VZ_ZH_M, th = e.zh.reduce((s, v) => s + v, 0); return `<p class="mt-2 text-xs" style="color:var(--mute)">Puls-Zonen</p><div class="vz-stk">${e.zh.map((v, k) => v ? `<i style="width:${esc(v / th * 100)}%;background:${esc(Zh[k][4])}" title="${esc(Zh[k][2])} ${Math.round(v / th * 100)} %"></i>` : '').join('')}</div><div class="vz-stl">${Zh.map((z, k) => e.zh[k] / th >= .08 ? `<span>${z[2]} ${Math.round(e.zh[k] / th * 100)} %</span>` : '').join('')}</div>`; })() : '';
  return `<div class="mt-4"><p class="text-xs font-semibold" style="color:var(--mute)">Zeit in Zonen (${useP ? 'Watt' : 'Puls'})</p><div class="mt-1.5">${rows}</div>${sum ? `<p class="mt-1.5 text-xs">${sum}</p>` : ''}${sub}</div>`;
}
function vzRide(e){ try { return vzTrace(e) + vzZones(e); } catch (er) { elog(er); return ''; } }

/* ---------- Bestwerte ---------- */
const VZ_TROPHY = '<svg style="flex:none;width:18px;height:18px" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/></svg>';
function vzPrBadge(e){
  if (!e || !e.pr || !e.pr.length) return '';
  const top = [...e.pr].reverse().slice(0, 3), more = e.pr.length - top.length;
  return `<div class="vz-pr mt-3 flex items-start gap-2 p-2.5 text-sm">${VZ_TROPHY}<span><b>${e.pr.length === 1 ? 'Neue Bestleistung' : e.pr.length + ' neue Bestleistungen'}:</b> ${top.map(r => `${r.l} <b>${r.w} W</b> <span style="opacity:.75">(vorher ${r.was} W)</span>`).join(' · ')}${more > 0 ? ` <span style="opacity:.75">(+${more} weitere)</span>` : ''}</span></div>`;
}
function vzPbCard(){
  const pb = S.pb || {}, prev = vzPrev({id:null}), rows = VZ_PB.map(([k, , l]) => { const s = pb[k], v = Math.max(s ? s.w : 0, prev[k] || 0); return v ? {l, v, day:s && s.w === v ? s.day : null} : null; }).filter(Boolean);
  if (!rows.length) return '';
  const kg = S.p && typeof kgOf === 'function' ? kgOf(S.p) : 0;
  return `<section class="panel p-4"><div class="flex items-center gap-2"><span style="color:#b7791f">${VZ_TROPHY}</span><p class="hd text-xl font-semibold">Deine Bestwerte</p></div><p class="mt-1 text-sm" style="color:var(--mute)">Höchste Durchschnittsleistung aus deinen hochgeladenen Fahrten. Fährst du eine neue Bestleistung, zeigt die App sie in der Bewertung an.</p>
    <div class="mt-3 grid grid-cols-3 gap-2">${rows.map(r => `<div class="p-2.5" style="border:1px solid var(--line)"><p class="text-xs" style="color:var(--mute)">${r.l}</p><p class="hd text-xl font-semibold">${r.v} W</p><p class="text-xs" style="color:var(--mute)">${kg ? f1(r.v / kg) + ' W/kg' : ''}${r.day ? (kg ? ' · ' : '') + fmt(r.day) : ''}</p></div>`).join('')}</div></section>`;
}

/* ---------- Formkurve bis zum Event (Fitness, Ermüdung, Form) ---------- */
function vzDaily(){
  const d = {}, seen = new Set(), add = (day, t, key) => { if (!day || !(t > 0)) return; if (key) { if (seen.has(key)) return; seen.add(key); } d[day] = (d[day] || 0) + t; };
  [...(S.man || []), ...(S.hist || [])].forEach(m => add(m.day || (m.ts || '').slice(0, 10), m.tss, (m.day || '') + '|' + Math.round((m.sec || 0) / 60)));
  const p = S.p; if (p) { Object.values(p.exe || {}).forEach(e => add(e.day, e.tss, (e.day || '') + '|' + Math.round((e.sec || 0) / 60)));
    /* Erledigte Einheiten ohne hochgeladene Fahrt: geplante Belastung */
    if (S.plan && S.done && hasStarted(p)) S.plan.forEach((x, i) => { if (S.done[i] && x && x.m > 0) { const day = dstr(i); if (!d[day]) { try { d[day] = tss(x); } catch (e) { elog(e); } } } });
    /* Ältere Wochen nur aus dem Wochenrückblick */
    Object.entries(p.wh || {}).forEach(([w, r]) => { const base = new Date(p.start + 'T12:00:00'); base.setDate(base.getDate() + (w - 1) * 7); const days = [0, 1, 2, 3, 4, 5, 6].map(k => { const x = new Date(base); x.setDate(x.getDate() + k); return lstr(x); }); if (!days.some(x => d[x]) && r.dt > 0) days.forEach(x => { d[x] = r.dt / 7; }); }); }
  return d;
}
function vzFuture(){
  const p = S.p, o = {}; if (!p || !S.plan) return o; const end = endOf(p), today = iso(0);
  S.plan.forEach((x, i) => { const day = dstr(i); if (day > today && x && x.m > 0) { try { o[day] = tss(x); } catch (e) { elog(e); } } });
  const sw = typeof strWeek !== 'undefined' ? strWeek : null;
  try { const tot = phases(p).slice(-1)[0].to; for (let w = S.wk + 1; w <= Math.min(tot, S.wk + 30); w++) { const pl = genWeek(p, w), base = new Date(p.start + 'T12:00:00'); base.setDate(base.getDate() + (w - 1) * 7);
      pl.forEach((x, k) => { const dd = new Date(base); dd.setDate(dd.getDate() + k); const day = lstr(dd); if (day <= end && x && x.m > 0) { try { o[day] = tss(x); } catch (e) { elog(e); } } }); } } catch (e) { elog(e); }
  try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); }
  return o;
}
function vzForm(){
  const p = S.p; if (!p || !hasStarted(p)) return '';
  const past = vzDaily(), fut = vzFuture(), today = iso(0), end = endOf(p); if (Object.keys(past).length < 3) return '';
  const first = Object.keys(past).sort()[0], start = new Date(Math.max(new Date(first + 'T12:00:00'), Date.now() - 120 * 864e5)), days = [];
  for (let d = new Date(start); lstr(d) <= end && days.length < 400; d.setDate(d.getDate() + 1)) days.push(lstr(d));
  const seed = days.slice(0, 28).filter(d => d <= today).reduce((t, d) => t + (past[d] || 0), 0) / Math.max(1, Math.min(28, days.filter(d => d <= today).length));
  let ctl = seed, atl = seed; const kC = 1 - Math.exp(-1 / 42), kA = 1 - Math.exp(-1 / 7), rows = days.map(day => { const t = day <= today ? (past[day] || 0) : (fut[day] || 0), tsb = ctl - atl; ctl += (t - ctl) * kC; atl += (t - atl) * kA; return {day, ctl, atl, tsb, f:day > today}; });
  const vis = rows.filter(r => r.day >= iso(-42)); if (vis.length < 5) return '';
  const W = 340, H = 150, H2 = 70, L = 28, R = 8, T = 10, Bm = 18, n = vis.length, X = i => L + i * (W - L - R) / Math.max(1, n - 1);
  const mx = Math.max(...vis.map(r => Math.max(r.ctl, r.atl)), 20) * 1.1, Y = v => T + (H - T - Bm) * (1 - v / mx);
  const tm = Math.max(10, ...vis.map(r => Math.abs(r.tsb))) * 1.1, Yt = v => H2 / 2 - (H2 / 2 - 6) * v / tm, ti = vis.findIndex(r => r.f), tI = ti < 0 ? n - 1 : ti - 1;
  const line = (k, from, to) => vis.slice(from, to + 1).map((r, j) => `${X(from + j).toFixed(1)},${Y(r[k]).toFixed(1)}`).join(' ');
  const ev = vis[n - 1], evT = Math.round(ev.tsb), evC = Math.round(ev.ctl), isEv = p.goal === 'event';
  const mt = []; for (let i = 0; i < n; i++) { const dd = new Date(vis[i].day + 'T12:00:00'); if (dd.getDate() === 1 || i === 0) mt.push(i); }
  const MON = lang() === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pchart" role="img" aria-label="Fitness und Ermüdung">
    ${[0, Math.round(mx / 2 / 10) * 10].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="gl0"/><text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end" class="tx">${v}</text>`).join('')}
    ${ti > 0 ? `<rect x="${X(tI)}" y="${T}" width="${X(n - 1) - X(tI)}" height="${H - T - Bm}" class="vz-fut"/>` : ''}
    <polyline points="${line('atl', 0, tI)}" class="vz-atl"/><polyline points="${line('ctl', 0, tI)}" class="vz-ctl"/>
    ${ti > 0 ? `<polyline points="${line('atl', tI, n - 1)}" class="vz-atl vz-dash"/><polyline points="${line('ctl', tI, n - 1)}" class="vz-ctl vz-dash"/>` : ''}
    <line x1="${X(tI)}" x2="${X(tI)}" y1="${T}" y2="${H - Bm}" class="now"/><text x="${X(tI) + 3}" y="${T + 8}" class="tx">heute</text>
    ${isEv ? `<line x1="${X(n - 1)}" x2="${X(n - 1)}" y1="${T}" y2="${H - Bm}" class="goal"/>` : ''}
    ${mt.map(i => `<text x="${X(i)}" y="${H - 5}" class="tx">${MON[new Date(vis[i].day + 'T12:00:00').getMonth()]}</text>`).join('')}</svg>
    <svg viewBox="0 0 ${W} ${H2}" class="pchart" role="img" aria-label="Form">
    <line x1="${L}" x2="${W - R}" y1="${Yt(0)}" y2="${Yt(0)}" class="gl0"/><text x="${L - 4}" y="${Yt(0) + 3}" text-anchor="end" class="tx">0</text>
    ${vis.map((r, i) => { const v = r.tsb, y0 = Yt(0), y1 = Yt(v), bw = Math.max(1, (W - L - R) / n * .8); return `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(.5, Math.abs(y1 - y0)).toFixed(1)}" fill="${v >= 5 ? '#0a8f6a' : v <= -10 ? '#f07d3a' : '#9aa7b8'}" fill-opacity="${r.f ? .45 : 1}"/>`; }).join('')}
    <text x="${L + 2}" y="10" class="tx">frisch</text><text x="${L + 2}" y="${H2 - 3}" class="tx">müde</text></svg>`;
  const cur = rows.find(r => r.day === today) || rows[rows.length - 1], ct = Math.round(cur.tsb);
  const state = v => v > 25 ? 'sehr ausgeruht, aber länger ohne Reiz verliert man Fitness' : v >= 5 ? 'frisch und bereit für eine gute Leistung' : v >= -10 ? 'im normalen Trainingsbereich' : v >= -30 ? 'müde vom Training, das ist im Aufbau gewollt' : 'stark ermüdet, achte auf Erholung';
  const out = isEv ? `<p class="mt-2 text-sm"><b>Am Renntag (${fmt(end)}):</b> Fitness etwa ${evC}, Form ${evT > 0 ? '+' : ''}${evT}, also ${state(evT)}.${evT < 5 ? ' Halte dich in den Tagen davor an die Entlastung im Plan.' : ''}</p>` : `<p class="mt-2 text-sm"><b>Planende (${fmt(end)}):</b> Fitness etwa ${evC}${evC > Math.round(cur.ctl) ? `, ${Math.round(evC - cur.ctl)} mehr als heute` : ''}.</p>`;
  return `<section class="panel p-4"><p class="hd text-xl font-semibold">Formkurve${isEv ? ' bis zum Event' : ''}</p><p class="mt-1 text-sm" style="color:var(--mute)">Heute: Fitness ${Math.round(cur.ctl)}, Form ${ct > 0 ? '+' : ''}${ct}, du bist ${state(ct)}. Ab heute gestrichelt: so geht es weiter, wenn du den Plan fährst.</p>${svg}
    <div class="plg"><span><i class="vzl-ctl"></i>Fitness (CTL)</span><span><i class="vzl-atl"></i>Ermüdung (ATL)</span><span><i class="vzl-tsb"></i>Form (Fitness − Ermüdung)</span></div>${out}
    <p class="mt-1 text-xs" style="color:var(--mute)">Geschätzt aus der Belastung (TSS) deiner Fahrten und erledigten Einheiten. Fehlen Fahrten, liegt die Fitness höher als hier gezeigt.</p></section>`;
}

