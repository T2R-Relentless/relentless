/* ---------- Fitness-Checks (Meilensteine): FTP-Test nach Erholungswochen, Auswertung gegen den erwarteten Korridor ---------- */
const testsOn = p => !!p && p.tests !== false;
function testWeeks(p){
  if (!p) return []; const w0 = t0W(p);
  if (!testsOn(p)) return w0 ? [w0] : [];
  const ph = phases(p), tot = ph[ph.length - 1].to, tp = ph.filter(x => x.key === 'taper').pop(), tS = tp ? tp.from : tot + 1, out = [], bad = w => ph.some(x => w >= x.from && w <= x.to && (x.key === 'taper' || x.rec || x.keep)) || ph.some(x => x.key === 'taper' && x.from === w + 1);
  if (tot >= 9) { for (let w = rhyN(p) + 1; w < tS - 1; w += 2 * rhyN(p)) { const v = [w, w + 1, w - 1, w + 2].find(q => q >= 2 && q < tS - 1 && !bad(q)); if (v && !out.includes(v)) out.push(v); } }
  else if (tot >= 6) out.push(Math.max(2, Math.floor(tot / 2)));
  if (p.goal === 'ftp' && tot >= 4 && !out.includes(tot)) out.push(tot);
  (p.xTests || []).forEach(w => { if (w >= 1 && w <= tot && !out.includes(w)) out.push(w); });
  if (w0 && !out.includes(w0)) out.push(w0);
  return out.sort((a, b) => a - b);
}
const TESTX = () => noPwr() ? {...TESTX0(), n:'Fitness-Check: Schwellenpuls', m:65, st:'15 Min. einfahren, darin 3×1 Min. zügig · 5 Min. locker · 30 Min. so hart, wie du es gleichmäßig durchhältst, nach 10 Minuten Rundentaste drücken · 10 Min. ausfahren. Dein Schwellenpuls ist der Durchschnittspuls der letzten 20 Minuten. Fährst du die 30 Minuten an einem gleichmäßigen Anstieg, kann die App aus Zeit und Höhenmetern zusätzlich deinen FTP schätzen.', tip:'Ausgeruht starten und die ersten 5 Minuten nicht überziehen. Allein fahren, nicht in der Gruppe.'} : TESTX0();
const TESTX0 = () => ({...D('test', 'Fitness-Check: 20-Min-Test', 60, 95, 105, '90–100 U/min', '20 Min. einfahren, darin 3×1 Min. zügig (100–110 %) · 5 Min. locker · 20 Min. so hart, wie du es gleichmäßig durchhältst · 10 Min. ausfahren. Merk dir die Durchschnittsleistung der 20 Minuten.', 'Ausgeruht starten und die ersten 5 Minuten nicht überziehen. Ein Rampentest, zum Beispiel in Zwift, geht auch.'), iv:{reps:1, work:20, rest:0, lo:95, hi:105, wu:25, cd:15}, wh:20, test:1});
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
  let i = res.findIndex((x, j) => ok(j) && HARD.includes(x.t));
  if (i < 0) i = res.findIndex((x, j) => ok(j) && x.t === 'base' && !(res[j - 1] && res[j - 1].t === 'long'));
  if (i < 0) i = res.findIndex((x, j) => ok(j) && (x.t === 'base' || x.t === 'rec' || x.t === 'tempo'));
  /* Sind alle Trainingstage Pendeltage (geteilt), weicht der Test auf den Long-Ride-Tag oder einen freien verfügbaren Tag aus: nie im Stadtverkehr */
  if (i < 0) i = res.findIndex((x, j) => ok(j) && x.t === 'long');
  if (i < 0) i = res.findIndex((x, j) => ok(j) && p.avail[j] && !x.m);
  if (i < 0) return res;
  const out = res.slice(); out[i] = TESTX(); if (dueW && !testWeeks(p).includes(w)) out[i] = {...out[i], n:'Fitness-Check (nachgeholt): 20-Min-Test', st:out[i].st + ' Der Test wird nachgeholt, weil er zuletzt ausgefallen ist. Er ist wichtig, damit deine Trainingsbereiche stimmen.'}; return out;
}
function expAt(p, w){
  const last = Object.entries(p.res || {}).map(([k, v]) => ({w:+k, ...v})).filter(x => x.w < w && x.ftp > 0 && x.adopted).sort((a, b) => b.w - a.w)[0];
  const b0 = last ? {ftp:last.ftp, w:last.w} : {ftp:p.ftpStart || p.ftp, w:1};
  let h = hAv(p) * .86; try { h = planStats(p).hAvg; } catch (e) { elog(e); }
  const pj = ftpProj({...p, ftp:b0.ftp}, h, Math.max(0, w - b0.w)), tol = b0.ftp * .02;
  return {lo:Math.round(pj.lo - tol), mid:pj.mid, hi:Math.round(pj.hi + tol), base:b0.ftp, from:b0.w};
}
let testKind = '20', testMsg = '';
function setTestKind(k){ testKind = k; render(); }
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
function setFtpNow(v, w){
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
  const adopt = !r.adopted && Math.abs(d) >= 3 ? `<button class="${esc(r.st === 'behind' ? 'ghost' : 'btn !w-auto')} lbl mt-2 mr-2 !py-1.5" onclick="setFtpNow(${ja(r.ftp)}, ${ja(w)})">${r.st === 'behind' ? 'Trotzdem übernehmen' : 'FTP übernehmen'}: ${p.ftp} → ${r.ftp} W (${pct > 0 ? '+' : ''}${pct} %)</button>` : r.adopted ? '<p class="mt-2 text-sm" style="color:var(--ok)">✓ Als FTP übernommen. Alle Wattvorgaben sind angepasst.</p>' : '';
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
  const auto = allActs().filter(a => a.day === day && (a.m20 || a.m1) && !(a.c20 > 15)).sort((a, b) => (b.m20 || 0) - (a.m20 || 0))[0];
  const pre = auto ? (testKind === '20' ? auto.m20 : testKind === 'ramp' ? auto.m1 : '') : '';
  return `<div class="p-3" style="background:#fdf2f8;border:1px solid #e11d74"><p class="font-semibold">Fitness-Check – bist du auf Kurs?</p>
    <p class="mt-1 text-sm">Erwartet für diese Woche: <b>${e.lo} bis ${e.hi} W</b> FTP (aktuell im Plan: ${p.ftp} W). Liegt dein Ergebnis darin oder darüber, bist du auf Kurs.</p>
    ${due ? `<div class="mt-2 flex flex-wrap gap-2">${chip('20-Min-Test', testKind === '20', "setTestKind('20')")}${chip('Rampentest', testKind === 'ramp', "setTestKind('ramp')")}${chip('FTP direkt', testKind === 'ftp', "setTestKind('ftp')")}</div>
      <div class="mt-2 flex items-end gap-2"><label class="flex-1 text-xs" style="color:var(--mute)">${testKind === '20' ? 'Durchschnittsleistung der 20 Minuten' : testKind === 'ramp' ? 'Beste Minute im Rampentest' : 'FTP aus Zwift, Garmin oder Labor'} (W)<input id="tv${esc(w)}" type="number" inputmode="numeric" class="inp mt-1" value="${esc(pre || '')}"></label><button class="btn !w-auto" onclick="saveTest(${ja(w)}, ${ja(i)})">Auswerten</button></div>
      ${auto ? `<p class="mt-1 text-xs" style="color:var(--ok)">Aus deiner hochgeladenen Fahrt „${esc(auto.n)}“ erkannt: beste 20 Min. ${auto.m20 || '–'} W, beste Minute ${auto.m1 || '–'} W.</p>` : ''}
      ${testMsg ? `<p class="mt-1 text-sm" style="color:#c0392b">⚠ ${esc(testMsg)}</p>` : ''}` : '<p class="mt-2 text-xs" style="color:var(--mute)">Das Ergebnis kannst du am Testtag hier eintragen. Die App rechnet daraus deinen FTP und vergleicht ihn mit dem erwarteten Korridor.</p>'}</div>`;
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

