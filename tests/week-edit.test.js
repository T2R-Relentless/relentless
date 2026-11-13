/* Wochenplan: Zurücksetzen lässt die Vergangenheit unberührt, Trainingstag → Pendeltag */
R.file = 'week-edit';
const wDat = d => ({goal:'ftp', ftp:230, ftpTarget:260, endDate:'2027-03-28', hours:7, commuter:true, commute:[true, false, false, false, false, false, false], commuteMin:30, ...d});
const THU = at(2026, 11, 12);

test('Zurücksetzen: vergangene und erledigte Tage bleiben unverändert', async () => {
  const a = await boot({now:THU}); makePlan(a, wDat({})); eq(a.$('todayIdx()'), 3);
  a.$("S.plan[0] = {...S.plan[0], n:'Montag geändert', m:77, mark:1}; S.plan[2] = {...S.plan[2], n:'Mittwoch geändert', mark:1}; S.done[1] = true; S.plan[1] = {...S.plan[1], n:'Dienstag erledigt', mark:1}; S.blocked[0] = true; S.blocked[5] = true; S.plan[5] = {...S.plan[5], n:'Samstag geändert', mark:1}");
  a.$("note('Mo gesperrt', 'x', 0); note('Sa gesperrt', 'y', 5)");
  const before = a.$('JSON.stringify(S.plan.slice(0, 3))');
  a.$('resetWeek()');
  eq(a.$('JSON.stringify(S.plan.slice(0, 3))'), before, 'Mo bis Mi unverändert');
  eq(a.$('S.blocked[0]'), true, 'Sperre in der Vergangenheit bleibt'); eq(a.$('S.blocked[5]'), undefined, 'Sperre in der Zukunft entfällt');
  ok(!a.$('S.plan[5].mark'), 'Samstag neu erzeugt'); eq(a.$('JSON.stringify(S.plan.slice(3))'), a.$('JSON.stringify(genWeek(S.p, S.wk).slice(3))'), 'ab heute wie neu erzeugt');
  ok(a.$("S.log.some(l => l.title === 'Mo gesperrt')") && !a.$("S.log.some(l => l.title === 'Sa gesperrt')"), 'Hinweise der Vergangenheit bleiben');
  a.noErrors();
});

test('Zurücksetzen: auf einen vergangenen Tag vorgezogene Einheit kommt nicht doppelt', async () => {
  const a = await boot({now:THU}); makePlan(a, wDat({}));
  const j = a.$('S.plan.findIndex((x, i) => i > 3 && x.m > 0)'); ok(j > 3, 'Einheit nach heute vorhanden');
  a.$(`S.plan[2] = {...S.plan[${j}], moved:true, from:${j}}; S.plan[${j}] = {...REST}; S.done[2] = true; resetWeek()`);
  eq(a.$(`S.plan[${j}].t`), 'rest', 'ursprünglicher Tag bleibt frei'); eq(a.$('S.plan[2].from'), j);
});

test('Trainingstag morgen lässt sich zum Pendeltag machen und zurück', async () => {
  const a = await boot({now:THU}); makePlan(a, wDat({}));
  a.$("S.plan[4] = {...D('sst', 'Sweet Spot 3×12', 75, 88, 93, '90 U/min', 'x', 'y'), iv:{wu:15, reps:3, work:12, rest:5, lo:88, hi:93, cd:10}}; S.blocked = {}");
  ok(a.$('comAble(S.plan[4])'), 'umwandelbar'); a.page('week'); ok(/>Pendeln</.test(a.$('ctl0(S.plan[4], 4, true)')), 'Knopf in der Tageskarte'); ok(/toggleCom\(4\)/.test(a.$('S.fold = {...(S.fold || {}), wp:true}; weekPanel(S.wk, true)')), 'Feld unter „Pendeln“');
  const orig = a.$('JSON.stringify(S.plan[4])');
  a.$('toggleCom(4)'); eq(a.$('S.plan[4].parts.length'), 2, 'Hin- und Rückweg'); ok(a.$('S.plan[4].comAdd'));
  ok(a.$('S.plan[4].parts[0].iv') && a.$('S.plan[4].parts[1].lo') === 45, 'Intervalle auf dem Hinweg, Rückweg locker');
  ok(/Doch nicht pendeln/.test(a.$('ctl0(S.plan[4], 4, true)')), 'Rückweg angeboten');
  a.$('toggleCom(4)'); eq(a.$('JSON.stringify(S.plan[4])'), orig, 'wiederhergestellt'); a.noErrors();
});

