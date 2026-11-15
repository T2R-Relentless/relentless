/* ---------- F32 (TSS im Logbuch) und F33 (ältere Garmin-Fahrten importieren), 15.11.2026 ----------
   rideTss(r) ist die eine TSS-Rechnung für gefahrene Fahrten (Logbuch, Formkurve, Wochensummen, Rückblicke):
   - Leistung: TSS = Dauer_s × NP × IF / (FTP × 3600) × 100 mit IF = NP / FTP (Allen & Coggan, Training and Racing with a
     Power Meter). FTP = die am Fahrtdatum gültige FTP aus dem Verlauf (S.wf, F7, ergänzt um „FTP damals“).
   - Ohne Leistung: aus dem Durchschnittspuls im Verhältnis zum Schwellenpuls (loadEst, Bereichsgrenzen nach Coggan),
     gekennzeichnet als geschätzt (Puls).
   - Garmin-trainingStressScore nur als Rückfall, wenn weder Leistung noch Puls verwertbar sind.
   - Ältere Einträge ohne Quelle behalten ihren gespeicherten Wert ('alt'). Sonst keine TSS ('none').
   Bewertungen geplanter Einheiten behalten ihre damalige TSS. */
Object.assign(IC_P, {down:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'});
const TSS_SRC = {power:['gemessen (Leistung)', 'measured (power)'], hr:['geschätzt (Puls)', 'estimated (heart rate)'], garmin:['Garmin-Wert', 'Garmin value'], alt:['bisheriger Wert', 'previous value'], none:['keine Daten', 'no data']};
const tsL = (de, en) => wkL(de, en);
const tssSrcTxt = s => tsL(...(TSS_SRC[s] || TSS_SRC.none));
/* FTP am Fahrtdatum: letzter Eintrag im Verlauf bis zu diesem Tag; davor der erste Eintrag (als Schätzung gekennzeichnet) */
function ftpAt(day){
  let H = []; try { H = (wfHist() || []).filter(h => h && h.d && h.ftp > 0).slice().sort((a, b) => a.d.localeCompare(b.d) || (a.at || 0) - (b.at || 0)); } catch (e) { elog(e); }
  if (!H.length) { const f = (S.p && S.p.ftp) || (S.d && S.d.ftp) || 0; return {ftp:+f || 0, est:true, src:'cur'}; }
  let f = null; for (const h of H) { if (h.d <= day) f = h; else break; }
  return f ? {ftp:+f.ftp, est:false, src:f.back ? 'back' : 'wf'} : {ftp:+H[0].ftp, est:true, src:'first'};
}
function rideTss(r){
  if (!r) return {tss:0, src:'none'}; const day = r.day || r.d || '', sec = +r.sec || 0;
  if (!(sec > 0)) return {tss:0, src:'none'};
  if (+r.np > 0) { const f = ftpAt(day); if (f.ftp > 0) { const IF = r.np / f.ftp; return {tss:Math.round(sec * IF * IF / 36), src:'power', IF:Math.round(IF * 100) / 100, ftp:f.ftp, ftpEst:f.est, np:+r.np}; } }
  const hr = +(r.hrA || r.hr) || 0;
  if (hr > 0) { let le = null; try { le = loadEst(sec, {hrAvg:hr}); } catch (e) { elog(e); } if (le && le.src === 'hr') return {tss:le.tss, src:'hr', IF:le.IF}; }
  if (+r.gt > 0) return {tss:Math.round(+r.gt), src:'garmin'};
  if (!r.tssS && +r.tss > 0) return {tss:Math.round(+r.tss), src:'alt'};
  return {tss:0, src:'none'};
}
/* Alle gefahrenen Fahrten (laufende Liste, Einstiegs-Fahrten, Archiv mit Import), ohne Doppel (ID, Garmin-ID) */
function rideAll(){
  const out = [], ids = new Set(), gids = new Set();
  const push = r => { if (!r || !r.id || ids.has(r.id) || (r.gid && gids.has(String(r.gid)))) return; ids.add(r.id); if (r.gid) gids.add(String(r.gid)); out.push(r); };
  (S.man || []).forEach(a => push(a));
  (S.hist || []).forEach(a => push({...a, day:a.day || (a.ts || '').slice(0, 10)}));
  (S.arch || []).forEach(a => push({id:a.id, day:a.d, n:a.n, km:a.km, hm:a.hm, sec:a.sec, np:a.np, tss:a.tss, tssS:a.tssS, hr:a.hr, gt:a.gt, gid:a.gid, imp:a.imp, in:a.in, ts:a.ts}));
  return out;
}
/* Belastung einer Fahrt für die Formkurve: gemessen bzw. Puls; ohne beides das Empfinden aus der Bewertung (Session-RPE) */
function rideLoad(r, e){ const t = rideTss(r); if (t.src !== 'power' && e && e.rpe) { const l = loadEst(r.sec || e.sec, {hrAvg:+(r.hrA || r.hr) || e.hrAvg, rpe:e.rpe}); if (l) return l.tss; } return t.tss; }

/* ---------- F33: Import älterer Fahrten (nur Zusammenfassung) ---------- */
const IMP_RANGE = {3:91, 6:183, 12:365, all:0}, IMP_PAUSE = 800, IMP_WAIT = [15e3, 30e3, 60e3, 120e3, 240e3];
let impBusy = false, impMm = null;
const impSleep = ms => new Promise(r => setTimeout(r, ms));
function impKnown(){
  const s = new Set((S.gm && S.gm.ids) || []); [...(S.man || []), ...(S.hist || []), ...(S.arch || [])].forEach(a => { if (a && a.gid) s.add(String(a.gid)); }); return s;
}
/* Eine Zeile der Garmin-Liste prüfen und als Archiv-Eintrag anlegen. Rückgabe: 'add' | 'dup' | 'skip' | Typname (andere Sportart) */
function impRow(a, known){
  if (!a || a.activityId == null) return 'skip';
  const ty = typeof a.activityType === 'string' ? a.activityType : a.activityType && a.activityType.typeKey;
  if (!gmBike(ty)) return String(ty || 'unbekannt');
  const gid = String(a.activityId); if (known.has(gid)) return 'dup';
  const sec = Math.round(+a.movingDuration || +a.duration || 0), km = (+a.distance || 0) / 1000, indoor = rideIndoorTy(ty);
  if (sec < 300 || (!indoor && km < 1)) return 'skip';
  const loc = String(a.startTimeLocal || a.startTimeGMT || ''), day = loc.slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'skip';
  const gmt = String(a.startTimeGMT || '').replace(' ', 'T'), ts = gmt ? gmt + (/[zZ]|[+-]\d\d:?\d\d$/.test(gmt) ? '' : 'Z') : day + 'T12:00:00Z';
  const o = {id:'i' + gid, d:day, h:+(loc.slice(11, 13)) || null, n:String(a.activityName || 'Radfahrt').slice(0, 50), km:Math.round(km * 10) / 10, hm:Math.round(+a.elevationGain || 0), sec,
    np:Math.round(+a.normPower || 0), hr:Math.round(+a.averageHR || 0) || undefined, gt:+a.trainingStressScore > 0 ? Math.round(+a.trainingStressScore * 10) / 10 : undefined, gid, imp:1, ts, ...(indoor ? {in:1} : {})};
  if (+a.avgPower > 0) o.ap = Math.round(+a.avgPower);
  const t = rideTss({...o, day}); o.tss = t.tss; o.tssS = t.src;
  Object.keys(o).forEach(k => { if (o[k] === undefined) delete o[k]; });
  S.arch = S.arch || []; S.arch.push(o); known.add(gid); return 'add';
}
function impCtlNow(){ try { const R = vzRows(); if (!R) return null; const r = R.rows.find(x => x.day === R.today); return r ? Math.round(r.ctl) : null; } catch (e) { elog(e); return null; } }
function impEvForm(){ try { const F = seasonForecast(S.p).find(o => o.main); return F && F.form ? F.form : null; } catch (e) { return null; } }
function impStart(range){
  if (impBusy || !gmMode()) return; const days = IMP_RANGE[range]; if (days == null) return;
  S.imp = {st:'run', range:String(range), from:days ? iso(-days) : '2000-01-01', to:iso(0), next:0, n:0, dup:0, skip:0, other:{}, page:0, oldest:null, at:Date.now(), ctl0:impCtlNow(), ev0:impEvForm(), wait:0};
  save(); try { track('garmin-historie-import'); } catch (e) { elog(e); } impRun();
}
function impStop(){ if (S.imp && S.imp.st === 'run') { S.imp.st = 'pause'; save(); render(); } }
function impResume(){ if (!S.imp || impBusy) return; S.imp.st = 'run'; S.imp.err = ''; save(); impRun(); }
function impClose(){ if (!S.imp) return; S.imp.closed = 1; save(); render(); }
async function impRun(){
  if (impBusy || !S.imp) return; impBusy = true; render(); let tries = 0;
  try {
    while (S.imp && S.imp.st === 'run') {
      const I = S.imp; let p;
      try { p = await gmCall('list_activities', {start:I.next, limit:50, startDate:I.from, endDate:I.to}); tries = 0; I.wait = 0; }
      catch (e) {
        if (e && e.code === 'rate' && tries < IMP_WAIT.length) { I.wait = IMP_WAIT[tries]; tries++; save(); render(); await impSleep(I.wait); I.wait = 0; continue; }
        I.st = 'err'; I.err = (e && e.message) || tsL('Garmin ist gerade nicht erreichbar.', 'Garmin is not reachable right now.'); break;
      }
      if (S.imp !== I || I.st !== 'run') break;
      const rows = (p && p.activities) || [], known = impKnown();
      rows.forEach(a => { const r = impRow(a, known); if (r === 'add') I.n++; else if (r === 'dup') I.dup++; else if (r === 'skip') I.skip++; else I.other[r] = (I.other[r] || 0) + 1;
        const d = String(a.startTimeLocal || a.startTimeGMT || '').slice(0, 10); if (d && (!I.oldest || d < I.oldest)) I.oldest = d; });
      I.page++; const nx = p && p.nextStart != null ? p.nextStart : rows.length >= 50 ? I.next + 50 : null;
      if (nx == null || !rows.length) { I.st = 'done'; I.done = Date.now(); }
      else I.next = nx;
      if (S.arch) { S.arch.sort((a, b) => a.d.localeCompare(b.d)); if (S.arch.length > 4000) S.arch = S.arch.slice(-4000); }
      save(); render(); if (I.st === 'run') await impSleep(IMP_PAUSE);
    }
    if (S.imp && S.imp.st === 'done') { S.imp.ctl1 = impCtlNow(); S.imp.ev1 = impEvForm(); try { impPropCheck(); } catch (e) { elog(e); } save(); }
  } finally { impBusy = false; try { render(); } catch (e) { elog(e); } }
}
/* Fortschritt: Fahrten kommen neueste zuerst, deshalb Anteil aus dem ältesten erreichten Datum */
function impPct(I){ if (!I || !I.oldest) return 0; if (I.st === 'done') return 100; const a = dOnly(I.to) - dOnly(I.oldest), b = dOnly(I.to) - dOnly(I.range === 'all' ? (I.oldest < iso(-1460) ? I.oldest : iso(-1460)) : I.from); return Math.max(1, Math.min(99, Math.round(a / Math.max(1, b) * 100))); }
const impCount = I => I ? Math.round(I.n / Math.max(.01, impPct(I) / 100)) : 0;

/* „FTP damals“: Fahrten vor dem ersten Eintrag im FTP-Verlauf */
function impBefore(){ let H = []; try { H = (wfHist() || []).filter(h => h && h.d && h.ftp > 0).map(h => h.d).sort(); } catch (e) { elog(e); } const first = H[0] || iso(0);
  const L = (S.arch || []).filter(a => a.imp && a.d < first && +a.np > 0); return L.length ? {first, n:L.length, oldest:L[0].d} : null; }
function impFtpSug(from, to){ try { const b = mmBest(from, to)[mmIx(1200)]; if (b && b.w > 0) return {w:Math.round(b.w * .95 / 5) * 5, from:b.d}; } catch (e) { elog(e); }
  const m = Math.max(0, ...(S.arch || []).filter(a => a.d >= from && a.d < to && a.m20).map(a => a.m20)); return m ? {w:Math.round(m * .95 / 5) * 5} : null; }
let impFtpMsg = '';
function impFtpAdd(){
  const d = (document.getElementById('impFtpD') || {}).value, v = Math.round(wfNum((document.getElementById('impFtpV') || {}).value)), B = impBefore();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) { impFtpMsg = tsL('Bitte ein Datum wählen.', 'Please choose a date.'); return render(); }
  if (B && d >= B.first) { impFtpMsg = tsL(`Das Datum muss vor ${fmt(B.first)} liegen, ab dann gilt dein FTP-Verlauf.`, `The date must be before ${fmt(B.first)}; from then on your FTP history applies.`); return render(); }
  if (!(v >= 50 && v <= 600)) { impFtpMsg = tsL('Bitte eine FTP zwischen 50 und 600 W eintragen.', 'Please enter an FTP between 50 and 600 W.'); return render(); }
  wfHist(); const kg = (wfLast() || {}).kg || (S.p && S.p.weight) || 0;
  S.wf = [...S.wf, {d, at:0, ftp:v, kg, back:1}].sort((a, b) => a.d.localeCompare(b.d) || (a.at || 0) - (b.at || 0));
  impFtpMsg = tsL(`Gespeichert: ab ${fmt(d)} etwa ${v} W. Die TSS der Fahrten ab diesem Tag sind neu berechnet.`, `Saved: from ${fmt(d)} about ${v} W. TSS of rides from that day are recalculated.`);
  impReTss(); save(); render();
}
function impFtpSkip(){ S.imp = {...(S.imp || {}), ftpSkip:1}; save(); render(); }
/* Gespeicherte TSS der Archiv-Einträge nachziehen (gelesen wird ohnehin über rideTss; das hält Rückblicke und Sicherung aktuell) */
function impReTss(){ (S.arch || []).forEach(a => { if (!a.tssS && !a.imp) return; const t = rideTss({...a, day:a.d}); a.tss = t.tss; a.tssS = t.src; }); }

/* Info nach dem Import und Vorschlag zum Ausgangsumfang (F4: nur nach Zustimmung) */
function impHrsBefore(){ const p = S.p; if (!p || !p.start) return null; const from = addD(p.start, -42), L = rideAll().filter(r => r.day >= from && r.day < p.start);
  if (L.length < 4) return null; return Math.round(L.reduce((q, r) => q + (r.sec || 0), 0) / 3600 / 6 * 4) / 4; }
function impPropCheck(){
  const p = S.p; if (!p || !S.imp) return; const h = impHrsBefore(), cur = p.startH > 0 ? p.startH : 0;
  if (h == null || h < 1) return; const base = cur || hAv(p) * .7;
  if (Math.abs(h - base) / Math.max(1, base) > .3) S.imp.prop = {h, base:Math.round(base * 4) / 4, st:'open'};
}
function impPropAccept(){
  const P = S.imp && S.imp.prop; if (!P || P.st !== 'open') return;
  evSnap(tsL(`Ausgangsumfang auf ${hStd(P.h)} Std. pro Woche gesetzt.`, `Starting volume set to ${hStd(P.h)} h per week.`));
  S.p.startH = P.h; if (S.d) S.d.startH = P.h; try { _psC.clear(); _fpC.clear(); } catch (e) { elog(e); } evReplan(); P.st = 'ok';
  S.log = S.log || []; S.log.unshift({title:'Historie: Ausgangsumfang angepasst', day:-2, text:`Aus deinen Garmin-Fahrten der 6 Wochen vor dem Planstart: etwa ${hStd(P.h)} Std. pro Woche.`});
  save(); render();
}
function impPropNo(){ if (S.imp && S.imp.prop) S.imp.prop.st = 'no'; save(); render(); }

/* ---------- Bestwerte (F26) und VO2max (F27) aus der Historie nachladen: Fahrten mit Leistung der letzten 12 Monate, gedrosselt, still ----------
   Älteste zuerst: Die VO2max-Schätzung „aus einer Fahrt“ zählt nur bei einem neuen 5-min-Bestwert der 8 Wochen davor (vo2FromRide).
   Dafür müssen die älteren Fahrten ihre Bestwerte schon haben. S.vo2h merkt sich, welche Fahrten schon geprüft sind. */
const impVo2Done = id => !!(S.vo2h && S.vo2h[id]);
function impMmList(){ return typeof mmTodo === 'function' ? mmTodo() : []; }
/* VO2max aus einer nachgeladenen Fahrt: dieselbe Prüfung wie beim Einlesen (5-min-Test nach Sitko et al. 2022), still übernommen */
function impVo2(a, r){ S.vo2h = S.vo2h && typeof S.vo2h === 'object' ? S.vo2h : {}; let e = null; try { e = vo2FromRide({id:a.id, day:a.d, n:a.n}, r); } catch (er) { elog(er); } S.vo2h[a.id] = 1; return e; }
async function impMmRun(){
  if (impMm || !gmMode()) return; const L = impMmList(); if (!L.length) return; impMm = {i:0, n:L.length, stop:false, err:'', v:0}; render();
  let tries = 0;
  for (let k = 0; k < L.length && !impMm.stop; k++) {
    const a = L[k];
    try { const {r} = await gmRide({id:a.gid, n:a.n}); if (!(S.mm && S.mm[a.id] && S.mm[a.id].s === 'f')) { const rec = mmCalc(r); if (rec) mmPut(a.id, rec, {d:a.d, n:a.n}); else S.mm[a.id] = {...(S.mm[a.id] || {d:a.d, n:String(a.n || '').slice(0, 50), v:MM_D.map(() => 0), o:null, s:'a'}), nf:1}; } if (impVo2(a, r)) impMm.v++; tries = 0; }
    catch (e) { if (e && e.code === 'rate' && tries < IMP_WAIT.length) { await impSleep(IMP_WAIT[tries++]); k--; continue; } if (e instanceof GmErr && e.code !== 'tool') { impMm.err = e.message; break; } }
    impMm.i = k + 1; if (k % 5 === 4) save(); render(); await impSleep(2000);
  }
  const done = impMm; impMm = null; S.imp = {...(S.imp || {}), vo2n:((S.imp && S.imp.vo2n) || 0) + done.v, vo2At:Date.now(), ...(done.err ? {mmErr:done.err} : {})}; save(); render();
}
function impMmStop(){ if (impMm) impMm.stop = true; }

/* ---------- Anzeige ---------- */
const impBtn = (fn, l, main) => `<button class="${main ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}">${l}</button>`;
let impRange = '3';
function impCard(){
  if (!gmMode()) return '';
  const I = S.imp, run = I && I.st === 'run', bar = p => `<div class="mt-2" style="height:8px;background:var(--line)" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><div style="height:8px;width:${p}%;background:var(--teal)"></div></div>`;
  const opts = [['3', tsL('3 Monate (empfohlen)', '3 months (recommended)')], ['6', tsL('6 Monate', '6 months')], ['12', tsL('12 Monate', '12 months')], ['all', tsL('Alles', 'Everything')]];
  let body = '';
  if (run || (I && (I.st === 'pause' || I.st === 'err') && !I.closed)) {
    const pct = impPct(I), est = impCount(I);
    body = `<p class="mt-2 text-sm font-semibold" aria-live="polite">${tsL(`${I.n} Fahrten übernommen${est > I.n ? `, ca. ${est} insgesamt` : ''}`, `${I.n} rides imported${est > I.n ? `, about ${est} in total` : ''}`)}${I.oldest ? tsL(` · zurück bis ${fmt(I.oldest)}`, ` · back to ${fmt(I.oldest)}`) : ''}</p>${bar(pct)}
      ${I.wait ? `<p class="mt-1 text-xs" style="color:var(--mute)">${tsL(`Garmin bremst gerade. Die App wartet ${Math.round(I.wait / 1000)} Sek. und macht dann weiter.`, `Garmin is throttling. The app waits ${Math.round(I.wait / 1000)} s and then continues.`)}</p>` : ''}
      ${I.st === 'err' ? `<p class="mt-1 text-sm" style="color:#c0392b">${esc(I.err || '')}</p>` : ''}${I.st === 'pause' ? `<p class="mt-1 text-sm">${tsL('Unterbrochen. Beim Fortsetzen macht die App dort weiter, wo sie stand.', 'Interrupted. When you continue, the app picks up where it left off.')}</p>` : ''}
      <div class="mt-2 flex flex-wrap gap-2">${run ? impBtn('impStop()', tsL('Anhalten', 'Pause')) : impBtn('impResume()', tsL('Fortsetzen', 'Continue'), true) + impBtn('impClose()', tsL('Beenden', 'Stop'))}</div>
      <p class="mt-1 text-xs" style="color:var(--mute)">${tsL('Läuft weiter, während du die App nutzt. Nur die Zusammenfassung je Fahrt wird geladen.', 'Keeps running while you use the app. Only the summary of each ride is loaded.')}</p>`;
  } else {
    const done = I && I.st === 'done' && !I.closed ? `<div class="mt-2 p-2.5 text-sm" style="background:var(--tint);border:1px solid var(--line)"><p class="font-semibold">${tsL(`${I.n} ältere Fahrten übernommen.`, `${I.n} older rides imported.`)}</p><p class="text-xs" style="color:var(--mute)">${tsL(`${I.dup} schon vorhanden, ${I.skip} Fehlaufzeichnungen (unter 5 Min. oder unter 1 km) übersprungen${Object.keys(I.other).length ? `, ${Object.values(I.other).reduce((q, v) => q + v, 0)} andere Sportarten nicht übernommen` : ''}.`, `${I.dup} already present, ${I.skip} faulty recordings (under 5 min or under 1 km) skipped${Object.keys(I.other).length ? `, ${Object.values(I.other).reduce((q, v) => q + v, 0)} other sports not imported` : ''}.`)}</p></div>` : '';
    body = `${done}<div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="${esc(tsL('Zeitraum', 'Period'))}">${opts.map(([k, l]) => `<button class="${impRange === k ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" role="radio" aria-checked="${impRange === k}" onclick="impRange='${k}';render()">${l}</button>`).join('')}</div>
      <div class="mt-2">${impBtn(`impStart('${ja(impRange)}')`, tsL('Ältere Fahrten importieren', 'Import older rides'), true)}</div>`;
  }
  const n = impMmList().length, mm = impMm ? `<p class="mt-2 text-sm" aria-live="polite">${tsL(`Bestwerte und VO2max: ${impMm.i} von ${impMm.n} Fahrten${impMm.v ? `, ${impMm.v} VO2max-Schätzungen` : ''}`, `Best efforts and VO2max: ${impMm.i} of ${impMm.n} rides${impMm.v ? `, ${impMm.v} VO2max estimates` : ''}`)}</p>${bar(Math.round(impMm.i / Math.max(1, impMm.n) * 100))}<div class="mt-2">${impBtn('impMmStop()', tsL('Anhalten', 'Pause'))}</div>`
    : n && !run ? `<div class="mt-3" style="border-top:1px solid var(--line);padding-top:10px"><p class="text-sm">${tsL(`Für ${n} Fahrten kann die App Bestwerte (Leistungsprofil) und VO2max vollständig nachrechnen. Dafür holt sie jede Fahrt einzeln, etwa 2 Sek. je Fahrt, die älteste zuerst.`, `For ${n} rides the app can calculate best efforts (power profile) and VO2max in full. It fetches each ride individually, about 2 s per ride, oldest first.`)}</p><div class="mt-2">${impBtn('impMmRun()', tsL('Bestwerte und VO2max nachrechnen', 'Calculate best efforts and VO2max'))}</div></div>` : '';
  const vInfo = !impMm && S.imp && S.imp.vo2At ? `<p class="mt-2 text-sm" role="status">${S.imp.vo2n ? tsL(`${S.imp.vo2n} VO2max-${S.imp.vo2n === 1 ? 'Schätzung' : 'Schätzungen'} aus der Historie übernommen.`, `${S.imp.vo2n} VO2max ${S.imp.vo2n === 1 ? 'estimate' : 'estimates'} taken from your history.`) : tsL('In der Historie war keine Fahrt, aus der sich die VO2max schätzen lässt (5 Min. am Anschlag mit passendem Puls).', 'No ride in your history allows a VO2max estimate (5 min all-out with matching heart rate).')} ${S.imp.vo2n ? `<button class="underline" style="color:var(--teal);background:none;border:0;min-height:44px" onclick="goPg('state');goPg('svo2')">${tsL('VO2max ansehen', 'View VO2max')}</button>` : ''}</p>` : '';
  return `<div class="mt-4" data-noi18n id="imp-card" style="border-top:1px solid var(--line);padding-top:12px"><p class="font-semibold">${tsL('Ältere Fahrten importieren', 'Import older rides')}</p><p class="mt-1 text-sm" style="color:var(--mute)">${tsL('Damit Fitness und Formkurve von Anfang an stimmen. Die Fahrten erscheinen im Logbuch als „importiert“, ohne Bewertung und ohne Einfluss auf den Plan.', 'So that fitness and the fitness curve are right from the start. The rides appear in the logbook as “imported”, without evaluation and without effect on the plan.')}</p>${body}${mm}${vInfo}${impFtpUi()}${impInfoUi()}</div>`;
}
function impFtpUi(){
  const B = impBefore(); if (!B || (S.imp && S.imp.ftpSkip)) return ''; const sug = impFtpSug(B.oldest, B.first);
  return `<div class="mt-3 p-2.5 text-sm" style="border:1px solid var(--line);border-left:3px solid #d9a400"><p class="font-semibold">${tsL('Wie hoch war deine FTP damals ungefähr?', 'Roughly what was your FTP back then?')}</p><p class="mt-1 text-xs" style="color:var(--mute)">${tsL(`${B.n} importierte Fahrten mit Leistung liegen vor ${fmt(B.first)}, dem Beginn deines FTP-Verlaufs. Ohne Angabe rechnet die App ihre TSS mit deiner ersten eingetragenen FTP und kennzeichnet sie als Schätzung. Mehrere Einträge sind möglich.`, `${B.n} imported rides with power are before ${fmt(B.first)}, the start of your FTP history. Without input the app calculates their TSS with your first entered FTP and marks them as estimated. Several entries are possible.`)}</p>
    ${sug ? `<p class="mt-1 text-xs">${tsL(`Vorschlag aus deinem besten 20-Min.-Wert in diesem Zeitraum (95 %): etwa ${sug.w} W.`, `Suggestion from your best 20-min power in that period (95 %): about ${sug.w} W.`)}</p>` : ''}
    <div class="mt-2 grid grid-cols-2 gap-2">${field(tsL('Ab Datum', 'From date'), `<input id="impFtpD" type="date" class="inp" style="min-height:44px" value="${esc(B.oldest)}" max="${esc(addD(B.first, -1))}">`)}${field('FTP (W)', `<input id="impFtpV" type="text" inputmode="numeric" class="inp" style="min-height:44px" value="${esc(sug ? sug.w : '')}">`)}</div>
    ${impFtpMsg ? `<p class="mt-1 text-xs" role="status">${esc(impFtpMsg)}</p>` : ''}<div class="mt-2 flex flex-wrap gap-2">${impBtn('impFtpAdd()', tsL('Speichern', 'Save'), true)}${impBtn('impFtpSkip()', tsL('Aktuelle FTP verwenden', 'Use current FTP'))}</div></div>`;
}
function impInfoUi(){
  const I = S.imp; if (!I || I.st !== 'done' || I.infoSeen) return ''; const sg = v => (v > 0 ? '+' : '') + v;
  const fit = I.ctl1 != null ? tsL(`Mit deiner Historie: Fitness heute ${I.ctl1}${I.ctl0 != null ? ` (vorher ${I.ctl0})` : ''}.`, `With your history: fitness today ${I.ctl1}${I.ctl0 != null ? ` (before ${I.ctl0})` : ''}.`) : '';
  const ev = I.ev1 ? tsL(` Form am Renntag ${sg(I.ev1.tsb)} bei Fitness ${I.ev1.ctl}${I.ev0 ? ` (vorher ${sg(I.ev0.tsb)} bei ${I.ev0.ctl})` : ''}.`, ` Form on race day ${sg(I.ev1.tsb)} at fitness ${I.ev1.ctl}${I.ev0 ? ` (before ${sg(I.ev0.tsb)} at ${I.ev0.ctl})` : ''}.`) : '';
  const P = I.prop, prop = P && P.st === 'open' ? `<div class="mt-2 p-2.5" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><p><b>${tsL('Vorschlag', 'Suggestion')}:</b> ${tsL(`In den 6 Wochen vor dem Planstart bist du etwa ${hStd(P.h)} Std. pro Woche gefahren. Der Plan geht von ${hStd(P.base)} Std. aus. Den Ausgangsumfang auf ${hStd(P.h)} Std. setzen? Das ändert den Aufbau der kommenden Wochen.`, `In the 6 weeks before the plan start you rode about ${hStd(P.h)} h per week. The plan assumes ${hStd(P.base)} h. Set the starting volume to ${hStd(P.h)} h? This changes the build-up of the coming weeks.`)}</p><p class="mt-1 text-xs" style="color:var(--mute)">${tsL('Geändert wird erst, wenn du zustimmst. Vorher legt die App einen Schnappschuss an, danach kannst du es rückgängig machen.', 'Nothing changes until you agree. The app saves a snapshot first, and you can undo it afterwards.')}</p><div class="mt-2 flex flex-wrap gap-2">${impBtn('impPropAccept()', tsL('Annehmen', 'Accept'), true)}${impBtn('impPropNo()', tsL('Ablehnen', 'Decline'))}</div></div>` : '';
  return fit || ev || prop ? `<div class="mt-3 p-2.5 text-sm" role="status" style="background:var(--tint);border:1px solid var(--line)"><p>${fit}${ev}</p>${prop}<div class="mt-2">${impBtn("S.imp.infoSeen=1;save();render()", tsL('Verstanden', 'Got it'))}</div></div>` : '';
}
/* Nach einem App-Neustart: ein laufender Import ist unterbrochen und wartet auf „Fortsetzen“ */
try { if (S && S.imp && S.imp.st === 'run') S.imp.st = 'pause'; } catch (e) { elog(e); }
/* Wochen mit Fahrten (für den optionalen Schritt im Assistenten) */
function impWeeks(){ const L = rideAll().map(r => r.day).filter(Boolean).sort(); return L.length ? Math.round((dOnly(iso(0)) - dOnly(L[0])) / 6048e5) : 0; }
/* Wusstest du schon? → Import-Karte bzw. TSS-Umschalter der Logbuch-Grafik */
function dykImp(){ navGo('more'); goPg('settings'); goPg('set-gm'); setTimeout(() => { try { const e = document.getElementById('imp-card'); if (e) { e.scrollIntoView({block:'center'}); const b = e.querySelector('.btn'); if (b) b.focus({preventScroll:true}); } } catch (x) { elog(x); } }, 60); }
function dykTss(){ lbCh.met = 'tss'; navGo('logbook'); setTimeout(() => { try { const e = document.getElementById('lb-chart'); if (e) { e.scrollIntoView({block:'start'}); const b = [...e.querySelectorAll('button')].find(x => x.textContent.trim() === 'TSS'); if (b) b.focus({preventScroll:true}); } } catch (x) { elog(x); } }, 60); }
