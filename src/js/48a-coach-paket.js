/* ---------- F39 (18b): Persönlicher Coach ohne Server, Teil 1: Datenpaket v1 ----------
   Fachliche Vorgabe: claude/coach-bausteine.md (§0–§7, Entscheidungen A–D), Paket nach coach-konzept-technik.md §1.
   coPack() sammelt nur Werte, die die App schon rechnet (vzRows, vzDaily, ovlSignals, morStat, gapInfo,
   wxDay, whSum, phases), ohne Gewicht, Alter, Geschlecht, Ort, Datum, FTP in Watt und ohne Rohdaten. Das Paket hat
   dieselbe Form, die in 18c an den Server ginge; was nur die Regeln brauchen, liegt unter _i und würde nicht gesendet.
   Form und Fitness bleiben Zahlen im Paket (Auswahl der Sätze, R6), im Text erscheinen sie nie (§6.1). */
const CO_WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const coDay = d => { try { return Math.floor(dOnly(d) / 864e5); } catch (e) { elog(e); return 0; } };
const coR = (v, k) => v == null || !isFinite(v) ? null : Math.round(v * (k || 1)) / (k || 1);
/* Einheit an einem Datum: laufende Woche aus S.plan, Vorwoche aus S.prevPlan */
function coAt(ds){
  const p = S.p; if (!p || !p.start || !S.plan) return null;
  const d0 = wkStart(p, S.wk), k = ddiff(d0, ds);
  if (k >= 0 && k < 7) return {x:S.plan[k], o:pOrig(S.plan, k), done:!!(S.done && S.done[k]) || !!(S.actual && S.actual[k]) || !!(p.exe || {})[S.wk + '-' + k], blk:!!(S.blocked && S.blocked[k]), w:S.wk, i:k};
  const pp = S.prevPlan; if (pp && pp.w === S.wk - 1 && k >= -7 && k < 0) { const i = k + 7, P = pp.plan || []; return {x:P[i], o:pOrig(P, i), done:!!(pp.done || {})[i] || !!(p.exe || {})[pp.w + '-' + i], blk:false, w:pp.w, i}; }
  return null;
}
const coFeelAt = ds => { const a = coAt(ds); return a && a.x ? a.x.feel || null : null; };
/* Datentage: seit der ältesten Fahrt oder erledigten Einheit (Garmin-Import zählt mit), nicht seit Planstart (§2) */
function coDataDays(){
  try { const k = Object.keys(vzDaily() || {}).filter(d => d <= iso(0)).sort(); return k.length ? Math.max(0, ddiff(k[0], iso(0))) : 0; } catch (e) { elog(e); return 0; }
}
/* Planerfüllung: letzte 7 Tage einzeln, 28 Tage aus laufender Woche und den Wochenrückblicken (Pendeln zählt nicht, F30) */
function coErf(){
  const p = S.p, out = {n7:0, d7:0, n28:0, d28:0}; if (!p) return out;
  for (let k = 1; k <= 7; k++) { const a = coAt(iso(-k)); if (!a || !a.o || !(a.o.m > 0) || a.o.t === 'com' || a.blk) continue; out.n7++; if (a.done) out.d7++; }
  try { const t = todayIdx(); for (let i = 0; i < t; i++) { const o = pOrig(S.plan, i); if (!o || !(o.m > 0) || o.t === 'com') continue; out.n28++; if (S.done[i] || (S.actual && S.actual[i])) out.d28++; }
    for (let w = S.wk - 1; w >= Math.max(1, S.wk - 3); w--) { const r = (p.wh || {})[w]; if (r && r.n > 0) { out.n28 += r.n; out.d28 += Math.min(r.n, r.nd || 0); } } } catch (e) { elog(e); }
  return out;
}
/* Gestern: verpasst, hart (über Soll, Zusatzfahrt, IF ≥ 0,85, Empfinden ≥ 7), offener Vorschlag nach Zusatzfahrt */
function coYesterday(){
  const p = S.p, y = iso(-1), a = coAt(y), o = {miss:false, missHard:false, miss2:false, hard:'', titel:'', i:a ? a.i : null, sameWeek:!!a && a.w === S.wk, prop:false};
  if (!p) return o;
  const exs = Object.values(p.exe || {}).filter(e => e && e.day === y), xs = Object.values(p.extra || {}).filter(e => e && e.day === y);
  const ride = a && a.o && a.o.m > 0 && a.o.t !== 'rest' && a.o.t !== 'com';
  const ill = f => f === 'sick' || f === 'neck' || f === 'inj';
  if (ride && !a.done && !a.blk && !exs.length && !vacOn(p, y) && !ill(a.x && a.x.feel)) {
    o.miss = true; o.missHard = paHard(a.o) || a.o.t === 'test'; o.titel = a.o.n || ''; o.test = a.o.t === 'test';
    const b = coAt(iso(-2)); o.miss2 = !!(b && b.o && b.o.m > 0 && b.o.t !== 'rest' && b.o.t !== 'com' && !b.done && !b.blk);
  }
  const ftp = p.ftp || 0;
  if (exs.some(e => e.verdict === 'over' && e.x && !HARD.includes(e.x.t) && e.x.t !== 'long')) o.hard = 'over';
  else if (xs.length) o.hard = 'extra';
  else if (exs.some(e => (e.rpe || 0) >= 7 || (e.hasP && ftp > 0 && e.np / ftp >= .85))) o.hard = 'hard';
  try { o.prop = Object.values(p.extra || {}).some(e => e && e.prop && paLive(e.prop)); } catch (e) { elog(e); }
  return o;
}
/* Krank, erkältet, verletzt: heute oder kürzlich (R0) */
function coIll(){
  const p = S.p, t0 = iso(0), out = {lv:null, wann:null}; if (!p) return out;
  for (let k = 0; k <= 2; k++) { const f = coFeelAt(iso(-k)); if (f === 'sick' || f === 'neck') { out.lv = out.lv === 'sick' ? 'sick' : f; } }
  try { const c = p.sickNext; if (c && c.w === S.wk && (c.d || []).includes(todayIdx()) && !out.lv) out.lv = c.lv === 'neck' ? 'neck' : 'sick'; } catch (e) { elog(e); }
  /* verletzt: letzter Eintrag höchstens 14 Tage her und danach kein „Heute geht es wieder“ (Entscheidung B) */
  const inj = (S.coach && S.coach.inj) || {}; let last = inj.last || null;
  for (let k = 0; k <= 14; k++) { if (coFeelAt(iso(-k)) === 'inj') { if (!last || iso(-k) > last) last = iso(-k); break; } }
  if (last && last <= t0 && ddiff(last, t0) <= 14 && !(inj.ok && inj.ok >= last)) { out.inj = last; out.wann = ddiff(last, t0); }
  out.injOk = inj.ok && ddiff(inj.ok, t0) <= 1 && ddiff(inj.ok, t0) >= 0 ? inj.ok : null;
  return out;
}
function coInjMark(ds){ S.coach = S.coach || {on:false}; S.coach.inj = {...(S.coach.inj || {}), last:ds}; }

