/* F39 (18b): Persönlicher Coach ohne Server, feste Bausteine (claude/coach-bausteine.md) */
R.file = 'coach';
const coThu = at(2026, 11, 12);
const coDat = d => ({goal:'event', eventName:'Radmarathon', eventDate:'2027-04-25', dist:150, hm:2000, fmt:'mara', ftp:230, weight:75, hours:7, commuter:false, commute:[false, false, false, false, false, false, false], ...d});
async function coApp(c, d){
  const a = await boot({now:coThu}); makePlan(a, coDat(d || {}));
  a.$(`S.coach = ${JSON.stringify({on:true, name:'Alex', ton:'kumpel', ...(c || {})})}; S.plan[3] = {...D('sst', 'Sweet Spot 3×12', 75, 88, 93, '90 U/min', 'x', 'y'), iv:{wu:15, reps:3, work:12, rest:5, lo:88, hi:93, cd:10}}; save()`);
  return a;
}
/* Paket der App, mit Änderungen (mod: Funktionstext pk => {…}), Regel und Bericht */
const coRun = (a, mod) => JSON.parse(a.$(`(() => { const pk = coPack(); (${mod || '() => {}'})(pk); const r = coRule(pk); return JSON.stringify({pk:{...pk, _i:undefined}, r, rep:coReport(pk, r)}); })()`));
const coTxt = rep => [rep.insight, rep.einheit, rep.spruch].join(' ');
/* Pakete mit auffälligen Werten (TZ-1): Fitness 57, vor 28 Tagen 43, Frische −13, morgen −4, am Event +17 */
const coF = (fr, mo, ev) => `pk.form = {fitness:57, fitnessVor28Tagen:43, fitnessVor56Tagen:39, ermuedung:70, frische:${fr}, frischeMorgen:${mo}, formAmEvent:${ev}}; pk.plan.formAmEvent = ${ev};`;
const CO_SC = {
  normal:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; }`,
  r5:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; pk.befinden = 'tired'; pk._i.xAd = true; }`,
  ohneEv:`pk => { pk.datentage = 160; ${coF(3, 6, 17)} pk.plan.eventInTagen = null; pk.plan.eventArt = null; }`,
  r9:`pk => { pk.datentage = 160; ${coF(-7, -4, 17)} pk.plan.eventInTagen = 38; pk.befinden = 'tired'; pk.wetter = {tempC:4, tmax:5, gefuehlt:2, regenProzent:70, nass:true, wind:'mäßig', boeen:30, gewitter:false, wxVon:17, wxBis:19, src:'api'}; }`,
  r3:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; pk.wetter = {tempC:12, tmax:13, gefuehlt:11, regenProzent:40, nass:false, wind:'stark', boeen:72, gewitter:false, wxVon:17, wxBis:19, src:'api'}; pk._i.wxOk = true; }`,
  r8:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; pk.wetter = {tempC:31, tmax:31, gefuehlt:30, regenProzent:5, nass:false, wind:'schwach', boeen:20, gewitter:false, wxVon:17, wxBis:19, src:'api'}; pk._i.wxOk = true; }`,
  r4a:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; pk.morgen = {n:1, k:['hr']}; }`,
  r4b:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; pk.morgen = {n:2, k:['hr', 'sleep']}; }`,
  r6:`pk => { pk.datentage = 160; ${coF(-33, -29, 17)} pk.plan.eventInTagen = 38; }`,
  r7:`pk => { pk.datentage = 160; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 38; pk._i.yd = {...pk._i.yd, hard:'extra'}; }`,
  neu3:`pk => { pk.datentage = 3; pk.form = null; pk.plan.eventInTagen = 87; }`,
  neu20:`pk => { pk.datentage = 20; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 60; pk.zeit = {stdDieseWoche:3.5, stdLetzteWoche:6}; }`,
  neu40:`pk => { pk.datentage = 40; ${coF(5, 8, 17)} pk.plan.eventInTagen = 60; pk.zeit = {stdDieseWoche:3.5, stdLetzteWoche:6}; }`,
  ruhetag:`pk => { pk.datentage = 164; ${coF(-13, -4, 17)} pk.plan.eventInTagen = 34; pk.einheit = null; pk.tagesart = 'ruhetag'; pk.naechste = {titel:'Grundlage Z2', dauerMin:90}; }`
};
const coAllowed = pk => { const s = new Set(['24', '00']); const add = v => { if (v != null && v !== '') String(v).split(/[^\d,.]+/).filter(Boolean).forEach(x => { s.add(x); s.add(x.replace('.', ',')); s.add(x.replace(',', '.')); }); };
  [pk.plan.eventInTagen, pk.plan.woche, pk.plan.wochenGesamt, pk.datentage, pk.einheit && pk.einheit.dauerMin, pk.naechste && pk.naechste.dauerMin, pk.erfuellung && pk.erfuellung.letzte7Tage].forEach(add);
  if (pk.einheit && pk.einheit.iv) { add(pk.einheit.iv.reps); add(pk.einheit.iv.work); add(pk.einheit.iv.rest); add(pk.einheit.iv.sets); add(Math.max(30, Math.min(60, pk.einheit.dauerMin))); }
  if (pk.einheit) { add(pk.einheit.titel); add(Math.max(30, Math.min(60, pk.einheit.dauerMin))); } if (pk.naechste) add(pk.naechste.titel);
  if (pk.wetter) ['tempC', 'tmax', 'regenProzent', 'boeen', 'wxVon', 'wxBis'].forEach(k => add(pk.wetter[k]));
  if (pk.zeit) { add(pk.zeit.stdDieseWoche); add(pk.zeit.stdLetzteWoche); } return s; };
const coNums = t => (t.match(/[−+-]?\d+(?:[.,]\d+)?/g) || []);

test('Coach aus: keine Karte, auch bei älterem Zustand ohne S.coach', async () => {
  const a = await boot({now:coThu}); makePlan(a, coDat({}));
  eq(a.$('S.coach'), undefined, 'standardmäßig kein Coach-Zustand'); ok(!/Dein Coach/.test(a.page(null)), 'keine Karte');
  a.$("S.coach = {on:false, name:'Alex'}; save()"); ok(!/Dein Coach/.test(a.page(null)), 'ausgeschaltet: keine Karte');
  a.w.coSet('on', true); ok(/Dein Coach/.test(a.page(null)), 'eingeschaltet: Karte'); eq(a.$('S.coach.ton'), 'kumpel', 'Standardton');
  a.noErrors();
});

