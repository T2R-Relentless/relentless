/* ---------- Audit 12.11.2026, M6: Wiedereinstieg nach Pausen, Urlaub, Krankheit über die Wochengrenze ----------
   1. Pause erkennen: Liegt die letzte eingetragene Fahrt oder erledigte Einheit 7 oder mehr Tage zurück (und war das kein eingetragener
      Urlaub), fragt die App auf der Startseite nach. Mit Zustimmung plant sie einen Wiedereinstieg: 7–13 Tage Pause → eine Woche mit
      höchstens 70 % Umfang und einer harten Einheit; 14–27 Tage → zwei Wochen (60 %, 80 %), nur Grundlage und Sweet Spot; ab 28 Tagen
      zusätzlich Vorschlag FTP −5 % und ein Fitness-Check. Leistung und VO2max sinken nach etwa zwei Wochen ohne Training messbar
      (Mujika & Padilla 2000).
   2. Urlaub: Zeiträume unter Einstellungen → Alltag und Planstart. An Urlaubstagen plant die App nichts. Nach mindestens 7 Tagen Urlaub
      folgt automatisch ein Wiedereinstieg (wie oben, nach Länge).
   3. Krankheit am Wochenende: Die lockeren Folgetage nach „krank“ bzw. „richtig platt“ gelten auch für den Montag und Dienstag der nächsten
      Woche (p.sickNext). */
