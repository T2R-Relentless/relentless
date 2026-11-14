/* ---------- F25 (13.11.2026): Höhenprofil und Streckenlinie einer Fahrt im Logbuch ----------
   Beim Einlesen einer Fahrt (summarize, also Hochladen und Garmin) entsteht eine kompakte Spur:
   - Profil in festen Distanzschritten (mindestens 50 m, höchstens 800 Abschnitte): Höhe (geglättet), Zeit, Leistung, Puls.
   - Streckenlinie: Positionen am Ende jedes Abschnitts, mit Douglas-Peucker (Toleranz 6 m) ausgedünnt.
   - Leistung zusätzlich in 20-Sekunden-Schritten für die Ist-Linie in der Einheiten-Grafik (F24).
   Alles ganzzahlig und als Differenzen gespeichert (Höhe in dm, Zeit in s, Koordinaten in 1e-5 Grad). Ablage in IndexedDB
   (eigene Datenbank „relentless-tracks“), nicht in localStorage. Keine Karte: Kartenkacheln würden dem Kachelserver Ort und IP
   verraten, die OSM-Richtlinie erlaubt keine Nutzung in größerem Umfang, und ein Anbieter mit Schlüssel kostet ab einem Kontingent
   (Bericht F19). Die Linie wird deshalb nur als SVG gezeichnet, ohne jede Anfrage nach außen. */
const TRK_V = 1, TRK_MAX = 1500;
const TRK_GC = [[0, 'trg0'], [4, 'trg1'], [8, 'trg2'], [12, 'trg3']];
const trkGcl = g => g < 0 ? 'trgd' : g < 4 ? 'trg0' : g < 8 ? 'trg1' : g < 12 ? 'trg2' : 'trg3';
const trkEnc = a => { let p = 0; return a.map(v => { if (v == null) return null; const d = v - p; p = v; return d; }); };
const trkDecA = a => { let p = 0; return (a || []).map(d => d == null ? null : (p += d)); };
function trkHav(a, b){ const R = 6371000, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, q = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); }
/* Douglas-Peucker auf lokal projizierten Metern; gibt die behaltenen Indizes zurück */
function trkDP(P, tol){
  const n = P.length; if (n < 3) return P.map((_, i) => i);
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]];
  while (st.length) { const [a, b] = st.pop(); let mx = 0, k = -1; const [ax, ay] = P[a], [bx, by] = P[b], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const [px, py] = P[i]; let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const ex = ax + t * dx - px, ey = ay + t * dy - py, d = ex * ex + ey * ey; if (d > mx) { mx = d; k = i; } }
    if (k > 0 && mx > tol * tol) { keep[k] = 1; st.push([a, k], [k, b]); } }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(i); return out;
}
const trkProj = (lat0) => { const c = Math.cos(lat0 * Math.PI / 180), R = 6371000 * Math.PI / 180; return q => [q[1] * c * R, q[0] * R]; };
const trkSmooth = (a, k) => a.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - k); j <= Math.min(a.length - 1, i + k); j++) if (a[j] != null) { s += a[j]; n++; } return n ? s / n : null; });

