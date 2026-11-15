/* F29: Reisemodus – Schalter, Planregeln, Zeitzonen, Events, Tipps, Sequenzen, Sicherung.
   Testuhr 11.11.2026 (Mittwoch), Plan aus season.test.js: Hauptrennen 10.07.2027, A 18.04., B 30.05., C 12.06.2027. */
R.file = 'reise';
const rzTrip = (a, o) => { a.$(`rzF = Object.assign({id:'', from:'', to:'', dest:'', tzDest:'', utc:'', mode:'flight', travelHours:'', facilities:['room'], freeMinPerDay:30, note:'', sep:false}, ${JSON.stringify(o)}); rzSaveF();`); return a.$(`S.rz.trips.find(t => t.from === '${o.from}' && t.to === '${o.to}').id`); };
const rzAll = a => a.$('(() => { const o = []; for (let w = 1; w <= phases(S.p).slice(-1)[0].to; w++) o.push(genWeek(S.p, w)); return JSON.stringify(o); })()');
const rzWeek = (a, w) => a.$(`genWeek(S.p, ${w}).map(x => ({t:x.t, n:x.n, m:x.m, k:x.rz ? x.rz.k : '', sub:x.rz ? x.rz.sub || '' : '', seq:x.rz && x.rz.seq ? x.rz.seq.join('-') : ''}))`);
const NY = {from:'2026-11-16', to:'2026-11-20', dest:'New York', tzDest:'America/New_York', travelHours:9, facilities:['gym_bike'], freeMinPerDay:45};

test('Reisemodus aus oder nie gefragt: Plan, Formkurve, Prognose, Tipps und Start wie ohne F29', async () => {
  const a = await seasonWithRides(), snapOf = () => ({plan:rzAll(a), cur:JSON.stringify(a.$('S.plan')), vz:JSON.stringify(a.$('vzRows().rows.map(r => [r.day, Math.round(r.ctl * 100), Math.round(r.tsb * 100)])')), fc:JSON.stringify(a.$('seasonForecast(S.p).map(o => [o.id, o.form, o.t])')),
    tip:a.$(`(tipChoose(tipCtx('2026-11-17'), '2026-11-17', {}, []) || [])[0]`), home:a.page(null), week:a.page('week'), set:a.page('settings').replace(/Reisemodus\n.*\n/, '')});
  ok(a.$('S.rz === undefined'), 'ohne F29 gibt es keinen Reise-Zustand'); eq(a.$('rzOn()'), false);
  const base = snapOf();
  /* nie gefragt, aber eine Reise im Speicher (z. B. aus einer Sicherung): wirkt nicht */
  a.$(`S.rz = {mode:'unset', trips:[{id:'x1', from:'2026-11-16', to:'2026-11-20', tzDest:'America/New_York', dest:'New York', travelHours:9, facilities:['none'], freeMinPerDay:30, status:'applied'}]}; save(); render();`);
  eq(snapOf(), base, 'unset wirkt wie aus');
  a.$(`S.rz.mode = 'off'; save(); render();`); eq(snapOf(), base, 'aus: identisch');
  ok(!/Ich bin unterwegs|Ortszeit|Vorschlag ansehen|Reisetag/.test(base.home + base.week), 'kein Reise-Element auf Start und Woche');
  /* eingeschaltet ohne Reise: der Plan bleibt gleich */
  a.$(`S.rz = {mode:'on', trips:[]}; save(); render();`); const on = snapOf(); eq(on.plan, base.plan, 'an, aber ohne Reise: gleicher Plan'); eq(on.vz, base.vz);
  /* eingetragen, aber nicht angenommen: der Plan bleibt gleich */
  rzTrip(a, NY); eq(a.$('S.rz.trips[0].status'), 'planned', 'neue Reise im laufenden Plan ist ein Vorschlag'); eq(rzAll(a), base.plan, 'Vorschlag ändert nichts');
  a.noErrors();
});

test('Fahrt-Tag bei ausgeschaltetem Reisemodus wie bisher (Kalendertag des Geräts)', async () => {
  const a = await seasonWithRides(), ms = Date.parse('2026-11-18T03:30:00Z');
  eq(a.$(`rzDay(${ms})`), a.$(`lstr(new Date(${ms}))`), 'ohne Reisemodus Gerätezeit');
  a.w.rzSetMode('on'); const id = rzTrip(a, NY); eq(a.$(`rzDay(${ms})`), '2026-11-17', '03:30 UTC ist in New York noch der 17.11. (22:30 Uhr)');
  eq(a.$(`rzDay(${Date.parse('2026-11-18T05:30:00Z')})`), '2026-11-18', '05:30 UTC ist in New York 00:30 Uhr am 18.11.');
  eq(a.$(`rzDay(${Date.parse('2026-12-01T03:30:00Z')})`), a.$(`lstr(new Date(${Date.parse('2026-12-01T03:30:00Z')}))`), 'außerhalb der Reise Gerätezeit');
  a.w.rzSetMode('off'); a.w.rzOffDo(true); eq(a.$(`rzDay(${ms})`), a.$(`lstr(new Date(${ms}))`), 'nach dem Ausschalten wieder Gerätezeit'); ok(id); a.noErrors();
});

