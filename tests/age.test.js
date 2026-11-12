/* Audit 12.11.2026: M1 (Spitzenphase mit Dauerleistung), M2 (Rennwoche), M7 (Alter, Rhythmus 2:1, Abstand) */
R.file = 'age';
const wkAll = a => { const p = a.$('S.p'), ph = a.$('phases')(p), gw = a.$('genWeek'), out = []; for (let w = 1; w <= ph[ph.length - 1].to; w++) out.push({w, k:(ph.find(x => w >= x.from && w <= x.to) || {}).key, pl:gw(p, w)}); return out; };
const hardT = x => ['sst', 'thr', 'vo2'].includes(x.t);

test('M1: Spitze für Rennen im Feld wechselt zwischen rennnaher Woche und Dauerleistung', async () => {
  for (const hm of [300, 450]) {
    const a = await boot(); makePlan(a, {goal:'event', eventName:'Jedermann-Rennen', eventDate:'2027-10-03', dist:76, hm, targetTime:'2:00', fmt:'race', ftp:305, weight:85, hours:8});
    const pk = wkAll(a).filter(x => x.k === 'peak' && x.w % 4 !== 0), names = pk.map(x => x.pl.filter(hardT).map(y => y.n).join(' + '));
    ok(pk.length >= 4, 'Spitzenphase vorhanden');
    ok(names.some(n => /Over-Under mit Antritten/.test(n)), 'rennnahe Woche: ' + names.join(' | '));
    ok(names.some(n => /30\/15/.test(n) && /Schwelle|Over-Under/.test(n)), 'Woche für die Dauerleistung: ' + names.join(' | '));
    /* in je zwei aufeinanderfolgenden Belastungswochen mindestens eine Einheit an der Schwelle (ab 95 % FTP über mindestens 20 Min. Belastung) */
    const thr = pk.map(x => x.pl.some(y => y.t === 'thr' && y.iv && y.iv.lo >= 88)); for (let i = 1; i < thr.length; i++) ok(thr[i] || thr[i - 1], 'Schwellenreiz in Woche ' + pk[i].w + ' oder davor');
    a.noErrors();
  }
});

test('M1: andere Eventtypen bleiben unverändert (alpin, Marathon)', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Alpenmarathon', eventDate:'2027-07-10', dist:180, hm:4000, fmt:'mara', ftp:250, hours:9});
  const n = wkAll(a).filter(x => x.k === 'peak' && x.w % 4 !== 0).map(x => x.pl.filter(hardT).map(y => y.t).sort().join('+'));
  ok(n.filter(t => t === 'thr+vo2').length >= n.length - 1, 'alpin: Schwelle und VO2max: ' + n.join(' | '));
});

test('M2: Rennwoche behält die Auffrischungseinheiten, Eventtag ohne Zielzeit mit geschätzter Dauer', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Gran Fondo', eventDate:'2027-05-02', dist:120, hm:1500, targetTime:'', fmt:'mara', ftp:165, weight:75, hours:5, avail:[false, true, false, true, false, true, true], longDay:6});
  const W = wkAll(a), last = W[W.length - 1].pl, ev = last.find(x => /^Eventtag/.test(x.n)), tev = a.$('evProfile(S.p).tev');
  ok(ev && ev.m >= 240 && ev.m <= 400 && Math.abs(ev.m - tev) <= 5, 'Eventtag ' + (ev && ev.m) + ' Min. statt 480 (geschätzt ' + tev + ')');
  ok(last.some(x => /Wettkampftempo 2×10/.test(x.n)), 'Wettkampftempo vollständig: ' + last.map(x => x.n).join(' | '));
  ok(last.filter(hardT).length === 2, 'beide Einheiten der Rennwoche bleiben');
  /* normale Wochen bleiben im Budget */
  W.slice(1, -1).forEach(x => ok(x.pl.reduce((s, y) => s + (y.m || 0), 0) <= 5 * 60 + 1, 'Woche ' + x.w + ' im Budget'));
});

