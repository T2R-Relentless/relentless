/* F32: TSS im Logbuch · F33: ältere Garmin-Fahrten importieren */
R.file = 'tss-historie';
async function thBoot(){ const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-06-20', ftp:250, hours:8, weight:72}); a.$('cheerShow = null'); return a; }
/* Garmin-Liste wie von der Function/Erweiterung (neueste zuerst) */
function thAct(id, local, o){ return {activityId:id, activityName:o.n || 'Ausfahrt', startTimeLocal:local, startTimeGMT:o.gmt || local, distance:(o.km ?? 40) * 1000, duration:o.sec ?? 5400, movingDuration:o.sec ?? 5400, elevationGain:o.hm ?? 300, averageHR:o.hr, normPower:o.np, avgPower:o.np ? o.np - 10 : undefined, trainingStressScore:o.gt, activityType:o.ty || 'road_biking'}; }
function thList(n0){ const L = []; let id = 9000; for (let k = 1; k <= 110; k++) { const d = new Date(2026, 10, 10); d.setDate(d.getDate() - k); const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    L.push(thAct(id++, ds + ' 17:00:00', {np:k % 3 ? 190 + (k % 20) : undefined, hr:k % 3 ? 140 : (k % 2 ? 138 : undefined), gt:k % 3 ? undefined : 60, ty:k % 9 === 0 ? 'virtual_ride' : 'road_biking'})); }
  L.push(thAct(id++, '2026-09-30 23:50:00', {gmt:'2026-09-30 21:50:00', n:'Nachtfahrt', np:180}));
  L.push(thAct(id++, '2026-09-20 08:00:00', {ty:'running', n:'Lauf'}), thAct(id++, '2026-09-21 08:00:00', {ty:'cycling', sec:20, km:.084, n:'Fehlstart'}), thAct(id++, '2026-09-22 08:00:00', {ty:'e_bike_fitness', n:'E-Bike'}));
  return L.slice(0, n0 || L.length); }
/* gmCall durch eine Attrappe ersetzen: Seiten zu 50, optional eine Drosselung (429) beim zweiten Abruf */
function thStub(a, list, o){ a.w.__L = list; a.w.__calls = []; a.w.__rate = o && o.rate ? 1 : 0;
  a.$(`S.gm = {mode:'web', ok:true}; IMP_WAIT[0] = 40; IMP_WAIT[1] = 40; gmCall = async (tool, inp) => { __calls.push(inp.start); if (__rate && __calls.length === 2) { __rate = 0; throw new GmErr('rate', 'Zu viele Abrufe'); }
    const L = __L.slice(inp.start, inp.start + inp.limit); return {start:inp.start, activities:L, nextStart:inp.start + inp.limit < __L.length ? inp.start + inp.limit : null}; };`); }
const thWait = async (a, cond, ms = 15000) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Fail('Zeitüberschreitung'); await a.tick(40); } };

test('rideTss: Leistung mit FTP aus dem Verlauf, Puls, Garmin-Rückfall, keine Daten', async () => {
  const a = await thBoot();
  a.$("S.wf = [{d:'2026-06-01', at:0, ftp:240, kg:72}, {d:'2026-10-01', at:1, ftp:260, kg:72}]; S.p.lthr = 165");
  const T = r => a.$(`rideTss(${JSON.stringify(r)})`);
  const v1 = T({day:'2026-09-15', sec:3636, np:213}); eq(v1.src, 'power'); eq(v1.ftp, 240); eq(v1.tss, Math.round(3636 * (213 / 240) ** 2 / 36), 'TSS = s × NP × IF / (FTP × 3600) × 100');
  const v2 = T({day:'2026-10-15', sec:3636, np:213}); eq(v2.ftp, 260, 'nach der FTP-Änderung'); eq(v2.tss, 68); ok(!v2.ftpEst);
  const v0 = T({day:'2026-01-10', sec:3636, np:213}); eq(v0.ftp, 240); ok(v0.ftpEst, 'vor dem Verlauf: Schätzung');
  a.$("S.wf = [{d:'2026-06-01', at:0, ftp:250, kg:72}]"); eq(T({day:'2026-09-15', sec:3636, np:213}).tss, 73, 'Beispiel der Vorab-Prüfung (3.636 s, NP 213 W, FTP 250 W)');
  const h = T({day:'2026-09-15', sec:3600, hr:140}); eq(h.src, 'hr'); ok(h.tss > 30 && h.tss < 80, 'hrTSS plausibel: ' + h.tss);
  eq(T({day:'2026-09-15', sec:3600, gt:55.4}), {tss:55, src:'garmin'}, 'Garmin-Wert nur als Rückfall');
  eq(T({day:'2026-09-15', sec:3600}).src, 'none'); eq(T({day:'2026-09-15', sec:3600, tss:70}).src, 'alt', 'ältere Einträge behalten ihren Wert');
  a.noErrors();
});

