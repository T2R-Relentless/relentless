/* F26: Leistungsprofil (Mean-Max je Fahrt, Zeiträume, W/kg, Stufen, Fahrertyp, FTP-Schätzung, Sicherung, Anzeige) */
R.file = 'leistungsprofil';
const lpDat = d => ({goal:'event', eventName:'Testrennen', eventDate:'2027-06-20', ftp:305, hours:8, weight:75, ...d});
/* Fahrt aus Abschnitten [Sekunden, Watt] mit 1 Hz; {gap:s} = Aufzeichnungslücke, Watt null = keine Leistung */
function lpRide(parts, t0 = 1794470400){
  const pts = []; let t = t0;
  for (const q of parts) { if (q.gap) { t += q.gap; continue; } const [n, w] = q; for (let i = 0; i < n; i++) pts.push({t:t++, p:w, h:150, d:null, a:null, lat:null, lon:null}); }
  pts.push({t, p:null, h:150, d:null, a:null, lat:null, lon:null});
  return {pts, ses:[], name:'Test'};
}
const LP_U = {15:796, 30:669, 60:557, 120:425, 180:401, 300:369, 600:328, 900:316, 1200:303, 1800:286, 2700:276, 3600:266};
/* Datensatz direkt anlegen: Werte {Dauer:Watt} */
const lpPut = (a, id, day, vals, extra) => a.$('mmPut')(id, {v:a.$('MM_D').map(t => vals[t] || 0), o:null, s:'f', ...(extra || {})}, {day, n:'Fahrt ' + id});
const lpIx = (a, t) => a.$('MM_D').indexOf(t);

test('F26: Mean-Max mit Konstante, Intervallen, Pause und Lücke (von Hand gerechnet)', async () => {
  const a = await boot(); makePlan(a, lpDat());
  const mc = r => a.$('mmCalc')(r), at = (rec, t) => rec.v[lpIx(a, t)];
  const c = mc(lpRide([[3600, 200]])); eq([5, 60, 1200, 3600].map(t => at(c, t)), [200, 200, 200, 200], 'Konstante'); eq(at(c, 5400), 0, 'zu kurz für 90 min');
  const iv = []; for (let k = 0; k < 5; k++) iv.push([60, 400], [60, 100]); const i5 = mc(lpRide([[600, 150], ...iv, [600, 150]]));
  eq([at(i5, 5), at(i5, 30), at(i5, 60), at(i5, 120)], [400, 400, 400, 275], '5×1 min 400 W / 1 min 100 W: bestes 2-min-Fenster = 1 min 150 W davor + erste Minute 400 W');
  eq(i5.o[lpIx(a, 60)], 600, 'Zeitpunkt des besten 1-min-Fensters: nach 600 s');
  /* Pause über 10 s: zwei Abschnitte, das 10-min-Fenster überbrückt sie nicht */
  const ps = mc(lpRide([[300, 300], {gap:60}, [300, 300]])); eq(at(ps, 300), 300, '5 min innerhalb eines Abschnitts'); eq(at(ps, 600), 0, '10 min über die Pause zählt nicht');
  /* Lücke bis 10 s: mit dem letzten Wert gefüllt */
  const gp = mc(lpRide([[300, 300], {gap:8}, [300, 300]])); ok(at(gp, 600) >= 299, 'kurze Lücke gefüllt: 10 min ≈ 300 W, war ' + at(gp, 600));
  /* fehlende Leistung mitten in der Fahrt zählt als 0 W. Wie beim Einlesen (summarize) nimmt die letzte Sekunde vor einem
     Messwert dessen Wert an: 600 s, davon 59 s ohne Wert → 541 × 300 / 600 = 270,5 → 271 */
  const nl = mc(lpRide([[270, 300], [60, null], [270, 300]])); eq(at(nl, 600), 271, 'Aussetzer drückt den Wert');
  /* Nullen beim Rollen bleiben */
  const z = mc(lpRide([[60, 300], [60, 0], [60, 300]])); eq(at(z, 120), 150, 'Rollen mit 0 W zählt');
  /* Laufzeit: 5 h in 1 Hz */
  const big = lpRide([[18000, 220]]), t0 = performance.now(); mc(big); const ms = performance.now() - t0; R.mm5h = Math.round(ms); ok(ms < 400, '5-h-Fahrt in ' + Math.round(ms) + ' ms');
  a.noErrors();
});

