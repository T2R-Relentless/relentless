/* ---------- F22: Reifendruckrechner (Mehr → Werkzeuge → Reifendruck) ----------
   Eigenes Modell, keine Herstellerformel:
   1. Ziel ist eine Reifeneinfederung von etwa 15 % der Reifenhöhe unter Last (Frank Berto, „Tire pressure and handling“,
      Bicycle Quarterly 2006); auf Schotter 18 %, im Cyclocross 25 % (mehr Grip und Komfort, mehr Durchschlagrisiko).
   2. Effektive Breite: Nennbreite + 0,4 mm je mm Felgeninnenweite über 17 mm (Reifen werden auf breiteren Felgen breiter;
      Richtwert aus Messungen, ETRTO-Referenzfelgen 17 mm für 25–32 mm). Reifenhöhe ≈ 0,92 × effektive Breite.
   3. Last je Rad aus Fahrer + Rad + Gepäck, statisch etwa 45/55 (vorn/hinten); vorn 2 Prozentpunkte Zuschlag für Bremsen
      und Lenken, sonst fiele der Vorderdruck unrealistisch niedrig aus.
   4. Aufstandsfläche A = K · δ · √(R · r) mit δ = Einfederung, R = Radius des Rads, r = halbe Reifenbreite (Ellipse aus
      Länge und Breite der Abplattung). K = 3,15 ist der einzige angepasste Wert: so ergeben 83 kg auf 28 mm (21 mm innen,
      tubeless, trocken) hinten 4,5 bar und vorn 4,0 bar, im üblichen Bereich von etwa 4,0 bis 4,8 bar. Rein geometrisch
      wäre K = 2π; die echte Aufstandsfläche ist kleiner, weil die Flanken sich wölben.
   5. Druck p = Last / A, danach Faktoren für Untergrund, Karkasse, Schlauch/Tubeless und Nässe.
   Grenzen: Hookless höchstens 5 bar (72,5 psi, ETRTO), nie über das eingetragene Maximum von Reifen oder Felge, nie unter
   einen Mindestdruck (Durchschlag, Burping). Wird eine Grenze erreicht, steht ein Warnhinweis da. Rundung 0,05 bar / 0,5 psi. */
