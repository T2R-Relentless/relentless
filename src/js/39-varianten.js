/* ---------- Backlog 07.11.2026, Punkt 5 (F10): Einheit gegen eine gleichwertige Variante austauschen ----------
   Gleichwertig heißt: gleicher Reiz (Grundlage, Sweet Spot, Schwelle, VO2max, Sprint, Erholung), TSS und Zeit in der
   Zielzone innerhalb von ±10 %, Gesamtdauer innerhalb von ±15 %. Die Bibliothek beschreibt nur die Struktur; Länge und
   Wiederholungen werden an die geplante Einheit angepasst und danach geprüft. Was die Prüfung nicht besteht, wird nicht
   angeboten. Wattwerte entstehen beim Anzeigen und beim Export aus der aktuellen FTP (Punkt 4). Die ursprüngliche
   Einheit bleibt in vOrig gespeichert (Zurück zum Original), der Name in varOf (Logbuch „Variante von …“). */
/* Standard-Zielbereich je Reiz für gleichmäßige Blöcke (wenn die Vorlage keinen eigenen hat und das Original ein
   Over-Under ist, dessen lo/hi nur den Über-Teil beschreibt) */
const VA_DEF = {sst:[88, 94], thr:[95, 105], vo2:[106, 120], spr:[150, 250]};
const VA_ZONE = {base:[55, 77], rec:[0, 56], sst:[80, 104], thr:[88, 112], vo2:[100, 140], spr:[140, 400]};
const VA_STIM = {base:'Grundlage', rec:'Erholung', sst:'Sweet Spot', thr:'Schwelle', vo2:'VO2max', spr:'Sprint'};
function vaStim(x){
  if (!x || !x.m || x.parts || x.blocked || x.both) return null;
  if (/^(Eventtag|Aktivierung|Deine Zieltour|Fitness-Check)/.test(x.n || '') || x.t === 'race' || x.t === 'test') return null;
  if (x.t === 'rec') return 'rec';
  if (x.t === 'base' || (x.t === 'long' && !/Eventsimulation/.test(x.n || ''))) return 'base';
  if (x.t === 'sst') return x.iv ? 'sst' : null;
  if (x.t === 'thr') return x.iv ? 'thr' : null;
  if (x.t === 'vo2') return x.iv ? (x.iv.lo >= 140 ? 'spr' : 'vo2') : null;
  return null;
}
/* Abschnitte einer Einheit als [Minuten, % FTP] */
function vaSegs(x){
  const v = x.iv, mid = (a, b) => (a + b) / 2;
  if (!v) return [[x.m, mid(x.lo || 56, x.hi || 72)]];
  const S2 = [[v.wu || 0, 57.5]], wp = mid(v.lo, v.hi), rp = v.rlo ? mid(v.rlo, v.rhi) : 47.5;
  if (v.seq) v.seq.forEach((w, q) => { S2.push([w, wp]); if (q < v.seq.length - 1) S2.push([v.rest, rp]); });
  else for (let s = 0; s < (v.sets || 1); s++) { for (let r = 0; r < v.reps; r++) { S2.push([v.work, wp]); if (r < v.reps - 1) S2.push([v.rest, rp]); } if (s < (v.sets || 1) - 1) S2.push([v.sr || 3, 47.5]); }
  S2.push([(v.cd || 0) + (v.pad || 0), 50]);
  /* Rest bis zur geplanten Dauer locker (z. B. wenn die Einheit verlängert wurde) */
  const tot = S2.reduce((a, s) => a + s[0], 0); if (x.m > tot + .5) S2.push([x.m - tot, 50]);
  return S2;
}
function vaMet(x, stim){
  const S2 = vaSegs(x), z = VA_ZONE[stim] || [0, 999];
  return {m:S2.reduce((a, s) => a + s[0], 0), tss:Math.round(S2.reduce((a, s) => a + s[0] / 60 * Math.pow(s[1] / 100, 2) * 100, 0) * 10) / 10,
    tiz:Math.round(S2.reduce((a, s) => a + (s[1] >= z[0] && s[1] <= z[1] ? s[0] : 0), 0) * 10) / 10};
}
const vaNear = (a, b, t) => b === 0 ? a === 0 : Math.abs(a - b) <= t * b + 1e-9;
function vaEq(a, b, stim){ const A = vaMet(a, stim), B = vaMet(b, stim); return vaNear(B.tss, A.tss, .1) && vaNear(B.tiz, A.tiz, .1) && vaNear(B.m, A.m, .15); }
/* Bibliothek je Reiz. sh: Form der Intervalle (Wiederholungen werden angepasst), seq: Pyramide (wird skaliert),
   tx: nur Beschreibung und Trittfrequenz (Grundlage, Erholung, draußen statt Rolle). */
