/* F23: neue Mobilitätsübungen und Routinen */
R.file = 'mobility';
const NEW = ['hip9090', 'couch', 'pigeon', 'addrock', 'squathold', 'hipcar', 'openbook', 'thread', 'sphinx', 'wgs', 'hamfloss', 'calfwall', 'anklecar', 'doorpec', 'dislocate', 'neck', 'wrist', 'child', 'legswing', 'lungetw', 'seatfig4', 'chintuck'];

test('Mindestens 20 neue Übungen, jede vollständig (Texte, Ansage, Grafik, Animation)', async () => {
  const a = await boot(); ok(NEW.length >= 20); const bad = [];
  NEW.forEach(id => { const e = a.$(`EXI['${id}']`);
    if (!e || !e.t || !e.m || !e.r || !Array.isArray(e.cap) || e.cap.length !== 2 || !(e.s.length >= 3) || !(e.f.length >= 1)) bad.push(id + ': Texte');
    if (!Array.isArray(e.say) || e.say.length !== 4 || e.say.some(x => !x)) bad.push(id + ': Ansage/Merksatz de+en');
    if (!a.$(`Array.isArray(EXP['${id}']) && EXP['${id}'].length === 2`)) bad.push(id + ': zwei Positionen');
    if (!a.$(`exTpl('${id}').ok`)) bad.push(id + ': Animation'); });
  eq(bad, []); a.noErrors();
});

test('Englisch für alle neuen Übungstexte vorhanden', async () => {
  const a = await boot(); await a.w.i18nLoad(); const has = t => a.$(`I18N[iNorm(${JSON.stringify(t)}).k] != null`), miss = [];
  NEW.forEach(id => { const e = a.$(`EXI['${id}']`); [e.t, e.m, e.r, e.v, e.k, ...e.cap, ...e.s, ...e.f].filter(Boolean).forEach(t => { if (!has(t)) miss.push(id + ': ' + t); }); });
  a.$('Object.values(MOB_RT)').forEach(r => { [r.n, r.intro].forEach(t => { if (!has(t)) miss.push(t); }); r.v.forEach(v => v.forEach(([, n, d]) => [n, d].forEach(t => { if (!has(t)) miss.push(t); }))); });
  eq(miss.slice(0, 8), []);
});

test('Routinen: vier Arten mit je drei Varianten, Dauer passend, fachlich (dynamisch vorher, halten danach)', async () => {
  const a = await boot(), RT = a.$('MOB_RT'), cfg = a.$('sqCfg()'), out = {};
  eq(Object.keys(RT).sort(), ['office', 'post', 'pre', 'rest']);
  for (const [k, r] of Object.entries(RT)) { eq(r.v.length, 3, k + ': drei Varianten');
    out[k] = r.v.map((v, i) => { const d = v.map(([, , dose]) => a.w.sqDose(dose)); const sec = d.reduce((q, x) => q + a.w.sqEst(x) * x.sets, 0) + (v.length - 1) * cfg.tr;
      if (k === 'pre') ok(d.every(x => !x.sec), `pre ${i}: nur dynamische Übungen, kein Halten`);
      if (k === 'post' || k === 'rest') d.filter(x => x.sec).forEach(x => ok(x.sec >= 30 && x.sec <= 60, `${k} ${i}: Halten 30–60 s (${x.sec})`));
      const min = Math.round(sec / 60); ok(min >= r.m * .6 && min <= r.m * 1.5, `${k} Variante ${i}: etwa ${min} Min. statt ${r.m}`); return min; }); }
  await snap('mobility', 'dauer-minuten', out);
});

test('Im Plan: Ruhetag-Routine an Ruhetagen, „Nach der Fahrt“ an Fahrtagen, Variante wechselt wöchentlich', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10', mobN:3}); const p = a.$('S.p');
  const slots = w => { const P = a.$('genWeek')(p, w), m = a.$('mobOf')(p, w, P, {}); return Object.entries(m).map(([j, s]) => ({j:+j, n:s.n, rt:s.rt, rv:s.rv, rest:P[j].t === 'rest' || !(P[j].m > 0)})); };
  const w3 = slots(3), w4 = slots(4); ok(w3.length === 3, 'drei Einheiten'); ok(w3.some(x => x.n === 'Stabilität'), 'Stabilität bleibt');
  w3.filter(x => x.rt).forEach(x => eq(x.rt, x.rest ? 'rest' : 'post', `Tag ${x.j}: passende Routine`));
  const sig = L => L.filter(x => x.rt).map(x => x.rt + x.rv).join(); ok(sig(w3) !== sig(w4), `Variante wechselt (${sig(w3)} / ${sig(w4)})`); a.noErrors();
});

test('Routine frei starten: nächste Variante, Sequenz läuft, Eintrag im Logbuch', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10'}); ok(/Routinen zum Mitmachen/.test(a.page('ex')), 'Karte auf der Übungsseite');
  a.w.rtOpen('pre'); eq(a.$('S.mobRot.pre'), 0); eq(a.$('sq.view'), 'start'); eq(a.$('sq.se.n'), 'Routine: Vor der Fahrt'); a.w.sqClose();
  a.w.rtOpen('pre'); eq(a.$('S.mobRot.pre'), 1, 'nächste Variante'); a.w.sqStart(); a.$('sqEnd(false)');
  ok(a.$("Object.values(S.lb).some(l => l.k === 's' && /Vor der Fahrt/.test(l.n))"), 'im Logbuch'); a.noErrors();
});

test('Neue Übungen im Lexikon (Mobilität in zwei Gruppen) und im Detail mit Hinweis', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Testrennen', eventDate:'2027-07-10'}); a.page('ex');
  const groups = a.$('EXGROUPS').map(g => g[1]).flat(); NEW.forEach(id => ok(groups.includes(id), id + ' in einer Gruppe'));
  a.w.openEx('couch'); ok(/Hinweis/.test(a.text()) && /Polster unter das Knie/.test(a.text()), 'Kontraindikation sichtbar'); a.noErrors();
});