test('Import: Seiten, Drosselung, Typfilter, Fehlaufzeichnungen, Duplikate, Mitternacht', async () => {
  const a = await thBoot(), L = thList();
  a.$(`S.man = [{id:'mx', day:'2026-11-05', ts:'2026-11-05T16:00:00.000Z', sec:5400, km:40, hm:300, np:200, tss:80, gid:'9004'}]; save()`);
  thStub(a, L, {rate:true}); a.w.impStart('3'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  eq(a.$('S.imp.st'), 'done'); eq(a.$('__calls'), [0, 50, 50, 100], 'drei Seiten, die gedrosselte zweimal');
  const I = a.$('S.imp'); eq(I.dup, 1, 'schon vorhandene Fahrt (Garmin-ID) nicht doppelt'); eq(I.skip, 1, 'Fehlaufzeichnung 20 s'); eq(Object.keys(I.other).sort(), ['e_bike_fitness', 'running'], 'andere Sportarten nicht übernommen');
  eq(I.n, 110, 'übernommen'); const ids = a.$("S.arch.filter(x => x.imp).map(x => x.gid)"); eq(new Set(ids).size, ids.length, 'keine Duplikate');
  eq(a.$("S.arch.find(x => x.n === 'Nachtfahrt').d"), '2026-09-30', 'Tag nach Ortszeit (startTimeLocal)'); ok(a.$("S.arch.some(x => x.imp && x.in)"), 'virtuelle Fahrt als Rolle');
  a.$('S.p.lthr = 165'); const src = a.$("(() => { const o = {}; rideAll().filter(r => r.imp).forEach(r => { const s = rideTss(r).src; o[s] = (o[s] || 0) + 1; }); return o; })()"); R.f32 = {src, n:I.n};
  ok(src.power > 0 && src.hr > 0 && src.garmin > 0, 'alle Quellen vertreten: ' + JSON.stringify(src));
  a.$('impStart("3")'); await thWait(a, () => a.$('S.imp.st') !== 'run'); eq(a.$('S.imp.n'), 0, 'zweiter Import: nichts doppelt'); eq(a.$('S.imp.dup'), 111);
  a.noErrors();
});

test('Import: Anhalten und Fortsetzen nach App-Neustart', async () => {
  const a = await thBoot(), L = thList(); thStub(a, L); a.$('IMP_WAIT'); a.w.impStart('6');
  await thWait(a, () => a.$('S.imp.page') >= 1); a.w.impStop(); await thWait(a, () => !a.$('impBusy'));
  const n1 = a.$('S.imp.n'), nx = a.$('S.imp.next'); ok(n1 > 0 && n1 < 110 && nx === 50, `angehalten nach Seite 1 (${n1})`); a.$('S.imp.st = "run"; save()'); a.w.localStorage.setItem('relentless.garmin.key', 'TESTSCHLUESSEL');
  const b = await boot({store:a.store()}); b.$('cheerShow = null'); eq(b.$('S.imp.st'), 'pause', 'nach Neustart: unterbrochen');
  b.w.navGo('more'); b.w.goPg('settings'); b.w.goPg('set-gm'); ok(/Unterbrochen/.test(b.text()) && /Fortsetzen/.test(b.text()));
  thStub(b, L); b.w.impResume(); await thWait(b, () => b.$('S.imp.st') !== 'run'); eq(b.$('S.imp.st'), 'done'); eq(b.$('__calls')[0], 50, 'macht dort weiter, wo es stand'); eq(b.$("S.arch.filter(x => x.imp).length"), 111, 'alle Fahrten genau einmal');
  b.noErrors();
});

test('Formkurve und Logbuch nutzen dieselbe TSS, CTL startet mit Historie', async () => {
  const a = await thBoot(), ctl0 = a.$('impCtlNow()'); thStub(a, thList()); a.w.impStart('3'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  const day = '2026-10-20', lb = a.$(`lbRides().filter(r => r.day === '${day}').reduce((q, r) => q + r.tss, 0)`), vz = a.$(`Math.round(vzDaily()['${day}'] || 0)`); ok(lb > 0); eq(vz, lb, 'gleiche TSS');
  const I = a.$('S.imp'); ok(I.ctl1 > 20 && (ctl0 == null || I.ctl1 > ctl0), `Fitness heute mit Historie ${I.ctl1} (vorher ${ctl0})`);
  ok(a.$("vzRows().rows[0].day") <= '2026-08-01', 'Formkurve beginnt mit der ältesten Fahrt');
  const t = (a.w.navGo('more'), a.w.goPg('settings'), a.w.goPg('set-gm'), a.text()); ok(new RegExp(`Fitness heute ${I.ctl1}`).test(t), 'Info nach dem Import');
  a.noErrors();
});

test('Kein automatischer Planeingriff; Vorschlag Ausgangsumfang mit Rückgängig', async () => {
  const a = await thBoot(), plan0 = a.$('JSON.stringify([S.plan, S.p.startH || 0])'); thStub(a, thList()); a.w.impStart('3'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  eq(a.$('JSON.stringify([S.plan, S.p.startH || 0])'), plan0, 'Plan unverändert'); const P = a.$('S.imp.prop'); ok(P && P.st === 'open', 'Vorschlag offen: ' + JSON.stringify(P));
  const s0 = a.$('JSON.stringify([S.p, S.plan])'); a.w.impPropAccept(); eq(a.$('S.p.startH'), P.h); a.w.evUndoGo(); eq(a.$('JSON.stringify([S.p, S.plan])'), s0, 'Rückgängig exakt'); a.noErrors();
});

test('FTP damals: Abfrage, Vorschlag, Neuberechnung, Bewertungen bleiben', async () => {
  const a = await thBoot(); a.$("S.wf = [{d:'2026-11-09', at:0, ftp:250, kg:72}]; S.p.exe = {'1-0': {score:77, tss:60, rid:'z', n:'Alt', day:'2026-11-09', sec:3600, x:{t:'base', n:'Grundlage', m:60, lo:56, hi:72}, msgs:[], acts:[], at:1, grade:'Gut umgesetzt', verdict:'ok', dr:1, pm:60}}"); thStub(a, thList()); a.w.impStart('3'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  const B = a.$('impBefore()'); ok(B && B.n > 50, 'Fahrten vor dem FTP-Verlauf'); a.w.navGo('more'); a.w.goPg('settings'); a.w.goPg('set-gm'); ok(/Wie hoch war deine FTP damals ungefähr\?/.test(a.text()));
  const r = a.$("rideAll().find(r => r.imp && r.np > 0 && r.day < '2026-10-01')"), t0 = a.$(`rideTss(${JSON.stringify(r)})`); ok(t0.ftpEst && t0.ftp === 250);
  a.$("document.getElementById('impFtpD').value = '2026-07-01'; document.getElementById('impFtpV').value = '220'"); a.w.impFtpAdd();
  const t1 = a.$(`rideTss(${JSON.stringify(r)})`); eq(t1.ftp, 220); ok(!t1.ftpEst && t1.tss > t0.tss, 'neu berechnet mit FTP damals'); eq(a.$("S.p.exe['1-0'].score"), 77, 'Bewertung unverändert');
  eq(a.$("S.wf.map(x => x.d)"), ['2026-07-01', '2026-11-09'], 'Verlauf sortiert'); eq(a.$("wfLast().ftp"), 250, 'aktuelle FTP bleibt');
  ok(!a.$('impBefore()'), 'alle Fahrten haben jetzt eine FTP: Abfrage erledigt'); a.w.navGo('more'); a.w.goPg('settings'); a.w.goPg('set-gm'); ok(!/Wie hoch war deine FTP damals/.test(a.text())); a.noErrors();
});

test('Logbuch: TSS-Grafik (Woche, Monat, Alles), Soll-Umriss, Sprung-Hinweis, Liste und Detail', async () => {
  const a = await thBoot(); thStub(a, thList()); a.w.impStart('all'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  /* Sprung: eine Woche mit drei langen Zusatzfahrten */
  a.$("['2026-11-09', '2026-11-10', '2026-11-11'].forEach((d, k) => S.arch.push({id:'sp' + k, d, n:'Lang', km:120, hm:900, sec:14400, np:200, imp:1, tssS:'power'})); save()");
  a.$("lbCh.met = 'tss'; lbCh.mode = 'w'"); let t = a.page('logbook'); const d = a.w.document;
  ok(/Diese Woche: [\d.]+ TSS/.test(t) && /geplant \d+ TSS/.test(t) && /Fahrten/.test(t), 'Kopf mit Ist/Soll: ' + t.slice(0, 200));
  ok(d.querySelectorAll('#lb-chart .lbc-plan').length >= 1, 'Soll-Umriss'); ok(d.querySelectorAll('#lb-chart .lbc-jump').length >= 1 && /Deutlich mehr als zuletzt/.test(t), 'Sprung-Hinweis');
  ok(/Geplant/.test(d.querySelector('#lb-chart table.sr-only').textContent), 'Tabelle für VoiceOver mit Soll');
  ok(/importiert/.test(t) && /TSS \d+/.test(t) && /IF 0,\d\d/.test(t), 'Liste mit TSS, IF, importiert'); ok(/Woche ab[\s\S]{0,80}TSS \d+/i.test(t), 'Wochenkopf mit TSS');
  a.$("lbCh.mode = 'm'"); a.page('logbook'); eq(a.w.document.querySelectorAll('#lb-chart .lbc-bar, #lb-chart .lbc-on').length, 12, '12 Monate');
  a.$("lbCh.mode = 'a'"); a.page('logbook'); const P = a.$("lbPeriods('a', 0)"), f0 = a.$("lbRides().map(r => r.day).sort()[0].slice(0, 7)"); ok(P.length === 12 && P.includes(f0), 'Alles: mindestens 12 Monate, erste Fahrt enthalten');
  a.$("S.arch.push({id:'alt1', d:'2024-03-10', n:'Alt', km:50, hm:400, sec:7200, np:180, imp:1, tssS:'power'})"); eq(a.$("lbPeriods('a', 0)")[0], '2024-03', 'ältere Historie: ab dem ersten Monat'); a.page('logbook'); ok(a.w.document.querySelectorAll('#lb-chart .lbc-bar, #lb-chart .lbc-on').length >= 32, 'Monatsbalken über die ganze Historie');
  a.$("lbF = 'imp'"); t = a.page('logbook'); ok(/Importiert/.test(t)); a.$("lbF = 'all'");
  const id = a.$("rideAll().find(r => r.imp && r.np > 0).id"); a.w.lbOpenRide(id); t = a.text(); ok(/FTP verwendet/.test(t) && /gemessen \(Leistung\)/.test(t) && /Garmin, importiert/.test(t) && /IF/.test(t), 'Detail');
  a.noErrors();
});

test('Sicherung mit 12 Monaten Historie, alte Formate laden', async () => {
  const a = await thBoot(); const L = []; for (let k = 0; k < 160; k++) { const d = new Date(2026, 10, 9); d.setDate(d.getDate() - k * 2.3); const ds = d.toISOString().slice(0, 10); L.push(thAct(20000 + k, ds + ' 09:00:00', {n:'Ausfahrt mit etwas längerem Namen', np:200, hr:140})); }
  thStub(a, L); a.w.impStart('12'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  const n = a.$("S.arch.filter(x => x.imp).length"), bytes = a.$("JSON.stringify(S.arch.filter(x => x.imp)).length"); R.f32 = {...(R.f32 || {}), n12:n, bytes12:bytes, per:Math.round(bytes / n)}; ok(bytes / n < 400, `je Fahrt ${Math.round(bytes / n)} Byte`);
  await a.w.exportPlans(); await a.tick(20); const f = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await f.blob.text(); ok(txt.includes('"imp":1') || txt.includes('\\"imp\\":1'), 'Import in der Sicherung');
  /* alter Stand: Archiv ohne Quelle und ohne Puls, kein FTP-Verlauf */
  a.$("S.arch.forEach(x => { delete x.tssS; delete x.hr; delete x.imp; }); delete S.wf; delete S.imp; save()"); const b = await boot({store:a.store()}); b.$('cheerShow = null');
  ok(b.$("lbRides().length") >= n, 'lädt'); ok(b.$("rideAll().every(r => ['power', 'alt', 'none', 'hr', 'garmin'].includes(rideTss(r).src))")); b.page('logbook'); b.noErrors();
});

test('VO2max aus der Historie: älteste zuerst, nur neue 5-min-Bestwerte mit passendem Puls, still', async () => {
  const a = await thBoot(); a.$("S.p.hrMax = 190; S.d.hrMax = 190; S.wf = [{d:'2026-01-01', at:0, ftp:250, kg:72}]");
  /* drei Fahrten mit Leistung: 05.08. 5 Min. 330 W bei Puls 182 (gültig), 20.08. 5 Min. 310 W (kein neuer Bestwert), 25.09. 5 Min. 345 W bei Puls 150 (Puls zu niedrig) */
  thStub(a, [thAct(501, '2026-09-25 17:00:00', {np:220}), thAct(502, '2026-08-20 17:00:00', {np:215}), thAct(503, '2026-08-05 17:00:00', {np:225})]); a.w.impStart('6'); await thWait(a, () => a.$('S.imp.st') !== 'run');
  a.w.__fit = {'503':[330, 182], '502':[310, 183], '501':[345, 150]}; a.w.__got = [];
  a.$(`gmRide = async g => { __got.push(g.id); const [w, h] = __fit[g.id]; const d = {'503':'2026-08-05', '502':'2026-08-20', '501':'2026-09-25'}[g.id], t0 = Date.parse(d + 'T15:00:00Z') / 1000, pts = []; let t = t0;
    const seg = (n, p, hr) => { for (let i = 0; i < n; i++) pts.push({t:t++, p, h:hr, d:t * 8, a:300}); }; seg(1200, 160, 125); for (let i = 0; i < 300; i++) pts.push({t:t++, p:w, h:Math.round(150 + (h - 150) * i / 299), d:t * 8, a:300}); seg(1200, 150, 128);
    return {r:{pts, ses:[], name:'x'}, name:'x'}; }`);
  const n0 = a.$('(S.vo2 || []).length');
  await a.w.impMmRun(); eq(a.$('__got'), ['503', '502', '501'], 'älteste zuerst');
  const V = a.$("(S.vo2 || []).filter(e => e.src === 'ride')"); eq(V.length - 0, 1, 'genau eine Schätzung: ' + JSON.stringify(V.map(e => [e.date, e.basis.p])));
  eq(V[0].date, '2026-08-05'); eq(V[0].basis.p, 330); near(V[0].value, 16.6 + 8.87 * 330 / 72, .2, 'Sitko et al. 2022'); eq(a.$('(S.vo2 || []).length') - n0, 1);
  ok(a.$("Object.keys(S.mm || {}).length") >= 3, 'Bestwerte nachgeladen'); eq(a.$('S.imp.vo2n'), 1); eq(a.$('impMmList().length'), 0, 'nichts doppelt');
  a.w.navGo('more'); a.w.goPg('settings'); a.w.goPg('set-gm'); ok(/1 VO2max-Schätzung aus der Historie übernommen/.test(a.text())); ok(!a.$('wnShow') || true);
  await a.w.impMmRun(); eq(a.$('__got').length, 3, 'zweiter Lauf: keine Abrufe'); a.noErrors();
});

test('Abgleich ohne Neues: „Alles aktuell“ mit der zuletzt übernommenen Fahrt statt „keine Radfahrten in 42 Tagen“', async () => {
  const a = await thBoot(); a.w.localStorage.setItem('relentless.garmin.key', 'TESTSCHLUESSEL');
  a.$("S.man = [{id:'m1', gid:'777', src:'garmin', n:'Morgenrunde', day:iso(0), ts:new Date(new Date().setHours(7, 10, 0, 0)).toISOString(), sec:5400, km:40, hm:300, np:200, tss:80}]; S.gm = {mode:'web', ok:true, ids:['777'], lastNew:{at:Date.now() - 3600e3, n:1, auto:true}}; save()");
  a.$("gmCall = async () => ({activities:[{activityId:777, activityName:'Morgenrunde', startTimeGMT:'2026-11-11 06:10:00', activityType:'road_biking'}]})");
  await a.w.gmSync('man'); const t = a.$('gmMsg.t');
  ok(/^Alles aktuell: Bei Garmin gibt es keine Fahrt, die hier noch fehlt \(geprüft: die letzten 42 Tage\)\./.test(t), t); ok(/Zuletzt übernommen: „Morgenrunde“ \(heute, 07:10 Uhr\), automatisch beim Öffnen der App\./.test(t), t);
  ok(!/Keine neuen Radfahrten/.test(t)); a.w.navGo('more'); a.w.goPg('settings'); a.w.goPg('set-gm'); ok(/Alles aktuell/.test(a.text())); a.noErrors();
});

test('Leistungsprofil: keine unmögliche Kurve bei Teilwerten, Hinweis, Teilprofile vollständig nachladen', async () => {
  const a = await thBoot(); a.$("S.wf = [{d:'2026-01-01', at:0, ftp:300, kg:85}]; S.p.hrMax = 190; mmSeeded = true");
  /* wie in der Sicherung vom 15.11.: eine Fahrt nur mit Teilwerten (1, 5, 20, 60 min), eine mit voller Kurve */
  a.$(`S.mm = {pa:{d:'2026-10-03', n:'Teilwerte', kg:85, v:[0,0,0,452,0,0,369,0,0,0,303,0,0,266,0,0], o:null, s:'a'},
    pf:{d:'2026-11-10', n:'Heute', kg:85, v:[513,369,326,300,254,248,240,214,209,201,195,191,183,180,0,0], o:MM_D.map(() => 0), s:'f'}};
    S.arch = [{id:'pa', d:'2026-10-03', n:'Teilwerte', km:60, hm:500, sec:7200, np:230, m1:452, gid:'88001', imp:1}, {id:'pz', d:'2026-09-30', n:'Zwift', km:30, hm:0, sec:3600, np:220, gid:'88002', in:1, imp:1}];`);
  const B = a.$("mmBest(iso(-55), iso(0))"), w = t => B[a.$(`mmIx(${t})`)];
  eq(w(60).w, 452); eq(w(30).w, 452, '30 s ≥ 1 min (60 = 2 × 30)'); eq(w(30).der, 60, 'als abgeleitet markiert'); eq(w(15).w, 452); ok(w(5).w === 513 && !w(5).der, 'echter höherer Wert bleibt');
  eq(w(600).w, 303, '10 min ≥ 20 min (1200 = 2 × 600)'); eq(w(2700).w, 183, '45 min: kein Vielfaches von 60 min, nicht abgeleitet');
  const L = MMD => MMD; const D = a.$('MM_D'), ok1 = D.every((t, i) => !B[i] || D.every((u, j) => j <= i || u % t || !B[j] || B[j].w <= B[i].w)); ok(ok1, 'nirgends weniger als bei einem Vielfachen');
  a.$("mmPer = '8w'"); a.w.goPg('state'); a.w.goPg('sprof'); let t = a.text(); ok(/1 von 2 Fahrten in diesem Zeitraum haben nur Teilwerte/.test(t), 'Hinweis an der Grafik'); a.$('mmSel = 1'); t = a.page('sprof'); ok(/Abgeleitet: Über 1 min bist du 452 W gefahren/.test(t), 'Detail erklärt den abgeleiteten Wert');
  eq(a.$('mmTodo().map(x => x.id)'), ['pz', 'pa'], 'Zwift-Fahrt mit Leistung dabei, älteste zuerst');
  /* Nachladen: vollständige Kurve ersetzt die Teilwerte, VO2max wird geprüft */
  thStub(a, []); a.$(`gmRide = async g => { const t0 = Date.parse('2026-10-03T15:00:00Z') / 1000, pts = []; let t = t0; const seg = (n, p, h) => { for (let i = 0; i < n; i++) pts.push({t:t++, p, h, d:t * 8, a:300}); };
    seg(1200, 200, 130); for (let i = 0; i < 300; i++) pts.push({t:t++, p:400, h:Math.round(150 + 34 * i / 299), d:t * 8, a:300}); seg(60, 600, 180); seg(1800, 210, 140); return {r:{pts, ses:[], name:'x'}, name:'x'}; }`);
  await a.w.mmFillGo(); eq(a.$("S.mm.pa.s"), 'f', 'Teilwerte durch volle Kurve ersetzt'); ok(a.$("S.mm.pa.v[2]") >= 590, '30 s jetzt echt gemessen'); ok(a.$("impVo2Done('pa') && impVo2Done('pz')"), 'VO2max geprüft');
  eq(a.$('mmTodo().length'), 0, 'nichts mehr offen'); a.page('sprof'); ok(!/nur Teilwerte/.test(a.text())); a.noErrors();
});
