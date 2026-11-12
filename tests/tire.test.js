/* F22: Reifendruckrechner */
R.file = 'tire';
const BASE = {type:'road', surf:'smooth', wet:false, rider:75, bike:8, bag:0, w:28, cas:'std', wheel:'700c', hook:'hook', inner:21, tube:'tl', maxTire:0, maxRim:0};

test('Plausibilität: 75 kg + 8 kg Rad, 28 mm auf 21 mm innen, tubeless, trocken → 4,0–4,8 bar', async () => {
  const a = await boot(), c = a.w.tpCalc(BASE);
  ok(c.rBar >= 4.0 && c.rBar <= 4.8, 'hinten ' + c.rBar); ok(c.fBar >= 4.0 && c.fBar <= 4.8, 'vorn ' + c.fBar); eq(c.warn, []); eq(c.rearPct, 55);
});

test('Feste Beispielrechnungen (Vergleichsstand)', async () => {
  const a = await boot(), cases = {
    'rennrad-28-tubeless':BASE, 'rennrad-25-schlauch':{...BASE, w:25, inner:19, tube:'tube'}, 'rennrad-32-rau':{...BASE, w:32, inner:23, surf:'rough'},
    'kopfstein-30':{...BASE, w:30, inner:21, surf:'cobble'}, 'gravel-40':{...BASE, type:'gravel', surf:'rough', w:40, inner:25, bike:9.5, bag:1},
    'cx-33':{...BASE, type:'cx', surf:'rough', w:33, inner:21}, '650b-47':{...BASE, type:'gravel', surf:'rough', w:47, inner:25, wheel:'650b'}};
  const out = {}; for (const [k, o] of Object.entries(cases)) { const c = a.w.tpCalc(o); out[k] = [c.fBar, c.rBar, c.fPsi, c.rPsi, c.warn.length]; }
  await snap('tire', 'beispiele', out);
});

test('Hookless-Grenze greift (5 bar, 72,5 psi) mit Warnhinweis', async () => {
  const a = await boot(), c = a.w.tpCalc({...BASE, rider:110, w:25, inner:19, hook:'hookless'});
  eq(c.rBar, 5); eq(c.rPsi, 72.5); ok(c.fBar <= 5); ok(c.warn.some(w => /Hookless.*5 bar.*ETRTO/.test(w)), 'Warnung');
  const d = a.w.tpCalc({...BASE, rider:110, w:25, inner:19, hook:'hook'}); ok(d.rBar > 5, 'mit Haken keine 5-bar-Grenze (' + d.rBar + ')');
  const e = a.w.tpCalc({...BASE, rider:110, w:25, inner:19, maxTire:6}); eq(e.rBar, 6); ok(e.warn.some(w => /Reifens/.test(w)), 'Reifen-Maximum');
});

test('Umrechnung bar ↔ psi und Rundung', async () => {
  const a = await boot();
  for (let k = 0; k < 40; k++) { const c = a.w.tpCalc({...BASE, rider:50 + k * 2, w:[25, 28, 32, 40][k % 4]}); [[c.fBar, c.fPsi], [c.rBar, c.rPsi]].forEach(([b, p]) => {
    ok(Math.abs(b * 20 - Math.round(b * 20)) < 1e-9, 'bar auf 0,05 gerundet: ' + b); ok(Math.abs(p * 2 - Math.round(p * 2)) < 1e-9, 'psi auf 0,5: ' + p); near(p, b * 14.5038, .55, 'psi passt zu bar'); }); }
});

test('Hinten immer mindestens so hoch wie vorn, Nässe senkt den Druck', async () => {
  const a = await boot(); let n = 0;
  for (const type of ['road', 'gravel', 'cx']) for (const w of [25, 28, 32, 38, 45]) for (const rider of [55, 75, 95]) for (const tube of ['tube', 'tl']) {
    const o = {...BASE, type, w, rider, tube, surf:type === 'road' ? 'smooth' : 'rough'}, c = a.w.tpCalc(o), wet = a.w.tpCalc({...o, wet:true}); n++;
    ok(c.rBar >= c.fBar, `${type} ${w} mm ${rider} kg: hinten ${c.rBar} ≥ vorn ${c.fBar}`);
    if (!c.warn.length && !wet.warn.length) ok(wet.rBar < c.rBar && wet.fBar <= c.fBar, `nass niedriger (${wet.rBar} < ${c.rBar})`); }
  ok(n === 90);
});

test('Mindestdruck mit Warnung, keine Empfehlung ohne Angaben', async () => {
  const a = await boot(), c = a.w.tpCalc({...BASE, rider:45, bike:7, w:32, inner:25, tube:'tube', surf:'cobble'});
  ok(c.fBar >= 3.0 && c.warn.some(w => /Mindestdruck 3 bar/.test(w)), 'Mindestdruck Schlauch 3 bar: ' + c.fBar + ' ' + c.warn.join(' '));
  eq(a.w.tpCalc({...BASE, w:0}), null);
});

test('Seite unter Mehr → Werkzeuge: Fahrergewicht aus F7, Eingaben gespeichert, zwei Profile', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', weight:68}); ok(/Werkzeuge\s+Reifendruck/i.test(a.page('more')), 'Eintrag unter Mehr');
  let t = a.page('tool-tire'); ok(/Empfohlener Startwert/i.test(t) && /Startwert – nach Gefühl/.test(t), 'Ergebnis und Hinweis'); ok(/76 kg Gesamtgewicht/.test(t), '68 kg Fahrer + 8 kg Rad');
  a.w.tpSet('w', '32'); a.w.tpSet('act', 'gravel'); a.w.tpSet('wet', true); eq(a.$('S.tire.prof.road.w'), 32); eq(a.$('S.tire.prof.gravel.wet'), true);
  const b = await boot({store:a.store()}); eq(b.$('S.tire.prof.road.w'), 32, 'nach Neustart erhalten'); b.page('tool-tire'); await b.en(); b.page('tool-tire'); b.noErrors();
});

test('Gleicher Druck an der Grenze: Begründung passt', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10'}); a.page('tool-tire');
  a.$("tpSet('hook','hookless'); tpSet('rider','110'); tpSet('w','25')"); const t = a.text();
  ok(/Vorn und hinten gleich, weil eine Grenze erreicht ist/.test(t) && !/Hinten höher/.test(t), 'Begründung bei gleichem Druck');
});