test('M2: Prognose der Zielzeit auch ohne eingetragene Zielzeit', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Gran Fondo', eventDate:'2027-05-02', dist:120, hm:1500, targetTime:'', ftp:165, weight:75, hours:5});
  const c = a.$('planCheck(S.p, false)'); ok(!c.notes.some(n => /fehlen noch Distanz/.test(n.t)), 'kein falscher Hinweis auf fehlende Strecke');
  ok(a.$('evTime(S.p, S.p.ftp)') > 200, 'erreichbare Zeit berechnet');
});

test('M7: ohne Geburtsjahr bleibt alles wie bisher (3:1)', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', ftp:250, hours:8});
  eq(a.$('rhyOf(S.p)'), '3:1'); eq(a.$('gapOf(S.p)'), false); eq(a.$('ageOf(S.p)'), 0);
  const rec = wkAll(a).filter(x => x.k !== 'taper' && x.pl.some(y => /Auffrischung|Spritzig/.test(y.n)) && !x.pl.some(y => /Sweet|Schwelle|30\/15/.test(y.n))).map(x => x.w);
  ok(rec.length > 3 && rec.every(w => w % 4 === 0), 'Entlastung jede 4. Woche: ' + rec.join(','));
  eq(a.$('testWeeks(S.p)').slice(0, 2), [5, 13]);
});

test('M7: ab 50 Jahren Vorschlag 2:1 und mehr Abstand, Alter aus dem Geburtsjahr', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Radmarathon', eventDate:'2027-06-06', dist:150, hm:2000, fmt:'mara', ftp:234, weight:78, hours:7, birthDate:'1970-05-20', strN:2, avail:[true, true, true, true, true, true, true], longDay:6});
  eq(a.$('ageOf(S.p)'), 56); eq(a.$('rhyOf(S.p)'), '2:1'); eq(a.$('gapOf(S.p)'), true);
  const W = wkAll(a), p = a.$('S.p'), min = x => x.pl.reduce((s, y) => s + (y.m || 0), 0);
  W.filter(x => x.k !== 'taper' && x.w > 1).forEach(x => { if (x.w % 3 === 0) { ok(x.pl.filter(hardT).length <= 1, 'Woche ' + x.w + ': Entlastung mit höchstens einer kurzen Einheit'); ok(min(x) < min(W[x.w - 2]) * .85, 'Woche ' + x.w + ': weniger Umfang als die Woche davor'); } });
  eq(a.$('testWeeks(S.p)').slice(0, 3), [4, 10, 16], 'Fitness-Checks nach Entlastungswochen');
  /* Kraft: leichte Woche in der Entlastung */
  eq(Object.values(a.w.strOf(p, 3, W[2].pl))[0].kind, 'leicht'); ok(Object.values(a.w.strOf(p, 5, W[4].pl)).length === 2, 'zwei Krafteinheiten in der Belastungswoche');
  /* Abstand: zwischen zwei harten Einheiten liegen mindestens zwei Tage, wo es die Woche erlaubt */
  let close = 0, n = 0; W.filter(x => x.k === 'build' || x.k === 'peak').forEach(x => { const d = x.pl.map((y, i) => hardT(y) ? i : -1).filter(i => i >= 0); if (d.length === 2) { n++; if (d[1] - d[0] < 3) close++; } });
  ok(n > 5 && close === 0, `harte Einheiten mit Abstand (${close} von ${n} zu dicht)`);
  a.noErrors();
});