test('Alte Sicherung ohne S.coach lädt, Coach bleibt aus; mit Coach bleibt er erhalten', async () => {
  const a = await boot({now:coThu}); makePlan(a, coDat({})); a.$('delete S.coach; save()');
  const b = await boot({now:coThu, store:a.store()}); b.page(null); eq(b.$('coOn()'), false); ok(!/Dein Coach/.test(b.text())); b.noErrors();
  const raw = JSON.parse(a.store()[a.$('K')]); ok(raw && raw.p && raw.coach === undefined, 'Zustand ohne coach');
  const o = a.w.bkParse(JSON.stringify({app:'relentless', v:4, state:raw, plans:[]})); ok(o && o.state && !o.state.coach, 'Sicherung v4 ohne coach ist gültig');
  const c = await coApp({name:'Kim'}); const d = await boot({now:coThu, store:c.store()}); eq(d.$('S.coach.name'), 'Kim', 'Coach-Einstellungen überstehen den Neustart'); ok(/Dein Coach/.test(d.page(null))); d.noErrors();
});

test('Einstellungen: Schalter, Vorname, Ton; Hinweis springt zum Schalter', async () => {
  const a = await boot({now:coThu}); makePlan(a, coDat({}));
  let t = a.page('settings'); ok(/Persönlicher Coach/.test(t) && /Aus/.test(t), 'Zeile in den Einstellungen');
  t = a.page('set-coach'); ok(/Coach auf Heute zeigen/.test(t) && /Kumpel mit trockenem Humor/.test(t) && /Klare Ansage/.test(t) && /Sachlicher Trainer/.test(t));
  ok(a.w.document.getElementById('coOn'), 'Schalter mit Anker #coOn');
  a.w.coSet('name', ' Al<ex> 1 '); eq(a.$('S.coach.name'), 'Alex', 'Vorname gesäubert'); a.w.coSet('ton', 'sachlich'); eq(a.$('S.coach.ton'), 'sachlich'); a.w.coSet('ton', 'quatsch'); eq(a.$('S.coach.ton'), 'sachlich');
  eq(a.$('DYK_AT.coach'), ['set-coach', 'fx-coach', '#coOn']); ok(a.$("DYK.some(x => x[0] === 'coach' && /dykSet\\('settings','coach'\\)/.test(x[3]))"), 'DYK mit Anker');
  a.w.dykSet('settings', 'coach'); eq(a.$('pg'), 'set-coach'); a.noErrors();
});

test('Wortzahl 60–80, ruhiger Modus 30–60, alle Töne, Deutsch und Englisch', async () => {
  const a = await coApp(); const bad = [];
  for (const lg of ['de', 'en']) { a.$(`S.lang = '${lg}'`); if (lg === 'en') await a.w.i18nLoad();
    for (const ton of ['kumpel', 'antreiber', 'sachlich']) { a.$(`S.coach.ton = '${ton}'`);
      for (const [k, mod] of Object.entries(CO_SC)) { const {rep} = coRun(a, mod); if (rep.words < 60 || rep.words > 80) bad.push(`${lg}/${ton}/${k}: ${rep.words} Wörter: ${coTxt(rep)}`); } } }
  ok(!bad.length, bad.slice(0, 4).join('\n'));
  a.$("S.lang = 'de'; S.coach.ton = 'kumpel'"); a.$("feelDay(3, 'sick')"); const k = coRun(a); eq(k.r.id, 'R0k'); ok(k.rep.words >= 30 && k.rep.words <= 60, 'krank: ' + k.rep.words); a.noErrors();
});

test('Keine Form- und Fitnesszahlen, keine Fachwörter, Zahlen nur aus dem Paket (TZ-1 bis TZ-3)', async () => {
  const a = await coApp(); const bad = [];
  for (const lg of ['de', 'en']) { a.$(`S.lang = '${lg}'`); if (lg === 'en') await a.w.i18nLoad();
    for (const ton of ['kumpel', 'antreiber', 'sachlich']) { a.$(`S.coach.ton = '${ton}'`);
      for (const [k, mod] of Object.entries(CO_SC)) { const {pk, rep} = coRun(a, mod), t = coTxt(rep), al = coAllowed(pk);
        ['57', '43', '13', '−13', '-13', '+17', 'minus', '−4'].forEach(z => { if (new RegExp('(^|[^\\d])' + z.replace('+', '\\+') + '(?![\\d])').test(t)) bad.push(`${lg}/${ton}/${k}: „${z}“`); });
        coNums(t).forEach(z => { if (!al.has(z.replace(/^[−+-]/, ''))) bad.push(`${lg}/${ton}/${k}: Zahl ${z} nicht im Paket: ${t}`); });
        if ((t.match(/%/g) || []).length !== (t.match(/\d+ % (Regen|chance|rain)/g) || []).length) bad.push(`${lg}/${ton}/${k}: % ohne Regenrisiko: ${t}`);
        if (/\b(TSB|CTL|ATL|TSS|Punkte|points|Formwert|Fitnesswert|FTP)\b/.test(t)) bad.push(`${lg}/${ton}/${k}: Fachwort`); } } }
  ok(!bad.length, bad.slice(0, 5).join('\n')); a.noErrors();
});

test('Verbotene Wörter (§5) in allen Bausteinen, Fehlalarm-Liste', async () => {
  const a = await coApp(), hit = a.w.coBanHits, bad = [];
  eq(hit('Deine Grundfitness hält, alternativ kannst du dich nach Ruhe sehnen. Der Plan wird älter nicht.', 'de'), [], 'hält, alternativ, sehnen: kein Fehlalarm');
  eq(hit('Hold the line, the moment is fine, fatigue stays manageable.', 'en'), [], 'hold, moment, fatigue: kein Fehlalarm');
  eq(hit('Grundlagenkilometer, Körner sparen, Kette rechts, Rakete, Maschine, Granate, Kaffeemühle, Windschatten', 'de'), [], 'Szenewörter: kein Fehlalarm');
  eq(hit('base miles, save your matches, big ring, rocket, machine, legend, sit on a wheel', 'en'), [], 'Szene (EN): kein Fehlalarm');
  ok(hit('Für dein Alter gut', 'de').length && hit('Das Gewicht sinkt', 'de').length && hit('better than others', 'en').length, 'Treffer werden erkannt');
  for (const lg of ['de', 'en']) { a.$(`S.lang = '${lg}'`); if (lg === 'en') await a.w.i18nLoad();
    for (const ton of ['kumpel', 'antreiber', 'sachlich']) { a.$(`S.coach.ton = '${ton}'`);
      for (const [k, mod] of Object.entries(CO_SC)) { const {r, rep} = coRun(a, mod), press = /^R(3|4|6|7|8|9|10)/.test(r.id);
        const h1 = hit(rep.insight + ' ' + rep.einheit, lg, {press}), h2 = hit(rep.spruch, lg, {spruch:true, press});
        if (h1.length || h2.length) bad.push(`${lg}/${ton}/${k}: ${[...h1, ...h2].join(', ')}`); } } }
  /* alle Sprüche und alle Varianten der Form- und Trend-Tabellen */
  const T = a.$('CO_TXT'), walk = (v, sp) => { if (Array.isArray(v) && v.length >= 2 && typeof v[0] === 'string' && typeof v[1] === 'string') { [['de', v[0].replace(/\{[Aa]nr\}/g, 'Granate')], ['en', v[1].replace(/\{[Aa]nr\}/g, 'legend')]].forEach(([l, x]) => { const h = hit(x, l, sp ? {spruch:true} : {}); if (h.length) bad.push(x + ': ' + h); }); return; } if (v && typeof v === 'object') Object.values(v).forEach(y => walk(y, sp)); };
  walk(T.sp, true); ['fs', 'ft', 'fs2', 'fs5', 'fs5s', 'fog', 'mo', 'evf', 'zeit', 'rtIn', 'rt0', 'neu', 'luecke', 'ev', 'ziel', 'e0', 'e0n', 'r3', 'r3ev', 'r4a', 'r4aK', 'r4aT', 'r4b', 'r4c', 'r6', 'r7', 'r7p', 'r8', 'r8T', 'r9', 'r10a', 'r10b', 'rt', 'rtKraft', 'frage', 'teaser', 'r9d'].forEach(k => walk(T[k], false));
  /* fester R0-Text: Gesundheitswörter erlaubt (§5), sonst dieselbe Liste */
  [['de', T.erkNeu[0]], ['en', T.erkNeu[1]]].forEach(([l, x]) => { const h = hit(x, l, {health:true}); if (h.length) bad.push(x + ': ' + h); });
  ok(!bad.length, bad.slice(0, 5).join('\n')); a.noErrors();
});

