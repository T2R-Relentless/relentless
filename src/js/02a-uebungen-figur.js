/* ---------- Übungsfigur mit Körperform (exB…): Pilot für 6 Übungen, wiederverwendbar für alle weiteren ----------
   Aufbau: Jede Gliedmaße ist eine Kette aus verschachtelten Gruppen (translate + rotate) mit dicken Strichen und runden
   Enden. exBLimb rechnet aus Gelenkpunkten Längen und Winkel. Start- und Endbild (EXP[id][0] und [1]) haben dieselbe
   Struktur, exTpl/exTick überführen nur die Zahlen: Winkel drehen, Gliedmaßen behalten ihre Länge, Bögen laufen als Bogen.
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
   Gliedmaße vor Rumpf oder anderem Bein lesbar bleibt. */
function exBLimb(pts, o = {}){
  if (o.halo) return `<g class="exbo">${exBLimb(pts, {...o, halo:0, z:''})}</g>` + exBLimb(pts, {...o, halo:0});
  let s = '', abs = 0, L0 = 0, n = 0; const w = o.w || [];
  for (let i = 0; i < pts.length - 1; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), a = exBAng(pts[i], pts[i + 1]), r = (i ? exBNorm(a - abs) : a) + (w[i] || 0);
    s += `<g transform="translate(${i ? exBf(L0) + ' 0' : exBf(pts[0][0]) + ' ' + exBf(pts[0][1])}) rotate(${exBf(r)})"><line x2="${exBf(L)}" y2="0"/>${i === 0 && o.z ? o.z : ''}`;
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
    exBG('exbt', exBLimb([H, S])), exBZone([74, 140.5], 16, 5.5), exBHead([38, 144], -90),
    exBG('exbn', exBLimb(ph ? leg(H, -15, -7) : leg(H, -90, 0), {end:'f', fa:-90, halo:1})));
}
/* Pallof Press, Seitenansicht: Band schräg nach hinten zur fernen Seite, Zugpfeil zeigt die Zugrichtung */
function exBPallof(ph){
  const H = [80, 89], S = [80, 49], d = [-4, 0], A = [98, 40];
  const leg = P => { const K = exBPol(P, 34, 80); return [P, K, exBPol(K, 33, 98)]; };
  const arm = P => { const E = exBPol(P, 19, ph ? 5 : 65); return [P, E, exBPol(E, 17, ph ? 5 : -52)]; };
  /* Befestigung auf der fernen Seite (gedeckt, etwas höher = in der Tiefe) etwa auf Höhe der Hände; Band kurz schräg in die Tiefe */
  const hd = arm(S)[2], a = exBAng(hd, A), L = Math.hypot(A[0] - hd[0], A[1] - hd[1]), p = exBPol(exBPol(hd, 3, a), 7, a + 90), q = exBPol(exBPol(hd, Math.max(9, L - 3), a), 7, a + 90);
  return exBFig(
    exBG('exbf', `<line x1="98" y1="128" x2="98" y2="32"/><line x1="91" y1="128" x2="105" y2="128"/>`, exBLimb(leg(exBPt(H, d)), {end:'f', fa:-98}), exBLimb(arm(exBPt(S, d)), {end:'h'})),
    exBG('exbt', exBLimb([H, S])), exBZone([80, 72], 7.5, 12), exBHead([80, 36], 0),
    exBG('exbn', exBLimb(leg(H), {end:'f', fa:-98}), exBLimb(arm(S), {end:'h'})),
    `<line class="exbband" x1="${exBf(hd[0])}" y1="${exBf(hd[1])}" x2="${A[0]}" y2="${A[1]}"/><circle class="exbanc" cx="${A[0]}" cy="${A[1]}" r="3"/>`, exBPull(p, q));
}
/* Clamshell, Ansicht von vorn auf die Seitlage: oberes Knie öffnet, Füße bleiben zusammen, Becken bleibt senkrecht */
function exBClam(ph){
  const Hb = [96, 147.5], Ht = [96, 136], Sb = [52, 147];
  return exBFig(exBMat(),
    exBG('exbf', exBLimb([Hb, [120, 147.5], [143, 147.5]], {end:'f', fl:6}), exBLimb([Sb, [33, 148], [16, 146]], {end:'h'})),
    exBG('exbt exbw', exBLimb([[94, 141], [54, 141]])), exBZone([97, 130.5], 10, 6), exBHead([31, 138.5], null),
    exBG('exbn', exBLimb([[56, 130], [73, 130], [89, 131.5]], {end:'h', halo:1}), exBLimb([Ht, ph ? [120, 119] : [120, 140.5], [143, 141]], {end:'f', fl:6, halo:1})));
}
/* 90/90 Hüftwechsel, Ansicht von vorn: beide Knie kippen wie Scheibenwischer über oben zur anderen Seite (Knie nach
   rechts der Person = im Bild links). Die Oberschenkel drehen über oben (w), die Füße bleiben unten. */