test('Kein Pendeln für Tage in der Vergangenheit, erledigte Tage oder ohne Pendeln im Profil', async () => {
  const a = await boot({now:THU}); makePlan(a, wDat({}));
  a.$('S.done[4] = true'); const wp = a.$('S.fold = {...(S.fold || {}), wp:true}; weekPanel(S.wk, true)'); ok(!/toggleCom\(4\)/.test(wp + a.$('ctl0(S.plan[4], 4, true)')), 'erledigt: kein Pendeln');
  ok(!/toggleCom\(2\)/.test(wp + a.$('ctl0(S.plan[2], 2, true)')), 'Vergangenheit: kein Pendeln');
  const b = await boot({now:THU}); makePlan(b, wDat({commuter:false, commute:[false, false, false, false, false, false, false]}));
  eq(b.$('comAble(S.plan.find(x => x.m > 0))'), false);
});

/* Fitness-Check fällt wegen Befinden aus → wird nachgeholt, auch nach einer Planänderung */
const tDat = d => ({goal:'ftp', ftp:230, ftpTarget:260, endDate:'2027-03-28', hours:7, ftpSrc:'test', test0:true, startDate:'2026-11-09', ...d});
const hasTest = L => L.some(x => x && x.t === 'test');
for (const lv of ['neck', 'heavy', 'sick']) test(`Fitness-Check bei „${lv}“: vorgemerkt und in dieser oder der nächsten Woche nachgeholt`, async () => {
  const a = await boot({now:at(2026, 11, 9)}); makePlan(a, tDat({}));
  const i = a.$("S.plan.findIndex(x => x.t === 'test')"); ok(i >= 0, 'Test in Woche 1'); a.setNow(at(2026, 11, 9 + i)); a.$('render()');
  a.$(`feelDay(${i}, '${lv}')`); await a.tick(5); a.$('render()');
  ok(a.$('S.p.testDue') && a.$('testOwed(S.p)'), 'offen vorgemerkt'); ok(a.$("S.log.some(l => l.title === 'Fitness-Check verschoben')"), 'Hinweis');
  const now = a.$('S.plan.slice(' + (i + 1) + ')'), nx = a.$('genWeek(S.p, 2)'); ok(hasTest(now) || hasTest(nx), 'in dieser Woche nach dem Tag oder in der Vorschau der nächsten Woche');
  ok(!(hasTest(now) && hasTest(nx)), 'nicht doppelt');
  a.setNow(at(2026, 11, 17)); a.$('render()'); if (!hasTest(now)) ok(hasTest(a.$('S.plan')), 'in Woche 2 eingeplant'); a.noErrors();
});

test('Fitness-Check: „Etwas müde“ lässt den Test stehen, Zurücknehmen löscht die Vormerkung', async () => {
  const a = await boot({now:at(2026, 11, 9)}); makePlan(a, tDat({}));
  const i = a.$("S.plan.findIndex(x => x.t === 'test')"); a.setNow(at(2026, 11, 9 + i)); a.$('render()');
  a.$(`feelDay(${i}, 'tired')`); eq(a.$(`S.plan[${i}].t`), 'test'); ok(!a.$('S.p.testDue'));
  a.$(`feelDay(${i}, 'neck')`); ok(a.$('S.p.testDue')); a.$(`feelDay(${i}, 'tired')`); ok(!a.$('S.p.testDue'), 'wieder aufgehoben');
});

test('Fitness-Check bleibt offen, wenn der Plan danach angepasst wird', async () => {
  const a = await boot({now:at(2026, 11, 9)}); makePlan(a, tDat({}));
  const i = a.$("S.plan.findIndex(x => x.t === 'test')"); a.setNow(at(2026, 11, 9 + i)); a.$('render()');
  a.$(`feelDay(${i}, 'sick')`); await a.tick(5); const due = a.$('S.p.testDue.from');
  a.$('S.edit = true; S.d.hours = 8; finish()'); a.noErrors('Anpassen');
  eq(a.$('S.p.testDue && S.p.testDue.from'), due, 'Vormerkung erhalten'); ok(a.$('testOwed(S.p)'), 'weiter offen');
  a.setNow(at(2026, 11, 17)); a.$('render()'); a.setNow(at(2026, 11, 24)); a.$('render()'); ok(hasTest(a.$('S.plan')) || hasTest(a.$('genWeek(S.p, 4)')), 'Test wird nachgeholt');
});

