/* B10: Kraft-Sequenz mit Tönen und Ansagen (Wiederholungen, Satzpausen, Seitenwechsel, Zeitübungen) */
R.file = 'sequence';
const KINDS = ['tech', 'base', 'build', 'erh', 'leicht'];
/* Kraft-Einheit wie in sqCatalog erzeugen (Phase, Studio oder Zuhause) */
const strSe = (a, kind, home) => a.$(`(() => { const T0 = strMap; try { strMap = {0:strSession({strPlace:'${home ? 'home' : 'gym'}'}, '${kind}')}; return sqSession('str', 0); } finally { strMap = T0; } })()`);
const says = sch => sch.filter(x => x.k === 'say').map(x => x.say[0]);

test('Jede Kraft-Einheit: vollständiger Ton- und Ansageplan', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const cfg = a.$('sqCfg()'), bad = [];
  for (const kind of KINDS) for (const home of [false, true]) {
    const se = strSe(a, kind, home), st = a.w.sqSteps(se, cfg), tag = `${kind}/${home ? 'Zuhause' : 'Studio'}`;
    ok(se && se.items.length >= 3, tag + ': Übungen');
    st.forEach((s, k) => {
      if (s.t === 'end') return; const sch = a.w.sqSched(s, false, cfg), S0 = says(sch), ticks = sch.filter(x => x.k === 'tick').length;
      if (s.t === 'ex' && !s.dur) {
        const t = S0[0] || ''; if (!/^Los\. /.test(t) || !/Wiederholungen/.test(t)) bad.push(`${tag} #${k}: Start „${t}“`);
        if (s.sets > 1 && !t.includes(`Satz ${s.set} von ${s.sets}`)) bad.push(`${tag} #${k}: Satz fehlt in „${t}“`);
        if (s.d.side && !/linke(s Bein| Seite)/.test(t)) bad.push(`${tag} #${k}: Seite fehlt in „${t}“`);
      }
      if (s.t === 'ex' && s.dur) { if (ticks !== 3) bad.push(`${tag} #${k}: Zeitübung ohne 3-2-1`); if (s.d.side && !sch.some(x => x.k === 'ding')) bad.push(`${tag} #${k}: Zeitübung ohne Seitenwechsel`); }
      if (s.t === 'tr' || s.t === 'pre' || s.t === 'rr') {
        if (ticks !== 3 || !sch.some(x => x.k === 'go' && x.at === s.dur)) bad.push(`${tag} #${k} ${s.t}: 3-2-1 und Los fehlen`);
        if (s.t === 'tr' && s.set) { const t = S0[0] || '', d = Math.round(s.dur / 1000);
          if (!/^Satzpause, .*\. Als Nächstes: Satz \d von \d\.$/.test(t)) bad.push(`${tag} #${k}: Satzpause „${t}“`);
          if (d === 90 && !t.startsWith('Satzpause, 1 Minute 30.')) bad.push(`${tag} #${k}: Dauer „${t}“`);
          if (d >= 25 && !S0.includes('Noch 10 Sekunden')) bad.push(`${tag} #${k}: „Noch 10 Sekunden“ fehlt`); }
      }
    });
  }
  eq(bad.slice(0, 8), []);
});

test('Satzpause und Startansage: Beispiel aus der Meldung', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const cfg = a.$('sqCfg()'), se = strSe(a, 'tech', false), st = a.w.sqSteps(se, cfg);
  const bss = st.find(s => s.t === 'ex' && s.id === 'bss' && s.set === 1); ok(bss, 'Bulgarian Split Squat im Plan');
  await snap('sequence', 'bss-start', a.w.sqRepSay(bss)); const rest = st[st.indexOf(bss) + 1]; eq(rest.t, 'tr');
  eq(a.w.sqSetRestSay(rest)[0], `Satzpause, ${a.w.sqDurSay(rest.dur / 1000)[0]}. Als Nächstes: Satz 2 von ${bss.sets}.`);
  eq(a.w.sqDurSay(90), ['1 Minute 30', '1 minute 30']); eq(a.w.sqDurSay(120), ['2 Minuten', '2 minutes']); eq(a.w.sqDurSay(45), ['45 Sekunden', '45 seconds']);
});

test('Ablauf: Start, Fertig (Seitenwechsel), Fertig, Satzpause, nächster Satz', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const i = +a.$('Object.keys(strMap)[0]');
  a.w.sqOpen('str', i); a.w.sqStart(); let t = at(2026, 11, 11); const go = ms => { for (let k = 0; k < ms / 250; k++) { t += 250; a.setNow(t); a.w.sqTick(); } };
  const log = () => a.$('window.__sqLog.splice(0).map(x => x.k + (x.say ? ": " + x.say : ""))');
  go(20000); const L1 = log(); ok(L1.filter(x => x === 'tick').length === 3 && L1.includes('go'), 'Vorlauf mit 3-2-1 und Los: ' + L1.join(' | '));
  ok(L1.some(x => /^say: Los\. Kniebeuge oder Beinpresse, Satz 1 von 3, 8 bis 10 Wiederholungen\.$/.test(x)), 'Startansage: ' + L1.join(' | '));
  a.w.sqRepDone(); go(1000); const L2 = log(); ok(L2[0] === 'pause', 'Bestätigungston nach „Fertig“');
  ok(L2.some(x => /^say: Satzpause, 1 Minute 30\. Als Nächstes: Satz 2 von 3\.$/.test(x)), 'Satzpause angesagt: ' + L2.join(' | '));
  go(91500); const L3 = log(); ok(L3.includes('say: Noch 10 Sekunden') && L3.filter(x => x === 'tick').length === 3 && L3.includes('go'), 'Ende der Satzpause: ' + L3.join(' | '));
  ok(L3.some(x => /Satz 2 von 3/.test(x) && /^say: Los\./.test(x)), 'Satz 2 startet mit Ansage');
  a.noErrors();
});

test('Übung pro Seite: Seitenwechsel nach dem ersten „Fertig“', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const i = +a.$('Object.keys(strMap)[0]');
  a.w.sqOpen('str', i); a.w.sqStart(); const k = a.$("sq.steps.findIndex(s => s.t === 'ex' && s.d.side && !s.dur)"); ok(k > 0, 'Übung pro Seite vorhanden');
  a.$(`sqEnter(${k}, Date.now(), true); window.__sqLog = [];`); a.w.sqRepDone(); await a.tick(800);
  const L = a.$('window.__sqLog.map(x => x.k + (x.say ? ": " + x.say[0] : ""))'); eq(L[0], 'ding'); ok(L.includes('say: S'), 'Ansage gestartet: ' + L.join(' | '));
  eq(a.$('sq.rep'), 1, 'zweite Seite läuft'); a.noErrors();
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
