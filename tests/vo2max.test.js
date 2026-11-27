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
  ok(a.$("WN_DATA['194'].length") === 1 && a.$('APP_VERSION') >= 194 && a.$('APP_BUILD') >= '20261117090000');
  a.noErrors();
});

/* ---------- Rampentest am geplanten Fitness-Check erkennen (rmpDetect, exeRampOk, exeTest, analyze, testBox) ---------- */
/* Rampe: wu s Einfahren mit 150 W, k Stufen zu 60 s ab 100 W (+20 W), s Sekunden der nächsten Stufe, cd s Ausfahren; hTop null = ohne Puls */
function rmpRide(wu, k, s, cd, hTop, t0){
  const H = h => hTop == null ? null : h, parts = [[wu, 150, H(110), H(125)]];
  for (let j = 0; j < k; j++) parts.push([60, 100 + 20 * j, H(125 + (hTop - 125) * j / k), H(125 + (hTop - 125) * (j + 1) / k)]);
  if (s) parts.push([s, 100 + 20 * k, H(hTop), H(hTop)]); parts.push([cd, 100, H(150), H(110)]); return v2Ride(parts, t0);
}
/* Plan mit Fitness-Check heute; Fahrt einlesen und wie beim Hochladen zur Einheit bewerten */
async function rmpSetup(d){
  const a = await boot(); makePlan(a, v2Dat(d)); const i = a.$('todayIdx()'), day = a.$(`dstr(${i})`), t0 = Math.round(Date.parse(day + 'T08:00:00') / 1000);
  a.$(`S.plan[${i}] = TESTX0(); S.done = {}; save()`); return {a, i, t0};
}
const rmpUp = (a, i, r, nm = 'fahrt.fit') => { a.w.__r = r; return a.$(`(() => { const x = summarize(__r, '${nm}'); S.man = [x]; exeStore(${i}, x, streamOf(__r), hrHist(__r)); save(); return {a:x, e:S.p.exe[S.wk + '-' + ${i}]}; })()`); };
const rmpFtp = v => Math.round(v * .75 / 5) * 5;
/* testBox in die Seite legen (für das Eingabefeld und saveTest) */
const rmpBox = (a, i) => a.$(`(() => { const h = testBox(S.wk, ${i}, true); let b = document.getElementById('rmpbx'); if (!b) { b = document.createElement('div'); b.id = 'rmpbx'; document.body.appendChild(b); } b.innerHTML = h; return h; })()`);
const rmpVal = a => a.$("(() => { const el = document.querySelector('#rmpbx input[id^=tv]'); return el ? el.value : null; })()");

test('Rampentest am Fitness-Check: lange Rampe (15 Min. Einfahren, über 25 Min.) erkannt, Urteil, erledigt, Vorbelegung, Auswerten', async () => {
  const {a, i, t0} = await rmpSetup();
  /* 15 Min. Einfahren, Stufen 100 bis 360 W, 30 s bei 380 W, 5 Min. Ausfahren: 34,5 Min., beste Minute 370 W */
  const {a:x, e} = rmpUp(a, i, rmpRide(900, 14, 30, 300, 186, t0), 'rampe.fit');
  ok(Math.round(x.sec / 60) > 25, 'Fahrt länger als 25 Min.');
  near(x.rmp, 370, 3, 'a.rmp ≈ beste Minute'); near(x.rmp, x.m1, 3, 'rmp entspricht der besten Minute'); eq(x.rmpH, 1, 'Puls 186 von 190: Ausbelastung bestätigt');
  ok(e.verdict !== 'wrong', 'Rampe am Testtag ist kein falsches Training: ' + e.verdict + ' · ' + e.msgs.join(' | ')); eq(e.rmpT, 1, 'als Rampentest bewertet');
  ok(e.msgs.some(m => m.includes(`Als Rampentest erkannt: beste Minute ${x.rmp} W`) && m.includes(`FTP von etwa ${rmpFtp(x.rmp)} W`)), 'Meldung mit FTP ≈ 0,75 × beste Minute: ' + e.msgs.join(' | '));
  ok(e.score >= 85, 'Dauer und Test passen: ' + e.score); eq(a.$(`S.done[${i}]`), true, 'Einheit erledigt');
  a.$('S.done = {}; analyze()'); eq(a.$(`S.done[${i}]`), true, 'auch die Wochenauswertung hakt den Test ab');
  /* Fitness-Check-Kasten: Rampentest vorgewählt, beste Minute im Feld; Auswerten ergibt FTP 0,75 × beste Minute */
  const h = rmpBox(a, i); eq(a.$('testKind'), 'ramp', 'Rampentest vorgewählt'); ok(/Beste Minute im Rampentest/.test(h), 'Feld für die beste Minute'); eq(rmpVal(a), String(x.rmp), 'beste Minute vorbelegt');
  ok(h.includes(`Rampe erkannt, beste Minute ${x.rmp} W.`), 'Hinweis im Kasten');
  a.w.saveTest(a.$('S.wk'), i); const res = a.$('S.p.res[S.wk]'); eq(res.kind, 'ramp'); eq(res.val, x.rmp); near(res.ftp, rmpFtp(x.rmp), 3, 'FTP aus dem Rampentest');
  /* Anzeige der Bewertung */
  a.$(`exeShow = S.wk + '-' + ${i}; render()`); await a.tick(30); const t = a.text(); ok(/Als Rampentest erkannt/.test(t), 'Meldung im Fenster'); ok(/Rampentest/.test(t) && !/Test am Stück\s*nein/.test(t), 'Zeile Testart statt „nicht am Stück“');
  a.noErrors();
});

