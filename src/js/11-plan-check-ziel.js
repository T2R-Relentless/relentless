/* ---------- Plan-Check: reicht der Plan für das Ziel? Hinweise, Maßnahmen, Ergebnisausblick ---------- */
const sdLim = d => { const e = d.goal === 'event' ? d.eventDate : d.endDate; return e ? addD(mondayOf(e), -51 * 7) : null; };
const sd40 = (d, sd) => { const l = sdLim(d); return l && sd < l ? l : sd; };
function mkPrev(d){
  const keepS = !!(S.edit && S.p && hasStarted(S.p)), sd0 = sd40(d, d.startDate && d.startDate > iso(0) ? d.startDate : iso(0));
  const cmu = !!d.commuter, dm = [...d.dayMin], tot = d.avail.reduce((q, a, i) => q + (a ? (dm[i] || 0) : 0), 0);
  return {...d, avail:[...d.avail], commuter:cmu, commute:cmu ? [...d.commute] : d.commute.map(() => false), dayMin:dm, perDay:!!d.perDay, weight:rngClamp('weight', d.weight, 75), ftp:rngClamp('ftp', d.ftp, 200), hours:d.perDay ? Math.max(.5, tot / 60) : Math.max(rngClamp('hours', d.hours, 6), comSum(d) / 60), commuteMin:d.commuteMin > 0 ? d.commuteMin : 20, start:keepS ? S.p.start : mondayOf(sd0), startDate:keepS ? S.p.startDate : sd0};
}
const _psC = new Map();
function planStats(p){
  const key = JSON.stringify({...p, course:p.course ? p.course.hm + ':' + p.course.seg.length + ':' + (p.course.laps || 1) : 0});
  if (_psC.has(key)) return _psC.get(key);
  const ph = phases(p), tot = ph[ph.length - 1].to; let sum = 0, n = 0, maxL = 0;
  for (let w = 1; w <= tot; w++) {
    const pl = genWeek(p, w, true), k = (ph.find(x => w >= x.from && w <= x.to) || {}).key;
    if (k !== 'taper' && w > 1) { sum += pl.reduce((q, x) => q + (x.m || 0), 0); n++; }
    pl.forEach(x => { if (x.t === 'long' && !/^(Eventtag|Deine Zieltour)/.test(x.n)) maxL = Math.max(maxL, x.m); });
  }
  const out = {tot, hAvg:n ? sum / n / 60 : p.hours, maxL}; if (_psC.size > 30) _psC.clear(); _psC.set(key, out); return out;
}
/* FTP-Prognose: Faustmodell. Möglicher Zuwachs G (in %) hängt von den Wochenstunden und vom Leistungsniveau ab und nähert sich mit der Zeit einem Plateau. */
function ftpProj(p, h, weeks){
  const wkg = p.ftp / kgOf(p), lvl = wkg < 2.5 ? 1.4 : wkg < 3.2 ? 1 : wkg < 4 ? .7 : wkg < 4.5 ? .5 : .35;
  if (p.intF && h < 8) h += Math.min(2, (8 - h) * .4);
  let G = Math.min(20, Math.max(4, 1.5 * h)) * lvl; if (p.startH > 0 && h > p.startH) G *= 1 + .3 * Math.min(1, (h - p.startH) / p.startH);
  const g = G * (1 - Math.exp(-Math.max(0, weeks) / 12)) / 100;
  return {mid:Math.round(p.ftp * (1 + g)), lo:Math.round(p.ftp * (1 + g * .6)), hi:Math.round(p.ftp * (1 + g * 1.4)), g, lvl, G};
}
function hRec(p, tev){
  if (p.goal === 'event') { const pr = evProfile(p); if (pr && pr.ty === 'ultra') return [10, 15]; return tev <= 180 ? [5, 8] : tev <= 360 ? [7, 10] : [9, 13]; }
  return p.goal === 'ftp' ? [6, 10] : [4, 8];
}
function evTime(p, ftp, kg, dr){ const r = evCheck({...p, ftp, weight:kg || p.weight, draft:dr || p.draft}); return r && r.real ? r.real : null; }
/* Wenig Zeit: Intensität statt Umfang (sinnvoll für FTP-Ziele, „schneller werden“ und Events bis etwa 3 Std.) */
const intOk = (p, tev) => p.goal === 'ftp' || (p.goal === 'fitness' && p.ffocus === 'speed') || (p.goal === 'event' && tev > 0 && tev <= 180);
/* Renntag-Hebel: Annahmen als Faktor auf die haltbare Dauerleistung */
const LEV = {
  fuel:{n:'Verpflegung nach Plan', d:'60 bis 90 g Kohlenhydrate pro Stunde, ab jetzt bei jedem Long Ride trainiert (Darmtraining)', a:tev => tev > 150 ? 3 : tev > 90 ? 1.5 : 0, ic:'gel'},
  pace:{n:'Pacing nach Plan', d:'erste Stunde kontrolliert, gleichmäßig fahren, Anstiege nicht überziehen. Dein Pacing-Plan kommt auf den Eventtag und in die Eventsimulationen', a:tev => tev >= 60 ? 1.5 : 0, ic:'gauge'},
  caf:{n:'Koffein am Renntag', d:'etwa 3 mg pro kg 60 Min. vor dem Start, vorher in einer Eventsimulation getestet', a:() => 2, ic:'bolt'}
};
const levMult = (p, tev) => Object.keys(LEV).reduce((m, k) => m * (p.lev && p.lev[k] ? 1 + LEV[k].a(tev) / 100 : 1), 1);
function paceTxt(p, pr){
  const tev = pr && pr.tev ? pr.tev : 180, ifs = Math.max(.6, 1 - .1 * Math.log(Math.max(1, tev / 60))), hi = Math.round(ifs * 100), lo = hi - 8, cl = Math.min(100, hi + 10), W = x => Math.round(p.ftp * x / 100);
  return `Pacing-Plan: erste Stunde höchstens ${hi} % FTP, im Flachen ${lo} bis ${hi} %, an Anstiegen höchstens ${cl} % (mit deinem heutigen FTP ${W(lo)} bis ${W(hi)} W, am Berg bis ${W(cl)} W, nach einem neuen FTP-Test anpassen). In der zweiten Hälfte nur steigern, wenn es sich gut anfühlt.`;
}
/* Der Nutzer entscheidet: bewusst beibehaltenes Ziel (gilt nur für genau diesen Zielwert) */
const tgtSig = p => p.goal === 'event' ? 'e|' + p.targetTime : 'f|' + p.ftpTarget;
const ackOn = p => !!(p && p.tgtAck && p.tgtAck === tgtSig(p));
function planCheck(p, live){
  const st = planStats(p), cw = live && hasStarted(p) ? curWeek(p) : 1, weeks = Math.max(0, st.tot - cw + 1), h = st.hAvg, pr = p.goal === 'event' ? evProfile(p) : null;
  const tev = pr ? pr.tev : 0, rec = hRec(p, tev), notes = [], kg = kgOf(p);
  const lRec = p.goal !== 'event' ? (p.goal === 'fitness' ? (p.ffocus === 'endur' && p.ftour ? Math.min(300, Math.round(p.ftour * .8 / 15) * 15) : p.ffocus === 'health' || p.ffocus === 'restart' ? 90 : p.ffocus === 'speed' ? 120 : 150) : 150) : tev <= 180 ? 150 : Math.min(360, Math.round(.7 * Math.min(tev, 420) / 15) * 15);
  const pen = p.goal === 'event' && tev > 180 ? Math.max(0, Math.min(.05, (.7 - st.maxL / Math.min(tev, 420)) * .25)) : 0;
  const base = ftpProj(p, h, weeks);
  const ratio = hAv(p) > 0 && h > 0 ? Math.min(1, h / hAv(p)) : .85, toH = x => Math.min(20, Math.ceil(x / ratio * 2) / 2);
  const boost = (hA, L, why) => { const H = toH(hA); if (H <= hAv(p) + .1 && !(L && p.perDay && (p.dayMin[p.longDay] || 0) < L)) return null; const dm = p.perDay ? boostDays(p, H, L) : null, nh = dm ? dsum({...p, dayMin:dm}) / 60 : H;
    const diff = dm ? SD.map((x, i) => p.avail[i] && dm[i] > (p.dayMin[i] || 0) ? `${x} +${dm[i] - (p.dayMin[i] || 0)}` : null).filter(Boolean).join(', ') + ' Min.' : '';
    return ['boost', nh + '|' + (L || 0), `${why}: ${hStd(nh)} statt ${hStd(hAv(p))} Std. pro Woche${diff ? ' (' + diff + ')' : ''}`, 1]; };
  if (hAv(p) < rec[0] * .9) notes.push({lv:2, t:`Mehr Umfang würde helfen: Du hast ${hStd(hAv(p))} Std. pro Woche verfügbar. Für ${p.goal === 'event' ? 'ein Event dieser Dauer' : 'dieses Ziel'} sind ${rec[0]} bis ${rec[1]} Std. üblich.`, acts:[boost(rec[0] * ratio, 0, 'In den Plan übernehmen')].filter(Boolean), hint:'Übernimm das nur, wenn du die Zeit im Alltag wirklich hast.'});
  if (st.maxL < lRec - 15) {
    const ld = p.longDay, capL = p.perDay && p.dayMin ? (p.dayMin[ld] || 0) : 999;
    notes.push({lv:pen > .02 ? 2 : 1, t:`Beim Long Ride steckt noch Potenzial: Der längste Ride im Plan dauert ${mm(st.maxL)}${tev ? `, das Event etwa ${hm2(tev)} Stunden` : ''}. Empfohlen sind mindestens ${mm(lRec)} am ${DAYS[ld] || 'Wochenende'}.`,
      act:capL < lRec ? ['longDay', lRec, `Zeit am ${DAYS[ld]} auf ${mm(lRec)} setzen`] : !p.longPri ? ['longPri', 1, 'Long Ride priorisieren'] : null, hint:p.longPri && capL >= lRec ? 'Der Long Ride ist schon priorisiert. Mehr Wochenstunden verlängern ihn weiter.' : ''});
  }
  if (p.goal === 'event' && tev > 300 && st.tot < 10) notes.push({lv:1, t:`Kurze Vorbereitung: ${st.tot} Wochen bis zum Event. Für mehr als 5 Std. Renndauer sind 12 bis 16 Wochen ideal. Der Plan holt das Beste aus der Zeit heraus, große Leistungssprünge sind aber nicht zu erwarten.`});
  if (p.goal === 'event') (p.subs || []).forEach(s => { const dd = Math.round((new Date(p.eventDate) - new Date(s.date)) / 864e5); if (dd <= 0) notes.push({lv:1, t:`Zwischenevent „${esc(s.name)}“ liegt nicht vor dem Hauptevent (${fmt(s.date)}) und wird im Plan nicht berücksichtigt. Entferne es oder ändere das Datum.`, act:['subDel', s.id, 'Zwischenevent entfernen']}); else if (s.prio === 'B' && dd < 21) notes.push({lv:1, t:`Zwischenevent „${esc(s.name)}“ liegt nur ${dd} Tage vor dem Hauptevent. Fahre es besser als C-Rennen (kontrolliert, ohne volle Ausbelastung), damit du frisch ins Hauptevent gehst.`, act:['subC', s.id, 'Als C-Rennen einplanen']}); });
  if (p.startH > 0 && hAv(p) > p.startH * 1.6) notes.push({lv:1, t:`Großer Sprung im Umfang: bisher ${hStd(p.startH)} Std., geplant ${hStd(hAv(p))} Std. pro Woche. Der Plan steigert schrittweise, achte trotzdem auf Schlaf und Erholung.`});
  const sc = [];
  let verdict = null, gap = null, relaxed = false;
  if (p.goal === 'event') {
    const tgt = (r => r ? +r[1] * 60 + +r[2] : 0)(/^(\d+):(\d{1,2})$/.exec(String(p.targetTime).trim()));
    const lm = levMult(p, tev), row = (l, eff, pj, pn, w, dr) => { const t = evTime(p, pj.mid * (1 - pn) * lm, w, dr), tl = evTime(p, pj.hi * (1 - pn) * lm, w, dr), th = evTime(p, pj.lo * (1 - pn) * lm, w, dr); return {l, eff, ftp:pj, t, tl, th}; };
    sc.push(row('Dein Plan', `${hStd(hAv(p))} Std. pro Woche verfügbar, längster Ride ${mm(st.maxL)}`, base, pen));
    const p2 = ftpProj(p, h + 2 * ratio, weeks); sc.push(row('Mehr Umfang', '+2 Std. pro Woche', p2, pen));
    if (pen > 0) sc.push(row('Long Ride nach Empfehlung', `Long Ride bis ${mm(lRec)}`, base, 0));
    if (intOk(p, tev) && !p.intF) sc.push(row('Mehr Intensität', '2 bis 3 harte Einheiten, gleiche Wochenzeit', ftpProj({...p, intF:true}, h, weeks), pen));
    if (pr && pr.hk >= 10 && kg >= 62) sc.push(row('Leichter am Berg', '−2 kg Körpergewicht', base, pen, kg - 2));
    if (pr && pr.race && pr.hk < 15 && (p.draft || 'grp') !== 'pel') sc.push(row('Mehr Windschatten', 'im Hauptfeld bleiben (Fahrtechnik, Positionierung)', base, pen, kg, 'pel'));
    if (sc.length > 2) sc.push(row('Alles kombiniert', 'alle Maßnahmen oben', p2, 0, pr && pr.hk >= 10 && kg >= 62 ? kg - 2 : kg, pr && pr.race && pr.hk < 15 ? 'pel' : p.draft));
    const t0 = sc[0];
    if (!t0.t) notes.unshift({lv:3, t:'Für die Zielzeit-Prognose fehlen noch Distanz und Höhenmeter deines Events. Trag sie ein, dann prüft die App, ob deine Zielzeit zum Plan passt.', act:['editEv', 0, 'Strecke eintragen']});
    verdict = !tgt || !t0.t ? null : t0.t && t0.t <= tgt ? 'ok' : t0.tl && t0.tl <= tgt ? 'mid' : 'high';
    if (verdict && verdict !== 'ok') {
      const tP = x => evTime(p, ftpProj(p, x, weeks).mid * lm, null), hMax = Math.min(rec[1] * ratio, Math.max(h * 1.5, rec[0] * ratio)), L = pen > 0 || st.maxL < lRec - 15 ? lRec : 0;
      let hb = null; for (let x = Math.ceil(h * 2) / 2 + .5; x <= hMax; x += .5) { const t = tP(x); if (t && t <= tgt) { hb = x; break; } }
      const hu = hb || hMax, tb = tP(hu), b = tb && t0.t && tb < t0.t - 4 ? boost(hu, L, hb ? 'Plan so anpassen, dass das Ziel erreichbar wird' : 'Plan bestmöglich verbessern') : null;
      const tx = b ? ` <b>${hb ? 'Erreichbar' : 'Bestmöglich'} mit Anpassung:</b> etwa ${hm2(tb)} Std. erwartet, wenn du ${hStd(+b[1].split('|')[0])} Std. pro Woche zur Verfügung hast${L ? ' und der Long Ride Vorrang bekommt' : ''}. Wegen Aufbau- und Entlastungswochen trainierst du davon im Schnitt etwa ${hStd(hu)} Std.` : '';
      if (b) notes.forEach(n => { if (n.acts && n.acts[0] && n.acts[0][0] === 'boost') n.acts = []; });
      const tI = intOk(p, tev) && !p.intF ? evTime(p, ftpProj({...p, intF:true}, h, weeks).mid * (1 - pen) * lm, null) : null, aI = tI && t0.t && tI < t0.t - 1 ? ['intF', 1, `Intensität statt Umfang: gleiche Zeit, erwartet etwa ${hm2(tI)} Std.`, b ? 0 : 1] : null;
      const lvT = Object.keys(LEV).filter(k => !(p.lev && p.lev[k]) && LEV[k].a(tev) > 0).length ? ' Prüfe auch die Renntag-Hebel weiter unten.' : '';
      const lgT = tev > 180 && !(p.lev && Object.keys(p.lev).every(k => p.lev[k])) ? ' Bei mehr als 3 Std. Renndauer kommt die Ausdauer vor allem aus langen Fahrten, darum hilft hier der Long Ride mehr als zusätzliche Intervalle.' : '';
      notes.unshift({lv:verdict === 'high' ? 2 : 1, t:`Zielzeit ${p.targetTime} Std.: ${verdict === 'mid' ? 'in Reichweite, wenn das Training gut läuft' : 'mit dem aktuellen Plan noch nicht ganz drin'}. Aktuell zeichnen sich etwa ${t0.t ? hm2(t0.t) : '–'} Std.${tx}${!b && sc.slice(1).some(x => x.t && x.t <= tgt) ? ' Mit den Maßnahmen unten wird sie realistischer.' : ''}${lgT}${lvT}`,
        acts:[b, aI, t0.t ? ['target', hm2(Math.ceil(t0.t / 5) * 5), `${b || aI ? 'Stattdessen ' : ''}Zielzeit auf ${hm2(Math.ceil(t0.t / 5) * 5)} setzen (passt zum aktuellen Plan)`] : null].filter(Boolean),
        hint:b ? 'Mehr Umfang nur übernehmen, wenn du die Zeit im Alltag wirklich hast. Gewicht und Windschatten aus dem Ausblick sind keine Planänderungen und werden nicht übernommen.' : ''});
    }
    if (tgt && t0.t && verdict && verdict !== 'ok' && ackOn(p)) {
      const i = notes.findIndex(n => n.t.startsWith(`Zielzeit ${p.targetTime} Std.:`)), need = (evCheck(p) || {}).ftpNeed;
      const an = {lv:1, t:`<b>Dein Ziel, deine Entscheidung:</b> Du hältst an ${p.targetTime} Std. fest. Mit diesem Plan erwartet die App etwa ${hm2(t0.t)} Std.${need ? ` Für dein Ziel brauchst du am Eventtag etwa ${need} W FTP, erwartet sind etwa ${base.mid} W.` : ''} Was das für dich bedeutet: Pacing-Plan und Verpflegung richten sich nach deiner Zielzeit. Fährst du dieses Tempo von Anfang an, kann die zweite Hälfte sehr hart werden. Entscheide unterwegs nach Gefühl und Watt, ob du es hältst.`, acts:[['ack', 0, 'Optionen wieder ansehen']]};
      if (i >= 0) notes[i] = an; else notes.unshift(an);
    }
    if (tgt && t0.t && tgt > t0.t * 1.05) {
      let xl = null; for (let x = 1.5; x < h; x += .25) { const t = evTime(p, ftpProj(p, x, weeks).mid * (1 - pen) * lm, null); if (t && t <= tgt * .97) { xl = x; break; } }
      const Hl = xl ? Math.max(toH(xl), rec[0]) : null, less = Hl && Hl < hAv(p) - .4, tE = hm2(Math.ceil(t0.t / 5) * 5); relaxed = true;
      notes.unshift({lv:0, t:`<b>Dein Ziel hat Puffer:</b> ${p.targetTime} Std. ist entspannter als die etwa ${hm2(t0.t)} Std., die dein Plan erwarten lässt. Das ist völlig in Ordnung, du entscheidest. Was das bedeutet: Dein Training bleibt auf dein Leistungspotenzial ausgelegt, du kommst also voraussichtlich früher ins Ziel. Pacing-Plan und Verpflegung richten sich nach deiner Zielzeit: ruhiger fahren und für eine längere Fahrzeit verpflegen.${less ? ` Für dein Ziel würden auch etwa ${hStd(Hl)} statt ${hStd(hAv(p))} Std. pro Woche reichen. Weniger empfiehlt die App für ein Event dieser Dauer nicht, damit du die Strecke gut durchstehst.` : ''}`,
        acts:[less ? ['setH', Hl, `Weniger trainieren: ${hStd(Hl)} statt ${hStd(hAv(p))} Std. pro Woche`] : null, ['target', tE, `Ehrgeiziger: Zielzeit ${tE} (passt zum aktuellen Plan)`]].filter(Boolean)});
    }
    gap = tgt;
  } else {
    const p2 = ftpProj(p, h + 2 * ratio, weeks), p4 = ftpProj(p, h, weeks + 6);
    sc.push({l:'Dein Plan', eff:`${hStd(hAv(p))} Std. pro Woche verfügbar${p.intF ? ', mehr Intensität' : ''}`, ftp:base}, {l:'Mehr Umfang', eff:'+2 Std. pro Woche', ftp:p2}, {l:'Mehr Zeit', eff:'Zieltermin 6 Wochen später', ftp:p4});
    if (intOk(p, 0) && !p.intF) sc.push({l:'Mehr Intensität', eff:'2 bis 3 harte Einheiten, gleiche Wochenzeit', ftp:ftpProj({...p, intF:true}, h, weeks)});
    if (p.goal === 'ftp') {
      verdict = base.mid >= p.ftpTarget ? 'ok' : base.hi >= p.ftpTarget ? 'mid' : 'high';
      let hn = null; for (let x = h; x <= Math.min((rec[1] + 2) * ratio, Math.max(h * 1.6, rec[1] * ratio)); x += .25) if (ftpProj(p, x, weeks).mid >= p.ftpTarget) { hn = x; break; }
      if (verdict !== 'ok') notes.unshift({lv:verdict === 'high' ? 2 : 1, t:`Ziel-FTP ${p.ftpTarget} W: ${verdict === 'mid' ? 'in Reichweite, wenn das Training gut läuft' : 'mit dem aktuellen Plan noch nicht ganz drin'}. Aktuell zeichnen sich ${base.lo} bis ${base.hi} W.${hn ? ` Mit etwa ${hStd(toH(hn))} Std. pro Woche verfügbarer Zeit wird es realistisch.` : ' Für diesen Sprung ist die Zeit bis zum Termin kurz. Ein Zwischenziel bringt dich trotzdem klar voran.'}${!hn && p4.mid >= p.ftpTarget ? ' Mit 6 Wochen mehr Zeit wird es realistisch.' : ''}`,
        acts:[intOk(p, 0) && !p.intF && ftpProj({...p, intF:true}, h, weeks).mid > base.mid ? ['intF', 1, `Intensität statt Umfang: gleiche Zeit, erwartet etwa ${ftpProj({...p, intF:true}, h, weeks).mid} W`, hn ? 0 : 1] : null, hn ? (notes.forEach(n => { if (n.acts && n.acts[0] && n.acts[0][0] === 'boost') n.acts = []; }), boost(hn, 0, 'Plan so anpassen, dass das Ziel erreichbar wird')) : null, p4.mid >= p.ftpTarget || (!hn && p4.mid > base.mid) ? ['endDate', addD(p.endDate, 42), `Zieltermin um 6 Wochen verschieben (${fmt(addD(p.endDate, 42))})`, hn ? 0 : 1] : null, ['ftpTarget', base.mid, `${hn ? 'Stattdessen ' : ''}Ziel auf ${base.mid} W setzen`]].filter(Boolean),
        hint:hn ? 'Mehr Umfang nur übernehmen, wenn du die Zeit im Alltag wirklich hast.' : ''});
      if (verdict !== 'ok' && ackOn(p)) { const i = notes.findIndex(n => n.t.startsWith(`Ziel-FTP ${p.ftpTarget} W:`)), an = {lv:1, t:`<b>Dein Ziel, deine Entscheidung:</b> Du hältst an ${p.ftpTarget} W fest. Erwartet sind etwa ${base.mid} W (${base.lo} bis ${base.hi} W). Was das für dich bedeutet: Deine Trainingsbereiche richten sich weiter nach deinem aktuellen FTP, der Plan wird dadurch nicht härter. Und jedes Watt mehr ist ein Fortschritt, auch wenn es am Ende nicht ganz ${p.ftpTarget} W werden.`, acts:[['ack', 0, 'Optionen wieder ansehen']]}; if (i >= 0) notes[i] = an; else notes.unshift(an); }
      if (p.ftpTarget > 0 && p.ftpTarget < base.lo) {
        let xl = null; for (let x = 1.5; x < h; x += .25) if (ftpProj(p, x, weeks).mid >= p.ftpTarget * 1.02) { xl = x; break; }
        const Hl = xl ? Math.max(toH(xl), rec[0] * .75) : null, less = Hl && Hl < hAv(p) - .4; relaxed = true;
        notes.unshift({lv:0, t:`<b>Dein Ziel hat Puffer:</b> ${p.ftpTarget} W liegen unter den etwa ${base.mid} W, die dein Plan erwarten lässt. Das ist völlig in Ordnung, du entscheidest. Was das bedeutet: Der Plan trainiert weiter auf dein Potenzial, du wirst dein Ziel voraussichtlich übertreffen.${less ? ` Für dein Ziel würden auch etwa ${hStd(Hl)} statt ${hStd(hAv(p))} Std. pro Woche reichen.` : ''}`,
          acts:[less ? ['setH', Hl, `Weniger trainieren: ${hStd(Hl)} statt ${hStd(hAv(p))} Std. pro Woche`] : null, ['ftpTarget', base.mid, `Ehrgeiziger: Ziel-FTP ${base.mid} W (passt zum aktuellen Plan)`]].filter(Boolean)});
      }
    }
  }
  if (p.test0 && !Object.values(p.res || {}).some(r => r.adopted)) notes.push({lv:0, t:`<b>Prognose mit Schätzwert:</b> Bis zu deinem Fitnesstest in Woche ${t0W(p)} rechnet die App mit ${p.ftp} W. Danach wird die Prognose genauer.`});
  let levs = [];
  if (p.goal === 'event' && sc[0] && sc[0].t) { const lm0 = levMult(p, tev), pf = base.mid * (1 - pen);
    levs = Object.keys(LEV).filter(k => LEV[k].a(tev) > 0).map(k => { const on = !!(p.lev && p.lev[k]), f = 1 + LEV[k].a(tev) / 100, pp = {...p, _prec:1}, a = evTime(pp, pf * (on ? lm0 / f : lm0), null), b2 = evTime(pp, pf * (on ? lm0 : lm0 * f), null); return {k, on, sv:a && b2 ? Math.max(0, a - b2) : 0, pct:LEV[k].a(tev)}; }); }
  return {st, h, weeks, rec, lRec, pen, base, notes, sc, verdict, tev, pr, levs, intOn:!!p.intF && intOk(p, tev), relaxed, noDist:p.goal === 'event' && !(sc[0] && sc[0].t), ack:!!verdict && verdict !== 'ok' && ackOn(p)};
}
/* Zusätzliche Zeit auf die Tage verteilen: zuerst Long-Ride-Tag, dann Wochenende, dann Wochentage (mit Obergrenzen) */
function boostDays(p, H, L){
  const a = [...(p.dayMin || [])], idx = [0, 1, 2, 3, 4, 5, 6].filter(i => p.avail[i]); if (!idx.length) return a;
  const ld = p.avail[p.longDay] ? p.longDay : idx[idx.length - 1], lim = i => i === ld ? 420 : i >= 5 ? 240 : 150;
  if (L && (a[ld] || 0) < L) a[ld] = Math.ceil(L / 15) * 15;
  let left = Math.round(H * 60) - idx.reduce((q, i) => q + (a[i] || 0), 0);
  const order = [ld, ...idx.filter(i => i !== ld).sort((x, y) => (y >= 5) - (x >= 5) || (a[x] || 0) - (a[y] || 0))];
  while (left >= 15) { let any = false; for (const i of order) { if (left < 15) break; if ((a[i] || 0) + 15 > lim(i)) continue; a[i] = (a[i] || 0) + 15; left -= 15; any = true; } if (!any) break; }
  return a;
}
function chOf(t, kind, val){ return tbScale(t, chOf0(t, kind, val)); }
function chOf0(t, kind, val){
  const ch = {};
  if (kind === 'hours') ch.hours = val;
  if (kind === 'longPri') ch.longPri = true;
  if (kind === 'longDay') { const a = [...(t.dayMin || [60, 60, 60, 60, 60, 180, 240])]; a[t.longDay] = Math.max(a[t.longDay] || 0, val); ch.dayMin = a; ch.longPri = true; }
  if (kind === 'target') { ch.targetTime = val; ch.tgtMan = true; }
  if (kind === 'boost') { const [H, L] = String(val).split('|').map(Number); ch.longPri = true; if (t.perDay) { ch.dayMin = boostDays(t, H, L); ch.hours = dsum({...t, dayMin:ch.dayMin}) / 60; } else ch.hours = H; }
  if (kind === 'endDate') ch.endDate = val;
  if (kind === 'intF') ch.intF = !!val;
  if (kind === 'lev') ch.lev = {...(t.lev || {}), [val]:!(t.lev && t.lev[val])};
  if (kind === 'ftpTarget') ch.ftpTarget = val;
  if (kind === 'ftpTarget' || kind === 'target') ch.ftpTargetManual = true;
  if (kind === 'subDel') ch.subs = (t.subs || []).filter(x => x.id !== val);
  if (kind === 'subC') ch.subs = (t.subs || []).map(x => x.id === val ? {...x, prio:'C'} : x);
  if (kind === 'levOn') ch.lev = {...(t.lev || {}), [val]:true};
  if (kind === 'ack') ch.tgtAck = val ? tgtSig(t) : null;
  if (kind === 'setH') { const H = +val; if (t.perDay) { const f = H * 60 / Math.max(1, dsum(t)); ch.dayMin = t.dayMin.map((m, i) => t.avail[i] ? Math.max(30, Math.round(m * f / 15) * 15) : m); ch.hours = dsum({...t, dayMin:ch.dayMin}) / 60; } else ch.hours = H; }
  return ch;
}
function applyChk(kind, val, mode){
  if (kind === 'editEv') { edit(); window.scrollTo(0, 0); return; }
  const t = mode === 'dash' ? S.p : S.d, ch = chOf(t, kind, val);
  Object.assign(S.d, ch);
  if (mode === 'dash') { Object.assign(S.p, JSON.parse(JSON.stringify(ch))); if (S.p.perDay) S.p.hours = Math.max(.5, dsum(S.p) / 60); S.blocked = {}; S.plan = keepT(genWeek(S.p, S.wk)); analyze(); note('Plan-Check übernommen', 'Der Plan wurde mit der Empfehlung aus dem Plan-Check neu berechnet.', -2); }
  save(); render();
}
/* ---------- Zielabweichung: alle Optionen, klare Empfehlung, Entscheidung beim Nutzer (Pop-up) ---------- */
let goalOpen = null, goalCache = null, goalMsg = '';
function simP(p, acts){ const q = JSON.parse(JSON.stringify(p)); acts.forEach(([k, v]) => { Object.assign(q, chOf(q, k, v)); if (q.perDay) q.hours = Math.max(.5, dsum(q) / 60); }); return q; }
function actTxt(p, [k, v]){
  if (k === 'boost') { const H = +String(v).split('|')[0], L = +String(v).split('|')[1]; if (p.perDay) { const dm = boostDays(p, H, L), nh = dsum({...p, dayMin:dm}) / 60; return `${hStd(nh)} statt ${hStd(hAv(p))} Std. pro Woche (${SD.map((x, i) => p.avail[i] && dm[i] > (p.dayMin[i] || 0) ? x + ' +' + (dm[i] - (p.dayMin[i] || 0)) : null).filter(Boolean).join(', ')} Min.)`; } return `${hStd(H)} statt ${hStd(hAv(p))} Std. pro Woche verfügbar`; }
  if (k === 'setH') return `${hStd(+v)} statt ${hStd(hAv(p))} Std. pro Woche`;
  return {intF:'2 bis 3 harte Einheiten pro Woche bei gleicher Wochenzeit', levOn:LEV[v] ? LEV[v].n + ' (wird im Training geübt)' : '', longPri:'Long Ride bekommt Vorrang', longDay:`${DAYS[p.longDay]} auf ${mm(v)} für den Long Ride`, endDate:`Zieltermin auf ${fmt(v)} verschieben`, target:`Zielzeit auf ${v} Std. setzen`, ftpTarget:`Ziel-FTP auf ${v} W setzen`}[k] || '';
}
function goalOpts(p, live){
  const c0 = planCheck(p, live); if (!c0.verdict || c0.verdict === 'ok') return null;
  const ev = p.goal === 'event', tev = c0.tev, tgt = ev ? tMin(p.targetTime) : +p.ftpTarget;
  const res = q => { const c = planCheck(q, live); return {t:ev ? c.sc[0].t : null, ftp:c.base.mid}; }, ok = r => ev ? !!(r.t && r.t <= tgt) : r.ftp >= tgt, r0 = res(p);
  const levA = ev ? Object.keys(LEV).filter(k => !(p.lev && p.lev[k]) && LEV[k].a(tev) > 0).map(k => ['levOn', k]) : [], intA = intOk(p, tev) && !p.intF ? [['intF', 1]] : [];
  const longNeed = c0.st.maxL < c0.lRec - 15 && !p.longPri, longA = longNeed ? (p.perDay && (p.dayMin[p.longDay] || 0) < c0.lRec ? [['longDay', c0.lRec]] : [['longPri', 1]]) : [];
  const ratio = hAv(p) > 0 && c0.h > 0 ? Math.min(1, c0.h / hAv(p)) : .85, hCap = Math.min(c0.rec[1] * ratio, Math.max(c0.h * 1.5, c0.rec[0] * ratio));
  const quick = (q, x) => ev ? evTime(q, ftpProj(q, x, c0.weeks).mid * levMult(q, tev), null) : ftpProj(q, x, c0.weeks).mid;
  const volFor = pre => { const q = simP(p, pre); let hit = null; for (let x = Math.ceil(c0.h * 2) / 2 + .5; x <= hCap + 1e-9; x += .5) { const r = quick(q, x); if (ev ? r && r <= tgt : r >= tgt) { hit = x; break; } } const x = hit || hCap; if (x <= c0.h + .25) return null; return [['boost', Math.min(20, Math.ceil(x / ratio * 2) / 2) + '|' + (longNeed ? c0.lRec : 0)]]; };
  const O = [], add = (id, title, acts, why, base) => { if (!acts.length || O.some(o => JSON.stringify(o.acts) === JSON.stringify(acts))) return; const q = simP(p, acts), r = res(q), dh = Math.max(0, hAv(q) - hAv(p)); O.push({id, title, acts, why, r, ok:ok(r), dh, cost:base + dh * 10 + (acts.some(a => a[0] === 'intF') ? 3 : 0) + acts.filter(a => a[0] === 'levOn').length + (longA.length && acts.some(a => a[0] === longA[0][0]) ? 1 : 0), tgtNew:(acts.find(a => a[0] === 'target' || a[0] === 'ftpTarget') || [])[1]}); };
  add('lev', 'Renntag-Hebel nutzen', levA, 'Kostet keine zusätzliche Trainingszeit. Verpflegung, Pacing und Koffein sind gut untersucht, die App rechnet mit vorsichtigen Mittelwerten. Koffein nur, wenn du es gut verträgst.', 0);
  add('int', 'Intensität statt Umfang', intA, `Bei ${ev ? 'Events bis etwa 3 Std.' : 'FTP-Zielen'} ersetzen gezielte Intervalle fehlenden Umfang zu einem großen Teil. Die Wochenzeit bleibt gleich, die Wochen werden aber anstrengender. Mehr als 3 harte Einheiten pro Woche plant die App bewusst nicht, damit genug Erholung bleibt. Gut schlafen und genug essen macht den Unterschied.`, 0);
  add('long', 'Long Ride priorisieren', longA, 'Bei langen Events entscheidet die Ermüdungsresistenz, also wie viel Leistung nach Stunden noch da ist. Sie entsteht vor allem durch lange Fahrten. Die Zeit verlagert sich dafür aufs Wochenende.', 0);
  const v1 = volFor(longA); if (v1) add('vol', 'Mehr Trainingszeit', [...longA, ...v1], 'Mehr Umfang ist der verlässlichste Weg zu mehr Ausdauerleistung. Er hilft aber nur, wenn du die Zeit über Wochen wirklich hast. Am meisten bringt der Umfang, den du über Wochen entspannt durchhältst.', 0);
  if (!ev && p.endDate) add('time', 'Mehr Zeit bis zum Ziel', [['endDate', addD(p.endDate, 42)]], 'Mehr Wochen bedeuten mehr Anpassung bei gleichem Aufwand pro Woche. Gut, wenn der Termin nicht feststeht.', 6);
  const free = [...levA, ...intA, ...longA]; let combo = free.slice(); if (free.length && !ok(res(simP(p, free)))) { const v2 = volFor(free); if (v2) combo = [...free, ...v2]; }
  if (combo.length > 1) add('combo', 'Kombination', combo, 'Verbindet die Maßnahmen, die ohne oder mit wenig Mehraufwand wirken, und ergänzt nur so viel Trainingszeit wie nötig.', 0);
  const tgtA = r => ev ? ['target', hm2(Math.ceil(r.t / 5) * 5)] : ['ftpTarget', r.ftp];
  if (free.length) { const r = res(simP(p, free)); if (!ok(r) && (!ev || r.t)) add('tgt2', 'Zwischenziel mit allen Hebeln', [...free, tgtA(r)], 'Nimmt alles mit, was ohne zusätzliche Trainingszeit wirkt, und setzt ein Zwischenziel, das du sicher erreichst. Dein großes Ziel bleibt das nächste Kapitel.', 40); }
  if (!ev || r0.t) add('tgt', 'Zwischenziel setzen', [tgtA(r0)], 'Der Plan bleibt, wie er ist. Ein Ziel in Reichweite hält die Motivation hoch, und alles darüber ist Bonus.', 50);
  const reach = O.filter(o => o.ok && o.dh <= 3).sort((a, b) => a.cost - b.cost), rec = reach[0] || O.find(o => o.id === 'tgt2') || O.find(o => o.id === 'tgt') || O[0];
  const why = !rec ? '' : rec.ok ? `Sie erreicht dein Ziel mit dem geringsten Mehraufwand${rec.dh > 0 ? ` (${hStd(rec.dh)} Std. mehr pro Woche)` : ', ohne zusätzliche Trainingszeit'}.${ev && tev > 180 ? ' Bei einem langen Event zählen Ausdauer über Stunden und ein gut geplanter Renntag mehr als zusätzliche Intervalle.' : ev ? ' Bei einem Event dieser Dauer wirken Intensität und Renntag-Hebel besonders gut.' : ''}`
    : `Dein Ziel ist ein großer Schritt. Mit einem Mehraufwand, der neben Beruf und Alltag gut machbar ist (höchstens 3 Std. mehr pro Woche), reicht es bis zum Termin noch nicht ganz${O.some(o => o.ok) ? '. Mit deutlich mehr Trainingszeit ginge es, das würde dich aber eher überfordern als schneller machen' : ''}. Darum empfiehlt die App, alles mitzunehmen, was ohne Mehraufwand wirkt, und ein Zwischenziel zu setzen, das du sicher erreichst. Jeder Schritt dorthin macht dich stärker für dein großes Ziel.`;
  return {ev, tgt, r0, O, rec, why, tev};
}
function openGoal(mode){ const p = mode === 'dash' ? S.p : mkPrev(S.d); try { goalCache = goalOpts(p, mode === 'dash'); } catch (e) { elog(e); goalCache = null; } goalOpen = goalCache ? mode : null; goalMsg = ''; render(); }
const goalKey = p => JSON.stringify([p.goal, p.targetTime, p.ftpTarget, p.hours, p.tb && p.tb.on ? p.tb : 0, p.eventDate, p.endDate, p.lev, p.intF, p.longPri]);
function keepGoal(){ const t = goalOpen === 'dash' ? S.p : S.d, sg = tgtSig(t); S.d.tgtAck = sg; if (goalOpen === 'dash' && S.p) { S.p.tgtAck = sg; S.goalSeen = goalKey(S.p); } goalMsg = 'Dein Ziel bleibt, wie du es gewählt hast. Im Plan-Check siehst du, was das bedeutet.'; goalOpen = null; goalCache = null; save(); render(); }
function closeGoal(){ if (goalOpen === 'dash' && S.p) S.goalSeen = goalKey(S.p); goalOpen = null; goalCache = null; save(); render(); }
function pickGoal(i){
  const g = goalCache, o = g && g.O[i], mode = goalOpen; if (!o) return;
  const t = mode === 'dash' ? S.p : S.d;
  o.acts.forEach(([k, v]) => { const ch = chOf(t, k, v); Object.assign(S.d, ch); if (mode === 'dash') Object.assign(S.p, JSON.parse(JSON.stringify(ch))); });
  if (mode === 'dash') { if (S.p.perDay) S.p.hours = Math.max(.5, dsum(S.p) / 60); S.blocked = {}; S.plan = keepT(genWeek(S.p, S.wk)); analyze(); note('Option übernommen: ' + o.title, o.acts.map(a => actTxt(t, a)).filter(Boolean).join(', ') + '.', -2); S.goalSeen = goalKey(S.p); }
  goalMsg = `Übernommen: ${o.title}. ${g.ev ? `Erwartet jetzt etwa ${o.r.t ? hm2(o.r.t) : '–'} Std.` : `Erwartete FTP jetzt etwa ${o.r.ftp} W.`}`;
  goalOpen = null; goalCache = null; save(); render();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && goalOpen) closeGoal(); });
