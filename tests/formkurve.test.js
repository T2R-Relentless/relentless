/* F28: Formkurve auf dem Smartphone (Darstellung und Bedienung; die Rechnung vzRows bleibt unverändert) */
R.file = 'formkurve';

/* Saison mit Hauptrennen 10.07.2027 und A 18.04., B 30.05., C 12.06.2027; heute 11.11.2026 (seasonWithRides aus season.test.js) */
const f28Win = (a, rng) => a.$(`(() => { const R0 = vzRows(), w = vzWin(R0, '${rng}', vzEvs(S.p)); return {a:w.a, b:w.b, n:w.vis.length, first:R0.rows[0].day, last:R0.rows[R0.rows.length - 1].day, today:R0.today}; })()`);

test('F28: Zeiträume – Start- und Endtag, 7 Tage hinter dem Event', async () => {
  const a = await seasonWithRides(), T = a.$('iso(0)');
  let w = f28Win(a, '8w'); eq([w.a, w.b], [a.$(`addD('${T}', -14)`), a.$(`addD('${T}', 42)`)], '8 Wochen: 2 zurück, 6 voraus'); eq(w.n, 57);
  w = f28Win(a, '3m'); const a3 = a.$(`addD('${T}', -30)`); eq([w.a, w.b], [a3 < w.first ? w.first : a3, a.$(`addD('${T}', 61)`)], '3 Monate (Beginn frühestens mit der ersten Fahrt)');
  w = f28Win(a, 'race'); eq([w.a, w.b], [T, '2027-04-25'], 'Bis Renntag: heute bis 7 Tage nach dem nächsten A-Event (18.04.)');
  w = f28Win(a, 'season'); eq([w.a, w.b], [w.first, w.last], 'Saison: ganze Reihe'); ok(w.last >= '2027-07-17', 'Saison endet frühestens 7 Tage nach dem Hauptevent');
  /* Event kurz vor dem Ende des Zeitraums: Fenster wird verlängert */
  a.$(`S.p.subs.push({id:'zz', name:'Testrennen', date:addD('${T}', 40), prio:'C', dist:40}); save();`);
  w = f28Win(a, '8w'); eq(w.b, a.$(`addD('${T}', 47)`), '8 Wochen + 7 Tage hinter einem Event am Rand');
  a.$('vzSet("rng", "3m")'); eq(a.$('S.vzRng'), '3m', 'Auswahl gemerkt'); a.$('vzSet("rng", "x")'); eq(a.$('S.vzRng'), '8w', 'ungültig → 8 Wochen');
  a.noErrors();
});

test('F28: x-Beschriftung überlappt nie (320, 375, 430 pt, alle Zeiträume)', async () => {
  const a = await seasonWithRides(), L = 34, R = 10;
  for (const vw of [320, 375, 430]) { const W = Math.round(Math.min(vw, 576) - 58);
    for (const rng of ['8w', '3m', 'race', 'season']) {
      const t = a.$(`(() => { const R0 = vzRows(), w = vzWin(R0, '${rng}', vzEvs(S.p)), n = w.vis.length, X = i => ${L} + i * (${W} - ${L} - ${R}) / (n - 1); return vzXTicks(w.vis, X, '${rng}', ${W}, ${L}, ${R}); })()`);
      ok(t.length >= 2, `${vw}/${rng}: mindestens zwei Beschriftungen (${t.map(x => x.s).join(' ')})`);
      t.forEach((x, k) => { ok(x.x - x.w / 2 >= L - .5 && x.x + x.w / 2 <= W - R + .5, `${vw}/${rng}: ${x.s} im Bild`); if (k) ok(x.x - x.w / 2 >= t[k - 1].x + t[k - 1].w / 2, `${vw}/${rng}: ${t[k - 1].s} und ${x.s} überlappen`); });
      if (rng === '8w') ok(t.every(x => /^\d\d\.\d\d\.$/.test(x.s)), '8 Wochen: Datum je Woche');
    } }
  a.noErrors();
});

test('F28: y-Maßstab mit runden Gitterwerten, 10 % Luft', async () => {
  const a = await seasonWithRides(), nice = a.$('vzNice');
  [[71, 20, 80], [38, 20, 60], [12, 5, 15], [140, 50, 200]].forEach(([m, st, top]) => { const r = nice(m); eq([r.st, r.top], [st, top], 'Maximum ' + m); ok(r.top >= m * 1.1 && r.top / r.st <= 4, 'Luft und höchstens vier Abschnitte'); });
  a.$("S.vzRng = 'season'"); const html = a.$('vzForm()'), ys = [...html.split('vz-tsb')[0].matchAll(/text-anchor="end" class="tx">(\d+)<\/text>/g)].map(m => +m[1]);
  ok(ys.length >= 3 && ys.length <= 5 && ys[0] === 0 && ys.every((v, i) => !i || v - ys[i - 1] === ys[1]), 'Gitter 0, Schritt, …: ' + ys.join(' '));
});