function coPack(){
  const p = S.p; if (!p || !S.plan || !hasStarted(p)) return null;
  const L = lang(), t = todayIdx(), today = iso(0), x = S.plan[t] || REST, o = pOrig(S.plan, t) || x, c = S.coach || {};
  const ph = (() => { try { return phases(p); } catch (e) { elog(e); return []; } })(), P = ph.find(q => S.wk >= q.from && S.wk <= q.to) || ph[ph.length - 1] || {};
  const ride = x.m > 0 && x.t !== 'rest', evDay = x.t === 'race' || /^(Eventtag|Aktivierung)/.test(x.n || ''), ev = p.goal === 'event' && p.eventDate;
  const evTy = (() => { try { const r = evProfile(p); return r ? r.ty : null; } catch (e) { elog(e); return null; } })();
  /* Form und Fitness aus der Formkurve (vzRows), Zahlen bleiben im Paket */
  let form = null; try { const R = vzRows(); if (R) { const at = d => R.rows.find(r => r.day === d); const a = at(today), m = at(iso(1)), b28 = at(iso(-28)), b56 = at(iso(-56)), e = ev ? at(p.eventDate) : null;
    if (a) form = {fitness:coR(a.ctl), fitnessVor28Tagen:b28 ? coR(b28.ctl) : null, fitnessVor56Tagen:b56 ? coR(b56.ctl) : null, ermuedung:coR(a.atl), frische:coR(a.tsb), frischeMorgen:m ? coR(m.tsb) : null, formAmEvent:e ? coR(e.tsb) : null}; } } catch (e) { elog(e); }
  const dt = coDataDays(), erf = coErf(), yd = coYesterday(), ill = coIll();
  let wx = null; try { const w = ride ? wxDay(today, t, x) : null; if (w) wx = w.src === 'api' ? {tempC:coR(w.tmax >= HEAT_T ? w.tmax : w.tavg), tmax:coR(w.tmax), gefuehlt:coR(w.eff), regenProzent:coR(w.p), wind:w.wnd >= 30 ? 'stark' : w.wnd >= 15 ? 'mäßig' : 'schwach', boeen:w.gust == null ? null : coR(w.gust), gewitter:w.storm, wxVon:w.sh, wxBis:Math.min(24, w.eh), nass:!!w.wet, frisch:!!(S.wxData && Date.now() - S.wxData.at <= 3 * 36e5), src:'api'} : {gefuehlt:coR(w.eff), nass:!!w.wet, src:'man'}; } catch (e) { elog(e); }
  let mor = {n:0, k:[]}; try { const st = morStat(); if (st.today && st.hrBase && st.today.hr >= st.hrBase + 5) mor.k.push('hr'); if (st.hrvLow) mor.k.push('hrv'); if (st.today && st.today.sleep === 'bad') mor.k.push('sleep'); mor.n = mor.k.length; } catch (e) { elog(e); }
  let ovl = []; try { ovl = ovlSignals(); } catch (e) { elog(e); }
  let gap = null; try { gap = gapInfo(); } catch (e) { elog(e); }
  let zeit = null; try { const sw = typeof strWeek !== 'undefined' ? strWeek : null, cur = whSum(p, S.wk, S.plan, S.done || {}, S.actual || {}); try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); } const lw = (p.wh || {})[S.wk - 1]; zeit = {stdDieseWoche:coR(cur.dm / 60, 2), stdLetzteWoche:lw ? coR((lw.dm || 0) / 60, 2) : null}; } catch (e) { elog(e); }
  let kraft = ''; try { const sw = typeof strWeek !== 'undefined' ? strWeek : null, sm = strOf(p, S.wk, S.plan), mb = mobOf(p, S.wk, S.plan, sm); try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); } kraft = sm[t] ? 'str' : mb[t] ? (mb[t].n === 'Mobilität' ? 'mob' : 'stab') : ''; } catch (e) { elog(e); }
  const nx = (() => { try { const y = t < 6 ? S.plan[t + 1] : genWeek(p, Math.min(S.wk + 1, ph.length ? ph[ph.length - 1].to : S.wk + 1))[0]; return y && y.m > 0 && y.t !== 'rest' ? {titel:y.n, dauerMin:Math.round(y.m / 5) * 5, t:y.t, lo:y.lo, hi:y.hi} : null; } catch (e) { elog(e); return null; } })();
  const hard = ride && (HARD.includes(x.t) || x.t === 'test' || x.t === 'race'), long = ride && (x.t === 'long' || x.m >= 150);
  const indoor = /indoor/.test(x.vk || '') || /Rolle/.test(x.n || '');
  const rec = (() => { try { return !!((p.recW || []).includes(S.wk) || recWk(p, S.wk) || P.rec); } catch (e) { elog(e); return false; } })();
  return {v:1, sprache:L, vorname:(c.name || '').trim() || null, ton:CO_TON.includes(c.ton) ? c.ton : 'kumpel', wochentag:CO_WD[t], tagesart:ride ? 'training' : 'ruhetag',
    krankOderVerletzt:!!(ill.lv || ill.inj || x.feel === 'inj'), datentage:dt,
    plan:{phase:P.name || null, phaseKey:P.key || null, woche:S.wk, wochenGesamt:ph.length ? ph[ph.length - 1].to : null, eventArt:ev ? (evTy || 'event') : null, eventInTagen:ev ? ddiff(today, p.eventDate) : null, formAmEvent:form ? form.formAmEvent : null},
    einheit:ride ? {titel:x.n, dauerMin:Math.round(x.m / 5) * 5, tss:tss(x), t:x.t, lo:x.lo, hi:x.hi, iv:x.iv ? {reps:x.iv.reps, sets:x.iv.sets || 1, work:x.iv.work, rest:x.iv.rest, lo:x.iv.lo, hi:x.iv.hi, seq:!!x.iv.seq} : null, hart:hard, lang:long, test:x.t === 'test', draussen:!indoor, angepasst:!!x.adapted, eventTag:evDay} : null,
    einheitPlan:o && o !== x && o.m > 0 ? {titel:o.n, t:o.t} : null, kraft,
    naechste:nx, form, erfuellung:erf.n7 ? {letzte7Tage:erf.d7 + ' von ' + erf.n7, n7:erf.n7, d7:erf.d7, letzte28TageProzent:erf.n28 >= 3 ? Math.round(100 * erf.d28 / erf.n28) : null} : {letzte28TageProzent:erf.n28 >= 3 ? Math.round(100 * erf.d28 / erf.n28) : null},
    zeit, befinden:x.feel || null, befindenWarum:x.feelWhy || null, wetter:wx, garmin:null, morgen:mor, vorschlag:null,
    verlauf:Array.isArray(c.hist) ? c.hist.slice(-7).map(h => String(h).slice(0, 120)) : [],
    _i:{t, ovl, gap, yd, ill, rec, taper:P.key === 'taper', evDay, noData:noPwr() && !hrMaxOf() && !lthrOf(), lucke:dt >= 28 && erf.n28 >= 4 && erf.d28 / erf.n28 < .5, xAd:!!x.adapted, coSrc:!!x.coSrc, lastUnder:(() => { try { const L = Object.values(p.exe || {}).filter(e => e && e.x && HARD.includes(e.x.t) && e.verdict).sort((a, b) => (b.at || 0) - (a.at || 0)); return !!(L[0] && L[0].verdict === 'under'); } catch (e) { elog(e); return false; } })(), act:c.act && c.act.d === today ? c.act : null, r10w:c.r10w, wxOk:!!(S.wxData && Date.now() - S.wxData.at <= 3 * 36e5), hasEv:!!ev}};
}
