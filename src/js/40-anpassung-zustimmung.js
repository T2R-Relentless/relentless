/* ---------- Backlog 07.11.2026, Punkt 6 (F4): Plananpassung nur nach Zustimmung ----------
   Gemeinsame Prüflogik für Zusatzfahrten (Punkt 6), Verschieben (Punkt 3) und Zeitbudget (Punkt 7): paCheck bewertet
   einen geänderten Wochenplan gegen den bisherigen (harte Tage in Folge, letzter Ruhetag, Wetter, Wochenzeit gegen
   Budget). Vorschläge nach Zusatzfahrten liegen in e.prop {alts, sel, st, base, text}: st 'open' → 'ok' (angenommen),
   'no' (abgelehnt), 'undone' (zurückgenommen) oder 'old' (nicht mehr aktuell). Angenommen wird mit Schnappschuss vorher
   und 10 Minuten „Rückgängig“. */
function paHard(x){ return !!x && x.m > 0 && (HARD.includes(x.t) || x.t === 'long' || x.t === 'race'); }
function paRide(x){ return !!x && x.m > 0 && x.t !== 'rest'; }
/* Prüfung eines Wochenplans P gegen den bisherigen Plan B. o.day: Tag, für den das Wetter geprüft wird; o.budget: Minuten pro Woche */
function paCheck(P, B, o){
  o = o || {}; const out = [], pair = (L, k) => paHard(L[k]) && paHard(L[k + 1]); let easy = null;
  for (let k = 0; k < 6; k++) if (pair(P, k) && !pair(B, k)) { const d = o.day != null && k + 1 === o.day ? k : k + 1; if (d >= todayIdx() && !S.done[d]) easy = easy == null ? d : easy; out.push(`${DAYS[k]} und ${DAYS[k + 1]} wären dann zwei harte Tage hintereinander. Das ermüdet mehr, als es bringt.`); }
  /* M13 (Audit 12.11.2026): auch über die Wochengrenze prüfen (Sonntag der Vorwoche, Montag der nächsten Woche) und bei weniger als
     8 Std. pro Woche vor einer dritten harten Einheit warnen. o.w: Woche des geänderten Plans (Standard: laufende Woche). */
  try { const wk = o.w != null ? o.w : S.wk, p = S.p;
    if (p && p.start && wk) {
      const tot = phases(p).slice(-1)[0].to, prevSun = wk === S.wk && S.prevPlan && S.prevPlan.w === S.wk - 1 ? (S.prevPlan.plan || [])[6] : wk > 1 ? genWeek(p, wk - 1)[6] : null, nextMon = wk < tot ? genWeek(p, wk + 1)[0] : null;
      if (paHard(P[0]) && paHard(prevSun) && !paHard(B[0])) out.push(`Sonntag der Vorwoche und ${DAYS[0]} wären dann zwei harte Tage hintereinander.`);
      if (paHard(P[6]) && paHard(nextMon) && !paHard(B[6])) out.push(`${DAYS[6]} und ${DAYS[0]} der nächsten Woche wären dann zwei harte Tage hintereinander.`);
      const hc = L => L.filter(x => x && x.m > 0 && (HARD.includes(x.t) || x.t === 'race' || x.t === 'test')).length, hrs = (o.budget > 0 ? o.budget / 60 : 0) || tbWkH(p, wk) || p.hours || 0;
      if (hc(P) >= 3 && hc(P) > hc(B) && hrs < 8) out.push(`Die Woche hätte dann ${hc(P)} harte Einheiten. Bei weniger als 8 Std. pro Woche reichen meist zwei, eine dritte kostet mehr Erholung, als sie bringt.`);
    } } catch (e) { elog(e); }
  const rest = L => L.filter(x => !paRide(x)).length;
  if (rest(P) < rest(B) && rest(P) === 0) out.push('Damit fällt der letzte Ruhetag der Woche weg.');
  if (o.day != null) { try { if (S.wx) { const w = wxDay(dstr(o.day), o.day, P[o.day]); if (w && w.wet) out.push(`Für ${DAYS[o.day]} ist Regen angesagt (etwa ${Math.round(w.eff)} °C). Plane Regenkleidung ein oder fahr auf der Rolle.`); else if (w && w.src === 'api' && w.tmax >= 28) out.push(`Am ${DAYS[o.day]} wird es heiß (bis ${Math.round(w.tmax)} °C). Früh oder spät fahren und mehr trinken.`); else if (w && w.eff < 3) out.push(`Am ${DAYS[o.day]} wird es kalt (etwa ${Math.round(w.eff)} °C). Warm anziehen oder auf der Rolle fahren.`); } } catch (e) { elog(e); } }
  if (o.budget > 0) { const m = P.reduce((a, x) => a + (paRide(x) ? x.m : 0), 0); if (m > o.budget * 1.1) out.push(`Die Woche hätte dann ${mm(m)} Training, verfügbar sind ${mm(o.budget)}.`); }
  return {warns:out, easy};
}
const paSig = x => JSON.stringify(x ? [x.t, x.m, x.n, x.lo, x.hi] : null);
function paProp(A, id){
  const base = {}; A.forEach(a => Object.keys(a.d).forEach(d => { base[d] = paSig(S.plan[+d]); }));
  return {alts:A, sel:0, st:'open', base, text:A[0].t, w:S.wk, at:Date.now(), id};
}
/* Vorschlag noch umsetzbar? Gleiche Woche, Tage nicht vorbei, nicht erledigt und seitdem nicht verändert */
function paLive(pr){
  if (!pr || pr.st !== 'open' || pr.w !== S.wk || !S.plan) return false;
  const a = pr.alts[pr.sel || 0]; return Object.keys(a.d).every(d => +d >= todayIdx() && !S.done[+d] && paSig(S.plan[+d]) === pr.base[d]);
}
const paExtra = id => (S.p && S.p.extra || {})[id];
let paEdit = null;
function paAccept(id, k){
  const e = paExtra(id), pr = e && e.prop; if (!pr) return;
  if (k != null) pr.sel = k;
  if (!paLive(pr)) { pr.st = 'old'; save(); render(); return; }
  const a = pr.alts[pr.sel || 0], ds = Object.keys(a.d).map(Number).sort((x, y) => x - y);
  bkPre('Vor dem Anpassen nach einer Zusatzfahrt');
  ds.forEach(d => { S.plan[d] = a.d[d]; });
  pr.st = 'ok'; pr.text = a.t; e.adj = a.t; e.adjDay = ds[0]; e.adjDay2 = ds.length > 1 ? ds[1] : null; flashIdx = ds[0]; paEdit = null;
  S.log.unshift({title:'Zusatzfahrt: Plan angepasst', day:ds[0], text:a.t}); if (S.log.length > 20) S.log.length = 20;
  try { lbSync(false); } catch (er) { elog(er); }
  save(); render();
}
function paDecline(id){
  const e = paExtra(id), pr = e && e.prop; if (!pr) return;
  pr.st = 'no'; paEdit = null; S.log.unshift({title:'Zusatzfahrt: Vorschlag abgelehnt', day:-1, text:'Der Plan bleibt, wie er ist.'}); if (S.log.length > 20) S.log.length = 20;
  try { lbSync(false); } catch (er) { elog(er); }
  save(); render();
}
/* Anzeige: Vorschlag mit Begründung, Annehmen / Ablehnen / Anpassen */
function paUi(e){
  const pr = e && e.prop; if (!pr) return '';
  if (pr.st === 'open' && !paLive(pr)) return `<p class="p-2.5 text-sm" style="background:var(--panel);border:1px solid var(--line);color:var(--mute)">Vorschlag nicht mehr aktuell: Der Plan hat sich seitdem geändert oder der Tag ist vorbei.</p>`;
  if (pr.st === 'no') return `<p class="p-2.5 text-sm" style="background:var(--panel);border:1px solid var(--line)"><b>Vorschlag abgelehnt.</b> Der Plan bleibt, wie er ist.</p>`;
  if (pr.st === 'undone') return `<p class="p-2.5 text-sm" style="background:var(--panel);border:1px solid var(--line)"><b>Anpassung zurückgenommen.</b> Der Plan läuft wie ursprünglich vorgesehen.</p>`;
  if (pr.st === 'ok') return `<p class="p-2.5 text-sm" style="background:var(--panel);border:1px solid var(--line)"><b>Angepasst:</b> ${esc(pr.text)}</p><button class="ghost !py-1.5 text-sm" style="min-height:44px" onclick="xrUndo('${ja(e.id)}')">Anpassung zurücknehmen</button>`;
  if (pr.st !== 'open') return '';
  const ed = paEdit === e.id, bt = (fn, l, main) => `<button class="${main ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}">${l}</button>`;
  return `<div class="p-2.5 text-sm" style="background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--teal)"><p><b>Vorschlag:</b> ${esc(pr.alts[pr.sel || 0].t)}</p><p class="mt-1 text-xs" style="color:var(--mute)">Geändert wird erst, wenn du zustimmst. Danach kannst du es 10 Minuten lang rückgängig machen.</p>
    ${ed ? `<div class="mt-2 space-y-2">${pr.alts.map((a, k) => `<button class="ghost lbl w-full text-left" style="min-height:44px" onclick="paAccept('${ja(e.id)}',${ja(k)})">${esc(a.l)}</button>`).join('')}<button class="text-sm" style="color:var(--mute);background:none;border:0;min-height:44px" onclick="paEdit=null;render()">Abbrechen</button></div>`
      : `<div class="mt-2 flex flex-wrap gap-2">${bt(`paAccept('${ja(e.id)}')`, 'Annehmen', true)}${bt(`paDecline('${ja(e.id)}')`, 'Ablehnen')}${pr.alts.length > 1 ? bt(`paEdit='${ja(e.id)}';render()`, 'Anpassen') : ''}</div>`}</div>`;
}
