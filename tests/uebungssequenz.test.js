/* Übungssequenz auf Zeit (v220): Seite je Zeitpunkt, Spiegelung, Ablauf ohne Antippen, „Fertig“ früher weiter,
   Aussprache, Hinweis-Zeitplan, Pausen, Englisch, Altdaten. Erwartungen aus der Fachregel vom 21.11.2026. */
R.file = 'uebungssequenz';
const UQ_KINDS = ['tech', 'base', 'build', 'erh', 'leicht'];
/* Übungen ohne Spiegelung auf Seite 2 (Schrift im Video bzw. beidbeiniges Video) und wechselseitige Übungen ohne Seitenwechsel */
const UQ_NOMIR = ['openbook', 'pallof', 'calf'], UQ_ALT = ['deadbug', 'birddog', 'lungetw', 'wgs'];
const uqStrSe = (a, kind, home) => a.$(`(() => { const T0 = strMap; try { strMap = {0:strSession({strPlace:'${home ? 'home' : 'gym'}'}, '${kind}')}; return sqSession('str', 0); } finally { strMap = T0; } })()`);
/* Alle Einheiten, die als Sequenz laufen: Kraft (Studio, Zuhause), Mobilitätsroutinen, Reise-Routinen */
function uqAll(a){
  const o = [];
  for (const kind of UQ_KINDS) for (const home of [false, true]) o.push({tag:`str-${kind}-${home ? 'home' : 'gym'}`, se:uqStrSe(a, kind, home)});
  const M = a.$('MOB_RT'); Object.keys(M).forEach(k => M[k].v.forEach((_, i) => o.push({tag:`mob-${k}-${i}`, se:a.$(`(() => { rtSel = mobRt('${k}', ${i}); return sqSession('rt', -1); })()`)})));
  a.$('rzRtAll()').forEach(r => { const [k, m] = r.rt.slice(3).split('-'); o.push({tag:r.rt, se:a.$(`(() => { rtSel = rzRt('${k}', ${m}); return sqSession('rt', -1); })()`)}); });
  a.$('rtSel = null'); return o;
}
/* Seitenwörter in einer Ansage: l/r in Reihenfolge („10 seconds left“ ist keine Seite) */
const uqSides = (t, en) => (String(t || '').replace(/seconds left/g, '').match(en ? /\b(left|right)\b/gi : /\b(link|recht)(s|e|es|en)?\b/gi) || []).map(x => /^l/i.test(x) ? 'l' : 'r');
const uqCfg = a => ({...a.$('sqCfg()'), voice:true, hints:true});
/* Uhr vorstellen und dabei die Sequenz wie im Gerät takten */
const uqClock = a => { let t = a.$('Date.now()'); return ms => { for (let k = 0; k < ms / 250; k++) { t += 250; a.setNow(t); a.w.sqTick(); if (!a.$('sq') || a.$('sq.view') !== 'run') break; } }; };
const uqPh = a => a.$('sqSideAt(sq.steps[sq.k], sqEl()).ph');
const uqDom = a => { const d = a.f.contentDocument, s = d.getElementById('sqSide'), f = d.getElementById('sqFig'), b = d.getElementById('sqDoneB');
  return {side:s ? s.textContent : '', mir:!!(f && f.classList.contains('sqmir')), btn:b ? b.textContent : ''}; };
const uqLog = a => a.$('(window.__sqLog || []).splice(0).map(x => x.k + (x.say ? ": " + x.say : ""))');

