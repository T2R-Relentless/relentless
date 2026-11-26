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

/* ---------- Paket C, Punkt 7: Ruhetage und „Lockere Zusatzfahrt“ (Fachregeln 7.1 bis 7.6, Entscheidung 11) ----------
   Neue Pläne behalten mindestens einen Ruhetag (p.rdMin, Einsteiger und Rhythmus 2:1 zwei). Laufende Pläne ohne rdMin bekommen nur einen
   Vorschlag ab der Folgewoche, mit Schnappschuss. Über der Tagesliste steht einmal pro Woche die Zahl der freien Tage, dazu höchstens ein
   Angebot für eine lockere Zusatzfahrt (immer mit Prüfung und Zustimmung). */
let rdAsk = null;
const rdMinShould = p => p && (p.lvl === 'new' || rhyOf(p) === '2:1') ? 2 : 1;
const RD_X = () => D('rec', 'Lockere Zusatzfahrt', 45, 45, 55, '90–100 U/min', 'Locker und flach, 30 bis 60 Min., unter 56 % FTP, Anstrengung höchstens 3 von 10, ohne Intervalle.', 'Freiwillig. Ein freier Tag ist genauso wertvoll.');
/* Darf an Tag i eine lockere Zusatzfahrt angeboten werden? (Fachregel 7.5) */
function rdExtraOk(p, w, plan, i){
  try {
    const t = todayIdx(), x = plan[i]; if (i < t || !x || x.m || x.feel || x.vac || !p.avail[i]) return false;
    if (plan.filter(y => !(y && y.m)).length - 1 < Math.max(rdMinOf(p, w) || 0, rdMinShould(p))) return false;
    const bud = tbWkH(p, w) * 60, m = plan.reduce((q, y) => q + (y && y.m || 0), 0); if (m + 45 > bud * 1.1) return false;
    const P = phases(p).find(z => w >= z.from && w <= z.to); if (recWk(p, w) || (p.recW || []).includes(w) || (P && (P.rec || P.key === 'taper'))) return false;
    const day = addD(p.start, (w - 1) * 7 + i), near = d => d && d >= day && d <= addD(day, 2);
    if ((p.goal === 'event' && near(p.eventDate)) || (p.subs || []).some(s => (s.prio === 'A' || s.prio === 'B') && near(s.date))) return false;
    const bad = y => y && (y.feel === 'sick' || y.feel === 'heavy' || y.feel === 'tired' || y.feel === 'neck');
    if (bad(plan[t]) || bad(plan[t - 1]) || (p.sickNext && p.sickNext.w === w) || reentOf(p, w)) return false;
    if (plan[i - 1] && plan[i - 1].t === 'test') return false;
    return true;
  } catch (e) { elog(e); return false; }
}
function rdWeekNote(p, w, plan, cur){
  if (!p || !Array.isArray(plan)) return '';
  const free = plan.map((x, i) => !(x && x.m) && p.avail[i] ? i : -1).filter(i => i >= 0), off = plan.filter(x => !(x && x.m)).length;
  const sug = cur && !p.rdMin && !p.rdNo ? (() => { try { return genWeek(p, w + 1).every(x => x && x.m > 0); } catch (e) { elog(e); return false; } })() : false;
  const ix = cur ? free.find(i => rdExtraOk(p, w, plan, i)) : undefined;
  if (!off && !sug) return '';
  let h = off ? `<p class="text-sm" style="color:var(--mute)">Diese Woche ${off === 1 ? 'hast du 1 freien Tag' : `hast du ${off} freie Tage`}. Erholung gehört zum Training.</p>` : '';
  if (ix != null) h += rdAsk === ix ? rdAskUi(p, w, plan, ix) : `<button class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="rdAsk=${ja(ix)};render()">Lockere Zusatzfahrt am ${DAYS[ix]} einplanen (freiwillig)</button><p class="mt-1 text-xs" style="color:var(--mute)">Ein freier Tag ist genauso wertvoll.</p>`;
  if (sug) h += `<div class="mt-2 p-3 text-sm" style="background:#fff6dc;border-left:3px solid #d9a400"><p><b>Nächste Woche hat keinen Ruhetag.</b> Mindestens ein freier Tag pro Woche hilft der Erholung. Soll die App ab nächster Woche ${rdMinShould(p) === 2 ? 'zwei freie Tage' : 'einen freien Tag'} einplanen? Die Wochenzeit bleibt, die übrigen Fahrten werden etwas länger.</p><div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="rdTake()">Ab nächster Woche übernehmen</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="rdSkip()">Nein, danke</button></div></div>`;
  return `<div class="panel p-3" id="fx-rd">${h}</div>`;
}
function rdAskUi(p, w, plan, i){
  const P = plan.map((x, j) => j === i ? RD_X() : x), wr = paCheck(P, plan, {budget:Math.round(tbWkH(p, w) * 60)}).warns;
  return `<div class="mt-2 p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)"><p><b>Lockere Zusatzfahrt am ${DAYS[i]}:</b> 30 bis 60 Min. flach und locker, Anstrengung höchstens 3 von 10. Sie zählt zu Wochenzeit und Belastung.</p>${wr.length ? `<ul class="mt-1 list-disc pl-5">${wr.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}<div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="rdExtra(${ja(i)})">Einplanen</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="rdAsk=null;render()">Abbrechen</button></div></div>`;
}
function rdExtra(i){
  rdAsk = null; if (!S.p || !S.plan || !rdExtraOk(S.p, S.wk, S.plan, i)) return render();
  bkPre('Vor dem Einplanen einer Zusatzfahrt'); S.plan[i] = {...RD_X(), adapted:true, orig:S.plan[i]};
  S.log.unshift({title:'Lockere Zusatzfahrt eingeplant', day:i, text:`Am ${DAYS[i]}: 45 Min. locker und flach, freiwillig.`}); if (S.log.length > 20) S.log.length = 20; flashIdx = i; save(); render();
}
/* Schritt 3 der Schnellplanung (Fachregel 7.1): Fahrten pro Woche aus dem Generator (Belastungswochen 2 bis 8), nicht aus einer eigenen Formel */
function rdRides(d){
  try { const pv = {...mkPrev(d), rdMin:rdMinShould(d), rdFrom:1, sanft:undefined}, ph = phases(pv), n = [];
    for (let w = 2; w <= Math.min(8, ph[ph.length - 1].to); w++) { const P = ph.find(x => w >= x.from && w <= x.to); if (!P || P.rec || P.key === 'taper' || recWk(pv, w)) continue; n.push(genWeek(pv, w, true).filter(x => x && x.m > 0).length); }
    if (!n.length) return null; n.sort((a, b) => a - b); return {lo:n[0], hi:n[n.length - 1], med:n[Math.floor(n.length / 2)]};
  } catch (e) { elog(e); return null; }
}
function rdRidesTxt(d){
  const r = rdRides(d), nD = d.avail.filter(Boolean).length; if (!r) return '';
  const N = r.lo === r.hi ? String(r.lo) : `${r.lo} bis ${r.hi}`, M = nD - r.hi;
  return `<p class="mt-1 text-sm">Bei ${hStd(d.hours)} Std. plant die App etwa <b>${N} Fahrten pro Woche</b>.${M === 1 ? ' An dem übrigen gewählten Tag hast du frei.' : M > 1 ? ` An den übrigen ${M} gewählten Tagen hast du frei.` : ''}</p>`;
}
function rdTake(){ const p = S.p; if (!p) return; bkPre('Vor dem Einplanen von Ruhetagen'); p.rdMin = S.d.rdMin = rdMinShould(p); p.rdFrom = S.d.rdFrom = (S.wk || 1) + 1; note('Ruhetage eingeplant', `Ab Woche ${p.rdFrom} plant die App mindestens ${p.rdMin === 2 ? 'zwei freie Tage' : 'einen freien Tag'} pro Woche. Diese Woche bleibt, wie sie ist.`, -2); save(); render(); }
function rdSkip(){ if (!S.p) return; S.p.rdNo = S.d.rdNo = 1; save(); render(); }
