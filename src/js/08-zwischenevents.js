/* ---------- Zwischenevents (B- und C-Rennen auf dem Weg zum Hauptevent) ---------- */
const absDay = (p, ds) => Math.round((new Date(ds + 'T12:00:00') - new Date(p.start + 'T12:00:00')) / 864e5);
function subSession(s){
  const m = s.min || Math.round((s.dist || 60) / 27 * 60), B = s.prio === 'B', AE = s.prio === 'A';
  if (AE) return {...D('race', `A-Event: ${s.name}`, m, 60, 100, '85–95 U/min', 'Dein Formhöhepunkt: Erste Stunde kontrolliert, gleichmäßig pacen, ab dem Start 30–60 g Kohlenhydrate pro Std., über 2,5 Std. bis 90 g. Danach folgt eine Woche Regeneration.', 'Du hast dich vorbereitet. Genieße es.'), sub:s.id, subPrio:'A'};
  return {...D('race', `Zwischenevent (${s.prio}): ${s.name}`, m, 60, B ? 95 : 88, '85–95 U/min',
    B ? 'B-Rennen: ernsthaft fahren, das Hauptevent hat aber Vorrang. Pacing, Verpflegung und Material wie am Hauptevent testen.' : 'C-Rennen als Training: Rennhärte, Gruppenfahren und Abläufe üben. Nicht bis zur völligen Erschöpfung fahren, du trainierst danach normal weiter.',
    B ? 'Die Generalprobe: alles so machen, wie du es beim Hauptevent vorhast.' : 'Mitfahren, lernen, Spaß haben.'), sub:s.id, subPrio:s.prio};
}
function applySubs(res, p, w){
  const subs = (p.subs || []).filter(s => s.date && s.date < (p.eventDate || '9999')); if (!subs.length || !p.start) return res;
  const ev = subs.map(s => ({...s, a:absDay(p, s.date)}));
  const easy = (n, m) => D('base', n, m, 56, 72, '90 U/min', 'Locker in Zone 2, keine Intensität.', 'Beine frisch halten.');
  let out = res.map((x, i) => {
    if (/^Eventtag|^Erholung nach dem Event|^Aktivierung vor dem Event/.test(x.n || '')) return x;
    const a = (w - 1) * 7 + i; let best = null;
    ev.forEach(s => { const off = a - s.a; if (off >= -3 && off <= (s.prio === 'A' ? 6 : 2) && (!best || off === 0 || Math.abs(off) < Math.abs(best.off))) best = {s, off}; });
    if (!best) return x; const {s, off} = best, B = s.prio === 'B' || s.prio === 'A', AE = s.prio === 'A', hard = ['sst', 'thr', 'vo2', 'long'].includes(x.t), nm = s.name;
    if (off === 0) return subSession(s);
    if (off === -1 && s.prio === 'C') return x; /* F17: C-Rennen ohne Tapering */
    if (off === -1) return B ? {...D('rec', 'Aktivierung vor ' + nm, 40, 50, 65, '90 U/min', '30 Min. locker, dazu 3×1 Min. @ 105–110 % mit 3 Min. Pause, danach Material und Verpflegung prüfen.', 'Früh ins Bett, nichts Neues essen.'), subPre:1} : hard ? easy('Locker vor ' + nm, Math.min(60, x.m || 60)) : x;
    if (B && off === -2) return hard ? easy('Mini-Tapering vor ' + nm, Math.min(60, x.m || 60)) : x;
    if (B && off === -3) return x.t === 'long' ? {...x, n:'Long Ride, gekürzt (Mini-Tapering)', m:Math.min(x.m, 90)} : x;
    if (AE && off > 2) return hard || x.m > 75 ? easy('Locker nach ' + nm, Math.min(60, x.m || 60)) : x;
    if (off === 1) return B && (AE || (s.min || 0) > 180) ? {...REST, n:'Erholung nach ' + nm, st:'Ruhetag nach dem Rennen: essen, schlafen, locker bewegen.', tip:'Erholung gehört zum Training.'} : (B || hard) ? D('rec', 'Ausrollen nach ' + nm, 45, 45, 55, '90–100 U/min', '45 Min. sehr locker, kleiner Gang.', 'Die Beine sollen sich danach besser anfühlen.') : x;
    if (B && off === 2) return hard ? easy('Erholung nach ' + nm, Math.min(75, x.m || 75)) : x;
    return x;
  });
  if (out.some(x => x.sub && x.m >= 90)) out = out.map(x => x.t === 'long' && !/^Eventtag/.test(x.n || '') ? easy('Grundlage statt Long Ride (das Zwischenevent ersetzt ihn)', Math.min(90, x.m)) : x);
  return out;
}
let subForm = {evId:'', name:'', date:'', prio:'C', dist:'', hm:''}, subMsg = '';
function subPick(id){ const e = EVS.find(x => x.id === id); subForm.evId = id; if (e) { subForm.name = e.n + (e.v ? ' ' + e.v : ''); subForm.date = e.d && e.d >= iso(1) ? e.d : (evDateGuess(e) || ''); subForm.dist = e.km; subForm.hm = e.hm == null ? '' : e.hm; } render(); }
function subSet(k, v){ subForm[k] = v; }
function subPrio(v){ subForm.prio = v; render(); }
function subEst(d, s){ const r = evCheck({...d, goal:'event', dist:Number(s.dist) || 0, hm:Number(s.hm) || 0, course:undefined, targetTime:'5:00'}); return r && r.real ? r.real : Math.round((Number(s.dist) || 60) / 27 * 60); }
function subAdd(){
  const d = S.d, f = subForm, sd = d.startDate && d.startDate > iso(0) ? d.startDate : iso(0);
  if (!f.name.trim()) { subMsg = 'Bitte einen Namen eingeben.'; return render(); }
  if (!f.date) { subMsg = 'Bitte ein Datum wählen.'; return render(); }
  if (f.date < sd) { subMsg = 'Das Datum liegt vor dem Planstart.'; return render(); }
  if (d.eventDate && f.date === d.eventDate) { subMsg = 'An diesem Tag ist schon dein Saisonhöhepunkt.'; return render(); }
  subInfo = '';
  if (!evMainReal(d) || (d.eventDate && f.date > d.eventDate)) { seasonSwap(d, f); subForm = {evId:'', name:'', date:'', prio:'C', dist:'', hm:''}; subMsg = ''; save(); return render(); }
  const s = {id:uid(), name:f.name.trim().slice(0, 60), date:f.date, prio:f.prio === 'A' ? 'A' : f.prio === 'B' ? 'B' : 'C', dist:Number(f.dist) || 0, hm:Number(f.hm) || 0};
  s.min = subEst(d, s); d.subs = [...(d.subs || []), s].sort((a, b) => a.date.localeCompare(b.date));
  subForm = {evId:'', name:'', date:'', prio:'C', dist:'', hm:''}; subMsg = ''; save(); render();
}
function subDel(id){ S.d.subs = (S.d.subs || []).filter(s => s.id !== id); save(); render(); }
function subTog(id){ S.d.subs = (S.d.subs || []).map(s => s.id === id ? {...s, prio:s.prio === 'C' || !s.prio ? 'B' : s.prio === 'B' ? 'A' : 'C'} : s); save(); render(); }
/* ---------- Planungsart: ein Event oder die ganze Saison ---------- */
const seasonOn = d => d.season === true || (d.season == null && (d.subs || []).length > 0);
function setSeason(on){ S.d.season = !!on; save(); render(); }
function seasonModeUi(d){
  const on = seasonOn(d), n = (d.subs || []).length;
  return `<section class="panel p-4"><p class="eyebrow mb-3">Was planst du?</p><div class="space-y-2">`
    + lopt(!on, 'setSeason(false)', 'Ein einzelnes Event', 'Der Plan führt dich gezielt zu einem Formhöhepunkt.')
    + lopt(on, 'setSeason(true)', 'Die ganze Saison', 'Trag alle Rennen ein, beliebig viele. Für jedes legst du fest, ob es ein Formhöhepunkt (A) oder ein Baustein auf dem Weg dorthin ist (B, C).')
    + `</div>${on ? `<button class="mt-3 text-sm font-semibold" style="color:var(--teal);background:none;border:0;padding:0" onclick="(document.getElementById('season-ev')||{}).scrollIntoView&&document.getElementById('season-ev').scrollIntoView({behavior:'smooth',block:'start'})">${n ? n + (n === 1 ? ' weiteres Event' : ' weitere Events') + ' eingetragen' : 'Weitere Rennen eintragen'} ↓</button>` : ''}${!on && n ? `<p class="mt-3 p-2.5 text-sm" style="background:#fff6dc;border:1px solid #d9a400">Du hast ${n} ${n === 1 ? 'weiteres Event' : 'weitere Events'} eingetragen. Bei „Ein einzelnes Event“ ${n === 1 ? 'wird es' : 'werden sie'} beim Erstellen des Plans entfernt.</p>` : ''}</section>`;
}
/* Ein Event nach dem bisherigen Saisonhöhepunkt wird selbst zum Höhepunkt; der bisherige Höhepunkt bleibt als A-Event in der Liste */
const evMainReal = d => !!(d.evId || (String(d.eventName || '').trim() && d.eventName !== 'Mein Event'));
function seasonSwap(d, s){
  const old = evMainReal(d) && d.eventDate ? {id:uid(), name:String(d.eventName || 'Bisheriges Hauptevent').slice(0, 60), date:d.eventDate, prio:'A', dist:Number(d.dist) || 0, hm:Number(d.hm) || 0} : null;
  if (old) old.min = subEst(d, old);
  d.evId = s.evId || ''; d.eventName = s.name; d.eventDate = s.date; d.dist = Number(s.dist) || 0; d.hm = Number(s.hm) || 0; d.targetTime = ''; delete d.course; delete d.evDateEst;
  const e = s.evId ? EVS.find(x => x.id === s.evId) : null; if (e && e.cp) { try { pickEv(e.id); d.eventDate = s.date; } catch (er) { elog(er); } }
  d.subs = [...(d.subs || []).filter(x => x.date !== s.date || x.name !== s.name), ...(old ? [old] : [])].sort((a, b) => a.date.localeCompare(b.date));
  { const bn = n => `<b data-noi18n>${esc(n)}</b>`; subInfo = old ? `${bn(s.name)} <span>liegt nach</span> ${bn(old.name)} <span>und ist jetzt dein Saisonhöhepunkt.</span> ${bn(old.name)} <span>steht als A-Event in der Liste. Die Zielzeit für den neuen Höhepunkt legst du im nächsten Schritt fest.</span>` : `${bn(s.name)} <span>ist jetzt dein Saisonhöhepunkt.</span>`; }
}
let subInfo = '';
function subMain(id){ const d = S.d, s = (d.subs || []).find(x => x.id === id); if (!s) return; d.subs = d.subs.filter(x => x.id !== id); seasonSwap(d, {...s, evId:(EVS.find(e => (e.n + (e.v ? ' ' + e.v : '')) === s.name) || {}).id || ''});
  if (s.date < (d.subs.find(x => x.prio === 'A' && x.date > s.date) || {}).date) subInfo += ' Hinweis: Danach liegen noch weitere Events. Die Saison endet mit dem Höhepunkt, spätere Events fallen weg.';
  d.subs = d.subs.filter(x => x.date < d.eventDate); save(); render(); }
