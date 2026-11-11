/* Fehlerprotokoll: abgefangene Fehler werden festgehalten statt verschluckt */
R.file = 'elog';

test('Fehler wird festgehalten, gleiche Fehler zusammengefasst', async () => {
  const a = await boot(); a.$('ELOG = []');
  const e = new Error('Testfehler'); a.w.elog(e); a.w.elog(e); a.w.elog(new TypeError('anders'));
  const L = a.$('elogRead()'); eq(L.length, 2, 'zwei Fehlerarten'); eq(L[0].c, 2, 'erster zweimal'); eq(L[1].n, 'TypeError');
});

test('Höchstens 40 Einträge, älteste fallen weg', async () => {
  const a = await boot(); a.$('ELOG = []');
  for (let i = 0; i < 50; i++) a.w.elog(new Error('Fehler ' + i));
  const L = a.$('elogRead()'); eq(L.length, 40); eq(L[0].m, 'Fehler 10'); eq(L[39].m, 'Fehler 49');
});

test('Protokoll übersteht einen Neustart (nach kurzer Verzögerung gespeichert)', async () => {
  const a = await boot(); a.$('ELOG = []'); a.w.elog(new Error('bleibt'));
  eq(a.w.localStorage.getItem('relentless.errlog'), null, 'nicht sofort, sondern gebündelt'); await a.tick(1100);
  const b = await boot({store:a.store()}); ok(b.$('elogRead()').some(x => x.m === 'bleibt'), 'nach Neustart vorhanden');
});

test('Abgefangener Fehler in der App landet im Protokoll', async () => {
  const a = await boot(); a.$('ELOG = []');
  a.$("localStorage.getItem = k => { if (k === 'relentless.garmin.key') { const e = new Error('gesperrt'); e.name = 'SecurityError'; throw e; } return null; }");
  eq(a.$('gmKey()'), '', 'App läuft weiter'); ok(a.$('elogRead()').some(x => x.n === 'SecurityError' && x.m === 'gesperrt'), 'Fehler protokolliert');
});

test('Unbehandelter Fehler und abgelehntes Promise werden protokolliert', async () => {
  const a = await boot(); a.$('ELOG = []');
  a.$("setTimeout(() => { throw new RangeError('unbehandelt'); }, 0); Promise.reject(new Error('abgelehnt'));"); await a.tick(30);
  const L = a.$('elogRead()'); ok(L.some(x => x.m === 'unbehandelt'), 'Fehler'); ok(L.some(x => x.m === 'abgelehnt'), 'Promise');
});

test('Protokoll: Anzeige, Kopiertext, Leeren', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); a.$('ELOG = []');
  ok(/Keine Fehler aufgezeichnet/.test(a.page('set-lang')), 'leerer Zustand');
  a.w.elog(new Error('<b>sichtbar</b>')); a.w.render(); const t = a.text();
  ok(t.includes('Error: <b>sichtbar</b>'), 'Eintrag als Text, nicht als HTML'); ok(/1 Eintrag/.test(t), 'Anzahl');
  ok(/^Relentless \d+ \(\d+\)\n/.test(a.w.elogText()), 'Kopiertext beginnt mit Version'); ok(a.w.elogText().includes('<b>sichtbar</b>'));
  a.w.elogClear(); eq(a.$('elogRead()').length, 0); ok(/Keine Fehler aufgezeichnet/.test(a.text()), 'nach Leeren');
});

test('Fehlerprotokoll nicht in der Sicherungsdatei', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); a.w.elog(new Error('privat-xyz')); await a.tick(1100);
  await a.w.exportPlans(); await a.tick(20); const d = a.w.__downloads.find(x => /\.json$/.test(x.name));
  ok(!(await d.blob.text()).includes('privat-xyz'), 'nicht enthalten');
});

test('Normale Nutzung erzeugt keine (neuen) Protokolleinträge', async () => {
  /* Was beim Anlegen der Szenarien und Aufrufen aller Seiten abgefangen wird, steht im Vergleichsstand.
     Neue Einträge zeigen einen neuen, bisher verschluckten Fehler an. */
  const seen = new Map();
  for (const sc of SCEN) {
    const a = await boot(); makePlan(a, sc.d, sc.subs);
    for (const k of [null, ...PAGES]) a.page(k);
    await a.en(); a.page(null); a.page('week');
    a.$('elogRead()').forEach(x => seen.set(`${x.n}: ${x.m} @ ${x.at.replace(/Zeile \d+/, 'Zeile …')}`, sc.id));
  }
  await snap('elog', 'normale-nutzung', [...seen.keys()].sort());
});

test('Erster Start und Sicherung im Hintergrund erzeugen keine Protokolleinträge', async () => {
  /* Die Datensicherung läuft verzögert (IndexedDB, nach 1,5 s). Deshalb hier bewusst warten. */
  const a = await boot(); await a.tick(1800); eq(a.$('elogRead()').map(x => x.m), [], 'erster Start mit leerem Speicher');
  makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); await a.tick(1800);
  eq(a.$('elogRead()').map(x => x.m), [], 'nach Plan und täglicher Sicherung');
  ok(a.$('bkReady'), 'Datensicherung bereit'); a.noErrors();
});