test('M7: eigene Wahl geht vor (unter 50 mit 2:1, über 50 mit 3:1)', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', ftp:250, hours:8, birthDate:'1990-01-01', rhythm:'2:1'}); eq(a.$('rhyN(S.p)'), 3); eq(a.$('gapOf(S.p)'), false);
  const b = await boot(); makePlan(b, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', ftp:250, hours:8, birthDate:'1965-03-03', rhythm:'3:1', gap2:false}); eq(b.$('rhyN(S.p)'), 4); eq(b.$('gapOf(S.p)'), false);
  eq(b.$("ageOf({birthDate:'1800-01-01'})"), 0); eq(b.$("ageOf({birthDate:'abc'})"), 0); eq(b.$("ageOf({birthDate:'2025-01-01'})"), 0, 'unplausible Daten zählen nicht'); eq(b.$("ageOf({birthDate:'1970-02-30'})"), 0, 'kein echtes Datum');
  eq(b.$("ageAt({birthDate:'1976-11-12'}, '2026-11-11')"), 49, 'Tag vor dem Geburtstag'); eq(b.$("ageAt({birthDate:'1976-11-12'}, '2026-11-12')"), 50, 'am Geburtstag'); eq(b.$("ageOf({birthYear:1970})"), 56, 'älteres Geburtsjahr gilt weiter');
});

test('M7: Eingabe in der Planung (deutsch und englisch), Plan anpassen erkennt die Änderung', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', ftp:250, hours:8, dist:100, hm:800});
  a.$('edit(); S.step = 2; render()'); let t = a.text(); ok(/Alter und Erholung/.test(t) && /Geburtsdatum/.test(t) && /Wochenrhythmus/.test(t), 'Abschnitt in Schritt 2');
  eq(a.$('editState()'), 'same'); a.w.setBirth('1968-04-02'); eq(a.$('editState()'), 'adj', 'Geburtsjahr ändert den Plan (Vorschlag 2:1)'); t = a.text();
  ok(/Alter: 58 Jahre/.test(t.replace(/\s+/g, ' ')) && /Für dein Alter vorgeschlagen und eingestellt/.test(t), 'Alter und Vorschlag sichtbar');
  a.w.setRhy('3:1'); ok(/Du hast etwas anderes gewählt/.test(a.text())); a.w.setRhy('2:1'); a.w.setBirth('2020-01-01'); eq(a.$('S.d.birthDate'), undefined, 'unplausibles Datum wird nicht gespeichert'); a.w.setBirth('1968-04-02');
  a.w.__iMiss = new Map(); await a.en(); a.$('render()'); t = a.text(); ok(/Age and recovery/.test(t) && /Date of birth/.test(t) && /2 weeks of load, 1 week of recovery/.test(t) && /Age: 58 years/.test(t.replace(/\s+/g, ' ')), 'englisch');
  const miss = [...a.w.__iMiss.keys()].filter(k => /Alter|Geburt|Rhythmus|Vorschlag|Speichern|Abstand|Entlastung|Belastung|Studienlage|Intensität der|Angabe bleibt|Krafttraining ist/.test(k)); eq(miss, [], 'keine fehlenden Übersetzungen');
  a.w.finish(); eq(a.$('rhyOf(S.p)'), '2:1'); eq(a.$('S.p.birthDate'), '1968-04-02'); a.noErrors();
  const b = await boot({store:a.store()}); eq(b.$('S.p.birthDate'), '1968-04-02', 'nach Neustart erhalten'); eq(b.$('rhyOf(S.p)'), '2:1');
});

test('M1/M7: Anforderungsprofil und Plan-Check-Text auf Englisch ohne Lücken', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Jedermann-Rennen', eventDate:'2027-10-03', dist:76, hm:300, targetTime:'2:00', fmt:'race', ftp:305, weight:85, hours:8, birthDate:'1970-05-20'});
  ok(/im Wechsel eine rennnahe Woche/.test(a.page('ev-prof')), 'deutscher Text'); const tc = () => a.w.document.getElementById('app').textContent; /* der Satz steht in einem eingeklappten Abschnitt */
  a.page('check'); ok(/über zwei Wochen und entlastet in der dritten/.test(tc()), 'Plan-Check nennt 2:1');
  a.w.__iMiss = new Map(); await a.en(); ok(/alternating a race-like week/.test(a.page('ev-prof'))); a.page('check'); ok(/builds over two weeks/.test(tc()), 'englischer Satz');
  eq([...a.w.__iMiss.keys()].filter(k => /Spitzenphase|steigert sich/.test(k)), []); a.noErrors();
});