test('Zeitzonen: Richtung, Schwelle 3 Stunden, Anpassungsdauer, Datumsgrenze, Zeitumstellung', async () => {
  const a = await boot(), d = (tzD, ds) => a.$(`rzDiffTz('${tzD}', 'Europe/Berlin', '${ds}')`);
  eq(d('America/New_York', '2026-11-16'), -6, 'New York im Winter −6 (Westen)'); eq(d('Asia/Tokyo', '2026-11-16'), 8, 'Tokio im Winter +8 (Osten)'); eq(d('Asia/Tokyo', '2026-07-01'), 7, 'Tokio im Sommer +7');
  eq(d('Europe/London', '2026-11-16'), -1); eq(d('Europe/Athens', '2026-11-16'), 1); eq(d('Asia/Kolkata', '2026-11-16'), 4.5, 'halbe Stunden');
  eq(d('Pacific/Auckland', '2026-12-10'), 12, 'Auckland +12'); eq(d('Pacific/Honolulu', '2026-12-10'), -11, 'Honolulu −11');
  /* Wochen, in denen Europa und die USA unterschiedlich umstellen: 8.–28.03.2027 nur 5 Stunden */
  eq(d('America/New_York', '2027-03-20'), -5, 'zwischen US- und EU-Umstellung −5'); eq(d('America/New_York', '2027-04-05'), -6);
  eq([a.$('rzAdapt(2)'), a.$('rzAdapt(-2.5)'), a.$('rzAdapt(3)'), a.$('rzAdapt(-3)'), a.$('rzAdapt(8)'), a.$('rzAdapt(-6)')], [0, 0, 3, 2, 8, 3], 'unter 3 Std. kein Jetlag; Osten 1 Tag je Zone, Westen halb so lang');
  /* Tageszuordnung: kurz vor und nach Mitternacht, über die Datumsgrenze, am Tag der Zeitumstellung */
  eq(a.$(`rzDayIn(${Date.parse('2026-11-17T14:59:00Z')}, 'Asia/Tokyo')`), '2026-11-17', '23:59 Uhr in Tokio'); eq(a.$(`rzDayIn(${Date.parse('2026-11-17T15:01:00Z')}, 'Asia/Tokyo')`), '2026-11-18', '00:01 Uhr in Tokio');
  eq(a.$(`rzDayIn(${Date.parse('2026-12-10T10:30:00Z')}, 'Pacific/Auckland')`), '2026-12-10', 'Auckland 23:30 Uhr'); eq(a.$(`rzDayIn(${Date.parse('2026-12-10T10:30:00Z')}, 'Pacific/Honolulu')`), '2026-12-10', 'Honolulu 00:30 Uhr am selben UTC-Tag');
  eq(a.$(`rzDayIn(${Date.parse('2026-12-10T09:30:00Z')}, 'Pacific/Honolulu')`), '2026-12-09', 'Honolulu noch am Vortag');
  eq(a.$(`rzDayIn(${Date.parse('2027-03-28T00:30:00Z')}, 'Europe/Berlin')`), '2027-03-28', 'Nacht der Umstellung auf Sommerzeit'); eq(a.$(`rzClock(${Date.parse('2027-03-28T01:30:00Z')}, 'Europe/Berlin')`), '03:30', 'nach der Umstellung UTC+2');
  eq(a.$(`rzClock(${Date.parse('2027-03-28T00:30:00Z')}, 'Europe/Berlin')`), '01:30', 'vor der Umstellung UTC+1');
  eq(a.$(`rzBodyTime('08:00', 8)`), '00:00', 'Start 8:00 in Tokio = 0:00 Körperzeit'); eq(a.$(`rzBodyTime('08:00', -6)`), '14:00'); eq(a.$(`rzBodyTime('09:30', 4.5)`), '05:00');
  ok(a.$('RZ_CITY.every(c => rzTzOk(c[2]))'), 'alle Zeitzonen der Städteliste kennt der Browser'); ok(a.$('RZ_CITY.length') >= 60, 'Städteliste');
  a.noErrors();
});

test('Hinweis zur Zeitverschiebung nur ab 3 Stunden', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on');
  const lon = rzTrip(a, {from:'2026-11-23', to:'2026-11-25', dest:'London', tzDest:'Europe/London', travelHours:2}), ny = rzTrip(a, NY);
  eq(a.$(`rzJetUi(rzGet('${lon}'))`), '', 'London: kein Hinweis');
  const h = a.$(`rzJetUi(rzGet('${ny}'))`); ok(/6 Std\. nach Westen/.test(h) && /geschätzt 3 Tage/.test(h), 'New York: Richtung und Dauer'); ok(/ärztlicher Abklärung/.test(h) && !/\d\s?mg/.test(h), 'Melatonin nur mit Arzt-Hinweis, keine Dosis');
  a.w.rzGo(ny); ok(/Zeitverschiebung −6 Std\. nach Westen/.test(a.text()), 'im Vorschlag sichtbar'); a.noErrors();
});

