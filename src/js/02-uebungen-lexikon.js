/* ---------- Übungs-Lexikon: Erklärung und Grafik pro Krafttrainingsübung ---------- */
const EXG = {GY:158, T1:34, T2:34, TR:42, FOOT:13};
function exLimb(a, b, c){ return `<polyline points="${a[0].toFixed(1)},${a[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}${c ? ' ' + c[0].toFixed(1) + ',' + c[1].toFixed(1) : ''}" fill="none"/>`; }
const exV = (a, l) => [Math.sin(a * Math.PI / 180) * l, Math.cos(a * Math.PI / 180) * l];
function exIK(H, T, l1, l2, dir){
  let dx = T[0] - H[0], dy = T[1] - H[1], d = Math.hypot(dx, dy); const mx = l1 + l2 - .5; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; T = [H[0] + dx, H[1] + dy]; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d, uy = dy / d, px = H[0] + ux * a, py = H[1] + uy * a;
  const k1 = [px - uy * h, py + ux * h], k2 = [px + uy * h, py - ux * h]; return {K:dir === 'low' ? (k1[1] > k2[1] ? k1 : k2) : dir > 0 ? (k1[0] > k2[0] ? k1 : k2) : (k1[0] < k2[0] ? k1 : k2), T};
}
/* Stehende Figur von der Seite. o: ax (Knöchel x), ay, th/sh (Winkel Oberschenkel/Unterschenkel von senkrecht nach unten, + = nach vorn), tr (Rumpfneigung), arm: [Ellbogen, Hand] relativ zur Schulter */
function exStand(o){
  const A = [o.ax, o.ay === undefined ? EXG.GY : o.ay], K = [A[0] - exV(o.sh || 0, EXG.T2)[0], A[1] - exV(o.sh || 0, EXG.T2)[1]], H = [K[0] - exV(o.th || 0, EXG.T1)[0], K[1] - exV(o.th || 0, EXG.T1)[1]];
  const tr = (o.tr || 0) * Math.PI / 180, S = [H[0] + Math.sin(tr) * EXG.TR, H[1] - Math.cos(tr) * EXG.TR], Hd = [S[0] + Math.sin(tr) * 11, S[1] - Math.cos(tr) * 11];
  let s = `<g class="ln">${exLimb(H, K, A)}${o.nofoot ? '' : `<polyline points="${A[0]},${A[1]} ${A[0] + EXG.FOOT},${A[1]}" fill="none"/>`}${exLimb(H, S)}`;
  if (o.arm) s += exLimb(S, [S[0] + o.arm[0][0], S[1] + o.arm[0][1]], [S[0] + o.arm[1][0], S[1] + o.arm[1][1]]);
  s += `</g><circle cx="${Hd[0].toFixed(1)}" cy="${Hd[1].toFixed(1)}" r="8" class="hd2"/>`;
  return {svg:s, A, K, H, S};
}
const exBox = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="eq"/>`;
const exPlate = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" class="pl"/>`;
const exArrow = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 5; return `<g class="ar"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polyline points="${x2 - h * Math.cos(a - .5)},${y2 - h * Math.sin(a - .5)} ${x2},${y2} ${x2 - h * Math.cos(a + .5)},${y2 - h * Math.sin(a + .5)}" fill="none"/></g>`; };
/* liegende/freie Figuren mit Punkten: Linien aus Punktlisten, Kopf als Kreis */
const exLines = (lines, head, extra = '') => `<g class="ln">${lines.map(l => `<polyline points="${l.map(p => p.join(',')).join(' ')}" fill="none"/>`).join('')}</g><circle cx="${head[0]}" cy="${head[1]}" r="8" class="hd2"/>${extra}`;
const exFrame = (inner, cap) => `<div class="exf"><svg viewBox="0 0 170 165" role="img" aria-label="${esc(cap)}"><line x1="4" y1="${EXG.GY}" x2="166" y2="${EXG.GY}" class="gr"/>${inner}</svg><div class="exc">${esc(cap)}</div></div>`;
const EXP = {
  squat:[() => { const f = exStand({ax:78, th:0, sh:0, tr:0, arm:[[10, 16], [4, 0]]}); return f.svg + exPlate(f.S[0] - 6, f.S[1] + 3, 8); },
         () => { const f = exStand({ax:70, th:84, sh:-36, tr:36, arm:[[10, 14], [3, 0]]}); return f.svg + exPlate(f.S[0] - 6, f.S[1] + 3, 8) + exArrow(150, 60, 150, 100); }],
  rdl:[() => { const f = exStand({ax:78, th:0, sh:0, tr:0, arm:[[0, 17], [0, 34]]}); return f.svg + exPlate(f.S[0], f.S[1] + 34, 7); },
       () => { const f = exStand({ax:78, th:20, sh:-2, tr:72, arm:[[0, 17], [0, 34]]}); return f.svg + exPlate(f.S[0], f.S[1] + 34, 7) + exArrow(30, 110, 30, 70); }],
  bss:[() => { const f = exStand({ax:104, th:35, sh:-8, tr:8, arm:[[6, 15], [10, 28]]}), r = exIK(f.H, [34, 112], 34, 34, 'low'); return exBox(12, 112, 36, 46) + `<g class="ln">${exLimb(f.H, r.K, r.T)}</g>` + f.svg; },
       () => { const f = exStand({ax:104, th:78, sh:-12, tr:14, arm:[[6, 15], [10, 28]]}), r = exIK(f.H, [34, 112], 34, 34, 'low'); return exBox(12, 112, 36, 46) + `<g class="ln">${exLimb(f.H, r.K, r.T)}</g>` + f.svg + exArrow(150, 60, 150, 100); }],
  thrust:[() => exBox(4, 118, 40, 40) + exLines([[[22, 114], [64, 112]], [[64, 112], [100, 124]], [[100, 124], [100, 158]]], [8, 108]) + exPlate(66, 103, 9) + exArrow(150, 130, 150, 94),
          () => exBox(4, 118, 40, 40) + exLines([[[22, 114], [58, 146]], [[58, 146], [92, 126]], [[92, 126], [98, 158]]], [8, 108]) + exPlate(60, 136, 9)],
  calf:[() => exBox(76, 144, 84, 14) + exStand({ax:76, ay:132, th:0, sh:0, tr:0, nofoot:1, arm:[[0, 17], [0, 34]]}).svg + `<g class="ln"><polyline points="76,132 90,144" fill="none"/></g>` + exArrow(150, 124, 150, 90),
        () => exBox(76, 144, 84, 14) + exStand({ax:76, ay:146, th:0, sh:0, tr:0, nofoot:1, arm:[[0, 17], [0, 34]]}).svg + `<g class="ln"><polyline points="76,146 90,144" fill="none"/></g>`],
  stepup:[() => { const f = exStand({ax:100, ay:136, th:72, sh:-4, tr:12, arm:[[0, 17], [0, 34]]}), r = exIK(f.H, [56, 158], 34, 34, 'low'); return exBox(84, 136, 56, 22) + `<g class="ln">${exLimb(f.H, r.K, r.T)}</g>` + f.svg; },
          () => { const f = exStand({ax:100, ay:136, th:0, sh:0, tr:0, arm:[[0, 17], [0, 34]]}); return exBox(84, 136, 56, 22) + `<g class="ln"><polyline points="${f.H[0]},${f.H[1]} ${f.H[0] + 22},${f.H[1] + 28} ${f.H[0] + 14},${f.H[1] + 60}" fill="none"/></g>` + f.svg + exArrow(150, 110, 150, 70); }],
  slrdl:[() => { const f = exStand({ax:80, th:6, sh:-2, tr:0, arm:[[0, 17], [0, 34]]}); const rk = [f.H[0] - 6, f.H[1] + 33], rf = [rk[0] - 33, rk[1] + 12]; return f.svg + `<g class="ln">${exLimb(f.H, rk, rf)}</g>` + exPlate(f.S[0], f.S[1] + 34, 6); },
          () => { const f = exStand({ax:100, th:10, sh:-2, tr:84, arm:[[0, 17], [0, 34]]}); const dx = -Math.sin(84 * Math.PI / 180), dy = Math.cos(84 * Math.PI / 180); return f.svg + `<g class="ln">${exLimb(f.H, [f.H[0] + dx * 34, f.H[1] + dy * 34 + .5], [f.H[0] + dx * 68, f.H[1] + dy * 68 + 1])}</g>` + exPlate(f.S[0], f.S[1] + 34, 6) + exArrow(150, 60, 150, 100); }],
  bridge:[() => exLines([[[24, 152], [62, 152]], [[62, 152], [90, 128]], [[90, 128], [98, 158]]], [12, 148], `<g class="ln"><polyline points="62,152 124,118" fill="none"/></g>`),
          () => exLines([[[24, 152], [64, 134]], [[64, 134], [94, 122]], [[94, 122], [100, 158]]], [12, 148], `<g class="ln"><polyline points="64,134 126,108" fill="none"/></g>`) + exArrow(60, 112, 60, 82)],
  deadbug:[() => exLines([[[44, 152], [86, 152]], [[86, 152], [86, 118]], [[86, 118], [122, 118]]], [32, 148], `<g class="ln"><polyline points="44,152 44,116" fill="none"/><polyline points="44,152 44,116" fill="none" class="ln2"/><polyline points="86,152 104,118" fill="none" class="ln2"/></g>`),
           () => exLines([[[44, 152], [86, 152]], [[86, 152], [86, 118]], [[86, 118], [122, 118]]], [32, 148], `<g class="ln"><polyline points="44,152 44,116" fill="none"/><polyline points="44,152 10,150" fill="none" class="ln2"/><polyline points="86,152 154,146" fill="none" class="ln2"/></g>`) + exArrow(24, 134, 12, 142)],
  pallof:[() => { const f = exStand({ax:80, th:0, sh:0, tr:0, arm:[[10, 14], [18, 4]]}); return f.svg + `<line x1="0" y1="${f.S[1] + 4}" x2="${f.S[0] + 18}" y2="${f.S[1] + 4}" class="cb"/>`; },
          () => { const f = exStand({ax:80, th:0, sh:0, tr:0, arm:[[20, 3], [38, 3]]}); return f.svg + `<line x1="0" y1="${f.S[1] + 3}" x2="${f.S[0] + 38}" y2="${f.S[1] + 3}" class="cb"/>`; }],
  sidep:[() => exLines([[[40, 150], [40, 128]], [[40, 128], [90, 140]], [[90, 140], [140, 152]]], [24, 112], `<g class="ln"><polyline points="40,152 66,152" fill="none"/><polyline points="40,128 40,96" fill="none" class="ln2"/></g>`),
         () => exLines([[[40, 150], [40, 128]], [[40, 128], [90, 150]], [[90, 150], [140, 152]]], [24, 112], `<g class="ln"><polyline points="40,152 66,152" fill="none"/><polyline points="40,128 40,96" fill="none" class="ln2"/></g>`)],
  plank:[() => exLines([[[30, 152], [30, 130]], [[30, 130], [88, 141]], [[88, 141], [142, 152]]], [20, 122], `<g class="ln"><polyline points="30,152 60,152" fill="none"/></g>`),
         () => exLines([[[30, 152], [30, 130]], [[30, 130], [88, 152]], [[88, 152], [142, 152]]], [20, 122], `<g class="ln"><polyline points="30,152 60,152" fill="none"/></g>`)]
};
const EXI = {
  squat:{t:'Kniebeuge oder Beinpresse', cap:['Start: aufrecht, Füße schulterbreit', 'Tiefste Position: Oberschenkel waagerecht'], m:'Oberschenkelvorderseite, Gesäß, Rumpf',
    s:['Füße schulterbreit, Fußspitzen leicht nach außen. Stange (oder Gewicht vor der Brust) stabil halten, Rumpf fest.', 'Hüfte und Knie gleichzeitig beugen, als würdest du dich hinsetzen. Brust bleibt offen, Rücken gerade.', 'Bis die Oberschenkel etwa waagerecht sind. Die Fersen bleiben am Boden.', 'Mit Druck durch den ganzen Fuß aufstehen, oben Hüfte und Knie strecken.'],
    f:['Knie fallen nach innen. Schiebe sie bewusst über die Fußspitzen nach außen.', 'Rücken rundet sich unten. Weniger tief gehen oder weniger Gewicht.', 'Fersen heben ab. Etwas mehr Stand in den Fersen, bei Bedarf flache Schuhe.'],
    v:'Beinpresse: Rücken und Gesäß liegen fest an, die Knie zeigen in Richtung der Fußspitzen, oben die Knie nicht ganz durchdrücken.', r:'Das ist die Grundübung für Kraft im Tritt, besonders am Berg und beim Antritt.'},
  rdl:{t:'Rumänisches Kreuzheben', cap:['Start: aufrecht mit Gewicht an den Oberschenkeln', 'Tiefste Position: Hüfte weit hinten'], m:'Rückseite der Oberschenkel, Gesäß, unterer Rücken',
    s:['Aufrecht stehen, Hantel oder Kurzhanteln vor den Oberschenkeln, Knie leicht gebeugt.', 'Hüfte nach hinten schieben, der Rücken bleibt gerade, das Gewicht gleitet entlang der Beine nach unten.', 'Bis du die Dehnung hinten am Oberschenkel spürst, meist knapp unter dem Knie.', 'Hüfte nach vorn schieben und aufrichten, oben das Gesäß anspannen.'],
    f:['Rücken rundet sich. Weniger tief gehen, Blick leicht nach unten, Schulterblätter zusammen.', 'Die Knie beugen zu stark (wird zur Kniebeuge). Beugung bleibt klein, die Bewegung kommt aus der Hüfte.', 'Das Gewicht schwingt vom Körper weg. Es bleibt nah an den Beinen.'],
    v:'', r:'Stärkt Gesäß und hintere Oberschenkel, die beim Treten und in der Sitzposition viel leisten.'},
  bss:{t:'Bulgarian Split Squat oder Ausfallschritte', cap:['Start: hinterer Fuß auf Bank oder Stuhl', 'Tiefste Position: vorderes Knie etwa 90°'], m:'Oberschenkelvorderseite, Gesäß, Gleichgewicht',
    s:['Hinterer Fuß liegt hinten auf einer Bank oder einem Stuhl (Fußrücken), der vordere Fuß steht etwa einen großen Schritt davor.', 'Rumpf aufrecht, Gewicht (Rucksack, Hanteln) hängt an den Armen oder liegt im Rucksack.', 'Senke dich senkrecht ab, bis das vordere Knie etwa 90° gebeugt ist. Das hintere Knie geht Richtung Boden.', 'Drücke dich mit dem vorderen Fuß hoch. Dann Seite wechseln.'],
    f:['Der vordere Fuß steht zu nah an der Bank. Etwas weiter nach vorn.', 'Das vordere Knie kippt nach innen. Es zeigt in Richtung der Fußspitze.', 'Der Oberkörper kippt weit nach vorn. Aufrecht bleiben, Blick geradeaus.'],
    v:'Ausfallschritte: Aus dem Stand einen großen Schritt nach vorn, absenken, wieder zurückdrücken. Das ist die einfachere Variante ohne Bank.', r:'Einbeinige Kraft entspricht dem Tritt: Jedes Bein arbeitet allein und ausgleichende Muskeln werden mittrainiert.'},
  thrust:{t:'Hip Thrust', cap:['Oben: Hüfte gestreckt, Gesäß fest', 'Unten: Hüfte fast am Boden'], m:'Gesäß, hintere Oberschenkel',
    s:['Obere Schulterblätter liegen an einer Bank oder einem Sofa, Füße stehen hüftbreit, Knie gebeugt.', 'Gewicht (Hantel, Rucksack) liegt auf der Hüfte.', 'Drücke die Hüfte nach oben, bis Schultern, Hüfte und Knie eine Linie bilden. Oben das Gesäß 1 Sekunde fest anspannen.', 'Kontrolliert wieder absenken.'],
    f:['Hohlkreuz oben. Rippen unten halten, Kinn leicht zur Brust.', 'Die Füße stehen zu weit weg (Zug hinten am Oberschenkel) oder zu nah (Knie). Die Unterschenkel stehen oben etwa senkrecht.', 'Schwung statt Spannung. Langsamer, mit Pause oben.'],
    v:'', r:'Das Gesäß ist der größte Kraftgeber im Tritt, besonders beim Antritt und im Wiegetritt.'},
  calf:{t:'Wadenheben', cap:['Oben: auf den Zehen', 'Unten: Ferse tief, Wade gedehnt'], m:'Waden (Gastrocnemius und Soleus)',
    s:['Ballen eines Fußes (oder beider) stehen auf einer Stufe, die Ferse hängt frei.', 'Halte dich zur Sicherheit an einer Wand oder einem Geländer fest.', 'Hebe die Ferse so hoch wie möglich, oben kurz halten.', 'Langsam bis unter Stufenhöhe absenken, die Wade dehnt sich. Bei einbeiniger Variante Seite wechseln.'],
    f:['Zu schnell und mit Schwung. 2 Sekunden hoch, 3 Sekunden runter.', 'Nicht tief genug runter. Der volle Bewegungsradius bringt die Wirkung.', 'Knie knicken ein. Die Beine bleiben fast gestreckt, ein wenig Beugung für den Soleus ist erlaubt.'],
    v:'Einbeinig: Nur ein Fuß auf der Stufe, der andere Fuß ist angehoben. Zusatzlast in der Hand, sobald 12 saubere Wiederholungen gelingen.', r:'Starke Waden stabilisieren den Fuß im Pedal und schonen die Achillessehne bei langen Distanzen.'},
  stepup:{t:'Step-ups auf Stuhl oder Treppe', cap:['Start: Fuß auf der Stufe, Knie etwa 90°', 'Oben: aufrecht auf der Stufe'], m:'Oberschenkelvorderseite, Gesäß',
    s:['Stelle einen Fuß ganz auf eine stabile Stufe oder einen festen Stuhl. Die Höhe: Knie etwa 90° gebeugt.', 'Drücke dich mit dem vorderen Bein nach oben, der hintere Fuß hilft möglichst wenig.', 'Oben aufrecht stehen und das Gesäß anspannen.', 'Langsam wieder absenken (3 Sekunden), erst dann Seite wechseln.'],
    f:['Der hintere Fuß stößt vom Boden ab. Du arbeitest nicht mit dem vorderen Bein. Hinteren Fuß locker lassen.', 'Die Stufe ist zu hoch. Etwas niedriger wählen.', 'Das Knie fällt nach innen. Es zeigt in Richtung der Fußspitze.'],
    v:'Mit Rucksack oder Kurzhanteln in den Händen steigern, sobald 10 saubere Wiederholungen pro Bein gelingen.', r:'Der Bewegungsablauf ähnelt dem Tritt bergauf: Ein Bein drückt das Körpergewicht nach oben.'},
  slrdl:{t:'Einbeiniges Rumänisches Kreuzheben', cap:['Start: auf einem Bein stehen', 'Tiefste Position: Rumpf waagerecht, Bein gestreckt'], m:'Rückseite der Oberschenkel, Gesäß, Gleichgewicht',
    s:['Stehe auf einem Bein, das Knie ist leicht gebeugt. Gewicht in der Hand auf der Gegenseite oder in beiden Händen.', 'Kippe den Oberkörper nach vorn, während das freie Bein gestreckt nach hinten geht. Rücken bleibt gerade.', 'Gehe nur so weit, wie du Hüfte und Rücken stabil halten kannst. Meist ist der Rumpf dann nahe waagerecht.', 'Hüfte nach vorn schieben, aufrichten und das Bein zurückholen.'],
    f:['Die Hüfte dreht sich auf. Beide Beckenknochen zeigen zum Boden.', 'Der Rücken rundet sich. Weniger tief oder ohne Gewicht üben.', 'Kein Halt. Die Fingerspitze an einer Wand hilft am Anfang.'],
    v:'', r:'Trainiert Gesäß und Rückseite einzeln und verbessert das Gleichgewicht, nützlich für einen runden Tritt.'},
  bridge:{t:'Einbeinige Glute Bridge', cap:['Start: auf dem Rücken, ein Fuß am Boden', 'Oben: Hüfte hoch, freies Bein gestreckt'], m:'Gesäß, hintere Oberschenkel',
    s:['Rückenlage, ein Fuß steht nah am Gesäß, das andere Bein ist gestreckt in der Luft.', 'Drücke dich über die Ferse des Standbeins nach oben, bis Schulter, Hüfte und Knie eine Linie bilden.', 'Oben das Gesäß 1 Sekunde fest anspannen, die Hüfte bleibt waagerecht.', 'Langsam absenken, ohne ganz abzulegen. Dann Seite wechseln.'],
    f:['Hohlkreuz oben. Rippen unten, Bauch leicht angespannt.', 'Die Hüfte dreht ab. Beide Beckenknochen auf gleicher Höhe halten.', 'Der Druck kommt aus dem Fußballen. Die Ferse schiebt.'],
    v:'Einfacher: Beide Füße am Boden. Schwerer: Gewicht (Rucksack) auf der Hüfte.', r:'Aktiviert das Gesäß, das beim Treten oft zu wenig mitarbeitet.'},
  deadbug:{t:'Dead Bug', cap:['Start: Knie über der Hüfte, Arme nach oben', 'Gegenarm und Gegenbein strecken'], m:'Tiefe Bauchmuskulatur, Rumpfstabilität',
    s:['Rückenlage, Arme zeigen senkrecht nach oben, Knie sind 90° gebeugt über der Hüfte.', 'Drücke den unteren Rücken leicht in den Boden und halte ihn dort.', 'Strecke den rechten Arm nach hinten über den Kopf und das linke Bein nach vorn, beides knapp über dem Boden.', 'Zurück in die Mitte, dann die andere Seite. Atme beim Strecken aus.'],
    f:['Der untere Rücken hebt ab (Hohlkreuz). Weniger weit strecken.', 'Zu schnell. Langsam, etwa 3 Sekunden pro Seite.', 'Atem anhalten. Beim Ausatmen strecken.'],
    v:'', r:'Ein stabiler Rumpf überträgt die Kraft aus den Beinen aufs Pedal und entlastet den unteren Rücken auf langen Etappen.'},
  pallof:{t:'Pallof Press', cap:['Start: Griff vor der Brust', 'Ende: Arme gestreckt, Rumpf dreht nicht'], m:'Seitliche Bauchmuskeln und Rumpf (Anti-Rotation)',
    s:['Befestige ein Band oder Kabel auf Brusthöhe seitlich neben dir. Steh seitlich dazu, schulterbreit, Knie leicht gebeugt.', 'Halte den Griff mit beiden Händen vor der Brust.', 'Drücke die Arme langsam gerade nach vorn und halte 2 Sekunden. Der Zug will dich drehen, dein Rumpf bleibt gerade.', 'Zurück zur Brust. Nach allen Wiederholungen die Seite wechseln.'],
    f:['Der Oberkörper dreht mit. Weniger Zug oder näher an die Befestigung.', 'Das Becken schwingt. Gesäß und Bauch anspannen.', 'Schultern hochgezogen. Entspannt lassen.'],
    v:'Ohne Gerät: Seitstütz oder Plank üben.', r:'Rumpfspannung verhindert Energieverlust beim Treten, vor allem im Wiegetritt.'},
  sidep:{t:'Seitstütz', cap:['Richtig: Körper bildet eine Linie', 'Falsch: Hüfte sinkt ab'], m:'Seitliche Bauchmuskeln, Hüfte, Schulter',
    s:['Seitlich auf den Unterarm legen, der Ellbogen steht genau unter der Schulter.', 'Hebe die Hüfte, bis Kopf, Rumpf und Beine eine gerade Linie bilden. Füße übereinander oder leicht versetzt.', 'Halte die Position 20 bis 40 Sekunden, ruhig atmen.', 'Seite wechseln. Steigerung durch längere Zeit, nicht durch Wackeln.'],
    f:['Die Hüfte sackt ab. Schiebe sie aktiv nach oben.', 'Der Körper kippt nach vorn oder hinten. Brust bleibt offen, Becken zeigt nach vorn.', 'Schulter hochgezogen. Wegdrücken vom Boden.'],
    v:'Einfacher: Knie am Boden lassen. Schwerer: oberes Bein anheben.', r:'Stärkt die seitliche Rumpfkette, die das Becken auf dem Sattel ruhig hält.'},
  plank:{t:'Plank (Unterarmstütz)', cap:['Richtig: gerade Linie von Kopf bis Ferse', 'Falsch: Hüfte hängt durch'], m:'Gesamter Rumpf, Schultern',
    s:['Unterarme parallel am Boden, Ellbogen unter den Schultern, Füße hüftbreit.', 'Spanne Bauch und Gesäß an, der Körper bildet eine gerade Linie.', 'Blick zum Boden, Nacken lang. Halte 20 bis 45 Sekunden, ruhig atmen.', 'Abbrechen, sobald die Hüfte durchhängt. Dann kurz pausieren und neu starten.'],
    f:['Die Hüfte hängt durch (Hohlkreuz). Becken leicht kippen, Gesäß anspannen.', 'Das Becken ragt hoch. Die Linie muss gerade sein.', 'Atem anhalten. Weiteratmen.'],
    v:'Einfacher: Knie am Boden. Schwerer: abwechselnd ein Bein anheben.', r:'Rumpfausdauer hält die Sitzposition stabil, besonders in langen Rennen mit Aero-Haltung.'}
};