function goalModal(){
  const g = goalCache; if (!goalOpen || !g) return '';
  const res = (o) => { const r = o.r, nt = o.tgtNew; if (g.ev) { if (!r.t) return 'nicht berechenbar'; const tg = nt ? tMin(nt) : g.tgt, d = r.t - tg; return `Erwartet etwa <b>${hm2(r.t)} Std.</b> ${nt ? `<span style="color:var(--ok)">✓ neues Ziel ${nt} Std.</span>` : d <= 0 ? '<span style="color:var(--ok)">✓ Ziel erreichbar</span>' : `<span style="color:#9a6a00">noch ${hm2(d)} bis zum Ziel</span>`}`; }
    return `Erwartet etwa <b>${r.ftp} W</b> ${nt ? `<span style="color:var(--ok)">✓ neues Ziel ${nt} W</span>` : r.ftp >= g.tgt ? '<span style="color:var(--ok)">✓ Ziel erreichbar</span>' : `<span style="color:#9a6a00">noch ${g.tgt - r.ftp} W bis zum Ziel</span>`}`; };
  const eff = o => o.dh > 0 ? `+${hStd(o.dh)} Std. pro Woche` : o.acts.some(a => a[0] === 'endDate') ? 'gleicher Aufwand, späterer Termin' : o.acts.some(a => a[0] === 'intF') ? 'keine Zusatzzeit, härtere Wochen' : o.acts.some(a => a[0] === 'target' || a[0] === 'ftpTarget') && o.acts.length === 1 ? 'kein Mehraufwand' : 'keine zusätzliche Trainingszeit';
  const p = goalOpen === 'dash' ? S.p : S.d, i0 = g.O.indexOf(g.rec);
  const card = (o, i, main) => `<div class="${esc(main ? 'mt-3 p-4' : 'p-3')}" style="border:${esc(main ? '2px solid var(--ice)' : '1px solid var(--line)')};background:${esc(main ? '#e6f7f6' : '#fff')}">
      ${main ? '<p class="eyebrow" style="color:var(--teal)">Empfehlung der App</p>' : ''}<p class="hd ${esc(main ? 'text-2xl' : 'text-lg')} font-semibold leading-tight">${esc(o.title)}</p>
      <p class="mt-1 text-sm">${res(o)}</p><p class="text-xs" style="color:var(--mute)">${eff(o)}</p>
      <ul class="mt-2 list-disc space-y-0.5 pl-5 text-sm">${o.acts.map(a => actTxt(p, a)).filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${main ? `<p class="mt-2 text-sm"><b>Warum:</b> ${g.why}</p><p class="mt-1 text-sm" style="color:var(--mute)">${o.why}</p>` : `<details class="mt-1 text-sm" style="color:var(--mute)"><summary class="cursor-pointer">Einordnung</summary><p class="mt-1">${o.why}</p></details>`}
      <button class="${esc(main ? 'btn' : 'ghost !py-1.5 text-sm')} mt-3" onclick="pickGoal(${ja(i)})">${main ? 'Empfehlung übernehmen' : 'Diese Option wählen'}</button></div>`;
  return `<div class="exov" onclick="if(event.target===this)closeGoal()" role="dialog" aria-modal="true" aria-label="Ziel wieder erreichbar machen"><div class="exbox">
    <div class="flex items-start gap-3"><h3 class="hd flex-1 text-2xl font-semibold">Ziel wieder erreichbar machen</h3><button class="ghost !px-3 !py-1.5" onclick="closeGoal()" aria-label="Schließen">✕</button></div>
    <p class="mt-1 text-sm">${g.ev ? `Dein Ziel: <b>${esc(p.targetTime)} Std.</b> Erwartet mit dem aktuellen Plan: <b>${g.r0.t ? hm2(g.r0.t) : '–'} Std.</b>` : `Dein Ziel: <b>${g.tgt} W</b>. Erwartet mit dem aktuellen Plan: <b>${g.r0.ftp} W</b>.`}</p>
    ${g.rec ? card(g.rec, i0, true) : ''}
    <p class="mt-4 font-semibold">Weitere Optionen</p><div class="mt-2 space-y-2">${g.O.map((o, i) => i === i0 ? '' : card(o, i, false)).join('')}</div>
    <div class="mt-4"><button class="ghost lbl w-full" onclick="keepGoal()">Mein Ziel beibehalten</button><p class="mt-2 text-xs" style="color:var(--mute)">Du entscheidest. Behältst du dein Ziel, zeigt dir die App im Plan-Check, was das bedeutet, und erinnert dich nicht mehr. Jede Option lässt sich später wieder ändern. Prognosen sind Schätzungen mit etwa ±10 % Unsicherheit.</p></div></div></div>`;
}
function levHtml(c, mode){
  if (!c.levs || !c.levs.length) return '';
  const tot = c.levs.filter(x => !x.on).reduce((q, x) => q + x.sv, 0);
  return `<p class="mt-4 font-semibold">Renntag-Hebel: schneller ohne mehr Training</p><p class="mt-1 text-sm" style="color:var(--mute)">${tot >= 2 ? `Zusammen etwa <b>${Math.round(tot)} Min.</b> schneller, wenn du alle offenen Hebel übernimmst.` : 'Übernommene Hebel sind in der erwarteten Zielzeit schon eingerechnet.'}</p>
    <ul class="mt-2 space-y-2">${c.levs.map(x => `<li class="flex items-start gap-3 p-3" style="background:${esc(x.on ? '#e3f6f0' : 'var(--tint)')};border:1px solid ${esc(x.on ? '#0a8f6a' : 'var(--line)')}"><span style="color:var(--teal);margin-top:2px">${fic(LEV[x.k].ic, 22)}</span><span class="min-w-0 flex-1 text-sm"><b>${LEV[x.k].n}</b>${x.sv >= 1 ? ` <span style="color:var(--ok)">${x.on ? 'eingerechnet: ' : ''}etwa ${Math.round(x.sv)} Min.</span>` : ''}<br><span style="color:var(--mute)">${LEV[x.k].d}. Annahme: +${f1(x.pct)} % Dauerleistung.</span><br><button class="${esc(x.on ? 'ghost' : 'btn !w-auto')} lbl mt-2 !py-1.5" onclick="applyChk('lev', '${ja(x.k)}', '${ja(mode)}')">${x.on ? '✓ Im Plan · zurücknehmen' : 'In den Plan übernehmen'}</button></span></li>`).join('')}</ul>
    <details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer font-semibold">Woher die Annahmen kommen</summary><p class="mt-2">Kohlenhydrate während langer Belastungen verbessern die Leistung gegen Ende messbar, wenn der Darm daran gewöhnt ist. Koffein (3 bis 6 mg pro kg) verbessert die Zeitfahrleistung in Meta-Analysen im Mittel um wenige Prozent, nicht bei allen gleich. Gleichmäßiges Pacing ist bei langen Ausdauerbelastungen effizienter als ein zu schneller Start. Die Prozentwerte sind bewusst vorsichtige Mittelwerte, keine Garantie. Übernommen heißt: Die App plant das Üben dafür in dein Training ein und rechnet den Effekt in die Zielzeit ein.</p></details>`;
}
function checkCard(p, mode){
  const c = planCheck(p, mode === 'dash'), C = {ok:['#e3f6f0', '#0a8f6a', 'Auf Kurs'], mid:['#fff6dc', '#d9a400', 'Ziel in Reichweite'], high:['#fff1e6', '#c2410c', 'Ziel braucht Anpassung']};
  const v = c.noDist ? ['var(--tint)', 'var(--teal)', 'Zielzeit noch offen'] : c.ack ? C.mid : c.verdict ? C[c.verdict] : c.notes.some(n => n.lv === 2) ? C.high : c.notes.length ? C.mid : C.ok;
  const head = c.noDist ? 'Zielzeit noch offen' : c.ack ? 'Ziel bewusst gewählt' : c.verdict ? v[2] : c.notes.length ? 'Feinschliff möglich' : 'Plan passt zum Ziel';
  const nts = c.notes.map(n => `<li class="p-3" style="background:${esc(n.lv === 2 ? '#fff1e6' : n.lv === 0 ? '#e3f6f0' : n.lv === 3 ? 'var(--tint)' : '#fff6dc')};border-left:3px solid ${esc(n.lv === 2 ? '#c2410c' : n.lv === 0 ? '#0a8f6a' : n.lv === 3 ? 'var(--ice)' : '#d9a400')}"><p class="text-sm">${n.t}</p>${n.hint ? `<p class="mt-1 text-xs" style="color:var(--mute)">${n.hint}</p>` : ''}${(n.acts || (n.act ? [n.act] : [])).map(a => `<button class="${esc(a[3] ? 'btn !w-auto' : 'ghost')} lbl mt-2 mr-2 !py-1.5" onclick="applyChk('${ja(a[0])}', ${typeof a[1] === 'string' ? `'${ja(a[1])}'` : ja(a[1])}, '${ja(mode)}')">${a[2]}</button>`).join('')}</li>`).join('');
  const isEv = p.goal === 'event';
  const tbl = `<div class="mt-2 overflow-x-auto"><table class="w-full text-sm"><thead><tr style="color:var(--mute)" class="text-left text-xs"><th class="pr-2">Szenario</th><th class="pr-2">FTP am ${isEv ? 'Eventtag' : 'Zieltermin'}</th>${isEv && !c.noDist ? '<th>Zielzeit</th>' : ''}</tr></thead><tbody>${c.sc.map((s, i) => `<tr style="border-top:1px solid var(--line)${esc(i === 0 ? ';font-weight:600' : '')}"><td class="py-1.5 pr-2">${s.l}<br><span class="text-xs font-normal" style="color:var(--mute)">${s.eff}</span></td><td class="nw pr-2">${s.ftp.lo}–${s.ftp.hi} W</td>${isEv && !c.noDist ? `<td class="nw">${s.t ? hm2(s.t) : '–'} Std.<br><span class="text-xs font-normal" style="color:var(--mute)">${s.tl && s.th ? hm2(s.tl) + ' bis ' + hm2(s.th) : ''}</span></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  const how = `<details class="mt-3 text-xs" style="color:var(--mute)"><summary class="cursor-pointer font-semibold">So rechnet der Plan-Check</summary>
    <p class="mt-2"><b>Umfang:</b> Du hast ${hStd(p.hours)} Std. pro Woche verfügbar. Der Plan nutzt sie nicht jede Woche voll: Er steigert sich über drei Wochen und entlastet in der vierten, damit du dich erholst. Im Schnitt aller Wochen (ohne Startwoche und Tapering) trainierst du deshalb etwa ${hStd(c.h)} Std. pro Woche. Mit diesem tatsächlichen Wert rechnet die Prognose. Üblich für dein Ziel sind ${c.rec[0]} bis ${c.rec[1]} Std. verfügbare Zeit pro Woche (Erfahrungswerte aus der Trainingspraxis).</p>
    <p class="mt-2"><b>FTP-Prognose:</b> Möglicher Zuwachs = min(20 %, 1,5 % × Wochenstunden; mit „Intensität statt Umfang“ zählen unter 8 Std. bis zu 2 Std. zusätzlich) × Niveau-Faktor ${f1(c.base.lvl)} (je höher deine W/kg, desto kleiner), angenähert über die verbleibenden ${c.weeks} Wochen mit 1 − e^(−Wochen/12). Mehr Stunden als bisher trainiert erhöhen den Zuwachs leicht. Ergebnis: +${f1(c.base.g * 100)} %, Spanne 60 bis 140 % davon, weil Menschen sehr unterschiedlich auf Training reagieren. Das ist ein Faustmodell, keine Studie.</p>
    ${isEv ? `<p class="mt-2"><b>Long Ride:</b> Empfohlen sind etwa 70 % der Eventdauer, höchstens 6 Std. (${mm(c.lRec)}). Fehlt Länge, rechnet der Check bei Events über 3 Std. mit bis zu 5 % weniger Dauerleistung am Ende (Ermüdungsresistenz)${c.pen ? `, bei dir ${f1(c.pen * 100)} %` : ''}.</p>
    <p class="mt-2"><b>Zielzeit:</b> Leistungsbilanz nach Martin et al. 1998 mit der prognostizierten FTP, wie im Zielzeit-Check. Die Spanne ergibt sich aus der FTP-Spanne.</p>` : ''}</details>`;
  const inner = `<div class="p-3" style="background:${esc(v[0])};border:1px solid ${esc(v[1])}"><p class="hd text-xl font-semibold" style="color:${esc(v[1])}">${head}</p><p class="mt-1 text-sm">${isEv ? `${c.sc[0].t ? `Erwartete Zielzeit mit deinem Plan: <b>${hm2(c.sc[0].t)} Std.</b>, ` : ''}FTP am Eventtag etwa ${c.base.mid} W (heute ${p.ftp} W).` : `Erwartete FTP am Zieltermin: <b>${c.base.mid} W</b> (${c.base.lo} bis ${c.base.hi} W, heute ${p.ftp} W).`}</p><p class="mt-1 text-sm">${c.noDist ? 'Sobald Distanz und Höhenmeter eingetragen sind, rechnet die App deine Zielzeit aus.' : c.ack ? 'Du kennst die Prognose und gehst es trotzdem an. Die App unterstützt dich dabei, und du kannst jederzeit umentscheiden.' : c.verdict === 'high' ? 'Kein Grund zur Sorge: Unten findest du Wege, wie du dein Ziel erreichst oder ein starkes Zwischenziel setzt.' : c.verdict === 'mid' ? 'Du bist nah dran. Mit den Hinweisen unten machst du es sicherer.' : c.relaxed ? 'Dein Ziel hat Puffer. Du entscheidest, ob du ihn nutzt oder weniger trainierst.' : 'Bleib dran: Regelmäßigkeit bringt dich am sichersten ans Ziel.'}</p></div>
    ${c.verdict && c.verdict !== 'ok' ? `<button class="btn mt-3" onclick="openGoal('${ja(mode)}')">Optionen mit Empfehlung ansehen</button>` : ''}${goalMsg ? `<p class="mt-2 text-sm" style="color:var(--ok)">✓ ${esc(goalMsg)}</p>` : ''}
    ${c.intOn ? `<div class="mt-3 flex flex-wrap items-center gap-2 p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)"><span class="flex-1"><b>Aktiv: Intensität statt Umfang.</b> 2 bis 3 harte Einheiten pro Woche bei gleicher Wochenzeit, dafür weniger lockere Grundlage.</span><button class="ghost !py-1.5 text-sm" onclick="applyChk('intF', 0, '${ja(mode)}')">Zurücknehmen</button></div>` : ''}
    ${nts ? `<p class="mt-3 font-semibold">Hinweise und Maßnahmen</p><ul class="mt-2 space-y-2">${nts}</ul>` : '<p class="mt-3 text-sm" style="color:var(--ok)">✓ Umfang und Long Ride passen zum Ziel.</p>'}
    ${(() => { const lh = levHtml(c, mode); if (!lh) return ''; const tot = c.levs.filter(x => !x.on).reduce((q, x) => q + x.sv, 0), on = c.levs.filter(x => x.on).length; return `<details class="ckd"><summary><span>Renntag-Hebel<em>${tot >= 2 ? `bis zu ${Math.round(tot)} Min. schneller ohne mehr Training` : 'Schneller ohne mehr Training'}${on ? ` · ${on} übernommen` : ''}</em></span></summary><div class="ckb">${lh.replace(/<p class="mt-4 font-semibold">Renntag-Hebel[^<]*<\/p>/, '')}</div></details>`; })()}
    <details class="ckd"><summary><span>Ergebnisausblick<em>Zielzeit je nach Szenario: Umfang, Intensität, Gewicht, Windschatten</em></span></summary><div class="ckb">${tbl}
    <p class="mt-2 text-xs" style="color:var(--mute)">Prognosen sind Schätzungen. Krankheit, Stress, Schlaf und Wetter am Eventtag haben großen Einfluss. Gewicht nur reduzieren, wenn es gesundheitlich sinnvoll ist, und nie auf Kosten der Energiezufuhr fürs Training.</p>${how}</div></details>`;
  return mode === 'dash' && foldFlat ? `<section class="panel p-4">${inner}</section>` : mode === 'dash' ? fold('chk', 'Plan-Check: Erreichst du dein Ziel?', inner, true, `<b style="color:${esc(v[1])}">${head}</b>`) : `<div class="panel p-4"><p class="eyebrow mb-2">Plan-Check vor dem Start</p>${inner}</div>`;
}


/* ---------- Zielzeit oder Zieldurchschnittsgeschwindigkeit, mit realistischem Vorschlag ---------- */
const tMin = t => { const m = /^(\d+):(\d{1,2})$/.exec(String(t || '').trim()); return m ? +m[1] * 60 + +m[2] : 0; };
const spdOf = d => { const t = tMin(d.targetTime); return t && d.dist > 0 ? d.dist / (t / 60) : 0; };
function setSpeed(v){
  const s = Number(String(v).replace(',', '.')); if (!(s > 3) || !(S.d.dist > 0)) return;
  S.d.targetTime = hm2(Math.round(S.d.dist / s * 60)); S.d.tgtMan = true; save();
  const e = document.getElementById('tt'); if (e) e.value = S.d.targetTime; evUpd();
}
function setTT(v){ S.d.tgtMan = true; draft('targetTime', v); }
function tgtSuggest(d){
  if (d.goal !== 'event' || !(d.dist > 0)) return null;
  let ana = null; try { ana = (S.hist || []).length ? anaCalc() : null; } catch (e) { elog(e); }
  const hist = !!(ana && ana.ftpV), ftp = hist ? ana.ftpV : (d.ftp > 0 ? d.ftp : 200), base = {...d, ftp, targetTime:'5:00'};
  const now = evTime(base, ftp); let fut = null, fftp = null;
  try { const pv = mkPrev({...d, ftp, targetTime:'5:00'}), st = planStats(pv), pj = ftpProj(pv, st.hAvg, st.tot); fftp = pj.mid; fut = evTime(pv, pj.mid); } catch (e) { elog(e); }
  const r5 = m => m ? Math.ceil(m / 5) * 5 : null;
  return {hist, ftp, kg:kgOf(d), now:r5(now), fut:r5(fut), fftp};
}
function tgtSugHtml(d){
  let a = null; try { a = ambTarget(d); } catch (e) { elog(e); }
  if (!a || !a.t) return '';
  let hist = null; try { hist = (S.hist || []).length ? anaCalc() : null; } catch (e) { elog(e); }
  const kmh = m => f1(d.dist / (m / 60)), cur = tMin(d.targetTime);
  const btn = (m, l) => `<button class="ghost mt-2 mr-2 !py-1.5 text-sm" onclick="setTarget('${ja(hm2(m))}')">${l}</button>`;
  const cmp = !cur ? '' : cur < a.t * .97 ? '<p class="mt-2 text-sm" style="color:#c2410c"><b>Dein Ziel ist ein großer Schritt, schneller als das, was die App bis zu diesem Termin erwartet.</b> Der Vorschlag oben ist ein starkes Zwischenziel. Details im Zielzeit-Check weiter unten.</p>' : cur < a.t ? '<p class="mt-2 text-sm" style="color:#9a6a00">Dein Ziel ist sehr ehrgeizig: Es braucht ambitioniertes Training und einen guten Tag.</p>' : a.tPlan && cur < a.tPlan ? '<p class="mt-2 text-sm" style="color:#9a6a00">Dein Ziel ist mit ambitioniertem Training realistisch, mit dem bisher geplanten Umfang eher knapp.</p>' : a.tPlan && cur > a.tPlan * 1.05 ? `<p class="mt-2 text-sm" style="color:var(--ok)"><b>Dein Ziel hat Puffer:</b> Mit deinem Plan sind etwa ${hm2(a.tPlan)} Std. drin. Das ist deine Entscheidung. Pacing und Verpflegung richten sich nach deiner Zielzeit, und im Plan-Check siehst du, ob dafür auch weniger Training reicht.</p>` : '<p class="mt-2 text-sm" style="color:var(--ok)">Dein Ziel liegt im realistischen Bereich.</p>';
  return `<div class="p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="text-sm font-semibold">Vorschlag für ein realistisches Ziel</p>
    <p class="mt-1 text-sm">Mit ambitioniertem Training bis zum Event: etwa <b>${hm2(a.t)} Std.</b> (Ø ${kmh(a.t)} km/h). Dafür rechnet die App mit etwa ${hStd(a.hv)} Std. pro Woche verfügbarer Zeit über ${a.weeks} Wochen und einem FTP von etwa ${a.ftp} W am Eventtag (heute ${d.ftp > 0 ? d.ftp : 200} W).</p>
    ${a.tPlan && a.tPlan > a.t ? `<p class="mt-1 text-sm">Mit deiner bisher geplanten Zeit (${hStd(a.hPlanV)} Std. pro Woche): etwa ${hm2(a.tPlan)} Std. (Ø ${kmh(a.tPlan)} km/h).</p>` : ''}
    <p class="mt-1 text-xs" style="color:var(--mute)">Grundlage: FTP ${d.ftp > 0 ? d.ftp : 200} W bei ${f1(kgOf(d))} kg${hist && hist.ftpV ? `, deine Trainingshistorie schätzt ${hist.ftpV} W` : ' (in Schritt 2 anpassen oder dort alte Fahrten hochladen)'}, Strecke ${d.course ? 'nach Streckenprofil' : 'aus Distanz und Höhenmetern'}, Fahrweise ${(DRAFT[d.draft] || DRAFT.grp)[1]}. Der Wochenumfang aus Schritt 3 ist eingerechnet.</p>
    ${btn(a.t, 'Ambitioniertes Ziel übernehmen')}${a.tPlan && a.tPlan > a.t ? btn(a.tPlan, 'Ziel für geplanten Umfang übernehmen') : ''}${cmp}</div>`;
}

function finish(){
  const st0 = editState(), md0 = S.d && S.d.mode; /* Art der Änderung: für Sicherungs-Erinnerung und Statistik */
  if (S.d && S.d.goal === 'event' && S.d.season === false && (S.d.subs || []).length) S.d.subs = [];
  goalMsg = ''; if (S.d.goal === 'event' && !String(S.d.eventName || '').trim()) S.d.eventName = 'Mein Event';
  { const es = editState(); if (es === 'new' || es === 'goal') { S.d.ftpStart = rngClamp('ftp', S.d.ftp, 0); delete S.d.res; delete S.d.xTests; delete S.d.recW; } else if (S.p && !S.d.ftpStart) S.d.ftpStart = S.p.ftpStart || S.p.ftp; }
  const d = S.d, oldAuto = S.p ? planName(S.p) : null, keepP = editState() === 'adj' && S.p && hasStarted(S.p), oldPlan = keepP ? S.plan : null;
  const keepS = !!(S.edit && S.p && hasStarted(S.p)), sd0 = sd40(d, d.startDate && d.startDate > iso(0) ? d.startDate : iso(0));
  const cmu = !!d.commuter, dm = [...d.dayMin], tot = d.avail.reduce((q, a, i) => q + (a ? (dm[i] || 0) : 0), 0);
  S.p = {...d, avail:[...d.avail], commuter: cmu, commute: cmu ? [...d.commute] : d.commute.map(() => false), dayMin: dm, perDay: !!d.perDay, weight: rngClamp('weight', d.weight, 75), ftp: rngClamp('ftp', d.ftp, 200), hours: d.perDay ? Math.max(.5, tot / 60) : Math.max(rngClamp('hours', d.hours, 6), comSum(d) / 60), commuteMin: d.commuteMin > 0 ? d.commuteMin : 20, start: keepS ? S.p.start : mondayOf(sd0), startDate: keepS ? S.p.startDate : sd0};
  if (keepP) { S.wk = curWeek(S.p); const nw = genWeek(S.p, S.wk), t = todayIdx(); S.plan = nw.map((x, i) => i <= t && oldPlan && oldPlan[i] ? (i === t ? {...oldPlan[i], kept:1} : oldPlan[i]) : x); S.blocked = {}; note('Plan angepasst', 'Deine Änderungen sind übernommen und gelten ab morgen. Das heutige Training, bisherige Einheiten und dein Fortschritt bleiben erhalten.', -2); }
  else { S.strDone = {}; S.mobDone = {}; S.wk = curWeek(S.p); S.plan = genWeek(S.p, S.wk); S.blocked = {}; S.log = []; S.done = {}; S.note = ''; } vw = null;
  S.edit = false; S.step = 0; S.newFrom = null; pg = null; pgFrom = null; if (!S.pid) { S.pid = uid(); S.pname = planName(S.p); } else if (!S.pnameManual && (S.pname === oldAuto || isAutoName(S.pname))) S.pname = planName(S.p); analyze(); save();
  try { const v = planCheck(S.p, true).verdict; if ((v === 'high' || v === 'mid') && !ackOn(S.p) && S.goalSeen !== goalKey(S.p)) { goalCache = goalOpts(S.p, true); goalOpen = goalCache ? 'dash' : null; } } catch (e) { elog(e); }
  render();
  if (S.step === 0 && st0 !== 'same') { bkMarkChange(); try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { elog(e); } }
  if (S.step === 0) track(st0 === 'new' || st0 === 'goal' ? (md0 === 'light' ? 'plan-erstellt-schnell' : 'plan-erstellt-ausfuehrlich') : st0 === 'same' ? 'plan-unveraendert' : 'plan-angepasst');
}
function editCopy(){ return {...S.p, avail:[...S.p.avail], commute:[...S.p.commute], commuter: isComm(S.p), dayMin:[...(S.p.dayMin || [60,60,60,60,60,180,240])], subs:[...(S.p.subs || [])]}; }
function cancelEdit(){ if (S.p) S.d = editCopy(); S.edit = false; S.step = 0; pg = null; save(); render(); window.scrollTo(0, 0); }
/* Einzelne Bereiche gezielt anpassen, ohne die ganze Planung zu durchlaufen */
function editOnly(step){ edit(); S.only = step; S.step = step; save(); render(); window.scrollTo(0, 0); }
function onlyApply(){ S.only = null; finish(); if (S.step === 0) { pgFrom = 'more'; pg = 'settings'; goalMsg = ''; render(); window.scrollTo(0, 0); } }
function onlyCancel(){ S.only = null; cancelEdit(); pgFrom = 'more'; pg = 'settings'; render(); }
function edit(){ S.only = null; pg = null; goalMsg = ''; S.d = {...S.p, avail:[...S.p.avail], commute:[...S.p.commute], commuter: isComm(S.p), dayMin:[...(S.p.dayMin || [60,60,60,60,60,180,240])]}; S.edit = true; S.step = 1; save(); render(); }
function tgl(k, i){
  if (k === 'avail' && i === S.d.longDay) return;
  S.d[k][i] = !S.d[k][i]; if (k === 'commute' && S.d[k][i]) S.d.avail[i] = true; if (k === 'commute') comToggled(S.d, i, S.d.commute[i]);
  if (k === 'avail' && !S.d.avail[i]) S.d.commute[i] = false;
  if (k === 'avail' && S.d.perDay) { if (S.d.avail[i] && !(S.d.dayMin[i] > 0)) S.d.dayMin[i] = 60; S.d.hours = dsum(S.d) / 60; }
  save(); render();
}
function setCommuter(v){ if (!v) S.d.commute.forEach((c, i) => { if (c && S.d.avail[i]) comToggled(S.d, i, false); }); S.d.commuter = v; if (!v) S.d.commute = S.d.commute.map(() => false); save(); render(); }
/* Konsistenz: Gesamtzeit = Summe der Tage. Beim Umschalten wird der jeweils andere Wert aus dem aktuellen abgeleitet. */
const dsum = d => d.avail.reduce((q, a, i) => q + (a ? (d.dayMin[i] || 0) : 0), 0);
const hStd = h => { const m = Math.round((h || 0) * 60); return m % 60 ? hm2(m) : String(m / 60); };
const comSum = d => d.commuter && !d.perDay ? d.commute.filter((c, i) => c && d.avail[i]).length * 2 * (d.commuteMin > 0 ? d.commuteMin : 20) : 0;
function togglePerDay(){
  const d = S.d; d.perDay = !d.perDay;
  if (d.perDay) { if (Math.abs(dsum(d) - (d.hours || 0) * 60) > 5) d.dayMin = spreadH(d, d.hours > 0 ? d.hours : 6); d.hours = dsum(d) / 60; }
  else d.hours = Math.round(dsum(d) / 15) / 4;
  save(); render();
}
function setDayMin(i, v){ S.d.dayMin[i] = Math.max(0, Number(v) || 0); S.d.hours = dsum(S.d) / 60; save(); const e = document.getElementById('dtot'); if (e) { e.innerHTML = dayTotal(S.d); postRender(e); } }
const dayTotal = d => { const t = dsum(d); return `${SD.map((x, i) => d.avail[i] ? x + ' ' + (d.dayMin[i] || 0) : null).filter(Boolean).join(' + ')} Min. = ${hm2(t)} Std. pro Woche`; };
function setLong(i){ S.d.longDay = i; S.d.avail[i] = true; save(); render(); }
function goWeek(n){ const t = phases(S.p).slice(-1)[0].to; n = Math.min(t, Math.max(1, n)); vw = n === S.wk ? null : n; render(); }
const wd = (p, w) => new Date(dOnly(p.start).getTime() + (w - 1) * 6048e5).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'});
const fmt = x => dOnly(x).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'});
const SD = ['Mo','Di','Mi','Do','Fr','Sa','So'];
const lstr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dstr = i => { const d = new Date(S.p.start + 'T12:00:00'); d.setDate(d.getDate() + (S.wk - 1) * 7 + i); return lstr(d); };
const rel = a => { const n = Math.round((new Date(lstr(new Date()) + 'T12:00:00') - new Date(a.day + 'T12:00:00')) / 864e5); return n <= 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`; };

