/* F30: Mehrere Fahrten an einem Tag (Anfahrt wurde als Training gewertet) */
R.file = 'mehrfahrten';
/* Synthetische Fahrt mit 1 Hz ab t0 (Sekunden): Abschnitte [Dauer s, Watt, Puls], Strecke nach Osten (draußen) */
function mfRideR(t0, segs, name){
  const pts = []; let t = t0, d = 0, k = 0;
  segs.forEach(([sec, w, h]) => { for (let i = 0; i < sec; i++) { d += 8; pts.push({t:t++, d, a:200 + Math.sin(k / 500) * 20, p:w == null ? null : w + ((k * 7) % 5) - 2, h, lat:50.1 + d / 2e6, lon:8.6 + d / 1e6}); k++; } });
  return {pts, ses:[], name:name || 'Fahrt'};
}
const mfT = (h, mi, dd = 10) => at(2026, 11, dd, h, mi) / 1000;
/* Wie der Garmin-Abgleich: einlesen, Zeitreihe anhängen, sofort zuordnen (exeAuto) */
function mfImp(a, r, name){ a.w.__r = r; return a.$(`(() => { const x = summarize(__r, ${JSON.stringify(name)}); x.n = ${JSON.stringify(name)}; x.src = 'garmin'; vzAttach(x, __r); const hw = hrHist(__r, 600); if (hw) x.hrW = hw; S.man = S.man || []; S.man.push(x); exeAuto(x, streamOf(__r), hrHist(__r)); return x.id; })()`); }
/* Plan mit Schwelleneinheit am Dienstag (10.11.2026, Uhr steht auf Mittwoch 11.11.) */
const THR = {t:'thr', n:'Schwelle 3×12', m:75, lo:95, hi:105, cad:'90 U/min', st:'3 × 12 Min. an der Schwelle', iv:{reps:3, work:12, rest:5, lo:95, hi:105, wu:15, cd:9}};
async function mfBoot(unit){
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-06-20', ftp:250, hours:8});
  a.$(`S.p.start = '2026-11-09'; S.wk = 1; S.plan = genWeek(S.p, 1); S.plan[1] = ${JSON.stringify(unit || THR)}; S.done = {}; S.p.exe = {}; S.p.exeP = {}; S.p.extra = {}; S.man = []; cheerShow = null; save();`);
  eq(a.$('dstr(1)'), '2026-11-10', 'Dienstag der Planwoche'); return a;
}
/* Anfahrt 20 Min. locker, 8 Min. Pause, Training 75 Min. mit 3 × 12 Min. Schwelle */
const RIDE_A = () => mfRideR(mfT(17, 0), [[1200, 140, 118]], 'Anfahrt');
const RIDE_B = (t0 = mfT(17, 28)) => mfRideR(t0, [[900, 150, 125], [720, 250, 165], [300, 140, 135], [720, 250, 168], [300, 140, 136], [720, 252, 170], [540, 140, 130]], 'Training');
const mfKey = '1-1';

test('Testfall: Anfahrt + Training, bisher wurde die Anfahrt bewertet, jetzt das Training', async () => {
  const a = await mfBoot();
  const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training');
  /* Verhalten vor F30 (nur exeAuto): erste Fahrt des Tages = Einheit, zweite = Zusatzfahrt */
  eq(a.$(`S.p.exe['${mfKey}'].rid`), A, 'bisher: Anfahrt zugeordnet'); const s0 = a.$(`S.p.exe['${mfKey}'].score`); ok(a.$(`!!S.p.extra['${B}']`), 'bisher: Training als Zusatzfahrt');
  R.f30 = {oldScore:s0, oldGrade:a.$(`S.p.exe['${mfKey}'].grade`)};
  const t = a.$(`mfAfterImport(['2026-11-10'])`);
  eq(a.$(`S.p.exe['${mfKey}'].rid`), B, 'jetzt: Training zugeordnet'); ok(a.$(`S.p.exe['${mfKey}'].score`) >= 85, 'Training gut bewertet'); ok(a.$(`!!S.p.extra['${A}'] && !S.p.extra['${B}']`), 'Anfahrt ist Zusatzfahrt, Training nicht mehr');
  const sc = a.$(`(() => { const R = mfCompute('2026-11-10'); return R.cands.map(c => [c.ids.join('+'), c.sc['${mfKey}'].v]); })()`);
  R.f30.scores = sc; ok(sc.find(z => z[0] === B)[1] > .8 && sc.find(z => z[0] === A)[1] < .2, 'Passwerte: ' + JSON.stringify(sc));
  eq(a.$(`S.p.mf.sug['2026-11-10']`), [A, B, 8], 'Vorschlag „Zusammenführen“ (8 Min. Pause)'); ok(!a.$(`S.p.mf.ask['2026-11-10']`), 'keine Rückfrage, Zuordnung ist eindeutig');
  ok(/3 × 12 Min\. Schwelle erkannt/.test(t), 'Meldung nennt den Grund: ' + t); ok(/Zusammenführen/.test(t), 'Meldung nennt den Vorschlag');
  const wk = a.page('week'); ok(/Gehören diese Fahrten zusammen\?/.test(wk) && /2 Fahrten an diesem Tag/i.test(wk), 'Karte in der Woche');
  a.noErrors();
});