test('Seite je Zeitpunkt: Seite 1, Übergang, Seite 2 – Ansage nennt die richtige Seite, nie zweimal dieselbe', async () => {
  const a = await boot(); await a.w.i18nLoad(); makePlan(a, SCEN[2].d); const cfg = uqCfg(a), bad = []; let nTwo = 0, nBand = 0;
  for (const {tag, se} of uqAll(a)) a.w.sqSteps(se, cfg).forEach((s, k) => { if (s.t !== 'ex') return; const at = el => a.w.sqSideAt(s, el).ph, sch = a.w.sqSched(s, false, cfg), id = `${tag} #${k} ${s.id}`;
    if (s.prep && (at(0) !== 'prep' || at(s.prep - 1) !== 'prep')) bad.push(id + ': Vorbereitung');
    if (!s.two) {
      if ([s.prep, s.dur - 1].some(el => at(el) !== 'one')) bad.push(id + ': ohne Seitenwechsel muss die Übung durchlaufen');
      if (sch.some(x => x.k === 'ding') || sch.some(x => x.say && (uqSides(x.say[0]).length || uqSides(x.say[1], true).length))) bad.push(id + ': Seitenansage ohne Seitenwechsel');
      if (s.d.side && UQ_ALT.includes(s.id) && a.w.sqSideTxt(s, 'one') !== 'Im Wechsel') bad.push(id + ': „Im Wechsel“ fehlt');
      return; }
    nTwo++; const t1 = s.prep + s.per, t2 = t1 + s.sw, first = s.id === 'pallof' ? 'r' : 'l', second = first === 'l' ? 'r' : 'l';
    if (s.id === 'pallof') nBand++;
    if (![5000, 8000, 10000].includes(s.sw)) bad.push(`${id}: Übergang ${s.sw} ms`);
    if (s.dur !== t2 + s.per) bad.push(id + ': beide Seiten gleich lang');
    if (at(s.prep) !== 'a' || at(t1 - 1) !== 'a' || at(t1) !== 'sw' || at(t2 - 1) !== 'sw' || at(t2) !== 'b' || at(s.dur - 1) !== 'b') bad.push(id + ': Abschnittsgrenzen');
    /* Bildschirm (Deutsch) */
    if (uqSides(a.w.sqSideTxt(s, 'a')).join() !== first || uqSides(a.w.sqSideTxt(s, 'b')).join() !== second) bad.push(`${id}: Text „${a.w.sqSideTxt(s, 'a')}“ / „${a.w.sqSideTxt(s, 'b')}“`);
    if (a.w.sqSideTxt(s, 'sw') !== 'Seitenwechsel') bad.push(id + ': Text im Übergang');
    /* Ansagen in beiden Sprachen: genau zwei Seitennennungen, erst Seite 1 vor dem Wechsel, dann Seite 2 im Übergang */
    [0, 1].forEach(j => { const m = []; sch.filter(x => x.say).forEach(x => uqSides(x.say[j], j === 1).forEach(sd => m.push([x.at, sd])));
      const ok2 = m.length === 2 && m[0][1] === first && m[0][0] < t1 && m[1][1] === second && m[1][0] >= t1 && m[1][0] < t2;
      if (!ok2) bad.push(`${id} ${j ? 'en' : 'de'}: Seitennennungen ${JSON.stringify(m)}`); });
  });
  ok(nTwo > 20 && nBand > 0, `genug Übungen mit Seitenwechsel geprüft (${nTwo}, Pallof ${nBand})`);
  /* Englischer Bildschirmtext */
  a.$("S.lang = 'en'"); const bss = a.w.sqSteps(uqStrSe(a, 'tech', true), cfg).find(s => s.t === 'ex' && s.id === 'bss');
  eq(['a', 'sw', 'b', 'prep'].map(p => a.w.sqSideTxt(bss, p)), ['Left leg', 'Switch sides', 'Right leg', 'Get into position']);
  eq(bad.slice(0, 8), []); a.noErrors();
});

test('Spiegelung: Seite 2 gespiegelt, nie Seite 1, nicht bei Schrift im Video und wechselseitigen Übungen', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const cfg = uqCfg(a), bad = [], seen = new Set(), mird = new Set();
  for (const {tag, se} of uqAll(a)) a.w.sqSteps(se, cfg).forEach(s => { if (s.t !== 'ex') return; seen.add(s.id + (s.two ? ':2' : ':1'));
    ['prep', 'a', 'one'].forEach(p => { if (a.$('sqMir')(s, p)) bad.push(`${tag} ${s.id}: gespiegelt in ${p}`); });
    const want = !!s.two && !UQ_NOMIR.includes(s.id); if (a.$('sqMir')(s, 'b') !== want) bad.push(`${tag} ${s.id}: Seite 2 ${want ? 'nicht ' : ''}gespiegelt`);
    if (want) mird.add(s.id);
    if (UQ_ALT.includes(s.id) && s.two) bad.push(`${tag} ${s.id}: wechselseitig, darf keinen Seitenwechsel haben`); });
  /* Abdeckung: jede Ausnahme kam vor (Seitenübung bzw. wechselseitig) */
  ['openbook:2', 'pallof:2', 'calf:2', 'deadbug:1', 'birddog:1', 'lungetw:1', 'wgs:1'].forEach(x => ok(seen.has(x), 'geprüft: ' + x));
  ok(mird.has('bss') && mird.has('sidep'), 'gespiegelt u. a. Split Squat und Seitstütz');
  eq(bad.slice(0, 8), []);
});

