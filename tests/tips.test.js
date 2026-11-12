/* F20: Katalog „Tipp zu heute“ – Umfang, Sprachen, Tags, Quellen, keine schnellen Wiederholungen */
R.file = 'tips';
const TAGK = {d:['rest', 'rec', 'base', 'int', 'long', 'str', 'ev7', 'ev21', 'race', 'post'], ph:['base', 'build', 'peak', 'taper'], s:['w', 's'], wx:['hot', 'cold', 'wet'], lv:['new', 'amb']};

test('Mindestens 150 Tipps, jeder mit Deutsch, Englisch, Kategorie und gültigen Tags', async () => {
  const a = await boot(), T = a.$('TIPS'), cats = a.$('TIP_CAT'), bad = [];
  ok(T.length >= 150, T.length + ' Tipps'); eq(new Set(T.map(t => t[0])).size, T.length, 'IDs eindeutig');
  T.forEach(t => { if (!t[3] || !t[4] || t[3] === t[4]) bad.push(t[0] + ': Sprachen'); if (!cats[t[1]]) bad.push(t[0] + ': Kategorie');
    String(t[2]).split(/\s+/).filter(Boolean).forEach(x => { const [k, v] = x.split(':'); if (!TAGK[k] || !v.split(',').every(q => TAGK[k].includes(q))) bad.push(t[0] + ': Tag ' + x); }); });
  eq(bad, []); const per = {}; T.forEach(t => per[t[1]] = (per[t[1]] || 0) + 1); ok(Object.keys(per).length === 9, 'neun Kategorien: ' + JSON.stringify(per));
});

test('Kein Tipp mit Zahlen ohne Quelle im Katalog, alle Quellen vorhanden', async () => {
  const a = await boot(), T = a.$('TIPS'), src = a.$('TIP_SRC'), bad = [];
  T.forEach(t => { const nums = /\d/.test(t[3].replace(/\{eiw\}|\{fl\}/g, '')) || /\{eiw\}|\{fl\}/.test(t[3]);
    if (nums && !t[5]) bad.push(t[0] + ': Zahl ohne Quelle'); if (t[5] && !t[5].split(',').every(s => src[s])) bad.push(t[0] + ': Quelle fehlt im Verzeichnis'); });
  eq(bad, []);
});

test('„Mehr dazu“ jedes Tipps führt zu einem Wissensabschnitt', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d); const ids = [...new Set(a.$('TIPS').map(t => t[6]).filter(Boolean))], bad = [];
  for (const id of ids) { a.page(null); a.w.wOpen(id); await a.tick(60); if (!a.w.document.getElementById(id)) bad.push(id); }
  eq(bad, []);
});

test('90 simulierte Tage: keine Wiederholung, solange passende ungesehene Tipps da sind', async () => {
  const a = await boot(); makePlan(a, {...SCEN[1].d, mobN:0}, SCEN[1].subs); const log = [], bad = [];
  for (let k = 0; k < 90; k++) {
    const t0 = at(2026, 11, 11) + k * 864e5; a.setNow(t0);
    const day = a.$('iso(0)'), before = JSON.parse(JSON.stringify(a.$('S.tips || {}'))), c = a.$(`tipCtx('${day}')`);
    const fresh = a.$('TIPS').filter(t => a.w.tipFit(t, c) >= 0 && !(before.seen || {})[t[0]]).length;
    const t = a.$('tipToday(false)'); if (!t) { bad.push(day + ': kein Tipp'); continue; }
    const last = (before.seen || {})[t[0]]; if (last && before.day !== day) { if (fresh) bad.push(`${day}: ${t[0]} wiederholt, obwohl ${fresh} ungesehen`); const age = Math.round((new Date(day + 'T12:00:00') - new Date(last + 'T12:00:00')) / 864e5); if (age < 60) bad.push(`${day}: ${t[0]} nach ${age} Tagen`); }
    log.push(t[0]); a.w.render();
  }
  eq(bad.slice(0, 5), []); ok(new Set(log).size >= 60, `${new Set(log).size} verschiedene Tipps in 90 Tagen`); a.noErrors();
});

test('Nächster Tipp, Nicht mehr zeigen, gespeichert und in der Sicherung', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d); a.page(null); await a.tick(10); const t1 = a.$('S.tips.id');
  a.w.tipNext(); const t2 = a.$('S.tips.id'); ok(t2 && t2 !== t1, 'anderer Tipp'); a.w.tipHide(); ok(a.$('S.tips.off').includes(t2), 'ausgeblendet'); ok(a.$('S.tips.id') !== t2, 'nicht mehr gezeigt');
  await a.w.exportPlans(); await a.tick(20); const d = a.w.__downloads.find(x => /\.json$/.test(x.name)); ok((await d.blob.text()).includes('"tips"'), 'in der Sicherungsdatei'); a.noErrors();
  const off = a.$('S.tips.off'), b = await boot({store:a.store()}); eq(b.$('S.tips.off'), off, 'nach Neustart erhalten');
});

test('Eiweiß aus dem Körpergewicht (0,3–0,4 g/kg) und englische Anzeige', async () => {
  const a = await boot(); makePlan(a, {...SCEN[0].d, weight:75}); const t = a.$("TIPS.find(t => t[0] === 'n06')");
  eq(a.w.tipText(t, false), 'Auch am Ruhetag: Eiweiß über den Tag verteilt, etwa 23 bis 30 g pro Mahlzeit, unterstützt die Erholung.');
  ok(/23 to 30 g/.test(a.w.tipText(t, true))); await a.en(); ok(/TIP FOR TODAY|Tip for today/i.test(a.page(null)), 'englische Karte'); a.noErrors();
});
