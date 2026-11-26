/* ---------- F31 (15.11.2026): Events nachträglich anpassen ----------
   Ein Formular für Anlegen und Bearbeiten (Saisonhöhepunkt in S.p, weitere Events in S.p.subs, gespiegelt in S.d).
   - Nicht planrelevant (Name, Notiz, Link, eigene Zielzeit): sofort gespeichert.
   - Planrelevant (Datum, Priorität, Art, Distanz, Höhenmeter, Streckenprofil, bei Reisemodus Startzeit): erst ein Vorschlag
     mit Vorher/Nachher (Zielzeit, Form, Tapering, betroffene Wochen). „Annehmen“ legt einen Schnappschuss an, ändert Event und
     kommende Tage und bietet 10 Minuten „Rückgängig“. „Event ändern, Plan behalten“ speichert die neuen Werte als offene Änderung
     (pend): Der Plan rechnet weiter mit den bisherigen Werten, die Karte zeigt die neuen mit Warnung und „Plan jetzt anpassen“.
     „Abbrechen“ ändert nichts.
   - Die Wochen ab morgen ergeben sich aus dem Event (genWeek). Vergangene Tage, heute und erledigte Einheiten bleiben.
   Neue Felder: Event {start, myT (eigene Zielzeit in Min.), note, link, pend}; Saisonhöhepunkt {evStart, evMyT, evNote, evLink, evPend}.
   Ältere Sicherungen ohne diese Felder laden unverändert (leer). */
Object.assign(IC_P, {
  pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  copy:'<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus:'<path d="M12 5v14M5 12h14"/>'
});
const evL = (de, en) => wkL(de, en);
let evF = null, evMsg = '', evProp = null, evUndo = null, evDelAsk = null;
const EV_PREL = ['date', 'prio', 'kind', 'dist', 'hm'];
const EV_PRIO = {A:['Formhöhepunkt: volles Tapering. Beim Saisonhöhepunkt 1 bis 2 Wochen weniger Umfang bei gleicher Intensität, bei weiteren A-Events 3 Tage, danach eine lockere Woche.', 'Peak: full taper. For the season goal 1 to 2 weeks of less volume at the same intensity, for other A events 3 days, followed by an easy week.'],
  B:['Wichtig: kurzes Tapering über 3 Tage, danach 1 bis 2 Tage Erholung.', 'Important: short 3-day taper, followed by 1 to 2 days of recovery.'],
  C:['Training unter Rennbedingungen: kein Tapering, du trainierst normal weiter.', 'Training under race conditions: no taper, you keep training as normal.']};
