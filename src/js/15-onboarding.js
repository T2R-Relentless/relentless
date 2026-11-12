/* ---------- Bausteine ---------- */
const spinner = '<svg class="spin" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>';
const field = (label, inner) => `<label class="block"><span class="mb-1.5 block text-sm" style="color:var(--mute)">${label}</span>${inner}</label>`;

/* ---------- Onboarding ---------- */
const chip = (l, on, fn) => `<button onclick="${fn}" class="rounded-xl px-3.5 py-2.5 text-sm font-semibold" style="${esc(on ? 'background:var(--ice);color:#071747' : 'border:1px solid var(--line);color:var(--mute)')}">${l}</button>`;

/* ---------- Schnellplanung (Light): ein Bildschirm, sinnvolle Voreinstellungen ---------- */
const LVL = {new:['Einsteiger', 2.0, 'fährt gelegentlich, kurze Touren'], hob:['Hobby', 2.7, 'fährt regelmäßig, 2 bis 4 Std. Touren'], amb:['Ambitioniert', 3.3, 'trainiert gezielt, fährt Rennen']};
function setMode(m){ S.d.mode = m; S.step = 1; save(); render(); window.scrollTo(0, 0); }
function lightSet(k, v){ S.d[k] = v; if (k === 'hours') S.d.perDay = false; if (k === 'lvl') delete S.d.ftpKnown; save(); render(); }
function lightDay(i){ const a = [...S.d.avail]; a[i] = !a[i]; if (a.filter(Boolean).length) S.d.avail = a; save(); render(); }
function lightFinish(){
  const d = S.d, kg = d.weight > 0 ? d.weight : 75;
  if (d.goal === 'event' && !(d.eventDate && d.eventDate >= addD(sdOf(d), 14))) { lightMsg = sdOf(d) > iso(0) ? 'Das Event muss mindestens 2 Wochen nach dem Planstart liegen.' : 'Bitte ein Eventdatum wählen, das mindestens 2 Wochen in der Zukunft liegt.'; return render(); }
  if (d.goal !== 'event' && !(d.endDate && d.endDate >= addD(sdOf(d), 14))) d.endDate = addD(sdOf(d), 84);
  if (d.goal === 'fitness' && !d.ffocus) d.ffocus = 'health';
  d.ftp = d.ftpKnown > 0 ? d.ftpKnown : Math.round(LVL[d.lvl || 'hob'][1] * lvlF(d) * kg / 5) * 5;
  d.perDay = false; d.commuter = false; d.commute = d.commute.map(() => false); d.strN = d.strN || 0;
  const av = d.avail; d.longDay = av[6] ? 6 : av[5] ? 5 : av.lastIndexOf(true);
  if (d.goal === 'event') { if (!d.eventName) d.eventName = 'Mein Event'; try { const ed = (EVS.find(x => x.id === d.evId) || {}).dur, a = ed ? null : ambTarget({...d, targetTime:'5:00'}); if (ed) d.targetTime = hm2(ed); else if (!d.tgtMan && a && (a.tPlan || a.t)) d.targetTime = hm2(a.tPlan || a.t); } catch (e) { elog(e); } }
  lightMsg = ''; finish();
}
let lightMsg = '';

