/* F27: VO2max (Formeln gegen Handrechnung, Gültigkeit, Auswahl, Kalibrierung, Trend, Testeinheiten, Sicherung, Anzeige) */
R.file = 'vo2max';
const v2Dat = d => ({goal:'event', eventName:'Testrennen', eventDate:'2027-06-20', ftp:290, hours:8, weight:85, sex:'m', hrMax:190, ...d});
/* Fahrt aus Abschnitten [Sekunden, Watt, Puls von, Puls bis]; {gap:s} = Lücke */
function v2Ride(parts, t0 = 1794470400){
  const pts = []; let t = t0;
  for (const q of parts) { if (q.gap) { t += q.gap; continue; } const [n, w, h0, h1] = q; for (let i = 0; i < n; i++) pts.push({t:t++, p:w, h:Math.round(h0 + (h1 - h0) * i / Math.max(1, n - 1)), d:null, a:null, lat:null, lon:null}); }
  pts.push({t, p:null, h:null, d:null, a:null, lat:null, lon:null}); return {pts, ses:[], name:'Test'};
}
/* Rampe ab 100 W, +20 W je Minute, k volle Stufen, dann s Sekunden der nächsten Stufe */
function v2Ramp(k, s, hTop = 186, t0){
  const parts = [[900, 150, 110, 125]]; for (let j = 0; j < k; j++) parts.push([60, 100 + 20 * j, 125 + (hTop - 125) * j / k, 125 + (hTop - 125) * (j + 1) / k]);
  if (s) parts.push([s, 100 + 20 * k, hTop, hTop]); parts.push([600, 100, 150, 110]); return v2Ride(parts, t0);
}
const v2E = (a, m, date, value, o) => a.$('vo2Add')(a.$('vo2Make')(m, date, value, {weight:85, p:o && o.p || null}, {id:'t' + m + date, src:o && o.src || (m === 'L' || m === 'G' ? 'manual' : 'test'), valid:!(o && o.inv)}));

test('F27: Formeln gegen Handrechnung (Sitko, Jurov, absolut)', async () => {
  const a = await boot(); makePlan(a, v2Dat());
  near(a.$('vo2Sitko')(369, 85), 55.1, .05, 'Sitko: 16,6 + 8,87 × 369/85 = 55,11');
  near(a.$('vo2Jurov')(400, 75, 'm'), 59.21, .001, 'Männer: 40 − 45 + 64,21'); near(a.$('vo2Jurov')(300, 60, 'f'), 53.22, .001, 'Frauen: 39 − 49,8 + 64,02'); near(a.$('vo2Jurov')(350, 70, ''), 56.28, .001, 'ohne Angabe: 42 − 45,5 + 59,78');
  near(a.$('vo2Abs')(55.1, 85), 4.6835, .0001, 'l/min = ml/kg/min × kg / 1000'); eq(a.$('vo2Jurov')(0, 70, 'm'), null);
  const rF = a.$('vo2Range')('F', 55.1), rFr = a.$('vo2Range')('F', 55.1, {ride:true}), rR = a.$('vo2Range')('R', 59.2, {wkg:5.3}), rRl = a.$('vo2Range')('R', 50, {wkg:4}), rG = a.$('vo2Range')('G', 62);
  near(rF.low, 51.3, .01, 'F unten −3,8'); near(rF.high, 72.3, .01, 'F oben +17,2 (Borszcz)'); near(rFr.high, 77.3, .01, 'aus Fahrt +5');
  near(rR.high - rR.low, 8, .01, 'R ±4'); near(rRl.high - rRl.low, 12, .01, 'R außerhalb der Studiengruppe ±6'); near(rG.low, 58.9, .01); near(rG.high, 68.2, .01, 'G über 60: +10 %');
  a.noErrors();
});

test('F27: Gewicht zum Testdatum aus dem Verlauf', async () => {
  const a = await boot(); makePlan(a, v2Dat()); a.$("S.wf = [{d:'2026-01-01', at:1, ftp:280, kg:90}, {d:'2026-09-01', at:2, ftp:290, kg:85}]");
  const e1 = a.$('vo2Make')('F', '2026-05-01', a.$('vo2Sitko')(369, 90), {p:369}), e2 = a.$('vo2Make')('F', '2026-10-01', a.$('vo2Sitko')(369, 85), {p:369});
  eq(e1.basis.weight, 90); eq(e2.basis.weight, 85); near(e1.abs, 52.97 * 90 / 1000, .01, 'absolut mit Gewicht am Testtag');
  a.noErrors();
});

