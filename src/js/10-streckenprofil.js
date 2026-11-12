/* ---------- Streckenprofil (GPX/TCX/FIT) für die Zielzeit-Berechnung ---------- */
let courseMsg = '';
function buildCourse(pts, name){
  pts = pts.filter(q => q.a != null && isFinite(q.a)); if (pts.length < 10) throw new Error('Die Datei enthält keine Höhendaten. Bitte eine Datei mit Höhenprofil wählen (bei GPX ein Track oder eine Route mit <ele>).');
  const cum = [0]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; let dd = (a.d != null && b.d != null) ? b.d - a.d : (a.lat != null && b.lat != null && isFinite(a.lat) && isFinite(b.lat)) ? hav(a, b) : 0; cum.push(cum[i - 1] + Math.max(0, dd)); }
  const tot = cum[cum.length - 1]; if (tot < 5000) throw new Error('Die Strecke ist kürzer als 5 km.');
  const STEP = 50, n = Math.floor(tot / STEP) + 1, el = []; let j = 0;
  for (let i = 0; i < n; i++) { const x = i * STEP; while (j < cum.length - 2 && cum[j + 1] < x) j++; const sp = cum[j + 1] - cum[j], t = sp > 0 ? Math.min(1, Math.max(0, (x - cum[j]) / sp)) : 0; el.push(pts[j].a + (pts[j + 1].a - pts[j].a) * t); }
  const sm = el.map((_, i) => { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) { s += el[k]; c++; } return s / c; });
  const seg = []; let hm = 0;
  for (let i = 0; i + 5 <= n - 1; i += 5) { const rise = sm[i + 5] - sm[i], g = Math.max(-250, Math.min(250, Math.round(rise / (5 * STEP) * 1000))); if (rise > 0) hm += rise; seg.push([5 * STEP, g]); }
  const rest = (n - 1) % 5; if (rest) { const i = n - 1 - rest, rise = sm[n - 1] - sm[i]; if (rise > 0) hm += rise; seg.push([rest * STEP, Math.max(-250, Math.min(250, Math.round(rise / (rest * STEP) * 1000)))]); }
  const km = seg.reduce((q, s) => q + s[0], 0) / 1000;
  const p0 = pts[0], p1 = pts[pts.length - 1], loop = p0.lat != null && p1.lat != null && isFinite(p0.lat) && isFinite(p1.lat) && hav(p0, p1) < 500;
  return {loop, laps:1, name:(name || 'Strecke').slice(0, 60), dist:Math.round(km * 10) / 10, hm:Math.round(hm), e0:Math.round(sm[0]), seg};
}
async function uploadCourse(inp){
  const f = (inp.files || [])[0]; if (!f) return; courseMsg = '';
  try {
    const {name, data} = await unpack(await f.arrayBuffer(), f.name); let pts, nm = '';
    if (data[8] === 0x2E && data[9] === 0x46 && data[10] === 0x49 && data[11] === 0x54) pts = parseFIT(data).pts;
    else {
      const x = new DOMParser().parseFromString(new TextDecoder().decode(data), 'application/xml'); if (x.getElementsByTagName('parsererror').length) throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind GPX, TCX und FIT.');
      if (x.getElementsByTagName('gpx').length) {
        let els = [...x.getElementsByTagName('trkpt')]; if (!els.length) els = [...x.getElementsByTagName('rtept')]; if (!els.length) throw new Error('Die GPX-Datei enthält weder Track- noch Routenpunkte.');
        pts = els.map(e => { const el = txt1(e, 'ele'); return {a:el != null ? parseFloat(el) : null, lat:parseFloat(e.getAttribute('lat')), lon:parseFloat(e.getAttribute('lon')), d:null}; });
        const nmE = x.getElementsByTagName('name')[0]; nm = nmE ? nmE.textContent.trim() : '';
      } else if (x.getElementsByTagName('TrainingCenterDatabase').length) {
        pts = [...x.getElementsByTagName('Trackpoint')].map(e => { const d = txt1(e, 'DistanceMeters'), a = txt1(e, 'AltitudeMeters'), la = txt1(e, 'LatitudeDegrees'), lo = txt1(e, 'LongitudeDegrees'); return {d:d != null ? parseFloat(d) : null, a:a != null ? parseFloat(a) : null, lat:la != null ? parseFloat(la) : null, lon:lo != null ? parseFloat(lo) : null}; });
      } else throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind GPX, TCX und FIT.');
    }
    const c = buildCourse(pts, nm || name.replace(/\.[^.]+$/, ''));
    const ev = EVS.find(x => x.id === S.d.evId), want = ev ? ev.km : S.d.dist;
    if (want > c.dist * 1.5) { c.laps = Math.max(1, Math.round(want / c.dist)); c.autoLaps = true; }
    S.d.course = c; S.d.dist = Math.round(c.dist * c.laps * 10) / 10; S.d.hm = Math.round(c.hm * c.laps); courseMsg = '';
  } catch (e) { courseMsg = (e && e.message) || 'Die Datei konnte nicht gelesen werden.'; }
  inp.value = ''; save(); render();
}
function setLaps(n){ const c = S.d.course; if (!c) return; c.laps = Math.max(1, Math.min(200, Math.round(Number(n) || 1))); c.autoLaps = false; S.d.dist = Math.round(c.dist * c.laps * 10) / 10; S.d.hm = Math.round(c.hm * c.laps); save(); render(); }
function clearCourse(){ if (S.d.course && S.d.course.builtin) S.d.noBuiltin = true; delete S.d.course; courseMsg = ''; save(); render(); }
function courseStats(c){
  let up = 0, down = 0, steep = 0; const L = c.seg; c.seg.forEach(([l, g]) => { if (g >= 15) up += l; if (g <= -20) down += l; });
  for (let i = 0; i + 4 <= L.length; i++) { let rise = 0, len = 0; for (let k = i; k < i + 4; k++) { rise += L[k][0] * L[k][1] / 1000; len += L[k][0]; } steep = Math.max(steep, rise / len * 100); }
  return {up, down, steep};
}
function elevSvg(c){
  const pts = []; let x = 0, y = c.e0 || 0; pts.push([0, y]); c.seg.forEach(([l, g]) => { x += l; y += l * g / 1000; pts.push([x, y]); });
  const mn = Math.min(...pts.map(q => q[1])), mx = Math.max(...pts.map(q => q[1])), W = 300, Hh = 70, sx = W / x, sy = (Hh - 6) / Math.max(30, mx - mn), step = Math.ceil(pts.length / 150);
  const d = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(q => `${(q[0] * sx).toFixed(1)},${(Hh - 3 - (q[1] - mn) * sy).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${Hh}" class="w-full" style="height:70px" role="img" aria-label="Höhenprofil der Strecke"><polygon points="0,${Hh} ${d} ${W},${Hh}" fill="#e6f7f6" stroke="none"/><polyline points="${d}" fill="none" stroke="var(--teal)" stroke-width="1.5"/></svg><div class="flex justify-between text-xs" style="color:var(--mute)"><span>${Math.round(mn)} m</span><span>höchster Punkt ${Math.round(mx)} m</span></div>`;
}
/* Hinterlegte Streckenprofile: aus Pass-, Orts- und Höhendaten rekonstruiert (Stützpunkte [km, m]), auf die offiziellen Höhenmeter mit welligen Abschnitten aufgefüllt */
function courseFromCP(e){
  const L = e.laps || 1, lapKm = e.km / L, cp = e.cp, sc = lapKm / cp[cp.length - 1][0], pts = [];
  for (let x = 0; x <= lapKm * 1000 + 1; x += 50) { const k = x / 1000 / sc; let j = 0; while (j < cp.length - 2 && cp[j + 1][0] < k) j++; const t = Math.max(0, Math.min(1, (k - cp[j][0]) / (cp[j + 1][0] - cp[j][0]))); pts.push({d:x, a:cp[j][1] + (cp[j + 1][1] - cp[j][1]) * t, lat:null, lon:null}); }
  const c = buildCourse(pts, e.n + (e.v ? ' ' + e.v : '')), want = (e.hm || 0) / L, def = want - c.hm;
  if (def > 20) { const flat = c.seg.filter(s => Math.abs(s[1]) < 20 && s[0] === 250), pairs = Math.floor(flat.length / 2); if (pairs) { const g = Math.min(40, Math.round(def / (pairs * 250) * 1000)); for (let k = 0; k < pairs; k++) { flat[2 * k][1] += g; flat[2 * k + 1][1] -= g; } c.hm = Math.round(c.hm + pairs * 250 * g / 1000); } }
  return Object.assign(c, {builtin:true, src:e.src, laps:L, loop:L > 1});
}
function ensureBuiltin(d){ if (d.goal !== 'event' || d.course || d.noBuiltin) return; const e = EVS.find(x => x.id === d.evId); if (e && e.cp) { d.course = courseFromCP(e); save(); } }
function coursePick(d){
  ensureBuiltin(d);
  const c = d.course, st = c ? courseStats(c) : null, ev = EVS.find(x => x.id === d.evId), bi = c && c.builtin, L = (c && c.laps) || 1;
  const upl = l => `<label class="${esc(c ? 'ghost !py-2 text-sm' : 'btn')} mt-3 inline-block cursor-pointer">${l}<input type="file" accept=".gpx,.tcx,.fit,.xml,.zip,.gz" style="display:none" onchange="uploadCourse(this)"></label>`;
  const head = bi ? `<p class="font-semibold">Streckenprofil hinterlegt</p><p class="mt-1 text-sm" style="color:var(--mute)">Für dieses Event kennt die App die Strecke. Das Profil ist aus Pass-, Orts- und Höhendaten rekonstruiert (${esc(c.src)}), einzelne Abschnitte können abweichen. Du musst nichts hochladen. Mit der offiziellen GPX-Datei wird es noch genauer.</p>${upl('Eigene GPX-Datei verwenden')}`
    : c ? `<p class="font-semibold">Streckenprofil aus deiner Datei</p>${upl('Andere Datei wählen')}`
    : `<p class="font-semibold">Streckenprofil hochladen</p><p class="mt-1 text-sm" style="color:var(--mute)">${ev ? (d.noBuiltin && ev.cp ? 'Du hast das hinterlegte Profil abgewählt.' : 'Für dieses Event ist in der App kein Streckenprofil hinterlegt.') : 'Für ein eigenes Event kennt die App die Strecke nicht.'} Lade die GPX-, TCX- oder FIT-Datei hoch, meist bietet sie der Veranstalter auf der Eventseite an. Dann erkennt die App die einzelnen Anstiege und richtet Zielzeit und Training genauer aus. Ohne Datei schätzt sie aus Distanz und Höhenmetern. Die Datei wird nur in deinem Browser ausgewertet.</p>${upl('Datei wählen')}${ev && ev.cp && d.noBuiltin ? '<button class="ghost mt-3 ml-2 !py-2 text-sm" onclick="useBuiltin()">Hinterlegtes Profil verwenden</button>' : ''}`;
  const lapUi = c && (!bi || L > 1) ? `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="text-sm font-semibold">${bi ? 'Runden' : 'Rundkurs?'}</p>
        <p class="mt-1 text-xs" style="color:var(--mute)">${bi ? 'Das Rennen wird auf einer Runde gefahren, das Profil zeigt eine Runde.' : (c.loop ? 'Start und Ziel der Datei liegen beieinander, das sieht nach einer Runde aus. ' : '') + 'Bei Rundrennen enthält die GPX-Datei meist nur eine Runde. Gib an, wie viele Runden gefahren werden.'}${c.autoLaps ? ` Die App hat aus der Eventdistanz ${c.laps} Runden angenommen.` : ''}</p>
        <div class="mt-2 flex items-center gap-2"><button class="ghost !px-3 !py-1.5" onclick="setLaps(${ja(L - 1)})" aria-label="Eine Runde weniger">−</button><input type="number" inputmode="numeric" min="1" max="200" class="inp text-center" style="max-width:5rem" value="${esc(L)}" onchange="const v = this.value; setTimeout(() => setLaps(v))" aria-label="Anzahl Runden"><button class="ghost !px-3 !py-1.5" onclick="setLaps(${ja(L + 1)})" aria-label="Eine Runde mehr">+</button><span class="text-sm">${L === 1 ? 'Runde' : 'Runden'}</span></div>
        <p class="mt-2 text-sm"><b>Gesamt: ${(Math.round(c.dist * L * 10) / 10).toLocaleString('de-DE')} km, ${Math.round(c.hm * L).toLocaleString('de-DE')} hm</b></p></div>` : '';
  return `<div class="panel p-4">${head}
    ${courseMsg ? `<p class="mt-2 text-sm" style="color:#c0392b">⚠ ${esc(courseMsg)}</p>` : ''}
    ${c ? `<div class="mt-3"><p class="text-sm" style="color:var(--ok)">✓ <b>${esc(c.name)}</b>: ${c.dist.toLocaleString('de-DE')} km, ${c.hm.toLocaleString('de-DE')} hm${L > 1 ? ' pro Runde' : ''}${bi ? ' (rekonstruiert)' : ''}</p>
      ${lapUi}<div class="mt-2">${L > 1 ? '<p class="text-xs" style="color:var(--mute)">Höhenprofil einer Runde</p>' : ''}${elevSvg(c)}</div>
      <p class="mt-2 text-sm" style="color:var(--mute)">${f1(st.up / 1000)} km Anstieg (ab 1,5 %), ${f1(st.down / 1000)} km Abfahrt (ab 2 %), steilster Kilometer etwa ${f1(st.steep)} %. ${bi ? 'Distanz und Höhenmeter oben sind die offiziellen Angaben.' : 'Distanz und Höhenmeter oben stammen aus der Datei. Die Höhenmeter weichen oft um einige Prozent von den Angaben des Veranstalters ab, weil Glättung und Höhenquelle unterschiedlich sind.'} Änderst du sie von Hand, wird das Profil verworfen.</p>
      <button class="ghost mt-2 !py-2 text-sm" onclick="clearCourse()">${bi ? 'Hinterlegtes Profil nicht verwenden' : 'Profil entfernen'}</button></div>` : ''}</div>`;
}
function useBuiltin(){ delete S.d.noBuiltin; delete S.d.course; const e = EVS.find(x => x.id === S.d.evId); if (e) { S.d.dist = e.km; S.d.hm = e.hm || 0; } save(); render(); }
const DRAFT = {solo:[1, 'Solo'], grp:[.7, 'Gruppe'], pel:[.5, 'Peloton']};
const MODEL = {crr:.004, eta:.97, rho:1.2, cda0:.36, extra:10, vmax:60 / 3.6};
/* Leistungsbilanz (Martin et al. 1998): P · Wirkungsgrad = (m·g·sinθ + Crr·m·g·cosθ + ½·ρ·CdA·v²) · v. Gelöst per Intervallhalbierung nach der Geschwindigkeit v. */
function spdAt(P, s, m, cda){
  const th = Math.atan(s), F0 = m * 9.81 * (Math.sin(th) + MODEL.crr * Math.cos(th));
  if (P <= 0) return F0 >= 0 ? .5 : Math.min(MODEL.vmax, Math.sqrt(2 * -F0 / (MODEL.rho * cda)));
  let lo = .2, hi = 40; for (let i = 0; i < 50; i++) { const v = (lo + hi) / 2; if (v * (F0 + .5 * MODEL.rho * cda * v * v) > P * MODEL.eta) hi = v; else lo = v; } return lo;
}
/* Strecke ohne GPX: symmetrisches Profil. Anteil c der Strecke bergauf mit Steigung g, gleich viel bergab (Leistung 0 W, max. 60 km/h), Rest flach. */
const _hist = new WeakMap();
function courseTime(P, p, kg){
  if (p.course && p.course.seg && p.course.seg.length) {
    let h = _hist.get(p.course); if (!h) { h = {}; p.course.seg.forEach(([l, g]) => { h[g] = (h[g] || 0) + l; }); _hist.set(p.course, h); }
    const m = kg + MODEL.extra, cda = MODEL.cda0 * Math.pow(kg / 75, .312) * (DRAFT[p.draft] || DRAFT.grp)[0]; let sec = 0, tw = 0;
    for (const g in h) { const s = g / 1000, coast = s <= -.02, v = coast ? spdAt(0, s, m, cda) : Math.min(spdAt(P, s, m, cda), MODEL.vmax), t = h[g] / v; sec += t; if (!coast) tw += t; }
    const L = p.course.laps || 1; return {sec:sec * L, tw:tw * L, course:true, laps:L};
  }
  const D = p.dist * 1000, H = p.hm || 0, g = Math.min(.06, .03 + .0012 * H / p.dist), c = Math.min(.5, H / (g * D)), m = kg + MODEL.extra, dr = (DRAFT[p.draft] || DRAFT.grp)[0], cda = MODEL.cda0 * Math.pow(kg / 75, .312) * dr;
  const dc = c * D, df = D - 2 * dc, tc = dc / spdAt(P, g, m, cda), tf = df / spdAt(P, 0, m, cda), td = dc / spdAt(0, -g, m, cda);
  return {sec:tc + tf + td, tw:tc + tf, g, c, tc, tf, td};
}
function evCheck(p){
  const m = /^(\d+):(\d{1,2})$/.exec(String(p.targetTime).trim());
  if (!m || !(p.dist > 0) || !(p.ftp > 0)) return null;
  const kg = kgOf(p), tgt = +m[1] * 60 + +m[2]; if (tgt < 30) return null;
  /* Zu einer Zielzeit T die nötige Arbeitsleistung P finden, daraus Normalized Power (Segmentmischung aus P und 0 W) und über die Leistungs-Dauer-Näherung IF(T) den nötigen FTP. */
  const need = T => { const sec = T * 60; let lo = 20, hi = 1500; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (courseTime(mid, p, kg).sec > sec) lo = mid; else hi = mid; }
    const ct = courseTime(hi, p, kg), np = hi * Math.pow(ct.tw / ct.sec, .25), ifs = 1 - .10 * Math.log(Math.max(1, T / 60)); return {P:hi, np, ftp:np / ifs, ct}; };
  const r = need(tgt), ratio = r.ftp / p.ftp;
  let lo = 30, hi = 1800, real = null;
  if (need(hi).ftp <= p.ftp) { while (hi - lo > (p._prec ? .2 : 1)) { const mid = (lo + hi) / 2; if (need(mid).ftp > p.ftp) lo = mid; else hi = mid; } real = p._prec ? hi : Math.ceil(hi / 5) * 5; }
  return {kg, ftpNeed:Math.round(r.ftp), wkgNeed:r.ftp / kg, wkg:p.ftp / kg, ratio, real, tgt, P:Math.round(r.P), np:Math.round(r.np), ct:r.ct, kmh:p.dist / (tgt / 60), verdict:ratio <= 1 ? 'ok' : ratio <= 1.08 ? 'mid' : 'high'};
}
function setDraft(k){ S.d.draft = k; save(); render(); }
const draftChips = d => `<div><p class="mb-2 text-sm" style="color:var(--mute)">Fahrweise im Rennen (Windschatten)</p><div class="flex flex-wrap gap-2">${Object.keys(DRAFT).map(k => chip(DRAFT[k][1] + ' (' + Math.round(DRAFT[k][0] * 100) + ' % Luftwiderstand)', (d.draft || 'grp') === k, `setDraft('${ja(k)}')`)).join('')}</div></div>`;
function modelInfo(d, r){
  const dr = (DRAFT[d.draft] || DRAFT.grp), ct = r.ct, km = x => f1(x / 1000);
  return `<details class="mt-3 text-xs" style="opacity:.9"><summary class="cursor-pointer font-semibold">Rechenmodell und Annahmen</summary>
    <p class="mt-2"><b>Modell:</b> Leistungsbilanz für Straßenradfahrer nach Martin et al. 1998 (Journal of Applied Biomechanics, validiert gegen Messdaten mit R² = 0,97 und 2,7 W Standardfehler). Antriebsleistung × Wirkungsgrad = Gravitation + Rollwiderstand + Luftwiderstand, pro Streckenabschnitt numerisch nach der Geschwindigkeit gelöst. Dieselbe Gleichung nutzen auch Online-Rechner wie der von Roadman.</p>
    <p class="mt-2"><b>Parameter:</b> Systemmasse ${f1(r.kg + MODEL.extra)} kg (Fahrer plus ${MODEL.extra} kg Rad und Ausrüstung), CdA ${(Math.round(MODEL.cda0 * Math.pow(r.kg / 75, .312) * 100) / 100).toLocaleString('de-DE')} m² (Grundwert 0,36 m² für Oberlenker/Unterlenker-Haltung, nach Gewicht skaliert mit m^0,312) × ${dr[0].toLocaleString('de-DE')} für ${dr[1]}, Rollwiderstand ${MODEL.crr.toLocaleString('de-DE')} (Asphalt), Luftdichte ${MODEL.rho.toLocaleString('de-DE')} kg/m³, Antriebswirkungsgrad ${MODEL.eta * 100} %, Abfahrten ohne Treten und höchstens 60 km/h, kein Wind.</p>
    <p class="mt-2"><b>Strecke:</b> ${ct.course ? (d.course.builtin ? 'Das hinterlegte, aus Pass- und Ortsdaten rekonstruierte Profil „' : 'Dein hochgeladenes Profil „') + esc(d.course.name) + '“' + ((d.course.laps || 1) > 1 ? ' × ' + d.course.laps + ' Runden' : '') + ' in ' + d.course.seg.length + ' Abschnitten pro Runde (je etwa 250 m, Steigung pro Abschnitt). Abfahrten ab 2 % Gefälle werden ohne Treten gerollt, sonst wird mit der Arbeitsleistung gefahren.' : 'Ohne Streckenprofil nimmt die App ein symmetrisches Profil an: ' + km(ct.c * d.dist * 1000) + ' km bergauf bei ' + f1(ct.g * 100) + ' % Steigung, ebenso viel bergab, ' + km(Math.max(0, d.dist * 1000 * (1 - 2 * ct.c))) + ' km flach. Mit einer GPX-Datei der Strecke wird es genauer.'} Du musst dafür ${f1(r.kmh)} km/h im Schnitt fahren. Ergebnis: ${r.P} W Arbeitsleistung beim Treten, Normalized Power ${r.np} W.</p>
    <p class="mt-2"><b>Vom Zielwert zum FTP:</b> Der nötige FTP ist Normalized Power geteilt durch den Anteil des FTP, den man über die Dauer halten kann: IF = 1 − 0,10 · ln(Dauer in Std.), ab 1 Std. (zum Beispiel 0,93 bei 2 Std., 0,79 bei 8 Std.). Das ist eine Näherung an die Leistungs-Dauer-Kurve und nicht aus einer einzelnen Studie, die Unsicherheit ist hier am größten.</p>
    <p class="mt-2"><b>Windschatten:</b> Gruppenfahren senkt den Luftwiderstand je nach Position stark. Für kleine Gruppen finden Studien etwa 50 bis 70 % des Widerstands eines Einzelfahrers, in der Mitte großer Felder nach Blocken et al. 2018 sogar nur 5 bis 10 %. Die App rechnet mit Mittelwerten, weil niemand das ganze Rennen im Windschatten bleibt.</p>
    <p class="mt-2"><b>Grenzen:</b> Konstante Leistung, kein Wind, keine Pausen und Verpflegungsstopps, Sturz- und Bremsverluste nur über das 60-km/h-Limit. Bei Rennen mit Tempowechseln, Angriffen und Gruppendynamik weicht die Realität ab. Rechne mit etwa ±10 % und prüfe die Zielzeit nach der Anmeldung mit der GPX-Datei des Veranstalters.</p></details>`;
}
const wkgHtml = d => `Das sind ${f1(d.ftp / kgOf(d))} W/kg bei ${f1(kgOf(d))} kg. Bergauf zählt die Leistung pro Kilogramm.`;
function evHtml(d){
  if (d.goal !== 'event') return '';
  const r = evCheck(d);
  if (!r) return '<p class="text-sm" style="color:var(--mute)">Trage Zielzeit (z. B. 7:59), Distanz und Höhenmeter ein, dann prüft die App, ob die Zielzeit zu deinem FTP und Gewicht passt.</p>';
  let a = null; try { a = ambTarget(d); } catch (e) { elog(e); }
  const v = r.ftpNeed <= d.ftp ? 'ok' : a && a.t ? (r.tgt >= a.t * .97 ? 'mid' : 'high') : 'high';
  const C = {ok:['#e3f6f0','#0a8f6a','#064e3b','Schon mit deinem heutigen FTP machbar'], mid:['#fff6dc','#d9a400','#6b4e00',a && a.t && r.tgt < a.t ? 'Sehr ehrgeizig: ambitioniertes Training und ein guter Tag nötig' : 'Mit ambitioniertem Training erreichbar'], high:['#fdeceb','#c0392b','#7a1f17','Ein großer Schritt: Ein Zwischenziel ist für diesen Termin realistischer']}[v];
  const at = a && a.t ? hm2(a.t) : null;
  return `<div class="rounded-2xl p-4" style="background:${esc(C[0])};border:1px solid ${esc(C[1])};color:${esc(C[2])}"><h3 class="hd mb-1 text-xl font-semibold">Zielzeit-Check: ${C[3]}</h3>
    <p class="text-sm leading-relaxed">Für ${hm2(r.tgt)} Std. (Ø ${f1(d.dist / (r.tgt / 60))} km/h) auf ${f1(d.dist)} km mit ${(d.hm || 0).toLocaleString('de-DE')} hm brauchst du am Eventtag etwa ${r.ftpNeed} W FTP (${f1(r.wkgNeed)} W/kg). Heute hast du ${d.ftp} W (${f1(r.wkg)} W/kg).${a ? ` Mit ambitioniertem Training bis zum Event (etwa ${hStd(a.hv)} Std. pro Woche verfügbar, Long Ride nach Empfehlung) sind etwa <b>${a.ftp} W</b> möglich (${a.lo} bis ${a.hi} W). Damit realistisch: <b>${at ? at + ' Std. (Ø ' + f1(d.dist / (a.t / 60)) + ' km/h)' : 'nicht berechenbar'}</b>.${a.tPlan && a.tPlan !== a.t ? ` Mit deinem aktuellen Plan (${hStd(a.hPlanV)} Std. pro Woche) erwartet die App etwa <b>${hm2(a.tPlan)} Std.</b>, das ist auch der Wert im Plan-Check.` : ''}` : ''}</p>
    <div class="mt-3 flex flex-wrap gap-2">${a && a.tPlan && Math.abs(a.tPlan - r.tgt) >= 5 ? `<button onclick="setTarget('${ja(hm2(a.tPlan))}')" class="ghost lbl !py-2">${a.tPlan < r.tgt ? 'Ehrgeiziger: ' + hm2(a.tPlan) : 'Zielzeit auf ' + hm2(a.tPlan) + ' setzen'} (passt zum aktuellen Plan)</button>` : ''}${at && Math.abs(a.t - r.tgt) >= 5 && a.t !== a.tPlan ? `<button onclick="setTarget('${ja(at)}')" class="ghost lbl !py-2">Ambitioniert: ${at} (braucht etwa ${hStd(a.hv)} Std. pro Woche)</button>` : ''}</div>
    ${d.hm > 0 ? '' : '<p class="mt-2 text-sm"><b>Tipp: Trag noch die Höhenmeter ein.</b> Dann wird die Prüfung genauer, ohne sie fällt sie zu optimistisch aus.</p>'}
    <p class="mt-2 text-xs" style="opacity:.75">Modell: Leistungsbilanz nach Martin et al. 1998, Genauigkeit etwa ±10 %. Die FTP-Prognose für ambitioniertes Training ist ein Faustmodell (siehe Plan-Check). Sie setzt voraus, dass du die Einheiten konsequent fährst und gesund bleibst.</p>${modelInfo(d, r)}</div>`;
}
/* Ambitioniertes Training: oberer empfohlener Wochenumfang (höchstens 14 Std.) oder mehr, wenn schon mehr geplant ist; Long Ride nach Empfehlung, FTP-Prognose bis zum Eventtag */
function ambTarget(d){
  if (d.goal !== 'event' || !(d.dist > 0)) return null;
  const pv = d.start ? d : mkPrev(d), st = planStats(pv), live = pv === S.p && hasStarted(pv), weeks = Math.max(0, st.tot - (live ? curWeek(pv) : 1) + 1);
  const pr = evProfile(pv), rec = hRec(pv, pr ? pr.tev : 0), rt = hAv(pv) > 0 && st.hAvg > 0 ? Math.min(1, st.hAvg / hAv(pv)) : .87, hv = Math.min(14, Math.max(hAv(pv), rec[1])), h = hv * rt, pj = ftpProj(pv, h, weeks);
  /* gleicher Rechenweg wie der Plan-Check: Renntag-Hebel eingerechnet; ambitioniert = Long Ride nach Empfehlung (keine Abzüge) */
  const lm = levMult(pv, pr ? pr.tev : 0), t = evTime({...pv, targetTime:'5:00'}, pj.mid * lm);
  let tPlan = null; try { const c = planCheck(pv, live); tPlan = c.sc[0] && c.sc[0].t ? Math.ceil(c.sc[0].t / 5) * 5 : null; } catch (e) { elog(e); }
  return {h, hv, hPlanV:hAv(pv), ftp:pj.mid, lo:pj.lo, hi:pj.hi, weeks, t:t ? Math.ceil(t / 5) * 5 : null, tPlan, hPlan:st.hAvg, ftpPlan:ftpProj(pv, st.hAvg, weeks).mid};
}
function evUpd(){ setTimeout(() => ['tsug', 'evc', 'wk'].forEach(id => postRender(document.getElementById(id))), 0); const ts = document.getElementById('ts'), sg = document.getElementById('tsug'); if (ts && document.activeElement !== ts) ts.value = spdOf(S.d) ? f1(spdOf(S.d)) : ''; if (sg) sg.innerHTML = tgtSugHtml(S.d); const a = document.getElementById('wk'), b = document.getElementById('evc'); if (a) a.textContent = wkgHtml(S.d); if (b) b.innerHTML = evHtml(S.d); }
function setTarget(t){ S.d.targetTime = t; S.d.tgtMan = true; if (S.p && S.step === 0) { S.p.targetTime = t; S.p.tgtMan = true; replanCyc(); } save(); render(); }
function pick(g){ S.d.goal = g; save(); render(); }
function nav(n){ if (n > S.step) { const m = rngFirst(S.d); if (m) { formMsg = m; render(); scrollTop0(); return; } } formMsg = ''; S.step = n; save(); render(); scrollTop0(); }
