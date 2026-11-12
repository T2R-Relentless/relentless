/* B8: Statusleiste in der installierten App: deckend, ohne Unschärfe, kein Inhalt darunter.
   Chrome kennt keine echte Notch: Die Höhe der Statusleiste wird mit --sat: 47px (Dynamic Island) nachgestellt,
   die installierte App mit der Klasse sa-wrap (setzt die App selbst bei display-mode: standalone). */
R.file = 'statusbar';
async function wrapped(theme = 'light'){
  const a = await boot(); makePlan(a, SCEN[0].d);
  a.$(`S.theme = '${theme}'; save(); document.documentElement.style.setProperty('--sat', '47px'); document.documentElement.classList.add('sa-wrap'); render();`);
  return a;
}
const css = (a, el, p) => a.w.getComputedStyle(el).getPropertyValue(p);

test('Statusleisten-Fläche: genau 47 px, deckend in der Kopfzeilenfarbe, hell und dunkel', async () => {
  for (const [th, rgb] of [['light', 'rgb(7, 23, 71)'], ['dark', 'rgb(7, 19, 52)']]) {
    const a = await wrapped(th), sb = a.w.document.querySelector('.sbar'), r = sb.getBoundingClientRect();
    eq([r.top, r.height], [0, 47], th + ': Lage'); eq(css(a, sb, 'background-color'), rgb, th + ': Farbe deckend');
    eq(css(a, sb, 'position'), 'fixed'); ok(+css(a, sb, 'z-index') >= 90, 'über allen Ansichten');
    const brand = a.w.document.querySelector('.brand'); eq(css(a, brand, 'background-color'), rgb, th + ': gleiche Farbe wie die Kopfzeile');
  }
});

test('Nirgends Unschärfe oder Verlauf am oberen Rand', async () => {
  const a = await wrapped(); const bad = [...a.w.document.querySelectorAll('*')].filter(el => { const f = css(a, el, 'backdrop-filter'), w = css(a, el, '-webkit-backdrop-filter'); return (f && f !== 'none') || (w && w !== 'none'); });
  eq(bad.map(e => e.className || e.tagName), []); eq(css(a, a.w.document.querySelector('.sbar'), 'background-image'), 'none', 'kein Verlauf');
});

test('Installierte App: Inhalt scrollt in #sc unter einer klaren Kante', async () => {
  const a = await wrapped(), d = a.w.document, sc = d.getElementById('sc');
  eq(sc.getBoundingClientRect().top, 47, 'Scrollbereich beginnt unter der Statusleiste'); eq(css(a, sc, 'overflow-y'), 'auto');
  eq(css(a, d.body, 'overflow-y'), 'hidden', 'Seite selbst scrollt nicht (body)'); ok(css(a, d.documentElement, 'overflow-y') !== 'hidden', 'html ohne overflow:hidden (iOS 26: sonst zu kurzer Anzeigebereich)'); ok(/min-height:min\(100lvh/.test(a.w.document.documentElement.outerHTML.replace(/\s+/g, '').replace(/min\(100lvh,/, 'min(100lvh,')) || /100lvh/.test([...d.querySelectorAll('style')].map(x => x.textContent).join('')), 'Mindesthöhe für den vollen Anzeigebereich'); eq(css(a, d.documentElement, 'padding-top'), '0px');
  a.page('week'); sc.scrollTop = 400; ok(sc.scrollTop > 0, 'lässt sich scrollen'); a.w.goPg('logbook'); eq(sc.scrollTop, 0, 'Seitenwechsel springt nach oben');
  a.noErrors();
});

test('Vollflächige Ansichten beginnen unter der Statusleiste (Übungssequenz)', async () => {
  const a = await boot(); makePlan(a, SCEN[2].d); a.$("document.documentElement.style.setProperty('--sat', '47px'); document.documentElement.classList.add('sa-wrap'); render();");
  a.w.sqOpen('str', +a.$('Object.keys(strMap)[0]')); const ov = a.w.document.querySelector('.sqov'); ok(ov, 'Sequenz offen'); eq(ov.getBoundingClientRect().top, 47); a.noErrors();
});

test('Begriffserklärung erscheint auch nach dem Scrollen an der richtigen Stelle', async () => {
  const a = await wrapped(); a.page('state'); const sc = a.w.document.getElementById('sc'); sc.scrollTop = 200;
  const g = a.w.document.querySelector('#app .gl'); ok(g, 'Begriff mit Erklärung vorhanden'); a.w.glShow(g);
  const tip = a.w.document.querySelector('.gltip'), r = g.getBoundingClientRect(), t = tip.getBoundingClientRect();
  ok(Math.abs(t.top - (r.bottom + 8)) < 2 || Math.abs(t.bottom - (r.top - 8)) < 2, `Tooltip am Begriff (${Math.round(t.top)} / ${Math.round(r.bottom)})`);
});

test('Im Browser (nicht installiert) bleibt alles wie bisher', async () => {
  const a = await boot(); makePlan(a, SCEN[0].d); const d = a.w.document, sc = d.getElementById('sc');
  ok(!d.documentElement.classList.contains('sa-wrap'), 'kein App-Modus'); eq(css(a, sc, 'position'), 'static'); eq(css(a, sc, 'overflow-y'), 'visible');
  eq(d.querySelector('.sbar').getBoundingClientRect().height, 0, 'ohne Notch keine Fläche');
});
