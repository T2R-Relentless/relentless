/* F31: Events nachträglich anpassen (Formular, Vorschlag mit Rückgängig, Löschen, Duplizieren, Karten, Pacing je Art) */
R.file = 'events';
/* Saison wie SCEN[1]: Hauptrennen 10.07.2027 (A) + Frühjahrsklassiker 18.04. (A), Bergzeitfahren 30.05. (B), Kriterium 12.06. (C) */
async function evBoot(){ const a = await boot(); makePlan(a, SCEN[1].d, SCEN[1].subs); a.$('cheerShow = null'); return a; }
const evId = (a, name) => a.$(`(S.p.subs.find(s => s.name === ${JSON.stringify(name)}) || {}).id`);
/* Struktur des Plans (Art und Dauer je Tag); Namen der Einheiten enthalten den Eventnamen und dürfen sich mit ihm ändern */
const evPlanSig = a => a.$('JSON.stringify([S.plan.map(x => [x.t, x.m]), phases(S.p).slice(-1)[0].to, ...[S.wk + 3, 23, 30].map(w => genWeek(S.p, w).map(x => [x.t, x.m]))])');
const evDayN = (a, ds) => a.$(`(() => { const d = Math.round((new Date('${ds}T12:00:00') - new Date(S.p.start + 'T12:00:00')) / 864e5); return genWeek(S.p, Math.floor(d / 7) + 1)[d % 7].n; })()`);
const evState = a => a.$('JSON.stringify([S.p, S.plan, S.done, S.log])');
/* Formular öffnen, Felder setzen, speichern */
function evEdit(a, id, f){ a.w.evOpen(id); Object.entries(f).forEach(([k, v]) => a.$(`evF[${JSON.stringify(k)}] = ${JSON.stringify(v)}`)); a.w.evSave(); }

test('Name und Notiz ändern: kein Vorschlag, Plan unverändert, Umlaute bleiben', async () => {
  const a = await evBoot(), id = evId(a, 'Frühjahrsklassiker'), sig = evPlanSig(a);
  evEdit(a, id, {name:'Radmarathon Kitzbühel – Ötztal/Österreich', note:'Startblock B, Nummer abholen am Vortag', link:'https://example.org/ausschreibung'});
  ok(!a.$('evProp'), 'kein Vorschlag'); ok(!a.$('evF'), 'Formular geschlossen'); eq(evPlanSig(a), sig, 'Plan unverändert');
  eq(a.$(`S.p.subs.find(s => s.id === '${id}').name`), 'Radmarathon Kitzbühel – Ötztal/Österreich', 'Umlaute ohne Umschreibung');
  eq(a.$(`S.d.subs.find(s => s.id === '${id}').name`), 'Radmarathon Kitzbühel – Ötztal/Österreich', 'Spiegel im Entwurf');
  const t = a.page('ev-saison'); ok(/Radmarathon Kitzbühel – Ötztal\/Österreich/.test(t) && /Nummer abholen/.test(t) && /Ausschreibung/.test(t), 'Anzeige');
  /* Sicherung schreiben und auf neuem Gerät laden */
  await a.w.exportPlans(); await a.tick(20); const d = a.w.__downloads.find(x => /\.json$/.test(x.name)), txt = await d.blob.text(); ok(txt.includes('Kitzbühel') || txt.includes('Kitzb\\u00fchel'), 'Umlaut in der Sicherung');
  const b = await boot(); const fl = new b.w.File([txt], d.name, {type:'application/json'}); b.w.importPlans({files:[fl], value:''}); await until(b, () => !!b.$('bkImp')); b.w.bkAddPlans();
  await until(b, () => Object.values(b.$('readLib()').plans).some(p => JSON.stringify(p).includes('Kitzbühel'))); ok(true);
  a.noErrors();
});