test('Plananpassung: Vorschlag, Annehmen, Regeln, Rückgängig stellt den Plan exakt wieder her', async () => {
  const a = await seasonWithRides(), before = rzAll(a), cur0 = JSON.stringify(a.$('S.plan'));
  a.w.rzSetMode('on'); const id = rzTrip(a, NY);
  const R = a.$(`rzRows(rzGet('${id}')).map(r => ({ds:r.ds, a:r.a.n, b:r.b.n, am:r.a.m, bm:r.b.m}))`); ok(R.length >= 6, 'Vorher/Nachher für die betroffenen Tage'); ok(R.every(r => r.ds >= '2026-11-11'), 'nichts in der Vergangenheit');
  a.w.rzGo(id); const tx = a.text(); ok(/Vorschlag für deinen Plan/.test(tx) && /Annehmen/.test(tx) && /Ablehnen/.test(tx) && /Anpassen/.test(tx), 'Annehmen / Ablehnen / Anpassen'); ok(/vorher/.test(tx) && /nachher/.test(tx));
  eq(rzAll(a), before, 'Ansehen ändert nichts');
  a.w.rzDecline(id); eq(rzAll(a), before, 'Ablehnen ändert nichts'); eq(a.$('S.rz.trips[0].declined'), 1);
  a.w.rzAccept(id); eq(a.$('S.rz.trips[0].status'), 'applied'); ok(a.$('!!bkUndo'), 'Schnappschuss vor dem Annehmen'); ok(/Rückgängig/.test(a.$('bkUndoBar()')), '„Rückgängig“ wird angeboten');
  const w2 = rzWeek(a, 2), w3 = rzWeek(a, 3), w1 = rzWeek(a, 1);
  eq([w2[0].k, w2[4].k], ['dep', 'ret'], 'Hin- und Rückreise'); eq([w2[0].m, w2[4].m], [0, 0], 'lange Reise: keine Einheit am Reisetag'); eq(w2[0].seq, 'flug-10', 'Kurzroutine nach dem Flug');
  ok([1, 2, 3].every(j => w2[j].k === 'stay' && /^Hotel-Ergometer/.test(w2[j].n) && w2[j].m <= 45), 'Aufenthalt: Hotel-Ergometer, höchstens die freie Zeit');
  ok(![0, 1, 2, 3, 4].some(j => a.$('HARD').includes(w2[j].t)), 'keine harten Intervalle in den ersten Tagen nach 6 Zeitzonen');
  eq(w1[6].t !== 'long' && !a.$('HARD').includes(w1[6].t), true, 'Vortag der langen Reise ohne Schlüsseleinheit'); eq([w1[5].t, w1[5].k], ['long', 'mv'], 'Long Ride vom Sonntag auf den Samstag vorgezogen');
  ok(!['long', 'sst', 'thr', 'vo2'].includes(w2[5].t) && !['long', 'sst', 'thr', 'vo2'].includes(w2[6].t), 'zwei lockere Tage nach der Rückkehr');
  /* keine zwei harten Tage hintereinander durch das Verschieben */
  const all = [...w1, ...w2, ...w3], hv = x => x.m > 0 && ['sst', 'thr', 'vo2', 'long', 'race'].includes(x.t); const b0 = JSON.parse(before), flat0 = [...b0[0], ...b0[1], ...b0[2]];
  for (let i = 0; i < all.length - 1; i++) if (hv(all[i]) && hv(all[i + 1])) ok(hv(flat0[i]) && hv(flat0[i + 1]), `neue harte Tage in Folge an Position ${i}`);
  /* Zeitbudget: keine Woche länger als vorher */
  [1, 2, 3].forEach(w => { const s = L => L.reduce((q, x) => q + (x.m || 0), 0); ok(s(rzWeek(a, w)) <= s(b0[w - 1]), `Woche ${w} nicht länger als vorher`); });
  /* Formkurve und Prognose rechnen mit */
  ok(JSON.stringify(a.$('vzRows().rows.map(r => Math.round(r.ctl * 100))')) !== JSON.stringify(a.$(`rzWith('${id}', false, () => vzRows().rows.map(r => Math.round(r.ctl * 100)))`)), 'Formkurve berücksichtigt die Reise');
  /* Zurücknehmen und Rückgängig */
  a.w.rzRevert(id); eq(rzAll(a), before, 'Zurücknehmen: alle Wochen exakt wie vorher'); eq(JSON.stringify(a.$('S.plan')), cur0, 'laufende Woche exakt wie vorher');
  a.w.rzAccept(id); ok(rzAll(a) !== before); a.w.rzDel(id); ok(/Löschen und zurücknehmen/.test(a.text()), 'Löschen fragt nach'); a.w.rzDel(id, true); eq(rzAll(a), before, 'Löschen nimmt die Anpassung zurück'); eq(a.$('S.rz.trips.length'), 0);
  a.noErrors();
});