test('F27: Gültigkeit Rampe und 5-min-Test (ausbelastet, Sprintstart, Pause, niedriger Puls)', async () => {
  const a = await boot(); makePlan(a, v2Dat());
  const ramp = a.$('vo2EvalRamp')(a.$('vo2Series')(v2Ramp(14, 30))); eq(ramp.po, 370, 'Pmax = 360 W + 20 W × 30/60'); eq(ramp.valid, true, 'ausbelastet: ' + ramp.note);
  const low = a.$('vo2EvalRamp')(a.$('vo2Series')(v2Ramp(14, 30, 160))); eq(low.valid, false); ok(/95 %/.test(low.note), 'Spitzenpuls unter 95 % HFmax');
  const f = v => a.$('vo2EvalFive')(a.$('vo2Series')(v));
  const ok5 = f(v2Ride([[900, 150, 110, 130], [300, 369, 150, 186], [600, 120, 150, 110]])); eq(ok5.p5, 369); eq(ok5.valid, true, ok5.note);
  const spr = f(v2Ride([[900, 150, 110, 130], [30, 600, 150, 160], [270, 340, 160, 186], [600, 120, 150, 110]])); eq(spr.valid, false); ok(/Sprintstart/.test(spr.note));
  const gap = f(v2Ride([[900, 150, 110, 130], [150, 369, 150, 170], {gap:30}, [150, 369, 170, 186], [600, 120, 150, 110]])); ok(!gap || gap.p5 < 369, 'Pause über 10 s: kein 5-min-Fenster über die Pause');
  const zer = f(v2Ride([[900, 150, 110, 130], [140, 380, 150, 170], [20, 0, 170, 170], [140, 380, 170, 186], [600, 120, 150, 110]])); eq(zer.valid, false, 'Unterbrechung mit 0 W'); ok(/Unterbrechung/.test(zer.note));
  const lhr = f(v2Ride([[900, 150, 110, 130], [300, 369, 140, 160], [600, 120, 150, 110]])); eq(lhr.valid, false, 'niedriger Puls');
  a.noErrors();
});

test('F27: Geplanter Test beim Einlesen, Rückfrage „Am Limit?“, Schätzung aus Fahrt', async () => {
  const a = await boot(); makePlan(a, v2Dat());
  const i = a.$('todayIdx()'), day = a.$(`dstr(${i})`), t0 = Math.round(Date.parse(day + 'T08:00:00') / 1000);
  a.$(`S.plan[${i}] = vo2Unit('R')`); a.w.__r = v2Ramp(14, 30, 186, t0); a.$("(() => { const x = summarize(__r, 'rampe.fit'); S.man = [x]; return x.id; })()");
  const e = a.$("S.vo2.find(x => x.method === 'R')"); ok(e, 'Eintrag Methode R'); eq(e.basis.p, 370); near(e.value, a.$('vo2Jurov')(370, 85, 'm'), .06, 'Jurov Männer mit 85 kg'); eq(e.valid, true);
  a.w.vo2Lim(e.id, 'n'); eq(a.$(`S.vo2.find(x => x.id === '${e.id}').valid`), false, '„Eher nicht“ nimmt den Wert aus dem Trend');
  /* Fahrt ohne Test: neuer 5-min-Bestwert mit hohem Puls → Schätzung aus Fahrt; mit niedrigem Puls → keine */
  const b = await boot(); makePlan(b, v2Dat());
  b.w.__r = v2Ride([[1800, 180, 110, 140], [300, 400, 160, 186], [1800, 170, 140, 130]], 1794470400 - 864e2 * 3); b.$("summarize(__r, 'hart.fit')");
  const fr = b.$("S.vo2.find(x => x.src === 'ride')"); ok(fr && fr.method === 'F', 'Schätzung aus Fahrt'); near(fr.value, 16.6 + 8.87 * 400 / 85, .06); ok(/nicht aus einem Test/.test(fr.note));
  b.w.__r = v2Ride([[1800, 180, 110, 130], [300, 420, 130, 150], [1800, 170, 140, 130]], 1794470400 - 864e2 * 2); b.$("summarize(__r, 'flach.fit')"); eq(b.$("S.vo2.filter(x => x.src === 'ride').length"), 1, 'niedriger Puls: keine Schätzung');
  b.w.__r = v2Ride([[2400, 150, 110, 120]], 1794470400 - 864e2); b.$("summarize(__r, 'ohne.fit')"); eq(b.$("S.vo2.length"), 1, 'kein neuer Bestwert: keine Schätzung');
  b.noErrors();
});

