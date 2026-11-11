/* ---------- Backlog 07.11.2026, Punkt 3 (F9): Einheit auf einen anderen Tag verschieben ----------
   Wege: „Verschieben“ in der Tageskarte (Tag als Chip), langes Drücken und Ziehen in der Woche, „Andere Einheit heute
   fahren“ auf der Startseite. Ist der Zieltag belegt: Tauschen oder beide an diesem Tag. Danach prüft die App den Plan
   (zwei harte Tage in Folge, Ruhetag weg, Wetter) und macht einen Vorschlag; geändert wird erst nach Bestätigung, mit
   Schnappschuss vorher und „Rückgängig“. Ein Garmin-Workout ist eine Datei ohne Datum: exportiert wird immer die Einheit
   des jeweiligen Tages, sie wandert also mit. Die Bewertung ordnet eine Fahrt der Einheit am Fahrtag zu. */
let mvAsk = null, mvToday = false;
const mvHardish = x => paHard(x);
const mvRide = x => !!x && x.m > 0 && x.t !== 'rest';
/* Zieltage: ab heute, nicht gesperrt, nicht erledigt */
/* B4: Verschieben auch in kommenden Wochen. Woche des Dialogs: mvAsk.w (aktuelle oder kommende Woche) */
const mvFut = w => w != null && S.wk && w > S.wk;
const mvW = () => mvAsk && mvAsk.w != null ? mvAsk.w : S.wk;
const mvPlan = w => mvFut(w) ? genWeek(S.p, w) : S.plan;
const mvLocked = x => !x || x.t === 'race' || /^(Eventtag|Aktivierung)/.test(x.n || '');
const mvTargets = (i, w) => { w = w == null ? (mvAsk && mvAsk.i === i ? mvW() : (typeof strWeek === 'number' ? strWeek : S.wk)) : w;
  if (mvFut(w)) { const P = mvPlan(w), off = (S.ov && S.ov[w] && S.ov[w].off) || {}; return mvLocked(P[i]) ? [] : [0, 1, 2, 3, 4, 5, 6].filter(j => j !== i && !off[j] && !mvLocked(P[j])); }
  return [0, 1, 2, 3, 4, 5, 6].filter(j => j !== i && j >= todayIdx() && !S.blocked[j] && !S.done[j]); };