test('Ersatzprogramm passt zu Ausstattung und freier Zeit', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on');
  /* Woche 5 (07.–13.12.2026), Reise Di–Do ohne Zeitzone, 2 Std. Bahn */
  const base = {from:'2026-12-08', to:'2026-12-10', dest:'Paris', tzDest:'Europe/Paris', travelHours:2, mode:'train'}, plain = rzWeek(a, 5);
  const run = (fac, min) => { a.$('S.rz.trips = []'); const id = rzTrip(a, {...base, facilities:fac, freeMinPerDay:min}); a.w.rzAccept(id); return rzWeek(a, 5); };
  let w = run(['none'], 15); ok([1, 2, 3].every(j => w[j].m === 0), 'ohne Ausstattung keine Radeinheit'); ok(w[2].seq && /-15$/.test(w[2].seq), '15 Min. frei → 15-Minuten-Sequenz'); eq(w[1].seq, 'mob-15', 'kurze Reise: Mobilität am Reisetag');
  w = run(['room'], 45); const mid = w[2]; ok(/^(kraft|stabi)-45$|^mob-20$/.test(mid.seq), '45 Min. frei → lange Sequenz (' + mid.seq + ')'); ok(/^Unterwegs:/.test(mid.n));
  w = run(['gym_bike'], 30); ok(/^Hotel-Ergometer/.test(w[2].n) && w[2].m <= 30, 'Ergometer mit 30 Min.'); eq(w[2].sub, 'ergo');
  w = run(['treadmill'], 45); ok(/^Laufband/.test(w[2].n) && w[2].m <= 45, 'Laufband');
  w = run(['running'], 30); ok(w.slice(1, 4).some(x => x.n === 'Lockerer Lauf' || /^Unterwegs:/.test(x.n)), 'Laufen nur locker oder Übungen'); ok(!w.slice(1, 4).some(x => a.$('HARD').includes(x.t)), 'kurze Reise: kein harter Lauf');
  w = run(['own_bike'], 30); eq(w[2].n, plain[2].n, 'eigenes Rad: Einheit bleibt'); eq(w[2].k, 'stay');
  /* Kernreiz bleibt: harte Einheit auf dem Ergometer als kurze Intervalle (direkt geprüft) */
  eq(a.$(`rzErgo({t:'vo2', m:75}, 45, false, true).n`), 'Hotel-Ergometer: 5×3 Min. hart'); eq(a.$(`rzErgo({t:'vo2', m:75}, 30, false, true).n`), 'Hotel-Ergometer: 4×3 Min. hart');
  eq(a.$(`rzErgo({t:'thr', m:75}, 45, false, true).n`), 'Hotel-Ergometer: 3×8 Min. zügig'); eq(a.$(`rzErgo({t:'sst', m:75}, 30, false, true).m`), 30); eq(a.$(`rzErgo({t:'base', m:120}, 60, false, false).m`), 45, 'locker höchstens 45 Min.');
  eq(a.$(`rzErgo({t:'vo2', m:75}, 15, false, true).t`), 'base', 'unter 30 Min. keine Intervalle'); ok(/Gefühl und Puls/.test(a.$(`rzErgo({t:'thr', m:75}, 45, false, true).tip`)), 'Erklärung RPE statt Watt');
  ok(/bergauf gehen/.test(a.$(`rzErgo({t:'vo2', m:75}, 45, true, true).st`)), 'Laufband: bergauf gehen statt laufen');
  a.noErrors();
});

test('Lange Reise: ein bis zwei kurze harte Reize pro Woche, wenn Ergometer oder Laufen möglich ist', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on'); const HARD = a.$('HARD');
  /* Woche mit harten Einheiten suchen, die ganz in einer 12-Tage-Reise liegt */
  const w0 = a.$('(() => { for (let w = 8; w < 20; w++) if (genWeek(S.p, w).filter(x => HARD.includes(x.t)).length >= 2 && genWeek(S.p, w + 1).some(x => HARD.includes(x.t))) return w; return 0; })()'); ok(w0, 'Woche mit zwei harten Einheiten gefunden');
  const from = a.$(`addD(S.p.start, ${(w0 - 1) * 7 - 1})`), to = a.$(`addD(S.p.start, ${(w0 - 1) * 7 + 10})`);
  let id = rzTrip(a, {from, to, dest:'Madrid', tzDest:'Europe/Madrid', travelHours:3, facilities:['gym_bike'], freeMinPerDay:45}); a.w.rzAccept(id);
  let w = rzWeek(a, w0), n = w.filter(x => HARD.includes(x.t)).length; ok(n >= 1 && n <= 2, `Ergometer: ${n} harte Reize in der Woche`); ok(w.filter(x => HARD.includes(x.t)).every(x => /^Hotel-Ergometer: \d×\d Min\./.test(x.n) && x.m <= 45), 'als kurze Intervalle');
  a.$('S.rz.trips = []'); id = rzTrip(a, {from, to, dest:'Madrid', tzDest:'Europe/Madrid', travelHours:3, facilities:['running'], freeMinPerDay:30}); a.w.rzAccept(id);
  w = rzWeek(a, w0); eq(w.filter(x => /^Lauf mit Bergauf-Reizen/.test(x.n)).length, 1, 'Laufen: genau ein Reiz pro Woche');
  a.$('S.rz.trips = []'); id = rzTrip(a, {from, to, dest:'Madrid', tzDest:'Europe/Madrid', travelHours:3, facilities:['none'], freeMinPerDay:30}); a.w.rzAccept(id);
  w = rzWeek(a, w0); eq(w.filter(x => HARD.includes(x.t)).length, 0, 'ohne Ausstattung keine harten Radeinheiten'); ok(w.some(x => x.seq === 'kraft-30'), 'stattdessen Kraft ohne Geräte');
  a.noErrors();
});

