/* F24: Einheiten-Grafik (Blöcke, Zonen, Watt, Mini, VoiceOver, Kraft-Zeitleiste) · F25: Höhenprofil, Streckenlinie, Speicher */
R.file = 'grafik';
const gDat = d => ({goal:'event', eventName:'Testrennen', eventDate:'2027-06-20', ftp:250, hours:8, ...d});
/* Zufall mit festem Startwert, damit die Testdaten reproduzierbar sind */
const gRng = s => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
/* Synthetische Fahrt mit 1 Hz: Strecke nach Osten, Höhe aus prof(km), Rauschen ±noise m */
function gRide({sec = 7200, v = 8.3, prof = () => 300, noise = 0, gps = true, alt = true, pow = true, dist = true, seed = 7, lat0 = 50.1, lon0 = 8.6} = {}){
  const r = gRng(seed), pts = [], t0 = 1794470400; let d = 0;
  for (let i = 0; i < sec; i++) { d += v; const km = d / 1000, ang = km / 9;
    pts.push({t:t0 + i, d:dist ? d : null, a:alt ? prof(km) + (r() * 2 - 1) * noise : null, p:pow ? Math.round(180 + 40 * Math.sin(i / 300) + r() * 20) : null, h:140 + Math.round(10 * Math.sin(i / 400)),
      lat:gps ? lat0 + Math.sin(ang) * .05 + km * .0005 : null, lon:gps ? lon0 + (1 - Math.cos(ang)) * .08 + km * .004 : null}); }
  return {pts, ses:[], name:'Testfahrt'};
}

test('F24: Sweet Spot 3×12 als Blöcke, Rampen, Summe der Dauer, Zonenfarbe', async () => {
  const a = await boot(); makePlan(a, gDat());
  const x = a.$("({...SST_X = (() => { const p = S.p; return {t:'sst', n:'Sweet Spot 3×12', m:71, lo:88, hi:94, cad:'85–95 U/min', iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}}; })()})");
  const bl = a.w.wkBlocks(x); eq(bl.reduce((s, b) => s + b.d, 0), 71 * 60, 'Dauer gesamt');
  eq(bl.map(b => b.k).join(','), 'wu,work,rest,work,rest,work,cd', 'Reihenfolge');
  ok(bl[0].a < bl[0].b && bl[6].a > bl[6].b, 'Einfahren steigt, Ausfahren sinkt (Trapez)');
  eq(bl.filter(b => b.k === 'work').map(b => a.$('wkZi')(a.$('wkMid')(b))), [3, 3, 3], '91 % = Z4');
  const svg = a.w.wkSvg(x); ok((svg.match(/class="wkz4" fill-opacity/g) || []).length === 3, '3 gelbe Blöcke'); ok(/class="wk-ftp"/.test(svg) && />FTP</.test(svg), 'Bezugslinie 100 % FTP');
  ok(/<path d="M[^"]+Z" class="wkz/.test(svg), 'Rampe als Trapez'); ok(/TSS ~\d+ · IF 0,\d\d/.test(svg), 'Dauer, TSS, IF'); ok(/wk-zb/.test(svg) && /Z4 36 Min\./.test(svg), 'Zonenleiste mit Zeit je Zone');
  a.noErrors();
});

