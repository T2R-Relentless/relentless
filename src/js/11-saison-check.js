/* ---------- F17, Ergänzung 12.11.2026: Plan-Check für die ganze Saison ----------
   Gemeinsame Berechnung: Alle Ansichten (Plan-Check, Saisonübersicht, Karte „Tage bis“, Formkurve) nutzen seasonForecast(p) je Event.
   Die Form am Eventtag kommt aus der Formkurve (vzRows), solange es dort Daten gibt. Ohne Fahrten (neuer Plan, Planung) rechnet formPlan
   dieselbe Formel (CTL 42 Tage, ATL 7 Tage) über die geplanten Einheiten, damit jedes Event eine Form bekommt.
   Plan-Check bei einem Saisonplan: oben eine Zusammenfassung (FTP-Verlauf, höchste Fitness, Stunden, A-Events in der Formspitze, zu dicht
   liegende Events), darunter je Event ein aufklappbarer Abschnitt (das nächste A-Event offen) mit Ampel und Begründung. Maßnahmen für die
   ganze Saison zeigen ihre Wirkung auf jedes Event, gerechnet mit simP (wie der Plan-Check) und seasonForecast. */
const _fpC = new Map();
/* Form aus den geplanten Einheiten. Startwert: bisherige Wochenstunden (sonst 70 % der verfügbaren) × 50 TSS pro Stunde, verteilt auf 7 Tage */
function formPlan(p){
  if (!p || !p.start) return null;
  const key = JSON.stringify({...p, course:p.course ? p.course.hm + ':' + p.course.seg.length + ':' + (p.course.laps || 1) : 0});
  if (_fpC.has(key)) return _fpC.get(key);
  let ph; try { ph = phases(p); } catch (e) { elog(e); return null; }
  const tot = ph[ph.length - 1].to, h0 = p.startH > 0 ? p.startH : hAv(p) * .7, seed = h0 * 50 / 7, kC = 1 - Math.exp(-1 / 42), kA = 1 - Math.exp(-1 / 7);
  let ctl = seed, atl = seed; const rows = [];
  for (let w = 1; w <= tot; w++) { let pl = []; try { pl = genWeek(p, w, true); } catch (e) { elog(e); }
    for (let i = 0; i < 7; i++) { const day = addD(p.start, (w - 1) * 7 + i), t = pl[i] && pl[i].m > 0 ? tss(pl[i]) : 0, tsb = ctl - atl; ctl += (t - ctl) * kC; atl += (t - atl) * kA; rows.push({day, t, ctl, atl, tsb}); } }
  const out = {rows, src:'plan'}; if (_fpC.size > 20) _fpC.clear(); _fpC.set(key, out); return out;
}
/* Formreihe für einen Plan: im laufenden Plan die Formkurve, sonst die Planrechnung */
function formRows(p){ if (p && p === S.p) { try { const R = vzRows(); if (R) return {rows:R.rows, src:'rides'}; } catch (e) { elog(e); } } return formPlan(p); }