test('Sequenz läuft ohne Antippen bis „Geschafft“, Dauer wie angezeigt', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const i = +a.$('Object.keys(strMap)[0]');
  a.w.sqOpen('str', i); const total = a.$('sqTotal(sq.se, sqCfg()).s'); a.w.sqStart(); const t0 = a.$('Date.now()'), go = uqClock(a);
  go(total * 1000 + 5000); eq(a.$('sq.view'), 'end', 'Ende erreicht'); eq(a.$('sq.part'), false, 'vollständig');
  eq(a.$('sq.nEx'), a.$('sq.nTot'), 'alle Übungen erledigt'); near(a.$('sq.act') / 1000, total, 1, 'Dauer wie im Startbild');
  ok(a.$(`S.strDone[strKey(${i})]`) === true, 'als erledigt gespeichert');
  const L = uqLog(a); eq(L.filter(x => x === 'done').length, 1, 'Schlussmelodie einmal'); await a.tick(1700);
  eq(uqLog(a).filter(x => x === 'say: Geschafft').length, 1, '„Geschafft“ einmal'); ok(t0 > 0);
  a.noErrors();
});

test('„Fertig“ springt früher weiter: Vorbereitung → Seite 1 → Übergang → Seite 2 → Satzpause; Bild und Text folgen', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); a.$(`strMap = {0:strSession({strPlace:'home'}, 'tech')}`);
  a.w.sqOpen('str', 0); a.w.sqStart(); const go = uqClock(a), pre = a.$('sq.steps[0].dur'), s = a.$('sq.steps[1]');
  eq([s.id, s.two, s.reps, s.prep, s.sw], ['bss', true, true, 5000, 10000], 'Split Squat pro Bein mit Vorbereitung und 10 s Übergang');
  go(pre + 1000); uqLog(a); eq(uqPh(a), 'prep'); eq(uqDom(a), {side:'Position einnehmen', mir:false, btn:'Jetzt starten'});
  a.w.sqRepDone(); eq(uqPh(a), 'a', 'Fertig in der Vorbereitung → Seite 1'); eq(uqLog(a), ['go']); eq(uqDom(a), {side:'Linkes Bein', mir:false, btn:'Fertig – Seite wechseln'});
  go(2000); uqLog(a); a.w.sqRepDone(); go(1000); eq(uqPh(a), 'sw', 'Fertig auf Seite 1 → Übergang');
  eq(uqLog(a), ['ding', 'say: Seitenwechsel, jetzt rechtes Bein'], 'Ding und Ansage genau einmal'); eq(uqDom(a).side, 'Seitenwechsel'); eq(uqDom(a).btn, 'Jetzt starten');
  a.w.sqRepDone(); eq(uqPh(a), 'b', 'Fertig im Übergang → Seite 2'); go(500);
  const L = uqLog(a); eq(L.filter(x => x === 'go').length, 1, 'Startton'); ok(!L.includes('tick') && !L.includes('ding'), 'keine nachgeholten Töne: ' + L.join(' | '));
  eq(uqDom(a), {side:'Rechtes Bein', mir:true, btn:'Fertig – weiter'});
  /* Pause: „Fertig“ ist dann ohne Wirkung */
  a.w.sqPause(); a.w.sqRepDone(); eq(uqPh(a), 'b', 'pausiert: kein Sprung'); a.w.sqResume(); uqLog(a);
  /* Zurück: dieselbe Übung beginnt wieder mit der Vorbereitung, Bild nicht gespiegelt */
  go(4000); a.w.sqBack(); eq([a.$('sq.k'), uqPh(a)], [1, 'prep'], 'Zurück auf Anfang der Übung'); go(500); eq(uqDom(a).mir, false, 'nach Zurück nicht gespiegelt');
  a.w.sqRepDone(); a.w.sqRepDone(); a.w.sqRepDone(); eq(uqPh(a), 'b'); uqLog(a); a.w.sqRepDone();
  eq(a.$('[sq.k, sq.steps[sq.k].t, sq.steps[sq.k].set]'), [2, 'tr', true], 'Fertig auf Seite 2 → Satzpause'); eq(uqLog(a)[0], 'pause');
  ok(a.$('sq.doneEx[1]') === 1, 'Satz zählt als erledigt'); a.noErrors();
});

