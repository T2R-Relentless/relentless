/* ---------- F39 (18b): Persönlicher Coach, Teil 2: Regeln → Knopf (coach-bausteine §1) ----------
   coRule(pack) wählt die erste zutreffende Regel nach Rang (V-1) und höchstens einen Vorschlag (V-2). Knöpfe rufen nur
   vorhandene Funktionen auf: feelDay, easyDay, addRecW, reentGo, mvAskGo (aus dem Coach ohne „beide an einem Tag“, V4).
   Ruhetag: nur R0, R1, R2 (V-3), Ausnahme R10b („heute frei“ steht ausdrücklich in R10b). Eventtag, Aktivierung,
   Tapering: nur R0 und R3, R3 dort ohne Knopf (V-4). Ab welchem Datentag R2, R4, R6 gelten: §2 mit Entscheidung C. */
const CO_KN = {
  rest:'Heute Ruhetag', ok:'Heute geht es wieder', ack:'Verstanden', reent:'Wiedereinstieg einplanen', recw:'Erholungswoche einlegen',
  mv:'Auf einen anderen Tag legen', light:'Heute etwas leichter', easy:'Heute locker statt hart', mvtest:'Fitness-Check verschieben',
  mvmiss:'Verpasste Einheit verlegen', feel:'Wie fühlst du dich heute?', keep:'Plan so lassen'};