test('Rampentest am Fitness-Check: kurze Rampe (unter 25 Min.) zählt, obwohl kürzer als die 60 geplanten Minuten', async () => {
  const {a, i, t0} = await rmpSetup();
  /* 5 Min. Einfahren, Stufen 100 bis 320 W, 30 s bei 340 W, 3 Min. Ausfahren: 20,5 Min., beste Minute 330 W */
  const {a:x, e} = rmpUp(a, i, rmpRide(300, 12, 30, 180, 186, t0), 'kurz.fit');
  ok(Math.round(x.sec / 60) < 25 && Math.round(x.sec / 60) >= 15, 'zwischen 15 und 25 Min.: ' + Math.round(x.sec / 60));
  near(x.rmp, 330, 3, 'a.rmp ≈ beste Minute'); ok(e.verdict !== 'wrong', 'nicht falsch: ' + e.msgs.join(' | ')); eq(e.rmpT, 1);
  ok(e.msgs.some(m => /Für einen Rampentest passt die Dauer/.test(m)), 'Dauer gilt als passend'); ok(!e.msgs.some(m => /deutlich kürzer als geplant|nur .* ein vollständiger Test passt/.test(m)), 'kein Hinweis auf zu kurz');
  ok(e.msgs.some(m => m.includes(`FTP von etwa ${rmpFtp(x.rmp)} W`)), 'FTP-Schätzung in der Meldung'); eq(a.$(`S.done[${i}]`), true, 'erledigt');
  /* Wochenauswertung: 20 Min. sind weniger als 60 % von 60 Min., zählt trotzdem als Rampentest */
  a.$('S.done = {}; analyze()'); eq(a.$(`S.done[${i}]`), true, 'analyze hakt die kurze Rampe ab');
  rmpBox(a, i); eq(a.$('testKind'), 'ramp'); eq(rmpVal(a), String(x.rmp), 'beste Minute vorbelegt');
  /* Eigene Wahl bleibt: 20-Min-Test gewählt, dann kein automatisches Zurückspringen */
  a.w.setTestKind('20'); rmpBox(a, i); eq(a.$('testKind'), '20', 'selbst gewählte Testart bleibt'); eq(rmpVal(a), String(x.m20 || ''), '20-Min-Wert im Feld');
  a.noErrors();
});

test('Rampentest: Puls bestätigt Ausbelastung nicht / keine Pulsdaten / ohne Leistungsmesser', async () => {
  { const {a, i, t0} = await rmpSetup(); const {a:x, e} = rmpUp(a, i, rmpRide(300, 12, 30, 180, 160, t0));
    ok(x.rmp > 0, 'Rampe erkannt'); eq(x.rmpH, 0, 'Spitzenpuls 160 von 190: nicht bestätigt'); ok(e.verdict !== 'wrong'); eq(a.$(`S.done[${i}]`), true);
    ok(e.msgs.some(m => /Dein Puls bestätigt nicht/.test(m) && /eher zu niedrig/.test(m)), 'Hinweis auf fehlende Ausbelastung'); ok(e.score < 100, 'Abzug: ' + e.score); a.noErrors(); }
  { const {a, i, t0} = await rmpSetup(); const {a:x, e} = rmpUp(a, i, rmpRide(300, 12, 30, 180, null, t0));
    ok(x.rmp > 0, 'Rampe ohne Puls erkannt'); ok(x.rmpH == null, 'Ausbelastung nicht prüfbar'); ok(e.verdict !== 'wrong'); ok(e.msgs.some(m => /Ohne Pulsdaten ist die Ausbelastung nicht prüfbar/.test(m))); a.noErrors(); }
  { const {a, i, t0} = await rmpSetup({noPwr:true}); a.$('S.p.noPwr = true; S.d.noPwr = true'); const {a:x, e} = rmpUp(a, i, rmpRide(300, 12, 30, 180, 186, t0));
    ok(a.$('noPwr()'), 'Modus ohne Wattmesser'); ok(!e.rmpT, 'ohne Wattmesser keine Rampenbewertung'); ok(!e.msgs.some(m => /Als Rampentest erkannt/.test(m)), 'keine Rampenmeldung');
    ok(!/Rampe erkannt/.test(rmpBox(a, i)), 'Kasten ohne Wattmesser ohne Rampenhinweis'); a.noErrors(); }
});

test('Rampentest-Gegenproben: 20-Min-Test mit Schlusssprint, 5×3-Min.-Intervalle, Altdaten ohne rmp', async () => {
  { const {a, i, t0} = await rmpSetup();
    const {a:x, e} = rmpUp(a, i, v2Ride([[900, 150, 110, 130], [1200, 300, 150, 175], [60, 450, 175, 185], [600, 120, 150, 110]], t0), 't20.fit');
    ok(!x.rmp, '20-Min-Test: keine Rampe'); ok(e.verdict !== 'wrong', '20-Min-Test zählt wie bisher: ' + e.msgs.join(' | ')); ok(!e.rmpT); eq(a.$(`S.done[${i}]`), true);
    ok(!e.msgs.some(m => /Rampentest/.test(m)), 'keine Rampenmeldung'); rmpBox(a, i); eq(a.$('testKind'), '20', '20-Min-Test vorgewählt'); eq(rmpVal(a), String(x.m20), 'beste 20 Min. im Feld'); a.noErrors(); }
  { const {a, i, t0} = await rmpSetup(); const P = [[900, 150, 110, 130]]; for (let k = 0; k < 5; k++) P.push([180, 330, 150, 175], [180, 120, 150, 130]); P.push([600, 110, 130, 110]);
    const {a:x, e} = rmpUp(a, i, v2Ride(P, t0), 'iv.fit');
    ok(!x.rmp, 'Intervalle: keine Rampe'); eq(e.verdict, 'wrong', 'Intervalle am Testtag bleiben falsches Training'); ok(!e.rmpT); ok(!a.$(`S.done[${i}]`), 'nicht erledigt'); a.noErrors(); }
  /* Altdaten: gespeicherte Fahrt und Bewertung von vor der Änderung (ohne rmp, rmpH, rmpT) */
  { const {a, i, t0} = await rmpSetup(); rmpUp(a, i, rmpRide(900, 14, 30, 300, 186, t0));
    a.$(`S.man.forEach(m => { delete m.rmp; delete m.rmpH; }); const e = S.p.exe[S.wk + '-' + ${i}]; delete e.rmpT; delete e.ah.rmp; delete e.ah.rmpH; save()`);
    const b = await boot({store:a.store()}); b.$(`exeShow = S.wk + '-' + ${i}; render()`); await b.tick(30); ok(b.text().length > 0);
    rmpBox(b, i); eq(b.$('testKind'), '20', 'ohne rmp bleibt der 20-Min-Test vorgewählt'); b.$('S.done = {}; analyze()'); b.noErrors(); }
});