test('F24: Zonengrenzen der App (55/75/90/105/120 %)', async () => {
  const a = await boot();
  eq([0, 54.9, 55, 74.9, 75, 89.9, 90, 104.9, 105, 119.9, 120, 200].map(v => a.$('wkZi')(v)), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  eq(a.$('VZ_ZP.slice(0, 6).map(z => z[1])'), [55, 75, 90, 105, 120, 150], 'gleiche Grenzen wie die Zonen der Fahrtauswertung');
});

test('F24: 30/15-Intervalle bleiben sichtbar (Mindestbreite), Zeitachse endet am Ende', async () => {
  const a = await boot(); makePlan(a, gDat());
  const x = {t:'vo2', n:'VO2max 30/15', m:75, lo:115, hi:125, cad:'100–110 U/min', iv:{sets:3, reps:13, work:.5, rest:.25, sr:3, lo:115, hi:125, wu:15, cd:10}};
  const bl = a.w.wkBlocks(x); eq(bl.filter(b => b.k === 'work').length, 39, '3 × 13 Intervalle einzeln'); eq(bl.reduce((s, b) => s + b.d, 0), 75 * 60);
  const sc = a.w.wkScale(bl, 304, 0, 1.6); ok(sc.wide.size > 0, 'kurze Blöcke verbreitert'); near(sc.xs[bl.length], 304, .01, 'Gesamtbreite unverändert');
  ok([...sc.wide].every(i => bl[i].d <= 30), 'nur kurze Blöcke'); near(sc.X(sc.tot), 304, .01, 'Achse endet mit dem letzten Block');
  /* Hinweis im Tooltip */
  const html = a.w.wkSvg(x), id = html.match(/data-wk="(wk\d+)"/)[1]; a.f.contentDocument.body.insertAdjacentHTML('beforeend', `<div id="tt">${html}</div>`);
  const g = a.$(`wkReg['${id}']`), i = [...g.wide][0], svg = a.f.contentDocument.querySelector(`[data-wk="${id}"]`), r = svg.getBoundingClientRect();
  a.w.wkTip({currentTarget:svg, clientX:r.left + (g.xs[i] + g.xs[i + 1]) / 2 / 340 * r.width}, id);
  ok(/breiter gezeichnet/.test(a.f.contentDocument.getElementById(id + '-t').textContent), 'Tooltip nennt die Verbreiterung');
  a.noErrors();
});

test('F24: Unstrukturierte Einheit, Fitness-Check, Long Ride mit Tempo, Pendeltag', async () => {
  const a = await boot(); makePlan(a, gDat());
  const b1 = a.w.wkBlocks({t:'base', n:'Grundlage', m:120, lo:56, hi:72}); eq(b1.length, 1); eq(b1[0].k, 'steady'); eq(a.$('wkZi')(a.$('wkMid')(b1[0])), 1, 'Z2');
  ok(/class="wkz2"/.test(a.w.wkSvg({t:'base', n:'Grundlage frei', m:120, lo:56, hi:72})), 'ein durchgehender Block, kein Fehler');
  const t = a.$('TESTX0()'), bt = a.w.wkBlocks(t); eq(bt.reduce((s, b) => s + b.d, 0), t.m * 60, 'Fitness-Check: Dauer passt'); ok(bt.some(b => b.d === 1200 && b.lo >= 95), '20 Min. Test');
  const bl = a.w.wkBlocks({t:'long', n:'Long Ride', m:240, lo:56, hi:85}); eq(bl.reduce((s, b) => s + b.d, 0), 240 * 60); ok(bl.some(b => b.k === 'tempo'));
  const pd = a.w.wkBlocks({t:'com', n:'Pendeln', m:60, parts:[{lbl:'Hinweg', m:30, lo:56, hi:70}, {lbl:'Rückweg', m:30, iv:{reps:2, work:8, rest:4, lo:88, hi:94, wu:5, cd:5}}]});
  eq(pd.reduce((s, b) => s + b.d, 0), 3600); eq(pd.filter(b => b.part).map(b => b.part), ['Hinweg', 'Rückweg']);
  eq(a.w.wkBlocks({t:'rest', m:0}), []); eq(a.w.wkSvg({t:'rest', m:0}), '');
  a.noErrors();
});

test('F24: Watt folgen der aktuellen FTP, Logbuch behält die FTP von damals', async () => {
  const a = await boot(); makePlan(a, gDat({ftp:250}));
  const b = {lo:88, hi:94, a:91, b:91, k:'work'};
  eq(a.w.wkTgt(b, a.$('S.p.ftp')), '220–235 W · 88–94 % FTP');
  a.$('S.p.ftp = 300'); eq(a.w.wkTgt(b, a.$('S.p.ftp')), '264–282 W · 88–94 % FTP', 'neue FTP');
  const x = {t:'sst', n:'SST', m:71, lo:88, hi:94, iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}}, h = a.w.wkSvg(x, {ftp:250}), id = h.match(/data-wk="(wk\d+)"/)[1];
  eq(a.$(`wkReg['${id}'].ftp`), 250, 'Grafik im Logbuch rechnet mit FTP 250 (damals)');
});

