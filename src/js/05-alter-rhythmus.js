/* ---------- Audit 12.11.2026, M7: Alter, Wochenrhythmus und Abstand zwischen harten Einheiten ----------
   Geburtsdatum (freiwillig) → Alter. Ab 50 Jahren schlägt die App einen ruhigeren Rhythmus vor: 2 Wochen Belastung und
   1 Woche Entlastung (statt 3:1) und mehr Abstand zwischen harten Einheiten. Beides kann jede und jeder selbst wählen,
   unabhängig vom Alter. Die Studienlage zur langsameren Erholung im Alter ist nicht eindeutig (Borges et al. 2016;
   Fell & Williams 2008), darum ist es ein Vorschlag und keine feste Regel.
   Gespeichert im Plan: birthDate (JJJJ-MM-TT; ältere Entwürfe: birthYear), bei eigener Wahl rhythm ('3:1' | '2:1') und
   gap2 (true/false). Ohne eigene Wahl gilt der Vorschlag nach dem Alter am Planstart. So wechselt der Rhythmus nicht
   mitten im Plan, nur weil ein Geburtstag dazwischen liegt.
   Ändern: in der Planung direkt im Entwurf, im laufenden Plan unter Einstellungen → Training → Alter und Erholung. Dort
   wird ein Entwurf bearbeitet und erst mit „Speichern“ übernommen. Kommende Wochen richten sich sofort danach, für die
   laufende Woche macht die App einen Vorschlag, der erst nach Zustimmung umgesetzt wird (wie beim Zeitbudget). */
const AGE_M = 50;
const BD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/* Gültiges Geburtsdatum: echtes Datum, frühestens 1920, mindestens 10 Jahre vor heute */
function bdOk(v){
  const m = BD_RE.exec(String(v || '')); if (!m) return false;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12); if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return false;
  return +m[1] >= 1920 && String(v) <= iso(-3653);
}
/* Alter an einem Tag (JJJJ-MM-TT). Mit Geburtsjahr allein: Jahr minus Jahr. 0 = unbekannt */
function ageAt(p, ds){
  if (!p) return 0; const t = BD_RE.exec(String(ds || '')) ? String(ds) : iso(0), ty = +t.slice(0, 4);
  if (bdOk(p.birthDate)) { const b = p.birthDate; return ty - +b.slice(0, 4) - (t.slice(5) < b.slice(5) ? 1 : 0); }
  const y = Math.round(Number(p.birthYear)); return y >= 1920 && y <= ty - 10 ? ty - y : 0;
}
const ageOf = p => ageAt(p, iso(0));
/* Alter, nach dem sich der Vorschlag richtet: am Planstart (im Entwurf: am gewählten Starttag) */
const ageRef = p => ageAt(p, p && (p.startDate || p.start) || iso(0));
const hasBirth = p => !!p && (bdOk(p.birthDate) || ageAt(p, iso(0)) > 0);
const rhySug = p => ageRef(p) >= AGE_M ? '2:1' : '3:1';
const gapSug = p => ageRef(p) >= AGE_M;
/* Im Plan und im Entwurf: eigene Wahl, sonst der Vorschlag nach Alter */
const rhyOf = d => d && (d.rhythm === '2:1' || d.rhythm === '3:1') ? d.rhythm : rhySug(d);
const gapOf = d => d && (d.gap2 === true || d.gap2 === false) ? d.gap2 : gapSug(d);
const rhyOwn = d => !!d && ((d.rhythm === '2:1' || d.rhythm === '3:1') || d.gap2 === true || d.gap2 === false);
/* Länge eines Blocks in Wochen: 4 bei 3:1, 3 bei 2:1 */
const rhyN = p => p && rhyOf(p) === '2:1' ? 3 : 4;
/* Doppelspitze (p.tpShort, nur nach Zustimmung, siehe phases): Vor dem früheren von zwei A-Events binnen drei Wochen gibt es
   eine Woche Tapering. Fiele die Entlastungswoche des Rhythmus direkt davor, lägen wieder zwei leichte Wochen hintereinander.
   Dann tauscht sie mit der Woche davor: erst Entlastung, dann die letzte volle Woche, dann Tapering. */
