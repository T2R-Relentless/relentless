/* Speichern, Laden, mehrere Pläne, Sicherungsdatei, Schutz gegen manipulierte Daten */
R.file = 'storage';
const BASE_D = {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20', ftp:250, hours:8};
const until = async (a, cond, ms = 3000) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Fail('Zeitüberschreitung beim Warten'); await a.tick(20); } };

test('Plan übersteht einen Neustart der App', async () => {
  const a = await boot(); makePlan(a, BASE_D); const i = a.$('todayIdx()'); a.w.tick(i);
  const b = await boot({store:a.store()});
  eq(b.$('S.step'), 0, 'direkt im Plan'); eq(b.$('S.p.eventName'), 'Testrennen'); eq(!!b.$('S.done')[i], true, 'Erledigt-Haken erhalten');
  eq(b.$('S.plan').map(x => x.n), a.$('S.plan').map(x => x.n), 'gleiche Woche'); b.noErrors();
});

test('Änderung in einem anderen Tab wird nicht überschrieben', async () => {
  const a = await boot(); makePlan(a, BASE_D);
  const rev = +a.w.localStorage.getItem('relentless.rev'); a.w.localStorage.setItem('relentless.rev', String(rev + 5));
  a.$("S.note = 'lokale Änderung'"); a.w.save();
  eq(a.$('syncMsg').length > 0, true, 'Hinweis erscheint'); ok(a.$('S.note') !== 'lokale Änderung', 'neuerer Stand wurde geladen statt überschrieben');
});

test('Speicher voll: Warnung statt stiller Datenverlust', async () => {
  const a = await boot(); makePlan(a, BASE_D);
  a.$("localStorage.setItem = () => { const e = new Error('voll'); e.name = 'QuotaExceededError'; throw e; }"); a.w.save(); a.w.render();
  eq(a.$('storeErr'), true); eq(a.$('storeWhy'), 'quota'); ok(/werden gerade nicht gespeichert/.test(a.text()), 'Warnung sichtbar');
});

test('Zwei Pläne nebeneinander', async () => {
  const a = await boot(); makePlan(a, BASE_D);
  a.w.newPlan(); makePlan(a, {goal:'ftp', ftp:230, ftpTarget:260, endDate:'2027-02-28', hours:6});
  const lib = a.$('readLib()'); eq(Object.keys(lib.plans).length, 2, 'zwei Pläne in der Bibliothek');
  eq(Object.values(lib.plans).map(p => p.name).sort(), ['FTP-Ziel 260 W', 'Testrennen']); a.noErrors();
});

test('Sicherungsdatei: speichern und auf einem „neuen Gerät“ laden', async () => {
  const a = await boot(); makePlan(a, BASE_D); await a.w.exportPlans(); await a.tick(20);
  const d = a.w.__downloads.find(x => /\.json$/.test(x.name)); ok(d, 'Sicherungsdatei erzeugt'); const txt = await d.blob.text(); const o = JSON.parse(txt);
  eq(o.app, 'relentless'); ok(!/relentless\.garmin\.key/.test(txt), 'Garmin-Schlüssel nicht in der Sicherung');
  const b = await boot(); const f = new b.w.File([txt], d.name, {type:'application/json'});
  b.w.importPlans({files:[f], value:''}); await until(b, () => !!b.$('bkImp'));
  eq(b.$('bkImp.n'), 1, 'ein Plan in der Datei erkannt'); eq(b.$('bkImp.full'), true, 'vollständige Sicherung');
  b.w.bkAddPlans(); await until(b, () => Object.keys(b.$('readLib()').plans).length > 0);
  ok(Object.values(b.$('readLib()').plans).some(p => p.name === 'Testrennen'), 'Plan wiederhergestellt'); b.noErrors();
});

test('Garmin-Schlüssel landet nie in der Sicherung', async () => {
  const a = await boot(); makePlan(a, BASE_D); a.w.localStorage.setItem('relentless.garmin.key', 'GEHEIM-123');
  await a.w.exportPlans(); await a.tick(20); const d = a.w.__downloads.find(x => /\.json$/.test(x.name));
  ok(!(await d.blob.text()).includes('GEHEIM-123'), 'Schlüssel nicht enthalten');
});

test('Manipulierte gespeicherte Daten werden entschärft', async () => {
  const a = await boot(); makePlan(a, BASE_D); const st = a.store(), s = JSON.parse(st['kurbelwerk.v2']);
  s.p.eventName = '<img src=x onerror="window.__pwn=1">'; s.pid = "x');window.__pwn=2;//"; st['kurbelwerk.v2'] = JSON.stringify(s);
  const b = await boot({store:st}); b.page(null); b.page('event'); b.page('plans'); await b.tick(50);
  eq(b.w.__pwn, undefined, 'kein eingeschleuster Code ausgeführt'); ok(!b.w.document.querySelector('#app img[src="x"]'), 'kein eingeschleustes Bild');
  ok(b.$('typeof S.pid !== "string" || /^[A-Za-z0-9_.:-]{1,64}$/.test(S.pid)'), 'ungültige ID ersetzt');
});

test('Zurücksetzen legt vorher eine Sicherung an', async () => {
  const a = await boot(); makePlan(a, BASE_D); a.w.doReset(); await a.tick(50);
  eq(a.$('S.p'), null, 'Plan entfernt'); ok(a.$('bkUndo') && /Zurücksetzen/.test(a.$('bkUndo.why')), 'Sicherung „Vor dem Zurücksetzen“'); a.noErrors();
});

test('Plan löschen legt vorher eine Sicherung an', async () => {
  const a = await boot(); makePlan(a, BASE_D); const id = a.$('S.pid'); a.w.doDelPlan(id); await a.tick(50);
  ok(a.$('bkUndo') && /Löschen/.test(a.$('bkUndo.why')), 'Sicherung „Vor dem Löschen eines Plans“'); a.noErrors();
});
