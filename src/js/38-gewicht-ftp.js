/* ---------- Backlog 07.11.2026, Punkt 4 (F7): Gewicht und FTP in den Einstellungen ----------
   Eine Seite unter Einstellungen → Training. Gewicht (kg) und FTP (W) direkt bearbeiten, W/kg wird berechnet.
   Jede Änderung landet mit Datum im Verlauf S.wf (gehört zum normalen Speicher und damit zu Spiegel, Schnappschüssen
   und Sicherungsdatei). Eine neue FTP läuft über setFtpNow: kommende Einheiten rechnen ihre Wattbereiche aus der
   aktuellen FTP, gespeicherte Bewertungen behalten ihren damaligen Wert (Feld ftp der Bewertung). */
/* ---------- Paket C (Fachregel 2.1): Herkunft von FTP und Gewicht ----------
   ftpHk: 'gemessen' (übernommener Fitness-Check, FTP aus Fahrten mit Sicherheit ab „mittel“), 'eingegeben' (selbst eingetragen)
   oder 'geschaetzt' (aus der Selbsteinschätzung). kgHk: 'eingegeben' oder 'geschaetzt' (Standardwert 75 kg).
   Eine einzige Ableitung für alles, was das Feld noch nicht hat (load, Sicherungsdatei, Planwechsel). Sie füllt nur die beiden
   Felder, am Plan selbst ändert sich nichts. Nur Funktionsdeklarationen: load() läuft schon beim Start in 04. */
function hkFtpOf(p){
  if (!p) return 'geschaetzt';
  if (Object.values(p.res || {}).some(r => r && r.adopted)) return 'gemessen';
  if (p.mode === 'light') return p.ftpKnown > 0 || (p.ftpStart > 0 && p.ftp > 0 && Math.round(p.ftp) !== Math.round(p.ftpStart)) ? 'eingegeben' : 'geschaetzt';
  const src = p.ftpSrc || 'manual';
  if (src === 'data') return p.ftpConf === 'mittel' || p.ftpConf === 'hoch' ? 'gemessen' : 'geschaetzt';
  if (src === 'manual') return 'eingegeben';
  return p.ftpStart > 0 && p.ftp > 0 && Math.round(p.ftp) !== Math.round(p.ftpStart) ? 'eingegeben' : 'geschaetzt';
}
function hkKgOf(p){ return p && p.weight > 0 && Math.round(p.weight * 10) !== 750 ? 'eingegeben' : 'geschaetzt'; }
function hkDerive(p){
  if (!p || typeof p !== 'object') return p;
  if (!['gemessen', 'eingegeben', 'geschaetzt'].includes(p.ftpHk)) p.ftpHk = hkFtpOf(p);
  if (!['eingegeben', 'geschaetzt'].includes(p.kgHk)) p.kgHk = hkKgOf(p);
  return p;
}
/* Gespeicherter Plan aus der Zeit vor Paket C (ohne Herkunft): ifd = 0 hält die Wochen unverändert, denn der Generator rechnet die
   Eventdauer (Long-Ride-Länge) dann wie bisher ohne Abschlag für Ermüdungsresistenz. Prognose, Eventtag-Belastung und Pacing nutzen
   den neuen Abschlag auch hier (Entscheidung 9 C, Hinweis in „Neu in dieser Version“). */
function hkMigP(p){ if (p && typeof p === 'object') { if (!p.ftpHk && p.ifd == null) p.ifd = 0; hkDerive(p); } return p; }
/* Ganzer Zustand bzw. Schnappschuss: aktiver Plan und Entwurf */
function hkMig(o){ if (o && typeof o === 'object') { if (o.p) hkMigP(o.p); if (o.d && o.p) { if (!o.d.ftpHk) o.d.ftpHk = o.p.ftpHk; if (!o.d.kgHk) o.d.kgHk = o.p.kgHk; if (o.d.ifd == null && o.p.ifd != null) o.d.ifd = o.p.ifd; } } return o; }
const hkEst = p => !!p && hkDerive(p).ftpHk === 'geschaetzt';
const hkKgEst = p => !!p && hkDerive(p).kgHk === 'geschaetzt';
/* Beim Anlegen oder Anpassen eines Plans (finish): Herkunft festlegen. Bleibt der FTP beim Anpassen gleich, bleibt auch seine Herkunft.
   sanft = 1: neuer Plan mit geschätztem FTP, dann gilt der sanfte Einstieg (Fachregeln 2.3 bis 2.7). Ältere Pläne haben das Feld nicht
   und bleiben unverändert. */
