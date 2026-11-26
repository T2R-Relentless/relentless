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

test('Impressum und Datenschutz vorerst ausgeblendet (RL_LEGAL_ON): kein Zugang, kein toter Verweis; Inhalt bleibt für später', async () => {
  const a = await boot(); eq(a.$('RL_LEGAL_ON'), false, 'Schalter aus');
  const all = () => a.$(`document.getElementById('app').textContent`);
  ok(!/Impressum|Datenschutzerklärung/.test(all()), 'nichts auf dem Startbildschirm');
  a.w.lglOpen('imp'); eq(a.$('lglShow'), null, 'lglOpen tut nichts'); ok(!/Impressum/.test(all()), 'kein Fenster');
  const ds = a.w.lglDs(); ['Netlify', 'GoatCounter', 'Open-Meteo', '/api/garmin', 'Art. 77', 'Speicherdauer', 'Widerspruch'].forEach(w => ok(ds.includes(w), 'Datenschutztext nennt weiter ' + w));
  ok(/Vertreten durch/.test(a.w.lglImp()), 'Impressumstext bleibt in der Datei');
  makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
  for (const k of ['more', 'settings', 'set-priv', null]) { a.page(k); ok(!/Impressum|Datenschutzerklärung/.test(all()), 'kein Verweis auf ' + (k || 'Heute')); }
  ok(!/Impressum|Datenschutzerklärung/.test(a.$(`trAskModal()`) + a.$(`DYK.map(t => t[1]).join(' ')`) + JSON.stringify(a.$('WN_DATA[String(APP_VERSION)]'))), 'Abfrage, Hinweise und Neuigkeiten ohne Verweis');
  a.w.__iMiss = new Map(); await a.en(); a.page('set-priv'); eq([...a.w.__iMiss.keys()], [], 'englisch vollständig'); a.noErrors();
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

/* ---------- 12 B: Sicherung in der eigenen Cloud ---------- */
const dsPlan = a => makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'});
/* Teilen-Menü nachbilden: canShare/share, gespeicherte Dateien in __shared */
const dsUa = (a, ua) => a.$(`Object.defineProperty(navigator, 'userAgent', {configurable:true, get:() => ${JSON.stringify(ua)}})`);
const dsShare = (a, how = 'ok') => a.$(`Object.defineProperty(navigator, 'userAgent', {configurable:true, get:() => 'Mozilla/5.0 (Linux; Android 15)'}); window.__shared = []; navigator.canShare = o => !!(o && o.files && o.files.length);
  navigator.share = async o => { if (${JSON.stringify(how)} === 'abort') { const e = new Error('abgebrochen'); e.name = 'AbortError'; throw e; } if (${JSON.stringify(how)} === 'fail') throw new Error('nicht erlaubt'); __shared.push(...o.files); };`);

test('Cloud-Sicherung: Abschnitt unter Pläne und Sicherung, Tippflächen 44 pt, Hinweis je Gerät', async () => {
  const a = await boot(); dsPlan(a); const t = a.page('plans');
  ok(/Auf einem anderen Gerät nutzen/.test(t), 'Abschnitt sichtbar'); ok(/iCloud Drive, Google Drive oder OneDrive/.test(t), 'Clouds genannt');
  ok(/nichts an einen Server/.test(t), 'kein Server');
  const d = a.w.document, b = d.getElementById('bkCloudB'), l = [...d.querySelectorAll('#fx-bkcloud label')].find(x => /Aus der Cloud laden/.test(x.textContent));
  ok(b && l, 'Knöpfe Sichern und Laden'); ok(b.getBoundingClientRect().height >= 44 && l.getBoundingClientRect().height >= 44, 'mindestens 44 pt hoch');
  ok(l.querySelector('input[type=file][accept*=json]'), 'Laden über den Dateidialog');
  a.$(`Object.defineProperty(navigator, 'userAgent', {configurable:true, get:() => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'})`);
  ok(/„In Dateien sichern“ und wähle iCloud Drive/.test(a.page('plans')), 'iPhone: In Dateien sichern');
  a.$(`Object.defineProperty(navigator, 'userAgent', {configurable:true, get:() => 'Mozilla/5.0 (Linux; Android 15)'})`);
  ok(/Drive oder OneDrive/.test(a.page('plans')), 'Android: Teilen-Menü'); a.noErrors();
});

test('Cloud-Sicherung: Teilen-Menü mit der vollständigen Datei, sonst Download wie bisher', async () => {
  const a = await boot(); dsPlan(a); dsShare(a); a.page('plans'); a.w.document.getElementById('bkCloudB').click(); await a.tick(50);
  const sh = a.$('__shared'); eq(sh.length, 1, 'eine Datei geteilt'); ok(/^relentless-sicherung-\d{4}-\d{2}-\d{2}\.json$/.test(sh[0].name), 'Dateiname');
  const o = JSON.parse(await sh[0].text()); eq(o.app, 'relentless'); ok(o.state && o.lib && o.plans.length === 1, 'vollständige Sicherung');
  ok(a.$('S.bkAt') > 0, 'als Sicherung gezählt'); eq(a.$('__downloads.length'), 0, 'kein zusätzlicher Download');
  /* Ohne Teilen-Menü (z. B. Desktop-Browser) oder bei Fehler: Download */
  const b = await boot(); dsPlan(b); await b.w.exportPlans(true); eq(b.$('__downloads.length'), 1, 'ohne Teilen-Menü: Download');
  const c = await boot(); dsPlan(c); dsShare(c, 'fail'); await c.w.exportPlans(true); eq(c.$('__downloads.length'), 1, 'Teilen scheitert: Download');
  /* Abbrechen im Teilen-Menü: keine Fehlermeldung, nicht als Sicherung gezählt */
  const d = await boot(); dsPlan(d); dsShare(d, 'abort'); d.$('S.bkAt = 0'); await d.w.exportPlans(true);
  eq(d.$('S.bkAt'), 0, 'nicht gezählt'); ok(!/Sicherung nicht möglich/.test(d.page('plans')), 'keine Fehlermeldung'); eq(d.$('__downloads.length'), 0);
  /* Desktop: auch mit Teilen-Funktion des Browsers direkt der Download in den Cloud-Ordner (wie der Text sagt) */
  const f = await boot(); dsPlan(f); dsShare(f); dsUa(f, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'); await f.w.exportPlans(true);
  eq(f.$('__shared.length'), 0, 'Desktop: kein Teilen-Menü'); eq(f.$('__downloads.length'), 1, 'Desktop: Download');
  /* Der bisherige Knopf „Sicherung speichern“ bleibt unverändert (kein Teilen-Menü außerhalb von iOS) */
  const e = await boot(); dsPlan(e); dsShare(e); await e.w.exportPlans(); eq(e.$('__shared.length'), 0); eq(e.$('__downloads.length'), 1); e.noErrors();
});

test('Cloud-Sicherung: Laden auf dem zweiten Gerät, Hinweis bei älterer Datei, Rückgängig', async () => {
  const a = await boot(); dsPlan(a); await a.w.exportPlans(); const txt = await a.$('__downloads[0].blob').text();
  const imp = async (x, s) => { x.$(`bkImp = {o:bkParse(${JSON.stringify(s)}), name:'relentless-sicherung.json', full:true, n:1, date:''}`); x.w.render(); return x.text(); };
  const b = await boot(); dsPlan(b); b.$('S.bkAt = 0; S.bkChg = 0; S.bkEx = bkExeN()');
  ok(!/älter als deine letzte Sicherung|seit der letzten Sicherung etwas geändert/.test(await imp(b, txt)), 'neues Gerät ohne Änderungen: kein Hinweis');
  b.$('S.bkAt = Date.now() + 3600e3'); ok(/Diese Datei ist älter als deine letzte Sicherung auf diesem Gerät/.test(await imp(b, txt)), 'Datei älter als hiesige Sicherung');
  b.$('S.bkAt = 0; S.bkChg = 2'); ok(/Auf diesem Gerät hast du seit der letzten Sicherung etwas geändert/.test(await imp(b, txt)), 'ungesicherte Änderungen');
  ok(/Alles wiederherstellen/.test(b.text()) && /rückgängig machen/.test(b.text()), 'Wahl und Rückgängig wie bisher');
  b.noErrors();
  /* Gerade auf diesem Gerät gespeicherte Datei wieder laden: kein Hinweis „älter“ (S.bkAt = Zeitstempel der Datei) */
  const c = await boot(); dsPlan(c); c.$('{ const sf = saveFile; saveFile = async (n, d) => { __setNow(Date.now() + 5000); return sf(n, d); }; }'); /* Speichern dauert: Uhr läuft weiter */
  await c.w.exportPlans(); const t1 = await c.$('__downloads[0].blob').text(); c.$('S.bkChg = 0; S.bkEx = bkExeN()');
  eq(c.$('S.bkAt'), Date.parse(JSON.parse(t1).exported), 'S.bkAt = exported');
  ok(!/älter als deine letzte Sicherung/.test(await imp(c, t1)), 'eigene, gerade gespeicherte Datei: kein Hinweis');
  c.setNow(NOW0 + 60e3); c.$('bkImp = null'); await c.w.exportPlans(); const t2 = await c.$('__downloads[1].blob').text(); c.$('S.bkChg = 0');
  ok(/Diese Datei ist älter als deine letzte Sicherung/.test(await imp(c, t1)), 'frühere Datei nach neuerer Sicherung: Hinweis');
  ok(!/älter als deine letzte Sicherung/.test(await imp(c, t2)), 'neueste Datei: kein Hinweis'); c.noErrors();
});

test('Cloud-Sicherung: 14-Tage-Erinnerung führt zur Cloud, Hinweis mit Anker, Englisch vollständig', async () => {
  const a = await boot(); dsPlan(a); dsShare(a); a.$('S.bkAt = Date.now() - 15 * 864e5; S.bkAt0 = S.bkAt - 864e5; S.bkChg = 0; S.bkSnooze = 0');
  const t = a.page(null); ok(/Deine letzte Sicherung ist 15 Tage alt/.test(t) && /in deiner eigenen Cloud/.test(t), 'Erinnerung nennt die Cloud');
  const bs = [...a.w.document.querySelectorAll('#app section button')].filter(x => /^(Jetzt sichern|Später|Anderes Gerät)$/.test(x.textContent.trim()));
  eq(bs.length, 3, 'drei Knöpfe'); ok(bs.every(x => x.getBoundingClientRect().height >= 44), '44 pt');
  bs[0].click(); await a.tick(50); eq(a.$('__shared.length'), 1, '„Jetzt sichern“ öffnet das Teilen-Menü');
  a.w.bkCloudGo(); await a.tick(150); eq(a.$('pg'), 'plans', 'zur Seite Pläne und Sicherung'); ok(a.w.document.getElementById('fx-bkcloud'), 'Abschnitt da');
  eq(a.w.document.activeElement && a.w.document.activeElement.id, 'bkCloudB', 'Fokus auf dem Knopf');
  const dy = a.$(`DYK.find(x => x[0] === 'bkcloud')`); ok(dy && dy[3] === 'bkCloudGo()' && dy[4](), 'Hinweis in „Wusstest du schon?“ mit Anker');
  ok(a.$(`WN_DATA[225].some(x => x.go === 'set:plans' && /Cloud/.test(x.de) && /cloud/.test(x.en))`), 'Neuigkeiten-Eintrag');
  /* Englisch: keine fehlenden Übersetzungen in Abschnitt, Erinnerung, Hinweis beim Laden */
  a.w.__iMiss = new Map(); await a.en(); a.$('S.bkSnooze = 0; S.bkRem = 0'); a.page(null); a.page('plans');
  a.$(`Object.defineProperty(navigator, 'userAgent', {configurable:true, get:() => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'})`); a.page('plans');
  a.$(`Object.defineProperty(navigator, 'userAgent', {configurable:true, get:() => 'Mozilla/5.0 (Linux; Android 15)'})`); a.page('plans');
  for (const w of ['S.bkAt = Date.now() + 3600e3', 'S.bkAt = 0; S.bkChg = 2']) { a.$(w); a.$(`bkImp = {o:{exported:new Date(Date.now() - 864e5).toISOString(), plans:[]}, name:'x.json', full:true, n:1, date:''}`); a.w.render(); }
  eq([...a.w.__iMiss.keys()].filter(k => /Cloud|Gerät|Teilen|Datei|Sicherung|Server/.test(k)), [], 'alles übersetzt');
  ok(a.w.trText(dy[1]) !== dy[1] && a.w.trText(dy[2]) !== dy[2], 'Hinweis auf Englisch'); a.noErrors();
});
