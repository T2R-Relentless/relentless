/* F36: Datenschutz und Darstellung – Statistik nur nach Zustimmung, Impressum/Datenschutz, Garmin-Daten löschen,
   Build-Datum getrennt von der Reihenfolge-ID, Installationshinweis, einmalige Sicherungs-Erinnerung */
R.file = 'datenschutz';
/* Wie auf der echten Website: eigene Adresse (trHost), kein Automatisierungs-Kennzeichen, Zählpixel nur mitschreiben */
const dsWeb = a => { a.$(`trHost = () => true; Object.defineProperty(navigator, 'webdriver', {configurable:true, get:() => false});
  window.__gc = []; window.Image = function(){ const o = {}; Object.defineProperty(o, 'src', {set:v => __gc.push(v), get:() => ''}); return o; };`); return () => a.w.__gc.filter(u => /goatcounter/.test(u)); };

test('Statistik: vor der Entscheidung keine Anfrage an GoatCounter, Abfrage mit zwei Knöpfen', async () => {
  const a = await boot(), gc = dsWeb(a);
  ok(!/<(script|img)[^>]+goatcounter/i.test(await appSource()), 'kein Skript oder Bild von GoatCounter in der Seite');
  eq(a.$('trConsent()'), '', 'noch nicht entschieden');
  a.w.trInit(); a.w.track('plan-erstellt-ausfuehrlich'); a.w.trPage(); a.w.render();
  eq(gc(), [], 'keine Zählung vor der Zustimmung'); eq(a.$('trQ.length'), 0, 'nichts vorgemerkt');
  const t = a.text(); ok(/Darf die App anonym zählen\?/.test(t), 'Abfrage sichtbar');
  const bs = [...a.w.document.querySelectorAll('.exbox button')].filter(b => /^(Erlauben|Nicht zählen)$/.test(b.textContent.trim()));
  eq(bs.length, 2, 'zwei Knöpfe'); eq(bs[0].className, bs[1].className, 'gleichwertig gestaltet');
  bs[1].click(); eq(a.$('trConsent()'), 'nein'); a.w.track('fahrt-bewertet'); eq(gc(), [], 'nach „Nicht zählen“ weiter nichts');
  ok(!/Darf die App anonym zählen\?/.test(a.text()), 'Abfrage verschwunden'); a.noErrors();
});

test('Statistik: nach „Erlauben“ wird gezählt, änderbar unter Einstellungen → Datenschutz', async () => {
  const a = await boot(), gc = dsWeb(a); a.w.render();
  [...a.w.document.querySelectorAll('.exbox button')].find(b => b.textContent.trim() === 'Erlauben').click();
  eq(a.$('trConsent()'), 'ja'); eq(gc().length, 1, 'Seitenaufruf nach Zustimmung gezählt'); ok(/[?&]p=%2F/.test(gc()[0]), 'Start gezählt');
  a.w.track('fahrt-bewertet'); eq(gc().length, 2);
  makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
  ok(/Anonyme Statistik an/.test(a.page('settings')), 'Zeile in den Einstellungen');
  ok(/Nicht zählen/.test(a.page('set-priv')), 'Wahl auf der Datenschutzseite'); a.w.trSet(false); const n = gc().length; a.w.track('x'); eq(gc().length, n, 'widerrufen');
  eq(a.store()['relentless.stats.off'], '1', 'alter Schlüssel für ältere Versionen mitgeführt');
});

test('Statistik: Altdaten – „aus“ bleibt aus, bisher „an“ wird einmal neu gefragt, Wahl gilt nur für das Gerät', async () => {
  const off = await boot({store:{'relentless.stats.off':'1'}}); dsWeb(off); off.w.render();
  eq(off.$('trConsent()'), 'nein'); ok(!/Darf die App anonym zählen\?/.test(off.text()), 'keine Abfrage bei bisher „aus“');
  const on = await boot(); dsWeb(on); on.w.render(); ok(/Darf die App anonym zählen\?/.test(on.text()), 'bisher ohne eigene Wahl gezählt: Abfrage');
  on.w.trSet(true); makePlan(on, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); await on.w.exportPlans();
  const txt = await on.w.__downloads.find(x => /\.json$/.test(x.name)).blob.text(), sd = JSON.parse(txt).side;
  ok(!('relentless.stats.consent' in sd) && !('relentless.stats.off' in sd), 'Wahl nicht in der Sicherungsdatei');
  /* Sicherung von einem anderen Gerät (Zustimmung) auf einem Gerät ohne Entscheidung: setzt keine Zustimmung */
  const fremd = {...sd, 'relentless.stats.consent':'ja'}, raw = o => JSON.stringify({state:JSON.stringify(JSON.parse(txt).state), lib:JSON.stringify(JSON.parse(txt).lib), side:o});
  const b = await boot(); b.$(`bkWriteRaw(${raw(fremd)})`); eq(b.$('trConsent()'), '', 'keine Zustimmung aus fremder Sicherung');
  /* Gerät mit „Nicht zählen“, alte Sicherung ohne stats.off bzw. mit „an“: Wahl bleibt */
  const c = await boot(); c.w.trSet(false); c.$(`bkWriteRaw(${raw({...sd})})`); eq(c.$('trConsent()'), 'nein', 'Wahl „nein“ bleibt beim Wiederherstellen');
  const d = await boot(); d.w.trSet(true); d.$(`bkWriteRaw(${raw({...sd, 'relentless.stats.off':'1'})})`); eq(d.$('trConsent()'), 'ja', 'alte Sicherung mit stats.off ändert die Wahl nicht');
});

