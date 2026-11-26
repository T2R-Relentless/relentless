/* Paket C (F35): Herkunft von FTP und Gewicht, sanfter Einstieg bei geschätztem FTP, Zonen, Eventtag-Intensität */
R.file = 'paketc';
const PC_D = {mode:'light', lvl:'hob', hours:8, goal:'event', evId:'oetz', eventName:'Ötztaler Radmarathon', eventDate:'2027-08-29', dist:227, hm:5500, startDate:'2026-11-16', avail:[true, true, true, true, true, true, true]};
const pcLight = (a, o) => { a.$(`S = load(true); S.d = Object.assign(S.d, ${JSON.stringify({...PC_D, weight:75, kgHk:'eingegeben', ...(o || {})})}); S.step = 4; ensureBuiltin(S.d);`); a.w.lightFinish(); a.noErrors('Schnellplanung'); };
const pcMax = x => { if (!x || !x.m) return 0; let h = x.hi || 0; if (x.iv) h = Math.max(h, x.iv.hi || 0, x.iv.rhi || 0); if (x.fin) h = Math.max(h, x.fin.hi); return h; };

test('Herkunft: Ableitung für ältere Pläne, Plan bleibt unverändert', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20', ftp:250, hours:8});
  a.$('delete S.p.ftpHk; delete S.p.kgHk; delete S.p.sanft; delete S.p.ifd; delete S.d.ftpHk; delete S.d.kgHk; delete S.d.ifd; save();');
  const before = a.$('JSON.stringify([1, 2, 3].map(w => genWeek(S.p, w)))');
  const b = await boot({store:a.store()});
  eq([b.$('S.p.ftpHk'), b.$('S.p.kgHk'), b.$('S.p.ifd')], ['eingegeben', 'geschaetzt', 0], 'ausführlich geplant mit 75 kg, Eventdauer wie bisher');
  eq(b.$('JSON.stringify([1, 2, 3].map(w => genWeek(S.p, w)))'), before, 'gleiche Wochen'); b.noErrors();
  eq(a.$("hkFtpOf({mode:'light', ftp:205, ftpStart:205})"), 'geschaetzt');
  eq(a.$("hkFtpOf({mode:'light', ftp:205, ftpKnown:205})"), 'eingegeben');
  eq(a.$("hkFtpOf({mode:'light', ftp:230, ftpStart:205, res:{1:{adopted:true}}})"), 'gemessen');
  eq(a.$("hkFtpOf({ftpSrc:'data', ftpConf:'mittel', ftp:240})"), 'gemessen', 'Fahrten ab mittel');
  eq(a.$("hkFtpOf({ftpSrc:'data', ftpConf:'gering', ftp:240})"), 'geschaetzt');
  eq(a.$('hkKgOf({weight:75})'), 'geschaetzt'); eq(a.$('hkKgOf({weight:72})'), 'eingegeben');
});

test('Sicherungsdatei: Pläne ohne Herkunft bekommen sie beim Hinzufügen', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20', ftp:250, hours:8});
  const e = a.$('(() => { const s = snapOf(); delete s.p.ftpHk; delete s.p.kgHk; return {app:"relentless", v:1, plans:[{id:"x1", name:"Alt", snap:s}]}; })()');
  a.$(`bkImp = {o:${JSON.stringify(e)}, name:'alt.json', full:false, n:1}; bkAddPlans();`);
  const p = Object.values(a.$('readLib()').plans).find(x => x.name === 'Alt'); ok(p, 'Plan hinzugefügt'); eq(p.snap.p.ftpHk, 'eingegeben'); a.noErrors();
});

test('Schnellplanung ohne FTP: Test vorausgewählt, Woche 1 und 2 ohne Belastung über 85 %', async () => {
  const a = await boot(); pcLight(a);
  eq([a.$('S.p.ftpHk'), !!a.$('S.p.test0'), a.$('S.p.sanft')], ['geschaetzt', true, 1]);
  const w1 = a.$('genWeek(S.p, 1)'), w2 = a.$('genWeek(S.p, 2)'), rides = w1.map((x, j) => [x, j]).filter(([x]) => x.m > 0);
  eq(rides[1][0].t, 'test', 'Test am 2. Trainingstag'); eq(rides[0][0].n, 'Einführungsfahrt');
  ok(w1.every(x => x.t === 'test' || pcMax(x) <= 85), 'Woche 1 bis 85 %'); ok(w2.every(x => x.t === 'test' || pcMax(x) <= 85), 'Woche 2 bis 85 %');
  ok(w2.some(x => x.n === 'Tempo 3×10'), 'Woche 2 mit Tempo nach Gefühl');
  ok(Math.max(...w1.filter(x => x.t === 'long').map(x => x.m)) <= 120, 'Long Ride Hobby höchstens 2 Std.');
  const t = w1.find(x => x.t === 'test'); ok(/Brustschmerz/.test(t.st), 'Sicherheitshinweis vor dem ersten Maximaltest');
});

test('Nach übernommenem Starttest: Sweet Spot 3×10 in Woche 2, kein VO2max', async () => {
  const a = await boot(); pcLight(a);
  a.$("S.p.res = {1:{date:'2026-11-17', kind:'20', val:240, ftp:228, base:205, st:'base'}}; S.d.res = S.p.res; setFtpNow(228, 1);");
  eq(a.$('S.p.ftpHk'), 'gemessen'); ok(a.$('bkUndo') && /Fitness-Checks/.test(a.$('bkUndo.why')), 'Schnappschuss mit Rückgängig');
  const w2 = a.$('genWeek(S.p, 2)'); ok(w2.some(x => x.n === 'Sweet Spot 3×10'), 'unterste Stufe'); ok(!w2.some(x => x.t === 'vo2'), 'kein VO2max'); a.noErrors();
});