test('F24: Mini-Variante ohne Achsen und Beschriftung', async () => {
  const a = await boot(); makePlan(a, gDat());
  const m = a.w.wkSvg({t:'sst', n:'SST', m:71, lo:88, hi:94, iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}}, {mode:'mini'});
  ok(!/<text/.test(m) && !/wk-ftp|wk-ax/.test(m), 'keine Achsen, keine Texte'); ok(/aria-hidden="true"/.test(m), 'in der Liste ausgeblendet (Text steht in der Karte)'); ok(/height:28px/.test(m), 'feste Höhe');
});

test('F24: VoiceOver-Text Deutsch und Englisch', async () => {
  const a = await boot(); makePlan(a, gDat());
  const x = {t:'sst', n:'SST', m:71, lo:88, hi:94, iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}};
  eq(a.w.wkSay(x), 'Einheit 71 Minuten: 15 Minuten einfahren, 3 mal 12 Minuten bei 88 bis 94 Prozent FTP mit 5 Minuten Pause, 10 Minuten ausfahren');
  ok(/role="img" aria-label="Einheit 71 Minuten: 15 Minuten einfahren/.test(a.w.wkSvg(x)), 'als Beschriftung der Grafik');
  await a.en(); eq(a.w.wkSay(x), 'Workout 71 minutes: 15 minutes warm-up, 3 times 12 minutes at 88 to 94 percent FTP with 5 minutes recovery, 10 minutes cool-down');
  const v30 = a.w.wkSay({t:'vo2', m:75, lo:115, hi:125, iv:{sets:3, reps:13, work:.5, rest:.25, sr:3, lo:115, hi:125, wu:15, cd:10}}); ok(/3 sets of 13 times 30 seconds at 115 to 125 percent FTP with 15 seconds recovery/.test(v30), v30);
});

test('F24: Ohne Wattmesser zeigt die Grafik Puls bzw. Empfinden', async () => {
  const a = await boot(); makePlan(a, gDat({lthr:170}));
  a.$('S.p.noPwr = true; S.d.noPwr = true'); ok(a.$('noPwr()'), 'Modus ohne Wattmesser');
  const t = a.w.wkTgt({lo:88, hi:94, a:91, b:91, k:'work'}, 250, {t:'sst'}); ok(/^Puls \d+–\d+ · 88–94 % FTP$/.test(t), t);
  ok(/>LTHR</.test(a.w.wkSvg({t:'sst', m:71, lo:88, hi:94, iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}})), 'Achse mit Schwellenpuls');
  a.$('S.p.lthr = 0; S.d.lthr = 0'); ok(/^Empfinden \d–\d+\/10/.test(a.w.wkTgt({lo:88, hi:94}, 250, {t:'sst'})), 'ohne Schwellenpuls: Empfinden');
});