/* ---------- Planstart: heute oder später ---------- */
const addD = (ds, n) => { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + n); return lstr(d); };
const sdOf = d => d.startDate && d.startDate > iso(0) ? d.startDate : iso(0);
const nextMon = n => addD(mondayOf(iso(0)), 7 * n);
const firstNext = () => { const t = new Date(iso(0) + 'T12:00:00'); return lstr(new Date(t.getFullYear(), t.getMonth() + 1, 1, 12)); };
const fmtL = ds => new Date(ds + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'long', year:'numeric'});
function startOpts(){
  const o = [[iso(0), 'Heute'], [nextMon(1), 'Nächsten Montag'], [nextMon(2), 'Montag in 2 Wochen'], [firstNext(), 'Am 1. ' + new Date(firstNext() + 'T12:00:00').toLocaleDateString('de-DE', {month:'long'})]];
  return o.filter((x, i) => o.findIndex(y => y[0] === x[0]) === i).sort((a, b) => a[0].localeCompare(b[0]));
}
function setStartD(v){
  if (!v || v < iso(0)) v = iso(0); const d = S.d, ev = d.goal === 'event', dk = ev ? 'eventDate' : 'endDate';
  d.startDate = v; if (!ev && d.qd && QD[d.qd] && /^w/.test(d.qd)) d[dk] = QD[d.qd][1]();
  save(); render();
}
function startWarn(sd, goalD, ev){
  if (!goalD) return '';
  const wk = Math.floor((new Date(goalD + 'T12:00:00') - new Date(sd + 'T12:00:00')) / 6048e5);
  if (goalD <= addD(sd, 13)) return `<p class="mt-2 text-sm" style="color:#c0392b">⚠ Zwischen Planstart und ${ev ? 'Event' : 'Zieltermin'} liegen weniger als 2 Wochen. Wähle einen früheren Start oder einen späteren Termin.</p>`;
  return `<p class="mt-2 text-sm">Bis ${ev ? 'zum Event' : 'zum Zieltermin'}: <b>${wk} Wochen Training</b>.${ev && wk < 8 ? ' <span style="color:#9a6a00">Für eine gute Vorbereitung sind 8 bis 16 Wochen ideal. Die App verkürzt die Aufbauphasen entsprechend.</span>' : ''}</p>`;
}
function startUi(d){
  const sd = sdOf(d), ev = d.goal === 'event', fut = sd > iso(0);
  return `<div><p class="mb-2 font-semibold">Wann soll der Plan starten?</p><div class="flex flex-wrap gap-2">${startOpts().map(([v, l]) => chip(l, sd === v, `setStartD('${ja(v)}')`)).join('')}</div>
    <p class="mt-2 text-sm"><b>${fmtL(sd)}</b>${fut ? ` <span style="color:var(--mute)">(in ${Math.round((new Date(sd + 'T12:00:00') - new Date(iso(0) + 'T12:00:00')) / 864e5)} Tagen)</span>` : ''}</p>
    <details class="mt-1"><summary class="cursor-pointer text-sm" style="color:var(--teal)">Anderes Startdatum</summary><div class="mt-2"><input type="date" class="inp" min="${iso(0)}" value="${esc(sd)}" onchange="setStartD(this.value)" aria-label="Planstart"></div></details>
    ${startWarn(sd, d[ev ? 'eventDate' : 'endDate'], ev)}${sd40(d, sd) > sd ? `<p class="mt-1 text-sm">Dein ${ev ? 'Event' : 'Ziel'} ist mehr als 52 Wochen entfernt. Der Plan startet deshalb am <b>${fmtL(sd40(d, sd))}</b>, so bleibt er gut planbar. Bis dahin einfach mit Freude fahren.</p>` : ''}
    ${fut ? '<p class="mt-1 text-xs" style="color:var(--mute)">Bis zum Start siehst du deinen Plan als Vorschau. Abhaken und Anpassen an gefahrene Einheiten beginnt am Starttag. Bis dahin einfach wie gewohnt fahren.</p>' : ''}</div>`;
}
/* Bestehenden Plan verschieben: neuer Start, Wochen werden neu berechnet */
let shiftAsk = '', shiftEnd = true, shiftMsg = '';
function shiftStart(ds){
  const p = S.p; if (!p || !ds || ds < iso(0)) return; const ev = p.goal === 'event', dk = ev ? 'eventDate' : 'endDate';
  if (ev && ds < (sdLim(p) || '')) { shiftMsg = `Ein Plan umfasst höchstens 52 Wochen. Wähle einen Start ab ${fmt(sdLim(p))}.`; shiftAsk = ''; return render(); }
  const old = hasStarted(p) ? iso(0) : p.startDate, delta = Math.round((new Date(ds + 'T12:00:00') - new Date(old + 'T12:00:00')) / 864e5);
  if (!ev && shiftEnd && delta) { p[dk] = addD(p[dk], delta); S.d[dk] = p[dk]; }
  if (p[dk] <= addD(ds, 13)) { shiftMsg = `Zwischen dem neuen Start und ${ev ? 'dem Event' : 'dem Zieltermin'} lägen weniger als 2 Wochen. Wähle ein früheres Datum.`; shiftAsk = ''; return render(); }
  p.startDate = ds; p.start = mondayOf(ds); S.d.startDate = ds; S.ov = {}; S.wk = curWeek(p); S.plan = genWeek(p, S.wk);
  S.done = {}; S.blocked = {}; S.log = []; S.actual = {}; S.strDone = {}; S.mobDone = {}; vw = null; shiftAsk = ''; shiftMsg = '';
  analyze(); save(); render();
}
function shiftUi(p){
  const st = hasStarted(p), ev = p.goal === 'event', cur = st ? '' : p.startDate;
  const opts = startOpts().filter(([v]) => v > iso(0) && v !== cur && v >= (sdLim(p) || ''));
  return `<div class="flex flex-wrap gap-2">${opts.map(([v, l]) => chip(l, shiftAsk === v, `shiftAsk='${ja(v)}';render()`)).join('')}</div>
    <details class="mt-2"${shiftAsk && !opts.some(o => o[0] === shiftAsk) ? ' open' : ''}><summary class="cursor-pointer text-sm" style="color:var(--teal)">Anderes Datum</summary><input type="date" class="inp mt-2" min="${iso(1)}" value="${esc(shiftAsk)}" onchange="shiftAsk=this.value;render()" aria-label="Neuer Planstart"></details>
    ${!ev ? `<div class="mt-2 flex flex-wrap gap-2">${chip('Zieltermin mitverschieben', shiftEnd, 'shiftEnd=true;render()')}${chip('Zieltermin behalten', !shiftEnd, 'shiftEnd=false;render()')}</div>` : '<p class="mt-2 text-xs" style="color:var(--mute)">Das Eventdatum bleibt, die Trainingszeit davor wird kürzer.</p>'}
    ${shiftAsk ? `<div class="mt-3 p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)"><p>Neuer Start: <b>${fmtL(shiftAsk)}</b>.${st ? ' Der Plan beginnt dann wieder mit Woche 1. Abgehakte Einheiten in diesem Plan werden zurückgesetzt, deine hochgeladenen Fahrten bleiben erhalten.' : ''}</p>${startWarn(shiftAsk, !ev && shiftEnd ? addD(p.endDate, Math.round((new Date(shiftAsk + 'T12:00:00') - new Date((st ? iso(0) : p.startDate) + 'T12:00:00')) / 864e5)) : p[ev ? 'eventDate' : 'endDate'], ev)}<div class="mt-2 flex gap-2"><button class="btn !w-auto" onclick="shiftStart('${ja(shiftAsk)}')">Plan verschieben</button><button class="ghost" onclick="shiftAsk='';render()">Abbrechen</button></div></div>` : ''}
    ${shiftMsg ? `<p class="mt-2 text-sm" style="color:#c0392b">⚠ ${esc(shiftMsg)}</p>` : ''}`;
}
/* ---------- Einfache Optionen für den Zieltermin ---------- */
function nextMD(md){ const y = new Date().getFullYear(); for (const yy of [y, y + 1, y + 2]) { const ds = yy + '-' + md; if (ds >= iso(28)) return ds; } return iso(120); }
const QD = {
  w8:['in 8 Wochen', () => addD(sdOf(S.d), 56)], w12:['in 12 Wochen', () => addD(sdOf(S.d), 84)], w16:['in 16 Wochen', () => addD(sdOf(S.d), 112)], w24:['in 6 Monaten', () => addD(sdOf(S.d), 182)],
  spr:['Frühjahr (Mitte Mai)', () => nextMD('05-15'), 1], sum:['Sommer (Mitte Juli)', () => nextMD('07-15'), 1], aut:['Herbst (Mitte September)', () => nextMD('09-15'), 1]
};
function quickDate(dk, k){ const q = QD[k]; if (!q) return; S.d[dk] = q[1](); S.d.qd = k; if (dk === 'eventDate') S.d.evDateEst = !!q[2]; save(); render(); }
function dateChips(d, dk, label){
  const ev = dk === 'eventDate', cur = d[dk], fut = sdOf(d) > iso(0), wk = cur ? Math.round((new Date(cur + 'T12:00:00') - new Date(sdOf(d) + 'T12:00:00')) / 6048e5) : 0;
  const keys = ev ? ['w12', 'w16', 'w24', 'spr', 'sum', 'aut'] : ['w8', 'w12', 'w16', 'w24', 'spr', 'sum'];
  const on = k => d.qd === k && QD[k][1]() === cur;
  return `<div><p class="mb-2 text-sm" style="color:var(--mute)">${label}</p><div class="flex flex-wrap gap-2">${keys.map(k => chip(fut && /^w/.test(k) ? QD[k][0].replace('in ', '') + ' ab Start' : QD[k][0], on(k), `quickDate('${ja(dk)}','${ja(k)}')`)).join('')}</div>
    ${cur ? `<p class="mt-2 text-sm"><b>${new Date(cur + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'long', year:'numeric'})}</b> <span style="color:var(--mute)">(${fut ? wk + ' Wochen ab Planstart' : 'in ' + wk + ' Wochen'}${ev && d.evDateEst ? ', vorläufig' : ''})</span></p>` : ''}
    ${ev && d.evDateEst && d.qd && QD[d.qd] && QD[d.qd][2] ? '<p class="mt-1 text-xs" style="color:#9a6a00">Ungefährer Termin: Trage das genaue Datum ein, sobald du es kennst. Der Plan passt sich dann an.</p>' : ''}
    <details class="mt-2"${d.qd && on(d.qd) ? '' : ' open'}><summary class="cursor-pointer text-sm" style="color:var(--teal)">Genaues Datum wählen</summary><div class="mt-2"><input type="date" class="inp" min="${iso(14)}" value="${esc(cur)}" onchange="S.d.qd='';draft('${ja(dk)}',this.value);render()" aria-label="${esc(ev ? 'Eventdatum' : 'Zieltermin')}"></div></details></div>`;
}
/* Schnellplanung: große Auswahlkarten mit Auswahlkreis, Stunden-Regler */
const LIC = {ev:'<svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 23 11 8l5 8 3-5 6 12z"/></svg>', fit:'<svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 15h6l3-8 5 15 3-7h7"/></svg>', hr:'<svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 24S4 17.5 4 10.5A5 5 0 0 1 14 8a5 5 0 0 1 10 2.5C24 17.5 14 24 14 24z"/><path d="M7 14h4l2-3 2 5 2-2h4"/></svg>', test:'<svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="14" cy="15" r="9"/><path d="M14 15l4-4M11 3h6"/></svg>'};
const lopt = (on, fn, title, sub, ic, box) => `<button onclick="${fn}" class="panel flex w-full items-center gap-3 p-3.5 text-left" style="border-width:2px;${esc(on ? 'border-color:var(--ice);background:#e6f7f6' : '')}" aria-pressed="${!!on}">${ic ? `<span style="color:var(--teal);flex:none">${ic}</span>` : ''}<span class="min-w-0 flex-1"><span class="block font-semibold">${title}</span>${sub ? `<span class="block text-sm" style="color:var(--mute)">${sub}</span>` : ''}</span><span aria-hidden="true" style="flex:none;width:24px;height:24px;border-radius:${esc(box ? '3px' : '50%')};border:2px solid ${esc(on ? 'var(--ice)' : '#b9c9cf')};background:${esc(on ? 'var(--ice)' : '#fff')};color:#071747;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">${on ? '✓' : ''}</span></button>`;
function lightHrs(dh){ S.d.hours = Math.max(1, Math.min(25, Math.round((Number(S.d.hours) || 0) * 2 + dh * 2) / 2)); S.d.perDay = false; save(); render(); }
function lightPage(d){
  const ev = d.goal === 'event', lv = d.lvl || 'hob', kg = d.weight > 0 ? d.weight : 75, ftpE = d.ftpKnown > 0 ? d.ftpKnown : Math.round(LVL[lv][1] * lvlF(d) * kg / 5) * 5;
  const ls = Math.min(4, Math.max(1, S.step || 1)), showStart = !(S.edit && S.p && hasStarted(S.p));
  const cancel = S.edit && S.p ? '<button class="ghost" onclick="cancelEdit()">Abbrechen</button>' : S.newFrom ? '<button class="ghost" onclick="cancelNew()">Abbrechen</button>' : '';
  const msg = lightMsg ? `<p class="mt-4 text-sm" style="color:#c0392b">⚠ ${esc(lightMsg)}</p>` : '';
  const navRow = (prev, next) => `${msg}<div class="mt-6 flex flex-wrap gap-3">${prev ? `<button class="ghost" onclick="lightNav(${ja(prev)})">Zurück</button>` : cancel}${next ? `<button class="btn flex-1" onclick="lightNav(${ja(next)})">Weiter</button>` : finalBtn('lightFinish')}</div>`;
  const head = (t, sub) => `<h2 class="hd text-3xl font-semibold">${t}</h2><p class="mb-4 mt-1" style="color:var(--mute)">${sub}</p>`;
  if (ls === 1) return modeBar(d) + head('Worauf trainierst du hin?', 'Vier kurze Schritte, dann steht dein Plan. Alles Weitere stellt die App sinnvoll ein, und du kannst später unter Mehr → Meine Pläne → „Plan anpassen“ jedes Detail ändern.')
    + `<div class="space-y-2">${lopt(ev, "lightSet('goal','event')", 'Ein Event oder Rennen', 'Ein bestimmter Termin, z. B. ein Jedermannrennen oder Radmarathon', LIC.ev)}${lopt(!ev, "lightSet('goal','fitness')", 'Einfach fitter werden', 'Ausdauer aufbauen, schneller werden oder gesund bleiben', LIC.fit)}</div>
      ${ev ? `<div class="panel mt-4 p-4 space-y-3"><p class="font-semibold">Welches Event?</p>${evPick(d)}${field('Name des Events', `<input class="inp" placeholder="z. B. Mein Radmarathon" value="${esc(d.eventName)}" oninput="draft('eventName',this.value)">`)}
        <p class="pt-2 font-semibold">Wann?</p>${d.evId && !d.evDateEst ? field('Datum', `<input type="date" class="inp" min="${iso(14)}" value="${esc(d.eventDate)}" onchange="draft('eventDate',this.value);render()">`) : dateChips(d, 'eventDate', d.evId ? 'Termin noch nicht bestätigt, ungefähr:' : 'Ein ungefährer Termin reicht.')}
        ${d.evId ? '' : `<p class="pt-2 font-semibold">Strecke <span class="text-sm font-normal" style="color:var(--mute)">(optional)</span></p><div class="grid grid-cols-2 gap-3">${field('Distanz (km)', `<input type="number" inputmode="decimal" class="inp" value="${esc(d.dist || '')}" oninput="draft('dist',this.value)">`)}${field('Höhenmeter', `<input type="number" inputmode="numeric" class="inp" value="${esc(d.hm || '')}" oninput="draft('hm',this.value)">`)}</div>`}</div>`
      : `<div class="panel mt-4 p-4"><p class="mb-2 font-semibold">Bis wann?</p>${dateChips(d, 'endDate', 'Ein ungefährer Termin reicht.')}<div class="mt-4">${fitFocusUi(d)}</div></div>`}`
    + navRow(0, 2)
    + `${S.edit ? '' : '<button class="ghost mt-6 w-full !py-2 text-sm" onclick="chooseMode()">‹ Zurück zur Wahl der Planungsart</button>'}`;
  if (ls === 2) return head('Wie fit bist du gerade?', 'Daraus schätzt die App deinen Startwert. Ein grober Eindruck genügt.')
    + `<p class="mb-2 font-semibold">Wie würdest du dich einschätzen?</p><div class="space-y-2">${Object.entries(LVL).map(([k, v]) => lopt(lv === k && !(d.ftpKnown > 0), `lightSet('lvl','${ja(k)}')`, v[0], v[2])).join('')}</div>
    <div class="panel mt-4 p-4"><div class="grid grid-cols-2 gap-3">${field('Gewicht (kg)', `<input type="number" inputmode="decimal" class="inp" value="${esc(d.weight || '')}" oninput="draft('weight',this.value)">`)}${field('FTP, falls bekannt (W)', `<input type="number" inputmode="numeric" class="inp" placeholder="${esc(ftpE)}" value="${esc(d.ftpKnown || '')}" oninput="S.d.ftpKnown=Number(this.value)||0;save()">`)}</div>
      <p class="mt-2 text-xs" style="color:var(--mute)">Kennst du deinen FTP, trag ihn ein. Sonst schätzt die App ihn aus deiner Einschätzung oben (hier etwa ${ftpE} W).</p></div>
    <div class="mt-4 space-y-2">${pwAsk(d, true)}${d.pwMix && !d.noPwr ? pwMixHr(d) : ''}${d.noPwr ? `<div class="panel p-4">${field('Schwellenpuls, falls bekannt', `<input type="number" inputmode="numeric" class="inp" placeholder="${esc((lthrEst() || {}).v || 'z. B. 165')}" value="${esc(d.lthr || '')}" onchange="setHr('lthr',this.value)">`)}<p class="mt-2 text-xs" style="color:var(--mute)">Kennst du ihn nicht, misst ihn der Fitnesstest in der ersten Woche: 30 Minuten gleichmäßig hart, dein Schwellenpuls ist der Durchschnittspuls der letzten 20 Minuten. Den FTP für die Prognose kannst du später im Plan über ein Bergzeitfahren schätzen lassen.</p></div>` : ''}${lopt(!!d.test0, 'togTest0()', 'Mit einem Fitnesstest starten', d.noPwr ? 'Ein 30-Minuten-Test in der ersten Woche für deinen Schwellenpuls. Danach zeigen die Einheiten deine persönlichen Pulsbereiche. Empfohlen, wenn du ihn nicht kennst.' : 'Ein 20-Minuten-Test in der ersten Woche. Danach rechnet der Plan mit deinem echten Wert. Empfohlen, wenn du deinen FTP nicht kennst.', LIC.test, true)}</div>
    <div class="panel mt-4 p-4">${sexUi(d, true)}</div>`
    + navRow(1, 3);
  if (ls === 3) { const nD = d.avail.filter(Boolean).length, per = nD ? Math.round(d.hours * 60 / nD) : 0, ld = d.avail[6] ? 6 : d.avail[5] ? 5 : d.avail.lastIndexOf(true);
    return head('Wie viel Zeit hast du?', 'Der Plan richtet sich nach deiner Woche, nicht umgekehrt.')
    + `<div class="panel p-4"><p class="mb-3 font-semibold">Wie viele Stunden pro Woche?</p>
      <div class="flex items-center justify-center gap-5"><button class="ghost" style="width:54px;height:54px;font-size:1.6rem;padding:0;line-height:1;display:flex;align-items:center;justify-content:center" onclick="lightHrs(-0.5)" aria-label="Weniger">−</button><div class="text-center" style="min-width:110px"><div class="hd" style="font-size:2.8rem;line-height:1">${String(Number(d.hours) || 0).replace('.', ',')}</div><div class="text-sm" style="color:var(--mute)">Stunden pro Woche</div></div><button class="ghost" style="width:54px;height:54px;font-size:1.6rem;padding:0;line-height:1;display:flex;align-items:center;justify-content:center" onclick="lightHrs(0.5)" aria-label="Mehr">+</button></div>
      <div class="mt-4" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">${[[3, 'Einstieg'], [5, 'Regelmäßig'], [8, 'Ambitioniert'], [12, 'Sehr viel']].map(([h, l]) => `<button onclick="lightSet('hours',${ja(h)})" class="py-2 text-center" style="border:1px solid ${Number(d.hours) === h ? 'var(--ice)' : 'var(--line)'};background:${Number(d.hours) === h ? '#e6f7f6' : '#fff'}"><span class="block font-semibold">${h} Std.</span><span class="block text-xs" style="color:var(--mute)">${l}</span></button>`).join('')}</div></div>
    <div class="panel mt-4 p-4"><p class="font-semibold">An welchen Tagen kannst du fahren?</p><p class="mb-3 text-xs" style="color:var(--mute)">Tippe die Tage an. Gewählt: ${nD} ${nD === 1 ? 'Tag' : 'Tage'}.</p>
      <div class="grid gap-1.5" style="grid-template-columns:repeat(7,minmax(0,1fr))">${SD.map((x, i) => `<button onclick="lightDay(${ja(i)})" class="text-center" style="padding:10px 0;border:2px solid ${esc(d.avail[i] ? 'var(--ice)' : 'var(--line)')};background:${esc(d.avail[i] ? 'var(--ice)' : '#fff')};color:${esc(d.avail[i] ? '#071747' : 'var(--mute)')}" aria-pressed="${d.avail[i]}"><span class="block text-sm font-semibold">${x}</span><span class="block text-xs" style="height:14px">${d.avail[i] ? '✓' : ''}</span></button>`).join('')}</div>
      ${nD ? `<p class="mt-3 text-sm">Das sind im Schnitt etwa <b>${mm(per)}</b> pro Trainingstag.${ld >= 0 ? ` Der Long Ride liegt am ${DAYS[ld]} und ist länger, die anderen Tage sind kürzer.` : ''}</p>${per > 150 ? '<p class="mt-1 text-sm" style="color:#9a6a00">Das ist viel pro Tag. Mehr Trainingstage oder etwas weniger Stunden machen die Woche entspannter.</p>' : per < 35 ? '<p class="mt-1 text-sm" style="color:#9a6a00">Sehr kurze Einheiten. Weniger Tage mit etwas mehr Zeit bringen meist mehr.</p>' : ''}` : ''}</div>
    <p class="mb-2 mt-4 font-semibold">Kurze Übungen für Beweglichkeit und Rumpf dazu?</p><div class="space-y-2">${lopt(!d.mobN, "lightSet('mobN',0)", 'Nein, nur Radfahren', '')}${lopt(d.mobN === 2, "lightSet('mobN',2)", 'Ja, 2× pro Woche', 'Je etwa 15 Minuten Dehnen und Rumpfstabilität, ohne Geräte. Gut gegen Rücken- und Nackenbeschwerden.')}</div>`
    + navRow(2, 4); }
  const sum = [ev ? `<span data-noi18n>${esc(d.eventName || (lang() === 'en' ? 'My event' : 'Mein Event'))}</span>${d.eventDate ? ', ' + fmt(d.eventDate) : ''}` : `Fitter werden bis ${fmt(d.endDate || addD(sdOf(d), 84))}`, `${(LVL[lv] || [''])[0]}${d.ftpKnown > 0 ? ', FTP ' + d.ftpKnown + ' W' : ''}${d.noPwr ? ', ohne Leistungsmesser' : ''}${d.test0 ? ', mit Fitnesstest' : ''}`, `${d.hours} Std. pro Woche, ${SD.filter((x, i) => d.avail[i]).join(', ')}`];
  return head(showStart ? 'Wann geht es los?' : 'Fast geschafft', 'Ein kurzer Blick auf deine Angaben, dann erstellt die App deinen Plan.')
    + (showStart ? `<div class="panel p-4">${startUi(d)}</div>` : '')
    + `<div class="panel mt-4 p-4"><p class="eyebrow mb-2">Deine Angaben</p>${sum.map((t, i) => `<div class="flex items-center justify-between gap-3 py-1.5 text-sm" style="${esc(i ? 'border-top:1px solid var(--line)' : '')}"><span>${t}</span><button class="underline shrink-0" style="color:var(--teal)" onclick="lightNav(${ja(i + 1)})">Ändern</button></div>`).join('')}</div>
    <p class="mt-4 text-sm" style="color:var(--mute)">Die App plant den Long Ride ans Wochenende, ${ev ? 'schätzt eine realistische Zielzeit' : 'baut die Ausdauer schrittweise auf'} und lässt Pendeln und Krafttraining weg. Alles davon kannst du später ergänzen.</p>`
    + navRow(3, 0);
}
function lightNav(n){
  const d = S.d;
  if (n > (S.step || 1) && (S.step || 1) === 1 && d.goal === 'event' && !(d.eventDate && d.eventDate >= iso(14))) { lightMsg = 'Bitte ein Eventdatum wählen, das mindestens 2 Wochen in der Zukunft liegt.'; return render(); }
  lightMsg = ''; nav(n);
}