const evPrioTxt = k => evL(...EV_PRIO[k] || EV_PRIO.C);
const evKindTxt = k => ({race:evL('Rennen', 'Race'), jed:evL('Jedermann', 'Gran fondo race'), rtf:'RTF', tt:evL('Zeitfahren', 'Time trial')})[k] || k;
/* Eigene Zielzeit h:mm ↔ Minuten */
const evTP = v => { const m = String(v || '').trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/); if (!m) return null; const t = +m[1] * 60 + +(m[2] || 0); return t > 0 && t < 48 * 60 && +(m[2] || 0) < 60 ? t : null; };
const evTF = t => t ? Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') : '';
const evLinkOk = v => /^https?:\/\/[^\s"'<>]+$/i.test(String(v || '').trim());

/* ---- Lesen und Schreiben ---- */
function evGet(id, raw){
  const p = S.p; if (!p) return null;
  if (id === 'main') { const o = {id, main:true, name:p.eventName || '', date:p.eventDate || '', start:p.evStart || '', dist:+p.dist || 0, hm:+p.hm || 0, prio:'A', kind:evKindOf(p.kind ? p : null, p.eventName), myT:p.evMyT || 0, lim:p.evLim || 0, note:p.evNote || '', link:p.evLink || '', course:!!p.course, pend:p.evPend || null};
    return raw || !o.pend ? o : {...o, ...o.pend, pend:o.pend}; }
  const s = (p.subs || []).find(x => x.id === id); if (!s) return null;
  const o = {id, name:s.name || '', date:s.date || '', start:s.start || '', dist:+s.dist || 0, hm:+s.hm || 0, prio:s.prio || 'C', kind:evKindOf(s, s.name), myT:s.myT || 0, lim:s.lim || 0, note:s.note || '', link:s.link || '', pend:s.pend || null};
  return raw || !o.pend ? o : {...o, ...o.pend, pend:o.pend};
}
const evClone = p => JSON.parse(JSON.stringify(p));
/* Felder f auf eine Kopie von p anwenden; gibt {p, id} zurück (id ändert sich, wenn ein Event zum Saisonhöhepunkt wird) */
function evNewP(p0, id, f, o){
  o = o || {}; const p = evClone(p0); p.subs = p.subs || []; let nid = id;
  const setSub = (s, f) => { ['name', 'date', 'prio', 'kind', 'start', 'note', 'link'].forEach(k => { if (f[k] !== undefined) { if (f[k] === '' && k !== 'name') delete s[k]; else s[k] = k === 'name' ? String(f[k]).trim().slice(0, 80) : f[k]; } });
    if (f.dist !== undefined) s.dist = +f.dist || 0; if (f.hm !== undefined) { s.hm = +f.hm || 0; s.hm0 = s.hm === 0 && f.hm !== ''; } if (f.myT !== undefined) { if (f.myT) s.myT = f.myT; else delete s.myT; } if (f.lim !== undefined) { if (f.lim) s.lim = f.lim; else delete s.lim; }
    s.min = subEst(p, s); delete s.pend; };
  if (o.del) { if (id !== 'main') p.subs = p.subs.filter(s => s.id !== id); return {p, id:null}; }
  if (id === 'main') {
    if (f.name !== undefined) p.eventName = String(f.name).trim().slice(0, 80); if (f.date !== undefined) p.eventDate = f.date;
    if (f.dist !== undefined && +f.dist !== +p.dist) { p.dist = +f.dist || 0; if (p.course && !f.course) { delete p.course; p.noBuiltin = true; } }
    if (f.hm !== undefined && +f.hm !== +p.hm) { p.hm = +f.hm || 0; if (p.course && !f.course) { delete p.course; p.noBuiltin = true; } }
    if (f.course) { p.course = f.course; p.dist = Math.round(f.course.dist * (f.course.laps || 1) * 10) / 10; p.hm = Math.round(f.course.hm * (f.course.laps || 1)); }
    if (f.kind !== undefined) p.kind = f.kind; [['start', 'evStart'], ['note', 'evNote'], ['link', 'evLink'], ['myT', 'evMyT'], ['lim', 'evLim']].forEach(([k, q]) => { if (f[k] !== undefined) { if (f[k]) p[q] = f[k]; else delete p[q]; } });
    delete p.evPend;
    /* Saisonhöhepunkt wird B/C: ein anderes Event übernimmt (newMain) */
    if (f.prio && f.prio !== 'A' && f.newMain) { const s = p.subs.find(x => x.id === f.newMain); if (s) { const was = {name:p.eventName, date:p.eventDate, dist:p.dist, hm:p.hm, kind:p.kind}; p.subs = p.subs.filter(x => x.id !== s.id);
      p.evId = ''; p.eventName = s.name; p.eventDate = s.date; p.dist = +s.dist || 0; p.hm = +s.hm || 0; p.kind = s.kind; p.targetTime = ''; delete p.course; delete p.evDateEst; ['evStart', 'evNote', 'evLink', 'evMyT', 'evLim'].forEach(k => delete p[k]);
      /* Der Saisonhöhepunkt ist das Planende: das bisherige Hauptevent liegt danach und fällt aus dem Plan (Warnung im Vorschlag) */
      nid = 'main'; } }
    if (p.eventDate) p.subs = p.subs.filter(s => s.date < p.eventDate || (s.pend && s.pend.add));
  } else if (o.add) {
    const s = {id:uid()}; setSub(s, f); nid = s.id;
    if (s.date > p.eventDate) { /* liegt nach dem Saisonhöhepunkt: wird neuer Höhepunkt, der Plan wird verlängert */
      const old = {id:uid(), name:p.eventName, date:p.eventDate, prio:'A', dist:+p.dist || 0, hm:+p.hm || 0, kind:p.kind}; old.min = subEst(p, old);
      p.evId = ''; p.eventName = s.name; p.eventDate = s.date; p.dist = s.dist; p.hm = s.hm; p.kind = s.kind; p.targetTime = ''; delete p.course; ['evStart', 'evNote', 'evLink', 'evMyT', 'evLim'].forEach(k => { delete p[k]; });
      [['start', 'evStart'], ['note', 'evNote'], ['link', 'evLink'], ['myT', 'evMyT'], ['lim', 'evLim']].forEach(([k, q]) => { if (s[k]) p[q] = s[k]; }); p.subs.push(old); nid = 'main';
    } else p.subs.push(s);
  } else {
    const s = p.subs.find(x => x.id === id); if (!s) return {p, id}; setSub(s, f);
    if (s.date > p.eventDate) { p.subs = p.subs.filter(x => x.id !== id); const old = {id:uid(), name:p.eventName, date:p.eventDate, prio:'A', dist:+p.dist || 0, hm:+p.hm || 0, kind:p.kind}; old.min = subEst(p, old);
      p.evId = ''; p.eventName = s.name; p.eventDate = s.date; p.dist = s.dist; p.hm = s.hm; p.kind = s.kind; p.targetTime = ''; delete p.course; p.subs.push(old); nid = 'main'; }
  }
  (o.extra || []).forEach(x => { const s = p.subs.find(z => z.id === x.id); if (s) s.prio = x.prio; });
  p.subs.sort((a, b) => a.date.localeCompare(b.date));
  return {p, id:nid};
}
/* Welche Felder haben sich geändert, welche davon sind planrelevant? */
function evDiff(id, f){
  const o = evGet(id, true), ch = {}, pr = [];
  Object.keys(f).forEach(k => { if (k === 'newMain' || k === 'course') return; const a = o[k], b = f[k]; if (String(a == null ? '' : a) !== String(b == null ? '' : b)) ch[k] = b; });
  if (f.course) ch.course = f.course;
  if (f.newMain !== undefined && ch.prio) ch.newMain = f.newMain;
  Object.keys(ch).forEach(k => { if (EV_PREL.includes(k) || k === 'course' || (k === 'start' && typeof rzOn === 'function' && rzOn())) pr.push(k); });
  return {ch, pr};
}

/* ---- Vorschlag: Vorher/Nachher ---- */
function evSum(p, id){
  if (!id) return null; let F = []; try { F = seasonForecast(p); } catch (e) { elog(e); }
  const o = F.find(x => x.id === id) || null; let form = null;
  try { const R = formPlan(p), row = R && o && R.rows.find(r => r.day === o.date); if (row) form = {ctl:Math.round(row.ctl), tsb:Math.round(row.tsb)}; } catch (e) { elog(e); }
  return o ? {date:o.date, t:o.t || null, ftp:o.ftp || null, taper:o.taper, form, prio:o.prio, name:o.name} : null;
}
function evWeekDiff(p0, p1){
  const out = [], sw = typeof strWeek !== 'undefined' ? strWeek : null, t = todayIdx();
  try { const tot = Math.min(S.wk + 60, Math.max(phases(p0).slice(-1)[0].to, phases(p1).slice(-1)[0].to));
    for (let w = S.wk; w <= tot; w++) { let a = [], b = []; try { a = w === S.wk && S.plan ? S.plan : genWeek(p0, w); } catch (e) { a = []; } try { b = genWeek(p1, w); } catch (e) { b = []; }
      const ex = []; for (let i = 0; i < 7; i++) { if (w === S.wk && (i <= t || (S.done && S.done[i]))) continue; const x = a[i], y = b[i]; const k = z => z ? (z.n || '') + '|' + (z.m || 0) : '';
        if (k(x) !== k(y) && ((x && x.m) || (y && y.m))) ex.push(`${evL(SD[i], I_WD[SD[i]] || SD[i])}: ${x && x.m ? `${trTxt(x.n)} (${mm(x.m)})` : evL('frei', 'rest')} → ${y && y.m ? `${trTxt(y.n)} (${mm(y.m)})` : evL('frei', 'rest')}`); }
      if (ex.length) out.push({w, from:addD(p1.start, (w - 1) * 7), ex}); }
  } catch (e) { elog(e); }
  try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); }
  return out;
}
const evAs = p => [{id:'main', name:p.eventName, date:p.eventDate}, ...(p.subs || []).filter(s => s.prio === 'A' && s.date < p.eventDate && !(s.pend && s.pend.del)).map(s => ({id:s.id, name:s.name, date:s.date}))].filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date));
function evWarns(p0, p1, id, f, nid){
  const W = [], today = iso(0), days = d => Math.round((dOnly(d) - dOnly(today)) / 864e5);
  const ev = nid === 'main' ? {name:p1.eventName, date:p1.eventDate, prio:'A'} : (p1.subs || []).find(s => s.id === nid);
  if (ev && ev.prio === 'A' && days(ev.date) < 21 && days(ev.date) >= 0) W.push({k:'short', t:evL(`Bis „${ev.name}“ bleiben nur ${days(ev.date)} Tage. Ein voller Aufbau mit Tapering passt nicht mehr hinein. Bestmöglich: die letzte harte Einheit etwa 7 bis 10 Tage vorher, danach den Umfang senken und die Intensität halten (Tapering-Metaanalyse, Bosquet et al. 2007). Mehr Form lässt sich in der kurzen Zeit nicht aufbauen.`, `Only ${days(ev.date)} days remain until “${ev.name}”. A full build-up with taper no longer fits. Best possible: the last hard session about 7 to 10 days before, then reduce volume and keep intensity (taper meta-analysis, Bosquet et al. 2007). More fitness cannot be built in that short time.`)});
  const A = evAs(p1); for (let k = 1; k < A.length; k++) { const g = Math.round((dOnly(A[k].date) - dOnly(A[k - 1].date)) / 864e5); if (g < 28 && A[k].date >= today) { const oth = [A[k - 1], A[k]].find(x => x.id !== 'main' && x.id !== nid) || null;
    W.push({k:'twoA', t:evL(`„${A[k - 1].name}“ und „${A[k].name}“ liegen nur ${g} Tage auseinander und sind beide A-Events. Zwei volle Formhöhepunkte so dicht hintereinander kosten Fitness. Besser ist es, eines davon als B-Event zu fahren.`, `“${A[k - 1].name}” and “${A[k].name}” are only ${g} days apart and both are A events. Two full peaks so close together cost fitness. It is better to ride one of them as a B event.`), fix:oth ? {id:oth.id, name:oth.name} : null}); } }
  if (id === 'main' && f.date && p0.eventDate && f.date > p0.eventDate) W.push({k:'ext', t:evL(`Der Plan wird bis ${fmt(f.date)} verlängert.`, `The plan will be extended to ${fmt(f.date)}.`)});
  if (id !== 'main' && nid === 'main') W.push({k:'ext', t:evL(`„${p1.eventName}“ liegt nach deinem bisherigen Saisonhöhepunkt „${p0.eventName}“ und wird damit zum neuen Saisonhöhepunkt. Der Plan wird bis ${fmt(p1.eventDate)} verlängert, „${p0.eventName}“ bleibt als A-Event in der Liste.`, `“${p1.eventName}” is after your current season goal “${p0.eventName}” and becomes the new season goal. The plan is extended to ${fmt(p1.eventDate)}, “${p0.eventName}” stays in the list as an A event.`)});
  const lost = (p0.subs || []).filter(s => !(p1.subs || []).some(z => z.id === s.id) && s.id !== id && s.date >= today); lost.forEach(s => W.push({k:'lost', t:evL(`„${s.name}“ läge dann nach dem Saisonhöhepunkt und fällt aus dem Plan.`, `“${s.name}” would then be after the season goal and drop out of the plan.`)}));
  if (id === 'main' && f.prio && f.prio !== 'A' && f.newMain) { const s = (p0.subs || []).find(x => x.id === f.newMain); if (s) W.push({k:'lost', t:evL(`„${s.name}“ wird dein neuer Saisonhöhepunkt. Der Plan baut auf den Höhepunkt hin und endet dort, am ${fmt(s.date)}. „${p0.eventName}“ liegt danach und fällt aus dem Plan. Willst du es trotzdem fahren, leg danach einen neuen Plan dafür an.`, `“${s.name}” becomes your new season goal. The plan builds towards the peak and ends there, on ${fmt(s.date)}. “${p0.eventName}” is after that and drops out of the plan. If you still want to ride it, create a new plan for it afterwards.`)}); }
  return W;
}
function evPropose(id, f, o){
  o = o || {}; const p0 = S.p, R = evNewP(p0, id, f, o), p1 = R.p;
  const before = o.add ? null : evSum(p0, id), after = o.del ? null : evSum(p1, R.id);
  evProp = {id, f, o, nid:R.id, before, after, weeks:evWeekDiff(p0, p1), warns:o.del ? [] : evWarns(p0, p1, id, f, R.id)};
  render();
}
function evPropFix(oid){ if (!evProp) return; const o = {...evProp.o, extra:[...(evProp.o.extra || []), {id:oid, prio:'B'}]}; evPropose(evProp.id, evProp.f, o); }
/* ---- Umsetzen mit Schnappschuss und Rückgängig ---- */
function evSnap(why){
  const o = {p:JSON.stringify(S.p), d:JSON.stringify(S.d || null), plan:JSON.stringify(S.plan || null), done:JSON.stringify(S.done || {}), log:JSON.stringify(S.log || []), rz:JSON.stringify(S.rz === undefined ? null : S.rz), wk:S.wk};
  const prev = bkUndo; try { bkPre(why); } catch (e) { elog(e); } bkUndo = prev; evUndo = {at:Date.now(), why, o, pid:S.pid};
}
function evUndoGo(){ const u = evUndo; if (!u || u.pid !== S.pid) { evUndo = null; return render(); }
  S.p = JSON.parse(u.o.p); S.d = JSON.parse(u.o.d); S.plan = JSON.parse(u.o.plan); S.done = JSON.parse(u.o.done); S.log = JSON.parse(u.o.log); const rz = JSON.parse(u.o.rz); if (rz === null) delete S.rz; else S.rz = rz; S.wk = u.o.wk;
  evUndo = null; save(); render(); }