test('Aussprache: Systemstimme bekommt eingedeutschte Namen, Sprachdatei-Schlüssel mit Lautschrift', async () => {
  const a = await boot(); await a.w.i18nLoad(); makePlan(a, SCEN[2].d); const P = a.w.vcPron;
  eq(P('Bulgarian Split Squat, Rucksack mit Last', true), 'Ballgährien Splitt Squott, Rucksack mit Last', 'längster Name zuerst');
  eq(P('Split Squat am Stuhl', true), 'Splitt Squott am Stuhl');
  eq(P('Unterarmstütz (Plank)', true), 'Unterarmstütz (Plänk)'); eq(P('Planke und Plankton', true), 'Planke und Plankton', 'keine Wortteile');
  eq(P('Los. Dead Bug, Satz 1 von 2.', false), 'Los. [[ dˈɛd bˈʌɡ ]], Satz 1 von 2.', 'natürliche Stimme: Lautschrift');
  const V = a.$('VC_VOICE'), H = a.w.vcHash, K = a.$('vcKey');
  eq(K('Dead Bug', false), H(`${V.de}|de|[[ dˈɛd bˈʌɡ ]]`), 'Schlüssel Deutsch über den Text mit Lautschrift'); ok(K('Dead Bug', false) !== H(`${V.de}|de|Dead Bug`));
  eq(K('Dead Bug', true), H(`${V.en}|en|Dead Bug`), 'Englisch unverändert'); eq(K('Kniebeuge', false), H(`${V.de}|de|Kniebeuge`), 'deutsche Sätze ohne englische Namen unverändert');
  /* Systemstimme (keine Sprachdatei): eingedeutscht auf Deutsch, Original auf Englisch */
  a.$(`S.sqCfg = {...sqCfg(), vs:'sys'}; window.__spoken = []; speechSynthesis.speak = u => __spoken.push(u.text);`);
  a.w.sqSpeak(['Los. Bulgarian Split Squat, linkes Bein.', 'Go. Bulgarian split squat, left leg.']);
  a.$("S.lang = 'en'"); a.w.sqSpeak(['Los. Dead Bug.', 'Go. Dead bug.']);
  eq(a.$('__spoken'), ['Los. Ballgährien Splitt Squott, linkes Bein.', 'Go. Dead bug.']);
  /* Katalog für die Sprachdateien: englische Namen in deutschen Sätzen stehen nur noch in Lautschrift */
  a.$("S.lang = 'de'"); const cat = a.w.sqCatalog().de, keys = Object.keys(a.$('VC_PRON'));
  ok(cat.some(t => t.includes('[[ ')), 'Lautschrift im Katalog');
  eq(cat.filter(t => keys.some(k => new RegExp(`(^|[^\\wÄÖÜäöüß])${k}([^\\wÄÖÜäöüß]|$)`).test(t))).slice(0, 5), [], 'kein englischer Name ohne Lautschrift');
  a.noErrors();
});