const TP_PSI = 14.5038, TP_K = 3.15, TP_HOOKLESS = 5.0;
const TP_TYPE = {road:['Straße', .15, {tube:3.0, latex:3.0, tl:2.5}], gravel:['Gravel', .18, {tube:1.8, latex:1.8, tl:1.4}], cx:['Cyclocross', .25, {tube:1.8, latex:1.8, tl:1.2}]};
const TP_SURF = {smooth:['glatt', 1], rough:['rau', .93], cobble:['Kopfsteinpflaster', .85]};
const TP_CASE = {thin:['dünn', 1.03], std:['Standard', 1], reinf:['verstärkt', .95]};
const TP_TUBE = {tube:['Schlauch', 1], latex:['Latexschlauch', .97], tl:['Tubeless', .95]};
const TP_WHEEL = {'700c':622, '650b':584, '650c':571}, TP_WET = .94;
const tpR05 = v => Math.round(v * 20) / 20, tpRpsi = v => Math.round(v * 2) / 2;
/* Druck für eine Last (N) in bar, ohne Grenzen */
function tpRaw(o, loadN){
  const wEff = o.w + .4 * (Math.max(13, Math.min(35, o.inner)) - 17), h = .92 * wEff, d = TP_TYPE[o.type][1] * h, R = TP_WHEEL[o.wheel] / 2 + h, r = wEff / 2;
  const A = TP_K * d * Math.sqrt(R * r) * 1e-6, bar = loadN / A / 1e5;
  return bar * TP_SURF[o.surf][1] * TP_CASE[o.cas][1] * TP_TUBE[o.tube][1] * (o.wet ? TP_WET : 1);
}
/* Empfehlung vorn/hinten mit Grenzen und Warnungen */
function tpCalc(o){
  const kg = (+o.rider || 0) + (+o.bike || 0) + (+o.bag || 0), N = kg * 9.81, fs = .45, warn = [];
  if (!(kg > 20) || !(o.w > 15)) return null;
  let f = tpRaw(o, N * (fs + .02)), r = tpRaw(o, N * (1 - fs - .02));
  const lim = [o.hook === 'hookless' ? [TP_HOOKLESS, 'Hookless-Felge: höchstens 5 bar (72,5 psi) laut ETRTO.'] : null, o.maxTire > 0 ? [+o.maxTire, 'Maximaldruck des Reifens erreicht.'] : null, o.maxRim > 0 ? [+o.maxRim, 'Maximaldruck der Felge erreicht.'] : null].filter(Boolean);
  const mx = lim.length ? lim.reduce((a, b) => b[0] < a[0] ? b : a) : null, mn = TP_TYPE[o.type][2][o.tube];
  [['f', f], ['r', r]].forEach(([k, v]) => { let x = v;
    if (mx && x > mx[0]) { x = mx[0]; if (!warn.includes(mx[1])) warn.push(mx[1]); }
    if (x < mn) { x = mn; const t = `Mindestdruck ${String(mn).replace('.', ',')} bar: darunter drohen Durchschläge${o.tube === 'tl' ? ' und Luftverlust an der Felge' : ''}.`; if (!warn.includes(t)) warn.push(t); }
    if (k === 'f') f = x; else r = x; });
  if (f > r) f = r;
  return {kg, fBar:tpR05(f), rBar:tpR05(r), fPsi:tpRpsi(f * TP_PSI), rPsi:tpRpsi(r * TP_PSI), rearPct:Math.round((1 - fs) * 100), wEff:Math.round((o.w + .4 * (Math.max(13, Math.min(35, o.inner)) - 17)) * 10) / 10, warn};
}
/* Profile (Rennrad, Gravel), gespeichert in S.tire (Zustand, Sicherung) */
const TP_DEF = {road:{name:'Rennrad', type:'road', surf:'smooth', wet:false, rider:null, bike:8, bag:0, w:28, cas:'std', wheel:'700c', hook:'hook', inner:21, tube:'tl', maxTire:0, maxRim:0},
  gravel:{name:'Gravel', type:'gravel', surf:'rough', wet:false, rider:null, bike:9.5, bag:1, w:40, cas:'std', wheel:'700c', hook:'hook', inner:25, tube:'tl', maxTire:0, maxRim:0}};
function tpState(){ S.tire = S.tire && typeof S.tire === 'object' ? S.tire : {}; const t = S.tire; t.act = TP_DEF[t.act] ? t.act : 'road'; t.prof = t.prof || {}; Object.keys(TP_DEF).forEach(k => { t.prof[k] = {...TP_DEF[k], ...(t.prof[k] || {})}; }); return t; }
const tpOpts = () => { const t = tpState(), o = {...t.prof[t.act]}; if (!(o.rider > 0)) o.rider = wfCur().kg || 75; return o; };
function tpSet(k, v){ const t = tpState(), o = t.prof[t.act];
  if (k === 'act') t.act = TP_DEF[v] ? v : t.act;
  else if (['rider', 'bike', 'bag', 'w', 'inner', 'maxTire', 'maxRim'].includes(k)) { const n = wfNum(v); o[k] = k === 'rider' && !(n > 0) ? null : n > 0 ? Math.round(n * 10) / 10 : 0; }
  else if (k === 'wet') o.wet = !!v; else o[k] = v;
  save(); render(); }
