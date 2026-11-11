/* ---------- Backlog 07.11.2026, Punkt 1 (B1, B2, F3): Garmin-Meldungen und zusätzliche Fahrten in der Woche ----------
   B1: Der stille Abgleich beim Öffnen der App übernahm ungeplante Fahrten ohne Meldung; ein späteres „Jetzt abgleichen“
   meldete dann „keine neuen Fahrten“. Jetzt wird jede neue Fahrt gemeldet, mit Angabe, ob sie einer geplanten Einheit
   zugeordnet oder als zusätzliche Fahrt erfasst wurde, und der letzte automatische Import wird im Text erwähnt.
   B2/F3: Zusätzliche Fahrten erscheinen am richtigen Tag in der Wochenansicht und zählen in der Wochensumme mit. */
/* Datum (JJJJ-MM-TT) des Tages i in Planwoche w */
function wkDay(w, i){ const d = new Date(S.p.start + 'T12:00:00'); d.setDate(d.getDate() + (w - 1) * 7 + i); return lstr(d); }
/* Zusätzliche Fahrten eines Tages (mit Auswertung aus S.p.extra), nach Uhrzeit */
function xrOfDay(w, i){ if (!S.p || !S.p.start) return []; const ds = wkDay(w, i); return xrAll().filter(e => e.day === ds).sort((a, b) => (a.ts || '').localeCompare(b.ts || '')); }
function xrDayRows(w, i){
  const l = xrOfDay(w, i); if (!l.length) return '';
  return l.map(e => { const c = XR_CLS[e.cls] || XR_CLS.z2;
    return `<button class="panel flex w-full items-center gap-3 p-3 text-left" style="border-left:4px solid ${esc(c[1])};min-height:44px" onclick="lbOpenRide('${ja(e.id)}')"><span class="h-3 w-3 shrink-0 rounded-full" style="background:${esc(c[1])}" aria-hidden="true"></span><span class="min-w-0 flex-1"><span class="block text-xs font-semibold" style="color:var(--teal)">Zusätzliche Fahrt</span><span class="block truncate font-semibold" data-noi18n>${esc(e.n)}</span><span class="block text-xs" style="color:var(--mute)">${blRideLine(e)} · ${c[0]}</span></span><span style="color:var(--mute)">${ic('chevR', 18)}</span></button>`; }).join('');
}
/* km · Zeit · Hm einer Fahrt */
const blRideLine = e => `${f1(e.km || 0)} km · ${mm(Math.round((e.sec || 0) / 60))} · ${Math.round(e.hm || 0).toLocaleString('de-DE')} hm`;
/* Alle Fahrten einer Planwoche (Archiv und laufende Liste, ohne Doppel) */
function blWeekRides(w){
  if (!S.p || !S.p.start) return [];
  const from = wkDay(w, 0), to = wkDay(w, 6), out = new Map();
  (S.arch || []).forEach(a => { if (a.d >= from && a.d <= to) out.set(a.id, {id:a.id, day:a.d, km:a.km, sec:a.sec, hm:a.hm, tss:a.tss}); });
  (S.man || []).forEach(a => { if (a.day >= from && a.day <= to) out.set(a.id, {id:a.id, day:a.day, km:a.km, sec:a.sec, hm:a.hm, tss:a.tss}); });
  return [...out.values()];
}
/* Wochensumme der tatsächlich gefahrenen Fahrten, zusätzliche Fahrten eingeschlossen */
function blWeekSum(w){
  const L = blWeekRides(w); if (!L.length) return '';
  const xs = new Set(xrAll().map(e => e.id)), nx = L.filter(a => xs.has(a.id)).length;
  const s = L.reduce((o, a) => ({km:o.km + (a.km || 0), sec:o.sec + (a.sec || 0), hm:o.hm + (a.hm || 0), tss:o.tss + (a.tss || 0)}), {km:0, sec:0, hm:0, tss:0});
  return `<p class="text-center text-sm" style="color:var(--mute)">Gefahren: ${L.length} ${L.length === 1 ? 'Fahrt' : 'Fahrten'} · ${Math.round(s.km).toLocaleString('de-DE')} km · ${mm(Math.round(s.sec / 60))} · ${Math.round(s.hm).toLocaleString('de-DE')} hm · TSS ${Math.round(s.tss)}${nx ? ` (davon ${nx} ${nx === 1 ? 'zusätzliche Fahrt' : 'zusätzliche Fahrten'})` : ''}</p>`;
}
/* Meldung nach dem Garmin-Abgleich */
function gmSum(target, n, nPl, nX, skip, fail, days){
  if (n) {
    const parts = target === 'hist' ? [] : [nPl ? `${nPl} ${nPl === 1 ? 'einer geplanten Einheit zugeordnet' : 'geplanten Einheiten zugeordnet'}` : '', nX ? `${nX} als zusätzliche ${nX === 1 ? 'Fahrt' : 'Fahrten'} erfasst` : '', n - nPl - nX > 0 ? `${n - nPl - nX} ohne Bewertung übernommen (außerhalb der laufenden Planwoche)` : ''].filter(Boolean);
    return `${n} ${n === 1 ? 'neue Fahrt' : 'neue Fahrten'} von Garmin übernommen${parts.length ? ': ' + parts.join(', ') : ''}${fail ? `, ${fail} nicht lesbar` : ''}.`;
  }
  const ln = S.gm && S.gm.lastNew, recent = ln && Date.now() - ln.at < 3 * 864e5 && ln.auto;
  return `Keine neuen Radfahrten in den letzten ${days} Tagen${skip ? ' (alles schon vorhanden)' : ''}.${recent ? (ln.n === 1 ? ' Die letzte neue Fahrt wurde schon beim Öffnen der App übernommen und steht in der Woche.' : ` Die letzten ${ln.n} neuen Fahrten wurden schon beim Öffnen der App übernommen und stehen in der Woche.`) : ''}`;
}