test('Pause 3 Std. (morgens Pendeln, abends Training): kein Vorschlag, Training zugeordnet', async () => {
  const a = await mfBoot();
  const A = mfImp(a, mfRideR(mfT(7, 30), [[1800, 135, 115]], 'Arbeitsweg'), 'Arbeitsweg'), B = mfImp(a, RIDE_B(mfT(18, 0)), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  eq(a.$(`S.p.exe['${mfKey}'].rid`), B); ok(!a.$(`S.p.mf.sug['2026-11-10']`), 'kein Vorschlag „Zusammenführen“'); ok(a.$(`!!S.p.extra['${A}']`)); a.noErrors();
});

test('Zwei geplante Einheiten (Pendeltag) und zwei Fahrten: richtige Kreuzzuordnung', async () => {
  const unit = {t:'com', n:'Pendeln', m:60, parts:[{lbl:'Hinweg', m:30, lo:56, hi:70}, {lbl:'Rückweg', m:30, iv:{reps:2, work:8, rest:4, lo:88, hi:94, wu:5, cd:5}}]};
  const a = await mfBoot(unit);
  /* Intervalle morgens, lockere Fahrt abends: nach Uhrzeit allein würde die App es genau falsch herum zuordnen */
  const I = mfImp(a, mfRideR(mfT(7, 30), [[300, 140, 120], [480, 228, 160], [240, 140, 130], [480, 230, 162], [300, 140, 128]], 'Intervalle'), 'Intervalle');
  const E = mfImp(a, mfRideR(mfT(17, 30), [[1800, 150, 118]], 'Locker'), 'Locker');
  eq(a.$(`exePArr(1, 1).map(e => e && e.rid)`), [I, E], 'bisher: nach Uhrzeit (falsch)');
  a.$(`mfAfterImport(['2026-11-10'])`);
  eq(a.$(`exePArr(1, 1).map(e => e && e.rid)`), [E, I], 'jetzt: Hinweg locker, Rückweg Intervalle'); ok(a.$(`exePArr(1, 1)[1].score`) >= 80, 'Intervalle gut bewertet'); a.noErrors();
});

test('Zwei ähnlich passende Fahrten: Rückfrage, vorläufige Zuordnung, Antwort wird gemerkt', async () => {
  const a = await mfBoot({t:'base', n:'Grundlage', m:60, lo:56, hi:72, cad:'90 U/min', st:'Locker'});
  const A = mfImp(a, mfRideR(mfT(8, 0), [[3600, 165, 125]], 'Morgens'), 'Morgens'), B = mfImp(a, mfRideR(mfT(18, 0), [[3540, 160, 124]], 'Abends'), 'Abends');
  a.$(`mfAfterImport(['2026-11-10'])`); const q = a.$(`S.p.mf.ask['2026-11-10']`); ok(q && q.open && q.unit === mfKey, 'Rückfrage offen');
  const cur = a.$(`S.p.exe['${mfKey}'].rid`); ok(a.$(`S.p.mf.r['${cur}'].prov`) === 1, 'vorläufig'); ok(/Welche Fahrt war dein Training\?/.test(a.page('week')) && /vorläufig/.test(a.page('week')), 'Rückfrage in der Woche');
  const other = cur === A ? B : A; a.w.mfAnswer('2026-11-10', other);
  eq(a.$(`S.p.exe['${mfKey}'].rid`), other, 'Antwort übernommen'); ok(a.$(`S.p.mf.ask['2026-11-10'].done`), 'Rückfrage erledigt'); ok(!/Welche Fahrt war dein Training\?/.test(a.page('week')));
  a.$(`mfAfterImport(['2026-11-10'])`); eq(a.$(`S.p.exe['${mfKey}'].rid`), other, 'keine erneute Frage, Antwort bleibt'); ok(!a.$(`S.p.mf.ask['2026-11-10'].open`)); a.noErrors();
});

test('Gerät neu gestartet im 2. Intervall: zusammengeführt, kein Intervall über die Pause', async () => {
  const a = await mfBoot();
  const B1 = mfImp(a, mfRideR(mfT(17, 0), [[900, 150, 125], [720, 250, 165], [300, 140, 135], [360, 250, 165]], 'Teil 1'), 'Teil 1');
  const B2 = mfImp(a, mfRideR(mfT(17, 39, 10) + 60, [[360, 250, 166], [300, 140, 136], [720, 252, 170], [540, 140, 130]], 'Teil 2'), 'Teil 2');
  a.$(`mfAfterImport(['2026-11-10'])`); const sg = a.$(`S.p.mf.sug['2026-11-10']`); ok(sg && sg[2] <= 3, 'Vorschlag „Zusammenführen“ (2 Min. Pause)');
  a.w.mfJoin(B1, B2, 'suggestion-accepted'); const gid = a.$(`mfGid('${B1}')`); ok(gid, 'Gruppe angelegt'); eq(a.$(`S.p.mf.g['${gid}'].by`), 'suggestion-accepted');
  const e = a.$(`S.p.exe['${mfKey}']`); eq(e.rid, gid, 'Gruppe erfüllt die Einheit'); const brk = a.$(`S.man.find(x => x.id === '${B1}').sec`);
  ok(e.iv.every(f => !f.s || f.s + f.d <= brk || f.s >= brk), 'kein Intervall über die Abschnittsgrenze (' + brk + ' s): ' + JSON.stringify(e.iv.map(f => [f.s, f.d, f.st])));
  eq(e.iv.filter(f => f.st === 'in').length, 2, 'Intervall 1 und 3 erkannt, das geteilte zweite nicht als ein Block'); ok(a.$(`!!S.p.exe['${mfKey}'].ser.gaps.length`), 'Grafik mit sichtbarer Lücke');
  a.noErrors();
});

test('Gruppe: Summen, NP ohne Pause als Null, TSS nicht doppelt (Formkurve gleich)', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  const day = () => a.$(`Math.round(vzDaily()['2026-11-10'])`), d0 = day(), ra = a.$(`S.man.find(x => x.id === '${A}')`), rb = a.$(`S.man.find(x => x.id === '${B}')`);
  eq(d0, ra.tss + rb.tss, 'Tages-TSS = Summe beider Fahrten');
  a.w.mfJoin(A, B); const gid = a.$(`mfGid('${A}')`), e = a.$(`S.p.exe['${mfKey}']`);
  eq(e.sec, ra.sec + rb.sec, 'Dauer summiert (Pause nicht)'); eq(e.tss, ra.tss + rb.tss, 'TSS summiert'); near(e.km, ra.km + rb.km, .11, 'Distanz summiert');
  const np = Math.round(Math.pow((ra.np ** 4 * ra.sec + rb.np ** 4 * rb.sec) / (ra.sec + rb.sec), .25)); eq(e.np, np, 'NP über die Bewegungszeit beider Fahrten');
  ok(e.np > Math.round((ra.np * ra.sec + rb.np * rb.sec) / (ra.sec + rb.sec + 480)), 'Pause nicht als 0 W eingerechnet');
  eq(day(), d0, 'Formkurve: gleicher Tages-TSS als Gruppe'); a.w.mfCommute(A); eq(day(), d0, '… und nach dem Markieren als Pendeln');
  eq(a.$(`S.p.extra['${gid}'] ? 'g' : (S.p.exe['${mfKey}'] || {}).rid`), B, 'Gruppe als Pendeln: Training wieder allein zugeordnet'); a.noErrors();
});