test('F26: Ausreißer über 2000 W und unplausibler 5-s-Wert', async () => {
  const a = await boot(); makePlan(a, lpDat());
  const sp = a.$('mmCalc')(lpRide([[600, 200], [6, 2600], [600, 200]])); eq(sp.q, 's', 'markiert'); ok(sp.v[0] <= 200, '5-s-Wert ohne Ausreißer: ' + sp.v[0]);
  const rr = a.$('mmCalc')(lpRide([[600, 200], [5, 1200], [600, 200]])); eq(rr.q, 'r', '5 s > 2,2 × 1 min und > 1,5 × 15 s');
  const sprint = a.$('mmCalc')(lpRide([[600, 200], [15, 1000], [600, 200]])); ok(!sprint.q, 'echter 15-s-Sprint bleibt unmarkiert');
  a.$('mmPut')('r1', rr, {day:'2026-11-10', n:'Ausschlag'});
  eq(a.$('mmBest')('2026-01-01', '2026-12-31')[0], null, '5 s zählt nicht'); ok(a.$('mmBest')('2026-01-01', '2026-12-31')[3].w > 0, '1 min zählt');
  a.w.mmMark('r1', 'ok'); eq(a.$('mmBest')('2026-01-01', '2026-12-31')[0].w, 1200, 'nach Bestätigung zählt 5 s');
  a.w.mmMark('r1', 'x'); ok(a.$('mmBest')('2026-01-01', '2026-12-31').every(b => !b), 'ganze Fahrt ausgeschlossen');
  a.noErrors();
});

test('F26: Zeiträume 8 Wochen, Saison, Allzeit, eigener Zeitraum mit Grenztagen', async () => {
  const a = await boot(); makePlan(a, lpDat());
  eq(a.$('mmRange')('8w'), ['2026-09-17', '2026-11-11'], '56 Tage einschließlich heute (Uhr steht auf 11.11.2026)');
  lpPut(a, 'a', '2026-09-17', {300:300}); lpPut(a, 'b', '2026-09-16', {300:310}); lpPut(a, 'c', '2026-01-01', {300:320}); lpPut(a, 'd', '2025-12-31', {300:330});
  const w5 = k => { const b = a.$('mmBest')(...a.$('mmRange')(k))[lpIx(a, 300)]; return b && b.w; };
  eq(w5('8w'), 300, 'erster Tag gehört dazu, der Tag davor nicht'); eq(w5('season'), 320, 'Saison ab 1. Januar'); eq(w5('all'), 330, 'Allzeit');
  a.$("mmCf = '2026-09-16'; mmCt = '2026-09-17'"); eq(w5('custom'), 310, 'eigener Zeitraum mit beiden Grenztagen');
  a.$("mmCf = '2026-12-01'; mmCt = '2026-01-01'"); eq(w5('custom'), 320, 'vertauschte Daten werden sortiert');
  /* Stand vor 8 Wochen: 8 Wochen davor */
  lpPut(a, 'e', '2026-07-24', {300:280}); eq(a.$('mmBefore')('8w')[lpIx(a, 300)].w, 310, 'Vergleich 24.07.–16.09.');
  a.noErrors();
});

test('F26: W/kg mit Gewichtsverlauf', async () => {
  const a = await boot(); makePlan(a, lpDat());
  a.$("S.wf = [{d:'2026-01-01', at:1, ftp:280, kg:80}, {d:'2026-06-01', at:2, ftp:300, kg:75}]");
  eq(a.$('mmKgAt')('2026-03-01'), 80); eq(a.$('mmKgAt')('2026-07-01'), 75); eq(a.$('mmKgAt')('2025-05-01'), 80, 'vor dem ersten Eintrag: erstes Gewicht');
  lpPut(a, 'm', '2026-03-01', {300:400}); lpPut(a, 'j', '2026-07-01', {300:390});
  const B = a.$('mmBest')('2026-01-01', '2026-12-31'), b = B[lpIx(a, 300)]; eq(b.id, 'm', 'Watt: März höher');
  near(a.$('mmVal')(b, 'kg'), 5, .001, '400 W / 80 kg'); near(a.$('mmVal')(B[lpIx(a, 300)], 'w'), 400, 0);
  a.noErrors();
});

