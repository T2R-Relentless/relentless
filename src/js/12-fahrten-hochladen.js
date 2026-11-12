/* ---------- Planstart ---------- */
const mondayOf = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return lstr(d); };
const hasStarted = p => !p.startDate || Date.now() >= new Date(p.startDate + 'T00:00:00').getTime();
const startOff = p => p.startDate ? Math.max(0, Math.round((new Date(p.startDate + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 864e5)) : 0;
function startNow(){
  const p = S.p; p.startDate = iso(0); p.start = mondayOf(p.startDate); S.ov = {}; S.wk = curWeek(p); S.plan = genWeek(p, S.wk); S.done = {}; S.blocked = {}; S.log = []; S.actual = {}; vw = null; analyze(); save(); render();
}
const startCard = () => { const p = S.p; if (hasStarted(p)) return ''; const n = Math.ceil((new Date(p.startDate + 'T00:00:00') - Date.now()) / 864e5);
  return `<section class="panel p-4"><p class="eyebrow mb-1">Plan startet am</p><div class="hd text-3xl font-bold leading-none">${fmt(p.startDate)}</div><p class="mt-2 text-sm" style="color:var(--mute)">In ${n} ${n === 1 ? 'Tag' : 'Tagen'}. Bis dahin ist alles eine Vorschau: Du kannst Tage sperren und Wochen planen, abhaken lässt sich noch nichts.</p>${(sdLim(p) || '') > iso(0) ? `<p class="mt-3 text-sm">Ein Plan umfasst höchstens 52 Wochen. Darum startet er ${fmt(sdLim(p))} oder später, bis dahin einfach mit Freude fahren.</p>` : '<button class="btn mt-3" onclick="startNow()">Jetzt starten</button>'}
    <details class="mt-3"${shiftAsk || shiftMsg ? ' open' : ''}><summary class="cursor-pointer text-sm font-semibold" style="color:var(--teal)">Start verschieben</summary><div class="mt-2">${shiftUi(p)}</div></details></section>`; };

/* ---------- Fahrten hochladen (FIT, GPX, TCX) ---------- */
const allActs = () => [...(S.man || [])].sort((a, b) => b.ts.localeCompare(a.ts));
let upMsg = [];
/* Entpacken mit Obergrenze (F-22): höchstens RIDE_MAX_OUT bzw. das 100-Fache der gepackten Größe (mindestens 20 MB). */
async function inflate(u8, f, lim){
  lim = lim || Math.min(RIDE_MAX_OUT, Math.max(20e6, u8.length * 100));
  const ds = new DecompressionStream(f), w = ds.writable.getWriter(); w.write(u8).catch(() => {}); w.close().catch(() => {});
  const rd = ds.readable.getReader(), parts = []; let n = 0;
  for (;;) { const {done, value} = await rd.read(); if (done) break; n += value.length;
    if (n > lim) { try { await rd.cancel(); } catch (e) { elog(e); } throw new Error('Die Datei ist entpackt zu groß (über ' + Math.round(lim / 1e6) + ' MB). Bitte nur einzelne Fahrten hochladen.'); }
    parts.push(value); }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
async function unpack(buf, name){
  if (buf.byteLength > RIDE_MAX_IN) throw new Error('Die Datei ist zu groß (über ' + Math.round(RIDE_MAX_IN / 1e6) + ' MB). Bitte nur einzelne Fahrten hochladen.');
  let u = new Uint8Array(buf);
  if (u[0] === 0x1f && u[1] === 0x8b) { u = await inflate(u, 'gzip'); name = name.replace(/\.gz$/i, ''); }
  if (u[0] === 0x50 && u[1] === 0x4b) {
    const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('Das Archiv ist beschädigt.');
    let c = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(c, true) !== 0x02014b50) break;
      const meth = dv.getUint16(c + 10, true), csz = dv.getUint32(c + 20, true), nl = dv.getUint16(c + 28, true), el = dv.getUint16(c + 30, true), cl = dv.getUint16(c + 32, true), lo = dv.getUint32(c + 42, true), nm = new TextDecoder().decode(u.subarray(c + 46, c + 46 + nl)); c += 46 + nl + el + cl;
      if (!/\.(fit|gpx|tcx)$/i.test(nm)) continue;
      const st = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u.subarray(st, st + csz);
      return {name:nm, data: meth === 0 ? raw : await inflate(raw, 'deflate-raw')};
    }
    throw new Error('Im Archiv liegt keine FIT-, GPX- oder TCX-Datei.');
  }
  return {name, data:u};
}
function parseFIT(u){
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength), hs = u[0];
  if (u.length < 14 || String.fromCharCode(u[8], u[9], u[10], u[11]) !== '.FIT') throw new Error('Keine gültige FIT-Datei.');
  const TS = [1,1,1,2,2,4,4,1,4,8,1,2,4,1,8,8,8], end = Math.min(u.length - 2, hs + dv.getUint32(4, true)), defs = {}, pts = [], ses = []; let o = hs, ts = 0;
  const rd = (o, sz, bt, le) => { const t = bt & 31; if (sz < TS[t]) return null; switch (t) {
    case 1: return dv.getInt8(o); case 3: return dv.getInt16(o, le); case 5: return dv.getInt32(o, le);
    case 4: case 11: { const v = dv.getUint16(o, le); return v === 0xFFFF ? null : v; }
    case 6: case 12: { const v = dv.getUint32(o, le); return v === 0xFFFFFFFF ? null : v; }
    case 8: return dv.getFloat32(o, le); case 9: return dv.getFloat64(o, le);
    case 0: case 2: case 10: case 13: { const v = dv.getUint8(o); return v === 0xFF ? null : v; } default: return null; } };
  while (o < end) {
    const h = u[o++]; let loc, comp = false, toff = 0;
    if (h & 0x80) { loc = (h >> 5) & 3; comp = true; toff = h & 31; }
    else if (h & 0x40) {
      const dev = !!(h & 0x20); loc = h & 15; o++; const le = u[o++] === 0, g = dv.getUint16(o, le); o += 2; const nf = u[o++], f = [];
      for (let i = 0; i < nf; i++) { f.push([u[o], u[o + 1], u[o + 2]]); o += 3; }
      let dsz = 0; if (dev) { const nd = u[o++]; for (let i = 0; i < nd; i++) { dsz += u[o + 1]; o += 3; } }
      defs[loc] = {le, g, f, dsz}; continue;
    } else loc = h & 15;
    const d = defs[loc]; if (!d) throw new Error('Die FIT-Datei ist beschädigt.');
    const m = {}; for (const [n, sz, bt] of d.f) { m[n] = rd(o, sz, bt, d.le); o += sz; } o += d.dsz;
    if (comp) { if (ts) { let t2 = (ts - (ts & 31)) + toff; if (t2 < ts) t2 += 32; ts = t2; m[253] = ts; } } else if (m[253] != null) ts = m[253];
    if (d.g === 20 && m[253] != null) pts.push({t:m[253] + 631065600, d:m[5] != null ? m[5] / 100 : null, a:m[78] != null ? m[78] / 5 - 500 : m[2] != null ? m[2] / 5 - 500 : null, p:m[7], h:m[3], tc:m[13] != null && m[13] < 100 ? m[13] : null, lat:m[0] != null ? m[0] * 180 / 2147483648 : null, lon:m[1] != null ? m[1] * 180 / 2147483648 : null});
    else if (d.g === 18) ses.push({sport:m[5], sec:m[8] != null ? m[8] / 1000 : m[7] != null ? m[7] / 1000 : null, km:m[9] != null ? m[9] / 100000 : null, hm:m[22], np:m[34]});
  }
  return {pts, ses, name:''};
}
const txt1 = (el, tag) => { const x = el.getElementsByTagName(tag)[0]; return x ? x.textContent.trim() : null; };
const lname = e => e.localName || e.nodeName.replace(/^.*:/, '');
function pwr(el){ for (const c of el.getElementsByTagName('*')) { const n = lname(c).toLowerCase(); if (n === 'power' || n === 'powerinwatts' || n === 'watts') { const v = parseFloat(c.textContent); if (isFinite(v)) return v; } } return null; }
function tmpv(el){ for (const c of el.getElementsByTagName('*')) { const n = lname(c).toLowerCase(); if (n === 'atemp' || n === 'temp' || n === 'temperature') { const v = parseFloat(c.textContent); if (isFinite(v)) return v; } } return null; }
function hrv(el){ for (const c of el.getElementsByTagName('*')) { const n = lname(c).toLowerCase(); if (n === 'hr' || n === 'heartrate' || n === 'heartratebpm') { const v = parseFloat(c.textContent); if (isFinite(v) && v > 30) return v; } } return null; }
function parseGPX(x){
  const pts = [], trk = x.getElementsByTagName('trk')[0], ty = trk ? txt1(trk, 'type') : null;
  if (ty && !/bik|cycl|ride|rad|road|gravel|mtb|mountain/i.test(ty)) throw new Error('Das ist keine Radfahrt (' + ty + ').');
  for (const e of x.getElementsByTagName('trkpt')) { const tm = txt1(e, 'time'), el = txt1(e, 'ele'); pts.push({t:tm ? Date.parse(tm) / 1000 : null, a:el != null ? parseFloat(el) : null, p:pwr(e), h:hrv(e), tc:tmpv(e), lat:parseFloat(e.getAttribute('lat')), lon:parseFloat(e.getAttribute('lon')), d:null}); }
  if (!pts.length) throw new Error('Die GPX-Datei enthält keine Trackpunkte (nur Routen oder Wegpunkte).');
  if (!pts.some(q => q.t)) throw new Error('Die GPX-Datei enthält keine Zeitstempel. Geplante Touren lassen sich nicht auswerten, nur aufgezeichnete Fahrten.');
  const nm = x.getElementsByTagName('name')[0]; return {pts, ses:[], name:nm ? nm.textContent.trim() : ''};
}
function parseTCX(x){
  const act = x.getElementsByTagName('Activity')[0], sp = act && act.getAttribute('Sport'); if (sp && !/bik|cycl/i.test(sp)) throw new Error('Das ist keine Radfahrt (' + sp + ').');
  const pts = []; for (const e of x.getElementsByTagName('Trackpoint')) { const tm = txt1(e, 'Time'), d = txt1(e, 'DistanceMeters'), a = txt1(e, 'AltitudeMeters'); pts.push({t:tm ? Date.parse(tm) / 1000 : null, d:d != null ? parseFloat(d) : null, a:a != null ? parseFloat(a) : null, p:pwr(e), h:hrv(e), lat:txt1(e, 'LatitudeDegrees') != null ? parseFloat(txt1(e, 'LatitudeDegrees')) : null, lon:txt1(e, 'LongitudeDegrees') != null ? parseFloat(txt1(e, 'LongitudeDegrees')) : null}); }
  if (!pts.length) throw new Error('Die TCX-Datei enthält keine Trackpunkte.'); const nm = act && txt1(act, 'Notes'); return {pts, ses:[], name:nm || ''};
}
function hav(a, b){ const R = 6371000, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r, q = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); }
function summarize(r, fname){
  const ftp = S.p ? S.p.ftp : 0, pts = r.pts.filter(q => q.t != null && isFinite(q.t)).sort((a, b) => a.t - b.t), ses = r.ses || [];
  if (ses.length && ses.some(s => s.sport != null && s.sport !== 2)) throw new Error('Das ist keine Radfahrt.');
  if (pts.length < 2 && !ses.length) throw new Error('Zu wenige Datenpunkte.');
  let mov = 0, dist = 0, hm = 0, ref = null; const sec1 = [], hr1 = [], tc1 = []; 
  for (let i = 1; i < pts.length; i++) {
    const dt = pts[i].t - pts[i - 1].t; if (dt <= 0 || dt > 30) continue; mov += dt;
    if (pts[i].d != null && pts[i - 1].d != null) dist += Math.max(0, pts[i].d - pts[i - 1].d); else if (pts[i].lat != null && pts[i - 1].lat != null) dist += hav(pts[i - 1], pts[i]);
    const w = pts[i - 1].p != null ? pts[i - 1].p : (pts[i].p != null ? pts[i].p : null), h = pts[i - 1].h != null ? pts[i - 1].h : (pts[i].h != null ? pts[i].h : null); for (let k = 0; k < Math.round(dt); k++) { sec1.push(w); hr1.push(h != null && h > 30 && h < 230 ? h : null); } if (pts[i].tc != null) tc1.push(pts[i].tc);
  }
  for (const q of pts) { if (q.a == null) continue; if (ref == null) ref = q.a; else if (q.a - ref >= 3) { hm += q.a - ref; ref = q.a; } else if (ref - q.a >= 3) ref = q.a; }
  const sSec = ses.reduce((q, s) => q + (s.sec || 0), 0), sKm = ses.reduce((q, s) => q + (s.km || 0), 0), sHm = ses.reduce((q, s) => q + (s.hm || 0), 0);
  const sec = Math.round(sSec > 60 ? sSec : mov), km = sKm > 0 ? sKm : dist / 1000; hm = sHm > 0 ? sHm : hm;
  if (sec < 300) throw new Error('Die Fahrt ist kürzer als 5 Minuten.');
  const withP = sec1.filter(v => v != null).length; let np = 0, mx = null;
  if (withP > .5 * sec1.length && sec1.length > 60) {
    const v = sec1.map(x => x || 0), roll = []; let s = 0; for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= 30) s -= v[i - 30]; if (i >= 29) roll.push(s / 30); }
    if (roll.length) np = Math.pow(roll.reduce((q, x) => q + x ** 4, 0) / roll.length, .25);
    mx = {}; [60, 300, 1200, 3600].forEach(n => { if (v.length >= n) { let q = 0, b = 0; for (let i = 0; i < v.length; i++) { q += v[i]; if (i >= n) q -= v[i - n]; if (i >= n - 1 && q > b) b = q; } mx[n] = Math.round(b / n); } });
  } else if (ses.length && ses[0].np) np = ses[0].np;
  const est = !(np && ftp), hv = hr1.filter(h => h != null), hrA = hv.length > 300 && hv.length > .5 * hr1.length ? hv.reduce((q, h) => q + h, 0) / hv.length : 0, le = est && hrA ? loadEst(sec, {hrAvg:hrA}) : null, IF = est ? (le ? le.IF : .65) : np / ftp, t0 = (pts[0] ? pts[0].t : 0) * 1000, iso8 = new Date(t0).toISOString();
  const out = {id:'m' + Math.round(t0 / 1000).toString(36) + sec.toString(36), n:(r.name || fname.replace(/\.[^.]+$/, '')).slice(0, 60) || 'Radfahrt', ts:iso8, day:lstr(new Date(t0)), km:Math.round(km * 10) / 10, hm:Math.round(hm), sec, tss:Math.round(sec * IF * IF / 36), IF:Math.round(IF * 100) / 100, est, ...(le ? {ld:le.src} : {}), ...(hrA ? {hrA:Math.round(hrA)} : {}), src:'file', np:Math.round(np || 0), m1:mx && mx[60] || null, m5:mx && mx[300] || null, m20:mx && mx[1200] || null, m60:mx && mx[3600] || null};
  /* F18: Fahrt ohne gültige GPS-Position = Rolle/Indoor (Zwift, Rollentrainer) */
  if (pts.length >= 10 && !pts.some(q => q.lat != null && isFinite(q.lat) && Math.abs(q.lat) <= 90 && !(q.lat === 0 && q.lon === 0))) out.in = 1;
  return Object.assign(out, perfExt(sec1, hr1, tc1, np));
}
async function uploadRides(inp){
  const files = [...(inp.files || [])]; upMsg = []; S.man = S.man || [];
  for (const f of files) {
    try {
      const {name, data} = await unpack(await f.arrayBuffer(), f.name); let r;
      if (data[8] === 0x2E && data[9] === 0x46 && data[10] === 0x49 && data[11] === 0x54) r = parseFIT(data);
      else { const x = new DOMParser().parseFromString(new TextDecoder().decode(data), 'application/xml'); if (x.getElementsByTagName('parsererror').length) throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind FIT, GPX und TCX.'); r = x.getElementsByTagName('gpx').length ? parseGPX(x) : x.getElementsByTagName('TrainingCenterDatabase').length ? parseTCX(x) : (() => { throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind FIT, GPX und TCX.'); })(); }
      const a = summarize(r, name), st = streamOf(r), hr = hrHist(r), hw = hrHist(r, 600); if (hw) a.hrW = hw;
      if (S.man.some(m => m.id === a.id)) { upMsg.push([f.name, 'bereits hochgeladen', false]); continue; }
      
      S.man.push(a); const ev = exeAuto(a, st, hr); upMsg.push([f.name, `${a.km.toLocaleString('de-DE')} km, ${mm(Math.round(a.sec / 60))}, TSS ${a.tss}${a.est ? ' (geschätzt, keine Leistungsdaten oder kein FTP)' : ''}${ev ? (ev.k && String(ev.k).startsWith('x-') ? `. Als Zusatzfahrt erkannt und ausgewertet${ev.adj ? ', Plan angepasst' : ''}` : `. Bewertet als ${ev.plan}: ${ev.score}/100`) : ''}`, true]);
    } catch (e) { upMsg.push([f.name, (e && e.message) || 'konnte nicht gelesen werden', false]); }
  }
  S.man = S.man.filter(a => Date.now() - new Date(a.ts) < 42 * 864e5).sort((a, b) => b.ts.localeCompare(a.ts));
  inp.value = ''; if (S.p && S.plan) analyze(); save(); render();
  if (upMsg.some(m => m[2])) track('fahrten-hochgeladen');
}
function delMan(id){ S.man = (S.man || []).filter(a => a.id !== id); if (S.p && S.plan) analyze(); save(); render(); }
function uploadCard(){
  const man = S.man || [], msgs = upMsg.map(([n, t, ok]) => `<p class="text-sm" style="color:${esc(ok ? 'var(--ok)' : '#c0392b')}">${ok ? '✓' : '⚠'} <b>${esc(n)}</b>: ${esc(t)}</p>`).join('');
  const list = man.slice(0, 6).map(a => `<div class="flex items-center gap-2 rounded-xl p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)"><span class="min-w-0 flex-1"><span class="block truncate font-semibold">${esc(a.n)}</span><span style="color:var(--mute)">${rel(a)}, ${a.km.toLocaleString('de-DE')} km, ${mm(Math.round(a.sec / 60))}, TSS ${a.tss}${a.est ? ' (geschätzt)' : ''}</span></span><button class="ghost !px-3 !py-1.5" onclick="delMan('${ja(a.id)}')" aria-label="Fahrt entfernen">Entfernen</button></div>`).join('');
  return fold('up', 'Fahrten hochladen', `<p class="text-sm" style="color:var(--mute)">Lade aufgezeichnete Fahrten als Datei hoch. Die App gleicht sie mit deinem Plan ab, und Fahrten dieser Woche werden automatisch der Einheit am selben Tag zugeordnet und bewertet. Erlaubt sind FIT, GPX und TCX, auch als ZIP oder GZ. Die Dateien werden nur in deinem Browser ausgewertet und nicht hochgeladen.</p>
    <label class="btn mt-3 inline-block cursor-pointer">Dateien wählen<input type="file" multiple accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="uploadRides(this)"></label>
    <div class="mt-3 space-y-1">${msgs}</div>${list ? `<div class="mt-3 space-y-2">${list}</div>` : ''}
    <details class="mt-3 text-xs" style="color:var(--mute)"><summary class="cursor-pointer text-sm" style="color:var(--teal)">Woher bekomme ich die Dateien?</summary><p class="mt-1"> <b>Strava</b> über die Aktivität im Browser, Menü ⋯, „Original exportieren“ oder „GPX exportieren“. <b>Garmin Connect</b> über die Aktivität, Zahnrad, „Original exportieren“ (ZIP mit FIT) oder „Nach GPX exportieren“. <b>Komoot</b> über die aufgezeichnete Tour, „GPX“ herunterladen. Komoot-Dateien haben meist keine Leistungswerte, dann schätzt die App die Belastung. Die Menünamen können sich je nach Version ändern. Fahrten bleiben 6 Wochen gespeichert.</p></details>`, false);
}