/* Mindestabstand zwischen zwei Events in Tagen, je nach Priorität des späteren und des früheren Events */
const evGapNeed = (a, b) => b.prio === 'A' ? (a.prio === 'C' ? 3 : 7) : a.prio === 'A' ? 5 : b.prio === 'B' ? 3 : 1;
/* Ampel je Event: mit Zielzeit nach der erwarteten Zeit, sonst nach Form und Fitness am Eventtag */
function evLight(p, o, peak){
  const tg = o.main ? tMin(p.targetTime) : 0;
  if (tg && o.t) { const r = o.t / tg; return r <= 1 ? ['ok', `Ziel ${hm2(tg)} Std., erwartet ${hm2(o.t)} Std.: erreichbar.`] : r <= 1.05 ? ['mid', `Ziel ${hm2(tg)} Std., erwartet ${hm2(o.t)} Std.: knapp, etwa ${Math.round((r - 1) * 100)} % langsamer.`] : ['high', `Ziel ${hm2(tg)} Std., erwartet ${hm2(o.t)} Std.: mit diesem Plan nicht erreichbar.`]; }
  if (!o.form) return ['na', 'Form am Eventtag noch unbekannt.'];
  const f = o.form;
  if (o.prio === 'C') return ['na', 'Trainingsrennen ohne Tapering. Kein eigenes Ziel.'];
  if (o.prio === 'B') return f.tsb >= -10 ? ['ok', `Ausreichend frisch (Form ${f.tsb > 0 ? '+' : ''}${f.tsb}).`] : ['mid', `Noch müde (Form ${f.tsb}). Das Mini-Tapering hilft, nimm das Rennen trotzdem etwas ruhiger.`];
  if (f.tsb < 0) return ['mid', `Am Eventtag noch etwas müde (Form ${f.tsb}). Ideal sind etwa +5 bis +25.`];
  if (peak > 15 && f.ctl < peak * .9) return ['mid', `Fitness ${f.ctl} liegt unter dem Höchstwert der Saison (${Math.round(peak)}).`];
  if (f.tsb > 30) return ['mid', `Sehr frisch (Form +${f.tsb}), dabei geht schon etwas Fitness verloren.`];
  return ['ok', `Formspitze: Form +${f.tsb} bei Fitness ${f.ctl}.`];
}
/* Saison-Auswertung. Gibt null zurück, wenn es nicht mindestens zwei kommende Events gibt. */
function seasonCheck(p){
  if (!p || p.goal !== 'event') return null;
  const F = seasonForecast(p).filter(o => !o.past); if (F.length < 2) return null;
  const R = formRows(p), today = iso(0), end = p.eventDate, rows = R ? R.rows.filter(r => r.day <= end) : [];
  const fut = rows.filter(r => r.day >= today), pk = (fut.length ? fut : rows).reduce((a, r) => !a || r.ctl > a.ctl ? r : a, null);
  const peak = pk ? pk.ctl : 0;
  F.forEach(o => { const l = evLight(p, o, peak); o.light = l[0]; o.why = l[1]; });
  const ftps = F.filter(o => o.ftp).map(o => o.ftp), st = planStats(p);
  const close = []; for (let k = 1; k < F.length; k++) { const a = F[k - 1], b = F[k], g = Math.round((dOnly(b.date) - dOnly(a.date)) / 864e5), need = evGapNeed(a, b); if (g < need) close.push({a, b, g, need}); }
  const aPk = F.filter(o => o.prio === 'A').map(o => ({o, ok:o.light === 'ok' || (o.form && o.form.tsb >= 0 && (!peak || o.form.ctl >= peak * .9))}));
  return {F, src:R ? R.src : '', ftp0:p.ftp, ftpMax:ftps.length ? Math.max(...ftps) : 0, ftpEnd:(F.find(o => o.main) || F[F.length - 1]).ftp || 0,
    peak:pk ? {ctl:Math.round(pk.ctl), day:pk.day} : null, hAv:hAv(p), hPlan:st.hAvg, close, aPk};
}
/* Wirkung einer Maßnahme auf alle Events: Minuten schneller (−) oder langsamer (+) je Event mit erwarteter Zeit */
function actImpact(p, act){
  try { const A = seasonForecast(p).filter(o => !o.past && o.t), B = seasonForecast(simP(p, [act]));
    return A.map(o => { const b = B.find(q => q.id === o.id); return b && b.tRaw && o.tRaw ? {o, d:Math.round(b.tRaw - o.tRaw)} : null; }).filter(Boolean); } catch (e) { elog(e); return []; }
}
const impTxt = L => L.length ? L.map(x => `<span data-noi18n>${esc(x.o.name)}</span> <b>${x.d === 0 ? '±0' : (x.d < 0 ? '−' : '+') + Math.abs(x.d)} Min.</b>`).join(' · ') : 'keine Änderung der Zielzeiten';
let scMeas = false;
const LIGHT = {ok:['#0a8f6a', 'erreichbar'], mid:['#d9a400', 'knapp'], high:['#c2410c', 'nicht erreichbar'], na:['var(--mute)', 'ohne Wertung']};
function seasonCheckHtml(p, mode){
  const c = seasonCheck(p); if (!c) return '';
  const sg = v => (v > 0 ? '+' : '') + v, kg = kgOf(p), nA = c.F.find(o => o.prio === 'A');
  const sum = [
    `<li><b>FTP:</b> heute ${c.ftp0} W → höchster Wert ${c.ftpMax} W → am Saisonende ${c.ftpEnd} W (${f1(c.ftpEnd / kg)} W/kg)</li>`,
    c.peak ? `<li><b>Höchste Fitness:</b> etwa ${c.peak.ctl} am ${fmt(c.peak.day)}</li>` : '',
    `<li><b>Stunden pro Woche:</b> ${hStd(c.hAv)} verfügbar, ${hStd(c.hPlan)} geplant (im Mittel, ohne Startwoche und Tapering)</li>`,
    c.aPk.length ? `<li><b>A-Events in der Formspitze:</b> ${c.aPk.map(x => `<span data-noi18n>${esc(x.o.name)}</span> ${x.ok ? '<span style="color:var(--ok)">ja</span>' : '<span style="color:#c2410c">nein</span>'}`).join(' · ')}</li>` : '',
    c.close.length ? c.close.map(x => `<li style="color:#c2410c"><b>Zu dicht:</b> <span data-noi18n>${esc(x.a.name)}</span> (${x.a.prio}) und <span data-noi18n>${esc(x.b.name)}</span> (${x.b.prio}) liegen ${x.g} ${x.g === 1 ? 'Tag' : 'Tage'} auseinander, empfohlen sind mindestens ${x.need}.</li>`).join('') : '<li><b>Abstände:</b> Zwischen den Events bleibt genug Zeit zur Erholung.</li>'
  ].join('');
  const evRow = o => { const L = LIGHT[o.light]; return `<details class="ckd sce" data-ev="${esc(o.id)}"${o === nA ? ' open' : ''}><summary><span><span class="flex items-center gap-2">${prioBadge(o.prio)}<b class="min-w-0 flex-1" data-noi18n>${esc(o.name)}</b><i aria-hidden="true" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(L[0])}"></i></span><em>${fmt(o.date)} · ${o.t ? hm2(o.t) + ' Std.' : 'Zielzeit offen'}${o.form ? ' · Form ' + sg(o.form.tsb) : ''} · <span>${L[1]}</span></em></span></summary>
    <div class="ckb"><div class="grid grid-cols-2 gap-2 text-sm">
      <div class="p-2.5" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">Zielzeit</div><div class="font-semibold">${o.t ? `${hm2(o.t)} Std.` : (o.miss ? 'Distanz oder Höhenmeter fehlen' : '–')}</div>${o.tAmb ? `<div class="text-xs">ambitioniert ${hm2(o.tAmb)} Std.</div>` : ''}${o.kmh ? `<div class="text-xs">Ø ${f1(o.kmh)} km/h</div>` : ''}</div>
      <div class="p-2.5" style="background:var(--tint)"><div class="text-xs" style="color:var(--mute)">Am Eventtag</div><div class="font-semibold">${o.ftp ? `FTP ${o.ftp} W` : '–'}</div>${o.ftp ? `<div class="text-xs">${f1(o.ftp / kg)} W/kg</div>` : ''}${o.form ? `<div class="text-xs">Form ${sg(o.form.tsb)} · Fitness ${o.form.ctl}</div>` : ''}</div></div>
      <p class="mt-2 flex gap-2 text-sm"><i aria-hidden="true" style="flex:none;margin-top:5px;display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(L[0])}"></i><span>${o.why}</span></p>
      <p class="mt-1 text-xs" style="color:var(--mute)">${o.taper}${o.main ? ' · Saisonhöhepunkt' : ''}</p></div></details>`; };
  const acts = [['setH', Math.min(20, Math.round((c.hAv + 1) * 2) / 2)], c.hAv > 3 ? ['setH', Math.round((c.hAv - 1) * 2) / 2] : null, !p.intF ? ['intF', 1] : null, !p.longPri ? ['longPri', 1] : null].filter(Boolean);
  const meas = scMeas ? acts.map(a => `<li class="p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="text-sm font-semibold">${actTxt(p, a)}</p><p class="mt-1 text-xs">Wirkung: ${impTxt(actImpact(p, a))}</p><button class="ghost lbl mt-2 !py-1.5" onclick="applyChk('${ja(a[0])}', ${ja(a[1])}, '${ja(mode)}')">Für die ganze Saison übernehmen</button></li>`).join('') : '';
  return `<details class="ckd" open><summary><span>Saison im Überblick<em>${c.F.length} kommende Events${nA ? ` · nächstes A-Event <span data-noi18n>${esc(nA.name)}</span>` : ''}</em></span></summary><div class="ckb">
    <ul class="space-y-1 text-sm">${sum}</ul>
    <p class="mt-3 font-semibold">Ausblick je Event</p>${c.F.map(evRow).join('')}
    <details class="ckd" ontoggle="if(scMeas!==this.open){scMeas=this.open;render()}"${scMeas ? ' open' : ''}><summary><span>Maßnahmen für die ganze Saison<em>Wirkung auf jedes Event</em></span></summary><div class="ckb">${scMeas ? `<ul class="space-y-2">${meas}</ul>` : ''}</div></details>
    <p class="mt-2 text-xs" style="color:var(--mute)">Dieselben Werte wie in der Saisonübersicht und der Formkurve. ${c.src === 'plan' ? 'Die Form ist aus den geplanten Einheiten gerechnet, bis die App aus deinen Fahrten die Fitness kennt.' : 'Die Form kommt aus der Formkurve.'} Ampel: mit Zielzeit nach der erwarteten Zeit, sonst nach Form und Fitness am Eventtag.</p></div></details>`;
}
