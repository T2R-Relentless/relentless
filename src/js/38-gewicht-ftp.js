/* ---------- Backlog 07.11.2026, Punkt 4 (F7): Gewicht und FTP in den Einstellungen ----------
   Eine Seite unter Einstellungen → Training. Gewicht (kg) und FTP (W) direkt bearbeiten, W/kg wird berechnet.
   Jede Änderung landet mit Datum im Verlauf S.wf (gehört zum normalen Speicher und damit zu Spiegel, Schnappschüssen
   und Sicherungsdatei). Eine neue FTP läuft über setFtpNow: kommende Einheiten rechnen ihre Wattbereiche aus der
   aktuellen FTP, gespeicherte Bewertungen behalten ihren damaligen Wert (Feld ftp der Bewertung). */
const wfNum = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
const wfFmt = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('de-DE', {minimumFractionDigits:d, maximumFractionDigits:d});
function wfCur(){ const p = S.p || {}, d = S.d || {}; return {kg:wfNum(p.weight || d.weight), ftp:wfNum(p.ftp || d.ftp)}; }
const wfWkg = (ftp, kg) => ftp > 0 && kg > 0 ? ftp / kg : 0;
/* Verlauf anlegen: beim ersten Aufruf aus dem bisherigen FTP-Verlauf des Plans und dem Gewicht übernehmen */
function wfHist(){
  if (Array.isArray(S.wf)) return S.wf;
  const c = wfCur(), p = S.p, L = [];
  if (p && Array.isArray(p.ftpH)) p.ftpH.forEach(h => { if (h && h.d && h.v > 0) L.push({d:h.d, at:0, ftp:+h.v, kg:c.kg || 0}); });
  if (!L.length && (c.kg || c.ftp)) L.push({d:(p && p.start && p.start <= iso(0)) ? p.start : iso(0), at:0, ftp:c.ftp || 0, kg:c.kg || 0});
  S.wf = L; return L;
}
const wfLast = () => { const H = wfHist(); return H.length ? H[H.length - 1] : null; };
/* Untertitel in den Einstellungen */
function wfSub(){
  const c = wfCur(); if (!c.kg && !c.ftp) return 'Noch nicht eingetragen';
  const w = wfWkg(c.ftp, c.kg);
  return [c.ftp ? `FTP ${Math.round(c.ftp)} W` : '', c.kg ? `${wfFmt(c.kg, c.kg % 1 ? 1 : 0)} kg` : '', w ? `${wfFmt(w, 1)} W/kg` : ''].filter(Boolean).join(' · ');
}
let wfMsg = '', wfMsgAt = 0;
function wfLive(){
  const k = wfNum((document.getElementById('wfKg') || {}).value), f = wfNum((document.getElementById('wfFtp') || {}).value), el = document.getElementById('wfWkg');
  if (el) el.textContent = wfWkg(f, k) ? `${wfFmt(wfWkg(f, k), 2)} W/kg` : '–';
}
function wfSave(){
  wfMsgAt = Date.now();
  const kg = Math.round(wfNum((document.getElementById('wfKg') || {}).value) * 10) / 10, ftp = Math.round(wfNum((document.getElementById('wfFtp') || {}).value));
  if (!(kg >= 30 && kg <= 200)) { wfMsg = 'Bitte ein Gewicht zwischen 30 und 200 kg eintragen.'; return render(); }
  if (!(ftp >= 50 && ftp <= 600)) { wfMsg = 'Bitte eine FTP zwischen 50 und 600 W eintragen.'; return render(); }
  const c = wfCur(), dF = ftp !== Math.round(c.ftp), dK = kg !== Math.round(c.kg * 10) / 10;
  if (!dF && !dK) { wfMsg = 'Keine Änderung.'; return render(); }
  wfHist();
  /* Eine neue FTP ändert den Plan: vorher Schnappschuss, danach 10 Minuten „Rückgängig“ */
  if (S.p && dF) bkPre('Vor dem Ändern der FTP');
  S.d.weight = kg; if (S.p) S.p.weight = kg;
  S.wf.push({d:iso(0), at:Date.now(), ftp, kg});
  if (S.wf.length > 400) S.wf = S.wf.slice(-400);
  wfMsg = dF ? `Gespeichert. Die Wattbereiche aller kommenden Einheiten rechnen jetzt mit ${ftp} W, vergangene Fahrten behalten ihren damaligen Wert.` : 'Gespeichert.';
  if (S.p && dF) return setFtpNow(ftp);
  if (dF) S.d.ftp = ftp;
  save(); render();
}
function wfPage(){
  const c = wfCur(), H = wfHist(), last = wfLast(), w = wfWkg(c.ftp, c.kg);
  const lastTxt = last && last.at ? `Zuletzt geändert am ${fmt(lstr(new Date(last.at)))}` : last ? `Stand seit ${fmt(last.d)}` : 'Noch keine Änderung gespeichert';
  const rows = H.slice(-12).reverse().map(h => `<li class="flex items-center gap-2 py-2" style="border-top:1px solid var(--line)"><span class="flex-1 text-sm">${fmt(h.d)}</span><span class="text-sm font-semibold">${h.ftp ? Math.round(h.ftp) + ' W' : '–'}</span><span class="text-sm" style="min-width:4.5rem;text-align:right">${h.kg ? wfFmt(h.kg, 1) + ' kg' : '–'}</span><span class="text-sm" style="min-width:5rem;text-align:right;color:var(--mute)">${wfWkg(h.ftp, h.kg) ? wfFmt(wfWkg(h.ftp, h.kg), 2) + ' W/kg' : ''}</span></li>`).join('');
  return `<section class="panel p-4"><div class="grid grid-cols-2 gap-3">${field('Gewicht (kg)', `<input id="wfKg" type="text" inputmode="decimal" autocomplete="off" class="inp" style="min-height:44px" value="${esc(c.kg ? wfFmt(c.kg, c.kg % 1 ? 1 : 0) : '')}" oninput="wfLive()">`)}${field('FTP (W)', `<input id="wfFtp" type="number" inputmode="numeric" class="inp" style="min-height:44px" value="${esc(c.ftp ? Math.round(c.ftp) : '')}" oninput="wfLive()">`)}</div>
    <p class="mt-3 text-sm">Leistung pro Kilo: <span id="wfWkg" class="font-semibold">${w ? wfFmt(w, 2) + ' W/kg' : '–'}</span></p>
    <p class="mt-1 text-xs" style="color:var(--mute)">${lastTxt}</p>
    <button class="btn mt-3" style="min-height:44px" onclick="wfSave()">Speichern</button>
    ${wfMsg && Date.now() - wfMsgAt < 6e4 ? `<p class="mt-2 text-sm" role="status">${esc(wfMsg)}</p>` : ''}
    <p class="mt-3 text-xs" style="color:var(--mute)">Eine neue FTP rechnet die Wattbereiche aller kommenden Einheiten neu. Vergangene Fahrten und Bewertungen behalten den Wert, der damals galt.</p></section>
    ${rows ? `<section class="panel mt-3 p-4"><p class="font-semibold">Verlauf</p><ul class="mt-2">${rows}</ul></section>` : ''}`;
}
/* Fortschritt → FTP und Leistung: Entwicklung von FTP, Gewicht und W/kg */
function wfProgCard(){
  const H = wfHist().filter(h => h.ftp > 0 || h.kg > 0); if (!H.length) return '';
  const pts = H.map(h => ({d:h.d, v:wfWkg(h.ftp, h.kg)})).filter(x => x.v > 0);
  let svg = '';
  if (pts.length >= 2) {
    const W = 320, Hh = 90, L = 8, R = 8, T = 10, B = 14, t0 = new Date(pts[0].d + 'T12:00:00').getTime(), t1 = Math.max(t0 + 864e5, new Date(pts[pts.length - 1].d + 'T12:00:00').getTime());
    const lo = Math.min(...pts.map(x => x.v)) * .97, hi = Math.max(...pts.map(x => x.v)) * 1.03, X = d => L + (new Date(d + 'T12:00:00').getTime() - t0) / (t1 - t0) * (W - L - R), Y = v => T + (hi - v) / Math.max(.01, hi - lo) * (Hh - T - B);
    const path = pts.map((x, k) => `${k ? 'L' : 'M'}${X(x.d).toFixed(1)},${Y(x.v).toFixed(1)}`).join(' ');
    svg = `<svg viewBox="0 0 ${W} ${Hh}" class="mt-2 w-full" role="img" aria-label="Verlauf W/kg"><path d="${path}" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linejoin="round"/>${pts.map(x => `<circle cx="${X(x.d).toFixed(1)}" cy="${Y(x.v).toFixed(1)}" r="3.5" fill="var(--teal)"/>`).join('')}</svg>`;
  }
  const a = H[0], z = H[H.length - 1], dF = a.ftp && z.ftp ? Math.round(z.ftp - a.ftp) : 0, dK = a.kg && z.kg ? Math.round((z.kg - a.kg) * 10) / 10 : 0;
  const sum = H.length < 2 ? `Aktuell ${wfSub()}.` : `Seit ${fmt(a.d)}: FTP ${dF > 0 ? '+' : ''}${dF} W, Gewicht ${dK > 0 ? '+' : ''}${wfFmt(dK, 1)} kg. Aktuell ${wfSub()}.`;
  return `<section class="panel mt-3 p-4"><p class="font-semibold">Gewicht und FTP</p><p class="mt-1 text-sm" style="color:var(--mute)">${sum}</p>${svg}<button class="mt-2 text-sm font-semibold" style="color:var(--teal);background:none;border:0;min-height:44px" onclick="wfGo()"><span class="inline-flex items-center gap-1"><span>Gewicht und FTP ändern</span>${ic('chevR', 16)}</span></button></section>`;
}
function wfGo(){ wfMsg = ''; goPg('settings'); goPg('set-wf'); }

/* Punkt 4: jede FTP-Übernahme (Test, Schätzung, Einstellungen) landet im Verlauf Gewicht und FTP */
(function(){ const o = setFtpNow; setFtpNow = function(v, w){ try { wfHist(); const L = S.wf[S.wf.length - 1], c = wfCur();
  if (!L || Math.round(L.ftp) !== Math.round(v) || L.d !== iso(0)) S.wf.push({d:iso(0), at:Date.now(), ftp:Math.round(v), kg:c.kg || 0}); } catch (e) { elog(e); } return o(v, w); }; })();