test('F27: Auswahl nach Priorität, Kalibrierung, Trend nur aus gültigen Werten', async () => {
  const a = await boot(); makePlan(a, v2Dat());
  v2E(a, 'L', '2026-07-01', 62); v2E(a, 'R', '2026-10-10', 58); v2E(a, 'G', '2026-11-01', 55); v2E(a, 'F', '2026-11-05', 52, {src:'ride'});
  eq(a.$('vo2Pick()').e.method, 'R', 'Labor älter als 12 Wochen → Rampe vor Garmin'); v2E(a, 'F', '2026-10-20', 54);
  eq(a.$('vo2Pick()').e.method, 'R', 'Rampe vor 5-min-Test'); v2E(a, 'L', '2026-10-25', 61); eq(a.$('vo2Pick()').e.method, 'L', 'Labor zuerst');
  /* Kalibrierung: Labor 25.10. (61) und Rampe 10.10. liegen 15 Tage auseinander → keine; Rampe am 20.10. → Versatz +2 */
  eq(a.$("vo2Cal('R')"), null, 'außerhalb ±14 Tage keine Kalibrierung');
  v2E(a, 'R', '2026-10-20', 59); const c = a.$("vo2Cal('R')"); near(c.off, 2, .001); v2E(a, 'R', '2026-11-08', 59.5);
  near(a.$("vo2Adj(S.vo2.find(x => x.date === '2026-11-08'))").v, 61.5, .001, 'spätere Rampe +2'); a.w.vo2CalTog(); near(a.$("vo2Adj(S.vo2.find(x => x.date === '2026-11-08'))").v, 59.5, .001, 'abgeschaltet: Rohwert'); a.w.vo2CalTog();
  /* Verfall nach 12 Monaten */
  const b = await boot(); makePlan(b, v2Dat()); v2E(b, 'L', '2025-10-01', 60); v2E(b, 'R', '2025-10-05', 57); v2E(b, 'R', '2026-11-01', 58);
  near(b.$("vo2Adj(S.vo2.find(x => x.date === '2026-11-01'))").v, 58, .001, 'nach 12 Monaten nicht mehr angewendet'); ok(b.$("vo2Adj(S.vo2.find(x => x.date === '2026-11-01'))").exp, 'als abgelaufen erkannt');
  /* Trend nur aus gültigen Werten */
  const t = await boot(); makePlan(t, v2Dat()); v2E(t, 'R', '2026-10-01', 55); v2E(t, 'R', '2026-10-15', 40, {inv:true}); v2E(t, 'R', '2026-11-01', 57);
  const tr = t.$("vo2TrendAt('R', '2026-11-11')"); ok(tr > 55 && tr < 57, 'Trend zwischen 55 und 57, ohne den ungültigen Wert: ' + tr);
  t.noErrors();
});

test('F27: Testeinheiten, Einplanen mit Schnappschuss, Grafik und Export', async () => {
  const a = await boot(); makePlan(a, v2Dat());
  const u = a.$("vo2Unit('R')"); eq(u.ramp.s, 100); eq(u.ramp.inc, 20); eq(u.vo2t, 'R'); ok(/jede Minute \+20 W/.test(u.st));
  const bl = a.$('wkBlocks')(u); ok(bl.filter(b => b.k === 'test').length >= 10, 'Rampenstufen in der Grafik'); ok(bl.filter(b => b.k === 'test').every((b, k, A) => !k || b.a > A[k - 1].a), 'Stufen steigen');
  const fs = a.w.fitSteps(a.$('S.p'), u); eq(fs[1].lo, 100 - 5 + 1000, 'erste Stufe 100 W absolut'); eq(fs[2].lo, 120 - 5 + 1000);
  ok(/<SteadyState Duration="60"/.test(a.w.zwoXml(a.$('S.p'), u, null, 'Rampe')), 'Zwift: Minutenstufen');
  ok(/<FreeRide Duration="300"/.test(a.w.zwoXml(a.$('S.p'), a.$("vo2Unit('F')"), null, '5 min')), 'Zwift: 5 min frei');
  a.w.vo2PlanTest('R'); const j = a.$("S.plan.findIndex(x => x && x.vo2t === 'R')"); ok(j > a.$('todayIdx()'), 'ab morgen eingeplant'); ok(a.$("S.plan[" + j + "].orig"), 'ursprüngliche Einheit gemerkt');
  ok(a.$('bkUndo') && /VO2max/.test(a.$('bkUndo.why')), 'Schnappschuss vorher'); a.$("navGo('week')"); await a.tick(40); ok(/VO2max-Check: Rampe/.test(a.text()), 'im Wochenplan');
  a.noErrors();
});