/* ---------- Planungsart wählen: eigener, gut sichtbarer erster Schritt ---------- */
function chooseMode(){ S.d.mode = null; S.step = 1; save(); render(); window.scrollTo(0, 0); }
const modeBar = d => `<div class="mb-5 flex flex-wrap items-center gap-2 p-3" style="background:#e6f7f6;border:1px solid var(--ice)"><span class="flex-1 text-sm"><b>${d.mode === 'light' ? 'Schnellplanung' : 'Ausführliche Planung'}</b> · ${d.mode === 'light' ? '4 kurze Schritte' : 'alle Optionen'}</span><button class="ghost !px-3 !py-1.5 text-sm" onclick="${d.mode === 'light' ? "setMode('full')" : "setMode('light')"}">${d.mode === 'light' ? 'Zur ausführlichen Planung' : 'Zur Schnellplanung'}</button></div>`;
function modePage(d){
  const card = (m, t, time, sub, pts, rec) => `<button onclick="setMode('${ja(m)}')" class="panel block w-full p-5 text-left" style="border-width:2px;${esc(rec ? 'border-color:var(--ice)' : '')}">
    <span class="flex flex-wrap items-center gap-2">${rec ? '<b class="rounded-full px-2 text-xs" style="background:var(--ice);color:#071747">Empfohlen für den Einstieg</b>' : ''}<b class="rounded-full px-2 text-xs" style="background:var(--tint);color:var(--ink)">${time}</b></span>
    <span class="hd mt-2 block text-2xl font-semibold">${t}</span><span class="mt-1 block text-sm" style="color:var(--mute)">${sub}</span>
    <span class="mt-3 block space-y-1 text-sm">${pts.map(x => `<span class="flex gap-2"><span style="color:var(--teal)">✓</span><span>${x}</span></span>`).join('')}</span>
    <span class="btn mt-4 inline-block">${m === 'light' ? 'Schnell planen' : 'Ausführlich planen'}</span></button>`;
  return `<h2 class="hd text-3xl font-semibold">Wie möchtest du planen?</h2><p class="mb-5 mt-1" style="color:var(--mute)">Beide Wege führen zu einem vollständigen Trainingsplan. Du kannst später unter Mehr → Meine Pläne → „Plan anpassen“ jederzeit alles ändern oder die Planungsart wechseln.</p>
    <div class="space-y-4">${card('light', 'Schnellplanung', 'etwa 1 Minute', 'Vier kurze Fragen, den Rest stellt die App sinnvoll ein.', ['Ziel und Termin', 'Dein Fitnessstand', 'Stunden pro Woche und Trainingstage', 'Startdatum'], true)}
    ${card('full', 'Ausführliche Planung', 'etwa 5 Minuten', 'Alle Stellschrauben selbst festlegen.', ['Streckenprofil und Zielzeit', 'Zeit für jeden einzelnen Tag, Pendeln mit dem Rad', 'Krafttraining, Mobilität und Zyklus', 'Saisonplanung mit mehreren Formhöhepunkten, Plan-Check mit Prognose'], false)}</div>${importLink()}
`;
}
const modeChips = d => `<div class="mb-5 p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="mb-2 text-sm font-semibold">Wie ausführlich möchtest du planen?</p><div class="flex flex-wrap gap-2">${chip('Schnell: 4 kurze Schritte', d.mode === 'light', "setMode('light')")}${chip('Ausführlich: alle Optionen', d.mode !== 'light', "setMode('full')")}</div><p class="mt-2 text-xs" style="color:var(--mute)">Die Schnellplanung stellt Details wie Streckenprofil, Pendeln, Kraft und Zwischenevents automatisch ein. Du kannst jederzeit wechseln.</p></div>`;