test('Ruhiger Modus: kein Spruch, keine Leistungszahlen, für alle Töne gleich', async () => {
  for (const [nm, act] of [['krank', "feelDay(3, 'sick')"], ['erkältet', "feelDay(3, 'neck')"], ['verletzt', "feelDay(3, 'inj')"]]) {
    const a = await coApp(); a.$(act); const L = [];
    for (const ton of ['kumpel', 'antreiber', 'sachlich']) { a.$(`S.coach.ton = '${ton}'`); const {r, rep} = coRun(a, CO_SC.normal); ok(r.calm, nm + ': ruhig'); eq(rep.spruch, '', nm + ': kein Spruch'); L.push(rep.insight + rep.einheit);
      ok(!/\d/.test(coTxt(rep).replace(/24 Stunden/g, '')), nm + ': keine Zahlen: ' + coTxt(rep)); ok(!/trotzdem|dranbleiben|aufholen|verlieren|Rückstand/.test(coTxt(rep)), nm + ': kein Druck'); }
    ok(L[0] === L[1] && L[1] === L[2], nm + ': alle Töne gleich');
    ok(!/Neu formulieren/.test(a.page(null)), nm + ': kein „Neu formulieren“'); a.noErrors();
  }
  const b = await coApp(); const {r, rep} = coRun(b, `pk => { pk.datentage = 160; pk._i.gap = {g:9, L:'2026-11-02'}; }`); eq(r.id, 'R1'); ok(/seit 9 Tagen/.test(rep.insight) && !rep.spruch, 'Pause: Tage erlaubt, kein Spruch');
  const c = coRun(b, `pk => { pk.datentage = 160; pk._i.ovl = ['a', 'b']; }`); eq(c.r.id, 'R2'); eq(c.rep.spruch, ''); ok(/Erholungswoche/.test(c.rep.einheit)); b.noErrors();
});

test('Neulingsstufen und Entscheidung C (Tag 27/28/41/42, 83/84, 125/126)', async () => {
  const a = await coApp(), at0 = (dt, fr, extra) => coRun(a, `pk => { pk.datentage = ${dt}; ${coF(fr, fr, 17)} pk.plan.eventInTagen = 60; pk.zeit = {stdDieseWoche:3, stdLetzteWoche:5}; ${extra || ''} }`).rep.insight;
  ok(/nach den ersten Wochen besser sagen\. Hör bis dahin/.test(at0(27, 0)), 'Tag 27: fester Satz ohne Stufe');
  ok(/erste Einschätzung/.test(at0(28, 0)) && /erste Einschätzung/.test(at0(41, 0)) && !/erste Einschätzung/.test(at0(42, 0)), 'Anhang FS-2 nur Tag 28–41');
  ok(/Die letzten Tage waren fordernd/.test(at0(83, -15)) && !/Die letzten Tage waren fordernd/.test(at0(84, -15)), 'müde erst ab Tag 84 (FS-5 davor)');
  ok(!/Grundfitness/.test(at0(125, 0)) && /Stunden/.test(at0(125, 0)), 'Tag 125: Stunden statt Trend'); ok(/Grundfitness/.test(at0(126, 0)), 'Tag 126: Trend');
  ok(/vier Wochen Fahrten/.test(at0(3, 0)), 'Tag 0–6: Neuling-Satz');
  ok(/zu wenige Einträge/.test(at0(160, 0, 'pk._i.lucke = true;')) && !/Grundfitness/.test(at0(160, 0, 'pk._i.lucke = true;')), 'Datenlücke: kein Form- und Fitness-Satz');
  eq(coRun(a, `pk => { pk.datentage = 83; ${coF(-33, -30, 5)} }`).r.id === 'R6', false, 'R6 nicht vor Tag 84');
  eq(coRun(a, `pk => { pk.datentage = 84; ${coF(-33, -30, 5)} }`).r.id, 'R6', 'R6 ab Tag 84');
  ok(!/deutlich/.test(coRun(a, `pk => { pk.datentage = 160; ${coF(0, 0, 5)} pk._i.noData = true; }`).rep.insight), 'ohne Watt und Puls nie „deutlich“');
  a.noErrors();
});

test('Stufengrenzen nach der App (TZ-4) und Variantenwechsel (TZ-6)', async () => {
  const a = await coApp(), fs = a.$('coFS'), ft = a.$('coFT');
  eq([fs(25.01), fs(25), fs(10), fs(10.01), fs(-10), fs(-9.99), fs(-25), fs(-24.99), fs(-25.01)], [5, 4, 3, 4, 2, 3, 1, 2, 1]);
  eq([ft(6), ft(5.9), ft(3), ft(2.9), ft(-2.9), ft(-3)], ['pp', 'p', 'p', '0', '0', 'm']);
  const r1 = coRun(a, CO_SC.normal).rep; a.$('coCommit(coPack(), coRule(coPack()), ' + JSON.stringify(r1) + ')');
  a.setNow(at(2026, 11, 13)); a.$('S.plan[4] = {...S.plan[3]}; save()'); const r2 = coRun(a, CO_SC.normal).rep;
  ok(r1.used.ft && r2.used.ft && r1.used.ft.i !== r2.used.ft.i, 'Folgetag: andere Trend-Variante'); ok(r1.used.fs && r2.used.fs && r1.used.fs.i !== r2.used.fs.i, 'Folgetag: andere Form-Variante');
  a.noErrors();
});

