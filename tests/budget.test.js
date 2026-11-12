/* B6: Zeitbudget nach Jahreszeit schon in der Planung */
R.file = 'budget';

test('B6: Zeitbudget nach Jahreszeit in der Planung einstellen', async () => {
  const a = await boot(); a.$("S = load(true); Object.assign(S.d, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', hours:8, mode:'full'}); S.step = 3; render();");
  ok(/Zeitbudget nach Jahreszeit/.test(a.text()), 'Karte im Schritt Alltag');
  a.w.tbSet('on', null, true); a.w.tbSet('w', 'h', '4'); a.w.tbSet('s', 'h', '12');
  eq(a.$('S.d.tb.on'), true); eq([a.$('S.d.tb.prof.w.h'), a.$('S.d.tb.prof.s.h')], [4, 12]);
  eq(JSON.parse(a.w.localStorage.getItem('kurbelwerk.v2')).d.tb.prof.s.h, 12, 'sofort gespeichert');
  const pv = a.$('mkPrev(S.d)'), tot = P => P.reduce((q, x) => q + (x.m || 0), 0), wOf = d => a.$(`Math.floor((new Date('${d}T12:00:00') - new Date('${pv.start}T12:00:00')) / 6048e5) + 1`);
  ok(tot(a.$('genWeek')(pv, wOf('2027-01-13'))) <= 270, 'Vorschau: Winterwoche im Budget');
  a.w.finish(); a.noErrors();
  eq(a.$('S.p.tb.on'), true, 'übernommen'); eq(a.$('S.p.tb === S.d.tb'), false, 'eigene Kopie im Plan');
  ok(/Winter 4, Sommer 12 Std\. pro Woche/.test(a.page('more')), 'Übersicht nennt das Budget');
});

test('B6: Abbrechen der Anpassung lässt das Budget unverändert', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', hours:8});
  a.$('const tb = tbInit(S.p); tb.on = true; tb.prof.w.h = 5; S.p.tb = tb; save();'); a.w.editOnly(3);
  a.w.tbSet('w', 'h', '9'); eq(a.$('S.d.tb.prof.w.h'), 9, 'Entwurf geändert'); eq(a.$('S.p.tb.prof.w.h'), 5, 'Plan noch unverändert');
  a.w.onlyCancel(); eq(a.$('S.p.tb.prof.w.h'), 5, 'nach Abbrechen unverändert'); a.noErrors();
});

test('B6: Schnellplanung zeigt kein Zeitbudget', async () => {
  const a = await boot(); a.$("S = load(true); Object.assign(S.d, {mode:'light'}); S.step = 3; render();");
  ok(!/Zeitbudget nach Jahreszeit/.test(a.text()), 'keine Budgetkarte');
});