const VA_LIB = {
  sst:[
    {k:'sst-3x15', s:'Gleicher Sweet-Spot-Reiz, längere Blöcke mit weniger Wechseln.', sh:{work:15, rest:5}, cad:'85–95 U/min'},
    {k:'sst-4x10', s:'Gleicher Sweet-Spot-Reiz, kürzere Blöcke. Leichter durchzuhalten.', sh:{work:10, rest:4}, cad:'85–95 U/min'},
    {k:'sst-pyr', s:'Gleicher Sweet-Spot-Reiz als Pyramide: die Blöcke werden länger und wieder kürzer.', seq:[6, 10, 14, 10, 6], rest:4, cad:'85–95 U/min'},
    {k:'sst-cad', s:'Gleicher Reiz mit niedriger Trittfrequenz im großen Gang (Kraftausdauer). Bei Kniebeschwerden normal treten.', sh:{work:12, rest:5}, cad:'60–70 U/min in den Intervallen'},
    {k:'sst-ou', nm:'Over-Under leicht', s:'Over-Under leicht: 1 Min. an der Schwelle, 3 Min. Sweet Spot, ohne locker zu werden.', sh:{sets:3, work:1, rest:3, lo:98, hi:103, rlo:84, rhi:88, sr:5, unit:4}, cad:'85–95 U/min'},
    {k:'sst-tw', nm:'Sweet Spot Tempowechsel', s:'Sweet Spot mit Tempowechseln: 2 Min. am oberen, 2 Min. am unteren Rand, ohne locker zu werden.', sh:{work:2, rest:2, lo:93, hi:97, rlo:84, rhi:88}, cad:'85–95 U/min'},
    {k:'sst-out', s:'Gleiche Einheit draußen: die Blöcke an einem gleichmäßigen Anstieg oder auf einer ruhigen Straße fahren.', tx:1, cad:'80–90 U/min'}
  ],
  thr:[
    {k:'thr-3x12', s:'Gleicher Schwellenreiz, kürzere Blöcke.', sh:{work:12, rest:6}, cad:'90–100 U/min'},
    {k:'thr-4x10', s:'Gleicher Schwellenreiz in vier Blöcken, am besten bergauf.', sh:{work:10, rest:5}, cad:'70–80 U/min'},
    {k:'thr-5x8', s:'Gleicher Schwellenreiz, viele kurze Blöcke. Mental leichter.', sh:{work:8, rest:4}, cad:'90–100 U/min'},
    {k:'thr-pyr', s:'Gleicher Schwellenreiz als Pyramide.', seq:[5, 10, 15, 10, 5], rest:5, cad:'85–95 U/min'},
    {k:'thr-ou', nm:'Over-Under', s:'Over-Under: 1 Min. knapp über, 2 Min. knapp unter der Schwelle, ohne locker zu werden.', sh:{sets:3, work:1, rest:2, lo:105, hi:110, rlo:88, rhi:94, sr:5, unit:3}, cad:'90–100 U/min'},
    {k:'thr-ou2', nm:'Over-Under lang', s:'Over-Under mit längeren Wechseln: 2 Min. knapp über, 3 Min. knapp unter der Schwelle.', sh:{sets:2, work:2, rest:3, lo:103, hi:108, rlo:88, rhi:94, sr:5}, cad:'85–95 U/min'},
    {k:'thr-4x5', s:'Gleicher Schwellenreiz in kurzen Blöcken mit kurzen Pausen.', sh:{work:5, rest:2.5}, cad:'90–100 U/min'},
    {k:'thr-att', nm:'Schwelle mit Antritten', s:'Schwelle mit Antritten: alle 2½ Min. ein 30-Sekunden-Antritt, dazwischen knapp unter der Schwelle weiterfahren.', sh:{sets:3, work:.5, rest:2, lo:115, hi:130, rlo:88, rhi:93, sr:5}, cad:'Antritte 100–110, dazwischen 85–95 U/min'},
    {k:'thr-att2', nm:'Schwelle mit kurzen Antritten', s:'Schwelle mit kurzen Antritten: jede Minute 15 Sek. kräftig, dann knapp unter der Schwelle.', sh:{sets:2, work:.25, rest:.75, lo:120, hi:140, rlo:88, rhi:93, sr:5}, cad:'Antritte 100–110, dazwischen 85–95 U/min'},
    {k:'thr-out', s:'Gleiche Einheit draußen: die Blöcke an einem langen Anstieg fahren.', tx:1, cad:'75–85 U/min'}
  ],
  vo2:[
    {k:'vo2-6x3', s:'Gleicher VO2max-Reiz, kürzere Intervalle.', sh:{work:3, rest:3}, cad:'100–110 U/min'},
    {k:'vo2-4x5', s:'Gleicher VO2max-Reiz, längere Intervalle, am besten am Berg.', sh:{work:5, rest:5}, cad:'80–90 U/min'},
    {k:'vo2-3015', s:'Gleicher VO2max-Reiz als 30/15: 30 Sek. hart, 15 Sek. locker, ohne Pause durch die Serie.', sh:{sets:3, work:.5, rest:.25, sr:3, lo:115, hi:125, unit:.5}, cad:'100–110 U/min'},
    {k:'vo2-6', s:'Gleicher VO2max-Reiz, lange Intervalle an der Untergrenze.', sh:{work:6, rest:3, lo:102, hi:108}, cad:'90–100 U/min'},
    {k:'vo2-pyr', s:'Gleicher VO2max-Reiz als Pyramide.', seq:[2, 3, 4, 3, 2], rest:3, cad:'95–105 U/min'},
    {k:'vo2-2m', s:'Gleicher VO2max-Reiz in 2-Minuten-Intervallen.', sh:{work:2, rest:2}, cad:'100–110 U/min'},
    {k:'vo2-1m', s:'Gleicher VO2max-Reiz in 1-Minuten-Intervallen, kurze Pausen.', sh:{work:1, rest:1}, cad:'100–110 U/min'},
    {k:'vo2-4020', s:'Gleicher VO2max-Reiz als 40/20: 40 Sek. hart, 20 Sek. locker, ohne Pause durch die Serie.', sh:{sets:2, work:2 / 3, rest:1 / 3, sr:4, lo:115, hi:125}, cad:'100–110 U/min'},
    {k:'vo2-out', s:'Gleiche Einheit draußen, die Intervalle an einem Anstieg.', tx:1, cad:'85–95 U/min'}
  ],
  spr:[
    {k:'spr-12s', s:'Gleicher Sprintreiz: kurze Maximalsprints in Serien, voll erholen.', sh:{sets:3, work:.2, rest:3, sr:8, lo:150, hi:250, unit:.2}, cad:'110–130 U/min'},
    {k:'spr-20s', s:'Gleicher Sprintreiz: 20-Sekunden-Antritte, voll erholen.', sh:{work:1 / 3, rest:4}, cad:'100–120 U/min'},
    {k:'spr-out', s:'Gleiche Einheit draußen: Antritte aus dem Rollen auf einer sicheren, leeren Straße.', tx:1, cad:'100–120 U/min'}
  ],
  base:[
    {k:'base-cad', s:'Gleiche Grundlage, darin 5×2 Min. mit 105–115 U/min bei gleicher Leistung.', tx:1, cad:'90 U/min, Blöcke 105–115'},
    {k:'base-tech', s:'Gleiche Grundlage, dazu Fahrtechnik: Kurven, vorausschauend schalten, freihändig trinken.', tx:1, cad:'frei, 80–100 U/min'},
    {k:'base-new', s:'Gleiche Grundlage auf einer neuen Runde, gern in einer ruhigen Gruppe.', tx:1, cad:'85–95 U/min'},
    {k:'base-split', s:'Gleiche Grundlage mit Einteilung: erste Hälfte unteres, zweite Hälfte oberes Zone 2.', tx:1, cad:'90–100 U/min'},
    {k:'base-indoor', s:'Gleiche Grundlage auf der Rolle, gleichmäßig in Zone 2. Gut bei schlechtem Wetter.', tx:1, cad:'90 U/min'}
  ],
  rec:[
    {k:'rec-spin', s:'Gleiche Erholung mit leichtem Gang und hoher Trittfrequenz.', tx:1, cad:'95–105 U/min'},
    {k:'rec-indoor', s:'Gleiche Erholung auf der Rolle, ganz locker.', tx:1, cad:'85–95 U/min'},
    {k:'rec-cafe', s:'Gleiche Erholung als ruhige Kaffeerunde, flach und ohne Tempo.', tx:1, cad:'85–95 U/min'}
  ]
};
const VA_NAME = {'sst-out':'draußen', 'thr-out':'draußen', 'vo2-out':'draußen', 'spr-out':'draußen', 'base-cad':'mit Trittfrequenz', 'base-tech':'mit Fahrtechnik', 'base-new':'neue Runde', 'base-split':'mit Einteilung', 'base-indoor':'auf der Rolle', 'rec-spin':'mit hoher Trittfrequenz', 'rec-indoor':'auf der Rolle', 'rec-cafe':'Kaffeerunde'};
const vaR = v => Math.round(v * 4) / 4;
function vaSeqTxt(v){ return `${v.wu} Min. einfahren · Pyramide ${v.seq.join('-')} Min. @ ${v.lo}–${v.hi} % · ${durT(v.rest)} locker dazwischen · ${v.cd} Min. ausfahren`; }
/* Eine Variante aus einer Vorlage bauen und auf die Einheit x anpassen. null, wenn es nicht passt. */
function vaBuild(x, T, stim){
  const o = x.vOrig || x, base = stim === 'base' || stim === 'rec', st0 = o.n.replace(/\s*\(.*\)$/, '');
  if (T.tx) {
    const n = (base ? st0.replace(/,.*$|\s+(mit|auf|neue).*$/, '') : st0) + ', ' + VA_NAME[T.k];
    return {...unsplit(o), n, cad:T.cad, st:T.s + (o.iv ? ' ' + ivTxt(o.iv) : ''), tip:o.tip, vk:T.k};
  }
  const v0 = o.iv; if (!v0) return null;
  const A = vaMet(o, stim), m0 = o.m, dz = v0.rlo && VA_DEF[stim], lo = T.sh && T.sh.lo || (dz ? dz[0] : v0.lo), hi = T.sh && T.sh.hi || (dz ? dz[1] : v0.hi);
  let iv;
  if (T.seq) { const sum = T.seq.reduce((a, b) => a + b, 0), f = A.tiz / sum; iv = {seq:T.seq.map(w => Math.max(1, Math.round(w * f))), rest:T.rest, lo, hi}; iv.reps = iv.seq.length; iv.work = Math.max(...iv.seq); if (new Set(iv.seq).size < 3) return null; }
  else { const sh = T.sh; let best = null;
    for (let r = 1; r <= 40; r++) { const c = {sets:sh.sets || 1, reps:r, work:sh.work, rest:sh.rest, lo, hi, ...(sh.rlo ? {rlo:sh.rlo, rhi:sh.rhi} : {}), ...(sh.sr ? {sr:sh.sr} : {})};
      const tz = vaMet({m:0, iv:{...c, wu:0, cd:0}}, stim).tiz; if (!best || Math.abs(tz - A.tiz) < best.d) best = {c, d:Math.abs(tz - A.tiz)}; }
    iv = best.c; if (iv.reps < 2 && !(iv.sets > 1)) return null; }
  const core = ivCore(iv), rem = m0 - core; if (rem < 15) return null;
  iv.wu = Math.max(8, Math.round(rem * .6)); iv.cd = Math.round(rem - iv.wu); if (iv.cd < 5) return null;
  const nm = T.seq ? `${VA_STIM[stim]} Pyramide ${iv.seq.join('-')}` : T.sh.rlo ? `${T.nm} ${(iv.sets || 1) > 1 ? iv.sets + '×' : ''}${Math.round(iv.reps * (iv.work + iv.rest) - iv.rest)} Min.` : T.k === 'vo2-3015' ? `VO2max 30/15, ${iv.sets}×${iv.reps}` : T.k === 'vo2-4020' ? `VO2max 40/20, ${iv.sets}×${iv.reps}` : `${VA_STIM[stim]} ${(iv.sets || 1) > 1 ? iv.sets + '×' : ''}${iv.reps}×${durT(iv.work).replace(' Min.', '')}`;
  const sig = q => JSON.stringify([q.sets || 1, q.reps, q.work, q.rest, q.lo, q.hi, q.rlo || 0, q.seq || 0]); if (sig(iv) === sig(v0) || (!iv.seq && !v0.seq && iv.reps === v0.reps && iv.work === v0.work && (iv.sets || 1) === (v0.sets || 1))) return null;
  const y = {...unsplit(o), n:nm, iv, m:Math.round(iv.wu + core + iv.cd), cad:T.cad, st:ivTxt(iv), tip:T.s, vk:T.k};
  delete y.cut; delete y.parts;
  return vaEq(o, y, stim) ? y : null;
}
const vaPref = () => { if (!S.vaPref || typeof S.vaPref !== 'object') S.vaPref = {fav:{}, ban:{}}; S.vaPref.fav = S.vaPref.fav || {}; S.vaPref.ban = S.vaPref.ban || {}; return S.vaPref; };
/* 2–3 Vorschläge: Lieblingsvarianten zuerst, gesperrte nie, die aktuelle Variante nicht */
function vaList(x, all){
  const stim = vaStim(x); if (!stim) return [];
  const P = vaPref(), cur = x.vk || null;
  const L = (VA_LIB[stim] || []).filter(T => T.k !== cur && !P.ban[T.k]).map(T => ({T, y:vaBuild(x, T, stim)})).filter(r => r.y);
  L.sort((a, b) => (P.fav[b.T.k] ? 1 : 0) - (P.fav[a.T.k] ? 1 : 0) || (a.T.tx ? 1 : 0) - (b.T.tx ? 1 : 0));
  return all ? L : L.slice(0, 3);
}
let vaAsk = null;
/* B4: Varianten auch in kommenden Wochen. vaAsk.w = Woche des Dialogs; kommende Wochen werden als gespeicherte
   Änderung (S.ov[w].ops) abgelegt und bei jedem Erzeugen der Woche wieder angewendet (woApply). */
