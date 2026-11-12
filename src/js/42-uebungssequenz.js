/* ---------- F11: Kraft- und Stabilitätsübungen als Sequenz mit Tonsignalen ----------
   Baut auf dem bestehenden Modell auf: MOB (Mobilität/Stabilität: [id, Name, Dosis-Text]) und strSession (Kraft:
   Zeilen mit „Sätze × Wdh.“ plus Rumpfübungen). Der Dosis-Text wird in Sätze, Sekunden oder Wiederholungen und
   „pro Seite“ zerlegt (sqDose). Die Strichfiguren kommen aus EXP/exAnimSvg.
   Ablauf: Vorlauf 5 s → Übung → Übergang → … → Ende. Runden, wenn alle Übungen dieselbe Satzzahl haben (Zirkel),
   sonst nacheinander mit Satzpausen. Die Zeit wird über Zeitstempel gemessen (Start der Phase + Pausen), nicht über
   gezählte Ticks. Signale stehen als fester Zeitplan je Phase (sqSched) und werden beim Überschreiten ausgelöst. */
/* B5: eigene Inline-SVG-Symbole für Bedienelemente (keine Emoji, keine Unicode-Pfeile). Farbe aus currentColor,
   Strichstärke wie die übrigen App-Symbole, abgerundete Enden. Dreiecke sind leicht zur Spitze versetzt. */
