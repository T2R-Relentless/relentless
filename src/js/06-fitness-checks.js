/* ---------- Fitness-Checks (Meilensteine): FTP-Test nach Erholungswochen, Auswertung gegen den erwarteten Korridor ---------- */
const testsOn = p => !!p && p.tests !== false;
/* Testwochen mit Abstand nach einem Nachholtest (Fachregel 22.11.2026): Ein nachgeholter Check (gemacht oder geplant) bzw. ein
   selbst angelegter Check schiebt die folgenden regulären Checks der Reihe nach auf mindestens 5 Wochen Abstand, auf die nächste
   erlaubte Woche, bis eine Lücke von 5 Wochen erreicht ist. Passt ein Check nicht mehr vor die Woche vor dem Taper, entfällt er.
   Unverändert bleiben selbst angelegte Checks (xTests), der Starttest und der Abschlusstest beim FTP-Ziel. Die Anker sind
   gespeicherte Daten, deshalb bleibt eine Verschiebung auch stehen, wenn die ursprüngliche Woche vorbei ist. */
const TEST_GAP = 5;
function testWeeks(p){
  const base = testWeeks0(p); if (!p || !testsOn(p) || !base.length) return base;
  const M = testMakeups(p); if (!M.length) return base;
  const ph = phases(p), tot = ph[ph.length - 1].to, tS = testTaper(ph), w0 = t0W(p), X = p.xTests || [];
  const fixed = w => X.includes(w) || w === w0 || (p.goal === 'ftp' && w === tot), out = [];
  let need = 0;
  base.forEach(w => {
    const m = M.filter(x => x < w).pop();
    if (m != null && (!out.length || m >= out[out.length - 1])) need = Math.max(need, m + TEST_GAP);
    if (fixed(w) || w >= need) { out.push(w); need = 0; return; }
    let q = need; while (q < tS - 1 && testBad(ph, q)) q++;
    if (q < tS - 1 && !out.includes(q)) { out.push(q); need = q + TEST_GAP; }
  });
  return out.sort((a, b) => a - b);
}
const testTaper = ph => { const tp = ph.filter(x => x.key === 'taper').pop(); return tp ? tp.from : ph[ph.length - 1].to + 1; };
const testBad = (ph, w) => ph.some(x => w >= x.from && w <= x.to && (x.key === 'taper' || x.rec || x.keep)) || ph.some(x => x.key === 'taper' && x.from === w + 1);
/* Anker: gemachter Nachholtest (Einheit „Fitness-Check (nachgeholt)“ bzw. erstes Ergebnis ab der Woche des Ausfalls), noch offener
   Nachholtest (p.testDue: frühestens die Woche des Termins, nie vor der laufenden; ausgelassene Testwoche p.owedSince: laufende
   Woche) und selbst angelegte Checks. Ohne testWeeks (keine Rekursion). */
function testMakeups(p){
  const o = new Set(p.xTests || []), cw = S.wk || 1;
  Object.entries(p.exe || {}).forEach(([k, e]) => { if (e && /Fitness-Check \(nachgeholt\)/.test(e.plan || '')) o.add(+k.split('-')[0]); });
  if (p.testDue) { const w = p.testDue.w;
    if (testDoneSince(p, w)) { const d = [...Object.keys(p.res || {}).map(Number), ...Object.entries(p.exe || {}).filter(([, e]) => e && /Fitness-Check|Test/.test(e.plan || '')).map(([k]) => +k.split('-')[0]), ...(p.testDone || [])].filter(x => x >= w); if (d.length) o.add(Math.min(...d)); }
    else o.add(Math.max(testWkOf(p, p.testDue.from), cw)); }
  if (p.owedSince != null && !(p.testDue && !testDoneSince(p, p.testDue.w))) { const last = testWeeks0(p).filter(x => x < cw && x >= p.owedSince).pop(); if (last && !testDoneSince(p, last)) o.add(cw); }
  return [...o].filter(x => x >= 1).sort((a, b) => a - b);
}
function testWeeks0(p){
  if (!p) return []; const w0 = t0W(p);
  if (!testsOn(p)) return w0 ? [w0] : [];
  const ph = phases(p), tot = ph[ph.length - 1].to, tS = testTaper(ph), out = [], bad = w => testBad(ph, w);
  if (tot >= 9) { for (let w = rhyN(p) + 1; w < tS - 1; w += 2 * rhyN(p)) { const v = [w, w + 1, w - 1, w + 2].find(q => q >= 2 && q < tS - 1 && !bad(q)); if (v && !out.includes(v)) out.push(v); } }
  else if (tot >= 6) out.push(Math.max(2, Math.floor(tot / 2)));
  if (p.goal === 'ftp' && tot >= 4 && !out.includes(tot)) out.push(tot);
  (p.xTests || []).forEach(w => { if (w >= 1 && w <= tot && !out.includes(w)) out.push(w); });
  if (w0 && !out.includes(w0)) out.push(w0);
  return out.sort((a, b) => a - b);
}
const TESTX = (p) => noPwr() ? {...TESTX0(), n:'Fitness-Check: Schwellenpuls', m:65, st:'15 Min. einfahren, darin 3×1 Min. zügig · 5 Min. locker · 30 Min. so hart, wie du es gleichmäßig durchhältst, nach 10 Minuten Rundentaste drücken · 10 Min. ausfahren. Dein Schwellenpuls ist der Durchschnittspuls der letzten 20 Minuten. Fährst du die 30 Minuten an einem gleichmäßigen Anstieg, kann die App aus Zeit und Höhenmetern zusätzlich deinen FTP schätzen.', tip:'Ausgeruht starten und die ersten 5 Minuten nicht überziehen. Allein fahren, nicht in der Gruppe.'} : TESTX0();
const TESTX0 = (p) => (p || S.p || S.d || {}).testArt === 'ramp' ? snRamp() : ({...D('test', 'Fitness-Check: 20-Min-Test', 60, 95, 105, '90–100 U/min', '20 Min. einfahren, darin 3×1 Min. zügig (100–110 %) · 5 Min. locker · 20 Min. so hart, wie du es gleichmäßig durchhältst · 10 Min. ausfahren. Merk dir die Durchschnittsleistung der 20 Minuten.', 'Ausgeruht starten und die ersten 5 Minuten nicht überziehen. Ein Rampentest, zum Beispiel in Zwift, geht auch.'), iv:{reps:1, work:20, rest:0, lo:95, hi:105, wu:25, cd:15}, wh:20, test:1});
/* Offener Fitnesstest: krankheitsbedingt ausgefallen (p.testDue, frühestens 7 Tage nach dem Kranktag) oder in einer
   Testwoche nicht gemacht. Er wird nachgeholt, bis ein Ergebnis da ist oder ein Test als erledigt markiert wurde. */