/* Fitness-Checks bei Pendlern: Sind alle Trainingstage unter der Woche Pendeltage, steht der Test trotzdem im Plan (nie auf einem Pendeltag) */
const pDat = d => ({goal:'event', eventName:'X', eventDate:'2027-10-10', dist:150, hm:2000, ftp:300, weight:75, hours:8, commuter:true, commuteMin:45, startDate:'2026-11-03', ...d});
for (const cm of [[0, 1, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 0]]) test(`Pendeltage ${cm.join('')}: jede Testwoche enthält den Fitness-Check`, async () => {
  const a = await boot({now:at(2026, 11, 12)}); makePlan(a, pDat({commute:cm.map(Boolean), avail:[false, true, true, true, true, true, true]}));
  const tw = a.$('testWeeks(S.p)'); ok(tw.length >= 4, 'Testwochen ' + tw);
  for (const w of tw) { const pl = a.$(`genWeek(S.p, ${w})`), i = pl.findIndex(x => x.t === 'test'); ok(i >= 0, `Woche ${w}: Test fehlt`); if (i >= 0) ok(!cm[i] && !pl[i].parts, `Woche ${w}: nicht auf einem Pendeltag`); }
});

test('Laufende Testwoche ohne Test (älterer Plan) bekommt ihn einmalig nachgetragen', async () => {
  const a = await boot({now:at(2026, 11, 12)}); makePlan(a, pDat({commute:[false, true, true, true, true, false, false], avail:[false, true, true, true, true, true, true]}));
  const w = a.$('testWeeks(S.p)')[0]; a.setNow(new Date(a.$('S.p.start') + 'T09:30:00').getTime() + ((w - 1) * 7 + 1) * 864e5); a.$('render()'); eq(a.$('S.wk'), w);
  a.$("S.plan = S.plan.map(x => x.t === 'test' ? {...REST} : x); delete S.p.tdCur; render()");
  ok(a.$("S.plan.some(x => x.t === 'test')"), 'nachgetragen'); ok(a.$("S.log.some(l => l.title === 'Fitness-Check eingeplant')"), 'Hinweis');
  a.$("S.plan = S.plan.map(x => x.t === 'test' ? {...REST} : x); render()"); ok(!a.$("S.plan.some(x => x.t === 'test')"), 'nur einmal, eigene Entscheidung bleibt'); a.noErrors();
});

/* „Wusstest du schon?“: Hinweise zu den neuen Funktionen, ohne Neuigkeiten-Fenster */
const DYK_NEW = ['logbook', 'commute', 'move', 'variant', 'seasonchk', 'evall', 'vac', 'tb', 'age', 'seq', 'mob', 'tire'];
test('Wusstest du schon: neue Hinweise vorhanden, übersetzt, Knöpfe führen ohne Fehler zur Seite', async () => {
  const a = await boot({now:at(2026, 11, 12)}); makePlan(a, {goal:'event', eventName:'Hauptrennen', eventDate:'2027-07-10', commuter:true, commute:[false, true, false, true, false, false, false], commuteMin:30}, [{name:'Vorbereitung', date:'2027-05-02', prio:'B'}]);
  const D = a.$('DYK'), ids = D.map(t => t[0]); DYK_NEW.forEach(k => ok(ids.includes(k), 'fehlt: ' + k)); eq(new Set(ids).size, ids.length, 'eindeutige Kennungen');
  const L = a.$('dykList()').map(t => t[0]); ['logbook', 'commute', 'seasonchk', 'evall', 'tire', 'age'].forEach(k => ok(L.includes(k), 'passt zum Plan: ' + k));
  for (const k of DYK_NEW) { const t = D.find(x => x[0] === k); a.page(null); a.$(`dykGo(${JSON.stringify(t[3])})`); ok(a.text().length > 50, 'Seite für ' + k); }
  a.noErrors('Knöpfe');
  await a.en(); for (const k of DYK_NEW) { const t = D.find(x => x[0] === k); ok(a.w.trText(t[1]) !== t[1], 'englisch: ' + k); ok(a.w.trText(t[2]) !== t[2], 'Knopf englisch: ' + k); }
});

test('Version 189 zeigt kein Neuigkeiten-Fenster', async () => {
  const a = await boot(); eq(a.$('APP_VERSION'), 189); eq(a.$('WN_DATA["189"]'), undefined);
  eq(a.$('wnItems(188, 189).n'), 0, 'keine Einträge für das Fenster');
});