/* Ziel-FTP: realistische Prognose als Vorschlag vorbelegen, solange der Wert nicht selbst geändert wurde */
function ftpSug(d){
  try { const pv = mkPrev({...d, goal:'ftp'}), st = planStats(pv), r = hRec(pv, 0), base = ftpProj(pv, st.hAvg, st.tot), rt = pv.hours > 0 && st.hAvg > 0 ? Math.min(1, st.hAvg / pv.hours) : .87, hAv = Math.min(14, Math.max(pv.hours, r[1])), hA = hAv * rt, amb = ftpProj(pv, hA, st.tot), r5 = x => Math.round(x / 5) * 5;
    return {mid:r5(base.mid), lo:r5(base.lo), hi:r5(base.hi), amb:r5(amb.mid), h:st.hAvg, hv:pv.hours, hA, hAv, weeks:st.tot}; } catch (e) { elog(e); return null; }
}
function setFtpT(v){ S.d.ftpTarget = v; S.d.ftpTargetManual = true; save(); render(); }
function resetFtpT(){ delete S.d.ftpTargetManual; save(); render(); }
function ftpTgtUi(d){
  const g = ftpSug(d);
  if (g && !d.ftpTargetManual && d.ftpTarget !== g.mid) { d.ftpTarget = g.mid; save(); }
  const kg = kgOf(d);
  return field('Ziel-FTP in Watt', `<input type="number" inputmode="numeric" class="inp" value="${esc(d.ftpTarget)}" oninput="S.d.ftpTargetManual = true; draft('ftpTarget',this.value)">`) + (g ? `<div class="p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)"><p class="font-semibold">${d.ftpTargetManual ? 'Prognose zum Vergleich' : 'Vorgeschlagen: realistische Prognose'}</p>
    <p class="mt-1">Mit deinem Plan (${hStd(g.hv)} Std. pro Woche verfügbar, ${g.weeks} Wochen) sind etwa <b>${g.mid} W</b> realistisch (${g.lo} bis ${g.hi} W, ${f1(g.mid / kg)} W/kg).${g.amb > g.mid ? ` Mit ambitioniertem Training (etwa ${hStd(g.hAv)} Std. pro Woche verfügbar) sind etwa <b>${g.amb} W</b> möglich.` : ''} Heute: ${d.ftp > 0 ? d.ftp : 200} W.</p>
    <div class="mt-2 flex flex-wrap gap-2"><button class="ghost !py-1.5 text-sm" onclick="setFtpT(${ja(g.mid)})">Realistisch: ${g.mid} W</button>${g.amb > g.mid ? `<button class="ghost !py-1.5 text-sm" onclick="setFtpT(${ja(g.amb)})">Ambitioniert: ${g.amb} W</button>` : ''}${d.ftpTargetManual ? '<button class="ghost !py-1.5 text-sm" onclick="resetFtpT()">Vorschlag automatisch anpassen</button>' : ''}</div>
    <p class="mt-2 text-xs" style="color:var(--mute)">${d.ftpTargetManual ? 'Du hast den Wert selbst festgelegt.' : 'Der Wert passt sich an, wenn du Zieltermin, Umfang oder FTP änderst, bis du ihn selbst überschreibst.'} Die Prognose ist ein Faustmodell, siehe Plan-Check.</p></div>` : '');
}

/* ---------- Fitness-Ziel: Schwerpunkt wählen ---------- */
const FF = {
  endur:['Längere Touren schaffen', 'Ausdauer für lange Ausfahrten. Der Long Ride wächst Schritt für Schritt bis zu deiner Zieltour.', 'Vor allem Zone 2, ein Sweet-Spot-Reiz pro Woche, am Ende deine Zieltour.'],
  speed:['Schneller werden', 'Mehr Tempo auf deinen Runden und am Berg.', 'Neben Grundlage je Woche Sweet Spot und kurze VO2max-Intervalle, später 30/15 und Schwelle.'],
  health:['Fit und gesund bleiben', 'Regelmäßig und entspannt fahren, ohne Leistungsdruck.', 'Fast nur lockere Einheiten, höchstens ein moderater Reiz pro Woche. Mobilität passt gut dazu.'],
  restart:['Wiedereinstieg', 'Nach einer Pause, Krankheit oder Verletzung behutsam aufbauen.', 'Start mit etwa 60 % deiner Wochenzeit, die ersten 3 Wochen ohne Intervalle, dann langsam steigern.']
};
function setFF(k){ S.d.ffocus = k; if (k === 'endur' && !S.d.ftour) S.d.ftour = 180; if (k === 'health' && !S.d.mobN) S.d.mobN = 2; save(); render(); }
function setTour(m){ S.d.ftour = m; save(); render(); }
function fitFocusUi(d){
  const f = d.ffocus;
  return `<div><p class="mb-2 font-semibold">Was heißt „fitter“ für dich?</p><div class="space-y-2">${Object.entries(FF).map(([k, v]) => `<button onclick="setFF('${ja(k)}')" class="panel flex w-full flex-col items-start gap-0.5 p-3 text-left" style="${esc(f === k ? 'border-color:var(--ice);background:#e6f7f6' : '')}"><span class="hd text-lg font-semibold">${v[0]}</span><span class="text-sm" style="color:var(--mute)">${v[1]}</span></button>`).join('')}</div>
    ${f === 'endur' ? `<p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Welche Tour willst du am Ende am Stück schaffen?</p><div class="flex flex-wrap gap-2">${[120, 180, 240, 300, 360].map(m => chip(hm2(m) + ' Std.', d.ftour === m, `setTour(${ja(m)})`)).join('')}</div><p class="mt-1 text-xs" style="color:var(--mute)">Grob: 2 Std. sind etwa 50 km, 4 Std. etwa 100 km, 6 Std. etwa 150 km in ruhigem Tempo.</p>` : ''}
    ${f ? `<p class="mt-2 text-sm"><b>So plant die App:</b> ${FF[f][2]}</p>` : ''}</div>`;
}
const fitGoalText = p => ({endur:`Ziel: ${p.ftour ? hm2(p.ftour) + ' Std. am Stück' : 'längere Touren'} bis ${fmt(p.endDate)}`, speed:'Ziel: schneller werden, mehr Tempo und Kraft', health:'Ziel: regelmäßig und entspannt fit bleiben', restart:'Ziel: behutsamer Wiedereinstieg'}[p.ffocus] || 'Ziel: aerobe Grundlage und Grundfitness aufbauen');
/* ---------- Geschlecht und Zyklus: Besonderheiten für Frauen und Männer ---------- */
const dstrW = i => { if (!S.p || !S.p.start) return null; const d = new Date(S.p.start + 'T12:00:00'); d.setDate(d.getDate() + ((typeof strWeek === 'number' ? strWeek : S.wk) - 1) * 7 + i); return lstr(d); };
const sexF = p => p && p.sex === 'f', cycOn = p => sexF(p) && p.cycMode === 'track' && /^\d{4}-\d{2}-\d{2}$/.test(p.cycLast || '');
const CYC = {mens:['Periode', '#d6456b', '#fde8ee'], foll:['Follikelphase', '#11907b', '#e0f4ef'], ovu:['um den Eisprung', '#c27f0c', '#fcf0d9'], lut:['Lutealphase', '#7a64c6', '#eeeafa'], late:['vor der Periode', '#5a48a0', '#e6e2f4']};
const cycPh = (day, len) => { const ov = len - 14; return day <= 5 ? 'mens' : day < ov - 1 ? 'foll' : day <= ov + 1 ? 'ovu' : day > len - 5 ? 'late' : 'lut'; };
function cycInfo(p, ds){
  if (!cycOn(p) || !ds) return null;
  const len = Math.min(40, Math.max(21, p.cycLen || 28)), diff = Math.round((new Date(ds + 'T12:00:00') - new Date(p.cycLast + 'T12:00:00')) / 864e5), day = ((diff % len) + len) % len + 1, ph = cycPh(day, len);
  const nx = new Date(ds + 'T12:00:00'); nx.setDate(nx.getDate() + len - day + 1);
  return {day, len, ph, label:CYC[ph][0], col:CYC[ph][1], bg:CYC[ph][2], next:lstr(nx), old:diff > len * 2};
}
/* Beschwerdetage nach eigener Angabe: Periode Tag 1–3 und/oder die letzten Tage davor */
const cycSens = (p, c) => { if (!c) return false; const s = p.cycSym || 'mens'; return s !== 'none' && ((c.ph === 'mens' && c.day <= 3 && s !== 'pms') || (c.ph === 'late' && s !== 'mens')); };
/* Zyklusgerechte Anpassung: harte Intervalle aus den Beschwerdetagen auf einen passenden Tag derselben Woche legen.
   Umfang und Wochenstruktur bleiben gleich (McNulty et al. 2020: im Mittel kleine, individuell sehr unterschiedliche Effekte). */
