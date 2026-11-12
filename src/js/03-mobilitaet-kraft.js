/* ---------- Mobilität und Stabilität: kurze Zusatzroutinen ---------- */
const exQuad = (o = {}) => { const S0 = [50, 118 + (o.dy || 0)], H0 = [104, 118 + (o.dy || 0)], mid = [77, 118 + (o.dy || 0) + (o.arch || 0)];
  return exLines([[[50, 158], S0, mid, H0], [H0, [104, 158], [140, 158]]], o.head || [36, 108 + (o.hd || 0)], o.extra || ''); };
Object.assign(EXP, {
  hipflex:[() => exLines([[[30, 156], [60, 152], [70, 112]], [[70, 112], [104, 118], [104, 158]], [[70, 112], [70, 72]]], [70, 60], `<g class="ln"><polyline points="70,74 78,96 86,104" fill="none" class="ln2"/></g>`),
           () => exLines([[[30, 156], [60, 152], [80, 114]], [[80, 114], [110, 122], [110, 158]], [[80, 114], [76, 74]]], [75, 62], `<g class="ln"><polyline points="76,74 79,58 82,42" fill="none" class="ln2"/></g>`) + exArrow(96, 100, 112, 100)],
  tspine:[() => exQuad({extra:`<g class="ln"><polyline points="50,118 40,106 34,104" fill="none" class="ln2"/></g>`}),
          () => exQuad({extra:`<g class="ln"><polyline points="50,118 54,92 58,74" fill="none" class="ln2"/></g>`}) + exArrow(70, 84, 62, 70)],
  catcow:[() => exQuad({arch:-16, hd:14}) + exArrow(77, 92, 77, 78),
          () => exQuad({arch:14, hd:-6}) + exArrow(77, 138, 77, 150)],
  ham:[() => exLines([[[32, 152], [80, 152], [146, 154]], [[80, 152], [114, 93]]], [20, 148], `<line x1="40" y1="146" x2="114" y2="93" class="cb"/>`),
       () => exLines([[[32, 152], [80, 152], [146, 154]], [[80, 152], [88, 84]]], [20, 148], `<line x1="40" y1="146" x2="88" y2="84" class="cb"/>`) + exArrow(120, 100, 104, 84)],
  fig4:[() => exLines([[[32, 152], [80, 152], [110, 120], [124, 156]], [[80, 152], [96, 112], [122, 122]]], [20, 148], `<g class="ln"><polyline points="32,152 50,154 66,154" fill="none" class="ln2"/></g>`),
        () => exLines([[[32, 152], [80, 152], [92, 112], [120, 116]], [[80, 152], [80, 112], [108, 118]]], [20, 148], `<g class="ln"><polyline points="32,152 60,124 86,116" fill="none" class="ln2"/></g>`) + exArrow(130, 112, 114, 112)],
  birddog:[() => exQuad({extra:`<g class="ln"><polyline points="50,118 50,158" fill="none" class="ln2"/><polyline points="104,118 104,158" fill="none" class="ln2"/></g>`}),
           () => exQuad({extra:`<g class="ln"><polyline points="50,118 14,114" fill="none" class="ln2"/><polyline points="104,118 166,116" fill="none" class="ln2"/></g>`})],
  clam:[() => exLines([[[30, 152], [86, 152]], [[86, 152], [118, 136], [104, 154]], [[86, 152], [118, 136], [104, 154]]], [18, 146], `<g class="ln"><polyline points="86,152 118,136" fill="none" class="ln2"/></g><line x1="118" y1="136" x2="118" y2="136" class="cb"/>`),
        () => exLines([[[30, 152], [86, 152]], [[86, 152], [118, 136], [104, 154]], [[86, 152], [112, 112], [104, 152]]], [18, 146], `<g class="ln"><polyline points="86,152 112,112" fill="none" class="ln2"/></g><line x1="118" y1="136" x2="112" y2="112" class="cb"/>`) + exArrow(130, 132, 126, 112)]
});
Object.assign(EXI, {
  hipflex:{t:'Hüftbeuger-Dehnung im Kniestand', cap:['Start: Halbkniestand, Becken aufgerichtet', 'Hüfte nach vorn, Arm nach oben'], m:'Hüftbeuger (Iliopsoas), Oberschenkelvorderseite',
    s:['Halbkniestand: hinteres Knie auf einer Matte, vorderer Fuß steht so weit vorn, dass das Knie etwa 90° gebeugt ist.', 'Becken leicht aufrichten (Gesäß anspannen, Schambein nach oben ziehen).', 'Schiebe die Hüfte langsam nach vorn, bis du vorn an der Hüfte des hinteren Beins eine Dehnung spürst. Den Arm der hinteren Seite nach oben strecken.', '45 Sekunden ruhig atmen, dann Seite wechseln.'],
    f:['Hohlkreuz statt Dehnung. Becken aufrichten, Rippen unten lassen.', 'Vorderes Knie schiebt weit über die Zehen. Etwas größerer Schritt.', 'Zu stark ziehen. Die Dehnung soll deutlich, aber nicht schmerzhaft sein.'],
    v:'', r:'Auf dem Rad ist die Hüfte stundenlang gebeugt. Ein beweglicher Hüftbeuger erleichtert eine tiefe Position und entlastet den unteren Rücken.'},
  tspine:{t:'Brustwirbelsäule öffnen im Vierfüßlerstand', cap:['Start: Hand am Hinterkopf', 'Ellbogen dreht zur Decke'], m:'Brustwirbelsäule, Schultern',
    s:['Vierfüßlerstand: Hände unter den Schultern, Knie unter der Hüfte.', 'Eine Hand an den Hinterkopf legen, der Ellbogen zeigt zum Boden.', 'Drehe den Oberkörper auf, der Ellbogen wandert Richtung Decke, der Blick folgt.', 'Langsam zurück. 8 Wiederholungen pro Seite.'],
    f:['Die Bewegung kommt aus der Hüfte. Becken bleibt ruhig, nur der Oberkörper dreht.', 'Zu schnell. Langsam und mit Ausatmen aufdrehen.'],
    v:'', r:'Die Brustwirbelsäule ist auf dem Rad lange gebeugt. Mehr Drehfähigkeit hilft bei Schulterblick, Atmung und Nackenverspannungen.'},
  catcow:{t:'Katze-Kuh', cap:['Katze: Rücken rund', 'Kuh: Rücken hohl, Blick nach vorn'], m:'Ganze Wirbelsäule',
    s:['Vierfüßlerstand, Hände unter den Schultern, Knie unter der Hüfte.', 'Ausatmen: Rücken rund machen, Kinn zur Brust, Bauchnabel nach innen.', 'Einatmen: Rücken langsam durchhängen lassen, Brust nach vorn, Blick leicht nach vorn.', '10 langsame Wiederholungen, im Atemrhythmus.'],
    f:['Ruckartig. Fließend und langsam.', 'Nur der Nacken bewegt sich. Die Bewegung geht Wirbel für Wirbel durch den ganzen Rücken.'],
    v:'', r:'Löst den Rücken nach langen Ausfahrten und ist ein guter Start in jede Routine.'},
  ham:{t:'Beinrückseite dehnen mit Band', cap:['Start: Bein schräg nach oben', 'Bein nahe der Senkrechten'], m:'Hintere Oberschenkelmuskulatur, Wade',
    s:['Rückenlage, ein Band oder Handtuch um den Fuß legen.', 'Das Bein gestreckt nach oben führen, das andere Bein liegt gestreckt am Boden.', 'Mit dem Band sanft ziehen, bis du hinten am Oberschenkel eine Dehnung spürst. Fußspitze zu dir ziehen dehnt zusätzlich die Wade.', '45 Sekunden halten, dann Seite wechseln.'],
    f:['Das Becken hebt ab. Das untere Bein und der Rücken bleiben am Boden.', 'Knie stark gebeugt. Nur so weit hochziehen, wie das Bein fast gestreckt bleibt.'],
    v:'', r:'Bewegliche Beinrückseiten erleichtern die Sitzposition und entlasten den unteren Rücken.'},
  fig4:{t:'Gesäß-Dehnung in Rückenlage (Figur 4)', cap:['Start: Knöchel aufs Knie legen', 'Bein zur Brust ziehen'], m:'Gesäßmuskulatur, Piriformis',
    s:['Rückenlage, beide Füße am Boden. Lege den rechten Knöchel auf das linke Knie.', 'Greife hinter den linken Oberschenkel und ziehe ihn zur Brust.', 'Das rechte Knie drückt leicht nach außen. Du spürst die Dehnung im rechten Gesäß.', '45 Sekunden halten, dann Seite wechseln.'],
    f:['Kopf und Schultern heben ab. Kopf bleibt am Boden, notfalls ein Band zu Hilfe nehmen.', 'Zu viel Druck auf das Knie. Sanft dosieren.'],
    v:'', r:'Das Gesäß arbeitet beim Treten viel und verspannt leicht. Lockerheit hier beugt Hüft- und Rückenbeschwerden vor.'},
  birddog:{t:'Bird Dog', cap:['Start: Vierfüßlerstand', 'Gegenarm und Gegenbein strecken'], m:'Rumpf, Rückenstrecker, Gesäß',
    s:['Vierfüßlerstand, Rücken gerade, Bauch leicht angespannt.', 'Strecke den rechten Arm nach vorn und das linke Bein nach hinten, bis beide waagerecht sind.', '3 Sekunden halten, ohne dass das Becken kippt.', 'Zurück und Seite wechseln. 8 Wiederholungen pro Seite.'],
    f:['Das Becken dreht auf. Stell dir ein Glas Wasser auf dem unteren Rücken vor.', 'Hohlkreuz, weil das Bein zu hoch geht. Nur bis zur Waagerechten.'],
    v:'Schwerer: Ellbogen und Knie unter dem Körper zusammenführen, dann wieder strecken.', r:'Trainiert die Rumpfspannung, die das Becken auf dem Sattel ruhig hält.'},
  clam:{t:'Clamshell (Muschel)', cap:['Start: Seitlage, Knie gebeugt', 'Oberes Knie öffnen'], m:'Seitliche Gesäßmuskulatur (Gluteus medius)',
    s:['Seitlage, Hüfte und Knie etwa 45° gebeugt, Füße übereinander. Optional ein Miniband über den Knien.', 'Die Füße bleiben zusammen, das obere Knie öffnet sich nach oben.', 'Kurz halten, langsam schließen. Das Becken kippt nicht nach hinten.', '15 Wiederholungen, dann Seite wechseln.'],
    f:['Das Becken rollt mit nach hinten. Weniger weit öffnen.', 'Zu schnell. Langsam und kontrolliert.'],
    v:'Schwerer: mit Miniband oder mit gehobenen Füßen.', r:'Ein starker seitlicher Gesäßmuskel hält das Knie beim Treten in der Spur und beugt Knieschmerzen vor.'}
});
const MOB = {
  mob:{n:'Mobilität', m:15, intro:'Ruhige Dehn- und Mobilisationsübungen. Gut nach der Radeinheit, am Abend oder an Ruhetagen. Nicht direkt vor harten Intervallen statisch dehnen.', ex:[['catcow', 'Katze-Kuh', '10 langsame Wiederholungen'], ['tspine', 'Brustwirbelsäule öffnen', '8 pro Seite'], ['hipflex', 'Hüftbeuger-Dehnung', '2 × 45 Sek. pro Seite'], ['ham', 'Beinrückseite mit Band', '2 × 45 Sek. pro Bein'], ['fig4', 'Gesäß-Dehnung (Figur 4)', '45 Sek. pro Seite']]},
  stab:{n:'Stabilität', m:15, intro:'Kurze Rumpf- und Hüftstabilität ohne Geräte. Kontrolliert und sauber, nicht bis zur Erschöpfung.', ex:[['birddog', 'Bird Dog', '2 × 8 pro Seite, 3 Sek. halten'], ['deadbug', 'Dead Bug', '2 × 8 pro Seite'], ['sidep', 'Seitstütz', '2 × 30 Sek. pro Seite'], ['clam', 'Clamshell', '2 × 15 pro Seite'], ['bridge', 'Einbeinige Glute Bridge', '2 × 10 pro Seite']]}
};
let mobMap = {};
function mobOf(p, w, plan, sm){
  const n = p.mobN | 0; if (!n || !plan) return {};
  const so = w === 1 ? startOff(p) : 0, hard = j => plan[j] && ['sst', 'thr', 'vo2'].includes(plan[j].t);
  const sc = j => { const x = plan[j]; let s = 0; if (x.t === 'rest') s += 3; else if (['rec', 'base', 'com'].includes(x.t)) s += 2; else if (x.t === 'long') s += 1; if (sm && sm[j]) s -= 3; if (/^Eventtag/.test(x.n || '')) s -= 9; return s; };
  const c = [0, 1, 2, 3, 4, 5, 6].filter(j => j >= so && plan[j] && !plan[j].blocked && sc(j) > -5).sort((a, b) => sc(b) - sc(a) || a - b), pick = [];
  for (const j of c) { if (pick.length >= n) break; if (pick.every(q => Math.abs(q - j) >= 2) || c.length - pick.length <= n - pick.length) pick.push(j); }
  pick.sort((a, b) => a - b); const out = {}; pick.forEach((j, k) => { out[j] = k % 2 === 0 ? (mobPlanRt(plan, j, w, k) || MOB.mob) : MOB.stab; }); return out; /* F23: Mobilität als Routine je Tagesart, Variante rotiert */
}
const mobKey = i => `${S.p.start}|${strWeek}|${i}`;
function togMob(i){ S.mobDone = S.mobDone || {}; S.mobDone[mobKey(i)] = !S.mobDone[mobKey(i)]; save(); render(); }
function mobBlock(i, cur, pane){
  const s = mobMap[i]; if (!s) return '';
  const dn = cur && S.mobDone && S.mobDone[mobKey(i)];
  return `<div${pane ? '' : ' class="-mx-4 border-t px-4 pt-3" style="border-color:var(--line)"'}>${pane ? `<p class="hd text-xl font-semibold">${s.n}</p><p class="mb-2 text-xs" style="color:var(--mute)">Etwa ${s.m} Min., ohne Geräte</p>` : `<p class="eyebrow mb-2">Zusätzlich: ${s.n}, etwa ${s.m} Min.</p>`}
    <p style="color:var(--mute)">${esc(s.intro)}</p>
    <ul class="mt-2 list-disc space-y-1 pl-5">${s.ex.map(([id, n, r]) => `<li><button class="exl" onclick="openEx('${ja(id)}')">${esc(n)}</button>: ${esc(r)}</li>`).join('')}</ul>
    <p class="mt-1 text-xs" style="color:var(--mute)">Tippe auf eine Übung für Erklärung und Grafik.</p>
    ${cur ? sqBtn('mob', i) : sqLater()}${cur ? `<button onclick="togMob(${ja(i)})" class="ghost mt-2 !py-2 text-sm" style="${esc(dn ? 'color:var(--ok);border-color:var(--ok)' : '')}">${dn === 'part' ? '◐ ' + s.n + ' teilweise erledigt' : dn ? '✓ ' + s.n + ' erledigt' : s.n + ' als erledigt markieren'}</button>` : ''}</div>`;
}
function setMob(n){ S.d.mobN = n; save(); render(); }
function mobUi(d){
  const n = d.mobN | 0;
  return `<div><p class="mb-2 font-semibold">Mobilität und Stabilität (10 bis 20 Min.)?</p><div class="flex flex-wrap gap-2">${chip('Nein', !n, 'setMob(0)')}${chip('2× pro Woche', n === 2, 'setMob(2)')}${chip('3× pro Woche', n === 3, 'setMob(3)')}${chip('4× pro Woche', n === 4, 'setMob(4)')}</div>
    ${n ? '<p class="mt-2 text-sm" style="color:var(--mute)">Abwechselnd eine Mobilitätsroutine und eine Stabilitätsroutine (Rumpf und Hüfte). Mobilität: an Ruhetagen 20 Min. mit längerem Halten, nach der Fahrt 10 Min., die Übungen wechseln von Woche zu Woche. Die App legt sie bevorzugt auf Ruhetage und lockere Tage, nicht auf Krafttage. Auch in Tapering- und Eventwoche, nur nicht am Eventtag.</p>' : ''}</div>`;
}