function evUndoBar(){ if (!evUndo || Date.now() - evUndo.at > 10 * 60e3) return '';
  return `<div class="flex items-center gap-2 text-sm" role="status" data-noi18n style="background:var(--tint);border:1px solid var(--ice);padding:8px 10px 8px 14px;margin:10px 16px 0;color:var(--ink)"><span class="min-w-0 flex-1">${esc(evUndo.why)}</span><button class="ghost !px-3 !py-1 text-sm" style="min-height:44px" onclick="evUndoGo()">${evL('Rückgängig', 'Undo')}</button><button class="text-sm" style="color:var(--mute);min-width:44px;min-height:44px;background:none;border:0" aria-label="${esc(evL('Hinweis schließen', 'Close notice'))}" onclick="evUndo=null;render()">${ic('close', 16)}</button></div>`; }
/* Kommende Tage der laufenden Woche neu, heute, Vergangenes und Erledigtes bleiben */
function evReplan(){
  if (!S.plan || !hasStarted(S.p)) { try { S.wk = hasStarted(S.p) ? curWeek(S.p) : S.wk; S.plan = genWeek(S.p, S.wk); } catch (e) { elog(e); } return; }
  const t = todayIdx(); let nw = null; try { nw = genWeek(S.p, S.wk); } catch (e) { elog(e); return; }
  S.plan = S.plan.map((x, i) => i > t && !(S.done && S.done[i]) && nw[i] ? nw[i] : x);
}
function evMirror(){ try { const subs = JSON.parse(JSON.stringify(S.p.subs || [])); S.d = {...(S.d || {}), ...JSON.parse(JSON.stringify(S.p)), subs}; } catch (e) { elog(e); } }
function evAccept(){
  const P = evProp; if (!P) return; const R = evNewP(S.p, P.id, P.f, P.o), nm = P.o.del ? (evGet(P.id, true) || {}).name : R.id === 'main' ? R.p.eventName : ((R.p.subs || []).find(s => s.id === R.id) || {}).name;
  evSnap(P.o.del ? evL(`„${nm}“ gelöscht, Plan angepasst.`, `“${nm}” deleted, plan adjusted.`) : P.o.add ? evL(`„${nm}“ hinzugefügt, Plan angepasst.`, `“${nm}” added, plan adjusted.`) : evL(`„${nm}“ geändert, Plan angepasst.`, `“${nm}” changed, plan adjusted.`));
  /* Reisemodus: Zeitzone und Startzeit gehören zum Event (F29) */
  if (P.f && P.f.tz !== undefined && typeof rzEvSet === 'function' && rzOn()) { try { rzEvSet(R.id || P.id, 'tz', P.f.tz); } catch (e) { elog(e); } }
  if (P.f && P.f.start !== undefined && typeof rzEvSet === 'function' && rzOn()) { try { rzEvSet(R.id || P.id, 'start', P.f.start); } catch (e) { elog(e); } }
  S.p = R.p; evMirror(); evReplan(); try { _psC.clear(); _fpC.clear(); } catch (e) { elog(e); }
  S.log = S.log || []; S.log.unshift({title:'Event geändert: Plan angepasst', day:-2, text:evUndo.why}); if (S.log.length > 20) S.log.length = 20;
  evProp = null; evF = null; evDelAsk = null; try { analyze(); } catch (e) { elog(e); } save(); render();
}
/* Event ändern, Plan behalten: neue Werte als offene Änderung, der Plan rechnet weiter mit den bisherigen */
function evKeepPlan(){
  const P = evProp; if (!P) return; evSnap(evL('Event geändert, Plan unverändert.', 'Event changed, plan unchanged.'));
  const {ch, pr} = P.o.del ? {ch:{}, pr:[]} : evDiff(P.id, P.f), now = {}, pend = {};
  Object.keys(ch).forEach(k => { if (pr.includes(k) || k === 'newMain') pend[k] = ch[k]; else now[k] = ch[k]; });
  if (Object.keys(now).length) S.p = evNewP(S.p, P.id, now).p;
  const tgt = P.id === 'main' ? S.p : (S.p.subs || []).find(s => s.id === P.id);
  if (tgt) { if (P.o.del) pend.del = 1; delete pend.course; if (P.id === 'main') tgt.evPend = pend; else tgt.pend = pend; }
  evMirror(); evProp = null; evF = null; evDelAsk = null; save(); render();
}
/* Offene Änderung jetzt umsetzen bzw. verwerfen */
function evPendGo(id){ const e = evGet(id, true); if (!e || !e.pend) return; const pd = {...e.pend}; if (pd.del) { delete pd.del; return evPropose(id, {}, {del:1}); } evPropose(id, pd); }
function evPendDrop(id){ evSnap(evL('Offene Änderung verworfen.', 'Pending change discarded.')); if (id === 'main') delete S.p.evPend; else { const s = (S.p.subs || []).find(x => x.id === id); if (s) delete s.pend; } evMirror(); save(); render(); }