test('Datum eines A-Events um 2 Wochen verschieben: Vorschlag, nur kommende Tage, Rückgängig exakt', async () => {
  const a = await evBoot(), id = evId(a, 'Frühjahrsklassiker'), s0 = evState(a), pl0 = a.$('JSON.stringify(S.plan)'), t = a.$('todayIdx()');
  evEdit(a, id, {date:'2027-05-02'});
  const P = a.$('evProp'); ok(P, 'Vorschlag'); eq(P.before.date, '2027-04-18'); eq(P.after.date, '2027-05-02'); ok(P.weeks.length >= 2, 'betroffene Wochen: ' + P.weeks.length);
  ok(P.weeks.some(w => w.ex.some(x => /A-Event: Frühjahrsklassiker/.test(x))), 'Eventtag erscheint in den Wochen'); ok(/So ändert sich dein Plan/.test(a.text()) && /Ablehnen: Event ändern, Plan behalten/.test(a.text()) && /Abbrechen: nichts ändern/.test(a.text()));
  a.w.evAccept(); eq(a.$(`S.p.subs.find(s => s.id === '${id}').date`), '2027-05-02');
  const pl1 = JSON.parse(a.$('JSON.stringify(S.plan)')), pl0p = JSON.parse(pl0); for (let i = 0; i <= t; i++) eq(pl1[i], pl0p[i], 'Tag ' + i + ' bleibt');
  eq(evDayN(a, '2027-05-02'), 'A-Event: Frühjahrsklassiker', 'Eventtag am neuen Datum'); ok(evDayN(a, '2027-04-18') !== 'A-Event: Frühjahrsklassiker', 'alter Tag frei');
  ok(/geändert, Plan angepasst/.test(a.text()), 'Hinweis mit Rückgängig'); a.w.evUndoGo(); eq(evState(a), s0, 'Rückgängig stellt exakt her'); a.noErrors();
});

test('Ablehnen: Event geändert, Plan bleibt, Warnung und später „Plan jetzt anpassen“', async () => {
  const a = await evBoot(), id = evId(a, 'Frühjahrsklassiker'), sig = evPlanSig(a);
  evEdit(a, id, {date:'2027-05-02'}); a.w.evKeepPlan(); eq(evPlanSig(a), sig, 'Plan unverändert');
  eq(a.$(`S.p.subs.find(s => s.id === '${id}').date`), '2027-04-18', 'Plan rechnet mit dem bisherigen Datum'); eq(a.$(`S.p.subs.find(s => s.id === '${id}').pend.date`), '2027-05-02', 'neues Datum gemerkt');
  const t = a.page('ev-saison'); ok(/02\.05\.2027/.test(t) && /Tapering und Prognose passen nicht/.test(t) && /Plan jetzt anpassen/.test(t), 'Warnung auf der Karte');
  a.w.evPendGo(id); ok(a.$('evProp'), 'Vorschlag'); a.w.evAccept(); eq(a.$(`S.p.subs.find(s => s.id === '${id}').date`), '2027-05-02'); ok(!a.$(`S.p.subs.find(s => s.id === '${id}').pend`), 'offene Änderung erledigt'); a.noErrors();
});

test('Priorität A → B: kürzeres Tapering; Saisonhöhepunkt → B fragt nach neuem Höhepunkt', async () => {
  const a = await evBoot(), id = evId(a, 'Frühjahrsklassiker');
  evEdit(a, id, {prio:'B'}); const P = a.$('evProp'); ok(/Tage, danach eine lockere Woche/.test(P.before.taper) && /kurzes Tapering/.test(P.after.taper), 'Tapering kürzer'); a.w.evClose();
  a.w.evOpen('main'); a.$("evF.prio = 'B'"); a.w.evSave(); ok(/Wähle, welches Event dein Saisonhöhepunkt wird/.test(a.$('evMsg')), 'Frage nach dem Saisonziel');
  ok(/Welches Event wird dein Saisonhöhepunkt\?/.test(a.text()));
  a.$(`evF.newMain = '${id}'`); a.w.evSave(); const Q = a.$('evProp'); ok(Q.warns.some(w => /neuer Saisonhöhepunkt/.test(w.t) && /fällt aus dem Plan/.test(w.t)), 'ehrlicher Hinweis zum Planende');
  a.w.evAccept(); eq(a.$('S.p.eventName'), 'Frühjahrsklassiker'); eq(a.$('S.p.eventDate'), '2027-04-18'); ok(!a.$("S.p.subs.some(s => s.date >= S.p.eventDate)"), 'keine Events nach dem Planende');
  a.w.evUndoGo(); eq(a.$('S.p.eventName'), 'Hauptrennen', 'Rückgängig');
  a.w.evOpen('main'); a.$("evF.prio = 'B'"); a.$("evF.newMain = ''; evF.prio = 'A'"); a.w.evSave(); ok(!a.$('evProp') && !a.$('evMsg'), '„Keins“: bleibt Höhepunkt, nichts zu ändern'); a.noErrors();
});