/* ---------- Zusätzliches Krafttraining ---------- */
let strMap = {}, strWeek = 1;
const STR_EX = {
  gym:[['Kniebeuge oder Beinpresse', 'squat'], ['Rumänisches Kreuzheben', 'rdl'], ['Bulgarian Split Squat oder Ausfallschritte', 'bss'], ['Hip Thrust', 'thrust'], ['Wadenheben', 'calf']],
  home:[['Bulgarian Split Squat (Rucksack mit Last)', 'bss'], ['Einbeiniges Rumänisches Kreuzheben', 'slrdl'], ['Step-ups auf Stuhl oder Treppe', 'stepup'], ['Einbeinige Glute Bridge', 'bridge'], ['Einbeiniges Wadenheben', 'calf']]
};
const STR_CORE = {full:[['Dead Bug', 'deadbug'], ['Pallof Press', 'pallof'], ['Seitstütz', 'sidep']], fullHome:[['Dead Bug', 'deadbug'], ['Seitstütz', 'sidep'], ['Plank', 'plank']], short:[['Dead Bug', 'deadbug'], ['Plank', 'plank']]};
function strSession(p, kind){
  const home = p.strPlace === 'home', ex = STR_EX[home ? 'home' : 'gym'], K = {
    tech:{n:'Krafttraining: Technik und Grundlagen', m:40, ne:4, sets:'3', reps:home ? '10 Wdh. pro Bein' : '8–10 Wdh.', rir:'4 Wdh. in Reserve', intro:'Die ersten Wochen gehören der sauberen Bewegung. Mäßige Last, keine Maximalversuche.'},
    base:{n:'Krafttraining: Maximalkraft aufbauen', m:50, ne:5, sets:'3–4', reps:home ? '6–10 Wdh. pro Bein, langsam ablassen (3 Sek.)' : '6–8 Wdh.', rir:'2–3 Wdh. in Reserve', intro:'Schwere Last, lange Pausen (2–3 Min.), jede Wiederholung kontrolliert.'},
    build:{n:'Krafttraining: Kraft ausbauen', m:45, ne:4, sets:'3', reps:home ? '6–10 Wdh. pro Bein' : '6–8 Wdh.', rir:'2–3 Wdh. in Reserve', intro:'Last halten oder leicht steigern, wenn alle Sätze sauber gelingen.'},
    erh:{n:'Krafttraining: Erhaltung', m:30, ne:3, sets:'2', reps:home ? '6–8 Wdh. pro Bein' : '5–6 Wdh.', rir:'2–3 Wdh. in Reserve', intro:'Kurz und schwer genug, um die Kraft zu halten. Eine Einheit pro Woche reicht dafür.'},
    leicht:{n:'Krafttraining: leichte Woche', m:30, ne:3, sets:'2', reps:home ? '8 Wdh. pro Bein' : '8 Wdh.', rir:'4 Wdh. in Reserve', intro:'Entlastungswoche: mit weniger Last und Sätzen locker durchbewegen.'}
  }[kind];
  const lines = ex.slice(0, K.ne).map(([n, id]) => ({n, id, r:`${K.sets} × ${K.reps}`})), core = STR_CORE[kind === 'erh' || kind === 'leicht' ? 'short' : home ? 'fullHome' : 'full'];
  return {kind, n:K.n, m:K.m, intro:K.intro, rir:K.rir, lines, core, home};
}
function strOf(p, w, plan){
  const n0 = p.strN | 0; if (!n0 || !plan) return {};
  const ph = phases(p), P = ph.find(x => w >= x.from && w <= x.to) || ph[ph.length - 1]; if (P.key === 'taper') return {};
  /* M12 (Audit 12.11.2026): Nach 12 Wochen mit schwerem Krafttraining (Maximalkraft, Ausbau) folgt die Erhaltung mit einer Einheit pro
     Woche. In Wochen mit Eventtag, A- oder B-Rennen höchstens eine Einheit und nicht in den drei Tagen davor (Rønnestad & Mujika 2014). */
  const kOf = (q, Q) => recWk(p, q) ? 'leicht' : Q.key === 'peak' ? 'erh' : (p.strLvl !== 'exp' && q <= 4) ? 'tech' : Q.key === 'base' ? 'base' : 'build';
  let heavy = 0; for (let q = 1; q < w; q++) { const Q = ph.find(x => q >= x.from && q <= x.to); if (Q && Q.key !== 'taper' && ['base', 'build'].includes(kOf(q, Q))) heavy++; }
  const rec = recWk(p, w), kind0 = kOf(w, P), kind = (kind0 === 'base' || kind0 === 'build') && heavy >= 12 ? 'erh' : kind0;
  const raceD = [0, 1, 2, 3, 4, 5, 6].filter(j => plan[j] && ((plan[j].t === 'race' && plan[j].subPrio !== 'C') || /^Eventtag/.test(plan[j].n || '')));
  const n = rec || P.key === 'peak' || kind === 'erh' || raceD.length ? 1 : n0, so = w === 1 ? startOff(p) : 0, hard = j => j >= 0 && j < 7 && plan[j] && ['long', 'sst', 'thr', 'vo2', 'race', 'test'].includes(plan[j].t), mine = p.strDays && p.strDays.some(Boolean);
  const sc = j => { const t = plan[j].t; let s = 0; if (hard(j)) s -= 4; if (hard(j + 1)) s -= 6; if (j < 5 && plan[j + 2] && plan[j + 2].t === 'long') s -= 1; if (hard(j - 1)) s += 2; if (['base', 'rec', 'com'].includes(t)) s += 1; if ((plan[j + 1] && plan[j + 1].subPre) || (plan[j + 2] && plan[j + 2].t === 'race' && plan[j + 2].subPrio === 'B') || (plan[j - 1] && plan[j - 1].t === 'race')) s -= 9; return s; };
  const c = [0, 1, 2, 3, 4, 5, 6].filter(j => j >= so && plan[j] && !plan[j].blocked && !raceD.some(r => r >= j && r - j <= 3) && (mine ? p.strDays[j] : sc(j) > -6)).sort((a, b) => sc(b) - sc(a) || a - b), pick = [];
  for (const pass of [0, 1]) for (const j of c) { if (pick.length >= n) break; if (!mine && pass === 0 && hard(j + 1)) continue; if (!pick.includes(j) && pick.every(q => Math.abs(q - j) >= 2)) pick.push(j); }
  const out = {}; pick.forEach(j => { out[j] = {...strSession(p, kind), same:hard(j) && plan[j].t !== 'long'}; }); return out;
}
const strKey = i => `${S.p.start}|${strWeek}|${i}`;
function togStr(i){ S.strDone = S.strDone || {}; S.strDone[strKey(i)] = !S.strDone[strKey(i)]; save(); render(); }
function strBlock(i, cur, pane){
  const s = strMap[i]; if (!s) return '';
  const dn = cur && S.strDone && S.strDone[strKey(i)];
  return `<div${pane ? '' : ' class="-mx-4 border-t px-4 pt-3" style="border-color:var(--line)"'}>${pane ? `<p class="hd text-xl font-semibold">${esc(s.n.replace('Krafttraining: ', ''))}</p><p class="mb-2 text-xs" style="color:var(--mute)">Krafttraining, etwa ${s.m} Min.</p>` : `<p class="eyebrow mb-2">Zusätzlich: ${esc(s.n.replace('Krafttraining: ', 'Krafttraining, '))}, etwa ${s.m} Min.</p>`}
    <p style="color:var(--mute)">${esc(s.intro)} Nach 10 Min. Aufwärmen (leichtes Einfahren, Mobilität). Intensität: ${esc(s.rir)}, nicht bis zum Muskelversagen.</p>
    <ul class="mt-2 list-disc space-y-1 pl-5">${s.lines.map(l => `<li><button class="exl" onclick="openEx('${ja(l.id)}')">${esc(l.n)}</button>: ${esc(l.r)}</li>`).join('')}<li>Rumpf (10 Min.), je 2 Sätze: ${s.core.map(c => `<button class="exl" onclick="openEx('${ja(c[1])}')">${esc(c[0])}</button>`).join(', ')}</li></ul>
    <p class="mt-1 text-xs" style="color:var(--mute)">Tippe auf eine Übung für Erklärung und Grafik.</p>
    ${s.same ? '<p class="mt-2 text-sm"><b>Heute auch eine harte Radeinheit:</b> erst Rad, dann Kraft, möglichst mit einigen Stunden Abstand. So leidet die Qualität der Intervalle nicht.</p>' : ''}<p class="mt-2 text-xs" style="color:var(--mute)">Bewegung vor Gewicht, bei Schmerzen abbrechen. Die Radeinheit des Tages und die Wochenstunden bleiben unverändert, Kraft kommt zusätzlich.</p>
    ${cur ? sqBtn('str', i) : sqLater()}${cur ? `<button onclick="togStr(${ja(i)})" class="ghost mt-2 !py-2 text-sm" style="${esc(dn ? 'color:var(--ok);border-color:var(--ok)' : '')}">${dn === 'part' ? '◐ Kraft teilweise erledigt' : dn ? '✓ Kraft erledigt' : 'Kraft als erledigt markieren'}</button>` : ''}</div>`;
}
function setStr(n){ S.d.strN = n; if (n && !S.d.strLvl) S.d.strLvl = 'new'; if (n && !S.d.strPlace) S.d.strPlace = 'gym'; save(); render(); }
function setStrOpt(k, v){ S.d[k] = v; save(); render(); }
function tglStrDay(i){ const a = [...(S.d.strDays || [false, false, false, false, false, false, false])]; a[i] = !a[i]; S.d.strDays = a.some(Boolean) ? a : undefined; save(); render(); }
function strUi(d){
  const n = d.strN | 0;
  return `<div><p class="mb-2 font-semibold">Zusätzliches Krafttraining?</p><div class="flex flex-wrap gap-2">${chip('Nein', !n, 'setStr(0)')}${chip('1× pro Woche', n === 1, 'setStr(1)')}${chip('2× pro Woche', n === 2, 'setStr(2)')}</div>
    ${n && d.sex === 'f' ? '<p class="mt-2 text-xs" style="color:var(--mute)">Gut zu wissen: Schweres Krafttraining stärkt auch die Knochen. Für Frauen ist das besonders wertvoll, weil das Osteoporose-Risiko höher ist.</p>' : ''}
    ${n ? `<p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Dein Niveau</p><div class="flex flex-wrap gap-2">${chip('Einsteiger (4 Wochen Technik zuerst)', d.strLvl !== 'exp', "setStrOpt('strLvl','new')")}${chip('Erfahren', d.strLvl === 'exp', "setStrOpt('strLvl','exp')")}</div>
      <p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Wo trainierst du?</p><div class="flex flex-wrap gap-2">${chip('Fitnessstudio', d.strPlace !== 'home', "setStrOpt('strPlace','gym')")}${chip('Zuhause', d.strPlace === 'home', "setStrOpt('strPlace','home')")}</div>
      <p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Wunschtage (optional). Ohne Auswahl wählt die App Tage, die harte Radeinheiten und den Long Ride schonen.</p><div class="flex flex-wrap gap-2">${SD.map((x, i) => chip(x, d.strDays && d.strDays[i], `tglStrDay(${ja(i)})`)).join('')}</div>
      <p class="mt-3 text-sm" style="color:var(--mute)">Aufbauphase: 2 Einheiten (bei 1 Wunsch 1) mit schweren Lasten, in der Spitzenphase nur noch eine zur Erhaltung, in den letzten 2 Wochen vor dem Ziel keine. Das Krafttraining kommt zu deinen Radstunden dazu.</p>` : ''}</div>`;
}