function testDoneSince(p, w){
  if (Object.keys(p.res || {}).some(k => +k >= w)) return true;
  return Object.entries(p.exe || {}).some(([k, e]) => +k.split('-')[0] >= w && e && /Fitness-Check|Test/.test(e.plan || ''))
    || (p.testDone || []).some(q => q >= w);
}
const testWkOf = (p, ds) => Math.floor((new Date(ds + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 6048e5) + 1;
function testOwed(p){
  if (!p || !p.start) return null;
  if (p.testDue && !testDoneSince(p, p.testDue.w)) return p.testDue.from;
  if (p.owedSince == null) return null;
  const last = testWeeks(p).filter(x => x < (S.wk || 1) && x >= p.owedSince).pop();
  if (last && !testDoneSince(p, last)) return addD(p.start, last * 7);
  return null;
}
/* Woche, in der der offene Test nachgeholt wird: frühestens die Woche des Termins, nie vor der laufenden Woche.
   Ist dort kein Platz, die Woche danach. */
function testDueWeek(p, w){
  const due = testOwed(p); if (!due) return false; const tg = Math.max(testWkOf(p, due), S.wk || 1);
  if (w === tg) return true;
  if (w === tg + 1) { const pl = tg === S.wk && S.plan ? S.plan : (() => { try { return genWeek(p, tg); } catch (e) { elog(e); return []; } })(); return !pl.some(x => x && x.t === 'test'); }
  return false;
}
function placeTest(res, p, w){
  const due = testOwed(p), wd0 = addD(p.start, (w - 1) * 7), dueW = !testWeeks(p).includes(w) && testDueWeek(p, w);
  if ((!testWeeks(p).includes(w) && !dueW) || res.some(x => x.sub || /^Eventtag/.test(x.n || '') || x.t === 'test')) return res;
  const so = w === 1 ? startOff(p) : 0, ok = j => j >= so && !res[j].parts && capOf(p, j) >= 55 && (!dueW || testWeeks(p).includes(w) || addD(wd0, j) >= due);
  let i = p.sanft && w === t0W(p) && !dueW ? snTestDay(res, p, ok) : -1;
  if (i < 0) i = res.findIndex((x, j) => ok(j) && HARD.includes(x.t));
  if (i < 0) i = res.findIndex((x, j) => ok(j) && x.t === 'base' && !(res[j - 1] && res[j - 1].t === 'long'));
  if (i < 0) i = res.findIndex((x, j) => ok(j) && (x.t === 'base' || x.t === 'rec' || x.t === 'tempo'));
  /* Sind alle Trainingstage Pendeltage (geteilt), weicht der Test auf den Long-Ride-Tag oder einen freien verfügbaren Tag aus: nie im Stadtverkehr */
  if (i < 0) i = res.findIndex((x, j) => ok(j) && x.t === 'long');
  if (i < 0) i = res.findIndex((x, j) => ok(j) && p.avail[j] && !x.m);
  if (i < 0) return res;
  const out = res.slice(); out[i] = TESTX(p); if (dueW && !testWeeks(p).includes(w)) out[i] = {...out[i], n:out[i].ramp ? 'Fitness-Check (nachgeholt): Rampentest' : 'Fitness-Check (nachgeholt): 20-Min-Test', st:out[i].st + ' Der Test wird nachgeholt, weil er zuletzt ausgefallen ist. Er ist wichtig, damit deine Trainingsbereiche stimmen.'}; return out;
}
/* ---------- Paket C, Punkt 2: sanfter Einstieg bei geschätztem FTP (Fachregeln 2.2 bis 2.7, Entscheidungen 4 B und 5 B) ----------
   Gilt nur für Pläne mit p.sanft (neu angelegt mit geschätztem FTP), ältere Pläne bleiben unverändert.
   - Einsteiger und Wiedereinstieg: zwei Wochen nur Grundlage, der Starttest folgt in Woche 3 (t0W).
   - Bis zum ersten Messwert, mindestens in den Wochen 1 und 2 (bzw. bis zur Testwoche): keine Belastung über 85 % FTP außer dem Test.
     Woche 1 nur Grundlage und Rekom, ab Woche 2 statt Sweet Spot „Tempo 3×10“ bei 76–85 % nach Empfinden.
   - Ist der Messwert übernommen: in der Woche nach dem Test eine harte Einheit, Sweet Spot auf der untersten Stufe (3×10), kein VO2max.
   - Testtag: 2. Trainingstag, nie am Tag nach einer Fahrt über 2 Std. (spätestens 4. Trainingstag). Davor eine Einführungsfahrt,
     danach ein lockerer Tag. Long Ride in Woche 1 höchstens 1:30 (Einsteiger), 2:00 (Hobby) bzw. 2:30 (Ambitioniert), Woche 2 höchstens +15 Min. */
const snLow = p => !!p && (p.lvl === 'new' || (p.goal === 'fitness' && p.ffocus === 'restart'));
const snCapW = p => Math.max(2, t0W(p) || 0);
/* Korrektur 1: Die Testwoche bleibt sanft, auch nachdem der Wert übernommen ist (setFtpNow → replanCyc erzeugt sie neu) */
const snCap = (p, w) => { if (!p || !p.sanft) return false; const w0 = t0W(p); return !!((w0 && w <= w0) || (w <= snCapW(p) && hkEst(p))); };
function snMax(x){ if (!x || !x.m) return 0; let h = x.hi || 0; const v = x.iv; if (v) h = Math.max(h, v.hi || 0, v.rhi || 0); if (x.fin) h = Math.max(h, x.fin.hi || 0); (x.parts || []).forEach(q => { h = Math.max(h, q.hi || 0, q.iv ? q.iv.hi || 0 : 0); }); return h; }
const snFix = x => !x || !x.m || x.t === 'test' || x.sub || x.rz || /^Eventtag|^Aktivierung/.test(x.n || '');
function snRamp(){ return {...D('test', 'Fitness-Check: Rampentest', 45, 50, 130, '85–95 U/min', '10 Min. locker einfahren · Rampentest auf der Rolle: Die Leistung steigt jede Minute um etwa 20 W, beginnend bei etwa 50 % FTP, bis du die Trittfrequenz nicht mehr halten kannst · 10 Min. ausfahren. Merk dir die Leistung deiner besten Minute.', 'Ausgeruht starten. Die Rampe dauert meist 15 bis 25 Minuten, hart werden nur die letzten zwei bis drei. Viele Rollen-Apps haben einen fertigen Rampentest.'), iv:{reps:1, work:20, rest:0, lo:50, hi:130, wu:10, cd:10}, wh:5, test:1, ramp:1}; }
function snTestDay(res, p, ok){
  const td = res.map((x, j) => ({x, j})).filter(({x, j}) => x.m > 0 && ok(j) && !snFix(x)).map(o => o.j);
  let j = -1;
  for (let k = 1; k < Math.min(4, td.length); k++) { const q = td[k], prev = res[q - 1]; if (!(prev && prev.m > 120)) { j = q; break; } }
  if (j < 0) j = td.length ? td[Math.min(1, td.length - 1)] : -1;
  /* Korrektur 7: Fällt der 2. Trainingstag auf den Sonntag, kommt der Test auf einen freien verfügbaren Wochentag.
     Gibt es keinen, rückt der Long Ride auf den Samstag (in Woche 1 höchstens 2 Std.) und der Test bleibt am Sonntag. */
  if (j === 6) {
    const k = [0, 1, 2, 3, 4].find(q => p.avail[q] && res[q] && !res[q].m && ok(q) && !(res[q - 1] && res[q - 1].m > 120));
    if (k != null) return k;
    if (res[6] && res[6].t === 'long' && !snFix(res[6]) && ok(5) && !(res[5] && snFix(res[5]))) { res[5] = {...res[6]}; }
  }
  return j;
}
const SN_INTRO = () => D('base', 'Einführungsfahrt', 60, 56, 75, '85–95 U/min', 'Locker in Zone 2, ganze Sätze müssen möglich sein. Prüf dabei Rad, Wattmesser und Rolle, damit beim Test alles funktioniert.', 'Heute geht es nur ums Ankommen, nicht ums Training.');
const SN_BASE = m => D('base', 'Grundlage Z2', m, 56, 75, '85–95 U/min', 'Gleichmäßig in Zone 2, Gespräch muss möglich sein. Ohne gemessenen FTP fährst du nach Gefühl: ganz locker, ganze Sätze gehen.', 'Lieber zu leicht als zu hart.');
const SN_TEMPO = () => ({...D('sst', 'Tempo 3×10', 65, 76, 85, '85–95 U/min', '15 Min. einfahren · 3×10 Min. @ 76–85 % · 5 Min. locker dazwischen · 10 Min. ausfahren', 'Nach Gefühl: Anstrengung etwa 5 von 10, kurze Sätze müssen möglich sein. Passt das Gefühl nicht zu den Watt, gilt das Gefühl, denn dein FTP ist noch geschätzt.'), wm:30, iv:{reps:3, work:10, rest:5, lo:76, hi:85, wu:15, cd:10}});
const SN_SST = () => ({...D('sst', 'Sweet Spot 3×10', 65, 88, 94, '85–95 U/min', '15 Min. einfahren · 3×10 Min. @ 88–94 % · 5 Min. locker dazwischen · 10 Min. ausfahren', 'Der erste Sweet Spot mit deinem gemessenen FTP: lieber am unteren Rand bleiben.'), wm:30, iv:{reps:3, work:10, rest:5, lo:88, hi:94, wu:15, cd:10}});
const SN_LONG = {new:90, hob:120, amb:150};
function snLongCap(p){ if (p.longMin > 0) return 0; const k = p.lvl && SN_LONG[p.lvl] ? p.lvl : (() => { const q = (p.ftp || 200) / kgOf(p) / lvlF(p); return q < 2.35 ? 'new' : q < 3 ? 'hob' : 'amb'; })(); return SN_LONG[k]; }
/* Korrektur 2: Grenze für den Long Ride in Woche w: L + 15 × (w − 1), L nach Niveau. Reicht die Zeit bis zum Tapering damit nicht bis zur
   empfohlenen längsten Fahrt, ab Woche 3 +30 Min. pro Woche. 0 = keine Grenze. */
function snLongLim(p, w){
  const L = p && p.sanft ? snLongCap(p) : 0; if (!L) return 0;
  let rec = 150; try { if (p.goal === 'event') { const pr = evProfile(p), tev = pr ? pr.tev : 0; rec = tev <= 180 ? 150 : Math.min(360, Math.round(.7 * Math.min(tev, 420) / 15) * 15); } else if (p.goal === 'fitness') rec = p.ffocus === 'endur' && p.ftour ? Math.min(300, Math.round(p.ftour * .8 / 15) * 15) : p.ffocus === 'health' || p.ffocus === 'restart' ? 90 : p.ffocus === 'speed' ? 120 : 150; } catch (e) { elog(e); }
  let tpS = 99; try { const ph = phases(p), t = ph.find(x => x.key === 'taper'); tpS = t ? t.from : ph[ph.length - 1].to + 1; } catch (e) { elog(e); }
  const slow = 1 + Math.ceil(Math.max(0, rec - L) / 15) >= tpS, lim = slow && w >= 3 ? L + 15 + 30 * (w - 2) : L + 15 * (w - 1);
  return lim >= Math.max(rec, 480) ? 0 : lim;
}
function snWeek(res, p, w){
  if (!p || !p.sanft) return res;
  const w0 = t0W(p), cap = snCap(p, w), after = !cap && w === (w0 ? w0 + 1 : 3), low = snLow(p);
  const L = snLongCap(p), lim = snLongLim(p, w);
  if (!cap && !after && !(lim && res.some(x => x && x.t === 'long' && !snFix(x) && x.m > lim))) return res;
  let out = res.map(x => ({...x}));
  const long = j => out[j].t === 'long' && !snFix(out[j]);
  /* Korrektur 2: Long Ride höchstens L + 15 Min. pro Woche (nie über dem Wert des Generators) */
  if (lim) out = out.map((x, j) => long(j) && x.m > lim ? {...x, m:lim, soft:1} : x);
  if (cap) {
    let first = true;
    out = out.map(x => {
      if (snFix(x)) return x;
      if (HARD.includes(x.t) || snMax(x) > 85) {
        if (x.t === 'long') return {...x, hi:Math.min(x.hi || 75, 75), fin:undefined, n:'Long Ride', st:'Konstant in Zone 2, nach Gefühl ganz locker. Ab der ersten Stunde 30–60 g Kohlenhydrate pro Std.'};
        if (first && w >= 2 && !low && !(w0 && w <= w0)) { first = false; return SN_TEMPO(); }
        return SN_BASE(Math.max(45, Math.min(120, Math.round(x.m / 15) * 15)));
      }
      if (x.t === 'base' && /Sprints/.test(x.n || '')) return SN_BASE(x.m);
      return x;
    });
    /* Testwoche: Einführungsfahrt am ersten Trainingstag vor dem Test, lockerer Tag danach */
    const ti = out.findIndex(x => x.t === 'test');
    if (ti >= 0 && w === w0) {
      const f = out.findIndex(x => x.m > 0 && !snFix(x));
      if (f >= 0 && f < ti && out[f].t !== 'long' && !out[f].parts) out[f] = {...SN_INTRO(), m:Math.max(45, Math.min(75, Math.round(out[f].m / 15) * 15))};
      const n = out[ti + 1]; if (n && n.m > 0 && !snFix(n) && !n.parts && (HARD.includes(n.t) || n.m > 60)) out[ti + 1] = n.t === 'long' ? {...n, m:Math.min(n.m, 60), cut:1} : {...REC, m:Math.min(60, Math.max(30, n.m))};
      out[ti] = {...out[ti], st:out[ti].st + ' Vor deinem ersten Maximaltest: Hast du Vorerkrankungen, klär das vorher ärztlich ab. Brich ab bei Brustschmerz, Schwindel oder ungewöhnlicher Atemnot.'};
    }
  } else if (after) {
    /* Woche nach dem übernommenen Starttest: eine harte Einheit auf der untersten Stufe, kein VO2max */
    let first = true;
    out = out.map(x => { if (snFix(x) || !HARD.includes(x.t)) return x; if (first) { first = false; return SN_SST(); } return SN_BASE(Math.max(45, Math.min(120, Math.round(x.m / 15) * 15))); });
  }
  /* Umfang wie bisher (Fachregel 2.6): fehlende Zeit auf Grundlagenfahrten und freie Trainingstage verteilen, nie direkt nach dem Test */
  const sum = a => a.reduce((q, x) => q + (x && x.m || 0), 0), ti = out.findIndex(x => x.t === 'test'), so = w === 1 ? startOff(p) : 0, mx = Math.min(120, L || 120);
  let left = sum(res) - sum(out);
  const okD = j => j >= so && !(ti >= 0 && j === ti + 1) && !vacDay(p, w, j);
  out.forEach((x, j) => { if (left < 15 || x.t !== 'base' || x.n === 'Einführungsfahrt' || snFix(x) || x.parts || !okD(j)) return; const add = Math.floor(Math.min(left, mx - x.m, capOf(p, j) - x.m) / 15) * 15; if (add >= 15) { out[j] = {...x, m:x.m + add}; left -= add; } });
  const minRest = snLow(p) || rhyN(p) === 3 ? 2 : 1; /* nie den letzten Ruhetag füllen (Fachregel 7.2) */
  out.forEach((x, j) => { if (left < 45 || x.m || x.vac || !p.avail[j] || capOf(p, j) < 45 || !okD(j) || out.filter(y => !(y && y.m)).length <= minRest) return; const m = Math.min(mx, capOf(p, j), Math.max(45, Math.round(left / 15) * 15)); out[j] = SN_BASE(m); left -= m; });
  return out;
}
/* Korrektur 3a: Solange der FTP geschätzt ist, bekommt jede Einheit über 85 % den Hinweis „nach Gefühl“ (Detail, Kalender, Export lesen st) */
function snEstNote(res, p){
  if (!Array.isArray(res) || !p || !hkEst(p) || noPwr()) return res;
  return res.map(x => { if (!x || snFix(x) || snMax(x) <= 85 || /Dein FTP ist geschätzt/.test(x.st || '')) return x; const z = znOf(x); return {...x, st:(x.st || '') + ` Dein FTP ist geschätzt: Fahr nach Gefühl, Anstrengung ${z.rpe} von 10. Passt das Gefühl nicht zu den Watt, gilt das Gefühl.`}; });
}
function expAt(p, w){
  const last = Object.entries(p.res || {}).map(([k, v]) => ({w:+k, ...v})).filter(x => x.w < w && x.ftp > 0 && x.adopted).sort((a, b) => b.w - a.w)[0];
  const b0 = last ? {ftp:last.ftp, w:last.w} : {ftp:p.ftpStart || p.ftp, w:1};
  let h = hAv(p) * .86; try { h = planStats(p).hAvg; } catch (e) { elog(e); }
  const pj = ftpProj({...p, ftp:b0.ftp}, h, Math.max(0, w - b0.w)), tol = b0.ftp * .02;
  return {lo:Math.round(pj.lo - tol), mid:pj.mid, hi:Math.round(pj.hi + tol), base:b0.ftp, from:b0.w};
}
/* Fachregel 2.9: Plausibilität vor der Übernahme (über ±35 % zur Schätzung bzw. unter 1,3 oder über 5,5 W/kg) */
let snAsk = null;
function snOdd(r, p){ if (!r || !(r.ftp > 0) || !p) return false; const wkg = r.ftp / kgOf(p), b = r.base || p.ftp; return wkg < 1.3 || wkg > 5.5 || (r.st === 'base' && b > 0 && Math.abs(r.ftp / b - 1) > .35); }
let testKind = '20', testMsg = '', testKindOwn = false, testKindAuto = false;
/* testKindOwn: Testart selbst gewählt, dann bleibt sie, auch wenn eine Fahrt als Rampentest erkannt ist */
function setTestKind(k){ testKind = k; testKindOwn = true; testKindAuto = false; render(); }
const testDay = (p, w) => { const pl = w === S.wk && S.plan ? S.plan : genWeek(p, w), i = pl.findIndex(x => x.t === 'test'); return i < 0 ? null : {i, date:addD(p.start, (w - 1) * 7 + i)}; };
function saveTest(w, i){
  const el = document.getElementById('tv' + w), v = Math.round(Number(el && el.value) || 0); if (v < 50) { testMsg = 'Bitte einen Wattwert eintragen.'; return render(); }
  const ftp = testKind === '20' ? Math.round(v * .95) : testKind === 'ramp' ? Math.round(v * .75) : v, e = expAt(S.p, w), b0 = w === t0W(S.p) && !Object.values(S.p.res || {}).some(r => r.adopted), st = b0 ? 'base' : ftp >= e.hi ? 'ahead' : ftp >= e.lo ? 'on' : 'behind';
  S.p.res = {...(S.p.res || {}), [w]:{date:iso(0), kind:testKind, val:v, ftp, lo:e.lo, mid:e.mid, hi:e.hi, base:e.base, st}}; S.d.res = S.p.res;
  if (i != null && i >= 0 && S.wk === w) S.done[i] = true;
  note('Fitness-Check eingetragen', `FTP etwa ${ftp} W, erwartet waren ${e.lo} bis ${e.hi} W.`, -2);
  queueCheer({key:'test|' + S.p.start + '|' + w + '|' + ftp, kind:'test', w}); testMsg = ''; save(); render(); track('fitness-check-eingetragen');
}
function delTest(w){ const r = {...(S.p.res || {})}; delete r[w]; S.p.res = S.d.res = r; save(); render(); }
function setFtpNow(v, w, hk){
  /* Paket C: Herkunft des neuen Werts. Übernommener Fitness-Check = gemessen, sonst wie übergeben, ohne Angabe eingegeben */
  if (w != null && S.p && S.p.res && S.p.res[w]) { try { bkPre('Vor dem Übernehmen des Fitness-Checks'); } catch (e) { elog(e); } } /* Fachregel 2.8: Schnappschuss, danach „Rückgängig“ */
  try { hkSet('ftpHk', ['gemessen', 'eingegeben', 'geschaetzt'].includes(hk) ? hk : w != null && S.p && S.p.res && S.p.res[w] ? 'gemessen' : 'eingegeben'); } catch (e) { elog(e); }
  /* jede FTP-Übernahme (Test, Schätzung, Einstellungen) landet im Verlauf Gewicht und FTP (38-gewicht-ftp.js) */
  try { wfHist(); const L = S.wf[S.wf.length - 1], c = wfCur();
  if (!L || Math.round(L.ftp) !== Math.round(v) || L.d !== iso(0)) S.wf.push({d:iso(0), at:Date.now(), ftp:Math.round(v), kg:c.kg || 0}); } catch (e) { elog(e); }
  const old = S.p.ftp; S.p.ftp = S.d.ftp = v; try { ftpTrack(); } catch (e) { elog(e); } if (w != null && S.p.res && S.p.res[w]) { S.p.res[w].adopted = true; S.d.res = S.p.res; if (S.p.res[w].st === 'base') S.p.ftpStart = S.d.ftpStart = v; }
  replanCyc(); note('FTP aktualisiert', `Neuer FTP ${v} W statt ${old} W. Alle Wattvorgaben im Plan haben sich um ${v > old ? '+' : ''}${Math.round((v / old - 1) * 100)} % angepasst, die Prognose rechnet ab jetzt von diesem Wert aus.`, -2);
  cheerShow = null; save(); render();
}
function addRecW(){ const w = Math.min(phases(S.p).slice(-1)[0].to, S.wk + 1); if (!(S.p.recW || []).includes(w)) { S.p.recW = [...(S.p.recW || []), w]; S.d.recW = S.p.recW; } note('Erholungswoche eingeplant', `Woche ${w} ist jetzt eine Erholungswoche mit etwa einem Drittel weniger Umfang. Danach geht der Plan normal weiter.`, -2); cheerShow = null; save(); render(); }
function retest(w){ const tot = phases(S.p).slice(-1)[0].to, n = Math.min(tot, Math.max(S.wk + 1, w + 2)); S.p.xTests = [...new Set([...(S.p.xTests || []), n])]; S.d.xTests = S.p.xTests; note('Fitness-Check wiederholen', `Ein weiterer Check ist in Woche ${n} eingeplant.`, -2); cheerShow = null; save(); render(); }
function setTests(v){ S.p.tests = S.d.tests = v; replanCyc(); save(); render(); }
const ST = {base:['Dein Startwert', '#007f8d', '#e6f7f6'], ahead:['Stärker als erwartet', '#0a8f6a', '#e3f6f0'], on:['Auf Kurs', '#0a8f6a', '#e3f6f0'], behind:['Unter dem Korridor', '#9a6a00', '#fff6dc']};
function testRes(w, compact){
  const p = S.p, r = (p.res || {})[w]; if (!r) return '';
  const s = ST[r.st], d = r.ftp - p.ftp, pct = Math.round((r.ftp / p.ftp - 1) * 100);
  const how = r.kind === '20' ? `20-Min-Test: ${r.val} W × 0,95` : r.kind === 'ramp' ? `Rampentest: beste Minute ${r.val} W × 0,75` : r.kind === 'climb' ? `Bergzeitfahren: geschätzt ${r.val} W am Anstieg` : 'FTP direkt eingetragen';
  const txt = r.st === 'base' ? 'Ab jetzt rechnet der Plan mit deinem gemessenen Wert statt mit einer Schätzung, wenn du ihn übernimmst. Die nächsten Fitness-Checks zeigen, wie du dich davon aus entwickelst.' : r.st === 'ahead' ? 'Dein Training wirkt richtig gut. Wenn du magst, prüf im Plan-Check, ob dein Ziel ehrgeiziger sein darf.' : r.st === 'on' ? 'Genau im erwarteten Bereich: Der Plan wirkt, bleib dran.' : 'Kein Grund zur Sorge: Müdigkeit, wenig Schlaf, Stress, ein Infekt oder ein schlechter Tag verfälschen einen Test leicht. Behalte deinen bisherigen FTP vorerst und entscheide, wie es weitergeht.';
  const odd = !r.adopted && snOdd(r, p), ask = odd && snAsk != null && snAsk == w;
  const adopt = ask ? `<div class="mt-2 p-3 text-sm" style="background:#fff6dc;border:1px solid #d9a400" role="alert"><p><b>Test richtig eingetragen? Gleichmäßig gefahren?</b> Der Wert liegt ${r.ftp / kgOf(p) < 1.3 || r.ftp / kgOf(p) > 5.5 ? `bei ${f1(r.ftp / kgOf(p))} W/kg und damit außerhalb des üblichen Bereichs` : `${Math.round(Math.abs(r.ftp / (r.base || p.ftp) - 1) * 100)} % ${r.ftp > (r.base || p.ftp) ? 'über' : 'unter'} der Schätzung`}. Häufige Ursachen sind ein Tippfehler oder ein zu schneller Start.</p><div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto" onclick="snAsk=null;setFtpNow(${ja(r.ftp)}, ${ja(w)})">Ja, Wert stimmt: übernehmen</button><button class="ghost" onclick="snAsk=null;delTest(${ja(w)})">Ergebnis löschen</button></div></div>` : !r.adopted && Math.abs(d) >= 3 && odd ? `<button class="${esc(r.st === 'behind' ? 'ghost' : 'btn !w-auto')} lbl mt-2 mr-2 !py-1.5" onclick="snAsk=${ja(w)};render()">${r.st === 'behind' ? 'Trotzdem übernehmen' : 'FTP übernehmen'}: ${p.ftp} → ${r.ftp} W (${pct > 0 ? '+' : ''}${pct} %)</button>` : !r.adopted && Math.abs(d) >= 3 ? `<button class="${esc(r.st === 'behind' ? 'ghost' : 'btn !w-auto')} lbl mt-2 mr-2 !py-1.5" onclick="setFtpNow(${ja(r.ftp)}, ${ja(w)})">${r.st === 'behind' ? 'Trotzdem übernehmen' : 'FTP übernehmen'}: ${p.ftp} → ${r.ftp} W (${pct > 0 ? '+' : ''}${pct} %)</button>` : r.adopted ? '<p class="mt-2 text-sm" style="color:var(--ok)">✓ Als FTP übernommen. Alle Wattvorgaben sind angepasst.</p>' : '';
  const beh = r.st === 'behind' ? `<button class="btn !w-auto lbl mt-2 mr-2 !py-1.5" onclick="addRecW()">Erholungswoche einlegen</button><button class="ghost lbl mt-2 mr-2 !py-1.5" onclick="retest(${ja(w)})">Check in 2 Wochen wiederholen</button><button class="ghost lbl mt-2 mr-2 !py-1.5" onclick="openGoal('dash')">Optionen für mein Ziel</button>` : '';
  return `<div class="p-3" style="background:${esc(s[2])};border:1px solid ${esc(s[1])}"><p class="text-sm"><b style="color:${esc(s[1])}">${s[0]}</b> · Woche ${w}, ${fmt(r.date)}</p>
    <p class="hd mt-1 text-2xl font-semibold">FTP etwa ${r.ftp} W</p><p class="text-xs" style="color:var(--mute)">${how}.${r.st === 'base' ? ` Geschätzt waren ${r.base} W.` : ` Erwartet waren ${r.lo} bis ${r.hi} W.`}</p>
    ${compact ? '' : `<p class="mt-2 text-sm">${txt}</p>${!r.adopted && Math.abs(d) >= 3 ? `<p class="mt-1 text-xs" style="color:var(--mute)">Übernehmen heißt: Alle Wattvorgaben im Plan passen sich um ${pct > 0 ? '+' : ''}${pct} % an, und die Prognose rechnet von diesem Wert aus. Du kannst den FTP jederzeit unter Mehr → Meine Pläne → „Plan anpassen“ ändern.</p>` : ''}`}
    <div>${adopt}${beh}<button class="ghost lbl mt-2 !py-1.5" onclick="delTest(${ja(w)})">Ergebnis löschen</button></div></div>`;
}
function testBox(w, i, cur){
  const p = S.p; if (!p || !p.start) return '';
  if ((p.res || {})[w]) return testRes(w);
  if (noPwr() || (p.hrRes || {})[w]) return npTestBox(w, i, cur);
  const e = expAt(p, w), day = addD(p.start, (w - 1) * 7 + i), due = cur && day <= iso(0);
  const auto = allActs().filter(a => a.day === day && (a.m20 || a.m1) && (!(a.c20 > 15) || a.rmp)).sort((a, b) => (b.m20 || 0) - (a.m20 || 0))[0];
  /* Als Rampentest erkannt und kein sauberer 20-Min-Block: Rampentest vorwählen, solange du die Testart nicht selbst gewählt hast */
  const isRmp = !!(auto && exeRampOk(auto, true));
  if (!testKindOwn) { if (isRmp) { testKind = 'ramp'; testKindAuto = true; } else if (testKindAuto) { testKind = '20'; testKindAuto = false; } }
  if (!testKindOwn && !testKindAuto) testKind = p.testArt === 'ramp' ? 'ramp' : '20'; /* Paket C: Testart des Plans */
  const pre = auto ? (testKind === '20' ? auto.m20 : testKind === 'ramp' ? (auto.rmp || auto.m1) : '') : '';
  return `<div class="p-3" style="background:#fdf2f8;border:1px solid #e11d74"><p class="font-semibold">Fitness-Check – bist du auf Kurs?</p>
    <p class="mt-1 text-sm">Erwartet für diese Woche: <b>${e.lo} bis ${e.hi} W</b> FTP (aktuell im Plan: ${p.ftp} W). Liegt dein Ergebnis darin oder darüber, bist du auf Kurs.</p>
    ${due ? `<div class="mt-2 flex flex-wrap gap-2">${chip('20-Min-Test', testKind === '20', "setTestKind('20')")}${chip('Rampentest', testKind === 'ramp', "setTestKind('ramp')")}${chip('FTP direkt', testKind === 'ftp', "setTestKind('ftp')")}</div>
      <div class="mt-2 flex items-end gap-2"><label class="flex-1 text-xs" style="color:var(--mute)">${testKind === '20' ? 'Durchschnittsleistung der 20 Minuten' : testKind === 'ramp' ? 'Beste Minute im Rampentest' : 'FTP aus Zwift, Garmin oder Labor'} (W)<input id="tv${esc(w)}" type="number" inputmode="numeric" class="inp mt-1" value="${esc(pre || '')}"></label><button class="btn !w-auto" onclick="saveTest(${ja(w)}, ${ja(i)})">Auswerten</button></div>
      ${auto ? `<p class="mt-1 text-xs" style="color:var(--ok)">Aus deiner hochgeladenen Fahrt „${esc(auto.n)}“ erkannt: beste 20 Min. ${auto.m20 || '–'} W, beste Minute ${auto.m1 || '–'} W.${auto.rmp ? ` Rampe erkannt, beste Minute ${auto.rmp} W.` : ''}</p>` : ''}
      ${testMsg ? `<p class="mt-1 text-sm" style="color:#c0392b">${icWarn()}${esc(testMsg)}</p>` : ''}` : '<p class="mt-2 text-xs" style="color:var(--mute)">Das Ergebnis kannst du am Testtag hier eintragen. Die App rechnet daraus deinen FTP und vergleicht ihn mit dem erwarteten Korridor.</p>'}</div>`;
}
function msChart(p){
  const ph = phases(p), tot = ph[ph.length - 1].to, f0 = p.ftpStart || p.ftp; let h = hAv(p) * .86; try { h = planStats(p).hAvg; } catch (e) { elog(e); }
  const pts = Array.from({length:tot}, (_, k) => { const pj = ftpProj({...p, ftp:f0}, h, k); return {w:k + 1, lo:pj.lo - f0 * .02, mid:pj.mid, hi:pj.hi + f0 * .02}; });
  const res = Object.entries(p.res || {}).map(([k, v]) => ({w:+k, ftp:v.ftp, st:v.st})), need = p.goal === 'ftp' ? +p.ftpTarget : p.goal === 'event' ? ((evCheck(p) || {}).ftpNeed || 0) : 0;
  const all = [...pts.map(x => x.lo), ...pts.map(x => x.hi), ...res.map(x => x.ftp), need || f0, f0], y0 = Math.min(...all) * .97, y1 = Math.max(...all) * 1.03;
  const W = 320, Hh = 150, X = w => 28 + (w - 1) / Math.max(1, tot - 1) * (W - 40), Y = v => 10 + (1 - (v - y0) / (y1 - y0)) * (Hh - 30);
  const band = pts.map(x => `${X(x.w).toFixed(1)},${Y(x.hi).toFixed(1)}`).join(' ') + ' ' + pts.slice().reverse().map(x => `${X(x.w).toFixed(1)},${Y(x.lo).toFixed(1)}`).join(' ');
  const tw = testWeeks(p);
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Erwarteter FTP-Verlauf und Ergebnisse" style="display:block">
    <polygon points="${band}" fill="#00bcb3" opacity=".16"/><polyline points="${pts.map(x => `${X(x.w).toFixed(1)},${Y(x.mid).toFixed(1)}`).join(' ')}" fill="none" stroke="#007f8d" stroke-width="1.5"/>
    ${tw.map(w => `<line x1="${X(w)}" x2="${X(w)}" y1="10" y2="${Hh - 20}" stroke="#e11d74" stroke-dasharray="3 3" opacity=".5"/>`).join('')}
    ${need ? `<line x1="28" x2="${W - 12}" y1="${Y(need)}" y2="${Y(need)}" stroke="#0b1c49" stroke-dasharray="5 4"/><text x="${W - 12}" y="${Y(need) - 4}" text-anchor="end" font-size="9" fill="#0b1c49">${p.goal === 'ftp' ? 'Ziel-FTP' : 'Nötig für Zielzeit'} ${Math.round(need)} W</text>` : ''}
    ${res.map(r => `<circle cx="${X(r.w)}" cy="${Y(r.ftp)}" r="5" fill="${r.st === 'behind' ? '#d9a400' : '#0a8f6a'}" stroke="#fff" stroke-width="1.5"/>`).join('')}
    <text x="28" y="${Hh - 6}" font-size="9" fill="#5b6f80">Woche 1</text><text x="${W - 12}" y="${Hh - 6}" text-anchor="end" font-size="9" fill="#5b6f80">Woche ${tot}</text>
    <text x="2" y="${Y(f0) + 3}" font-size="9" fill="#5b6f80">${f0}</text></svg>`;
}
function msPage(p){
  const tw = testWeeks(p), cw = S.wk;
  const rows = tw.map(w => { const td = testDay(p, w), r = (p.res || {})[w], e = expAt(p, w);
    const st = r ? `<b style="color:${esc(ST[r.st][1])}">${ST[r.st][0]}: ${r.ftp} W</b>` : w < cw ? '<span style="color:#9a6a00">ausgelassen</span>' : w === cw ? '<b style="color:#e11d74">diese Woche</b>' : 'geplant';
    return `<div class="flex items-start gap-3 py-2" style="border-top:1px solid var(--line)"><span class="mt-1 h-3 w-3 shrink-0 rounded-full" style="background:${esc(r ? ST[r.st][1] : '#e11d74')}"></span><div class="min-w-0 flex-1 text-sm"><b>Woche ${w}</b>${td ? ', ' + fmt(td.date) : ''} · ${st}<br><span style="color:var(--mute)">Erwartet: ${e.lo} bis ${e.hi} W</span>${!r && w < cw ? `<br><button class="ghost lbl mt-1 !py-1 text-sm" onclick="retest(${ja(w)})">Nachholen</button>` : ''}</div></div>`; }).join('');
  const last = Object.keys(p.res || {}).map(Number).sort((a, b) => b - a)[0];
  return `<section class="panel p-4"><h2 class="hd text-xl font-semibold">Bist du auf Kurs?</h2>
      <p class="mt-1 text-sm">Nach jeder zweiten Erholungswoche plant die App einen kurzen Fitness-Check ein: einen 20-Minuten-Test, ausgeruht gefahren. Daraus ergibt sich dein FTP. Die App vergleicht ihn mit dem Korridor, den dein Plan erwarten lässt, und sagt dir, ob du auf Kurs bist oder ob etwas angepasst werden sollte. Du entscheidest, was übernommen wird.</p>
      <div class="mt-3">${msChart(p)}</div>
      <div class="mt-1 flex flex-wrap text-xs" style="color:var(--mute);column-gap:12px;row-gap:4px"><span><i class="cyc-dot" style="background:#00bcb3;opacity:.5"></i> erwarteter Korridor</span><span><i class="cyc-dot" style="background:#0a8f6a"></i> dein Ergebnis</span><span><i class="cyc-dot" style="background:#d9a400"></i> unter dem Korridor</span><span style="color:#e11d74">┆ Fitness-Check</span></div>
      ${last != null ? `<div class="mt-3">${testRes(last, true)}</div>` : ''}</section>
    <section class="panel p-4"><h2 class="hd text-xl font-semibold">Deine Checks</h2>${rows || '<p class="mt-2 text-sm" style="color:var(--mute)">Für diesen Plan sind keine Fitness-Checks eingeplant.</p>'}
      <p class="mt-3 text-sm font-semibold">Fitness-Checks einplanen?</p><div class="mt-2 flex flex-wrap gap-2">${chip('Ja', testsOn(p), 'setTests(true)')}${chip('Nein', !testsOn(p), 'setTests(false)')}</div></section>
    <section class="panel p-4 text-sm"><h2 class="hd text-xl font-semibold">So machst du den Test</h2><ul class="mt-2 list-disc space-y-1 pl-5"><li><b>20-Min-Test:</b> 20 Min. einfahren mit 3 kurzen Steigerungen, 5 Min. locker, dann 20 Min. so hart, wie du es gleichmäßig durchhältst. FTP ≈ 95 % der Durchschnittsleistung.</li><li><b>Rampentest</b> (z. B. in Zwift): Die Leistung steigt jede Minute, bis du nicht mehr kannst. FTP ≈ 75 % der besten Minute.</li><li>Ausgeruht, gut gegessen, gleiche Bedingungen wie beim letzten Test (gleiches Rad oder gleicher Rollentrainer). Lädst du die Fahrt als Datei hoch, liest die App die Werte selbst aus.</li></ul>
      <p class="mt-2 text-xs" style="color:var(--mute)">Der Korridor kommt aus der FTP-Prognose der App (Faustmodell, siehe Plan-Check) plus etwa ±2 % Messtoleranz. Tests schwanken von Tag zu Tag, darum zählt der Trend über mehrere Checks mehr als ein einzelner Wert.</p></section>`;
}