test('Rampentest: englische Texte', async () => {
  const {a, i, t0} = await rmpSetup(); const {a:x} = rmpUp(a, i, rmpRide(300, 12, 30, 180, 160, t0));
  a.w.__iMiss = new Map(); await a.en(); a.$(`exeShow = S.wk + '-' + ${i}; render()`); await a.tick(30); a.$(`document.querySelectorAll('details').forEach(d => { d.open = true; })`); const t = a.text();
  ok(t.includes(`Detected as a ramp test: best minute ${x.rmp} W`), 'Meldung auf Englisch'); ok(/Your heart rate does not confirm/.test(t), 'Pulshinweis auf Englisch'); ok(/ramp test/i.test(t), 'Zeile Testart');
  a.w.navGo('week'); await a.tick(30);
  eq([...a.w.__iMiss.keys()].filter(k => /Rampe|Ausbelastung|beste Minute|Testart/.test(k)), [], 'keine fehlenden Übersetzungen');
  a.noErrors();
});

/* ---------- F38: VO2max-Trend aus gleichmäßigen Fahrten (vo2rEval, vo2rKeep, vo2rRide, vo2rList, vo2rSum, S.vo2r) ---------- */
/* Fahrt aus Abschnitten [Sekunden, Watt (null = kein Wattmesser), Puls von, Puls bis] am Tag day (8 Uhr); tc = Temperatur */
function v2rRide(parts, day, tc){
  const pts = []; let t = Math.round(Date.parse(day + 'T08:00:00') / 1000);
  for (const [n, w, h0, h1] of parts) for (let i = 0; i < n; i++) pts.push({t:t++, p:w, h:h0 == null ? null : Math.round(h0 + (h1 - h0) * i / Math.max(1, n - 1)), d:null, a:null, lat:null, lon:null, tc:tc == null ? null : tc});
  pts.push({t, p:null, h:null, d:null, a:null, lat:null, lon:null}); return {pts, ses:[], name:'Test'};
}
const v2rDat = d => v2Dat({weight:75, hrMax:185, ...d});
/* Ruhepuls 50 aus 5 Morgenwerten der letzten 60 Tage */
const v2rMo = (a, hr = 50) => a.$(`S.mo = {}; [3, 9, 15, 21, 27].forEach(k => { S.mo[iso(-k)] = {hr:${hr}}; })`);
const v2rUp = (a, r, nm = 'gleich.fit') => { a.w.__r = r; return a.$(`summarize(__r, '${nm}').id`); };
const v2rOf = (a, id) => a.$(`vo2rRide('${id}', S.vo2r['${id}'], vo2rCtx())`);

test('F38: Rechenbeispiel 75 kg, HFmax 185, Ruhepuls 50, 200 W bei Puls 140 → etwa 52; Neuberechnung nach HFmax', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a);
  near(a.$('vo2rCalc(200, 140, 75, 185, 50)'), 51.95, .01, '3,5 + (35,8 − 3,5) × 135 / 90');
  const id = v2rUp(a, v2rRide([[2700, 200, 140, 140]], a.$('iso(-1)'))), rec = a.$(`S.vo2r['${id}']`);
  ok(rec && !rec.x, 'gespeichert, ohne Ausschluss'); eq(rec.s.split(',').length, 7, '45 min − 10 min Einfahren = 7 Abschnitte'); eq(rec.s.split(',')[0], '200:140', 'Rohpaar Watt:Puls');
  const o = v2rOf(a, id); eq(o.n, 7); near(o.v, 52.0, .5, 'Wert der Fahrt'); near(rec.v, 52.0, .5, 'Ergebnis mit abgelegt');
  eq(a.$("vo2rRhr()").ass, false, 'Ruhepuls aus Morgenwerten');
  a.$('S.p.hrMax = 190'); near(v2rOf(a, id).v, 53.7, .2, 'HFmax 190: neu gerechnet ohne die Datei');
  /* ohne gemessene HFmax: kein Wert, Hinweis zum Bestimmen */
  a.$('S.p.hrMax = 0; if (S.d) S.d.hrMax = 0'); eq(v2rOf(a, id).x, 'nohm'); eq(a.$('vo2rSum().tr'), null);
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); const t = a.text(); ok(/Trend aus Fahrten/.test(t) && /gemessene HFmax/.test(t) && /Rampentest, einem Rennen/.test(t), 'Hinweis ohne HFmax');
  a.noErrors();
});