test('F27: Garmin-Wert fehlt / vorhanden, Laborwert-Eingabe, Sicherung', async () => {
  const a = await boot(); makePlan(a, v2Dat());
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); ok(/Noch kein Wert/.test(a.text()), 'ohne Werte: Hinweis'); ok(/VO2max-Test einplanen/.test(a.text()), 'Test vorschlagen');
  a.w.vo2FormOpen('G'); await a.tick(40); a.$("document.getElementById('v2Val').value = '52'; document.getElementById('v2Date').value = '2026-11-01'"); a.w.vo2Save(); await a.tick(30);
  const g = a.$("S.vo2[0]"); eq(g.method, 'G'); near(g.range.low, 49.4, .01); ok(/Garmin/.test(a.text()), 'Garmin-Wert angezeigt');
  a.w.vo2FormOpen('L'); await a.tick(30); a.$("document.getElementById('v2Val').value = '4,9'; document.getElementById('v2Unit').value = 'abs'; document.getElementById('v2Date').value = '2026-11-03'"); a.w.vo2Save(); await a.tick(30);
  const l = a.$("S.vo2.find(x => x.method === 'L')"); near(l.value, 4.9 * 1000 / 85, .06, 'l/min umgerechnet'); ok(/Laborwert/.test(a.text()));
  a.w.vo2FormOpen('L'); await a.tick(30); a.$("document.getElementById('v2Val').value = '120'"); a.w.vo2Save(); await a.tick(20); ok(/außerhalb/.test(a.text()), 'unplausibler Wert abgelehnt');
  /* Sicherung */
  await a.w.exportPlans(); await a.tick(30); const f = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await f.blob.text(), o = JSON.parse(txt), st = typeof o.state === 'string' ? JSON.parse(o.state) : o.state;
  eq(st.vo2.length, 2, 'Werte in der Sicherung'); const p = a.w.bkParse(txt); eq(p.state.vo2[0].basis.weight, 85, 'übersteht die Prüfung');
  for (const v of [1, 2, 3]) { const old = {...o, v}; delete old.trk; const s0 = typeof o.state === 'string' ? JSON.parse(o.state) : {...o.state}; delete s0.vo2; old.state = typeof o.state === 'string' ? JSON.stringify(s0) : s0; ok(a.w.bkParse(JSON.stringify(old)), 'Version ' + v); }
  a.noErrors();
});

test('F27: Seite mit Verlauf, Einordnung, Trainer-Hinweis, Englisch, Hinweise', async () => {
  const a = await boot(); makePlan(a, v2Dat({birthDate:'1986-04-02'}));
  v2E(a, 'L', '2026-06-01', 58); v2E(a, 'R', '2026-06-08', 56, {p:380}); v2E(a, 'G', '2026-08-01', 54); v2E(a, 'F', '2026-09-15', 52, {p:369}); v2E(a, 'R', '2026-10-20', 57.5, {p:385}); v2E(a, 'F', '2026-11-02', 50, {src:'ride'});
  a.$("mmPut('u', {v:MM_D.map(t => t === 300 ? 369 : 0), o:null, s:'f'}, {day:'2026-11-01', n:'Test'})");
  a.$("navGo('state')"); await a.tick(30); ok(/VO2max/.test(a.text()), 'Zeile unter Fortschritt');
  a.$("goPg('svo2')"); await a.tick(40); const h = a.$("document.getElementById('app').innerHTML"), t = a.text();
  ok(/class="v2-L"/.test(h) && /class="v2-R"/.test(h) && /class="v2-G"/.test(h) && /class="v2-FR"/.test(h), 'Formen je Methode'); ok(/class="v2-eb"/.test(h), 'Spannen als Fehlerbalken'); ok(/class="v2-tr v2-R"/.test(h), 'Trendlinie');
  ok(/Median gleichaltriger Männer/.test(t), 'Einordnung nach Alter und Geschlecht'); ok(/kalibriert am/.test(t), 'Rampe kalibriert mit Laborwert vom 01.06.'); ok(/FTP 290 W = 79 %/.test(t), 'Ausschöpfung FTP/5-min');
  a.w.vo2Set('unit', 'abs'); await a.tick(20); ok(/l\/min/.test(a.text()));
  await a.en(); a.$("navGo('state'); goPg('svo2')"); await a.tick(30); ok(/Your VO2max|History/.test(a.text()), 'Englisch');
  const d = a.$("DYK.find(x => x[0] === 'vo2')"); ok(d && d[2] === 'VO2max ansehen'); a.w.dykGo(d[3]); await a.tick(200); eq(a.$('pg'), 'svo2'); ok(a.$("!!document.querySelector('#fx-v2')"));
  ok(a.$("WN_DATA['194'].length") === 1 && a.$('APP_VERSION') >= 194 && a.$('APP_BUILD') === '20261117090000');
  a.noErrors();
});