function tpPage(){
  const t = tpState(), o = tpOpts(), c = tpCalc(o), P = t.prof[t.act];
  const chips = (k, M) => `<div class="flex flex-wrap gap-2">${Object.entries(M).map(([v, l]) => chip(Array.isArray(l) ? l[0] : l, String(o[k]) === v, `tpSet('${ja(k)}','${ja(v)}')`)).join('')}</div>`;
  const num = (k, l, ph, step = '0.5') => field(l, `<input type="text" inputmode="decimal" class="inp" style="min-height:44px" value="${esc(P[k] ? String(P[k]).replace('.', ',') : '')}" placeholder="${esc(ph || '')}" onchange="tpSet('${ja(k)}',this.value)">`);
  const res = c ? `<section class="panel p-4" aria-live="polite"><p class="eyebrow">Empfohlener Startwert</p>
      <div class="mt-2 grid grid-cols-2 gap-3"><div class="p-3" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">Vorn</div><div class="hd text-3xl font-semibold">${c.fBar.toFixed(2).replace('.', ',')} bar</div><div class="text-sm">${String(c.fPsi).replace('.', ',')} psi</div></div>
      <div class="p-3" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">Hinten</div><div class="hd text-3xl font-semibold">${c.rBar.toFixed(2).replace('.', ',')} bar</div><div class="text-sm">${String(c.rPsi).replace('.', ',')} psi</div></div></div>
      <p class="mt-3 text-sm">${c.rBar > c.fBar ? `Hinten höher wegen etwa ${c.rearPct} % Gewicht auf dem Hinterrad.` : 'Vorn und hinten gleich, weil eine Grenze erreicht ist (siehe Hinweis).'} Gerechnet mit ${String(Math.round(c.kg * 10) / 10).replace('.', ',')} kg Gesamtgewicht und ${String(c.wEff).replace('.', ',')} mm effektiver Reifenbreite.</p>
      ${c.warn.map(w => `<p class="mt-2 p-2.5 text-sm" role="alert" style="border:1px solid var(--line);border-left:3px solid #d9a400">${esc(w)}</p>`).join('')}
      <p class="mt-3 text-sm font-semibold">Startwert – nach Gefühl in kleinen Schritten anpassen und vor jeder Fahrt prüfen.</p></section>`
    : '<section class="panel p-4"><p class="text-sm">Trag Gewicht und Reifenbreite ein.</p></section>';
  return `<div class="flex flex-wrap gap-2">${Object.entries(TP_DEF).map(([k, d]) => chip(d.name, t.act === k, `tpSet('act','${ja(k)}')`)).join('')}</div>${res}
    <section class="panel mt-3 p-4 space-y-4">
      <div><p class="mb-2 font-semibold">Fahrtart</p>${chips('type', TP_TYPE)}</div>
      <div><p class="mb-2 font-semibold">Untergrund</p>${chips('surf', TP_SURF)}<div class="mt-2">${chip('Nass', !!o.wet, `tpSet('wet',${o.wet ? 'false' : 'true'})`)}</div></div>
      <div class="grid grid-cols-3 gap-3">${num('rider', 'Fahrer (kg)', String(wfCur().kg || 75).replace('.', ','))}${num('bike', 'Rad (kg)')}${num('bag', 'Gepäck (kg)')}</div>
      <div class="grid grid-cols-2 gap-3">${num('w', 'Reifenbreite (mm)', '28')}${num('inner', 'Felge innen (mm)', '21')}</div>
      <div><p class="mb-2 font-semibold">Karkasse</p>${chips('cas', TP_CASE)}</div>
      <div><p class="mb-2 font-semibold">Laufrad</p>${chips('wheel', {'700c':'700c', '650b':'650b', '650c':'650c'})}</div>
      <div><p class="mb-2 font-semibold">Felge</p>${chips('hook', {hook:'mit Haken', hookless:'Hookless'})}</div>
      <div><p class="mb-2 font-semibold">Schlauch oder Tubeless</p>${chips('tube', TP_TUBE)}</div>
      <div class="grid grid-cols-2 gap-3">${num('maxTire', 'Max. Reifen (bar, optional)')}${num('maxRim', 'Max. Felge (bar, optional)')}</div>
      <p class="text-xs" style="color:var(--mute)">Das Fahrergewicht kommt aus „Gewicht und FTP“, solange du hier nichts einträgst. Die Reifenbreite steht auf der Reifenflanke.</p></section>
    <details class="mt-3 text-xs" style="color:var(--mute)"><summary class="cursor-pointer font-semibold" style="min-height:44px;display:flex;align-items:center">So rechnet der Rechner</summary><p class="mt-1">Ziel ist eine Einfederung von etwa 15 % der Reifenhöhe (Frank Berto), auf Schotter 18 %, im Cyclocross 25 %. Die Last je Rad ergibt sich aus Gesamtgewicht und Gewichtsverteilung (etwa 45/55), vorn mit einem kleinen Zuschlag für Bremsen und Lenken. Breitere Felgen machen den Reifen breiter. Raue Strecken, Nässe, Tubeless und steife Karkassen erlauben weniger Druck. Hookless-Felgen höchstens 5 bar (ETRTO).</p></details>`;
}