test('A-Event auf weniger als 3 Wochen vorgezogen: Hinweis', async () => {
  const a = await evBoot(), id = evId(a, 'Frühjahrsklassiker'); evEdit(a, id, {date:a.$('iso(14)')});
  ok(a.$('evProp.warns').some(w => w.k === 'short' && /nur 14 Tage/.test(w.t) && /Bosquet/.test(w.t)), 'Hinweis „kein volles Tapering“'); a.noErrors();
});

test('Zwei A-Events dicht beieinander: Warnung und Vorschlag, eines als B', async () => {
  const a = await evBoot(), id = evId(a, 'Bergzeitfahren'); evEdit(a, id, {prio:'A', date:'2027-05-09'});
  const w = a.$('evProp.warns').find(x => x.k === 'twoA'); ok(w && /21 Tage/.test(w.t) && w.fix, 'Warnung mit Lösung'); eq(w.fix.name, 'Frühjahrsklassiker');
  a.w.evPropFix(w.fix.id); ok(!a.$('evProp.warns').some(x => x.k === 'twoA'), 'nach „als B-Event“ keine Warnung'); a.w.evAccept();
  eq(a.$(`S.p.subs.find(s => s.name === 'Frühjahrsklassiker').prio`), 'B'); eq(a.$(`S.p.subs.find(s => s.name === 'Bergzeitfahren').prio`), 'A'); a.noErrors();
});

test('Löschen und Duplizieren inklusive Rückgängig', async () => {
  const a = await evBoot(), id = evId(a, 'Kriterium'), s0 = evState(a);
  a.w.evDelOpen(id); ok(/„Kriterium“ löschen\?/.test(a.text())); a.w.evDelGo(); ok(a.$('evProp.o.del'), 'Vorschlag nach dem Löschen'); a.w.evAccept();
  ok(!evId(a, 'Kriterium'), 'gelöscht'); a.w.evUndoGo(); eq(evState(a), s0, 'Rückgängig exakt');
  a.w.evDelOpen('main'); ok(/Wähle zuerst, welches Event an seine Stelle tritt/.test(a.text()), 'Saisonhöhepunkt: erst neues Saisonziel'); a.w.evClose();
  a.w.evDup(id); eq(a.$('evF.id'), null, 'Kopie ist neu'); eq(a.$('evF.date'), '2028-06-10', '+1 Jahr, gleicher Wochentag'); eq(a.$('evF.name'), 'Kriterium');
  a.$("evF.date = '2027-06-26'; evF.name = 'Kriterium Rückrunde'"); a.w.evSave(); ok(a.$('evProp.o.add'), 'Vorschlag für neues Event'); a.w.evAccept();
  eq(a.$("S.p.subs.filter(s => /^Kriterium/.test(s.name)).length"), 2); a.w.evUndoGo(); eq(evState(a), s0); a.noErrors();
});

test('Eigene Zielzeit: neben der Prognose, Prognose unverändert', async () => {
  const a = await evBoot(), F0 = a.$("seasonForecast(S.p).find(o => o.main).t");
  evEdit(a, 'main', {myT:'6:00'}); ok(!a.$('evProp'), 'nicht planrelevant'); eq(a.$('S.p.evMyT'), 360); eq(a.$("seasonForecast(S.p).find(o => o.main).t"), F0, 'Prognose gleich');
  const t = a.page('ev-saison'); ok(new RegExp(`Dein Ziel 6:00 · Prognose ${a.$(`evTF(${F0})`)}`).test(t) && /nötig etwa \d+ W FTP/.test(t), 'Anzeige: ' + (t.match(/Dein Ziel[^\n]*/) || [''])[0]); a.noErrors();
});

