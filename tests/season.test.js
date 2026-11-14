/* F17: Zielzeit, Form und Pacing für alle Events der Saison, Tapering nach Priorität */
R.file = 'season';
const SEAS = SCEN[1]; /* Hauptrennen 10.07.2027 + A 18.04., B 30.05., C 12.06. */
async function seasonWithRides(){
  const a = await boot(); makePlan(a, SEAS.d, SEAS.subs); const rides = [];
  for (let d = new Date('2026-10-20T12:00:00'); d < new Date('2026-11-11T12:00:00'); d.setDate(d.getDate() + 2)) { const day = d.toISOString().slice(0, 10); rides.push({id:'r' + day, n:'Fahrt', day, ts:day + 'T07:00:00.000Z', sec:5400, tss:80, km:40, hm:300}); }
  a.$(`S.man = ${JSON.stringify(rides)}; save(); render();`); return a;
}
const idOf = (a, name) => a.$(`(S.p.subs.find(s => s.name === '${name}') || {}).id`);

test('Jedes Event bekommt Zielzeit, Form am Eventtag und Pacing', async () => {
  const a = await seasonWithRides(); a.w.evSet(idOf(a, 'Kriterium'), 'hm', '0'); /* flaches Kriterium: Nutzer trägt 0 hm ein */
  const F = a.w.seasonForecast(a.$('S.p'));
  eq(F.map(o => o.prio + ':' + o.name), ['A:Frühjahrsklassiker', 'B:Bergzeitfahren', 'C:Kriterium', 'A:Hauptrennen']);
  F.forEach(o => { ok(o.t > 0 && o.kmh > 15 && o.kmh < 50, `${o.name}: Zielzeit ${o.t} min, ${o.kmh} km/h`); ok(o.form && isFinite(o.form.tsb) && o.form.ctl > 0, `${o.name}: Form`);
    ok(o.pace.wLo < o.pace.wHi && o.pace.wHi <= o.pace.wCl, `${o.name}: Pacing`); ok(o.ftp >= 280, `${o.name}: FTP-Prognose ${o.ftp}`); if (o.tAmb) ok(o.tAmb <= o.t, `${o.name}: ambitioniert schneller`); });
  eq(F.find(o => o.name === 'Bergzeitfahren').kind, 'tt', 'Bergzeitfahren als Zeitfahren erkannt');
  await snap('season', 'prognose', F.map(o => ({n:o.name, t:o.t, tAmb:o.tAmb || null, ftp:o.ftp, form:o.form, pace:[o.pace.wLo, o.pace.wHi, o.pace.wCl], kind:o.kind})));
  a.noErrors();
});

test('Tapering nach Priorität: A volles, B kurzes (3 Tage), C keines', async () => {
  const a = await boot(); makePlan(a, SEAS.d, SEAS.subs); const p = a.$('S.p'), names = (P) => P.map(x => x.n);
  const dayAt = ds => { const w = a.$(`seasWk(S.p, '${ds}')`), i = (a.$(`(new Date('${ds}T12:00:00').getDay() + 6) % 7`)); return {w, i}; };
  const without = id => ({...p, subs:p.subs.filter(s => s.id !== id)});
  /* A: Saison in Abschnitte geteilt, Tapering endet in der Woche des A-Events */
  const A = dayAt('2027-04-18'), ph = a.$('phases')(p); ok(ph.some(x => x.key === 'taper' && x.to === A.w), 'Tapering-Phase vor dem A-Event');
  /* B: drei Tage davor verändert */
  const B = dayAt('2027-05-30'), bW = a.$('genWeek')(p, B.w), bW0 = a.$('genWeek')(without(idOf(a, 'Bergzeitfahren')), B.w);
  const changedB = [1, 2, 3].filter(k => B.i - k >= 0 && bW[B.i - k].n !== bW0[B.i - k].n).length; ok(changedB >= 1, 'B: Tage vorher angepasst (' + names(bW).join(' | ') + ')');
  ok(bW.some(x => /Aktivierung vor Bergzeitfahren/.test(x.n)), 'B: Aktivierung am Vortag');
  /* C: Tage davor unverändert */
  const C = dayAt('2027-06-12'), cW = a.$('genWeek')(p, C.w), cW0 = a.$('genWeek')(without(idOf(a, 'Kriterium')), C.w);
  eq(cW.slice(0, C.i).map(x => x.n), cW0.slice(0, C.i).map(x => x.n), 'C: keine Entlastung davor');
  ok(/Zwischenevent \(C\): Kriterium/.test(cW[C.i].n), 'C-Rennen im Plan');
});

test('Karte „Tage bis“ zeigt das nächste Event und öffnet die Saisonübersicht', async () => {
  const a = await boot(); makePlan(a, SEAS.d, SEAS.subs); const t = a.page(null);
  ok(/Tage bis\s+Frühjahrsklassiker/.test(t), 'nächstes Event: ' + t.slice(0, 400)); ok(/Danach: Hauptrennen/.test(t), 'Hauptevent danach');
  const b = [...a.w.document.querySelectorAll('button.gcard')][0]; ok(b, 'Karte vorhanden'); b.click(); eq(a.$('pg'), 'ev-saison');
  const L = a.text(); ['Frühjahrsklassiker', 'Bergzeitfahren', 'Kriterium', 'Hauptrennen'].forEach(n => ok(L.includes(n), n + ' in der Liste')); a.noErrors();
});

test('Fehlende Distanz: einmal fragen, nicht raten', async () => {
  const a = await boot(); makePlan(a, SEAS.d, [...SEAS.subs, {name:'Vereinsrennen', date:'2027-05-09', prio:'C', dist:'', hm:''}]);
  a.$("S.p.subs.forEach(s => { if (s.name === 'Vereinsrennen') { s.dist = ''; s.hm = ''; } })");
  const o = () => a.w.seasonForecast(a.$('S.p')).find(x => x.name === 'Vereinsrennen');
  eq(o().miss, 'dist'); eq(o().t, undefined, 'keine geratene Zielzeit');
  ok(/Angaben zu Vereinsrennen/.test(a.page('ev-saison')), 'Frage erscheint'); const id = idOf(a, 'Vereinsrennen');
  a.w.evSet(id, 'skip'); ok(!/Angaben zu Vereinsrennen/.test(a.text()), 'nach „Später“ nicht mehr gefragt');
  a.w.evSet(id, 'dist', '62,5'); a.w.evSet(id, 'hm', '480'); eq([o().dist, o().hm, o().miss], [62.5, 480, '']); ok(o().t > 0, 'jetzt mit Zielzeit'); a.noErrors();
});

test('Formkurve markiert jedes Event der Saison', async () => {
  const a = await seasonWithRides(); a.$("S.vzRng = 'season'"); const html = a.$('vzForm()');
  ['2027-04-18', '2027-05-30', '2027-06-12'].forEach(d => ok(new RegExp(`class="vz-ev[^"]*" data-day="${d}"`).test(html), 'Markierung ' + d));
  ok(/class="goal vz-evl[^"]*" data-day="2027-07-10"/.test(html), 'Renntag-Linie Hauptevent');
});

test('Saisonübersicht auf Englisch und dunkel ohne Fehler', async () => {
  const a = await seasonWithRides(); a.$("S.theme = 'dark'"); a.page('ev-saison'); await a.en(); a.page('ev-saison'); a.noErrors();
});
