/* ---------- Übungsfigur mit Körperform (exB…): Pilot für 6 Übungen, wiederverwendbar für alle weiteren ----------
   Aufbau: Jede Gliedmaße ist eine Kette aus verschachtelten Gruppen (translate + rotate) mit dicken Strichen und runden
   Enden. exBLimb rechnet aus Gelenkpunkten Längen und Winkel. Start-, End- und optional Mittelbild (EXP[id][0], [1], [2])
   haben dieselbe Struktur, exTpl/exFrameAt überführen nur die Zahlen: Winkel drehen, Gliedmaßen behalten ihre Länge, Bögen laufen als Bogen.
   Ebenen von hinten nach vorn: Matte/Geräte → ferne Seite gedeckt (exbf) → Rumpf (exbt) → Zielmuskel (exbz) → Kopf →
   nahe bzw. bewegte Seite kräftig (exbn). Farben nur über Klassen in app.css (hell und dunkel). */
const exBf = n => (Math.abs(n) < .05 ? 0 : n).toFixed(1);
const exBAng = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
const exBNorm = a => ((a + 180) % 360 + 360) % 360 - 180;
const exBPol = (p, l, a) => [p[0] + l * Math.cos(a * Math.PI / 180), p[1] + l * Math.sin(a * Math.PI / 180)];
/* Ellbogen/Knie aus Schulter/Hüfte P und Hand/Fuß T (Längen l1, l2); dir: 'u' Gelenk oben, 'd' unten, 'l' links, 'r' rechts */
function exBIK(P, T, l1, l2, dir){
  let dx = T[0] - P[0], dy = T[1] - P[1], d = Math.hypot(dx, dy); const mx = l1 + l2 - .01; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d, uy = dy / d, m = [P[0] + ux * a, P[1] + uy * a];
  const k1 = [m[0] - uy * h, m[1] + ux * h], k2 = [m[0] + uy * h, m[1] - ux * h]; const i = dir === 'l' || dir === 'r' ? 0 : 1, lo = dir === 'u' || dir === 'l'; return (k1[i] < k2[i]) === lo ? k1 : k2;
}
/* Gliedmaße aus Gelenkpunkten [Wurzel, Gelenk …, Ende]. o.end: 'h' Hand, 'f' Fuß (o.fa = Fußwinkel zum letzten Glied, o.fl Länge);
   o.w: Zusatzdrehung je Glied (±360 für lange Bögen, damit der Arm außen herum läuft); o.z: Inhalt im Rahmen des ersten Glieds
   (x entlang des Glieds), z. B. eine Zielzone, die sich mitdreht; o.halo: Rand in Hintergrundfarbe darunter, damit die
   Gliedmaße vor Rumpf oder anderem Bein lesbar bleibt; o.h0: Hand an der Wurzel (Stützarm, der an der Hand am Boden
   verankert ist); o.p: Name des Körperteils (data-p) für die Bodenprüfung im Test.
   Regel gegen schwebende Körperteile: Was am Boden liegt oder stützt, ist die Wurzel der Kette (Knie, Stützhand), dann
   bleibt es auch in den Zwischenbildern genau am Boden. */