test('F26: FTP-Schätzung mit den Nutzerwerten und Vorschlagslogik', async () => {
  const a = await boot(); makePlan(a, lpDat()); lpPut(a, 'u', '2026-10-12', LP_U);
  const est = a.$('mmFtpEst')(); eq(est.mode, 'cp'); near(est.v, 286, 1, 'Critical Power aus 3–20 min'); eq(est.v20, 288, '95 % von 303 W');
  near(est.cp.wp / 1000, 23.7, .1, 'W′'); ok(est.lo <= 286 && est.hi >= 288, 'Spanne umfasst beide Methoden');
  R.mmFtp = est.v + ' W (CP), Gegenprobe ' + est.v20 + ' W';
  const sug = f => a.$('mmFtpSug')(est, f).k;
  eq(sug(305), 'test', '−6 %, keine Maximalwerte → Test statt Absenkung'); eq(sug(290), 'ok', 'innerhalb 3 %'); eq(sug(270), 'up', '+6 % → übernehmen anbieten');
  a.$("S.allOut = {u:1}"); eq(a.$('mmFtpSug')(a.$('mmFtpEst')(), 305).k, 'down', 'mit Vollgas-Beleg ist Absenkung möglich');
  /* Übernehmen: Schnappschuss, neue FTP, Rückgängig verfügbar */
  a.w.mmFtpTake(est.v); eq(a.$('S.p.ftp'), est.v); ok(a.$('bkUndo') && /FTP/.test(a.$('bkUndo.why')), 'Schnappschuss vor der Änderung');
  /* ohne 15/20-min-Wert kein CP */
  const b = await boot(); makePlan(b, lpDat()); lpPut(b, 'v', '2026-10-12', {180:400, 300:370, 600:330}); eq(b.$('mmFtpEst')(), null, 'ohne 20 min keine Schätzung');
  a.noErrors();
});

test('F26: Fahrertyp für typische Profile und die Nutzerwerte', async () => {
  const a = await boot(); makePlan(a, lpDat({sex:'m'}));
  const typ = (vals, kg = 75) => { const B = a.$('MM_D').map(t => vals[t] ? {w:vals[t], kg, id:'x', d:'2026-11-01'} : null); const C = a.$('mmCats')(B, 'm'); return [a.$('mmType')(C, kg), C]; };
  const T = (o, kg) => (typ(o, kg)[0] || {}).k;
  eq(T({5:1500, 60:700, 300:330, 1200:290, 3600:265}), 'Sprinter');
  eq(T({5:950, 60:640, 300:420, 1200:300, 3600:270}), 'Puncheur');
  eq(T({5:900, 60:480, 300:370, 1200:350, 3600:335}, 78), 'Zeitfahrer');
  eq(T({5:700, 60:380, 300:300, 1200:280, 3600:265}, 58), 'Kletterer');
  eq(T({5:1340, 60:705, 300:345, 1200:296, 3600:281}), 'Allrounder');
  const [u, C] = typ({...LP_U}); R.mmType = u ? u.txt : '–'; R.mmCats = Object.entries(C).map(([k, x]) => k + ' ' + (x ? x.lv : '–')).join(', ');
  ok(u && /Potenzial|ausgeglichen/.test(u.txt), 'Satz zum Fahrertyp: ' + (u && u.txt));
  eq(C.spr.note.length > 0, true, 'Sprint aus 15 s geschätzt (5 s fehlt)');
  a.noErrors();
});