/* ---- Formular ---- */
function evOpen(id){ const e = id ? evGet(id) : null; evMsg = ''; evProp = null;
  evF = e ? {id, main:!!e.main, name:e.name, date:e.date, start:e.start, dist:e.dist || '', hm:e.hm || (e.hm === 0 && e.dist ? 0 : ''), prio:e.prio, kind:e.kind, myT:evTF(e.myT), lim:evTF(e.lim), note:e.note, link:e.link, tz:(typeof rzEv === 'function' ? rzEv(id).tz : '') || '', newMain:undefined}
    : {id:null, main:false, name:'', date:'', start:'', dist:'', hm:'', prio:'B', kind:'jed', myT:'', lim:'', note:'', link:'', tz:''};
  render(); }
function evDup(id){ const e = evGet(id); if (!e) return; evOpen(null); Object.assign(evF, {name:e.name, date:addD(e.date, 364 + (new Date(e.date + 'T12:00:00').getDay() === new Date(addD(e.date, 365) + 'T12:00:00').getDay() ? 1 : 0)), start:e.start, dist:e.dist || '', hm:e.hm || '', prio:e.main ? 'B' : e.prio, kind:e.kind, note:e.note, link:e.link, dupOf:e.name}); render(); }
function evFSet(k, v){ if (!evF) return; evF[k] = v; if (k === 'prio' || k === 'kind' || k === 'newMain') render(); }
function evClose(){ evF = null; evProp = null; evMsg = ''; evDelAsk = null; render(); }
/* Streckenprofil (nur Saisonhöhepunkt): GPX/TCX/FIT lokal lesen, ausgedünnt wie im Assistenten */
async function evCourse(inp){
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f || !evF) return;
  try { const {name, data} = await unpack(await f.arrayBuffer(), f.name); let pts, nm = '';
    if (data[8] === 0x2E && data[9] === 0x46 && data[10] === 0x49 && data[11] === 0x54) pts = parseFIT(data).pts;
    else { const x = new DOMParser().parseFromString(new TextDecoder().decode(data), 'application/xml'); let els = [...x.getElementsByTagName('trkpt')]; if (!els.length) els = [...x.getElementsByTagName('rtept')];
      if (!els.length) throw new Error(evL('Die Datei enthält keine Track- oder Routenpunkte.', 'The file has no track or route points.'));
      pts = els.map(e => { const el = txt1(e, 'ele'); return {a:el != null ? parseFloat(el) : null, lat:parseFloat(e.getAttribute('lat')), lon:parseFloat(e.getAttribute('lon')), d:null}; }); const n = x.getElementsByTagName('name')[0]; nm = n ? n.textContent.trim() : ''; }
    const c = buildCourse(pts, nm || name.replace(/\.[^.]+$/, '')); evF.course = c; evF.dist = Math.round(c.dist * 10) / 10; evF.hm = Math.round(c.hm); evMsg = '';
  } catch (e) { evMsg = (e && e.message) || evL('Die Datei konnte nicht gelesen werden.', 'The file could not be read.'); }
  render();
}
function evCheckF(f){
  const today = iso(0), p = S.p;
  if (!String(f.name || '').trim()) return evL('Bitte einen Namen eingeben.', 'Please enter a name.');
  if (!f.date) return evL('Bitte ein Datum wählen.', 'Please choose a date.');
  if (f.date < today) return evL('Das Datum liegt in der Vergangenheit.', 'The date is in the past.');
  if (p.start && f.date < p.start) return evL('Das Datum liegt vor dem Planstart.', 'The date is before the plan start.');
  if (!f.main && f.date === p.eventDate && f.id !== 'main') return evL('An diesem Tag ist schon dein Saisonhöhepunkt.', 'Your season goal is already on that day.');
  const d = wfNum(f.dist), h = wfNum(f.hm);
  if (String(f.dist).trim() !== '' && !(d > 0 && d < 2000)) return evL('Die Distanz muss zwischen 1 und 2.000 km liegen.', 'The distance must be between 1 and 2,000 km.');
  if (String(f.hm).trim() !== '' && !(h >= 0 && h < 20000)) return evL('Die Höhenmeter müssen zwischen 0 und 20.000 liegen.', 'Elevation must be between 0 and 20,000 m.');
  if (d > 0 && h > 0 && h / (d * 1000) > .1) return evL(`${Math.round(h).toLocaleString('de-DE')} hm auf ${f1(d)} km wären mehr als 10 % Steigung im Schnitt. Bitte Distanz und Höhenmeter prüfen.`, `${Math.round(h)} m on ${f1(d)} km would be more than 10 % average gradient. Please check distance and elevation.`);
  if (String(f.myT || '').trim() && !evTP(f.myT)) return evL('Die eigene Zielzeit bitte als Stunden:Minuten eingeben, z. B. 2:15.', 'Please enter your own target time as hours:minutes, e.g. 2:15.');
  if (String(f.lim || '').trim() && !evTP(f.lim)) return evL('Das Zeitlimit bitte als Stunden:Minuten eingeben, z. B. 10:30.', 'Please enter the time limit as hours:minutes, e.g. 10:30.');
  if (String(f.link || '').trim() && !evLinkOk(f.link)) return evL('Der Link muss mit http:// oder https:// beginnen.', 'The link must start with http:// or https://.');
  if (f.main && f.prio !== 'A' && f.newMain === undefined) return evL('Wähle, welches Event dein Saisonhöhepunkt wird.', 'Choose which event becomes your season goal.');
  return '';
}
function evSave(){
  const f = evF; if (!f) return; evMsg = evCheckF(f); if (evMsg) return render();
  const g = {name:String(f.name).trim(), date:f.date, prio:f.main ? (f.prio !== 'A' && f.newMain ? f.prio : 'A') : f.prio, kind:f.kind, dist:Math.round(wfNum(f.dist) * 10) / 10 || 0, hm:String(f.hm).trim() === '' ? 0 : Math.round(wfNum(f.hm)), start:f.start || '', myT:evTP(f.myT) || 0, lim:evTP(f.lim) || 0, note:String(f.note || '').trim().slice(0, 500), link:String(f.link || '').trim().slice(0, 300)};
  if (f.course) g.course = f.course; if (f.main && f.newMain) g.newMain = f.newMain;
  if (!f.id) return evPropose(null, g, {add:1});
  if (rzOn && typeof rzOn === 'function' && rzOn()) { const tz0 = (rzEv(f.id) || {}).tz || ''; if ((f.tz || '') !== tz0) g.tz = f.tz || ''; }
  const {ch, pr} = evDiff(f.id, g);
  if (g.tz !== undefined) pr.push('tz');
  if (!Object.keys(ch).length && g.tz === undefined) { evClose(); return; }
  if (!pr.length) { evSnap(evL(`„${g.name}“ gespeichert.`, `“${g.name}” saved.`)); S.p = evNewP(S.p, f.id, ch).p; evMirror(); evF = null; save(); render(); return; }
  evPropose(f.id, {...ch, ...(g.tz !== undefined ? {tz:g.tz} : {})});
}
function evDelOpen(id){ evDelAsk = id; render(); }
function evDelGo(){ const id = evDelAsk; if (!id) return; evDelAsk = null; evPropose(id, {}, {del:1}); }