function exBLimb(pts, o = {}){
  if (o.halo) return `<g class="exbo">${exBLimb(pts, {...o, halo:0, z:'', p:''})}</g>` + exBLimb(pts, {...o, halo:0});
  if (o.p) return `<g data-p="${o.p}">${exBLimb(pts, {...o, p:''})}</g>`;
  let s = '', abs = 0, L0 = 0, n = 0; const w = o.w || [];
  for (let i = 0; i < pts.length - 1; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), a = exBAng(pts[i], pts[i + 1]), r = (i ? exBNorm(a - abs) : a) + (w[i] || 0);
    s += `<g transform="translate(${i ? exBf(L0) + ' 0' : exBf(pts[0][0]) + ' ' + exBf(pts[0][1])}) rotate(${exBf(r)})"><line x2="${exBf(L)}" y2="0"/>${i === 0 && o.h0 ? '<circle r="4"/>' : ''}${i === 0 && o.z ? o.z : ''}`;
    abs = a; L0 = L; n++;
  }
  if (o.end === 'h') s += `<circle cx="${exBf(L0)}" cy="0" r="4"/>`;
  if (o.end === 'f') s += `<g transform="translate(${exBf(L0)} 0) rotate(${exBf(o.fa || 0)})"><line x2="${exBf(o.fl || 9)}" y2="0" class="exbft"/></g>`;
  return s + '</g>'.repeat(n);
}
/* Kopf als Kreis; g = Blickrichtung in Grad (kleine Nase), null = Blick zur Kamera */
const exBHead = (p, g) => `<g class="exbhd" transform="translate(${exBf(p[0])} ${exBf(p[1])}) rotate(${exBf(g || 0)})"><circle r="8.5"/>${g === null ? '' : '<line x1="8" x2="11" y2="0"/>'}</g>`;
const exBZone = (p, rx, ry, rot) => `<ellipse class="exbz" cx="${exBf(p[0])}" cy="${exBf(p[1])}" rx="${exBf(rx)}" ry="${exBf(ry)}" transform="rotate(${exBf(rot || 0)} ${exBf(p[0])} ${exBf(p[1])})"/>`;
const exBZoneL = (cx, cy, rx, ry) => `<ellipse class="exbz" cx="${exBf(cx)}" cy="${exBf(cy)}" rx="${exBf(rx)}" ry="${exBf(ry)}"/>`;
const exBMat = (x = 6, w = 158) => `<rect class="exbmat" x="${x}" y="152" width="${w}" height="6"/>`;
const exBCush = (x, y, w, h) => `<rect class="exbcu" x="${exBf(x)}" y="${exBf(y)}" width="${exBf(w)}" height="${exBf(h)}" rx="3"/>`;
/* Zugpfeil (bleibt in der Animation sichtbar, anders als exArrow) */
const exBPull = (p, q) => { const a = exBAng(p, q), h1 = exBPol(q, 5, a + 150), h2 = exBPol(q, 5, a - 150);
  return `<g class="exbpull"><line x1="${exBf(p[0])}" y1="${exBf(p[1])}" x2="${exBf(q[0])}" y2="${exBf(q[1])}"/><polyline points="${exBf(h1[0])},${exBf(h1[1])} ${exBf(q[0])},${exBf(q[1])} ${exBf(h2[0])},${exBf(h2[1])}"/></g>`; };
/* Doppelpfeil im Bogen (z. B. Scheibenwischer): von p0 über Kontrollpunkt c nach p1, Spitzen an beiden Enden */
const exBArc = (p0, c, p1) => { const h = (q, a) => { const u = exBPol(q, 5, a + 150), v = exBPol(q, 5, a - 150); return `<polyline points="${exBf(u[0])},${exBf(u[1])} ${exBf(q[0])},${exBf(q[1])} ${exBf(v[0])},${exBf(v[1])}"/>`; };
  return `<g class="exbpull"><path d="M${exBf(p0[0])} ${exBf(p0[1])} Q${exBf(c[0])} ${exBf(c[1])} ${exBf(p1[0])} ${exBf(p1[1])}"/>${h(p0, exBAng(c, p0))}${h(p1, exBAng(c, p1))}</g>`; };
/* Ebenen zusammensetzen: cls 'exbf' = ferne Seite gedeckt, 'exbn' = nahe/bewegte Seite kräftig, 'exbt' = Rumpf */
const exBG = (cls, ...parts) => `<g class="${cls}">${parts.join('')}</g>`;
const exBFig = (...parts) => `<g class="exb">${parts.join('')}</g>`;
const exBPt = (p, d) => [p[0] + d[0], p[1] + d[1]];
/* Körperteil benennen (data-p, nur Buchstaben) für die Bodenprüfung im Test */
const exBP = (p, s) => `<g data-p="${p}">${s}</g>`;
/* Übungen mit gegliedertem Text (q, a, b …): fehlendes s aus b ableiten; läuft nach allen EXI-Definitionen (Ende 43c),
   exModal ruft es zur Sicherheit noch einmal auf */
