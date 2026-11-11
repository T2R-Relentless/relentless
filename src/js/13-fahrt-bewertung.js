/* ---------- Fahrt zur Einheit: hochladen, Ausführung bewerten, Plan bei Bedarf anpassen ---------- */
let exeBusy = null, exeShow = null, exeErr = null;
const exeWk = () => typeof strWeek === 'number' ? strWeek : S.wk;
const exeGet = (w, i) => { if (S.p && S.p.exe) { exeHrSync(); return S.p.exe[w + '-' + i]; } return null; };
const r5 = v => Math.round(v / 5) * 5;
async function readRideRaw(f){
  const {name, data} = await unpack(await f.arrayBuffer(), f.name); let r;
  if (data[8] === 0x2E && data[9] === 0x46 && data[10] === 0x49 && data[11] === 0x54) r = parseFIT(data);
  else { const x = new DOMParser().parseFromString(new TextDecoder().decode(data), 'application/xml'); if (x.getElementsByTagName('parsererror').length) throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind FIT, GPX und TCX.'); r = x.getElementsByTagName('gpx').length ? parseGPX(x) : x.getElementsByTagName('TrainingCenterDatabase').length ? parseTCX(x) : (() => { throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind FIT, GPX und TCX.'); })(); }
  const a = summarize(r, name), hw = hrHist(r, 600); if (hw) a.hrW = hw; try { vzAttach(a, r); } catch (e) { elog(e); }
  return {a, w:streamOf(r), hr:hrHist(r)};
}
function streamOf(r){
  const pts = r.pts.filter(q => q.t != null && isFinite(q.t)).sort((p, q) => p.t - q.t), w = [];
  for (let k = 1; k < pts.length; k++) { const dt = pts[k].t - pts[k - 1].t; if (dt <= 0 || dt > 30) continue; const p = pts[k - 1].p != null ? pts[k - 1].p : pts[k].p; for (let j = 0; j < Math.round(dt); j++) w.push(p == null ? null : p); }
  return w;
}
/* skip: Sekunden am Anfang auslassen (Einfahren, der Puls hinkt der Belastung hinterher) */
function hrHist(r, skip){
  const pts = r.pts.filter(q => q.t != null && isFinite(q.t)).sort((p, q) => p.t - q.t), h = {}; let n = 0;
  for (let k = 1; k < pts.length; k++) { const dt = pts[k].t - pts[k - 1].t; if (dt <= 0 || dt > 30) continue; if (skip && pts[k].t - pts[0].t < skip) continue; const b = pts[k - 1].h; if (b == null || b < 35 || b > 230) continue; const v = Math.round(b); h[v] = (h[v] || 0) + Math.round(dt); n += Math.round(dt); }
  return n > 300 ? h : null;
}
const hrStat = h => { let n = 0, s = 0, mx = 0; for (const k in h) { n += h[k]; s += k * h[k]; mx = Math.max(mx, +k); } return {n, avg:n ? Math.round(s / n) : 0, max:mx}; };
const hrAbove = (h, lim) => { let n = 0, a = 0; for (const k in h) { n += h[k]; if (+k > lim) a += h[k]; } return n ? a / n : 0; };
/* Puls bei lockeren Einheiten: Leistung ist die Dosis, der Puls zeigt, wie der Körper sie verkraftet.
   Obergrenze aus der Schwellenherzfrequenz (Coggan, % LTHR passend zur Wattvorgabe), sonst aus der maximalen HF. Bei Hitze 5 Schläge Spielraum.
   Entkopplung (Pw:HR, erste gegen zweite Hälfte, ab 60 Min.): unter 5 % stabil, 5–10 % Drift, über 10 % wahrscheinlich über der aeroben Schwelle (Friel). */