test('Einsteiger: zwei Wochen nur Grundlage, Starttest in Woche 3', async () => {
  const a = await boot(); pcLight(a, {lvl:'new'});
  eq(a.$('t0W(S.p)'), 3); ok([1, 2].every(w => a.$(`genWeek(S.p, ${w})`).every(x => !['sst', 'thr', 'vo2', 'test'].includes(x.t))), 'nur Grundlage');
  ok(a.$('genWeek(S.p, 3)').some(x => x.t === 'test'), 'Test in Woche 3');
});

test('Rampentest mit Rolle, ohne Test ebenfalls bis 85 %, ältere Pläne ohne sanft unverändert', async () => {
  const a = await boot(); pcLight(a, {testArt:'ramp'});
  eq(a.$('genWeek(S.p, 1).find(x => x.t === "test").n'), 'Fitness-Check: Rampentest');
  pcLight(a, {test0:false}); ok(a.$('genWeek(S.p, 1)').every(x => pcMax(x) <= 85), 'abgelehnt: Woche 1 bis 85 %');
  a.$('delete S.p.sanft'); ok(a.$('genWeek(S.p, 1)').some(x => x.t === 'sst'), 'ohne sanft wie bisher');
});

test('Gewicht ab 1.500 hm Pflicht, Hinweise „geschätzt“ an allen vier Stellen', async () => {
  const a = await boot();
  a.$(`S = load(true); S.d = Object.assign(S.d, ${JSON.stringify(PC_D)}); S.step = 2; ensureBuiltin(S.d); render();`);
  ok(/Gewicht \(kg\), Pflicht/.test(a.text()), 'Pflichtfeld'); a.w.lightNav(3); eq(a.$('S.step'), 2, 'bleibt in Schritt 2'); ok(/Bitte trag dein Gewicht ein/.test(a.text()), 'Hinweis');
  a.$("S.d.kgHk = 'geschaetzt'; S.d.weight = 75;"); a.w.lightFinish(); eq(a.$('S.p'), null, 'kein Plan ohne Gewicht');
  pcLight(a); a.$("S.p.kgHk = S.d.kgHk = 'geschaetzt'; S.wk = 1; S.plan = genWeek(S.p, 1);");
  ok(/Dein FTP ist geschätzt, Test einplanen/.test(a.page(null)) && /FTP geschätzt/.test(a.text()), 'Heute');
  a.page('settings'); ok(/FTP \d+ W \(geschätzt\) · 75 kg \(geschätzt\)/.test(a.text()), 'Einstellungen');
  ok(/Prognose mit Schätzwerten/.test(a.page('check')), 'Plan-Check'); a.page('state'); ok(/FTP \d+ W \(geschätzt\)/.test(a.text()), 'Fortschritt');
  a.page('set-wf'); a.w.hkKgOk(); eq(a.$('S.p.kgHk'), 'eingegeben', '„Stimmt“ bestätigt das Gewicht'); a.noErrors();
});

test('Zonen: Sweet Spot hat ein eigenes Etikett, Zone aus der Mitte', async () => {
  const a = await boot();
  eq(a.$("znLbl({t:'sst', lo:88, hi:94, m:60})"), 'Sweet Spot'); eq(a.$("znLbl({t:'thr', lo:95, hi:105, m:60})"), 'Z4');
  eq(a.$("znLbl({t:'base', lo:56, hi:75, m:60})"), 'Z2'); eq(a.$("znLbl({t:'vo2', lo:106, hi:120, m:60})"), 'Z5');
  eq(a.$("znLbl({t:'sst', lo:76, hi:85, m:60})"), 'Z3', 'Tempo'); eq(a.$("znOf({t:'vo2', lo:150, hi:200, m:60}).b"), 'hoch');
});

test('Eventtag: Abschlag ab 3 Std. für Zielzeit, Belastung und Pacing (Ötztaler, Rund um Köln)', async () => {
  const a = await boot();
  const r = id => a.$(`(() => { const e = EVS.find(x => x.id === '${id}'), p = {goal:'event', evId:e.id, eventName:e.n, dist:e.km, hm:e.hm, ftp:205, weight:75, draft:'grp', targetTime:''}; if (e.cp) p.course = courseFromCP(e); const t = evTime(p, 205, 75, 'grp'), x = D('long', 'Eventtag: x', t, 60, 85); return {t, tss:tss(x), pace:paceTxt(p, {tev:t})}; })()`);
  const o = r('oetz'), k = r('ruk120');
  ok(Math.abs(o.tss - 584) <= 6, 'Ötztaler TSS etwa 584, erhalten ' + o.tss); ok(o.t >= 715 && o.t <= 735, 'Ötztaler etwa 12 Std., erhalten ' + o.t);
  ok(/in der ersten Hälfte höchstens 78 %, im letzten Drittel höchstens 73 %/.test(o.pace), 'Pacing am Berg');
  ok(Math.abs(k.tss - 300) <= 6, 'Köln TSS etwa 300, erhalten ' + k.tss); ok(/an Anstiegen höchstens 94 %/.test(k.pace), 'Köln: Pacing wie bisher');
  eq(a.$('Math.round(ifEv(120) * 1000)'), a.$('Math.round(ifEv(120, 0) * 1000)'), 'unter 3 Std. kein Abschlag');
});
