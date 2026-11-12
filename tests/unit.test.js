/* Grundbausteine: Datum, Sicherheit, Belastungswerte, Prüfsummen */
R.file = 'unit';

test('Kalenderdatum: heute, morgen, Monatswechsel', async () => {
  const a = await boot();
  eq(a.$('iso(0)'), '2026-11-11'); eq(a.$('iso(1)'), '2026-11-12'); eq(a.$('iso(-11)'), '2026-10-31'); eq(a.$('iso(20)'), '2026-12-01');
  eq(a.$('todayIdx()'), 2, 'Mittwoch ist Index 2');
});

test('Kalenderdatum über die Sommerzeit-Umstellung', async () => {
  const a = await boot({now:at(2026, 3, 28, 23, 30)});
  eq(a.$('iso(0)'), '2026-03-28'); eq(a.$('iso(1)'), '2026-03-29'); eq(a.$('iso(2)'), '2026-03-30');
  a.setNow(at(2026, 10, 25, 0, 30));
  eq(a.$('iso(0)'), '2026-10-25', 'Winterzeit-Nacht'); eq(a.$('iso(1)'), '2026-10-26');
});

test('Wochenanfang (mondayOf) inklusive Sonntag und Umstellung', async () => {
  const a = await boot();
  eq(a.$("mondayOf('2026-11-11')"), '2026-11-09'); eq(a.$("mondayOf('2026-11-15')"), '2026-11-09', 'Sonntag gehört zur Woche davor');
  eq(a.$("mondayOf('2026-11-16')"), '2026-11-16'); eq(a.$("mondayOf('2026-03-29')"), '2026-03-23'); eq(a.$("mondayOf('2027-01-01')"), '2026-12-28');
});

test('Reines Datum wird lokal gelesen, nicht als UTC', async () => {
  const a = await boot();
  eq(a.$("dOnly('2026-02-03').getDate()"), 3); eq(a.$("dOnly('2026-02-03').getHours()"), 12);
  eq(a.$("fmt('2027-02-03')"), '03.02.2027');
  eq(a.$("wd({start:'2026-11-09'}, 1)"), '09.11.'); eq(a.$("wd({start:'2026-11-09'}, 3)"), '23.11.');
  eq(a.$("wd({start:'2026-03-23'}, 2)"), '30.03.', 'Woche nach der Sommerzeit-Umstellung');
});

test('HTML wird maskiert (esc)', async () => {
  const a = await boot();
  eq(a.$('esc')(`<img src=x onerror="alert('1')">&`), '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;');
  eq(a.$('esc')(null), ''); eq(a.$('esc')(0), '0');
});

test('Werte für onclick können keinen Code bilden (ja)', async () => {
  const a = await boot(), ja = a.w.ja;
  eq(ja(1.5), '1.5'); eq(ja(NaN), '0'); eq(ja(Infinity), '0'); eq(ja(true), 'true'); eq(ja(null), 'null');
  const bad = ja(`a');alert(document.cookie)//`); ok(!/[()'";`<>]/.test(bad), 'gefährliche Zeichen entfernt: ' + bad);
  eq(ja('Straße 5'), 'Straße 5');
});

test('Gespeicherte Aktionen nur aus der erlaubten Liste (exeAct)', async () => {
  const a = await boot(), x = a.w.exeAct;
  eq(x('addRecW()'), 'addRecW()'); eq(x('setFtpNow(250)'), 'setFtpNow(250)'); eq(x('setFtpNow(250.5, -3)'), 'setFtpNow(250.5, -3)'); eq(x('retest(2)'), 'retest(2)');
  eq(x('alert(1)'), ''); eq(x('setFtpNow(250);alert(1)'), ''); eq(x('setFtpNow(9999999)'), ''); eq(x(42), '');
});

test('TSS je Einheitentyp', async () => {
  const a = await boot(), tss = a.$('tss');
  /* M5: Belastung aus dem Aufbau der Einheit (Ein-/Ausfahren 60 %, Pausen 50 %, Belastung Mitte des Zielbereichs, NP als 4.-Potenz-Mittel) */
  eq(tss({m:60, t:'thr', lo:95, hi:105}), 100); eq(tss({m:90, t:'base', lo:56, hi:75}), 64); eq(tss({m:0, t:'rest'}), 0); eq(tss({m:240, t:'long', lo:56, hi:75}), 172);
  eq(tss({m:85, t:'thr', lo:95, hi:105, iv:{reps:2, work:20, rest:10, lo:95, hi:105, wu:20, cd:15}}), 103, 'Schwelle 2×20 mit Ein- und Ausfahren');
  eq(tss({m:60, t:'vo2', lo:115, hi:125, iv:{sets:3, reps:13, work:.5, rest:.25, sr:3, lo:115, hi:125, wu:15, cd:10}}), 75, '30/15: kurze Wechsel als Mittel der Serie');
  ok(tss({m:66, t:'vo2', lo:150, hi:200, iv:{reps:8, work:.5, rest:4.5, lo:150, hi:200, wu:20, cd:10}}) < tss({m:66, t:'thr', lo:95, hi:105}), 'Antritte zählen weniger als die gleiche Zeit an der Schwelle');
  eq(tss({m:120, t:'race', lo:60, hi:100}), 173, 'Rennen 2 Std.: IF 1 − 0,1·ln 2');
});

test('Zonen-Grenzen', async () => {
  const a = await boot(), z = a.$('zone');
  eq([55, 56, 75, 76, 90, 91, 105, 106, 150].map(z), ['Z1', 'Z2', 'Z2', 'Z3', 'Z3', 'Z4', 'Z4', 'Z5', 'Z5']);
});

test('Dauer- und Datumsformate (Vergleichsstand)', async () => {
  const a = await boot();
  await snap('unit', 'formate', {mm:[0, 1, 45, 60, 61, 90, 150, 600].map(m => a.$('mm')(m)), durT:[0.5, 1, 1.5, 8].map(m => a.$('durT')(m))});
});

test('Prüfsummen: FNV-1a (Sprachdateien), CRC-32 (ZIP), CRC-16 (FIT)', async () => {
  const a = await boot(), enc = s => new a.w.TextEncoder().encode(s);
  eq(a.$('vcHash')(''), '811c9dc5'); eq(a.$('vcHash')('a'), 'e40c292c'); eq(a.$('vcHash')('foobar'), 'bf9cf968');
  eq(a.$('crc32')(enc('123456789')).toString(16), 'cbf43926');
  eq(a.w.fitCrc(enc('123456789')).toString(16), 'bb3d');
});

test('Zahlen-Grenzen der Eingaben (rngClamp)', async () => {
  const a = await boot(), c = a.$('rngClamp');
  await snap('unit', 'grenzen', {ftp:[c('ftp', 250, 0), c('ftp', 5, 0), c('ftp', 5000, 0), c('ftp', 'abc', 200)], weight:[c('weight', 70, 75), c('weight', 0, 75)], hours:[c('hours', 8, 6), c('hours', 100, 6)]});
});