const vaW = () => vaAsk && vaAsk.w != null ? vaAsk.w : S.wk;
const vaFutW = w => w != null && S.wk && w > S.wk;
const vaPlanW = w => vaFutW(w) ? genWeek(S.p, w) : S.plan;
function vaOpen(i){ vaAsk = {i, w:typeof strWeek === 'number' ? strWeek : S.wk}; render(); }
function vaClose(){ vaAsk = null; render(); }
function vaPick(i, k){
  const x = vaPlanW(vaW())[i], r = vaList(x, true).find(q => q.T.k === k); if (!r) return;
  vaApply(i, r.y);
}
function vaSurprise(i){ const L = vaList(vaPlanW(vaW())[i], true); if (!L.length) return; vaApply(i, L[Math.floor(Math.random() * L.length)].y); }
function vaApply(i, y){
  const w = vaW(), x = vaPlanW(w)[i], o = x.vOrig || unsplit(x);
  bkPre('Vor dem Austausch einer Einheit');
  if (vaFutW(w)) {
    /* frühere Variante desselben Tages ersetzen, sonst neu anlegen */
    if (x.ovk != null) woDel(w, x.ovk);
    woAdd(w, {op:'var', i, vk:y.vk, base:paSig(o), bn:o.n, st:vaStim(o), unit:{...y}});
    note(`Woche ${w}, ${DAYS[i]}: andere Variante`, `Statt „${o.n}“ steht dann „${y.n}“ im Plan. Gleicher Trainingsreiz, Belastung innerhalb von ±10 %.`, -1);
    vaAsk = null; save(); render(); return;
  }
  S.plan[i] = {...y, vOrig:o, varOf:o.n, moved:x.moved, from:x.from};
  if (S.plan[i].moved == null) { delete S.plan[i].moved; delete S.plan[i].from; }
  woClearCur();
  note(`${DAYS[i]}: andere Variante`, `Statt „${o.n}“ steht jetzt „${y.n}“ im Plan. Gleicher Trainingsreiz, Belastung innerhalb von ±10 %. Der Export für Garmin und Zwift enthält die neue Variante.`, -1);
  vaAsk = null; flashIdx = i; save(); render();
}
function vaReset(i, w){
  w = w == null ? (vaAsk ? vaW() : (typeof strWeek === 'number' ? strWeek : S.wk)) : w;
  const x = vaPlanW(w)[i]; if (!x || !(x.vOrig || x.vaLost)) return;
  bkPre('Vor dem Zurücksetzen einer Variante');
  if (vaFutW(w)) { if (x.ovk != null) woDel(w, x.ovk); note(`Woche ${w}, ${DAYS[i]}: Original`, `„${(x.vOrig || x).n}“ steht wieder im Plan.`, -1); vaAsk = null; save(); render(); return; }
  S.plan[i] = {...x.vOrig, ...(x.moved ? {moved:true, from:x.from} : {})}; woClearCur();
  note(`${DAYS[i]}: Original`, `„${x.vOrig.n}“ steht wieder im Plan.`, -1); vaAsk = null; save(); render();
}
function vaFav(k){ const P = vaPref(); if (P.fav[k]) delete P.fav[k]; else P.fav[k] = 1; save(); render(); }
function vaBan(k){ const P = vaPref(); P.ban[k] = 1; delete P.fav[k]; save(); render(); }
function vaUnban(){ vaPref().ban = {}; save(); render(); }
function vaModal(){
  const a = vaAsk; if (!a || !S.plan) return ''; const VP = vaPlanW(vaW()); if (!VP[a.i]) return '';
  const x = VP[a.i], stim = vaStim(x), L = vaList(x), P = vaPref(), M = q => vaMet(q, stim);
  const card = r => { const m = M(r.y), fav = !!P.fav[r.T.k];
    return `<div class="panel p-3" style="border-left:3px solid var(--teal)"><button class="w-full text-left" style="background:none;border:0;min-height:44px" onclick="vaPick(${ja(a.i)},'${ja(r.T.k)}')"><span class="block font-semibold" data-noi18n>${esc(r.y.n)}</span><span class="mt-0.5 block text-sm">${r.T.s}</span><span class="mt-1 block text-xs" style="color:var(--mute)">${mm(r.y.m)} · TSS ~${tss(r.y)} · ${Math.round(m.tiz)} Min. im Zielbereich</span></button>
      <div class="mt-1 flex gap-2"><button class="ghost !w-auto !px-3 text-xs" style="min-height:44px" aria-pressed="${fav}" onclick="vaFav('${ja(r.T.k)}')"><span class="inline-flex items-center gap-1">${ic(fav ? 'star' : 'starO', 16)}<span>${fav ? 'Lieblingsvariante' : 'Merken'}</span></span></button><button class="ghost !w-auto !px-3 text-xs" style="min-height:44px" onclick="vaBan('${ja(r.T.k)}')">Nicht mehr vorschlagen</button></div></div>`; };
  const m0 = M(x.vOrig || x), nb = Object.keys(P.ban).filter(k => (VA_LIB[stim] || []).some(T => T.k === k)).length;
  return `<div class="exov" role="dialog" aria-modal="true" aria-label="Andere Variante" onclick="if(event.target===this)vaClose()"><div class="exbox"><div class="flex items-start gap-2"><p class="hd flex-1 text-xl font-semibold">Andere Variante</p><button class="ghost !px-3 !py-1" style="min-width:44px;min-height:44px" aria-label="Schließen" onclick="vaClose()">${ic('close', 22)}</button></div>
    <p class="mt-2 text-sm">Geplant: „<span data-noi18n>${esc((x.vOrig || x).n)}</span>“, ${VA_STIM[stim]}, ${mm((x.vOrig || x).m)} · TSS ~${tss(x.vOrig || x)} · ${Math.round(m0.tiz)} Min. im Zielbereich. Alle Vorschläge haben denselben Reiz, Belastung und Zeit im Zielbereich innerhalb von ±10 %.</p>
    <div class="mt-3 space-y-2">${L.map(card).join('') || '<p class="text-sm" style="color:var(--mute)">Für diese Einheit gibt es gerade keine passende Variante.</p>'}</div>
    <div class="mt-3 space-y-2">${L.length ? `<button class="btn lbl" style="width:100%;min-height:44px" onclick="vaSurprise(${ja(a.i)})">Überrasch mich</button>` : ''}${x.vOrig ? `<button class="ghost lbl" style="width:100%;min-height:44px" onclick="vaReset(${ja(a.i)},${ja(vaW())})">Zurück zu „<span data-noi18n>${esc(x.vOrig.n)}</span>“</button>` : ''}${nb ? `<button class="ghost lbl" style="width:100%;min-height:44px" onclick="vaUnban()">Ausgeblendete Varianten wieder zeigen (${nb})</button>` : ''}</div>
    <button class="mt-3 text-sm" style="color:var(--mute);background:none;border:0;min-height:44px" onclick="vaClose()">Abbrechen</button></div></div>`;
}
