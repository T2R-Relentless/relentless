/* Übungen-Pilot: neue Figur (exB…) und gegliederter Text im Übungsfenster für 6 Übungen */
R.file = 'uebungen-pilot';
const PILOT = ['clam', 'deadbug', 'pallof', 'hip9090', 'openbook', 'thread'];

test('Pilotübungen: Animation, gegliederte Felder, s aus b abgeleitet, Ausschnitt', async () => {
  const a = await boot(), bad = [];
  PILOT.forEach(id => {
    const e = a.$(`EXI['${id}']`);
    if (!a.$(`exTpl('${id}').ok`)) bad.push(id + ': Animation (exTpl.ok)');
    if (!e.q || !Array.isArray(e.a) || e.a.length < 3 || !e.atm || !e.sp || !e.ez || !e.hd || !e.k || !Array.isArray(e.f) || e.f.length < 3) bad.push(id + ': Felder');
    if (!Array.isArray(e.b) || e.b.length !== 4 || e.b.some(x => !x[0] || (x[1] !== 0 && x[1] !== 1))) bad.push(id + ': Schritte b mit Phase 0/1');
    if (!Array.isArray(e.s) || e.s.length !== 4 || e.s.some((x, i) => x !== e.b[i][0])) bad.push(id + ': s nicht aus b abgeleitet');
    if ([...e.a, ...e.b.map(x => x[0]), ...e.f].some(t => /\d+\s*(Wiederholungen|Wdh\.|Wechsel)/.test(t))) bad.push(id + ': Dosierung im Text');
    if (e.vb != null && !/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/.test(e.vb)) bad.push(id + ': vb');
    if (!a.$(`exAnimSvg('${id}')`).includes(`viewBox="${a.$(`exVB('${id}')`)}"`)) bad.push(id + ': Ausschnitt nicht in exAnimSvg');
  });
  ok(a.$(`exVB('squat')`) === '0 0 170 165', 'andere Übungen behalten die volle Fläche');
  eq(bad, []); a.noErrors();
});

test('Pilotübungen: Englisch für alle neuen Texte', async () => {
  const a = await boot(); await a.w.i18nLoad(); const has = t => a.$(`I18N[iNorm(${JSON.stringify(t)}).k] != null`), miss = [];
  PILOT.forEach(id => { const e = a.$(`EXI['${id}']`);
    [e.q, e.atm, e.sp, e.ez, e.hd, e.k, e.r, e.v, ...e.a, ...e.b.map(x => x[0]), ...e.f].filter(Boolean).forEach(t => { if (!has(t)) miss.push(id + ': ' + t); }); });
  ['Merksatz', 'Ausgangsposition', 'Bewegung', 'Atmung', 'Das solltest du spüren', 'Leichter', 'Schwerer', 'Hier spürst du es',
    'Tippe auf einen Schritt, um das Bild in dieser Position anzuhalten. Nochmal tippen läuft weiter.'].forEach(t => { if (!has(t)) miss.push(t); });
  eq(miss.slice(0, 8), []);
});

test('Übungsfenster: Schritt antippen hält das Bild an, Öffnen und Schließen setzen zurück', async () => {
  const a = await boot(), pressed = () => a.$(`[...document.querySelectorAll('.exov .exbstep')].map(b => b.getAttribute('aria-pressed'))`);
  a.$(`openEx('deadbug')`);
  ok(a.$('exHold') === null, 'nach dem Öffnen nichts angehalten');
  eq(pressed(), ['false', 'false', 'false', 'false'], 'vier Schritte, keiner gedrückt');
  ok(a.$(`!!document.querySelector('.exov .exbq')`) && /Ausgangsposition/.test(a.text()) && /Das solltest du spüren/.test(a.text()), 'gegliederter Text');
  a.$('exHoldTap(1)');
  eq(a.$('[exHold.id, exHold.i, exHold.ph]'), ['deadbug', 1, 1], 'Schritt 2 hält Phase 1');
  eq(pressed(), ['false', 'true', 'false', 'false']);
  a.$('exHoldTap(2)');
  eq(a.$('[exHold.i, exHold.ph]'), [2, 0], 'Schritt 3 hält Phase 0');
  eq(pressed(), ['false', 'false', 'true', 'false']);
  a.$('exHoldTap(2)');
  ok(a.$('exHold') === null, 'erneutes Antippen gibt frei'); eq(pressed(), ['false', 'false', 'false', 'false']);
  a.$('exHoldTap(0)'); a.$('closeEx()');
  ok(a.$('exHold') === null && a.$('exOpen') === null, 'Schließen gibt frei');
  a.$(`openEx('clam')`); a.$('exHoldTap(1)'); a.$(`openEx('pallof')`);
  ok(a.$('exHold') === null, 'Öffnen einer anderen Übung gibt frei');
  ok(a.$(`document.querySelectorAll('.exov .exbstep').length`) === 4, 'pallof: vier Schritte');
  ok(a.$(`[...document.querySelectorAll('.exov .exbstep')].every(b => b.getBoundingClientRect().height >= 44 || b.getBoundingClientRect().height === 0)`), 'Tippfläche mindestens 44 pt');
  a.$('closeEx()');
  a.$(`openEx('squat')`); ok(a.$(`document.querySelectorAll('.exov .exbstep').length`) === 0 && /So geht's/.test(a.text()), 'andere Übungen: alte Darstellung');
  a.$('closeEx()'); a.noErrors();
});