function tpSwap(p){
  if (!p || !p.tpShort || p.goal !== 'event') return null;
  try { const A = seasonA(p); for (let k = 1; k < A.length - 1; k++) if (A[k + 1].w - A[k].w <= 3) { const L = A[k].w - 1; if (L % rhyN(p) === 0 && L - 1 > A[k - 1].w + 1) return {load:L, rec:L - 1}; } } catch (e) { elog(e); }
  return null;
}
const recWk = (p, w) => { const s = tpSwap(p); return s && w === s.load ? false : s && w === s.rec ? true : w % rhyN(p) === 0; };
const rampOf = (p, w) => { const s = tpSwap(p); return s && w === s.load ? 1 : s && w === s.rec ? .65 : (rhyN(p) === 3 ? [.94, 1, .65] : [.88, .94, 1, .65])[(w - 1) % rhyN(p)]; };
/* laufende Nummer der Belastungswoche (Entlastungswochen nicht mitgezählt) */
const loadWk = (p, w) => w - Math.floor(w / rhyN(p));

/* ---- Bearbeiten: in der Planung direkt im Entwurf S.d, im laufenden Plan in einem Entwurf agD ---- */
let agD = null, agMsg = '', agProp = null;
const agPl = () => !!(S.step && S.d);
const agFields = o => { const x = {}; ['birthDate', 'birthYear', 'rhythm', 'gap2'].forEach(k => { if (o && o[k] !== undefined) x[k] = o[k]; }); return x; };
function agTgt(){ if (agPl() || !S.p) return S.d; if (!agD) agD = {...agFields(S.p), startDate:S.p.startDate, start:S.p.start}; return agD; }
const agDone = () => { agMsg = ''; if (agPl() || !S.p) save(); render(); };
function setBirth(v){ const d = agTgt(); if (!d) return; if (bdOk(v)) { d.birthDate = String(v); delete d.birthYear; } else { delete d.birthDate; delete d.birthYear; if (v) agMsg = 'Bitte ein gültiges Geburtsdatum eingeben.'; } const m = agMsg; agDone(); agMsg = m; if (m) render(); }
/* Eingabe über drei Zahlenfelder (Tag, Monat, Jahr). Das Datumsrad von iOS meldet schon beim Öffnen und bei jedem Dreh eine Änderung;
   weil die App danach neu zeichnet, verschwand das Feld unter dem offenen Rad und die App reagierte nicht mehr. Übernommen wird erst,
   wenn alle drei Felder gefüllt sind; vorher wird nichts neu gezeichnet. */