/* Einstellungen → Training → Alter und Erholung: einsehen, ändern, Plan nach Zustimmung anpassen */
const agPlan = d => ({goal:'event', eventName:'Radmarathon', eventDate:'2027-06-06', dist:150, hm:2000, fmt:'mara', ftp:234, weight:78, hours:7, ...d});
const recOf = (a, from, to) => { const p = a.$('S.p'), out = []; for (let w = from; w <= to; w++) if (a.$('recWk')(p, w)) out.push(w); return out; };

test('Einstellungen: Zeile mit Alter und Rhythmus, Seite zeigt das gespeicherte Geburtsdatum', async () => {
  const a = await boot(); makePlan(a, agPlan({birthDate:'1970-05-20'}));
  const t = a.page('settings').replace(/\s+/g, ' '); ok(/Alter und Erholung 56 Jahre · Rhythmus 2:1 · mehr Abstand/.test(t), 'Zeile: ' + t.slice(0, 400));
  a.page('set-age'); const inp = a.w.document.querySelector('#fx-age input[type=date]'); eq(inp.value, '1970-05-20'); ok(/Alter: 56 Jahre/.test(a.text().replace(/\s+/g, ' ')));
  ok(!/Speichern/.test(a.text()), 'ohne Änderung kein Speichern-Knopf');
  const b = await boot(); makePlan(b, agPlan({})); ok(/Alter nicht eingetragen · Rhythmus 3:1/.test(b.page('settings').replace(/\s+/g, ' ')), 'ohne Angabe'); b.noErrors(); a.noErrors();
});

test('Einstellungen: Geburtsdatum nachträglich eintragen → kommende Wochen 2:1, laufende Woche als Vorschlag', async () => {
  const a = await boot(); makePlan(a, agPlan({})); eq(recOf(a, 2, 12), [4, 8, 12]);
  const before = JSON.stringify(a.$('S.plan')), fut0 = JSON.stringify(a.$('genWeek(S.p, 3)'));
  a.page('set-age'); a.w.setBirth('1966-08-01');
  eq(a.$('S.p.birthDate'), undefined, 'erst nach Speichern übernommen'); eq(JSON.stringify(a.$('genWeek(S.p, 3)')), fut0, 'Plan vor dem Speichern unverändert');
  let t = a.text(); ok(/Nach dem Speichern ändert sich dein Plan ab der nächsten Woche: jede dritte Woche Entlastung, mehr Abstand/.test(t), 'Hinweis vor dem Speichern');
  a.w.agSave(); eq(a.$('S.p.birthDate'), '1966-08-01'); eq(a.$('S.d.birthDate'), '1966-08-01', 'Entwurf synchron');
  eq(recOf(a, 2, 12), [3, 6, 9, 12], 'Entlastung jede dritte Woche'); ok(JSON.stringify(a.$('genWeek(S.p, 3)')) !== fut0, 'Woche 3 neu geplant');
  eq(a.$('testWeeks(S.p)').slice(0, 2), [4, 10], 'Fitness-Checks verschoben');
  t = a.text(); ok(/Nächste Entlastungswoche: Woche 3/.test(t), 'Meldung mit nächster Entlastungswoche'); ok(/Vorschlag für diese Woche/.test(t), 'Vorschlag für die laufende Woche');
  eq(JSON.stringify(a.$('S.plan')), before, 'laufende Woche erst nach Zustimmung');
  a.w.agAccept(); ok(JSON.stringify(a.$('S.plan')) !== before, 'nach Annehmen angepasst'); ok(/Diese Woche ist angepasst/.test(a.text()));
  eq(a.$('S.plan[0]').n, JSON.parse(before)[0].n, 'vergangener Tag bleibt');
  ok(a.$('S.log').some(l => /Alter und Erholung/.test(l.title)), 'Eintrag im Verlauf');
  const b = await boot({store:a.store()}); eq(b.$('S.p.birthDate'), '1966-08-01', 'nach Neustart erhalten'); eq(b.$('rhyOf(S.p)'), '2:1'); a.noErrors();
});