function exBFillS(){ try { Object.values(EXI).forEach(e => { if (e && Array.isArray(e.b) && !Array.isArray(e.s)) e.s = e.b.map(x => x[0]); }); } catch (err) { elog(err); } }
/* Bildausschnitt: EXI[id].vb engt den Ausschnitt ein (liegende Übungen ohne Leerraum oben), sonst die volle Fläche */
const exVB = id => (EXI[id] && EXI[id].vb) || '0 0 170 165';

/* ---------- Figuren der Pilotübungen (ph 0 = Bild cap[0], ph 1 = Bild cap[1]); Winkel laut fachlicher Vorgabe ---------- */
/* Dead Bug, Seitenansicht: ferner Arm und nahes Bein bewegen sich (kräftig), das andere Paar bleibt (gedeckt) */
function exBDeadbug(ph){
  const H = [94, 145.5], S = [52, 145.5], d = [4, -2], Hf = exBPt(H, d), Sf = exBPt(S, d);
  const arm = (P, a) => [P, exBPol(P, 19, a), exBPol(P, 36, a)], leg = (P, th, sh) => { const K = exBPol(P, 34, th); return [P, K, exBPol(K, 33, sh)]; };
  return exBFig(exBMat(),
    exBG('exbf', exBLimb(leg(Hf, -90, 0), {end:'f', fa:-90}), exBLimb(arm(S, -90), {end:'h'})),
    exBG('exbn', exBLimb(arm(Sf, ph ? -170 : -90), {end:'h'})),
    exBG('exbt', exBLimb([H, S], {p:'back'})), exBZone([74, 140.5], 16, 5.5), exBP('head', exBHead([38, 143.5], -90)),
    exBG('exbn', exBLimb(ph ? leg(H, -15, -7) : leg(H, -90, 0), {end:'f', fa:-90, halo:1})));
}
/* Pallof Press, Seitenansicht: Band schräg nach hinten zur fernen Seite, Zugpfeil zeigt die Zugrichtung */
function exBPallof(ph){
  const H = [80, 89], S = [80, 49], d = [-4, 0], A = [88, 42], Ft = [82, 154.2];
  /* Bein vom Fußgelenk (am Boden) zur Hüfte, Fuß als kurzer Strich nach vorn: so steht die Figur genau auf der Linie */
  const leg = (F, P) => exBP('foot', exBLimb([F, exBIK(F, P, 33, 34, 'r'), P]) + `<line x1="${exBf(F[0])}" y1="155.5" x2="${exBf(F[0] + 9)}" y2="155.5" class="exbft"/>`);
  const arm = P => { const E = exBPol(P, 19, ph ? 5 : 65); return [P, E, exBPol(E, 17, ph ? 5 : -52)]; };
  /* Befestigung auf der fernen Seite (gedeckt, etwas höher = in der Tiefe) etwa auf Höhe der Hände; Band kurz schräg in die Tiefe */
  const hd = arm(S)[2], a = exBAng(hd, A), L = Math.hypot(A[0] - hd[0], A[1] - hd[1]), p = exBPol(exBPol(hd, 3, a), 7, a + 90), q = exBPol(exBPol(hd, Math.max(9, L - 3), a), 7, a + 90);
  return exBFig(
    exBG('exbf', exBP('post', `<line x1="88" y1="154.5" x2="88" y2="34"/><line x1="81" y1="154.5" x2="95" y2="154.5"/>`), leg(exBPt(Ft, d), exBPt(H, d)), exBLimb(arm(exBPt(S, d)), {end:'h'})),
    exBG('exbt', exBLimb([H, S])), exBZone([80, 72], 7.5, 12), exBHead([80, 36], 0),
    exBG('exbn', leg(Ft, H), exBLimb(arm(S), {end:'h'})),
    `<line class="exbband" x1="${exBf(hd[0])}" y1="${exBf(hd[1])}" x2="${A[0]}" y2="${A[1]}"/><circle class="exbanc" cx="${A[0]}" cy="${A[1]}" r="4"/>`, exBPull(p, q));
}
/* Clamshell, Ansicht von vorn auf die Seitlage: oberes Knie öffnet, Füße bleiben zusammen, Becken bleibt senkrecht */
function exBClam(ph){
  const Ht = [96, 136], Sb = [52, 147];
  return exBFig(exBMat(),
    exBG('exbf', exBLimb([[96, 148.5], [120, 148.5], [143, 148.5]], {end:'f', fl:6, p:'leg'}), exBLimb([Sb, [33, 148], [16, 146]], {end:'h'})),
    exBG('exbt exbw', exBLimb([[94, 141], [54, 141]], {p:'trunk'})), exBZone([97, 130.5], 10, 6), exBHead([37, 138.5], null),
    exBG('exbn', exBLimb([[56, 130], [73, 130], [89, 131.5]], {end:'h', halo:1}), exBLimb([Ht, ph ? [120, 119] : [120, 140.5], [143, 141]], {end:'f', fl:6, halo:1})));
}
/* 90/90 Hüftwechsel, Ansicht von vorn: beide Knie kippen wie Scheibenwischer über oben zur anderen Seite (Knie nach
   rechts der Person = im Bild links). Die Oberschenkel drehen über oben (w), die Füße bleiben unten. */
