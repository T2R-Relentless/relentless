/* F18: Verlaufsgrafik im Logbuch */
R.file = 'logbook';
const ride = (id, day, km, sec, hm, ex = {}) => ({id, n:'Fahrt ' + id, day, ts:day + 'T08:00:00.000Z', km, sec, hm, tss:50, ...ex});
const RIDES = [
  ride('a', '2026-12-27', 40, 5400, 300),   /* So → ISO-Woche ab 21.12.2026, Dezember */
  ride('b', '2026-12-28', 30, 3600, 200),   /* Mo → Woche ab 28.12.2026, Dezember */
  ride('c', '2027-01-03', 50, 7200, 600),   /* So → gleiche Woche ab 28.12.2026 (über den Jahreswechsel), Januar */
  ride('d', '2027-01-04', 20, 2700, 100),   /* Mo → Woche ab 04.01.2027 */
  ride('e', '2027-03-28', 60, 9000, 900),   /* So, Tag der Umstellung auf Sommerzeit → Woche ab 22.03.2027 */
  ride('f', '2027-03-29', 25, 3000, 150),   /* Mo → Woche ab 29.03.2027 */
  ride('g', '2027-03-30', 35, 4500, 0, {in:1}) /* Rolle */
];
async function lbApp(now = at(2027, 4, 7)){
  const a = await boot({now}); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10'});
  a.$(`S.man = ${JSON.stringify(RIDES)}; S.lb = {s1:{k:'s', day:'2027-03-29', n:'Kraft', sec:2700, sk:'str', at:1}}; save();`); return a;
}
const pick = (o, ...k) => Object.fromEntries(k.map(x => [x, o[x]]));

test('Summen je ISO-Woche (Montag bis Sonntag) über Jahreswechsel und Zeitumstellung', async () => {
  const a = await lbApp(), W = a.$("lbSums('w', {roll:true, all:false})");
  eq(pick(W['2026-12-21'], 'km', 'sec', 'hm', 'n'), {km:40, sec:5400, hm:300, n:1});
  eq(pick(W['2026-12-28'], 'km', 'sec', 'hm', 'n'), {km:80, sec:10800, hm:800, n:2}, 'Woche über den Jahreswechsel');
  eq(W['2027-01-04'].km, 20); eq(W['2027-03-22'].km, 60, 'Sonntag der Zeitumstellung in seiner Woche'); eq(W['2027-03-29'].km, 60, 'inkl. Rolle');
  const W2 = a.$("lbSums('w', {roll:false, all:false})"); eq(W2['2027-03-29'].km, 25, 'ohne Rolle');
  const W3 = a.$("lbSums('w', {roll:true, all:true})"); eq(W3['2027-03-29'].sec, 3000 + 4500 + 2700, 'Zeit mit Kraft bei „Alle Einheiten“'); eq(W3['2027-03-29'].km, 60, 'Kraft zählt nicht bei Distanz');
});

test('Summen je Monat', async () => {
  const a = await lbApp(), M = a.$("lbSums('m', {roll:true, all:false})");
  eq([M['2026-12'].km, M['2027-01'].km, M['2027-03'].km], [70, 70, 120]); eq(M['2027-03'].hm, 1050);
});