/* Knöpfe, die den Plan ändern (bzw. den Verschiebe-Dialog öffnen): höchstens einer pro Tag */
const CO_PLAN = ['rest', 'reent', 'recw', 'mv', 'light', 'easy', 'mvtest', 'mvmiss'];
function coRule(pk){
  if (!pk) return null;
  const I = pk._i, e = pk.einheit, dt = pk.datentage, w = pk.wetter, ill = I.ill, t = I.t, x = S.plan[t] || {};
  const R = (id, kn, o) => ({id, kn:kn || null, calm:false, ...(o || {})});
  /* R0: krank, erkältet, verletzt (ruhiger Modus) */
  if (ill.lv === 'sick') return R('R0k', 'ack', {calm:true});
  if (ill.inj || (x.feel === 'inj' && !ill.injOk)) return R('R0v', e && !I.xAd ? 'rest' : null, {calm:true, kn2:'ok', wann:ill.inj ? ill.wann : 0});
  if (ill.lv === 'neck') return R('R0e', 'ack', {calm:true});
  /* VL-4: erste Fahrt nach „Heute geht es wieder“ besser locker */
  if (ill.injOk && e && e.hart && !e.test && !e.eventTag && !I.xAd) return R('VL4', 'easy');
  const lim = I.evDay || I.taper;
  /* R1: Pause ab 7 Tagen (gapInfo prüft Planlaufzeit, Urlaub, bereits beantwortet) */
  if (!lim && I.gap) return R('R1', 'reent', {calm:true, lage:I.gap.g});
  /* R2: mindestens zwei Überlastungszeichen, ab Tag 14, nächste Woche noch keine Erholungswoche */
  if (!lim && dt >= 14 && I.ovl.length >= 2 && !((S.p.recW || []).includes(S.wk + 1)) && !(S.ovlSeen && S.ovlSeen > iso(-7))) return R('R2', 'recw', {calm:true});
  const yd = I.yd;
  if (!e) {
    /* R10b auch am freien Tag (E-R10b: „heute ist frei geplant“) */
    const r10 = coR10(pk); if (r10 && r10.id === 'R10b') return r10;
    return R('RT', null);
  }
  /* R3: Gewitter oder Sturmböen, nur draußen, nur mit frischer Vorhersage (W-6) */
  if (e.draussen && w && w.src === 'api' && I.wxOk && ((w.boeen != null && w.boeen >= 60) || w.gewitter === true)) return R('R3', I.evDay ? null : 'mv', {wx:true});
  if (lim) return R(I.evDay ? 'EV' : 'TP', null);
  /* R4: auffällige Morgenwerte vor harter oder langer Einheit (Tag 0–6: nur Schlaf) */
  const mk = dt < 7 ? pk.morgen.k.filter(k => k === 'sleep') : pk.morgen.k;
  if ((e.hart || e.lang) && !I.xAd && mk.length) {
    if (e.test) return R('R4c', 'mvtest', {mk});
    if (mk.length >= 2 || ['tired', 'heavy'].includes(pk.befinden)) return R('R4b', 'easy', {mk});
    return R('R4a', 'light', {mk});
  }
  /* R5: Befinden schon eingetragen und angepasst */
  if (['tired', 'heavy'].includes(pk.befinden) && I.xAd) return R('R5', null);
  /* R6: Form sehr niedrig (Zahl nur intern), ab Tag 84 (Entscheidung C), ohne Datenlücke, nicht in der Erholungswoche */
  const f = pk.form;
  if (f && f.frische != null && dt >= 84 && !I.lucke && !I.rec && HARD.includes(e.t) && !I.xAd && (f.frische < -30 || (f.frische < -25 && (pk.morgen.n > 0 || pk.befinden === 'tired' || I.lastUnder)))) return R('R6', 'easy');
  /* R7: harter Vortag, heute hart */
  if (yd.hard && HARD.includes(e.t) && !I.xAd) return yd.prop ? R('R7p', null, {why:yd.hard}) : R('R7', 'easy', {why:yd.hard});
  /* R8: Hitze ab 28 °C vor harter/langer Einheit oder Check */
  if (w && w.src === 'api' && w.tmax >= HEAT_T && (e.hart || e.lang || e.test)) return R('R8', 'mv', {wx:true});
  /* R9: Kälte oder Nässe bei Kälte, draußen: nur Hinweis */
  if (e.draussen && w && w.gefuehlt != null && (w.gefuehlt < 3 || (w.nass && w.gefuehlt < 5))) return R('R9', null, {wx:true});
  /* R10: gestern verpasst */
  const r10 = coR10(pk); if (r10) return r10;
  /* R5a: kein Befinden eingetragen (nur Frage, kein Vorschlag) */
  if (!pk.befinden && !S.done[t]) return R('R5a', 'feel');
  return R('OK', null);
}
function coR10(pk){
  const I = pk._i, yd = I.yd, t = I.t, e = pk.einheit; if (!yd.miss || !yd.sameWeek || t < 1) return null;
  if (!yd.missHard) return e ? {id:'R10a', kn:null, calm:false} : null;
  if (yd.test || yd.miss2 || I.r10w === S.wk || I.ill.injOk || (e && (paHard(S.plan[t]) || e.test))) return null;
  try { if (mvCheck(t - 1, t, 'swap').warns.length) return null; } catch (er) { elog(er); return null; }
  return {id:'R10b', kn:'mvmiss', calm:false, frei:!e};
}
/* Karten mit derselben Regel ausblenden (Entscheidung D) */
let coMemo = null;
const coOn = () => !!(S.coach && S.coach.on);
function coPrep(){ coMemo = null; if (!coOn() || !S.p || !hasStarted(S.p)) return null; try { const pk = coPack(); coMemo = {pk, r:coRule(pk)}; } catch (e) { elog(e); coMemo = null; } return coMemo; }
const coHide = id => { try { return !!(coMemo && coMemo.r && (coMemo.r.id === id || (id === 'R4' && /^R4/.test(coMemo.r.id)))); } catch (e) { elog(e); return false; } };
/* Knopf beim Tipp: Regel neu prüfen (V2), Schnappschuss vorher (V1), Herkunft Coach markieren (B3) */
function coTake(kn){
  const pk = coPack(), r = coRule(pk), t = todayIdx(), today = iso(0);
  S.coach = S.coach || {on:false};
  if (!r || (r.kn !== kn && r.kn2 !== kn && kn !== 'keep')) { coMsg = 'Der Vorschlag ist nicht mehr aktuell.'; return render(); }
  const plan = CO_PLAN.includes(kn);
  if (plan && pk._i.act && !/^R0/.test(r.id)) { coMsg = 'Der Vorschlag ist nicht mehr aktuell.'; return render(); }
  coMsg = '';
  if (kn === 'feel') { heroTab = 'feel'; render(); try { dykFocus(null, '.feelb'); } catch (e) { elog(e); } return; }
  S.coach.act = {d:today, r:r.id, k:kn};
  const snap = () => { let u = null; try { bkPre('Vom Coach vorgeschlagen: ' + CO_KN[kn]); u = bkUndo; } catch (e) { elog(e); } return u; }, keepU = u => { if (u) bkUndo = u; };
  if (kn === 'keep' || kn === 'ack') { if (r.id === 'R2') S.ovlSeen = iso(0); save(); return render(); }
  if (kn === 'ok') { S.coach.inj = {...(S.coach.inj || {}), ok:today}; save(); return render(); }
  if (kn === 'rest') { const u = snap(); feelDay(t, 'inj'); keepU(u); render(); return; }
  if (kn === 'light') { const u = snap(); feelDay(t, 'tired'); if (S.plan[t]) { S.plan[t].coSrc = 1; save(); } keepU(u); render(); return; }
  if (kn === 'easy') { const u = snap(); easyDay(t); if (S.plan[t]) { S.plan[t].coSrc = 1; save(); } keepU(u); render(); return; }
  if (kn === 'recw') { S.ovlSeen = iso(0); const u = snap(); addRecW(); keepU(u); render(); return; }
  if (kn === 'reent') { const u = snap(); reentGo(); keepU(u); render(); return; }
  if (kn === 'mv' || kn === 'mvtest' || kn === 'mvmiss') { if (kn === 'mvmiss') S.coach.r10w = S.wk; save(); mvAskGo(kn === 'mvmiss' ? t - 1 : t); if (mvAsk) { mvAsk.co = 1; render(); } return; }
  render();
}
let coMsg = '';