test('Hinweis-Zeitplan: höchstens 3 je Übung und 2 je Seite, nicht im Übergang, nicht in den letzten 10 s, kein Doppel', async () => {
  const a = await boot(); await a.w.i18nLoad(); makePlan(a, SCEN[2].d); const cfg = uqCfg(a), bad = []; let n = 0;
  for (const {tag, se} of uqAll(a)) { const last = {};
    a.w.sqSteps(se, cfg).forEach((s, k) => { if (s.t !== 'ex') return; const T = s.tips || [], id = `${tag} #${k} ${s.id}`, L = a.w.sqTips(s.id).map(x => x[0]); n += T.length;
      const t1 = s.prep + s.per, t2 = t1 + s.sw, len = x => a.$('sqTalk')(x.say), start = 800 + a.$('sqTalk')(a.w.sqExSay(s, true).say);
      if (T.length > 3) bad.push(`${id}: ${T.length} Hinweise`);
      if (s.two) { const na = T.filter(x => x.at < t1).length, nb = T.filter(x => x.at >= t2).length; if (na > 2 || nb > 2) bad.push(`${id}: Seite 1 ${na}, Seite 2 ${nb}`);
        if (s.per < 20000 && T.length) bad.push(`${id}: Seiten unter 20 s nur mit Startansage`); }
      else if (s.dur - s.prep < 20000 && T.length) bad.push(`${id}: unter 20 s nur Startansage`);
      T.forEach((x, j) => { const e = x.at + len(x);
        if (x.at < start || x.at < s.prep) bad.push(`${id}: Hinweis vor Ende der Startansage bzw. in der Vorbereitung`);
        if (e > s.dur - 10000) bad.push(`${id}: Hinweis in den letzten 10 s (${x.at}–${e} von ${s.dur})`);
        if (s.two && x.at < t2 && e > t1) bad.push(`${id}: Hinweis im Übergang (${x.at}–${e}, Wechsel ${t1}–${t2})`);
        if (j && T[j - 1].at + len(T[j - 1]) > x.at) bad.push(`${id}: Hinweise überlappen`);
        if (!L.includes(x.say[0]) || !x.say[1] || x.say[1] === x.say[0]) bad.push(`${id}: Hinweis „${x.say[0]}“ unbekannt oder ohne Englisch`);
        /* reihum über die Sätze; nur ein Hinweis vorhanden (z. B. Wandsitzen): darf je Satz einmal kommen */
        if (L.length > 1 && last[s.id] === x.say[0]) bad.push(`${id}: „${x.say[0]}“ zweimal hintereinander`); last[s.id] = x.say[0]; });
      /* im Übergang nur die Seitenansage */
      if (s.two) { const inSw = a.w.sqSched(s, false, cfg).filter(x => x.say && x.at >= t1 && x.at < t2); if (inSw.length !== 1) bad.push(`${id}: ${inSw.length} Ansagen im Übergang`); }
      const sch = a.w.sqSched(s, false, cfg).filter(x => x.say); sch.forEach((x, j) => { if (j && sch[j - 1].say[0] === x.say[0]) bad.push(`${id}: gleiche Ansage direkt hintereinander`); }); }); }
  ok(n > 50, `Hinweise geplant (${n})`);
  /* ohne Ausführungshinweise bzw. ohne Stimme: keine Zusatzhinweise */
  const se = uqStrSe(a, 'tech', true); [{...cfg, hints:false}, {...cfg, voice:false}].forEach(c => ok(a.w.sqSteps(se, c).every(s => !(s.tips && s.tips.length)), 'keine Hinweise bei ' + JSON.stringify({voice:c.voice, hints:c.hints})));
  eq(bad.slice(0, 8), []);
});