/* ---------- Übungsanimationen: Start- und Endposition werden weich ineinander überführt ---------- */
const _exT = {};
function exTpl(id){
  if (_exT[id]) return _exT[id];
  const st = s => s.replace(/<g class="ar">.*?<\/g>/g, ''), A = st(EXP[id][0]()), B = st(EXP[id][1]()), re = /(?<![A-Za-z])-?\d+(?:\.\d+)?/g;
  const na = (A.match(re) || []).map(Number), nb = (B.match(re) || []).map(Number), pa = A.split(re), pb = B.split(re);
  return _exT[id] = {A, B, na, nb, pa, ok:na.length === nb.length && pa.join('#') === pb.join('#')};
}
const exAnimSvg = id => `<svg viewBox="0 0 170 165" role="img" aria-label="${esc(EXI[id].t)}: Bewegungsablauf als Animation"><line x1="4" y1="${EXG.GY}" x2="166" y2="${EXG.GY}" class="gr"/><g data-ex="${esc(id)}">${exTpl(id).A}</g></svg>`;
let _exRaf = 0;
const _ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function exTick(ts){
  const els = document.querySelectorAll('g[data-ex]'); if (!els.length) { _exRaf = 0; return; }
  const ph = ts % 4400, red = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let k = ph < 700 ? 0 : ph < 1900 ? _ease((ph - 700) / 1200) : ph < 2900 ? 1 : ph < 4100 ? 1 - _ease((ph - 2900) / 1200) : 0;
  if (red) k = ph < 2200 ? 0 : 1;
  els.forEach(el => {
    const T = exTpl(el.dataset.ex);
    if (el._k !== k) {
      let h; if (T.ok) { h = T.pa[0]; for (let i = 0; i < T.na.length; i++) h += (T.na[i] + (T.nb[i] - T.na[i]) * k).toFixed(1) + T.pa[i + 1]; } else h = k < .5 ? T.A : T.B;
      el.innerHTML = h; el._k = k;
    }
    const box = el.closest('.exanim'); if (box) box.querySelectorAll('[data-ph]').forEach(c => c.classList.toggle('on', (k >= .5) === (c.dataset.ph === '1')));
  });
  _exRaf = requestAnimationFrame(exTick);
}
function exAnimStart(){ if (!_exRaf && document.querySelector('g[data-ex]')) _exRaf = requestAnimationFrame(exTick); }
let exOpen = null;
function openEx(id){ if (EXI[id]) { exOpen = id; render(); } }
function closeEx(){ exOpen = null; render(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && exOpen) closeEx(); });
function exModal(){
  if (!exOpen || !EXI[exOpen]) return ''; const e = EXI[exOpen], p = EXP[exOpen];
  return `<div class="exov" onclick="if(event.target===this)closeEx()" role="dialog" aria-modal="true" aria-label="${esc(e.t)}"><div class="exbox"><div class="flex items-start gap-3"><h3 class="hd flex-1 text-2xl font-semibold">${esc(e.t)}</h3><button class="ghost !px-3 !py-1.5" onclick="closeEx()" aria-label="Schließen">Schließen</button></div>
    <p class="mt-1 text-sm" style="color:var(--mute)">Trainiert: ${esc(e.m)}</p>
    <div class="exanim mt-3"><div class="exf">${exAnimSvg(exOpen)}</div><div class="mt-2 flex gap-2"><span class="exph" data-ph="0">${esc(e.cap[0])}</span><span class="exph" data-ph="1">${esc(e.cap[1])}</span></div></div>
    <p class="mt-3 font-semibold">So geht's</p><ol class="mt-1 list-decimal space-y-1 pl-5 text-sm">${e.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    <p class="mt-3 font-semibold">Häufige Fehler</p><ul class="mt-1 list-disc space-y-1 pl-5 text-sm">${e.f.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${e.v ? `<p class="mt-3 font-semibold">Variante</p><p class="mt-1 text-sm">${esc(e.v)}</p>` : ''}
    <p class="mt-3 font-semibold">Warum für Radfahrer</p><p class="mt-1 text-sm">${esc(e.r)}</p>
    <p class="mt-3 text-xs" style="color:var(--mute)">Die Animation zeigt den Bewegungsablauf als vereinfachte Strichfigur. Technik vor Gewicht. Bei Schmerzen abbrechen. Lass dir die Übung bei Unsicherheit einmal von einer Trainerin oder einem Trainer zeigen.</p></div></div>`;
}