test('Planerstellung: drei Antworten setzen den Schalter, „aus“ überspringt die Frage', async () => {
  const a = await boot(); a.$(`S = load(true); S.d = Object.assign(S.d, ${JSON.stringify(SEAS.d)}); S.d.mode = 'full'; S.step = 3; render();`);
  ok(/Bist du in der Saison unterwegs\?/.test(a.text()), 'Frage im Schritt Alltag nach dem Zeitbudget'); ok(a.$(`document.getElementById('fx-tb').compareDocumentPosition(document.getElementById('fx-rzwiz')) & 4`), 'steht nach dem Zeitbudget');
  eq(a.$('S.rz'), undefined, 'ohne Antwort bleibt der Schalter unberührt');
  a.w.rzWizSet('later'); eq(a.$('S.rz.mode'), 'on', '„Ja, aber später“ → an'); eq(a.$('S.rz.trips.length'), 0); eq(a.$('S.rz.tzHome'), a.$('rzDevTz()'), 'Heim-Zeitzone aus dem Gerät');
  a.w.rzWizSet('no'); eq(a.$('S.rz.mode'), 'off', '„Nein“ → aus'); ok(/Reisemodus ist aus – in den Einstellungen änderbar/.test(a.text()), 'Schritt wird mit einer Zeile übersprungen'); ok(!/Bist du in der Saison unterwegs/.test(a.text()));
  a.$(`S.rz.mode = 'unset'; render();`); a.w.rzWizSet('now'); eq(a.$('S.rz.mode'), 'on', '„Ja, Reisen eintragen“ → an'); ok(/Neue Reise/.test(a.text()), 'Formular offen');
  a.$(`Object.assign(rzF, ${JSON.stringify(NY)}); rzSaveWiz();`); eq(a.$('S.rz.trips[0].status'), 'applied', 'Reise aus der Planerstellung gilt sofort'); ok(/New York/.test(a.text()), 'Liste im Schritt');
  /* Der Planer berücksichtigt die Reise schon bei der Erstellung */
  a.w.finish(); a.noErrors(); const w2 = rzWeek(a, 2); eq([w2[0].k, w2[4].k], ['dep', 'ret'], 'neuer Plan enthält die Reise'); ok(/^Hotel-Ergometer/.test(w2[2].n));
});

test('Reisen kurz vor einem Event: Warnung mit Form am Renntag, Startzeit in Körperzeit', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on');
  const A = rzTrip(a, {from:'2027-04-02', to:'2027-04-08', dest:'Dubai', tzDest:'Asia/Dubai', travelHours:7, facilities:['none']}); /* 10 Tage vor dem A-Rennen am 18.04. */
  let W = a.$(`rzEvWarn(rzGet('${A}'))`); eq(W.map(q => [q.name, q.prio, q.days]), [['Frühjahrsrennen', 'A', 10]].map(x => [a.$(`efList(S.p).find(q => q.date === '2027-04-18').name`), x[1], x[2]]), 'A-Event innerhalb von 3 Wochen');
  ok(W[0].a && W[0].b && typeof W[0].a.tsb === 'number', 'Form mit und ohne Reise'); ok(W[0].b.ctl <= W[0].a.ctl, 'mit Reise nicht mehr Fitness');
  ok(/Form am Renntag ohne Reise/.test(a.$(`rzEvWarnUi(rzGet('${A}'))`)) && /Tapering/.test(a.$(`rzEvWarnUi(rzGet('${A}'))`)), 'Warnung mit Zahlen und Hinweis zum Tapering');
  a.$('S.rz.trips = []'); const far = rzTrip(a, {from:'2027-03-20', to:'2027-03-24', dest:'Paris', tzDest:'Europe/Paris', travelHours:2}); eq(a.$(`rzEvWarn(rzGet('${far}')).length`), 0, 'mehr als 3 Wochen vor dem A-Event: keine Warnung');
  a.$('S.rz.trips = []'); const b = rzTrip(a, {from:'2027-05-10', to:'2027-05-13', dest:'Paris', tzDest:'Europe/Paris', travelHours:2}); eq(a.$(`rzEvWarn(rzGet('${b}')).length`), 0, 'B-Event: 17 Tage davor keine Warnung');
  a.$('S.rz.trips = []'); const b2 = rzTrip(a, {from:'2027-05-18', to:'2027-05-21', dest:'Paris', tzDest:'Europe/Paris', travelHours:2}); eq(a.$(`rzEvWarn(rzGet('${b2}')).map(q => q.prio)`), ['B'], 'B-Event innerhalb von 2 Wochen');
  /* Event in anderer Zeitzone */
  a.w.rzEvSet('main', 'tz', 'Asia/Tokyo'); a.w.rzEvSet('main', 'start', '08:00'); a.w.goPg('ev-saison'); const tx = a.text();
  ok(/Start 08:00 Ortszeit = 01:00 für deinen Körper/.test(tx), 'Körperzeit (Tokio im Sommer +7)'); ok(/etwa 7 Tage vor dem Start anreisen/.test(tx), 'Empfehlung zur Anreise'); ok(/Packliste Rad/.test(tx) && /Probefahrt/.test(tx), 'Packliste');
  a.w.rzSetMode('off'); a.w.rzOffDo(true); a.w.goPg('ev-saison'); ok(!/Zeitzone|Packliste/.test(a.text()), 'ohne Reisemodus nichts davon'); a.noErrors();
});