function exBHip9090(ph){
  /* R und L sind aus Bildsicht benannt (R = rechts im Bild = linkes Bein der Person). Bild 0: Knie nach rechts der Person,
     also im Bild beide Knie links; Bild 1 spiegelbildlich. Der Bogenpfeil zeigt die Scheibenwischer-Bewegung. */
  const R = [91, 144], L = [79, 144], w = ph ? [] : [-360, 360];
  const r = ph ? [R, [130, 148], [104, 154]] : [R, [74, 150], [100, 148]], l = ph ? [L, [96, 150], [70, 148]] : [L, [40, 148], [66, 154]];
  return exBFig(exBMat(), exBArc([34, 134], [85, 84], [136, 134]),
    exBG('exbf', exBLimb([[76, 106], [67, 126.5], [58, 147]], {end:'h'}), exBLimb([[94, 106], [103, 126.5], [112, 147]], {end:'h'})),
    exBG('exbt exbw', exBLimb([[85, 143], [85, 105]])), exBZone([85, 140], 17, 6.5), exBHead([85, 88], null),
    exBG('exbn', exBLimb(l, {w, end:'f', fl:5, halo:1}), exBLimb(r, {w, end:'f', fl:5, halo:1})));
}
/* Open Book, Blick vom Kopfende: oberer Arm läuft im Halbkreis über oben zur anderen Seite, der Brustkorb dreht mit,
   Knie (gedeckt, dahinter) bleiben übereinander am Boden */
function exBOpenbook(ph){
  const c = p => [86 + (p[0] - 86) * 1.35, 152 + (p[1] - 152) * 1.35], Sb = c([86, 142]), St = ph ? exBPol(Sb, 28, -160) : c([86, 121]), hd = ph ? exBPol(St, 47, 182) : c([116, 139]);
  return exBFig(exBMat(),
    exBG('exbf', exBLimb([c([88, 141]), c([113, 143])]), exBLimb([c([88, 129]), c([113, 136])]), exBLimb([Sb, [(Sb[0] + 134) / 2, (Sb[1] + 147.5) / 2], [134, 147.5]], {end:'h'})),
    exBG('exbt', exBLimb([Sb, St], {z:exBZoneL(17, 6, 12, 8)})), exBCush(70, 143, 32, 9), exBHead(ph ? [81, 134.5] : [86, 134.5], ph ? -170 : 0),
    exBG('exbn', exBLimb([St, exBPt(St, [(hd[0] - St[0]) / 2, (hd[1] - St[1]) / 2]), hd], {end:'h', halo:1})));
}
/* Thread the Needle, Seitenansicht: naher Arm dreht zur Decke (Bild 1) und fädelt unter dem Körper durch (Bild 2),
   der ferne Arm stützt und beugt sich, die Hüfte bleibt über den Knien */
function exBThread(ph){
  const H = [112, 114.5], K = [112, 148.5], A = [145, 148.5], d = [-4, -2], Hs = [66, 148];
  const Sm = ph ? [72, 128] : [70, 113], Sn = ph ? [70, 146] : [70, 104], Sf = ph ? [74, 123] : [66, 112];
  /* Bild 2: der Arm geht in die Tiefe unter den Stützarm durch, deshalb stark verkürzt nahe der Schulter */
  const arm = ph ? [Sn, [66.5, 147], [62, 148]] : [Sn, [70, 85], [70, 68]];
  return exBFig(exBMat(),
    exBG('exbf', exBLimb([exBPt(H, d), exBPt(K, d), exBPt(A, d)], {end:'f', fl:6}), exBLimb([Sf, ph ? exBIK(Sf, Hs, 19, 17, 'r') : [66, 131], Hs], {end:'h'})),
    exBG('exbt', exBLimb([H, Sm], {w:ph ? [-360] : [], z:exBZoneL(31, 5.5, 10, 5)})), exBHead(ph ? [51, 143.5] : [57, 112], ph ? -340 : -90),
    exBG('exbn', exBLimb([H, K, A], {end:'f', fl:6}), exBLimb(arm, {w:ph ? [-360] : [], end:'h', halo:1, z:exBZoneL(1, 0, 6, 6)})));
}
