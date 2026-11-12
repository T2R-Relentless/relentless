/* Audit 12.11.2026: M5, M6, M8–M15 */
R.file = 'm5-m15';
const mEv = d => ({goal:'event', eventName:'Radmarathon', eventDate:'2027-09-05', dist:150, hm:2000, fmt:'mara', ftp:250, weight:75, hours:8, ...d});
const mWeeks = a => { const p = a.$('S.p'), ph = a.$('phases')(p), gw = a.$('genWeek'), out = []; for (let w = 1; w <= ph[ph.length - 1].to; w++) out.push({w, P:ph.find(x => w >= x.from && w <= x.to), pl:gw(p, w)}); return out; };
const mHard = x => ['sst', 'thr', 'vo2'].includes(x.t);

test('M5: Fahrt ohne Leistung: Belastung aus Puls, sonst aus Empfinden', async () => {
  const a = await boot(); makePlan(a, mEv({})); a.$('S.p.lthr = 160; S.d.lthr = 160');
  const L = a.$('loadEst'); eq(L(3600, {hrAvg:160}).tss, 100, 'eine Stunde am Schwellenpuls'); ok(L(3600, {hrAvg:125}).tss < 50, 'lockere Stunde unter 50 TSS');
  eq(L(3600, {rpe:9}).src, 'rpe'); ok(L(3600, {rpe:3}).tss < L(3600, {rpe:8}).tss); eq(L(3600, {}), null);
  eq(a.$("exeLoad({hasP:false, sec:3600, tss:42, hrAvg:150})"), L(3600, {hrAvg:150}).tss); eq(a.$("exeLoad({hasP:true, sec:3600, tss:77})"), 77);
});

test('M6: Pause erkennen, Wiedereinstieg nur nach Zustimmung', async () => {
  const a = await boot({now:at(2026, 12, 9)}); makePlan(a, mEv({startDate:'2026-11-09'}));
  a.$("S.p.start = '2026-11-09'; S.p.startDate = '2026-11-09'; S.wk = curWeek(S.p); S.plan = genWeek(S.p, S.wk); S.man = [{id:'m1', day:'2026-11-25', ts:'2026-11-25T08:00:00Z', sec:3600, km:30, tss:50}]; save()");
  let t = a.page(null); ok(/Längere Pause\?/.test(t) && /\(13 Tage\)/.test(t), 'Karte mit 13 Tagen Pause');
  const min0 = a.$('S.plan').reduce((s, x) => s + (x.m || 0), 0); eq(a.$('S.p.reent'), undefined, 'ohne Zustimmung keine Änderung');
  a.w.reentGo(); const r = a.$('S.p.reent'); eq(r.length, 1); eq(r[0].f, [.7]); ok(a.$('S.plan').filter(mHard).length <= 1, 'eine harte Einheit');
  ok(a.$('S.plan').slice(todayIdxOf(a)).reduce((s, x) => s + (x.m || 0), 0) <= min0, 'weniger Umfang'); ok(!/Längere Pause\?/.test(a.page(null)), 'Karte weg');
  const b = await boot({now:at(2026, 12, 9)}); makePlan(b, mEv({})); b.$("S.p.start = '2026-11-09'; S.p.startDate = '2026-11-09'; S.wk = curWeek(S.p); S.plan = genWeek(S.p, S.wk); S.man = [{id:'m1', day:'2026-11-25', ts:'2026-11-25T08:00:00Z', sec:3600, km:30, tss:50}]");
  b.w.gapNo(); ok(!/Längere Pause\?/.test(b.page(null)), 'Nein, ich habe trainiert'); eq(b.$('S.p.reent'), undefined); a.noErrors(); b.noErrors();
});
const todayIdxOf = a => a.$('todayIdx()');

test('M6: lange Pause: zwei leichte Wochen, nur Sweet Spot, FTP-Vorschlag mit Check', async () => {
  const a = await boot({now:at(2027, 1, 13)}); makePlan(a, mEv({})); a.$("S.p.start = '2026-11-09'; S.p.startDate = '2026-11-09'; S.wk = curWeek(S.p); S.plan = genWeek(S.p, S.wk); S.man = [{id:'m1', day:'2026-12-01', ts:'2026-12-01T08:00:00Z', sec:3600, km:30, tss:50}]");
  a.w.reentGo(); const w = a.$('S.wk'), p = a.$('S.p'), gw = a.$('genWeek');
  [w, w + 1].forEach(q => { const H = gw(p, q).filter(mHard); ok(H.every(x => x.t === 'sst'), `Woche ${q}: nur Sweet Spot`); ok(H.length <= 1); });
  ok(/FTP nach der Pause/.test(a.page(null))); a.w.reentFtpGo(true); eq(a.$('S.p.ftp'), 240, 'FTP −5 %'); ok(a.$('S.p.xTests').includes(w + 2)); a.noErrors();
});

