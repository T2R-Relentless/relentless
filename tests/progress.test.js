/* Audit 12.11.2026: M3 (Stufen der Intervalle) und M4 (wenig Zeit: Long Ride, Budgetnutzung, zweite harte Einheit) */
R.file = 'progress';
const pgWeeks = a => { const p = a.$('S.p'), ph = a.$('phases')(p), gw = a.$('genWeek'), rw = a.$('recWk'), out = []; for (let w = 1; w <= ph[ph.length - 1].to; w++) { const F = ph.find(x => w >= x.from && w <= x.to) || {}; out.push({w, k:F.key, rec:(rw(p, w) || !!F.rec) && F.key !== 'taper', pl:gw(p, w)}); } return out; };
const pgHard = x => ['sst', 'thr', 'vo2'].includes(x.t);
const pgWork = x => (x.iv.sets || 1) * x.iv.reps * x.iv.work;
const pgSeq = (W, re) => W.filter(x => !x.rec && x.k !== 'taper').flatMap(x => x.pl.filter(y => y.iv && re.test(y.n)).map(y => ({w:x.w, n:y.n, min:pgWork(y)})));
const pgEv = d => ({goal:'event', eventName:'Radmarathon', eventDate:'2027-04-11', dist:140, hm:1900, fmt:'mara', ftp:250, weight:75, hours:8, ...d});

test('M3: Belastungszeit steigt in Stufen (Sweet Spot, Schwelle, VO2max, 30/15)', async () => {
  const a = await boot(); makePlan(a, pgEv({})); const W = pgWeeks(a);
  for (const [lab, re, first, top] of [['Sweet Spot', /^Sweet Spot \d+×\d+/, 36, 50], ['VO2max', /^VO2max \d+×[34]( am Berg)?$/, 15, 20]]) {
    const S = pgSeq(W, re); ok(S.length >= 5, lab + ': genug Einheiten (' + S.length + ')'); eq(S[0].min, first, lab + ' Einstieg: ' + S[0].n);
    for (let i = 1; i < S.length; i++) { ok(S[i].min >= S[i - 1].min, `${lab}: nie weniger als zuvor (W${S[i].w} ${S[i].n} nach ${S[i - 1].n})`); ok(S[i].min <= S[i - 1].min * 1.34 + .01, `${lab}: kein Sprung über ein Drittel (W${S[i].w} ${S[i].n})`); }
    ok(S[S.length - 1].min >= top, `${lab}: am Ende mindestens ${top} Min. (${S[S.length - 1].n})`);
  }
  const names = W.flatMap(x => x.pl.filter(pgHard).map(y => y.n)); ok(names.some(n => /Over-Under/.test(n)) && names.some(n => /Kraftausdauer|Trittwechsel|Bergtempo|am Berg/.test(n)), 'Formen wechseln weiter');
  /* 30/15: Serien und Wiederholungen steigen */
  const b = await boot(); makePlan(b, pgEv({eventName:'Jedermann-Rennen', dist:76, hm:300, fmt:'race', targetTime:'2:00', ftp:305, weight:85})); const V = pgSeq(pgWeeks(b), /30\/15/);
  ok(V.length >= 5 && V[V.length - 1].min > V[0].min, `30/15 von ${V[0].min} auf ${V[V.length - 1].min} Min.`); for (let i = 1; i < V.length; i++) ok(V[i].min >= V[i - 1].min, '30/15 nie weniger als zuvor');
  a.noErrors(); b.noErrors();
});

test('M3: Einstieg nach Niveau, oberste Stufe nicht für Einsteiger', async () => {
  const lo = await boot(); makePlan(lo, pgEv({ftp:165})); const L = pgWeeks(lo), nL = L.flatMap(x => x.pl.filter(pgHard).map(y => y.n));
  eq(pgSeq(L, /^Sweet Spot \d+×\d+/)[0].n.replace(/ \D+$/, ''), 'Sweet Spot 3×10', '2,2 W/kg beginnt bei 3×10'); ok(!nL.some(n => /3×20|4×8|6×4|Schwelle 3×15/.test(n)), 'keine oberste Stufe: ' + [...new Set(nL)].join(', '));
  const hi = await boot(); makePlan(hi, pgEv({ftp:320})); eq(pgSeq(pgWeeks(hi), /^Sweet Spot \d+×\d+/)[0].min, 40, '4,3 W/kg beginnt bei 2×20');
});

test('M3: Intervalleinheit höchstens etwa ein Drittel der Wochenzeit', async () => {
  const a = await boot(); makePlan(a, pgEv({hours:4, avail:[false, true, false, true, false, true, true], longDay:6}));
  pgWeeks(a).forEach(x => x.pl.filter(pgHard).forEach(y => ok(y.m <= 80 + 20, `W${x.w} ${y.n}: ${y.m} Min.`)));
});

test('M4: Long Ride ist die längste lockere Fahrt, auch bei wenig Zeit', async () => {
  for (const d of [{hours:5, avail:[false, true, false, true, false, true, true], longDay:6}, {hours:8}, {hours:4, avail:[false, false, false, false, false, true, true], longDay:6}, {hours:12, avail:[false, true, true, true, true, true, true], longDay:5}]) {
    const a = await boot(); makePlan(a, pgEv(d));
    pgWeeks(a).slice(1).forEach(x => { const L = x.pl.find(y => y.t === 'long'), b = Math.max(0, ...x.pl.filter(y => y.t === 'base').map(y => y.m)); if (L && !/^Eventtag/.test(L.n)) ok(L.m >= b, `${d.hours} Std., W${x.w}: Long Ride ${L.m} ≥ Grundlage ${b}`); });
    a.noErrors();
  }
});

