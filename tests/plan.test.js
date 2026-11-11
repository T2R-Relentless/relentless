/* Planerstellung und Darstellung: Vergleich mit gespeicherten Ständen (Snapshots).
   Für jedes Szenario werden Phasen, alle Wochen des Plans und der Text jeder Seite festgehalten. Ändert sich etwas
   ungewollt (z. B. beim Umbau des Codes), schlägt der Test fehl und zeigt die erste Abweichung. Gewollte Änderungen:
   „Vergleichsstände neu schreiben“ und den Unterschied mit git diff prüfen. */
R.file = 'plan';

const PAGES = ['week', 'logbook', 'more', 'overview', 'state', 'check', 'event', 'ev-goal', 'ev-prof', 'ev-subs', 'ev-pace', 'ev-fuel',
  'rides', 'ms', 'sform', 'spb', 'sperf', 'pcp', 'pdu', 'pef', 'pmor', 'psw', 'shist', 'slog', 'rc', 'rc-w', 'rc-m', 'rc-y',
  'settings', 'set-ali', 'set-hr', 'set-wf', 'set-wx', 'set-sq', 'set-gm', 'set-lang', 'plans', 'export', 'ex', 'science', 'cycle'];

const SCEN = [
  {id:'event-basis', d:{goal:'event', eventName:'Testrennen', eventDate:'2027-03-20', ftp:250, hours:8}},
  {id:'event-saison', d:{goal:'event', eventName:'Hauptrennen', eventDate:'2027-07-10', season:true, ftp:280, hours:10, dist:180, hm:2500, weight:70},
    subs:[{name:'Frühjahrsklassiker', date:'2027-04-18', prio:'A', dist:150, hm:1800}, {name:'Bergzeitfahren', date:'2027-05-30', prio:'B', dist:30, hm:900}, {name:'Kriterium', date:'2027-06-12', prio:'C', dist:50}]},
  {id:'ftp-pendeln-kraft', d:{goal:'ftp', ftp:230, ftpTarget:260, endDate:'2027-02-28', hours:7, commuter:true, commute:[true, false, true, false, false, false, false], commuteMin:30, strN:2}},
  {id:'fitness-tage', d:{goal:'fitness', ffocus:'health', endDate:'2027-02-03', sex:'f', perDay:true, avail:[false, true, false, true, false, true, true], dayMin:[60, 60, 60, 75, 60, 120, 90], longDay:5}},
  {id:'start-spaeter-schnell', d:{goal:'event', eventName:'Frühjahrsrennen', eventDate:'2027-05-01', startDate:'2026-12-07', ftp:240, hours:6, mode:'light'}}
];

function planData(a){
  const p = a.$('S.p'), ph = a.$('phases')(p), last = ph[ph.length - 1].to, gw = a.$('genWeek'), tss = a.$('tss');
  const weeks = []; for (let w = 1; w <= last; w++) weeks.push(gw(p, w).map(x => [x.t, x.m, x.n, x.hi ?? null, x.m ? tss(x) : 0]));
  return {name:a.$('planName(S.p)'), start:p.start, startDate:p.startDate, wk:a.$('S.wk'), hours:p.hours, ftp:p.ftp,
    phases:ph.map(x => [x.key, x.name, x.from, x.to]), weeks};
}

for (const sc of SCEN) {
  test(`Szenario ${sc.id}: Plan`, async () => {
    const a = await boot(); makePlan(a, sc.d, sc.subs);
    await snap('plan-' + sc.id, 'plan', planData(a));
  });
  test(`Szenario ${sc.id}: alle Seiten`, async () => {
    const a = await boot(); makePlan(a, sc.d, sc.subs);
    await snap('plan-' + sc.id, 'seite-start', a.page(null));
    for (const k of PAGES) await snap('plan-' + sc.id, 'seite-' + k, a.page(k));
    /* Woche mit aufgeklapptem Tag (Tageskarte mit allen Knöpfen) */
    a.page('week'); const d = a.$('S.plan').findIndex(x => x.m > 0); a.w.tog(d); await snap('plan-' + sc.id, 'woche-tag-offen', a.text());
    a.noErrors('Beim Aufrufen der Seiten');
  });
  test(`Szenario ${sc.id}: Startseite und Woche auf Englisch`, async () => {
    const a = await boot(); makePlan(a, sc.d, sc.subs); await a.en();
    await snap('plan-' + sc.id, 'en-start', a.page(null)); await snap('plan-' + sc.id, 'en-week', a.page('week'));
    a.noErrors();
  });
}

test('Planung Schritt für Schritt (Detail) ohne Fehler', async () => {
  const a = await boot(), seen = [];
  a.$("S.d.mode = 'full'; render();");
  for (let i = 0; i < 12 && a.$('S.step') !== 0; i++) {
    seen.push(a.$('S.step'));
    const b = [...a.w.document.querySelectorAll('button')].find(x => /^(Weiter|Plan erstellen)/.test(x.textContent.trim()));
    if (!b) break; b.click();
  }
  a.noErrors('In der Planung');
  await snap('plan-ablauf', 'schritte', {seen, fertig:a.$('S.step') === 0});
});

test('Wochenwechsel: Plan rückt weiter, Vorwoche wird archiviert', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d);
  eq(a.$('S.wk'), 1, 'Startwoche');
  a.setNow(at(2026, 11, 25)); a.w.render();
  eq(a.$('S.wk'), 3, 'zwei Wochen später'); eq(a.$('S.prevPlan && S.prevPlan.w'), 1, 'letzte gesehene Woche archiviert');
  a.noErrors(); await snap('plan-ablauf', 'woche-3-start', a.page(null));
});

test('Saisonende: Übergangsphase wird angezeigt', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d);
  a.setNow(at(2027, 3, 25)); a.w.render(); a.noErrors();
  ok(/Saison geschafft/.test(a.page(null)), 'Text zum Saisonende');
});

test('Einheit erledigt markieren und wieder zurück', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d); const i = a.$('todayIdx()');
  a.w.tick(i); eq(!!a.$('S.done')[i], true); a.w.tick(i); eq(!!a.$('S.done')[i], false); a.noErrors();
});