test('F24: Kraft und Mobilität als Zeitleiste der Übungen', async () => {
  const a = await boot(); makePlan(a, gDat({strN:2, mobN:2}));
  a.page('week'); const i = a.$('Object.keys(strMap).map(Number).find(k => strMap[k]) ?? -1'), j = a.$('Object.keys(mobMap).map(Number).find(k => mobMap[k]) ?? -1'); ok(i >= 0 || j >= 0, 'Kraft oder Mobilität im Plan');
  if (i >= 0) { const s = a.w.wkSeqSvg('str', i); ok(/wk-sx0/.test(s) && /wk-sp/.test(s) && /role="img"/.test(s), 'Übung · Pause · Übung'); ok(/Ablauf etwa \d+ Min\./.test(s)); }
  if (j >= 0) ok(/wk-sx/.test(a.w.wkSeqSvg('mob', j)), 'Mobilität');
  a.noErrors();
});

test('F24: eingebaut in Heute, Woche, Tagesdetail und „Andere Variante“; Woche ohne Ruckeln', async () => {
  const a = await boot({now:at(2026, 11, 16)}); makePlan(a, gDat());
  a.page(null); const home = a.$("document.getElementById('app').innerHTML"); ok(/id="fx-wk"[^>]*><div class="wk-box"/.test(home), 'Heute: große Grafik');
  const t0 = performance.now(); a.page('week'); const ms = performance.now() - t0, wk = a.$("document.getElementById('app').innerHTML");
  const rides = a.$('S.plan.filter(x => x.m > 0).length'); eq((wk.match(/class="wk wk-mini"/g) || []).length, rides, 'je Rad-Einheit ein Mini-Profil'); ok(ms < 600, `Woche in ${Math.round(ms)} ms`);
  const k = a.$("S.plan.findIndex(x => x.iv && x.m > 0)"); ok(k >= 0, 'Intervalltag');
  a.$(`open = ${k}; render()`); ok(/class="wk pchart"/.test(a.$("document.getElementById('app').innerHTML")), 'Tagesdetail: große Grafik');
  a.$(`vaOpen(${k})`); const md = a.$("document.getElementById('app').innerHTML"), n = a.$(`vaList(S.plan[${k}]).length`);
  if (n) eq((md.match(/class="wk wk-mini"/g) || []).length >= n + 1, true, 'Variante: geplantes Profil und je Vorschlag eins');
  a.noErrors();
});

test('F25: Höhenmeter mit verrauschten Daten, längster Anstieg', async () => {
  const a = await boot();
  /* 0–10 km flach 200 m, 10–14 km +100 m (2,5 %), 14–20 km flach, 20–28 km +320 m (4 %), danach 30 km bergab bis 200 m */
  const prof = km => km < 10 ? 200 : km < 14 ? 200 + (km - 10) * 25 : km < 20 ? 300 : km < 28 ? 300 + (km - 20) * 40 : Math.max(200, 620 - (km - 28) * 14);
  const r = gRide({sec:7200, v:8.3, prof, noise:2.5}), rec = a.w.trkMake(r), d = a.w.trkDec(rec), st = a.w.trkStats(d);
  let raw = 0; for (let i = 1; i < r.pts.length; i++) raw += Math.max(0, r.pts[i].a - r.pts[i - 1].a);
  near(st.up, 420, 25, `bergauf ${st.up} m (wahr 420)`); ok(raw > 4 * st.up, `ohne Glättung ${Math.round(raw)} m`);
  near(st.max, 620, 6); near(st.min, 200, 6);
  const L = st.longest; near(L.s, 20, .4, 'Anstieg bei km 20'); near(L.len, 8, .5, 'Länge'); near(L.g, 320, 15, 'Höhenmeter'); near(L.gr, 4, .3, 'Steigung'); ok(L.sec > 900 && L.w > 150, 'Zeit und Watt am Anstieg (für die Fahrtbewertung)');
  eq(st.climbs.length, 2, 'zwei Anstiege'); ok(rec.cl.length === 2 && rec.gd.length === 5, 'gespeichert');
});