test('Ausschalten: Reisen ausgeblendet und wiederhergestellt, Rückfrage zum Zurücknehmen', async () => {
  const a = await seasonWithRides(), before = rzAll(a); a.w.rzSetMode('on');
  const id = rzTrip(a, NY), id2 = rzTrip(a, {from:'2026-12-08', to:'2026-12-10', dest:'Paris', tzDest:'Europe/Paris', travelHours:2}); a.w.rzAccept(id); const withTrip = rzAll(a);
  a.w.navGo('more'); a.w.goPg('settings'); a.w.goPg('set-rz'); a.w.rzSetMode('off'); eq(a.$('S.rz.mode'), 'on', 'erst die Rückfrage'); ok(/Anpassungen für kommende Reisen zurücknehmen\?/.test(a.text()));
  a.w.rzOffDo(true); eq(a.$('S.rz.mode'), 'off'); eq(a.$('S.rz.trips.map(t => t.status)'), ['hidden', 'hidden'], 'Reisen bleiben gespeichert, ausgeblendet'); eq(rzAll(a), withTrip, '„Nein“: angenommene Anpassung bleibt im Plan');
  /* kein Element des Reisemodus mehr sichtbar */
  const none = k => { const t = a.page(k); ok(!/New York|Ich bin unterwegs|Ortszeit|Zeitverschiebung|Vorschlag ansehen/.test(t), `nichts vom Reisemodus auf ${k || 'Start'}`); };
  [null, 'week', 'logbook', 'ev-saison', 'sform'].forEach(none); eq(a.$('rzHome() + rzSeason() + rzWeekBtn(2) + rzBadge({rz:{k:"post"}}, "2026-11-17")'), '', 'alle Bausteine leer'); eq(a.$(`rzTipCtx('2026-11-17')`), [], 'keine Reisetipps');
  a.w.rzSetMode('on'); eq(a.$('S.rz.trips.map(t => t.status)'), ['applied', 'planned'], 'beim Einschalten kommen die Reisen mit ihrem Stand zurück'); eq(rzAll(a), withTrip);
  /* mit Zurücknehmen */
  a.w.rzSetMode('off'); a.w.rzOffDo(false); ok(a.$('!!bkUndo'), 'Schnappschuss vor dem Zurücknehmen'); eq(rzAll(a), before, '„Ja“: Plan wie ohne Reise');
  a.w.rzSetMode('on'); eq(a.$('S.rz.trips.map(t => t.status)'), ['planned', 'planned'], 'zurückgenommene Reise kommt als Vorschlag zurück'); eq(rzAll(a), before); ok(id2);
  /* ohne angenommene Reise: Ausschalten ohne Rückfrage */
  a.w.rzSetMode('off'); eq(a.$('S.rz.mode'), 'off', 'direkt aus'); a.noErrors();
});

test('Bestehende Nutzer: nie ungefragt an; Angebot im Neuigkeiten-Fenster schaltet ein', async () => {
  const a = await seasonWithRides(); eq(a.$('rzOn()'), false); eq(a.$('(S.rz || {}).mode || "unset"'), 'unset');
  const it = a.$('WN_DATA["201"][0]'); eq([it.go, it.lb, it.lbEn], ['rz:on', 'Einschalten', 'Switch on']);
  a.$('wnShow = {from:200, auto:true}; render();'); ok(/Einschalten/.test(a.w.document.querySelector('.exbox').innerText), 'Knopf „Einschalten“'); a.w.wnJump(0);
  eq(a.$('S.rz.mode'), 'on', 'eingeschaltet erst nach dem Tippen'); ok(/Reisemodus/.test(a.text()) && /Reise eintragen/.test(a.text()), 'landet auf der Seite Reisemodus');
  /* Hinweis „Wusstest du schon?“ führt zum Schalter */
  ok(a.$(`DYK.some(d => d[0] === 'rz' && d[3] === 'dykRz()')`) && a.$('typeof DYK_FN.dykRz') === 'function', 'DYK-Hinweis mit Ziel'); a.noErrors();
});

test('Sicherung: Reisen und Schalter sind enthalten, alte Stände ohne Reisefelder laden', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on'); const id = rzTrip(a, NY); a.w.rzAccept(id);
  await a.w.exportPlans(); await a.tick(20); const d = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await d.blob.text(); ok(/America\/New_York/.test(txt) && /tzHome/.test(txt), 'Reise in der Sicherungsdatei');
  const b = await boot({store:a.store()}); eq(b.$('S.rz.mode'), 'on', 'nach Neustart erhalten'); eq(b.$('S.rz.trips[0].status'), 'applied'); eq(rzAll(b), rzAll(a), 'gleicher Plan nach Neustart');
  /* alter Stand ohne Reisefelder */
  const st = a.store(), k = Object.keys(st).find(q => { try { return !!JSON.parse(st[q]).p; } catch (e) { return false; } }), o = JSON.parse(st[k]); delete o.rz; st[k] = JSON.stringify(o);
  const c = await boot({store:st}); eq(c.$('S.rz'), undefined, 'kein Reise-Zustand'); eq(c.$('rzOn()'), false); ok(c.page(null).length > 50, 'App startet'); c.noErrors(); b.noErrors(); a.noErrors();
});

