/* F21: Vergleich mit dem Durchschnitt und mit sich selbst in „Wusstest du schon?“ */
R.file = 'compare';
async function cmpApp(d, ex = ''){ const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', ...d}); if (ex) a.$(ex); return a; }
const facts = a => a.$('cmpFacts(S.p)');

test('Beispielrechnung: 3,6 W/kg, Männer', async () => {
  const a = await cmpApp({ftp:270, weight:75}, "S.p.cmpG = 'm'"), F = facts(a), w = F.find(f => f.id === 'cmp-wkg'), c = F.find(f => f.id === 'cmp-cat');
  eq(w.de, 'Mit 3,6 W/kg trittst du etwa 60 % mehr als ein untrainierter Mann (etwa 2,2 W/kg).'); eq(w.en, 'At 3.6 W/kg you put out about 60% more than an untrained man (about 2.2 W/kg).');
  eq(c.de, 'Deine FTP von 3,6 W/kg liegt im Bereich „gut trainiert“ der Leistungsprofil-Tabellen für Männer.');
});

test('Frauen: eigene Tabelle', async () => {
  const a = await cmpApp({ftp:200, weight:60}, "S.p.cmpG = 'f'"), F = facts(a);
  ok(/untrainierte Frau \(etwa 1,8 W\/kg\)/.test(F.find(f => f.id === 'cmp-wkg').de)); ok(/„gut trainiert“ .*für Frauen/.test(F.find(f => f.id === 'cmp-cat').de), '3,3 W/kg Frauen: gut trainiert');
});

test('Ohne Vergleichsgruppe kein geschlechtsbezogener Satz', async () => {
  const a = await cmpApp({ftp:270, weight:75}), F = facts(a); ok(F.length >= 1, 'es gibt Vergleiche');
  F.forEach(f => ok(!/Mann|Männer|Frau|Frauen|\bmen\b|women|\bman\b|woman/.test(f.de + ' ' + f.en), 'geschlechtsneutral: ' + f.de));
  ok(F.some(f => /untrainierte Erwachsene im Mittel \(etwa 2 W\/kg\)/.test(f.de)), 'Vergleich mit Erwachsenen allgemein'); ok(!F.some(f => f.id === 'cmp-cat'), 'keine Kategorie ohne Gruppe');
});

test('„Keine Angabe“ überschreibt das Geschlecht aus der Planung, wird nicht erraten', async () => {
  const a = await cmpApp({ftp:270, weight:75, sex:'m'}); eq(a.$('cmpGroup(S.p)'), 'm', 'Angabe aus der Planung');
  a.w.cmpSetG(''); eq(a.$('cmpGroup(S.p)'), '', 'Keine Angabe gewählt'); ok(!facts(a).some(f => /Mann/.test(f.de)));
  const b = await cmpApp({ftp:270, weight:75}); eq(b.$('cmpGroup(S.p)'), '', 'ohne Angabe keine Gruppe');
});

test('Unter dem Durchschnitt: Fortschritt statt Vergleich', async () => {
  const a = await cmpApp({ftp:120, weight:75}, "S.p.cmpG = 'm'; S.done = {0:true, 1:true, 2:true, 3:true}"), F = facts(a);
  ok(!F.some(f => f.id === 'cmp-wkg' || f.id === 'cmp-cat'), 'kein Vergleich mit dem Durchschnitt');
  eq(F.find(f => f.id === 'cmp-done').de, 'Du hast schon 4 Einheiten deines Plans geschafft. Jede davon macht dich fitter als beim Start.');
});

test('Mit sich selbst: FTP seit Planstart und Strecke des Monats als Luftlinie', async () => {
  const a = await cmpApp({ftp:250, weight:75});
  const rides = [5, 7, 9, 10].map((d, i) => ({id:'r' + i, n:'Fahrt', day:`2026-11-0${d}`.replace('-010', '-10'), ts:'2026-11-05T08:00:00.000Z', km:75, sec:9000, hm:500, tss:90}));
  a.$(`S.p.ftp = 262; S.p.ftpStart = 250; S.man = ${JSON.stringify(rides)}; save();`); const F = facts(a);
  eq(F.find(f => f.id === 'cmp-ftp').de, '+12 W FTP seit Planstart, das sind 0,16 W/kg mehr.');
  near(a.$("cmpKm('Hamburg', 'Berlin')"), 255, 3, 'Luftlinie Hamburg–Berlin'); ok(/300 km gefahren, so weit wie von Hamburg nach Berlin/.test(F.find(f => f.id === 'cmp-km').de), F.find(f => f.id === 'cmp-km').de);
});

test('Wiederholung wie bei den Tipps: frühestens nach 60 Tagen', async () => {
  const a = await cmpApp({ftp:270, weight:75}); a.$("cmpShown('cmp-wkg'); dykPut({cur:'', day:''})"); ok(!a.$('cmpDyk()').some(t => t[0] === 'cmp-wkg'), 'heute gezeigt → nicht erneut');
  a.setNow(at(2026, 12, 30)); ok(!a.$('cmpDyk()').some(t => t[0] === 'cmp-wkg'), 'nach 49 Tagen noch nicht');
  a.setNow(at(2027, 1, 11)); ok(a.$('cmpDyk()').some(t => t[0] === 'cmp-wkg'), 'nach 61 Tagen wieder möglich');
});

test('Karte zeigt den Vergleich (deutsch und englisch), Knopf führt zu Gewicht und FTP', async () => {
  const a = await cmpApp({ftp:270, weight:75}, "S.p.cmpG = 'm'"); a.w.localStorage.setItem('relentless.dyk', JSON.stringify({cur:'cmp-wkg', day:a.$('iso(0)'), seen:['cmp-wkg']}));
  ok(/etwa 60 % mehr als ein untrainierter Mann/.test(a.page(null)), 'deutsch'); await a.en(); ok(/about 60% more than an untrained man/.test(a.page(null)), 'englisch');
  const b = [...a.w.document.querySelectorAll('button')].find(x => /cmpGo/.test(x.getAttribute('onclick') || '')); b.click(); eq(a.$('pg'), 'set-wf'); ok(/Vergleichsgruppe|Comparison group/.test(a.text())); a.noErrors();
});