function hrCeil(x, a){
  const L = lthrOf(), hm = hrMaxOf(), hot = a && a.tAvg >= 25 ? 5 : 0;
  if (L && x.hi) return {v:Math.round(L * hrPct(x.hi) / 100) + hot, src:'lthr', hot};
  if (hm && HRLIM[x.t]) return {v:Math.round(hm * HRLIM[x.t]) + hot, src:'max', hot};
  return null;
}
function exeHrCheck(x, a, hr, pwOk){
  const out = {msgs:[], pen:0, flag:null}, h = a.hrW || hr, c = hrCeil(x, a); if (!h) return out;
  const hot = a.tAvg >= 25, why = hot ? `Bei ${a.tAvg} °C ist ein höherer Puls normal: Der Körper braucht Blut zum Kühlen, und mit jedem Prozent Flüssigkeitsverlust steigt der Puls weiter.` : 'Häufige Gründe: Müdigkeit, wenig Schlaf, zu wenig getrunken oder gegessen, Stress oder ein beginnender Infekt.';
  let sh = 0;
  if (c) { sh = hrAbove(h, c.v + 3); const s2 = hrStat(h);
    if (sh > .25) { out.pen += sh > .5 ? .3 : .2; out.flag = 'high'; out.msgs.push(`${pwOk ? 'Die Watt passten, aber dein' : 'Dein'} Puls lag nach dem Einfahren ${Math.round(sh * 100)} % der Zeit über ${c.v} (${c.src === 'lthr' ? 'Obergrenze für diese Einheit aus deinem Schwellenpuls' : `etwa ${Math.round(HRLIM[x.t] * 100)} % deiner maximalen Herzfrequenz`}${c.hot ? ', inklusive 5 Schläge Hitzezuschlag' : ''}), im Schnitt ${s2.avg}.`); }
    else out.msgs.push(`Dein Puls passt: nach dem Einfahren ${Math.round((1 - sh) * 100)} % der Zeit bis ${c.v} (${c.src === 'lthr' ? 'aus deinem Schwellenpuls' : 'aus deiner maximalen Herzfrequenz'}), im Schnitt ${s2.avg}.`);
  }
  const d = a.dec;
  if (pwOk && d != null && a.sec >= 3600) {
    if (d > 10) { out.pen += .15; out.flag = 'high'; out.msgs.push(`Entkopplung ${String(d).replace('.', ',')} %: Bei gleicher Leistung ist dein Puls in der zweiten Hälfte deutlich gestiegen. Über 10 % gilt als Zeichen, dass die Fahrt für dich heute über der aeroben Schwelle lag.`); }
    else if (d >= 5) out.msgs.push(`Entkopplung ${String(d).replace('.', ',')} %: Dein Puls ist bei gleicher Leistung leicht gestiegen. Bei langen Fahrten ist das normal, deutlich mehr wäre ein Warnzeichen.`);
    else out.msgs.push(`Entkopplung ${String(Math.max(0, d)).replace('.', ',')} %: Leistung und Puls blieben stabil. Das spricht für eine gute Grundlagenausdauer.`);
  }
  if (out.flag) { out.pen = Math.min(.35, hot ? out.pen * .5 : out.pen);
    out.msgs.push(why); }
  out.ceil = c ? c.v : 0; out.sh = Math.round(sh * 100);
  return out;
}
/* Fitness-Check: Wurde wirklich ein durchgehender Test gefahren? */
const hbList = a => String(a.hb || '').split(',').filter(Boolean).map(Number);
function exeTest(x, a, hasP, ftp, hs){
  const msgs = [], hb = hbList(a), np = typeof noPwr === 'function' && noPwr(), need = np ? 30 : 20, am = Math.round(a.sec / 60);
  const ivTxt = hb.length >= 2 ? ` Stattdessen stecken ${hb.length} harte Abschnitte von je etwa ${Math.round(hb.reduce((q, z) => q + z, 0) / hb.length / 60)} Minuten mit Pausen dazwischen in der Fahrt. Das sieht nach Intervalltraining aus.` : '';
  const out = (wrong, sInt) => ({msgs, sInt, wrong});
  if (am < need + 5) { msgs.push(`Geplant war ein Fitness-Check mit ${need} Minuten am Stück. Die Fahrt dauerte nur ${mm(am)}, ein vollständiger Test passt da nicht hinein.`); return out(true, .2); }
  if (hasP && !np && a.c20 != null) {
    if (a.c20 > 15) { msgs.push(`Geplant war ein Fitness-Check mit 20 Minuten am Stück so hart wie möglich. In deiner Fahrt gibt es keinen durchgehenden 20-Minuten-Abschnitt: Im stärksten 20-Minuten-Fenster lagen ${a.c20} % der Zeit deutlich unter dem Schnitt.${ivTxt}`); msgs.push('Als Fitness-Check zählt die Fahrt deshalb nicht. Der beste 20-Minuten-Wert enthält Pausen und würde deinen FTP zu niedrig schätzen. Hol den Test an einem anderen Tag nach.'); return out(true, .2); }
    const pct = ftp ? Math.round(a.m20 / ftp * 100) : 0;
    msgs.push(`Durchgehend gefahren: 20 Minuten mit ${a.m20} W im Schnitt${pct ? ` (${pct} % deines bisherigen FTP)` : ''}. Daraus ergibt sich ein FTP von etwa ${r5(a.m20 * .95)} W. Trag den Wert beim Fitness-Check ein, dann wertet die App ihn aus.`);
    if (pct && pct < 90) { msgs.push('Das liegt deutlich unter deinem bisherigen FTP. War es wirklich Vollgas? Müdigkeit, Hitze oder ein zu schneller Start drücken den Wert.'); return out(false, .6); }
    return out(false, 1);
  }
  if (hs && a.c30h != null) {
    if (a.c30h > 25 || hb.length >= 3) { msgs.push(`Geplant war ein Fitness-Check mit ${need} Minuten am Stück gleichmäßig hart. Dein Puls zeigt keinen durchgehenden Abschnitt dieser Länge: Im stärksten 30-Minuten-Fenster fiel er ${a.c30h} % der Zeit deutlich ab, wie in Pausen zwischen Intervallen.${ivTxt}`); msgs.push('Als Fitness-Check zählt die Fahrt deshalb nicht. Der Schwellenpuls daraus wäre zu niedrig. Hol den Test an einem anderen Tag nach.'); return out(true, .2); }
    msgs.push(np ? `Durchgehend gefahren: Dein Puls blieb im stärksten 30-Minuten-Abschnitt gleichmäßig hoch. Trag den Durchschnittspuls der letzten 20 Minuten beim Fitness-Check ein.` : 'Durchgehend gefahren. Trag dein Testergebnis beim Fitness-Check ein, dann wertet die App es aus.');
    return out(false, 1);
  }
  msgs.push('Die Datei enthält weder Leistungs- noch Pulsdaten. Ob und wie du den Test gefahren bist, lässt sich daraus nicht erkennen, deshalb vergibt die App keine Punkte. Trag dein Testergebnis beim Fitness-Check ein, etwa aus deinem Radcomputer, dann wertet die App es aus.');
  return {msgs, sInt:null, wrong:false, nodata:true};
}
/* Erwartetes Anstrengungsempfinden (Borg CR-10) je Einheitstyp */
const RPEX = {rec:[1, 3], base:[2, 4], com:[2, 4], long:[3, 5], sst:[5, 7], thr:[6, 8], vo2:[7, 9], test:[8, 10], race:[6, 10]};
const HRLIM = {rec:.68, base:.75, com:.75, long:.78};
/* Intervalle finden: die N stärksten, sich nicht überlappenden Fenster in Intervalllänge, danach zeitlich sortiert */
function findIv(v, W, N, gap){
  const ps = [0]; for (let k = 0; k < v.length; k++) ps.push(ps[k] + v[k]);
  const used = new Uint8Array(v.length), res = [];
  for (let n = 0; n < N; n++) {
    let best = -1, bi = -1;
    for (let s = 0; s + W <= v.length; s++) { if (used[s] || used[s + W - 1] || used[s + (W >> 1)]) continue; const m = (ps[s + W] - ps[s]) / W; if (m > best) { best = m; bi = s; } }
    if (bi < 0) break;
    for (let j = Math.max(0, bi - gap); j < Math.min(v.length, bi + W + gap); j++) used[j] = 1;
    res.push({s:bi, p:best});
  }
  return res.sort((a, b) => a.s - b.s);
}
function exeEval(x, a, w, ftp, hr){
  const pm = x.m || 1, am = Math.round(a.sec / 60), dr = am / pm, steady = ['base', 'long', 'rec', 'com'].includes(x.t);
  const nP = w ? w.filter(q => q != null).length : 0, hasP = ftp > 0 && w && w.length > 120 && nP > .5 * w.length, v = hasP ? w.map(q => q || 0) : null;
  const msgs = [], acts = []; let sInt = null, verdict = 'ok', iv = null, ftpEst = null, hc = null, mis = false; const hs = hr ? hrStat(hr) : null, hrMax = S.p && S.p.hrMax > 0 ? S.p.hrMax : 0;
  const f = hasP ? exeFeat(x, v, ftp, a) : {};
  const sDur = dr >= .9 && dr <= 1.3 ? 1 : dr >= .75 ? .8 : dr > 1.3 ? (steady ? .9 : .8) : dr >= .5 ? .5 : .2;
  msgs.push(dr < .75 ? `Mit ${mm(am)} statt ${mm(pm)} war die Fahrt deutlich kürzer als geplant.` : dr < .9 ? `Mit ${mm(am)} statt ${mm(pm)} war die Fahrt etwas kürzer als geplant.` : dr > 1.3 ? `Mit ${mm(am)} statt ${mm(pm)} warst du deutlich länger unterwegs als geplant.` : `Die Dauer passt (${mm(am)} von geplanten ${mm(pm)}).`);
  if (hasP && x.iv && x.iv.work >= .5 && x.t !== 'test') {
    const q = x.iv, N = (q.sets || 1) * q.reps, W = Math.round(q.work * 60), found = findIv(v, W, N, Math.round(Math.min(q.rest * 60, W) * .5));
    iv = found.map(f => { const pct = f.p / ftp * 100; return {w:Math.round(f.p), pct:Math.round(pct), st:pct < q.lo * .85 ? 'miss' : pct < q.lo * .97 ? 'under' : pct > q.hi * 1.03 ? 'over' : 'in', s:f.s, d:W}; });
    while (iv.length < N) iv.push({w:0, pct:0, st:'miss'});
    const c = k => iv.filter(f => f.st === k).length, nIn = c('in'), nOv = c('over'), nUn = c('under'), nMi = c('miss');
    sInt = (nIn + .6 * nOv + .4 * nUn) / N;
    msgs.push(`${nIn} von ${N} Intervallen ${nIn === 1 ? 'lag' : 'lagen'} im Zielbereich (${q.lo}–${q.hi} % FTP, also ${watt(q.lo)}–${watt(q.hi)} W).`);
    const avgPct = iv.filter(f => f.st !== 'miss').reduce((s, f) => s + f.pct, 0) / Math.max(1, N - nMi);
    if (nMi >= Math.ceil(N * .3) || nUn + nMi >= N / 2) { verdict = 'under'; if (iv.every(f => f.pct < q.lo * .8)) { mis = true; verdict = 'wrong'; msgs.push('In der Fahrt steckt kein harter Abschnitt. Das sieht nach einer lockeren Ausfahrt aus statt nach der geplanten Intervalleinheit.'); } if (!mis) msgs.push(nMi ? `${nMi} ${nMi === 1 ? 'Intervall fehlte oder lag' : 'Intervalle fehlten oder lagen'} deutlich unter dem Ziel. Das passiert, wenn Müdigkeit, wenig Schlaf, Hitze oder Stress dazukommen, oder wenn der FTP im Plan zu hoch ist.` : 'Mehrere Intervalle lagen unter dem Ziel. Das passiert, wenn Müdigkeit, wenig Schlaf, Hitze oder Stress dazukommen, oder wenn der FTP im Plan zu hoch ist.'); }
    else if (nOv >= Math.ceil(N * 2 / 3)) {
      verdict = 'over'; msgs.push(`Du bist die Intervalle fast alle über dem Ziel gefahren, im Schnitt ${Math.round(avgPct)} % FTP statt ${q.lo}–${q.hi} %.`);
      const nf = r5(Math.min(ftp * 1.08, ftp * avgPct / ((q.lo + q.hi) / 2)));
      if (HARD.includes(x.t) && q.work >= 3 && nf >= ftp * 1.03) ftpEst = nf;
      else msgs.push('Zu hart gefahrene Intervalle kosten Erholung, ohne mehr zu bringen. Halte dich beim nächsten Mal an die Wattvorgabe.');
    } else if (nOv) msgs.push(`${nOv} ${nOv === 1 ? 'Intervall war' : 'Intervalle waren'} etwas härter als nötig. Kein Problem, aber gleichmäßig im Zielbereich bringt dir am meisten.`);
  } else if (hasP && steady) {
    const pct = a.np / ftp * 100, lim = x.hi * ftp / 100 * 1.1; let s = 0, above = 0; const roll = [];
    for (let k = 0; k < v.length; k++) { s += v[k]; if (k >= 30) s -= v[k - 30]; if (k >= 29) { roll.push(s / 30); } }
    roll.forEach(r => { if (r > lim) above++; }); const sh = roll.length ? above / roll.length : 0;
    if (pct > x.hi * 1.05 || sh > .2) { verdict = 'over'; { const hb = hbList(a); if (hb.length >= 3) mis = true; if (hb.length >= 3) msgs.push(`Geplant war eine lockere Einheit, in der Fahrt stecken aber ${hb.length} harte Abschnitte von je etwa ${Math.round(hb.reduce((q, z) => q + z, 0) / hb.length / 60)} Minuten über deiner Schwelle. Das sieht nach Intervalltraining aus, also nach einer ganz anderen Einheit.`); } sInt = sh > .35 || pct > x.hi * 1.15 ? .4 : .65; msgs.push(`Für diese Einheit warst du zu schnell unterwegs: Normalized Power ${a.np} W (${Math.round(pct)} % FTP), Ziel bis ${watt(x.hi)} W. ${Math.round(sh * 100)} % der Zeit lagen deutlich darüber.`); msgs.push('Locker heißt locker: Genau dieser niedrige Bereich baut die Grundlage auf und lässt dich für die harten Tage frisch.'); }
    else { sInt = 1; msgs.push(`Die Intensität passt: Normalized Power ${a.np} W (${Math.round(pct)} % FTP), Ziel ${x.lo}–${x.hi} %.`); }
  } else if (x.t === 'test') { const t = exeTest(x, a, hasP, ftp, hs); msgs.push(...t.msgs); sInt = t.sInt; if (t.wrong) verdict = 'wrong'; if (t.nodata) verdict = 'nodata'; }
  else if (x.t === 'race') { msgs.push('Rennen geschafft. Rennen bewertet die App nicht nach Wattvorgaben, wichtig ist, dass du dich danach gut erholst.'); }
  else if (!hasP && steady && hs && hrCeil(x, a)) {
    hc = exeHrCheck(x, a, hr, false);
    if (hc.flag) { verdict = 'over'; sInt = hc.sh > 50 ? .45 : .7; if (a.tAvg >= 25) sInt += .1; msgs.push(...hc.msgs.slice(0, 1), 'Locker heißt locker: Genau dieser niedrige Bereich baut die Grundlage auf und lässt dich für die harten Einheiten frisch. Fahr beim nächsten Mal so, dass du dich noch gut unterhalten könntest.', ...hc.msgs.slice(1)); }
    else { sInt = 1; msgs.push(...hc.msgs); }
    msgs.push('Puls reagiert auf Hitze, Müdigkeit und Koffein. Die Bewertung ist deshalb gröber als mit Leistungsdaten.');
  }
  else if (!hasP && steady && hs) msgs.push('Die Datei enthält Pulsdaten. Trag unten deine maximale Herzfrequenz ein, dann bewertet die App auch die Intensität.');
  else if (!hasP && hs && x.iv) msgs.push(`Ohne Leistungsdaten lassen sich Intervalle nur grob beurteilen. Dein Puls erreichte maximal ${hs.max}${hrMax ? ` (${Math.round(hs.max / hrMax * 100)} % deiner maximalen Herzfrequenz)` : ''}.`);
  else if (!hasP && x.iv && !hs) { verdict = 'nodata'; msgs.push('Die Datei enthält weder Leistungs- noch Pulsdaten. Ob du die Intervalle gefahren hast, lässt sich daraus nicht erkennen, deshalb vergibt die App keine Punkte. Mit Pulsgurt, Powermeter oder smartem Rollentrainer gibt es eine Auswertung.'); }
  else if (!hasP) msgs.push('Die Datei enthält keine Leistungsdaten. Deshalb bewertet die App nur die Dauer. Mit Powermeter oder smartem Rollentrainer gibt es eine genaue Auswertung der Intervalle.');
  const ah = {dec:a.dec, hrW:a.hrW, tAvg:a.tAvg, c20:a.c20, c30h:a.c30h, hb:a.hb};
  const hrk = hasP ? null : exeHrKurz(x, a, hs, hc, hasP, steady);
  const score = verdict === 'nodata' ? null : Math.min(verdict === 'wrong' ? 35 : mis ? 40 : 100, dr < .5 ? 45 : dr < .75 ? 60 : 100, Math.round(100 * (sInt == null ? sDur : .35 * sDur + .65 * sInt)));
  const grade = verdict === 'nodata' ? 'Nicht bewertbar' : verdict === 'wrong' || mis ? 'Anderes Training als geplant' : score >= 85 ? 'Sehr gut umgesetzt' : score >= 70 ? 'Gut umgesetzt' : score >= 50 ? 'Teilweise umgesetzt' : 'Deutlich anders als geplant';
  const res = {f, ivT:hasP && x.iv && x.iv.lo ? {lo:x.iv.lo, hi:x.iv.hi} : null, n:a.n, day:a.day, km:a.km, sec:a.sec, tss:a.tss, np:a.np, hasP, dr, iv, score, grade, verdict, msgs, acts, plan:x.n, pm, at:Date.now(), ftpEst, hr, hrAvg:hs ? hs.avg : 0, hrNeed:!hasP && steady && !!hs && !hrCeil(x, a), ah, hrk, hrc:hc ? {flag:hc.flag, ceil:hc.ceil, dec:a.dec != null ? a.dec : null} : null, a:{n:a.n, day:a.day, km:a.km, sec:a.sec, tss:a.tss, np:a.np, m20:a.m20, tAvg:a.tAvg}, rid:a.id, x:{t:x.t, n:x.n, m:x.m, lo:x.lo, hi:x.hi, iv:x.iv || null}};
  if (hasP) exeHrApply(res, a);
  return res;
}
/* Plan anpassen: nach misslungenen Intervallen die nächste harte Einheit dieser Woche entschärfen */
const exeSoftIdx = i => { const t = todayIdx(); return S.plan.findIndex((y, k) => k > i && k >= t && HARD.includes(y.t) && !S.done[k] && !y.adapted); };
function exeSoften(j){ const old = S.plan[j]; S.plan[j] = old.parts ? {...old, n:old.n + ' (reduziert)', parts:[old.parts[0], {...old.parts[1], iv:null, lo:45, hi:55, st:'Locker zurückfahren (Z1–Z2), die Intervalle entfallen.'}], adapted:true, orig:old} : {...old, m:Math.max(45, Math.round(old.m * .75 / 5) * 5), n:old.n + ' (reduziert)', st:old.st + ' Reduziert: ein Intervall weniger, Leistung unverändert.', adapted:true, orig:old}; flashIdx = j; return old; }
function exeAdapt(e, i){
  if (e.verdict === 'wrong') { e.adj = e.x && e.x.t === 'test' ? 'Der Fitness-Check steht noch aus. Hol ihn an einem anderen Tag nach, am besten ausgeruht nach einem lockeren Tag.' : 'Die geplante Einheit ist damit nicht erledigt. Der Plan bleibt, wie er ist. Passt es in deine Woche, hol sie an einem anderen Tag nach, sonst lass sie einfach aus.'; return; }
  if (e.verdict === 'under') {
    const j = exeSoftIdx(i);
    if (j >= 0) { const old = exeSoften(j);
      e.adj = `Deshalb hat die App „${old.n}“ am ${DAYS[j]} reduziert: ein Intervall weniger bei gleicher Leistung. So kommst du wieder in den Rhythmus, ohne dich weiter zu verausgaben.`; flashIdx = j;
      S.log.unshift({title:'Bewertung: Einheit reduziert', day:j, text:e.adj}); }
    else e.adj = 'In dieser Woche steht keine harte Einheit mehr an. Der Plan bleibt, wie er ist: Gönn dir Schlaf und gutes Essen.';
    const prev = Object.entries(S.p.exe || {}).filter(([k, v]) => v !== e && v.verdict === 'under' && Date.now() - v.at < 14 * 864e5).length;
    if (prev) { e.msgs.push('Das ist schon die zweite harte Einheit in kurzer Zeit, die nicht wie geplant lief. Das ist ein Zeichen, dass du mehr Erholung brauchst oder der FTP zu hoch angesetzt ist.'); e.acts.push(['Erholungswoche einlegen', 'addRecW()', 1], [`FTP auf ${r5(S.p.ftp * .97)} W senken (−3 %)`, `setFtpNow(${ja(r5(S.p.ftp * .97))})`, 0]); }
  } else if (e.ftpEst) {
    const ev = Object.values(S.p.exe || {}).filter(v => v.ftpEst && Date.now() - v.at < 21 * 864e5 && !(v.rpe && v.x && v.rpe > RPEX[v.x.t][1] + 1)), med = l => { const q = [...l].sort((a, b) => a - b); return q[Math.floor(q.length / 2)]; };
    const est = ev.length >= 2 ? r5(med(ev.map(v => v.ftpEst))) : 0;
    if (est >= S.p.ftp * 1.03) { e.msgs.push(`Das ist schon die ${ev.length}. harte Einheit in den letzten drei Wochen, die du deutlich über dem Ziel gefahren bist. Das spricht dafür, dass dein FTP höher liegt als ${S.p.ftp} W, eher bei etwa ${est} W.`); e.acts.push([`FTP auf ${est} W setzen`, `setFtpNow(${ja(est)})`, 1], ['Lieber einen Fitness-Check einplanen', `retest(${ja(S.wk - 1)})`, 0]); e.adj = 'Übernimmst du den höheren FTP, passen sich alle Wattvorgaben an. Sonst bleibt der Plan, wie er ist.'; }
    else { e.msgs.push('Einmal ist noch kein Muster: Tagesform, Wind oder Motivation spielen mit. Bleibt das bei den nächsten harten Einheiten so, schlägt die App einen höheren FTP vor. Am sichersten zeigt es ein Fitness-Check.'); e.acts.push(['Fitness-Check einplanen', `retest(${ja(S.wk - 1)})`, 0]); e.adj = 'Der Plan bleibt vorerst, wie er ist.'; }
  } else if (e.hrc && e.hrc.flag && e.verdict === 'ok') e.adj = `Der Plan bleibt unverändert. Fahr die nächste lockere Einheit etwas ruhiger und behalte den Puls im Blick${e.hrc.ceil ? ` (bis etwa ${e.hrc.ceil})` : ''}.`;
  else if (e.verdict === 'over' && !e.iv) e.adj = 'Der Plan bleibt unverändert. Fahr die nächste lockere Einheit bewusst ruhig.';
  else if (e.dr < .75) e.adj = 'Nachholen musst du nichts, der Plan läuft normal weiter.';
  else if (e.verdict === 'nodata') e.adj = e.x && e.x.t === 'test' ? 'Trag dein Testergebnis beim Fitness-Check ein. Erst dann vergleicht die App es mit dem erwarteten Bereich.' : 'Der Plan läuft wie vorgesehen weiter.';
  else e.adj = e.score >= 70 ? 'Der Plan läuft wie vorgesehen weiter.' : 'Der Plan läuft wie vorgesehen weiter. Achte bei der nächsten Einheit auf die Vorgaben.';
}
async function exeUpload(inp, i, p){
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f || !S.p) return;
  const w = S.wk, x = S.plan[i]; exeBusy = i; exeErr = null; render();
  try {
    const {a, w:st, hr} = await readRideRaw(f);
    if (x && x.parts) { if (p == null) p = exePFor(i, a); exePStore(i, p, a, st, hr); } else exeStore(i, a, st, hr);
    S.man = (S.man || []).filter(m => m.id !== a.id); S.man.push({...a, day:dstr(i)}); S.man.sort((p, q) => q.ts.localeCompare(p.ts));
    if (S.plan) analyze(); track('fahrt-bewertet');
  } catch (er) { exeErr = {i, t:(er && er.message) || 'Die Datei konnte nicht gelesen werden.'}; }
  exeBusy = null; save(); render();
}
function exeStore(i, a, st, hr){
  const w = S.wk, x = S.plan[i], e = exeEval(x, a, st, S.p.ftp, hr); try { vzKeep(e, a); } catch (er) { elog(er); }
  S.p.exe = S.p.exe || {}; S.p.exe[w + '-' + i] = e; exeAdapt(e, i);
  if (e.dr >= .6 && hasStarted(S.p) && e.verdict !== 'wrong' && !(e.verdict === 'nodata' && x.t === 'test')) S.done[i] = true;
  S.cheerSeen = [...(S.cheerSeen || []), `h|${S.p.start}|${w}|${i}`, `l|${S.p.start}|${w}|${i}`];
  exeShow = w + '-' + i; return e;
}
/* Pendeltage: Hin- und Rückweg sind zwei Fahrten. Jede wird gegen ihren Teil bewertet, der Tag wird daraus zusammengefasst. */
const exePArr = (w, i) => ((S.p && S.p.exeP) || {})[w + '-' + i] || [];
function exePNext(i){ const x = S.plan[i]; if (!x || !x.parts) return null; const arr = exePArr(S.wk, i); const k = x.parts.findIndex((q, p) => !arr[p]); return k < 0 ? null : k; }
/* Welcher Teil? Freier Teil nach Tageszeit: vor 12 Uhr Hinweg, danach Rückweg */
function exePFor(i, a){ const x = S.plan[i], arr = exePArr(S.wk, i), n = x.parts.length, h = a && a.ts ? new Date(a.ts).getHours() : 12, pref = h < 12 ? 0 : n - 1;
  if (!arr[pref]) return pref; const k = x.parts.findIndex((q, p) => !arr[p]); return k < 0 ? pref : k; }
