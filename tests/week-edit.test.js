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