/* ---- Anzeige ---- */
const evBtn = (fn, l, main, aria) => `<button class="${main ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}"${aria ? ` aria-label="${esc(aria)}"` : ''}>${l}</button>`;
function evModal(){
  if (evProp) return evPropUi();
  if (evDelAsk) { const e = evGet(evDelAsk); if (!e) { evDelAsk = null; return ''; }
    const others = (S.p.subs || []).filter(s => s.date >= iso(0) && !(s.pend && s.pend.del));
    return `<div class="exov" data-noi18n onclick="if(event.target===this)evClose()" role="dialog" aria-modal="true" aria-label="${esc(evL('Event löschen', 'Delete event'))}"><div class="exbox" style="max-width:440px"><h3 class="hd text-2xl font-semibold">${esc(evL(`„${e.name}“ löschen?`, `Delete “${e.name}”?`))}</h3>
      ${e.main ? (others.length ? `<p class="mt-2 text-sm">${evL('Das ist dein Saisonhöhepunkt. Wähle zuerst, welches Event an seine Stelle tritt: Öffne „Bearbeiten“ und setz die Priorität auf B oder C.', 'This is your season goal. First choose which event takes its place: open “Edit” and set the priority to B or C.')}</p>` : `<p class="mt-2 text-sm">${evL('Das ist dein einziges Event und damit das Ziel deines Plans. Ein anderes Ziel wählst du unter „Plan anpassen“.', 'This is your only event and so the goal of your plan. You choose a different goal under “Adjust plan”.')}</p>`)
        + `<div class="mt-4 flex flex-wrap gap-2">${evBtn('evClose()', evL('Schließen', 'Close'), true)}</div>`
      : `<p class="mt-2 text-sm">${evL('Danach zeigt die App, wie sich dein Plan ändert (Tapering entfällt, die Wochen laufen normal weiter). Du entscheidest dann, ob der Plan angepasst wird.', 'The app then shows how your plan changes (no taper, the weeks continue as normal). You then decide whether the plan is adjusted.')}</p><div class="mt-4 flex flex-wrap gap-2">${evBtn('evDelGo()', evL('Weiter', 'Continue'), true)}${evBtn('evClose()', evL('Abbrechen', 'Cancel'))}</div>`}</div></div>`; }
  if (!evF) return '';
  const f = evF, rzo = typeof rzOn === 'function' && rzOn(), inp = (k, type, extra) => `<input type="${type || 'text'}" class="inp" style="min-height:44px" value="${esc(f[k] == null ? '' : f[k])}" oninput="evFSet('${k}',this.value)"${extra || ''}>`;
  const prio = ['A', 'B', 'C'].map(k => `<button class="${f.prio === k ? 'btn' : 'ghost'} !w-auto !px-4 text-sm" style="min-height:44px" aria-pressed="${f.prio === k}" onclick="evFSet('prio','${k}')">${k}</button>`).join('');
  const kinds = Object.keys(EV_KIND).map(k => `<button class="${f.kind === k ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${f.kind === k}" onclick="evFSet('kind','${k}')">${evKindTxt(k)}</button>`).join('');
  const subsAlt = f.main ? (S.p.subs || []).filter(s => s.date >= iso(0) && !(s.pend && s.pend.del)) : [];
  const mainAsk = f.main && f.prio !== 'A' ? `<div class="mt-2 p-2.5 text-sm" style="border:1px solid var(--line);border-left:3px solid #d9a400;background:var(--tint)"><p class="font-semibold">${evL('Welches Event wird dein Saisonhöhepunkt?', 'Which event becomes your season goal?')}</p><p class="mt-1 text-xs" style="color:var(--mute)">${evL('Der Plan baut auf einen Höhepunkt hin und endet dort. Wählst du ein früheres Event, endet der Plan an dessen Tag. Ohne anderes Event bleibt dieses der Höhepunkt (A).', 'The plan builds towards one peak and ends there. If you choose an earlier event, the plan ends on its day. Without another event this one stays the peak (A).')}</p><div class="mt-2 flex flex-wrap gap-2">${subsAlt.map(s => `<button class="${f.newMain === s.id ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${f.newMain === s.id}" onclick="evFSet('newMain','${ja(s.id)}')">${esc(s.name)} · ${fmt(s.date).slice(0, 6)}</button>`).join('')}<button class="${f.newMain === '' ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${f.newMain === ''}" onclick="evFSet('newMain','');evFSet('prio','A')">${evL('Keins – bleibt Höhepunkt', 'None – stays the peak')}</button></div></div>` : '';
  const tgt = (() => { const t = evTP(f.myT); if (!t || !f.id) return ''; let o = null; try { o = seasonForecast(S.p).find(x => x.id === f.id); } catch (e) { elog(e); } const need = o ? evNeedW(o, t) : null;
    return `<p class="mt-1 text-xs" style="color:var(--mute)">${evL(`Dein Ziel ${evTF(t)}${o && o.t ? ` · Prognose ${evTF(o.t)}` : ''}${need ? ` · dafür nötig etwa ${need} W FTP am Eventtag` : ''}`, `Your target ${evTF(t)}${o && o.t ? ` · forecast ${evTF(o.t)}` : ''}${need ? ` · needs about ${need} W FTP on race day` : ''}`)}</p>`; })();
  return `<div class="exov" data-noi18n onclick="if(event.target===this)evClose()" role="dialog" aria-modal="true" aria-label="${esc(f.id ? evL('Event bearbeiten', 'Edit event') : evL('Event hinzufügen', 'Add event'))}"><div class="exbox" style="max-width:480px;text-align:left">
    <h3 class="hd text-2xl font-semibold">${f.id ? evL('Event bearbeiten', 'Edit event') : f.dupOf ? evL('Event duplizieren', 'Duplicate event') : evL('Event hinzufügen', 'Add event')}</h3>${f.main ? `<p class="mt-1 text-xs" style="color:var(--teal)">${evL('Saisonhöhepunkt', 'Season goal')}</p>` : ''}
    <div class="mt-3 space-y-3">${field(evL('Name', 'Name'), inp('name', 'text', ' maxlength="80" autocomplete="off"'))}
      <div class="grid grid-cols-2 gap-3">${field(evL('Datum', 'Date'), inp('date', 'date'))}${field(evL('Startzeit (optional)', 'Start time (optional)'), inp('start', 'time'))}</div>
      ${rzo && f.id ? field(evL('Zeitzone des Events (Reisemodus)', 'Event time zone (travel mode)'), rzTzSel('evTz', f.tz || '', "evFSet('tz',this.value)", true)) : ''}
      <div class="grid grid-cols-2 gap-3">${field(evL('Distanz (km)', 'Distance (km)'), inp('dist', 'text', ' inputmode="decimal"'))}${field(evL('Höhenmeter', 'Elevation (m)'), inp('hm', 'text', ' inputmode="numeric"'))}</div>
      ${f.main ? `<div><label class="ghost inline-block cursor-pointer !w-auto !px-3 text-sm" style="min-height:44px;line-height:28px">${evL('Streckenprofil laden (GPX, TCX, FIT)', 'Load course (GPX, TCX, FIT)')}<input type="file" accept=".gpx,.tcx,.fit,.zip,.gz,.xml" style="display:none" onchange="evCourse(this)"></label>${f.course ? `<p class="mt-1 text-xs" style="color:var(--teal)">${evL(`Strecke gelesen: ${f1(f.course.dist)} km, ${Math.round(f.course.hm)} hm`, `Course read: ${f1(f.course.dist)} km, ${Math.round(f.course.hm)} m`)}</p>` : S.p.course ? `<p class="mt-1 text-xs" style="color:var(--mute)">${evL('Ein Streckenprofil ist hinterlegt. Änderst du Distanz oder Höhenmeter von Hand, rechnet die App ohne Profil.', 'A course is stored. If you change distance or elevation by hand, the app calculates without the course.')}</p>` : ''}</div>` : ''}
      <div><p class="mb-1.5 text-sm" style="color:var(--mute)">${evL('Priorität', 'Priority')}</p><div class="flex flex-wrap gap-2" role="group" aria-label="${esc(evL('Priorität', 'Priority'))}">${prio}</div><p class="mt-1 text-xs" style="color:var(--mute)">${esc(evPrioTxt(f.prio))}</p>${mainAsk}</div>
      <div><p class="mb-1.5 text-sm" style="color:var(--mute)">${evL('Art', 'Type')}</p><div class="flex flex-wrap gap-2" role="group" aria-label="${esc(evL('Art des Events', 'Event type'))}">${kinds}</div></div>
      <div>${field(evL('Eigene Zielzeit (optional, Std:Min)', 'Own target time (optional, h:mm)'), inp('myT', 'text', ' inputmode="numeric" placeholder="2:00"'))}${tgt}</div>
      <div>${field(evL('Zeitlimit des Veranstalters (falls vorhanden, Std:Min)', 'Organiser time limit (if any, h:mm)'), inp('lim', 'text', ' inputmode="numeric" placeholder="12:00"'))}<p class="mt-1 text-xs" style="color:var(--mute)">${evL('Nur eintragen, wenn die Ausschreibung ein Limit nennt. Die App erfindet keins.', 'Only enter it if the event lists a limit. The app never invents one.')}</p></div>
      ${field(evL('Notiz', 'Note'), `<textarea class="inp" rows="2" maxlength="500" oninput="evFSet('note',this.value)">${esc(f.note || '')}</textarea>`)}
      ${field(evL('Link (z. B. Ausschreibung)', 'Link (e.g. event website)'), inp('link', 'url', ' placeholder="https://"'))}</div>
    ${evMsg ? `<p class="mt-3 text-sm" role="alert" style="color:#c0392b">${esc(evMsg)}</p>` : ''}
    <div class="mt-4 flex flex-wrap gap-2">${evBtn('evSave()', evL('Speichern', 'Save'), true)}${evBtn('evClose()', evL('Abbrechen', 'Cancel'))}</div>
    ${f.id ? `<div class="mt-3 flex flex-wrap gap-2" style="border-top:1px solid var(--line);padding-top:12px">${evBtn(`evDup('${ja(f.id)}')`, `${ic('copy', 16)} ${evL('Duplizieren (+1 Jahr)', 'Duplicate (+1 year)')}`)}${evBtn(`evDelOpen('${ja(f.id)}')`, `${ic('trash', 16)} ${evL('Löschen', 'Delete')}`)}</div>` : ''}</div></div>`;
}
/* Für die eigene Zielzeit nötige FTP am Eventtag (gleiches Modell wie die Prognose, Martin et al. 1998) */
function evNeedW(o, t){
  try { const p = S.p, x = (seasonEvs(p).find(z => z.id === o.id) || {}).pp; if (!x || !(x.dist > 0)) return null; const src = evSrc(p, o), dr = evDraftOf(src, o.kind, o.main), kg = kgOf(p);
    let lo = 80, hi = 600; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2, tt = evTime({...x, targetTime:'5:00', draft:dr, _prec:true}, mid, kg, dr); if (!tt) return null; if (tt > t) lo = mid; else hi = mid; }
    return Math.round((lo + hi) / 2 / 5) * 5; } catch (e) { elog(e); return null; }
}
function evPropUi(){
  const P = evProp, b = P.before, a = P.after, sg = v => (v > 0 ? '+' : '') + v;
  const cell = (l, x, y) => `<tr><td class="py-1 pr-2 text-xs" style="color:var(--mute)">${l}</td><td class="py-1 pr-2">${x || '–'}</td><td class="py-1">${y || '–'}</td></tr>`;
  const T = z => z && z.t ? evTF(z.t) + evL(' Std.', ' h') : '';
  const tbl = `<table class="mt-3 w-full text-sm" style="border-collapse:collapse"><thead><tr><th></th><th class="text-left text-xs" style="color:var(--mute)">${evL('Vorher', 'Before')}</th><th class="text-left text-xs" style="color:var(--mute)">${evL('Nachher', 'After')}</th></tr></thead><tbody>
    ${cell(evL('Datum', 'Date'), b && fmt(b.date), a && fmt(a.date))}${cell(evL('Priorität', 'Priority'), b && b.prio, a && a.prio)}${cell(evL('Zielzeit (Prognose)', 'Target time (forecast)'), T(b), T(a))}
    ${cell(evL('Form am Eventtag', 'Form on race day'), b && b.form ? `${sg(b.form.tsb)} · ${evL('Fitness', 'Fitness')} ${b.form.ctl}` : '', a && a.form ? `${sg(a.form.tsb)} · ${evL('Fitness', 'Fitness')} ${a.form.ctl}` : '')}
    ${cell(evL('FTP am Eventtag', 'FTP on race day'), b && b.ftp ? b.ftp + ' W' : '', a && a.ftp ? a.ftp + ' W' : '')}${cell('Tapering', b && b.taper && esc(trTxt(b.taper)), a && a.taper && esc(trTxt(a.taper)))}</tbody></table>`;
  const wk = P.weeks.length ? `<details class="mt-3 text-sm" open><summary class="cursor-pointer font-semibold" style="min-height:44px;color:var(--teal)">${evL(`${P.weeks.length} ${P.weeks.length === 1 ? 'Woche ändert' : 'Wochen ändern'} sich`, `${P.weeks.length} ${P.weeks.length === 1 ? 'week changes' : 'weeks change'}`)}</summary><div class="mt-1 space-y-1.5">${P.weeks.slice(0, 8).map(w => `<div class="p-2" style="background:var(--tint);border:1px solid var(--line)"><p class="text-xs font-semibold">${evL(`Woche ${w.w} (ab ${fmt(w.from).slice(0, 6)})`, `Week ${w.w} (from ${fmt(w.from).slice(0, 6)})`)}</p>${w.ex.slice(0, 3).map(t => `<p class="text-xs">${esc(t)}</p>`).join('')}${w.ex.length > 3 ? `<p class="text-xs" style="color:var(--mute)">${evL(`und ${w.ex.length - 3} weitere Tage`, `and ${w.ex.length - 3} more days`)}</p>` : ''}</div>`).join('')}${P.weeks.length > 8 ? `<p class="text-xs" style="color:var(--mute)">${evL(`und ${P.weeks.length - 8} weitere Wochen`, `and ${P.weeks.length - 8} more weeks`)}</p>` : ''}</div></details>` : `<p class="mt-3 text-sm">${evL('An den kommenden Einheiten ändert sich nichts.', 'Nothing changes in the upcoming sessions.')}</p>`;
  const W = P.warns.map(w => `<div class="mt-2 p-2.5 text-sm" style="border:1px solid var(--line);border-left:3px solid ${w.k === 'ext' || w.k === 'main' ? 'var(--teal)' : '#c2410c'}"><p>${esc(w.t)}</p>${w.fix ? `<div class="mt-2">${evBtn(`evPropFix('${ja(w.fix.id)}')`, evL(`„${esc(w.fix.name)}“ als B-Event`, `“${esc(w.fix.name)}” as B event`))}</div>` : ''}</div>`).join('');
  const ttl = P.o.del ? evL('Löschen: so ändert sich dein Plan', 'Delete: how your plan changes') : P.o.add ? evL('Neues Event: so ändert sich dein Plan', 'New event: how your plan changes') : evL('So ändert sich dein Plan', 'How your plan changes');
  return `<div class="exov" data-noi18n onclick="if(event.target===this)evClose()" role="dialog" aria-modal="true" aria-label="${esc(ttl)}"><div class="exbox" style="max-width:480px;text-align:left"><h3 class="hd text-2xl font-semibold">${ttl}</h3>
    <p class="mt-1 text-sm" style="color:var(--mute)">${evL('Geändert werden nur Tage ab morgen. Heute, vergangene und erledigte Einheiten bleiben. Vorher legt die App einen Schnappschuss an, du kannst es rückgängig machen.', 'Only days from tomorrow change. Today, past and completed sessions stay. The app saves a snapshot first, so you can undo it.')}</p>${tbl}${W}${wk}
    <div class="mt-4 flex flex-col gap-2">${evBtn('evAccept()', P.o.del ? evL('Löschen und Plan anpassen', 'Delete and adjust plan') : P.o.add ? evL('Hinzufügen und Plan anpassen', 'Add and adjust plan') : evL('Annehmen: Event und Plan ändern', 'Accept: change event and plan'), true)}
      ${P.o.add ? '' : evBtn('evKeepPlan()', P.o.del ? evL('Löschen, Plan behalten', 'Delete, keep plan') : evL('Ablehnen: Event ändern, Plan behalten', 'Decline: change event, keep plan'))}
      ${evBtn('evClose()', evL('Abbrechen: nichts ändern', 'Cancel: change nothing'))}</div>
    ${P.o.add ? '' : `<p class="mt-2 text-xs" style="color:var(--mute)">${evL('Behältst du den Plan, richtet er sich weiter nach den bisherigen Angaben. Die Event-Karte zeigt dann eine Warnung, und du kannst den Plan später anpassen.', 'If you keep the plan, it keeps following the previous details. The event card then shows a warning and you can adjust the plan later.')}</p>`}</div></div>`;
}

