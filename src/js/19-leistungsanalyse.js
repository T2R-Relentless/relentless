/* ---------- Leistungsanalyse aus mehreren Fahrten: Critical Power, Effizienz und Entkopplung, Ermüdungsresistenz, Belastung aus Empfinden, Morgenwerte ---------- */
function perfExt(sec1, hr1, tc1, np){
  const o = {}, n = sec1.length, nP = sec1.filter(v => v != null).length, nH = hr1.filter(v => v != null).length;
  const tcs = tc1.filter(v => v != null && v > -30 && v < 60); if (tcs.length > 60) o.tAvg = Math.round(tcs.reduce((a, b) => a + b, 0) / tcs.length);
  if (nH > 300) { let s = 0, c = 0, mx = 0; hr1.forEach(h => { if (h != null) { s += h; c++; if (h > mx) mx = h; } }); o.hrAvg = Math.round(s / c); o.hrMax = Math.round(mx);
    const roll = L => { let q = 0, k = 0, b = 0; for (let i = 0; i < hr1.length; i++) { if (hr1[i] != null) { q += hr1[i]; k++; } if (i >= L && hr1[i - L] != null) { q -= hr1[i - L]; k--; } if (i >= L - 1 && k >= L * .8 && q / k > b) b = q / k; } return b ? Math.round(b) : null; };
    o.hrPk = roll(10); o.h20 = roll(1200);
    /* Struktur für den Schwellenpuls-Test: bester 30-Min.-Abschnitt nach Puls, Anteil der Sekunden deutlich darunter (Pausen zwischen Intervallen) */
    if (n >= 1800) { let q = 0, k = 0, b = 0, bi = -1; for (let i = 0; i < n; i++) { if (hr1[i] != null) { q += hr1[i]; k++; } if (i >= 1800 && hr1[i - 1800] != null) { q -= hr1[i - 1800]; k--; } if (i >= 1799 && k >= 1440 && q / k > b) { b = q / k; bi = i - 1799; } }
      if (bi >= 0) { let lo = 0, c = 0; for (let i = bi + 600; i < bi + 1800; i++) if (hr1[i] != null) { c++; if (hr1[i] < b * .92) lo++; } o.c30h = c ? Math.round(lo / c * 100) : null; } } }
  if (!(nP > .5 * n && n > 60)) return o;
  const v = sec1.map(x => x || 0), best = (arr, len) => { if (arr.length < len) return null; let q = 0, b = 0; for (let i = 0; i < arr.length; i++) { q += arr[i]; if (i >= len) q -= arr[i - len]; if (i >= len - 1 && q > b) b = q; } return Math.round(b / len); };
  const bestAt = len => { if (v.length < len) return null; let q = 0, b = 0, bi = 0; for (let i = 0; i < v.length; i++) { q += v[i]; if (i >= len) q -= v[i - len]; if (i >= len - 1 && q > b) { b = q; bi = i - len + 1; } } let hs = 0, hc = 0; for (let i = bi; i < bi + len; i++) if (hr1[i] != null) { hs += hr1[i]; hc++; } return [Math.round(b / len), hc > len * .8 ? Math.round(hs / hc) : null]; };
  [[180, 'm3'], [420, 'm7'], [720, 'm12'], [1200, 'm20']].forEach(([L, k]) => { const b = bestAt(L); if (b) { if (k !== 'm20') o[k] = b[0]; if (b[1]) o[k + 'h'] = b[1]; } });
  /* Struktur: bester 20-Min.-Abschnitt am Stück? Anteil der Sekunden unter 70 % des Abschnittsmittels. Dazu harte Blöcke über 95 % FTP (60-s-Mittel, mindestens 2,5 Min.) */
  { const ftp0 = (S.p && S.p.ftp) || (S.d && S.d.ftp) || 0;
    if (n >= 1200) { let q = 0, b = 0, bi = 0; for (let i = 0; i < n; i++) { q += v[i]; if (i >= 1200) q -= v[i - 1200]; if (i >= 1199 && q > b) { b = q; bi = i - 1199; } } const av = b / 1200; let lo = 0; for (let i = bi; i < bi + 1200; i++) if (v[i] < av * .7) lo++; o.c20 = Math.round(lo / 12); }
    if (ftp0 > 0) { const blk = []; let q = 0, st = -1; for (let i = 0; i <= n; i++) { if (i < n) { q += v[i]; if (i >= 60) q -= v[i - 60]; } const on = i < n && i >= 59 && q / 60 > ftp0 * .95; if (on && st < 0) st = i - 59; if (!on && st >= 0) { if (i - st >= 150) blk.push(Math.round((i - st - 40) / 10) * 10); st = -1; } } if (blk.length) o.hb = blk.slice(0, 20).join(','); } }
  const sum = v.reduce((a, b) => a + b, 0), avgP = sum / n; o.vi = avgP > 0 && np ? Math.round(np / avgP * 100) / 100 : null; o.kj = Math.round(sum / 1000);
  const kg = (S.p && S.p.weight) || (S.d && S.d.weight) || 75; o.kjkg = Math.round(o.kj / kg * 10) / 10;
  if (n >= 3600 && nH > .8 * n && o.vi && o.vi <= 1.15 && o.hrAvg) {
    const st = 600, mid = st + Math.floor((n - st) / 2), seg = (a, b) => { let ps = 0, hs = 0, c = 0; for (let i = a; i < b; i++) if (hr1[i] != null && sec1[i] != null) { ps += sec1[i]; hs += hr1[i]; c++; } return c > 300 ? [ps / c, hs / c] : null; };
    const h1 = seg(st, mid), h2 = seg(mid, n);
    if (h1 && h2 && h1[1] > 0 && h2[1] > 0 && h2[0] > 0) { o.dec = Math.round(((h1[0] / h1[1]) / (h2[0] / h2[1]) - 1) * 1000) / 10; o.ef = Math.round(np / o.hrAvg * 100) / 100; }
  }
  /* Puls-Leistungs-Paare für die FTP-Hochrechnung: 10-Min.-Abschnitte nach dem Einfahren, gleichmäßig getreten. Als Text gespeichert ("W:Puls,W:Puls"). */
  if (nH > .8 * n && n >= 1800 && !(o.tAvg >= 25) && !(o.dec > 8)) {
    const bl = [];
    for (let s0 = 600; s0 + 600 <= n && bl.length < 18; s0 += 600) {
      let ps = 0, hs = 0, c = 0, z = 0, q = 0, q4 = 0, m = 0;
      for (let k = s0; k < s0 + 600; k++) { const pw = sec1[k], h = hr1[k]; q += v[k]; if (k >= s0 + 30) q -= v[k - 30]; if (k >= s0 + 29) { q4 += (q / 30) ** 4; m++; } if (pw == null || h == null) continue; ps += pw; hs += h; c++; if (pw < 5) z++; }
      if (c < 540 || z > 60) continue; const ap = ps / c, npb = Math.pow(q4 / m, .25); if (ap < 40 || npb / ap > 1.06) continue;
      bl.push(Math.round(ap) + ':' + Math.round(hs / c));
    }
    if (bl.length) o.pb = bl.join(',');
  }
  const lim = 15 * kg * 1000; let cum = 0, idx = -1; for (let i = 0; i < n; i++) { cum += v[i]; if (cum >= lim) { idx = i; break; } }
  if (idx > 0) { const rest = v.slice(idx), b5 = best(rest, 300), b20 = best(rest, 1200); if (b5) o.m5L = b5; if (b20) o.m20L = b20; }
  return o;
}
const PSRC = {martin:'https://doi.org/10.1123/jab.14.3.276', friel:'https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/', leo:'https://link.springer.com/article/10.1007/s00421-021-04833-y', pallares:'https://portalinvestigacion.um.es/documentos/6369349a2558037fa43f8fc4', karsten:'https://repository.canterbury.ac.uk/item/87xwz/validity-and-reliability-of-critical-power-field-testing', mcgrath:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8136559', hunter:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12576026', impell:'https://lida.sport-iat.de/ta/Record/4053214?lng=en', lamberts:'https://bjsm.bmj.com/content/45/10/797', haddad:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663', hrv:'https://lida.sport-iat.de/ta/Record/4079426'};
const pLink = (t, k) => `<a class="underline" target="_blank" rel="noopener" href="${esc(PSRC[k])}">${t}</a>`;
const confPill = l => `<span class="rounded-full px-2 text-xs font-semibold" style="white-space:nowrap;background:${esc(l === 'hoch' ? '#e3f6f0' : l === 'mittel' ? '#fff6dc' : '#eef2f4')};color:${esc(l === 'hoch' ? '#0a8f6a' : l === 'mittel' ? '#9a6a00' : '#5b6f80')}">Sicherheit: ${l}</span>`;
const daysAgo = d => Math.round((new Date(lstr(new Date()) + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5);
function perfRides(maxD){ const m = new Map(); [...(S.hist || []), ...(S.man || [])].forEach(r => { if (r && r.day && daysAgo(r.day) <= maxD) m.set(r.id, r); }); return [...m.values()].sort((a, b) => a.ts.localeCompare(b.ts)); }
/* War die Fahrt wahrscheinlich maximal? Hoher Puls, hohes Empfinden oder Test/Rennen */
function maxEvid(r, k){
  if (r && S.allOut && S.allOut[r.id]) return 'von dir als Vollgas markiert';
  const hm = (S.p && S.p.hrMax) || (S.d && S.d.hrMax) || 0, ev = Object.values((S.p && S.p.exe) || {}).find(e => e.rid === r.id), wh = k ? r[k + 'h'] : null;
  if (hm && wh && wh >= .88 * hm) return 'Puls im Schnitt ' + wh + ' (' + Math.round(wh / hm * 100) + ' % HFmax)';
  if (ev && ev.rpe >= 8) return 'Empfinden ' + ev.rpe + '/10';
  if (ev && ev.x && (ev.x.t === 'test' || ev.x.t === 'race')) return ev.x.t === 'test' ? 'Fitness-Check' : 'Rennen';
  return '';
}
function cpModel(src){
  const rides = src || perfRides(42), pts = [], drop = [], hm = (S.p && S.p.hrMax) || (S.d && S.d.hrMax) || 0;
  [[180, 'm3'], [420, 'm7'], [720, 'm12'], [1200, 'm20']].forEach(([t, k]) => {
    let c = rides.filter(r => r[k] > 0); if (!c.length) return;
    /* Puls unter 80 % der maximalen HF: nicht ausgefahren, auch wenn die Watt die besten waren */
    if (hm) { const low = c.filter(r => r[k + 'h'] && r[k + 'h'] < .8 * hm && !maxEvid(r, k)); if (low.length) { const ok = c.filter(r => !low.includes(r)), b = low.reduce((x, y) => y[k] > x[k] ? y : x); if (!ok.length || b[k] > Math.max(...ok.map(o => o[k]))) drop.push({t, p:b[k], r:b, hr:Math.round(b[k + 'h'] / hm * 100)}); if (!ok.length) return; c = ok; } }
    const ver = c.filter(r => maxEvid(r, k)), pick = (ver.length ? ver : c).reduce((a, b) => b[k] > a[k] ? b : a);
    pts.push({t, p:pick[k], r:pick, ver:!!maxEvid(pick, k), why:maxEvid(pick, k)});
  });
  if (pts.filter(q => q.ver).length >= 3) pts.splice(0, pts.length, ...pts.filter(q => q.ver));
  const fit = P => { const xs = P.map(q => q.t), ys = P.map(q => q.p * q.t), n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; }); const cp = sxy / sxx; return {cp, wp:my - cp * mx, r2:syy ? sxy * sxy / (sxx * syy) : 1}; };
  /* Ein nicht belegter Bestwert, der deutlich unter der Kurve der übrigen liegt, war nicht ausgefahren und bleibt draußen */
  if (pts.length >= 3) for (const q of [...pts].sort((a, b) => b.t - a.t)) { if (q.ver) continue; const o = pts.filter(x => x !== q); if (o.length < 2 || !o.some(x => x.t >= 720)) continue; const f = fit(o); if (f.cp > 0 && q.p < (f.cp + f.wp / q.t) * .92) { pts.splice(pts.indexOf(q), 1); drop.push(q); break; } }
  if (pts.length < 2 || !pts.some(q => q.t >= 720)) return {pts, drop, ok:false};
  const {cp, wp, r2} = fit(pts), plaus = cp > 80 && wp > 4000 && wp < 40000 && cp < Math.min(...pts.map(q => q.p));
  const nv = pts.filter(q => q.ver).length, conf = !plaus ? 'gering' : pts.length >= 3 && nv === pts.length && r2 >= .99 ? 'hoch' : pts.length >= 3 && nv >= 2 ? 'mittel' : 'gering';
  return {pts, drop, ok:plaus, cp:Math.round(cp), wp:Math.round(wp / 100) / 10, r2, conf, nv};
}
/* ---------- FTP aus Fahrten: belegte Vollgas-Werte, Untergrenze und Hochrechnung aus Puls und Leistung ---------- */
/* Lineare Beziehung Watt ~ Puls aus gleichmäßigen Abschnitten, hochgerechnet auf den Schwellenpuls (Idee wie Lamberts et al. 2011: submaximaler Puls sagt die Leistung voraus) */
function hrFtp(rides){
  const L0 = lthrOf(), le = L0 ? null : lthrEst(), L = L0 || (le && le.v) || 0, lsrc = L0 ? 'set' : le ? le.src : '';
  if (!L) return {ok:false, why:'lthr'};
  const pts = [], used = new Set();
  rides.forEach(r => { if (!r.pb || r.tAvg >= 25 || r.dec > 8) return; r.pb.split(',').forEach(x => { const [pw, h] = x.split(':').map(Number); if (pw > 30 && h > 80 && h < 230) { pts.push([h, pw]); used.add(r.id); } }); });
  const n = pts.length, nr = used.size; if (nr < 5 || n < 8) return {ok:false, why:'n', n, nr, L, lsrc};
  const mx = pts.reduce((q, z) => q + z[0], 0) / n, my = pts.reduce((q, z) => q + z[1], 0) / n; let sxx = 0, sxy = 0, syy = 0;
  pts.forEach(([h, pw]) => { sxx += (h - mx) ** 2; sxy += (h - mx) * (pw - my); syy += (pw - my) ** 2; });
  const hmin = Math.min(...pts.map(z => z[0])), hmax = Math.max(...pts.map(z => z[0])), b = sxx ? sxy / sxx : 0, r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  if (b <= 0 || r < .7 || hmax - hmin < 15) return {ok:false, why:'fit', n, nr, L, lsrc, r:Math.round(r * 100) / 100, span:hmax - hmin};
  const ext = Math.round(L - hmax); if (ext > 35) return {ok:false, why:'ext', n, nr, L, lsrc, ext, hmax};
  const v = r5(my + b * (L - mx)), conf = L0 && r >= .85 && nr >= 8 && ext <= 15 ? 'mittel' : 'gering';
  return {ok:true, v, b:Math.round(b * 10) / 10, r:Math.round(r * 100) / 100, n, nr, L, lsrc, ext, hmax, conf};
}
/* Gesamtschätzung. mode: cp (belegte Critical Power), v20 (belegter 20-Min.-Wert), hr (Hochrechnung aus Puls), lb (nur Untergrenze) */
function ftpCalc(rides){
  rides = (rides || []).filter(r => r && r.id); if (!rides.length) return null;
  let cp = null; try { cp = cpModel(rides); } catch (e) { elog(e); }
  const hr = hrFtp(rides);
  let lb = 0, lbR = null, lbK = ''; rides.forEach(r => { if (r.m20 > 0 && r.m20 < 2000 && r.m20 * .95 > lb) { lb = r.m20 * .95; lbR = r; lbK = 'm20'; } if (r.m60 > 0 && r.m60 < 2000 && r.m60 > lb) { lb = r.m60; lbR = r; lbK = 'm60'; } });
  lb = lb ? r5(lb) : 0;
  let ver = null;
  if (cp && cp.ok && cp.nv >= 2 && cp.conf !== 'gering') ver = {v:r5(cp.cp / 1.06), mode:'cp'};
  const v20 = rides.filter(r => r.m20 > 0 && r.m20 < 2000 && maxEvid(r, 'm20')).reduce((a, r) => !a || r.m20 > a.m20 ? r : a, null);
  if (v20 && (!ver || r5(v20.m20 * .95) > ver.v)) ver = {v:r5(v20.m20 * .95), mode:'v20', r:v20, why:maxEvid(v20, 'm20')};
  const base = {cp, hr, lb, lbR, lbK};
  if (ver) return {...base, mode:ver.mode, v:Math.max(ver.v, lb), r:ver.r || lbR, why:ver.why, conf:ver.mode === 'cp' ? cp.conf : 'mittel'};
  if (hr.ok) { const cap = lb ? r5(lb * 1.15) : 0, v = lb ? Math.min(Math.max(hr.v, lb), cap) : hr.v; return {...base, mode:'hr', v, capped:!!lb && hr.v > cap, below:!!lb && hr.v < lb, r:lbR, conf:hr.conf}; }
  if (lb) return {...base, mode:'lb', v:lb, r:lbR, conf:'gering'};
  return null;
}
function aoTog(id){ S.allOut = S.allOut || {}; if (S.allOut[id]) delete S.allOut[id]; else S.allOut[id] = 1; save(); render(); }
/* Stärkste Fahrten mit Knopf "War Vollgas" */
function ftpAoList(rides){
  const c = (rides || []).filter(r => r && r.id && (r.m20 > 0 || r.m12 > 0 || r.m7 > 0)), sc = r => Math.max(r.m20 || 0, (r.m12 || 0) * .97, (r.m7 || 0) * .92);
  const top = [...c].sort((a, b) => sc(b) - sc(a)).slice(0, 5); if (!top.length) return '';
  const row = r => { const w = maxEvid(r, 'm20') || maxEvid(r, 'm12') || maxEvid(r, 'm7'), mine = !!(S.allOut && S.allOut[r.id]), vals = [['m7', 7], ['m12', 12], ['m20', 20]].filter(([k]) => r[k] > 0).map(([k, t]) => `<span>${t} Min.: ${r[k]} W</span>`).join(' · ');
    return `<div class="flex flex-wrap items-center gap-2 py-2" style="border-top:1px solid var(--line)"><span class="min-w-0 flex-1 text-sm"><b data-noi18n>${esc(r.n)}</b> <span style="color:var(--mute)">${fmt(r.day)}</span><span class="block text-xs" style="color:var(--mute)">${vals}${w && !mine ? ` · ✓ <span>${w}</span>` : ''}</span></span><button class="${esc(mine ? 'btn' : 'ghost')} !w-auto !px-3 !py-1.5 text-sm" aria-pressed="${mine}" onclick="aoTog('${ja(r.id)}')">${mine ? '✓ Vollgas' : 'War Vollgas'}</button></div>`; };
  return `<div class="mt-3 p-3" style="border:1px solid var(--line)"><p class="text-sm font-semibold">Welche Fahrten waren Vollgas?</p><p class="mt-1 text-xs" style="color:var(--mute)">Markiere Fahrten, in denen du wirklich am Limit warst, etwa einen Anstieg oder ein Zeitfahren. Ihre Bestwerte zählen dann als belegt, und der FTP wird genauer.</p><div class="mt-2">${top.map(row).join('')}</div></div>`;
}
const ftpConf = f => f.mode === 'lb' ? '' : confPill(f.conf);
/* Text zur Schätzung (Kasten und Erklärung) */
function ftpText(f, kg, long){
  if (!f) return '';
  const lbT = f.lb ? (f.lbR ? (f.lbK === 'm60' ? `${f.lb} W (bester 60-Min.-Wert vom ${fmt(f.lbR.day)})` : `${f.lb} W (bester 20-Min.-Wert ${f.lbR.m20} W × 0,95 vom ${fmt(f.lbR.day)})`) : `${f.lb} W`) : '';
  const why = '<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer" style="color:var(--teal)">Warum nicht einfach die Bestwerte?</summary><p class="mt-1">Im Training und selbst im Rennen fährt man selten wirklich Vollgas: Windschatten, Taktik und Pacing drücken die Werte. Bestwerte aus Fahrten zeigen deshalb, was du gefahren bist, nicht was du kannst, und unterschätzen den FTP eher (' + pLink('Leo et al. 2022', 'leo') + '). Aus reinen Trainingsdaten wichen sie bei Profis um mehr als 5 % von echten Tests ab (' + pLink('Pallarés et al. 2022', 'pallares') + '). Am sichersten ist ein Fitness-Check oder eine als Vollgas markierte Fahrt.</p></details>';
  if (f.mode === 'hr') { const h = f.hr;
    return `<p class="text-sm">Errechnet: <b>${f.v} W</b> (${f1(f.v / kg)} W/kg), hochgerechnet aus Puls und Leistung</p>
      <ul class="mt-2 space-y-1 text-xs" style="color:var(--mute)"><li>Sicher erreicht: <b style="color:var(--ink)">mindestens ${lbT || '–'}</b></li><li>Aus Puls und Leistung: <b style="color:var(--ink)">${h.v} W</b> bei deinem Schwellenpuls ${h.L}${h.lsrc === 'set' ? '' : ' (geschätzt)'}. Grundlage: ${h.n} gleichmäßige 10-Minuten-Abschnitte aus ${h.nr} Fahrten, je Schlag ${exeNum(h.b)} W mehr (Zusammenhang r = ${exeNum(h.r)}).</li>${f.capped ? `<li>Begrenzt auf 15 % über der Untergrenze, damit die Hochrechnung nicht zu weit geht.</li>` : ''}${f.below ? '<li>Die Hochrechnung lag unter deinem sicher erreichten Wert, deshalb gilt die Untergrenze.</li>' : ''}</ul>
      ${long ? `<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer" style="color:var(--teal)">Wie wird hochgerechnet?</summary><p class="mt-1">In gleichmäßigen Abschnitten steigt die Leistung fast linear mit dem Puls. Die App legt eine Gerade durch deine Abschnitte und liest ab, wie viel Watt sie bei deinem Schwellenpuls ergibt. Etwa dort liegt der FTP. Dass submaximaler Puls und Leistung die Ausdauerleistung gut vorhersagen, zeigt etwa der Lamberts-Test (${pLink('Lamberts et al. 2011', 'lamberts')}). Hitze, Müdigkeit und Koffein verschieben den Puls, deshalb zählen heiße Fahrten und Fahrten mit starker Entkopplung nicht.${h.lsrc === 'set' ? '' : ' Trag deinen Schwellenpuls in den Einstellungen ein, dann wird die Schätzung genauer.'}</p></details>` : ''}${why}`; }
  if (f.mode === 'lb') { const h = f.hr, miss = h.why === 'lthr' ? 'Für eine Hochrechnung aus dem Puls fehlen maximale Herzfrequenz oder Schwellenpuls.' : h.why === 'n' ? `Für eine Hochrechnung aus dem Puls braucht die App mindestens 5 Fahrten mit gleichmäßigen Abschnitten mit Watt und Puls (bisher ${h.nr || 0}).` : h.why === 'ext' ? 'Für eine Hochrechnung aus dem Puls warst du zu weit unter deinem Schwellenpuls unterwegs.' : 'Puls und Leistung hängen in deinen Fahrten noch nicht eindeutig genug zusammen, um hochzurechnen.';
    return `<p class="text-sm">Dein FTP liegt bei <b>mindestens ${f.v} W</b> (${f1(f.v / kg)} W/kg)</p><p class="mt-1 text-xs" style="color:var(--mute)">Sicher erreicht: ${lbT}. Weil nicht belegt ist, dass du dabei am Limit warst, liegt dein echter FTP wahrscheinlich höher. ${miss}</p>${why}`; }
  if (f.mode === 'v20') return `<p class="text-sm">Errechnet: <b>${f.v} W</b> (${f1(f.v / kg)} W/kg) aus deinem belegten 20-Minuten-Wert</p><p class="mt-1 text-xs" style="color:var(--mute)">${f.r ? `<span>Fahrt vom ${fmt(f.r.day)}: ${f.r.m20} W × 0,95.</span> <span>Belegt durch:</span> <span>${f.why}</span>` : ''}</p>`;
  return '';
}
const ftpBox2 = (a, d, kg) => { const f = a.best.fe; return `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)"><div class="flex flex-wrap items-center gap-2">${ftpConf(f)}</div>${ftpText(f, kg, false)}${Number(d.ftp) !== a.ftpV ? `<button class="btn !w-auto lbl mt-2" onclick="applyAna('ftp')">${a.ftpV} W als FTP übernehmen</button>` : '<p class="mt-1 text-sm" style="color:var(--ok)">✓ Als FTP übernommen.</p>'}${f.mode === 'lb' ? '<p class="mt-2 text-xs" style="color:var(--mute)">Tipp: Wähl oben „Fitnesstest zu Beginn“ oder markier unten eine Fahrt als Vollgas.</p>' : ''}</div>`; };
function efTrend(){
  const all = perfRides(56).filter(r => r.ef > 0 && r.sec >= 3600), hot = all.filter(r => r.tAvg >= 25), rs = all.filter(r => !(r.tAvg >= 25));
  if (rs.length < 4) return {n:rs.length, hot:hot.length, rs};
  const k = Math.min(3, Math.floor(rs.length / 2)), a = rs.slice(0, k), b = rs.slice(-k), avg = l => l.reduce((s, r) => s + r.ef, 0) / l.length;
  const ch = (avg(b) / avg(a) - 1) * 100, dRec = rs.slice(-3).filter(r => r.dec != null), dec = dRec.length ? dRec.reduce((s, r) => s + r.dec, 0) / dRec.length : null;
  return {n:rs.length, hot:hot.length, rs, ch, dec, conf:rs.length >= 6 ? 'mittel' : 'gering'};
}
function durab(){
  const rs = perfRides(42), fresh = Math.max(0, ...rs.map(r => r.m5 || 0)), long = rs.filter(r => r.m5L > 0);
  if (!fresh || !long.length) return {n:long.length, fresh};
  const b = long.reduce((a, r) => r.m5L > a.m5L ? r : a), kg = (S.p && S.p.weight) || 75;
  return {n:long.length, fresh, best:b, ratio:b.m5L / fresh, kj:Math.round(15 * kg), conf:long.length >= 3 ? 'mittel' : 'gering'};
}
function srpeWeeks(){
  const wk = {}; Object.entries((S.p && S.p.exe) || {}).forEach(([k, e]) => { if (!e.rpe || !e.sec) return; const w = +k.split('-')[0]; wk[w] = wk[w] || {w, s:0, t:0, n:0}; wk[w].s += e.rpe * e.sec / 60; wk[w].t += e.tss || 0; wk[w].n++; });
  return Object.values(wk).filter(x => x.n >= 2 && x.t > 0).sort((a, b) => a.w - b.w).map(x => ({...x, r:x.s / x.t}));
}
/* Morgenwerte: Ruhepuls, HRV (rMSSD), Schlaf. Abweichung vom eigenen Normalbereich */
function morStat(){
  const mo = S.mo || {}, ds = Object.keys(mo).sort(), td = lstr(new Date()), base = ds.filter(d => daysAgo(d) >= 8 && daysAgo(d) <= 37), last7 = ds.filter(d => daysAgo(d) <= 6);
  const out = {flags:[], today:mo[td] || null, nBase:base.length};
  const mean = l => l.reduce((a, b) => a + b, 0) / l.length, sd = l => { const m = mean(l); return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, l.length - 1)); };
  const bH = base.map(d => mo[d].hr).filter(x => x > 0); if (bH.length >= 7 && out.today && out.today.hr > 0) { out.hrBase = Math.round(mean(bH)); if (out.today.hr >= out.hrBase + 5) out.flags.push(`Ruhepuls ${out.today.hr} statt üblich etwa ${out.hrBase}`); }
  const bV = base.map(d => mo[d].hrv).filter(x => x > 0).map(Math.log), cV = last7.map(d => mo[d].hrv).filter(x => x > 0).map(Math.log);
  if (bV.length >= 7 && cV.length >= 3) { out.hrvLow = mean(cV) < mean(bV) - .5 * sd(bV); out.hrvBase = Math.round(Math.exp(mean(bV))); out.hrv7 = Math.round(Math.exp(mean(cV))); if (out.hrvLow) out.flags.push(`HRV im 7-Tage-Schnitt ${out.hrv7} ms, unter deinem Normalbereich (etwa ${out.hrvBase} ms)`); }
  if (out.today && out.today.sleep === 'bad') out.flags.push('schlecht geschlafen');
  return out;
}
let moMsg = '';
function morSave(){
  const g = id => { const el = document.getElementById(id); return el ? Math.round(Number(el.value)) || 0 : 0; }, hr = g('moHr'), hrv = g('moHrv'), td = lstr(new Date());
  if (hr && (hr < 30 || hr > 120)) { moMsg = 'Bitte einen Ruhepuls zwischen 30 und 120 eintragen.'; return render(); }
  if (hrv && (hrv < 5 || hrv > 250)) { moMsg = 'Bitte eine HRV zwischen 5 und 250 ms eintragen.'; return render(); }
  S.mo = S.mo || {}; S.mo[td] = {...(S.mo[td] || {}), ...(hr ? {hr} : {}), ...(hrv ? {hrv} : {})}; moMsg = ''; save(); render();
}
function morSleep(v){ const td = lstr(new Date()); S.mo = S.mo || {}; S.mo[td] = {...(S.mo[td] || {}), sleep:v}; save(); render(); }
function morToggle(){ S.moOn = !S.moOn; save(); render(); }
function morSkipToday(){ S.moHide = lstr(new Date()); save(); render(); }
function morCard(compact){
  const st = morStat(), t = st.today || {}, SL = [['good', 'Gut geschlafen'], ['ok', 'Geht so'], ['bad', 'Schlecht']];
  const inp = `<div class="flex flex-wrap items-end gap-2"><label class="block"><span class="mb-1 block text-xs" style="color:var(--mute)">Ruhepuls</span><input id="moHr" type="number" inputmode="numeric" class="inp !py-2" style="width:84px" placeholder="52" value="${esc(t.hr || '')}"></label><label class="block"><span class="mb-1 block text-xs" style="color:var(--mute)">HRV (ms, optional)</span><input id="moHrv" type="number" inputmode="numeric" class="inp !py-2" style="width:84px" placeholder="65" value="${esc(t.hrv || '')}"></label><button class="ghost !py-2 text-sm" onclick="morSave()">Speichern</button></div>
    <div class="mt-2 flex flex-wrap gap-1.5">${SL.map(([k, l]) => `<button class="text-sm" style="padding:6px 10px;border:1px solid ${esc(t.sleep === k ? 'var(--ice)' : 'var(--line)')};background:${esc(t.sleep === k ? '#e6f7f6' : '#fff')}" onclick="morSleep('${ja(k)}')">${l}</button>`).join('')}</div>${moMsg ? `<p class="mt-1 text-sm" style="color:#c0392b">⚠ ${esc(moMsg)}</p>` : ''}`;
  if (compact) return `<div class="panel p-4"><div class="flex items-center gap-2"><p class="flex-1 font-semibold">Morgenwerte</p><button class="text-sm" style="color:var(--mute);background:none;border:0;padding:0 2px" aria-label="Für heute ausblenden" onclick="morSkipToday()">✕</button></div><p class="mb-2 text-xs" style="color:var(--mute)">Am besten direkt nach dem Aufwachen, liegend, jeden Tag gleich.</p>${inp}<button class="mt-3 text-xs underline" style="color:var(--mute);background:none;border:0;padding:0" onclick="morToggle()">Nicht mehr auf der Startseite anzeigen</button><p class="mt-1 text-xs" style="color:var(--mute)">Wieder einschalten: Fortschritt → FTP und Leistung → Morgenwerte.</p></div>`;
  const n = Object.keys(S.mo || {}).length;
  return `<div><p class="text-sm" style="color:var(--mute)">Trag morgens Ruhepuls und, falls deine Uhr oder dein Brustgurt sie misst, die HRV (rMSSD) ein, dazu wie du geschlafen hast. Nach etwa zwei Wochen kennt die App deinen Normalbereich und erkennt Abweichungen.</p><div class="mt-3">${inp}</div>
    <p class="mt-3 text-sm">${st.flags.length ? `<b style="color:#9a6a00">Auffällig:</b> ${st.flags.map(f => `<span>${f}</span>`).join(', ')}. Ein einzelner Wert ist kein Beweis, aber zusammen mit deinem Befinden ein guter Hinweis, es heute ruhiger angehen zu lassen.` : st.nBase >= 7 ? 'Deine Werte liegen im Normalbereich.' : `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}. Für den Normalbereich braucht die App mindestens 7 Tage aus den Wochen davor.`}</p>
    <label class="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" ${S.moOn ? 'checked' : ''} onchange="morToggle()"> Eingabe auf der Startseite anzeigen</label>
    <p class="mt-2 text-xs" style="color:var(--mute)">Grundlage: HRV-gesteuertes Training und das Erkennen von Überlastung sind gut beschrieben (${pLink('Int J Sports Med 2023', 'hrv')}). Die App vergleicht den 7-Tage-Schnitt der HRV mit deinem Normalbereich (Mittelwert ± halbe Standardabweichung) und den Ruhepuls mit deinem Mittel (Hinweis ab +5 Schläge). Nur sinnvoll bei täglich gleicher Messung.</p></div>`;
}
/* Startseite: Hinweis bei auffälligen Morgenwerten und harter Einheit */
function morHint(){
  if (!S.p || !hasStarted(S.p) || !S.plan) return ''; const st = morStat(), t = todayIdx(), x = S.plan[t];
  const ask = S.moOn && S.moHide !== lstr(new Date()) && !(st.today && (st.today.hr || st.today.hrv || st.today.sleep)) ? morCard(true) : '';
  if (!st.flags.length || !x || !HARD.includes(x.t) || S.done[t] || x.adapted || S.moSkip === lstr(new Date())) return ask;
  return ask + `<div class="panel p-4" style="border-left:4px solid #d9a400"><p class="font-semibold">Erholung vielleicht noch nicht komplett</p><p class="mt-1 text-sm">${st.flags.map(f => `<span>${f}</span>`).join(', ')}. Ein einzelner Morgenwert ist kein Beweis. Fühlst du dich auch schlapp, ist heute locker die bessere Wahl.</p>
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto lbl !py-2" onclick="easyDay(${ja(t)})">Heute locker statt hart</button><button class="ghost !py-2 text-sm" onclick="S.moSkip=lstr(new Date());save();render()">Plan so lassen</button></div></div>`;
}
function spark(vals){ if (vals.length < 2) return ''; const mn = Math.min(...vals), mx = Math.max(...vals), W = 220, H = 40, xs = i => 4 + i * (W - 8) / (vals.length - 1), ys = v => H - 4 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (H - 8);
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" style="max-width:100%"><polyline points="${vals.map((v, i) => xs(i).toFixed(1) + ',' + ys(v).toFixed(1)).join(' ')}" fill="none" stroke="var(--teal)" stroke-width="2"/>${vals.map((v, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(v).toFixed(1)}" r="2.5" fill="var(--teal)"/>`).join('')}</svg>`; }
function perfPage(part){
  const p = S.p, kg = kgOf(p), fr = perfRides(60), fe = ftpCalc(fr), cp = (fe && fe.cp) || cpModel(fr), ef = efTrend(), du = durab(), sw = srpeWeeks(), blk = (t, conf, body) => `<div class="pt-4" style="border-top:1px solid var(--line)"><div class="flex flex-wrap items-center justify-between gap-2"><p class="font-semibold">${t}</p>${conf ? confPill(conf) : ''}</div>${body}</div>`;
  const ftpSug = !fe ? '' : (() => { const d = Math.round((fe.v / p.ftp - 1) * 100), can = fe.mode === 'lb' ? fe.v > p.ftp : fe.conf !== 'gering' || fe.mode === 'v20';
    return `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)"><div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-semibold">FTP-Schätzung aus deinen Fahrten</p>${ftpConf(fe)}</div>${fe.mode === 'cp' ? `<p class="text-sm">Errechnet: <b>${fe.v} W</b> aus deiner Critical Power (${cp.cp} W ÷ 1,06, ${pLink('McGrath et al. 2021', 'mcgrath')}).</p>` : ftpText(fe, kg, true)}
      <p class="mt-2 text-sm">Im Plan stehen ${p.ftp} W.</p>${can && Math.abs(d) >= 3 ? `<button class="btn !w-auto lbl mt-2 !py-2" onclick="setFtpNow(${ja(fe.v)})">FTP auf ${fe.v} W setzen (${d > 0 ? '+' : ''}${d} %)</button>` : !can && d >= 3 ? '<p class="mt-1 text-xs" style="color:var(--mute)">Für einen Vorschlag ist die Schätzung noch zu unsicher. Trag deinen Schwellenpuls ein, markier Vollgas-Fahrten oder mach einen Fitness-Check.</p>' : ''}</div>`; })();
  const cpB = (!cp || !cp.ok ? `<p class="mt-1 text-sm" style="color:var(--mute)">${cp && cp.pts.length ? 'Noch zu wenige oder unplausible Bestwerte.' : 'Noch keine Fahrten mit Leistungsdaten.'} Die App braucht aus den letzten Wochen harte, gleichmäßige Anstrengungen über etwa 3, 7 und 12 Minuten (z. B. Intervalle, Anstiege, Rennen oder ein Fitness-Check).</p>`
    : `<p class="mt-1"><span class="hd text-2xl">${cp.cp} W</span> <span class="text-sm" style="color:var(--mute)">Critical Power · ${f1(cp.cp / kg)} W/kg · W′ ${f1(cp.wp)} kJ</span></p>
      <ul class="mt-2 space-y-1 text-sm">${cp.pts.map(q => `<li>${Math.round(q.t / 60)} Min.: <b>${q.p} W</b> · <span data-noi18n>${esc(q.r.n)}</span>, ${fmt(q.r.day)} · ${q.ver ? '✓ ' + q.why : '<span style="color:#9a6a00">nicht sicher maximal</span>'}</li>`).join('')}${(cp.drop || []).map(q => `<li style="color:var(--mute)"><s>${Math.round(q.t / 60)} Min.: ${q.p} W</s> · nicht ausgefahren${q.hr ? ` (Puls ${q.hr} % HFmax)` : ''}, nicht berücksichtigt</li>`).join('')}</ul>`);
  const ftpAo = ftpAoList(fr);
  const cpInfo = `<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer" style="color:var(--teal)">Wie wird das berechnet?</summary><p class="mt-1">Lineares Arbeit-Zeit-Modell: Für jede Dauer ist die geleistete Arbeit = CP × Zeit + W′. Aus den besten Werten über 3, 7, 12 (und 20) Minuten der letzten 6 Wochen ergibt sich die Gerade. Aus Trainings- und Renndaten bestimmt, weicht CP im Mittel etwa 5 % vom Labortest ab (${pLink('Karsten et al. 2015', 'karsten')}). Ein Bestwert gilt als sicher maximal, wenn dein Puls in diesem Abschnitt im Schnitt über 88 % deiner maximalen Herzfrequenz lag, du die Einheit mit 8 oder mehr von 10 bewertet hast, du die Fahrt als Vollgas markiert hast oder es ein Test oder Rennen war. Nicht belegte Bestwerte unterschätzen die Leistung eher (${pLink('Leo et al. 2022', 'leo')}). Ohne belegte Werte nutzt die App sie deshalb nur als Untergrenze und rechnet zusätzlich aus Puls und Leistung auf deinen Schwellenpuls hoch.</p></details>`;
  const efB = ef.n < 4 ? `<p class="mt-1 text-sm" style="color:var(--mute)">Dafür braucht die App mindestens 4 lockere, gleichmäßige Fahrten ab 60 Minuten mit Watt und Puls aus den letzten 8 Wochen (bisher ${ef.n}${ef.hot ? `, dazu ${ef.hot} heiße Fahrten über 25 °C, die nicht zählen` : ''}).</p>`
    : `<div class="mt-1 flex flex-wrap items-center gap-3">${spark(ef.rs.map(r => r.ef))}<span class="text-sm"><b>${ef.ch >= 0 ? '+' : ''}${Math.round(ef.ch)} %</b> Watt pro Herzschlag</span></div>
      <p class="mt-1 text-sm">${ef.ch >= 3 ? 'Deine aerobe Effizienz steigt: Bei gleichem Puls trittst du mehr Watt. Das ist ein gutes Zeichen für deine Grundlagenausdauer.' : ef.ch <= -3 ? 'Deine aerobe Effizienz sinkt. Häufige Gründe sind Müdigkeit, eine Pause, wenig Schlaf oder zu wenig Essen und Trinken. Achte auf Erholung.' : 'Deine aerobe Effizienz ist stabil.'}${ef.dec != null ? ` Entkopplung in den letzten Fahrten: im Schnitt ${f1(ef.dec)} %. ${ef.dec <= 5 ? 'Dein Puls bleibt bei gleicher Leistung stabil, die Grundlage trägt über diese Dauer.' : 'Dein Puls steigt in der zweiten Hälfte deutlich. Mehr lange, ruhige Fahrten und genug Trinken helfen.'}` : ''}</p>
      ${ef.hot ? `<p class="mt-1 text-xs" style="color:var(--mute)">${ef.hot} ${ef.hot === 1 ? 'Fahrt' : 'Fahrten'} über 25 °C nicht berücksichtigt, weil Hitze den Puls auch ohne Formverlust steigen lässt.</p>` : ''}`;
  const efInfo = `<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer" style="color:var(--teal)">Wie wird das berechnet?</summary><p class="mt-1">Effizienzfaktor = Normalized Power ÷ Durchschnittspuls, nur bei gleichmäßigen Fahrten ab 60 Minuten. Entkopplung = Verhältnis Watt pro Puls in der ersten zur zweiten Hälfte, ohne die ersten 10 Minuten. Training hat eine äußere (Watt) und eine innere Seite (Puls, Empfinden), erst beides zusammen zeigt die Anpassung (${pLink('Impellizzeri et al. 2019', 'impell')}). Leistung bei festgelegtem Puls ist ein zuverlässiger Fitnessmarker (${pLink('Lamberts et al. 2011', 'lamberts')}). Die 5-%-Grenze für die Entkopplung ist ein Erfahrungswert aus der Praxis.</p></details>`;
  const duB = !du.best ? `<p class="mt-1 text-sm" style="color:var(--mute)">Dafür braucht es lange Fahrten mit Leistungsdaten, in denen du nach etwa ${Math.round(15 * kg)} kJ Arbeit (15 kJ pro kg, bei dir rund ${hStd(15 * kg / 650)} Std. ruhiges Fahren) noch einmal 5 Minuten hart fährst, z. B. am letzten Anstieg.</p>`
    : `<p class="mt-1 text-sm">Nach ${du.kj} kJ Arbeit hast du noch <b>${Math.round(du.ratio * 100)} %</b> deiner frischen 5-Minuten-Bestleistung erreicht (${du.best.m5L} von ${du.fresh} W, <span data-noi18n>${esc(du.best.n)}</span>).</p>
      <p class="mt-1 text-sm">${du.ratio >= .95 ? 'Sehr gut: Du verlierst kaum Leistung, wenn es lang wird.' : du.ratio >= .88 ? 'Solide. Mit harten Abschnitten am Ende langer Fahrten lässt sich das weiter verbessern.' : 'Hier liegt Potenzial, vor allem für lange Events: harte Abschnitte am Ende langer Fahrten, Verpflegung wie im Rennen.'} Niedrige Werte können auch bedeuten, dass du am Ende einfach nicht voll gefahren bist.</p>`;
  const duInfo = `<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer" style="color:var(--teal)">Warum ist das wichtig?</summary><p class="mt-1">Ermüdungsresistenz (Durability) gilt neben VO2max, Effizienz und Schwelle als vierte Säule der Ausdauerleistung. Bei langen Rennen entscheidet sie oft, wer vorn bleibt. Die Messmethoden sind noch nicht einheitlich, Ernährung und Hitze haben großen Einfluss (${pLink('Hunter et al. 2025', 'hunter')}). Die Grenzen 95 % und 88 % sind Orientierungswerte der App.</p></details>`;
  const swB = sw.length < 2 ? `<p class="mt-1 text-sm" style="color:var(--mute)">Bewerte nach dem Hochladen deine Einheiten mit 1 bis 10. Ab zwei Wochen mit je mindestens zwei bewerteten Einheiten vergleicht die App, wie sich gleiche Belastung anfühlt.</p>`
    : (() => { const last = sw[sw.length - 1], prev = sw.slice(0, -1).slice(-3), pr = prev.reduce((a, b) => a + b.r, 0) / prev.length, ch = (last.r / pr - 1) * 100;
      return `<table class="wtab mt-2"><thead><tr><th>Woche</th><th>Empfinden × Min.</th><th>TSS</th><th>Verhältnis</th></tr></thead><tbody>${sw.slice(-4).map(x => `<tr><td>${x.w}</td><td>${Math.round(x.s)}</td><td>${Math.round(x.t)}</td><td>${f1(x.r)}</td></tr>`).join('')}</tbody></table>
      <p class="mt-2 text-sm">${ch >= 20 ? 'Die Einheiten fühlen sich diese Woche deutlich härter an als die gemessene Belastung erwarten lässt. Das ist oft ein frühes Zeichen von Ermüdung: Schlaf, Essen und ein lockerer Tag helfen.' : ch <= -20 ? 'Gleiche Belastung fühlt sich leichter an als zuletzt. Ein gutes Zeichen für deine Form.' : 'Empfinden und gemessene Belastung passen zusammen.'}</p>`; })();
  const swInfo = `<details class="mt-2 text-xs" style="color:var(--mute)"><summary class="cursor-pointer" style="color:var(--teal)">Wie wird das berechnet?</summary><p class="mt-1">Session-RPE nach Foster: Empfinden (1–10) × Dauer in Minuten. Die Methode ist gut untersucht und zuverlässig (${pLink('Haddad et al. 2017', 'haddad')}). Die App vergleicht das Verhältnis zum TSS der Woche mit den Wochen davor. Ein Hinweis kommt ab 20 % Abweichung, das ist ein Orientierungswert.</p></details>`;
  if (part === 'parts') return {cp, ef, du, sw, fe, kg, ftpSug, ao:ftpAo, cpB:cpB + cpInfo, efB:efB + efInfo, duB:duB + duInfo, swB:swB + swInfo, conf:{cp:cp && cp.ok ? cp.conf : '', ef:ef.n >= 4 ? ef.conf : '', du:du.best ? du.conf : '', sw:sw.length >= 2 ? 'mittel' : ''}};
  return `<section class="panel p-5"><p class="hd text-xl font-semibold">Leistungsanalyse</p><p class="mt-1 text-sm" style="color:var(--mute)">Aus allen hochgeladenen Fahrten der letzten Wochen, mit Watt, Puls und deinem Empfinden zusammen. Den Plan ändert die App nur auf deinen Wunsch und nie wegen einer einzelnen Fahrt.</p>
    ${ftpSug}${ftpAo}<div class="mt-4 space-y-4">${blk('Schwelle aus deiner Leistungskurve', cp.ok ? cp.conf : '', cpB + cpInfo)}${blk('Aerobe Effizienz und Entkopplung', ef.n >= 4 ? ef.conf : '', efB + efInfo)}${blk('Ermüdungsresistenz', du.best ? du.conf : '', duB + duInfo)}${blk('Belastung aus deinem Empfinden', sw.length >= 2 ? 'mittel' : '', swB + swInfo)}${blk('Morgenwerte (optional)', '', morCard(false))}</div></section>`;
}