test('F28: Glättung der Ermüdung nur in der Anzeige, Rechnung unverändert', async () => {
  const a = await seasonWithRides(), before = JSON.stringify(a.$('vzRows()').rows), F0 = JSON.stringify(a.$('seasonForecast(S.p)').map(o => o.form));
  a.$("S.vzRng = 'season'"); const html = a.$('vzForm()'); ok(/Ermüdung geglättet/.test(html), 'Hinweis nennt die Glättung');
  eq(JSON.stringify(a.$('vzRows()').rows), before, 'Formreihe unverändert'); eq(JSON.stringify(a.$('seasonForecast(S.p)').map(o => o.form)), F0, 'Plan-Check unverändert');
  const sm = a.$('vzSm7'), v = [0, 0, 0, 70, 0, 0, 0]; eq(Math.round(sm(v)[3]), 10, '7-Tage-Mittel'); eq(v[3], 70, 'Eingabe nicht verändert');
  a.$("S.vzRng = '8w'"); ok(!/geglättet/.test(a.$('vzForm()')), '8 Wochen: ungeglättet');
});

test('F28: Formbereiche und Wörter an den Grenzen', async () => {
  const a = await seasonWithRides(), w = a.$('vzWord');
  eq([25.1, 25, 5, 4.9, -10, -10.1, -30, -30.1].map(w), ['Formverlust', 'frisch', 'frisch', 'neutral', 'neutral', 'Training wirkt', 'Training wirkt', 'hohe Belastung']);
  eq(a.$('VZ_BANDS').map(b => [b[0], b[1]]), [[25, 99], [5, 25], [-10, 5], [-30, -10], [-99, -30]], 'Grenzen wie bisher in der App');
  const h = a.$('vzForm()'); ok(/Frisch – bereit fürs Rennen/.test(h) && /Hohe Belastung/.test(h), 'Bereiche beschriftet');
  ok(/class="vzt-/.test(h) && !/class="vzt-pos/.test(h), '8 Wochen: Tagesbalken'); a.$("S.vzRng = 'season'"); const hs = a.$('vzForm()'); ok(/class="vzt-pos"/.test(hs) && (hs.match(/<rect[^>]*class="vzt-/g) || []).length === 0, 'Saison: Fläche statt Balken');
});

test('F28: Wischen – richtiger Tag, Grenzen, Infofeld', async () => {
  const a = await seasonWithRides(); a.page('sform'); await a.tick(30);
  const id = a.w.document.querySelector('.vz-main').dataset.vz, g = a.$(`vzReg['${id}']`), idx = a.$('vzIdx'), x = i => g.X(i);
  eq(idx(g.L, g), 0, 'linker Rand'); eq(idx(g.L - 30, g), 0, 'links außerhalb'); eq(idx(g.W - g.R, g), g.n - 1, 'rechter Rand'); eq(idx(g.W + 50, g), g.n - 1, 'rechts außerhalb');
  eq(idx(x(10) + 1, g), 10, 'Tag 10'); eq(idx(x(20) - 1, g), 20, 'Tag 20');
  a.$(`vzPaint('${id}', 20)`); await a.tick(40); const info = a.w.document.getElementById(id + '-i').textContent, r = g.rows[20];
  ok(info.includes(a.$(`fmt('${r.day}')`)) && info.includes('Fitness ' + Math.round(r.ctl)) && info.includes('Ermüdung ' + Math.round(r.atl)), 'Infofeld zeigt den Tag: ' + info);
  ok(/TSS \d+ (geplant|gefahren)|Ruhetag|keine Fahrt/.test(info), 'TSS des Tages');
  eq(a.$('vzSt.sel'), r.day, 'Auswahl bleibt'); a.$(`vzOut({target:document.querySelector('.vz-card p')}, '${id}')`); await a.tick(40); eq(a.$('vzSt.sel'), null, 'Antippen außerhalb: zurück auf heute');
  ok(a.w.document.querySelector('.vz-main').getAttribute('style').includes('pan-y'), 'senkrechtes Scrollen bleibt');
  a.noErrors();
});

test('F28: Kacheln, Fähnchen, Vollbild, VoiceOver DE/EN', async () => {
  const a = await seasonWithRides(); let t = a.page('sform');
  ok(/Fitness heute/.test(t) && /Form heute/.test(t) && /Frühjahrsklassiker/.test(t) && /Saisonspitze/.test(t), 'vier Kacheln');
  const lbl = a.w.document.querySelector('.vz-card [role="img"]').getAttribute('aria-label');
  ok(/^Formkurve, 8 Wochen\. Fitness heute \d+, Form (plus|minus) \d+, .+\. Am Renntag 18\. April 2027 Fitness etwa \d+, Form (plus|minus) \d+\.$/.test(lbl), 'VoiceOver DE: ' + lbl);
  a.$("vzJump('2027-04-18', 'race')"); eq(a.$('S.vzRng'), 'race', 'Kachel Renntag wechselt den Zeitraum'); eq(a.$('vzSt.sel'), '2027-04-18');
  a.$("S.vzRng = 'season'; render()"); const fl = [...a.w.document.querySelectorAll('.vz-main .vz-flt')].map(x => x.textContent); ok(fl.some(x => /^A · Frühjahrs/.test(x)) && fl.filter(x => /^A/.test(x)).length === 2, 'beide A-Events mit Fähnchen: ' + fl.join(' | '));
  a.$("vzSet('full', 1)"); ok(a.w.document.querySelector('.vz-fullv .vz-main'), 'Vollbild'); a.$("vzSet('full', 0)"); ok(!a.w.document.querySelector('.vz-fullv'), 'Vollbild zu');
  a.$("vzSet('show', 'atl')"); ok(!/class="vz-atl/.test(a.$('vzForm()')), 'Ermüdung ausgeblendet'); a.$("vzSet('show', 'atl')");
  ok(a.$("DYK.find(d => d[0] === 'form')[1]").includes('Wische') && a.$("WN_DATA['198'].length") === 1, 'Tipp und Neuigkeiten');
  await a.en(); a.$("S.vzRng = '8w'"); a.page('sform'); const en = a.w.document.querySelector('.vz-card [role="img"]').getAttribute('aria-label');
  ok(/^Form chart, 8 weeks\. Fitness today \d+, form (plus|minus) \d+, .+\. On race day 18 April 2027 fitness about \d+, form (plus|minus) \d+\.$/.test(en), 'VoiceOver EN: ' + en);
  a.noErrors();
});

test('F28: Fitness, Ermüdung und Form sind im Glossar erklärt (DE/EN)', async () => {
  const a = await seasonWithRides(); a.page('sform'); await a.tick(30);
  const g = [...a.w.document.querySelectorAll('.vz-card .gl')].map(el => a.$(`GL[lang()][${el.dataset.g}][1]`));
  ok(['CTL', 'ATL', 'TSB'].every(k => g.some(x => x.startsWith(k))), 'CTL, ATL und TSB antippbar: ' + g.join(' | '));
  await a.en(); a.page('sform'); await a.tick(30); const ge = [...a.w.document.querySelectorAll('.vz-card .gl')].map(el => a.$(`GL[lang()][${el.dataset.g}][1]`));
  ok(ge.some(x => x === 'TSB (form)') && /Form \(TSB\): fitness minus fatigue/.test(a.text()), 'Englisch: ' + ge.join(' | ')); a.noErrors();
});

/* Doppelspitze: A-Rennen am 19.09., Hauptevent am 03.10.2027 (zwei Wochen später), Zeitbudget Winter 8 / Sommer 12 Std. */
async function dblApp(){
  const a = await boot({now:at(2026, 11, 14)});
  makePlan(a, {goal:'event', eventName:'Hauptevent', eventDate:'2027-10-03', ftp:300, hours:9}, [{name:'Frühjahr', date:'2027-04-11', prio:'A', dist:80}, {name:'Herbstrennen', date:'2027-09-19', prio:'A', dist:110}]);
  const rides = []; for (let d = new Date('2026-10-20T12:00:00'); d < new Date('2026-11-14T12:00:00'); d.setDate(d.getDate() + 3)) { const day = d.toISOString().slice(0, 10); rides.push({id:'r' + day, n:'Fahrt', day, ts:day + 'T07:00:00.000Z', sec:3600, tss:45, km:30, hm:200}); }
  a.$(`tbInit(S.p); S.p.tb.on = true; S.p.tb.prof.w.h = 8; S.p.tb.prof.s.h = 12; S.man = ${JSON.stringify(rides)}; save(); render();`); return a;
}
test('Doppelspitze: Vorschlag kürzt das erste Tapering auf eine Woche, nur nach Zustimmung', async () => {
  const a = await dblApp(), tp = () => a.$('phases(S.p)').filter(x => x.key === 'taper').map(x => x.from + '-' + x.to), ph0 = JSON.stringify(a.$('phases(S.p)'));
  const q = a.$('tpShortProp()'); ok(q && q.ev.date === '2027-09-19' && q.next.date === '2027-10-03' && !q.on, 'Vorschlag für das Rennen am 19.09.');
  ok(q.one.b.ctl - q.two.b.ctl >= 1 && q.one.a.ctl > q.two.a.ctl, `Fitness an beiden Renntagen steigt: ${q.two.a.ctl} → ${q.one.a.ctl}, ${q.two.b.ctl} → ${q.one.b.ctl}`); ok(q.one.b.tsb >= 5 && q.one.a.tsb >= 5, 'Form an beiden Renntagen bleibt frisch: ' + q.one.a.tsb + ' / ' + q.one.b.tsb);
  eq(JSON.stringify(a.$('phases(S.p)')), ph0, 'Vorschlag rechnen ändert den Plan nicht'); ok(!('tpShort' in a.$('S.p')), 'kein Merker ohne Zustimmung');
  const t0 = tp(), w19 = a.$("seasWk(S.p, '2027-09-19')"); ok(t0.includes((w19 - 1) + '-' + w19), 'vorher zwei Wochen Tapering: ' + t0.join(' '));
  const t = a.page('sform'); ok(/Vorschlag: Formhöhepunkt näher ans Hauptevent legen/.test(t) && /Plan so anpassen/.test(t), 'Vorschlag auf der Formkurve');
  const plan0 = JSON.stringify(a.$('S.plan')); a.$('tpShortSet(1)');
  eq(a.$('S.p.tpShort'), 1); ok(tp().includes(w19 + '-' + w19) && !tp().includes((w19 - 1) + '-' + w19), 'danach eine Woche: ' + tp().join(' '));
  ok(!a.$(`recWk(S.p, ${w19 - 1})`) && a.$(`recWk(S.p, ${w19 - 2})`) && a.$(`rampOf(S.p, ${w19 - 1})`) === 1, 'Entlastungswoche tauscht mit der Woche davor: letzte volle Woche direkt vor dem Tapering');
  eq(JSON.stringify(a.$('S.plan')), plan0, 'laufende Woche unverändert'); ok(/Tapering verkürzt/.test(a.$('S.log[0].title')) && a.$('!!bkUndo'), 'Eintrag unter Anpassungen und Schnappschuss');
  ok(/Tapering angepasst/.test(a.text()) && /Wieder zwei Wochen Tapering/.test(a.text()), 'Hinweis mit Rücknahme');
  eq(Math.round(a.$("vzRows().rows.find(r => r.day === '2027-10-03').ctl")), q.one.b.ctl, 'Formkurve zeigt den angekündigten Wert');
  a.$('tpShortSet(0)'); ok(!('tpShort' in a.$('S.p')) && JSON.stringify(a.$('phases(S.p)')) === ph0, 'zurück auf zwei Wochen');
  ok(a.$("DYK.some(d => d[0] === 'tpshort') && WN_DATA['200'].length === 1"), 'Tipp und Neuigkeiten'); a.$('dykTp()'); await a.tick(50); ok(a.w.document.getElementById('fx-tp'), 'Tipp führt zum Vorschlag');
  await a.en(); a.page('sform'); ok(/Suggestion: move the peak closer/.test(a.text()), 'Englisch'); a.noErrors();
});
test('Doppelspitze: kein Vorschlag ohne enges A-Rennen oder wenn das Tapering schon läuft', async () => {
  const a = await seasonWithRides(); eq(a.$('tpShortProp()'), null, 'A-Rennen im April, Hauptevent im Juli: kein Vorschlag'); ok(!/Formhöhepunkt näher/.test(a.page('sform')));
  const b = await dblApp(); b.$("S.wk = seasWk(S.p, '2027-09-19') - 2"); eq(b.$('tpShortProp()'), null, 'kurz vor dem Tapering nicht mehr');
  b.$("S.wk = 2; S.p.subs.find(s => s.date === '2027-09-19').prio = 'B'"); eq(b.$('tpShortProp()'), null, 'B-Rennen: kein Vorschlag'); b.noErrors();
});
