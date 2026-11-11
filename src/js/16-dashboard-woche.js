/* ---------- Dashboard ---------- */
function goalCard(full = true){
  const p = S.p, kg = kgOf(p);
  if (p.goal === 'event') {
    const days = Math.max(0, Math.round((new Date(p.eventDate + 'T12:00:00') - new Date(lstr(new Date()) + 'T12:00:00')) / 864e5));
    const ph = phases(p).find(x => S.wk >= x.from && S.wk <= x.to).name + '-Phase';
    return `${full ? `<h2 class="hd text-2xl font-semibold">${p.eventName ? '<span data-noi18n>' + esc(p.eventName) + '</span>' : 'Dein Event'}</h2><p class="mt-1 text-sm" style="color:var(--mute)">${fmt(p.eventDate)} · noch ${days} Tage</p>` : `<div class="flex items-end gap-3"><span class="hd text-5xl font-bold leading-none">${days}</span><span class="pb-0.5 text-sm leading-tight" style="color:var(--mute)">Tage bis<br><b class="text-base" style="color:var(--ink)">${p.eventName ? '<span data-noi18n>' + esc(p.eventName) + '</span>' : 'zum Event'}</b></span></div>`}${p.evDateEst ? `<p class="mt-2 text-sm" style="color:#9a6a00">⚠ Eventdatum ${fmt(p.eventDate)} ist vorläufig (Vorjahrestermin bzw. bekanntes Eventwochenende, noch nicht offiziell bestätigt). Trag ihn ein, sobald er feststeht.</p><button class="ghost mt-2 !py-1.5 text-sm" onclick="editOnly(4)">Termin ändern</button>` : ''}
      <p class="mt-2 text-sm" style="color:var(--mute)">${p.targetTime ? `Ziel: unter ${esc(p.targetTime)} Std.${spdOf(p) ? ' (Ø ' + f1(spdOf(p)) + ' km/h)' : ''}` : 'Ziel: gut vorbereitet ins Ziel kommen'} · aktuell ${ph} · ${p.ftp} W, ${f1(p.ftp / kg)} W/kg</p>${full ? `<div class="mt-3">${evHtml(p)}</div>` : ''}`;
  }
  if (p.goal === 'ftp') {
    const pr = Math.min(100, Math.max(0, 100 * (p.ftp - 150) / Math.max(1, p.ftpTarget - 150)));
    return `<div class="hd text-5xl font-bold leading-none">${p.ftp}<span class="mx-2 text-xl font-medium" style="color:var(--mute)">W →</span>${p.ftpTarget}<span class="ml-1 text-xl font-medium" style="color:var(--mute)">W</span></div>
      <div class="mt-3 h-2 overflow-hidden rounded-full" style="background:var(--line)"><div class="h-full rounded-full" style="width:${esc(pr)}%;background:var(--ice)"></div></div>
      <p class="mt-2 text-sm" style="color:var(--mute)">Ziel-FTP · ${f1(p.ftp / kg)} → ${f1(p.ftpTarget / kg)} W/kg bei ${f1(kg)} kg</p>`;
  }
  return `<div class="hd text-5xl font-bold leading-none">${hStd(p.hours)}<span class="ml-2 text-xl font-medium" style="color:var(--mute)">Std. pro Woche, überwiegend Zone 2</span></div>
    <p class="mt-2 text-sm" style="color:var(--mute)">${fitGoalText(p)} · FTP ${p.ftp} W, ${f1(p.ftp / kg)} W/kg</p>`;
}
function logCardV1(){
  if (!S.log.length) return '';
  return fold('log', 'Anpassungen der App (' + S.log.length + ')', '<div class="space-y-3">' + S.log.map(l => `<div class="rounded-2xl p-4" style="background:#e3f6f0;border:1px solid #0a8f6a"><div class="mb-1 flex items-center gap-2"><span class="rounded-full px-2 py-0.5 text-xs font-semibold" style="background:#34d399;color:#04231a">${l.user ? 'Deine Anpassung' : 'KI-Logik'}</span><h3 class="hd text-xl font-semibold">${l.title}</h3></div><p class="text-sm leading-relaxed" style="color:#064e3b">${l.text}</p></div>`).join('') + '</div>', false);
}
/* ---------- Anpassungen innerhalb der Woche ---------- */
const freeDay = j => S.plan[j].t === 'rest' && !S.plan[j].blocked && !S.blocked[j];
const bdg = x => [x.blocked && 'gesperrt', x.moved && 'verschoben', x.cut && 'gekürzt'].filter(Boolean).map(t => `<b class="rounded-full px-2 text-xs" style="background:#ffd45c;color:#3b2a00">${t}</b>`).join('');
const unsplit = x => { if (!x.parts) return {...x}; const u = {...(x.unsplit || x)}; delete u.parts; delete u.unsplit; return u; };
const note = (title, text, d) => { S.log.unshift({user:1, title, text, day:-2, d}); if (S.log.length > 20) S.log.length = 20; };
function target(i){
  const x = S.plan[i], t = todayIdx(), key = ['long','sst','thr','vo2'].includes(x.t), nk = j => j !== i && ['long','sst','thr','vo2'].includes(S.plan[j]?.t);
  const c = [0,1,2,3,4,5,6].filter(j => j >= t && j !== i && freeDay(j)), good = c.filter(j => !key || (!nk(j-1) && !nk(j+1)));
  return (good.length ? good : c).sort((a, b) => Math.abs(a - i) - Math.abs(b - i))[0];
}
function blockDay(i){
  S.blocked[i] = true; const x = S.plan[i];
  S.plan[i] = {...REST, n:'Tag gesperrt', st:'Du hast diesen Tag für diese Woche gesperrt.', tip:'Du kannst ihn jederzeit wieder freigeben.', blocked:true, held: x.m > 0 ? x : null};
  if (x.t === 'com') note(`${DAYS[i]} gesperrt`, `Das Pendeln am ${DAYS[i]} entfällt, weil der Tag gesperrt ist.`, i);
  else if (x.m > 0) {
    const j = target(i);
    if (j !== undefined) { S.plan[j] = {...unsplit(x), moved:true, from:i}; note(`${DAYS[i]} gesperrt`, `„${x.n}“ wurde von ${DAYS[i]} auf ${DAYS[j]} verschoben. Der Plan achtet dabei darauf, harte Einheiten nicht direkt hintereinander zu legen.`, i); }
    else note(`${DAYS[i]} gesperrt`, `Für „${x.n}“ gibt es diese Woche keinen freien Tag mehr, die Einheit entfällt. Kein Problem: Eine einzelne Einheit fällt im Gesamtplan kaum ins Gewicht, nachholen ist nicht nötig.`, i);
  }
}
function unblockDay(i){
  delete S.blocked[i]; const j = S.plan.findIndex(y => y.moved && y.from === i);
  if (j >= 0 && S.plan[i].blocked) { const y = {...S.plan[j]}; delete y.moved; delete y.from; S.plan[i] = S.plan[i].held ? {...S.plan[i].held} : y; S.plan[j] = {...REST}; } else S.plan[i] = S.plan[i].held ? {...S.plan[i].held} : {...REST};
  S.log = S.log.filter(l => !(l.user && l.d === i));
}
function toggleBlock(i){ S.blocked[i] ? unblockDay(i) : blockDay(i); save(); render(); }
function moveDay(i, j){
  j = parseInt(j); if (isNaN(j)) return; const x = S.plan[i];
  S.plan[j] = {...unsplit(x), moved:true, from:i}; S.plan[i] = {...REST};
  note(`${DAYS[i]} verschoben`, `„${x.n}“ wurde von ${DAYS[i]} auf ${DAYS[j]} verschoben.`, -1); save(); render();
}
function cutDay(i){
  const x = S.plan[i], h = HARD.includes(x.t), m = Math.max(h ? 45 : 30, Math.round(x.m * .7 / 5) * 5);
  S.plan[i] = {...x, m, cut:true, st: x.st + (h ? ' Kürzung: nur Einfahren und Ausfahren verkürzen, die Intervalle bleiben.' : ' Auf die gekürzte Dauer angepasst.')};
  note(`${DAYS[i]} gekürzt`, `„${x.n}“ wurde von ${mm(x.m)} auf ${mm(m)} gekürzt. Nachholen ist nicht nötig, lieber frisch weitertrainieren als Umfang stapeln.`, -1); save(); render();
}
function resetWeek(){ S.blocked = {}; S.plan = genWeek(S.p, S.wk); S.log = []; S.note = ''; save(); render(); }
const ctl = (x, i, cur) => ctl0(x, i, cur) + feelCtl(x, i, cur);
const ctl0 = (x, i, cur) => {
  if (!cur) return woCtl(x, i);
  if (i < todayIdx()) return '';
  const b = (fn, l) => `<button onclick="${fn}" class="ghost !py-2 text-sm">${l}</button>`;
  if (x.blocked) return b(`toggleBlock(${ja(i)})`, 'Tag wieder freigeben');
  if (x.t === 'com' || (x.parts && !S.done[i])) return b(`toggleCom(${ja(i)})`, 'Heute nicht pendeln') + b(`toggleBlock(${ja(i)})`, 'Tag nicht möglich');
  if (x.noCom && x.orig && !S.done[i]) return b(`toggleCom(${ja(i)})`, 'Doch pendeln') + b(`cutDay(${ja(i)})`, 'Kürzen (−30 %)') + b(`toggleBlock(${ja(i)})`, 'Tag nicht möglich');
  if (!x.m) return x.feel === 'sick' ? '' : b(`toggleBlock(${ja(i)})`, 'Tag sperren');
  if (S.done[i]) return '';
  const fr = [0,1,2,3,4,5,6].filter(j => j >= todayIdx() && j !== i && freeDay(j));
  return (x.cut || x.parts ? '' : b(`cutDay(${ja(i)})`, 'Kürzen (−30 %)')) + (mvTargets(i).length ? b(`mvAskGo(${ja(i)})`, 'Verschieben') : '') + (vaStim(x) ? b(`vaOpen(${ja(i)})`, 'Andere Variante') : '') + b(`toggleBlock(${ja(i)})`, 'Tag nicht möglich');
};
const ovw = w => { S.ov = S.ov || {}; return S.ov[w] = S.ov[w] || {off:{}, com:{}}; };
function cleanOv(w){ const o = S.ov[w]; if (!Object.keys(o.off).length && !Object.keys(o.com).length) delete S.ov[w]; }
function toggleOff(w, i){ const o = ovw(w); if (o.off[i]) delete o.off[i]; else o.off[i] = true; cleanOv(w); save(); render(); }
function toggleComF(w, i){ const o = ovw(w), b = S.p.commute[i], nv = !(o.com[i] === undefined ? b : o.com[i]); if (nv === b) delete o.com[i]; else o.com[i] = nv; cleanOv(w); save(); render(); }
function clearOv(w){ if (S.ov) delete S.ov[w]; save(); render(); }
function toggleCom(i){
  const x = S.plan[i];
  if (x.noCom && x.orig) { S.plan[i] = x.orig; note(`${DAYS[i]}: doch pendeln`, `Du fährst am ${DAYS[i]} wieder mit dem Rad zur Arbeit, wie ursprünglich geplant.`, -3); }
  else if (x.t === 'com') { S.plan[i] = {...D('base', 'Grundlage Z2', x.m, 56, 72, '90 U/min', `Statt Hin- und Rückweg eine Fahrt am Stück: ${mm(x.m)} konstant in Zone 2, Gespräch muss möglich sein.`, 'Gleicher Umfang wie das Pendeln, nur in einer Fahrt. Wenn die Zeit heute nicht reicht, nimm „Kürzen“ oder „Tag nicht möglich“.'), noCom:true, orig:x}; note(`${DAYS[i]}: kein Pendeln`, `Du pendelst am ${DAYS[i]} nicht. Die ${mm(x.m)} fährst du stattdessen am Stück als lockere Grundlage, der Wochenumfang bleibt gleich.`, -3); }
  else if (x.parts) { let u = unsplit(x); const ex = x.m - u.m; if (ex >= 10) u = u.iv ? {...u, m:x.m, iv:{...u.iv, cd:u.iv.cd + ex}, st:ivTxt(u.iv) + ` · danach ${ex} Min. locker in Zone 2 (statt des Rückwegs)`} : {...u, m:x.m, st:u.st + ` Insgesamt ${mm(x.m)}, so bleibt der Umfang des Pendelns erhalten.`}; S.plan[i] = {...u, noCom:true, orig:x}; note(`${DAYS[i]}: kein Pendeln`, `Du pendelst am ${DAYS[i]} nicht. „${u.n}“ fährst du deshalb am Stück statt auf Hin- und Rückweg verteilt, gleich lang wie geplant (${mm(u.m)}).`, -3); }
  else if (x.t === 'rest' && !x.blocked) { S.plan[i] = comSes(S.p, i); note(`${DAYS[i]}: zusätzlich pendeln`, `Du pendelst am ${DAYS[i]} außerplanmäßig mit dem Rad. Die lockere Einheit zählt zum Wochenumfang.`, -3); }
  save(); render();
}
function applyGoal(k, v){ S.p[k] = v; S.d[k] = v; if (k === 'targetTime') S.d.tgtMan = S.p.tgtMan = true; if (k === 'ftpTarget') S.d.ftpTargetManual = true; replanCyc(); save(); render(); }
const dis = x => `<span class="rounded-xl px-3.5 py-2.5 text-sm" style="opacity:.3;border:1px solid var(--line);color:var(--mute)">${x}</span>`;
const weekPanel = (w, cur) => {
  const o = (S.ov && S.ov[w]) || {off:{}, com:{}}, t = todayIdx(), p = S.p, has = !cur && S.ov && S.ov[w];
  const offRow = SD.map((x, i) => cur ? (i < t ? dis(x) : chip(x, S.blocked[i], `toggleBlock(${ja(i)})`)) : chip(x + (o.off[i] ? '*' : ''), o.off[i], `toggleOff(${ja(w)},${ja(i)})`)).join('');
  const comRow = SD.map((x, i) => {
    if (cur) { const y = S.plan[i]; return i < t || S.blocked[i] || !(y.t === 'com' || y.t === 'rest' || y.parts || y.noCom) ? dis(x) : chip(x, y.t === 'com' || !!y.parts, `toggleCom(${ja(i)})`); }
    if (o.off[i]) return dis(x);
    return chip(x + (o.com[i] !== undefined ? '*' : ''), o.com[i] === undefined ? p.commute[i] : o.com[i], `toggleComF(${ja(w)},${ja(i)})`);
  }).join('');
  const showCom = isComm(p), std = p.commute.map((v, i) => v ? SD[i] : null).filter(Boolean).join(', ') || 'keine';
  return `<div class="mb-3">${fold('wp', cur ? 'Diese Woche nicht alles machbar?' : `Woche ${w} im Voraus planen`, `
  <p class="mb-3 mt-1 text-sm" style="color:var(--mute)">${cur ? 'Sperre Tage, an denen du nicht trainieren kannst: Die Einheit rutscht auf einen freien Tag. Pendeln kannst du zusätzlich ein- oder ausschalten. Einzelne Einheiten lassen sich in der Karte kürzen oder verschieben.' : 'Trage ein, wann du in dieser Woche nicht fahren kannst oder anders pendelst als sonst. Der Plan wird sofort neu verteilt.'}</p>
  <p class="mb-1.5 text-sm font-semibold">Kein Training möglich</p><div class="mb-3 flex flex-wrap gap-2">${offRow}</div>
  ${showCom ? `<p class="mb-1.5 text-sm font-semibold">Mit dem Rad zur Arbeit</p><div class="flex flex-wrap gap-2">${comRow}</div>
  <p class="mt-2 text-xs" style="color:var(--mute)">Standard-Pendeltage: ${std}${cur ? '' : '. Ein Stern markiert Abweichungen vom Standard.'}</p>` : ''}
  ${cur ? '<button onclick="resetWeek()" class="ghost mt-3 !py-2 text-sm">Wochenplan zurücksetzen</button>' : has ? `<button onclick="clearOv(${ja(w)})" class="ghost mt-3 !py-2 text-sm">Angaben für diese Woche löschen</button>` : ''}`, false)}</div>`;
};
/* ---------- Auswirkungen auf den Gesamtplan ---------- */
function impact(){
  const p = S.p, ph = phases(p), tot = ph[ph.length-1].to, KEY = ['long','sst','thr','vo2'], sm = (a, f) => a.reduce((q, x) => q + f(x), 0);
  let rem = 0, lost = 0, lostMin = 0, W = [], keys = [], crit = false;
  for (let w = S.wk; w <= tot; w++) {
    const a = w === S.wk ? S.plan : genWeek(p, w), b = (g => w === S.wk && hasStarted(p) ? g.map((x, i) => i < todayIdx() || (i === todayIdx() && a[i] && a[i].kept) ? a[i] : x) : g)(genWeek(p, w, true)), P = ph.find(x => w >= x.from && w <= x.to);
    const bt = sm(b, tss), at = sm(a, tss), bk = b.filter(x => KEY.includes(x.t)).length, ak = a.filter(x => KEY.includes(x.t)).length;
    rem += bt;
    if (bt !== at || bk !== ak) { lost += (bt - at) * (P.key === 'peak' ? 1.5 : 1); lostMin += sm(b, x => x.m) - sm(a, x => x.m); W.push(w); if (bk > ak) { keys.push({w, c: bk - ak}); if (P.key === 'peak' || P.key === 'taper') crit = true; } }
  }
  if (!W.length) return null;
  const pct = rem ? lost / rem * 100 : 0, kc = keys.reduce((q, k) => q + k.c, 0), first = W[0];
  const lvl = pct <= 1 && kc === 0 ? 'ok' : pct > 8 || (crit && pct > 3) || (kc >= 3 && pct > 5) ? 'high' : pct > 3 || kc > 0 ? 'mid' : 'ok';
  let cw2 = null; for (let w = first + 1; w < tot; w++) { if (W.includes(w) || w % 4 === 0 || ph.find(x => w >= x.from && w <= x.to).key === 'taper') continue; cw2 = w; break; }
  return {pct, lost, lvl, W, keys, kc, cw2, tot, avg: rem / (tot - S.wk + 1), comp: Math.min(120, Math.max(30, Math.round(Math.max(0, lost) / 40 * 60 / 15) * 15))};
}
function impactCard(){
  const r = impact(); if (!r) return '';
  const p = S.p, C = {ok:['#e3f6f0','#0a8f6a','#064e3b','Geringe Auswirkung'], mid:['#fff6dc','#d9a400','#6b4e00','Spürbare Auswirkung'], high:['#fff1e6','#c2410c','#7c2d12','Größere Auswirkung']}[r.lvl];
  const li = [`Belastung: ${r.lost >= 0 ? '−' : '+'}${Math.abs(Math.round(r.lost))} TSS (${Math.abs(r.pct).toFixed(1).replace('.', ',')} % der Restplanung) in Woche ${r.W.join(', ')}.`];
  if (r.kc) li.push(`${r.kc} Schlüsseleinheit${r.kc > 1 ? 'en' : ''} (Long Ride oder Intervalle) betroffen, Woche ${r.keys.map(k => k.w).join(', ')}.`);
  let btn = '';
  if (r.lost <= 0) li.push('Mehr Umfang als geplant. Das hilft, solange Schlaf und Erholung stimmen. Der Plan bleibt unverändert.');
  else if (r.lvl === 'ok') li.push('Das lässt sich ohne Ausgleich verkraften. Dein Ziel bleibt realistisch.');
  else {
    li.push(r.cw2 ? `Ausgleich: Plane in Woche ${r.cw2} (ab ${wd(p, r.cw2)}) rund ${r.comp} Min. zusätzlichen Grundlagenumfang ein, z. B. als längere Ausfahrt.${r.kc ? ' Eine ausgefallene harte Einheit holst du dort nach, indem du eine Grundlageneinheit ersetzt.' : ''}` : 'Ausgleich: Bis zum Zieltermin bleibt kein Wochenfenster mehr, das nicht Erholung oder Entlastung ist.');
    if (r.lvl === 'mid') li.push('Mit diesem Ausgleich bleibt dein Ziel erreichbar.');
    else if (p.goal === 'event') {
      const m = /^(\d+):(\d{1,2})$/.exec(String(p.targetTime).trim());
      if (m) { const b = +m[1] * 60 + +m[2], pc = (() => { try { const t = planCheck(p, true).sc[0].t; return t ? Math.ceil(t / 5) * 5 : 0; } catch (e) { elog(e); return 0; } })(), n = Math.max(pc, b + Math.max(5, Math.round(b * r.pct / 100 * .25 / 5) * 5)), nt = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; li.push(`Zielzeit: ${p.targetTime} Std. ist jetzt sehr ehrgeizig. Gut erreichbar sind etwa ${nt} Std., das wäre ein starkes Ergebnis.`); btn = `<button onclick="applyGoal('targetTime','${ja(nt)}')" class="ghost mt-3 !py-2 text-sm">Zielzeit auf ${nt} setzen</button>`; }
      else li.push('Zielzeit: Deine Zielzeit ist jetzt sehr ehrgeizig. Ein kleiner Puffer nimmt Druck raus.');
    } else if (p.goal === 'ftp' && p.ftpTarget > p.ftp) {
      const nt = Math.min((() => { try { return planCheck(p, true).base.mid; } catch (e) { elog(e); return 9999; } })(), p.ftp + Math.round((p.ftpTarget - p.ftp) * (1 - r.pct / 100 * .8))); li.push(`Ziel-FTP: ${p.ftpTarget} W sind jetzt sehr ehrgeizig. Gut erreichbar sind etwa ${nt} W, auch das ist ein klarer Fortschritt.`); btn = `<button onclick="applyGoal('ftpTarget',${ja(nt)})" class="ghost mt-3 !py-2 text-sm">Ziel-FTP auf ${nt} W setzen</button>`;
    } else li.push(`Zeitraum: Verlängere ihn um etwa ${Math.max(1, Math.ceil(r.lost / r.avg))} Woche(n) über Mehr → Meine Pläne → „Plan anpassen“, damit die Grundlage reicht.`);
  }
  return `<div class="mb-3 rounded-2xl p-4" style="background:${esc(C[0])};border:1px solid ${esc(C[1])}"><h3 class="hd mb-1 text-xl font-semibold" style="color:${esc(C[2])}">Auswirkungen auf deinen Plan: ${C[3]}</h3>
    <ul class="list-disc space-y-1 pl-5 text-sm leading-relaxed" style="color:${esc(C[2])}">${li.map(x => `<li>${x}</li>`).join('')}</ul><p class="mt-2 text-xs" style="opacity:.75">Faustwerte zur Orientierung, kein validiertes Prognosemodell.</p>${btn}</div>`;
}

