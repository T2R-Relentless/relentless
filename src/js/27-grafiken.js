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
  /* F26: Bestwerte aus dem Leistungsprofil (alle Dauern von 5 s bis 2 h), sonst die gespeicherten von der Bewertung */
  const mp = typeof mmPrE === 'function' ? mmPrE(e) : null; if (mp) e = {...e, pr:mp};
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
  /* M5: bewertete Fahrten zuerst (ohne Leistungsdaten mit Belastung aus Puls oder Empfinden), dann alle übrigen Fahrten */
  const p = S.p; if (p) Object.values(p.exe || {}).forEach(e => add(e.day, exeLoad(e), (e.day || '') + '|' + Math.round((e.sec || 0) / 60)));
  [...(S.man || []), ...(S.hist || [])].forEach(m => add(m.day || (m.ts || '').slice(0, 10), m.tss, (m.day || '') + '|' + Math.round((m.sec || 0) / 60)));
  if (p) {
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
  try { const tot = phases(p).slice(-1)[0].to; for (let w = S.wk + 1; w <= tot; w++) { /* B9: jede Planwoche bis zum Event (vorher nur 30 Wochen voraus) */ const pl = genWeek(p, w), base = new Date(p.start + 'T12:00:00'); base.setDate(base.getDate() + (w - 1) * 7);
      pl.forEach((x, k) => { const dd = new Date(base); dd.setDate(dd.getDate() + k); const day = lstr(dd); if (day <= end && x && x.m > 0) { try { o[day] = tss(x); } catch (e) { elog(e); } } }); } } catch (e) { elog(e); }
  try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); }
  return o;
}
/* Fitness (CTL, 42 Tage), Ermüdung (ATL, 7 Tage) und Form (TSB = CTL − ATL des Vortags) je Tag, nach dem
   Impulse-Response-/PMC-Modell (Banister 1975; Coggan, Performance Manager). Vergangenheit aus Fahrten und erledigten
   Einheiten, Zukunft aus den geplanten Einheiten jeder Planwoche bis zum Ende. Die Tage reichen bis eine Woche nach dem
   Event (B9: vorher höchstens 400 Tage ab Beginn, dadurch endete die Achse vor einem späten Event). */
function vzRows(){
  const p = S.p; if (!p || !hasStarted(p)) return null;
  const past = vzDaily(), fut = vzFuture(), today = iso(0), end = endOf(p); if (Object.keys(past).length < 3) return null;
  const first = Object.keys(past).sort()[0], start = new Date(Math.max(new Date(first + 'T12:00:00'), Date.now() - 120 * 864e5)), days = [], last = addD(end, 7);
  for (let d = new Date(start); lstr(d) <= last && days.length < 900; d.setDate(d.getDate() + 1)) days.push(lstr(d));
  const seed = days.slice(0, 28).filter(d => d <= today).reduce((t, d) => t + (past[d] || 0), 0) / Math.max(1, Math.min(28, days.filter(d => d <= today).length));
  let ctl = seed, atl = seed; const kC = 1 - Math.exp(-1 / 42), kA = 1 - Math.exp(-1 / 7), rows = days.map(day => { const t = day <= today ? (past[day] || 0) : (fut[day] || 0), tsb = ctl - atl; ctl += (t - ctl) * kC; atl += (t - atl) * kA; return {day, t, ctl, atl, tsb, f:day > today}; });
  const vis = rows.filter(r => r.day >= iso(-42)), ei = vis.findIndex(r => r.day === end);
  const peak = Math.max(0, ...rows.filter(r => r.day <= end).map(r => r.ctl));
  return {rows, vis, end, today, ei:ei < 0 ? vis.length - 1 : ei, peak};
}
/* Fachliche Einordnung des Renntags: Ziel ist leicht positive Form (Tapering, etwa +5 bis +25) bei einer Fitness nahe
   dem Höchstwert der Saison (Allen & Coggan, Training and Racing with a Power Meter; Mujika & Padilla 2003, Bosquet et al.
   2007 zum Tapering). Weicht die Prognose deutlich ab, gibt es einen Hinweis. Der Plan wird dabei nicht verändert. */