test('F38: Ausschlüsse (Hitze, Drift, zu kurz, Abschnitte driften, kein Wattmesser, krank, Ruhepuls, Vollgas, Ausreißer)', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); const d = k => a.$(`iso(${k})`), x = id => v2rOf(a, id).x;
  eq(x(v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(-20), 28), 'heiss.fit')), 'heat', 'Durchschnitt ≥ 25 °C');
  const dr = v2rUp(a, v2rRide([[4200, 200, 125, 165]], d(-19)), 'drift.fit'); eq(x(dr), 'dec', 'Entkopplung über 8 %'); ok(a.$(`S.vo2r['${dr}'].dec`) > 8);
  eq(x(v2rUp(a, v2rRide([[2100, 200, 140, 140]], d(-18)), 'kurz.fit')), 'short', 'unter 40 min');
  const sd = v2rUp(a, v2rRide([[2700, 200, 115, 185]], d(-17)), 'anstieg.fit'); eq(x(sd), 'few', 'Puls steigt je Abschnitt über 4 Schläge'); eq(a.$(`S.vo2r['${sd}'].s || ''`), '', 'kein Abschnitt');
  eq(x(v2rUp(a, v2rRide([[2700, null, 140, 140]], d(-16)), 'ohnewatt.fit')), 'nopm', 'ohne Wattmesser');
  eq(x(v2rUp(a, v2rRide([[2700, 200, null, null]], d(-15)), 'ohnepuls.fit')), 'nohr', 'ohne Puls');
  /* 6 min ohne Leistung mitten in der Fahrt: unter 90 % Leistung */
  eq(x(v2rUp(a, v2rRide([[1500, 200, 140, 140], [360, 0, 140, 140], [1200, 200, 140, 140]].map(q => q[1] === 0 ? [q[0], null, q[2], q[3]] : q), d(-14)), 'luecke.fit')), 'gap', 'Leistung fehlt in über 10 % der Sekunden');
  /* gültige Fahrten für den Trend, dann Vollgas und Ausreißer */
  const g = [-13, -11, -9].map((k, j) => v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(k)), 'g' + j + '.fit')); g.forEach(id => eq(x(id), '', 'gültig'));
  a.$(`S.allOut = {'${g[2]}':1}`); eq(x(g[2]), 'race', 'als Vollgas markiert'); a.$('S.allOut = {}');
  const out = v2rUp(a, v2rRide([[2700, 260, 140, 140]], d(-8)), 'ausreisser.fit'); near(v2rOf(a, out).v, 64.9, .3); eq(a.$(`vo2rList().find(o => o.id === '${out}').x`), 'out', 'mehr als 15 % neben dem Trend');
  /* auffälliger Ruhepuls am Morgen (mindestens 5 über dem Mittel der Tage 8 bis 37 davor) */
  const rd = d(-7); a.$(`for (let k = 8; k <= 20; k++) S.mo[addD('${rd}', -k)] = {hr:50}; S.mo['${rd}'] = {hr:58}`); eq(x(v2rUp(a, v2rRide([[2700, 200, 140, 140]], rd), 'ruhepuls.fit')), 'rhr', 'Ruhepuls +5');
  /* Krank-Tag gestern: Fahrt heute zählt nicht */
  const i = a.$('todayIdx()'); ok(i > 0, 'Krank-Tag in derselben Woche'); a.$(`S.plan[${i - 1}].feel = 'sick'`);
  const sk = v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(0)), 'krank.fit'); eq(x(sk), 'sick', 'krank'); eq(a.$(`S.vo2r['${sk}'].sk`), 1, 'beim Einlesen vermerkt');
  /* Abschnitte außerhalb 65–90 % HFmax zählen nicht */
  eq(x(v2rUp(a, v2rRide([[2700, 300, 172, 172]], d(-6)), 'hart.fit')), 'few', 'Puls über 90 % HFmax');
  a.noErrors();
});

test('F38: Trend aus Fahrten (Median, Spanne, Kalibrierung mit Labor), Anzeige, Englisch', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); const d = k => a.$(`iso(${k})`);
  [[-30, 140], [-20, 138], [-12, 142], [-5, 140], [-2, 139]].forEach(([k, h], j) => v2rUp(a, v2rRide([[2700, 200, h, h]], d(k)), 't' + j + '.fit'));
  const s = a.$('vo2rSum()'); ok(s.tr, 'Trend vorhanden'); eq(s.tr.n, 5); near(s.tr.v, 52.0, .5, 'Median der 5 Fahrten'); near(s.tr.hi - s.tr.lo, 2 * 5.2, .2, '± max(5; 10 %)');
  eq(a.$('vo2rTrendAt(vo2rList(), iso(-25))'), null, 'unter 3 Fahrten kein Trendpunkt');
  /* Ruhepuls nur angenommen: Spanne × 1,25 */
  a.$('S.mo = {}'); const s2 = a.$('vo2rSum()'); eq(s2.ctx.rhr.ass, true); near(s2.tr.hi - s2.tr.lo, 2 * 1.25 * Math.max(5, .1 * s2.tr.v), .2); v2rMo(a);
  /* Kalibrierung nur mit Laborwert (±14 Tage, mindestens 3 Fahrten), Garmin zählt nicht */
  v2E(a, 'G', d(-10), 60); eq(a.$("vo2Cal('T')"), null, 'Garmin ist kein Anker');
  v2E(a, 'L', d(-14), 55); const c = a.$("vo2Cal('T')"); ok(c, 'kalibriert'); near(c.off, 55 - a.$("vo2rMed(vo2rList().filter(o => !o.x && o.d >= iso(-28)).map(o => o.v))"), .1, 'Versatz gegen die 4 Fahrten ±14 Tage um den Labortag'); near(a.$('vo2rSum().tr.v'), 55, .6, 'Trend + Versatz');
  ok(a.$('vo2rSum().tr.hi - vo2rSum().tr.lo') < 2 * 5, 'mit Labor engere Spanne'); a.w.vo2CalTog(); eq(a.$("vo2Cal('T')"), null, 'abschaltbar'); a.w.vo2CalTog();
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); const t = a.text(), h = a.$("document.getElementById('app').innerHTML");
  ok(/Trend aus Fahrten/.test(t) && /≈ 55/.test(t) && /wahrscheinlich \d+–\d+/.test(t) && /Trend aus 5 gleichmäßigen Fahrten der letzten 6 Wochen · Schätzung/.test(t), 'Trendzeile: ' + t.slice(0, 300));
  ok(/kalibriert mit Laborwert/.test(t)); ok(/Letzte Fahrt am/.test(t)); ok(/Trend aus Fahrten: \+/.test(t), 'Kalibrierung in der Liste');
  ok((h.match(/class="v2-T"/g) || []).length >= 5, 'Fahrten als Punkte'); ok(/class="v2-tr v2-T"/.test(h) && /class="v2-tb"/.test(h), 'Trendlinie mit Band'); ok(/Punkt = eine Fahrt/.test(t), 'Legende');
  a.w.vo2Set('unit', 'abs'); await a.tick(20); ok(/class="v2-tr v2-T"/.test(a.$("document.getElementById('app').innerHTML")), 'auch in l/min');
  await a.en(); a.$("navGo('state'); goPg('svo2')"); await a.tick(30); const te = a.text(); ok(/Trend from rides/.test(te) && /likely \d+–\d+/.test(te) && /steady rides over the last 6 weeks/.test(te), 'Englisch');
  a.noErrors();
});