/* Liste: mehrere Rennen direkt hinzufügen */
let subListOpen = false;
function subQuick(id, prio){ const e = EVS.find(x => x.id === id); if (!e) return; subForm = {evId:id, name:e.n + (e.v ? ' ' + e.v : ''), date:e.d && e.d >= iso(1) ? e.d : (evDateGuess(e) || ''), prio, dist:e.km, hm:e.hm == null ? '' : e.hm}; subAdd(); }
function subListUi(d){
  const sd = d.startDate && d.startDate > iso(0) ? d.startDate : iso(0), end = addD(sd, 364), have = new Set([...(d.subs || []).map(s => s.name + '|' + s.date), (d.eventName || '') + '|' + d.eventDate]);
  const L = EVS.map(e => ({e, date:e.d && e.d >= iso(1) ? e.d : evDateGuess(e)})).filter(x => x.date && x.date >= sd && x.date <= end && !have.has(x.e.n + (x.e.v ? ' ' + x.e.v : '') + '|' + x.date)).sort((a, b) => a.date.localeCompare(b.date));
  if (!L.length) return '';
  const rows = L.map(({e, date}) => `<div class="flex items-center gap-2 py-2 text-sm" style="border-top:1px solid var(--line)"><span class="min-w-0 flex-1"><b data-noi18n>${esc(e.n)}</b>${e.v ? ' · <span>' + esc(e.v) + '</span>' : ''}<br><span class="text-xs" style="color:var(--mute)"><span>${fmt(date)}</span>${e.d ? '' : ' <span>(vorläufig)</span>'} · <span>${f1(e.km)} km${e.hm != null ? ', ' + e.hm.toLocaleString('de-DE') + ' hm' : ''}</span> · <span data-noi18n>${e.c}</span></span></span>${['A', 'B', 'C'].map(k => `<button class="ghost !px-2.5 !py-1 text-xs" onclick="subQuick('${ja(e.id)}','${ja(k)}')" aria-label="Als ${esc(k)} hinzufügen">+${k}</button>`).join('')}</div>`).join('');
  return `<details class="mt-3"${subListOpen ? ' open' : ''} ontoggle="subListOpen=this.open"><summary class="cursor-pointer text-sm font-semibold" style="color:var(--teal)">Rennen aus der Liste wählen (${L.length} in den nächsten 12 Monaten)</summary><p class="mt-2 text-xs" style="color:var(--mute)">Tippe bei jedem Rennen, das du fahren willst, auf +A, +B oder +C. Du kannst beliebig viele hinzufügen.</p><div class="mt-1">${rows}</div></details>`;
}
function subsUi(d){
  const L = d.subs || [], f = subForm;
  const groups = []; EVS.forEach(e => { let g = groups.find(x => x.n === e.n); if (!g) groups.push(g = {n:e.n, c:e.c, l:[]}); g.l.push(e); });
  const opts = '<option value="">Eigenes Rennen eintragen</option>' + groups.map(g => `<optgroup label="${esc(g.n)} (${g.c})">${g.l.map(e => `<option value="${esc(e.id)}"${f.evId === e.id ? ' selected' : ''}>${esc(e.v || f1(e.km) + ' km')}</option>`).join('')}</optgroup>`).join('');
  const warn = s => { const nxA = [...L.filter(q => q.prio === 'A' && q.date > s.date).map(q => q.date), d.eventDate].filter(Boolean).sort()[0], dd = nxA ? Math.round((new Date(nxA) - new Date(s.date)) / 864e5) : 99, nm = nxA === d.eventDate ? 'dem Saisonhöhepunkt' : 'dem nächsten A-Event'; return dd < 0 ? 'liegt nach dem Hauptevent und wird ignoriert' : s.prio === 'B' && dd < 21 ? `nur ${dd} Tage vor ${nm}, besser als C-Rennen fahren` : s.prio === 'A' && dd < SEASON_MIN * 7 ? `nur ${Math.round(dd / 7)} Wochen vor ${nm}: kein neuer Aufbau möglich, die App hält die Form` : ''; };
  const rows = L.map(s => `<div class="flex items-start gap-2 p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)">${prioBadge(s.prio)}<span class="min-w-0 flex-1"><b data-noi18n>${esc(s.name)}</b><br>${fmt(s.date)}${s.dist ? ', ' + f1(s.dist) + ' km' : ''}${s.hm ? ', ' + s.hm.toLocaleString('de-DE') + ' hm' : ''}${s.min ? ', ca. ' + hm2(s.min) + ' Std.' : ''}${warn(s) ? `<br><span style="color:#9a6a00">⚠ ${warn(s)}</span>` : ''}</span><button class="ghost !px-2 !py-1 text-xs" onclick="subTog('${ja(s.id)}')">${s.prio === 'C' || !s.prio ? 'als B' : s.prio === 'B' ? 'als A' : 'als C'}</button><button class="ghost !px-2 !py-1 text-xs" onclick="subDel('${ja(s.id)}')" aria-label="Entfernen">✕</button></div>`).join('');
  return `<div class="panel p-4" id="season-ev"><p class="font-semibold">Weitere Events der Saison</p>
    <p class="mt-1 text-sm" style="color:var(--mute)">Trag alle Rennen und Veranstaltungen der Saison ein, beliebig viele und in beliebiger Reihenfolge. Das späteste Event wird automatisch dein Saisonhöhepunkt. <b>A-Events</b> sind weitere Formhöhepunkte: davor ein Tapering, danach eine Woche Regeneration. Ohne A-Events sind alle Events Bausteine auf dem Weg zum Hauptevent. <b>B-Rennen</b> sind dir wichtig: davor ein Mini-Tapering von 2 bis 3 Tagen, danach 1 bis 2 Tage Erholung. <b>C-Rennen</b> fährst du als hartes Training, ohne Tapering davor. Das Rennen ersetzt in seiner Woche den Long Ride.</p>
    ${(() => { const n = seasonNote({...d, start:d.start || mondayOf(d.startDate && d.startDate > iso(0) ? d.startDate : iso(0))}); return n ? `<div class="mt-3">${n}</div>` : ''; })()}${rows || evMainReal(d) ? `<div class="mt-3 space-y-2">${rows}${evMainReal(d) && d.eventDate ? `<div class="flex items-start gap-2 p-3 text-sm" style="background:var(--tint);border:1px solid var(--ice);border-left:3px solid #f87171">${prioBadge('A')}<span class="min-w-0 flex-1"><b data-noi18n>${esc(d.eventName)}</b><br>${fmt(d.eventDate)}${d.dist ? ', ' + f1(d.dist) + ' km' : ''}${d.hm ? ', ' + Number(d.hm).toLocaleString('de-DE') + ' hm' : ''}<br><span class="text-xs font-semibold" style="color:var(--teal)">Saisonhöhepunkt · Strecke und Zielzeit legst du oben und im nächsten Schritt fest</span></span></div>` : ''}</div>` : ''}${subListUi(d)}
    <p class="mt-4 text-sm font-semibold">Eigenes Rennen eintragen</p>
    <div class="mt-2 space-y-3 p-3" style="border:1px dashed var(--line)">
      ${field('Aus der Liste wählen', `<select class="inp" onchange="subPick(this.value)">${opts}</select>`)}
      ${field('Name', `<input class="inp" value="${esc(f.name)}" oninput="subSet('name',this.value)">`)}
      <div class="grid grid-cols-3 gap-2">${field('Datum', `<input type="date" class="inp" value="${esc(f.date)}" onchange="subSet('date',this.value)">`)}${field('km', `<input type="number" inputmode="decimal" class="inp" value="${esc(f.dist)}" oninput="subSet('dist',this.value)">`)}${field('hm', `<input type="number" inputmode="numeric" class="inp" value="${esc(f.hm)}" oninput="subSet('hm',this.value)">`)}</div>
      <div class="flex flex-wrap gap-2">${chip('A-Event (Formhöhepunkt)', f.prio === 'A', "subPrio('A')")}${chip('B-Rennen (wichtig)', f.prio === 'B', "subPrio('B')")}${chip('C-Rennen (Training)', f.prio !== 'B' && f.prio !== 'A', "subPrio('C')")}</div>
      ${subMsg ? `<p class="text-sm" style="color:#c0392b">⚠ ${esc(subMsg)}</p>` : ''}${subInfo ? `<p class="text-sm" style="color:var(--ok)">✓ ${subInfo}</p>` : ''}
      <button class="btn" onclick="subAdd()">Event hinzufügen</button></div></div>`;
}
function editSubs(){ edit(); S.d.season = true; S.step = 4; save(); render(); setTimeout(() => { const el = [...document.querySelectorAll('.font-semibold')].find(e => /Weitere Events der Saison/.test(e.textContent)); if (el) el.scrollIntoView({block:'start'}); else scrollTop0(); }, 60); }
function subsCard(p){
  const L = (p.subs || []).filter(s => s.date >= iso(0) && s.date < p.eventDate); if (!L.length && !(p.subs || []).length) return '';
  const rows = L.map(s => { const n = Math.ceil((new Date(s.date + 'T12:00:00') - Date.now()) / 864e5); return `<div class="flex items-center gap-2 text-sm">${prioBadge(s.prio)}<span class="flex-1"><b data-noi18n>${esc(s.name)}</b>, ${fmt(s.date)}${s.dist ? ', ' + f1(s.dist) + ' km' : ''}</span><span style="color:var(--mute)">${n <= 0 ? 'heute' : 'in ' + n + ' Tagen'}</span></div>`; }).join('');
  const main = `<div class="flex items-center gap-2 text-sm">${prioBadge('A')}<span class="flex-1"><b>${p.eventName ? '<span data-noi18n>' + esc(p.eventName) + '</span>' : 'Hauptevent'}</b>, ${fmt(p.eventDate)} · Saisonhöhepunkt</span></div>`;
  return fold('subs', 'Saison und Events', `<div class="mb-3">${seasonNote(p)}</div>${rows ? `<div class="space-y-2">${rows}${main}</div>` : '<p class="text-sm" style="color:var(--mute)">Alle weiteren Events liegen hinter dir.</p>'}
    <p class="mt-3 text-xs" style="color:var(--mute)">A-Event: Tapering davor, eine Woche Regeneration danach. B-Rennen: 2 bis 3 Tage Mini-Tapering davor, 1 bis 2 Tage Erholung danach. C-Rennen: kein Tapering, du fährst es als hartes Training. In der Woche eines Rennens ersetzt es den Long Ride.</p>
    <button class="ghost mt-3 !py-2 text-sm" onclick="editSubs()">Events bearbeiten</button>`, true, `${L.length} geplant`);
}
const subsInWeek = (p, w) => (p.subs || []).filter(s => { const a = absDay(p, s.date); return a >= (w - 1) * 7 && a < w * 7 && s.date < p.eventDate; });
/* tss: siehe 08-belastung.js (M5) */
const watt = (pct) => Math.round(S.p.ftp * pct / 100);
const zone = hi => hi <= 55 ? 'Z1' : hi <= 75 ? 'Z2' : hi <= 90 ? 'Z3' : hi <= 105 ? 'Z4' : 'Z5';
const mm = m0 => { const m = Math.round(Number(m0) || 0); return mmI(m); };
const mmI = m => m >= 60 ? (m % 60 ? `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')} Std.` : `${m / 60} Std.`) : `${m} Min.`;