test('Pendeln markiert: zählt zur Belastung, keine Bewertung, Einheit bleibt offen', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  const d0 = a.$(`Math.round(vzDaily()['2026-11-10'])`);
  a.w.mfCommute(A); ok(!a.$(`S.p.extra['${A}']`), 'Pendelfahrt ist keine Zusatzfahrt'); eq(a.$(`S.lb['${A}'].k`), 'c', 'Logbuch: Pendeln'); eq(a.$(`S.p.exe['${mfKey}'].rid`), B);
  a.w.mfCommute(B); ok(!a.$(`S.p.exe['${mfKey}']`), 'beide Pendeln: Einheit ohne Bewertung'); ok(!a.$('S.done[1]'), 'Einheit bleibt offen'); a.$('analyze()'); ok(!a.$('S.done[1]'), 'auch nach dem Abgleich offen');
  eq(a.$(`Math.round(vzDaily()['2026-11-10'])`), d0, 'Belastung unverändert');
  a.$("lbF = 'c'"); const lb = a.page('logbook'); ok(/Anfahrt\/Pendeln/.test(lb) && /Pendeln/.test(lb), 'Filter „Pendeln“ im Logbuch'); a.$("lbF = 'all'"); a.noErrors();
});

test('Nutzerzuordnung übersteht erneuten Import und Neuberechnung', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  a.w.mfTrain(A, mfKey); eq(a.$(`S.p.exe['${mfKey}'].rid`), A, 'Nutzer wertet die Anfahrt als Training'); eq(a.$(`S.p.mf.r['${A}'].src`), 'user');
  ok(/Neu bewertet nach Änderung der Zuordnung/.test(a.$(`S.p.exe['${mfKey}'].adj`)), 'Vermerk „neu bewertet“');
  const C = mfImp(a, mfRideR(mfT(20, 0), [[1500, 150, 120]], 'Abends'), 'Abends'); a.$(`mfAfterImport(['2026-11-10'])`); a.$('exeHrSync(true)'); a.$(`mfResolve('2026-11-10', {force:1, re:1})`);
  eq(a.$(`S.p.exe['${mfKey}'].rid`), A, 'bleibt nach Import und Neuberechnung'); ok(a.$(`!!S.p.extra['${C}'] && !!S.p.extra['${B}']`)); a.noErrors();
});