test('Vorrang: erste zutreffende Regel gewinnt, R5a zuletzt, Ruhetag und Eventtag eingeschränkt', async () => {
  const a = await coApp(), id = mod => coRun(a, mod).r.id;
  eq(id(`pk => { pk._i.gap = {g:9}; pk._i.ill = {lv:'sick'}; }`), 'R0k');
  eq(id(`pk => { pk.datentage = 160; pk._i.gap = {g:9}; pk._i.ovl = ['a', 'b']; }`), 'R1');
  eq(id(CO_SC.r3.replace('pk._i.wxOk = true;', 'pk._i.wxOk = true; pk.wetter.tmax = 31; pk.morgen = {n:1, k:[\'hr\']};')), 'R3', 'Gewitter/Sturm vor Hitze und Morgenwerten');
  eq(id(CO_SC.r4b), 'R4b'); eq(id(CO_SC.r4a), 'R4a'); eq(id(CO_SC.r8), 'R8'); eq(id(CO_SC.r7), 'R7'); eq(id(CO_SC.r9), 'R9');
  eq(id(`pk => { pk.datentage = 160; }`), 'R5a', 'ohne Befinden: Frage');
  eq(id(`pk => { pk.datentage = 160; pk.einheit = null; pk.morgen = {n:2, k:['hr', 'sleep']}; pk.wetter = {boeen:80, src:'api'}; pk._i.wxOk = true; }`), 'RT', 'Ruhetag: nur R0–R2');
  eq(id(`pk => { pk.datentage = 160; pk._i.evDay = true; pk.einheit.eventTag = true; pk.morgen = {n:2, k:['hr', 'sleep']}; }`), 'EV', 'Eventtag: keine Tauschvorschläge');
  const ev = coRun(a, CO_SC.r3.replace('pk._i.wxOk = true;', 'pk._i.wxOk = true; pk._i.evDay = true;')); eq(ev.r.id, 'R3'); eq(ev.r.kn, null, 'R3 am Eventtag ohne Knopf'); ok(/Veranstalter/.test(ev.rep.einheit));
  eq(id(CO_SC.r3.replace('pk._i.wxOk = true;', 'pk._i.wxOk = false;')) === 'R3', false, 'alte Vorhersage: kein R3');
  a.noErrors();
});

test('Ein Vorschlag pro Tag; Knopf → Schnappschuss → Rückgängig stellt den Plan exakt wieder her', async () => {
  const a = await coApp(); a.$("coDataDays = () => 160; S.mo = {}; for (let k = 8; k <= 20; k++) S.mo[iso(-k)] = {hr:50}; S.mo[iso(0)] = {hr:58, sleep:'bad'}; bkUndo = null; save()");
  const pk = coRun(a); eq(pk.r.id, 'R4b', 'zwei Morgenwerte → locker statt hart'); ok(/Heute locker statt hart/.test(a.page(null)) && /Plan so lassen/.test(a.text()), 'Knopf und „Plan so lassen“');
  ok(!/Erholung vielleicht noch nicht komplett/.test(a.text()), 'Karte „Morgenwerte“ ausgeblendet (Entscheidung D)');
  const before = a.$('JSON.stringify(S.plan)'); a.w.coTake('easy'); await a.tick(30);
  ok(a.$('JSON.stringify(S.plan)') !== before, 'Plan geändert'); eq(a.$('S.plan[3].n'), 'Locker statt hart'); ok(a.$('!!bkUndo') && /Vom Coach vorgeschlagen/.test(a.$('bkUndo.why')), 'Schnappschuss mit Herkunft Coach');
  ok(/Rückgängig/.test(a.$('bkUndoBar()')), 'Leiste „Rückgängig“');
  a.w.coTake('mv'); ok(!a.$('mvAsk'), 'zweiter Vorschlag am selben Tag wird nicht ausgeführt'); ok(!/Auf einen anderen Tag legen/.test(a.page(null)), 'kein neuer Planknopf');
  const v = await a.$('bkGet(bkUndo.k)'); a.w.bkWriteRaw(v); const b = await boot({now:coThu, store:a.store()}); eq(b.$('JSON.stringify(S.plan)'), before, 'Plan exakt wiederhergestellt'); a.noErrors(); b.noErrors();
});

test('Coach-Vorschlag „etwas leichter“ zählt nicht als Müdigkeit (B3); veralteter Knopf ändert nichts (V2)', async () => {
  const a = await coApp(); a.$("coDataDays = () => 160; S.mo = {}; for (let k = 8; k <= 20; k++) S.mo[iso(-k)] = {hr:50}; S.mo[iso(0)] = {hr:58}; save()");
  eq(coRun(a).r.id, 'R4a'); a.w.coTake('light'); eq(a.$('S.plan[3].feel'), 'tired'); eq(a.$('S.plan[3].coSrc'), 1, 'Herkunft Coach');
  a.$("[0, 1, 2].forEach(i => { S.plan[i] = {...S.plan[i], feel:'tired'}; })"); ok(!a.$('ovlSignals()').some(t => /müde oder platt/.test(t)), 'drei Befinden-Tage + Coach-Tag: kein Zeichen');
  a.$('delete S.plan[3].coSrc'); ok(a.$('ovlSignals()').some(t => /müde oder platt/.test(t)), 'ohne Herkunft Coach: Zeichen');
  const b = await coApp(); b.$('bkUndo = null'); const p0 = b.$('JSON.stringify(S.plan)'); b.w.coTake('easy'); eq(b.$('JSON.stringify(S.plan)'), p0, 'Regel passt nicht: keine Änderung'); ok(!b.$('bkUndo'), 'kein Schnappschuss'); ok(/nicht mehr aktuell/.test(b.$('coMsg')));
  a.noErrors(); b.noErrors();
});

test('Verschieben aus dem Coach: nie „beide an einem Tag“ (V4)', async () => {
  const a = await coApp(); a.$("S.plan[4] = {...D('base', 'Grundlage Z2', 60, 56, 70, '90 U/min', 'x', 'y')}; mvAskGo(3); mvAsk.co = 1; mvPickDay(3, 4)");
  ok(a.$("mvAsk.step === 'occ'"), 'Zieltag belegt'); const h = a.$('mvModal()'); ok(/Tauschen/.test(h) && !/Beide an diesem Tag/.test(h), 'nur Tauschen'); a.w.mvMode('both'); ok(a.$('mvAsk') && a.$('mvAsk.mode') !== 'both', '„beide“ gesperrt');
  a.$('mvClose(); mvAskGo(3); mvPickDay(3, 4)'); ok(/Beide an diesem Tag/.test(a.$('mvModal()')), 'ohne Coach weiter wählbar'); a.noErrors();
});