function load(fresh){
  try { if (fresh) throw 0; const r = localStorage.getItem(K); if (r) { const o = secC(JSON.parse(r)); try { o.rev = Math.max(+o.rev || 0, +(localStorage.getItem('relentless.rev') || 0)); } catch (e) { elog(e); } delete o.strava; delete o.acts; delete o.syncs; o.pending = false; const dc = (o.d && o.d.commute) || []; o.d = Object.assign({weight:75, perDay:false, dayMin:[60,60,60,60,60,180,240], dist:227, hm:5500, commuter:dc.some(Boolean)}, o.d || {}); if (o.p) o.p = Object.assign({weight:75, perDay:false, dayMin:[60,60,60,60,60,180,240], dist:227, hm:5500}, o.p); return o; } } catch(e){ if (e !== 0) elog(e); /* 0 = bewusst frisch starten */ }
  return {step:1, d:{goal:'event', eventName:'', eventDate:iso(120), targetTime:'', ftp:250, ftpTarget:280, hours:8, endDate:iso(84), avail:[false,true,true,true,true,true,true], commute:[false,false,false,false,false,false,false], commuteMin:25, longDay:6, commuter:false, weight:75, perDay:false, dayMin:[60,60,60,60,60,180,240], dist:'', hm:''},
          p:null, plan:null, log:[], done:{}, note:'', rev:(() => { try { return +(localStorage.getItem('relentless.rev') || 0); } catch (e) { elog(e); return 0; } })()};
}
/* Speichern (F-04, F-06): Jede Speicherung erhöht eine Revisionsnummer. Hat ein anderer Tab inzwischen einen neueren
   Stand gespeichert, übernimmt dieser Tab ihn, statt ihn zu überschreiben, und sagt das. Scheitert das Speichern,
   erscheint auf jeder Seite eine Warnung mit Sicherung und neuem Versuch. */