function vzRaceHint(tsb, ctl, peak){
  if (tsb < 0) return 'Die Prognose zeigt am Renntag noch Ermüdung (Form unter 0). Fahre die Entlastung der letzten Woche wie geplant, und prüfe im Plan-Check, ob Zusatzeinheiten kurz vor dem Event wegfallen können.';
  if (peak > 15 && ctl < peak * .85) return `Die Fitness am Renntag liegt mit etwa ${Math.round(ctl)} deutlich unter dem Höchstwert der Saison (etwa ${Math.round(peak)}). Das Tapering ist für diesen Plan ungewöhnlich lang oder der Umfang davor niedrig. Sieh dir im Plan-Check die letzten Wochen an.`;
  if (tsb > 30) return 'Die Form am Renntag ist sehr hoch. Das spricht für eine lange Entlastung, bei der schon Fitness verloren geht.';
  return '';
}
/* ---------- F28: Formkurve auf dem Smartphone (nur Darstellung und Bedienung; die Rechnung bleibt vzRows) ----------
   Kennzahlen-Kacheln, Zeitraum (8 Wochen, 3 Monate, bis Renntag, Saison), Hauptgrafik Fitness/Ermüdung mit Achsen,
   Prognose-Bereich, Event-Fähnchen und Saisonspitze, Form-Grafik mit Bereichen, Wischen mit festem Infofeld, Vollbild.
   Die SVG-Breite folgt der tatsächlichen Breite (viewBox ≈ Bildpunkte), damit Schrift ≥ 12 pt bleibt und sich
   Beschriftungen bei 320 bis 430 pt nicht überlappen. */