test('F26: Fahrt ohne Leistungsmesser, Einlesen, neue Bestwerte, Teilprofil', async () => {
  const a = await boot(); makePlan(a, lpDat());
  a.w.__r = gRide({sec:3600, pow:false}); const id0 = a.$("(() => { const x = summarize(__r, 'ohne.fit'); return x.id; })()"); ok(!a.$(`S.mm && S.mm['${id0}']`), 'keine Bestwerte ohne Leistung');
  a.w.__r = gRide({sec:3600}); const id1 = a.$("(() => { const x = summarize(__r, 'mit.fit'); S.man = [x]; return x.id; })()"); ok(a.$(`S.mm['${id1}'].v[3]`) > 0, 'Bestwerte beim Einlesen');
  eq(a.$('mmPr')(id1), [], 'erste Fahrt: noch kein Vergleich');
  lpPut(a, 'alt', '2026-10-01', {60:150, 300:150}); const pr = a.$('mmPr')(id1); ok(pr.length >= 2 && pr.some(p => p.t === 300), 'neue Bestwerte gegenüber früheren Fahrten');
  /* Bewertungs-Abzeichen nimmt die Dauern aus dem Leistungsprofil */
  ok(/Neue Bestleistung|neue Bestleistungen/.test(a.w.vzPrBadge({rid:id1})), 'in der Fahrtbewertung');
  /* Teilprofil aus alten Fahrten im Archiv */
  a.$("S.arch = [{id:'old1', d:'2026-05-01', n:'Alt', m1:500, m5:350, m20:290, m60:270, gid:'123'}]; mmSeeded = false"); a.$('mmAll()');
  eq(a.$("S.mm.old1.s"), 'a'); eq(a.$("S.mm.old1.v[MM_D.indexOf(300)]"), 350);
  a.$("S.gm = {mode:'web'}"); eq(a.$('mmTodo()').map(x => x.id), ['old1'], 'Garmin-Fahrt zum Nachberechnen');
  a.noErrors();
});

test('F26: Sicherung enthält Bestwerte, ältere Formate laden weiter', async () => {
  const a = await boot(); makePlan(a, lpDat()); lpPut(a, 'u', '2026-10-12', LP_U); a.$("S.mm.u.x = 1; save()");
  await a.w.exportPlans(); await a.tick(30); const f = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await f.blob.text(), o = JSON.parse(txt);
  const st = typeof o.state === 'string' ? JSON.parse(o.state) : o.state; ok(st.mm && st.mm.u && st.mm.u.v.length === 16, 'Bestwerte im Zustand der Sicherung');
  const p = a.w.bkParse(txt); eq(p.state.mm.u.v[a.$('MM_D').indexOf(1200)], 303, 'übersteht die Prüfung'); eq(p.state.mm.u.x, 1, 'Ausschluss bleibt');
  R.mmKb = (JSON.stringify(st.mm.u).length) + ' Byte je Fahrt';
  for (const v of [1, 2, 3]) { const old = {...o, v}; delete old.trk; const s0 = typeof old.state === 'string' ? JSON.parse(old.state) : {...old.state}; delete s0.mm; old.state = typeof o.state === 'string' ? JSON.stringify(s0) : s0; ok(a.w.bkParse(JSON.stringify(old)), 'Version ' + v + ' ohne Bestwerte'); }
  a.noErrors();
});