test('F25: Ausdünnung der Spur (Punktzahl, Abweichung) und Größe einer 2-h-Fahrt', async () => {
  const a = await boot(), r = gRide({sec:7200, prof:km => 300 + 40 * Math.sin(km / 3), noise:1}), rec = a.w.trkMake(r), d = a.w.trkDec(rec);
  ok(d.n <= 800 && rec.st >= 50, `${d.n} Abschnitte à ${rec.st} m`); ok(d.line.length < 400, `${d.line.length} Punkte auf der Linie (von ${r.pts.length})`);
  const pr = a.$('trkProj')(d.line[0][0]), Q = d.line.map(pr); let mx = 0;
  r.pts.forEach((q, i) => { if (i % 20) return; const p = pr([q.lat, q.lon]); let best = 1e9; for (let k = 1; k < Q.length; k++) { const [ax, ay] = Q[k - 1], [bx, by] = Q[k], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2)) : 0, ex = ax + t * dx - p[0], ey = ay + t * dy - p[1]; best = Math.min(best, Math.hypot(ex, ey)); } mx = Math.max(mx, best); });
  ok(mx < 20, `größte Abweichung ${mx.toFixed(1)} m`);
  const kb = JSON.stringify(rec).length / 1024; ok(kb < 25, `Spur ${kb.toFixed(1)} KB`); R.trkKb = kb.toFixed(1);
});

test('F25: Fahrt ohne GPS (Rolle) und ohne Höhe: kein Streckenbereich, kein Fehler', async () => {
  const a = await boot(); makePlan(a, gDat());
  const r1 = a.w.trkMake(gRide({sec:3600, gps:false, alt:false})); ok(!r1 || !r1.n, 'keine Spur'); ok(r1 && r1.pw && r1.pw.b === 20, 'Leistung für die Ist-Linie bleibt');
  eq(a.w.trkBlock('x1', {in:1}), '', 'Rolle: Bereich ausgeblendet');
  const r2 = a.w.trkMake({...ride({sec:3600, gps:false, prof:km => 100 + km * 5}), pts:gRide({sec:3600, gps:false, prof:km => 100 + km * 5}).pts.map((q, i) => ({...q, d:i * 8}))}), d2 = a.w.trkDec(r2);
  ok(d2.alt && !d2.line, 'Höhe ohne GPS: nur Profil'); ok(!a.w.trkLineSvg('x', d2, true), 'keine Linie');
  a.noErrors();
});

test('F25: Start und Ziel ausblenden (500 m)', async () => {
  const a = await boot(), d = a.w.trkDec(a.w.trkMake(gRide({sec:3600}))), h = a.w.trkHide(d.line, 500), s = d.line[0], e = d.line[d.line.length - 1];
  ok(a.w.trkHav(s, h[0]) >= 500 && a.w.trkHav(e, h[h.length - 1]) >= 500, 'erster und letzter Punkt mindestens 500 m entfernt');
  ok(a.w.trkHav(s, h[0]) < 700, 'nicht mehr als nötig gekürzt');
  ok(a.$('trkHideOn()'), 'Standard: ausgeblendet');
  eq(a.w.trkHide(d.line.slice(0, 3), 500).length, 0, 'sehr kurze Spur: nichts zeigen');
});