test('M6: Urlaub eintragen: keine Einheiten, danach Wiedereinstieg; Krankheit am Sonntag wirkt am Montag', async () => {
  const a = await boot(); makePlan(a, mEv({})); a.page('set-ali'); ok(/Urlaub und Pausen/.test(a.text()));
  a.w.vacSet('from', '2026-11-23'); a.w.vacSet('to', '2026-12-04'); a.w.vacAdd();
  const p = a.$('S.p'), w3 = a.$('genWeek')(p, 3), w4 = a.$('genWeek')(p, 4), w5 = a.$('genWeek')(p, 5);
  ok(w3.every(x => !x.m) && w3.some(x => x.n === 'Urlaub'), 'Woche 3 frei'); ok(w4.slice(0, 5).every(x => !x.m), 'Mo–Fr Woche 4 frei');
  ok(w5.reduce((s, x) => s + (x.m || 0), 0) < a.$('genWeek')({...p, vac:[]}, 5).reduce((s, x) => s + (x.m || 0), 0), 'danach weniger Umfang');
  ok(w5.filter(mHard).length <= 1, '12 Tage Urlaub: danach eine harte Einheit');
  const id = a.$('S.p.vac[0].id'); a.w.vacDel(id); ok(a.$('genWeek')(a.$('S.p'), 3).some(x => x.m > 0), 'gelöscht → wieder geplant');
  a.$("S.plan[6] = {...S.plan[6]}"); a.w.feelDay(6, 'sick'); const n = a.$('S.p.sickNext'); eq(n.w, 2); eq(n.d, [0, 1]);
  const mon = a.$('genWeek')(a.$('S.p'), 2); ok(mon.slice(0, 2).every(x => !mHard(x) && x.t !== 'long'), 'Montag und Dienstag locker'); a.noErrors();
});

test('M8: lange Pläne: Vorbereitung, Basis und Aufbau höchstens 12, Spitze höchstens 6, Phasenende mit Entlastung', async () => {
  const a = await boot(); makePlan(a, mEv({eventDate:'2027-10-03'})); const ph = a.$('phases')(a.$('S.p'));
  const g = k => ph.filter(x => x.key === k && !x.prep); ok(ph[0].prep && ph[0].name === 'Allgemeine Vorbereitung', 'Vorbereitung zuerst');
  ok(g('base')[0].weeks <= 12 && g('build')[0].weeks <= 12 && g('peak')[0].weeks <= 6 && g('peak')[0].weeks >= 3, ph.map(x => x.name + ' ' + x.weeks).join(', '));
  ok(a.$('recWk')(a.$('S.p'), g('base')[0].to) && a.$('recWk')(a.$('S.p'), g('build')[0].to), 'Basis und Aufbau enden mit Entlastung');
  const W = mWeeks(a); ok(W.filter(x => x.P.prep).every(x => x.pl.filter(mHard).length <= 1), 'Vorbereitung bei 8 Std.: höchstens eine harte Einheit');
  const c = await boot(); makePlan(c, mEv({eventDate:'2027-10-03', hours:5, ftp:270, avail:[false, true, false, true, false, true, true], longDay:6})); ok(mWeeks(c).filter(x => x.P.prep && x.w > 4 && !c.$('recWk')(c.$('S.p'), x.w) && !x.pl.some(y => y.t === 'test')).every(x => x.pl.filter(mHard).length === 2), 'Vorbereitung bei 5 Std.: zweite kurze Einheit (M4)');
  const b = await boot(); makePlan(b, mEv({eventDate:'2027-02-14'})); ok(!b.$('phases')(b.$('S.p')).some(x => x.prep), 'kurze Pläne ohne Vorbereitung');
});