test('F26: Seiten, Antippen, Kurve, W/kg, Logbuch, Englisch', async () => {
  const a = await boot(); makePlan(a, lpDat({sex:'m'}));
  lpPut(a, 'u', '2026-10-12', LP_U); lpPut(a, 'o', '2026-03-02', {...LP_U, 300:380, 1200:310});
  a.$("navGo('state')"); await a.tick(40); ok(/Leistungsprofil/.test(a.text()), 'Zeile und Karte unter Fortschritt'); ok(/mm-mini/.test(a.$("document.getElementById('app').innerHTML")), 'kompaktes Netz');
  a.$("goPg('sprof')"); await a.tick(40); let h = a.$("document.getElementById('app').innerHTML"), t = a.text();
  ok(/class="mm-pa"/.test(h) && /class="mm-p8"/.test(h), 'zwei Flächen'); ok((h.match(/class="mm-hit"/g) || []).length === 12, '12 Achsen zum Antippen');
  ok(/796 W/.test(t) && /266 W/.test(t), 'Werte außen'); ok(/Stufe \d\/6/.test(t), 'Kategorien mit Stufe'); ok(/Sweet Spot/.test(t), 'Trainingshinweis');
  ok(/FTP aus dem Leistungsprofil/.test(t) && /Test einplanen/.test(t), 'FTP-Karte mit Test statt Absenkung');
  ok(/role="img" aria-label="Leistungsprofil letzte 8 wochen: 15 Sekunden 796 Watt/.test(h), 'VoiceOver-Text');
  a.w.mmPick(8); await a.tick(20); t = a.text(); ok(/20 min: 303 W/.test(t) && /12\.10\.2026/.test(t), 'Achse angetippt: Wert und Datum');
  ok(/−7 W \(−2 %\) gegenüber vor 8 Wochen|Vor 8 Wochen gab es noch keinen Wert/.test(t), 'Veränderung: ' + (t.match(/[^\n]*vor 8 Wochen[^\n]*/) || [''])[0]);
  a.w.mmSet('unit', 'kg'); await a.tick(20); ok(/10,6/.test(a.text()), '15 s in W/kg (796/75)');
  a.w.mmSet('view', 'cv'); await a.tick(20); h = a.$("document.getElementById('app').innerHTML"); ok(/class="mm-cv"/.test(h) && /class="mm-ftp"/.test(h), 'Kurve mit FTP-Linie');
  a.w.mmSet('per', 'all'); a.w.mmSet('view', 'net'); a.w.mmSet('unit', 'w'); await a.tick(20); ok(!/class="mm-p8"/.test(a.$("document.getElementById('app').innerHTML")), 'Allzeit: eine Fläche');
  /* Logbuch */
  a.$("S.arch = [{id:'u', d:'2026-10-12', n:'Anstieg', km:40, sec:7200}]"); a.$("lbOpenRide('u')"); await a.tick(40); t = a.text();
  ok(/Bestwerte dieser Fahrt/i.test(t) && /Aus den Bestwerten nehmen/.test(t), 'Bestwerte im Logbuch');
  await a.en(); a.$("navGo('state'); goPg('sprof')"); await a.tick(30); ok(/Power profile|Strengths and training tips/.test(a.text()), 'Englisch');
  a.noErrors();
  /* Dauer ohne Wert: graue Achse */
  const b = await boot(); makePlan(b, lpDat()); lpPut(b, 'k', '2026-11-01', {15:700, 60:500, 300:350, 1200:290}); b.$("navGo('state'); goPg('sprof')"); await b.tick(30);
  ok(/mm-ax mm-na/.test(b.$("document.getElementById('app').innerHTML")) && /Ohne Wert in diesem Zeitraum/.test(b.text()), 'fehlende Dauern grau mit Hinweis');
  b.noErrors();
});

test('Hinweise und Neuigkeiten zu F26', async () => {
  const a = await boot(); makePlan(a, lpDat()); lpPut(a, 'u', '2026-10-12', LP_U);
  const d = a.$("DYK.find(x => x[0] === 'mmprof')"); ok(d && d[2] === 'Leistungsprofil ansehen', 'DYK-Eintrag');
  a.w.dykGo(d[3]); await a.tick(200); ok(a.$("pg") === 'sprof', 'Knopf öffnet die Seite'); ok(a.$("!!document.querySelector('#fx-mm')"), 'Anker vorhanden');
  ok(a.$("WN_DATA['193'].length") === 2, 'Neuigkeiten 193'); ok(a.$("APP_VERSION") >= 193, 'Version 193 oder später');
  /* neuer Bestwert als Vergleichssatz */
  lpPut(a, 'n', '2026-11-09', {...LP_U, 300:380}); ok(a.$("mmDyk()").some(f => f.id === 'cmp-mmpr' && /5 min: 380 W/.test(f.de)), 'neuer Bestwert in „Wusstest du schon?“');
  a.noErrors();
});