test('F25: Logbuch-Detail mit Höhenprofil, Linie, Soll und Ist', async () => {
  const a = await boot({now:at(2026, 11, 16)}); makePlan(a, gDat());
  const r = gRide({sec:5400, prof:km => 200 + (km > 10 && km < 18 ? (km - 10) * 30 : km >= 18 ? 240 : 0), noise:1.5});
  a.w.__r = r; const id = a.$("(() => { const x = summarize(__r, 'test.fit'); S.man = [x]; return x.id; })()"); await a.tick(150);
  ok(a.$(`!!trkC['${id}'] && trkC['${id}'].n > 0`), 'Spur beim Einlesen berechnet');
  a.$(`delete trkC['${id}']`); a.$(`lbOpenRide('${id}')`); await a.tick(150); a.$('render()'); const t = a.text();
  ok(/Höhenprofil/i.test(t) && /Längster Anstieg/.test(t) && /Streckenlinie/i.test(t), 'aus IndexedDB geladen und gezeigt');
  ok(/Start und Ziel ausblenden/.test(t), 'Schalter Datenschutz'); ok(/Leistung nach Zonen/.test(t), 'ungeplante Fahrt: Ist-Leistung nach Zonen'); ok(!/laut Gerät/.test(t), "ohne Gerätewert eigene geglättete Höhenmeter");
  /* Soll und Ist für eine geplante Einheit */
  a.$(`S.lb = S.lb || {}; S.lb['${id}'] = {k:'p', day:'2026-11-16', n:'Sweet Spot', ftp:240, px:{t:'sst', m:71, lo:88, hi:94, iv:{reps:3, work:12, rest:5, lo:88, hi:94, wu:15, cd:10}}, msgs:[]}; render()`);
  const h = a.$("document.getElementById('app').innerHTML"); ok(/Ablauf: Soll und Ist/.test(h) && /class="wk-act"/.test(h), 'Soll-Blöcke mit Ist-Linie');
  a.$("trkSet('h')"); ok(/class="trk-ov"/.test(a.$("document.getElementById('app').innerHTML")), 'Puls über dem Profil');
  await a.en(); ok(/Elevation profile/i.test(a.text()), 'Englisch');
  a.noErrors();
});

test('F25: Sicherung v4 mit Streckendaten, ältere Formate laden weiter', async () => {
  const a = await boot(); makePlan(a, gDat()); a.w.__r = gRide({sec:3600});
  const id = a.$("(() => { const x = summarize(__r, 'test.fit'); S.man = [x]; save(); return x.id; })()"); await a.tick(150);
  await a.w.exportPlans(); await a.tick(30); const f = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await f.blob.text(), o = JSON.parse(txt);
  eq(o.v, 4); ok(o.trk && Object.keys(o.trk).length === 1, 'Spur in der Sicherung'); R.bkKb = (JSON.stringify(o.trk).length / 1024).toFixed(1);
  const p = a.w.bkParse(txt), rid = Object.keys(p.trk)[0]; eq(p.trk[rid].n, o.trk[Object.keys(o.trk)[0]].n, 'Spur übersteht die Prüfung');
  eq(p.state.man[0].id, rid, 'Fahrt-ID und Schlüssel der Spur bleiben zusammen');
  for (const v of [1, 2, 3]) { const old = {...o, v}; delete old.trk; ok(a.w.bkParse(JSON.stringify(old)).plans.length >= 0, 'Version ' + v); }
  /* ohne Streckendaten */
  a.$('S.bkTrk = false'); a.w.__downloads.length = 0; await a.w.exportPlans(); await a.tick(30); ok(!JSON.parse(await a.w.__downloads.find(x => /\.json$/.test(x.name)).blob.text()).trk, 'abschaltbar');
  /* neues Gerät: Spur wird beim Laden abgelegt */
  const b = await boot(); eq(await b.w.bkTrkIn(p), 1); ok((await b.$('trkGetDb')(rid)).n > 0, 'Spur auf dem neuen Gerät');
  a.noErrors();
});

test('Hinweise und Neuigkeiten zu F24/F25', async () => {
  const a = await boot({now:at(2026, 11, 16)}); makePlan(a, gDat());
  ok(a.$("DYK.some(d => d[0] === 'wkprof') && DYK.some(d => d[0] === 'route')"), 'zwei neue Hinweise');
  ok(a.$('WN_DATA[192].length') === 2 && a.$('APP_BUILD') > '20261114180000', 'Neuigkeiten-Fenster und neue Build-ID');
  a.$("dykGo('dykProf()')"); await a.tick(120); ok(a.f.contentDocument.getElementById('fx-wk'), 'Hinweis führt zur Grafik');
  a.$("dykGo('dykTrack()')"); await a.tick(120); a.noErrors();
});
