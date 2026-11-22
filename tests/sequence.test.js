/* B10: Kraft-Sequenz mit Tönen und Ansagen (Wiederholungen, Satzpausen, Seitenwechsel, Zeitübungen) */
R.file = 'sequence';
const KINDS = ['tech', 'base', 'build', 'erh', 'leicht'];
/* Kraft-Einheit wie in sqCatalog erzeugen (Phase, Studio oder Zuhause) */
const strSe = (a, kind, home) => a.$(`(() => { const T0 = strMap; try { strMap = {0:strSession({strPlace:'${home ? 'home' : 'gym'}'}, '${kind}')}; return sqSession('str', 0); } finally { strMap = T0; } })()`);
const says = sch => sch.filter(x => x.k === 'say').map(x => x.say[0]);

test('Jede Kraft-Einheit: vollständiger Ton- und Ansageplan', async () => {
  /* Soll (Fachregel 21.11.2026): jede Übung läuft auf Zeit. Startansage mit Satz, Wiederholungen und erster Seite
     (bzw. in der Vorbereitung nur Name und Seite, Satz und Wiederholungen kamen schon in der Pause davor),
     Seitenwechsel mit Ding, Ansage und Startton, 3-2-1 am Ende jeder Übung und vor dem Ende jeder Pause. */
  const a = await boot(); makePlan(a, SCEN[2].d); const cfg = a.$('sqCfg()'), bad = [];
  for (const kind of KINDS) for (const home of [false, true]) {
    const se = strSe(a, kind, home), st = a.w.sqSteps(se, cfg), tag = `${kind}/${home ? 'Zuhause' : 'Studio'}`;
    ok(se && se.items.length >= 3, tag + ': Übungen');
    st.forEach((s, k) => {
      if (s.t === 'end') return; const sch = a.w.sqSched(s, false, cfg), S0 = says(sch), ticks = sch.filter(x => x.k === 'tick'), D = s.dur;
      if (s.t === 'ex') {
        if (!(D > 0)) bad.push(`${tag} #${k}: Übung ohne Zeit`);
        if (D !== s.prep + s.per * (s.two ? 2 : 1) + s.sw) bad.push(`${tag} #${k}: Dauer ${D} ≠ Vorbereitung + Seiten + Übergang`);
        const t = S0[0] || '', prev = st[k - 1], P0 = says(a.w.sqSched(prev, false, cfg))[0] || '';
        if (s.reps && s.prep) { if (/^Los\. /.test(t) || !t.startsWith(a.$('sqNm')(s.n))) bad.push(`${tag} #${k}: Vorbereitung „${t}“`);
          if (!/Wiederholungen/.test(P0) || (s.sets > 1 && !P0.includes(`Satz 1 von ${s.sets}`))) bad.push(`${tag} #${k}: Ansage davor ohne Satz/Wdh. „${P0}“`);
          if (!sch.some(x => x.k === 'go' && x.at === s.prep)) bad.push(`${tag} #${k}: Startton nach der Vorbereitung fehlt`); }
        const tk = s.reps && cfg.takt && a.w.sqBeatOf(s.d);
        /* mit Takt: kurzes „Los“ ohne Name und Dosis (kamen in der Pause davor), sonst die volle Startansage */
        if (s.reps && !s.prep && tk) { if (!/^Los\. /.test(t) || (s.set > 1 ? !t.includes(`Satz ${s.set} von ${s.sets}`) || !/Wiederholungen/.test(P0) : !t.startsWith('Los. ' + a.$('sqNm')(s.n)))) bad.push(`${tag} #${k}: Start mit Takt „${t}“`); }
        else if (s.reps && !s.prep) { if (!/^Los\. /.test(t) || !/Wiederholungen/.test(t)) bad.push(`${tag} #${k}: Start „${t}“`);
          if (s.sets > 1 && !t.includes(`Satz ${s.set} von ${s.sets}`)) bad.push(`${tag} #${k}: Satz fehlt in „${t}“`); }
        if (s.two && !/(linke(s Bein| Seite)|Band rechts)/.test(t)) bad.push(`${tag} #${k}: erste Seite fehlt in „${t}“`);
        if (s.d.side && !s.two && !/im Wechsel/.test(t)) bad.push(`${tag} #${k}: „im Wechsel“ fehlt in „${t}“`);
        const end = ticks.filter(x => x.at >= D - 3000).map(x => x.at), takt = s.reps && cfg.takt && a.w.sqBeatOf(s.d);
        /* Takt bei Wiederholungen: statt 3-2-1 zählt die Ansage die letzten drei (Fachregel Takt 2) */
        if (takt ? end.length || !sch.some(x => x.k === 'bl' || x.k === 'bs') : JSON.stringify(end) !== JSON.stringify([D - 3000, D - 2000, D - 1000])) bad.push(`${tag} #${k}: ${takt ? 'Takt statt 3-2-1' : '3-2-1 am Ende fehlt'}`);
        if (!sch.some(x => x.k === 'pause' && x.at === D)) bad.push(`${tag} #${k}: Pausenton am Ende fehlt`);
        if (s.two) { const t1 = s.prep + s.per, t2 = t1 + s.sw;
          if (!sch.some(x => x.k === 'ding' && x.at === t1) || !sch.some(x => x.k === 'go' && x.at === t2)) bad.push(`${tag} #${k}: Seitenwechsel ohne Ding/Startton`);
          if (s.sw >= 8000 && ticks.filter(x => x.at > t1 && x.at < t2).length !== 3) bad.push(`${tag} #${k}: 3-2-1 vor Seite 2 fehlt`); }
        else if (sch.some(x => x.k === 'ding')) bad.push(`${tag} #${k}: Ding ohne Seitenwechsel`);
      }
      if (s.t === 'tr' || s.t === 'pre' || s.t === 'rr') {
        if (ticks.length !== 3 || !sch.some(x => x.k === 'go' && x.at === D)) bad.push(`${tag} #${k} ${s.t}: 3-2-1 und Los fehlen`);
        if (s.t === 'tr' && s.set) { const t = S0[0] || '', d = Math.round(D / 1000);
          if (!/^Satzpause, .*\. Als Nächstes: Satz \d von \d(, [^.]*Wiederholungen[^.]*)?\.$/.test(t)) bad.push(`${tag} #${k}: Satzpause „${t}“`);
          if (d === 90 && !t.startsWith('Satzpause, 1 Minute 30.')) bad.push(`${tag} #${k}: Dauer „${t}“`);
          if (d >= 25 && !S0.includes('Noch 10 Sekunden')) bad.push(`${tag} #${k}: „Noch 10 Sekunden“ fehlt`); }
      }
    });
  }
  eq(bad.slice(0, 8), []);
});