test('Impressum und Datenschutz: vor dem ersten Plan und unter Mehr erreichbar, Empfänger und Platzhalter', async () => {
  const a = await boot(); ok(/Impressum und Datenschutz/.test(a.text()), 'Verweis auf dem Startbildschirm');
  a.w.lglOpen('imp'); const imp = a.text(); ok(/\[Platzhalter: Name bzw\. Name des Vereins\]/.test(imp) && /\[Platzhalter: E-Mail-Adresse\]/.test(imp) && /Vertreten durch/.test(imp), 'Impressum mit Platzhaltern');
  a.w.lglOpen('ds'); const ds = a.text();
  ['Netlify', 'GoatCounter', 'Open-Meteo', '/api/garmin', 'Art. 77', 'Speicherdauer', 'Widerspruch'].forEach(w => ok(ds.includes(w), 'Datenschutz nennt ' + w));
  ok(/speichert weder Schlüssel noch Fahrten/.test(ds), 'Garmin-Weg korrekt beschrieben');
  a.w.lglClose(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
  ok(/Impressum und Datenschutz/.test(a.page('more')), 'Punkt unter Mehr');
  a.w.__iMiss = new Map(); await a.en(); a.w.lglOpen('ds'); a.w.lglOpen('imp'); a.page('set-priv'); eq([...a.w.__iMiss.keys()], [], 'englisch vollständig'); a.noErrors();
});

test('Garmin: Verbindung trennen und Schlüssel löschen entfernt alle Garmin-Daten im Gerät', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
  a.$(`localStorage.setItem('relentless.garmin.key', 'GEHEIM'); S.gm = {mode:'web', ok:true, ids:['1', '2'], last:new Date().toISOString()}; S.bkKey = true; gmWebOk = true; S.man = [{id:'r1'}]; save();`);
  const t = a.page('set-gm'); ok(/Verbindung trennen und Schlüssel löschen/.test(t), 'Knopf sichtbar'); ok(!/Er landet nicht in Sicherungen/.test(t), 'alter, falscher Satz entfernt');
  a.w.document.getElementById('gmWipeB').click(); const q = a.text(); ok(/Sicher wertlos wird der Schlüssel erst, wenn du ihn bei Garmin widerrufst/.test(q), 'Rückfrage mit Hinweis zum Widerrufen');
  eq(a.store()['relentless.garmin.key'], 'GEHEIM', 'vor der Bestätigung nichts gelöscht');
  [...a.w.document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ja, löschen').click();
  eq(a.store()['relentless.garmin.key'], undefined, 'Schlüssel gelöscht'); eq(a.$('JSON.stringify(S.gm)'), '{}', 'Verbindungsstand gelöscht'); eq(a.$('S.bkKey'), false, 'nicht mehr in Sicherungen');
  eq(a.$('S.man.length'), 1, 'Fahrten bleiben'); ok(/Verbindung getrennt, Schlüssel auf diesem Gerät gelöscht/.test(a.text()), 'Bestätigung');
  ok(!/"relentless\.garmin\.key"/.test(a.store()[a.$('K')] || ''), 'nicht im Zustand');
  a.$(`localStorage.setItem('relentless.garmin.key', 'NOCHMAL'); S.gm = {};`); ok(/Verbindung trennen und Schlüssel löschen/.test(a.page('set-gm')), 'Knopf auch ohne Verbindung, wenn ein Schlüssel gespeichert ist');
  a.w.doReset(); eq(a.store()['relentless.garmin.key'], undefined, '„Alles zurücksetzen“ löscht den Schlüssel'); a.noErrors();
});

test('Build-Datum: Anzeige aus APP_BUILT, Update-Erkennung weiter über die Reihenfolge-ID', async () => {
  const a = await boot(), vj = await (await fetch('../public/version.json', {cache:'no-store'})).json();
  eq(String(vj.build), a.$('APP_BUILD'), 'version.json build'); eq(String(vj.built), a.$('APP_BUILT'), 'version.json built');
  ok(a.$('APP_BUILD') >= '20261213090300', 'Reihenfolge-ID nie unter der von Hand gesetzten ID (sonst sähen Geräte damit keine Updates)');
  ok(/^20\d{12}$/.test(a.$('APP_BUILT')), 'Datum im Format JJJJMMTTHHMMSS');
  ok(a.$("updNewer('20261213090400', '20261213090300')"), 'Gerät mit alter ID erkennt neue Version');
  ok(!a.$("updNewer('20261125120000', '20261213090300')"), 'ein echtes Datum als ID wäre für alte Geräte unsichtbar');
  ok(!a.$("updNewer('abc', '20261213090300')"), 'ungültige ID');
  makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); const t = a.page('settings');
  ok(t.includes('Build ' + a.$('viDate(APP_BUILT)')), 'angezeigtes Datum = APP_BUILT'); ok(!t.includes('13.12.2026'), 'nicht mehr das Datum der Reihenfolge-ID');
});