/* Plan nach dem Verschieben (ohne zu speichern) */
function mvSim(i, j, mode){ return mvSimP(mvPlan(mvW()), i, j, mode); }
function mvSimP(P0, i, j, mode){
  const P = P0.map(x => ({...x})), x = P0[i], y = P0[j];
  if (mode === 'swap') { P[j] = {...unsplit(x), moved:true, from:i}; P[i] = {...unsplit(y), moved:true, from:j}; }
  else if (mode === 'both') { const a = HARD.includes(x.t) || !mvRide(y) ? x : y, o = a === x ? y : x;
    P[j] = {...unsplit(a), m:a.m + o.m, n:`${a.n} + ${o.n}`, st:`${a.st || ''} Danach ${o.n} anhängen (${mm(o.m)}).`, moved:true, from:i, both:{a:{...a}, b:{...o}}}; P[i] = {...REST}; }
  else { P[j] = {...unsplit(x), moved:true, from:i}; P[i] = {...REST}; }
  return P;
}
/* Prüfung als Vorschlag: neue harte Doppeltage, wegfallender Ruhetag, Wetter am neuen Tag */
function mvCheck(i, j, mode){ const w = mvW(); return paCheck(mvSim(i, j, mode), mvPlan(w), mvFut(w) ? {} : {day:j}); }
function mvAskGo(i){ mvAsk = {i, step:'day', w:typeof strWeek === 'number' ? strWeek : S.wk}; render(); }
function mvClose(){ mvAsk = null; render(); }
function mvPickDay(i, j){
  if (!mvAsk || mvAsk.i !== i) mvAsk = {i, w:typeof strWeek === 'number' ? strWeek : S.wk};
  mvAsk.j = j;
  if (mvRide(mvPlan(mvW())[j])) { mvAsk.step = 'occ'; return render(); }
  mvMode('move');
}
function mvMode(mode){ const a = mvAsk; if (!a) return; a.mode = mode; const c = mvCheck(a.i, a.j, mode); if (!c.warns.length) return mvDo(false); a.step = 'warn'; a.warns = c.warns; a.easy = c.easy; render(); }
const mvEasy = o => ({...D('base', 'Grundlage Z2', Math.min(75, o.m), 56, 72, '90 U/min', `Locker in Zone 2 statt „${o.n}“, weil sonst zwei harte Tage aufeinander folgen.`, 'Zwei harte Tage hintereinander kosten mehr, als sie bringen.'), adapted:true, orig:o});
function mvDo(easy){
  const a = mvAsk; if (!a) return; const w = mvW(), P0 = mvPlan(w), x = P0[a.i], y = P0[a.j];
  bkPre('Vor dem Verschieben einer Einheit');
  const txt = a.mode === 'swap' ? `„${x.n}“ und „${y.n}“ haben die Tage getauscht (${DAYS[a.i]} ↔ ${DAYS[a.j]}).` : a.mode === 'both' ? `„${x.n}“ wurde von ${DAYS[a.i]} auf ${DAYS[a.j]} gelegt, zusammen mit „${y.n}“.` : `„${x.n}“ wurde von ${DAYS[a.i]} auf ${DAYS[a.j]} verschoben.`;
  if (mvFut(w)) {
    /* kommende Woche: als Änderung dieser Woche speichern, wird bei jedem Erzeugen der Woche wieder angewendet */
    woAdd(w, {op:'mv', i:a.i, j:a.j, mode:a.mode, easy:easy && a.easy != null ? a.easy : null});
    note(`Woche ${w}: ${DAYS[a.i]} verschoben`, txt + (easy && a.easy != null ? ` ${DAYS[a.easy]} ist dann locker.` : ''), -1);
  } else {
    const P = mvSim(a.i, a.j, a.mode);
    if (easy && a.easy != null) P[a.easy] = mvEasy(P[a.easy]);
    S.plan = P; flashIdx = a.j; woClearCur();
    note(`${DAYS[a.i]} verschoben`, txt + (easy && a.easy != null ? ` ${DAYS[a.easy]} ist jetzt locker.` : ''), -1);
  }
  mvAsk = null; mvToday = false; save(); render();
}
/* Dialog (Woche und Startseite) */
function mvModal(){
  const a = mvAsk; if (!a || !S.plan) return ''; const MP = mvPlan(mvW()); if (!MP[a.i]) return '';
  const x = MP[a.i], btn = (fn, l, main) => `<button class="${main ? 'btn' : 'ghost'} lbl" style="width:100%;min-height:44px;text-align:center" onclick="${fn}">${l}</button>`;
  let body = '';
  if (a.step === 'day') { const L = mvTargets(a.i, mvW());
    body = `<p class="mt-2 text-sm">Auf welchen Tag soll „<span data-noi18n>${esc(x.n)}</span>“?</p><div class="mt-3 flex flex-wrap gap-2">${L.map(j => `<button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="mvPickDay(${ja(a.i)},${ja(j)})">${SD[j]}${mvRide(MP[j]) ? ' · belegt' : ' · frei'}</button>`).join('') || '<span class="text-sm" style="color:var(--mute)">Diese Woche ist kein Tag mehr frei.</span>'}</div>`; }
  else if (a.step === 'occ') { const y = MP[a.j];
    body = `<p class="mt-2 text-sm">Am ${DAYS[a.j]} steht schon „<span data-noi18n>${esc(y.n)}</span>“ (${mm(y.m)}).</p><div class="mt-3 space-y-2">${btn("mvMode('swap')", `Tauschen: „${esc(y.n)}“ auf ${DAYS[a.i]}`, true)}${btn("mvMode('both')", 'Beide an diesem Tag', false)}</div>`; }
  else if (a.step === 'warn') {
    body = `<div class="mt-2 space-y-2 text-sm">${a.warns.map(w => `<p class="flex gap-2">${ic('warn', 18, 'margin-top:2px;color:var(--teal)')}<span>${w}</span></p>`).join('')}</div><div class="mt-3 space-y-2">${a.easy != null ? btn('mvDo(true)', `Verschieben und ${DAYS[a.easy]} locker fahren`, true) : ''}${btn('mvDo(false)', 'Trotzdem so verschieben', a.easy == null)}</div>`; }
  return `<div class="exov" role="dialog" aria-modal="true" aria-label="Einheit verschieben" onclick="if(event.target===this)mvClose()"><div class="exbox"><div class="flex items-start gap-2"><p class="hd flex-1 text-xl font-semibold">Einheit verschieben</p><button class="ghost !px-3 !py-1" style="min-width:44px;min-height:44px" aria-label="Schließen" onclick="mvClose()">${ic('close', 22)}</button></div>${body}<button class="mt-3 text-sm" style="color:var(--mute);background:none;border:0;min-height:44px" onclick="mvClose()">Abbrechen</button></div></div>`;
}
/* Startseite: andere Einheit heute fahren */
function mvTodayCard(){
  const p = S.p; if (!p || !hasStarted(p) || !S.plan) return '';
  const t = todayIdx(); if (S.done[t] || S.blocked[t]) return '';
  const L = [0, 1, 2, 3, 4, 5, 6].filter(j => j > t && mvRide(S.plan[j]) && !S.done[j]); if (!L.length) return '';
  return `<section class="panel p-3"><button class="flex w-full items-center gap-2 text-left text-sm font-semibold" style="background:none;border:0;min-height:44px;color:var(--teal)" aria-expanded="${!!mvToday}" onclick="mvToday=!mvToday;render()"><span class="flex-1">Andere Einheit heute fahren</span>${ic(mvToday ? 'chevD' : 'chevR', 20)}</button>${mvToday ? `<div class="mt-1 space-y-2">${L.map(j => `<button class="ghost lbl w-full" style="min-height:44px" onclick="mvAsk={i:${ja(j)},w:S.wk};mvPickDay(${ja(j)},${ja(t)})">${SD[j]} · <span data-noi18n>${esc(S.plan[j].n)}</span> ${mm(S.plan[j].m)}</button>`).join('')}</div>` : ''}</section>`;
}
/* Woche: lange drücken und auf einen anderen Tag ziehen */
(function(){
  let tm = null, src = null, on = false, sx = 0, sy = 0, just = false;
  const clear = () => document.querySelectorAll('[data-day]').forEach(c => { c.style.boxShadow = ''; c.style.outline = ''; c.style.opacity = ''; });
  document.addEventListener('pointerdown', e => { const c = e.target.closest && e.target.closest('[data-day]'); if (!c || c.dataset.day === '') return; src = +c.dataset.day; sx = e.clientX; sy = e.clientY; clearTimeout(tm);
    tm = setTimeout(() => { on = true; c.style.outline = '2px solid var(--ice)'; c.style.opacity = '.85'; try { navigator.vibrate && navigator.vibrate(15); } catch (er) { elog(er); } }, 500); }, {passive:true});
  document.addEventListener('pointermove', e => { if (!on) { if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(tm); tm = null; } return; }
    /* am Rand mitscrollen, damit auch weiter entfernte Tage erreichbar sind (Menüleiste unten etwa 70 px) */
    if (e.clientY > innerHeight - 110) window.scrollBy(0, 14); else if (e.clientY < 90) window.scrollBy(0, -14);
    document.querySelectorAll('[data-day]').forEach(c => { c.style.boxShadow = ''; }); const t = document.elementFromPoint(e.clientX, e.clientY), c = t && t.closest && t.closest('[data-day]'); if (c && c.dataset.day !== '') c.style.boxShadow = '0 0 0 3px var(--ice)'; });
  /* B3: Den folgenden Klick nur unterdrücken, wenn wirklich auf einen anderen Tag gezogen wurde. Langes Drücken auf
     einen Knopf („Übung starten“, „Verschieben“ …) ohne Ziehen bleibt ein normaler Tipp. */
  const end = e => { clearTimeout(tm); tm = null; if (!on) return; on = false;
    const t = e && document.elementFromPoint(e.clientX, e.clientY), c = t && t.closest && t.closest('[data-day]'); clear();
    if (c && c.dataset.day !== '' && +c.dataset.day !== src) { just = true; setTimeout(() => { just = false; }, 400); }
    if (c && c.dataset.day !== '' && +c.dataset.day !== src) { mvAsk = {i:src, w:typeof strWeek === 'number' ? strWeek : S.wk}; mvPickDay(src, +c.dataset.day); } };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', () => { clearTimeout(tm); tm = null; on = false; clear(); });
  document.addEventListener('click', e => { if (just) { e.stopPropagation(); e.preventDefault(); just = false; } }, true);
  document.addEventListener('contextmenu', e => { if (on || tm) { const c = e.target.closest && e.target.closest('[data-day]'); if (c) e.preventDefault(); } });
})();
