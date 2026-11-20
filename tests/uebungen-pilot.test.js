/* Übungen-Pilot: neue Figur (exB…) und gegliederter Text im Übungsfenster für 6 Übungen */
R.file = 'uebungen-pilot';
const PILOT = ['clam', 'deadbug', 'pallof', 'hip9090', 'openbook', 'thread'];
/* Kraftübungen mit Video, aber ohne gegliederte Felder (q, a, b …) */
const KRAFT = ['squat', 'bss', 'calf', 'plank'];

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
  a.$(`openEx('rdl')`); ok(a.$(`document.querySelectorAll('.exov .exbstep').length`) === 0 && /So geht's/.test(a.text()), 'andere Übungen: alte Darstellung');
  a.$('closeEx()'); a.noErrors();
});

/* Bodenkontakt: Nichts sinkt in die Matte, und was aufliegen soll (benannt über data-p), liegt in jedem Zwischenbild auf.
   Tiefster Punkt je Element über die Bildschirm-Matrix: Linie = Endpunkte + halbe Strichbreite (runde Enden), Kreis = Mitte + r. */
function exLowest(w, id, k){
  const NS = 'http://www.w3.org/2000/svg', svg = w.document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', w.eval('exVB')(id)); svg.style.cssText = 'position:fixed;left:0;top:0;width:340px;visibility:hidden';
  svg.innerHTML = w.exFrameAt(w.exTpl(id), k); w.document.body.appendChild(svg);
  const inv = svg.getScreenCTM().inverse(), mat = svg.querySelector('.exbmat'), cu = svg.querySelector('.exbcu');
  const fy = mat ? +mat.getAttribute('y') : 158, cy = cu ? +cu.getAttribute('y') : fy;
  const low = el => {
    const M = inv.multiply(el.getScreenCTM()), P = (x, y) => new w.DOMPoint(x, y).matrixTransform(M).y, cs = w.getComputedStyle(el), sw = cs.stroke !== 'none' ? parseFloat(cs.strokeWidth) / 2 : 0, A = n => +el.getAttribute(n) || 0;
    if (el.tagName === 'line') return Math.max(P(A('x1'), A('y1')), P(A('x2'), A('y2'))) + sw;
    if (el.tagName === 'circle') return P(A('cx'), A('cy')) + A('r');
    if (el.tagName === 'path') { const b = el.getBBox(); return Math.max(P(b.x, b.y + b.height), P(b.x + b.width, b.y + b.height), P(b.x, b.y), P(b.x + b.width, b.y)); }
    if (el.tagName === 'rect') return Math.max(P(A('x'), A('y') + A('height')), P(A('x') + A('width'), A('y') + A('height'))) + sw;
    return -1e9;
  };
  /* Trennränder (exbol, Rand von Kreisen und Füßen) haben Hintergrundfarbe und zählen nicht */
  const vis = [...svg.querySelectorAll('.exb line, .exb circle, .exb rect, .exb path.exbft')].filter(el => !el.closest('.exbpull') && !el.classList.contains('exbmat') && !el.classList.contains('exbol'));
  const sinks = vis.map(el => low(el) - fy).filter(d => d > .6).map(d => d.toFixed(1));
  const parts = [...svg.querySelectorAll('[data-p]')].map(g => { const p = g.dataset.p, l = Math.max(...[...g.querySelectorAll('line, circle, path.exbft')].filter(el => !el.classList.contains('exbol')).map(low));
    return {p, gap:+((p === 'head' && cu ? cy : fy) - l).toFixed(1)}; });
  /* Kopf hängt am Rumpf: Abstand Kopfmitte zur nächsten Rumpflinie höchstens Kopfradius + halbe Rumpfbreite */
  const hc = svg.querySelector('.exbhd circle'), H = hc && new w.DOMPoint(0, 0).matrixTransform(inv.multiply(hc.getScreenCTM()));
  const neck = !H ? 0 : Math.min(...[...svg.querySelectorAll('.exbt line:not(.exbol)')].map(el => { const M = inv.multiply(el.getScreenCTM()), A = n => +el.getAttribute(n) || 0,
    p = new w.DOMPoint(A('x1'), A('y1')).matrixTransform(M), q = new w.DOMPoint(A('x2'), A('y2')).matrixTransform(M), dx = q.x - p.x, dy = q.y - p.y,
    t = Math.max(0, Math.min(1, ((H.x - p.x) * dx + (H.y - p.y) * dy) / (dx * dx + dy * dy || 1))), d = Math.hypot(p.x + t * dx - H.x, p.y + t * dy - H.y);
    return d - +hc.getAttribute('r') - parseFloat(w.getComputedStyle(el).strokeWidth) / 2; }));
  svg.remove(); return {sinks, parts, neck};
}
const EX_KONTAKT = {deadbug:{back:1, head:1}, pallof:{foot:1, post:1}, clam:{leg:1, trunk:1}, hip9090:{hand:1, seat:1, leg:1},
  openbook:{bot:1, head:1, hand:[1]}, thread:{knee:1, hand:1, head:[1], arm:[1]}};