function hkFinish(d, es){
  if (d.mode !== 'light' && d.ftpSrc === 'data') { try { const a = anaCalc(), f = a && a.best; d.ftpConf = f && a.ftpV && Math.round(+d.ftp) === Math.round(a.ftpV) ? ((f.fe && f.fe.conf) || (f.cp && f.cp.conf) || '') : ''; } catch (e) { elog(e); } }
  const same = S.edit && S.p && Math.round(+d.ftp) === Math.round(+S.p.ftp);
  d.ftpHk = same ? hkDerive(S.p).ftpHk : hkFtpOf({...d, res:null, ftpStart:+d.ftp});
  if (!same && es === 'new' && d.mode !== 'light' && (d.ftpSrc || 'manual') === 'manual' && d.ftpUi && !d.ftpSet) d.ftpHk = 'geschaetzt'; /* vorbelegtes Feld gesehen, aber nie angefasst */
  if (!['eingegeben', 'geschaetzt'].includes(d.kgHk)) d.kgHk = hkKgOf(d);
  if (es === 'new' || es === 'goal') { d.ifd = .04; if (d.rdOff) d.rdMin = 0; else d.rdMin = d.lvl === 'new' || rhyOf(d) === '2:1' ? 2 : 1; d.rdFrom = 1; delete d.rdLog; } /* Punkt 7: Ruhetage für neue Pläne, Verlauf beginnt neu */
  if (es === 'new' || es === 'goal') { if (d.ftpHk === 'geschaetzt' && !(S.edit && S.p && hasStarted(S.p))) d.sanft = 1; else delete d.sanft; }
}
/* Paket C, Punkt 1: geschätzte Werte zeigen. Einstellungen → Gewicht und FTP */
function hkWfNote(){
  const p = S.p || S.d; if (!p) return '';
  const f = hkEst(p) && !noPwr() ? `<p class="text-sm"><b>Dein FTP ist geschätzt.</b> Die App rechnet mit ${Math.round(p.ftp)} W aus deiner Einschätzung. Ein Fitness-Check misst ihn, dann stimmen Wattbereiche und Prognose.</p>` : '';
  const k = hkKgEst(p) ? `<p class="${f ? 'mt-2 ' : ''}text-sm"><b>Dein Gewicht ist ein Standardwert.</b> Die App rechnet mit ${wfFmt(kgOf(p), 0)} kg. Trag dein Gewicht oben ein oder bestätige den Wert.</p><button class="ghost mt-2 !w-auto" style="min-height:44px" onclick="hkKgOk()">Stimmt, ${wfFmt(kgOf(p), 0)} kg</button>` : '';
  return f || k ? `<div class="mt-3 p-3" style="background:#fff6dc;border:1px solid #d9a400">${f}${k}</div>` : '';
}
function hkKgOk(){ hkSet('kgHk', 'eingegeben'); wfMsg = 'Gespeichert.'; wfMsgAt = Date.now(); save(); render(); }
/* Heute: Hinweis, solange der FTP geschätzt ist (Entscheidung 5 B: höchstens einmal pro Woche nach „Später“) */
const hkHm = d => Number(d && d.hm) > 0 ? Number(d.hm) : ((EVS.find(x => x.id === (d && d.evId)) || {}).hm || 0);
function hkHomeCard(){
  const p = S.p; if (!p || !hkEst(p) || noPwr() || (S.hkLater && S.hkLater > addD(iso(0), -7))) return '';
  let nx = 0; try { nx = testsOn(p) || p.test0 ? testWeeks(p).find(w => w >= (S.wk || 1) && !(p.res || {})[w]) || 0 : 0; } catch (e) { elog(e); }
  const kg = hkKgEst(p) && p.goal === 'event' && hkHm(p) > 1500, plan = (!nx || nx > (S.wk || 1) + 1) && hkTestOk(p);
  return `<section class="panel p-4" style="border-left:4px solid #d9a400"><p class="font-semibold">${plan ? 'Dein FTP ist geschätzt, Test einplanen' : 'Dein FTP ist geschätzt'}</p><p class="mt-1 text-sm" style="color:var(--mute)">Die App rechnet mit ${Math.round(p.ftp)} W aus deiner Einschätzung. Bis ein Fitness-Check deinen Wert misst, fährst du die Intervalle nach Gefühl.${nx ? ` Dein Fitness-Check ist in Woche ${nx} eingeplant.` : ''}</p>${kg ? `<p class="mt-1 text-sm" style="color:var(--mute)">Auch dein Gewicht ist ein Standardwert (${wfFmt(kgOf(p), 0)} kg). Bei vielen Höhenmetern hängt die Prognose stark davon ab.</p>` : ''}
    <div class="mt-3 flex flex-wrap gap-2">${plan ? `<button class="btn !w-auto !px-3" style="min-height:44px" onclick="hkPlanTest()">Test einplanen</button>` : ''}${nx ? `<button class="${nx > (S.wk || 1) + 1 ? 'ghost' : 'btn'} !w-auto !px-3" style="min-height:44px" onclick="goPg('ms')">Fitness-Checks ansehen</button>` : ''}${kg ? `<button class="ghost !w-auto !px-3" style="min-height:44px" onclick="wfGo()">Gewicht eintragen</button>` : ''}<button class="ghost !w-auto !px-3" style="min-height:44px" onclick="S.hkLater=iso(0);save();render()">Später</button></div></section>`;
}
/* Korrektur 6: kein „Test einplanen“ bei Krankheits-Folgetagen, Wiedereinstieg, Befinden „krank“ oder „richtig platt“ in den letzten
   48 Std. und in Erholungswochen */
