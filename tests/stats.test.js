/* Anonyme Statistik: welche Ereignisse bei welcher Aktion gezählt werden (track wird im Test nur mitgeschrieben) */
R.file = 'stats';
const rec = a => { a.$('window.__tr = []; track = n => __tr.push(n);'); return () => a.w.__tr.splice(0); };
const tcxFile = (a, secs = 1800) => {
  const t0 = Date.UTC(2026, 10, 11, 6, 0, 0), pts = [];
  for (let i = 0; i < secs; i++) pts.push(`<Trackpoint><Time>${new Date(t0 + i * 1000).toISOString()}</Time><DistanceMeters>${i * 9}</DistanceMeters><HeartRateBpm><Value>135</Value></HeartRateBpm><Extensions><TPX><Watts>180</Watts></TPX></Extensions></Trackpoint>`);
  return new a.w.File([`<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Biking"><Lap><Track>${pts.join('')}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`], 'fahrt.tcx');
};
const waitFor = async (a, cond, ms = 3000) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Fail('Zeitüberschreitung'); await a.tick(20); } };

test('Plan erstellen, anpassen, unverändert übernehmen', async () => {
  const a = await boot(), got = rec(a);
  makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); eq(got(), ['plan-erstellt-ausfuehrlich']);
  a.w.edit(); a.w.finish(); eq(got(), ['plan-unveraendert']);
  a.w.edit(); a.$('S.d.hours = 10'); a.w.finish(); eq(got(), ['plan-angepasst']);
});

test('Schnellplanung wird als solche gezählt', async () => {
  const a = await boot(), got = rec(a);
  makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20', mode:'light'}); eq(got(), ['plan-erstellt-schnell']);
});

test('FTP-Quelle wählen', async () => {
  const a = await boot(), got = rec(a); a.w.setFtpSrc('test'); a.w.setFtpSrc('nopwr'); eq(got(), ['ftp-quelle-test', 'ftp-quelle-nopwr']);
});

test('Fahrt zur Einheit hochladen: nur bei Erfolg gezählt', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); const got = rec(a), i = a.$('todayIdx()');
  await a.w.exeUpload({files:[], value:''}, i); eq(got(), [], 'abgebrochene Dateiauswahl');
  await a.w.exeUpload({files:[tcxFile(a)], value:''}, i); eq(got(), ['fahrt-bewertet']); a.noErrors();
});

test('Fahrten hochladen (Fortschritt) und frühere Fahrten (Planung)', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); const got = rec(a);
  await a.w.uploadRides({files:[tcxFile(a)], value:''}); eq(got(), ['fahrten-hochgeladen']);
  await a.w.uploadRides({files:[tcxFile(a)], value:''}); eq(got(), [], 'bereits hochgeladen: nichts Neues');
  await a.w.uploadHist({files:[tcxFile(a, 1200)], value:''}); eq(got(), ['fahrten-einstieg-hochgeladen']);
});

test('Sicherung speichern und laden: je Vorgang genau einmal', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20'}); let got = rec(a);
  await a.w.exportPlans(); eq(got(), ['sicherung-gespeichert']);
  const d = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await d.blob.text();
  const b = await boot(); got = rec(b); await b.w.exportPlans(); eq(got(), [], 'ohne Plan wird nichts gespeichert');
  b.w.importPlans({files:[], value:''}); eq(got(), [], 'abgebrochene Dateiauswahl');
  b.w.importPlans({files:[new b.w.File([txt], d.name)], value:''}); await waitFor(b, () => !!b.$('bkImp')); eq(got(), [], 'Datei gewählt, noch nichts geladen');
  b.w.bkAddPlans(); eq(got(), ['sicherung-geladen']);
});

test('App installieren: nur gezählt, wenn der Browser es anbietet', async () => {
  const a = await boot(), got = rec(a);
  await a.w.instGo(); eq(got(), [], 'kein Angebot des Browsers');
  a.$('instEvt = {prompt: async () => {}}'); await a.w.instGo(); eq(got(), ['app-installieren-getippt']);
});