const REVK = 'relentless.rev';
let storeWhy = '', syncMsg = '';
function save(){
  try {
    const st = +(localStorage.getItem(REVK) || 0);
    if (st > (+S.rev || 0)) { storeConflict(); bkMirrorSoon(); return; }
    S.rev = st + 1;
    localStorage.setItem(K, JSON.stringify(S)); localStorage.setItem(REVK, String(S.rev)); writeLib(); storeErr = false; storeWhy = '';
  } catch(e){ storeErr = true; storeWhy = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014) ? 'quota' : e && e.name === 'SecurityError' ? 'blocked' : 'other'; }
  bkMirrorSoon(); /* Spiegel in IndexedDB, gebündelt (Datensicherung) */
}
function storeConflict(){ try { S = load(); } catch (e) { elog(e); } syncMsg = 'Deine Daten wurden in einem anderen Tab oder Fenster geändert. Diese Ansicht zeigt jetzt den neuesten Stand. Deine letzte Änderung hier wurde nicht übernommen, bitte wiederhole sie.'; setTimeout(() => render(), 0); }
function storeRetry(){ save(); render(); }
function storeBanner(){
  const m = syncMsg ? `<div role="status" class="flex items-center gap-2 text-sm" style="background:#e6f7f6;color:#071747;padding:8px 16px;border-bottom:1px solid var(--line)"><span class="min-w-0 flex-1">${esc(syncMsg)}</span><button class="text-sm font-semibold" style="background:none;border:0;color:#071747;text-decoration:underline;min-height:32px" onclick="syncMsg='';render()">OK</button></div>` : '';
  if (!storeErr) return m;
  const why = {quota:'Der Speicher dieses Browsers für die App ist voll.', blocked:'Der Browser erlaubt der App gerade nicht zu speichern, zum Beispiel im privaten Modus oder wegen der Datenschutz-Einstellungen.'}[storeWhy] || 'Der Browser hat das Speichern abgelehnt.';
  return m + `<div role="alert" class="text-sm" style="background:#fdecea;color:#7a1f17;padding:10px 16px;border-bottom:1px solid #f5c2bd"><p><b>Deine Änderungen werden gerade nicht gespeichert.</b> ${why} Wenn du die App jetzt schließt, gehen sie verloren. Lade eine Sicherung herunter.</p><div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 !py-1.5 text-sm" onclick="exportPlans()">Sicherung herunterladen</button><button class="ghost !px-3 !py-1.5 text-sm" onclick="storeRetry()">Erneut speichern</button></div></div>`;
}
try { window.addEventListener('storage', e => {
  if (e.storageArea && e.storageArea !== localStorage) return;
  if (e.key !== K && e.key !== null) return;
  try { S = load(); } catch (x) { elog(x); return; }
  syncMsg = 'In einem anderen Tab oder Fenster wurde etwas geändert. Diese Ansicht zeigt jetzt den aktuellen Stand.'; render();
}); } catch (e) { elog(e); }