test('Pacing je Art: Feld, Zeitfahren, Radmarathon', async () => {
  const a = await evBoot(), P = (k, T, F) => a.$(`evPace(${JSON.stringify(k)}, ${T}, ${F})`);
  const j = P('jed', 125, 275), t = P('tt', 125, 275), r = P('rtf', 600, 275), t1 = P('tt', 60, 275);
  ok(j.hi <= 80 && j.wHi <= 275 * .8, `Jedermann 2 Std.: Ø im Feld höchstens 80 % FTP (${j.lo}–${j.hi} %)`); ok(j.rows.length === 4 && /Im Feld/.test(j.rows[0].l) && /Führung/.test(j.rows[1].l), 'Feld: getrennt Ø, Führung, Antritte, Anstiege');
  ok(t.lo > j.hi && t.hi === t.IF, 'Zeitfahren deutlich höher als Ø im Feld'); ok(t1.hi >= 95, 'Zeitfahren 1 Std. nahe FTP'); ok(r.cl <= 85 && r.hi < t.lo, 'Radmarathon 10 Std.: Anstiege höchstens 85 %');
  ok(/Kohlenhydrate/.test(r.note) && /Windschatten/.test(j.note) && /gleichmäßig/i.test(t.note), 'Hinweise je Art');
  [j, t, r].forEach(x => ok(x.wLo < x.wHi && x.wHi <= x.wCl, 'Reihenfolge der Werte'));
  const txt = a.page('ev-saison'); ok(/Im Feld \(Ø\)/.test(txt) && /Richtwerte/.test(txt), 'Anzeige in der Karte'); a.noErrors();
});

test('Prüfungen: Vergangenheit, Steigung, Link, Pflichtfelder', async () => {
  const a = await evBoot(), id = evId(a, 'Kriterium'), m = f => { evEdit(a, id, f); const r = a.$('evMsg'); a.w.evClose(); return r; };
  ok(/Vergangenheit/.test(m({date:'2026-10-01'}))); ok(/10 % Steigung/.test(m({dist:'20', hm:'2500'}))); ok(/http/.test(m({link:'javascript:alert(1)'}))); ok(/Namen/.test(m({name:'  '}))); ok(/Stunden:Minuten/.test(m({myT:'zwei'}))); a.noErrors();
});

test('Karten: eigener Rahmen, Bearbeiten mit Vorlesetext, Reisemodus aus/an', async () => {
  const a = await evBoot(); a.page('ev-saison'); const d = a.w.document;
  const cards = [...d.querySelectorAll('.evcard')]; eq(cards.length, 4, 'je Event eine Karte'); ok(cards.every(c => c.querySelector('[aria-label^="Event bearbeiten: "]')), 'Stift mit Vorlesetext');
  ok(!/Anreise und Zeitzone/.test(a.text()), 'Reisemodus aus: keine Zeile'); a.w.evOpen('main'); ok(!/Zeitzone/.test(a.text()), 'Formular ohne Zeitzone'); a.w.evClose();
  a.$("rzSetMode('on')"); a.page('ev-saison'); const c2 = [...a.w.document.querySelectorAll('.evcard')];
  ok(c2.every(c => { const x = c.querySelector('details.evfuel'); return x && c.lastElementChild === x; }), '„Anreise und Zeitzone“ als letzte Zeile in jeder Karte');
  a.w.evOpen('main'); ok(/Zeitzone des Events/.test(a.text()), 'Formular mit Zeitzone'); a.w.evClose(); a.noErrors();
});

test('Alte Sicherung ohne neue Felder lädt, Englisch', async () => {
  const a = await evBoot(); a.$("S.p.subs.forEach(s => { delete s.kind; delete s.note; delete s.myT; }); delete S.p.evNote; save()");
  const b = await boot({store:a.store()}); b.$('cheerShow = null'); const t = b.page('ev-saison'); ok(/Frühjahrsklassiker/.test(t) && b.$('document.querySelectorAll(".evcard").length') === 4, 'lädt');
  b.w.evOpen(b.$("S.p.subs[0].id")); eq(b.$('evF.note'), ''); eq(b.$('evF.myT'), ''); b.w.evClose();
  await b.en(); const e = b.page('ev-saison'); ok(/Add event/.test(e) && /In the bunch|Steady|On the flat/.test(e) && !/Event hinzufügen/.test(e), 'Englisch'); b.w.evOpen('main'); ok(/Edit event/.test(b.text()) && /Own target time/.test(b.text())); b.noErrors();
});