function hkTestOk(p){
  try { const w = S.wk || 1, t = hasStarted(p) ? todayIdx() : 0, pl = S.plan || [], bad = x => x && (x.feel === 'sick' || x.feel === 'heavy');
    if (p.sickNext && p.sickNext.w === w) return false;
    if (reentOf(p, w)) return false;
    if (bad(pl[t]) || (t > 0 ? bad(pl[t - 1]) : S.prevPlan && S.prevPlan.w === w - 1 && bad((S.prevPlan.plan || [])[6]))) return false;
    if (pl.some((x, k) => k < t && x && x.feel === 'sick')) return false;
    const P = phases(p).find(x => w >= x.from && w <= x.to);
    if (recWk(p, w) || (p.recW || []).includes(w) || (P && P.rec)) return false;
  } catch (e) { elog(e); }
  return true;
}
/* Fitness-Check einplanen (Tipp = Zustimmung): diese Woche, wenn noch genug Tage bleiben, sonst nächste Woche. Vorher Schnappschuss. */
function hkPlanTest(){
  const p = S.p; if (!p || !hkTestOk(p)) return; const tot = phases(p).slice(-1)[0].to, cw = S.wk || 1, w = hasStarted(p) && todayIdx() <= 4 ? cw : Math.min(tot, cw + 1);
  try { bkPre('Vor dem Einplanen eines Fitness-Checks'); } catch (e) { elog(e); }
  p.xTests = [...new Set([...(p.xTests || []), w])]; S.d.xTests = p.xTests;
  note('Fitness-Check eingeplant', `Ein Fitness-Check ist in Woche ${w} eingeplant. Danach rechnet der Plan mit deinem gemessenen FTP, wenn du ihn übernimmst.`, -2); save(); render();
}
/* Neuer Wert: Plan und Entwurf gleich halten */
function hkSet(k, v){ if (S.p) S.p[k] = v; if (S.d) S.d[k] = v; }
const wfNum = v =>{ const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
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
  const p = S.p || S.d, fE = hkEst(p) && !noPwr(), kE = hkKgEst(p); /* Paket C: geschätzte Werte kennzeichnen */
  return [c.ftp ? `FTP ${Math.round(c.ftp)} W${fE ? ' (geschätzt)' : ''}` : '', c.kg ? `${wfFmt(c.kg, c.kg % 1 ? 1 : 0)} kg${kE ? ' (geschätzt)' : ''}` : '', w ? `${wfFmt(w, 1)} W/kg` : ''].filter(Boolean).join(' · ');
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
  S.d.weight = kg; if (S.p) S.p.weight = kg; if (dK) hkSet('kgHk', 'eingegeben');
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
    ${hkWfNote()}
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