test('F38: Sicherung mit Fahrten-Rohdaten, ältere Sicherung ohne, keine Änderung am Plan', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); const d = k => a.$(`iso(${k})`);
  const before = a.$("JSON.stringify({plan:S.plan, ftp:S.p.ftp, zones:typeof zones === 'function' ? zones(S.p.ftp) : null, vo2:S.vo2 || [], done:S.done, log:(S.log || []).length})"), tr0 = a.$("vo2TrendAt('R', iso(0))");
  [-9, -6, -3].forEach((k, j) => v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(k)), 's' + j + '.fit')); a.$('save()');
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); a.$('S.p.hrMax = 190; render()'); await a.tick(20);
  eq(a.$("JSON.stringify({plan:S.plan, ftp:S.p.ftp, zones:typeof zones === 'function' ? zones(S.p.ftp) : null, vo2:S.vo2 || [], done:S.done, log:(S.log || []).length})"), before, 'Plan, FTP, Zonen, VO2max-Werte unverändert');
  eq(a.$("vo2TrendAt('R', iso(0))"), tr0, 'vo2TrendAt unverändert'); ok(!a.$("(S.vo2 || []).some(e => e.method === 'T')"), 'kein Eintrag in S.vo2');
  const ref = a.$('JSON.stringify(S.vo2r)');
  await a.w.exportPlans(); await a.tick(30); const f = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await f.blob.text(), o = JSON.parse(txt), st = typeof o.state === 'string' ? JSON.parse(o.state) : o.state;
  eq(JSON.stringify(st.vo2r), ref, 'Rohdaten in der Sicherung'); const p = a.w.bkParse(txt); eq(JSON.stringify(p.state.vo2r), ref, 'übersteht die Prüfung unverändert');
  /* ältere Sicherung ohne vo2r */
  const s0 = {...st}; delete s0.vo2r; const old = {...o, state:s0}; delete old.trk; const q = a.w.bkParse(JSON.stringify(old)); ok(q && !q.state.vo2r, 'ältere Sicherung lesbar');
  /* Altdaten ohne vo2r im Speicher */
  a.$('delete S.vo2r; save()'); const b = await boot({store:a.store()}); b.$("navGo('state'); goPg('svo2')"); await b.tick(30); eq(b.$('vo2rAny()'), false); eq(b.$('vo2rSum().tr'), null); ok(!/Trend aus Fahrten/.test(b.text()));
  b.noErrors(); a.noErrors();
});

/* ---------- F38 Schritt 2/3: Pulsqualität, Schalter, Krank-Vermerk, Rückrechnung, Grafik, Hinweis mit Anker ---------- */
/* Fahrt Sekunde für Sekunde: f(i) → [Watt, Puls, Trittfrequenz] */
function v2rRideF(n, f, day){
  const pts = []; let t = Math.round(Date.parse(day + 'T08:00:00') / 1000);
  for (let i = 0; i < n; i++) { const [p, h, c] = f(i); pts.push({t:t++, p, h, c:c == null ? null : c, d:null, a:null, lat:null, lon:null}); }
  pts.push({t, p:null, h:null, d:null, a:null, lat:null, lon:null}); return {pts, ses:[], name:'Test'};
}

test('F38: Pulsdaten unruhig oder an der Trittfrequenz → keine Schätzung; einzelne unruhige Abschnitte fallen nur weg', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); const d = k => a.$(`iso(${k})`), x = id => v2rOf(a, id).x;
  /* Puls springt jede Sekunde um ±12 (Messung am Handgelenk, Artefakte) */
  const nz = v2rUp(a, v2rRideF(2700, i => [200, 140 + (i % 2 ? 12 : -12), 90], d(-10)), 'unruhig.fit'); eq(x(nz), 'hrq', 'unruhiger Puls');
  eq(a.$("vo2rWhy('hrq')"), 'Pulsdaten unruhig', 'nur der Satz, keine Vermutung zur Ursache');
  /* Puls folgt der Trittfrequenz (beide um 128) */
  const lk = v2rUp(a, v2rRideF(2700, i => [200, 128 + (i % 60 < 30 ? 1 : -1), 128 + (i % 60 < 30 ? 1 : -1)], d(-9)), 'kadenz.fit'); eq(x(lk), 'hrq', 'Puls klebt an der Trittfrequenz');
  /* sauberer Brustgurt mit Trittfrequenz 90: gültig */
  const cl = v2rUp(a, v2rRideF(2700, () => [200, 140, 90], d(-8)), 'sauber.fit'); eq(x(cl), '', 'sauber'); near(v2rOf(a, cl).v, 52.0, .5);
  /* ein einzelner unruhiger Abschnitt (Minute 20–25): nur er fällt weg */
  const one = v2rUp(a, v2rRideF(3000, i => [200, i >= 1200 && i < 1500 ? 140 + (i % 2 ? 12 : -12) : 140, 90], d(-7)), 'einmal.fit'), r1 = a.$(`S.vo2r['${one}']`);
  eq(x(one), '', 'Fahrt zählt'); ok(r1.s.split(',').length >= 5 && r1.s.split(',').length < 8, 'weniger Abschnitte: ' + r1.s);
  /* Trittfrequenz aus der FIT-Datei (Feld 4) und aus der ausgedünnten Garmin-Aufzeichnung */
  /* kleinste FIT-Datei: ein Datensatz mit Zeit, Puls 141 und Trittfrequenz 88 */
  eq(a.$(`(() => { const rec = [0x40, 0, 0, 20, 0, 3, 253, 4, 0x86, 3, 1, 2, 4, 1, 2, 0, 0x10, 0x27, 0, 0, 141, 88], u = new Uint8Array(14 + rec.length + 2);
    u.set([14, 0x10, 0, 0, rec.length, 0, 0, 0, 46, 70, 73, 84, 0, 0]); u.set(rec, 14); const p = parseFIT(u).pts[0]; return [p.h, p.c]; })()`), [141, 88], 'parseFIT liest die Trittfrequenz (Feld 4)');
  a.noErrors();
});