test('Pausen: Satzpause auch vor der nächsten Kraftübung, Rumpf 60 s zwischen den Sätzen und 30 s davor, Vorbereitung bei Satz 1', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const bad = [];
  for (const tr of [5, 10, 20]) { const cfg = {...uqCfg(a), tr};
    for (const kind of UQ_KINDS) for (const home of [false, true]) { const se = uqStrSe(a, kind, home), st = a.w.sqSteps(se, cfg), R0 = se.setRest * 1000, tag = `${kind}/${home ? 'Zuhause' : 'Studio'}/${tr}s`;
      ok(se.setRest >= 90, tag + ': Satzpause');
      st.forEach((s, k) => { if (s.t === 'ex') { const want = !s.core && s.set === 1 ? 5000 : 0; if (want ? s.prep < 5000 : s.prep) bad.push(`${tag} #${k} ${s.id}: Vorbereitung ${s.prep}`); return; }
        if (s.t !== 'tr') return; const e = st[k - 1], nx = st[k + 1], same = e.id === nx.id;
        /* einbeinig: die Arbeit des anderen Beins zählt als Pause, auf volle 5 s gerundet, mindestens aber 60 s */
        const want = same ? (e.core ? 60000 : e.two ? Math.max(60000, Math.round((R0 - e.per - e.sw) / 5000) * 5000) : R0) : !nx.core ? R0 : !e.core ? 30000 : tr * 1000;
        if (s.dur !== want) bad.push(`${tag} #${k} ${e.id}→${nx.id}: ${s.dur} statt ${want}`);
        if (same !== !!s.set) bad.push(`${tag} #${k}: Satzpause falsch gekennzeichnet`); }); } }
  /* Mobilität und Reise: eingestellte Übergangszeit, keine Vorbereitung */
  for (const {tag, se} of uqAll(a).filter(x => !/^str/.test(x.tag))) a.w.sqSteps(se, {...uqCfg(a), tr:15}).forEach(s => {
    if (s.t === 'ex' && s.prep) bad.push(tag + ': Vorbereitung außerhalb der Krafteinheit'); if (s.t === 'tr' && s.dur !== 15000) bad.push(`${tag}: Übergang ${s.dur}`); });
  /* Startbild nennt die Regel */
  a.$(`strMap = {0:strSession({strPlace:'gym'}, 'tech')}`); a.w.sqOpen('str', 0);
  ok(/Satzpause 1:30 Min\., auch vor der nächsten Kraftübung\. Rumpf: 60 Sek\. zwischen den Sätzen, 30 Sek\. davor\./.test(a.text()), 'Hinweis im Startbild');
  eq(bad.slice(0, 8), []); a.noErrors();
});

test('Englisch: Ablauf, Startbild, Einstellungen, Hinweis und Neuigkeiten ohne fehlende Übersetzungen', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); await a.en(); a.w.__iMiss = new Map(); const T = [];
  a.$(`strMap = {0:strSession({strPlace:'home'}, 'tech')}`); a.w.sqOpen('str', 0); T.push(a.text());
  a.w.sqStart(); const go = uqClock(a), pre = a.$('sq.steps[0].dur'); go(pre + 1000); T.push(a.text());
  a.w.sqRepDone(); go(500); T.push(a.text()); const A = uqDom(a); a.w.sqRepDone(); go(1000); const W = uqDom(a); a.w.sqRepDone(); go(500); const B = uqDom(a); T.push(a.text());
  eq([A.side, A.btn, W.side, W.btn, B.side, B.btn], ['Left leg', 'Done – switch sides', 'Switch sides', 'Start now', 'Right leg', 'Done – next']);
  a.w.sqRepDone(); go(500); T.push(a.text()); a.w.sqClose();
  a.page('settings'); a.w.__iMiss = new Map(); a.w.goPg('set-sq'); T.push(a.text()); /* Übersicht der Einstellungen hat eine bekannte Lücke (Pendeln), siehe i18n-Vergleichsstand */
  eq([...a.w.__iMiss.keys()].slice(0, 8), [], 'fehlende Übersetzungen');
  const txt = T.join('\n'); ok(/rest between sets, also before the next strength exercise/.test(txt), 'Satzpausen-Regel auf Englisch');
  eq((txt.match(/\b(Linkes|Rechtes|Seitenwechsel|Jetzt starten|Fertig|Position einnehmen|Satzpause|Wiederholungen)\b/g) || []), [], 'keine deutschen Reste');
  /* gesprochene englische Sätze: keine deutschen Wörter */
  const cfg = uqCfg(a), de = new Set();
  for (const {tag, se} of uqAll(a)) a.w.sqSays(se, cfg).forEach(p => { if (/\b(links|rechts|Seite|Satz|Wiederholungen|Bein|Jetzt|Los|Noch)\b|[äöüß]/.test(p[1])) de.add(tag + ': ' + p[1]); });
  eq([...de].slice(0, 6), [], 'englische Ansagen');
  const D = a.$("DYK.find(x => x[0] === 'sqt')"), has = t => a.$(`I18N[iNorm(${JSON.stringify(t)}).k] != null || trS(${JSON.stringify(t)}) !== ${JSON.stringify(t)}`);
  ok(D && has(D[1]) && has(D[2]), 'Hinweis „Wusstest du schon?“ auf Englisch'); ok(a.$("(WN_DATA['220'] || []).every(x => x.de && x.en && x.en !== x.de) && (WN_DATA['220'] || []).length > 0"), 'Neuigkeiten 220 auf Englisch');
  a.noErrors();
});