const IC_P = {
  prev:'<path d="M6 6v12" /><path d="M18 6.5v11L9.5 12z" fill="currentColor"/>',
  next:'<path d="M18 6v12" /><path d="M6 6.5v11l8.5-5.5z" fill="currentColor"/>',
  play:'<path d="M8.5 5.5v13l10-6.5z" fill="currentColor"/>',
  pause:'<rect x="6.5" y="5.5" width="3.6" height="13" rx="1" fill="currentColor"/><rect x="13.9" y="5.5" width="3.6" height="13" rx="1" fill="currentColor"/>',
  close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/>',
  warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
  chevL:'<path d="M14.5 6l-6 6 6 6"/>',
  chevR:'<path d="M9.5 6l6 6-6 6"/>',
  chevD:'<path d="M6 9.5l6 6 6-6"/>',
  star:'<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor"/>',
  starO:'<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  half:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
  sound:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'
};
function ic(n, s = 22, st = ''){ return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:middle;flex:none${st ? ';' + st : ''}">${IC_P[n] || ''}</svg>`; }
const SQ_DEF = {snd:true, voice:true, hints:true, vol:'m', vib:true, tr:10, hideMute:false, hideNoVoice:false, vs:'nat'};
function sqCfg(){ const c = S.sqCfg && typeof S.sqCfg === 'object' ? S.sqCfg : {}; const o = {...SQ_DEF, ...c};
  /* F13: Ansage ist jetzt Standard. Wer sie nicht selbst umgestellt hat (voiceSet), bekommt einmalig „an“. */
  if (!c.voiceSet) o.voice = true;
  if (![5, 10, 15, 20].includes(+o.tr)) o.tr = 10; o.tr = +o.tr; if (!['l', 'm', 'h'].includes(o.vol)) o.vol = 'm'; if (!['nat', 'sys'].includes(o.vs)) o.vs = 'nat'; ['snd', 'voice', 'hints', 'vib', 'hideMute', 'hideNoVoice', 'voiceSet'].forEach(k => { o[k] = !!o[k]; }); return o; }
function sqSet(k, v){ S.sqCfg = {...sqCfg(), [k]:v, ...(k === 'voice' ? {voiceSet:true} : {})}; if (k === 'voice' && !v) sqHush(); save(); render(); }
/* ---- Dosis: „2 × 45 Sek. pro Seite“, „8 pro Seite“, „10 langsame Wiederholungen“, „3 × 8–10 Wdh.“, „3–4 × 6–8 Wdh. pro Bein, langsam ablassen (3 Sek.)“ ---- */
function sqDose(t){
  const s = String(t || '').trim(), o = {sets:1, sec:0, reps:'', side:/pro (Seite|Bein)/.test(s), hint:''};
  let r = s; const m = r.match(/^(\d+)(?:\s*[–-]\s*\d+)?\s*×\s*/); if (m) { o.sets = +m[1]; r = r.slice(m[0].length); }
  const ts = r.match(/^(\d+)\s*Sek\./), rp = r.match(/^(\d+(?:\s*[–-]\s*\d+)?)/);
  if (ts) o.sec = +ts[1]; else if (rp) o.reps = rp[1].replace(/\s/g, '');
  const h = s.split(/,\s*/).slice(1).join(', '); if (h) o.hint = h;
  /* B3: unbekannter Dosis-Text → sinnvolle Standarddosis statt leerer Übung */
  if (!o.sec && !o.reps) { o.sec = 30; o.dflt = true; }
  if (!(o.sets >= 1 && o.sets <= 10)) o.sets = 1;
  return o;
}
const SQ_CORE = {deadbug:'8 pro Seite', pallof:'10 pro Seite', sidep:'30 Sek. pro Seite', plank:'40 Sek.'};
const SQ_SETREST = {tech:90, base:150, build:120, erh:120, leicht:90};
/* Geschätzte Dauer einer Übung in Sekunden (Wiederholungen: etwa 3 s je Wiederholung) */
function sqEst(d){ if (d.sec) return d.sec * (d.side ? 2 : 1); const n = +String(d.reps).split(/[–-]/).pop() || 10; return n * 3 * (d.side ? 2 : 1); }
/* Einheit des Tages i: mob (Mobilität/Stabilität) oder str (Kraft) */
function sqSession(kind, i){
  /* F23: frei gestartete Routine (Mehr → Übungen) */
  if (kind === 'rt') { const s = rtSel; if (!s) return null;
    const it = s.ex.filter(([id]) => EXI[id] && EXP[id]).map(([id, n, r]) => ({id, n:n || EXI[id].t, d:sqDose(r), dt:r}));
    const N = it.length && it.every(x => x.d.sets === it[0].d.sets) ? it[0].d.sets : 1;
    return {kind, i:-1, key:'rt|' + s.rt + '|' + iso(0), n:'Routine: ' + s.n, items:it, rounds:N, rr:60, setRest:0, circ:N > 1}; }
  if (kind === 'mob') { const s = mobMap[i]; if (!s) return null;
    const it = s.ex.filter(([id]) => EXI[id] && EXP[id]).map(([id, n, r]) => ({id, n:n || EXI[id].t, d:sqDose(r), dt:r}));
    const N = it.length && it.every(x => x.d.sets === it[0].d.sets) ? it[0].d.sets : 1;
    return {kind, i, key:mobKey(i), n:s.n, items:it, rounds:N, rr:60, setRest:0, circ:N > 1}; }
  const s = strMap[i]; if (!s) return null;
  const it = s.lines.filter(l => EXI[l.id] && EXP[l.id]).map(l => ({id:l.id, n:l.n || EXI[l.id].t, d:sqDose(l.r), dt:l.r}))
    .concat(s.core.filter(([, id]) => EXI[id] && EXP[id]).map(([n, id]) => { const dt = '2 × ' + (SQ_CORE[id] || '10 Wdh.'); return {id, n:n || EXI[id].t, d:sqDose(dt), dt}; }));
  return {kind, i, key:strKey(i), n:s.n.replace('Krafttraining: ', 'Kraft: '), items:it, rounds:1, rr:60, setRest:SQ_SETREST[s.kind] || 120, circ:false};
}
/* ---- F13: gesprochene Ausführungshinweise ----
   Je Übung ein eigener, gut sprechbarer Hinweis (Deutsch/Englisch) und ein kurzer Merksatz für die Halbzeit.
   Fehlt ein Eintrag, wird der Bildschirmtext (cap) sprechbar gemacht (sqSpk). */
const SQ_SAY = {
  catcow:['Katze: Rücken rund. Dann Kuh: Rücken hohl, Blick nach vorn.', 'Cat: round your back. Then cow: let your back sink, look ahead.', 'Langsam, im Atemrhythmus.', 'Slowly, with your breath.'],
  tspine:['Hand an den Hinterkopf, den Ellbogen langsam zur Decke drehen, der Blick folgt.', 'Hand behind your head, slowly rotate the elbow up to the ceiling, eyes follow.', 'Becken bleibt ruhig.', 'Keep your hips still.'],
  hipflex:['Halbkniestand, Becken aufrichten, Hüfte nach vorn schieben, Arm nach oben.', 'Half kneeling, tuck your pelvis, push the hip forward, arm up.', 'Gesäß fest, kein Hohlkreuz.', 'Squeeze the glute, no arched back.'],
  ham:['Rückenlage, Band um den Fuß, das gestreckte Bein sanft nach oben ziehen.', 'On your back, band around the foot, gently pull the straight leg up.', 'Becken bleibt am Boden.', 'Keep your hips on the floor.'],
  fig4:['Knöchel auf das andere Knie legen, das untere Bein zur Brust ziehen.', 'Ankle on the other knee, pull the lower leg towards your chest.', 'Kopf bleibt am Boden.', 'Keep your head down.'],
  birddog:['Vierfüßlerstand. Gegenarm und Gegenbein strecken, drei Sekunden halten.', 'On all fours. Extend the opposite arm and leg, hold for three seconds.', 'Rücken gerade, Bauch fest.', 'Back flat, core tight.'],
  deadbug:['Rückenlage, Knie über der Hüfte, Arme nach oben. Gegenarm und Gegenbein langsam strecken.', 'On your back, knees over hips, arms up. Slowly extend the opposite arm and leg.', 'Unterer Rücken bleibt am Boden.', 'Lower back stays down.'],
  sidep:['Seitstütz auf dem Unterarm, der Körper bildet eine Linie, Hüfte oben halten.', 'Side plank on your forearm, body in one line, keep your hips up.', 'Hüfte hoch, ruhig atmen.', 'Hips up, breathe calmly.'],
  clam:['Seitlage, Knie gebeugt, Füße zusammen. Oberes Knie öffnen und langsam schließen.', 'Lie on your side, knees bent, feet together. Open the top knee and close it slowly.', 'Becken kippt nicht nach hinten.', 'Don\'t roll your hips back.'],
  bridge:['Rückenlage, ein Fuß am Boden, das andere Bein gestreckt. Hüfte hochdrücken, langsam absenken.', 'On your back, one foot down, the other leg straight. Drive your hips up, lower slowly.', 'Gesäß fest, Hüfte gerade.', 'Squeeze the glute, hips level.'],
  squat:['Füße schulterbreit, in die Hocke, bis die Oberschenkel waagerecht sind, dann kraftvoll aufrichten.', 'Feet shoulder-width, squat until your thighs are level, then stand up powerfully.', 'Brust raus, Knie über den Zehen.', 'Chest up, knees over toes.'],
  rdl:['Gewicht an den Oberschenkeln, Hüfte weit nach hinten schieben, Rücken gerade, wieder aufrichten.', 'Weight against your thighs, push your hips back, back straight, stand up again.', 'Rücken gerade, Gewicht nah am Körper.', 'Flat back, weight close to your body.'],
  bss:['Hinterer Fuß auf der Bank, vorderes Knie bis etwa neunzig Grad beugen, kraftvoll hochdrücken.', 'Rear foot on the bench, bend the front knee to about ninety degrees, drive back up.', 'Oberkörper aufrecht, Knie stabil.', 'Torso upright, knee stable.'],
  thrust:['Schultern an der Bank, Hüfte bis zur Streckung hochdrücken, oben kurz halten.', 'Shoulders on the bench, drive your hips up to full extension, pause at the top.', 'Gesäß fest, Kinn zur Brust.', 'Squeeze the glutes, chin tucked.'],
  calf:['Auf die Zehenspitzen drücken, oben kurz halten, langsam absenken.', 'Rise onto your toes, pause at the top, lower slowly.', 'Langsam ablassen.', 'Lower slowly.'],
  slrdl:['Auf einem Bein stehen, Oberkörper nach vorn neigen, das freie Bein geht nach hinten, wieder aufrichten.', 'Stand on one leg, hinge forward, the free leg goes back, stand up again.', 'Hüfte gerade, Rücken lang.', 'Hips square, long back.'],
  stepup:['Ganzer Fuß auf die Stufe, über das vordere Bein hochdrücken, langsam wieder absteigen.', 'Whole foot on the step, drive up through the front leg, step down slowly.', 'Knie bleibt in der Spur.', 'Keep the knee in line.'],
  pallof:['Band seitlich, Griff vor der Brust. Arme nach vorn strecken, der Rumpf dreht nicht mit.', 'Band to the side, hands at your chest. Press your arms forward, don\'t let your torso rotate.', 'Bauch fest, nicht mitdrehen.', 'Brace, don\'t rotate.'],
  plank:['Unterarmstütz, der Körper bildet eine Linie vom Kopf bis zu den Fersen.', 'Forearm plank, body in one line from head to heels.', 'Bauch fest, Hüfte nicht durchhängen lassen.', 'Brace, don\'t let your hips sag.']
};
const sqEnL = () => lang() === 'en';
/* Bildschirmtext sprechbar machen: Zeichen, Abkürzungen, Zahlenbereiche, Klammern */
function sqSpk(t, en){
  return String(t || '').replace(/\s*→\s*/g, en ? ', then ' : ', dann ').replace(/\s*[·\/]\s*/g, ', ')
    .replace(/\bSek\./g, en ? 'seconds' : 'Sekunden').replace(/\bWdh\./g, en ? 'repetitions' : 'Wiederholungen').replace(/\bca\.\s*/g, en ? 'about ' : 'etwa ').replace(/\bMin\./g, en ? 'minutes' : 'Minuten')
    .replace(/(\d+)\s*[–-]\s*(\d+)/g, en ? '$1 to $2' : '$1 bis $2').replace(/[()]/g, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
}
/* Hinweis und Merksatz einer Übung, jeweils [de, en] */
function sqHint(id){ const s = SQ_SAY[id] || (EXI[id] && EXI[id].say); if (s) return [s[0], s[1]]; const c = (EXI[id] && EXI[id].cap) || []; const t = c.join(' → '); return [sqSpk(t, false), sqSpk(sqEn(c[0] || '') + (c[1] ? ' → ' + sqEn(c[1]) : ''), true)]; }
function sqCue(id){ const s = SQ_SAY[id] || (EXI[id] && EXI[id].say); if (s) return [s[2], s[3]]; const h = sqHint(id); return [h[0].split(/[.,]/)[0], h[1].split(/[.,]/)[0]]; }
/* Dosis sprechbar: „10 Wiederholungen pro Seite“, „45 Sekunden“ */
function sqDoseSay(d){ const side = d.side ? [' pro Seite', ' per side'] : ['', ''];
  if (d.sec) return [`${d.sec} Sekunden${side[0]}`, `${d.sec} seconds${side[1]}`];
  const r = String(d.reps || '').replace(/[–-]/, ' bis '), re = String(d.reps || '').replace(/[–-]/, ' to ');
  return [`${r} Wiederholungen${side[0]}`, `${re} repetitions${side[1]}`]; }
/* Geschätzte Sprechdauer (Tempo 0,95): etwa 0,4 s je Wort plus Anlauf */
/* F16: mit natürlicher Stimme gilt die echte Dauer der Sprachdatei aus dem Manifest */
const sqTalk = s => { const en = sqEnL(), t = Array.isArray(s) ? (en ? s[1] : s[0]) : String(s || ''); const ms = typeof vcMs === 'function' ? vcMs(t, en) : 0; return ms ? ms + 150 : 350 + t.split(/\s+/).filter(Boolean).length * 400; };
/* Phasen: pre (Vorlauf), ex (Übung), tr (Übergang bzw. Satzpause), rr (Pause zwischen Runden) */
function sqSteps(se, cfg){
  const st = [], tr = cfg.tr * 1000, nEx = se.items.length;
  const ex = (x, k, set, sets, rd) => ({t:'ex', id:x.id, n:x.n, d:x.d, dt:x.dt, no:k + 1, of:nEx, set, sets, rd, rds:se.rounds, dur:x.d.sec ? x.d.sec * 1000 * (x.d.side ? 2 : 1) : 0});
  const list = [];
  for (let r = 1; r <= se.rounds; r++) se.items.forEach((x, k) => { const sets = se.circ ? 1 : x.d.sets; for (let s = 1; s <= sets; s++) list.push(ex(x, k, s, sets, r)); });
  st.push({t:'pre', dur:5000});
  list.forEach((e, k) => { st.push(e); const nx = list[k + 1]; if (!nx) return;
    const rd = nx.rd !== e.rd, set = nx.id === e.id && nx.set > 1;
    st.push({t:rd ? 'rr' : 'tr', dur:rd ? se.rr * 1000 : set && se.setRest ? se.setRest * 1000 : tr, set}); });
  st.push({t:'end', dur:0});
  /* „als Nächstes“ für Vorlauf und Pausen */
  st.forEach((s, k) => { if (s.t !== 'ex' && s.t !== 'end') s.nx = st.slice(k + 1).find(q => q.t === 'ex'); });
  /* F13: Wo wird der Ausführungshinweis gesprochen? Im Vorlauf bzw. Übergang, wenn er vor den 3-2-1-Tönen (mit
     0,5 s Abstand) fertig ist; der Vorlauf wird dafür verlängert. Sonst direkt nach dem Startsignal der Übung. */
  if (cfg.voice && cfg.hints) st.forEach((s, k) => { if (!s.nx || s.t === 'ex' || s.t === 'end') return; const full = sqNextSay(s, true);
    const need = 800 + sqTalk(full) + 500 + 3000;
    if (s.t === 'pre') { s.dur = Math.max(5000, Math.ceil(need / 1000) * 1000); s.full = true; }
    else if (need <= s.dur) s.full = true;
    const e = st[k + 1]; if (e && e.t === 'ex') e.hintGo = !s.full; });
  return st;
}
const sqSideTxt = l => lang() === 'en' ? (l ? 'Now left' : 'Now right') : (l ? 'Jetzt links' : 'Jetzt rechts');
/* Zeitplan der Signale einer Phase: [{at (ms seit Phasenbeginn), k (Signal), say (Ansage, optional)}] */
/* Ansage im Vorlauf/Übergang: „Als Nächstes: Name, Dosis. Hinweis.“ (full) bzw. ohne Hinweis */
/* Namen sprechbar: Klammerzusatz als Nachsatz („Bulgarian Split Squat, Rucksack mit Last“) */
const sqNm = n => String(n || '').replace(/\s*\(([^)]*)\)/g, ', $1').trim();
function sqNextSay(s, full, pause){ const x = s.nx; if (!x) return ['', ''];
  const ds = sqDoseSay(x.d), h = sqHint(x.id), set = x.sets > 1 ? [`, Satz ${x.set} von ${x.sets}`, `, set ${x.set} of ${x.sets}`] : ['', ''];
  const de = `${s.t === 'pre' ? 'Erste Übung' : pause ? 'Pause – als Nächstes' : 'Als Nächstes'}: ${sqNm(x.n)}, ${ds[0]}${set[0]}.`, en = `${s.t === 'pre' ? 'First exercise' : pause ? 'Rest – next' : 'Next'}: ${sqNm(sqEn(x.n))}, ${ds[1]}${set[1]}.`;
  return full ? [de + ' ' + h[0], en + ' ' + h[1]] : [de, en]; }
const SQ_TONES = ['tick', 'go', 'pause', 'ding', 'half', 'done'];
/* B10: Start eines Satzes mit Wiederholungen: „Los. Bulgarian Split Squat, Satz 1 von 3, 10 Wiederholungen, linkes Bein.“
   (Satz nur bei mehreren Sätzen, Seite nur bei „pro Seite/Bein“; danach tippt man „Fertig“ bzw. „Fertig, Seite wechseln“). */
function sqRepSay(s){
  const d = s.d, leg = /pro Bein/.test(s.dt || ''), r = String(d.reps || '').replace(/[–-]/, ' bis '), re = String(d.reps || '').replace(/[–-]/, ' to ');
  const set = s.sets > 1 ? [`, Satz ${s.set} von ${s.sets}`, `, set ${s.set} of ${s.sets}`] : ['', ''], side = d.side ? (leg ? [', linkes Bein', ', left leg'] : [', linke Seite', ', left side']) : ['', ''];
  return [`Los. ${sqNm(s.n)}${set[0]}, ${r} Wiederholungen${side[0]}.`, `Go. ${sqNm(sqEn(s.n))}${set[1]}, ${re} repetitions${side[1]}.`];
}
/* Dauer sprechbar: 90 → „1 Minute 30“, 120 → „2 Minuten“, 45 → „45 Sekunden“ */
function sqDurSay(sec){ const m = Math.floor(sec / 60), r = Math.round(sec % 60);
  return m ? [(m === 1 ? '1 Minute' : m + ' Minuten') + (r ? ' ' + r : ''), (m === 1 ? '1 minute' : m + ' minutes') + (r ? ' ' + r : '')] : [r + ' Sekunden', r + ' seconds']; }
/* B10: Satzpause: „Satzpause, 1 Minute 30. Als Nächstes: Satz 2 von 3.“ */
function sqSetRestSay(s){ const x = s.nx, d = sqDurSay(Math.round(s.dur / 1000));
  return [`Satzpause, ${d[0]}. Als Nächstes: Satz ${x.set} von ${x.sets}.`, `Set rest, ${d[1]}. Next: set ${x.set} of ${x.sets}.`]; }
const SQ_10 = ['Noch 10 Sekunden', '10 seconds left'];
function sqSched(s, last, cfg, raw){
  cfg = cfg || sqCfg();
  const o = [], D = s.dur, n = (x, k, say, alt) => o.push({at:x, k, ...(say ? {say} : {}), ...(alt ? {alt} : {})}), H = cfg.voice && cfg.hints;
  if (s.t === 'pre' || s.t === 'tr' || s.t === 'rr') {
    if (s.nx) { if (s.t === 'tr' && s.set) n(800, 'say', sqSetRestSay(s)); else if (H && s.full) n(800, 'say', sqNextSay(s, true), sqNextSay(s, false)); else n(800, 'say', sqNextSay(s, false, s.t !== 'pre')); }
    if (s.t !== 'pre' && D >= 25000) n(D - 10000, 'say', SQ_10);
    [3000, 2000, 1000].forEach(x => { if (D - x >= 0) n(D - x, 'tick'); }); n(D, 'go');
  } else if (s.t === 'ex') {
    const nm = D ? [sqNm(s.n), sqNm(sqEn(s.n))] : sqRepSay(s), h = sqHint(s.id), sep = D ? '. ' : ' ';
    n(800, 'say', H && s.hintGo ? [nm[0] + sep + h[0], nm[1] + sep + h[1]] : nm, H && s.hintGo ? nm : null);
    if (D) {
      if (s.d.side) { n(D / 2, 'ding'); n(D / 2 + 700, 'say', SQ_SIDE); if (H && D / 2 >= 45000) { const c = sqCue(s.id); n(D / 4, 'say', c); n(D * 3 / 4, 'say', c); } }
      else { if (D >= 60000) n(D / 2, 'half'); if (H && D >= 45000) n(D / 2 + 700, 'say', sqCue(s.id)); }
      if (D >= 25000) n(D - 10000, 'say', SQ_10);
      [3000, 2000, 1000].forEach(x => { if (D - x > 1500) n(D - x, 'tick'); });
      /* Ende der letzten Übung: Melodie und „Geschafft“ kommen aus sqEnd */
      if (!last) n(D, 'pause');
    }
  }
  o.sort((a, b) => a.at - b.at);
  if (raw) return o;
  /* Ansagen dürfen keinen Ton überlagern (0,5 s Abstand vor und nach Tönen): sonst kürzere Fassung oder weglassen */
  const tones = o.filter(x => SQ_TONES.includes(x.k)).map(x => x.at);
  const fits = (at, say) => { const end = at + sqTalk(say); return !tones.some(t => (t >= at - 500 && t < end + 500)); };
  return o.filter(x => { if (x.k !== 'say') return true; if (fits(x.at, x.say)) return true; if (x.alt && fits(x.at, x.alt)) { x.say = x.alt; return true; } return false; }).map(x => { delete x.alt; return x; });
}
/* F16: alle Sätze, die eine Sequenz sprechen kann – Lang- und Kurzfassungen, unabhängig davon, welche der Zeitplan
   wählt (das hängt von der Sprechdauer ab). Grundlage für Katalog, Vorladen und Test. */
const SQ_SIDE = ['Seitenwechsel, jetzt rechts', 'Switch sides, now right'], SQ_DONE = ['Geschafft', 'Done'];
const sqTestSay = h => h ? ['Beispiel: Katze-Kuh. ' + SQ_SAY.catcow[0], 'Example: cat-cow. ' + SQ_SAY.catcow[1]] : ['Beispiel: Katze-Kuh.', 'Example: cat-cow.'];
const sqFixed = () => [SQ_SIDE, SQ_DONE, SQ_10, sqTestSay(true), sqTestSay(false)];
function sqSays(se, cfg){
  const st = sqSteps(se, cfg), o = [];
  st.forEach((s, k) => { if (s.t === 'end') return;
    if (s.t !== 'ex') { if (s.nx) { if (cfg.hints) o.push(sqNextSay(s, true)); o.push(sqNextSay(s, false), sqNextSay(s, false, s.t !== 'pre')); sqSched(s, false, cfg, true).forEach(x => { if (x.say) o.push(x.say); }); } return; }
    const nm = [sqNm(s.n), sqNm(sqEn(s.n))], h = sqHint(s.id); o.push(nm); if (cfg.hints) o.push([nm[0] + '. ' + h[0], nm[1] + '. ' + h[1]]);
    if (!s.dur) { const r = sqRepSay(s); o.push(r); if (cfg.hints) o.push([r[0] + ' ' + h[0], r[1] + ' ' + h[1]]); }
    sqSched(s, false, cfg, true).forEach(x => { if (x.say) o.push(x.say); if (x.alt) o.push(x.alt); });
    if (s.d.side) o.push(SQ_SIDE); });
  sqFixed().forEach(x => o.push(x));
  return o.filter(x => x && x[0]);
}
const sqEn = t => { try { return typeof trS === 'function' ? trS(t) : t; } catch (e) { elog(e); return t; } };
/* ---- Töne (Web Audio, Oszillator mit Hüllkurve) ---- */
let sqAC = null;
function sqAudio(){
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { elog(e); }
  try { if (!sqAC) { const A = window.AudioContext || window.webkitAudioContext; if (A) sqAC = new A(); } if (sqAC && sqAC.state !== 'running') sqAC.resume().catch(() => {}); } catch (e) { elog(e); sqAC = null; }
  return sqAC;
}
function sqTone(f, at, len, vol, type){
  const c = sqAC; if (!c) return; try { const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.setValueAtTime(vol, t + Math.max(.015, len - .06)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + len + .02); } catch (e) { elog(e); }
}
const SQ_VOL = {l:.12, m:.3, h:.6};
const SQ_VIB = {tick:30, go:220, pause:[90, 70, 90], ding:60, half:30, done:[100, 60, 100, 60, 240]};
function sqSig(k, say){
  const c = sqCfg();
  try { (window.__sqLog = window.__sqLog || []).push({k, say:say ? say[0] : undefined, t:Date.now(), step:sq ? sq.k : -1}); if (window.__sqLog.length > 400) window.__sqLog.shift(); } catch (e) { elog(e); }
  if (k === 'say') { if (c.voice) sqSpeak(say); return; }
  if (c.snd && sqAudio()) { const v = SQ_VOL[c.vol];
    if (k === 'tick') sqTone(880, 0, .12, v);
    else if (k === 'go') sqTone(1320, 0, .55, v);
    else if (k === 'pause') { sqTone(392, 0, .16, v); sqTone(330, .24, .2, v); }
    else if (k === 'ding') { sqTone(1760, 0, .4, v * .8, 'triangle'); sqTone(2637, 0, .25, v * .25); }
    else if (k === 'half') sqTone(660, 0, .14, v * .45);
    else if (k === 'done') { sqTone(523, 0, .18, v); sqTone(659, .2, .18, v); sqTone(784, .4, .45, v); } }
  if (c.vib && SQ_VIB[k]) { try { navigator.vibrate && navigator.vibrate(SQ_VIB[k]); } catch (e) { elog(e); } }
}
/* Stimme: beste verfügbare der App-Sprache (nicht „compact“; Web-Apps auf dem iPhone sehen nur einen Teil der Systemstimmen), Tempo 0,95.
   Ansagen werden nie gestapelt: eine neue bricht die laufende ab. */
const sqVoices = () => { try { return (window.speechSynthesis && typeof speechSynthesis.getVoices === 'function' && speechSynthesis.getVoices()) || []; } catch (e) { elog(e); return []; } };
function sqVoice(en){
  try { const L = sqVoices(); if (!L.length) return null;
    const want = en ? /^en(-|_|$)/i : /^de(-|_|$)/i, cand = L.filter(v => want.test(v.lang || '')); if (!cand.length) return null;
    const sc = v => (/compact/i.test(v.name + ' ' + (v.voiceURI || '')) ? -4 : 0) + (/premium|enhanced|natural|neural/i.test(v.name) ? 3 : 0) + (v.localService ? 1 : 0) + ((v.lang || '').replace('_', '-') === (en ? 'en-US' : 'de-DE') ? 1 : 0);
    return cand.slice().sort((a, b) => sc(b) - sc(a))[0]; } catch (e) { elog(e); return null; }
}
const sqCanSpeak = () => { try { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); } catch (e) { elog(e); return false; } };
function sqHush(){ try { if (typeof vcStop === 'function') vcStop(); } catch (e) { elog(e); } try { if (window.speechSynthesis && typeof speechSynthesis.cancel === 'function') speechSynthesis.cancel(); } catch (e) { elog(e); } }
function sqSpeak(say){
  /* F16: zuerst die Sprachdatei (natürliche Stimme), sonst die Systemstimme mit demselben Text */
  try { const en = lang() === 'en'; if (typeof vcPlay === 'function' && vcPlay(en ? say[1] : say[0], en, {l:.45, m:.75, h:1}[sqCfg().vol])) return;
    if (typeof vcLog === 'function') vcLog('sys', en ? say[1] : say[0]); } catch (e) { elog(e); }
  try { if (!sqCanSpeak()) return; const en = lang() === 'en', u = new SpeechSynthesisUtterance(en ? say[1] : say[0]), v = sqVoice(en);
    u.lang = v ? v.lang : (en ? 'en-US' : 'de-DE'); if (v) u.voice = v; u.rate = .95; u.volume = {l:.5, m:.8, h:1}[sqCfg().vol];
    sqHush(); speechSynthesis.speak(u); } catch (e) { elog(e); }
}
/* ---- Bildschirm an lassen ---- */
let sqLock = null;
function sqWake(){ try { if (!('wakeLock' in navigator) || sqLock) return; navigator.wakeLock.request('screen').then(l => { sqLock = l; l.addEventListener('release', () => { sqLock = null; }); }).catch(() => {}); } catch (e) { elog(e); } }
function sqUnwake(){ try { if (sqLock) sqLock.release(); } catch (e) { elog(e); } sqLock = null; }
/* ---- Zustand und Ablauf ---- */
let sq = null, sqTm = 0;
function sqOpen(kind, i){
  let se = null; try { se = sqSession(kind, i); } catch (e) { elog(e); se = null; }
  /* B3: keine stille Ablehnung – ohne Übungsfolge erscheint ein Hinweis */
  if (!se || !se.items.length) { sq = {view:'none'}; return render(); }
  sq = {view:'start', se, cfgOpen:false};
  /* F16: genau die Sätze dieser Sequenz laden und dekodieren (nicht alle) */
  try { const c = sqCfg(), en = lang() === 'en', o = sq; if (vcWeb() && c.voice && c.vs !== 'sys') o.vcP = vcPreload(vcSessionTexts(se, c, en), en).then(() => { o.vcDone = true; }, () => { o.vcDone = true; }); } catch (e) { elog(e); }
  render(); }
