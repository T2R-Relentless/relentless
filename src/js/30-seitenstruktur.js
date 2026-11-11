/* ---------- Anpassungen: übersichtlich statt endloser Kartenliste ----------
   Diese Woche: kompakte Zeilen, neueste zuerst, Begründung zum Aufklappen, nach Herkunft gekennzeichnet, Zusammenfassung oben.
   Frühere Wochen: beim Wochenwechsel archiviert (je Plan, die letzten 12 Wochen), je Woche eine aufklappbare Zeile. */
let lgAll = false;
const LG_CAT = {user:['Von dir', '#00a99d'], fb:['Nach Fahrtbewertung', '#c2410c'], ci:['Nach Check-in', '#7c4dcc'], auto:['Automatisch', '#4f6d9a']};
const lgCat = l => l.user ? 'user' : /^Bewertung/.test(l.title || '') ? 'fb' : /^Check-in/.test(l.title || '') ? 'ci' : 'auto';
const lgTitle = t => String(t || '').replace(/^(Bewertung|Check-in):\s*/, '');
function lgRow(l){
  const c = LG_CAT[lgCat(l)];
  return `<details class="lg-row"><summary><i style="background:${esc(c[1])}" aria-hidden="true"></i><span class="min-w-0 flex-1"><b>${esc(lgTitle(l.title))}</b><em>${c[0]}</em></span></summary><p>${l.text}</p></details>`;
}
function lgSum(list){
  const n = {}; list.forEach(l => { const k = lgCat(l); n[k] = (n[k] || 0) + 1; });
  return Object.entries(n).map(([k, v]) => `<span class="lg-chip"><i style="background:${esc(LG_CAT[k][1])}"></i>${v} ${LG_CAT[k][0].toLowerCase()}</span>`).join('');
}
function logCard(){
  const cur = S.log || [], arch = ((S.p && S.p.logH) || []).filter(h => h && h.items && h.items.length).slice().reverse();
  if (!cur.length && !arch.length) return '';
  const show = lgAll ? cur : cur.slice(0, 4), more = cur.length - show.length;
  const now = cur.length ? `<p class="mt-1 text-sm" style="color:var(--mute)">So hat die App deinen Plan diese Woche angepasst. Tippe auf eine Zeile für die Begründung.</p>
    <div class="lg-list mt-3">${show.map(lgRow).join('')}</div>${more > 0 ? `<button class="mt-2 text-sm font-semibold" style="color:var(--teal);background:none;border:0;padding:0" onclick="lgAll=true;render()">${more} weitere anzeigen</button>` : lgAll && cur.length > 4 ? `<button class="mt-2 text-sm font-semibold" style="color:var(--teal);background:none;border:0;padding:0" onclick="lgAll=false;render()">Weniger anzeigen</button>` : ''}`
    : '<p class="mt-1 text-sm" style="color:var(--mute)">Diese Woche gab es noch keine Anpassungen.</p>';
  const old = arch.length ? `<p class="mt-4 text-xs font-semibold uppercase" style="color:var(--mute);letter-spacing:.08em">Frühere Wochen</p><div class="lg-list mt-1.5">${arch.map(h => `<details class="lg-row lg-wk"><summary><span class="min-w-0 flex-1"><b>Woche ${h.w}</b><em>${h.items.length} ${h.items.length === 1 ? 'Anpassung' : 'Anpassungen'}</em></span></summary><ul>${h.items.map(l => `<li><i style="background:${esc(LG_CAT[lgCat(l)][1])}" aria-hidden="true"></i><span><b>${esc(lgTitle(l.title))}</b> <span style="color:var(--mute)">${LG_CAT[lgCat(l)][0]}</span><br>${l.text}</span></li>`).join('')}</ul></details>`).join('')}</div>` : '';
  const txt = (() => { const n = {}; cur.forEach(l => { const k = lgCat(l); n[k] = (n[k] || 0) + 1; }); return Object.entries(n).map(([k, v]) => v + ' ' + LG_CAT[k][0].toLowerCase()).join(' · '); })();
  return fold('log', 'Anpassungen' + (cur.length ? ' (' + cur.length + ')' : ''), now + old, false, cur.length ? 'Diese Woche: ' + txt : arch.length + (arch.length === 1 ? ' frühere Woche' : ' frühere Wochen'));
}
function lgArchive(){ try { if (S.p && S.log && S.log.length && S.wk) { S.p.logH = [...(S.p.logH || []).filter(h => h.w !== S.wk), {w:S.wk, items:S.log.slice(0, 20)}].slice(-12); } } catch (e) { elog(e); } }

/* ---------- Fortschritt: Übersicht mit Untermenüs ----------
   Oben „Diese Woche“ (Stand der Woche), darunter Menüzeilen mit dem wichtigsten Wert, je Thema eine eigene Seite:
   Entwicklung: Formkurve, Verlauf und Wochenumfang · Leistung: FTP und Leistung, Bestwerte · Plan: Anpassungen. */
const ST_ICO = {
  sform:'<path d="M3 17c3-6 5-9 8-9s4 5 7 5 3-3 3-3"/><path d="M3 21h18"/>',
  shist:'<path d="M3 18h18M5 18V9M10 18V5M15 18v-7M20 18v-4"/>',
  sperf:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  spb:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  slog:'<path d="M4 6h16M4 12h10M4 18h7"/><path d="M17 15l2 2 3-4"/>'
};
function stRow(k, t, sub){ return `<button class="mrow" onclick="goPg('${ja(k)}')"><span class="mi">${svgI(ST_ICO[k])}</span><span class="min-w-0 flex-1"><span class="block font-semibold">${t}</span><span class="block text-xs" style="color:var(--mute)">${sub}</span></span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`; }
function stSubs(){
  const p = S.p, o = {};
  try { const tot = phases(p).slice(-1)[0].to; o.shist = `Woche ${Math.min(S.wk || 1, tot)} von ${tot}, FTP-Verlauf, Wochenrückblicke`; } catch (e) { elog(e); o.shist = 'FTP-Verlauf und Wochenrückblicke'; }
  try { const m = (vzForm() || '').match(/Heute: Fitness (\d+), Form ([+−-]?\d+)/); o.sform = m ? `Fitness ${m[1]}, Form ${m[2]}` + (p.goal === 'event' ? ', Prognose für den Renntag' : '') : 'Fitness, Ermüdung und Form, sobald Fahrten da sind'; } catch (e) { elog(e); o.sform = 'Fitness, Ermüdung und Form'; }
  try { const fe = ftpCalc(perfRides(60)); o.sperf = `FTP ${p.ftp} W` + (fe && fe.v ? `, Schätzung aus Fahrten ${fe.v} W` : '') + ', Effizienz, Ermüdungsresistenz'; } catch (e) { elog(e); o.sperf = `FTP ${p.ftp} W, Effizienz, Ermüdungsresistenz`; }
  try { const pb = S.pb || {}, prev = vzPrev({id:null}), v = Math.max((pb.m20 && pb.m20.w) || 0, prev.m20 || 0), v5 = Math.max((pb.m5 && pb.m5.w) || 0, prev.m5 || 0); o.spb = v || v5 ? [v5 ? `5 Min.: ${v5} W` : '', v ? `20 Min.: ${v} W` : ''].filter(Boolean).join(' · ') : 'Noch keine Fahrten mit Leistungsdaten'; } catch (e) { elog(e); o.spb = 'Deine besten Leistungen'; }
  try { const n = (S.log || []).length, h = ((p.logH) || []).length; o.slog = n ? `Diese Woche ${n} ${n === 1 ? 'Anpassung' : 'Anpassungen'}` : h ? 'Diese Woche keine, Archiv der letzten Wochen' : 'Noch keine Anpassungen'; } catch (e) { elog(e); o.slog = 'Was die App am Plan geändert hat'; }
  return o;
}
function statePage(){
  const p = S.p, o = stSubs(), grp = (t, rows) => `<p class="eyebrow mb-2 mt-5">${t}</p><div class="mlist">${rows}</div>`;
  const now = hasStarted(p) ? stateCard() : '<section class="panel p-4"><p class="text-sm" style="color:var(--mute)">Der Plan hat noch nicht begonnen. Ab dem Start siehst du hier, wie deine Woche läuft.</p></section>';
  return hrHint() + now
    + grp('Entwicklung', stRow('sform', p.goal === 'event' ? 'Formkurve bis zum Event' : 'Formkurve', o.sform) + stRow('shist', 'Verlauf und Wochenumfang', o.shist))
    + grp('Leistung', stRow('sperf', 'FTP und Leistung', o.sperf) + stRow('spb', 'Bestwerte', o.spb))
    + grp('Rückblicke', stRow('rc', 'Woche, Monat, Jahr', rcSub()))
    + (hasStarted(p) ? grp('Plan', stRow('slog', 'Anpassungen', o.slog)) : '');
}
/* Die Seite hat schon eine Überschrift: die erste Überschrift der Karte entfällt */
const stNoHead = h => String(h || '').replace(/<h2 class="hd text-xl font-semibold">[^<]*<\/h2>|<p class="hd text-xl font-semibold">[^<]*<\/p>/, '');
const stEmpty = t => `<section class="panel p-4"><p class="text-sm" style="color:var(--mute)">${t}</p></section>`;
const ST_PAGES = {
  sform:() => stNoHead(vzForm()) || stEmpty('Die Formkurve erscheint, sobald mindestens drei Fahrten oder erledigte Einheiten da sind. Lade deine Fahrten hoch oder verbinde Garmin.'),
  shist:() => progCard(),
  sperf:() => ppPage() + wfProgCard(),
  spb:() => stNoHead(vzPbCard()).replace('<div class="flex items-center gap-2"><span style="color:#b7791f">' + VZ_TROPHY + '</span></div>', '') || stEmpty('Noch keine Fahrten mit Leistungsdaten. Sobald du Fahrten mit Wattmesser hochlädst, stehen hier deine besten Werte über 5 Sekunden bis 60 Minuten.'),
  slog:() => stNoHead(logCard()) || stEmpty('Noch keine Anpassungen. Wenn du Tage sperrst, dich beim Check-in müde meldest oder eine Fahrt schwach bewertet wird, passt die App den Plan an und erklärt es hier.')
};
const ST_T = {sform:'Formkurve', shist:'Verlauf und Umfang', sperf:'FTP und Leistung', spb:'Bestwerte', slog:'Anpassungen'};