const RE_LV = g => g >= 28 ? {f:[.6, .8], lvl:3} : g >= 14 ? {f:[.6, .8], lvl:2} : {f:[.7], lvl:1};
const ddiff = (a, b) => Math.round((dOnly(b) - dOnly(a)) / 864e5);
const wkStart = (p, w) => addD(p.start, (w - 1) * 7);
/* Urlaubstage */
const vacL = p => ((p && p.vac) || []).filter(v => v && /^\d{4}-\d{2}-\d{2}$/.test(v.from) && /^\d{4}-\d{2}-\d{2}$/.test(v.to) && v.to >= v.from);
const vacOn = (p, ds) => vacL(p).some(v => ds >= v.from && ds <= v.to);
const vacDay = (p, w, i) => !!(p && p.start) && vacOn(p, addD(p.start, (w - 1) * 7 + i));
/* Wiedereinstieg für Woche w: aus einer bestätigten Pause (p.reent) oder nach Urlaub ab 7 Tagen */
function reentOf(p, w){
  if (!p || !p.start) return null; const out = [];
  (p.reent || []).forEach(r => { const k = w - r.w; if (k >= 0 && k < r.f.length) out.push({f:r.f[k], lvl:r.lvl, src:'gap'}); });
  /* Endet der Urlaub spät in der Woche (weniger als 4 Trainingstage übrig), zählt der Rest dieser Woche schon als leicht, und der
     Wiedereinstieg beginnt in der Woche danach. */
  vacL(p).forEach(v => { const L = ddiff(v.from, v.to) + 1; if (L < 7) return; const e = RE_LV(L), d0 = ddiff(p.start, addD(v.to, 1)), w0 = Math.floor(d0 / 7) + 1, f = 7 - d0 % 7 < 4 ? [e.f[0], ...e.f] : e.f, k = w - w0; if (k >= 0 && k < f.length) out.push({f:f[k], lvl:e.lvl, src:'vac'}); });
  if (!out.length) return null; return out.reduce((a, b) => b.f < a.f || (b.f === a.f && b.lvl > a.lvl) ? b : a);
}
/* letzter Tag mit Training: Fahrten, bewertete Einheiten, erledigte Einheiten dieser und der Vorwoche, ältere Wochen aus dem Rückblick */
function lastAct(){
  const p = S.p; if (!p || !p.start) return null; const today = iso(0); let L = null; const put = d => { if (d && d <= today && (!L || d > L)) L = d; };
  [...(S.man || []), ...(S.hist || [])].forEach(a => put(a.day || (a.ts || '').slice(0, 10)));
  Object.values(p.exe || {}).forEach(e => put(e.day));
  if (S.plan && S.done) Object.keys(S.done).forEach(i => { if (S.done[i]) put(addD(wkStart(p, S.wk), +i)); });
  if (S.prevPlan && S.prevPlan.done) Object.keys(S.prevPlan.done).forEach(i => { if (S.prevPlan.done[i]) put(addD(wkStart(p, S.prevPlan.w), +i)); });
  Object.entries(p.wh || {}).forEach(([w, r]) => { if (r && r.nd > 0) put(addD(wkStart(p, +w), 6)); });
  return L;
}
/* Pause, nach der die App fragt: mindestens 7 Tage, nicht durch Urlaub erklärt, Plan läuft seit mindestens 14 Tagen, noch nicht beantwortet */
function gapInfo(){
  const p = S.p; if (!p || !hasStarted(p) || !S.plan) return null;
  const L = lastAct(), today = iso(0); if (!L || ddiff(p.startDate || p.start, today) < 14) return null;
  let g = ddiff(L, today) - 1; if (g < 7) return null;
  let v = 0; for (let d = addD(L, 1); d < today; d = addD(d, 1)) if (vacOn(p, d)) v++;
  if (g - v < 7 || S.gapSeen === L || (p.reent || []).some(r => r.w === S.wk)) return null;
  try { const ph = phases(p); if (S.wk >= ph[ph.length - 1].to) return null; } catch (e) { elog(e); }
  return {L, g, ...RE_LV(g)};
}
function gapCard(){
  const x = gapInfo(); if (!x) return '';
  const what = x.lvl === 1 ? 'Diese Woche mit etwa 70 % des Umfangs und nur einer harten Einheit.' : `Zwei Wochen mit etwa 60 % und 80 % des Umfangs, nur Grundlage und Sweet Spot.${x.lvl === 3 ? ' Nach so langer Pause ist dein FTP wahrscheinlich etwas gesunken. Die App schlägt dir danach vor, ihn um 5 % zu senken und einen Fitness-Check einzuplanen.' : ''}`;
  return `<section class="panel p-4" style="border-left:4px solid var(--teal)"><p class="font-semibold">Längere Pause?</p><p class="mt-1 text-sm">Seit ${fmt(x.L)} ist keine Fahrt und keine erledigte Einheit eingetragen (${x.g} Tage). Nach einer Pause ist ein sanfter Wiedereinstieg sinnvoll, damit du dich nicht überforderst.</p><p class="mt-1 text-sm"><b>Vorschlag:</b> ${what} Danach läuft der Plan normal weiter.</p>
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="reentGo()">Wiedereinstieg einplanen</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="gapNo()">Nein, ich habe trainiert</button></div></section>`;
}
function gapNo(){ const L = lastAct(); S.gapSeen = L; note('Pause', 'Der Plan läuft unverändert weiter.', -2); save(); render(); }
/* laufende Woche neu erzeugen: vergangene, erledigte und von dir geänderte Tage bleiben */
function reweekFrom(t){ const nw = genWeek(S.p, S.wk); S.plan = S.plan.map((x, i) => i < t || (S.done && S.done[i]) || (S.actual && S.actual[i]) || x.moved || x.varOf || x.blocked ? x : nw[i]); }
let reentFtp = null;
function reentGo(){
  const x = gapInfo(); if (!x) return; bkPre('Vor dem Wiedereinstieg');
  S.p.reent = [...(S.p.reent || []).filter(r => r.w + r.f.length <= S.wk), {w:S.wk, f:x.f, lvl:x.lvl, g:x.g, at:iso(0)}]; S.d.reent = S.p.reent; S.gapSeen = x.L;
  reweekFrom(todayIdx());
  note('Wiedereinstieg', x.lvl === 1 ? 'Diese Woche ist leichter: etwa 70 % des Umfangs, eine harte Einheit.' : 'Diese und nächste Woche sind leichter: etwa 60 % und 80 % des Umfangs, nur Grundlage und Sweet Spot.', -2);
  reentFtp = x.lvl === 3 && S.p.ftp > 0 ? {ftp:r5(S.p.ftp * .95), w:Math.min(phases(S.p).slice(-1)[0].to, S.wk + 2)} : null;
  save(); render();
}
function reentFtpCard(){
  const r = reentFtp; if (!r || !S.p) return '';
  return `<section class="panel p-4" style="border-left:4px solid var(--teal)"><p class="font-semibold">FTP nach der Pause</p><p class="mt-1 text-sm">Nach vier Wochen oder mehr ohne Training liegt der FTP meist einige Prozent niedriger. Mit einem etwas niedrigeren Wert passen die Wattvorgaben besser, bis ein Fitness-Check Klarheit bringt.</p>
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="reentFtpGo(true)">FTP auf ${r.ftp} W senken, Check in Woche ${r.w}</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="reentFtpGo(false)">FTP behalten</button></div></section>`;
}
function reentFtpGo(ok){ const r = reentFtp; reentFtp = null; if (!r) return render(); if (ok) { S.p.xTests = [...new Set([...(S.p.xTests || []), r.w])]; S.d.xTests = S.p.xTests; setFtpNow(r.ftp); return; } render(); }
/* Wiedereinstieg im Generator: Umfang begrenzen, harte Einheiten reduzieren */
function reentHard(hard, re, SST){ if (!re) return hard; if (re.lvl >= 2) return hard.length ? [SST] : []; return hard.slice(0, 1); }
/* Krankheit am Wochenende: Folgetage der nächsten Woche locker */
function sickCarry(P, p, w){
  const c = p && p.sickNext; if (!c || c.w !== w || !Array.isArray(P)) return P;
  return P.map((x, i) => { const k = c.d.indexOf(i); if (k < 0 || !x || !x.m || x.t === 'race' || /^Eventtag|^Aktivierung/.test(x.n || '')) return x; const hard = HARD.includes(x.t) || x.t === 'test' || x.t === 'long';
    if (!hard && x.t !== 'base') return x;
    const m = Math.min(c.lv === 'sick' && k === 0 ? 45 : 60, x.m);
    return {...D('base', 'Grundlage Z2', m, 50, 65, '90 U/min', c.lv === 'sick' && k === 0 ? 'Nur wenn du seit 24 Stunden fieberfrei bist, sonst ebenfalls Ruhetag. Locker in Zone 2.' : 'Nach dem kranken oder sehr müden Tag noch locker in Zone 2.', 'Die harte Einheit holst du nicht nach, der Plan läuft danach normal weiter.'), adapted:true, orig:x, sickC:1}; });
}
function sickNextSet(i, lv){
  if (!S.p) return; const d = lv === 'sick' ? [i + 1, i + 2].filter(j => j >= 7).map(j => j - 7) : i === 6 ? [0] : [];
  if (d.length) { S.p.sickNext = {w:S.wk + 1, d, lv}; S.d.sickNext = S.p.sickNext; }
}
/* ---- Urlaub eintragen (Einstellungen → Alltag und Planstart) ---- */
let vacF = {from:'', to:''}, vacMsg = '';
function vacSet(k, v){ vacF[k] = v; if (k === 'from' && (!vacF.to || vacF.to < v)) vacF.to = v; render(); }
function vacApply(txt){ if (S.plan && hasStarted(S.p)) reweekFrom(todayIdx()); note('Urlaub', txt, -2); save(); render(); }
function vacAdd(){
  const p = S.p; if (!p) return; const {from, to} = vacF;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) { vacMsg = 'Bitte Beginn und Ende des Urlaubs wählen.'; return render(); }
  if (to < iso(0)) { vacMsg = 'Der Urlaub liegt in der Vergangenheit.'; return render(); }
  if (ddiff(from, to) > 60) { vacMsg = 'Höchstens 60 Tage am Stück.'; return render(); }
  p.vac = [...vacL(p), {id:uid(), from, to}].sort((a, b) => a.from.localeCompare(b.from)); S.d.vac = p.vac; vacF = {from:'', to:''}; vacMsg = '';
  const L = ddiff(from, to) + 1;
  vacApply(`Vom ${fmt(from)} bis ${fmt(to)} plant die App keine Einheiten.${L >= 7 ? ` Danach folgt ein sanfter Wiedereinstieg (${L >= 14 ? 'zwei Wochen' : 'eine Woche'} mit weniger Umfang).` : ''}`);
}
function vacDel(id){ const p = S.p; if (!p) return; p.vac = vacL(p).filter(v => v.id !== id); S.d.vac = p.vac; vacApply('Der Urlaub ist gelöscht, die Tage sind wieder normal geplant.'); }
function vacCard(){
  const p = S.p; if (!p) return ''; const L = vacL(p).filter(v => v.to >= iso(-1));
  const rows = L.map(v => { const n = ddiff(v.from, v.to) + 1; return `<div class="flex items-center gap-2 py-2 text-sm" style="border-top:1px solid var(--line)"><span class="flex-1">${fmt(v.from)} – ${fmt(v.to)} <span style="color:var(--mute)">(${n} ${n === 1 ? 'Tag' : 'Tage'})</span></span><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="vacDel('${ja(v.id)}')" aria-label="Urlaub löschen">Löschen</button></div>`; }).join('');
  return `<section class="panel p-4" id="fx-vac"><p class="font-semibold">Urlaub und Pausen</p><p class="mt-1 text-sm" style="color:var(--mute)">Trag Urlaub oder andere Zeiten ohne Training ein. An diesen Tagen plant die App keine Einheiten. Nach einer Woche oder mehr folgt ein sanfter Wiedereinstieg mit weniger Umfang.</p>
    ${rows ? `<div class="mt-2">${rows}</div>` : ''}<div class="mt-3 grid grid-cols-2 gap-3">${field('Von', `<input type="date" class="inp" style="min-height:44px" min="${esc(iso(0))}" value="${esc(vacF.from)}" onchange="vacSet('from',this.value)">`)}${field('Bis', `<input type="date" class="inp" style="min-height:44px" min="${esc(vacF.from || iso(0))}" value="${esc(vacF.to)}" onchange="vacSet('to',this.value)">`)}</div>
    ${vacMsg ? `<p class="mt-2 text-sm" style="color:#c0392b">⚠ <span>${esc(vacMsg)}</span></p>` : ''}<button class="btn mt-3 !w-auto !px-4" style="min-height:44px" onclick="vacAdd()">Urlaub eintragen</button></section>`;
}
/* ---- M8: VO2max-Block als Option für Fortgeschrittene (ab 3,5 W/kg und 8 Std. pro Woche, oder wenn schon gewählt) ---- */
function setVo2Blk(v){ S.d.vo2blk = !!v; save(); render(); }
function vo2BlkUi(d){
  const wkg = (d.ftp || 0) / kgOf(d); if (!(d.vo2blk || (wkg >= 3.5 && (d.hours || 0) >= 8))) return '';
  return `<div class="mt-4"><p class="mb-2 text-sm" style="color:var(--mute)">VO2max-Block im Aufbau (für Fortgeschrittene)</p><div class="flex flex-wrap gap-2">${chip('Nein', !d.vo2blk, 'setVo2Blk(false)')}${chip('Ja, einen Block einplanen', !!d.vo2blk, 'setVo2Blk(true)')}</div>
    <p class="mt-1 text-xs" style="color:var(--mute)">Eine Woche mit drei VO2max-Einheiten statt zwei gemischten, direkt vor einer Entlastungswoche. Bei trainierten Radfahrern brachte so ein Block in Studien etwas mehr als die gleiche Zahl verteilter Einheiten (Rønnestad et al. 2014). Die Studienlage ist klein. Nur sinnvoll ab 5 Trainingstagen.</p></div>`;
}
