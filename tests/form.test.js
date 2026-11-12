/* B9: Formkurve bis zum Event */
R.file = 'form';

/* Wie in der Meldung: heute 09.11.2026, Saison 2027 mit Event am 03.10.2027, Fahrten der letzten Wochen vorhanden */
async function seasonApp({ridesFrom = '2026-10-20'} = {}){
  const a = await boot({now:at(2026, 11, 9)});
  makePlan(a, {goal:'event', eventName:'Saison 2027', eventDate:'2027-10-03', ftp:260, hours:9});
  const rides = []; for (let d = new Date(ridesFrom + 'T12:00:00'); d < new Date('2026-11-09T12:00:00'); d.setDate(d.getDate() + 2)) {
    const day = d.toISOString().slice(0, 10); rides.push({id:'r' + day, n:'Fahrt', day, ts:day + 'T07:00:00.000Z', sec:5400, tss:75, km:40, hm:300, src:'file'}); }
  a.$(`S.man = ${JSON.stringify(rides)}; save(); render();`);
  return a;
}
const weekDays = (a, w) => { const s = a.$('S.p.start'); return [0, 1, 2, 3, 4, 5, 6].map(k => a.$(`addD('${s}', ${(w - 1) * 7 + k})`)); };

test('B9: Prognose enthält jeden Tag bis nach dem Event, ohne Lücken', async () => {
  const a = await seasonApp(), R0 = a.$('vzRows()'); ok(R0, 'Formkurve berechnet');
  const days = R0.rows.map(r => r.day); ok(days.includes('2027-10-03'), 'Eventtag enthalten'); ok(days[days.length - 1] >= '2027-10-10', 'Achse reicht über das Event hinaus');
  for (let i = 1; i < days.length; i++) if (a.$(`addD('${days[i - 1]}', 1)`) !== days[i]) throw new Fail(`Lücke nach ${days[i - 1]}`);
  const fut = R0.rows.filter(r => r.f && r.day <= '2027-10-03'), months = new Set(fut.filter(r => r.t > 0).map(r => r.day.slice(0, 7)));
  ['2027-06', '2027-07', '2027-08', '2027-09'].forEach(m => ok(months.has(m), `geplante Belastung im ${m}`));
  a.noErrors();
});

test('B9: Geplante TSS je Woche in der Prognose = Plan', async () => {
  const a = await seasonApp(), fut = a.$('vzFuture()'), tot = a.$('phases(S.p).slice(-1)[0].to'), wk = a.$('S.wk'), bad = [];
  for (let w = wk + 1; w <= tot; w++) {
    const P = a.$(`genWeek(S.p, ${w})`), D = weekDays(a, w), plan = P.reduce((q, x, k) => q + (x && x.m > 0 && D[k] <= '2027-10-03' ? a.$('tss')(x) : 0), 0);
    const prog = D.reduce((q, d) => q + (fut[d] || 0), 0); if (plan !== prog) bad.push(`Woche ${w}: Plan ${plan}, Prognose ${prog}`);
  }
  eq(bad, []); ok(tot - wk > 30, 'mehr als 30 Wochen voraus geprüft (' + (tot - wk) + ')');
});

test('B9: Renntag-Linie liegt genau auf dem Eventdatum', async () => {
  const a = await seasonApp(), html = a.$('vzForm()'), R0 = a.$('vzRows()');
  const m = /<line x1="([\d.]+)"[^>]*class="goal" data-day="([\d-]+)"/.exec(html); ok(m, 'Renntag-Linie vorhanden');
  eq(m[2], '2027-10-03'); const n = R0.vis.length, x = 28 + R0.ei * (340 - 28 - 8) / (n - 1);
  near(+m[1], x, 0.11, 'x-Position'); eq(R0.vis[R0.ei].day, '2027-10-03');
  ok(/Am Renntag \(03\.10\.2027\)/.test(html.replace(/<[^>]+>/g, '')), 'Text nennt das Eventdatum');
});

test('B9: Monatsbeschriftungen überlappen nicht (Achse beginnt Ende September)', async () => {
  const a = await seasonApp({ridesFrom:'2026-09-15'}), html = a.$('vzForm()'), svg = html.split('</svg>')[0];
  const xs = [...svg.matchAll(/<text x="([\d.]+)" y="145" class="tx">([^<]+)<\/text>/g)].map(m => [+m[1], m[2]]);
  ok(xs.length >= 10, 'Monate beschriftet: ' + xs.map(x => x[1]).join(' '));
  /* Beschriftung 9,5 px, drei Buchstaben etwa 17 px breit: 20 px Abstand heißt keine Überlappung */
  for (let i = 1; i < xs.length; i++) ok(xs[i][0] - xs[i - 1][0] >= 20, `${xs[i - 1][1]} und ${xs[i][1]} zu dicht (${(xs[i][0] - xs[i - 1][0]).toFixed(1)} px)`);
  eq(xs[0][1], 'Okt', 'angeschnittener September entfällt'); eq(xs[xs.length - 1][1], 'Okt', 'Achse endet im Oktober 2027');
});

test('B9: Renntag fachlich plausibel (Tapering), sonst Hinweis', async () => {
  const a = await seasonApp(), R0 = a.$('vzRows()'), ev = R0.vis[R0.ei];
  await snap('form', 'renntag-saison-2027', {fitness:Math.round(ev.ctl), form:Math.round(ev.tsb), hoechstwert:Math.round(R0.peak)});
  const h = a.$('vzRaceHint'); eq(h(10, 60, 62), '', 'gute Form, Fitness nahe Höchstwert');
  ok(/Ermüdung/.test(h(-5, 60, 62)), 'negative Form'); ok(/unter dem Höchstwert/.test(h(10, 40, 62)), 'Fitness verloren'); ok(/sehr hoch/.test(h(35, 60, 62)), 'zu lange Entlastung');
  const txt = a.$('vzForm()'); eq(/role="note"/.test(txt), !!h(ev.tsb, ev.ctl, R0.peak), 'Hinweis genau dann, wenn die Regel greift');
});

test('B9: Seite Formkurve rendert ohne Fehler (deutsch und englisch)', async () => {
  const a = await seasonApp(); ok(/Am Renntag \(03\.10\.2027\)/.test(a.page('sform')), 'Formkurve mit Renntag sichtbar'); await a.en(); a.page('sform'); a.noErrors();
});