test('Perioden: 12 Wochen bzw. Monate, lückenlos, auch über die Zeitumstellung', async () => {
  const a = await lbApp(), w = a.$("lbPeriods('w', 0)"), m = a.$("lbPeriods('m', 0)");
  eq(w.length, 12); eq(w[11], '2027-04-05'); for (let i = 1; i < 12; i++) eq(a.$(`addD('${w[i - 1]}', 7)`), w[i], 'Abstand 7 Tage');
  eq(m, ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
  eq(a.$("lbPeriods('w', 1)")[11], a.$(`addD('${w[0]}', -7)`), 'eine Seite zurück schließt lückenlos an');
  eq(a.$("lbPrevYear('m', '2027-03')"), '2026-03'); eq(a.$("lbPrevYear('w', '2027-03-29')"), '2026-03-30');
});

test('Logbuch: Kopfzeile, Balken antippen filtert die Liste, Blättern, Tabelle', async () => {
  const a = await lbApp(); let t = a.page('logbook');
  ok(/Diese Woche: 0 km · 0:00 h · 0 Hm/.test(t), 'Kopfzeile aktuelle Woche: ' + t.slice(0, 200));
  a.$("lbSet('sel', '2027-03-29')"); t = a.text(); ok(/30\.03\.–04\.04\.2027|29\.03\.–04\.04\.2027/.test(t) && /60 km · 2:05 h · 150 Hm/.test(t), 'Werte der angetippten Woche: ' + t.slice(0, 300));
  ok(t.includes('Fahrt f') && t.includes('Fahrt g') && !t.includes('Fahrt e'), 'Liste auf die Woche gefiltert');
  a.$("lbSet('mode', 'm'); lbSet('met', 'hm')"); eq(a.w.document.querySelectorAll('#lb-chart table tbody tr').length, 12, 'Tabelle für Screenreader');
  ok(/Dieser Monat/.test(a.text()), 'Monatsansicht'); a.$("lbSet('off', 1)"); eq(a.$('lbCh.off'), 1); a.$("lbSet('off', -1)"); eq(a.$('lbCh.off'), 0);
  a.$("lbSet('yoy', true)"); ok(a.w.document.querySelectorAll('#lb-chart svg .lbc-prev').length === 12, 'Vorjahr als zweite Reihe');
  ok(/keine Fahrten gespeichert/.test(a.text()) && !a.w.document.querySelector('#lb-chart .lbc-lg'), 'ohne Vorjahresfahrten: Hinweis statt Legende');
  a.$(`S.man.push({id:'py', n:'Fahrt py', day:'2026-04-01', ts:'2026-04-01T08:00:00.000Z', km:50, sec:7200, hm:400, tss:60}); save(); render()`);
  ok(a.w.document.querySelector('#lb-chart .lbc-lg') && /Vorjahr \(Apr 2026\): 400 hm/.test(a.text()), 'Legende und Vergleich mit dem Vorjahresmonat: ' + (a.text().match(/Vorjahr \(.{0,40}/) || [''])[0]);
  ok(a.w.document.querySelectorAll('#lb-chart .lbc-nav').length === 2 && a.w.document.querySelectorAll('#lb-chart .lbc-gl').length >= 2, 'Pfeile über der Grafik, Achse mit Werten'); a.noErrors();
});

test('Rolle wird erkannt: Fahrt ohne GPS-Position', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10'});
  const mk = (pos) => { const pts = []; for (let i = 0; i < 1200; i++) pts.push(`<Trackpoint><Time>${new Date(Date.UTC(2026, 10, 10, 7) + i * 1000).toISOString()}</Time>${pos ? `<Position><LatitudeDegrees>${50 + i * 1e-4}</LatitudeDegrees><LongitudeDegrees>8</LongitudeDegrees></Position>` : ''}<DistanceMeters>${i * 9}</DistanceMeters></Trackpoint>`); return `<TrainingCenterDatabase><Activities><Activity Sport="Biking"><Lap><Track>${pts.join('')}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`; };
  const x = s => new a.w.DOMParser().parseFromString(s, 'application/xml');
  eq(a.w.summarize(a.w.parseTCX(x(mk(false))), 'zwift.tcx').in, 1, 'ohne Position: Rolle'); eq(a.w.summarize(a.w.parseTCX(x(mk(true))), 'draussen.tcx').in, undefined, 'mit Position: draußen');
});

test('Logbuch-Grafik hell, dunkel und englisch ohne Fehler', async () => {
  const a = await lbApp(); a.$("S.theme = 'dark'"); a.page('logbook'); await a.en(); a.page('logbook'); ok(/This week/.test(a.text()), 'englisch'); a.noErrors();
});

test('Durchschnitt ab der ersten Periode mit Fahrten', async () => {
  const a = await lbApp(); a.page('logbook'); a.$("lbSet('mode', 'm')");
  /* Dez 70, Jan 70, Feb 0, Mär 120, Apr 0 → 260 / 5 = 52 km; die leeren Monate davor zählen nicht */
  ok(/Durchschnitt: 52 km je Monat/.test(a.text()), a.text().match(/Durchschnitt[^\n]*/)[0]);
});