test('Schmerzen oder verletzt: Ruhetag, Coach ruhig bis „Heute geht es wieder“, danach erste Fahrt locker', async () => {
  const a = await coApp(); a.page(null); a.$('heroTab = null; feelOpen = 3'); ok(/Schmerzen oder verletzt/.test(a.$('feelBox(3)')), 'Stufe in der Auswahl');
  a.$("feelDay(3, 'inj')"); eq(a.$('S.plan[3].n'), 'Ruhetag (Schmerzen)'); eq(a.$('S.plan[3].m'), 0); eq(a.$('S.coach.inj.last'), a.$('iso(0)'));
  ok(/Wieder schmerzfrei: Originaleinheit zurück/.test(a.$('feelBox(3)'))); let x = coRun(a); eq(x.r.id, 'R0v'); ok(/heute Schmerzen oder eine Verletzung/.test(x.rep.insight) && !x.rep.spruch);
  ok(/Heute geht es wieder/.test(a.page(null)), 'Knopf „Heute geht es wieder“');
  a.setNow(at(2026, 11, 13)); x = coRun(a); eq(x.r.id, 'R0v', 'Folgetag weiter ruhig'); ok(/gestern Schmerzen/.test(x.rep.insight)); ok(/Heute Ruhetag/.test(a.page(null)), 'Folgetag: „Heute Ruhetag“ (Plan nicht automatisch geändert)');
  a.$("S.plan[4] = {...D('sst', 'Sweet Spot 3×12', 75, 88, 93, '90 U/min', 'x', 'y'), iv:{wu:15, reps:3, work:12, rest:5, lo:88, hi:93, cd:10}}; save()");
  a.setNow(coThu); a.w.coTake('ok'); ok(coRun(a).r.id !== 'R0v', '„Heute geht es wieder“ beendet den ruhigen Modus am selben Tag'); a.setNow(at(2026, 11, 13)); x = coRun(a); eq(x.r.id, 'VL4', 'nach „geht wieder“: erste Fahrt locker'); ok(/Erste Fahrt nach Schmerzen/.test(x.rep.einheit)); eq(x.r.kn, 'easy');
  a.setNow(at(2026, 11, 28)); a.$("S.coach.inj = {last:'2026-11-12'}"); ok(coRun(a).r.id !== 'R0v', 'nach 14 Tagen nicht mehr ruhig');
  a.noErrors();
});

test('Wetter: Böen und Gewitter aus der Vorhersage im Trainingsfenster (W-2, W-3)', async () => {
  const a = await coApp(); const d = a.$('iso(0)');
  a.$(`S.wx = {lat:48, lon:11, name:'X'}; S.wxH = 17; const t = [], T = [], P = [], Rr = [], W = [], C = [], G = []; for (let h = 0; h < 24; h++) { t.push('${d}T' + String(h).padStart(2, '0') + ':00'); T.push(12); P.push(10); Rr.push(0); W.push(10); C.push(h === 19 ? 95 : 2); G.push(h === 19 ? 64 : 30); } S.wxData = {at:Date.now(), lat:48, lon:11, t, T, P, R:Rr, W, C, G}; save()`);
  let w = a.$('wxDay(iso(0), 3, S.plan[3])'); eq(w.gust, 64, 'Böe der Stunde nach dem Start zählt'); eq(w.storm, true, 'Gewitter eine Stunde nach dem Fenster');
  a.$('S.wxData.C[19] = 2; S.wxData.G[19] = 30; S.wxData.G[17] = 90'); w = a.$('wxDay(iso(0), 3, S.plan[3])'); eq(w.gust, 30, 'Böe vor dem Start zählt nicht'); eq(w.storm, false);
  a.$('S.wxData.G[18] = 61'); const x = coRun(a, `pk => { pk.datentage = 160; }`); eq(x.r.id, 'R3'); ok(/Böen bis 61 km\/h zwischen 17 und 19 Uhr/.test(x.rep.einheit), x.rep.einheit);
  a.$('S.wxData.at = Date.now() - 4 * 36e5'); ok(coRun(a, `pk => { pk.datentage = 160; }`).r.id !== 'R3', 'Vorhersage älter als 3 Std.: kein R3');
  ok(/weather_code,wind_gusts_10m/.test(a.$('wxFetch.toString()')), 'Abfrage um Code und Böen ergänzt'); a.noErrors();
});

test('Doppelte Karten: Überlastung und Hitze nur im Coach (Entscheidung D)', async () => {
  const a = await coApp(); a.$("S.ovlSeen = null; ovlSignals = () => ['a', 'b']; coDataDays = () => 160");
  let t = a.page(null); ok(/mehrere Zeichen deuten/.test(t) && !/Viel Belastung, wenig Erholung/.test(t), 'nur der Coach zeigt die Erholungswoche');
  a.$('S.coach.on = false'); ok(/Viel Belastung, wenig Erholung/.test(a.page(null)), 'Coach aus: Karte wie bisher'); a.noErrors();
});

test('„Neu formulieren“ einmal pro Tag, Englisch ohne fehlende Übersetzungen der Karte', async () => {
  const a = await coApp(); a.$("coDataDays = () => 160");
  ok(/Neu formulieren/.test(a.page(null))); const r1 = coRun(a, CO_SC.normal).rep; a.w.coAlt(); const r2 = coRun(a, CO_SC.normal).rep;
  ok(coTxt(r1) !== coTxt(r2), 'andere Variante'); ok(!/Neu formulieren/.test(a.page(null)), 'nur einmal pro Tag');
  a.w.__iMiss = new Map(); await a.en(); a.page(null); const t = a.w.document.getElementById('fx-cocard').innerText; ok(/Your coach/.test(t), 'Kopf auf Englisch: ' + t); ok(!/Grundfitness|Woche \d|Minuten|Heute/.test(t), 'Bericht auf Englisch: ' + t);
  const miss = [...a.w.__iMiss.keys()].filter(k => /Coach|Plan so lassen|Heute|formulieren|Wie fühlst/.test(k)); eq(miss, [], 'keine fehlenden Übersetzungen');
  a.page('set-coach'); const m2 = [...a.w.__iMiss.keys()].filter(k => /Coach|Ton|Vorname|Kumpel|Antreiber|Trainer/.test(k)); eq(m2, [], 'Einstellungen übersetzt'); a.noErrors();
});

/* ---------- Korrekturrunde 1 (Fachabnahme, Code- und Design-Prüfung) ---------- */
test('Verletzt erneut nach „Heute geht es wieder“: wieder ruhig; „Wieder schmerzfrei“ setzt „geht wieder“; Zusatzfahrt und Check gesperrt', async () => {
  const a = await coApp(); a.$("feelDay(3, 'inj')"); a.w.coTake('ok'); ok(coRun(a).r.id !== 'R0v', 'nach „geht wieder“ nicht ruhig');
  a.$("undo(3); feelDay(3, 'inj')"); eq(coRun(a).r.id, 'R0v', 'neuer Eintrag: wieder ruhiger Modus'); eq(a.$('S.coach.inj.ok'), undefined, '„geht wieder“ zurückgesetzt');
  a.$('undo(3)'); eq(a.$('S.coach.inj.ok'), a.$('iso(0)'), '„Wieder schmerzfrei“ zählt als „geht wieder“');
  a.$("S.plan[3] = {...S.plan[3], feel:'inj'}"); eq(a.$('rdExtraOk(S.p, S.wk, S.plan, 4)'), false, 'keine Zusatzfahrt nach Schmerzen'); eq(a.$('hkTestOk(S.p)'), false, 'kein Check-Vorschlag');
  a.noErrors();
});