test('M4: nur Wochenende (4 Std.) nutzt das Budget, Long Ride mit Tempo-Finale', async () => {
  const a = await boot(); makePlan(a, {goal:'event', eventName:'Frühjahrsklassiker', eventDate:'2027-02-07', dist:100, hm:800, fmt:'mara', ftp:210, weight:75, hours:4, avail:[false, false, false, false, false, true, true], longDay:6});
  const W = pgWeeks(a).filter(x => x.w > 1 && !x.rec && x.k !== 'taper'), use = W.map(x => x.pl.reduce((s, y) => s + (y.m || 0), 0) / 240);
  ok(use.every(u => u <= 1.001), 'nie über dem Budget'); ok(use.reduce((s, u) => s + u, 0) / use.length >= .85, 'im Mittel mindestens 85 % genutzt: ' + use.map(u => Math.round(u * 100)).join(', '));
  const L = W.map(x => x.pl.find(y => y.t === 'long')); ok(Math.max(...L.map(y => y.m)) >= 135, 'Long Ride bis mindestens 2:15 Std.'); ok(L.some(y => /letzten 20 bis 30 Min\. im Sweet Spot/.test(y.st)), 'Tempo-Finale bei zwei Trainingstagen');
  ok(W.some(x => x.pl.some(y => /Heute mit längerem Ausfahren in Zone 2/.test(y.st || ''))), 'Ausfahren verlängert, wenn Zeit übrig ist');
});

test('M4: bei bis zu 6 Std. ab Woche 5 der Basis eine zweite, kurze harte Einheit', async () => {
  const a = await boot(); makePlan(a, pgEv({eventDate:'2027-07-10', hours:5, ftp:270, avail:[false, true, false, true, false, true, true], longDay:6}));
  const B = pgWeeks(a).filter(x => x.k === 'base' && !x.rec), early = B.filter(x => x.w <= 4), late = B.filter(x => x.w > 4 && !x.pl.some(y => y.t === 'test'));
  ok(early.every(x => x.pl.filter(pgHard).length === 1), 'Woche 1 bis 4: eine harte Einheit'); ok(late.length > 3 && late.every(x => x.pl.filter(pgHard).length === 2), 'ab Woche 5: zwei harte Einheiten');
  ok(late.every(x => x.pl.some(y => y.t === 'vo2' && pgWork(y) <= 16)), 'die zweite ist kurz (VO2max bis 16 Min.)');
  late.forEach(x => { const d = x.pl.map((y, i) => pgHard(y) ? i : -1).filter(i => i >= 0); ok(d[1] - d[0] >= 2, `W${x.w}: nicht an Folgetagen`); });
  const b = await boot(); makePlan(b, pgEv({eventDate:'2027-07-10', hours:5, ftp:165, avail:[false, true, false, true, false, true, true], longDay:6}));
  ok(pgWeeks(b).filter(x => x.k === 'base' && !x.rec).every(x => x.pl.filter(pgHard).length <= 1), 'Einsteiger (2,2 W/kg): weiter eine harte Einheit in der Basis');
  const c = await boot(); makePlan(c, pgEv({eventDate:'2027-07-10', hours:9}));
  ok(pgWeeks(c).filter(x => x.k === 'base' && !x.rec).every(x => x.pl.filter(pgHard).length <= 1), 'ab 6 Std. unverändert');
});

test('M3/M4: Wochen bleiben im Budget, keine harten Tage in Folge', async () => {
  for (const d of [{hours:5, avail:[false, true, false, true, false, true, true], longDay:6}, {hours:7}, {hours:10, ftp:300}]) {
    const a = await boot(); makePlan(a, pgEv(d)); const W = pgWeeks(a), all = W.flatMap(x => x.pl);
    W.slice(0, -1).forEach(x => ok(x.pl.reduce((s, y) => s + (y.m || 0), 0) <= d.hours * 60 + 1, `${d.hours} Std., W${x.w} im Budget`));
    for (let i = 1; i < all.length; i++) ok(!(pgHard(all[i]) && pgHard(all[i - 1])), 'harte Tage nicht hintereinander (Tag ' + i + ')');
    a.noErrors();
  }
});

test('M3/M4: alle Einheiten und Texte auf Englisch ohne Lücken', async () => {
  const miss = new Map();
  for (const d of [{}, {hours:4, avail:[false, false, false, false, false, true, true], longDay:6}, {eventName:'Jedermann-Rennen', dist:76, hm:300, fmt:'race', targetTime:'2:00', ftp:305, weight:85}, {dist:180, hm:4000, ftp:320}, {ftp:165, hours:5}]) {
    const a = await boot(); makePlan(a, pgEv(d)); const W = pgWeeks(a); a.w.__iMiss = new Map(); await a.en(); const tr = a.w.trText;
    W.forEach(x => x.pl.forEach(y => { if (!y.m || /^Eventtag/.test(y.n)) return; tr(y.n); if (pgHard(y) || y.t === 'long') tr(String(y.st || '')); }));
    a.page('ev-prof'); a.w.__iMiss.forEach((v, k) => miss.set(k, v));
  }
  eq([...miss.keys()].filter(k => !/Radmarathon|Jedermann/.test(k)).sort(), []);
});