/* ---------- Zwift: viele Einheiten auf einmal exportieren ----------
   Eine ZIP-Datei mit je einer .zwo-Datei pro Einheit, ab heute bis Planende (oder die nächsten 4 Wochen).
   Wahl: nur Intervall-Einheiten oder alle Radeinheiten. Dateinamen und Workout-Namen beginnen mit Woche und Tag, damit sie in Zwift sortiert stehen.
   Pendeltage (draußen) und Renntage fehlen. Spätere Wochen werden aus dem Plan erzeugt, wie er heute steht. */
let zxKind = 'iv', zxRange = 'all', zxMsg = null;
function zipMany(files){
  const le = (v, k) => Array.from({length:k}, (_, j) => (v >>> (8 * j)) & 255), parts = [], cds = []; let off = 0;
  files.forEach(({name, data}) => { const n = new TextEncoder().encode(name), c = crc32(data);
    const lh = [0x50,0x4B,3,4, ...le(20,2), ...le(0x800,2), ...le(0,2), ...le(0,2), ...le(0x21,2), ...le(c,4), ...le(data.length,4), ...le(data.length,4), ...le(n.length,2), ...le(0,2), ...n];
    cds.push([0x50,0x4B,1,2, ...le(20,2), ...le(20,2), ...le(0x800,2), ...le(0,2), ...le(0,2), ...le(0x21,2), ...le(c,4), ...le(data.length,4), ...le(data.length,4), ...le(n.length,2), ...le(0,2), ...le(0,2), ...le(0,2), ...le(0,2), ...le(0,4), ...le(off,4), ...n]);
    parts.push(new Uint8Array(lh), data); off += lh.length + data.length; });
  const cd = cds.flat(), end = [0x50,0x4B,5,6, 0,0,0,0, ...le(files.length,2), ...le(files.length,2), ...le(cd.length,4), ...le(off,4), 0,0];
  const total = off + cd.length + end.length, out = new Uint8Array(total); let p = 0;
  parts.forEach(a => { out.set(a, p); p += a.length; }); out.set(cd, p); p += cd.length; out.set(end, p); return out;
}
/* Alle Einheiten ab heute: diese Woche aus dem aktuellen (ggf. angepassten) Plan, spätere Wochen frisch erzeugt */
function zxItems(kind, range){
  const p = S.p; if (!p || !S.plan) return [];
  const tot = phases(p).slice(-1)[0].to, today = iso(0), end = endOf(p), last = range === '4w' ? Math.min(tot, S.wk + 3) : tot, out = [], sw = typeof strWeek !== 'undefined' ? strWeek : null;
  const ok = x => x && x.m > 0 && !x.parts && x.t !== 'rest' && x.t !== 'race' && (kind === 'all' || (x.iv && x.iv.reps));
  try {
    for (let w = Math.max(1, S.wk); w <= last; w++) {
      const pl = w === S.wk ? S.plan : genWeek(p, w), base = new Date(p.start + 'T12:00:00'); base.setDate(base.getDate() + (w - 1) * 7);
      pl.forEach((x, i) => { const d = new Date(base); d.setDate(d.getDate() + i); const day = lstr(d); if (day < today || day > end || !ok(x)) return; if (w === S.wk && S.done && S.done[i]) return; out.push({w, i, day, x}); });
    }
  } catch (e) { elog(e); }
  try { if (sw !== null) strWeek = sw; } catch (e) { elog(e); }
  return out;
}
async function zxExport(){
  const items = zxItems(zxKind, zxRange); if (!items.length) { zxMsg = {err:true, t:'Im gewählten Zeitraum gibt es keine passenden Einheiten.'}; return render(); }
  const slug = t => asc(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const files = items.map(({w, i, day, x}) => { const dd = day.slice(8, 10) + '.' + day.slice(5, 7) + '.', nm = `W${String(w).padStart(2, '0')} ${SD[i]} ${dd} ${asc(x.n).trim()}`;
    return {name:`relentless-w${String(w).padStart(2, '0')}-${i + 1}-${SD[i].toLowerCase()}-${slug(x.n)}.zwo`, data:new TextEncoder().encode(zwoXml(S.p, x, null, nm))}; });
  const file = `relentless-zwift-${zxKind === 'iv' ? 'intervalle' : 'alle'}-${iso(0)}.zip`;
  try { const f = await saveFile(file, zipMany(files)); zxMsg = {t:`${files.length} Workouts gespeichert (${f}).`}; S.zxExp = {at:Date.now(), kind:zxKind, range:zxRange, last:items[items.length - 1].day, m:zxMap(items)}; save(); try { track('zwift-alle-' + zxKind); } catch (e) { elog(e); } }
  catch (e) { zxMsg = e && e.code === 'declined' ? null : {err:true, t:'Speichern nicht möglich.'}; }
  render();
}
function zxCard(){
  if (!S.p) return '';
  const items = zxItems(zxKind, zxRange), wk = new Set(items.map(q => q.w)).size, mins = items.reduce((s, q) => s + q.x.m, 0);
  return `<section class="panel p-4"><h2 class="hd text-xl font-semibold">Zwift: alle Einheiten auf einmal</h2><p class="mt-1 text-sm" style="color:var(--mute)">Statt jede Einheit einzeln zu exportieren: eine ZIP-Datei mit allen Workouts. In Zwift stehen sie nach Woche und Tag sortiert, z. B. „W05 Di 12.11. Sweet Spot 3x12“.</p>
    <p class="mt-3 text-sm font-semibold">Welche Einheiten?</p><div class="mt-1.5 flex flex-wrap gap-2">${chip('Nur Intervall-Einheiten', zxKind === 'iv', "zxKind='iv';zxMsg=null;render()")}${chip('Alle Radeinheiten', zxKind === 'all', "zxKind='all';zxMsg=null;render()")}</div>
    <p class="mt-3 text-sm font-semibold">Zeitraum</p><div class="mt-1.5 flex flex-wrap gap-2">${chip('Ganzer Plan ab heute', zxRange === 'all', "zxRange='all';zxMsg=null;render()")}${chip('Nächste 4 Wochen', zxRange === '4w', "zxRange='4w';zxMsg=null;render()")}</div>
    <p class="mt-3 text-sm">${items.length ? `<b>${items.length} Workouts</b> aus ${wk} ${wk === 1 ? 'Woche' : 'Wochen'}, zusammen ${hStd(mins / 60)} Std.` : 'Keine passenden Einheiten im Zeitraum.'}</p>
    ${zxCardNote()}<button class="btn mt-3" ${items.length ? '' : 'disabled'} onclick="zxExport()">Zwift-Workouts herunterladen (.zip)</button>${S.zxExp && !zxDiff() ? `<p class="mt-2 text-xs" style="color:var(--mute)">Zuletzt exportiert am ${fmt(lstr(new Date(S.zxExp.at)))}. Seitdem hat sich am Plan nichts geändert.</p>` : ''}
    ${zxMsg ? `<p class="mt-2 text-sm" style="color:${esc(zxMsg.err ? '#c0392b' : 'var(--ok)')}">${zxMsg.err ? '⚠' : '✓'} ${esc(zxMsg.t)}</p>` : ''}
    <details class="mt-3 text-sm"><summary class="cursor-pointer" style="color:var(--teal)">So kommen die Workouts in Zwift</summary><ol class="mt-2 list-decimal space-y-1 pl-5" style="color:var(--mute)">
      <li>ZIP-Datei am Computer entpacken.</li>
      <li>Alle .zwo-Dateien in den Ordner <b>Dokumente/Zwift/Workouts/</b> und dort in den Unterordner mit deiner Zwift-Nummer kopieren (gibt es nur einen Unterordner, ist es dieser).</li>
      <li>Zwift neu starten. Die Workouts stehen unter Training → Eigene Workouts (Custom Workouts).</li></ol>
      <p class="mt-2" style="color:var(--mute)">Die Leistung steht in Prozent deines FTP, die Workouts passen sich also an deinen Zwift-FTP an. Der Plan kann sich noch ändern, etwa nach einem Fitness-Check, nach Check-ins oder wenn du Tage sperrst. Exportiere dann neu und ersetze die alten Dateien. Pendel- und Renntage fehlen, die fährst du draußen.</p></details></section>`;
}

/* ---------- Hinweis, wenn sich der Plan seit dem Zwift-Export geändert hat ----------
   Beim Export merkt sich die App je Tag eine Kurzform der Einheit (Typ, Dauer, Intervalle, Bereich). Weicht der heutige Plan
   für einen noch kommenden Tag davon ab (geändert, neu, entfallen), erscheint auf der Startseite und im Export ein Hinweis. */
const zxSig = x => JSON.stringify([x.t, x.m, x.lo, x.hi, x.iv ? [x.iv.reps, x.iv.sets || 1, x.iv.work, x.iv.rest, x.iv.lo, x.iv.hi, x.iv.rlo || 0] : 0]);
const zxMap = items => Object.fromEntries(items.map(q => [q.day, [asc(q.x.n).trim(), zxSig(q.x)]]));
let zxMemo = {k:null, v:null};
function zxDiff(){
  const ex = S.zxExp; if (!ex || !S.p || !S.plan) return null;
  const k = JSON.stringify([ex.at, S.wk, S.plan, S.p.ftp, S.p.recW, S.p.subs, S.p.hours, S.p.tb && S.p.tb.on ? S.p.tb : 0, S.p.avail, S.p.start, S.p.lev, S.p.res, iso(0)]);
  if (zxMemo.k === k) return zxMemo.v;
  const today = iso(0), now = zxMap(zxItems(ex.kind, 'all').filter(q => q.day <= ex.last)), ch = [];
  Object.entries(ex.m).forEach(([d, v]) => { if (d < today) return; const n = now[d]; if (!n) ch.push({d, t:'entfällt', n:v[0]}); else if (n[1] !== v[1]) ch.push({d, t:'geändert', n:n[0]}); });
  Object.entries(now).forEach(([d, v]) => { if (d >= today && !ex.m[d]) ch.push({d, t:'neu', n:v[0]}); });
  ch.sort((a, b) => a.d.localeCompare(b.d)); const r = ch.length ? {ch, sig:JSON.stringify(ch)} : null; zxMemo = {k, v:r}; return r;
}
function zxAgain(){ const ex = S.zxExp || {}; zxKind = ex.kind || zxKind; zxRange = ex.range || zxRange; zxExport(); }
function zxLater(){ const d = zxDiff(); if (d) { S.zxAck = d.sig; save(); } render(); }
function zxNoteHtml(d, home){
  /* Entfällt und neu mit gleichem Namen zusammenfassen: verschoben */
  const rows = [], used = new Set(); d.ch.forEach((c, k) => { if (used.has(k)) return; if (c.t === 'entfällt') { const j = d.ch.findIndex((q, m) => !used.has(m) && m !== k && q.t === 'neu' && q.n === c.n); if (j >= 0) { used.add(j); rows.push(`${esc(c.n)} <span style="color:var(--mute)">(verschoben vom ${fmt(c.d)} auf ${fmt(d.ch[j].d)})</span>`); return; } } rows.push(`${fmt(c.d)}: ${esc(c.n)} <span style="color:var(--mute)">(${c.t})</span>`); });
  const list = rows.slice(0, 4).map(r => `<li>${r}</li>`).join('') + (rows.length > 4 ? `<li style="color:var(--mute)">und ${rows.length - 4} weitere</li>` : '');
  return `<div class="flex items-start gap-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;margin-top:2px"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg><div class="min-w-0 flex-1">
    <p class="font-semibold">Zwift-Workouts neu exportieren</p><p class="mt-1 text-sm" style="color:var(--mute)">Dein Plan hat sich seit dem Export am ${fmt(lstr(new Date(S.zxExp.at)))} geändert. In Zwift liegen noch die alten Workouts. Exportiere neu und ersetze die alten Dateien.</p>
    <ul class="mt-2 space-y-0.5 text-sm" style="list-style:disc;padding-left:1.1rem">${list}</ul>
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !py-2" onclick="${home ? "goPg('export')" : 'zxAgain()'}">${home ? 'Zum Export' : 'Jetzt neu exportieren'}</button>${home ? `<button class="ghost !py-2" onclick="zxLater()">Später</button>` : ''}</div></div></div>`;
}
function zxHomeNote(){ try { const d = zxDiff(); if (!d || S.zxAck === d.sig) return ''; return `<section class="panel p-4" style="border-left:4px solid #c2410c">${zxNoteHtml(d, true)}</section>`; } catch (e) { elog(e); return ''; } }
function zxCardNote(){ try { const d = zxDiff(); return d ? `<div class="mt-3 p-3" style="border:1px solid #f2b134;background:var(--tint)">${zxNoteHtml(d, false)}</div>` : ''; } catch (e) { elog(e); return ''; } }

/* ---------- FTP und Leistung: Übersicht mit Unterseiten ----------
   Oben dein FTP mit der Schätzung aus den Fahrten (und dem Knopf zum Übernehmen), darunter je Analyse eine Menüzeile mit dem
   wichtigsten Ergebnis. Die Details stehen auf eigenen Seiten; „‹ FTP und Leistung“ führt zurück. */
const PP_ICO = {
  pcp:'<path d="M3 20c2-9 5-14 9-14s5 4 9 4"/><path d="M3 20h18"/>',
  pef:'<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  pdu:'<path d="M3 17l5-5 4 3 9-9"/><path d="M15 6h6v6"/>',
  psw:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  pmor:'<path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M17 7l1.4-1.4"/><path d="M7 16a5 5 0 0 1 10 0"/><path d="M3 20h18"/>'
};
const PP_T = {pcp:'Leistungskurve und Schwelle', pef:'Aerobe Effizienz', pdu:'Ermüdungsresistenz', psw:'Belastung aus Empfinden', pmor:'Morgenwerte'};
const PG_PAR = {pcp:'sperf', pef:'sperf', pdu:'sperf', psw:'sperf', pmor:'sperf'};
let ppMemo = {k:null, v:null};
function ppParts(){
  const k = JSON.stringify([(S.man || []).length, (S.hist || []).length, Object.keys((S.p && S.p.exe) || {}).length, S.p && S.p.ftp, S.allOut, S.mo && Object.keys(S.mo).length, S.p && S.p.hrMax, S.p && S.p.lthr, iso(0)]);
  if (ppMemo.k !== k) ppMemo = {k, v:perfPage('parts')};
  return ppMemo.v;
}
const ppRow = (k, sub, conf) => `<button class="mrow" onclick="goPg('${ja(k)}')"><span class="mi">${svgI(PP_ICO[k])}</span><span class="min-w-0 flex-1"><span class="block font-semibold">${PP_T[k]}</span><span class="block text-xs" style="color:var(--mute)">${sub}</span>${conf ? `<span class="mt-1 block">${confPill(conf)}</span>` : ''}</span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`;
function ppPage(){
  const p = S.p, x = ppParts(), kg = x.kg, sgn = v => (v >= 0 ? '+' : '') + Math.round(v);
  const top = `<section class="panel p-4"><p class="eyebrow">Dein FTP</p><p class="mt-1"><span class="hd font-semibold" style="font-size:2.3rem;line-height:1.1">${p.ftp} W</span> <span class="text-sm" style="color:var(--mute)">${f1(p.ftp / kg)} W/kg</span></p>
    <p class="mt-1 text-sm" style="color:var(--mute)">Nach diesem Wert richten sich alle Wattbereiche im Plan. Am genauesten bestimmt ihn ein Fitness-Check, die Fahrten liefern eine Schätzung.</p>
    ${x.ftpSug || '<p class="mt-3 text-sm" style="color:var(--mute)">Noch keine Schätzung aus deinen Fahrten. Dafür braucht die App harte, gleichmäßige Abschnitte, z. B. Intervalle, Anstiege, Rennen oder einen Fitness-Check.</p>'}
    <div class="mt-3 flex flex-wrap gap-2"><button class="ghost !py-2 text-sm" onclick="goPg('ms')">Fitness-Checks</button></div>
    ${x.ao ? `<details class="mt-3 text-sm"><summary class="cursor-pointer" style="color:var(--teal)">Vollgas-Fahrten markieren</summary><div class="mt-2">${x.ao}</div></details>` : ''}</section>`;
  const cp = x.cp, ef = x.ef, du = x.du, sw = x.sw, mo = (() => { try { return Object.keys(S.mo || {}).length; } catch (e) { elog(e); return 0; } })();
  const rows = [
    ppRow('pcp', cp && cp.ok ? `Critical Power ${cp.cp} W · ${f1(cp.cp / kg)} W/kg · W′ ${f1(cp.wp)} kJ` : 'Braucht harte Anstrengungen über etwa 3, 7 und 12 Minuten', x.conf.cp),
    ppRow('pef', ef.n >= 4 ? `${sgn(ef.ch)} % Watt pro Herzschlag${ef.dec != null ? ` · Entkopplung ${f1(ef.dec)} %` : ''}` : `Braucht 4 lockere Fahrten ab 60 Min. mit Watt und Puls (bisher ${ef.n})`, x.conf.ef),
    ppRow('pdu', du.best ? `${Math.round(du.ratio * 100)} % der 5-Min.-Leistung nach ${du.kj} kJ` : 'Braucht eine lange Fahrt mit hartem Abschnitt am Ende', x.conf.du),
    ppRow('psw', sw.length >= 2 ? `${sw.length} Wochen mit Angaben zum Empfinden` : 'Braucht 2 Wochen mit bewerteten Einheiten und Empfinden', x.conf.sw),
    ppRow('pmor', mo ? `${mo} ${mo === 1 ? 'Eintrag' : 'Einträge'} · Ruhepuls und HRV` : 'Optional: Ruhepuls und HRV am Morgen', '')
  ].join('');
  return top + `<p class="eyebrow mb-2 mt-5">Analysen aus deinen Fahrten</p><div class="mlist">${rows}</div><p class="mt-2 text-xs" style="color:var(--mute)">Die Analysen nutzen alle hochgeladenen Fahrten der letzten Wochen. Den Plan ändert die App nur auf deinen Wunsch und nie wegen einer einzelnen Fahrt.</p>`;
}
const ppSec = (body, conf) => `<section class="panel p-4">${conf ? `<div class="mb-2">${confPill(conf)}</div>` : ''}${body}</section>`;
const PP_PAGES = {
  pcp:() => { const x = ppParts(); return ppSec(x.cpB, x.conf.cp); },
  pef:() => { const x = ppParts(); return ppSec(x.efB, x.conf.ef); },
  pdu:() => { const x = ppParts(); return ppSec(x.duB, x.conf.du); },
  psw:() => { const x = ppParts(); return ppSec(x.swB, x.conf.sw); },
  pmor:() => ppSec(morCard(false), '')
};

/* ---------- Klarere Struktur: Einstellungen, Export und Übungen mit Untermenüs, Fahrten-Seite entschlackt ----------
   Einstellungen und Export zeigen eine Übersicht mit je einer Zeile pro Thema (mit dem aktuellen Stand), die Inhalte stehen auf
   eigenen Unterseiten. Die Übungen lassen sich nach Gruppe filtern. „‹ …“ führt jeweils eine Ebene zurück. */
let SETTINGS_ALL = null;
const IA_ICO = {
  lang:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  ali:'<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  hr:'<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  sq:'<circle cx="12" cy="12" r="8"/><path d="M10 9l5 3-5 3z"/>',
  wf:'<path d="M5 20h14l-2-11H7L5 20z"/><circle cx="12" cy="6" r="2.5"/><path d="M12 14l2-2.5"/>',
  wx:'<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7z"/>',
  gm:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  priv:'<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  data:'<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  ics:'<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3v3H8z"/>',
  zwo:'<path d="M4 18h16M6 18l3-9 4 5 3-7 2 11"/>',
  fit:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 7h4M12 17h.01"/>'
};
const iaRow = (k, ic, t, sub, warn) => `<button class="mrow" onclick="goPg('${ja(k)}')"><span class="mi">${svgI(IA_ICO[ic])}</span><span class="min-w-0 flex-1"><span class="block font-semibold">${t}</span><span class="block text-xs" style="color:${esc(warn ? '#c2410c' : 'var(--mute)')}">${sub}</span></span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`;
const iaGrp = (t, rows) => `<p class="eyebrow mb-2 mt-5">${t}</p><div class="mlist">${rows}</div>`;
const iaNoHead = h => String(h || '').replace(/<h2 class="hd text-xl font-semibold">[^<]*<\/h2>(<p class="mt-0\.5 text-sm" style="color:var\(--mute\)">[^<]*<\/p>)?/, '');
/* Abschnitte der bisherigen Einstellungsseite (jede Karte hat die Kennung fx-…) */
function iaSetParts(){
  const html = typeof SETTINGS_ALL === 'function' ? SETTINGS_ALL() : '', out = {};
  html.split(/(?=<section class="panel" id="fx-)|(?=<details class="dzone")/).forEach(part => { const m = part.match(/^<section class="panel" id="fx-([a-z]+)"/); if (m) out[m[1]] = part; else if (/^<details class="dzone"/.test(part)) out.dz = part; });
  return out;
}
const SET_PAGES = {
  'set-lang':() => { const x = iaSetParts(); return iaNoHead(x.lang || '') + iaNoHead(x.theme || '') + elogUi(); },
  'set-ali':() => { const x = iaSetParts(); return iaNoHead(x.ali || '') + tbCard() + (x.shift || ''); },
  'set-hr':() => iaNoHead(iaSetParts().hr || ''),
  'set-wf':() => wfPage(),
  'set-sq':() => sqCfgUi(false) + '<p class="mt-3 text-sm" style="color:var(--mute)">Gilt für alle Übungseinheiten, die du als Sequenz ablaufen lässt.</p>',
  'set-wx':() => iaNoHead(iaSetParts().wx || ''),
  'set-gm':() => `<section class="panel p-4">${gmCard('man')}</section>`,
  'set-priv':() => iaNoHead(iaSetParts().priv || ''),
};
const SET_T = {'set-lang':'Sprache, Darstellung, Hilfen', 'set-ali':'Alltag und Planstart', 'set-hr':'Herzfrequenz und Leistungsmesser', 'set-wf':'Gewicht und FTP', 'set-sq':'Übungsablauf und Töne', 'set-wx':'Wetter und Kleidung', 'set-gm':'Garmin Connect', 'set-priv':'Datenschutz'};
function setPage(){
  const p = S.p, x = iaSetParts(), th = !S.theme ? 'Design automatisch' : S.theme === 'dark' ? 'Dunkel' : 'Hell';
  const alltag = (() => { try { return `${p.avail.map((v, i) => v ? SD[i] : null).filter(Boolean).join(', ')}, ${hStd(p.hours)} Std. pro Woche${isComm(p) ? ', Pendeln' : ''}`; } catch (e) { elog(e); return 'Trainingstage, Zeit, Pendeln'; } })();
  const hr = (() => { const a = hrMaxOf(), l = lthrOf(), pw = p.noPwr ? 'Ohne Wattmesser' : p.pwMix ? 'Mal mit, mal ohne Wattmesser' : 'Mit Wattmesser'; return a || l ? [a ? `HFmax ${a}` : '', l ? `Schwellenpuls ${l}` : '', pw].filter(Boolean).join(' · ') : `Puls noch nicht eingetragen · ${pw}`; })();
  const wx = S.wx ? `${esc(S.wx.name || 'Ort gespeichert')}` : 'Aus, Kleidungstipp ohne Vorhersage';
  const gm = S.gm && S.gm.mode ? `Verbunden${S.gm.last ? ', zuletzt ' + fmt(lstr(new Date(S.gm.last))) : ''}` : 'Nicht verbunden';
  const n = Object.keys(readLib().plans).length;
  return iaGrp('Allgemein', iaRow('set-lang', 'lang', 'Sprache, Darstellung, Hilfen', `${lang() === 'en' ? 'English' : 'Deutsch'} · ${th}`) + iaRow('set-sq', 'sq', 'Übungsablauf und Töne', (() => { const c = sqCfg(); return [c.snd ? 'Töne an' : 'Töne aus', c.voice ? 'Ansage an' : '', `Übergang ${c.tr} Sek.`].filter(Boolean).join(' · '); })()))
    + iaGrp('Training', iaRow('set-ali', 'ali', 'Alltag und Planstart', tbSub() || alltag) + iaRow('set-wf', 'wf', 'Gewicht und FTP', esc(wfSub())) + iaRow('set-hr', 'hr', 'Herzfrequenz und Leistungsmesser', hr, !hrMaxOf() && !lthrOf()) + iaRow('set-wx', 'wx', 'Wetter und Kleidung', wx))
    + iaGrp('Verbindungen und Daten', iaRow('set-gm', 'gm', 'Garmin Connect', gm) + iaRow('plans', 'data', 'Pläne und Sicherung', `${n} ${n === 1 ? 'Plan' : 'Pläne'}${S.bkAt ? ', letzte Sicherung ' + fmt(lstr(new Date(S.bkAt))) : ', noch keine Sicherung'}`, !S.bkAt) + (x.priv ? iaRow('set-priv', 'priv', 'Datenschutz', (typeof trOff === 'function' && trOff()) ? 'Anonyme Statistik aus' : 'Anonyme Statistik an') : ''))
    + `<div class="mt-6">${x.dz || ''}</div>` + verLine();
}
/* ---------- Export ---------- */
const EXP_PAGES = {'exp-ics':() => iaNoHead(icsCard()), 'exp-zwo':() => iaNoHead(zxCard()), 'exp-fit':() => iaNoHead(garminHelp())};
const EXP_T = {'exp-ics':'Kalender', 'exp-zwo':'Zwift', 'exp-fit':'Garmin-Gerät'};
function expPage(){
  const n = (() => { try { return calItems(icsScope, true).length; } catch (e) { elog(e); return 0; } })(), d = typeof zxDiff === 'function' ? zxDiff() : null;
  return `<p class="text-sm" style="color:var(--mute)">Bring deine Einheiten in deinen Kalender, auf die Rolle oder auf deinen Radcomputer.</p>`
    + iaGrp('Ziel', iaRow('exp-ics', 'ics', 'Kalender', `Apple, Google, Outlook · ${n} Termine ab heute`)
      + iaRow('exp-zwo', 'zwo', 'Zwift', d ? 'Plan geändert: Workouts neu exportieren' : S.zxExp ? `Alle Einheiten als ZIP · zuletzt ${fmt(lstr(new Date(S.zxExp.at)))}` : 'Alle Einheiten auf einmal als ZIP', !!d)
      + iaRow('exp-fit', 'fit', 'Garmin-Gerät', 'Einzelne Einheit als Workout (.fit), so kommt sie aufs Gerät'))
    + `<p class="mt-3 text-xs" style="color:var(--mute)">Einzelne Einheiten exportierst du direkt bei der Einheit im Wochenplan: „Garmin (.fit)“ oder „Zwift (.zwo)“.</p>`;
}
/* ---------- Übungen: nach Gruppe filtern ---------- */
let exGrp = 0;
function exPage(){
  const tabs = EXGROUPS.map(([g], k) => chip(g, exGrp === k, `exGrp=${ja(k)};render()`)).join('');
  const lib = exLibrary(), parts = lib.split(/(?=<section class="panel p-4"><h2 class="hd text-xl font-semibold">)/).filter(Boolean);
  return `<p class="text-sm" style="color:var(--mute)">Alle Übungen aus Kraft-, Stabilitäts- und Mobilitätstraining. Tippe auf eine Übung für Erklärung und Grafik.</p><div class="mt-3 flex flex-wrap gap-2">${tabs}</div>${iaNoHead(parts[exGrp] || parts[0] || '')}`;
}
/* ---------- Fahrten bewerten: Garmin kompakt, Anpassungen nur noch unter Fortschritt ---------- */
function ridesGm(){
  if (S.gm && S.gm.mode) return `<section class="panel p-4"><p class="hd text-xl font-semibold">Garmin Connect</p>${gmCard('man')}</section>`;
  return `<div class="mlist">${iaRow('set-gm', 'gm', 'Garmin Connect verbinden', 'Fahrten automatisch holen statt Dateien hochladen')}</div>`;
}
const IA_PAR = {'set-lang':'settings', 'set-ali':'settings', 'set-hr':'settings', 'set-wx':'settings', 'set-wf':'settings', 'set-sq':'settings', 'set-gm':'settings', 'set-priv':'settings', 'exp-ics':'export', 'exp-zwo':'export', 'exp-fit':'export'};

/* ---------- Event: Übersicht mit Unterseiten ----------
   Oben das Ziel (Name, Datum, Zielzeit, Stand). Darunter je Thema eine Zeile mit dem Kern: Anforderungsprofil, Pacing-Plan,
   Ernährungsstrategie (auf ihrer Seite nach Vorbereitung, Renntag und Danach aufgeteilt) und Zwischenevents. */
const EV_ICO = {
  prof:'<path d="M2 20l6-9 4 5 3-4 7 8H2z"/>',
  pace:'<circle cx="12" cy="13" r="8"/><path d="M12 13l4-3M12 3v2"/>',
  fuel:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  subs:'<path d="M5 21V4h11l-2 4 2 4H5"/><path d="M19 9v6M16 12h6"/>',
  goal:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'
};
let evFT = null, evFTon = false;
const evPh = (when, title) => /^(Wochen davor|2 Tage vorher|Tag vorher|Vorabend)$/.test(String(when)) ? 0 : title === 'Danach' ? 2 : 1;
const evRow = (k, ic, t, sub, col) => `<button class="mrow" onclick="goPg('${ja(k)}')"><span class="mi">${svgI(EV_ICO[ic])}</span><span class="min-w-0 flex-1"><span class="block font-semibold">${t}</span><span class="block text-xs" style="color:${esc(col || 'var(--mute)')}">${sub}</span></span><span aria-hidden="true" style="color:var(--mute)">›</span></button>`;
function evPage(){
  const p = S.p, r = (() => { try { return evProfile(p); } catch (e) { elog(e); return null; } })(), L = (p.subs || []).filter(s => s.date >= iso(0) && s.date < p.eventDate);
  const prof = r ? `${EVTY[r.ty][0]}${p.dist ? ` · ${p.dist} km` : ''}${p.hm ? `, ${p.hm} hm` : ''}` : 'Strecke und Höhenmeter eintragen, dann zeigt die App, worauf es ankommt';
  const fuel = (() => { const n = efList(p).length; return n > 1 ? `Eigene Strategie für jedes deiner ${n} Events` : 'Vorbereitung, Renntag und danach, mit Mengen für dich'; })();
  const pace = p.lev && p.lev.pace ? (() => { try { const n = efList(p).length; if (n > 1) return `Eigene Krafteinteilung für jedes deiner ${n} Events`; const m = String(paceTxt(p, r)).match(/höchstens (\d+) %/); return m ? `Erste Stunde höchstens ${m[1]} % FTP, danach gleichmäßig` : 'Wie du dir die Kraft einteilst'; } catch (e) { elog(e); return 'Wie du dir die Kraft einteilst'; } })() : '';
  const ch = (() => { try { return chkHead(p); } catch (e) { elog(e); return ['Zielzeit und Strecke prüfen', '']; } })();
  return `<section class="panel p-5">${goalCard(false)}</section>${evCycNote(p)}`
    + `<p class="eyebrow mb-2 mt-5">Vorbereitung auf das Event</p><div class="mlist">`
    + evRow('check', 'goal', 'Plan-Check', (p.targetTime ? 'Zielzeit: ' : '') + ch[0], ch[1])
    + evRow('ev-prof', 'prof', 'Anforderungsprofil', epSub(p) || prof)
    + (pace ? evRow('ev-pace', 'pace', 'Pacing-Plan', pace) : '')
    + evRow('ev-fuel', 'fuel', 'Ernährungsstrategie', fuel)
    + evRow('ev-subs', 'subs', 'Saison und Events', (() => { const si = seasonInfo(p); return L.length ? `${si.multi ? si.nA + ' Formhöhepunkte · ' : ''}${L.length} weitere${L.length === 1 ? 's Event' : ' Events'}, nächstes: <span data-noi18n>${esc(L[0].name)}</span> am ${fmt(L[0].date)}` : 'Noch keine weiteren Events'; })())
    + `</div>`;
}
function evFuelPage(){
  const sp = efFuelPage(); if (sp) return sp;
  const p = S.p, days = Math.ceil((new Date(p.eventDate + 'T12:00:00') - Date.now()) / 864e5);
  if (evFT === null) evFT = days > 3 ? 0 : days >= 0 ? 1 : 2;
  const tabs = ['Vorbereitung', 'Renntag', 'Danach'].map((t, k) => chip(t, evFT === k, `evFT=${ja(k)};render()`)).join('');
  let body = ''; evFTon = true; try { body = eventFuelPlan(p); } catch (e) { elog(e); } evFTon = false; if (evFT !== 1 && body.indexOf('<div class="evstep">') > 0) body = body.slice(body.indexOf('<div class="evstep">'));
  return `<section class="panel p-4"><div class="flex flex-wrap gap-2">${tabs}</div><div class="mt-3 text-sm">${body}</div></section>`;
}
const EV_PAGES = {
  'ev-goal':() => `<section class="panel p-5">${goalCard(true)}</section>`,
  'ev-prof':() => epPage(),
  'ev-pace':() => efPacePage() || `<section class="panel p-4"><p class="text-sm">${paceTxt(p0(), evProfile(p0()))}</p><p class="mt-2 text-xs" style="color:var(--mute)">Steht auch am Eventtag und bei den Eventsimulationen im Plan. Grundlage: haltbarer Anteil der FTP über die erwartete Fahrzeit (IF ≈ 1 − 0,10 · ln Std.).</p></section>`,
  'ev-fuel':() => evFuelPage(),
  'ev-subs':() => iaNoHead(subsCard(p0())) || `<section class="panel p-4"><p class="text-sm" style="color:var(--mute)">Noch keine weiteren Events. Trag alle Rennen deiner Saison ein, beliebig viele: als A-Event mit eigenem Formhöhepunkt oder als B- und C-Rennen auf dem Weg zum Hauptevent.</p><button class="ghost mt-3 !py-2 text-sm" onclick="editSubs()">Events hinzufügen</button></section>`
};
const p0 = () => S.p;
const EV_T = {'ev-goal':'Zielzeit-Check', 'ev-prof':'Anforderungsprofil', 'ev-pace':'Pacing-Plan', 'ev-fuel':'Ernährungsstrategie', 'ev-subs':'Saison und Events'};
Object.assign(IA_PAR, {'ev-goal':'event', 'ev-prof':'event', 'ev-pace':'event', 'ev-fuel':'event', 'ev-subs':'event'});

/* ---------- Zusatzfahrten: Fahrten ohne geplante Einheit erkennen, auswerten, rückmelden und den Plan anpassen ----------
   Eine Fahrt gilt als Zusatzfahrt, wenn an dem Tag keine Einheit geplant war oder die geplante Einheit schon bewertet ist.
   Die App ordnet die Intensität ein (Leistung, sonst Puls), setzt sie in Bezug zur Woche und zu den nächsten Tagen und
   schlägt bei Bedarf eine Anpassung vor (seit Backlog Punkt 6 nur noch nach Zustimmung, siehe pa.js): harte Zusatzfahrt vor einer harten Einheit → diese wird locker; deutlich mehr Wochenbelastung als
   geplant → die nächste lockere Einheit wird kürzer. Jede Anpassung lässt sich zurücknehmen. */
const XR_CLS = {rec:['locker (Erholung)', '#9aa7b8'], z2:['in der Grundlage (Zone 2)', '#00c2b2'], tempo:['zügig (Tempo, Zone 3)', '#4f9dde'], hard:['hart (Schwelle und darüber)', '#e0464e']};
const xrAll = () => Object.values((S.p && S.p.extra) || {}).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
function xrClass(e){
  const zp = e.zp, n = zp ? zp.reduce((q, v) => q + v, 0) : 0, hiS = zp ? zp.slice(4).reduce((q, v) => q + v, 0) : 0, thS = zp ? zp[3] : 0;
  if (e.ifv != null) { if (e.ifv >= .88 || hiS >= 300 || (thS + hiS) >= 900) return 'hard'; if (e.ifv >= .78 || thS >= 480) return 'tempo'; return e.ifv < .6 ? 'rec' : 'z2'; }
  const zh = e.zh; if (zh) { const t = zh.reduce((q, v) => q + v, 0) || 1, hi = (zh[3] + zh[4]) / t, mid = zh[2] / t; if (hi >= .15 || zh[3] + zh[4] >= 900) return 'hard'; if (mid + hi >= .3) return 'tempo'; return zh[0] / t > .7 ? 'rec' : 'z2'; }
  return 'z2';
}
function xrWeekTss(i){
  const plan = S.plan || [], po = plan.map((x, k) => pOrig(plan, k)), planned = po.reduce((q, x) => q + (x && x.m ? tss(x) : 0), 0);
  const days = [0, 1, 2, 3, 4, 5, 6].map(dstr), act = allActs().filter(a => days.includes(a.day)).reduce((q, a) => q + (a.tss || 0), 0);
  return {planned, act};
}
function xrNextEvent(day){
  const p = S.p, out = []; (p.subs || []).forEach(s => out.push({date:s.date, name:s.name, prio:s.prio || 'C'})); if (p.goal === 'event' && p.eventDate) out.push({date:p.eventDate, name:p.eventName || 'dein Event', prio:'A'});
  return out.filter(x => x.date > day).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
function exeExtra(a, st, hr){
  try {
    if (!S.p || !S.plan || S.step !== 0 || !a || !a.day || (S.p.start && a.day < S.p.start)) return null;
    S.p.extra = S.p.extra || {}; if (S.p.extra[a.id]) return null;
    const i = [0, 1, 2, 3, 4, 5, 6].find(k => dstr(k) === a.day), cur = i != null, ftp = S.p.ftp, hasP = !!(a.np && ftp && !a.est);
    const e = {id:a.id, k:'x-' + a.id, ts:a.ts, day:a.day, w:cur ? S.wk : null, i:cur ? i : null, n:a.n, sec:a.sec, km:a.km, hm:a.hm || 0, tss:a.tss, np:a.np || 0, hasP, ifv:hasP ? Math.round(a.np / ftp * 100) / 100 : null, at:Date.now(), x:null, seen:false};
    try { vzKeep(e, a); } catch (er) { elog(er); }
    e.cls = xrClass(e);
    const msgs = [], P = cur ? (phases(S.p).find(x => S.wk >= x.from && S.wk <= x.to) || {}) : {}, dur = mm(Math.round(a.sec / 60));
    const how = hasP ? `Ø ${Math.round(a.np)} W normalisiert, ${Math.round(e.ifv * 100)} % deines FTP` : a.hrAvg ? `Ø Puls ${a.hrAvg}` : '';
    msgs.push(`${cur ? DAYS[i] : fmt(a.day)}: ${a.km.toLocaleString('de-DE')} km in ${dur}${a.hm >= 200 ? `, ${a.hm.toLocaleString('de-DE')} hm` : ''}, ${XR_CLS[e.cls][0]}${how ? ` (${how})` : ''}. Belastung TSS ${a.tss}${a.est ? ' (geschätzt)' : ''}.`);
    const zp = e.zp, zn = zp ? zp.reduce((q, v) => q + v, 0) : 0;
    if (zp && zn) { const z2 = Math.round(100 * (zp[1] + zp[0]) / zn), hiM = Math.round(zp.slice(3).reduce((q, v) => q + v, 0) / 60); if (e.cls === 'z2' || e.cls === 'rec') msgs.push(`${z2} % der Zeit lagen in Zone 1 bis 2. Genau so baut eine Zusatzfahrt Grundlage auf, ohne dich für die geplanten Einheiten zu ermüden.`); else if (hiM) msgs.push(`${hiM} Min. lagen an oder über der Schwelle (ab 90 % FTP).`); }
    if (!cur) { msgs.push('Die Fahrt liegt vor dieser Woche. Sie fließt in deine Fitness- und Formkurve ein, am Plan ändert sich nichts.'); e.msgs = msgs; S.p.extra[a.id] = e; xrTrim(); return e; }
    const plan = S.plan, x = plan[i], sick = x && x.feel === 'sick', t = todayIdx(), wt = xrWeekTss(i), pct = wt.planned ? Math.round(100 * wt.act / wt.planned) : 0;
    if (wt.planned) msgs.push(`Damit stehst du diese Woche bei TSS ${wt.act} von geplanten ${wt.planned} (${pct} %).`);
    const nx = xrNextEvent(a.day), dEv = nx ? Math.round((new Date(nx.date + 'T12:00:00') - new Date(a.day + 'T12:00:00')) / 864e5) : 99;
    let adj = '', aj = -1;
    const free = j => j > i && j < 7 && j >= t && plan[j] && plan[j].m > 0 && !S.done[j] && !(S.actual && S.actual[j]) && plan[j].t !== 'race' && !plan[j].adapted && !plan[j].sub && !/^Eventtag|^Aktivierung/.test(plan[j].n || '');
    if (sick) msgs.push('Du hattest dich für diesen Tag krank eingetragen. Bist du wieder fit, nimm „Krank“ beim Befinden zurück. Mit Fieber bitte nicht fahren, das belastet Herz und Kreislauf.');
    else if (dEv <= 2 && (nx.prio === 'A' || nx.prio === 'B')) msgs.push(`${dEv === 1 ? 'Morgen' : 'Übermorgen'} steht ${esc(nx.name)} an. Ab jetzt nur noch locker und kurz, damit du frisch an den Start gehst.${e.cls === 'hard' || a.sec > 5400 ? ' Diese Fahrt war dafür schon recht fordernd: heute gut essen, viel trinken und früh schlafen.' : ''}`);
    else if (e.cls === 'hard') {
      const j = [i + 1, i + 2].find(q => free(q) && HARD.includes(plan[q].t));
      if (j === i + 1) { const o = plan[j], hk = q => plan[q] && (HARD.includes(plan[q].t) || plan[q].t === 'long' || plan[q].t === 'race');
        const k = [j + 1, j + 2, j + 3, j + 4, j + 5].find(q => q < 7 && S.p.avail[q] && plan[q] && !S.done[q] && (plan[q].t === 'rest' || plan[q].t === 'base') && !plan[q].adapted && !plan[q].blocked && !hk(q - 1) && !hk(q + 1) && q - 1 !== j);
        /* Punkt 6 (F4): nur ein Vorschlag. Geändert wird erst nach Zustimmung (paAccept), mit Schnappschuss und „Rückgängig“. */
        const why = `weil du ${i === t ? 'heute' : 'am ' + DAYS[i]} ${dur} zusätzlich hart gefahren bist`;
        const ez = m => ({...D('base', 'Grundlage Z2', m, 56, 72, '90 U/min', k != null ? `Locker in Zone 2. „${o.n}“ ist auf ${DAYS[k]} gerückt, ${why}.` : `Locker in Zone 2 statt „${o.n}“, ${why}.`, 'Zwei harte Tage hintereinander kosten mehr, als sie bringen.'), adapted:true, orig:o, xr:a.id});
        const A = [];
        if (k != null) A.push({l:`${DAYS[j]} locker, „${o.n}“ auf ${DAYS[k]}`, d:{[j]:ez(Math.min(75, o.m)), [k]:{...o, adapted:true, orig:plan[k], xr:a.id, st:(o.st || '') + ` Von ${DAYS[j]} hierher verschoben.`}},
          t:`${DAYS[j]} locker statt „${o.n}“, ${why}. Zwei harte Tage in Folge würden vor allem ermüden. „${o.n}“ rückt auf ${DAYS[k]}, so bleibt der Trainingsreiz der Woche erhalten.`});
        A.push({l:`${DAYS[j]} locker, „${o.n}“ entfällt`, d:{[j]:{...ez(Math.min(75, o.m)), st:`Locker in Zone 2 statt „${o.n}“, ${why}.`}}, t:`${DAYS[j]} locker statt „${o.n}“, ${why}. Deine Zusatzfahrt hat den harten Reiz dieser Woche schon gesetzt.`});
        A.push({l:`${DAYS[j]} nur 45 Min. ganz locker`, d:{[j]:{...ez(45), n:'Rekom', t:'rec', lo:45, hi:55, st:`45 Min. ganz locker (Zone 1), ${why}.`}}, t:`${DAYS[j]} nur 45 Min. ganz locker statt „${o.n}“, ${why}.`});
        e.prop = paProp(A, a.id); adj = e.prop.text; aj = j; }
      else if (j === i + 2) msgs.push(`Übermorgen steht „${plan[j].n}“ an. Ein lockerer Tag dazwischen reicht meist, achte auf Schlaf und Kohlenhydrate.`);
      if (P.key === 'taper') msgs.push('Du bist im Tapering. Jetzt zählt Frische mehr als zusätzliche Reize: die übrigen Tage bitte so fahren, wie sie geplant sind.');
      else if (P.rec || (S.wk % 4 === 0)) msgs.push('Diese Woche ist eine Erholungswoche. Harte Zusatzfahrten bremsen die Erholung, die dich in den nächsten Wochen schneller macht.');
      else if (!adj && j == null) msgs.push('Ein zusätzlicher harter Reiz passt, solange danach ein lockerer Tag folgt. Das ist hier der Fall.');
    }
    if (!sick && !adj && wt.planned && wt.act > wt.planned * 1.25 && a.tss >= 40 && P.key !== 'taper') {
      const j = [i + 1, i + 2, i + 3, i + 4, i + 5, i + 6].find(q => free(q) && !HARD.includes(plan[q].t) && plan[q].t !== 'com' && !plan[q].parts && plan[q].m >= 60);
      if (j != null) { const o = plan[j], cut = Math.min(Math.round(Math.min(a.sec / 60, o.m * .4) / 15) * 15, o.m - 45); if (cut >= 15) {
        const why = `weil du diese Woche schon deutlich mehr gefahren bist als geplant (TSS ${wt.act} von ${wt.planned})`;
        const mk = c => ({l:`„${o.n}“ am ${DAYS[j]} um ${c} Min. kürzen`, d:{[j]:{...o, m:o.m - c, n:o.n + ' (gekürzt)', st:(o.st || '') + ` Um ${c} Min. gekürzt, weil du diese Woche schon mehr gefahren bist als geplant.`, adapted:true, orig:o, xr:a.id}}, t:`„${o.n}“ am ${DAYS[j]} um ${c} Min. kürzen, ${why}. Die harten Einheiten bleiben, wie sie sind.`});
        const A = [mk(cut)]; [15, 30, 45].filter(c => c !== cut && c <= o.m - 45).forEach(c => A.push(mk(c)));
        e.prop = paProp(A, a.id); adj = e.prop.text; aj = j; } }
    }
    if (!adj && !sick && !(dEv <= 2 && (nx.prio === 'A' || nx.prio === 'B')) && e.cls !== 'hard') msgs.push(wt.planned && wt.act > wt.planned * 1.1 ? 'Du bist diese Woche fleißig über dem Plan. Solange du dich frisch fühlst, ist das zusätzlicher Grundlagenumfang. Werden die Beine schwer, lass die nächste lockere Einheit lieber kürzer.' : 'Passt gut: zusätzlicher Umfang mit wenig Ermüdung. Der Plan bleibt, wie er ist.');
    e.msgs = msgs; e.adj = ''; e.adjDay = -1;
    if (adj) { try { const key = allActs().filter(q => q.day === a.day).map(q => q.id).join('-'); S.handled = [...(S.handled || []), key]; } catch (er) { elog(er); } }
    S.p.extra[a.id] = e; xrTrim(); try { track('zusatzfahrt'); } catch (er) { elog(er); }
    return e;
  } catch (er) { elog(er); return null; }
}
function xrTrim(){ const l = xrAll(); l.slice(60).forEach(e => { delete S.p.extra[e.id]; }); l.slice(12).forEach(e => { delete e.ser; }); }
function xrUndo(id){ const e = (S.p.extra || {})[id]; if (!e || e.adjDay < 0) return; [e.adjDay, e.adjDay2].forEach(d => { const x = d != null && d >= 0 ? S.plan[d] : null; if (x && x.xr === id && x.orig) S.plan[d] = x.orig; }); bkPre('Vor dem Zurücknehmen einer Plananpassung'); e.adjDay2 = null; e.adj = ''; e.undone = 1; e.adjDay = -1; if (e.prop) e.prop.st = 'undone'; try { lbSync(false); } catch (er) { elog(er); } S.log.unshift({title:'Zusatzfahrt: Anpassung zurückgenommen', day:-1, text:'Der Plan läuft wieder wie ursprünglich vorgesehen.'}); save(); render(); }
function xrSeen(id){ const e = (S.p.extra || {})[id]; if (e) e.seen = true; save(); }
let xrOpen = null;
function xrRow(e){
  const c = XR_CLS[e.cls] || XR_CLS.z2, open = xrOpen === e.id;
  return `<div class="p-3 text-sm" style="background:var(--tint);border:1px solid var(--line);border-left:3px solid ${esc(c[1])}"><button class="flex w-full items-center gap-2 text-left" style="background:none;border:0;padding:0" onclick="xrOpen=xrOpen==='${ja(e.id)}'?null:'${ja(e.id)}';xrSeen('${ja(e.id)}');render()"><span class="min-w-0 flex-1"><span class="block truncate font-semibold" data-noi18n>${esc(e.n)}</span><span class="block text-xs" style="color:var(--mute)">${e.i != null && e.w === S.wk ? DAYS[e.i] : fmt(e.day)} · ${e.km.toLocaleString('de-DE')} km · ${mm(Math.round(e.sec / 60))} · TSS ${e.tss}${e.adj ? ' · Plan angepasst' : e.prop && paLive(e.prop) ? ' · Vorschlag offen' : ''}</span></span><span aria-hidden="true" style="color:var(--mute)">${open ? '▾' : '›'}</span></button>
    ${open ? `<div class="mt-2 space-y-2">${(e.msgs || []).map(m => `<p>${m}</p>`).join('')}${e.prop ? paUi(e) : e.adj ? `<p class="p-2.5" style="background:var(--panel);border:1px solid var(--line)"><b>Anpassung:</b> ${e.adj}</p><button class="ghost !py-1.5 text-sm" onclick="xrUndo('${ja(e.id)}')">Anpassung zurücknehmen</button>` : ''}${typeof vzPrBadge === 'function' ? vzPrBadge(e) : ''}${typeof vzRide === 'function' && (e.ser || e.zp || e.zh) ? `<div class="mt-2">${vzRide(e)}</div>` : ''}</div>` : ''}</div>`;
}
function xrCard(){
  const l = xrAll(); if (!l.length) return '';
  const wk = l.filter(e => e.w === S.wk), older = l.filter(e => e.w !== S.wk).slice(0, 8), mins = wk.reduce((q, e) => q + e.sec / 60, 0);
  return `<section class="panel p-4"><p class="hd text-xl font-semibold">Zusatzfahrten</p><p class="mt-1 text-sm" style="color:var(--mute)">Fahrten, für die keine Einheit geplant war. Die App wertet sie aus und schlägt eine Plananpassung vor, wenn es nötig ist. Geändert wird nur mit deiner Zustimmung.${wk.length ? ` Diese Woche: ${wk.length} ${wk.length === 1 ? 'Fahrt' : 'Fahrten'}, ${mm(Math.round(mins)).replace(/\.$/, '')}.` : ''}</p>
    ${wk.length ? `<div class="mt-3 space-y-2">${wk.map(xrRow).join('')}</div>` : ''}${older.length ? `<details class="mt-3"${wk.length ? '' : ' open'}><summary class="cursor-pointer text-sm" style="color:var(--teal)">Frühere Zusatzfahrten (${older.length})</summary><div class="mt-2 space-y-2">${older.map(xrRow).join('')}</div></details>` : ''}</section>`;
}
/* Startseite: neue Zusatzfahrt melden */
function xrHome(){
  if (!S.p || !hasStarted(S.p)) return ''; const e = xrAll().find(q => q.w === S.wk && q.prop && paLive(q.prop)) || xrAll().find(q => !q.seen && q.w === S.wk); if (!e) return '';
  const c = XR_CLS[e.cls] || XR_CLS.z2;
  return `<section class="panel p-4" style="border-left:4px solid ${esc(c[1])}"><p class="eyebrow">Zusatzfahrt erkannt</p><p class="mt-1 font-semibold"><span data-noi18n>${esc(e.n)}</span> · ${mm(Math.round(e.sec / 60))}, ${XR_CLS[e.cls][0]}</p>${e.prop && paLive(e.prop) ? `<div class="mt-2">${paUi(e)}</div>` : `<p class="mt-1 text-sm">${e.adj ? e.adj : (e.msgs || []).slice(-1)[0] || ''}</p>`}
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 !py-1.5 text-sm" onclick="xrOpen='${ja(e.id)}';xrSeen('${ja(e.id)}');goPg('rides')">Auswertung ansehen</button>${e.adj ? `<button class="ghost !px-3 !py-1.5 text-sm" onclick="xrSeen('${ja(e.id)}');xrUndo('${ja(e.id)}')">Zurücknehmen</button>` : ''}${e.prop && paLive(e.prop) ? '' : `<button class="ghost !px-3 !py-1.5 text-sm" onclick="xrSeen('${ja(e.id)}');render()">Ok</button>`}</div></section>`;
}