test('F38: Schalter Rollenfahrten und Medikamente, Krank-Vermerk bleibt, „leicht erkältet“ zählt wie krank', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); const d = k => a.$(`iso(${k})`);
  const ids = [-12, -9, -6].map((k, j) => v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(k)), 'r' + j + '.fit')); a.$(`S.vo2r['${ids[0]}'].in = 1`);
  ok(a.$('vo2rSum().tr'), 'Trend mit Rolle');
  a.w.vo2rOptTog('noIn'); eq(v2rOf(a, ids[0]).x, 'inoff', 'Rolle herausgenommen'); eq(a.$('vo2rSum().tr'), null, 'nur noch 2 Fahrten'); eq(a.$('S.vo2rOpt.noIn'), true, 'in S, also in der Sicherung');
  a.w.vo2rOptTog('noIn'); eq(a.$('S.vo2rOpt.noIn'), undefined); ok(a.$('vo2rSum().tr'), 'wieder mit Rolle');
  a.w.vo2rOptTog('med'); eq(v2rOf(a, ids[1]).x, 'med'); eq(a.$('vo2rSum().tr'), null); eq(a.$("vo2rChart(iso(-90), 'rel')"), null, 'keine Punkte im Verlauf');
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); let t = a.text(); ok(/Ausgeschaltet: Dein Puls wird nach deiner Angabe durch Medikamente beeinflusst/.test(t) && /Ärztin oder Arzt/.test(t), 'Hinweis Medikamente');
  a.w.vo2rOptTog('med'); ok(a.$('vo2rSum().tr'));
  /* leicht erkältet gestern: Fahrt heute zählt nicht, Vermerk bleibt nach Ende der Woche */
  const i = a.$('todayIdx()'); ok(i > 0); a.$(`S.plan[${i - 1}].feel = 'neck'`);
  const sk = v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(0)), 'erkaeltet.fit'); eq(v2rOf(a, sk).x, 'sick'); a.$(`S.plan[${i - 1}].feel = ''; delete S.vo2r['${sk}'].sk`);
  eq(v2rOf(a, sk).x, '', 'ohne Vermerk wieder gültig'); a.$(`S.plan[${i - 1}].feel = 'sick'`); a.$('vo2rList()'); a.$(`S.plan[${i - 1}].feel = ''`); eq(a.$(`S.vo2r['${sk}'].sk`), 1, 'beim Rechnen vermerkt'); eq(v2rOf(a, sk).x, 'sick', 'bleibt ausgeschlossen');
  a.noErrors();
});

test('F38: Rückrechnung älterer Garmin-Fahrten (6 Monate, neueste zuerst, höchstens 150, Drosselung, Abbruch, Fehler)', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); a.$('cheerShow = null');
  a.w.localStorage.setItem('relentless.garmin.key', 'TESTSCHLUESSEL');
  a.$("S.gm = {mode:'web', ok:true, last:new Date().toISOString()}; gmCall = async () => ({activities:[]}); VO2RF.pause = 0; VO2RF.waitF = .001");
  /* Archiv: 5 passende Fahrten, dazu ohne Puls, ohne Leistung, zu kurz, älter als 6 Monate, ohne Garmin-ID */
  a.$(`S.arch = [[-40, 1], [-30, 2], [-20, 3], [-10, 4], [-5, 5]].map(([k, g]) => ({id:'i' + g, d:iso(k), n:'F' + g, km:40, hm:200, sec:3000, np:200, hr:140, gid:String(g), imp:1}))
    .concat([{id:'i6', d:iso(-8), n:'ohne Puls', sec:3000, np:200, gid:'6'}, {id:'i7', d:iso(-7), n:'ohne Watt', sec:3000, np:0, hr:140, gid:'7'}, {id:'i8', d:iso(-6), n:'kurz', sec:1800, np:200, hr:140, gid:'8'},
      {id:'i9', d:iso(-200), n:'alt', sec:3000, np:200, hr:140, gid:'9'}, {id:'i10', d:iso(-4), n:'Datei', sec:3000, np:200, hr:140}]); save()`);
  eq(a.$('vo2rTodo().map(x => x.id)'), ['i5', 'i4', 'i3', 'i2', 'i1'], 'nur Fahrten mit Rohdaten, neueste zuerst');
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); let t = a.text(); ok(/Trend aus Fahrten/.test(t) && /5 Fahrten der letzten 6 Monate mit Wattmesser, Puls und mindestens 40 Minuten sind noch nicht ausgewertet/.test(t), 'Bereich mit Angebot: ' + t.slice(0, 200));
  ok(a.w.document.querySelector('#fx-v2rfill button.btn'), 'Knopf');
  /* Garmin-Attrappe: Fahrt gid 3 ohne Aufzeichnung, gid 2 beim ersten Mal gedrosselt */
  a.w.__got = []; a.w.__rated = 0;
  a.$(`gmRide = async g => { __got.push(g.id); if (g.id === '2' && !__rated) { __rated = 1; throw new GmErr('rate', 'Zu viele Abrufe'); } const day = S.arch.find(x => x.gid === g.id).d;
    if (g.id === '3') return {r:{pts:[], ses:[], name:'x'}, name:'x'}; const pts = []; let t = Math.round(Date.parse(day + 'T08:00:00') / 1000); for (let i = 0; i < 2700; i++) pts.push({t:t++, p:200, h:140, c:90}); pts.push({t, p:null, h:null}); return {r:{pts, ses:[], name:'x'}, name:'x'}; }`);
  a.$('VO2RF.max = 3'); await a.w.vo2rFillGo();
  eq(a.$('__got'), ['5', '4', '3'], 'höchstens VO2RF.max je Lauf'); eq(a.$('vo2rFill.ok'), 3); eq(a.$('vo2rFill.v'), 2, 'zwei mit Abschnitten'); eq(a.$("S.vo2r.i3.x"), 'nodata', 'ohne Aufzeichnung vermerkt');
  a.$('VO2RF.max = 150'); eq(a.$('vo2rTodo().map(x => x.id)'), ['i2', 'i1'], 'Rest beim nächsten Lauf');
  await a.w.vo2rFillGo(); eq(a.$('__got').slice(3), ['2', '2', '1'], 'nach Drosselung erneut versucht'); eq(a.$('vo2rTodo().length'), 0); ok(a.$('vo2rSum().tr'), 'Trend aus den nachgerechneten Fahrten');
  eq(a.$('vo2rFill.fail'), 0);
  a.$("navGo('state'); goPg('svo2')"); await a.tick(30); t = a.text(); ok(/Zuletzt: 2 Fahrten ausgewertet, 2 davon mit gleichmäßigen Abschnitten/.test(t), 'Ergebnis');
  /* Abbruch mitten im Lauf und Fehler der Verbindung */
  a.$(`S.arch = S.arch.concat([1, 2, 3, 4].map(k => ({id:'j' + k, d:iso(-50 - k), n:'J', sec:3000, np:200, hr:140, gid:'j' + k})))`);
  a.$(`gmRide = async g => { __got.push(g.id); if (g.id === 'j2') vo2rFillStop(); const pts = []; let t = Math.round(Date.parse(iso(-50) + 'T08:00:00') / 1000); for (let i = 0; i < 2700; i++) pts.push({t:t++, p:200, h:140}); return {r:{pts, ses:[], name:'x'}, name:'x'}; }`);
  a.w.__got = []; await a.w.vo2rFillGo(); eq(a.$('__got'), ['j1', 'j2'], 'nach Abbrechen keine weitere Fahrt'); eq(a.$('vo2rFill.run'), 0); ok(a.$("vo2rHas('j2')"), 'laufende Fahrt noch übernommen');
  a.$(`gmRide = async g => { __got.push(g.id); throw new GmErr('auth', 'Garmin-Anmeldung abgelaufen.'); }`); a.w.__got = []; await a.w.vo2rFillGo();
  eq(a.$('__got'), ['j3'], 'Verbindungsfehler bricht ab'); eq(a.$('vo2rFill.err'), 'Garmin-Anmeldung abgelaufen.'); eq(a.$('vo2rFill.fail'), 1); eq(a.$('vo2rTodo().length'), 2, 'nicht ladbare kommen wieder');
  a.$("navGo('state'); goPg('svo2')"); await a.tick(30); ok(/Garmin-Anmeldung abgelaufen/.test(a.text()));
  /* läuft schon ein anderer Abruf, startet die Rückrechnung nicht */
  a.$('impMm = {i:0, n:1}'); a.w.__got = []; await a.w.vo2rFillGo(); eq(a.$('__got'), [], 'nicht gleichzeitig mit anderem Abruf'); a.$('render()'); ok(/Gerade lädt die App schon andere Fahrten/.test(a.text())); a.$('impMm = null');
  await a.en(); a.$("navGo('state'); goPg('svo2')"); await a.tick(30); ok(/Analyse older rides/.test(a.text()) && /2 rides of the last 6 months/.test(a.text()), 'Englisch');
  a.noErrors();
});