test('Hinweis „Wusstest du schon?“ landet am Schalter für Ausführungshinweise', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const D = a.$("DYK.find(x => x[0] === 'sqt')"); ok(D, 'Hinweis vorhanden');
  a.page(null); a.$(`dykGo(${JSON.stringify(D[3])})`); await a.tick(200); const f = a.f.contentDocument.activeElement;
  eq(f && f.id, 'sqT-hints', 'Schalter hat den Fokus'); a.noErrors();
});

test('Altdaten und ohne Leistungsmesser: alte Ablauf-Einstellungen, gleicher Ablauf', async () => {
  const a = await boot(); makePlan(a, {...SCEN[2].d}); const ref = JSON.stringify(a.w.sqSteps(uqStrSe(a, 'tech', true), a.$('sqCfg()')).map(s => [s.t, s.id, s.dur]));
  /* Sicherung von vor v220: Ablauf-Einstellungen ohne „hints“, „vs“, „voiceSet“, unbekannte Werte */
  a.$(`S.sqCfg = {tr:15, snd:true, voice:true, vol:'x'}; save();`); const b = await boot({store:a.store()});
  const c = b.$('sqCfg()'); eq([c.tr, c.vol, c.vs, typeof c.hints], [15, 'm', 'nat', 'boolean'], 'Einstellungen ergänzt');
  const i = +b.$('Object.keys(strMap)[0]'); b.w.sqOpen('str', i); b.w.sqStart(); uqClock(b)(30000); eq(b.$('sq.view'), 'run', 'Ablauf läuft'); b.noErrors();
  /* ohne Wattmesser: dieselbe Übungsfolge */
  const n = await boot(); makePlan(n, {...SCEN[2].d, noPwr:true, ftpSrc:'nopwr'});
  eq(JSON.stringify(n.w.sqSteps(uqStrSe(n, 'tech', true), n.$('sqCfg()')).map(s => [s.t, s.id, s.dur])), ref, 'gleicher Ablauf ohne Wattmesser'); n.noErrors();
});

test('Angezeigte Minuten = Dauer der Sequenz (Kraft plus 10 Min. Aufwärmen), auf 5 Min. gerundet, folgt der Übergangszeit', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); const bad = [], r5 = (s, w) => Math.max(5, Math.round((s / 60 + w) / 5) * 5);
  for (const tr of [5, 20]) { a.$(`S.sqCfg = {...sqCfg(), tr:${tr}}`);
    for (const kind of UQ_KINDS) for (const home of [false, true]) { const m = a.$(`strSession({strPlace:'${home ? 'home' : 'gym'}'}, '${kind}').m`), s = a.$('sqTotal')(uqStrSe(a, kind, home), a.$('sqCfg()')).s;
      if (m !== r5(s, 10)) bad.push(`${kind}/${home ? 'Zuhause' : 'Studio'}/${tr}s: ${m} Min. statt ${r5(s, 10)}`); }
    for (const k of Object.keys(a.$('MOB_RT'))) for (const i of [0, 1, 2]) { const m = a.$(`mobRt('${k}', ${i}).m`), s = a.$(`(() => { rtSel = mobRt('${k}', ${i}); return sqTotal(sqSession('rt', -1), sqCfg()).s; })()`);
      if (m !== r5(s, 0)) bad.push(`${k} ${i}/${tr}s: ${m} Min. statt ${r5(s, 0)}`); } }
  a.$('rtSel = null'); eq(bad.slice(0, 8), []); a.noErrors();
});