test('M8: VO2max-Block als Option', async () => {
  const a = await boot(); makePlan(a, mEv({ftp:290, weight:75, hours:10, vo2blk:true, avail:[false, true, true, true, true, true, true], longDay:6}));
  const W = mWeeks(a), blk = W.filter(x => x.pl.filter(y => y.t === 'vo2').length >= 3); eq(blk.length, 1, 'genau eine Blockwoche'); eq(blk[0].P.key, 'build');
  ok(a.$('recWk')(a.$('S.p'), blk[0].w + 1), 'direkt vor einer Entlastungswoche');
  const b = await boot(); makePlan(b, mEv({ftp:290, weight:75, hours:10, avail:[false, true, true, true, true, true, true], longDay:6})); ok(!mWeeks(b).some(x => x.pl.filter(y => y.t === 'vo2').length >= 3), 'ohne Option kein Block');
  b.$('edit(); S.step = 4; render()'); ok(/VO2max-Block im Aufbau/.test(b.text()), 'Option in der Planung sichtbar');
});

test('M9: Gesundheitshinweis bis zur Bestätigung, danach in den Einstellungen; Überlastung erst ab zwei Zeichen', async () => {
  const a = await boot(); makePlan(a, mEv({})); ok(/Bevor du loslegst/.test(a.page(null))); a.$('S.hlthOk = iso(0)'); ok(!/Bevor du loslegst/.test(a.page(null)));
  ok(/Gesundheitshinweis\s+Gelesen/.test(a.page('settings'))); ok(/ärztliche Beratung/.test(a.page('set-health')));
  a.$("S.p.exe = {'1-1':{verdict:'under', at:Date.now()}, '1-2':{verdict:'under', at:Date.now()}}"); ok(!/Viel Belastung, wenig Erholung/.test(a.page(null)), 'ein Zeichen reicht nicht');
  a.$("S.mo = {[iso(0)]:{sleep:'bad'}, [iso(-1)]:{sleep:'bad'}, [iso(-2)]:{sleep:'bad'}}"); ok(/Viel Belastung, wenig Erholung/.test(a.page(null)), 'zwei Zeichen');
  a.$("S.ovlSeen = iso(0)"); ok(!/Viel Belastung/.test(a.page(null)), 'eine Woche Ruhe'); a.noErrors();
});

test('M10: Wechsel Winter → Sommer stufenweise, Rückgang sofort', async () => {
  const a = await boot(); makePlan(a, mEv({eventDate:'2027-07-04', tb:{on:true, prof:{w:{h:4, days:4, avail:[false, true, false, true, false, true, true]}, s:{h:10, days:4, avail:[false, true, false, true, false, true, true]}}, mon:['w','w','w','s','s','s','s','s','s','s','w','w'], dev:{}}}));
  const p = a.$('S.p'), H = []; for (let w = 18; w <= 26; w++) H.push(a.$('tbApply')(p, w).hours);
  for (let i = 1; i < H.length; i++) ok(H[i] - H[i - 1] <= Math.max(1, H[i - 1] * .15) + .5, 'höchstens +1 Std. bzw. 15 %: ' + H.join(', '));
  ok(H[H.length - 1] === 10 && H[0] === 4, 'Start 4, Ziel 10: ' + H.join(', '));
});

test('M11: Long Ride mit hartem Finale jede zweite Aufbauwoche (Events über 3 Std.)', async () => {
  const a = await boot(); makePlan(a, mEv({})); const B = mWeeks(a).filter(x => x.P.key === 'build' && !a.$('recWk')(a.$('S.p'), x.w)), L = B.map(x => x.pl.find(y => y.t === 'long')).filter(Boolean);
  const F = L.filter(y => y.fin); ok(F.length >= 2 && F.length <= Math.ceil(L.length / 2) + 1, `${F.length} von ${L.length}`); ok(/an der Schwelle/.test(F[0].st));
  ok(a.$('tss')(F[0]) > a.$('tss')({...F[0], fin:null, hi:75}), 'Finale erhöht die Belastung');
  const b = await boot(); makePlan(b, mEv({dist:60, hm:400, fmt:'mara'})); ok(!mWeeks(b).some(x => x.pl.some(y => y.fin)), 'kurzer Marathon ohne Finale');
});