test('Sequenzen „Unterwegs“: Übungen vorhanden, leise, Dauer passt, Logbuch mit Kennzeichnung', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on'); const all = a.$('rzRtAll().map(r => ({rt:r.rt, m:r.m, ids:r.ex.map(x => x[0]), n:r.n, intro:r.intro}))');
  eq(all.map(r => r.rt).sort(), ['rz-flug-10', 'rz-kraft-15', 'rz-kraft-20', 'rz-kraft-30', 'rz-kraft-45', 'rz-mob-15', 'rz-mob-20', 'rz-stabi-15', 'rz-stabi-20', 'rz-stabi-30', 'rz-stabi-45'], 'Kraft, Stabi 15/20/30/45, Mobilität, Kurzroutine 10');
  all.forEach(r => r.ids.forEach(id => ok(a.$(`!!(EXI['${id}'] && EXP['${id}'])`), `${r.rt}: Übung ${id} mit Bild`)));
  ['wallsit', 'pushup', 'revlunge', 'gmorn'].forEach(id => { ok(a.$(`exTpl('${id}').ok`), `${id}: Bewegungsablauf animierbar`); ok(a.$(`EXI['${id}'].say.length`) === 4, `${id}: Sprechtext Deutsch und Englisch`); });
  ok(!all.some(r => r.ids.some(id => /jump|sprünge|springen|burpee/i.test(id + a.$(`EXI['${id}'].t`)))), 'keine Sprünge');
  ok(/fest stehen/.test(all.find(r => r.rt === 'rz-kraft-30').intro), 'Sicherheitshinweis zu Stuhl, Bett, Wand');
  /* Dauer mit Standard-Einstellungen: höchstens 25 % neben der Angabe */
  all.forEach(r => { const [k, m] = r.rt.slice(3).split('-'); a.$(`rtSel = rzRt('${k}', ${m})`); const s = a.$(`sqTotal(sqSession('rt', -1), sqCfg()).s`) / 60; ok(s >= r.m * .75 && s <= r.m * 1.25, `${r.rt}: ${s.toFixed(1)} Min. statt ${r.m}`); });
  /* Start aus dem Wochenplan, Abschluss landet mit Kennzeichnung im Logbuch und zählt als erfüllt */
  a.w.rzSeqOpen('kraft', 30); eq(a.$('sq.view'), 'start'); eq(a.$('sq.se.items.length'), 8); a.w.sqClose();
  a.$(`S.lb = S.lb || {}; S.lb['sq|rt|rz-kraft-30|2026-11-11'] = {k:'s', day:'2026-11-11', n:'Routine: Unterwegs: Kraft', sk:'rt', sec:1700, nEx:8, nTot:8, part:false, at:Date.now()}; save();`);
  ok(a.$(`rzSeqDone('kraft', 30, '2026-11-11')`), 'als erledigt erkannt'); ok(/Reise – Ersatzprogramm erfüllt/.test(a.$(`rzSeqBtn('kraft', 30, '2026-11-11', true)`)), 'faire Bewertung');
  a.w.navGo('logbook'); ok(a.w.document.querySelector('.rzb'), 'Logbuch: Kennzeichnung „Reise“'); a.noErrors();
});

test('Tipps „Unterwegs“: mindestens 25, mit Quelle, nur im Reisekontext', async () => {
  const a = await seasonWithRides(), T = a.$(`TIPS.filter(t => t[1] === 'rz')`); ok(T.length >= 25, `${T.length} Tipps`); eq(a.$('TIP_CAT.rz'), 'Unterwegs');
  T.forEach(t => { ok(/(^|\s)rz:/.test(t[2]), t[0] + ': nur mit Reise-Tag'); ok(t[3] && t[4], t[0] + ': Deutsch und Englisch'); String(t[5]).split(',').filter(Boolean).forEach(s => ok(a.$(`!!TIP_SRC['${s}']`), `${t[0]}: Quelle ${s}`)); ok(!/kcal|Kalorien|Diät|\d\s?mg\b/.test(t[3]), t[0] + ': keine Kalorienziele, keine Dosierung'); });
  ok(T.filter(t => t[5]).length >= 20, 'die meisten Tipps mit Quelle'); ok(/doi:10\.1007\/s40279-021-01502-0/.test(a.$('TIP_SRC.jvr21')), 'DOI des Konsens-Statements');
  eq(new Set(a.$('TIPS.map(t => t[0])')).size, a.$('TIPS.length'), 'Kennungen eindeutig');
  const pick = day => a.$(`(tipChoose(tipCtx('${day}'), '${day}', {}, []) || [])[1]`);
  ok(pick('2026-11-17') !== 'rz', 'ohne Reisemodus kein Reisetipp'); a.w.rzSetMode('on'); ok(pick('2026-11-17') !== 'rz', 'ohne Reise kein Reisetipp');
  rzTrip(a, NY); eq(a.$(`rzTipCtx('2026-11-17')`).sort(), ['day', 'jet'], 'Reisetag mit Zeitverschiebung'); eq(a.$(`rzTipCtx('2026-11-16')`).sort(), ['day', 'jet', 'move']); eq(a.$(`rzTipCtx('2026-11-14')`).sort(), ['jet', 'pre']); eq(a.$(`rzTipCtx('2026-11-22')`).sort(), ['jet', 'post']); eq(a.$(`rzTipCtx('2026-11-30')`), []);
  eq(pick('2026-11-17'), 'rz', 'am Reisetag ein Tipp aus „Unterwegs“'); eq(pick('2026-11-14'), 'rz', 'kurz davor'); ok(pick('2026-11-30') !== 'rz', 'danach wieder normale Tipps');
  /* Wiederholungsregel aus F20 gilt weiter: ein gezeigter Tipp kommt frühestens nach 60 Tagen wieder */
  const t1 = a.$(`tipChoose(tipCtx('2026-11-17'), '2026-11-17', {}, [])[0]`), t2 = a.$(`tipChoose(tipCtx('2026-11-18'), '2026-11-18', {seen:{'${t1}':'2026-11-17'}}, [])[0]`); ok(t1 !== t2, 'kein Tipp zweimal hintereinander'); a.noErrors();
});

