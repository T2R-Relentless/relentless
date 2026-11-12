/* B7: Aktionsknöpfe der Hinweiskarten („Wusstest du schon?“, „Tipp zu heute“, „Was ist neu“, Startseite) */
R.file = 'hints';
/* Ziel einer Aktion ist gültig: eine Unterseite mit Inhalt (ohne Kopfzeile, Titel und Navigation mehr als 60 Zeichen),
   ein geöffneter Dialog oder die Startseite mit Inhalt */
const landed = a => { const d = a.w.document; if (d.querySelector('.exov, .sqov, [role=dialog]')) return true;
  const L = a.text().split('\n').filter(Boolean), body = L.slice(3, -5).filter(l => !/^‹ /.test(l)).join('\n');
  return body.length > 60; };

test('„Fahrten ansehen“ ohne bewertete Fahrt: Logbuch mit Hinweis', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d); a.w.dykGo('dykRides()');
  eq(a.$('pg'), 'logbook'); ok(/Noch keine bewertete Fahrt – nach deiner nächsten Fahrt findest du die Auswertung hier\./.test(a.text()), 'Hinweis sichtbar');
  a.w.goPg('week'); a.w.goPg('logbook'); ok(!/Noch keine bewertete Fahrt/.test(a.text()), 'Hinweis nur nach dem Tipp'); a.noErrors();
});

test('„Fahrten ansehen“ mit bewerteten Fahrten: neueste in der Detailansicht', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d);
  a.$(`S.man = [{id:'m1', n:'Alt', day:'2026-11-08', ts:'2026-11-08T07:00:00.000Z', sec:3600, km:30, hm:200, tss:50}, {id:'m2', n:'Neu', day:'2026-11-10', ts:'2026-11-10T07:00:00.000Z', sec:3600, km:32, hm:250, tss:55}, {id:'m3', n:'Unbewertet', day:'2026-11-11', ts:'2026-11-11T06:00:00.000Z', sec:1800, km:15, hm:50, tss:20}];
    S.lb = {m1:{k:'x', day:'2026-11-08', n:'Alt', cls:'z2', msgs:[], at:1}, m2:{k:'p', day:'2026-11-10', n:'Grundlage', score:82, msgs:[], at:2}}; save();`);
  a.w.dykGo('dykRides()'); eq(a.$('pg'), 'lb-ride'); eq(a.$('lbSel'), 'm2', 'neueste bewertete Fahrt, nicht die unbewertete');
  ok(/10\.11\.2026/.test(a.text()), 'Detailansicht zeigt die Fahrt'); a.noErrors();
});

test('Jede Aktion in „Wusstest du schon?“ hat ein gültiges Ziel', async () => {
  const a0 = await boot(), acts = a0.$('DYK.map(t => [t[0], t[3]]).filter(t => t[1])'), bad = [];
  for (const [id, act] of acts) {
    const a = await boot(); makePlan(a, SCEN[1].d, SCEN[1].subs); a.page(null);
    try { a.w.dykGo(act); await a.tick(80); } catch (e) { bad.push(`${id}: ${e.message}`); continue; }
    const e = a.errs().concat(a.$('elogRead()').map(x => x.m)); if (e.length) bad.push(`${id}: ${e[0]}`); else if (!landed(a)) bad.push(`${id}: keine Ansicht (${act})`);
  }
  eq(bad, []); ok(acts.length >= 20, acts.length + ' Aktionen geprüft');
});

test('„Mehr dazu“ in „Tipp zu heute“ öffnet den passenden Wissensabschnitt', async () => {
  const a = await boot(), ids = ['w-erh', 'w-vor', 'w-waehrend', 'w-race', 'w-train', 'w-calc', 'w-sex', 'w-supp', 'w-nach', 'w-zonen', 'w-zeit', 'w-alltag', 'w-energie'], bad = [];
  makePlan(a, SCEN[0].d);
  for (const id of ids) { a.page(null); a.w.wOpen(id); await a.tick(80); const el = a.w.document.getElementById(id); if (a.$('pg') !== 'science' || !el) bad.push(id + (el ? '' : ': Abschnitt fehlt')); else if (el.tagName === 'DETAILS' && !el.open) bad.push(id + ': nicht aufgeklappt'); }
  eq(bad, []); a.noErrors();
});

test('„Zeigen“ in „Was ist neu“ führt zu einer vorhandenen Ansicht', async () => {
  const a0 = await boot(), n = a0.$('wnItems(0, APP_VERSION, null, 99).items.length'), bad = [];
  for (let k = 0; k < n; k++) {
    const a = await boot(); makePlan(a, SCEN[2].d); a.$('wnShow = {from:0, auto:false}'); const it = a.$(`wnItems(0, APP_VERSION, null, 99).items[${k}]`);
    if (!it.go) continue; a.w.wnJump(k); await a.tick(50);
    if (a.errs().length || a.$('elogRead()').length) bad.push(`${it.go}: Fehler`); else if (!landed(a) || (a.$('pg') == null && !/^nav:(home|week)$/.test(it.go))) bad.push(`${it.go}: Ziel ${a.$('pg')}`);
  }
  eq(bad, []);
});

test('Alle Knöpfe der Startseite lösen keinen Fehler aus', async () => {
  const a0 = await boot(); makePlan(a0, SCEN[1].d, SCEN[1].subs); a0.page(null);
  const ocs = [...new Set([...a0.w.document.querySelectorAll('#app button[onclick]')].map(b => b.getAttribute('onclick')))], bad = [];
  for (const oc of ocs) {
    const a = await boot({store:a0.store()}); a.page(null); const b = [...a.w.document.querySelectorAll('#app button[onclick]')].find(x => x.getAttribute('onclick') === oc);
    if (!b) continue; try { b.click(); await a.tick(60); } catch (e) { bad.push(`${oc}: ${e.message}`); continue; }
    const e = a.errs().concat(a.$('elogRead()').map(x => x.m)); if (e.length) bad.push(`${oc}: ${e[0]}`);
  }
  eq(bad, []); ok(ocs.length >= 10, ocs.length + ' Knöpfe geprüft');
});