/* Spur aus den Rohpunkten (r.pts von parseFIT/GPX/TCX) */
function trkMake(r){
  const pts = (r && r.pts || []).filter(q => q.t != null && isFinite(q.t)).sort((a, b) => a.t - b.t); if (pts.length < 20) return null;
  const okG = q => q.lat != null && q.lon != null && isFinite(q.lat) && isFinite(q.lon) && Math.abs(q.lat) <= 90 && !(q.lat === 0 && q.lon === 0);
  const gps = pts.filter(okG).length >= 10, t0 = pts[0].t, D = [0]; let useD = pts.filter(q => q.d != null).length > pts.length * .8, lastG = null;
  for (let i = 1; i < pts.length; i++) { const q = pts[i], o = pts[i - 1]; let dd = 0;
    if (useD && q.d != null && o.d != null) dd = Math.max(0, q.d - o.d); else if (gps && okG(q)) { if (lastG) dd = trkHav([lastG.lat, lastG.lon], [q.lat, q.lon]); }
    if (okG(q)) lastG = q; D.push(D[i - 1] + (dd < 500 ? dd : 0)); }
  const dist = D[D.length - 1], alts = pts.filter(q => q.a != null && isFinite(q.a) && q.a > -500 && q.a < 9000).length, hasA = alts > pts.length * .5;
  /* Leistung in 20-Sekunden-Schritten (Ist-Linie F24) */
  const pw = (() => { if (!(pts.filter(q => q.p != null).length > pts.length * .5)) return null; const dur = pts[pts.length - 1].t - t0, n = Math.ceil(dur / 20), s = new Array(n).fill(0), c = new Array(n).fill(0);
    pts.forEach(q => { if (q.p == null) return; const k = Math.min(n - 1, Math.floor((q.t - t0) / 20)); s[k] += q.p; c[k]++; }); return {b:20, p:s.map((v, k) => c[k] ? Math.round(v / c[k]) : null)}; })();
  if (!(dist >= 500 && (hasA || gps))) return pw ? {v:TRK_V, pw, n:0} : null;
  const step = Math.max(50, Math.ceil(dist / 800 / 10) * 10), n = Math.max(2, Math.ceil(dist / step)), A = [], T = [], P = [], H = [], G = [];
  for (let k = 0, i = 0; k < n; k++) { const end = (k + 1) * step; let sa = 0, na = 0, sp = 0, np = 0, sh = 0, nh = 0, last = null;
    while (i < pts.length && (D[i] <= end || k === n - 1)) { const q = pts[i]; if (q.a != null && isFinite(q.a)) { sa += q.a; na++; } if (q.p != null) { sp += q.p; np++; } if (q.h != null && q.h > 30 && q.h < 230) { sh += q.h; nh++; } if (okG(q)) last = q; T[k] = q.t - t0; i++; }
    T[k] = T[k] != null ? T[k] : (k ? T[k - 1] : 0); A.push(na ? sa / na : null); P.push(np ? Math.round(sp / np) : null); H.push(nh ? Math.round(sh / nh) : null); G.push(last ? [last.lat, last.lon] : null); }
  /* Lücken in der Höhe auffüllen, dann glätten (gleitendes Mittel über 5 Abschnitte, mindestens 250 m) */
  let Af = null; if (hasA) { let lv = A.find(v => v != null); Af = A.map(v => v != null ? (lv = v) : lv); Af = trkSmooth(Af, 2); }
  const rec = {v:TRK_V, st:step, n, a:Af ? trkEnc(Af.map(v => Math.round(v * 10))) : null, t:trkEnc(T.map(Math.round)), p:P.some(v => v != null) ? P : null, h:H.some(v => v != null) ? H : null, pw};
  if (gps) { const g0 = pts.find(okG); let lg = G.find(Boolean); const Gf = [[g0.lat, g0.lon], ...G.map(g => g || lg).map(g => (lg = g))]; const pr = trkProj(Gf[0][0]), keep = trkDP(Gf.map(pr), 6);
    rec.la = trkEnc(keep.map(i => Math.round(Gf[i][0] * 1e5))); rec.lo = trkEnc(keep.map(i => Math.round(Gf[i][1] * 1e5))); rec.ix = trkEnc(keep.map(i => Math.max(0, i - 1))); }
  const dec = trkDec(rec), stt = trkStats(dec); if (stt) { rec.up = stt.up; rec.dn = stt.dn; rec.cl = stt.climbs.slice(0, 5); rec.gd = stt.gd; }
  return rec;
}
function trkDec(rec){
  if (!rec || !rec.n) return null;
  const n = rec.n, alt = rec.a ? trkDecA(rec.a).map(v => v / 10) : null, t = trkDecA(rec.t), dist = Array.from({length:n}, (_, k) => Math.min((k + 1) * rec.st, Infinity) / 1000);
  const line = rec.la ? (() => { const la = trkDecA(rec.la), lo = trkDecA(rec.lo), ix = trkDecA(rec.ix); return la.map((v, k) => [v / 1e5, lo[k] / 1e5, ix[k]]); })() : null;
  return {n, st:rec.st, alt, t, dist, p:rec.p || null, h:rec.h || null, line};
}
/* Kennzahlen: Höhenmeter (Schwelle 2 m auf der geglätteten Höhe), höchster/tiefster Punkt, Anstiege, Steigungsverteilung */
function trkStats(d){
  if (!d || !d.alt) return null;
  const a = d.alt, n = a.length; let up = 0, dn = 0, ref = a[0];
  for (let i = 1; i < n; i++) { if (a[i] - ref >= 2) { up += a[i] - ref; ref = a[i]; } else if (ref - a[i] >= 2) { dn += ref - a[i]; ref = a[i]; } }
  const climbs = [], close = (s, pk) => { for (let j = pk; j > s; j--) if (a[j] <= a[s] + 3) { s = j; break; } for (let j = s; j < pk; j++) if (a[j] >= a[pk] - 2) { pk = j; break; } const g = a[pk] - a[s], len = (pk - s) * d.st / 1000; if (g >= 20 && len >= .3 && g / (len * 1000) >= .02) {
    let ps = 0, pn = 0; if (d.p) for (let i = s + 1; i <= pk; i++) if (d.p[i] != null) { const w = (d.t[i] - d.t[i - 1]) || 1; ps += d.p[i] * w; pn += w; }
    climbs.push({s:Math.round((s + 1) * d.st / 100) / 10, len:Math.round(len * 10) / 10, g:Math.round(g), gr:Math.round(g / (len * 1000) * 1000) / 10, sec:Math.max(0, d.t[pk] - d.t[s]), w:pn ? Math.round(ps / pn) : null}); } };
  let s = 0, pk = 0;
  /* Ein Anstieg endet bei 10 m Abfall oder nach 1 km ohne neuen Höchstwert (Flachstück); danach beginnt der nächste am tiefsten Punkt seitdem */
  const fl = Math.max(2, Math.round(1000 / d.st));
  for (let i = 1; i < n; i++) {
    if (a[pk] - a[i] >= 10) { close(s, pk); s = pk = i; }
    else if (a[i] > a[pk] + .5) pk = i;
    else if (a[i] < a[s]) s = pk = i;
    else if (i - pk >= fl && pk > s) { close(s, pk); let m = pk; for (let j = pk; j <= i; j++) if (a[j] < a[m]) m = j; s = m; pk = m; for (let j = m; j <= i; j++) if (a[j] > a[pk]) pk = j; }
  }
  close(s, pk);
  const gd = [0, 0, 0, 0, 0]; for (let i = 1; i < n; i++) { const g = (a[i] - a[i - 1]) / d.st * 100; gd[g < 0 ? 0 : g < 4 ? 1 : g < 8 ? 2 : g < 12 ? 3 : 4] += d.st; }
  const lg = climbs.slice().sort((x, y) => y.len - x.len || y.g - x.g)[0] || null, ai = a.reduce((m, v, i) => v > a[m] ? i : m, 0), mi = a.reduce((m, v, i) => v < a[m] ? i : m, 0);
  return {up:Math.round(up), dn:Math.round(dn), max:Math.round(a[ai]), min:Math.round(a[mi]), maxKm:d.dist[ai], climbs:climbs.sort((x, y) => y.len - x.len).slice(0, 5).sort((x, y) => x.s - y.s), longest:lg, gd:gd.map(v => Math.round(v / 100) / 10)};
}