function exBHip9090(ph){
  /* R und L sind aus Bildsicht benannt (R = rechts im Bild = linkes Bein der Person). Bild 0: Knie nach rechts der Person,
     also im Bild beide Knie links; Mittelbild: beide Knie oben, Füße stehen; Bild 1 spiegelbildlich. Die Zusatzdrehungen w
     lassen die Oberschenkel über oben wandern und die Knie gebeugt bleiben. */
  const m = ph === .5, e = ph === 1, R = [91, 143], L = [79, 143], y = 148.3;
  /* Ketten vom Fuß (Wurzel, bleibt in jedem Zwischenbild am Boden) über das Knie zur Hüfte; kurzer Fußstrich nach außen */
  const r = e ? [[110, y], [130, y], R] : m ? [[110, y], [100, 112], R] : [[110, y], [74, y], R], wr = e || m ? [360, 360] : [0, 0];
  const l = e ? [[60, y], [96, y], L] : m ? [[60, y], [70, 112], L] : [[60, y], [40, y], L], wl = e ? [360, 360] : m ? [360, 0] : [0, 0];
  const leg = (c, w, fx) => exBP('leg', `<line x1="${exBf(c[0][0])}" y1="${y}" x2="${exBf(c[0][0] + fx)}" y2="${y}" class="exbft"/>` + exBLimb(c, {w}));
  return exBFig(exBMat(), exBArc([34, 132], [85, 82], [136, 132]),
    exBG('exbf', exBLimb([[76, 106], [67, 126.5], [58, 148]], {end:'h', p:'hand'}), exBLimb([[94, 106], [103, 126.5], [112, 148]], {end:'h', p:'hand'})),
    exBG('exbt exbw', exBLimb([[85, 141.5], [85, 105]], {p:'seat'})), exBHead([85, 90], null),
    exBG('exbo', exBLimb(l, {w:wl}), exBLimb(r, {w:wr})), exBG('exbn', leg(l, wl, e || m ? -5 : 5), leg(r, wr, e ? -5 : 5)), exBZone([85, 138.5], 17, 6.5));
}
/* Kette aus Längen und rohen Winkeln [[L, a] …]: liefert Punkte und Zusatzdrehung w für exBLimb, damit die Animation den
   gewollten Drehweg nimmt (z. B. -90 → -250 → -338: Arm von oben über außen nach unten und weiter am Boden entlang) */
function exBRaw(P, segs){
  const pts = [P], w = []; let pa = 0, pn = 0;
  segs.forEach(([L, a], i) => { const q = exBPol(pts[i], L, a), an = exBAng(pts[i], q); pts.push(q); w.push(i ? (a - pa) - exBNorm(an - pn) : a - an); pa = a; pn = an; });
  return {pts, w};
}
/* Open Book, Blick vom Kopfende: Rücken links, Brust rechts. Untere Schulter und unterer Arm liegen am Boden, der Kopf auf
   dem Kissen. Der obere Arm liegt zu Beginn auf dem unteren, läuft über oben (Mittelbild: zur Decke) und liegt am Ende auf
   der anderen Seite am Boden; der Brustkorb dreht mit. Der Kopf ist der Kamera am nächsten und liegt
   deshalb mit hellem Rand vorn.
   ph: 0 Start, .5 Arm zur Decke, 1 offen */
