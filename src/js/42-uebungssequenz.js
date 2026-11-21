/* ---------- F11: Kraft- und Stabilitätsübungen als Sequenz mit Tonsignalen ----------
   Baut auf dem bestehenden Modell auf: MOB (Mobilität/Stabilität: [id, Name, Dosis-Text]) und strSession (Kraft:
   Zeilen mit „Sätze × Wdh.“ plus Rumpfübungen). Der Dosis-Text wird in Sätze, Sekunden oder Wiederholungen und
   „pro Seite“ zerlegt (sqDose). Die Bilder kommen aus exMedia (Video der Pilotübungen) bzw. EXP/exAnimSvg (Strichfiguren).
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
/* Hinweis- und Schließen-Symbol als SVG statt der Textzeichen ⚠ und ✕ (SVG statt Emoji, gleich in hell und dunkel) */
function icWarn(){ return ic('warn', 16, 'margin:-3px 4px 0 0'); }
function icX(){ return ic('close', 18); }
function ic(n, s = 22, st = ''){ return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:middle;flex:none${st ? ';' + st : ''}">${IC_P[n] || ''}</svg>`; }
const SQ_DEF = {snd:true, voice:true, hints:true, vol:'m', vib:true, tr:10, hideMute:false, hideNoVoice:false, vs:'nat'};
function sqCfg(){ const c = S.sqCfg && typeof S.sqCfg === 'object' ? S.sqCfg : {}; const o = {...SQ_DEF, ...c};
  /* F13: Ansage ist jetzt Standard. Wer sie nicht selbst umgestellt hat (voiceSet), bekommt einmalig „an“. */
  if (!c.voiceSet) o.voice = true;
  if (![5, 10, 15, 20].includes(+o.tr)) o.tr = 10; o.tr = +o.tr; if (!['l', 'm', 'h'].includes(o.vol)) o.vol = 'm'; if (!['nat', 'sys'].includes(o.vs)) o.vs = 'nat'; ['snd', 'voice', 'hints', 'vib', 'hideMute', 'hideNoVoice', 'voiceSet'].forEach(k => { o[k] = !!o[k]; }); return o; }
function sqSet(k, v){ S.sqCfg = {...sqCfg(), [k]:v, ...(k === 'voice' ? {voiceSet:true} : {})}; if (k === 'voice' && !v) sqHush(); save(); render(); }
/* ---- Dosis: „2 × 45 Sek. pro Seite“, „8 pro Seite“, „10 langsame Wiederholungen“, „3 × 8–10 Wdh.“, „3–4 × 6–8 Wdh. pro Bein, langsam ablassen (3 Sek.)“ ---- */
function sqDose(t, id){
  const s = String(t || '').trim(), o = {sets:1, sec:0, reps:'', side:/pro (Seite|Bein)/.test(s), hint:'', id:id || '', slow:/langsam ablassen/.test(s)};
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
/* Ablaufwerte je Übung (Fachregel Trainingswissenschaft, 21.11.2026), an einer Stelle:
   tp = Sekunden je Wiederholung, sw = Übergang beim Seitenwechsel in Sekunden (zählt nicht zur Übungszeit, aber zur
   Gesamtdauer), alt = wechselseitig (kein Seitenwechsel, Dauer = Wdh. × 2 × Tempo), nm = Bild auf Seite 2 nicht spiegeln
   (Logo im Video bzw. beidbeiniges Video), sd = Seitenansage („band“: Band rechts, dann Band links).
   Fehlt ein Wert: SQ_TP0 bzw. SQ_SW0. */
const SQ_EXR = {
  squat:{tp:4}, rdl:{tp:4}, thrust:{tp:4}, bss:{tp:4, sw:10}, stepup:{tp:4, sw:5}, bridge:{tp:4, sw:5}, slrdl:{tp:5, sw:5}, calf:{tp:4, sw:5, nm:1},
  deadbug:{tp:4, alt:1, nm:1}, birddog:{tp:6, alt:1, nm:1}, pallof:{tp:4, sw:5, nm:1, sd:'band'}, clam:{tp:3, sw:8}, sidep:{sw:8},
  catcow:{tp:6}, tspine:{tp:4, sw:8}, thread:{tp:5, sw:8}, openbook:{tp:6, sw:8, nm:1}, wgs:{tp:8, alt:1, nm:1}, lungetw:{tp:6, alt:1, nm:1},
  hip9090:{tp:5}, hipcar:{tp:5, sw:5}, anklecar:{tp:3, sw:5}, legswing:{tp:2, sw:5}, hamfloss:{tp:3, sw:5}, calfwall:{tp:3, sw:5}, addrock:{tp:5, sw:5},
  dislocate:{tp:4}, neck:{tp:6, alt:1}, chintuck:{tp:4}, revlunge:{tp:4, sw:5}, pushup:{tp:3}, gmorn:{tp:4}, doorpec:{sw:5}, seatfig4:{sw:5}, fig4:{sw:5}, hipflex:{sw:8}, ham:{sw:8}, couch:{sw:10}, pigeon:{sw:10}
};
const SQ_TP0 = 3, SQ_SW0 = 5, SQ_SLOW = 5, SQ_PREP = 5, SQ_CORE_SET = 60, SQ_CORE_IN = 30, SQ_SIDE_REST = 60, SQ_WARM = 10;
const sqR = id => SQ_EXR[id] || {};
/* Sekunden je Wiederholung („langsam ablassen (3 Sek.)“: 5 s) */
const sqTp = d => d.slow ? SQ_SLOW : sqR(d.id).tp || SQ_TP0;
/* Echter Seitenwechsel (pro Seite/Bein, nicht wechselseitig) und Übergangszeit dafür */
const sqTwo = d => !!d.side && !sqR(d.id).alt;
const sqSw = d => sqTwo(d) ? sqR(d.id).sw || SQ_SW0 : 0;
/* Arbeitszeit einer Seite in Sekunden (Spannen: Obergrenze; wechselseitig: beide Seiten in einem Durchgang) */
function sqPer(d){ if (d.sec) return d.sec; const n = +String(d.reps).split(/[–-]/).pop() || 10; return n * sqTp(d) * (d.side && !sqTwo(d) ? 2 : 1); }
/* Dauer eines Satzes in Sekunden: beide Seiten plus Übergang (ohne Vorbereitung) */
function sqEst(d){ return sqTwo(d) ? 2 * sqPer(d) + sqSw(d) : sqPer(d); }
/* Einheit des Tages i: mob (Mobilität/Stabilität) oder str (Kraft) */
function sqSession(kind, i){
  /* F23: frei gestartete Routine (Mehr → Übungen) */
  if (kind === 'rt') { const s = rtSel; if (!s) return null;
    const it = s.ex.filter(([id]) => EXI[id] && EXP[id]).map(([id, n, r]) => ({id, n:n || EXI[id].t, d:sqDose(r, id), dt:r}));
    const N = it.length && it.every(x => x.d.sets === it[0].d.sets) ? it[0].d.sets : 1;
    return {kind, i:-1, key:'rt|' + s.rt + '|' + iso(0), n:'Routine: ' + s.n, items:it, rounds:N, rr:60, setRest:0, circ:N > 1}; }
  if (kind === 'mob') { const s = mobMap[i]; return s ? {...sqSesMob(s), kind, i, key:mobKey(i)} : null; }
  const s = strMap[i]; return s ? {...sqSesStr(s), kind, i, key:strKey(i)} : null;
}
/* Sequenz aus einer Routine (Mobilität/Stabilität, ex) bzw. Krafteinheit (lines, core), unabhängig von mobMap/strMap */
function sqSesMob(s){
  const it = s.ex.filter(([id]) => EXI[id] && EXP[id]).map(([id, n, r]) => ({id, n:n || EXI[id].t, d:sqDose(r, id), dt:r}));
  const N = it.length && it.every(x => x.d.sets === it[0].d.sets) ? it[0].d.sets : 1;
  return {kind:'mob', n:s.n, items:it, rounds:N, rr:60, setRest:0, circ:N > 1}; }
function sqSesStr(s){
  const it = s.lines.filter(l => EXI[l.id] && EXP[l.id]).map(l => ({id:l.id, n:l.n || EXI[l.id].t, d:sqDose(l.r, l.id), dt:l.r}))
    .concat(s.core.filter(([, id]) => EXI[id] && EXP[id]).map(([n, id]) => { const dt = '2 × ' + (SQ_CORE[id] || '10 Wdh.'); return {id, n:n || EXI[id].t, d:sqDose(dt, id), dt, core:true}; }));
  return {kind:'str', n:s.n.replace('Krafttraining: ', 'Kraft: '), items:it, rounds:1, rr:60, setRest:SQ_SETREST[s.kind] || 120, circ:false}; }
/* Angezeigte Minuten einer Routine bzw. Krafteinheit: Dauer der Sequenz (sqTotal, mit den Einstellungen der Sequenz),
   bei Kraft plus 10 Min. Aufwärmen, auf volle 5 Min. gerundet. fb: bisheriger fester Wert, falls die Berechnung scheitert. */
const sqMinC = new Map();
function sqMin(s, fb){ try { const str = !!s.lines, c = sqCfg(), k = JSON.stringify([str, str ? [s.kind, s.lines, s.core] : s.ex, c.tr, c.voice, c.hints, lang()]);
    if (!sqMinC.has(k)) { const t = sqTotal(str ? sqSesStr(s) : sqSesMob(s), c).s / 60 + (str ? SQ_WARM : 0); sqMinC.set(k, Math.max(5, Math.round(t / 5) * 5)); }
    return sqMinC.get(k); } catch (e) { elog(e); return fb || 0; } }
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
/* Zusätzliche Ausführungshinweise je Übung (Fachregel 21.11.2026), [Deutsch, Englisch]; ergänzen den Merksatz aus SQ_SAY.
   Nur Technik, Atmung, Sicherheit. Gesprochen während der Übung nach sqTipPlan, nie im Übergang. */
const SQ_TIPS = {
  catcow:[['Bewegung beginnt im Becken.', 'Start the movement from your pelvis.'], ['Beim Runden ausatmen.', 'Breathe out as you round.'], ['Arme bleiben gestreckt.', 'Keep your arms straight.']],
  tspine:[['Beim Aufdrehen einatmen.', 'Breathe in as you rotate up.'], ['Hüfte bleibt über den Knien.', 'Hips stay over your knees.'], ['Stützarm lang, Schulter weg vom Ohr.', 'Support arm long, shoulder away from ear.']],
  hipflex:[['Ruhig weiteratmen, nicht pressen.', "Keep breathing, don't strain."], ['Vorderes Knie über dem Fuß.', 'Front knee over your foot.'], ['Dehnung vorn in der Hüfte spüren.', 'Feel it at the front of your hip.']],
  ham:[['Knie bleibt gestreckt.', 'Keep the knee straight.'], ['Nur bis zur angenehmen Dehnung.', 'Only to a comfortable stretch.'], ['Schultern und Nacken locker.', 'Shoulders and neck relaxed.']],
  fig4:[['Oberes Knie sanft nach außen.', 'Gently open the top knee.'], ['Fuß des oberen Beins angezogen.', 'Flex the foot of the top leg.'], ['Ausatmen und sinken lassen.', 'Breathe out and let it sink.']],
  birddog:[['Becken bleibt waagerecht.', 'Keep your pelvis level.'], ['Lang machen statt hoch heben.', 'Reach long, not high.'], ['Beim Halten weiteratmen.', 'Keep breathing while you hold.']],
  deadbug:[['Beim Strecken lang ausatmen.', 'Breathe out long as you extend.'], ['Langsam, ohne Schwung.', 'Slowly, no momentum.'], ['Nur so weit, wie der Rücken liegt.', 'Only as far as your back stays down.']],
  sidep:[['Ellbogen unter der Schulter.', 'Elbow under your shoulder.'], ['Kopf in Linie mit der Wirbelsäule.', 'Head in line with your spine.'], ['Boden wegdrücken.', 'Push the floor away.']],
  clam:[['Füße bleiben zusammen.', 'Keep your feet together.'], ['Bewegung aus dem Gesäß.', 'Move from your glute.'], ['Oberkörper bleibt ruhig.', 'Keep your upper body still.']],
  bridge:[['Über die Ferse drücken.', 'Push through your heel.'], ['Oben kurz halten.', 'Pause at the top.'], ['Beim Hochdrücken ausatmen.', 'Breathe out as you lift.']],
  squat:[['Ganzer Fuß bleibt am Boden.', 'Whole foot stays on the floor.'], ['Rücken neutral, Bauch fest.', 'Neutral back, brace your core.'], ['Beim Aufrichten ausatmen.', 'Breathe out on the way up.']],
  rdl:[['Knie bleiben leicht gebeugt.', 'Knees stay slightly bent.'], ['Nacken lang, Blick zum Boden.', 'Long neck, eyes down.'], ['Hüfte nach vorn, Gesäß fest.', 'Drive hips forward, squeeze glutes.']],
  bss:[['Gewicht auf dem vorderen Fuß.', 'Weight on your front foot.'], ['Vorderes Knie zeigt zu den Zehen.', 'Front knee tracks over your toes.'], ['Kontrolliert absenken.', 'Lower under control.']],
  thrust:[['Über die Fersen drücken.', 'Drive through your heels.'], ['Oben kein Hohlkreuz.', 'No arched back at the top.'], ['Kontrolliert absenken.', 'Lower under control.']],
  calf:[['Über den großen Zeh hochdrücken.', 'Push up through your big toe.'], ['Knie gestreckt, nicht durchgedrückt.', 'Knee straight, not locked.'], ['Ganz hoch, ganz tief.', 'All the way up, all the way down.']],
  slrdl:[['Standknie leicht gebeugt.', 'Standing knee slightly bent.'], ['Hüfte nach hinten schieben.', 'Push your hips back.'], ['Bei Bedarf leicht abstützen.', 'Hold on lightly if needed.']],
  stepup:[['Hinteres Bein hilft kaum.', 'Back leg barely helps.'], ['Oben aufrecht, Gesäß fest.', 'Stand tall, glute tight.'], ['Drei Sekunden absenken.', 'Lower for three seconds.']],
  pallof:[['Hände vor der Brustmitte.', 'Hands in front of your chest.'], ['Beim Vordrücken ausatmen.', 'Breathe out as you press.'], ['Becken zeigt nach vorn.', 'Hips face forward.']],
  plank:[['Ellbogen unter den Schultern.', 'Elbows under your shoulders.'], ['Gesäß leicht anspannen.', 'Squeeze your glutes gently.'], ['Nacken lang, ruhig atmen.', 'Long neck, breathe calmly.']],
  legswing:[['Klein anfangen, langsam größer.', 'Start small, swing gradually bigger.'], ['Locker schwingen, nicht reißen.', "Swing loosely, don't force it."]],
  hipcar:[['Etwa fünf Sekunden pro Kreis.', 'About five seconds per circle.'], ['Rücken ruhig wie ein Tisch.', 'Back still like a table.'], ['Kleiner, wenn das Becken kippt.', 'Go smaller if your hips tilt.']],
  lungetw:[['Drehung aus dem Brustkorb.', 'Rotate from your upper back.'], ['Ruhig atmen beim Drehen.', 'Breathe calmly as you rotate.']],
  anklecar:[['Unterschenkel bleibt ruhig.', 'Keep your shin still.'], ['Bei Bedarf festhalten.', 'Hold on if you need to.']],
  wgs:[['Vorderes Knie über dem Fuß.', 'Front knee over your foot.'], ['Brust öffnet sich zur Decke.', 'Open your chest to the ceiling.']],
  hip9090:[['Füße bleiben am Boden.', 'Feet stay on the floor.'], ['Hände hinten abstützen, wenn nötig.', 'Hands behind you if needed.'], ['Ruhig weiteratmen.', 'Keep breathing calmly.']],
  thread:[['Beim Aufdrehen einatmen.', 'Breathe in as you rotate up.'], ['Beim Durchfädeln ausatmen.', 'Breathe out as you thread through.'], ['Blick folgt der Hand.', 'Eyes follow your hand.']],
  hamfloss:[['Oberschenkel bleibt ruhig.', 'Keep your thigh still.'], ['Kopf bleibt am Boden.', 'Head stays down.'], ['Bei ausstrahlendem Schmerz aufhören.', 'Stop if pain radiates down your leg.']],
  doorpec:[['Bauch leicht fest, kein Hohlkreuz.', 'Brace lightly, no arched back.'], ['Kribbeln im Arm? Ellbogen tiefer.', 'Tingling in your arm? Lower the elbow.']],
  child:[['Stirn ablegen, Schultern lösen.', 'Rest your forehead, relax your shoulders.'], ['Mit jedem Ausatmen tiefer sinken.', 'Sink a little deeper each exhale.']],
  couch:[['Rippen unten lassen.', 'Keep your ribs down.'], ['Vorderes Knie über dem Fuß.', 'Front knee over your foot.'], ['Polster unter das Knie.', 'Pad under your knee.']],
  pigeon:[['Kein Schmerz im Knie.', 'No pain in the knee.'], ['Hinteres Bein lang ablegen.', 'Back leg long on the floor.'], ['Beim Ausatmen nach vorn sinken.', 'Sink forward as you breathe out.']],
  calfwall:[['Knie über die zweite Zehe.', 'Knee over your second toe.'], ['Kurz antippen, zurück.', 'Tap briefly, then back.']],
  sphinx:[['Becken bleibt am Boden.', 'Hips stay on the floor.'], ['Druck im Rücken? In der Sphinx bleiben.', 'Back pressure? Stay in sphinx.'], ['Nacken lang.', 'Long neck.']],
  openbook:[['Beim Öffnen ausatmen.', 'Breathe out as you open.'], ['Blick folgt der Hand.', 'Eyes follow your hand.'], ['Hand muss den Boden nicht berühren.', "Your hand needn't touch the floor."]],
  addrock:[['Fuß des gestreckten Beins flach.', "Keep the straight leg's foot flat."], ['Kurz halten, dann zurück.', 'Pause briefly, then return.'], ['Bauch leicht fest.', 'Core lightly braced.']],
  squathold:[['Knie über die Fußspitzen.', 'Knees out over your toes.'], ['Ellbogen schieben die Knie nach außen.', 'Elbows press your knees out.'], ['Nur so tief, wie schmerzfrei.', 'Only as deep as pain-free.']],
  dislocate:[['Rippen unten, kein Hohlkreuz.', 'Ribs down, no arched back.'], ['Griff weiter, wenn es klemmt.', "Widen your grip if it's tight."], ['Langsam, ohne Schwung.', 'Slowly, no momentum.']],
  neck:[['Schultern bleiben unten.', 'Keep your shoulders down.'], ['Keine Kreise nach hinten.', 'No circles backwards.'], ['Bei Schwindel sofort aufhören.', 'Stop at once if dizzy.']],
  seatfig4:[['Aus der Hüfte nach vorn neigen.', 'Hinge forward from your hips.'], ['Beide Sitzbeinhöcker auf dem Stuhl.', 'Both sit bones on the chair.']],
  wrist:[['Finger flach am Boden.', 'Keep your fingers flat.'], ['Dann Handrücken auf den Boden.', 'Then backs of hands down.'], ['Ruhig atmen.', 'Breathe calmly.']],
  revlunge:[['Oberkörper aufrecht, Bauch fest.', 'Torso upright, core braced.'], ['Hinteres Knie leise absetzen.', 'Lower the back knee softly.'], ['Über die vordere Ferse hochdrücken.', 'Push up through your front heel.']],
  pushup:[['Beim Hochdrücken ausatmen.', 'Breathe out as you push up.'], ['Ellbogen schräg nach hinten.', 'Elbows angled back.'], ['Nacken lang, Blick zum Boden.', 'Long neck, eyes down.']],
  gmorn:[['Knie bleiben leicht gebeugt.', 'Knees stay slightly bent.'], ['Nur bis zur Spannung hinten im Oberschenkel.', 'Only until you feel the back of your thighs.'], ['Beim Aufrichten ausatmen.', 'Breathe out as you stand up.']],
  chintuck:[['Kinn waagerecht, nicht nicken.', "Chin level, don't nod."], ['Zwei Sekunden halten.', 'Hold for two seconds.'], ['Schultern locker.', 'Shoulders relaxed.']]
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
  /* Jede Übung läuft auf Zeit: [Vorbereitung (erster Satz einer Kraftübung)] Seite 1 [Übergang, Seite 2] (sqSideAt).
     Wiederholungen: Wdh. × Tempo je Seite; „Fertig“ geht früher weiter. */
  const ex = (x, k, set, sets, rd) => { const d = x.d, two = sqTwo(d), per = sqPer(d) * 1000, sw = sqSw(d) * 1000, prep = se.kind === 'str' && !x.core && set === 1 ? SQ_PREP * 1000 : 0;
    return {t:'ex', id:x.id, n:x.n, d, dt:x.dt, no:k + 1, of:nEx, set, sets, rd, rds:se.rounds, core:!!x.core, reps:!d.sec, two, per, sw, prep, dur:prep + per * (two ? 2 : 1) + sw}; };
  const list = [];
  for (let r = 1; r <= se.rounds; r++) se.items.forEach((x, k) => { const sets = se.circ ? 1 : x.d.sets; for (let s = 1; s <= sets; s++) list.push(ex(x, k, s, sets, r)); });
  st.push({t:'pre', dur:5000});
  list.forEach((e, k) => { st.push(e); const nx = list[k + 1]; if (!nx) return;
    const rd = nx.rd !== e.rd, set = nx.id === e.id && nx.set > 1;
    /* Krafteinheit: Satzpause zwischen den Sätzen und nach dem letzten Satz auch vor der nächsten Kraftübung;
       Rumpf: 60 s zwischen den Sätzen, 30 s vor der ersten Rumpfübung, sonst die eingestellte Übergangszeit.
       Kraftübung pro Seite: die Arbeit des anderen Beins zählt als Pause, also max(60 s, Satzpause − eine Seite − Übergang), auf volle 5 s gerundet. */
    const sRest = e.two ? Math.max(SQ_SIDE_REST, Math.round((se.setRest * 1000 - e.per - e.sw) / 5000) * 5) * 1000 : se.setRest * 1000;
    const dur = rd ? se.rr * 1000 : !se.setRest ? tr : set ? (e.core ? SQ_CORE_SET * 1000 : sRest) : !nx.core ? se.setRest * 1000 : !e.core ? SQ_CORE_IN * 1000 : tr;
    st.push({t:rd ? 'rr' : 'tr', dur, set}); });
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
  /* Vorbereitung: die Startansage muss vor dem Startton fertig sein (0,5 s Abstand), sonst wird sie etwas länger als 5 s */
  if (cfg.voice) st.forEach(s => { if (s.t !== 'ex' || !s.prep) return; const need = Math.ceil((800 + sqTalk(sqRepSay(s)) + 500) / 1000) * 1000; if (need > s.prep) { s.dur += need - s.prep; s.prep = need; } });
  if (cfg.voice && cfg.hints) sqTipPlan(st);
  return st;
}
/* Abschnitt einer Übung zur Zeit el (ms seit Beginn) – einzige Quelle für Text, Ansage, Uhr und Bild:
   ph = prep (Vorbereitung), a (Seite 1), sw (Übergang), b (Seite 2) bzw. one (ohne Seitenwechsel); a/b = Beginn/Ende */
function sqSideAt(s, el){ const p = s.prep || 0, P = s.per || Math.max(0, (s.dur || 0) - p);
  if (el < p) return {ph:'prep', a:0, b:p};
  if (!s.two) return {ph:'one', a:p, b:s.dur};
  if (el < p + P) return {ph:'a', a:p, b:p + P};
  if (el < p + P + s.sw) return {ph:'sw', a:p + P, b:p + P + s.sw};
  return {ph:'b', a:p + P + s.sw, b:s.dur}; }
/* Hinweise reihum: Merksatz (SQ_SAY) und Zusatzhinweise (SQ_TIPS) einer Übung */
function sqTips(id){ const t = (SQ_TIPS[id] || []).map(x => [x[0], x[1]]); return (SQ_SAY[id] || (EXI[id] && EXI[id].say) || !t.length ? [sqCue(id)] : []).concat(t); }
/* Zeitplan der Zusatzhinweise (Fachregel 3): erster frühestens 10 s nach Ende der Startansage bzw. nach Beginn der Seite,
   dann alle 15–20 s; höchstens 3 je Übung und 2 je Seite; Abschnitte unter 20 s nur Startansage; frei bleiben die letzten
   10 s und 3 s um den Seitenwechsel (Töne: fits() in sqSched). Reihum über alle Sätze, nie zweimal hintereinander. */
function sqTipPlan(st){ const rot = {};
  st.forEach(s => { if (s.t !== 'ex') return; const L = sqTips(s.id); let i = rot[s.id] || 0; s.tips = [];
    const t0 = 800 + sqTalk(sqExSay(s, true).say);
    const segs = s.two ? [[s.prep, s.prep + s.per, s.prep + s.per - 3000, t0], [s.prep + s.per + s.sw, s.dur, s.dur - 10000, 0]] : [[s.prep, s.dur, s.dur - 10000, t0]];
    segs.forEach(([a, b, lim, t], j) => { if (b - a < 20000) return; let at = Math.max(a + (j ? 3000 : 0), t) + 10000, n = 0;
      while (s.tips.length < 3 && n < (s.two ? 2 : 3) && !(L.length < 2 && s.tips.length)) { const say = L[i % L.length], len = sqTalk(say); if (at + len > lim) break;
        s.tips.push({at, say}); n++; i++; at += Math.min(20000, Math.max(15000, len + 12000)); } });
    rot[s.id] = i; }); }
/* Text unter dem Namen je Abschnitt (sqSideAt), in der App-Sprache */
function sqSideTxt(s, ph){ const L = sqSideLbl(s), t = ph === 'prep' ? SQ_PREPT : ph === 'a' ? L.a : ph === 'b' ? L.b : ph === 'sw' ? SQ_SWT : s.d.side && !s.two ? SQ_ALTT : null; return t ? t[lang() === 'en' ? 1 : 0] : ''; }
/* Zeile unter der Wiederholungszahl: im Übergang die nächste Seite („als Nächstes: rechtes Bein“), sonst die Einheit */
function sqRlTxt(s, ph){ const en = lang() === 'en', L = sqSideLbl(s);
  if (ph === 'sw' && L.nx) return en ? 'next: ' + L.nx[1] : 'als Nächstes: ' + L.nx[0];
  return s.d.side ? (en ? 'repetitions per side' : 'Wiederholungen pro Seite') : (en ? 'repetitions' : 'Wiederholungen'); }
const sqMir = (s, ph) => !!s.two && !sqR(s.id).nm && (ph === 'sw' || ph === 'b');
/* „Fertig“ geht früher weiter: in der Vorbereitung und im Übergang zum Start, auf Seite 1 zum Seitenwechsel, sonst zur nächsten Phase */
function sqDoneTxt(s, ph){ const t = ph === 'prep' || ph === 'sw' ? ['Jetzt starten', 'Start now'] : ph === 'a' ? ['Fertig – Seite wechseln', 'Done – switch sides'] : ['Fertig – weiter', 'Done – next']; return t[lang() === 'en' ? 1 : 0]; }
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
  const d = s.d, r = String(d.reps || '').replace(/[–-]/, ' bis '), re = String(d.reps || '').replace(/[–-]/, ' to ');
  const set = s.sets > 1 ? [`, Satz ${s.set} von ${s.sets}`, `, set ${s.set} of ${s.sets}`] : ['', ''], side = sqSideLbl(s).say;
  /* In der Vorbereitung (erster Satz einer Kraftübung) nur Name und Seite: Satz und Wiederholungen kamen schon in der Pause */
  if (s.prep) return [`${sqNm(s.n)}${side[0]}.`, `${sqNm(sqEn(s.n))}${side[1]}.`];
  return [`Los. ${sqNm(s.n)}${set[0]}, ${r} Wiederholungen${side[0]}.`, `Go. ${sqNm(sqEn(s.n))}${set[1]}, ${re} repetitions${side[1]}.`];
}
/* Startansage einer Übung: Name (Zeit: mit erster Seite) bzw. Satz und Wiederholungen, mit Hinweis, wenn er nicht im Übergang kam */
function sqExSay(s, H){ const h = sqHint(s.id), nm = s.reps ? sqRepSay(s) : [sqNm(s.n) + sqSideLbl(s).say[0], sqNm(sqEn(s.n)) + sqSideLbl(s).say[1]], sep = s.reps ? ' ' : '. ';
  return H && s.hintGo ? {say:[nm[0] + sep + h[0], nm[1] + sep + h[1]], alt:nm} : {say:nm}; }
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
    const x0 = sqExSay(s, H), p = s.prep || 0, b0 = s.two ? p + s.per + s.sw : p;
    n(800, 'say', x0.say, x0.alt);
    if (p) n(p, 'go');
    /* Seitenwechsel: Ding und Ansage, 3-2-1 nur bei mindestens 8 s Übergang, Startton am Ende; kein Hinweis im Übergang */
    if (s.two) { const t1 = p + s.per, t2 = t1 + s.sw; n(t1, 'ding'); n(t1 + 700, 'say', sqSideLbl(s).sw); if (s.sw >= 8000) [3000, 2000, 1000].forEach(x => n(t2 - x, 'tick')); n(t2, 'go'); }
    else if (!s.reps && D - p >= 60000) n(p + (D - p) / 2, 'half');
    if (H && s.tips) s.tips.forEach(x => n(x.at, 'say', x.say));
    if (D - b0 >= 25000) n(D - 10000, 'say', SQ_10);
    [3000, 2000, 1000].forEach(x => { if (D - x > b0 + 1500) n(D - x, 'tick'); });
    /* Ende der letzten Übung: Melodie und „Geschafft“ kommen aus sqEnd */
    if (!last) n(D, 'pause');
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
/* Seiten je Übung: Ansage beim Start, Text auf Seite 1 und 2, Ansage beim Wechsel (Pallof Press: Band zuerst rechts) */
const SQ_SD = {
  std:{say:[', linke Seite', ', left side'], a:['Jetzt links', 'Now left'], b:['Jetzt rechts', 'Now right'], nx:['rechte Seite', 'right side'], sw:SQ_SIDE},
  leg:{say:[', linkes Bein', ', left leg'], a:['Linkes Bein', 'Left leg'], b:['Rechtes Bein', 'Right leg'], nx:['rechtes Bein', 'right leg'], sw:['Seitenwechsel, jetzt rechtes Bein', 'Switch sides, now right leg']},
  band:{say:[', Band rechts', ', band on your right'], a:['Band rechts', 'Band on your right'], b:['Band links', 'Band on your left'], nx:['Band links', 'band on your left'], sw:['Seitenwechsel, jetzt Band links', 'Switch sides, now band on your left']},
  alt:{say:[' pro Seite, im Wechsel', ' per side, alternating'], a:null, b:null, sw:null}, none:{say:['', ''], a:null, b:null, sw:null}
};
const SQ_PREPT = ['Position einnehmen', 'Get into position'], SQ_SWT = ['Seitenwechsel', 'Switch sides'], SQ_ALTT = ['Im Wechsel', 'Alternating'];
function sqSideLbl(s){ const d = s.d || {}; return SQ_SD[!d.side ? 'none' : !sqTwo(d) ? (s.reps || !d.sec ? 'alt' : 'none') : sqR(d.id).sd === 'band' ? 'band' : /pro Bein/.test(s.dt || '') ? 'leg' : 'std']; }
const sqTestSay = h => h ? ['Beispiel: Katze-Kuh. ' + SQ_SAY.catcow[0], 'Example: cat-cow. ' + SQ_SAY.catcow[1]] : ['Beispiel: Katze-Kuh.', 'Example: cat-cow.'];
const sqFixed = () => [SQ_SIDE, SQ_DONE, SQ_10, sqTestSay(true), sqTestSay(false)];
function sqSays(se, cfg){
  const st = sqSteps(se, cfg), o = [];
  st.forEach((s, k) => { if (s.t === 'end') return;
    if (s.t !== 'ex') { if (s.nx) { if (cfg.hints) o.push(sqNextSay(s, true)); o.push(sqNextSay(s, false), sqNextSay(s, false, s.t !== 'pre')); sqSched(s, false, cfg, true).forEach(x => { if (x.say) o.push(x.say); }); } return; }
    o.push([sqNm(s.n), sqNm(sqEn(s.n))], sqExSay(s, false).say); if (cfg.hints) o.push(sqExSay({...s, hintGo:true}, true).say);
    sqSched(s, false, cfg, true).forEach(x => { if (x.say) o.push(x.say); if (x.alt) o.push(x.alt); });
    if (s.two) o.push(sqSideLbl(s).sw);
    if (cfg.hints) sqTips(s.id).forEach(x => o.push(x)); });
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
  /* Systemstimme: englische Namen in eingedeutschter Schreibweise (VC_PRON) */
  try { if (!sqCanSpeak()) return; const en = lang() === 'en', u = new SpeechSynthesisUtterance(en ? say[1] : typeof vcPron === 'function' ? vcPron(say[0], true) : say[0]), v = sqVoice(en);
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
  const now = Date.now(), cfg = sqCfg(); sq = {...sq, view:'run', cfg, steps:sqSteps(sq.se, cfg), k:0, t0:now, paused:false, pAt:0, pTot:0, startAt:now, fired:{}, doneEx:{}, ask:false, bg:false};
  sqEnter(0, now, false); clearInterval(sqTm); sqTm = setInterval(sqTick, 100); render();
}
const sqLastEx = k => !sq.steps.slice(k + 1).some(s => s.t === 'ex');
function sqEnter(k, t0, manual){
  sq.k = k; sq.t0 = t0; sq.fired = {}; sq.ph = null; const s = sq.steps[k];
  if (s.t === 'end') return sqEnd(false);
  if (manual) sqHush();
  if (manual && s.t === 'ex') sqSig('go');
  sqLive(s);
}
function sqLive(s){ const en = lang() === 'en', d = s.dur ? sqDurSay(Math.round(s.dur / 1000)) : null;
  sq.live = (s.t === 'ex' ? (en ? `Exercise ${s.no} of ${s.of}: ${sqEn(s.n)}` : `Übung ${s.no} von ${s.of}: ${s.n}`) : s.t === 'pre' ? (en ? 'Get ready' : 'Gleich geht\'s los') : (en ? 'Rest' : 'Pause'))
    + (d ? (en ? `, ${d[1]} left` : `, noch ${d[0]}`) : ''); }
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
/* Uhr einer Phase: bei Übungen der laufende Abschnitt (Vorbereitung, Seite, Übergang), sonst die ganze Phase */
const sqSeg = (s, el) => s.t === 'ex' ? sqSideAt(s, el) : {ph:'', a:0, b:s.dur};
function sqDom(){
  const s = sq.steps[sq.k]; if (!s || !s.dur) return; const el = sqEl(), g = sqSeg(s, el), len = Math.max(1, g.b - g.a), rem = Math.max(0, g.b - el), sec = Math.ceil(rem / 1000);
  const n = document.getElementById('sqNum'); if (n && n.textContent !== String(sec)) n.textContent = sec;
  const r = document.getElementById('sqRing'); if (r) r.setAttribute('stroke-dashoffset', (289 * (1 - rem / len)).toFixed(1));
  /* Abschnittswechsel ohne neues Zeichnen (das Video läuft weiter): Seite, Spiegelung, Farbe der Uhr, Text des Knopfs */
  if (s.t === 'ex' && sq.ph !== g.ph) { sq.ph = g.ph;
    const sd = document.getElementById('sqSide'), t = sqSideTxt(s, g.ph); if (sd && sd.textContent !== t) sd.textContent = t;
    const f = document.getElementById('sqFig'); if (f) f.classList.toggle('sqmir', sqMir(s, g.ph));
    if (r) r.setAttribute('stroke', g.ph === 'sw' || g.ph === 'prep' ? 'var(--ice)' : 'var(--teal)');
    const b = document.getElementById('sqDoneB'); if (b) b.textContent = sqDoneTxt(s, g.ph);
    const rl = document.getElementById('sqRl'), rt = sqRlTxt(s, g.ph); if (rl && rl.textContent !== rt) rl.textContent = rt; }
}
function sqRepDone(){
  const s = sq && sq.steps[sq.k]; if (!s || s.t !== 'ex' || !s.reps || sq.paused || sq.ask) return;
  /* früher weiter: Vorbereitung und Übergang → Start, Seite 1 → Seitenwechsel (Ding und Ansage aus dem Zeitplan) */
  const g = sqSideAt(s, sqEl()); if (g.ph === 'prep' || g.ph === 'a' || g.ph === 'sw') { sqJump(s, g.b); return sqTick(); }
  sq.doneEx[sq.k] = 1;
  if (sqLastEx(sq.k)) return sqEnd(false);
  sqSig('pause'); sqEnter(sq.k + 1, Date.now(), false); render();
}
/* Innerhalb der Phase an die Stelle at springen; Signale davor gelten als erledigt (keine nachgeholten Töne) */
function sqJump(s, at){ sq.t0 = Date.now() - at; sqHush(); sqSched(s, sqLastEx(sq.k), sq.cfg).forEach((x, j) => { if (x.at < at) sq.fired[j] = 1; }); }
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
/* B: Bild in einem festen Rahmen (8:5 wie die Videos), damit Uhr und Knöpfe bei jedem Schritt an derselben Stelle stehen */
function sqFig(id, mir){
  const inner = exVidOk(id) ? (sqReduced() ? exStill(id) : exMedia(id))
    : sqReduced() ? `<svg viewBox="${exVB(id)}" role="img" aria-label="${esc(EXI[id].t)}"><line x1="4" y1="${EXG.GY}" x2="166" y2="${EXG.GY}" class="gr"/>${exTpl(id).A}</svg>` : exAnimSvg(id);
  return `<div class="sqfw"><div id="sqFig" class="exf sqfig${mir ? ' sqmir' : ''}">${inner}</div></div>`;
}
const sqDur = s => { const t = Math.round(s); return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} Min.` : `${t} Sek.`; };
/* Gesamtdauer: alle Phasen haben eine feste Zeit (Wiederholungen nach Tempo, Übergänge, Vorbereitung, Pausen) */
function sqTotal(se, cfg){ const st = sqSteps(se, cfg); let s = 0; st.forEach(x => { s += (x.dur || 0) / 1000; }); return {s, est:false, n:st.filter(x => x.t === 'ex').length}; }
function sqCfgUi(inline){
  const c = sqCfg(), tg = (k, l) => `<label class="flex items-center gap-3" style="min-height:44px"><input type="checkbox"${inline ? '' : ` id="sqT-${k}"`} style="width:22px;height:22px" ${c[k] ? 'checked' : ''} onchange="sqSet('${k}',this.checked)"><span class="text-sm">${l}</span></label>`;
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
  const wrap = (body, tap) => `<div class="sqov${tap ? ' sqr' : ''}" role="dialog" aria-modal="true" aria-label="Übungssequenz"${tap ? ' onclick="if(!event.target.closest(\'button\'))sqToggle()"' : ''}><div class="sqin">${body}</div><p class="sr-only" aria-live="polite" data-noi18n>${esc(sq.live || '')}</p></div>`;
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
      ${se.setRest ? `<p class="mt-2 text-xs" style="color:var(--mute)">Satzpause ${sqDur(se.setRest)}, auch vor der nächsten Kraftübung. Rumpf: ${SQ_CORE_SET} Sek. zwischen den Sätzen, ${SQ_CORE_IN} Sek. davor.</p>` : se.circ ? `<p class="mt-2 text-xs" style="color:var(--mute)">Zirkel: ${se.rounds} Runden, ${c.tr} Sek. zwischen den Übungen, ${se.rr} Sek. zwischen den Runden.</p>` : ''}
      <button class="btn mt-4 w-full text-xl font-semibold" style="min-height:64px" onclick="sqStart()" ${sq.wait ? 'aria-busy="true"' : ''}><span class="inline-flex items-center justify-center gap-2">${ic('play', 24)}<span>${sq.wait ? 'Ansagen werden geladen …' : 'Übung starten'}</span></span></button>`); }
  if (sq.view === 'end') return wrap(`<div class="flex flex-col items-center text-center" style="min-height:70vh;justify-content:center"><p style="color:var(--teal)">${ic(sq.part ? 'half' : 'check', 72)}</p><p class="sqh mt-3">${sq.part ? 'Teilweise geschafft' : 'Sequenz geschafft'}</p>
      <p class="mt-3 text-lg">${sqDur(sq.act / 1000)} · ${sq.nEx} von ${sq.nTot} Übungen</p><p class="mt-1 text-sm" style="color:var(--mute)">${sq.part ? 'Als teilweise erledigt gespeichert, auch im Logbuch.' : 'Als erledigt gespeichert, auch im Logbuch.'}</p>
      <button class="btn mt-6 w-full text-xl" style="min-height:64px;max-width:420px" onclick="sqClose()">Fertig</button></div>`);
  /* Ablauf */
  const s = sq.steps[sq.k]; if (!s) return '';
  const el = sqEl(), g = s.dur ? sqSeg(s, el) : {ph:'', a:0, b:0}, len = Math.max(1, g.b - g.a), rem = s.dur ? Math.max(0, g.b - el) : 0, sec = Math.ceil(rem / 1000);
  if (s.t === 'ex') sq.ph = g.ph;
  const ring = s.dur ? `<div class="sqring${s.t === 'ex' && s.reps ? ' sqring-s' : ''}" style="position:relative;margin:0 auto" aria-hidden="true"><svg viewBox="0 0 100 100" style="width:100%;transform:rotate(-90deg)"><circle cx="50" cy="50" r="46" fill="none" stroke="var(--line)" stroke-width="6"/><circle id="sqRing" cx="50" cy="50" r="46" fill="none" stroke="${s.t === 'ex' && g.ph !== 'sw' && g.ph !== 'prep' ? 'var(--teal)' : 'var(--ice)'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="${(289 * (1 - rem / len)).toFixed(1)}"/></svg><span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span id="sqNum" class="hd" style="font-weight:700;line-height:1">${sec}</span>${s.t === 'ex' && s.reps ? `<span class="squnit" data-noi18n>${lang() === 'en' ? 's' : 'Sek.'}</span>` : ''}</span></div>` : '';
  const ctl = `<div class="sqctl flex items-center justify-center gap-4"><button class="ghost sqcb" aria-label="Vorherige Übung" onclick="sqBack()">${ic('prev', 26)}</button><button class="btn sqpb" aria-label="${sq.paused ? 'Weiter' : 'Pause'}" onclick="sqToggle()">${ic(sq.paused ? 'play' : 'pause', 36)}</button><button class="ghost sqcb" aria-label="Nächste Übung" onclick="sqSkip()">${ic('next', 26)}</button></div>`;
  const top = `<div class="flex items-center gap-2"><p class="flex-1 text-sm font-semibold" style="color:var(--mute)">${s.t === 'ex' ? `Übung ${s.no} von ${s.of}${s.sets > 1 ? ` · Satz ${s.set} von ${s.sets}` : ''}${s.rds > 1 ? ` · Runde ${s.rd} von ${s.rds}` : ''}` : s.nx && s.nx.rds > 1 ? `Runde ${s.nx.rd} von ${s.nx.rds}` : ''}</p><button class="ghost !px-3" style="min-width:48px;min-height:48px" aria-label="Abbrechen" onclick="sqAbortAsk()">${ic('close', 22)}</button></div>`;
  /* B: feste Bereiche – Kopf (Titel und Zusatzzeile), Bild, Uhr bzw. Wiederholungen, Hinweis, Knöpfe */
  const head = (h, sub, n) => `<div class="sqhd"><p class="sqh${n > 28 ? ' sqh-lang' : ''}">${h}</p>${sub}</div>`;   /* lange Namen kleiner, damit sie in zwei Zeilen passen */
  const slot = x => `<div class="sqclk">${x}</div>`;
  /* Pausenhinweis steht im Hinweisbereich statt unter den Knöpfen, damit alles auf einen Bildschirm passt */
  const cap = x => sq.paused && !sq.ask ? `<p class="sqcap text-center font-semibold" style="color:var(--teal)">${sq.bg ? 'Unterbrochen. Tippe auf Weiter, um an derselben Stelle fortzusetzen.' : 'Pausiert. Tippe irgendwo, um weiterzumachen.'}</p>` : `<p class="sqcap text-center">${x}</p>`;
  let body;
  if (s.t === 'ex') {
    const side = sqSideTxt(s, g.ph), hasSide = s.d.side || s.prep;
    body = `${top}${head(esc(s.n), hasSide ? `<p id="sqSide" class="sqsub mt-1 text-center font-semibold" style="color:var(--teal)" data-noi18n>${esc(side)}</p>` : '', String(s.n).length)}${sqFig(s.id, sqMir(s, g.ph))}
      ${slot(s.reps ? `<div class="sqrep">${ring}<p class="sqrl text-center font-semibold" data-noi18n><span class="sqrepn">${esc(s.d.reps)}</span> <span id="sqRl">${esc(sqRlTxt(s, g.ph))}</span></p></div><button id="sqDoneB" class="btn sqdone mx-auto block w-full font-semibold" data-noi18n onclick="sqRepDone()">${esc(sqDoneTxt(s, g.ph))}</button>` : ring)}
      ${cap(`${(EXI[s.id].cap || []).length > 1 ? `<span>${esc(EXI[s.id].cap[0])}</span> → <span>${esc(EXI[s.id].cap[1])}</span>` : ''}${s.d.hint ? ` · <span>${esc(s.d.hint)}</span>` : ''}`)}`;
  } else if (s.t === 'pre') body = `${top}${head("Gleich geht's los", `<p class="sqnx mt-1 text-center"><span>Erste Übung:</span> <span>${esc(s.nx.n)}</span></p>`)}${sqFig(s.nx.id)}${slot(ring)}${cap('')}`;
  else body = `${top}${head(s.t === 'rr' ? 'Rundenpause' : s.set ? 'Satzpause' : 'Pause', `<p class="sqnx mt-1 text-center">als Nächstes: <b>${esc(s.nx.n)}</b>${s.nx.sets > 1 ? ` (Satz ${s.nx.set} von ${s.nx.sets})` : ''}</p>`)}${sqFig(s.nx.id)}${slot(ring)}${cap('')}`;
  const ov = sq.ask ? `<div class="sqask" role="alertdialog" aria-label="Sequenz abbrechen?"><div class="exbox" style="max-width:420px"><p class="hd text-2xl font-semibold">Sequenz abbrechen?</p><p class="mt-2 text-sm">Soll die Einheit als teilweise erledigt gelten?</p><div class="mt-4 space-y-2"><button class="btn w-full" style="min-height:56px" onclick="sqAbort(true)">Ja, als teilweise erledigt speichern</button><button class="ghost w-full" style="min-height:56px" onclick="sqAbort(false)">Nein, ohne Speichern beenden</button><button class="ghost w-full" style="min-height:56px" onclick="sqAbortNo()">Weitermachen</button></div></div></div>`
    : '';
  return wrap(body + ctl + ov, true);
}