function partX(x, p){
  const q = x.parts[p], t = q.iv ? x.t : ['long', 'base', 'rec'].includes(x.t) ? x.t : 'com';
  return {t, n:x.n + ' · ' + q.lbl, m:q.m, lo:q.lo != null ? q.lo : t === 'com' ? 45 : x.lo, hi:q.hi != null ? q.hi : t === 'com' ? 65 : x.hi, iv:q.iv || null, cad:x.cad, st:q.st};
}
function exePStore(i, p, a, st, hr){
  const w = S.wk, x = S.plan[i], k = w + '-' + i, e = exeEval(partX(x, p), a, st, S.p.ftp, hr); e.part = p; e.lbl = x.parts[p].lbl; try { vzKeep(e, a); } catch (er) { elog(er); }
  S.p.exeP = S.p.exeP || {}; const arr = S.p.exeP[k] = [...(S.p.exeP[k] || x.parts.map(() => null))]; arr[p] = e;
  exeCombine(w, i); exeAdapt(e, i); exeCombine(w, i);
  S.cheerSeen = [...(S.cheerSeen || []), `h|${S.p.start}|${w}|${i}`, `l|${S.p.start}|${w}|${i}`];
  exeShow = k + '-' + p; return e;
}
function exeCombine(w, i){
  const k = w + '-' + i, arr = exePArr(w, i), have = arr.filter(Boolean); S.p.exe = S.p.exe || {};
  if (!have.length) { delete S.p.exe[k]; return null; }
  const x = w === S.wk && S.plan ? S.plan[i] : null, pmT = x ? x.m : have.reduce((s, e) => s + e.pm, 0), pmH = have.reduce((s, e) => s + e.pm, 0);
  const score = Math.round(have.reduce((s, e) => s + e.score * e.pm, 0) / Math.max(1, pmH)), old = S.p.exe[k] || {}, miss = arr.map((e, p) => e ? null : (x && x.parts[p] ? x.parts[p].lbl : (p ? 'Rückweg' : 'Hinweg'))).filter(Boolean);
  const sec = have.reduce((s, e) => s + e.sec, 0), vd = have.some(e => e.verdict === 'under') ? 'under' : have.some(e => e.verdict === 'over') ? 'over' : 'ok';
  const acts = []; have.forEach(e => e.acts.forEach(a => { if (!acts.some(b => b[1] === a[1])) acts.push(a); }));
  const c = {n:have.map(e => e.n).join(' + '), day:have[0].day, km:Math.round(have.reduce((s, e) => s + (e.km || 0), 0) * 10) / 10, sec, tss:have.reduce((s, e) => s + (e.tss || 0), 0), np:Math.max(...have.map(e => e.np || 0)), hasP:have.some(e => e.hasP), dr:sec / 60 / Math.max(1, pmT), iv:null,
    score, grade:score >= 85 ? 'Sehr gut umgesetzt' : score >= 70 ? 'Gut umgesetzt' : score >= 50 ? 'Teilweise umgesetzt' : 'Deutlich anders als geplant', verdict:vd,
    msgs:[...have.map(e => `${e.lbl}: ${e.score}/100, ${e.grade.toLowerCase()}.`), ...(miss.length ? [`${miss.join(' und ')} fehlt noch. Lade auch diese Fahrt hoch, dann bewertet die App den ganzen Tag.`] : [])],
    acts, plan:x ? x.n : (old.plan || have[0].n), pm:pmT, at:Date.now(), ftpEst:Math.max(0, ...have.map(e => e.ftpEst || 0)) || null, hrAvg:0, hrk:(() => { const r = {warn:3, ok:2, info:1}, ks = have.filter(e => e.hrk).sort((p, q) => r[q.hrk.l] - r[p.hrk.l]); return ks.length ? {l:ks[0].hrk.l, p:ks.length > 1 && ks.every(e => e.hrk.l === 'ok') ? '' : ks[0].lbl, t:ks.length > 1 && ks.every(e => e.hrk.l === 'ok') ? 'Passt auf beiden Fahrten.' : ks[0].hrk.t} : null; })(), hrNeed:have.some(e => e.hrNeed), parts:arr.map(e => e ? {score:e.score, lbl:e.lbl} : null), partial:miss.length > 0,
    adj:have.map(e => e.adj).filter(Boolean).filter((v, j, A) => A.indexOf(v) === j).join(' '), x:x ? {t:x.t, n:x.n, m:x.m, lo:x.lo, hi:x.hi} : old.x, rpe:old.rpe, feel:old.feel, soft:old.soft};
  S.p.exe[k] = c; if (x && w === S.wk && hasStarted(S.p) && !c.partial && sec / 60 >= .6 * x.m) S.done[i] = true;
  return c;
}
function exePDel(w, i, p){ const k = w + '-' + i; if (S.p.exeP && S.p.exeP[k]) { S.p.exeP[k] = [...S.p.exeP[k]]; S.p.exeP[k][p] = null; if (!S.p.exeP[k].some(Boolean)) delete S.p.exeP[k]; } exeCombine(w, i); exeShow = null; save(); render(); }
/* Allgemeiner Upload: Fahrten dieser Woche automatisch der Einheit am selben Tag zuordnen */
function exeAuto(a, st, hr){
  if (!S.p || !S.plan || S.step !== 0) return null;
  const i = [0, 1, 2, 3, 4, 5, 6].find(k => dstr(k) === a.day && S.plan[k] && S.plan[k].m > 0 && S.plan[k].t !== 'rest');
  const inWeek = [0, 1, 2, 3, 4, 5, 6].some(k => dstr(k) === a.day);
  if (i == null) return inWeek || !(typeof gmPrevWeekDay === 'function' && gmPrevWeekDay(a)) ? exeExtra(a, st, hr) : null;
  if (S.plan[i].parts) { if (exePNext(i) == null) return exeExtra(a, st, hr); return exePStore(i, exePFor(i, a), a, st, hr); }
  if (exeGet(S.wk, i)) return exeExtra(a, st, hr);
  return exeStore(i, a, st, hr);
}
/* Gehört die Fahrt zu einer geplanten Einheit der gespeicherten Vorwoche? Dann bewertet sie gmPrevWeek, keine Zusatzfahrt. */
function gmPrevWeekDay(a){ try { const pw = S.prevPlan; if (!S.p || !pw || !pw.plan || pw.w !== S.wk - 1) return false; const base = new Date(S.p.start + 'T12:00:00'); return [0, 1, 2, 3, 4, 5, 6].some(j => { const d = new Date(base); d.setDate(d.getDate() + (pw.w - 1) * 7 + j); return lstr(d) === a.day && pw.plan[j] && pw.plan[j].m > 0 && !(S.p.exe || {})[pw.w + '-' + j]; }); } catch (e) { elog(e); return false; } }
function exeList(){
  if (!S.p || !S.plan) return '';
  const rows = S.plan.map((x, i) => [x, i]).filter(([x]) => x.m > 0 && x.t !== 'rest').map(([x, i]) => { const e = exeGet(S.wk, i);
    return `<div class="flex items-center gap-2 p-2.5 text-sm" style="border:1px solid var(--line)"><span class="min-w-0 flex-1"><span class="block text-xs" style="color:var(--mute)">${DAYS[i]}</span><span class="block truncate font-semibold">${esc(x.n)}</span></span>${x.parts ? `<span class="flex shrink-0 flex-col gap-1">${x.parts.map((q, p) => { const pe = exePArr(S.wk, i)[p]; return pe ? `<button class="ghost !px-2.5 !py-1 text-xs" style="color:${esc(exeCol(pe.score))};border-color:${esc(exeCol(pe.score))}" onclick="exeShow='${ja(S.wk)}-${ja(i)}-${ja(p)}';render()">${q.lbl} ${pe.score}</button>` : `<label class="ghost cursor-pointer !px-2.5 !py-1 text-xs">${exeBusy === i ? '…' : q.lbl + ' hochladen'}<input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeUpload(this, ${ja(i)}, ${ja(p)})"></label>`; }).join('')}</span>` : e ? `<button class="ghost shrink-0 !px-3 !py-1.5 text-sm" style="color:${esc(exeCol(e.score))};border-color:${esc(exeCol(e.score))}" onclick="exeShow='${ja(S.wk)}-${ja(i)}';render()">${e.score == null ? 'Ansehen' : e.score + '/100'}</button>` : `<label class="ghost shrink-0 cursor-pointer !px-3 !py-1.5 text-sm">${exeBusy === i ? 'Wird ausgewertet …' : 'Hochladen'}<input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeUpload(this, ${ja(i)})"></label>`}</div>`; }).join('');
  const err = exeErr ? `<p class="mt-2 text-sm" style="color:#c0392b">⚠ ${esc(exeErr.t)}</p>` : '';
  return `<section class="panel p-4"><p class="hd text-xl font-semibold">Einheiten bewerten</p><p class="mt-1 text-sm" style="color:var(--mute)">Lade zu jeder Einheit dieser Woche die tatsächlich gefahrene Fahrt hoch, zum Beispiel aus Strava (Aktivität, Menü ⋯, „Original exportieren“), Garmin Connect, Wahoo oder Zwift. Die App bewertet, wie gut du die Vorgabe getroffen hast, gibt dir eine Rückmeldung und passt den Plan bei Bedarf an.${S.plan.some(x => x.parts) ? ' An Pendeltagen sind Hin- und Rückweg zwei Fahrten: Lade beide einzeln hoch.' : ''}</p><div class="mt-3 space-y-2">${rows}</div>${err}
    <div class="mt-3 flex flex-wrap items-end gap-2"><label class="block"><span class="mb-1 block text-xs" style="color:var(--mute)">Maximale Herzfrequenz (für die Pulsprüfung)</span><input type="number" inputmode="numeric" class="inp !w-28 !py-2" placeholder="185" value="${esc(S.p.hrMax || '')}" onchange="exeHrSet(this.value)"></label></div></section>`;
}
/* Empfinden nach der Fahrt (Anstrengung 1–10 und Befinden) fließt in Rückmeldung und Anpassung ein */
const FEEL = {fit:'Erholt und motiviert', mid:'Etwas müde', low:'Ausgelaugt'};
function exeSub(e){
  const out = [], ex = RPEX[(e.x || {}).t] || [3, 6];
  if (e.rpe) {
    if (e.rpe > ex[1] + 1) out.push(e.verdict === 'ok' ? `Das fühlte sich deutlich härter an als für diese Einheit vorgesehen (erwartet etwa ${ex[0]}–${ex[1]} von 10), obwohl die Werte passen. Dein Körper musste mehr arbeiten als sonst, oft steckt Müdigkeit dahinter.` : `Das fühlte sich deutlich härter an als für diese Einheit vorgesehen (erwartet etwa ${ex[0]}–${ex[1]} von 10).`);
    else if (e.rpe < ex[0] - 1 && HARD.includes((e.x || {}).t)) out.push(`Leichter als erwartet (sonst etwa ${ex[0]}–${ex[1]} von 10): ein gutes Zeichen für deine Form.`);
    else out.push(`Dein Empfinden passt zur Einheit (erwartet etwa ${ex[0]}–${ex[1]} von 10).`);
    if (e.ftpEst && e.rpe > ex[1] + 1) out.push('Weil sich die Einheit sehr hart angefühlt hat, schlägt die App trotz der hohen Watt keinen höheren FTP vor. Ein Fitness-Check in ausgeruhtem Zustand klärt das.');
  }
  if (e.feel === 'low') out.push('Du fühlst dich ausgelaugt. Schlaf, gutes Essen und ein lockerer Tag bringen dich schneller zurück als Durchbeißen.');
  else if (e.feel === 'mid') out.push('Etwas Müdigkeit nach dem Training ist normal. Achte heute auf Schlaf und genug Kohlenhydrate.');
  return out;
}
function exeFeel(w, i, k, v){
  const e = exeGet(w, i); if (!e) return; e[k] = v;
  if (k === 'feel') { if (S.pending) { S.pending = false; S.handled = S.handled || []; if (S.pendInfo && S.pendInfo.key) S.handled.push(S.pendInfo.key); S.pendInfo = null; } }
  const ex = RPEX[(e.x || {}).t] || [3, 6], heavy = e.feel === 'low' || (e.rpe && e.rpe > ex[1] + 1);
  if (heavy && w === S.wk && !e.soft && !(e.adj || '').startsWith('Deshalb')) { const j = exeSoftIdx(i); e.soft = 1; if (j >= 0) { const old = exeSoften(j); e.adj = `Deshalb hat die App „${old.n}“ am ${DAYS[j]} reduziert: ein Intervall weniger bei gleicher Leistung. So kommst du wieder in den Rhythmus, ohne dich weiter zu verausgaben.`; S.log.unshift({title:'Bewertung: Einheit reduziert', day:j, text:e.adj}); } }
  if (e.rpe && e.rpe > ex[1] + 1) e.acts = e.acts.filter(a => !/^FTP auf/.test(a[0]));
  if (heavy && !e.acts.some(a => a[1] === 'addRecW()')) { const n = Object.values(S.p.exe || {}).filter(v => Date.now() - v.at < 14 * 864e5 && (v.feel === 'low' || v.verdict === 'under' || (v.rpe && v.x && v.rpe > RPEX[v.x.t][1] + 1))).length; if (n >= 2) e.acts.push(['Erholungswoche einlegen', 'addRecW()', 1]); }
  save(); render();
}
function exeHr(w, i, btn){ const el = btn && btn.parentElement.querySelector('input'); exeHrSet(el ? el.value : 0, i); }
function exeHrSet(val, i = -1){
  const v = Math.round(Number(val)); if (!(v >= 140 && v <= 225)) { exeErr = {i, t:'Bitte einen Wert zwischen 140 und 225 eintragen.'}; return render(); }
  exeErr = null; S.p.hrMax = S.d.hrMax = v; exeHrSync(true);
  save(); render();
}
function exeDel(w, i){ if (S.p && S.p.exeP) delete S.p.exeP[w + '-' + i]; if (S.p && S.p.exe) delete S.p.exe[w + '-' + i]; exeShow = null; save(); render(); }
function exeClose(){ exeShow = null; render(); }
const exeCol = s => s == null ? 'var(--mute)' : s >= 85 ? '#0a8f6a' : s >= 70 ? '#007f8d' : s >= 50 ? '#9a6a00' : '#c0392b';
const EXST = ['base', 'long', 'rec', 'com'];
const exeHrDflt = 'Der Plan läuft wie vorgesehen weiter.';
/* Pulsprüfung auf eine Bewertung mit Leistungsdaten anwenden. Geht auch nachträglich (gespeicherte Bewertungen, neue Pulswerte in den Einstellungen). */
function exeHrApply(e, A){
  if (!e || !e.x) return e; const x = e.x; A = A || {...(e.a || {}), ...(e.ah || {})}; if (A.sec == null) A.sec = e.sec;
  const steady = EXST.includes(x.t), hs = e.hr ? hrStat(e.hr) : null;
  if (!steady || e.iv) { e.hrk = exeHrKurz(x, A, hs, null, true, false); return e; }
  const hc = hs ? exeHrCheck(x, A, e.hr, e.verdict === 'ok') : null;
  e.hrc = hc ? {flag:hc.flag, ceil:hc.ceil, dec:A.dec != null ? A.dec : null} : null; e.hrk = exeHrKurz(x, A, hs, hc, true, true);
  if (e.verdict !== 'ok') { e.hm = []; return e; }
  if (!e.hm) { const k = e.msgs.findIndex(m => m.startsWith('Die Intensität passt')); if (k >= 0) e.msgs = e.msgs.slice(0, k + 1); }
  const hm = hc ? [...hc.msgs] : [];
  if (hs && !hc.ceil && x.t !== 'rec') hm.push('Trag in den Einstellungen unter „Herzfrequenz“ deine maximale Herzfrequenz oder deinen Schwellenpuls ein, dann prüft die App auch, ob dein Puls zur Einheit passt.');
  if (!hs && x.t !== 'rec' && e.sec >= 2700) hm.push('Die Datei enthält keine Pulsdaten. Mit Brustgurt prüft die App zusätzlich, wie dein Körper auf die Leistung reagiert, etwa bei Hitze oder Müdigkeit.');
  e.hm = hm;
  const dr = e.dr, sD = dr >= .9 && dr <= 1.3 ? 1 : dr >= .75 ? .8 : dr > 1.3 ? .9 : dr >= .5 ? .5 : .2, sInt = hc ? Math.max(.5, 1 - hc.pen) : 1;
  e.score = Math.min(dr < .5 ? 45 : dr < .75 ? 60 : 100, Math.round(100 * (.35 * sD + .65 * sInt)));
  e.grade = e.score >= 85 ? 'Sehr gut umgesetzt' : e.score >= 70 ? 'Gut umgesetzt' : e.score >= 50 ? 'Teilweise umgesetzt' : 'Deutlich anders als geplant';
  const hAdj = `Der Plan bleibt unverändert. Fahr die nächste lockere Einheit etwas ruhiger und behalte den Puls im Blick${hc && hc.ceil ? ` (bis etwa ${hc.ceil})` : ''}.`;
  if (hc && hc.flag) { if (!e.adj || e.adj === exeHrDflt || e.adj.startsWith('Der Plan bleibt unverändert. Fahr die nächste lockere Einheit etwas ruhiger')) e.adj = hAdj; }
  else if (e.adj && e.adj.startsWith('Der Plan bleibt unverändert. Fahr die nächste lockere Einheit etwas ruhiger')) e.adj = exeHrDflt;
  return e;
}
/* Gespeicherte Bewertungen nachziehen, wenn sich maximale HF oder Schwellenpuls ändern (oder die Pulsprüfung neu ist) */
let exeHrBusy = false;
function exeHrSync(force){
  if (exeHrBusy || !S.p || !(S.p.exe || S.p.exeP)) return; const key = 'v3|' + hrMaxOf() + '|' + lthrOf(); if (!force && S.p.hrK === key) return;
  exeHrBusy = true;
  try {
    const re = e => { if (!e || !e.x) return e;
      if (!e.hasP && e.hr && e.a && EXST.includes(e.x.t)) { const ne = exeEval(e.x, {...e.a, ...(e.ah || {})}, null, S.p.ftp, e.hr); return {...ne, part:e.part, lbl:e.lbl, at:e.at, rpe:e.rpe, feel:e.feel, soft:e.soft, acts:[...(e.acts || [])], adj:ne.verdict === 'over' && !ne.iv ? 'Der Plan bleibt unverändert. Fahr die nächste lockere Einheit bewusst ruhig.' : e.adj}; }
      if (e.hasP) return exeHrApply({...e, msgs:[...e.msgs]});
      return {...e, hrk:exeHrKurz(e.x, {...(e.a || {}), ...(e.ah || {})}, e.hr ? hrStat(e.hr) : null, null, false, EXST.includes(e.x.t))}; };
    Object.entries(S.p.exeP || {}).forEach(([k, arr]) => { S.p.exeP[k] = arr.map(re); const [w, i] = k.split('-').map(Number); exeCombine(w, i); });
    Object.entries(S.p.exe || {}).forEach(([k, e]) => { if (e.parts) return; S.p.exe[k] = re(e); });
    S.p.hrK = key; save();
  } catch (er) { elog(er); S.p.hrK = key; } finally { exeHrBusy = false; }
}
/* Merkmale aus dem Leistungsverlauf für Lob und Tipps (einmal beim Hochladen berechnet und gespeichert) */
function exeFeat(x, v, ftp, a){
  const f = {vi:a.vi || null}, n = v.length, st = n > 1800 ? 600 : 0, lo = (x.lo || 0) * ftp / 100, hi = (x.hi || 0) * ftp / 100;
  if (EXST.includes(x.t) && hi > 0) {
    let s = 0, inB = 0, cnt = 0, sur = 0, up = false, z = 0;
    for (let k = st; k < n; k++) { s += v[k]; if (k - st >= 30) s -= v[k - 30]; if (v[k] === 0) z++;
      if (k - st >= 29) { const r = s / 30; cnt++; if (r >= lo * .95 && r <= hi * 1.05) inB++; if (r > hi * 1.25) { if (!up) { sur++; up = true; } } else if (r < hi * 1.1) up = false; } }
    f.inB = cnt ? Math.round(inB / cnt * 100) : null; f.sur = sur; f.coast = n - st > 0 ? Math.round(z / (n - st) * 100) : 0;
    if (n - st >= 3600) { const mid = st + Math.floor((n - st) / 2), m = (p, q) => { let t = 0; for (let k = p; k < q; k++) t += v[k]; return t / Math.max(1, q - p); }, a1 = m(st, mid), a2 = m(mid, n); if (a1 > 0) f.fade = Math.round(a2 / a1 * 100); }
    f.pct = a.np && ftp ? Math.round(a.np / ftp * 100) : null;
  }
  return f;
}
const exeNum = d => String(d).replace('.', ',');
/* Lob und Tipps: was lief gut, was geht beim nächsten Mal besser. Aus den gespeicherten Daten, deshalb auch für ältere Bewertungen. */
function exeFb(e){
  const good = [], tips = [], x = e.x || {}, f = e.f || {}, steady = EXST.includes(x.t), hc = e.hrc, ftp = (S.p && S.p.ftp) || 0, A = {...(e.a || {}), ...(e.ah || {})}, hot = A.tAvg >= 25;
  const W = p => Math.round(p * ftp / 100);
  if (x.t === 'race' || x.t === 'test') return {good, tips};
  const durOk = e.dr >= .9 && e.dr <= 1.15;
  if (durOk) {}
  else if (e.dr < .75) tips.push([4, x.iv ? 'Wenn die Zeit knapp ist: Kürz lieber Ein- und Ausfahren als die Intervalle. So bleibt der wichtigste Teil der Einheit erhalten.' : 'Fehlt dir an solchen Tagen regelmäßig Zeit, trag die realistische Zeit unter „Alltag bearbeiten“ ein. Dann plant die App passende Einheiten, statt dass du abbrechen musst.']);
  else if (e.dr > 1.3 && steady) tips.push([5, 'Länger ist nicht automatisch besser: Halte dich an die geplante Dauer, dann bist du für die nächste Einheit frischer.']);
  if (e.iv && e.iv.length) {
    const ok = e.iv.filter(q => q.st !== 'miss'), ws = ok.map(q => q.w), nIn = e.iv.filter(q => q.st === 'in').length, q = x.iv || {};
    if (nIn === e.iv.length) good.push([1, `Alle ${e.iv.length} Intervalle lagen im Zielbereich. Genau so wirkt die Einheit.`]);
    else if (nIn >= e.iv.length / 2) good.push([1, `${nIn} von ${e.iv.length} Intervallen lagen im Zielbereich.`]);
    if (ws.length >= 3) { const mu = ws.reduce((a, b) => a + b, 0) / ws.length, cv = Math.sqrt(ws.reduce((a, b) => a + (b - mu) ** 2, 0) / ws.length) / mu;
      if (cv <= .03) good.push([2, `Sehr gleichmäßige Intervalle: Sie wichen im Schnitt nur ${Math.max(1, Math.round(cv * 100))} % voneinander ab.`]);
      else if (cv > .06) tips.push([3, 'Deine Intervalle waren unterschiedlich stark. Auf dem Rollentrainer hilft der ERG-Modus, draußen ein Datenfeld mit 3-Sekunden-Leistung und eine flache, ampelfreie Strecke.']);
      const fst = ws[0], lst = ws[ws.length - 1];
      if (lst >= fst * .98 && nIn >= e.iv.length / 2) good.push([2, `Gutes Pacing: Das letzte Intervall (${lst} W) war so stark wie das erste (${fst} W).`]);
      else if (lst < fst * .92) tips.push([2, `Die Leistung fiel vom ersten (${fst} W) zum letzten Intervall (${lst} W). Starte das erste Intervall bewusst am unteren Ende des Zielbereichs (${W(q.lo)} W) und steigere erst, wenn es sich gut anfühlt.`]); }
    if (e.verdict === 'over') tips.push([1, `Fahr die Intervalle im Bereich ${W(q.lo)}–${W(q.hi)} W. Härter bringt hier nicht mehr, kostet aber Erholung für die nächste Einheit.`]);
    if (e.verdict === 'under') tips.push([1, 'Für harte Einheiten: am Vortag locker, gut schlafen und 2–3 Stunden vorher eine kohlenhydratreiche Mahlzeit. Eine kleine Portion (Banane, Riegel) direkt vor dem Start hilft zusätzlich.']);
  } else if (steady && e.hasP) {
    if (f.inB != null && f.inB >= 70 && e.verdict === 'ok') good.push([1, `${f.inB} % der Zeit lagst du im Zielbereich (${W(x.lo)}–${W(x.hi)} W). Sehr kontrolliert gefahren.`]);
    if (f.vi && f.vi <= 1.06 && e.verdict === 'ok') good.push([4, `Sehr gleichmäßig getreten (Variabilitätsindex ${exeNum(f.vi.toFixed(2))}). Das ist ideal für die Grundlage.`]);
    if (f.sur === 0 && e.verdict === 'ok' && x.t !== 'rec') good.push([5, 'Keine Leistungsspitzen: Du bist auch an Anstiegen und beim Anfahren ruhig geblieben.']);
    if (f.fade != null && f.fade >= 95 && e.sec >= 4500 && e.verdict === 'ok' && !(hc && hc.flag)) good.push([3, 'Du hast die Leistung bis zum Schluss gehalten. Das zeigt, dass Energie und Tempo gepasst haben.']);
    if (e.verdict === 'over') { tips.push([1, `Stell im Radcomputer einen Alarm bei ${W(x.hi)} W ein und zeig dir die 3-Sekunden-Leistung an. So merkst du sofort, wenn du zu schnell wirst.`]);
      if (f.sur >= 5) tips.push([2, `Du hattest ${f.sur} Leistungsspitzen über ${W(x.hi * 1.25)} W, meist an Anstiegen oder beim Anfahren. Schalt dort früh in einen leichten Gang und roll lieber langsamer hoch.`]);
      tips.push([3, 'In der Gruppe fährst du lockere Einheiten am besten hinten im Windschatten oder mit Leuten, die sich ans Tempo halten.']); }
    else if (f.pct && x.t !== 'rec' && f.pct < x.lo * .9) tips.push([2, `Für die Grundlage darfst du etwas mehr Druck geben: Ziel sind ${W(x.lo)}–${W(x.hi)} W. Du warst bei ${e.np} W, also eher im Erholungsbereich.`]);
    if (f.coast >= 25 && ['base', 'long'].includes(x.t)) tips.push([3, `Du bist ${f.coast} % der Zeit nicht getreten. Tritt bergab und beim Rollen locker weiter oder wähl eine flachere Strecke, dann zählt mehr Zeit für die Grundlage.`]);
    if (f.fade != null && f.fade < 90 && e.sec >= 4500) tips.push([2, `In der zweiten Hälfte lag deine Leistung ${100 - f.fade} % niedriger. Iss ab der ersten Stunde regelmäßig (etwa 30–60 g Kohlenhydrate pro Stunde) und trink 500–750 ml pro Stunde.`]);
  }
  if (hc && steady) {
    if (hc.ceil && !hc.flag) good.push([2, `Dein Puls blieb im Grundlagenbereich (bis ${hc.ceil}).`]);
    if (hc.dec != null && hc.dec < 5 && e.sec >= 3600) good.push([3, 'Puls und Leistung blieben stabil gekoppelt. Das spricht für eine gute aerobe Basis.']);
    if (hc.flag && e.hasP) tips.push([0, 'Fahr die nächste lockere Einheit mit 5–10 % weniger Watt oder nach Pulsobergrenze, je nachdem, was zuerst greift.']);
    if (hc.flag) tips.push([1, hot ? 'Bei Hitze: früh am Morgen oder am Abend fahren, die Watt um 5–10 % senken, viel trinken und bei langen Fahrten Elektrolyte nutzen.' : `Stell im Radcomputer einen Pulsalarm bei ${hc.ceil} ein. Wird er laut, nimm Tempo raus, auch wenn die Watt noch passen.`]);
    if (hc.flag && !hot) tips.push([3, 'Läuft der Puls bei gleicher Leistung öfter hoch, achte auf Schlaf und Erholung. Bleibt es so, ist ein Ruhetag oft die bessere Wahl.']);
    if (hc.dec != null && hc.dec >= 5 && hc.dec <= 10 && !hc.flag && e.sec >= 4500) tips.push([3, 'Damit der Puls auf langen Fahrten stabiler bleibt: von Anfang an regelmäßig trinken und essen, nicht erst, wenn du Durst oder Hunger hast.']);
  } else if (steady && !e.hasP && !e.hr && x.t !== 'rec') tips.push([4, 'Mit Pulsgurt oder Powermeter kann die App deine Intensität bewerten und dir genauere Tipps geben.']);
  if (e.rpe) { const ex = RPEX[x.t] || [3, 6]; if (e.rpe >= ex[0] && e.rpe <= ex[1]) good.push([3, `Dein Empfinden (${e.rpe}/10) passt genau zur Einheit.`]); }
  if (durOk) good.push([6, 'Die geplante Dauer hast du genau eingehalten.']);
  if (good.length < 2 && !good.some(z => z[0] < 6) && e.dr >= .5) good.push([9, 'Du hast die Einheit durchgezogen. Regelmäßigkeit ist der wichtigste Faktor für deinen Fortschritt.']);
  const pick = l => [...new Set(l.sort((p, q) => p[0] - q[0]).map(z => z[1]))].slice(0, 3);
  return {good:pick(good), tips:pick(tips)};
}
const exeFbHtml = (fb, modal) => (!fb.good.length && !fb.tips.length) ? '' : `<div class="mt-3 space-y-2 ${esc(modal ? 'text-left' : '')}">${fb.good.length ? `<div class="p-2.5" style="border:1px solid var(--line);border-left:3px solid #0a8f6a"><p class="text-sm font-semibold" style="color:#0a8f6a">Gut gemacht</p><ul class="mt-1 space-y-1 text-sm">${fb.good.map(m => `<li class="flex gap-1.5"><span aria-hidden="true" style="color:#0a8f6a">✓</span><span>${esc(m)}</span></li>`).join('')}</ul></div>` : ''}${fb.tips.length ? `<div class="p-2.5" style="border:1px solid var(--line);border-left:3px solid #007f8d"><p class="text-sm font-semibold" style="color:#007f8d">Nächstes Mal</p><ul class="mt-1 space-y-1 text-sm">${fb.tips.map(m => `<li class="flex gap-1.5"><span aria-hidden="true" style="color:#007f8d">→</span><span>${esc(m)}</span></li>`).join('')}</ul></div>` : ''}</div>`;
function exeFbOf(e, w, i){
  if (!e.parts) return exeFb(e);
  const ps = exePArr(w, i).filter(Boolean), g = [], t = []; ps.forEach(p => { const r = exeFb(p); g.push(...r.good); t.push(...r.tips); });
  return {good:[...new Set(g)].slice(0, 3), tips:[...new Set(t)].slice(0, 3)};
}
/* Kurzkommentar zur Pulsprüfung: eine Zeile, Stufe ok / warn / info */
function exeHrKurz(x, a, hs, hc, hasP, steady){
  if (x.t === 'race') return null;
  if (!hs) return steady && hasP && x.t !== 'rec' ? {l:'info', t:'Keine Pulsdaten in der Datei, deshalb nur nach Watt bewertet.'} : null;
  if (!steady) return {l:'info', t:`Nur zur Info: Ø ${hs.avg}, max. ${hs.max}. Intervalle bewertet die App nach Watt, weil der Puls kurzen Belastungen hinterherhinkt.`};
  if (!hc || !hc.ceil) return {l:'info', t:`Ø ${hs.avg}. Nicht geprüft, weil maximale Herzfrequenz oder Schwellenpuls fehlen.`};
  const d = a.dec, hot = a.tAvg >= 25;
  if (hc.flag) return {l:'warn', t:hc.sh > 25 ? `Zu hoch für diese Einheit: ${hc.sh} % der Zeit über ${hc.ceil}${hot ? ', bei Hitze aber teils normal' : ''}. Nächstes Mal etwas ruhiger fahren.` : `Puls deutlich gedriftet (Entkopplung ${String(d).replace('.', ',')} %). Wahrscheinlich warst du heute über der aeroben Schwelle.`};
  if (hasP && d != null && a.sec >= 3600 && d >= 5) return {l:'ok', t:`Im Bereich bis ${hc.ceil}, mit leichter Drift (${String(d).replace('.', ',')} %). Bei langen Fahrten normal.`};
  return {l:'ok', t:`Passt: ${100 - hc.sh} % der Zeit bis ${hc.ceil}${hasP && d != null && a.sec >= 3600 ? `, Puls und Leistung stabil (${String(Math.max(0, d)).replace('.', ',')} %)` : ''}. Du warst in der Grundlage unterwegs.`};
}
const exeHrLine = (e, modal) => { const k = e.hrk; if (!k) return ''; const C = {ok:['✓', '#0a8f6a'], warn:['⚠', '#c2410c'], info:['ℹ', 'var(--mute)']}[k.l];
  return `<p class="mt-3 p-2.5 text-sm ${esc(modal ? 'text-left' : '')}" style="border:1px solid var(--line);border-left:3px solid ${esc(C[1])};background:var(--tint)"><b style="color:${esc(C[1])}">${C[0]} Puls-Check:</b> ${k.p ? `<span>${esc(k.p)}:</span> ` : ''}<span>${esc(k.t)}</span></p>`; };
const exeHrInfo = modal => `<div class="mt-3 text-xs" style="color:var(--mute)"><p class="font-semibold" style="color:var(--ink)">Wie bewertet die App den Puls?</p><p class="mt-1">Bei lockeren Einheiten (Zone 2) ist die Leistung die Vorgabe, der Puls zeigt, wie dein Körper sie heute verkraftet. Die aktuelle Trainingslehre setzt Zone 2 unterhalb der ersten Schwelle (LT1/VT1) an, und die liegt individuell sehr verschieden. Eine feste Pulsgrenze für alle gibt es nicht.</p><p class="mt-1">Die App prüft deshalb zwei Dinge: Wie viel Zeit nach den ersten 10 Minuten über deiner Pulsobergrenze lag (aus deinem Schwellenpuls, sonst aus der maximalen Herzfrequenz) und bei Fahrten ab 60 Minuten die Entkopplung, also wie stark der Puls bei gleicher Leistung von der ersten zur zweiten Hälfte steigt. Unter 5 % ist stabil, 5–10 % ist leichte Drift, über 10 % lag die Fahrt wahrscheinlich über der aeroben Schwelle.</p><p class="mt-1">Hitze und Flüssigkeitsverlust treiben den Puls bei gleicher Leistung nach oben. Ab 25 °C gibt die App deshalb 5 Schläge Spielraum und bewertet milder. Intervalle bewertet die App nur nach Watt, weil der Puls kurzen Belastungen hinterherhinkt.</p><p class="mt-1">Quellen: <a class="underline" target="_blank" rel="noopener" href="https://www.trainingpeaks.com/learn/articles/aerobic-endurance-and-decoupling/">Friel, Entkopplung</a> · <a class="underline" target="_blank" rel="noopener" href="https://www.gssiweb.org/research/article/influence-of-graded-dehydration-on-hyperthermia-and-cardiovascular-drift-during-exercise-">Montain & Coyle 1992</a> · <a class="underline" target="_blank" rel="noopener" href="https://public-pages-files-2025.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.596567/text">Rogers et al. 2021</a> · <a class="underline" target="_blank" rel="noopener" href="https://roadmancycling.com/blog/zone-2-cycling-heart-rate-vs-power-vs-rpe">Zone 2: Puls, Leistung, Empfinden</a></p></div>`;
/* Checkliste: eine Zeile pro Kriterium mit Status und Kurzwert */
function exeRows(e, w, i){
  const r = [], x = e.x || {}, A = {...(e.a || {}), ...(e.ah || {})}, hs = e.hr ? hrStat(e.hr) : null, steady = EXST.includes(x.t), ftp = (S.p && S.p.ftp) || 0;
  if (e.parts) {
    const pm = e.pm || 0; r.push([e.dr >= .9 && e.dr <= 1.3 ? 'ok' : e.dr >= .75 ? 'mid' : 'warn', 'Dauer', `${mm(Math.round(e.sec / 60))} von ${mm(pm)}`]);
    const arr = exePArr(w, i); (x.parts || arr).forEach((q, p) => { const pe = arr[p], lbl = (pe && pe.lbl) || (q && q.lbl) || (p ? 'Rückweg' : 'Hinweg');
      r.push(pe ? [pe.score >= 85 ? 'ok' : pe.score >= 50 ? 'mid' : 'warn', lbl, `${pe.score}/100`] : ['info', lbl, 'noch nicht hochgeladen']); });
  } else {
    const am = Math.round(e.sec / 60); r.push([e.dr >= .9 && e.dr <= 1.3 ? 'ok' : e.dr >= .75 ? 'mid' : 'warn', 'Dauer', `${mm(am)} von ${mm(e.pm)}`]);
    if (e.iv && e.iv.length) { const n = e.iv.filter(q => q.st === 'in').length; r.push([e.verdict === 'ok' ? (n === e.iv.length ? 'ok' : 'mid') : 'warn', 'Intervalle', `${n} von ${e.iv.length} im Ziel${e.verdict === 'over' ? ' · zu hart' : e.verdict === 'under' ? ' · zu schwach' : ''}`]); }
    else if (e.hasP && steady && e.np && ftp) r.push([e.verdict === 'ok' ? 'ok' : 'warn', 'Leistung', `${e.np} W · ${Math.round(e.np / ftp * 100)} % FTP${e.verdict === 'over' ? ' · zu hoch' : ''}`]);
    else if (!e.hasP && x.t !== 'race' && x.t !== 'test') r.push(['info', 'Leistung', 'keine Leistungsdaten']);
    if (x.t === 'test') { const hb = hbList(A); r.push(e.verdict === 'wrong' ? ['warn', 'Test am Stück', hb.length >= 2 ? `nein, ${hb.length} Intervalle erkannt` : 'nein, mit Pausen'] : (A.c20 != null || A.c30h != null) ? ['ok', 'Test am Stück', 'ja'] : ['info', 'Test am Stück', 'nicht prüfbar']); }
  }
  const k = e.hrk, c = e.hrc;
  if (k) { let v;
    if (c && c.ceil && steady) { const sh = Math.round(hrAbove(A.hrW || e.hr || {}, c.ceil + 3) * 100); v = k.l === 'warn' ? (sh > 25 ? `${sh} % über ${c.ceil}` : `Drift ${exeNum(c.dec)} %`) : `Ø ${hs ? hs.avg : e.hrAvg} · bis ${c.ceil} passt`; }
    else if (e.parts) v = k.l === 'warn' ? `${k.p || ''} zu hoch`.trim() : k.l === 'ok' ? 'passt' : 'nicht geprüft';
    else if (!hs) v = 'keine Pulsdaten';
    else if (!steady) v = `Ø ${hs.avg} · max. ${hs.max} · nur Info`;
    else v = `Ø ${hs.avg} · nicht geprüft`;
    r.push([k.l, 'Puls', v]); }
  if (c && c.dec != null && !e.parts && e.sec >= 3600 && e.hasP) r.push([c.dec < 5 ? 'ok' : c.dec <= 10 ? 'mid' : 'warn', 'Entkopplung', `${exeNum(Math.max(0, c.dec))} %`]);
  if (e.rpe) { const ex = RPEX[x.t] || [3, 6]; r.push([e.rpe >= ex[0] && e.rpe <= ex[1] ? 'ok' : 'mid', 'Empfinden', `${e.rpe}/10${e.feel ? ' · ' + FEEL[e.feel] : ''}`]); }
  return r;
}
const EXIC = {ok:['✓', '#0a8f6a'], mid:['~', '#9a6a00'], warn:['⚠', '#c2410c'], info:['–', 'var(--mute)']};
const exeRowsHtml = (rows, modal) => `<div class="mt-3 ${esc(modal ? 'text-left' : '')}" style="border:1px solid var(--line)">${rows.map(([l, k, v], n) => `<div class="flex items-start text-sm" style="gap:8px;padding:8px 10px;${esc(n ? 'border-top:1px solid var(--line)' : '')}"><span aria-hidden="true" class="shrink-0 text-center font-semibold" style="width:16px;color:${esc(EXIC[l][1])}">${EXIC[l][0]}</span><span class="shrink-0 font-semibold" style="width:6.6rem">${k}</span><span class="min-w-0 flex-1" style="color:${esc(l === 'warn' ? EXIC.warn[1] : 'var(--ink)')}">${esc(v)}</span></div>`).join('')}</div>`;
function exeBody(e, w, i, modal, part){
  const col = exeCol(e.score), ST = {in:['✓', '#0a8f6a', '#e3f6f0'], over:['↑', '#c2410c', '#fff1e6'], under:['↓', '#9a6a00', '#fff6dc'], miss:['–', '#c0392b', '#fdeceb']};
  const ivs = e.iv ? `<div class="mt-3"><p class="text-xs font-semibold" style="color:var(--mute)">Deine Intervalle (Ø Watt)</p><div class="mt-1.5 flex flex-wrap gap-1.5">${e.iv.map((f, k) => `<span class="px-2 py-1 text-xs font-semibold" style="background:${esc(ST[f.st][2])};color:${esc(ST[f.st][1])};border:1px solid ${esc(ST[f.st][1])}33">${k + 1}: ${f.w ? f.w + ' W' : '–'} ${ST[f.st][0]}</span>`).join('')}</div></div>` : '';
  return `<div class="flex items-center gap-3"><div class="flex shrink-0 items-center justify-center" style="width:58px;height:58px;border-radius:50%;border:4px solid ${esc(col)};color:${esc(col)}"><span class="hd text-xl font-semibold">${e.score == null ? '–' : e.score}</span></div>
    <div class="min-w-0 ${esc(modal ? 'text-left' : '')}"><p class="hd text-xl font-semibold" style="color:${esc(col)}">${e.grade}</p><p class="text-xs" style="color:var(--mute)"><span data-noi18n>${esc(e.n)}</span> · ${e.hrAvg ? 'Ø ' + e.hrAvg + ' bpm · ' : ''}${e.km > 0 ? e.km.toLocaleString(lang() === 'en' ? 'en-GB' : 'de-DE') + ' km · ' : ''}${mm(Math.round(e.sec / 60))} · TSS ${e.tss}</p></div></div>
    ${(() => { const m = e.grade === 'Anderes Training als geplant' ? e.msgs.find(z => z.startsWith('Geplant war') || z.startsWith('In der Fahrt steckt kein')) : e.verdict === 'nodata' ? e.msgs.find(z => z.startsWith('Die Datei enthält weder')) : null; return m ? `<p class="mt-3 p-2.5 text-sm ${esc(modal ? 'text-left' : '')}" style="border:1px solid var(--line);border-left:3px solid ${esc(e.verdict === 'nodata' ? 'var(--mute)' : '#c0392b')}">${esc(m)}</p>` : ''; })()}
    ${typeof vzPrBadge === 'function' ? vzPrBadge(e) : ''}${exeRowsHtml(exeRows(e, w, i), modal)}${ivs}${typeof vzRide === 'function' ? vzRide(e) : ''}${exeFbHtml(exeFbOf(e, w, i), modal)}
    <details class="mt-3 text-sm ${esc(modal ? 'text-left' : '')}"><summary class="cursor-pointer text-sm font-semibold" style="color:var(--teal)">Details zur Bewertung</summary><ul class="mt-2 space-y-1.5" style="list-style:disc;padding-left:1.1rem">${[...e.msgs, ...(e.hm || [])].map(m => `<li>${esc(m)}</li>`).join('')}</ul>${e.hrc ? exeHrInfo(modal) : ''}</details>
    ${e.hrNeed && !hrCeil(e.x || {}, e.a || {}) ? `<div class="mt-3 flex flex-wrap items-end gap-2 ${esc(modal ? 'text-left' : '')}"><label class="block"><span class="mb-1 block text-xs" style="color:var(--mute)">Maximale Herzfrequenz</span><input type="number" inputmode="numeric" class="inp !w-28 !py-2" placeholder="185"></label><button class="ghost !py-2 text-sm" onclick="exeHr(${ja(w)}, ${ja(i)}, this)">Puls auswerten</button></div>` : ''}
    ${exeSub(e).length ? `<ul class="mt-2 space-y-1.5 text-sm ${esc(modal ? 'text-left' : '')}" style="list-style:disc;padding-left:1.1rem">${exeSub(e).map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    ${part ? '' : !e.rpe || !e.feel ? `<div class="mt-3 p-2.5 ${esc(modal ? 'text-left' : '')}" style="border:1px solid var(--ice);background:#e6f7f6">${!e.rpe ? `<p class="text-sm font-semibold">Wie anstrengend war die Einheit?</p><p class="text-xs" style="color:var(--mute)">1 = sehr leicht, 10 = maximal</p><div class="mt-1.5 grid gap-1" style="grid-template-columns:repeat(10,minmax(0,1fr))">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="text-sm font-semibold" style="border:1px solid var(--line);background:#fff;padding:8px 0;text-align:center" onclick="exeFeel(${ja(w)}, ${ja(i)}, 'rpe', ${ja(n)})">${n}</button>`).join('')}</div>` : ''}
      ${!e.feel ? `<p class="${esc(e.rpe ? '' : 'mt-3 ')}text-sm font-semibold">Wie fühlst du dich jetzt?</p><div class="mt-1.5 flex flex-wrap gap-1.5">${Object.entries(FEEL).map(([k, l]) => `<button class="text-sm font-semibold" style="border:1px solid var(--line);background:#fff;padding:8px 12px" onclick="exeFeel(${ja(w)}, ${ja(i)}, 'feel', '${ja(k)}')">${l}</button>`).join('')}</div>` : ''}
      <p class="mt-2 text-xs" style="color:var(--mute)">Dein Empfinden sagt oft mehr als die Messwerte und fließt in die Anpassung ein.</p></div>` : ''}
    ${e.adj && !part ? `<p class="mt-3 p-2.5 text-sm ${esc(modal ? 'text-left' : '')}" style="background:var(--tint);border:1px solid var(--line)"><b>Plan:</b> ${esc(e.adj)}</p>` : ''}`;
}
function exeBlock(x, i, cur){
  if (!S.p || !x.m || x.t === 'rest') return '';
  const w = exeWk(), e = exeGet(w, i), can = !!S.plan && (cur || (!hasStarted(S.p) && w === S.wk));
  const up = l => `<label class="ghost inline-block cursor-pointer !py-2 text-sm">${exeBusy === i ? 'Wird ausgewertet …' : l}<input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeUpload(this, ${ja(i)})"></label>`;
  const err = exeErr && exeErr.i === i ? `<p class="mt-2 text-sm" style="color:#c0392b">⚠ ${esc(exeErr.t)}</p>` : '';
  if (x.parts) {
    const arr = exePArr(w, i), upP = (l, p) => `<label class="ghost inline-block cursor-pointer !py-1.5 text-sm">${exeBusy === i ? 'Wird ausgewertet …' : l}<input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeUpload(this, ${ja(i)}, ${ja(p)})"></label>`;
    if (!e && !can) return '';
    const rows = x.parts.map((q, p) => { const pe = arr[p]; return `<div class="flex flex-wrap items-center gap-2 py-2" style="border-top:1px solid var(--line)"><span class="min-w-0 flex-1 text-sm"><b>${q.lbl}</b> <span style="color:var(--mute)">${mm(q.m)}</span></span>${pe ? `<button class="ghost !px-3 !py-1.5 text-sm" style="color:${esc(exeCol(pe.score))};border-color:${esc(exeCol(pe.score))}" onclick="exeShow='${ja(w)}-${ja(i)}-${ja(p)}';render()">${pe.score}/100 ansehen</button><button class="text-xs underline" style="color:var(--mute)" onclick="exePDel(${ja(w)}, ${ja(i)}, ${ja(p)})">entfernen</button>` : can ? upP(q.lbl + ' hochladen', p) : '<span class="text-sm" style="color:var(--mute)">offen</span>'}</div>`; }).join('');
    return `<div class="p-3" style="border:1px ${esc(e ? 'solid' : 'dashed')} var(--line)"><p class="${esc(e ? 'eyebrow mb-2' : 'font-semibold')}">${e ? 'Bewertung deiner Fahrten' : 'Wie liefen deine Fahrten?'}</p><p class="text-xs" style="color:var(--mute)">An Pendeltagen fährst du zwei Fahrten. Lade Hin- und Rückweg einzeln hoch (FIT, GPX oder TCX). Die App bewertet jede gegen ihre Vorgabe und fasst den Tag zusammen.</p>
      ${e ? `<div class="mt-3">${exeBody(e, w, i)}</div>` : ''}${e && e.acts.length ? `<div class="mt-3 flex flex-wrap gap-2">${e.acts.map(a => `<button class="${esc(a[2] ? 'btn !w-auto' : 'ghost')} lbl !py-1.5" onclick="${exeAct(a[1])}">${a[0]}</button>`).join('')}</div>` : ''}<div class="mt-3">${rows}</div>${err}</div>`;
  }
  if (e) return `<div class="p-3" style="border:1px solid var(--line)"><p class="eyebrow mb-2">Bewertung deiner Fahrt</p>${exeBody(e, w, i)}
    ${e.acts.length ? `<div class="mt-3 flex flex-wrap gap-2">${e.acts.map(a => `<button class="${esc(a[2] ? 'btn !w-auto' : 'ghost')} lbl !py-1.5" onclick="${exeAct(a[1])}">${a[0]}</button>`).join('')}</div>` : ''}
    <div class="mt-3 flex flex-wrap gap-2">${can ? up('Andere Fahrt hochladen') : ''}<button class="ghost !py-2 text-sm" onclick="exeDel(${ja(w)}, ${ja(i)})">Bewertung entfernen</button></div>${err}</div>`;
  if (!can) return '';
  return `<div class="p-3" style="border:1px dashed var(--line)"><p class="font-semibold">Wie lief die Einheit?</p><p class="mt-1 text-xs" style="color:var(--mute)">Lade deine aufgezeichnete Fahrt hoch (FIT, GPX oder TCX, z. B. aus Strava, Garmin Connect, Wahoo oder Zwift). Die App vergleicht sie mit der Vorgabe, gibt dir eine Rückmeldung und passt den Plan bei Bedarf an.</p><div class="mt-2">${up('Fahrt hochladen und bewerten')}</div>${err}</div>`;
}
function exeModal(){
  if (!exeShow || !S.p) return ''; const [w, i, pp] = String(exeShow).split('-').map(Number), part = !isNaN(pp);
  const e = part ? exePArr(w, i)[pp] : (S.p.exe || {})[exeShow]; if (!e) { exeShow = null; return ''; }
  if (part) { const c = exeGet(w, i), nx = c && c.partial ? (c.parts || []).findIndex(z => !z) : -1, xx = w === S.wk && S.plan ? S.plan[i] : null;
    return `<div class="exov" onclick="if(event.target===this)exeClose()" role="dialog" aria-modal="true" aria-label="Bewertung deiner Fahrt"><div class="exbox" style="max-width:460px"><p class="eyebrow mb-2">Bewertung · ${esc(e.lbl)} · ${esc(c ? c.plan : e.plan)}</p>${exeBody(e, w, i, true, true)}
      ${c ? `<p class="mt-3 p-2.5 text-sm text-left" style="background:var(--tint);border:1px solid var(--line)">${c.partial ? `<b>Tag bisher:</b> ${c.score}/100. ${esc(c.msgs[c.msgs.length - 1])}` : `<b>Ganzer Tag:</b> ${c.score}/100, ${esc(c.grade.toLowerCase())}.`}${c.adj ? ' ' + esc(c.adj) : ''}</p>` : ''}
      <div class="mt-4" style="display:flex;flex-direction:column;gap:8px">${e.acts.map(a => `<button class="${esc(a[2] ? 'btn' : 'ghost')} lbl" style="text-align:center;width:100%" onclick="exeShow=null;${exeAct(a[1])}">${a[0]}</button>`).join('')}${nx >= 0 && xx && xx.parts ? `<label class="ghost lbl cursor-pointer" style="text-align:center;width:100%">${xx.parts[nx].lbl} jetzt hochladen<input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeShow=null;exeUpload(this, ${ja(i)}, ${ja(nx)})"></label>` : ''}${c && !c.partial && (!c.rpe || !c.feel) ? `<button class="btn lbl" style="text-align:center;width:100%" onclick="exeShow='${ja(w)}-${ja(i)}';render()">Weiter: Empfinden eintragen</button>` : `<button class="${esc(e.acts.some(a => a[2]) ? 'ghost' : 'btn')} lbl" style="text-align:center;width:100%" onclick="exeClose()">${e.acts.length ? 'Später' : 'Alles klar'}</button>`}</div></div></div>`; }
  return `<div class="exov" onclick="if(event.target===this)exeClose()" role="dialog" aria-modal="true" aria-label="Bewertung deiner Fahrt"><div class="exbox" style="max-width:460px"><p class="eyebrow mb-2">Bewertung · ${esc(e.plan)}</p>${exeBody(e, w, i, true)}
    <div class="mt-4" style="display:flex;flex-direction:column;gap:8px">${e.acts.map(a => `<button class="${esc(a[2] ? 'btn' : 'ghost')} lbl" style="text-align:center;width:100%" onclick="exeShow=null;${exeAct(a[1])}">${a[0]}</button>`).join('')}<button class="${esc(e.acts.some(a => a[2]) ? 'ghost' : 'btn')} lbl" style="text-align:center;width:100%" onclick="exeClose()">${e.acts.length ? 'Später' : 'Alles klar'}</button></div></div></div>`;
}