test('R10b: nicht im Tapering, nicht vor langer Einheit, freier Tag nur mit Zeit; R9 und R8 nur mit aktueller Vorhersage', async () => {
  const a = await coApp(), yd = "pk._i.yd = {miss:true, missHard:true, sameWeek:true, m:60, titel:'Sweet Spot 3×12'};";
  a.$("mvCheck = () => ({warns:[]}); S.p.avail[3] = true; S.p.perDay = false");
  eq(coRun(a, `pk => { pk.datentage = 160; pk.einheit = null; ${yd} }`).r.id, 'R10b', 'freier Tag mit Zeit');
  eq(coRun(a, `pk => { pk.datentage = 160; pk.einheit = null; pk._i.taper = true; ${yd} }`).r.id, 'RT', 'Tapering: kein R10b');
  a.$('S.p.avail[3] = false'); eq(coRun(a, `pk => { pk.datentage = 160; pk.einheit = null; ${yd} }`).r.id, 'RT', 'Tag ohne Zeit: kein R10b'); a.$('S.p.avail[3] = true');
  a.$("S.plan[3] = {...D('base', 'Grundlage Z2', 180, 56, 70, '90 U/min', 'x', 'y')}"); ok(coRun(a, `pk => { pk.datentage = 160; pk.befinden = 'tired'; ${yd} }`).r.id !== 'R10b', 'lange Einheit heute: kein R10b');
  ok(coRun(a, `pk => { pk.datentage = 160; pk.wetter = {gefuehlt:1, nass:true, src:'man'}; }`).r.id !== 'R9', 'eigenes Wetter: kein R9');
  ok(coRun(a, CO_SC.r8.replace('pk._i.wxOk = true;', 'pk._i.wxOk = false;')).r.id !== 'R8', 'alte Vorhersage: kein R8');
  ok(/angenehmere Wahl/.test(coRun(a, CO_SC.r9.replace('regenProzent:70', 'regenProzent:10')).rep.einheit), 'R9 ohne Regen: eigener Satz');
  a.noErrors();
});

test('Erkältung von gestern, heute nicht angepasst: Ersatztext und „An Erkältung anpassen“ mit einem Schnappschuss', async () => {
  const a = await coApp(); a.setNow(at(2026, 11, 11)); a.$("feelDay(2, 'neck'); S.plan[3] = {...D('base', 'Grundlage Z2', 90, 56, 70, '90 U/min', 'x', 'y')}"); a.setNow(coThu); a.$('bkUndo = null; window.__n = 0; const _bp = bkPre; bkPre = w => { if (!bkMute) window.__n++; return _bp(w); }');
  const x = coRun(a); eq(x.r.id, 'R0e'); eq(x.r.kn, 'neck'); ok(/locker und kürzer/.test(x.rep.einheit) && !x.rep.spruch); ok(/An Erkältung anpassen/.test(a.page(null)) && /Verstanden/.test(a.text()));
  a.w.coTake('neck'); eq(a.$('S.plan[3].feel'), 'neck'); eq(a.$('window.__n'), 1, 'genau ein Schnappschuss'); ok(/Vom Coach vorgeschlagen: An Erkältung anpassen/.test(a.$('bkUndo.why')));
  ok(/Der Plan ist schon angepasst/.test(coRun(a).rep.einheit), 'danach der normale C-ERK-Text'); a.noErrors();
});

test('Sprüche: Varianten je Lage, keiner zweimal in 7 Tagen, Fitness-Check und Eventtag mit eigener Lage', async () => {
  const a = await coApp(), T = a.$('CO_TXT');
  ['vor', 'wetter', 'rt', 'neu', 'verp', 'erf', 'hart', 'locker', 'check', 'event'].forEach(k => ['k', 'a', 's'].forEach(t => ok(T.sp[k] && T.sp[k][t] && T.sp[k][t].length >= (['wetter', 'verp', 'erf'].includes(k) ? 2 : ['check', 'event'].includes(k) ? 1 : 3), `${k}/${t}`)));
  const seen = []; for (let d = 0; d < 3; d++) { a.setNow(at(2026, 11, 12 + d)); a.$(`S.plan[${3 + d}] = {...D('sst', 'Sweet Spot 3×12', 75, 88, 93, '90 U/min', 'x', 'y'), iv:{wu:15, reps:3, work:12, rest:5, lo:88, hi:93, cd:10}}`);
    const r = coRun(a, `pk => { pk.datentage = 160; pk.befinden = 'tired'; pk._i.xAd = false; pk._i.yd = {}; }`); a.$(`coCommit(coPack(), ${JSON.stringify(r.r)}, ${JSON.stringify(r.rep)})`); seen.push(r.rep.spruch); }
  eq(new Set(seen).size, 3, 'drei harte Tage, drei verschiedene Sprüche: ' + seen.join(' | ')); ok(seen.every(s => T.sp.hart.k.some(v => v[0] === s)), 'nie „locker“ an harten Tagen');
  const ck = coRun(a, `pk => { pk.datentage = 160; pk.einheit.test = true; pk.befinden = 'tired'; pk._i.yd = {}; }`).rep.spruch; ok(T.sp.check.k.some(v => v[0] === ck), 'Fitness-Check: S-CHECK');
  a.noErrors();
});

test('Kein Lückenfüller bei erster Fahrt nach Schmerzen, kein Morgen-Satz vor Tag 84 bei „müde“, Titel in Anführung', async () => {
  const a = await coApp(); const v = coRun(a, `pk => { pk.datentage = 160; pk._i.ill = {...pk._i.ill, injOk:'x'}; }`); eq(v.r.id, 'VL4'); ok(!/Morgen/.test(v.rep.einheit), 'VL-4 ohne „Morgen …“');
  ok(!/frischer|erholst/.test(coRun(a, `pk => { pk.datentage = 60; ${coF(-15, -5, 5)} pk.einheit = null; pk.naechste = {titel:'Grundlage Z2', dauerMin:90}; }`).rep.insight), 'kein Morgen-Satz neben FS-5');
  ok(/Heute „Sweet Spot“: 3 × 12 Minuten/.test(coRun(a, CO_SC.normal).rep.einheit), 'Titel in Anführung'); a.noErrors();
});