test('F38: Verlauf – Ausreißer bestimmen den Ausschnitt nicht; Veränderung erst ab 3 und 5 %; Hauptzahl ohne andere Werte', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a); const d = k => a.$(`iso(${k})`);
  [-40, -36, -33, -12, -9, -6].forEach((k, j) => v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(k)), 'z' + j + '.fit'));
  v2rUp(a, v2rRide([[2700, 280, 140, 140]], d(-3)), 'aus.fit'); ok(a.$('vo2rList().some(o => o.x === "out")'), 'Ausreißer');
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40);
  const ys = a.$(`[...document.querySelectorAll('#fx-v2hist svg.v2-ch text.tx')].map(e => +e.textContent).filter(v => v > 0)`); ok(Math.max(...ys) < 62, 'Achse nicht bis zum Ausreißer (~69): ' + ys.join(','));
  ok(a.w.document.querySelector('circle.v2-Tout'), 'Ausreißer am Rand sichtbar');
  ok(/Gegenüber vor 4 Wochen: unverändert im Rahmen der Genauigkeit/.test(a.text()), 'unverändert');
  /* Hauptzahl oben: ohne Labor-, Test- oder Garmin-Wert steht der Trend dort */
  const top = () => a.$("document.getElementById('fx-v2').textContent"); ok(/Deine VO2max · Trend aus Fahrten/.test(top()) && /Noch kein Test-, Labor- oder Garmin-Wert/.test(top()), 'Trend als Hauptzahl: ' + top().slice(0, 120));
  v2E(a, 'G', d(-5), 50); a.$('render()'); await a.tick(20); ok(!/Trend aus Fahrten/.test(top()), 'mit Garmin-Wert in 12 Wochen: eigene Zeile');
  /* Anstieg um 10 %: Veränderung wird gemeldet */
  const b = await boot(); makePlan(b, v2rDat()); v2rMo(b); const e = k => b.$(`iso(${k})`);
  [-40, -36, -33].forEach((k, j) => v2rUp(b, v2rRide([[2700, 200, 140, 140]], e(k)), 'y' + j + '.fit')); [-12, -9, -6, -3].forEach((k, j) => v2rUp(b, v2rRide([[2700, 220, 140, 140]], e(k)), 'w' + j + '.fit'));
  const ch = b.$('vo2rChg(vo2rList())'); ok(ch && ch.sig && ch.d > 3, 'Veränderung: ' + JSON.stringify(ch)); b.$("navGo('state'); goPg('svo2')"); await b.tick(30); ok(/Gegenüber vor 4 Wochen: etwa \+\d+ ml\/kg\/min/.test(b.text()));
  a.noErrors(); b.noErrors();
});

test('F38: Hinweis „Wusstest du schon?“ führt direkt zum Bereich „Trend aus Fahrten“, Englisch', async () => {
  const a = await boot(); makePlan(a, v2rDat()); v2rMo(a);
  const dy = a.$(`DYK.find(t => t[0] === 'v2r')`); ok(dy && dy[3] === "dykSet('svo2','v2r')", 'Eintrag mit Anker'); eq(a.$(`DYK.find(t => t[0] === 'v2r')[4]()`), false, 'ohne Daten und ohne Garmin kein Hinweis');
  v2rUp(a, v2rRide([[2700, 200, 140, 140]], a.$('iso(-2)'))); ok(a.$(`DYK.find(t => t[0] === 'v2r')[4]()`), 'mit Fahrt sichtbar');
  a.$(`dykGo(DYK.find(t => t[0] === 'v2r')[3])`); await a.tick(200); eq(a.$('pg'), 'svo2'); ok(a.w.document.getElementById('fx-v2r'), 'Bereich da'); eq(a.$('pgFrom'), 'state', 'Zurück führt zu Fortschritt');
  ok(a.$(`document.getElementById('fx-v2r').classList.contains('dyk-hit')`), 'Bereich hervorgehoben');
  a.w.__iMiss = new Map(); await a.en(); a.$(`dykPut({cur:'v2r', day:iso(0), seen:[]})`); a.w.navGo('home'); await a.tick(40); const t = a.text();
  if (/Wusstest du schon|Did you know/.test(t)) ok(/now also estimates your VO2max from steady rides/.test(t) && /View trend/.test(t), 'Hinweis auf Englisch');
  eq([...a.w.__iMiss.keys()].filter(k => /gleichmäßigen Fahrten|Trend ansehen/.test(k)), [], 'keine fehlenden Übersetzungen');
  a.noErrors();
});