function exBOpenbook(ph){
  const m = ph === .5, e = ph === 1, Sb = [80, 145.5], St = exBPol(Sb, 24, e ? -150 : m ? -118 : -90), aa = e ? -203.8 : m ? -90 : 32.4, ar = exBRaw(St, [[19, aa], [17, aa]]);
  return exBFig(exBMat(), exBArc([118, 118], [70, 38], [22, 126]), exBSide(),
    exBG('exbf', exBP('bot', exBLimb([[86, 148.5], [98, 148.5], [110, 148.5]], {end:'h'}))),
    exBG('exbt', exBLimb([Sb, St], {z:exBZoneL(14, 0, 8, 5)})), exBCush(72, 142.2, 32, 9),
    exBG('exbn', exBLimb(ar.pts, {w:ar.w, end:'h', halo:1, p:'hand'})), `<circle class="exbhh" cx="86" cy="133.7" r="10"/>`, exBP('head', exBHead([86, 133.7], e ? -180 : m ? -90 : 0)));
}
/* Zusatzbild Open Book (ruht, oben rechts): Ausgangsposition von oben gesehen. Matte, Kopf auf dem Kissen, Rumpf, Hüfte und
   Knie 90° gebeugt und übereinander, beide Arme nach vorn. Klein und fein umrandet, damit es nicht mit der Animation verwechselt wird. */
const exBSide = () => `<g class="exbin" transform="translate(126 70) scale(0.36)"><rect x="0" y="0" width="100" height="72" rx="6"/><rect class="exbic" x="6" y="22" width="18" height="20" rx="3"/>
  <line x1="27" y1="32" x2="62" y2="32" class="exbit"/><line x1="62" y1="32" x2="62" y2="58"/><line x1="62" y1="58" x2="90" y2="58"/><line x1="28" y1="34" x2="28" y2="60"/><line x1="31" y1="34" x2="31" y2="60"/><circle cx="15" cy="32" r="8"/></g>`;
/* Thread the Needle, Seitenansicht: Knie, Unterschenkel und Stützhand am Boden, Hüfte bleibt über den
   Knien; am Ende liegen Schulter und Kopf auf der Matte, der Arm verschwindet unter dem Körper. */
function exBThread(ph){
  const m = ph === .5, e = ph === 1, K = [112, 148.3], H = [112, 114.5], Kf = [107, 148.5], Hf = [107, 114.5];
  const Sm = e ? [76, 138.5] : m ? [71, 121] : [70, 110], Sn = e ? [76, 140] : m ? [73, 127] : [70, 104], Fs = e ? [80, 133] : m ? [72, 121] : [66, 112], Fh = [64, 148];
  let segs; if (e) segs = [[10, 55], [9, 0]];
  else if (m) segs = [[2, -90], [2, -90]];
  else segs = [[19, -90], [17, -90]];
  /* Der Arm bewegt sich quer zur Blickrichtung: von der Seite wird er beim Absenken kurz (Mittelbild, zeigt zur Kamera)
     und liegt am Ende blass unter der Brust (ferne Ebene, unter dem Körper durchgefädelt) */
  const ar = exBRaw(Sn, segs), hd = e ? [62, 143.5] : m ? [57, 122] : [56, 108];
  return exBFig(exBMat(),
    exBG('exbf', exBP('knee', exBLimb([Kf, Hf])), exBLimb([Kf, [140, 148.5]], {end:'f', fl:6}), exBLimb([Fh, [(Fh[0] + Fs[0]) / 2, (Fh[1] + Fs[1]) / 2], Fs], {h0:1, p:'hand'})),
    exBG('exbt', exBLimb([H, Sm], {w:[e || m ? 0 : 360], z:exBZoneL(30, 0, 9, 5)})), exBP('head', exBHead(hd, null)),
    exBG('exbn', exBP('knee', exBLimb([K, H])), exBLimb([K, [145, 148.3]], {end:'f', fl:6}), `<g opacity="${e ? '0.45' : '1.0'}">${exBLimb(ar.pts, {w:ar.w, end:'h', halo:1, p:'arm'})}</g>`));
}