test('Prüfung: Verschieben verbraucht den Vorschlag erst beim Ausführen, Karten nur bei fertigem Bericht ausgeblendet, VO2-Rückrechnung nicht parallel', async () => {
  const a = await coApp(); a.$("coRule = pk => ({id:'R8', kn:'mv', calm:false}); S.plan[4] = {...D('base', 'Grundlage Z2', 60, 56, 70, '90 U/min', 'x', 'y')}");
  a.w.coTake('mv'); eq(a.$('mvAsk.co'), 'mv'); a.w.mvClose(); ok(!(a.$('S.coach.act')), 'Abbrechen: Vorschlag nicht verbraucht');
  a.w.coTake('mv'); a.w.mvPickDay(3, 4); a.w.mvMode('swap'); if (a.$('mvAsk')) a.w.mvDo(false); eq(a.$('S.coach.act.k'), 'mv', 'Ausführen: verbraucht'); ok(/Vom Coach vorgeschlagen/.test(a.$('bkUndo.why')));
  const b = await coApp(); b.$("S.ovlSeen = null; ovlSignals = () => ['a', 'b']; coDataDays = () => 160; coReport = () => { throw new Error('x'); }");
  ok(/Viel Belastung, wenig Erholung/.test(b.page(null)), 'Bericht scheitert: Karte bleibt'); b.$('window.__errs.length = 0');
  b.$('vo2rFill = {run:1}; mmFill = null'); await b.w.mmFillGo(); ok(!(b.$('mmFill') && b.$('mmFill.run')), 'Bestwerte warten auf die VO2-Rückrechnung');
  const t0 = Date.now(); await b.w.vo2rNap(5000, {stop:1}); ok(Date.now() - t0 < 1000, 'Abbrechen wirkt sofort'); a.noErrors();
});

test('Design: Rückgängig-Leiste unter der Kopfzeile frei, Titel mit Trennstelle, Häkchenfarbe, Symbol und englisches Datum', async () => {
  const a = await coApp(); a.$("bkPre('Vor dem Verschieben einer Einheit'); render()");
  const h = a.$('bkUndoBar()'); ok(/Vorheriger Stand gesichert\./.test(h) && /margin:0 0 1\.25rem/.test(h));
  const bar = a.w.document.querySelector('[role=status]'), br = a.w.document.querySelector('.brand'); ok(bar && br && bar.getBoundingClientRect().bottom <= br.getBoundingClientRect().top + 1, 'Leiste nicht verdeckt');
  ok(/Persön&shy;licher/.test(a.$("SET_T['set-coach']"))); ok(/accent-color:var\(--teal\)/.test(a.w.document.documentElement.outerHTML));
  ok(a.$("WN_DATA[226].some(x => x.ic === 'coach' && x.go === 'set:set-coach')") && a.$('!!WN_IC.coach'));
  await a.en(); eq(a.$("mmDay('2026-11-09')"), '9 Nov 2026'); ok(!/Persön/.test(a.page('set-coach').split('\n').slice(0, 8).join(' ')), 'Titel übersetzt'); a.noErrors();
});

/* ---------- Runde 2: Radsport-Sprüche mit Anrede (§6.9), Meldung bei laufender Nachberechnung ---------- */
/* Verlauf, in dem alle Sprüche ohne Anrede schon vorkamen: dann ist die erste freie Variante eine mit Anrede (sofern erlaubt) */
const coHistFull = a => a.$(`(() => { const L = []; Object.values(CO_TXT.sp).forEach(t => Object.values(t).forEach(vs => vs.forEach(v => { if (!/\{[Aa]nr\}/.test(v[0]) && !(v[2] && v[2].fix)) { L.push('X | OK | Spruch: ' + v[0].replace(/\{erf7\}/, '6 von 7')); L.push('X | OK | Spruch: ' + v[1].replace(/\{erf7\}/, '6 von 7')); } }))); S.coach.hist = L; S.coach.lv = {}; return L.length; })()`);
const coAnrW = /Rakete|Maschine|Granate|rocket|machine|legend/i;
test('Anrede (AN-1 bis AN-6): nur K/A, nur erlaubte Regeln, nie ruhig, nie in Vorschlag/verpasst, alle Sätze ohne verbotene Wörter', async () => {
  const a = await coApp(), bad = []; let hits = 0;
  for (const lg of ['de', 'en']) { a.$(`S.lang = '${lg}'`); if (lg === 'en') await a.w.i18nLoad();
    for (const ton of ['kumpel', 'antreiber', 'sachlich']) { a.$(`S.coach.ton = '${ton}'`);
      for (const [k, mod] of Object.entries(CO_SC)) { coHistFull(a); const {r, rep} = coRun(a, mod);
        if (coAnrW.test(rep.spruch)) { hits++; if (ton === 'sachlich' || r.calm || !['OK', 'RT', 'TP', 'EV', 'R5a', 'R9', 'R10a'].includes(r.id)) bad.push(`${lg}/${ton}/${k}/${r.id}: ${rep.spruch}`); }
        if (coAnrW.test(rep.insight + rep.einheit)) bad.push(`${lg}/${ton}/${k}: Anrede außerhalb des Spruchs`);
        if (rep.words < 60 || rep.words > 80) bad.push(`${lg}/${ton}/${k}: ${rep.words} Wörter`); } } }
  /* weitere Lagen (AN-6): erkältet, Pause, Überlastung, erste Fahrt nach Schmerzen, gestern verpasst (locker/hart), Check, Tapering, Kälte ohne Müdigkeit */
  a.$("mvCheck = () => ({warns:[]}); S.p.avail[3] = true; S.p.perDay = false");
  const MORE = {erk:`pk => { pk._i.ill = {lv:'neck'}; }`, pause:`pk => { pk.datentage = 160; pk._i.gap = {g:9}; }`, ueber:`pk => { pk.datentage = 160; pk._i.ovl = ['a', 'b']; }`,
    vl4:`pk => { pk.datentage = 160; pk._i.ill = {...pk._i.ill, injOk:'x'}; }`, r10a:`pk => { pk.datentage = 160; pk._i.yd = {miss:true, missHard:false, sameWeek:true}; }`,
    r10b:`pk => { pk.datentage = 160; pk.einheit = null; pk._i.yd = {miss:true, missHard:true, sameWeek:true, m:60, titel:'Sweet Spot 3×12'}; }`, check:`pk => { pk.datentage = 160; pk.einheit.test = true; }`,
    taper:`pk => { pk.datentage = 160; pk._i.taper = true; }`, kalt:CO_SC.r9.replace("pk.befinden = 'tired';", '')};
  const ids = {}, allow = ['OK', 'RT', 'TP', 'EV', 'R5a', 'R9', 'R10a'];
  for (const lg of ['de', 'en']) { a.$(`S.lang = '${lg}'`); for (const ton of ['kumpel', 'antreiber', 'sachlich']) { a.$(`S.coach.ton = '${ton}'`);
    for (const [k, mod] of Object.entries(MORE)) { coHistFull(a); const {r, rep} = coRun(a, mod); ids[k] = r.id; const has = coAnrW.test(rep.spruch);
      if (has && (ton === 'sachlich' || r.calm || !allow.includes(r.id))) bad.push(`${lg}/${ton}/${k}/${r.id}: ${rep.spruch}`);
      if (coAnrW.test(rep.insight + rep.einheit)) bad.push(`${lg}/${ton}/${k}: Anrede außerhalb des Spruchs`);
      if (k === 'kalt' && ton !== 'sachlich' && !has) bad.push(`${lg}/${ton}/kalt: erlaubte Anrede fehlt: ${rep.spruch}`);
      if (k === 'r10a' && has) bad.push(`${lg}/${ton}/r10a: Anrede in S-VERP`); } } }
  eq(ids, {erk:'R0e', pause:'R1', ueber:'R2', vl4:'VL4', r10a:'R10a', r10b:'R10b', check:'R5a', taper:'TP', kalt:'R9'}, 'Lagen erreicht');
  ok(hits > 0, 'Anrede kommt vor'); ok(!bad.length, bad.slice(0, 5).join('\n'));
  /* krank und verletzt: ruhig, nie Anrede */
  for (const f of ['sick', 'inj']) { const b = await coApp(); b.$(`feelDay(3, '${f}')`); coHistFull(b); ok(!coAnrW.test(coTxt(coRun(b).rep)), f + ': keine Anrede'); b.noErrors(); }
  a.noErrors();
});

