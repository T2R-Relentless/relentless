/* ---------- Ermutigung: Pop-ups bei starken Leistungen, harten Einheiten und Wochen, und wenn es nicht nach Plan läuft ---------- */
let cheerQ = [], cheerShow = null;
const CHPRI = {test:9, ftpup:8, hardweek:7, week:6, recweek:5, longest:5, low:5, missed:4, miss:4, hard:3, long:3, bigday:2};
function queueCheer(c){ S.cheerSeen = S.cheerSeen || []; if (S.cheerSeen.includes(c.key) || cheerQ.some(x => x.key === c.key)) return; cheerQ.push(c); }
const hsh = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const pickV = (a, k) => a[hsh(k) % a.length];
function cheerScan(miss){
  const p = S.p; if (!p || !S.plan || !hasStarted(p) || S.step !== 0) return;
  const w = S.wk, pl = S.plan, t = todayIdx(), dn = i => !!(S.done[i] || (S.actual && S.actual[i]));
  pl.forEach((x, i) => { if (!x.m || i > t || !dn(i)) return;
    if (HARD.includes(x.t) || x.t === 'race') queueCheer({key:`h|${p.start}|${w}|${i}`, kind:'hard', x});
    else if (x.t === 'long' && x.m >= 150) queueCheer({key:`l|${p.start}|${w}|${i}`, kind:'long', x}); });
  const ks = pl.map((x, i) => (pOrig(pl, i) || x).m ? i : -1).filter(i => i >= 0);
  if (ks.length && ks.every(dn)) { const P = phases(p).find(x => w >= x.from && w <= x.to) || {}, rec = w % 4 === 0 || (p.recW || []).includes(w);
    queueCheer({key:`w|${p.start}|${w}`, kind:rec ? 'recweek' : (P.key === 'build' || P.key === 'peak') ? 'hardweek' : 'week', w, n:ks.length, min:ks.reduce((q, i) => q + pl[i].m, 0)}); }
  const acts = allActs(), recent = acts.filter(a => a.day >= iso(-3));
  recent.forEach(a => {
    if (a.m20 && Math.round(a.m20 * .95) >= p.ftp * 1.03) queueCheer({key:'p20|' + a.id, kind:'ftpup', a, ftp:Math.round(a.m20 * .95)});
    const prev = acts.filter(b => b.day < a.day && b.day >= addD(a.day, -90)), mx = Math.max(0, ...prev.map(b => b.sec));
    if (a.sec >= 7200 && prev.length >= 3 && a.sec > mx * 1.05) queueCheer({key:'lng|' + a.id, kind:'longest', a});
    else if (a.tss >= 150 && !a.est) queueCheer({key:'tss|' + a.id, kind:'bigday', a}); });
  if (miss >= 2) queueCheer({key:`ms|${p.start}|${w}`, kind:'missed', n:miss});
  try { const r = impact(); if (r && (r.lvl === 'mid' || r.lvl === 'high')) queueCheer({key:`im|${p.start}|${w}|${r.lvl}`, kind:'miss', r}); } catch (e) { elog(e); }
}
const CHI = {bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', mountain:'<path d="M3 20 10 7l4 7 2-3 5 9z"/>', check:'<path d="M4 12l5 5L20 6"/>', flame:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 2 0-2 0-3 0-5z"/>', moon:'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>', trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 20h8"/>', heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>', target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>'};
function cheerContent(c){
  const p = S.p, k = c.key, ev = p.goal === 'event';
  if (c.kind === 'hard') return {ic:'bolt', col:'#f87171', t:pickV(['Stark durchgezogen!', 'Harte Einheit geschafft', 'Das war Qualität'], k), x:`„${esc(c.x.n)}“ ist erledigt. ${pickV(['Genau solche Einheiten machen dich schneller.', 'Das sind die Reize, die dich am Ziel tragen.', 'Damit hast du heute in deine Form investiert.'], k + 'b')} Jetzt zählt die Erholung: gut essen, genug trinken, früh schlafen.`};
  if (c.kind === 'long') return {ic:'mountain', col:'#818cf8', t:pickV(['Long Ride im Kasten', 'Stark: Ausdauer getankt'], k), x:`${mm(c.x.m)} im Sattel. Das baut genau die Ausdauer auf, die dich ${ev ? 'am Eventtag' : 'auf langen Touren'} trägt. In der ersten Stunde danach Kohlenhydrate und etwas Eiweiß, dann die Beine hochlegen.`};
  if (c.kind === 'week') return {ic:'check', col:'#0a8f6a', t:`Woche ${c.w} komplett!`, x:`Alle ${c.n} Einheiten erledigt, ${hStd(c.min / 60)} Std. Training. Regelmäßigkeit ist im Ausdauersport der stärkste Hebel, und du lieferst sie.`};
  if (c.kind === 'hardweek') return {ic:'flame', col:'#fb923c', t:pickV(['Harte Woche gemeistert', 'Was für eine Woche!'], k), x:`Woche ${c.w} war eine der fordernden Aufbauwochen, und du hast alle ${c.n} Einheiten durchgezogen (${hStd(c.min / 60)} Std.). Das ist echte Arbeit. Gönn dir jetzt bewusst Schlaf: Stärker wirst du in der Erholung.`};
  if (c.kind === 'recweek') return {ic:'moon', col:'#62c7ff', t:'Erholungswoche erledigt', x:'Auch das ist Training: Dein Körper hat die letzten Wochen verarbeitet und baut jetzt um. Du startest frisch in den nächsten Block.'};
  if (c.kind === 'longest') return {ic:'trophy', col:'#d9a400', t:'Neue Bestmarke!', x:`„${esc(c.a.n)}“: ${mm(Math.round(c.a.sec / 60))} und ${c.a.km.toLocaleString('de-DE')} km. Das ist deine längste Fahrt der letzten drei Monate. Stark!`};
  if (c.kind === 'bigday') return {ic:'flame', col:'#fb923c', t:'Was für ein Tag!', x:`„${esc(c.a.n)}“ mit TSS ${c.a.tss}: eine richtig dicke Einheit. Plane danach bewusst lockere Tage ein, dein Körper braucht sie, um daraus Form zu machen.`};
  if (c.kind === 'ftpup') { const pct = Math.round((c.ftp / p.ftp - 1) * 100); return {ic:'trophy', col:'#d9a400', t:'Starke Leistung!', x:`In „${esc(c.a.n)}“ hast du 20 Minuten im Schnitt ${c.a.m20} W getreten. Das deutet auf einen FTP von etwa ${c.ftp} W hin, ${pct} % mehr als die ${p.ftp} W in deinem Plan.`, sub:`Übernimmst du den Wert, passen sich alle Wattvorgaben um +${pct} % an. Du kannst auch den nächsten Fitness-Check abwarten.`, acts:[[`FTP auf ${c.ftp} W setzen`, `setFtpNow(${ja(c.ftp)})`, 1]]}; }
  if (c.kind === 'test') { const r = (p.res || {})[c.w]; if (!r) return null;
    if (r.st === 'base') { const pct = Math.round((r.ftp / p.ftp - 1) * 100); return {ic:'target', col:'#007f8d', t:'Dein Startwert steht!', x:`Dein Fitnesstest ergibt etwa ${r.ftp} W FTP${Math.abs(pct) >= 2 ? `, ${pct > 0 ? 'mehr' : 'weniger'} als die geschätzten ${p.ftp} W` : ', fast genau wie geschätzt'}. Jetzt trainierst du mit Werten, die wirklich zu dir passen.`, sub:Math.abs(r.ftp - p.ftp) >= 3 ? `Übernimmst du den Wert, passen sich alle Wattvorgaben um ${pct > 0 ? '+' : ''}${pct} % und die Prognose an.` : '', acts:Math.abs(r.ftp - p.ftp) >= 3 ? [[`FTP übernehmen: ${r.ftp} W`, `setFtpNow(${ja(r.ftp)}, ${ja(c.w)})`, 1]] : []}; }
    if (r.st === 'behind') return {ic:'heart', col:'#d9a400', t:'Nicht entmutigen lassen', x:`Dein Fitness-Check ergibt etwa ${r.ftp} W, erwartet waren ${r.lo} bis ${r.hi} W. Ein einzelner Test sagt wenig: Müdigkeit aus harten Wochen, wenig Schlaf, Stress oder ein aufziehender Infekt drücken das Ergebnis schnell um einige Prozent. Wichtig ist der Trend.`, sub:'Was hilft jetzt? Die App empfiehlt eine Erholungswoche und danach einen zweiten Check. Du entscheidest.', acts:[['Erholungswoche einlegen', 'addRecW()', 1], ['Check in 2 Wochen wiederholen', `retest(${ja(c.w)})`], ['Optionen für mein Ziel', "closeCheer();openGoal('dash')"]]};
    const pct = Math.round((r.ftp / p.ftp - 1) * 100), ad = Math.abs(r.ftp - p.ftp) >= 3 && !r.adopted ? [[`FTP übernehmen: ${r.ftp} W (${pct > 0 ? '+' : ''}${pct} %)`, `setFtpNow(${ja(r.ftp)}, ${ja(c.w)})`, 1]] : [];
    return r.st === 'ahead' ? {ic:'trophy', col:'#0a8f6a', t:'Stärker als erwartet!', x:`Dein Fitness-Check ergibt etwa ${r.ftp} W FTP. Erwartet waren ${r.lo} bis ${r.hi} W. Dein Training wirkt richtig gut.`, sub:'Übernimmst du den Wert, passen sich alle Wattvorgaben an. Im Plan-Check siehst du danach, ob dein Ziel ehrgeiziger sein darf.', acts:ad}
      : {ic:'target', col:'#0a8f6a', t:'Voll auf Kurs', x:`Dein Fitness-Check ergibt etwa ${r.ftp} W FTP, genau im erwarteten Bereich (${r.lo} bis ${r.hi} W). Der Plan wirkt. Bleib dran!`, sub:ad.length ? 'Übernimmst du den Wert, passen sich alle Wattvorgaben an.' : '', acts:ad}; }
  if (c.kind === 'missed') return {ic:'heart', col:'#62c7ff', t:'Kein Grund zur Sorge', x:`Diese Woche sind ${c.n} Einheiten ausgefallen. Das passiert jedem, der neben Beruf und Alltag trainiert. Nachholen musst du nichts: Lass die verpassten Einheiten los und mach mit dem nächsten Training weiter.`, sub:'Fehlt öfter Zeit, passe deine Wochenzeit an (Einstellungen → Alltag und Planstart). Ein Plan, der zu deinem Alltag passt, bringt mehr als ein zu voller.'};
  if (c.kind === 'miss') return {ic:'heart', col:'#62c7ff', t:'Läuft gerade nicht alles nach Plan?', x:`Das ist völlig normal. Entscheidend sind nicht einzelne Einheiten, sondern die nächsten Wochen. ${c.r.lvl === 'high' ? 'Im Plan-Check findest du Wege, wie du dein Ziel trotzdem erreichst, oder ein starkes Zwischenziel.' : 'Mit dem Ausgleich im Wochenplan bleibst du auf Kurs.'}`, acts:[['Plan-Check ansehen', "closeCheer();goPg('check')"]]};
  if (c.kind === 'low') return {ic:'heart', col:'#62c7ff', t:'Gut, dass du auf dich hörst', x:'Erholung ist kein Rückschritt, sondern Teil des Trainings. Die App hat die nächste harte Einheit entschärft. Schlaf, gutes Essen und ein lockerer Tag bringen dich schneller zurück als Durchbeißen.'};
  return null;
}
function nextCheer(){
  if (cheerShow || !cheerQ.length || !S.p || S.step !== 0 || goalOpen || exOpen) return;
  cheerQ.sort((a, b) => (CHPRI[b.kind] || 0) - (CHPRI[a.kind] || 0)); const c = cheerQ[0];
  S.cheerSeen = [...(S.cheerSeen || []), ...cheerQ.map(x => x.key)].slice(-400); cheerQ = []; cheerShow = c; save();
}
function closeCheer(){ cheerShow = null; render(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cheerShow) closeCheer(); });
function cheerModal(){
  if (!cheerShow) return ''; const c = cheerContent(cheerShow); if (!c) { cheerShow = null; return ''; }
  return `<div class="exov" onclick="if(event.target===this)closeCheer()" role="dialog" aria-modal="true" aria-label="${esc(c.t)}"><div class="exbox text-center" style="max-width:420px">
    <div class="mx-auto flex items-center justify-center" style="width:72px;height:72px;border-radius:50%;background:${esc(c.col)}22;color:${esc(c.col)}"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CHI[c.ic] || ''}</svg></div>
    <h3 class="hd mt-3 text-2xl font-semibold">${c.t}</h3><p class="mt-2 text-sm">${c.x}</p>${c.sub ? `<p class="mt-2 text-xs" style="color:var(--mute)">${c.sub}</p>` : ''}
    <div class="mt-4" style="display:flex;flex-direction:column;gap:8px">${(c.acts || []).map(a => `<button class="${esc(a[2] ? 'btn' : 'ghost')} lbl" style="text-align:center;width:100%" onclick="${a[1]}">${a[0]}</button>`).join('')}<button class="${esc((c.acts || []).some(a => a[2]) ? 'ghost' : 'btn')} lbl" style="text-align:center;width:100%" onclick="closeCheer()">${(c.acts || []).length ? 'Später' : 'Weiter so'}</button></div></div></div>`;
}