/* ---- Pacing je Art (Richtwerte, Quellen im Bericht F31) ----
   IF solo über die Dauer: ifEv (1 − 0,10 · ln(Std.), ab 3 Std. mit Abschlag für Ermüdungsresistenz, Paket C).
   Feld (Rennen, Jedermann): Ø im Feld IF − 25 bis IF − 15 Prozentpunkte, weil der Windschatten im Feld den Luftwiderstand
   stark senkt (Blocken et al. 2018); Führung 95–105 %, Antritte unter 1 Min. 110–130 %, lange Anstiege bis IF + 5.
   Zeitfahren (solo): gleichmäßig IF − 4 bis IF, am Berg und bei Gegenwind bis IF + 5 (Atkinson et al. 2007, Abbiss und Laursen 2008).
   RTF/Radmarathon: Ø IF − 15 bis IF − 8, Anstiege höchstens IF + 2 und nie über 85 % FTP, Verpflegung (Jeukendrup 2014). */
function evPace(kind, T, F){
  const IF = Math.round(Math.max(.6, ifEv(T)) * 100), w = v => Math.round(F * v / 100), R = [];
  let lo, hi, cl, note;
  if (kind === 'tt') { lo = IF - 4; hi = IF; cl = Math.min(105, IF + 5);
    R.push([evL('Gleichmäßig (Ø)', 'Steady (avg)'), lo, hi], [evL('Anstiege, Gegenwind', 'Climbs, headwind'), hi, cl]);
    note = evL('Gleichmäßig fahren, an Anstiegen und bei Gegenwind etwa 5 % mehr, bergab und mit Rückenwind weniger.', 'Ride evenly, about 5 % more on climbs and into headwind, less downhill and with tailwind.'); }
  else if (EV_KIND[kind] && EV_KIND[kind][1] === 'pel') { lo = Math.max(50, IF - 25); hi = Math.max(lo + 5, IF - 15); cl = Math.min(100, IF + 5);
    R.push([evL('Im Feld (Ø)', 'In the bunch (avg)'), lo, hi], [evL('Führung, Lücken schließen', 'Pulls, closing gaps'), 95, 105], [evL('Antritte, kurze Rampen (unter 1 Min.)', 'Attacks, short ramps (under 1 min)'), 110, 130], [evL('Lange Anstiege', 'Long climbs'), Math.min(cl, hi + 5), cl]);
    note = evL('Im Windschatten Kräfte sparen: Im Feld brauchst du deutlich weniger Leistung als allein. Die Spitzen entscheiden, nicht der Schnitt.', 'Save energy in the draft: in the bunch you need much less power than alone. The surges decide, not the average.'); }
  else { lo = Math.max(50, IF - 15); hi = Math.max(lo + 4, IF - 8); cl = Math.max(hi, Math.min(85, IF + 2));
    R.push([evL('Im Flachen (Ø)', 'On the flat (avg)'), lo, hi], [evL('Anstiege höchstens', 'Climbs at most'), hi, cl]);
    note = evL(`Am Berg dosieren, damit für die zweite Hälfte etwas bleibt. Verpflegung: 30 bis 60 g Kohlenhydrate pro Stunde, bei mehr als 2,5 Std. bis 90 g.`, 'Pace the climbs so something is left for the second half. Fuelling: 30 to 60 g of carbohydrate per hour, up to 90 g for more than 2.5 h.'); }
  return {lo, hi, cl, wLo:w(lo), wHi:w(hi), wCl:w(cl), IF, kind, rows:R.map(([l, a, b]) => ({l, lo:a, hi:b, wLo:w(a), wHi:w(b)})), note, src:'richtwert'};
}