test('Anrede: nie nach Müdigkeit in den letzten 3 Tagen, nie zwei Tage hintereinander, jedes Wort höchstens einmal in 7 Tagen, Wort entfernbar', async () => {
  const a = await coApp(); const mod = `pk => { pk.datentage = 160; ${coF(3, 6, 17)} pk.plan.eventInTagen = 38; }`;
  coHistFull(a); const r1 = coRun(a, mod).rep; ok(r1.anr && coAnrW.test(r1.spruch), 'ohne Hindernis: Anrede ' + r1.spruch);
  coHistFull(a); a.$("S.plan[1] = {...S.plan[1], feel:'tired'}"); ok(!coRun(a, mod).rep.anr, 'müde vor zwei Tagen: keine Anrede'); a.$('delete S.plan[1].feel');
  coHistFull(a); a.$("S.coach.hist.push('Mi | OK A:Rakete | Spruch: x')"); ok(!coRun(a, mod).rep.anr, 'gestern Anrede: heute keine');
  coHistFull(a); a.$("S.coach.hist.push('Mo | OK A:Rakete | Spruch: x', 'Di | OK A:Maschine | Spruch: y', 'Mi | OK | Spruch: z')"); eq(coRun(a, mod).rep.anr, 'Granate', 'nur das in 7 Tagen unbenutzte Wort');
  coHistFull(a); a.$("S.coach.hist.push('Mo | OK A:Rakete | Spruch: x', 'Di | OK A:Maschine | Spruch: y', 'Di | OK A:Granate | Spruch: y', 'Mi | OK | Spruch: z')"); ok(!coRun(a, mod).rep.anr, 'alle Wörter benutzt: keine Anrede');
  a.$("CO_ANR.de.splice(1, 1); CO_ANR.en.splice(1, 1)"); a.$("S.coach.ton = 'antreiber'");
  for (let d = 0; d < 3; d++) { coHistFull(a); const s = coRun(a, `pk => { pk.datentage = 160; ${coF(3, 6, 17)} pk.einheit = null; }`).rep.spruch; ok(!/Maschine/.test(s), 'entferntes Wort kommt nicht vor: ' + s); }
  a.noErrors();
});

test('Meldung, wenn Import oder Bestwerte-Nachrechnen auf die VO2max-Nachberechnung warten', async () => {
  const a = await coApp(); a.$('vo2rFill = {run:1}'); eq(a.$('vo2rBlock()'), true); ok(/Gerade läuft die VO2max-Nachberechnung/.test(a.$('vo2rWaitNote()')));
  a.$('mmFill = null'); await a.w.mmFillGo(); ok(/VO2max-Nachberechnung/.test(a.$('mmFillUi()')), 'Hinweis bei den Bestwerten');
  a.$("S.lang = 'en'"); ok(/VO2max recalculation is running/.test(a.$('vo2rWaitNote()')), 'englisch');
  a.$('vo2rFill.run = 0'); eq(a.$('vo2rWaitNote()'), '', 'danach weg'); a.noErrors();
});

/* ---------- Runde 3 ---------- */
test('SP-1: Spruch mit und ohne Anrede gilt als derselbe; nach angenommenem Vorschlag keine Befindensfrage; Schnappschuss nur bei Änderung', async () => {
  const a = await coApp(); a.$("S.coach.ton = 'antreiber'"); const T = a.$('CO_TXT');
  const rtA = T.sp.rt.a; a.$(`S.coach.hist = ${JSON.stringify([...rtA.slice(0, 3).map(v => 'Mo | RT | Spruch: ' + v[0]), 'Mi | RT A:Rakete | Spruch: Ruhetag, Rakete. Kein Bolzen, kein „nur mal kurz“ aufs Rad.'])}; S.coach.lv = {}`);
  const s = coRun(a, `pk => { pk.datentage = 160; pk.einheit = null; }`).rep.spruch; ok(!/^Ruhetag\. Kein Bolzen/.test(s), 'derselbe Spruch ohne Anrede zählt als Wiederholung: ' + s); eq(s, rtA.find(v => /Körner von heute/.test(v[0]))[0]);
  const b = await coApp(); b.$("coDataDays = () => 160; S.mo = {}; for (let k = 8; k <= 20; k++) S.mo[iso(-k)] = {hr:50}; S.mo[iso(0)] = {hr:58, sleep:'bad'}; save()");
  b.w.coTake('easy'); const x = coRun(b); ok(x.r.id !== 'R5a' && !/Wie fühlst du dich/.test(x.rep.einheit), 'keine Befindensfrage nach Annahme: ' + x.r.id);
  const c = await coApp(); c.$("bkUndo = null; coRule = pk => ({id:'R4b', kn:'easy', calm:false}); S.plan[3].adapted = true; save()"); c.w.coTake('easy'); await c.tick(30); ok(!c.$('bkUndo'), 'keine Änderung: kein Schnappschuss');
  c.$('delete S.plan[3].adapted; delete S.coach.act'); c.w.coTake('easy'); ok(c.$('!!bkUndo'), 'mit Änderung: Schnappschuss'); a.noErrors(); b.noErrors(); c.noErrors();
});

test('Englisch ohne gerade Anführungszeichen, Titel klein bei schmalen Bildschirmen, Abbrechen bei wartender Nachberechnung', async () => {
  const a = await coApp(), bad = [], walk = v => { if (Array.isArray(v) && typeof v[1] === 'string') { if (/"/.test(v[1])) bad.push(v[1]); return; } if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(a.$('CO_TXT')); eq(bad, [], 'keine geraden Anführungszeichen');
  ok(/co-tt/.test(a.$("SET_T['set-coach']")) && /max-width:340px\)\{ \.co-tt/.test(a.w.document.documentElement.outerHTML.replace(/\s+\{/g, '{')), 'kleiner Titel bei ≤ 340 px');
  a.$('vo2rFill = {run:1}; vo2rBlock()'); ok(/onclick="vo2rFillStop\(\)"/.test(a.$('vo2rWaitNote()')) && /min-height:44px/.test(a.$('vo2rWaitNote()')), 'Abbrechen-Knopf');
  ok(/vo2rWaitAt = 0/.test(a.$('vo2rFillGo.toString()')), 'Hinweis endet mit dem Lauf'); a.noErrors();
});