const chev = o => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true" style="flex:none;transition:transform .15s;transform:rotate(${esc(o ? 180 : 0)}deg)"><path d="M3 6l5 5 5-5"/></svg>`;
const isOpenF = (k, def) => (S.fold && k in S.fold) ? S.fold[k] : def;
const fold = (k, title, inner, def, right = '') => { if (foldFlat) return `<section class="panel" id="fx-${esc(k)}">${title ? `<div class="p-4 pb-2"><h2 class="hd text-xl font-semibold">${title}</h2>${right ? `<p class="mt-0.5 text-sm" style="color:var(--mute)">${right}</p>` : ''}</div>` : '<div class="pt-4"></div>'}<div class="px-4 pb-4">${inner}</div></section>`; const o = isOpenF(k, def); return `<section class="panel"><button onclick="foldTog('${ja(k)}',${ja(def)})" aria-expanded="${o}" class="flex w-full items-center gap-3 p-4 text-left"><span class="min-w-0 flex-1"><span class="hd block text-xl font-semibold">${title}</span>${right ? `<span class="mt-0.5 block text-sm" style="color:var(--mute)">${right}</span>` : ''}</span>${chev(o)}</button>${o ? `<div class="px-4 pb-4">${inner}</div>` : ''}</section>`; };
function foldTog(k, def){ S.fold = S.fold || {}; S.fold[k] = !isOpenF(k, def); save(); render(); }

