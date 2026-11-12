/* F17, Ergänzung 12.11.2026: Plan-Check für die ganze Saison */
R.file = 'season-check';
const scPlan = (a, subs, d) => makePlan(a, {goal:'event', season:true, eventName:'Hauptrennen', eventDate:'2027-07-10', dist:150, hm:2000, targetTime:'5:00', ftp:280, weight:72, hours:8, ...(d || {})}, subs);
const SC3 = [{name:'Klassiker', date:'2027-05-16', prio:'A', dist:120, hm:1500}, {name:'Kriterium', date:'2027-06-12', prio:'C', dist:50, hm:200}];
const rides = a => a.$(`S.man = [${[-3, -2, -1].map(k => `{id:'r${-k}', day:iso(${k}), ts:iso(${k}) + 'T08:00:00.000Z', sec:5400, km:45, tss:70}`).join(',')}]; save()`);

test('Saison mit 3 Events: 3 Abschnitte plus Zusammenfassung, dieselben Werte wie Saisonübersicht und Formkurve', async () => {
  const a = await boot(); scPlan(a, SC3); rides(a);
  a.page('check'); const d = a.w.document, secs = [...d.querySelectorAll('details.sce')];
  eq(secs.length, 3, 'ein Abschnitt je Event'); ok(/Saison im Überblick/.test(a.text()) && /FTP: heute 280 W/.test(a.text()) && /Höchste Fitness/.test(a.text()) && /verfügbar, .* geplant/.test(a.text()), 'Zusammenfassung');
  ok(secs.find(s => /Klassiker/.test(s.textContent)).open, 'nächstes A-Event aufgeklappt'); ok(!secs.find(s => /Kriterium/.test(s.textContent)).open);
  const F = a.$('seasonForecast(S.p)'), R = a.$('vzRows()'); ok(R, 'Formkurve hat Daten');
  F.forEach(o => { const s = secs.find(x => x.dataset.ev === String(o.id)); ok(s, 'Abschnitt für ' + o.name); const t = s.textContent;
    ok(t.includes(a.$('hm2')(o.t) + ' Std.'), o.name + ': Zielzeit wie Saisonübersicht'); ok(t.includes('FTP ' + o.ftp + ' W'), o.name + ': FTP');
    const row = R.rows.find(r => r.day === o.date); eq(o.form, {ctl:Math.round(row.ctl), tsb:Math.round(row.tsb)}, o.name + ': Form wie Formkurve'); ok(t.includes('Fitness ' + o.form.ctl), o.name + ': Form im Plan-Check'); });
  const ev = a.page('ev-saison'); F.forEach(o => ok(ev.includes(a.$('hm2')(o.t) + ' Std.') && ev.includes('Fitness ' + o.form.ctl), o.name + ': Saisonübersicht gleich'));
  a.noErrors();
});

test('Ohne Fahrten: Form aus den geplanten Einheiten, für jedes Event', async () => {
  const a = await boot(); scPlan(a, SC3); const F = a.$('seasonForecast(S.p)').filter(o => !o.past);
  ok(F.every(o => o.form && Number.isFinite(o.form.ctl)), 'jedes Event mit Form'); eq(a.$('formRows(S.p).src'), 'plan');
  ok(/aus den geplanten Einheiten gerechnet/.test(a.page('check')));
});

test('Maßnahme zeigt die Wirkung auf alle Events', async () => {
  const a = await boot(); scPlan(a, SC3, {hours:6}); a.$('scMeas = true'); a.page('check'); const t = a.text().replace(/\s+/g, ' ');
  const m = t.match(/7 statt 6 Std\. pro Woche Wirkung: ([^F]*)Für die ganze Saison/); ok(m, 'Maßnahme mit Wirkung'); ok(['Klassiker', 'Kriterium', 'Hauptrennen'].every(n => m[1].includes(n)), 'alle Events: ' + m[1]);
  ok(/Hauptrennen −\d+ Min\./.test(m[1]), 'mehr Stunden machen das Hauptevent schneller: ' + m[1]);
  const L = a.$("actImpact(S.p, ['setH', 7])"); eq(L.length, 3); ok(L.find(x => x.o.main).d < 0);
});

test('Zu dicht liegende Events werden markiert', async () => {
  const a = await boot(); scPlan(a, [...SC3, {name:'Rundfahrt', date:'2027-05-12', prio:'B', dist:90, hm:900}]);
  const c = a.$('seasonCheck(S.p)'); eq(c.close.map(x => [x.a.name, x.b.name, x.g]), [['Rundfahrt', 'Klassiker', 4]]);
  ok(/Zu dicht: Rundfahrt \(B\) und Klassiker \(A\) liegen 4 Tage auseinander, empfohlen sind mindestens 7/.test(a.page('check').replace(/\s+/g, ' ')));
  const b = await boot(); scPlan(b, SC3); eq(b.$('seasonCheck(S.p)').close, []); ok(/genug Zeit zur Erholung/.test(b.page('check')));
});

test('Ampel: mit Zielzeit nach der Zeit, sonst nach Form; Tapering nach Priorität', async () => {
  const a = await boot(); scPlan(a, [...SC3, {name:'Rundfahrt', date:'2027-04-18', prio:'B', dist:90, hm:900}], {targetTime:'3:00'});
  const F = a.$('seasonCheck(S.p)').F, m = F.find(o => o.main); eq(m.light, 'high'); ok(/nicht erreichbar/.test(m.why));
  eq(F.find(o => o.prio === 'C').light, 'na'); ok(['ok', 'mid'].includes(F.find(o => o.name === 'Klassiker').light));
  /* Tapering: A volles Tapering (Phase), B Aktivierung am Vortag, C ohne */
  const p = a.$('S.p'), ph = a.$('phases')(p), gw = a.$('genWeek'), dayOf = ds => { const n = a.$('absDay')(p, ds); return gw(p, Math.floor(n / 7) + 1)[n % 7]; }, prev = ds => a.$('addD')(ds, -1);
  ok(ph.some(x => x.key === 'taper' && x.ev && x.ev.name === 'Klassiker'), 'A: Tapering-Phase vor dem Klassiker');
  ok(/^Aktivierung vor/.test(dayOf(prev('2027-04-18')).n), 'B: Aktivierung am Vortag'); ok(!/Aktivierung|Locker vor|Mini-Tapering/.test(dayOf(prev('2027-06-12')).n || ''), 'C: kein Tapering');
  F.forEach(o => ok(o.taper && o.pace && o.t, o.name + ': Tapering, Pacing und Zielzeit'));
});

test('Plan-Check und Saisonprognose: gleiche Zielzeit und FTP für das Hauptevent', async () => {
  for (const d of [{}, {targetTime:'4:00', hours:6}, {draft:'pel'}, {dist:200, hm:3000, hours:5}]) {
    const a = await boot(); scPlan(a, SC3, d); const c = a.$('planCheck(S.p, true)'), m = a.$('seasonForecast(S.p)').find(o => o.main);
    eq(m.t, c.sc[0].t, 'Zielzeit ' + JSON.stringify(d)); eq(m.ftp, c.base.mid, 'FTP ' + JSON.stringify(d));
    a.page('check'); const t = a.text(); ok(t.includes('Erwartete Zielzeit mit deinem Plan: ' + a.$('hm2')(m.t)), 'Kopfzeile'); ok([...a.w.document.querySelectorAll('details.sce')].find(s => /Hauptrennen/.test(s.textContent)).textContent.includes(a.$('hm2')(m.t) + ' Std.'), 'Abschnitt');
  }
});