test('M12: Kraft: nach 12 schweren Wochen Erhaltung, in Rennwochen höchstens eine und nicht in den drei Tagen davor, Hinweis zur Reihenfolge', async () => {
  const a = await boot(); makePlan(a, mEv({eventDate:'2027-10-03', strN:2, strLvl:'exp'})); const p = a.$('S.p'), so = a.$('strOf');
  const K = mWeeks(a).filter(x => x.P.key !== 'taper').map(x => ({w:x.w, s:Object.values(so(p, x.w, x.pl))}));
  const heavy = K.filter(x => x.s.some(s => s.kind === 'base' || s.kind === 'build')); ok(heavy.length <= 12, 'höchstens 12 schwere Wochen: ' + heavy.length);
  ok(K.slice(-10).every(x => x.s.length <= 1), 'danach eine Einheit pro Woche');
  const b = await boot(); makePlan(b, mEv({season:true, strN:2}), [{name:'Rundfahrt B', date:'2027-05-09', prio:'B', dist:100, hm:1000}]);
  const bw = mWeeks(b).find(x => x.pl.some(y => y.t === 'race')), ri = bw.pl.findIndex(y => y.t === 'race'), S2 = b.$('strOf')(b.$('S.p'), bw.w, bw.pl);
  ok(Object.keys(S2).length <= 1 && Object.keys(S2).every(j => +j > ri || ri - j > 3), 'Rennwoche: ' + JSON.stringify(Object.keys(S2)) + ' Rennen ' + ri);
  const c = await boot(); makePlan(c, mEv({hours:5, strN:2, avail:[false, true, false, true, false, true, true], longDay:6}));
  let same = 0; mWeeks(c).forEach(x => Object.entries(c.$('strOf')(c.$('S.p'), x.w, x.pl)).forEach(([j, s]) => { if (s.same) { same++; ok(mHard(x.pl[j]) || x.pl[j].t === 'test'); } }));
  if (same) { c.$('strWeek = 1; strMap = ' + JSON.stringify({1:{...c.$('strSession')(c.$('S.p'), 'base'), same:true}})); ok(/erst Rad, dann Kraft/.test(c.w.strBlock(1, false)), 'Hinweis zur Reihenfolge'); }
});

test('M13: Prüfung über die Wochengrenze und bei drei harten Einheiten', async () => {
  const a = await boot(); makePlan(a, mEv({hours:6})); const B = a.$('S.plan'), H = {...B.find(mHard)};
  const P = B.map((x, i) => i === 6 ? {...H} : x), nx = a.$('genWeek')(a.$('S.p'), 2)[0];
  const w1 = a.w.paCheck(P, B, {w:1}).warns.join(' '); ok(mHard(nx) || nx.t === 'long' ? /der nächsten Woche wären dann zwei harte Tage/.test(w1) : true, w1);
  const P3 = B.map((x, i) => [0, 2, 4].includes(i) ? {...H} : x.t === 'long' ? x : {...x, t:'base'}), w3 = a.w.paCheck(P3, B.map(x => mHard(x) ? {...x, t:'base'} : x), {w:1}).warns.join(' ');
  ok(/3 harte Einheiten/.test(w3), w3);
});

test('M14/M15: Hitze-Hinweis, C-Rennen ohne Tapering im Text, Eventtyp wählbar, Kohlenhydratladen einheitlich', async () => {
  const a = await boot(); makePlan(a, mEv({})); a.$('S.hlthOk = iso(0)');
  const t = a.$('todayIdx()'); a.$(`S.plan[${t}] = {...S.plan[${t}], t:'thr', m:60, n:'Schwelle 3×10'}; S.wx = {name:'Testort'}; S.wxData = {t:[], T:[], P:[], R:[], W:[]}; for (let h = 0; h < 24; h++) { S.wxData.t.push(iso(0) + 'T' + String(h).padStart(2, '0') + ':00'); S.wxData.T.push(31); S.wxData.P.push(0); S.wxData.R.push(0); S.wxData.W.push(5); }`);
  ok(/Heute wird es heiß: bis 31 °C/.test(a.page(null))); a.$('S.heatSeen = iso(0)'); ok(!/Heute wird es heiß/.test(a.page(null)));
  ok(/ohne Tapering davor/.test(a.$('subsUi(S.d)')) && !/nur der Tag davor ist locker/.test(a.$('subsUi(S.d)')));
  a.$("edit(); S.d.evTy = 'alpin'"); eq(a.$('evProfile(S.d).ty'), 'alpin'); a.$("delete S.d.evTy"); ok(a.$('evProfile(S.d).ty') !== 'alpin');
  ok(/36 bis 48 Std\. vorher Kohlenhydrate laden \(10 bis 12 g pro kg und Tag\)/.test(a.$("efStrat({r:{tev:300}, prio:'A'}).txt")));
  ok(a.$('TIPS').some(x => x[0] === 'w13' && /Hitze|Wärme/.test(x[3])));
});