test('Rückgängig stellt den Zustand exakt wieder her, Trennen stellt Einzelfahrten wieder her', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`); a.$('save()');
  const st = () => a.$(`JSON.stringify([MF_SK.map(k => S[k]), MF_PK.map(k => S.p[k])])`), s0 = st();
  a.w.mfJoin(A, B); ok(st() !== s0); ok(/Fahrten zusammengeführt/.test(a.text()), 'Hinweis mit „Rückgängig“'); a.w.mfUndoGo(); eq(st(), s0, 'Zusammenführen rückgängig: exakt');
  a.w.mfCommute(A); a.w.mfUndoGo(); eq(st(), s0, 'Pendeln rückgängig'); a.w.mfTrain(A, mfKey); a.w.mfUndoGo(); eq(st(), s0, 'Als Training werten rückgängig');
  a.w.mfJoin(A, B); const gid = a.$(`mfGid('${A}')`); a.w.mfSplit(gid);
  ok(!a.$(`mfGid('${A}')`), 'Gruppe aufgelöst'); eq(a.$(`S.p.exe['${mfKey}'].rid`), B, 'wieder Einzelfahrten, Training zugeordnet'); ok(a.$(`!!S.p.extra['${A}']`)); ok(!a.$(`S.p.mf.sug['2026-11-10']`), 'Getrennt: keine erneute Frage');
  a.noErrors();
});

test('Bestwerte: Maximum der Einzelfahrten, nichts über die Pause', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  const pb0 = a.$('JSON.stringify(S.pb || {})'), mm0 = a.$('Object.keys(S.mm || {}).sort().join()');
  a.w.mfJoin(A, B); const gid = a.$(`mfGid('${A}')`);
  eq(a.$('JSON.stringify(S.pb || {})'), pb0, 'Bestwerte unverändert'); eq(a.$('Object.keys(S.mm || {}).sort().join()'), mm0, 'Leistungsprofil nur je Fahrt, keine Gruppe'); ok(!a.$(`S.p.exe['${mfKey}'].pr`), 'kein neuer Bestwert aus der Gruppe');
  eq(a.$(`mfCand(['${A}', '${B}'], '${gid}').a.m20`), a.$(`Math.max(S.man.find(x => x.id === '${A}').m20 || 0, S.man.find(x => x.id === '${B}').m20 || 0)`), '20-Min.-Wert = Maximum der Einzelwerte');
  a.noErrors();
});

test('Logbuch: Gruppe als ein Eintrag mit Abschnitten, Detail mit Menü „Zuordnung“', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  a.w.lbOpenRide(B); let t = a.text(); ok(/Zuordnung/.test(t) && /Training: Schwelle 3×12/.test(t) && /3 × 12 Min\. Schwelle erkannt/.test(t), 'Detail mit Erklärtext');
  a.w.mfJoin(A, B); const gid = a.$(`mfGid('${A}')`); t = a.page('logbook'); ok(/1 Fahrt ·/.test(t), 'Wochenkopf zählt die Gruppe als eine Fahrt: ' + t.slice(0, 300)); ok(/2 Abschnitte/.test(t));
  a.w.lbOpenRide(gid); t = a.text(); ok(/2 Abschnitte/.test(t) && /Pause 8 Min\./.test(t) && /Zusammengeführt aus 2 Fahrten/.test(t), 'Gruppe aufgeklappt'); a.noErrors();
});

test('Sicherung und Altdaten: Zuordnung in der Datei, alte Stände ohne Zuordnung laden, Hinweis für alte Tage', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training');
  /* Stand wie vor dem Update: Anfahrt zugeordnet, keine Zuordnungsdaten */
  a.$('delete S.p.mf; save()'); const store = a.store();
  const b = await boot({store}); b.$('cheerShow = null'); eq(b.$(`S.p.exe['${mfKey}'].rid`), A, 'alter Stand lädt unverändert');
  const wk = b.page('week'); ok(/An 1 Tag gab es mehrere Fahrten\. Zuordnung prüfen\?/.test(wk), 'einmaliger Hinweis'); eq(b.$(`S.p.exe['${mfKey}'].rid`), A, 'nichts automatisch umbewertet');
  R.f30.oldDays = b.$('S.p.mf.old.days.length');
  b.$("mfMenu = 'old'"); ok(/Bisher: „Anfahrt“/.test(b.page('week')) && /neu: „Training“/.test(b.page('week')), 'Vorschlag je Tag');
  b.w.mfOldApply('2026-11-10'); eq(b.$(`S.p.exe['${mfKey}'].rid`), B, 'übernommen'); ok(!/Zuordnung prüfen\?/.test(b.page('week')), 'Hinweis erledigt');
  b.w.mfUndoGo(); eq(b.$(`S.p.exe['${mfKey}'].rid`), A, 'Rückgängig');
  b.$('save()'); await b.w.exportPlans(); await b.tick(20); const d = b.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await d.blob.text(); ok(/\\"mf\\":|"mf":/.test(txt), 'Zuordnung in der Sicherungsdatei');
  b.noErrors();
});

test('Englisch: Karte, Rückfrage und Menü übersetzt', async () => {
  const a = await mfBoot(); const A = mfImp(a, RIDE_A(), 'Anfahrt'), B = mfImp(a, RIDE_B(), 'Training'); a.$(`mfAfterImport(['2026-11-10'])`);
  await a.en(); a.$(`mfMenu = 'w${A}'`); const t = a.page('week');
  ok(/Do these rides belong together\?/.test(t) && /Mark as commute/.test(t) && /2 rides on this day/i.test(t), 'Englisch'); ok(!/Gehören diese Fahrten/.test(t)); a.noErrors();
});