test('Einstellungen: Vorschlag ablehnen, Verwerfen, Geburtsdatum ändern ohne Wirkung', async () => {
  const a = await boot(); makePlan(a, agPlan({birthDate:'1980-01-01'})); const before = JSON.stringify(a.$('S.plan'));
  a.page('set-age'); a.w.setBirth('1960-01-01'); a.w.agCancel(); eq(a.$('S.p.birthDate'), '1980-01-01', 'Verwerfen'); eq(a.$('rhyOf(S.p)'), '3:1');
  a.w.setBirth('1960-01-01'); a.w.agSave(); a.w.agDecline(); eq(JSON.stringify(a.$('S.plan')), before, 'Ablehnen lässt die Woche'); eq(a.$('rhyOf(S.p)'), '2:1', 'gilt trotzdem ab nächster Woche');
  ok(/Diese Woche bleibt, wie sie ist/.test(a.text()));
  a.w.setBirth('1962-01-01'); ok(/Rhythmus und Abstand bleiben dabei gleich/.test(a.text()), 'nur Datum geändert'); a.w.agSave(); ok(/Rhythmus und Abstand bleiben, wie sie sind/.test(a.text())); a.noErrors();
});

test('Einstellungen: eigene Wahl wird vom Geburtsdatum nicht überschrieben, „Vorschlag nach Alter“ setzt sie zurück', async () => {
  const a = await boot(); makePlan(a, agPlan({rhythm:'3:1', gap2:false})); a.page('set-age');
  a.w.setBirth('1960-01-01'); a.w.agSave(); eq(a.$('rhyOf(S.p)'), '3:1', 'eigene Wahl bleibt'); ok(/Du hast etwas anderes gewählt/.test(a.text()));
  a.w.agAuto(); ok(!/Vorschlag nach Alter verwenden/.test(a.text())); a.w.agSave(); eq(a.$('rhyOf(S.p)'), '2:1'); eq(a.$('gapOf(S.p)'), true); eq(a.$('S.p.rhythm'), undefined); a.noErrors();
});

test('Geburtstag während des Plans ändert den Rhythmus nicht ungefragt', async () => {
  const a = await boot(); makePlan(a, agPlan({birthDate:'1976-12-01'})); eq(a.$('ageRef(S.p)'), 49); eq(a.$('rhyOf(S.p)'), '3:1');
  a.setNow(at(2027, 1, 10)); eq(a.$('ageOf(S.p)'), 50); eq(a.$('rhyOf(S.p)'), '3:1', 'Rhythmus vom Planstart bleibt');
  a.page('set-age'); ok(/Du bist inzwischen 50 oder älter/.test(a.text()), 'Hinweis auf den ruhigeren Rhythmus'); a.noErrors();
});

test('Einstellungen Alter und Erholung auf Englisch ohne Lücken, Neuigkeit führt zur Seite', async () => {
  const a = await boot(); makePlan(a, agPlan({})); a.w.__iMiss = new Map(); await a.en(); a.page('set-age'); a.w.setBirth('1966-08-01');
  let t = a.text(); ok(/Date of birth/.test(t) && /After saving, your plan changes from next week/.test(t), 'englisch vor dem Speichern');
  a.w.agSave(); t = a.text(); ok(/Saved\. From next week: a recovery week every third week/.test(t) && /Next recovery week: week 3/.test(t) && /suggestion for this week/i.test(t), 'englisch nach dem Speichern: ' + t.slice(0, 600));
  a.page('settings'); ok(/Age and recovery/.test(a.text()));
  eq([...a.w.__iMiss.keys()].filter(k => /Alter|Geburt|Rhythmus|Abstand|Entlastung|Speichern|Vorschlag|Woche|Jahre/.test(k)), []);
  a.$('wnShow = {from:176}'); const k = a.$("wnItems(176, APP_VERSION, null, 99).items.findIndex(x => x.go === 'set:set-age')"); ok(k >= 0); a.w.wnJump(k); eq(a.$('pg'), 'set-age'); a.noErrors();
});