test('Pilotübungen: kein Körperteil schwebt oder sinkt in den Boden, der Kopf hängt am Rumpf, auch in den Zwischenbildern', async () => {
  const a = await boot(), bad = [];
  PILOT.forEach(id => {
    const spec = EX_KONTAKT[id], seen = new Set();
    for (let i = 0; i <= 8; i++) { const k = i / 8, r = exLowest(a.w, id, k);
      if (r.sinks.length) bad.push(`${id} k=${k}: sinkt ${r.sinks.join(', ')}`);
      if (r.neck > .5) bad.push(`${id} k=${k}: Kopf ${r.neck.toFixed(1)} vom Rumpf getrennt`);
      r.parts.forEach(({p, gap}) => { seen.add(p); const s = spec[p]; if (s && (s === 1 || s.includes(k)) && Math.abs(gap) > .8) bad.push(`${id} k=${k}: ${p} Abstand ${gap}`); });
    }
    Object.keys(spec).forEach(p => { if (!seen.has(p)) bad.push(`${id}: Teil ${p} fehlt`); });
  });
  eq(bad.slice(0, 12), []); a.noErrors();
});

test('Animation mit Mittelbild: gleiche Struktur, Hälfte zeigt genau das Mittelbild', async () => {
  const a = await boot();
  ['thread', 'openbook', 'hip9090'].forEach(id => { const T = a.w.exTpl(id);
    ok(T.ok && Array.isArray(T.nm), `${id}: Mittelbild vorhanden und passend`);
    const re = /(?<![A-Za-z])-?\d+(?:\.\d+)?/g, h = (a.w.exFrameAt(T, .5).match(re) || []).map(Number);
    ok(h.length === T.nm.length && h.every((x, i) => Math.abs(x - T.nm[i]) < .06), `${id}: k = 0,5 ist das Mittelbild`); });
  const T = a.w.exTpl('deadbug'); ok(T.ok && T.nm === null, 'ohne Mittelbild wie bisher');
  /* Zahlen direkt hinter einem Buchstaben oder Dezimalpunkt würden beim Überblenden zerlegt (z. B. "L9.0" → "L9.0.0") */
  PILOT.forEach(id => { const h = a.w.exFrameAt(a.w.exTpl(id), .37); ok(!/\d\.\d+\.\d/.test(h), `${id}: Zahlen im Zwischenbild unversehrt`); });
  a.noErrors();
});

/* Übungsvideos: gerenderte 3D-Figur für die Pilot- und Kraftübungen, gezeichnete Figur als Rückfall */
test('Übungsvideos: Dateien vorhanden, Fenster zeigt Video, Schritt hält es an, Rückfall auf die gezeichnete Figur', async () => {
  const a = await boot(), ids = a.$('Object.keys(EXVID)');
  eq(ids.slice().sort(), [...PILOT, ...KRAFT].sort(), 'Videos für genau die Pilot- und Kraftübungen');
  for (const id of ids) for (const ext of ['mp4', 'jpg']) {
    const r = await fetch(`../public/img/uebungen/${id}.${ext}`, {cache:'no-store'}), n = r.ok ? (await r.blob()).size : 0;
    ok(r.ok && n > 5000 && n < 400000, `${id}.${ext} vorhanden und klein genug (${n} Bytes)`);
    const c = a.$(`EXVID['${id}']`); ok(c.h > c.p[0] && c.h < c.p[1], `${id}: Endposition liegt im Fenster der Phase 1`);
  }
  a.$(`openEx('deadbug')`);
  ok(a.$(`!!document.querySelector('.exov video[data-exv="deadbug"][muted][playsinline][loop]')`), 'Video im Übungsfenster, stumm und ohne Vollbild');
  ok(a.$(`!document.querySelector('.exov .exbleg')`) && /Bewegungsablauf vereinfacht/.test(a.text()), 'keine Zonen-Legende, passender Hinweistext');
  a.$('exHoldTap(1)'); a.$('exVidSync()');
  ok(a.$(`document.querySelector('.exov video').paused`) && a.$(`[...document.querySelectorAll('.exov .exph')].map(x => x.classList.contains('on')).join()`) === 'false,true', 'Schritt hält das Video in Phase 1 an');
  a.$(`exVidFail(document.querySelector('.exov video'))`);
  ok(a.$(`!document.querySelector('.exov video') && !!document.querySelector('.exov g[data-ex="deadbug"]')`) && a.$(`exVidOk('deadbug')`) === false, 'fällt das Video aus, erscheint die gezeichnete Figur');
  a.$(`delete exVidBad.deadbug; closeEx()`);
  ok(a.$(`(exLibrary().match(/<img class="exvid"/g) || []).length`) === ids.length, 'Übungsübersicht zeigt die Startbilder');
  a.$(`openEx('rdl')`); ok(a.$(`!document.querySelector('.exov video') && !!document.querySelector('.exov g[data-ex="rdl"]')`), 'andere Übungen unverändert'); a.$('closeEx()');
  await a.w.i18nLoad(); ok(a.$(`I18N[iNorm('Die Animation zeigt den Bewegungsablauf vereinfacht.').k] != null`), 'Englisch für den Hinweistext');
  a.noErrors();
});