test('Anzeige: Woche mit Band und Ortszeit, Saisonplanung, Formkurve, Start', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on'); const id = rzTrip(a, NY);
  ok(/Die App hat einen Vorschlag/.test(a.page(null)), 'Start: offener Vorschlag'); a.w.rzAccept(id);
  a.w.navGo('week'); ok(/Ich bin unterwegs/.test(a.text()), 'Woche: Knopf „Ich bin unterwegs“'); a.$('vw = 2; render();'); ok(a.w.document.querySelectorAll('.rzb').length >= 5, 'Band an den Reisetagen');
  a.$('open = 2; render();'); const tx = a.text(); ok(/Unterwegs: New York/.test(tx) && /Ortszeit −6 Std\. gegenüber zu Hause/.test(tx), 'Ortszeit-Hinweis am Tag'); ok(/Hotel-Geräte messen ungenau/.test(tx), 'Erklärung Puls und Gefühl');
  a.$('open = 0; render();'); ok(/Nach dem Flug oder nach langem Sitzen · 10 Min\./.test(a.text()), 'Kurzroutine am Reisetag angeboten');
  a.$('vw = null; open = null;'); a.w.goPg('ev-saison'); ok(a.w.document.querySelector('.rzbar span'), 'Saisonplanung: Band'); ok(/Im Plan berücksichtigt/.test(a.text()));
  a.w.navGo('state'); a.w.goPg('sform'); ok(a.w.document.querySelector('.vz-main .vz-rz'), 'Formkurve: Band hinter den Linien'); ok(a.$(`vzNames(S.p, '2026-11-16', '2026-11-20')['2026-11-18'].some(n => n === 'Reise: New York')`), 'Infofeld: „Reise: …“');
  ok(a.w.document.querySelector('.rzsw[role=switch][aria-checked]') || true); a.w.rzGo(); const sw = a.w.document.querySelector('.rzsw'); eq([sw.getAttribute('role'), sw.getAttribute('aria-checked'), !!sw.getAttribute('aria-label')], ['switch', 'true', true], 'Schalter für VoiceOver');
  /* unterwegs: Ortszeit und Heimat auf dem Start, Schlaf-Hinweis vor der Abreise */
  a.setNow(at(2026, 11, 14, 9, 0)); a.$('render()'); ok(/Schlafenszeit schrittweise verschieben/.test(a.page(null)) && /später ins Bett/.test(a.text()), '2 Tage vor dem Flug nach Westen: später ins Bett');
  a.setNow(at(2026, 11, 17, 9, 0)); a.$('S.wk = curWeek(S.p); S.plan = genWeek(S.p, S.wk); S.done = {}; save(); render();'); const h = a.page(null); ok(/Du bist unterwegs · New York/.test(h) && /Ortszeit \d\d:\d\d Uhr · Heimat: \d\d:\d\d Uhr/.test(h), 'Start: Ortszeit mit „Heimat: …“');
  a.noErrors();
});

test('Englisch: Reise-Seiten ohne fehlende Übersetzungen', async () => {
  const a = await seasonWithRides(); a.w.rzSetMode('on'); const id = rzTrip(a, NY); a.w.__iMiss = new Map(); await a.en(); const TR = a.$('trTxt');
  a.w.rzGo(id); ok(/Travel mode/.test(a.text()) && /Proposal for your plan/.test(a.text()) && /Accept/.test(a.text()), 'Vorschlag auf Englisch'); a.w.rzAccept(id);
  a.w.navGo('week'); a.$('vw = 2; open = 2; render();'); ok(/Hotel bike easy/.test(a.text()), 'Einheit übersetzt'); for (let i = 0; i < 7; i++) a.$(`open = ${i}; render();`);
  a.$('vw = 3; render();'); for (let i = 0; i < 7; i++) a.$(`open = ${i}; render();`); a.$('vw = null; open = null;'); a.page(null); a.page('ev-saison'); a.page('settings');
  for (const [k, m] of [['kraft', 45], ['stabi', 45], ['mob', 15], ['mob', 20], ['flug', 10]]) { a.w.rzSeqOpen(k, m); a.w.sqClose(); }
  ['wallsit', 'pushup', 'revlunge', 'gmorn'].forEach(x => { a.w.openEx(x); a.w.closeEx(); });
  ['vo2', 'thr', 'base'].forEach(t => [30, 45].forEach(F => [false, true].forEach(mill => { const x = a.$(`rzErgo({t:'${t}', m:75}, ${F}, ${mill}, true)`); [x.n, x.st, x.tip].forEach(s => TR(s)); })));
  [a.$('rzRun(30)'), a.$('rzHill()')].forEach(x => [x.n, x.st, x.tip].forEach(s => TR(s)));
  for (const k of ['dep', 'ret', 'pre', 'post', 'stay']) for (const fac of [['none'], ['own_bike'], ['running']]) for (const ty of ['vo2', 'base', 'rec', 'long']) for (const hrs of [2, 9]) for (const jet of [false, true]) { const x = a.$(`rzSub(D('${ty}', 'Grundlage Z2', 90, 60, 70, '', '', ''), {k:'${k}', jet:${jet}}, {id:'q', from:'2026-12-01', to:'2026-12-12', travelHours:${hrs}, facilities:${JSON.stringify(fac)}, freeMinPerDay:30}, {nInt:0})`); [x.n, x.st, x.tip].forEach(s => TR(s || '')); }
  TR('Wegen deiner Reise vom Dienstag hierher verlegt.'); a.$(`rzWhy(rzGet('${id}'))`).forEach(s => TR(s)); a.$('rzRtAll().map(r => r.intro)').forEach(s => TR(s));
  eq([...a.w.__iMiss.values()], [], 'fehlende Übersetzungen'); a.noErrors();
});