function sqClose(){ sqStop(); sq = null; render(); }
function sqStop(){ clearInterval(sqTm); sqTm = 0; sqUnwake(); }
/* B10: iOS gibt Ton und Systemstimme nur frei, wenn sie zuerst direkt aus einem Antippen kommen. Die Sequenz startet aber
   oft erst nach dem Vorladen (bis 1,5 s später, aus einem Timer). Deshalb hier im Antippen: ein stiller Ton über den
   AudioContext und eine stumme Ansage. Sonst bliebe die Systemstimme (Rückfall, solange Sprachdateien laden) stumm. */
function sqUnlock(){
  try { const c = sqAudio(); if (c) { const b = c.createBuffer(1, 1, c.sampleRate), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } } catch (e) { elog(e); }
  try { if (sqCfg().voice && sqCanSpeak()) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { elog(e); }
}
function sqStart(){
  if (!sq || !sq.se || sq.view !== 'start' || sq.wait) return; try { sqUnlock(); } catch (e) { elog(e); } try { sqWake(); } catch (e) { elog(e); }
  /* F16: höchstens 1,5 s auf die Sprachdateien warten; danach startet die Sequenz trotzdem (Rest: Systemstimme) */
  if (sq.vcP && !sq.vcDone) { const o = sq; o.wait = true; render(); let f = false; const go = () => { if (f) return; f = true; o.wait = false; if (sq === o && o.view === 'start') sqGo(); };
    o.vcP.then(go, go); setTimeout(go, 1500); return; }
  sqGo();
}
function sqGo(){
  const now = Date.now(), cfg = sqCfg(); sq = {...sq, view:'run', cfg, steps:sqSteps(sq.se, cfg), k:0, t0:now, paused:false, pAt:0, pTot:0, startAt:now, fired:{}, rep:0, doneEx:{}, ask:false, bg:false};
  sqEnter(0, now, false); clearInterval(sqTm); sqTm = setInterval(sqTick, 100); render();
}
const sqLastEx = k => !sq.steps.slice(k + 1).some(s => s.t === 'ex');
function sqEnter(k, t0, manual){
  sq.k = k; sq.t0 = t0; sq.fired = {}; sq.rep = 0; const s = sq.steps[k];
  if (s.t === 'end') return sqEnd(false);
  if (manual) sqHush();
  if (manual && s.t === 'ex') sqSig('go');
  sqLive(s);
}
function sqLive(s){ sq.live = s.t === 'ex' ? (lang() === 'en' ? `Exercise ${s.no} of ${s.of}: ${sqEn(s.n)}` : `Übung ${s.no} von ${s.of}: ${s.n}`) : s.t === 'pre' ? (lang() === 'en' ? 'Get ready' : 'Gleich geht\'s los') : (lang() === 'en' ? 'Rest' : 'Pause'); }
const sqEl = () => (sq.paused ? sq.pAt : Date.now()) - sq.t0;
function sqTick(){
  if (!sq || sq.view !== 'run' || sq.paused || sq.ask) return;
  const s = sq.steps[sq.k], el = sqEl(), sch = sqSched(s, s.t === 'ex' && sqLastEx(sq.k), sq.cfg);
  sch.forEach((x, j) => { if (!sq.fired[j] && el >= x.at && (!s.dur || x.at <= s.dur)) { sq.fired[j] = 1; sqSig(x.k, x.say); } });
  if (s.dur && el >= s.dur) {
    if (s.t === 'ex') sq.doneEx[sq.k] = 1;
    /* Folgephase beginnt exakt am Ende der vorigen (kein Drift durch Tick-Abstände) */
    if (s.t === 'ex' && sqLastEx(sq.k)) return sqEnd(false);
    sqEnter(sq.k + 1, sq.t0 + s.dur, false); return render();
  }
  sqDom();
}
/* Nur Zahl, Ring und Seite aktualisieren; ganze Ansicht nur bei Phasenwechsel neu zeichnen */
function sqDom(){
  const s = sq.steps[sq.k]; if (!s || !s.dur) return; const el = sqEl(), rem = Math.max(0, s.dur - el), sec = Math.ceil(rem / 1000);
  const n = document.getElementById('sqNum'); if (n && n.textContent !== String(sec)) n.textContent = sec;
  const r = document.getElementById('sqRing'); if (r) r.setAttribute('stroke-dashoffset', (289 * (1 - rem / s.dur)).toFixed(1));
  if (s.t === 'ex' && s.d.side) { const sd = document.getElementById('sqSide'), t = sqSideTxt(el < s.dur / 2); if (sd && sd.textContent !== t) sd.textContent = t; }
}
function sqRepDone(){
  const s = sq && sq.steps[sq.k]; if (!s || s.t !== 'ex' || s.dur || sq.paused) return;
  if (s.d.side && sq.rep === 0) { sq.rep = 1; sqSig('ding'); setTimeout(() => sqSig('say', SQ_SIDE), 700); return render(); }
  sq.doneEx[sq.k] = 1;
  if (sqLastEx(sq.k)) return sqEnd(false);
  sqSig('pause'); sqEnter(sq.k + 1, Date.now(), false); render();
}
function sqPause(){ if (!sq || sq.view !== 'run' || sq.paused) return; sq.paused = true; sq.pAt = Date.now(); sqHush(); render(); }
function sqResume(){ if (!sq || sq.view !== 'run' || !sq.paused) return; const d = Date.now() - sq.pAt; sq.t0 += d; sq.pTot += d; sq.paused = false; sq.bg = false; try { sqAudio(); } catch (e) { elog(e); } try { sqWake(); } catch (e) { elog(e); }
  /* nach „Weiter“ nur den Namen der laufenden Übung, nicht den Hinweis */
  const s = sq.steps[sq.k]; if (s && s.t === 'ex') sqSig('say', [sqNm(s.n), sqNm(sqEn(s.n))]); render(); }
function sqToggle(){ if (!sq || sq.ask) return; sq.paused ? sqResume() : sqPause(); }
function sqSkip(){ if (!sq || sq.view !== 'run') return; const now = Date.now(); if (sq.paused) { sq.pTot += now - sq.pAt; sq.paused = false; } sq.bg = false;
  sqEnter(sq.k + 1, now, true); if (sq && sq.view === 'run') render(); }
function sqBack(){ if (!sq || sq.view !== 'run') return; const now = Date.now(), s = sq.steps[sq.k], el = sqEl(); if (sq.paused) { sq.pTot += now - sq.pAt; sq.paused = false; }
  let k = sq.k; if (!(s.t === 'ex' && el > 3000)) { for (k = sq.k - 1; k > 0 && sq.steps[k].t !== 'ex'; k--); if (k <= 0) k = sq.steps.findIndex(q => q.t === 'ex'); }
  sqEnter(k, now, true); render(); }
function sqAbortAsk(){ if (!sq) return; if (sq.view !== 'run') return sqClose(); if (!sq.paused) { sq.paused = true; sq.pAt = Date.now(); } sq.ask = true; render(); }
function sqAbortNo(){ if (!sq) return; sq.ask = false; render(); }
function sqAbort(part){ if (!sq) return; if (part) return sqEnd(true); sqClose(); }
function sqEnd(part){
  const now = sq.paused ? sq.pAt : Date.now(), act = Math.max(0, now - sq.startAt - sq.pTot), nEx = Object.keys(sq.doneEx).length, nTot = sq.steps.filter(s => s.t === 'ex').length;
  if (!part) { sqSig('done'); setTimeout(() => sqSig('say', SQ_DONE), 1500); }
  sqStop(); sq = {view:'end', se:sq.se, act, nEx, nTot, part}; sqSaveDone(part, act, nEx, nTot); render();
}
/* Einheit als (teilweise) erledigt markieren und ins Logbuch schreiben */
function sqSaveDone(part, act, nEx, nTot){
  const se = sq.se, key = se.key;
  if (se.kind === 'mob') { S.mobDone = S.mobDone || {}; S.mobDone[key] = part ? 'part' : true; } else if (se.kind === 'str') { S.strDone = S.strDone || {}; S.strDone[key] = part ? 'part' : true; }
  try { S.lb = S.lb && typeof S.lb === 'object' ? S.lb : {}; S.lb['sq|' + key] = {k:'s', day:se.i >= 0 ? dstr(se.i) : iso(0), n:se.n, sk:se.kind, sec:Math.round(act / 1000), nEx, nTot, part:!!part, at:Date.now(), pid:S.pid || null}; } catch (e) { elog(e); }
  save();
}
document.addEventListener('visibilitychange', () => {
  if (!sq || sq.view !== 'run') return;
  if (document.hidden) { sqHush(); if (!sq.paused) { sq.paused = true; sq.pAt = Date.now(); sq.bg = true; } sqLock = null; try { render(); } catch (e) { elog(e); } }
  else { sqAudio(); sqWake(); try { render(); } catch (e) { elog(e); } }
});
/* ---- Ansichten ---- */
const sqReduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { elog(e); return false; } };
function sqFig(id, big){
  const w = big ? 'width:min(78vw,360px)' : 'width:min(34vw,150px)';
  if (sqReduced()) return `<div style="${w};margin:0 auto" class="exf"><svg viewBox="0 0 170 165" role="img" aria-label="${esc(EXI[id].t)}"><line x1="4" y1="${EXG.GY}" x2="166" y2="${EXG.GY}" class="gr"/>${exTpl(id).A}</svg></div>`;
  return `<div style="${w};margin:0 auto" class="exf">${exAnimSvg(id)}</div>`;
}
const sqDur = s => { const t = Math.round(s); return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} Min.` : `${t} Sek.`; };
function sqTotal(se, cfg){ const st = sqSteps(se, cfg); let s = 0, est = false; st.forEach(x => { if (x.t === 'ex' && !x.dur) { s += sqEst(x.d); est = true; } else s += (x.dur || 0) / 1000; }); return {s, est, n:st.filter(x => x.t === 'ex').length}; }
function sqCfgUi(inline){
  const c = sqCfg(), tg = (k, l) => `<label class="flex items-center gap-3" style="min-height:44px"><input type="checkbox" style="width:22px;height:22px" ${c[k] ? 'checked' : ''} onchange="sqSet('${k}',this.checked)"><span class="text-sm">${l}</span></label>`;
  const ch = (k, v, l) => `<button class="${c[k] === v ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${c[k] === v}" onclick="sqSet('${k}',${typeof v === 'number' ? v : `'${v}'`})">${l}</button>`;
  const vib = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  return `<div class="${inline ? 'mt-3 p-3' : 'panel p-4'}" style="${inline ? 'border:1px solid var(--line)' : ''}">${tg('snd', 'Tonsignale')}${tg('voice', 'Sprachansage')}${c.voice ? `<div style="padding-left:34px">${tg('hints', 'Ausführungshinweise ansagen')}<p class="mt-1 text-sm font-semibold">Stimme</p><div class="mt-1 flex flex-wrap gap-2">${ch('vs', 'nat', 'Natürlich (empfohlen)')}${ch('vs', 'sys', 'Systemstimme')}</div></div>` : ''}${vib ? tg('vib', 'Vibration') : ''}
    <p class="mt-2 text-sm font-semibold">Lautstärke</p><div class="mt-1 flex flex-wrap gap-2">${ch('vol', 'l', 'Leise')}${ch('vol', 'm', 'Mittel')}${ch('vol', 'h', 'Laut')}</div>
    <p class="mt-3 text-sm font-semibold">Übergangszeit zwischen den Übungen</p><div class="mt-1 flex flex-wrap gap-2">${[5, 10, 15, 20].map(v => ch('tr', v, v + ' Sek.')).join('')}</div>
    <button class="ghost mt-3 !w-auto !px-3 text-sm inline-flex items-center gap-2" style="min-height:44px" onclick="sqTest()">${ic('sound', 18)}<span>Töne testen</span></button></div>`;
}
function sqTest(){ sqAudio(); ['tick', 'go', 'pause', 'ding', 'done'].forEach((k, j) => setTimeout(() => sqSig(k), j * 900));
  /* F13: dazu ein Beispielhinweis */
  /* F16: Beispielsatz in der gewählten Stimme (Datei vorher laden) */
  const c = sqCfg(), say = sqTestSay(c.hints), en = lang() === 'en'; if (!c.voice) return;
  try { if (vcWeb() && c.vs !== 'sys') vcPreload([en ? say[1] : say[0]], en); } catch (e) { elog(e); }
  setTimeout(() => sqSpeak(say), 5200); }
function sqLater(){ return typeof strWeek === 'number' && S.wk && strWeek > S.wk ? '<p class="mt-2 text-xs" style="color:var(--mute)">Die Sequenz lässt sich in der Woche der Einheit starten.</p>' : ''; }
function sqBtn(kind, i){ return `<button class="btn mt-2 w-full" style="min-height:48px" onclick="sqOpen('${kind}',${ja(i)})"><span class="inline-flex items-center justify-center gap-2">${ic('play', 20)}<span>Übung starten</span></span></button>`; }
function sqView(){
  if (!sq) return '';
  const wrap = (body, tap) => `<div class="sqov" role="dialog" aria-modal="true" aria-label="Übungssequenz"${tap ? ' onclick="if(!event.target.closest(\'button\'))sqToggle()"' : ''}><div class="sqin">${body}</div><p class="sr-only" aria-live="polite" data-noi18n>${esc(sq.live || '')}</p></div>`;
  if (sq.view === 'none') return wrap(`<div class="flex items-start gap-2"><p class="sqh flex-1" style="text-align:left">Übungssequenz</p><button class="ghost !px-3" style="min-width:48px;min-height:48px" aria-label="Schließen" onclick="sqClose()">${ic('close', 22)}</button></div><p class="mt-4 text-lg">Für diese Einheit gibt es keine Übungsfolge. Die Übungen stehen weiter in der Tageskarte.</p><button class="btn mt-4 w-full" style="min-height:56px" onclick="sqClose()">Zurück</button>`);
  const se = sq.se, c = sqCfg();
  if (sq.view === 'start') { const T = sqTotal(se, c);
    return wrap(`<div class="flex items-start gap-2"><div class="flex-1"><p class="eyebrow">Übungssequenz</p><h2 class="hd text-3xl font-semibold" data-noi18n>${esc(se.n)}</h2></div><button class="ghost !px-3" style="min-width:48px;min-height:48px" aria-label="Einstellungen" aria-expanded="${!!sq.cfgOpen}" onclick="sq.cfgOpen=!sq.cfgOpen;render()">${ic('gear', 22)}</button><button class="ghost !px-3" style="min-width:48px;min-height:48px" aria-label="Schließen" onclick="sqClose()">${ic('close', 22)}</button></div>
      <p class="mt-2 text-sm">${se.items.length} ${se.items.length === 1 ? 'Übung' : 'Übungen'}${se.circ ? ` · ${se.rounds} Runden` : T.n > se.items.length ? ` · ${T.n} Sätze` : ''} · ${T.est ? 'etwa ' : ''}${sqDur(T.s)} mit Übergängen</p>
      ${sq.cfgOpen ? sqCfgUi(true) : ''}
      ${c.snd && !c.hideMute ? `<div class="mt-3 flex items-center gap-2 p-3 text-sm" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><span class="flex-1">Für Tonsignale Stummschalter ausschalten.</span><button class="ghost !w-auto !px-3 text-xs" style="min-height:44px" onclick="sqSet('hideMute',true)">Nicht mehr zeigen</button></div>` : ''}
      ${c.voice && !c.hideNoVoice && (c.vs === 'sys' || !vcWeb()) && (!sqCanSpeak() || (sqVoices().length && !sqVoice(lang() === 'en'))) ? `<div class="mt-3 flex items-center gap-2 p-3 text-sm" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><span class="flex-1">Dieses Gerät hat keine passende Sprachausgabe. Die Sequenz läuft ohne Ansagen.</span><button class="ghost !w-auto !px-3 text-xs" style="min-height:44px" onclick="sqSet('hideNoVoice',true)">Nicht mehr zeigen</button></div>` : ''}
      ${'wakeLock' in navigator ? '' : '<p class="mt-2 text-xs" style="color:var(--mute)">Dieses Gerät hält den Bildschirm nicht automatisch an. Stell die automatische Sperre bei Bedarf länger.</p>'}
      <ol class="mt-3 space-y-2">${se.items.map((x, k) => `<li class="flex items-center gap-3 p-2" style="border:1px solid var(--line);border-radius:12px"><span class="w-6 text-center font-semibold" style="color:var(--mute)">${k + 1}</span><span class="min-w-0 flex-1"><span class="block font-semibold">${esc(x.n)}</span><span class="block text-xs" style="color:var(--mute)"><span>${esc(x.dt)}</span>${se.circ ? ` <span>(${se.rounds} Runden)</span>` : ''}</span></span><span class="text-xs" style="color:var(--mute)">${x.d.sec ? '' : 'ca. '}${sqDur(sqEst(x.d) * (se.circ ? 1 : x.d.sets))}</span></li>`).join('')}</ol>
      ${se.setRest ? `<p class="mt-2 text-xs" style="color:var(--mute)">Satzpause ${sqDur(se.setRest)}, zwischen den Übungen ${c.tr} Sek.</p>` : se.circ ? `<p class="mt-2 text-xs" style="color:var(--mute)">Zirkel: ${se.rounds} Runden, ${c.tr} Sek. zwischen den Übungen, ${se.rr} Sek. zwischen den Runden.</p>` : ''}
      <button class="btn mt-4 w-full text-xl font-semibold" style="min-height:64px" onclick="sqStart()" ${sq.wait ? 'aria-busy="true"' : ''}><span class="inline-flex items-center justify-center gap-2">${ic('play', 24)}<span>${sq.wait ? 'Ansagen werden geladen …' : 'Übung starten'}</span></span></button>`); }
  if (sq.view === 'end') return wrap(`<div class="flex flex-col items-center text-center" style="min-height:70vh;justify-content:center"><p style="color:var(--teal)">${ic(sq.part ? 'half' : 'check', 72)}</p><p class="sqh mt-3">${sq.part ? 'Teilweise geschafft' : 'Sequenz geschafft'}</p>
      <p class="mt-3 text-lg">${sqDur(sq.act / 1000)} · ${sq.nEx} von ${sq.nTot} Übungen</p><p class="mt-1 text-sm" style="color:var(--mute)">${sq.part ? 'Als teilweise erledigt gespeichert, auch im Logbuch.' : 'Als erledigt gespeichert, auch im Logbuch.'}</p>
      <button class="btn mt-6 w-full text-xl" style="min-height:64px;max-width:420px" onclick="sqClose()">Fertig</button></div>`);
  /* Ablauf */
  const s = sq.steps[sq.k]; if (!s) return '';
  const el = sqEl(), rem = s.dur ? Math.max(0, s.dur - el) : 0, sec = Math.ceil(rem / 1000);
  const ring = s.dur ? `<div style="position:relative;width:min(44vw,190px);margin:0 auto" aria-hidden="true"><svg viewBox="0 0 100 100" style="width:100%;transform:rotate(-90deg)"><circle cx="50" cy="50" r="46" fill="none" stroke="var(--line)" stroke-width="6"/><circle id="sqRing" cx="50" cy="50" r="46" fill="none" stroke="${s.t === 'ex' ? 'var(--teal)' : 'var(--ice)'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="${(289 * (1 - rem / s.dur)).toFixed(1)}"/></svg><span id="sqNum" class="hd" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:min(20vw,88px);font-weight:700">${sec}</span></div>` : '';
  const ctl = `<div class="mt-4 flex items-center justify-center gap-4"><button class="ghost sqcb" aria-label="Vorherige Übung" onclick="sqBack()">${ic('prev', 26)}</button><button class="btn sqpb" aria-label="${sq.paused ? 'Weiter' : 'Pause'}" onclick="sqToggle()">${ic(sq.paused ? 'play' : 'pause', 36)}</button><button class="ghost sqcb" aria-label="Nächste Übung" onclick="sqSkip()">${ic('next', 26)}</button></div>`;
  const top = `<div class="flex items-center gap-2"><p class="flex-1 text-sm font-semibold" style="color:var(--mute)">${s.t === 'ex' ? `Übung ${s.no} von ${s.of}${s.sets > 1 ? ` · Satz ${s.set} von ${s.sets}` : ''}${s.rds > 1 ? ` · Runde ${s.rd} von ${s.rds}` : ''}` : s.nx && s.nx.rds > 1 ? `Runde ${s.nx.rd} von ${s.nx.rds}` : ''}</p><button class="ghost !px-3" style="min-width:48px;min-height:48px" aria-label="Abbrechen" onclick="sqAbortAsk()">${ic('close', 22)}</button></div>`;
  let body;
  if (s.t === 'ex') {
    const side = s.d.side ? (s.dur ? sqSideTxt(el < s.dur / 2) : sqSideTxt(sq.rep === 0)) : '';
    body = `${top}<p class="sqh mt-1">${esc(s.n)}</p>${side ? `<p id="sqSide" class="mt-1 text-center text-2xl font-semibold" style="color:var(--teal)" data-noi18n>${side}</p>` : ''}
      <div class="mt-2">${sqFig(s.id, true)}</div>
      ${s.dur ? ring : `<p class="sqbig mt-2">${esc(s.d.reps)}</p><p class="text-center text-xl font-semibold">${s.d.side ? 'Wiederholungen pro Seite' : 'Wiederholungen'}</p><button class="btn mx-auto mt-4 block w-full text-2xl font-semibold" style="min-height:72px;max-width:420px" onclick="sqRepDone()">${s.d.side && sq.rep === 0 ? 'Fertig, Seite wechseln' : 'Fertig'}</button>`}
      <p class="mt-3 text-center text-base">${(EXI[s.id].cap || []).length > 1 ? `<span>${esc(EXI[s.id].cap[0])}</span> → <span>${esc(EXI[s.id].cap[1])}</span>` : ''}${s.d.hint ? ` · <span>${esc(s.d.hint)}</span>` : ''}</p>`;
  } else if (s.t === 'pre') body = `${top}<p class="sqh mt-6">Gleich geht's los</p><p class="mt-1 text-center text-lg"><span>Erste Übung:</span> <span>${esc(s.nx.n)}</span></p><div class="mt-3">${sqFig(s.nx.id, true)}</div>${ring}`;
  else body = `${top}<p class="sqh mt-6">${s.t === 'rr' ? 'Rundenpause' : s.set ? 'Satzpause' : 'Pause'}</p><p class="mt-1 text-center text-lg">als Nächstes: <b>${esc(s.nx.n)}</b>${s.nx.sets > 1 ? ` (Satz ${s.nx.set} von ${s.nx.sets})` : ''}</p><div class="mt-3">${sqFig(s.nx.id, false)}</div><div class="mt-3">${ring}</div>`;
  const ov = sq.ask ? `<div class="sqask" role="alertdialog" aria-label="Sequenz abbrechen?"><div class="exbox" style="max-width:420px"><p class="hd text-2xl font-semibold">Sequenz abbrechen?</p><p class="mt-2 text-sm">Soll die Einheit als teilweise erledigt gelten?</p><div class="mt-4 space-y-2"><button class="btn w-full" style="min-height:56px" onclick="sqAbort(true)">Ja, als teilweise erledigt speichern</button><button class="ghost w-full" style="min-height:56px" onclick="sqAbort(false)">Nein, ohne Speichern beenden</button><button class="ghost w-full" style="min-height:56px" onclick="sqAbortNo()">Weitermachen</button></div></div></div>`
    : sq.paused ? `<p class="mt-3 text-center text-lg font-semibold" style="color:var(--teal)">${sq.bg ? 'Unterbrochen. Tippe auf Weiter, um an derselben Stelle fortzusetzen.' : 'Pausiert. Tippe irgendwo, um weiterzumachen.'}</p>${sq.bg ? '<button class="btn mx-auto mt-2 block w-full text-xl" style="min-height:64px;max-width:420px" onclick="sqResume()">Weiter</button>' : ''}` : '';
  return wrap(body + ctl + ov, true);
}