/* Rückfall bei den Kraftübungen: Bild 0 der gezeichneten Figur gehört zu cap[0], Bild 1 zu cap[1] (calf und plank wurden umgestellt) */
test('Kraftvideos: fällt das Video aus, passt die gezeichnete Figur zur Bildunterschrift', async () => {
  const a = await boot();
  const CAP0 = {calf:/^Unten: Ferse tief/, plank:/^Start: auf den Unterarmen/}, CAP1 = {calf:/^Oben: auf den Zehen/, plank:/^Körper heben: gerade Linie/};
  for (const id of ['calf', 'plank']) {
    const cap = a.$(`EXI['${id}'].cap`);
    ok(CAP0[id].test(cap[0]) && CAP1[id].test(cap[1]), `${id}: Reihenfolge der Bildunterschrift (${cap.join(' | ')})`);
    a.$(`openEx('${id}')`);
    ok(a.$(`!!document.querySelector('.exov video[data-exv="${id}"]')`), `${id}: zuerst das Video`);
    a.$(`exVidFail(document.querySelector('.exov video'))`);
    ok(a.$(`!document.querySelector('.exov video') && !!document.querySelector('.exov g[data-ex="${id}"]')`) && a.$(`exVidOk('${id}')`) === false, `${id}: gezeichnete Figur nach Ausfall`);
    const st = ts => { a.$(`cancelAnimationFrame(_exRaf); _exRaf = 0; exTick(${ts})`);
      return {g:a.$(`document.querySelector('.exov g[data-ex="${id}"]').innerHTML`),
        on:a.$(`[...document.querySelectorAll('.exov .exph')].filter(x => x.classList.contains('on')).map(x => x.dataset.ph + ':' + x.textContent)`)}; };
    const T = a.w.exTpl(id), s0 = st(100), s1 = st(2400);
    ok(T.ok, `${id}: Animation (exTpl.ok)`);
    eq(s0.on, ['0:' + cap[0]], `${id}: Bild 0 zeigt cap[0]`);
    eq(s1.on, ['1:' + cap[1]], `${id}: Bild 1 zeigt cap[1]`);
    /* gleiche Serialisierung wie im Fenster: Bild als SVG-Gruppe einlesen und wieder auslesen */
    const ser = k => a.$(`(() => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = exFrameAt(exTpl('${id}'), ${k}); return g.innerHTML; })()`);
    ok(s0.g === ser(0) && s1.g === ser(1) && s0.g !== s1.g, `${id}: Figur wechselt zwischen Bild 0 und Bild 1`);
    a.$(`delete exVidBad['${id}']; closeEx()`);
  }
  /* Inhalt der Bilder: calf Bild 0 Ferse unten (Knöchel y 146), Bild 1 auf den Zehen (y 132); plank Bild 0 Hüfte nah am Boden (y 150), Bild 1 gerader Stütz (y 141) */
  const c = a.w.exTpl('calf'), p = a.w.exTpl('plank');
  ok(c.A.includes('76,146 90,144') && c.B.includes('76,132 90,144'), 'calf: zuerst unten, dann oben');
  const hip = h => { const m = h.match(/(?<![\d.])88,(\d+(?:\.\d+)?)/); return m ? +m[1] : NaN; };
  ok(hip(p.A) > hip(p.B), `plank: Bild 0 Hüfte tiefer als Bild 1 (${hip(p.A)} / ${hip(p.B)})`);
  a.noErrors();
});