/* ---------- F38 Korrekturen nach Fachabnahme ---------- */
/* Brustgurt-Simulation wie kad.py: Puls um hb mit kleinem Rauschen, Trittfrequenz um cb ± csd, beide unabhängig (Zufall mit Startwert) */
function v2rSim(hb, cb, csd, n, seed){
  let x = seed >>> 0; const u = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return (x + .5) / 4294967296; }, g = () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
  const h = [], c = []; let hr = hb, cd = cb; for (let i = 0; i < n; i++) { hr += .05 * (hb - hr) + .5 * g(); cd += .3 * (cb - cd) + csd * .6 * g(); h.push(Math.round(hr)); c.push(Math.round(cd)); } return {h, c};
}
test('F38 Korrektur: Puls nah an der Trittfrequenz, aber unabhängig (Brustgurt) bleibt gültig; echtes Kleben fällt weg', async () => {
  const a = await boot(); makePlan(a, v2rDat({hrMax:140})); v2rMo(a); const d = k => a.$(`iso(${k})`);
  [[96, 92, 4, 1], [95, 92, 3, 2], [97, 92, 4, 3]].forEach(([hb, cb, csd, sd], j) => {
    const {h, c} = v2rSim(hb, cb, csd, 3600, sd), id = v2rUp(a, v2rRideF(3600, i => [120, h[i], c[i]], d(-10 + j)), 'gurt' + j + '.fit'), o = v2rOf(a, id);
    ok(o.x !== 'hrq' && o.x === '', `Puls ${hb} bei Trittfrequenz ${cb}±${csd}: gültig (${o.x}, ${o.n} Abschnitte)`);
    const k = a.$(`(() => { const h = ${JSON.stringify(h)}, c = ${JSON.stringify(c)}; return vo2rCad(h, c, 0, h.length); })()`); ok(k.lk > .3 * k.nc && k.r < .6, `oft nah (${Math.round(k.lk / k.nc * 100)} %), aber r ${k.r.toFixed(2)}`);
  });
  /* Sensor folgt dem Tritt: Puls = Trittfrequenz + kleiner Versatz, gemeinsam schwankend */
  const {c} = v2rSim(96, 92, 4, 3600, 9), lk = v2rUp(a, v2rRideF(3600, i => [120, c[i] + (i % 7 === 0 ? 1 : 0), c[i]], d(-3)), 'klebt.fit'); eq(v2rOf(a, lk).x, 'hrq', 'echtes Kleben');
  a.noErrors();
});

test('F38 Korrektur: Drift nur im ausgewerteten Teil, Texte, Hinweis Rollenfahrten im Trend mit Sprung zum Schalter', async () => {
  const a = await boot(); makePlan(a, v2rDat()); const d = k => a.$(`iso(${k})`);
  /* 90 min gleichmäßig, danach 60 min mit stark steigendem Puls: Drift liegt nach Minute 90 und zählt nicht */
  const late = v2rUp(a, v2rRide([[5400, 200, 140, 140], [3600, 200, 140, 175]], d(-20)), 'spaet.fit'); ok(!(a.$(`S.vo2r['${late}'].dec`) > 8), 'Drift nach Minute 90 ohne Einfluss'); eq(v2rOf(a, late).x, '');
  const early = v2rUp(a, v2rRide([[4800, 200, 125, 165]], d(-19)), 'frueh.fit'); eq(v2rOf(a, early).x, 'dec', 'Drift im ausgewerteten Teil');
  const ids = [-12, -8, -4].map((k, j) => v2rUp(a, v2rRide([[2700, 200, 140, 140]], d(k)), 'k' + j + '.fit')); a.$(`S.vo2r['${ids[2]}'].in = 1`);
  a.$("navGo('state'); goPg('svo2')"); await a.tick(40); let t = a.text();
  ok(/Letzte Fahrt am .*: zählt zum Trend\./.test(t), 'Einzelfahrt ohne Zahl'); ok(/Ähnlich arbeitet auch Garmin\./.test(a.$("document.getElementById('fx-v2r').textContent")));
  ok(/Ist dein Ruhepuls niedriger, liegt die Schätzung eher zu hoch\./.test(t), 'Ruhepuls angenommen: Richtung');
  /* Richtung fachlich: angenommene 60 statt echter 50 → höherer Wert */
  ok(a.$('vo2rCalc(200, 140, 75, 185, 60)') > a.$('vo2rCalc(200, 140, 75, 185, 50)'), 'mit 60 höher als mit 50');
  ok(/Im Trend stecken Rollenfahrten/.test(t), 'sichtbare Zeile'); const b = a.w.document.querySelector('#fx-v2rin button'); ok(b && b.getBoundingClientRect().height >= 44, 'Knopf mindestens 44 pt');
  a.w.vo2rInGo(); await a.tick(150); ok(a.$("document.getElementById('fx-v2ropt').open"), 'Einstellungen aufgeklappt'); eq(a.$('document.activeElement && document.activeElement.id'), 'v2rOpt-noIn', 'Schalter fokussiert');
  a.w.vo2rOptTog('noIn'); await a.tick(20); ok(!/Im Trend stecken Rollenfahrten/.test(a.text()), 'ohne Rollenfahrten kein Hinweis'); a.w.vo2rOptTog('noIn');
  a.$('S.p.hrMax = 0; if (S.d) S.d.hrMax = 0; render()'); await a.tick(20); ok(/Einstellungen → Herzfrequenz und Leistungsmesser/.test(a.text()), 'richtiger Seitenname');
  a.$('S.p.hrMax = 185; render()'); await a.en(); a.$("navGo('state'); goPg('svo2')"); await a.tick(30); t = a.text();
  ok(/counts towards the trend/.test(t) && /The trend includes indoor rides/.test(t) && /Set indoor rides/.test(t) && /tends to be too high/.test(t), 'Englisch');
  a.noErrors();
});