const VZ_RNG = ['8w', '3m', 'race', 'season'];
let vzSt = {sel:null, show:{ctl:1, atl:1, tsb:1}, full:false}, vzReg = {}, vzN = 0, vzRaf = 0;
const vzRng = () => VZ_RNG.includes(S.vzRng) ? S.vzRng : '8w';
function vzSet(k, v){
  if (k === 'rng') { S.vzRng = VZ_RNG.includes(v) ? v : '8w'; vzSt.sel = null; save(); }
  else if (k === 'show') vzSt.show[v] = vzSt.show[v] ? 0 : 1;
  else if (k === 'full') vzSt.full = !!v;
  render();
}
/* Formbereiche (dieselben Grenzen wie bisher in der App, gängige Orientierungswerte wie bei TrainingPeaks/intervals.icu) */
const VZ_BANDS = [[25, 99, 'vzb-lost', 'Formverlust', 'Losing fitness'], [5, 25, 'vzb-fresh', 'Frisch – bereit fürs Rennen', 'Fresh – ready to race'], [-10, 5, 'vzb-neut', 'Neutral', 'Neutral'], [-30, -10, 'vzb-train', 'Training wirkt', 'Productive training'], [-99, -30, 'vzb-high', 'Hohe Belastung', 'High strain']];
const vzWord = v => v > 25 ? wkL('Formverlust', 'losing fitness') : v >= 5 ? wkL('frisch', 'fresh') : v >= -10 ? wkL('neutral', 'neutral') : v >= -30 ? wkL('Training wirkt', 'productive') : wkL('hohe Belastung', 'high strain');
const vzSgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
/* Breite der Grafik in Bildpunkten: Inhalt der Seite (max-w-xl, 16 pt Rand), Karte mit 12 pt Innenabstand */
const vzW = full => Math.round(Math.max(260, Math.min(full ? 1400 : 576, (typeof window !== 'undefined' && window.innerWidth) || 375) - (full ? 24 : 32 + 24 + 2)));
/* Events der Saison (Hauptevent und weitere Rennen), sortiert */
function vzEvs(p){ try { return seasonEvs(p).map(x => ({id:x.id, name:x.name, date:x.date, prio:x.prio, main:!!x.main})); } catch (e) { elog(e); return p && p.eventDate ? [{id:'main', name:p.eventName || 'Event', date:p.eventDate, prio:'A', main:true}] : []; } }
/* Zeitraum: Start- und Endtag; hinter einem Event im Zeitraum bleiben mindestens 7 Tage */
function vzWin(R0, rng, evs){
  const rows = R0.rows, T = R0.today, first = rows[0].day, last = rows[rows.length - 1].day; let a, b;
  if (rng === '3m') { a = addD(T, -30); b = addD(T, 61); }
  else if (rng === 'race') { const nx = evs.find(e => e.prio === 'A' && e.date >= T); a = T; b = addD(nx ? nx.date : R0.end, 7); }
  else if (rng === 'season') { a = first; b = last; }
  else { a = addD(T, -14); b = addD(T, 42); }
  evs.forEach(e => { if (e.date >= a && e.date <= b && addD(e.date, 7) > b) b = addD(e.date, 7); });
  if (a < first) a = first; if (b > last) b = last;
  return {a, b, vis:rows.filter(r => r.day >= a && r.day <= b)};
}
/* Runde Gitterwerte: Schritt 5/10/20/25/50/100 …, höchstens vier Abschnitte, 10 % Luft über dem Maximum */
function vzNice(max){ const m = Math.max(10, max * 1.1), st = [5, 10, 20, 25, 50, 100, 200, 250, 500].find(s => Math.ceil(m / s) <= 4) || 1000; return {st, top:Math.ceil(m / st) * st}; }
/* Anzeige-Glättung der Ermüdung (7 Tage, zentriert). Nur für die Linie, nicht für Rechnung, Infofeld oder Plan-Check. */
const vzSm7 = (v, k = 3) => v.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - k); j <= Math.min(v.length - 1, i + k); j++) { s += v[j]; n++; } return s / n; });
/* x-Beschriftung: 8 Wochen je Montag als Datum, sonst Monatserste; ausgedünnt, damit sich nichts überlappt (12 px Schrift) */
const vzLblW = s => s.length * 7.2 + 8;
function vzXTicks(vis, X, rng, W, L, R){
  const MON = lang() === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const c = []; vis.forEach((r, i) => { const d = dOnly(r.day); if (rng === '8w' ? d.getDay() === 1 : d.getDate() === 1) c.push({i, s:rng === '8w' ? fmt(r.day).slice(0, 6) : MON[d.getMonth()] + (d.getMonth() === 0 && rng === 'season' ? ' ' + String(d.getFullYear()).slice(2) : '')}); });
  const out = []; let right = -1e9;
  c.forEach(t => { const w = vzLblW(t.s), x = Math.max(L + w / 2, Math.min(W - R - w / 2, X(t.i))); if (x - w / 2 >= right + 4) { out.push({...t, x, w}); right = x + w / 2; } });
  return out;
}
/* Fähnchen der Events: Priorität und Kurzname, bei Platzmangel nur der Buchstabe, notfalls nur die Linie */
function vzFlags(evs, vis, X, W, L, R){
  /* Erst bekommt jedes Event (Hauptevent, dann A, B, C) seinen Buchstaben, dann wird nach Priorität auf „A · Name“
     erweitert, wo Platz ist. Ohne Platz bleibt nur die Linie. */
  const taken = [], free = (l, w, own) => !taken.some(t => t !== own && l < t[1] + 4 && l + w > t[0] - 4), rk = e => e.main ? 0 : e.prio === 'A' ? 1 : e.prio === 'B' ? 2 : 3;
  const out = evs.map(e => ({...e, i:vis.findIndex(r => r.day === e.date), lbl:''})).filter(e => e.i >= 0), ord = out.slice().sort((a, b) => rk(a) - rk(b) || a.i - b.i);
  const place = (f, lbl, own) => { const w = lbl.length > 1 ? vzLblW(lbl) + 4 : 22; for (const l of [f.x, f.x - w]) if (l >= L - 2 && l + w <= W - R + 2 && free(l, w, own)) return {l, w}; return null; };
  ord.forEach(f => { f.x = X(f.i); const q = place(f, f.prio); if (q) { f.lbl = f.prio; f.w = q.w; f.left = q.l; f.slot = [q.l, q.l + q.w]; taken.push(f.slot); } });
  ord.forEach(f => { if (!f.slot) return; const full = `${f.prio} · ${f.name.length > 12 ? f.name.slice(0, 11) + '…' : f.name}`, q = place(f, full, f.slot);
    if (q) { f.slot[0] = q.l; f.slot[1] = q.l + q.w; f.lbl = full; f.w = q.w; f.left = q.l; } });
  return out;
}
/* Namen je Tag fürs Infofeld: gefahrene Fahrten, geplante Einheiten (wie in der Prognose), Events */
function vzNames(p, a, b){
  const o = {}, add = (d, n) => { if (!d || d < a || d > b || !n) return; const L = o[d] || (o[d] = []); if (!L.includes(n)) L.push(n); }, today = iso(0);
  [...(S.man || []), ...(S.hist || [])].forEach(m => { const d = m.day || (m.ts || '').slice(0, 10); if (d <= today) add(d, String(m.n || '').slice(0, 40)); });
  if (p && S.plan) S.plan.forEach((x, i) => { const d = dstr(i); if (d >= today && x && x.m > 0) add(d, x.n); });
  const sw = typeof strWeek !== 'undefined' ? strWeek : null;
  try { const tot = phases(p).slice(-1)[0].to; for (let w = S.wk + 1; w <= tot; w++) { const base = addD(p.start, (w - 1) * 7); if (base > b) break; if (addD(base, 6) < a) continue;
      genWeek(p, w).forEach((x, k) => { if (x && x.m > 0) add(addD(base, k), x.n); }); } } catch (e) { elog(e); }
  try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); }
  vzEvs(p).forEach(e => add(e.date, `${e.prio}-Event: ${e.name}`));
  return o;
}
/* Infofeld über der Grafik: Datum, Fitness, Ermüdung, Form mit Wort, TSS (gefahren bzw. geplant), Einheit */
function vzInfo(r, nm, today){
  if (!r) return '';
  const d = dOnly(r.day), wd = (lang() === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'])[d.getDay()], tsb = Math.round(r.tsb);
  const tag = r.day === today ? wkL('Heute', 'Today') : r.f ? wkL('Prognose', 'Forecast') : '';
  const t = Math.round(r.t), tss = r.f ? (t ? wkL(`TSS ${t} geplant`, `TSS ${t} planned`) : wkL('Ruhetag', 'Rest day')) : (t ? wkL(`TSS ${t} gefahren`, `TSS ${t} ridden`) : wkL('keine Fahrt', 'no ride'));
  return `<div class="vzi-h"><b>${wd}, ${esc(fmt(r.day))}</b>${tag ? ` · <span>${tag}</span>` : ''}</div>
    <div class="vzi-v"><span><i class="vzi-c"></i>${wkL('Fitness', 'Fitness')} <b>${Math.round(r.ctl)}</b></span><span><i class="vzi-a"></i>${wkL('Ermüdung', 'Fatigue')} <b>${Math.round(r.atl)}</b></span><span>${wkL('Form', 'Form')} <b>${vzSgn(tsb)}</b> ${esc(vzWord(tsb))}</span></div>
    <div class="vzi-t">${esc(tss)}${nm && nm.length ? ' · ' + esc(nm.join(', ')) : ''}</div>`;
}
const vzIdx = (px, g) => Math.max(0, Math.min(g.n - 1, Math.round((px - g.L) / Math.max(1, g.W - g.L - g.R) * (g.n - 1))));
function vzPaint(id, i){
  const g = vzReg[id]; if (!g) return; i = Math.max(0, Math.min(g.n - 1, i)); g.cur = i; vzSt.sel = g.rows[i].day;
  if (vzRaf) return; vzRaf = 1; const run = () => { if (!vzRaf) return; vzRaf = 0; const j = g.cur, x = g.X(j).toFixed(1), r = g.rows[j];
    document.querySelectorAll(`[data-vz="${id}"] .vz-sel`).forEach(l => { l.setAttribute('x1', x); l.setAttribute('x2', x); l.style.display = ''; });
    document.querySelectorAll(`[data-vz="${id}"] .vz-seld`).forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', g.Y(r.ctl).toFixed(1)); c.style.display = g.show.ctl ? '' : 'none'; });
    const el = document.getElementById(id + '-i'); if (el) el.innerHTML = vzInfo(r, g.names[r.day], g.today); };
  /* flüssig mit requestAnimationFrame; der Zeitgeber springt ein, wenn die Seite im Hintergrund keine Frames zeichnet */
  if (window.requestAnimationFrame) window.requestAnimationFrame(run); setTimeout(run, 60);
}
/* Wischen: ein Finger waagerecht (senkrecht scrollt die Seite, touch-action: pan-y); Antippen eines Fähnchens öffnet den Plan-Check */
let vzDown = null;
function vzPx(ev, id){ const svg = ev.currentTarget, r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return {x:(ev.clientX - r.left) / r.width * vb.width, y:(ev.clientY - r.top) / r.height * vb.height}; }
function vzPtr(ev, id, kind){
  try { const g = vzReg[id]; if (!g) return; const q = vzPx(ev, id);
    if (kind === 'down') { vzDown = {x:ev.clientX, y:ev.clientY, id}; vzPaint(id, vzIdx(q.x, g)); return; }
    if (kind === 'move') { if (vzDown || ev.pointerType === 'mouse') vzPaint(id, vzIdx(q.x, g)); return; }
    if (kind === 'up') { const tap = vzDown && Math.abs(ev.clientX - vzDown.x) < 8 && Math.abs(ev.clientY - vzDown.y) < 8; vzDown = null;
      if (tap && ev.currentTarget.classList.contains('vz-main') && q.y < g.T) { const f = g.flags.filter(f => Math.abs(f.x - q.x) < 24 || (f.lbl && q.x >= f.left && q.x <= f.left + f.w)).sort((a, b) => Math.abs(a.x - q.x) - Math.abs(b.x - q.x))[0]; if (f) { vzSt.full = false; try { efSel = f.id; } catch (e) { elog(e); } goPg('check'); } } }
  } catch (e) { elog(e); }
}
function vzKey(ev, id){ const g = vzReg[id]; if (!g) return; const k = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (!k) return; ev.preventDefault(); vzPaint(id, (g.cur != null ? g.cur : g.ti) + k * (ev.shiftKey ? 7 : 1)); }
/* Antippen außerhalb der Grafik setzt die Auswahl auf heute zurück */
function vzOut(ev, id){ if (ev.target.closest && ev.target.closest('svg,button,a,.gl,select,input')) return; const g = vzReg[id]; if (g && g.cur !== g.ti) vzPaint(id, g.ti); vzSt.sel = null; }
/* Kachel: zum passenden Tag springen (Zeitraum wechselt, wenn der Tag nicht im gezeigten Zeitraum liegt) */
function vzJump(day, rng){ if (!day) return; const R0 = vzRows(); if (!R0) return; const w = vzWin(R0, vzRng(), vzEvs(S.p)); if (day < w.a || day > w.b) S.vzRng = rng; vzSt.sel = day; save(); render(); }

function vzChart(p, R0, rng, full){
  const evs = vzEvs(p), {vis} = vzWin(R0, rng, evs), n = vis.length; if (n < 2) return null;
  const id = 'vz' + (++vzN); if (vzN > 200) { vzReg = {}; vzN = 1; }
  const sh = vzSt.show, W = vzW(full), L = 34, R = 10, T = 40, B = 26, H = full ? Math.max(320, Math.round(((window.innerHeight || 700) - 260) * .62)) : 260, H2 = full ? 170 : 130;
  const X = i => L + i * (W - L - R) / Math.max(1, n - 1), today = R0.today, ti = Math.max(0, vis.findIndex(r => r.day === today)), smooth = rng === 'race' || rng === 'season';
  const atlD = smooth ? vzSm7(vis.map(r => r.atl)) : vis.map(r => r.atl);
  const ny = vzNice(Math.max(20, ...vis.map(r => r.ctl), ...(sh.atl ? atlD : [0]))), Y = v => T + (H - T - B) * (1 - v / ny.top), base = H - B;
  const pts = (vals, a, b) => vals.slice(a, b + 1).map((v, j) => `${X(a + j).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const ctlV = vis.map(r => r.ctl), xT = X(ti);
  const grid = []; for (let v = 0; v <= ny.top + 1e-9; v += ny.st) grid.push(`<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="${v ? 'vz-gl' : 'gl0'}"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="tx">${v}</text>`);
  const ticks = vzXTicks(vis, X, rng, W, L, R), flags = vzFlags(evs, vis, X, W, L, R);
  /* Heute und Prognose: Beschriftungen kollidieren nicht (bei wenig Platz links beide rechts der Linie) */
  const hw = vzLblW(wkL('Heute', 'Today')), roomL = xT - L > hw + 4, fut = ti < n - 1;
  const lblNow = roomL ? `<text x="${(xT - 5).toFixed(1)}" y="${T + 14}" text-anchor="end" class="tx vz-nowt">${wkL('Heute', 'Today')}</text>` : `<text x="${(xT + 5).toFixed(1)}" y="${T + 14}" class="tx vz-nowt">${wkL('Heute', 'Today')}</text>`;
  const lblFut = fut && W - R - xT > (roomL ? 80 : 80 + hw) ? `<text x="${(xT + (roomL ? 5 : hw + 12)).toFixed(1)}" y="${T + 14}" class="tx">${wkL('Prognose', 'Forecast')}</text>` : '';
  const peakRow = R0.rows.filter(r => r.day <= R0.end).reduce((m, r) => !m || r.ctl > m.ctl ? r : m, null), pi = peakRow ? vis.findIndex(r => r.day === peakRow.day) : -1;
  const evLine = (f, y1, y2) => `<line x1="${f.x.toFixed(1)}" x2="${f.x.toFixed(1)}" y1="${y1}" y2="${y2}" class="${f.main ? 'goal vz-evl' : 'vz-evl'}${f.prio === 'A' ? ' vz-a' : ''}" data-day="${esc(f.date)}"/>`;
  const flagSvg = flags.map(f => `<g class="${f.main ? 'vz-evm' : 'vz-ev'}${f.prio === 'A' ? ' vz-a' : ''}" data-day="${esc(f.date)}">${evLine(f, f.lbl ? 30 : 10, base)}${f.lbl ? `<rect x="${f.left.toFixed(1)}" y="6" width="${f.w.toFixed(1)}" height="24" class="vz-fl"/><text x="${(f.left + f.w / 2).toFixed(1)}" y="22" text-anchor="middle" class="tx vz-flt">${esc(f.lbl)}</text>` : ''}</g>`).join('');
  const main = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="pchart vz-main" data-vz="${id}" tabindex="0" aria-hidden="true" style="touch-action:pan-y" onpointerdown="vzPtr(event,'${id}','down')" onpointermove="vzPtr(event,'${id}','move')" onpointerup="vzPtr(event,'${id}','up')" onpointercancel="vzDown=null" onkeydown="vzKey(event,'${id}')">
    ${fut ? `<rect x="${xT.toFixed(1)}" y="${T}" width="${(X(n - 1) - xT).toFixed(1)}" height="${base - T}" class="vz-fut"/>` : ''}${grid.join('')}
    ${sh.atl ? `<polyline points="${pts(atlD, 0, ti)}" class="vz-atl"/>${fut ? `<polyline points="${pts(atlD, ti, n - 1)}" class="vz-atl vz-dash"/>` : ''}` : ''}
    ${sh.ctl ? `<polyline points="${pts(ctlV, 0, ti)}" class="vz-ctl"/>${fut ? `<polyline points="${pts(ctlV, ti, n - 1)}" class="vz-ctl vz-dash"/>` : ''}` : ''}
    <line x1="${xT.toFixed(1)}" x2="${xT.toFixed(1)}" y1="${T}" y2="${base}" class="now"/>${lblNow}${lblFut}${flagSvg}
    ${sh.ctl && pi >= 0 ? `<circle cx="${X(pi).toFixed(1)}" cy="${Y(peakRow.ctl).toFixed(1)}" r="4.5" class="vz-pk"/><text x="${Math.max(L + 30, Math.min(W - R - 30, X(pi))).toFixed(1)}" y="${(Y(peakRow.ctl) - 9).toFixed(1)}" text-anchor="middle" class="tx vz-pkt">${wkL('Spitze', 'Peak')} ${Math.round(peakRow.ctl)}</text>` : ''}
    ${ticks.map(t => `<text x="${t.x.toFixed(1)}" y="${H - 7}" text-anchor="middle" class="tx vz-xt">${esc(t.s)}</text>`).join('')}
    <line class="vz-sel" x1="0" x2="0" y1="${T}" y2="${base}" style="display:none"/><circle class="vz-seld" r="5.5" cx="0" cy="0" style="display:none"/></svg>`;
  /* Form: Bereiche im Hintergrund, 8 Wochen als Tagesbalken, sonst als Fläche um die Nulllinie */
  const tv = vis.map(r => r.tsb), lo = Math.min(-35, Math.min(...tv) * 1.1), hi = Math.max(30, Math.max(...tv) * 1.1), Yt = v => 6 + (H2 - 12) * (hi - v) / (hi - lo), y0 = Yt(0);
  const bands = VZ_BANDS.map(([a, b, c]) => { const y1 = Yt(Math.min(hi, b)), y2 = Yt(Math.max(lo, a)); return y2 > y1 ? `<rect x="${L}" y="${y1.toFixed(1)}" width="${W - L - R}" height="${(y2 - y1).toFixed(1)}" class="${c}"/>` : ''; }).join('');
  const bw = (W - L - R) / n, cls = v => v > 25 ? 'vzt-lost' : v >= 5 ? 'vzt-fresh' : v >= -10 ? 'vzt-neut' : v >= -30 ? 'vzt-train' : 'vzt-high';
  const area = (a, b, sign) => { if (b < a) return ''; let d = `M${X(a).toFixed(1)},${y0.toFixed(1)}`; for (let i = a; i <= b; i++) d += `L${X(i).toFixed(1)},${Yt(sign > 0 ? Math.max(0, tv[i]) : Math.min(0, tv[i])).toFixed(1)}`; return d + `L${X(b).toFixed(1)},${y0.toFixed(1)}Z`; };
  const tsbSvg = rng === '8w' ? vis.map((r, i) => { const y1 = Yt(r.tsb); return `<rect x="${(X(i) - bw * .38).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(bw * .76).toFixed(1)}" height="${Math.max(.8, Math.abs(y1 - y0)).toFixed(1)}" class="${cls(r.tsb)}${r.f ? ' vz-f' : ''}"/>`; }).join('')
    : `<path d="${area(0, ti, 1)}" class="vzt-pos"/><path d="${area(0, ti, -1)}" class="vzt-neg"/>${fut ? `<path d="${area(ti, n - 1, 1)}" class="vzt-pos vz-f"/><path d="${area(ti, n - 1, -1)}" class="vzt-neg vz-f"/>` : ''}`;
  const tsbG = sh.tsb ? `<svg viewBox="0 0 ${W} ${H2}" width="100%" class="pchart vz-tsb" data-vz="${id}" aria-hidden="true" style="touch-action:pan-y" onpointerdown="vzPtr(event,'${id}','down')" onpointermove="vzPtr(event,'${id}','move')" onpointerup="vzPtr(event,'${id}','up')" onpointercancel="vzDown=null">${bands}${tsbSvg}
    ${flags.map(f => evLine(f, 0, H2)).join('')}<line x1="${xT.toFixed(1)}" x2="${xT.toFixed(1)}" y1="0" y2="${H2}" class="now"/>
    <line x1="${L}" x2="${W - R}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" class="vz-zero"/><text x="${L - 6}" y="${(y0 + 4).toFixed(1)}" text-anchor="end" class="tx">0</text>
    ${hi > 30 ? `<text x="${L - 6}" y="${(Yt(25) + 4).toFixed(1)}" text-anchor="end" class="tx">+25</text>` : ''}<text x="${L - 6}" y="${(Yt(-30) + 4).toFixed(1)}" text-anchor="end" class="tx">−30</text>
    <line class="vz-sel" x1="0" x2="0" y1="0" y2="${H2}" style="display:none"/></svg>
    <div class="vz-bands">${VZ_BANDS.map(([a, b, c, de, en]) => `<span><i class="${c}"></i>${a >= 25 ? wkL('über +25', 'above +25') : a <= -99 ? wkL('unter −30', 'below −30') : `${vzSgn(a)} ${wkL('bis', 'to')} ${vzSgn(b)}`}: ${wkL(de, en)}</span>`).join('')}</div>` : '';
  const names = vzNames(p, vis[0].day, vis[n - 1].day), si = vzSt.sel ? vis.findIndex(r => r.day === vzSt.sel) : -1;
  vzReg[id] = {rows:vis.map(r => ({day:r.day, ctl:r.ctl, atl:r.atl, tsb:r.tsb, t:r.t, f:r.f})), n, L, R, W, T, X, Y, ti, cur:si >= 0 ? si : ti, names, today, flags, show:{...sh}};
  setTimeout(() => vzPaint(id, vzReg[id] ? vzReg[id].cur : 0), 0);
  return {id, main, tsbG, vis, smooth, info:vzInfo(vis[si >= 0 ? si : ti], names[(vis[si >= 0 ? si : ti] || {}).day], today)};
}
function vzForm(){
  const p = S.p, R0 = vzRows(); if (!R0) return '';
  const {rows, vis, end, today, ei, peak} = R0; if (vis.length < 5) return '';
  const isEv = p.goal === 'event', rng = vzRng(), evs = vzEvs(p), ev = vis[ei], evT = Math.round(ev.tsb), evC = Math.round(ev.ctl);
  const cur = rows.find(r => r.day === today) || rows[rows.length - 1], ct = Math.round(cur.tsb);
  const state = v => v > 25 ? 'sehr ausgeruht, aber länger ohne Reiz verliert man Fitness' : v >= 5 ? 'frisch und bereit für eine gute Leistung' : v >= -10 ? 'im normalen Trainingsbereich' : v >= -30 ? 'müde vom Training, das ist im Aufbau gewollt' : 'stark ermüdet, achte auf Erholung';
  const nx = evs.find(e => e.prio === 'A' && e.date >= today) || (isEv ? evs.find(e => e.main) : null), nxR = nx ? rows.find(r => r.day === nx.date) : null;
  const pk = rows.filter(r => r.day <= end).reduce((m, r) => !m || r.ctl > m.ctl ? r : m, null);
  const RN = {'8w':wkL('8 Wochen', '8 weeks'), '3m':wkL('3 Monate', '3 months'), race:wkL('Bis Renntag', 'To race day'), season:wkL('Saison', 'Season')};
  const dl = d => dOnly(d).toLocaleDateString(wkL('de-DE', 'en-GB'), {day:'numeric', month:'long', year:'numeric'});
  const say = wkL(`Formkurve, ${RN[rng]}. Fitness heute ${Math.round(cur.ctl)}, Form ${ct < 0 ? 'minus' : 'plus'} ${Math.abs(ct)}, ${vzWord(ct)}.`, `Form chart, ${RN[rng]}. Fitness today ${Math.round(cur.ctl)}, form ${ct < 0 ? 'minus' : 'plus'} ${Math.abs(ct)}, ${vzWord(ct)}.`)
    + (nx && nxR ? wkL(` Am Renntag ${dl(nx.date)} Fitness etwa ${Math.round(nxR.ctl)}, Form ${nxR.tsb < 0 ? 'minus' : 'plus'} ${Math.abs(Math.round(nxR.tsb))}.`, ` On race day ${dl(nx.date)} fitness about ${Math.round(nxR.ctl)}, form ${nxR.tsb < 0 ? 'minus' : 'plus'} ${Math.abs(Math.round(nxR.tsb))}.`) : '');
  const tile = (lbl, big, sub, day, rg) => `<button class="vz-tile" onclick="vzJump('${ja(day || '')}','${rg}')"${day ? '' : ' disabled'}><span class="vz-tl">${lbl}</span><span class="vz-tv">${big}</span><span class="vz-ts">${sub}</span></button>`;
  const tiles = `<div class="vz-tiles">${tile(wkL('Fitness heute', 'Fitness today'), Math.round(cur.ctl), wkL('CTL', 'CTL'), today, '8w')}${tile(wkL('Form heute', 'Form today'), vzSgn(ct), esc(vzWord(ct)), today, '8w')}
    ${nx && nxR ? tile(`<span data-noi18n>${esc(nx.name.length > 18 ? nx.name.slice(0, 17) + '…' : nx.name)}</span> · ${esc(fmt(nx.date).slice(0, 6))}`, `${Math.round(nxR.ctl)} <small>· ${vzSgn(Math.round(nxR.tsb))}</small>`, wkL('Am Renntag: Fitness · Form', 'Race day: fitness · form'), nx.date, 'race') : tile(wkL('Am Renntag', 'Race day'), '–', wkL('kein A-Event geplant', 'no A event planned'), '', 'race')}
    ${pk ? tile(wkL('Saisonspitze', 'Season peak'), Math.round(pk.ctl), `${wkL('Fitness am', 'Fitness on')} ${esc(fmt(pk.day).slice(0, 6))}`, pk.day, 'season') : ''}</div>`;
  const seg = VZ_RNG.map(k => `<button class="${rng === k ? 'on' : ''}" aria-pressed="${rng === k}" style="min-height:44px" onclick="vzSet('rng','${k}')">${RN[k]}</button>`).join('');
  const gi = re => { try { const i = GL[lang()].findIndex(g => g[0].test(re)); return i >= 0 ? `<span class="gl vz-gi" tabindex="0" role="button" data-g="${i}" aria-label="${esc(wkL('Erklärung', 'Explanation'))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg></span>` : ''; } catch (e) { elog(e); return ''; } };
  const chip = (k, l, cls) => `<button class="vz-chip${vzSt.show[k] ? ' on' : ''}" aria-pressed="${!!vzSt.show[k]}" onclick="vzSet('show','${k}')"><i class="${cls}"></i>${l}</button>`;
  const block = full => { const c = vzChart(p, R0, rng, full); if (!c) return '';
    return `<div class="vz-ctl-row"><div class="dtabs vz-rng">${seg}</div></div>
      <div class="vz-legend">${chip('ctl', wkL('Fitness', 'Fitness'), 'vzl-ctl')}${gi('CTL')}${chip('atl', wkL('Ermüdung', 'Fatigue') + (c.smooth ? wkL(' (geglättet)', ' (smoothed)') : ''), 'vzl-atl')}${gi('ATL')}${chip('tsb', wkL('Form', 'Form'), 'vzl-tsb')}
        ${full ? `<button class="vz-full" aria-label="${esc(wkL('Vollbild schließen', 'Close full screen'))}" onclick="vzSet('full',0)">${ic('close', 20)}</button>` : `<button class="vz-full" aria-label="${esc(wkL('Vergrößern', 'Enlarge'))}" onclick="vzSet('full',1)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>`}</div>
      <div class="vz-info" id="${c.id}-i" aria-live="polite">${c.info}</div>
      <div role="img" aria-label="${esc(say)}">${c.main}${c.tsbG}</div>
      <table class="sr-only"><caption>${esc(wkL('Fitness, Ermüdung und Form je Woche', 'Fitness, fatigue and form per week'))}</caption><thead><tr><th>${wkL('Datum', 'Date')}</th><th>${wkL('Fitness', 'Fitness')}</th><th>${wkL('Ermüdung', 'Fatigue')}</th><th>${wkL('Form', 'Form')}</th></tr></thead><tbody>${c.vis.filter((r, i) => i % 7 === 0 || i === c.vis.length - 1).map(r => `<tr><td>${esc(fmt(r.day))}${r.f ? ' ' + wkL('(Prognose)', '(forecast)') : ''}</td><td>${Math.round(r.ctl)}</td><td>${Math.round(r.atl)}</td><td>${vzSgn(Math.round(r.tsb))}</td></tr>`).join('')}</tbody></table>`; };
  const hint = isEv ? vzRaceHint(ev.tsb, ev.ctl, peak) : '';
  const out = isEv ? `<p class="mt-3 text-sm"><b>Am Renntag (${fmt(end)}):</b> Fitness etwa ${evC}, Form ${evT > 0 ? '+' : ''}${evT}, also ${state(evT)}.${evT < 5 && !hint ? ' Halte dich in den Tagen davor an die Entlastung im Plan.' : ''}</p>${hint ? `<div class="mt-2 p-2.5 text-sm" role="note" style="border:1px solid var(--line);border-left:3px solid #d9a400"><p>${esc(hint)}</p><button class="ghost mt-2 !w-auto !px-3 !py-2 text-sm" style="min-height:44px" onclick="goPg('check')">Plan-Check öffnen</button></div>` : ''}` : `<p class="mt-3 text-sm"><b>Planende (${fmt(end)}):</b> Fitness etwa ${evC}${evC > Math.round(cur.ctl) ? `, ${Math.round(evC - cur.ctl)} mehr als heute` : ''}.</p>`;
  const body = block(false); if (!body) return '';
  const fullV = vzSt.full ? `<div class="vz-fullv" role="dialog" aria-modal="true" aria-label="${esc(wkL('Formkurve im Vollbild', 'Form chart full screen'))}" data-noi18n onclick="vzOut(event, (document.querySelector('.vz-fullv .vz-info')||{}).id ? document.querySelector('.vz-fullv .vz-info').id.slice(0,-2) : '')"><p class="hd text-xl font-semibold">${wkL('Formkurve', 'Form chart')}</p>${block(true)}</div>` : '';
  return `<section class="panel vz-card" onclick="vzOut(event, (this.querySelector('.vz-info')||{}).id ? this.querySelector('.vz-info').id.slice(0,-2) : '')"><p class="hd text-xl font-semibold">Formkurve${isEv ? ' bis zum Event' : ''}</p>
    <div data-noi18n>${tiles}<p class="mt-3 text-sm" style="color:var(--mute)">${wkL('Ab heute gestrichelt: so geht es weiter, wenn du den Plan fährst. Wische über die Grafik für die Werte eines Tages.', 'Dashed from today: how it continues if you follow the plan. Swipe across the chart for the values of a day.')}</p>${body}</div>${out}
    <p class="mt-2 text-xs" style="color:var(--mute)">Geschätzt aus der Belastung (TSS) deiner Fahrten und erledigten Einheiten. Fehlen Fahrten, liegt die Fitness höher als hier gezeigt.</p></section>${fullV}`;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && vzSt.full) vzSet('full', 0); });