test('Satzpause und Startansage: Beispiel aus der Meldung', async () => {
  /* Satz 1 beginnt mit 5 s Vorbereitung (Ansage nur Name), Satz und Wiederholungen nennt die Ansage davor; ab Satz 2 „Los. …“ */
  const a = await boot(); makePlan(a, SCEN[2].d); const cfg = a.$('sqCfg()'), se = strSe(a, 'tech', false), st = a.w.sqSteps(se, cfg);
  const bss = st.find(s => s.t === 'ex' && s.id === 'bss' && s.set === 1), bss2 = st.find(s => s.t === 'ex' && s.id === 'bss' && s.set === 2); ok(bss && bss2, 'Bulgarian Split Squat im Plan');
  eq(bss.prep, 5000, 'Vorbereitung 5 s'); ok(/^Als Nächstes: Bulgarian Split Squat oder Ausfallschritte, 8 bis 10 Wiederholungen, Satz 1 von 3\./.test(says(a.w.sqSched(st[st.indexOf(bss) - 1], false, cfg))[0]), 'Pause davor nennt Satz und Wiederholungen');
  await snap('sequence', 'bss-start', {vorbereitung:a.w.sqRepSay(bss), satz2:a.w.sqRepSay(bss2)}); const rest = st[st.indexOf(bss) + 1]; eq(rest.t, 'tr');
  eq(a.w.sqSetRestSay(rest)[0], `Satzpause, ${a.w.sqDurSay(rest.dur / 1000)[0]}. Als Nächstes: Satz 2 von ${bss.sets}, ${a.w.sqDoseSay(bss.d)[0]}.`);
  eq(a.w.sqDurSay(90), ['1 Minute 30', '1 minute 30']); eq(a.w.sqDurSay(120), ['2 Minuten', '2 minutes']); eq(a.w.sqDurSay(45), ['45 Sekunden', '45 seconds']);
});