test('Installationshinweis: erst ab dem 3. Besuch, im Seitenfluss, nach „×“ nie wieder', async () => {
  const plan = a => { makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); a.$('instEvt = {prompt: async () => {}}'); a.w.render(); };
  const a = await boot(); plan(a); eq(a.$('instVisits'), 1); ok(!/Relentless als App installieren/.test(a.text()), '1. Besuch: kein Hinweis');
  const b = await boot({store:a.store()}); plan(b); eq(b.$('instVisits'), 2); ok(!/Relentless als App installieren/.test(b.text()), '2. Besuch: kein Hinweis');
  const c = await boot({store:b.store()}); plan(c); ok(/Relentless als App installieren/.test(c.text()), '3. Besuch: Hinweis');
  const el = [...c.w.document.querySelectorAll('#app [role=region]')].find(x => /installieren/.test(x.textContent)); ok(el && c.w.getComputedStyle(el).position !== 'fixed', 'nicht schwebend über Knöpfen');
  c.w.instClose(); const d = await boot({store:c.store()}); plan(d); ok(!/Relentless als App installieren/.test(d.text()), 'nach „×“ nie wieder');
  d.w.dykInst(); eq(d.store()['relentless.inst.hide'], '1', 'Tipp „So geht’s“ hebt „×“ nicht auf');
});

test('Sicherung: nach 14 Tagen ohne Sicherungsdatei genau einmal erinnern', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
  a.$('S.bkAt = Date.now() - 15 * 864e5; S.bkAt0 = S.bkAt - 864e5; S.bkChg = 0; S.bkSnooze = 0;');
  ok(/Deine letzte Sicherung ist 15 Tage alt/.test(a.page(null)), 'Erinnerung');
  a.w.bkLater(); ok(!/Zeit für eine Sicherung/.test(a.page(null)), 'nach „Später“ weg');
  a.setNow(NOW0 + 2 * 864e5); a.$('S.bkChg = 3'); ok(!/Zeit für eine Sicherung/.test(a.page(null)), 'innerhalb der 3-Tage-Pause nichts');
  a.setNow(NOW0 + 4 * 864e5); ok(/Du hast deinen Plan seit der letzten Sicherung geändert/.test(a.page(null)), 'danach die bisherigen Anlässe wie vor F36');
  a.$('S.bkSnooze = 0; S.bkChg = 0; S.bkEx = 0; S.p.exe = Object.fromEntries([1, 2, 3, 4, 5].map(i => ["1-" + i, {score:80}]))'); ok(/5 Fahrten bewertet/.test(a.page(null)), '5 neue Bewertungen');
  a.$('S.p.exe = {}; S.bkSnooze = 0'); ok(/Deine letzte Sicherung ist 19 Tage alt/.test(a.page(null)), 'Alter der Sicherung mit Pause wie bisher');
  a.$('S.bkAt = Date.now() - 14 * 864e5 - 1000; S.bkChg = 0; S.bkSnooze = Date.now()'); ok(/Zeit für eine Sicherung/.test(a.page(null)), 'nach einer neuen Sicherung nach 14 Tagen wieder sofort einmal');
  const b = await boot(); makePlan(b, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); b.$('S.bkAt = 0; S.bkAt0 = Date.now() - 20 * 864e5; S.bkSnooze = 0');
  ok(/Seit 20 Tagen gibt es keine Sicherungsdatei/.test(b.page(null)), 'auch ohne jede Sicherung'); b.w.bkLater(); ok(!/Zeit für eine Sicherung/.test(b.page(null)), 'nach „Später“ 3 Tage Pause');
});