/* ---------- Ablage in IndexedDB ---------- */
const trkC = {}; let trkDbP = null;
function trkDb(){ if (!trkDbP) trkDbP = new Promise((res, rej) => { try { const r = indexedDB.open('relentless-tracks', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('trk'); } catch (e) { elog(e); } }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); trkDbP.catch(() => { trkDbP = null; }); return trkDbP; }
async function trkTx(mode, fn){ const db = await trkDb(); return new Promise((res, rej) => { const t = db.transaction('trk', mode), st = t.objectStore('trk'); let out; try { out = fn(st); } catch (e) { rej(e); } t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); }); }
const trkPut = (id, rec) => trkTx('readwrite', st => st.put({...rec, at:rec.at || Date.now()}, id));
const trkGetDb = id => trkTx('readonly', st => st.get(id));
async function trkAll(){ const db = await trkDb(); return new Promise((res, rej) => { const out = {}, t = db.transaction('trk', 'readonly'), c = t.objectStore('trk').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); }
async function trkPrune(){ try { const all = await trkAll(), ks = Object.keys(all); if (ks.length <= TRK_MAX) return; const old = ks.sort((a, b) => (all[a].at || 0) - (all[b].at || 0)).slice(0, ks.length - TRK_MAX); await trkTx('readwrite', st => { old.forEach(k => st.delete(k)); }); old.forEach(k => { delete trkC[k]; }); } catch (e) { elog(e); } }
/* Beim Einlesen: Spur berechnen und ablegen (im Hintergrund) */
function trkKeep(a, r){
  try { if (!a || !a.id) return; const rec = trkMake(r); if (!rec) return; rec.at = Date.now(); trkC[a.id] = rec; trkPut(a.id, rec).then(() => { if (Math.random() < .1) trkPrune(); }).catch(e => elog(e)); } catch (e) { elog(e); }
}
/* Aus dem Zwischenspeicher, sonst im Hintergrund laden und danach neu zeichnen. undefined = wird geladen, null = keine Spur */
function trkGet(id){
  if (id in trkC) return trkC[id] === 'busy' ? undefined : trkC[id];
  trkC[id] = 'busy'; trkGetDb(id).then(v => { trkC[id] = v || null; try { render(); } catch (e) { elog(e); } }).catch(e => { elog(e); trkC[id] = null; });
  return undefined;
}

/* ---------- Nachladen von Garmin (Fahrten, die vor F25 eingelesen wurden) ---------- */
const trkTried = {}; let trkBusy = null, trkErr = {};
const trkGid = id => { const all = [...(S.man || []), ...(S.hist || []), ...(S.arch || [])]; const a = all.find(q => q && q.id === id && q.gid); return a ? a.gid : null; };
async function trkFetch(id){
  const gid = trkGid(id); if (!gid || trkBusy || typeof gmRide !== 'function' || !gmMode()) return;
  trkBusy = id; trkTried[id] = 1; delete trkErr[id]; try { render(); } catch (e) { elog(e); }
  try { const {r} = await gmRide({id:gid, n:''}); try { const o = S.mm && S.mm[id]; if (typeof mmCalc === 'function' && (!o || o.s === 'a')) { const mr = mmCalc(r); if (mr) { mmPut(id, mr, o ? {d:o.d, n:o.n} : (S.arch || []).find(q => q.id === id) || {}); save(); } } } catch (e) { elog(e); } const rec = trkMake(r); if (rec) { rec.at = Date.now(); trkC[id] = rec; await trkPut(id, rec); } else { trkC[id] = null; trkErr[id] = wkL('Diese Fahrt enthält keine Höhen- oder GPS-Daten.', 'This ride has no altitude or GPS data.'); } }
  catch (e) { elog(e); trkErr[id] = (e && e.message) || wkL('Laden nicht möglich.', 'Could not load.'); }
  trkBusy = null; try { render(); } catch (e) { elog(e); }
}

/* ---------- Zeichnen ---------- */
let trkOv = 'p', trkReg = {};
function trkSet(k){ trkOv = trkOv === k ? '' : k; render(); }
const trkKm = v => (Math.round(v * 10) / 10).toLocaleString(wkL('de-DE', 'en-GB'));
function trkProfSvg(id, d){
  const W = 340, H = 140, L = 34, R = 30, T = 8, B = 18, pw = W - L - R, ph = H - T - B, n = d.n, a = d.alt;
  if (!a) return '';
  const lo = Math.floor((Math.min(...a) - 5) / 10) * 10, hi = Math.max(lo + 40, Math.ceil((Math.max(...a) + 5) / 10) * 10), X = k => L + (k + .5) / n * pw, Y = v => T + ph * (1 - (v - lo) / (hi - lo)), base = T + ph;
  /* Fläche abschnittsweise nach Steigung einfärben, gleiche Klassen zusammenfassen */
  let paths = '', k = 0;
  while (k < n) { const g = k ? (a[k] - a[k - 1]) / d.st * 100 : 0, c = trkGcl(g); let j = k; while (j + 1 < n && trkGcl((a[j + 1] - a[j]) / d.st * 100) === c) j++;
    let p = `M${(k ? X(k - 1) : L).toFixed(1)},${base}`; for (let q = Math.max(0, k - 1); q <= j; q++) p += `L${X(q).toFixed(1)},${Y(a[q]).toFixed(1)}`; p += `L${X(j).toFixed(1)},${base}Z`; paths += `<path d="${p}" class="${c}"/>`; k = j + 1; }
  const ov = trkOv === 'p' ? d.p : trkOv === 'h' ? d.h : null; let ovl = '', ovt = '';
  if (ov && ov.some(v => v != null)) { const sm = trkSmooth(ov, 2), vs = sm.filter(v => v != null), mx = Math.max(...vs), mn = trkOv === 'h' ? Math.min(...vs) : 0, Yo = v => T + ph * (1 - (v - mn) / Math.max(1, mx - mn)); let dd = '', on = false;
    sm.forEach((v, q) => { if (v == null) { on = false; return; } dd += (on ? 'L' : 'M') + X(q).toFixed(1) + ',' + Yo(v).toFixed(1); on = true; }); ovl = `<path d="${dd}" class="trk-ov"/>`;
    ovt = `<text x="${W - R + 3}" y="${T + 8}" class="tx">${Math.round(mx)}</text><text x="${W - R + 3}" y="${base}" class="tx">${Math.round(mn)}</text><text x="${W - R + 3}" y="${(T + ph / 2 + 3).toFixed(1)}" class="tx">${trkOv === 'p' ? 'W' : 'bpm'}</text>`; }
  const km = d.dist[n - 1], st = km > 100 ? 20 : km > 50 ? 10 : km > 20 ? 5 : km > 8 ? 2 : 1, xt = []; for (let v = 0; v <= km; v += st) xt.push(v);
  const yt = [lo, Math.round((lo + hi) / 20) * 10, hi];
  trkReg[id] = {d, X, L, pw, n};
  return `<svg viewBox="0 0 ${W} ${H}" class="pchart trk" role="img" aria-label="${esc(wkL('Höhenprofil', 'Elevation profile'))}" data-trk="${esc(id)}" onpointerdown="trkTip(event,'${ja(id)}')" onpointermove="trkTip(event,'${ja(id)}')">${paths}
    ${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl0" opacity=".5"/><text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="tx">${v}</text>`).join('')}
    ${xt.map(v => `<text x="${(L + v / km * pw).toFixed(1)}" y="${H - 5}" text-anchor="middle" class="tx">${v}${v === 0 ? '' : ''}</text>`).join('')}<text x="${W - R}" y="${H - 5}" text-anchor="end" class="tx">km</text>${ovl}${ovt}
    <line class="trk-cur" x1="0" x2="0" y1="${T}" y2="${base}" style="display:none"/></svg>`;
}
function trkLineSvg(id, d){
  if (!d.line || d.line.length < 2) return '';
  const ln = d.line;
  const lat0 = ln[0][0], pr = trkProj(lat0), P = ln.map(pr), xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 340, H = 220, m = 12, s = Math.min((W - 2 * m) / Math.max(1, x1 - x0), (H - 2 * m) / Math.max(1, y1 - y0)), ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
  const PX = p => [ox + (p[0] - x0) * s, H - oy - (p[1] - y0) * s], Q = P.map(PX);
  const dd = Q.map((q, k) => (k ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(''), a = Q[0], b = Q[Q.length - 1];
  trkReg[id + ':l'] = {ln, Q};
  return `<svg viewBox="0 0 ${W} ${H}" class="pchart trk-l" role="img" aria-label="${esc(wkL('Streckenlinie ohne Karte, Norden oben', 'Route line without map, north up'))}"><path d="${dd}" class="trk-ln0"/><path d="${dd}" class="trk-ln"/>
    <circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="5" class="trk-s"/><rect x="${(b[0] - 4.5).toFixed(1)}" y="${(b[1] - 4.5).toFixed(1)}" width="9" height="9" class="trk-e"/><circle class="trk-dot" r="5.5" cx="0" cy="0" style="display:none"/></svg>
    <div class="trk-lg text-xs"><span><i class="trk-s"></i>${wkL('Start', 'Start')}</span><span><i class="trk-e"></i>${wkL('Ziel', 'Finish')}</span><span>${wkL('Norden oben, ohne Kartenhintergrund', 'North up, no map background')}</span></div>`;
}
/* Wischen über das Profil: Werte an dieser Stelle, Punkt auf der Streckenlinie */
function trkTip(ev, id){
  try {
    const g = trkReg[id], svg = ev.currentTarget; if (!g || !svg) return;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, px = (ev.clientX - r.left) / r.width * vb.width, k = Math.max(0, Math.min(g.n - 1, Math.round((px - g.L) / g.pw * g.n - .5))), d = g.d;
    const cur = svg.querySelector('.trk-cur'); if (cur) { const x = g.X(k).toFixed(1); cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.style.display = ''; }
    const gr = k ? (d.alt[k] - d.alt[k - 1]) / d.st * 100 : 0, dt = k ? d.t[k] - d.t[k - 1] : d.t[0], v = dt > 0 ? d.st / dt * 3.6 : null;
    const parts = [`km ${trkKm(d.dist[k])}`, d.alt ? `${Math.round(d.alt[k])} m` : '', d.alt ? `${(Math.round(gr * 10) / 10).toLocaleString(wkL('de-DE', 'en-GB'))} %` : '', d.p && d.p[k] != null ? `${d.p[k]} W` : '', d.h && d.h[k] != null ? `${d.h[k]} bpm` : '', v && v < 120 ? `${trkKm(v)} km/h` : ''].filter(Boolean);
    const el = document.getElementById('trk-t-' + id); if (el) el.textContent = parts.join(' · ');
    const l = trkReg[id + ':l'], dot = document.querySelector(`.trk-wrap[data-id="${CSS.escape(id)}"] .trk-dot`);
    if (l && dot) { let best = -1, bd = 1e9; l.ln.forEach((q, j) => { const dd = Math.abs(q[2] - k); if (dd < bd) { bd = dd; best = j; } }); if (best >= 0 && bd <= Math.max(3, g.n / 40)) { dot.setAttribute('cx', l.Q[best][0].toFixed(1)); dot.setAttribute('cy', l.Q[best][1].toFixed(1)); dot.style.display = ''; } else dot.style.display = 'none'; }
  } catch (e) { elog(e); }
}
/* Abschnitt im Logbuch-Detail */
function trkBlock(id, ride){
  try {
    if (ride && ride.in && !(trkC[id] && trkC[id].n)) return '';
    const rec = trkGet(id);
    if (rec === undefined) return `<div class="mt-3" id="fx-trk"><p class="text-xs" style="color:var(--mute)">${wkL('Strecke wird geladen …', 'Loading route …')}</p></div>`;
    const gid = trkGid(id), canGm = !!gid && typeof gmMode === 'function' && !!gmMode();
    if (!rec || !rec.n) {
      if (ride && ride.in) return '';
      if (canGm && !trkTried[id] && !trkBusy) setTimeout(() => trkFetch(id), 0);
      const msg = trkBusy === id ? wkL('Streckendaten werden von Garmin geladen …', 'Loading route data from Garmin …') : trkErr[id] ? trkErr[id] : canGm ? '' : wkL('Für diese Fahrt sind keine Streckendaten gespeichert. Fahrten, die du ab jetzt hochlädst oder von Garmin abrufst, bekommen Höhenprofil und Streckenlinie. Für ältere Fahrten: Datei noch einmal hochladen oder Garmin verbinden.', 'No route data is stored for this ride. Rides you upload or fetch from Garmin from now on get an elevation profile and route line. For older rides: upload the file again or connect Garmin.');
      return msg || canGm ? `<div class="mt-3 p-3 text-sm" id="fx-trk" style="border:1px solid var(--line)" data-noi18n><p class="eyebrow">${wkL('Höhenprofil und Strecke', 'Elevation and route')}</p><p class="mt-1">${esc(msg)}</p>${canGm && trkBusy !== id ? `<button class="ghost mt-2 !py-2 text-sm" style="min-height:44px" onclick="trkTried['${ja(id)}']=0;trkFetch('${ja(id)}')">${wkL('Von Garmin laden', 'Load from Garmin')}</button>` : ''}</div>` : '';
    }
    const d = trkDec(rec), stt = trkStats(d), dev = ride && ride.hmDev && ride.hm && stt ? Math.round(ride.hm) : null;
    if (!d.alt && !d.line) return '';
    const cell = (k, v) => `<div class="p-2" style="background:var(--tint);border:1px solid var(--line)"><div class="text-xs" style="color:var(--mute)">${k}</div><div class="text-sm font-semibold">${v}</div></div>`;
    const lg = stt && stt.longest, kpi = stt ? [cell(wkL('Bergauf', 'Climbing'), `${(dev != null ? dev : stt.up).toLocaleString(wkL('de-DE', 'en-GB'))} m${dev != null ? `<span class="block text-xs font-normal" style="color:var(--mute)">${wkL('laut Gerät', 'from device')}</span>` : ''}`), cell(wkL('Bergab', 'Descent'), `${stt.dn.toLocaleString(wkL('de-DE', 'en-GB'))} m`),
      cell(wkL('Höchster Punkt', 'Highest point'), `${stt.max} m`), cell(wkL('Tiefster Punkt', 'Lowest point'), `${stt.min} m`)].join('') : '';
    const climb = lg ? `<p class="mt-2 text-sm"><b>${wkL('Längster Anstieg', 'Longest climb')}:</b> ${wkL('ab km', 'from km')} ${trkKm(lg.s)}, ${trkKm(lg.len)} km, ${lg.g} m, Ø ${trkKm(lg.gr)} %${lg.sec ? `, ${wkMin(Math.round(lg.sec / 60) * 60)}` : ''}${lg.w ? wkL(` mit ${lg.w} W`, ` at ${lg.w} W`) : ''}</p>` : stt ? `<p class="mt-2 text-xs" style="color:var(--mute)">${wkL('Kein Anstieg über 20 Höhenmeter mit mindestens 2 % Steigung.', 'No climb over 20 m with at least 2 % gradient.')}</p>` : '';
    const gd = stt ? (() => { const tot = stt.gd.reduce((s, v) => s + v, 0) || 1, L = [wkL('flach/bergab', 'flat/down'), '< 4 %', '4–8 %', '8–12 %', '> 12 %'], C = ['trgd', 'trg0', 'trg1', 'trg2', 'trg3'];
      return `<div class="wk-zb" aria-hidden="true">${stt.gd.map((v, k) => v ? `<i class="${C[k]}" style="width:${(v / tot * 100).toFixed(1)}%"></i>` : '').join('')}</div><div class="wk-zl">${stt.gd.map((v, k) => v ? `<span><i class="${C[k]}"></i>${L[k]} ${trkKm(v)} km</span>` : '').join('')}</div>`; })() : '';
    const sw = (k, on, t) => `<button class="${on ? 'btn' : 'ghost'} !w-auto !px-3 !py-1.5 text-xs" style="min-height:44px" aria-pressed="${on}" onclick="trkSet('${ja(k)}')">${t}</button>`;
    const ovBtns = d.alt && (d.p || d.h) ? `<div class="mt-2 flex flex-wrap gap-2">${d.p ? sw('p', trkOv === 'p', wkL('Leistung', 'Power')) : ''}${d.h ? sw('h', trkOv === 'h', wkL('Puls', 'Heart rate')) : ''}</div>` : '';
    const line = d.line ? `<p class="mt-4 text-xs font-semibold" style="color:var(--mute)">${wkL('Streckenlinie', 'Route line')}</p>${trkLineSvg(id, d)}` : '';
    return `<div class="trk-wrap mt-4" id="fx-trk" data-id="${esc(id)}" data-noi18n><p class="eyebrow">${wkL('Höhenprofil', 'Elevation profile')}</p>${d.alt ? `${trkProfSvg(id, d)}<p class="wk-tip text-xs" id="trk-t-${esc(id)}" aria-live="polite">${esc(wkL('Wische über das Profil: km, Höhe, Steigung, Leistung, Puls und Tempo an dieser Stelle.', 'Swipe across the profile: km, elevation, gradient, power, heart rate and speed at that point.'))}</p>${ovBtns}<div class="mt-2 grid grid-cols-2 gap-2">${kpi}</div>${climb}<p class="mt-2 text-xs font-semibold" style="color:var(--mute)">${wkL('Steigungen', 'Gradients')}</p>${gd}` : `<p class="text-xs" style="color:var(--mute)">${wkL('Keine Höhendaten.', 'No altitude data.')}</p>`}${line}</div>`;
  } catch (e) { elog(e); return ''; }
}
/* „Wusstest du schon?“: direkt zur Grafik der nächsten Einheit bzw. zum Höhenprofil der letzten Fahrt mit Strecke */
function dykProf(){ navGo(null); dykFocus('fx-wk'); }
function dykTrack(){
  const R = typeof lbRides === 'function' ? lbRides() : [], a = R.find(q => !q.in && trkC[q.id] && trkC[q.id] !== 'busy' && trkC[q.id].n) || R.find(q => !q.in) || R[0];
  if (!a) { navGo('logbook'); return; }
  lbOpenRide(a.id); dykFocus('fx-trk');
}