function bdCommit(){
  const g = id => String((document.getElementById(id) || {}).value || '').trim(), D = g('bdD'), M = g('bdM'), Y = g('bdY');
  if (!D && !M && !Y) { const d = agTgt(); if (d && (d.birthDate || d.birthYear)) setBirth(''); return; }
  if (!D || !M || Y.length < 4) return;
  setBirth(/^\d{1,2}$/.test(D) && /^\d{1,2}$/.test(M) && /^\d{4}$/.test(Y) ? `${Y}-${M.padStart(2, '0')}-${D.padStart(2, '0')}` : 'x');
}
function setRhy(v){ const d = agTgt(); if (!d) return; d.rhythm = v === '2:1' ? '2:1' : '3:1'; agDone(); }
function setGap(v){ const d = agTgt(); if (!d) return; d.gap2 = !!v; agDone(); }
/* Eigene Wahl löschen: wieder dem Vorschlag nach Alter folgen */
function agAuto(){ const d = agTgt(); if (!d) return; delete d.rhythm; delete d.gap2; agDone(); }
function agCancel(){ agD = null; agMsg = ''; agProp = null; render(); }
const agSig = o => JSON.stringify([o.birthDate || '', o.birthYear || '', o.rhythm || '', o.gap2 == null ? '' : o.gap2]);
const agDirty = () => !!(agD && S.p && agSig(agD) !== agSig(S.p));
/* nächste Entlastungswoche ab der kommenden Woche (ohne Tapering) */
function agNextRec(p){
  try { const ph = phases(p), tot = ph[ph.length - 1].to; for (let w = (S.wk || 1) + 1; w <= tot; w++) { const P = ph.find(x => w >= x.from && w <= x.to); if (P && P.key !== 'taper' && (recWk(p, w) || P.rec)) return w; } } catch (e) { elog(e); }
  return 0;
}
function agSave(){
  const p = S.p, d = agD; if (!p || !d) return;
  const was = {rhy:rhyOf(p), gap:gapOf(p)};
  ['birthDate', 'birthYear', 'rhythm', 'gap2'].forEach(k => { if (d[k] === undefined) { delete p[k]; if (S.d) delete S.d[k]; } else { p[k] = d[k]; if (S.d) S.d[k] = d[k]; } });
  agD = null; agProp = null;
  const now = {rhy:rhyOf(p), gap:gapOf(p)}, ch = was.rhy !== now.rhy || was.gap !== now.gap;
  if (!ch) { agMsg = 'Gespeichert. Rhythmus und Abstand bleiben, wie sie sind.'; save(); return render(); }
  const nr = agNextRec(p);
  agMsg = `Gespeichert. Ab der nächsten Woche gilt: ${now.rhy === '2:1' ? 'jede dritte Woche Entlastung' : 'jede vierte Woche Entlastung'}, ${now.gap ? 'mehr Abstand zwischen harten Einheiten' : 'normaler Abstand zwischen harten Einheiten'}.${nr ? ` Nächste Entlastungswoche: Woche ${nr} (ab ${fmt(addD(p.start, (nr - 1) * 7))}).` : ''}`;
  note('Alter und Erholung', agMsg.replace(/^Gespeichert\. /, ''), -2);
  /* laufende Woche: Vorschlag statt direkter Änderung (vergangene, erledigte und angepasste Tage bleiben) */
  if (S.plan && hasStarted(p)) {
    const t = todayIdx(), nw = genWeek(p, S.wk), keep = (x, i) => i < t || x.adapted || x.varOf || x.moved || S.done[i] || (S.actual && S.actual[i]) || x.blocked;
    const P = S.plan.map((x, i) => keep(x, i) ? x : nw[i]), c = P.map((x, i) => paSig(x) !== paSig(S.plan[i]) ? i : -1).filter(i => i >= 0);
    if (c.length) { agProp = {w:S.wk, P, ch:c, base:S.plan.map(paSig), warns:paCheck(P, S.plan, {}).warns}; agMsg += ' Für diese Woche gibt es einen Vorschlag.'; }
  } else if (S.plan) S.plan = genWeek(p, S.wk);
  save(); render();
}
function agAccept(){
  const pr = agProp; if (!pr || pr.w !== S.wk || !S.plan || S.plan.map(paSig).join() !== pr.base.join()) { agProp = null; agMsg = 'Der Vorschlag ist nicht mehr aktuell, der Plan hat sich inzwischen geändert.'; return render(); }
  bkPre('Vor dem Anpassen an Alter und Erholung');
  S.plan = pr.P; agProp = null; agMsg = 'Diese Woche ist angepasst.';
  note('Alter und Erholung', `Die Woche wurde angepasst (${pr.ch.map(i => DAYS[i]).join(', ')}).`, -1); save(); render();
}
function agDecline(){ agProp = null; agMsg = 'Diese Woche bleibt, wie sie ist. Die Änderung gilt ab der nächsten Woche.'; render(); }
/* Untertitel in den Einstellungen (HTML: jeder Teil eigener Textknoten, damit er einzeln übersetzt wird; nur Zahlen und feste Texte) */
function agSub(){
  const p = S.p || S.d; if (!p) return '';
  const a = ageOf(p), r = rhyOf(p) === '2:1' ? 'Rhythmus 2:1' : 'Rhythmus 3:1';
  return [a ? `${a} Jahre` : 'Alter nicht eingetragen', r, gapOf(p) ? 'mehr Abstand' : ''].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join(' · ');
}
/* Eingabe: in der Planung (light = Schnellplanung) und in den Einstellungen (set) */
function ageUi(d, light, set){
  const a = ageOf(d), ar = ageRef(d), r = rhyOf(d), g = gapOf(d), old = ar >= AGE_M, own = rhyOwn(d), sR = rhySug(d), sG = gapSug(d), mx = iso(-3653);
  const hint = !hasBirth(d) ? '' : old
    ? (r === sR && g === sG ? `Für dein Alter${set ? ' am Planstart' : ''} vorgeschlagen${own ? '' : ' und eingestellt'}: jede dritte Woche Entlastung und mehr Abstand zwischen harten Einheiten.` : 'Für dein Alter schlägt die App vor: jede dritte Woche Entlastung und mehr Abstand zwischen harten Einheiten. Du hast etwas anderes gewählt, das ist in Ordnung.')
    : (own && (r !== sR || g !== sG) ? 'Du hast den Rhythmus selbst gewählt. Ohne eigene Wahl würde die App bei deinem Alter 3 Wochen Belastung und 1 Woche Entlastung mit normalem Abstand planen.' : '');
  const turn = set && hasBirth(d) && ar < AGE_M && a >= AGE_M && !own ? '<p class="mt-2 text-xs" style="color:var(--mute)">Du bist inzwischen 50 oder älter. Der Plan bleibt beim Rhythmus vom Planstart, damit sich nichts ungefragt ändert. Möchtest du den ruhigeren Rhythmus, wähle ihn oben aus.</p>' : '';
  return `<div><p class="mb-2 ${esc(light ? 'text-sm' : 'font-semibold')}" style="${esc(light ? 'color:var(--mute)' : '')}">Alter und Erholung (optional)</p>
    <div>${field('Geburtsdatum', `<span class="flex gap-2"><input id="bdD" type="text" inputmode="numeric" maxlength="2" autocomplete="bday-day" class="inp" style="min-height:44px;width:3.4rem;text-align:center" placeholder="TT" aria-label="Tag" value="${esc(bdOk(d.birthDate) ? +d.birthDate.slice(8) : '')}" onchange="bdCommit()"><input id="bdM" type="text" inputmode="numeric" maxlength="2" autocomplete="bday-month" class="inp" style="min-height:44px;width:3.4rem;text-align:center" placeholder="MM" aria-label="Monat" value="${esc(bdOk(d.birthDate) ? +d.birthDate.slice(5, 7) : '')}" onchange="bdCommit()"><input id="bdY" type="text" inputmode="numeric" maxlength="4" autocomplete="bday-year" class="inp" style="min-height:44px;width:4.6rem;text-align:center" placeholder="JJJJ" aria-label="Jahr" value="${esc(bdOk(d.birthDate) ? d.birthDate.slice(0, 4) : '')}" onchange="bdCommit()"></span>`)}${a ? `<p class="mt-2 text-sm">Alter: <b>${a} Jahre</b></p>` : ''}</div>
    ${!bdOk(d.birthDate) && d.birthYear ? `<p class="mt-1 text-xs" style="color:var(--mute)">Bisher ist nur das Geburtsjahr ${esc(d.birthYear)} gespeichert. Mit dem vollständigen Datum stimmt das Alter genau.</p>` : ''}
    <p class="mt-3 mb-2 text-sm" style="color:var(--mute)">Wochenrhythmus</p><div class="flex flex-wrap gap-2">${chip('3 Wochen Belastung, 1 Woche Entlastung', r === '3:1', "setRhy('3:1')")}${chip('2 Wochen Belastung, 1 Woche Entlastung', r === '2:1', "setRhy('2:1')")}</div>
    <p class="mt-3 mb-2 text-sm" style="color:var(--mute)">Abstand zwischen harten Einheiten</p><div class="flex flex-wrap gap-2">${chip('Normal', !g, 'setGap(false)')}${chip('Mehr Abstand', g, 'setGap(true)')}</div>
    ${own ? `<button class="mt-2 text-sm font-semibold" style="color:var(--teal);background:none;border:0;padding:0;min-height:44px" onclick="agAuto()">Vorschlag nach Alter verwenden</button>` : ''}
    ${hint ? `<p class="mt-3 p-2.5 text-sm" style="background:var(--tint);border:1px solid var(--line)">${hint}${!light && old && !(d.strN > 0) && !set ? ' Krafttraining ist ab 50 besonders wertvoll, weil es Muskelmasse und Kraft erhält. Du kannst es in der Planung dazunehmen.' : ''}</p>` : ''}${turn}
    ${agMsg && (agPl() || !S.p) ? `<p class="mt-2 text-sm" style="color:#c0392b">⚠ <span>${esc(agMsg)}</span></p>` : ''}
    <p class="mt-2 text-xs" style="color:var(--mute)">Mit den Jahren braucht der Körper nach harten Einheiten meist länger, um sich zu erholen. Mit mehr Abstand legt die App harte Einheiten möglichst so, dass zwei lockere Tage dazwischen liegen. Die Studienlage dazu ist nicht eindeutig, darum entscheidest du selbst. Die Intensität der Einheiten bleibt gleich. Die Angabe bleibt nur auf deinem Gerät.</p></div>`;
}
/* Einstellungen → Training → Alter und Erholung */
function agPage(){
  if (!S.p) return `<section class="panel p-4">${ageUi(S.d || {}, false, true)}</section>`;
  const d = agTgt(), ed = agDirty();
  const prop = agProp && agProp.w === S.wk ? `<div class="mt-3 p-3 text-sm" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><p><b>Vorschlag für diese Woche:</b></p><ul class="mt-1 space-y-1">${agProp.ch.map(i => `<li><span>${DAYS[i]}</span>: <span data-noi18n>${esc(S.plan[i].n || '')}</span> (<span>${S.plan[i].m ? mm(S.plan[i].m) : '–'}</span>) ${ic('chevR', 14)} <span data-noi18n>${esc(agProp.P[i].n || '')}</span> (<span>${agProp.P[i].m ? mm(agProp.P[i].m) : '–'}</span>)</li>`).join('')}</ul>${agProp.warns.map(w => `<p class="mt-1 flex gap-2">${ic('warn', 18, 'margin-top:2px;color:var(--teal)')}<span>${w}</span></p>`).join('')}<div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="agAccept()">Annehmen</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="agDecline()">Ablehnen</button></div></div>` : '';
  const rhy = rhyOf(d), nowR = rhyOf(S.p), nowG = gapOf(S.p), chg = ed && (rhy !== nowR || gapOf(d) !== nowG);
  return `<section class="panel p-4" id="fx-age">${ageUi(d, false, true)}
    ${ed ? `${chg ? `<p class="mt-3 p-2.5 text-sm" style="border:1px solid var(--line);border-left:3px solid var(--teal)">Nach dem Speichern ändert sich dein Plan ab der nächsten Woche: ${rhy === '2:1' ? 'jede dritte Woche Entlastung' : 'jede vierte Woche Entlastung'}, ${gapOf(d) ? 'mehr Abstand zwischen harten Einheiten' : 'normaler Abstand zwischen harten Einheiten'}. Entlastungswochen und Fitness-Checks verschieben sich entsprechend. Für die laufende Woche schlägt die App eine Anpassung vor.</p>` : '<p class="mt-3 text-sm" style="color:var(--mute)">Rhythmus und Abstand bleiben dabei gleich.</p>'}
      <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-4" style="min-height:44px" onclick="agSave()">Speichern</button><button class="ghost !w-auto !px-4" style="min-height:44px" onclick="agCancel()">Verwerfen</button></div>` : ''}
    ${!ed && agMsg ? `<p class="mt-2 text-sm" role="status">${esc(agMsg)}</p>` : ''}${prop}</section>`;
}