/* ---- Karte je Event (Saisonübersicht) ---- */
function evCard(o){
  const p = S.p, e = evGet(o.id) || {}, sg = v => (v > 0 ? '+' : '') + v, kg = kgOf(p), pend = e.pend;
  const dist = (e.dist ? `${f1(e.dist)} km${e.hm ? ', ' + Math.round(e.hm).toLocaleString('de-DE') + ' hm' : ''}` : evL('Distanz fehlt', 'Distance missing'));
  const days = Math.round((dOnly(e.date || o.date) - dOnly(iso(0))) / 864e5);
  const head = `<div class="flex items-start gap-2"><span class="mt-0.5">${prioBadge(e.prio || o.prio)}</span><button class="min-w-0 flex-1 text-left" style="background:none;border:0;padding:0;min-height:44px" onclick="evOpen('${ja(o.id)}')"><span class="block font-semibold" style="overflow-wrap:anywhere">${esc(e.name || o.name)}</span><span class="block text-xs" style="color:var(--mute)">${fmt(e.date || o.date)}${o.past ? '' : evL(`, in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`, `, in ${days} ${days === 1 ? 'day' : 'days'}`)}${e.start ? ` · ${esc(e.start)} ${evL('Uhr', '')}` : ''}</span></button><button class="ghost !w-auto !px-2.5" style="min-height:44px;min-width:44px" aria-label="${esc(evL(`Event bearbeiten: ${e.name || o.name}`, `Edit event: ${e.name || o.name}`))}" onclick="evOpen('${ja(o.id)}')">${ic('pen', 18)}</button></div>`;
  const facts = `<p class="mt-1 text-xs" style="color:var(--mute)">${dist} · ${evKindTxt(e.kind || o.kind)}${o.main ? evL(' · Saisonhöhepunkt', ' · season goal') : ''}</p>`;
  const pendUi = pend ? `<div class="mt-2 p-2.5 text-sm" style="border:1px solid var(--line);border-left:3px solid #c2410c"><p class="flex items-start gap-2"><span style="color:#c2410c">${ic('warn', 18)}</span><span>${pend.del ? evL('Gelöscht, aber der Plan richtet sich noch nach diesem Event (Tapering).', 'Deleted, but the plan still follows this event (taper).') : evL(`Der Plan richtet sich noch nach den bisherigen Angaben${pend.date ? ` (Datum ${fmt(o.date)})` : ''}. Tapering und Prognose passen nicht zu den neuen.`, `The plan still follows the previous details${pend.date ? ` (date ${fmt(o.date)})` : ''}. Taper and forecast do not match the new ones.`)}</span></p><div class="mt-2 flex flex-wrap gap-2">${evBtn(`evPendGo('${ja(o.id)}')`, evL('Plan jetzt anpassen', 'Adjust plan now'), true)}${evBtn(`evPendDrop('${ja(o.id)}')`, pend.del ? evL('Wiederherstellen', 'Restore') : evL('Änderung verwerfen', 'Discard change'))}</div></div>` : '';
  let cells = '';
  if (o.past) cells = `<p class="mt-1 text-xs" style="color:var(--mute)">${evL('vorbei', 'past')}</p>`;
  else {
    const my = e.myT ? `<div class="text-xs">${evL(`Dein Ziel ${evTF(e.myT)}`, `Your target ${evTF(e.myT)}`)}${o.t ? evL(` · Prognose ${evTF(o.t)}`, ` · forecast ${evTF(o.t)}`) : ''}${(() => { const n = evNeedW(o, e.myT); return n ? evL(` · nötig etwa ${n} W FTP`, ` · needs about ${n} W FTP`) : ''; })()}</div>` : '';
    const pc = o.pace || {}, rows = o.hr ? `<div class="font-semibold">${evL('Puls', 'Heart rate')} ${o.hr.lo}–${o.hr.hi} bpm</div>` : (pc.rows || []).map(r => `<div><span class="font-semibold">${r.wLo === r.wHi ? r.wHi : `${r.wLo}–${r.wHi}`} W</span> <span class="text-xs">${esc(r.l)}</span></div>`).join('');
    cells = `<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
      <div class="p-2.5" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">${evL('Zielzeit', 'Target time')}</div><div class="font-semibold">${o.t ? `${hm2(o.t)} ${evL('Std.', 'h')} · Ø ${f1(o.kmh)} km/h` : '–'}</div>${o.tAmb ? `<div class="text-xs">${evL('ambitioniert', 'ambitious')} ${hm2(o.tAmb)} ${evL('Std.', 'h')}</div>` : ''}${my}</div>
      <div class="p-2.5" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">${evL('Form am Eventtag', 'Form on race day')}</div><div class="font-semibold">${o.form ? `${evL('Form', 'Form')} ${sg(o.form.tsb)} · ${evL('Fitness', 'Fitness')} ${o.form.ctl}` : '–'}</div>${o.ftp ? `<div class="text-xs">FTP ${evL('etwa', 'about')} ${o.ftp} W (${f1(o.ftp / kg)} W/kg)</div><div class="text-xs" style="color:var(--mute)">${evL(`Prognose aus deiner FTP (${p.ftp} W) und dem Planverlauf bis dahin`, `Forecast from your FTP (${p.ftp} W) and the plan up to then`)}</div>` : ''}</div>
      <div class="p-2.5" style="background:var(--tint);grid-column:span 2"><div class="text-xs" style="color:var(--mute)">Pacing · ${evKindTxt(o.kind)}</div>${rows}${pc.note && !o.hr ? `<div class="mt-1 text-xs">${esc(pc.note)}</div>` : ''}<div class="mt-1 text-xs">${esc(trTxt(o.taper))}</div><div class="text-xs" style="color:var(--mute)">${evL('Richtwerte, abhängig von Feld, Strecke und Tagesform.', 'Guide values, depending on field, course and form on the day.')}</div></div></div>
      <div class="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="${esc(evL('Art des Events', 'Event type'))}">${Object.keys(EV_KIND).map(k => `<button class="${o.kind === k ? 'btn' : 'ghost'} !w-auto !px-3 !py-1.5 text-xs" style="min-height:44px" aria-pressed="${o.kind === k}" onclick="evQuickKind('${ja(o.id)}','${ja(k)}')">${evKindTxt(k)}</button>`).join('')}</div>`;
  }
  const extra = (e.note ? `<p class="mt-2 text-sm" style="overflow-wrap:anywhere">${esc(e.note)}</p>` : '') + (e.link && evLinkOk(e.link) ? `<p class="mt-1 text-sm"><a class="underline" style="color:var(--teal);overflow-wrap:anywhere" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">${evL('Ausschreibung', 'Event website')}</a></p>` : '');
  return `<article class="evcard panel p-3" data-noi18n data-ev="${esc(o.id)}" aria-label="${esc(e.name || o.name)}">${head}${facts}${pendUi}${cells}${extra}${typeof rzEvUi === 'function' ? rzEvUi(o) : ''}</article>`;
}
/* Art per Chip: planrelevant (Windschatten, Pacing), aber ohne Wirkung auf die Einheiten. Gleicher Weg wie das Formular. */
function evQuickKind(id, k){ const e = evGet(id, true); if (!e || e.kind === k) return; evOpen(id); evF.kind = k; evSave(); }
function evAddBtn(){ return `<div class="mt-3 flex flex-wrap gap-2" data-noi18n>${evBtn('evOpen(null)', `${ic('plus', 16)} ${evL('Event hinzufügen', 'Add event')}`, false)}</div>`; }
/* Wusstest du schon? → Event-Liste, Fokus auf den Stift des nächsten Events */
function dykEv(){ goPg('event'); goPg('ev-saison'); setTimeout(() => { try { const c = [...document.querySelectorAll('.evcard')].find(x => x.querySelector('[aria-label^="Event bearbeiten"], [aria-label^="Edit event"]')), b = c && c.querySelector('[aria-label^="Event bearbeiten"], [aria-label^="Edit event"]'); if (c) { c.scrollIntoView({block:'center'}); b.focus({preventScroll:true}); } } catch (x) { elog(x); } }, 60); }
