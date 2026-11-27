/* F37: Mehr-Menü mit fünf festen Punkten und „Extras“; Plan-Check und Gesamtplan unter Fortschritt und auf Heute */
R.file = 'mehr-menue';
const MM_EV = {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', dist:120, hm:1500};
const mmRows = a => a.$(`[...document.querySelectorAll('#app .mlist:not(#fx-extras) > .mrow .font-semibold')].map(x => x.textContent)`);
const mmExtras = a => a.$(`[...document.querySelectorAll('#fx-extras > .mrow:not(summary) .font-semibold')].map(x => x.textContent)`);

test('Sechs feste Punkte in fester Reihenfolge (Team als sechster), darunter genau eine Zeile Extras', async () => {
  const a = await boot(); makePlan(a, MM_EV); a.page('more');
  eq(mmRows(a), ['Fahrten analysieren', 'Übungen', 'Event und meine Pläne', 'Export', 'Einstellungen', 'Team Relentless Riders']);
  eq(a.$(`document.querySelectorAll('#app details#fx-extras').length`), 1, 'eine Extras-Zeile');
  eq(a.$(`document.querySelector('#fx-extras > summary .font-semibold').textContent`), 'Extras');
  ok(!/Werkzeuge/.test(a.text()), 'kein „Werkzeuge“ mehr');
  a.page('event'); ok(/Meine Pläne/.test(a.text()), 'Event-Seite führt zu Meine Pläne'); a.noErrors();
  const b = await boot(); makePlan(b, {goal:'ftp', ftpTarget:280}); b.page('more');
  eq(mmRows(b), ['Fahrten analysieren', 'Übungen', 'Meine Pläne', 'Export', 'Einstellungen', 'Team Relentless Riders'], 'ohne Event: Meine Pläne an dritter Stelle');
  b.noErrors();
});

test('Extras beim Öffnen der Seite immer zu, kein gespeicherter Zustand', async () => {
  const a = await boot(); makePlan(a, MM_EV); a.page('more');
  eq(a.$(`document.getElementById('fx-extras').open`), false, 'zu beim ersten Öffnen');
  a.$(`document.getElementById('fx-extras').open = true`); await a.tick(30);
  a.$('render()'); eq(a.$(`document.getElementById('fx-extras').open`), true, 'bleibt offen bei render()');
  a.w.goPg('tool-tire'); a.w.goBack(); eq(a.$(`document.getElementById('fx-extras').open`), false, 'nach Zurück wieder zu');
  a.$(`document.getElementById('fx-extras').open = true`); await a.tick(30);
  a.w.navGo('week'); a.w.navGo('more'); eq(a.$(`document.getElementById('fx-extras').open`), false, 'nach Tabwechsel wieder zu');
  ok(!/fx-extras|mrTl/.test(JSON.stringify(a.store())), 'nichts gespeichert'); a.noErrors();
});

test('Extras: Fitness-Checks und Zyklus nur bei Bedarf; Team direkt unter Mehr mit Symbol statt Zeichen', async () => {
  const a = await boot(); makePlan(a, MM_EV); a.page('more');
  eq(mmExtras(a), ['Fitness-Checks', 'Reifendruck', 'Wissen']);
  ok(a.$(`!!document.querySelector('#app .mlist:not(#fx-extras) > a.mrow svg path[d^="M14 4h6v6"]')`) && !/↗/.test(a.text()), 'Symbol „öffnet extern“ als SVG');
  a.$('S.p.tests = false; save(); render();'); eq(mmExtras(a), ['Reifendruck', 'Wissen'], 'ohne Fitness-Checks');
  a.$(`S.p.sex = 'f'; S.p.cycMode = 'track'; S.p.cycLast = iso(-5); save(); render();`);
  eq(mmExtras(a), ['Zyklus', 'Reifendruck', 'Wissen'], 'mit Zyklus');
  ok(/Zyklus, Reifendruck, Wissen$/.test(a.$(`document.querySelector('#fx-extras > summary .text-xs').textContent`)), 'Zusammenfassung nennt nur vorhandene');
  ok(!/Entwickler|nur wenn/.test(a.$(`document.getElementById('fx-extras').textContent`)), 'kein Entwicklerhinweis'); a.noErrors();
});

test('Plan-Check und Gesamtplan unter Fortschritt und auf Heute', async () => {
  const a = await boot(); makePlan(a, MM_EV);
  a.page('state'); const st = a.$(`[...document.querySelectorAll('#fx-stplan .mrow')].map(b => b.getAttribute('onclick'))`);
  ok(st.includes("goPg('check')") && st.includes("goPg('overview')"), 'Fortschritt: ' + st);
  a.w.goPg('check'); eq(a.$('pg'), 'check'); eq(a.$(`document.querySelector('.bnav button.on span').textContent`), 'Fortschritt', 'Tab bleibt Fortschritt');
  a.w.navGo(null); const h = a.$(`[...document.querySelectorAll('.hm-pl button')].map(b => b.getAttribute('onclick'))`);
  eq(h, ["goPg('check')", "goPg('overview')"], 'Heute');
  ok(a.$(`[...document.querySelectorAll('.hm-pl button')].every(b => b.getBoundingClientRect().height >= 44)`), 'Tippflächen 44 pt');
  a.w.navGo('more'); ok(!/Plan-Check|Gesamtplan/.test(a.text()), 'nicht mehr unter Mehr');
  a.w.dykSt(); await a.tick(120); eq(a.$('pg'), 'state', 'Hinweis führt zu Fortschritt'); ok(a.$(`!!document.getElementById('fx-stplan')`), 'Anker vorhanden');
  ok(a.$(`DYK.some(t => t[0] === 'f37' && t[3] === 'dykSt()')`) && a.$(`!!WN_DATA['225']`), 'Hinweis und Neuigkeiten'); a.noErrors();
});
