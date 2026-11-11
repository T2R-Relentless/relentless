/* Fahrten einlesen (TCX, GPX, ZIP) und Trainingsdateien erzeugen (FIT, ZIP). Erwartete Werte sind von Hand gerechnet. */
R.file = 'files';

/* Synthetische Fahrt: watts(i) und hr(i) je Sekunde, 10 m pro Sekunde, konstante Höhe */
function tcx(secs, watts, {sport = 'Biking', hr = () => 140, alt = () => 100} = {}){
  const t0 = Date.UTC(2026, 10, 10, 7, 0, 0), pts = [];
  for (let i = 0; i < secs; i++) pts.push(`<Trackpoint><Time>${new Date(t0 + i * 1000).toISOString()}</Time><AltitudeMeters>${alt(i)}</AltitudeMeters><DistanceMeters>${i * 10}</DistanceMeters><HeartRateBpm><Value>${hr(i)}</Value></HeartRateBpm><Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Watts>${watts(i)}</Watts></TPX></Extensions></Trackpoint>`);
  return `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="${sport}"><Lap><Track>${pts.join('')}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}
const xml = (a, s) => new a.w.DOMParser().parseFromString(s, 'application/xml');
async function withPlan(){ const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-03-20', ftp:250}); return a; }

test('Konstante 200 W über eine Stunde: NP, IF, TSS, Bestwerte', async () => {
  const a = await withPlan(), r = a.w.summarize(a.w.parseTCX(xml(a, tcx(3600, () => 200))), 'fahrt.tcx');
  eq(r.sec, 3599, 'Dauer'); near(r.np, 200, 0.5, 'NP'); eq(r.IF, 0.8, 'IF bei FTP 250'); eq(r.tss, 64, 'TSS'); eq(r.est, false, 'nicht geschätzt');
  eq(r.km, 36, 'km'); eq(r.hm, 0, 'Höhenmeter'); eq(r.day, '2026-11-10'); eq(r.n, 'fahrt');
  eq([r.m1, r.m5, r.m20], [200, 200, 200], 'Bestwerte'); eq(r.m60, null, 'keine 60-Minuten-Bestleistung bei 3599 s');
});

test('Intervalle: NP stimmt mit unabhängiger Rechnung überein', async () => {
  const a = await withPlan(), w = i => (Math.floor(i / 180) % 2 ? 150 : 300);
  const r = a.w.summarize(a.w.parseTCX(xml(a, tcx(3600, w))), 'iv.tcx');
  /* Referenz: 30-s-Mittel der Sekundenwerte 0..3597 (die App rechnet mit dem Wert am Anfang jeder Sekunde), 4. Potenz */
  const v = Array.from({length:3599}, (_, i) => w(i)), roll = []; for (let i = 29; i < v.length; i++) { let s = 0; for (let k = i - 29; k <= i; k++) s += v[k]; roll.push(s / 30); }
  const np = Math.pow(roll.reduce((q, x) => q + x ** 4, 0) / roll.length, .25);
  near(r.np, np, 0.6, 'NP'); eq(r.m1, 300); eq(r.m5, 240, '5-min-Bestwert: 3 min 300 W + 2 min 150 W');
});

test('Höhenmeter mit 3-m-Schwelle gegen Messrauschen', async () => {
  const a = await withPlan(), alt = i => 100 + Math.min(i, 1000) * 0.5 + (i % 2 ? 1 : 0);
  const r = a.w.summarize(a.w.parseTCX(xml(a, tcx(1800, () => 180, {alt}))), 'berg.tcx');
  near(r.hm, 500, 4, 'etwa 500 hm trotz Rauschen');
});

test('Keine Radfahrt, zu kurz, ohne Zeitstempel: klare Fehlermeldungen', async () => {
  const a = await withPlan();
  await throws(() => a.w.parseTCX(xml(a, tcx(600, () => 100, {sport:'Running'}))), /keine Radfahrt/i, 'Laufen');
  await throws(() => a.w.summarize(a.w.parseTCX(xml(a, tcx(200, () => 100))), 'kurz.tcx'), /kürzer als 5 Minuten/, 'kurze Fahrt');
  await throws(() => a.w.parseGPX(xml(a, '<gpx><trk><trkseg><trkpt lat="50" lon="8"><ele>100</ele></trkpt></trkseg></trk></gpx>')), /keine Zeitstempel/, 'geplante Tour');
  await throws(() => a.w.parseGPX(xml(a, '<gpx><wpt lat="50" lon="8"/></gpx>')), /keine Trackpunkte/, 'nur Wegpunkte');
});

test('GPX: Strecke aus Koordinaten', async () => {
  const a = await withPlan(), t0 = Date.UTC(2026, 10, 10, 7), pts = [];
  for (let i = 0; i < 1200; i++) pts.push(`<trkpt lat="${(50 + i * 0.0001).toFixed(4)}" lon="8"><ele>100</ele><time>${new Date(t0 + i * 1000).toISOString()}</time></trkpt>`);
  const r = a.w.summarize(a.w.parseGPX(xml(a, `<gpx><trk><type>cycling</type><trkseg>${pts.join('')}</trkseg></trk></gpx>`)), 'g.gpx');
  near(r.km, 13.3, 0.1, '1199 × 11,1 m'); eq(r.sec, 1199); eq(r.est, true, 'ohne Leistung geschätzt');
});

test('ZIP: selbst erzeugtes Archiv lässt sich wieder entpacken', async () => {
  const a = await boot(), data = new a.w.TextEncoder().encode(tcx(400, () => 150));
  const z = a.w.zipOne('fahrt.tcx', data); eq([...z.slice(0, 4)], [0x50, 0x4B, 3, 4], 'Signatur');
  const u = await a.w.unpack(z.buffer, 'fahrt.zip'); eq(u.name, 'fahrt.tcx'); eq(u.data.length, data.length); eq(a.$('crc32')(u.data), a.$('crc32')(data));
});

test('GZIP-Fahrt wird entpackt', async () => {
  const a = await boot(), data = new a.w.TextEncoder().encode(tcx(400, () => 150));
  const gz = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  const u = await a.w.unpack(gz.buffer, 'fahrt.tcx.gz'); eq(u.name, 'fahrt.tcx'); eq(u.data.length, data.length);
});

test('FIT-Workout: Kopf, Prüfsummen und Schritte', async () => {
  const a = await withPlan(), p = a.$('S.p'), plan = a.$('S.plan');
  const x = plan.find(q => q.iv) || a.$('genWeek')(p, 3).find(q => q.iv); ok(x, 'Intervalleinheit im Plan');
  const steps = a.w.fitSteps(p, x, null), b = a.w.fitBytes('Test', steps);
  eq(String.fromCharCode(...b.slice(8, 12)), '.FIT'); eq(b[0], 14, 'Kopflänge');
  eq(a.w.fitCrc(b.slice(0, 14)), 0, 'Kopf-Prüfsumme'); eq(a.w.fitCrc(b), 0, 'Datei-Prüfsumme');
  const len = b[4] | b[5] << 8 | b[6] << 16 | b[7] << 24; eq(len, b.length - 16, 'Datenlänge im Kopf');
  await snap('files', 'fit-schritte', steps);
});

test('Export landet als Download (FIT und ZWO)', async () => {
  const a = await withPlan(), i = a.$('S.plan').findIndex(q => q.m > 0);
  a.$('viewPlan = S.plan'); a.w.exportFit(i, -1, 'fit'); a.w.exportFit(i, -1, 'zwo'); await a.tick(30);
  const d = a.w.__downloads; eq(d.length, 2, 'zwei Dateien'); ok(/\.fit$/.test(d[0].name) && /\.zwo$/.test(d[1].name), d.map(x => x.name).join(', '));
  const zwo = await d[1].blob.text(); ok(/<workout_file>/.test(zwo) && /<workout>/.test(zwo), 'ZWO-Struktur');
  await snap('files', 'export-namen', d.map(x => x.name));
});
