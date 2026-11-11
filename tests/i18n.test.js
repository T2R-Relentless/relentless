/* Englische Oberfläche: Wörterbuch, Platzhalter, Musterregeln, Einzahl, fehlende Übersetzungen */
R.file = 'i18n';

test('Sätze mit Zahlen, Daten und Namen', async () => {
  const a = await boot(); await a.w.i18nLoad(); a.$("S.lang = 'en'"); const t = a.w.trText;
  eq(t('2 Flaschen Sportgetränk · 1 Gel · 1 Riegel'), '2 bottles of sports drink · 1 gel · 1 bar');
  eq(t('3 Flaschen Sportgetränk · 2 Gels · 2 Riegel'), '3 bottles of sports drink · 2 gels · 2 bars');
  eq(t('Heute: Grundlage mit Fahrtechnik, 2 Std.'), 'Today: Endurance with skills, 2 h');
  eq(t('Dein Ziel läuft bis 03.02.2027.'), 'Your goal runs until 03/02/2027.');
  eq(t('Tage bis Testrennen'), 'Days until Testrennen');
});

test('Einzahl-Regel trifft nur die Zahl 1', async () => {
  const a = await boot(), s = a.$('iSing');
  eq(s('1 bars'), '1 bar'); eq(s('21 bars'), '21 bars'); eq(s('1.1 bars'), '1.1 bars'); eq(s('(1 gels)'), '(1 gel)'); eq(s('11 bottles'), '11 bottles');
});

test('Deutsch bleibt unverändert', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
  ok(/Als erledigt markieren/.test(a.page(null)), 'deutscher Text');
});

test('Keine fehlenden Übersetzungen auf den Seiten der Szenarien', async () => {
  const miss = new Map();
  for (const sc of SCEN) {
    const a = await boot(); makePlan(a, sc.d, sc.subs); a.w.__iMiss = new Map(); await a.en();
    for (const k of [null, ...PAGES]) a.page(k);
    a.w.__iMiss.forEach((v, k) => miss.set(k, sc.id + ': ' + v));
  }
  /* Bekannte Lücken stehen im Vergleichsstand. Neue Lücken lassen den Test scheitern. */
  await snap('i18n', 'fehlend', [...miss.keys()].sort());
});