function applyCyc(res, p, w){
  if (!cycOn(p) || p.cycAdapt === false || !p.start) return res;
  const ds = i => { const d = new Date(p.start + 'T12:00:00'); d.setDate(d.getDate() + (w - 1) * 7 + i); return lstr(d); };
  const sens = res.map((_, i) => cycSens(p, cycInfo(p, ds(i)))); if (!sens.some(Boolean)) return res;
  const out = res.slice(), lock = x => !x || x.sub || x.subPre || /^Eventtag|^Aktivierung|^Erholung nach|^Deine Zieltour/.test(x.n || '');
  const key = j => j >= 0 && j < 7 && out[j] && ['long', 'sst', 'thr', 'vo2', 'race'].includes(out[j].t);
  const t0 = hasStarted(p) && w === curWeek(p) ? todayIdx() : 0;
  for (let i = t0; i < 7; i++) {
    const x = out[i]; if (!sens[i] || !(HARD.includes(x.t) || x.t === 'test') || lock(x) || x.cycMoved) continue;
    const ok = j => j >= t0 && j < 7 && !sens[j] && !lock(out[j]) && !out[j].cycMoved && !out[j].parts && !x.parts && (out[j].t === 'base' || (out[j].t === 'rest' && p.avail[j])) && capOf(p, j) >= x.m && ![j - 1, j + 1].some(q => q !== i && key(q));
    const j = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6].map(d => i + d).find(ok);
    if (j === undefined) { out[i] = {...x, cycFlag:true}; continue; }
    const y = out[j];
    out[j] = {...x, cycMoved:{from:i}, tip:x.tip + ` Vom ${DAYS[i]} hierher gelegt, damit die harte Einheit nicht in deine Beschwerdetage fällt.`};
    out[i] = {...y, m:y.t === 'base' ? Math.min(y.m, Math.max(30, capOf(p, i))) : y.m, cycMoved:{to:j}};
  }
  return out;
}
/* Planänderungen gelten ab morgen: vergangene Tage und das heutige Training bleiben, wie sie sind */
const keepT = nw => { if (!S.plan || !S.p || !hasStarted(S.p)) return nw; const t = todayIdx(); return nw.map((x, i) => i <= t && S.plan[i] ? (i === t ? {...S.plan[i], kept:1} : S.plan[i]) : x); };
function replanCyc(){ if (!S.p || !S.plan || !S.wk) return; const t = hasStarted(S.p) ? todayIdx() : 0, nw = genWeek(S.p, S.wk); S.plan = S.plan.map((x, i) => (hasStarted(S.p) && i <= t) || x.adapted || x.varOf || x.moved || (S.done && S.done[i]) || (S.actual && S.actual[i]) ? (hasStarted(S.p) && i === t ? {...x, kept:1} : x) : nw[i]); }
function perStart(ds){
  ds = ds || iso(0); if (ds > iso(0)) return;
  const prev = S.d.cycLast, df = prev ? Math.round((new Date(ds + 'T12:00:00') - new Date(prev + 'T12:00:00')) / 864e5) : 0;
  if (df >= 21 && df <= 40) S.d.cycLen = Math.round(((S.d.cycLen || 28) * 2 + df) / 3);
  S.d.cycLast = ds; S.d.cycMode = 'track'; if (S.p) { S.p.cycLast = ds; S.p.cycLen = S.d.cycLen; S.p.cycMode = 'track'; replanCyc(); }
  cycMsg = df >= 21 && df <= 40 ? `Gespeichert. Dein letzter Zyklus dauerte ${df} Tage, die App rechnet jetzt mit ${S.d.cycLen} Tagen.` : 'Gespeichert. Zyklustage und Plan sind aktualisiert.';
  save(); render();
}
let cycMsg = '';
function cycRing(c, sz = 44, dark){
  const r = 40, C = 2 * Math.PI * r, segs = []; let st = 1;
  for (let d = 2; d <= c.len + 1; d++) if (d > c.len || cycPh(d, c.len) !== cycPh(st, c.len)) { segs.push([st, d - 1, cycPh(st, c.len)]); st = d; }
  const arc = ([a, b, ph]) => `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${CYC[ph][1]}" stroke-width="11" stroke-dasharray="${Math.max(.5, (b - a + 1) / c.len * C - 1.5)} ${C}" stroke-dashoffset="${-(a - 1) / c.len * C}" transform="rotate(-90 50 50)" opacity="${ph === c.ph ? 1 : dark ? .45 : .32}"/>`;
  const an = (c.day - .5) / c.len * 2 * Math.PI - Math.PI / 2, mx = 50 + r * Math.cos(an), my = 50 + r * Math.sin(an), big = sz > 70;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 100 100" aria-hidden="true" style="flex:none">${segs.map(arc).join('')}<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="9" fill="${dark ? '#071747' : '#fff'}" stroke="${c.col}" stroke-width="4"/><text x="50" y="${big ? 55 : 61}" text-anchor="middle" font-size="${big ? 28 : 34}" font-weight="700" fill="${dark ? '#fff' : '#0b1c49'}">${c.day}</text>${big ? `<text x="50" y="70" text-anchor="middle" font-size="10" fill="${dark ? 'rgba(255,255,255,.7)' : '#5b6f80'}">von ${c.len}</text>` : ''}</svg>`;
}
const cycLeg = (ks, extra) => `<div class="mt-2 flex flex-wrap text-xs" style="color:var(--mute);column-gap:12px;row-gap:4px">${ks.map(k => `<span style="display:inline-flex;align-items:center;gap:4px"><i class="cyc-dot" style="background:${esc(CYC[k][1])}"></i>${CYC[k][0][0].toUpperCase() + CYC[k][0].slice(1)}</span>`).join('')}<span style="display:inline-flex;align-items:center;gap:4px"><i class="cyc-k"></i>harte Einheit</span><span style="display:inline-flex;align-items:center;gap:4px"><i class="cyc-k cyc-l"></i>Long Ride</span>${extra || ''}<span>Umrandet: deine Beschwerdetage</span></div>`;
function cycCell(p, ds, x, lbl){
  const c = cycInfo(p, ds); if (!c) return '<div></div>';
  const hd = x && (HARD.includes(x.t) || x.t === 'race'), lg = x && x.t === 'long', mv = x && x.cycMoved && x.cycMoved.from !== undefined, ev = p.goal === 'event' && ds === p.eventDate, sb = (p.subs || []).some(s => s.date === ds);
  return `<div class="cyc-c${esc(ds === iso(0) ? ' now' : '')}${esc(ds < iso(0) ? ' past' : '')}" style="background:${esc(c.bg)};${esc(cycSens(p, c) ? 'border-color:' + c.col : 'border-top-color:' + c.col)}" title="Zyklustag ${esc(c.day)}, ${esc(c.label)}"><span class="cyc-d">${lbl}</span><b style="color:${esc(c.col)}">${c.day}</b><span class="cyc-m">${ev || sb ? '⚑' : ''}${mv ? '↷' : ''}${hd ? '<i class="cyc-k"></i>' : lg ? '<i class="cyc-k cyc-l"></i>' : ''}</span></div>`;
}
function cycWeek(p, w, plan){
  if (!cycOn(p) || !p.start) return '';
  const ds = i => { const d = new Date(p.start + 'T12:00:00'); d.setDate(d.getDate() + (w - 1) * 7 + i); return lstr(d); };
  const ks = [...new Set([0, 1, 2, 3, 4, 5, 6].map(i => cycInfo(p, ds(i)).ph))];
  const moves = plan.map((x, i) => x && x.cycMoved && x.cycMoved.from !== undefined ? `<b>${SD[x.cycMoved.from]} → ${SD[i]}</b> ${esc(x.n)}` : null).filter(Boolean), flags = plan.map((x, i) => x && x.cycFlag ? `${SD[i]}: ${esc(x.n)}` : null).filter(Boolean);
  return `<div class="panel mb-3 p-3"><div class="flex items-center justify-between gap-2"><p class="eyebrow">Dein Zyklus in dieser Woche</p><button class="text-xs font-semibold underline" style="color:var(--teal)" onclick="goPg('cycle')">Zyklus ansehen ›</button></div>
    <div class="cyc-w mt-2">${[0, 1, 2, 3, 4, 5, 6].map(i => cycCell(p, ds(i), plan[i], SD[i])).join('')}</div>${cycLeg(ks, moves.length ? '<span>↷ verlegt</span>' : '')}
    ${moves.length ? `<p class="mt-2 text-sm">Zyklusgerecht verlegt: ${moves.join(' · ')}. Umfang und Belastung der Woche bleiben gleich.</p>` : ''}${flags.length ? `<p class="mt-1 text-sm" style="color:var(--mute)">Ließ sich nicht verlegen: ${flags.join(' · ')}. Fühlst du dich an dem Tag schlapp, fahr locker statt hart.</p>` : ''}${p.cycAdapt === false ? '<p class="mt-1 text-xs" style="color:var(--mute)">Anpassung ausgeschaltet: Der Zyklus wird nur angezeigt.</p>' : ''}</div>`;
}
function cycSymUi(d){
  const s = d.cycSym || 'mens', a = d.cycAdapt !== false;
  return `<div class="mt-3"><p class="text-sm font-semibold">Wann fühlst du dich meist weniger leistungsfähig?</p><div class="mt-2 flex flex-wrap gap-2">${[['mens', 'Erste Periodentage'], ['pms', 'Tage vor der Periode'], ['both', 'Beides'], ['none', 'Kaum Unterschied']].map(([k, l]) => chip(l, s === k, `setCyc('cycSym','${ja(k)}')`)).join('')}</div>
    <p class="mt-3 text-sm font-semibold">Plan an den Zyklus anpassen?</p><div class="mt-2 flex flex-wrap gap-2">${chip('Ja, harte Einheiten verlegen', a, "setCyc('cycAdapt',true)")}${chip('Nein, nur anzeigen', !a, "setCyc('cycAdapt',false)")}</div></div>`;
}
const CYCTIP = {mens:'Viele fühlen sich in den ersten Tagen müder, manche merken gar nichts. Eisenreich essen (Linsen, Fleisch, Haferflocken mit Vitamin C), Wärme hilft bei Krämpfen.', foll:'Viele fühlen sich jetzt frisch und erholen sich gut: gute Tage für harte Intervalle.', ovu:'Rund um den Eisprung fühlen sich viele leistungsfähig. Normal weiter trainieren.', lut:'Die Körpertemperatur ist leicht erhöht und der Energiebedarf etwas größer: ausreichend essen, mehr trinken, bei Hitze mehr Salz.', late:'Manche merken jetzt Müdigkeit, Wassereinlagerungen oder Heißhunger. Einen Snack einplanen und auf den Körper hören.'};
function cyclePage(p){
  const c = cycInfo(p, iso(0));
  if (!c) return `<section class="panel p-4"><p class="text-sm">Trage den ersten Tag deiner letzten Periode ein, dann zeigt die App deine Zyklustage und passt den Plan an.</p><div class="mt-3">${field('Erster Tag der letzten Periode', `<input type="date" class="inp" max="${iso(0)}" onchange="perStart(this.value)">`)}</div></section>`;
  const nd = Math.round((new Date(c.next + 'T12:00:00') - new Date(iso(0) + 'T12:00:00')) / 864e5), cw = curWeek(p), tot = phases(p).slice(-1)[0].to, m0 = mondayOf(iso(0));
  const rows = [0, 1, 2, 3, 4].map(k => { const w = cw + k, pl = k === 0 && S.plan ? S.plan : w <= tot ? genWeek(p, w) : [];
    return `<div class="cyc-w">${[0, 1, 2, 3, 4, 5, 6].map(i => { const d = new Date(m0 + 'T12:00:00'); d.setDate(d.getDate() + k * 7 + i); const ds = lstr(d); return cycCell(p, ds, ds >= (p.startDate || p.start) ? pl[i] : null, d.getDate() + '.' + (d.getDate() === 1 || (k === 0 && i === 0) ? (d.getMonth() + 1) + '.' : '')); }).join('')}</div>`; }).join('');
  const sub = S.plan ? S.plan.map((x, i) => x && x.cycMoved && x.cycMoved.from !== undefined ? `${DAYS[x.cycMoved.from]} → ${DAYS[i]}: ${esc(x.n)}` : null).filter(Boolean) : [];
  return `<section class="panel p-4"><div class="flex items-center gap-4">${cycRing(c, 112)}<div class="min-w-0"><p class="text-sm" style="color:var(--mute)">Heute</p><p class="hd text-2xl font-semibold leading-tight">Zyklustag ${c.day}</p><p class="mt-1"><span class="cyc-pill" style="background:${esc(c.col)}">${c.label}</span></p><p class="mt-2 text-sm">Nächste Periode voraussichtlich <b>${fmt(c.next)}</b>${nd > 0 ? ` (in ${nd} Tag${nd > 1 ? 'en' : ''})` : ''}</p></div></div>
      <p class="mt-3 text-sm">${CYCTIP[c.ph]}</p>
      ${c.old ? '<p class="mt-2 text-sm" style="color:#9a6a00">⚠ Deine letzte eingetragene Periode ist über zwei Zyklen her. Trag den letzten Beginn ein, damit die Vorhersage stimmt.</p>' : ''}
      <div class="mt-3 flex flex-wrap items-end gap-2"><button class="btn !w-auto" onclick="perStart()">Periode hat heute begonnen</button><label class="text-xs" style="color:var(--mute)">oder an einem anderen Tag<input type="date" class="inp mt-1 !py-1.5" max="${iso(0)}" value="${esc(p.cycLast || '')}" onchange="perStart(this.value)"></label></div>
      ${cycMsg ? `<p class="mt-2 text-sm" style="color:var(--ok)">✓ ${esc(cycMsg)}</p>` : ''}</section>
    <section class="panel p-4"><h2 class="hd text-xl font-semibold">Die nächsten 5 Wochen</h2><p class="mt-1 text-sm" style="color:var(--mute)">Zyklus (Vorhersage) und geplante Schlüsseleinheiten. Die Zahl ist der Zyklustag, darüber das Datum.</p>
      <div class="mt-3 space-y-1"><div class="cyc-w">${SD.map(x => `<span class="cyc-d text-center">${x}</span>`).join('')}</div>${rows}</div>${cycLeg(['mens', 'foll', 'ovu', 'lut', 'late'], '<span>⚑ Event</span>')}</section>
    <section class="panel p-4"><h2 class="hd text-xl font-semibold">So passt die App deinen Plan an</h2>${cycSymUi(p)}
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm">${p.cycAdapt === false ? '<li>Die Anpassung ist ausgeschaltet. Du siehst den Zyklus nur zur Orientierung.</li>' : `<li>Fällt eine harte Intervalleinheit in deine Beschwerdetage, legt die App sie auf einen freien oder lockeren Tag derselben Woche, der nicht direkt neben einer anderen harten Einheit liegt und genug Zeit hat.</li><li>Der lockere Tag rückt dafür an die Stelle der harten Einheit. Umfang, Belastung und Wochenaufbau bleiben gleich.</li><li>Geht das nicht (zum Beispiel an Pendeltagen, beim Event oder bei Zwischenevents), bleibt die Einheit, und du kannst sie am Tag selbst mit einem Klick locker fahren.</li><li>Long Rides und Events verschiebt die App nie.</li>`}<li>Trägst du den Beginn deiner Periode ein, rechnet die App die aktuelle Woche neu und lernt deine durchschnittliche Zykluslänge.</li></ul>
      ${sub.length ? `<p class="mt-3 text-sm"><b>Diese Woche verlegt:</b> ${sub.join(' · ')}</p>` : ''}
      <div class="mt-3 grid grid-cols-2 gap-3">${field('Zykluslänge (Tage)', `<input type="number" inputmode="numeric" min="21" max="40" class="inp" value="${esc(p.cycLen || 28)}" onchange="setCyc('cycLen',Math.min(40,Math.max(21,Number(this.value)||28)))">`)}<div class="flex items-end"><button class="ghost !py-2 text-sm" onclick="setCyc('cycMode','off')">Zyklus nicht mehr mitführen</button></div></div></section>
    <section class="panel p-4 text-sm"><h2 class="hd text-xl font-semibold">Warum so und nicht nach starren Phasen?</h2><p class="mt-2">Im Mittel verändert der Zyklus die Ausdauerleistung nur wenig. Eine große Übersichtsarbeit fand eine sehr kleine Minderung während der Periode, mit großen Unterschieden zwischen Frauen (${wsrc('McNulty et al. 2020', 'https://nrl.northumbria.ac.uk/id/eprint/43759')}). Für Krafttraining zeigt die aktuelle Studienlage keinen klaren Vorteil, das Training nach Zyklusphasen auszurichten (${wsrc('Colenso-Semple et al. 2023', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10076834')}).</p><p class="mt-2">Deshalb richtet sich die App nach <b>deinen</b> Beschwerdetagen statt nach einem Schema. Beobachte ein paar Zyklen lang, wie du dich fühlst, und stell die Angabe oben passend ein. Die Phasen sind aus Periodenbeginn und Zykluslänge geschätzt, der Eisprung kann um mehrere Tage abweichen.</p><p class="mt-2 text-xs" style="color:var(--mute)">Bleibt die Periode aus oder wird sehr unregelmäßig, kann das ein Zeichen für Energiemangel (REDs) sein. Dann ärztlich abklären lassen. Deine Angaben bleiben nur auf deinem Gerät.</p></section>`;
}
function easyDay(i){
  const x = S.plan[i]; if (!x || x.adapted) return;
  S.plan[i] = {...D('base', 'Locker statt hart', Math.max(30, Math.min(60, x.m || 60)), 56, 70, '90 U/min', 'Locker in Zone 2, so wie es sich heute gut anfühlt. Auf den Körper zu hören ist Teil des Trainings.', 'Die harte Einheit musst du nicht nachholen, der Plan läuft normal weiter.'), adapted:true, orig:x};
  note(`${DAYS[i]}: locker statt hart`, 'Auf deinen Wunsch hat die App die harte Einheit heute durch eine lockere Fahrt ersetzt.', i); save(); render();
}
function setSex(v){ S.d.sex = v; if (v !== 'f') delete S.d.cycMode; save(); render(); }
function setCyc(k, v){ S.d[k] = v; if (S.p && S.step === 0) { S.p[k] = v; replanCyc(); } cycMsg = ''; save(); render(); }
function sexUi(d, light){
  const f = d.sex === 'f';
  return `<div><p class="mb-2 ${esc(light ? 'text-sm' : 'font-semibold')}" style="${esc(light ? 'color:var(--mute)' : '')}">${light ? 'Geschlecht (optional)' : 'Geschlecht'}</p><div class="flex flex-wrap gap-2">${chip('Frau', f, "setSex('f')")}${chip('Mann', d.sex === 'm', "setSex('m')")}${chip('Keine Angabe', !d.sex || d.sex === 'x', "setSex('x')")}</div>
    <p class="mt-1 text-xs" style="color:var(--mute)">Damit ordnet die App deine Leistung passend ein und gibt passende Hinweise zu Ernährung und Erholung. Der Grundaufbau des Plans ist für alle gleich, bei Frauen kann er sich zusätzlich nach dem Zyklus richten.</p>
    ${f && !light ? `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="text-sm font-semibold">Zyklus berücksichtigen? (optional)</p>
      <div class="mt-2 flex flex-wrap gap-2">${chip('Ja, Zyklus mitführen', d.cycMode === 'track', "setCyc('cycMode','track')")}${chip('Hormonelle Verhütung', d.cycMode === 'hc', "setCyc('cycMode','hc')")}${chip('Nein / unregelmäßig / Wechseljahre', !d.cycMode || d.cycMode === 'off', "setCyc('cycMode','off')")}</div>
      ${d.cycMode === 'track' ? `<div class="mt-3 grid grid-cols-2 items-end gap-3">${field('Erster Tag der letzten Periode', `<input type="date" class="inp" max="${iso(0)}" value="${esc(d.cycLast || '')}" onchange="setCyc('cycLast',this.value)">`)}${field('Zykluslänge (Tage)', `<input type="number" inputmode="numeric" min="21" max="40" class="inp" value="${esc(d.cycLen || 28)}" onchange="setCyc('cycLen',Number(this.value)||28)">`)}</div>${cycSymUi(d)}${cycOn(d) ? (() => { const c = cycInfo(d, iso(0)), m = mondayOf(iso(0)); return `<div class="mt-3 flex items-center gap-3">${cycRing(c, 56)}<div class="min-w-0 flex-1"><p class="text-sm">Heute: <b>Zyklustag ${c.day}</b>, <span class="cyc-pill" style="background:${esc(c.col)}">${c.label}</span></p><div class="cyc-w mt-2">${[0, 1, 2, 3, 4, 5, 6].map(i => { const x = new Date(m + 'T12:00:00'); x.setDate(x.getDate() + i); return cycCell(d, lstr(x), null, SD[i]); }).join('')}</div></div></div>`; })() : ''}` : ''}
      <p class="mt-2 text-xs" style="color:var(--mute)">${d.cycMode === 'track' ? 'Mit Anpassung legt die App harte Intervalle, die in deine Beschwerdetage fallen, auf einen anderen passenden Tag derselben Woche. Umfang und Wochenaufbau bleiben gleich, Long Rides und Events verschiebt sie nie. Sie richtet sich nach deinen Angaben statt nach starren Phasen, weil der Zyklus die Leistung im Schnitt nur wenig, aber von Frau zu Frau sehr unterschiedlich beeinflusst.' : 'Mit Zyklus zeigt die App deine Zyklustage und kann harte Einheiten aus deinen Beschwerdetagen auf andere Tage legen.'} Die Angaben bleiben nur auf deinem Gerät.</p></div>` : ''}</div>`;
}
const lvlF = p => sexF(p) ? .87 : 1;
function cycHero(p, x, i, cur){
  const c = cycInfo(p, dstr(i)); if (!c) return '';
  const hard = HARD.includes(x.t), sens = cycSens(p, c), mv = x.cycMoved || {};
  const msg = mv.from !== undefined ? `Wegen deines Zyklus vom ${DAYS[mv.from]} hierher gelegt.` : mv.to !== undefined ? `Die harte Einheit liegt diese Woche am ${DAYS[mv.to]}, hier bleibt es locker.` : sens ? (hard ? 'Fällt in deine Beschwerdetage. Fühlst du dich schlapp, fahr locker, das ist kein Rückschritt.' : 'Hör heute besonders auf deinen Körper.') : c.ph === 'foll' ? 'Viele fühlen sich jetzt frisch: gute Tage für harte Einheiten.' : c.ph === 'lut' ? 'Etwas mehr trinken, die Körpertemperatur ist leicht erhöht.' : '';
  return `<div class="hrow mt-2" style="align-items:center">${cycRing(c, 40, true)}<div><p class="hrm">Zyklustag ${c.day} <span class="cyc-pill ml-1" style="background:${esc(c.col)}">${c.label}</span></p>${msg ? `<p class="hrs">${msg}</p>` : ''}${sens && hard && cur && !x.adapted ? `<button class="hbtn hbtn2 mt-2" onclick="easyDay(${ja(i)})">Heute locker statt hart</button>` : ''}</div></div>`;
}
function evCycNote(p){
  if (p.goal !== 'event') return '';
  const c = cycOn(p) ? cycInfo(p, p.eventDate) : null;
  const gen = sexF(p) ? `<p>Für Frauen gilt: Leistung schwankt über den Zyklus im Schnitt nur wenig, das Befinden aber oft deutlich. Darum lohnt es sich, ein paar Dinge vorzubereiten.</p>` : '';
  if (!sexF(p)) return '';
  return `<section class="panel p-4"><h2 class="hd text-xl font-semibold">Zyklus und Eventtag</h2><div class="mt-2 space-y-2 text-sm">${c ? `<p><b>Am Eventtag (${fmt(p.eventDate)}) bist du voraussichtlich an Zyklustag ${c.day}: ${c.label}.</b> Das ist eine Schätzung aus deiner letzten Periode und der Zykluslänge.${cycSens(p, c) ? ' Das fällt voraussichtlich in deine Beschwerdetage: In der Woche davor legt die App keine zusätzliche Belastung auf diese Tage, und der Verpflegungs- und Packplan unten hilft dir bei der Vorbereitung.' : ''}</p>` : ''}${gen}
    <ul class="list-disc space-y-1 pl-5"><li>Hygieneartikel und bei Bedarf Schmerzmittel einplanen, die du kennst und die ärztlich abgestimmt sind.</li><li>Bei Periode am Renntag: dunkle Hose, Wechselzeitpunkt an einer Verpflegungsstelle einplanen.</li><li>In der Lutealphase ist die Körpertemperatur leicht erhöht: etwas mehr trinken, bei Hitze mehr Salz.</li><li>Wenn du hormonell verhütest und den Zeitpunkt beeinflussen möchtest, sprich rechtzeitig mit deiner Frauenärztin oder deinem Frauenarzt.</li></ul></div></section>`;
}
/* Bearbeiten: Hat sich etwas geändert? 'new' = neuer Plan, 'same' = nichts geändert, 'adj' = angepasst, 'goal' = anderes Ziel oder Event */
const SIGK = ['goal','evId','eventName','eventDate','endDate','targetTime','ftp','ftpTarget','weight','perDay','avail','commuter','commute','commuteMin','longDay','strN','strDays','strLvl','mobN','dist','hm','draft','fmt','ffocus','ftour','subs','sex','cycMode','cycLast','cycLen','cycSym','cycAdapt','lev','intF','longPri','startH','longMin'];
function planSig(d){
  const o = {};
  SIGK.forEach(k => { let v = d[k];
    if (['perDay', 'commuter', 'intF', 'longPri'].includes(k)) v = !!v; else if (k === 'cycAdapt') v = v !== false;
    else if (v && typeof v === 'object' && !Array.isArray(v)) v = Object.keys(v).some(x => v[x]) ? Object.fromEntries(Object.keys(v).filter(x => v[x]).sort().map(x => [x, v[x]])) : null;
    else if (Array.isArray(v) && !v.length) v = null;
    else if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) v = Number(v);
    if (v === undefined || v === '') v = null; o[k] = v; });
  if (!o.commuter) o.commute = null; if (o.sex !== 'f') { o.cycMode = o.cycLast = o.cycLen = o.cycSym = null; o.cycAdapt = true; }
  o.hours = Math.round((d.perDay ? dsum(d) / 60 : Number(d.hours) || 0) * 60);
  o.dayMin = d.perDay ? d.dayMin.map((m, i) => d.avail[i] ? Number(m) || 0 : 0) : null;
  o.start = d.startDate && d.startDate > iso(0) ? d.startDate : null;
  o.course = d.course && d.course.seg ? d.course.hm + ':' + d.course.seg.length + ':' + (d.course.laps || 1) : null;
  return JSON.stringify(o);
}
function editState(){
  if (!(S.edit && S.p)) return 'new';
  if (S.d.goal !== S.p.goal || (S.d.goal === 'event' && ((S.d.evId || '') !== (S.p.evId || '') || (!S.d.evId && S.d.eventName !== S.p.eventName)))) return 'goal';
  return planSig(S.d) === planSig(S.p) ? 'same' : 'adj';
}
function finalBtn(fn){
  const st = editState();
  if (st === 'same') return `<button class="btn flex-1" onclick="cancelEdit()">Unverändert zum Plan zurück</button>`;
  return `<button class="btn flex-1" onclick="${ja(fn)}()">${st === 'adj' ? 'Änderungen übernehmen' : st === 'goal' ? 'Neuen Plan erstellen' : 'Plan erstellen'}</button>`;
}
const finalHint = () => ({same:'Du hast nichts geändert. Dein Plan bleibt, wie er ist.', adj:'Dein Plan wird mit deinen Änderungen neu berechnet.' + (S.p && hasStarted(S.p) ? ' Dein bisheriger Fortschritt bleibt erhalten.' : ''), goal:'Neues Ziel: Daraus entsteht ein neuer Plan, der deinen bisherigen ersetzt. Willst du beide behalten, lege den neuen stattdessen unter „Meine Pläne“ an.'})[editState()] || '';
function onboarding(){
  { const mx = S.d.goal === 'event' ? 7 : 6; if (S.step > mx) S.step = mx; }
  const d = S.d, s = S.step, ev = d.goal === 'event', dk = ev ? 'eventDate' : 'endDate';
  const sdy = d.startDate && d.startDate > iso(0) ? d.startDate : iso(0), wks = Math.max(0, Math.ceil((new Date(d[dk]) - new Date(sdy)) / 6048e5)), canStart = !(S.edit && S.p && hasStarted(S.p));
  const goals = [
    ['event','Event-Ziel','Ein bestimmtes Rennen oder Marathon, z. B. Ötztaler unter 8 Std.','<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" style="color:var(--teal);flex:none"><path d="M3 23 11 8l5 8 3-5 6 12z"/></svg>'],
    ['ftp','Leistungs-Ziel','Mehr Watt: den FTP-Wert gezielt steigern.','<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" style="color:var(--teal);flex:none"><path d="M16 3 7 16h7l-2 9 9-13h-7z"/></svg>'],
    ['fitness','Fitness-Ziel','Aerobe Ausdauer und Grundfitness verbessern.','<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" style="color:var(--teal);flex:none"><path d="M2 15h6l3-8 5 15 3-7h7"/></svg>']];
  const back = n => `<button class="ghost" onclick="nav(${ja(n)})">Zurück</button>`;
  const stepN = d.goal === 'event' ? ['Ziel', 'Stand', 'Alltag', 'Event', 'Zielzeit', 'Start', 'Plan-Check'] : ['Ziel', 'Stand', 'Alltag', 'Zeitraum', 'Start', 'Plan-Check'];
  let body = '';
  if (!d.mode && !S.edit && s <= 1) body = modePage(d); else if (d.mode === 'light' && s >= 1 && !S.only) body = lightPage(d); else {
  if (s === 1) body = `${modeBar(d)}<h2 class="hd text-3xl font-semibold">Was ist dein Ziel?</h2><p class="mb-4 mt-1" style="color:var(--mute)">Daraus baut die App deinen Plan bis zum Zieltermin.</p>
    <div class="space-y-3">${goals.map(g => `<button onclick="pick('${ja(g[0])}')" class="panel flex w-full items-start gap-3 p-4 text-left" style="${esc(d.goal===g[0]?'border-color:var(--ice);background:#e6f7f6':'')}"><span>${g[3]}</span><span><span class="hd block text-xl font-semibold">${g[1]}</span><span class="text-sm" style="color:var(--mute)">${g[2]}</span></span></button>`).join('')}</div>
    ${S.edit && S.p ? (d.goal === S.p.goal ? `<div class="mt-4 p-3 text-sm" style="background:#e6f7f6;border:1px solid var(--ice)">Das ist das Ziel deines bestehenden Plans <b>${esc(S.pname || planName(S.p))}</b>. Du kannst ihn weiter anpassen oder unverändert zurückkehren.<br><button class="ghost mt-2 !py-1.5 text-sm" onclick="cancelEdit()">Zum bestehenden Plan zurück</button></div>` : `<div class="mt-4 p-3 text-sm" style="background:#fff6dc;border:1px solid #d9a400">Du wechselst das Ziel. Dein bestehender Plan bleibt erhalten, bis du am Ende „Neuen Plan erstellen“ tippst.<br><button class="ghost mt-2 !py-1.5 text-sm" onclick="cancelEdit()">Abbrechen und zum bestehenden Plan zurück</button></div>`) : ''}
    <div class="mt-6 flex gap-3">${S.edit ? '<button class="ghost" onclick="cancelEdit()">Abbrechen</button>' : S.newFrom ? '<button class="ghost" onclick="cancelNew()">Abbrechen</button>' : ''}<button class="btn flex-1" onclick="nav(2)">Weiter</button></div>`;
  /* Planung ab Schritt 4, aufgeteilt: Event → Zielzeit → Start und Zwischenevents → Plan-Check (FTP/Fitness: Zeitraum und Ziel → Start → Plan-Check) */
  const N = ev ? 7 : 6, nextB = (n, l) => `<div class="mt-6 flex gap-3">${back(n - 1)}<button class="btn flex-1" onclick="nav(${ja(n + 1)})">${l || 'Weiter'}</button></div>`;
  const head = (t, sub) => `<h2 class="hd text-3xl font-semibold">${t}</h2>${sub ? `<p class="mb-1 mt-1" style="color:var(--mute)">${sub}</p>` : ''}`;
  const date = s >= 4 ? (ev && d.evId && !d.evDateEst ? field('Eventdatum', `<input type="date" class="inp" min="${iso(14)}" value="${esc(d[dk])}" onchange="draft('${ja(dk)}',this.value);render()">`) : dateChips(d, dk, ev ? 'Eventdatum: genau oder ungefähr' : 'Bis wann willst du dein Ziel erreichen?')) : '';
  const wkInfo = `<p class="text-sm" style="color:${esc(wks < 4 ? '#9a6a00' : 'var(--mute)')}">${wks} Wochen Trainingszeit${wks < 4 ? ': sehr kurz, der Plan wird stark gestrafft.' : '. Daraus entstehen Basis-, Aufbau-, Spitzen- und Entlastungsphase.'}</p>`;
  const sec = (t, inner) => `<section class="panel p-4"><p class="eyebrow mb-3">${t}</p><div class="space-y-4">${inner}</div></section>`;
  if (ev && s === 4) body = `${head(seasonOn(d) ? 'Deine Saison' : 'Dein Event', seasonOn(d) ? 'Zuerst dein Saisonhöhepunkt, darunter alle Rennen davor.' : 'Welches Event, wann, wie lang und wie steil?')}<div class="mt-4 space-y-4">
      ${seasonModeUi(d)}
      ${sec(seasonOn(d) ? 'Saisonhöhepunkt: dein letztes A-Event' : 'Event', evPick(d) + field('Name des Events', `<input class="inp" placeholder="z. B. Mein Radmarathon" value="${esc(d.eventName)}" oninput="draft('eventName',this.value)">`) + date)}
      ${sec('Strecke', `<div class="grid grid-cols-2 gap-3">${field('Distanz (km)', `<input type="number" inputmode="decimal" class="inp" value="${esc(d.dist)}" oninput="draft('dist',this.value)">`)}${field('Höhenmeter (hm)', `<input type="number" inputmode="numeric" class="inp" value="${esc(d.hm)}" oninput="draft('hm',this.value)">`)}</div>${coursePick(d)}`)}
      ${sec('Art des Events', fmtChips(d))}
      ${evProfCard(d, true)}${seasonOn(d) ? subsUi(d) : ''}</div>${nextB(4)}`;
  if (ev && s === 5) body = `${head('Deine Zielzeit', `${d.eventName ? '<span data-noi18n>' + esc(d.eventName) + '</span>' : 'Dein Event'}${/km/.test(d.eventName || '') || !(d.dist > 0) ? '' : ', ' + f1(d.dist) + ' km'}${d.hm ? ', ' + Number(d.hm).toLocaleString('de-DE') + ' hm' : ''}.${d.dist > 0 ? '' : ' Trag in Schritt 4 Distanz und Höhenmeter ein, dann schlägt die App eine realistische Zielzeit vor.'} Mit deinem Stand und deiner Zeit schlägt die App ein realistisches Ziel vor.`)}<div class="mt-4 space-y-4">
      ${sec('Ziel', `<div class="grid grid-cols-2 gap-3">${field('Zielzeit (Std:Min)', `<input id="tt" class="inp" value="${esc(d.targetTime)}" oninput="setTT(this.value)">`)}${field('oder Ø km/h', `<input id="ts" type="text" inputmode="decimal" class="inp" value="${esc(spdOf(d) ? f1(spdOf(d)) : '')}" oninput="setSpeed(this.value)">`)}</div>
        <p class="text-xs" style="color:var(--mute)">Beide Felder hängen zusammen: Gibst du eine Geschwindigkeit ein, rechnet die App die Zielzeit aus der Distanz aus und umgekehrt. Die Geschwindigkeit ist reine Fahrzeit ohne Pausen.</p><div id="tsug">${tgtSugHtml(d)}</div>`)}
      ${sec('Fahrweise', draftChips(d))}
      <div id="evc">${evHtml(d)}</div></div>${nextB(5)}`;
  if (ev && s === 6) body = `${head('Start', 'Wann soll dein Plan losgehen?')}<div class="mt-4 space-y-4">
      ${canStart ? `<div class="panel p-4">${startUi(d)}</div>` : wkInfo}</div>${nextB(6)}`;
  if (!ev && s === 4) body = `${head(d.goal === 'ftp' ? 'Zeitraum und Ziel-FTP' : 'Zeitraum und Ziel', 'Bis wann willst du dein Ziel erreichen?')}<div class="mt-4 space-y-4">
      ${sec('Zieltermin', date)}${d.goal === 'ftp' ? sec('Ziel-FTP', ftpTgtUi(d)) : `<section class="panel p-4">${fitFocusUi(d)}</section>`}</div>${nextB(4)}`;
  if (!ev && s === 5) body = `${head('Start', 'Wann soll dein Plan losgehen?')}<div class="mt-4 space-y-4">${canStart ? `<div class="panel p-4">${startUi(d)}</div>` : wkInfo}</div>${nextB(5)}`;
  if (s === N) body = `${head('Plan-Check', 'Zum Schluss prüft die App, ob dein Plan zu deinem Ziel passt. Vorschläge kannst du direkt übernehmen.')}
      <div class="mt-4">${checkCard(mkPrev(d), 'draft')}</div>
      ${finalHint() ? `<p class="mt-6 text-sm" style="color:var(--mute)">${finalHint()}</p>` : ''}<div class="mt-3 flex gap-3">${back(N - 1)}${finalBtn('finish')}</div>`;
  if (s === 2) body = `<h2 class="hd text-3xl font-semibold">Dein aktueller Stand</h2><p class="mb-1 mt-1" style="color:var(--mute)">Von hier aus rechnet die App: Leistung und Gewicht bestimmen, was am Eventtag realistisch ist.</p><div class="mt-4 space-y-4">
      <div class="grid grid-cols-2 gap-3">${field('Körpergewicht (kg)',`<input type="number" inputmode="decimal" class="inp" value="${esc(d.weight)}" oninput="draft('weight',this.value)">`)}</div>
      ${ftpSrcUi(d)}
      ${sexUi(d)}</div>
      <div class="mt-6 flex gap-3">${back(1)}<button class="btn flex-1" onclick="nav(3)">Weiter</button></div>`;
  if (s === 3) {
    const nC = d.commuter ? d.commute.filter((c, i) => c && d.avail[i]).length : 0, leg = comLeg(d);
    const rows = SD.map((x, i) => !d.avail[i] ? '' : comOn(d, i)
      ? `<div class="flex flex-wrap items-center gap-2"><span class="w-8 font-semibold">${x}</span><span class="comfix">Pendeln ${2 * leg}</span><span aria-hidden="true">+</span><input type="number" inputmode="numeric" step="15" min="0" class="inp" style="width:4.5rem;padding:.55rem .6rem" value="${Math.max(0, (d.dayMin[i] || 0) - 2 * leg)}" oninput="setComX(${ja(i)},this.value)" aria-label="Zusätzliche Trainingsminuten am ${esc(DAYS[i])}"><span class="text-sm" style="color:var(--mute)">extra = <b id="dt${esc(i)}" style="color:var(--ink)">${mm(d.dayMin[i] || 0)}</b></span></div>`
      : `<div class="flex items-center gap-3"><span class="w-8 font-semibold">${x}</span><input type="number" inputmode="numeric" step="15" min="0" class="inp" value="${esc(d.dayMin[i])}" oninput="setDayMin(${ja(i)},this.value)" aria-label="Minuten am ${esc(DAYS[i])}"><span class="text-sm" style="color:var(--mute)">Min.</span></div>`).join('');
    const comQ = `<div><p class="mb-2 font-semibold">Fährst du mit dem Rad zur Arbeit?</p><div class="flex gap-2">${chip('Ja', d.commuter, 'setCommuter(true)')}${chip('Nein', !d.commuter, 'setCommuter(false)')}</div>
        ${d.commuter ? `<p class="mb-2 mt-3 text-sm" style="color:var(--mute)">An welchen Tagen?</p><div class="flex flex-wrap gap-2">${SD.map((x, i) => chip(x, d.commute[i], `tgl('commute',${ja(i)})`)).join('')}</div>
          <div class="mt-3">${field('Dauer einfache Strecke (Min.)', `<input type="number" inputmode="numeric" class="inp" value="${esc(leg)}" onchange="setComMin(this.value)">`)}</div>
          <p class="mt-2 text-sm" style="color:var(--mute)">${nC ? `An ${nC === 1 ? 'deinem Pendeltag' : 'deinen ' + nC + ' Pendeltagen'} bist du mindestens ${2 * leg} Min. auf dem Rad (Hin- und Rückweg à ${leg} Min.), zusammen ${mm(nC * 2 * leg)} pro Woche. ` : 'Wähle die Tage, an denen du mit dem Rad zur Arbeit fährst. '}Der Arbeitsweg zählt zum Trainingsumfang und wird locker gefahren. Steht an einem Pendeltag eine harte Einheit an, fährst du die Intervalle am Stück auf dem Hinweg, der Rückweg bleibt locker. Bei kurzen Wegen (unter 45 Min.) legt der Plan Intervalle möglichst auf Tage ohne Pendeln.</p>` : ''}</div>`;
    const timeQ = `<div><p class="mb-2 font-semibold">Wie viel Zeit hast du?</p>
        ${d.perDay ? `<div class="space-y-2">${rows}</div><p class="mt-2 text-sm" style="color:var(--mute)">Insgesamt: <b id="dtot">${dayTotal(d)}</b>. Die Wochenzeit ist immer genau die Summe deiner Tage. Keine Einheit wird länger als die Zeit des Tages.${nC ? ` An Pendeltagen ist der Arbeitsweg (${2 * leg} Min.) automatisch eingerechnet. Trag dort nur ein, wie viel du zusätzlich fahren kannst, etwa für Intervalle auf dem Hinweg oder einen Umweg auf dem Heimweg.` : ''}</p>${d.dayMin[d.longDay] < 90 ? '<p class="mt-1 text-sm" style="color:#9a6a00">Tipp: Gib deinem Long-Ride-Tag mindestens 90 Min., dann wird daraus ein echter Long Ride.</p>' : ''}`
          : field('Trainingsstunden pro Woche' + (nC ? ' (inklusive Arbeitsweg)' : ''), `<input type="number" inputmode="decimal" step="0.25" class="inp" value="${esc(d.hours)}" oninput="draft('hours',this.value)" onchange="render()">`) + `<p class="mt-1 text-sm" style="color:var(--mute)">${nC ? `Davon sind ${mm(comSum(d))} dein Arbeitsweg. Der Rest verteilt sich auf deine Trainingstage, der Long Ride bekommt den größten Anteil.` : `Die App verteilt die Zeit auf deine ${d.avail.filter(Boolean).length} Trainingstage, der Long Ride bekommt den größten Anteil.`} Willst du für einzelne Tage eine Obergrenze setzen, wähle „Zeit pro Tag festlegen“.</p>${comSum(d) > (Number(d.hours) || 0) * 60 ? `<p class="mt-1 text-sm" style="color:#9a6a00">⚠ Deine Pendelfahrten allein dauern ${mm(comSum(d))} pro Woche, mehr als die angegebenen ${hStd(Number(d.hours) || 0)} Std. Die App rechnet deshalb mit mindestens ${hm2(comSum(d))} Std. <button class="underline" onclick="draft('hours',${ja(comSum(d) / 60)});render()">Wert übernehmen</button></p>` : ''}`}
        <div class="mt-3">${chip('Zeit pro Tag festlegen', d.perDay, 'togglePerDay()')}</div>${weekPrev(d)}</div>`;
    body = `<h2 class="hd text-3xl font-semibold">Dein Alltag</h2><p class="mb-4 mt-1" style="color:var(--mute)">Der Plan richtet sich nach deiner Woche, nicht umgekehrt.</p><div class="space-y-6">
      <div><p class="mb-2 font-semibold">An welchen Tagen kannst du trainieren?</p><div class="flex flex-wrap gap-2">${SD.map((x,i) => chip(x, d.avail[i], `tgl('avail',${ja(i)})`)).join('')}</div></div>
      ${comQ}
      ${timeQ}
      ${d.mode === 'light' ? '' : tbCard()}
      <div><p class="mb-2 font-semibold">Welcher Tag ist dein Long-Ride-Tag?</p><div class="flex flex-wrap gap-2">${SD.map((x,i) => chip(x, d.longDay === i, `setLong(${ja(i)})`)).join('')}</div>${comOn(d, d.longDay) ? '<p class="mt-2 text-sm" style="color:var(--mute)">Dein Long-Ride-Tag ist ein Pendeltag. Der Long Ride wird dann auf Hin- und Rückweg aufgeteilt. Am Stück geht es meist besser an einem freien Tag.</p>' : ''}</div>
      ${strUi(d)}
      ${mobUi(d)}</div>
      ${S.only ? `<div class="mt-6 flex gap-3"><button class="ghost" onclick="onlyCancel()">Abbrechen</button><button class="btn flex-1" onclick="onlyApply()">Änderungen übernehmen</button></div>` : `<div class="mt-6 flex gap-3">${back(2)}<button class="btn flex-1" onclick="nav(4)">Weiter</button></div>`}`;
  }
  }
  return `<div><div class="brand mb-6 flex items-center gap-2"><span class="hd text-2xl" style="color:#fff">Relentless<span style="color:var(--ice)">.</span></span><span aria-hidden="true" style="width:1px;height:20px;background:rgba(255,255,255,.35);margin:0 2px 0 4px"></span><img src="data:image/png;base64,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" alt="T2R – Team Relentless Riders" title="Team Relentless Riders" style="height:20px;width:auto;display:block">${langBtn(true)}</div>
    <div class="mb-2 flex items-center gap-3" style="margin-top:.75rem"><p class="flex-1 text-sm font-semibold" style="color:var(--mute)">${S.only ? (S.only === 3 ? 'Alltag' : S.only === 4 && ev ? 'Event' : stepN[S.only - 1] || 'Plan') + ' anpassen · der Rest deines Plans bleibt' : !d.mode && !S.edit && s <= 1 ? 'Neuer Plan · Planungsart wählen' : d.mode === 'light' ? 'Schnellplanung · Schritt ' + Math.min(4, Math.max(1, s)) + ' von 4 · ' + ['Ziel', 'Stand', 'Zeit', 'Start'][Math.min(4, Math.max(1, s)) - 1] : 'Schritt ' + s + ' von ' + stepN.length + ' · ' + stepN[s - 1]}</p>${S.edit && S.p ? '<button class="ghost !px-3 !py-1.5 text-sm" onclick="' + (S.only ? 'onlyCancel()' : 'cancelEdit()') + '">Abbrechen</button>' : S.newFrom ? '<button class="ghost !px-3 !py-1.5 text-sm" onclick="cancelNew()">Abbrechen</button>' : ''}</div><div class="mb-6 h-1.5 overflow-hidden rounded-full" style="background:var(--line)"><div class="h-full rounded-full" style="width:${esc(!d.mode && !S.edit && s <= 1 ? 0 : d.mode === 'light' ? Math.min(4, Math.max(1, s)) * 25 : Math.round(s / stepN.length * 100))}%;background:var(--ice)"></div></div>${body}</div>`;
}