test('Ablauf: Start, Vorbereitung, Fertig, Satzpause, nächster Satz', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const i = +a.$('Object.keys(strMap)[0]');
  a.w.sqOpen('str', i); a.w.sqStart(); let t = at(2026, 11, 11); const go = ms => { for (let k = 0; k < ms / 250; k++) { t += 250; a.setNow(t); a.w.sqTick(); } };
  const log = () => a.$('window.__sqLog.splice(0).map(x => x.k + (x.say ? ": " + x.say : ""))'), pre = a.$('sq.steps[0].dur'), ex = a.$('sq.steps[1]');
  eq([ex.id, ex.set, ex.prep], ['squat', 1, 5000], 'erste Übung mit Vorbereitung');
  go(pre + 500); const L1 = log(); ok(L1.filter(x => x === 'tick').length === 3 && L1.includes('go'), 'Vorlauf mit 3-2-1 und Los: ' + L1.join(' | '));
  ok(L1.some(x => /^say: Erste Übung: Kniebeuge oder Beinpresse, 8 bis 10 Wiederholungen, Satz 1 von 3\./.test(x)), 'Vorlauf nennt Satz und Wiederholungen: ' + L1.join(' | '));
  go(5000); const L1b = log(); ok(L1b.includes('say: Kniebeuge oder Beinpresse.') && L1b.includes('go'), 'Vorbereitung: Name, dann Startton: ' + L1b.join(' | '));
  eq(a.$('sqSideAt(sq.steps[sq.k], sqEl()).ph'), 'one', 'Übung läuft');
  a.w.sqRepDone(); go(1000); const L2 = log(); ok(L2[0] === 'pause', 'Bestätigungston nach „Fertig“');
  ok(L2.some(x => /^say: Satzpause, 1 Minute 30\. Als Nächstes: Satz 2 von 3, 8 bis 10 Wiederholungen\.$/.test(x)), 'Satzpause angesagt: ' + L2.join(' | '));
  go(91500); const L3 = log(); ok(L3.includes('say: Noch 10 Sekunden') && L3.filter(x => x === 'tick').length === 3 && L3.includes('go'), 'Ende der Satzpause: ' + L3.join(' | '));
  /* mit Takt (Standard) kurzes „Los“, Wiederholungen kamen in der Satzpause */
  ok(L3.some(x => /^say: Los\. Satz 2 von 3\.$/.test(x)), 'Satz 2 startet ohne Vorbereitung mit Ansage: ' + L3.join(' | '));
  /* ohne „Fertig“: nach 10 Wdh. × 4 s ist der Satz vorbei, die Satzpause beginnt von selbst */
  eq(a.$('sq.steps[sq.k].dur'), 40000, 'Satz 2: 10 × 4 s'); go(40000); eq(a.$('[sq.steps[sq.k].t, sq.steps[sq.k].set]'), ['tr', true], 'Satzpause von selbst');
  ok(log().includes('pause'), 'Pausenton am Ende des Satzes'); a.noErrors();
});

test('Übung pro Seite: „Fertig“ auf Seite 1 startet den Seitenwechsel', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const i = +a.$('Object.keys(strMap)[0]');
  a.w.sqOpen('str', i); a.w.sqStart(); const k = a.$("sq.steps.findIndex(s => s.t === 'ex' && s.two && s.reps)"); ok(k > 0, 'Übung mit Seitenwechsel vorhanden');
  let t = a.$('Date.now()'); const go = ms => { for (let j = 0; j < ms / 100; j++) { t += 100; a.setNow(t); a.w.sqTick(); } };
  a.$(`sqEnter(${k}, Date.now(), true); render(); window.__sqLog = [];`); go(2000); eq(a.$('sqSideAt(sq.steps[sq.k], sqEl()).ph'), 'a', 'Seite 1'); a.$('window.__sqLog = []');
  a.w.sqRepDone(); go(1000);
  const L = a.$('window.__sqLog.map(x => x.k + (x.say ? ": " + x.say : ""))'), sw = a.$('sqSideLbl(sq.steps[sq.k]).sw[0]');
  eq(L[0], 'ding'); ok(L.includes('say: ' + sw), 'Seitenwechsel angesagt: ' + L.join(' | '));
  eq(a.$('sqSideAt(sq.steps[sq.k], sqEl()).ph'), 'sw', 'Übergang läuft'); eq(a.$('sq.k'), k, 'dieselbe Übung'); a.noErrors();
});

test('iPhone: Ton und Stimme werden beim Antippen von „Start“ freigeschaltet', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const i = +a.$('Object.keys(strMap)[0]');
  a.$('window.__spoken = []; speechSynthesis.speak = u => __spoken.push({t:u.text, v:u.volume});');
  a.w.sqOpen('str', i); a.w.sqStart(); const sp = a.$('__spoken'); ok(sp.length >= 1 && sp[0].v === 0, 'stumme Ansage direkt im Antippen: ' + JSON.stringify(sp));
});

test('Sprachdateien: alle Kraft-Sätze in Deutsch und Englisch vorhanden', async () => {
  const a = await boot(); await a.w.i18nLoad(); makePlan(a, SCEN[2].d);
  const man = await (await fetch('../public/audio/voice/manifest.json', {cache:'no-store'})).json(), cfg = a.$('sqCfg()'), miss = new Set();
  for (const kind of KINDS) for (const home of [false, true]) { const se = strSe(a, kind, home);
    for (const hints of [true, false]) for (const tr of [5, 10, 15, 20]) a.w.sqSays(se, {...cfg, voice:true, hints, tr}).forEach(p => [['de', 0], ['en', 1]].forEach(([l, j]) => a.w.vcSegs(p[j], j === 1).forEach(x => { if (!man.items[l][a.$('vcKey')(x, j === 1)]) miss.add(l + ': ' + x); }))); }
  eq([...miss].slice(0, 10), [], 'Sätze ohne Datei');
});
