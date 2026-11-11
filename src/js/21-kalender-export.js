/* ---------- Kalender-Export: ganztägige Termine (.ics für Apple/Google/Outlook, .csv für Google/Outlook) ---------- */
let icsScope = 'all', icsTime = false;
function icsDate(p, w, i){ const d = new Date(p.start + 'T12:00:00'); d.setDate(d.getDate() + (w - 1) * 7 + i); return lstr(d); }
/* Einheiten ab heute sammeln, gemeinsam für .ics und .csv */
function calItems(scope, raw){
  const p = S.p, ph = phases(p), tot = ph[ph.length - 1].to, started = hasStarted(p), cw = started ? S.wk : 1, to = scope === 'week' ? cw : tot, today = iso(0), sw = strWeek, out = [];
  for (let w = cw; w <= to; w++) {
    const plan = w === S.wk && S.plan && started ? S.plan : genWeek(p, w), sm = strOf(p, w, plan), mb = mobOf(p, w, plan, sm);
    plan.forEach((x, i) => {
      const d = icsDate(p, w, i); if (d < today || (p.startDate && d < p.startDate)) return;
      const ext = [sm[i] ? `Kraft ${sm[i].m} Min.` : '', mb[i] ? `${mb[i].n} ${mb[i].m} Min.` : ''].filter(Boolean), dur = (x.m || 0) || ((sm[i] ? sm[i].m : 0) + (mb[i] ? mb[i].m : 0));
      if (!dur) return;
      const T = t => raw ? String(t || '') : trTxt(String(t || '')).replace(/<[^>]+>/g, ''), st = x.parts ? x.parts.map(q => T(q.lbl) + ': ' + T(q.st)).join(' ') : T(x.st);
      const sum = x.m ? `${T(x.n)} · ${T(mm(x.m))}` : ext.map(T).join(' + ');
      const desc = x.m ? `${T(mm(x.m))}, ${T(intDesc(x))} (${zone(x.hi)}), TSS ~${tss(x)}. ${st}${ext.length ? ' ' + T('Dazu:') + ' ' + ext.map(T).join(', ') : ''}` : T('Übungen findest du in der App unter Übungen.');
      out.push({w, i, d, dur, sum, desc, we:i >= 5});
    });
  }
  strWeek = sw; return out;
}
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
const ymd = s => s.replace(/-/g, '');
function calTimes(it){ const hm = (it.we ? S.icsTe : S.icsT) || (it.we ? '09:00' : '17:30'), [h, m] = hm.split(':').map(Number), a = new Date(it.d + 'T00:00:00'); a.setHours(h, m, 0, 0); const b = new Date(a.getTime() + it.dur * 6e4); return [a, b]; }
const tstamp = x => lstr(x).replace(/-/g, '') + 'T' + String(x.getHours()).padStart(2, '0') + String(x.getMinutes()).padStart(2, '0') + '00';
function icsText(items){
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Relentless//Trainingsplan//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc('Relentless: ' + (S.pname || 'Trainingsplan'))];
  items.forEach(it => {
    const nx = new Date(it.d + 'T12:00:00'); nx.setDate(nx.getDate() + 1);
    const dt = icsTime ? (([a, b]) => ['DTSTART:' + tstamp(a), 'DTEND:' + tstamp(b)])(calTimes(it)) : ['DTSTART;VALUE=DATE:' + ymd(it.d), 'DTEND;VALUE=DATE:' + ymd(lstr(nx)), 'TRANSP:TRANSPARENT'];
    L.push('BEGIN:VEVENT', `UID:${S.p.start}-${it.w}-${it.i}@relentless`, 'DTSTAMP:' + stamp, ...dt, 'SUMMARY:' + icsEsc(it.sum), 'DESCRIPTION:' + icsEsc(it.desc), 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  /* Zeilen nach RFC 5545 bei höchstens 75 Byte umbrechen, ohne Zeichen zu teilen */
  const enc = new TextEncoder(), fold = l => { const o = []; let cur = '', n = 0; for (const ch of l) { const b = enc.encode(ch).length; if (n + b > 73) { o.push(cur); cur = ' '; n = 1; } cur += ch; n += b; } o.push(cur); return o.join('\r\n'); };
  return L.map(fold).join('\r\n') + '\r\n';
}
function csvText(items){
  const q = v => '"' + String(v).replace(/"/g, '""') + '"', us = d => { const [y, m, t] = d.split('-'); return `${m}/${t}/${y}`; }, hhmm = x => { let h = x.getHours(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(x.getMinutes()).padStart(2, '0')} ${ap}`; };
  const rows = [['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description'].map(q).join(',')];
  items.forEach(it => { if (icsTime) { const [a, b] = calTimes(it); rows.push([it.sum, us(it.d), hhmm(a), us(lstr(b)), hhmm(b), 'False', it.desc].map(q).join(',')); } else rows.push([it.sum, us(it.d), '', us(it.d), '', 'True', it.desc].map(q).join(',')); });
  return rows.join('\r\n') + '\r\n';
}
async function calDl(kind){
  const items = calItems(icsScope); if (!items.length) { icsMsg = 'Keine anstehenden Einheiten gefunden.'; render(); return; }
  const base = 'relentless-' + (icsScope === 'week' ? 'woche' : 'plan'), txt = kind === 'csv' ? csvText(items) : icsText(items), bytes = new TextEncoder().encode(txt);
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { elog(e); }
  try {
    if (dl) {
      /* In Claude sind .ics-Dateien als Download nicht erlaubt: dort als ZIP, .csv direkt */
      if (kind === 'csv') await dl.save({filename:base + '.csv', data:bytes});
      else await dl.save({filename:base + '-kalender.zip', data:zipOne(base + '.ics', bytes)});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], {type:kind === 'csv' ? 'text/csv;charset=utf-8' : 'text/calendar;charset=utf-8'})); a.download = base + '.' + kind;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    icsMsg = `${items.length} Termine exportiert. ` + (kind === 'csv' ? 'Importiere die Datei in Google Kalender (Einstellungen › Importieren) oder Outlook (Datei › Öffnen und exportieren › Importieren).' : dl ? 'Entpacke die ZIP-Datei und öffne die .ics-Datei darin, dann fragt dein Kalender, ob er die Termine übernehmen soll.' : 'Öffne die Datei, dann fragt dein Kalender, ob er die Termine übernehmen soll.');
  } catch (e) { icsMsg = e && e.code === 'declined' ? '' : 'Export nicht möglich' + (e && e.code ? ' (' + e.code + ')' : '') + '.'; }
  render();
}
async function icsDl(scope){ icsScope = scope; return calDl('ics'); }
function icsCard(){
  const n = (() => { try { return calItems(icsScope, true).length; } catch (e) { elog(e); return 0; } })();
  return `<section class="panel p-4"><h2 class="hd text-xl font-semibold">Kalender</h2><p class="mt-1 text-sm" style="color:var(--mute)">Trag deine Einheiten in deinen Kalender ein. Jede Einheit erscheint als ganztägiger Termin am jeweiligen Tag, mit Dauer, Wattbereich und Ablauf. So siehst du deine Woche neben deinen anderen Terminen und planst den Rest drumherum.</p>
    <div class="mt-3 flex flex-wrap gap-2">${chip('Ganzer Plan', icsScope === 'all', "icsScope='all';render()")}${chip('Nur diese Woche', icsScope === 'week', "icsScope='week';render()")}</div>
    <p class="mt-2 text-sm">${n} ${n === 1 ? 'Termin' : 'Termine'} ab heute.</p>
    <div class="mt-3 grid gap-2"><button class="btn" onclick="calDl('ics')">Kalenderdatei (.ics) für Apple, Google, Outlook</button><button class="ghost" onclick="calDl('csv')">Tabelle (.csv) für Google Kalender oder Outlook</button></div>
    ${icsMsg ? `<p class="mt-2 text-sm" style="color:var(--ok)">${esc(icsMsg)}</p>` : ''}
    <details class="mt-3 text-sm"${icsTime ? ' open' : ''}><summary class="cursor-pointer" style="color:var(--teal)">Lieber mit fester Uhrzeit?</summary><div class="mt-2"><p style="color:var(--mute)">Statt ganztägig trägt die App jede Einheit zu einer Uhrzeit ein, zum Beispiel nach der Arbeit. Der Termin dauert so lange wie die Einheit.</p>
      <div class="mt-2 flex flex-wrap gap-2">${chip('Ganztägig', !icsTime, 'icsTime=false;render()')}${chip('Mit Uhrzeit', icsTime, 'icsTime=true;render()')}</div>
      ${icsTime ? `<div class="mt-3 grid grid-cols-2 gap-3"><label class="text-sm font-semibold">Start Mo bis Fr<input type="time" class="inp mt-1" value="${esc(S.icsT || '17:30')}" onchange="S.icsT=this.value;save()"></label><label class="text-sm font-semibold">Start Sa und So<input type="time" class="inp mt-1" value="${esc(S.icsTe || '09:00')}" onchange="S.icsTe=this.value;save()"></label></div>` : ''}</div></details>
    <details class="mt-2 text-sm"><summary class="cursor-pointer" style="color:var(--teal)">So kommen die Termine in deinen Kalender</summary><ul class="mt-2 space-y-1" style="color:var(--mute)">
      <li><b style="color:var(--ink)">iPhone, iPad, Mac:</b> Kalenderdatei laden und öffnen, dann „Alle hinzufügen“. In der Claude-App kommt sie als ZIP: in der Dateien-App antippen zum Entpacken, dann die .ics-Datei öffnen.</li>
      <li><b style="color:var(--ink)">Google Kalender:</b> am Computer unter Einstellungen › Importieren und Exportieren die .ics- oder .csv-Datei hochladen. Tipp: vorher einen eigenen Kalender „Training“ anlegen und dorthin importieren, dann lassen sich die Termine später mit einem Klick entfernen.</li>
      <li><b style="color:var(--ink)">Outlook:</b> Datei › Öffnen und exportieren › Importieren, oder die .ics-Datei per Doppelklick öffnen.</li></ul>
      <p class="mt-2 text-xs" style="color:var(--mute)">Der Kalender aktualisiert sich nicht automatisch. Exportiere nach größeren Planänderungen neu und lösche vorher die alten Termine.</p></details></section>`;
}
