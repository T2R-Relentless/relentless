/* ---------- Fitness-Analyse aus früheren Fahrten (optional, vor der Plan-Erstellung) ---------- */
let histMsg = [], histBusy = false;
async function readRideFile(f){
  const {name, data} = await unpack(await f.arrayBuffer(), f.name); let r;
  if (data[8] === 0x2E && data[9] === 0x46 && data[10] === 0x49 && data[11] === 0x54) r = parseFIT(data);
  else { const x = new DOMParser().parseFromString(new TextDecoder().decode(data), 'application/xml'); if (x.getElementsByTagName('parsererror').length) throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind FIT, GPX und TCX.'); r = x.getElementsByTagName('gpx').length ? parseGPX(x) : x.getElementsByTagName('TrainingCenterDatabase').length ? parseTCX(x) : (() => { throw new Error('Das Dateiformat wird nicht unterstützt. Erlaubt sind FIT, GPX und TCX.'); })(); }
  return summarize(r, name);
}
async function uploadHist(inp){
  const files = [...(inp.files || [])]; histMsg = []; histBusy = true; S.hist = S.hist || []; render();
  for (const f of files) {
    try {
      const a = await readRideFile(f);
      if (Date.now() - new Date(a.ts) > 190 * 864e5) { histMsg.push([f.name, 'ist älter als 26 Wochen und wird nicht berücksichtigt', false]); continue; }
      if (S.hist.some(m => m.id === a.id)) { histMsg.push([f.name, 'bereits hochgeladen', false]); continue; }
      S.hist.push({...Object.fromEntries(Object.entries(a).filter(([k, v]) => v == null || typeof v !== 'object')), np:a.np || 0, m1:a.m1 || null, m5:a.m5 || null, m20:a.m20 || null, m60:a.m60 || null});
      histMsg.push([f.name, `${a.km.toLocaleString('de-DE')} km, ${mm(Math.round(a.sec / 60))}${a.m20 ? ', mit Leistungsdaten' : a.np ? '' : ', ohne Leistungsdaten'}`, true]);
    } catch (e) { histMsg.push([f.name, (e && e.message) || 'konnte nicht gelesen werden', false]); }
  }
  S.hist.sort((a, b) => b.ts.localeCompare(a.ts)); histBusy = false; inp.value = ''; save(); render();
  if (histMsg.some(m => m[2])) track('fahrten-einstieg-hochgeladen');
}
function clearHist(){ S.hist = []; histMsg = []; if (S.d) { delete S.d.startH; delete S.d.longMin; } save(); render(); }

/* ---------- Leistungsbestwerte aus der Sekundenreihe ---------- */
function pBests(w, t){
  const sec1 = []; for (let i = 1; i < t.length; i++) { const dt = t[i] - t[i - 1]; if (dt <= 0 || dt > 30) continue; for (let k = 0; k < dt; k++) sec1.push(w[i] || 0); }
  const r = {}; [[60, 'm1'], [300, 'm5'], [1200, 'm20'], [3600, 'm60']].forEach(([n, k]) => { if (sec1.length >= n) { let q = 0, b = 0; for (let i = 0; i < sec1.length; i++) { q += sec1[i]; if (i >= n) q -= sec1[i - n]; if (i >= n - 1 && q > b) b = q; } r[k] = Math.round(b / n); } });
  return r;
}
/* ---------- Woher kommt der FTP? Selbst eintragen, aus Fahrten errechnen oder Fitnesstest zu Beginn ---------- */
function setFtpSrc(k){ const was = S.d.ftpSrc; S.d.ftpSrc = k; S.d.test0 = k === 'test' || (k === 'nopwr' && S.d.npTest !== false); if (k === 'nopwr') S.d.noPwr = true; else if (was === 'nopwr') S.d.noPwr = false; save(); render(); track('ftp-quelle-' + String(k || '').replace(/[^a-z]/g, '')); }
function togNoPwrL(){ const on = !S.d.noPwr; S.d.noPwr = on; if (on) { S.d.ftpSrc = 'nopwr'; if (!S.d.lthr) S.d.test0 = true; } else if (S.d.ftpSrc === 'nopwr') S.d.ftpSrc = S.d.test0 ? 'test' : 'manual'; save(); render(); }
function togTest0(){ S.d.test0 = !S.d.test0; save(); render(); }
const t0W = p => { if (!p.test0) return 0; const so = startOff(p); let slot = false; try { slot = [0, 1, 2, 3, 4, 5, 6].some(j => j >= so && p.avail[j] && capOf(p, j) >= 55); } catch (e) { elog(e); slot = true; } return 7 - so >= 3 && slot ? 1 : 2; };
/* ---------- Wattmesser schon bei der Planerstellung abfragen: immer, mal mit und mal ohne, ohne ---------- */
const pwmOf = d => d.noPwr ? 'off' : d.pwMix ? 'mix' : 'on';
function pwSel(m, quick){
  const d = S.d; d.pwMix = m === 'mix';
  if (quick) { if (m === 'off') { if (!d.noPwr) togNoPwrL(); return; } if (d.noPwr) { togNoPwrL(); return; } d.noPwr = false; save(); render(); return; }
  if (m === 'off') { setFtpSrc('nopwr'); return; }
  if (d.ftpSrc === 'nopwr') { setFtpSrc('test'); return; }
  d.noPwr = false; save(); render();
}
function pwAsk(d, quick){
  const m = pwmOf(d), f = k => `pwSel('${ja(k)}',${ja(quick ? 1 : 0)})`;
  return `<p class="mb-2 font-semibold">Fährst du mit Wattmesser?</p><div class="space-y-2">`
    + lopt(m === 'on', f('on'), 'Ja, immer', 'Die Einheiten zeigen Wattbereiche, dazu den Puls.')
    + lopt(m === 'mix', f('mix'), 'Mal mit, mal ohne', 'Zum Beispiel nur auf der Rolle oder nur am Rennrad. Die App zeigt Watt und Puls, pro Tag stellst du „Ohne Wattmesser“ ein.')
    + lopt(m === 'off', f('off'), 'Nein', 'Die Einheiten zeigen Pulsbereiche und Empfinden statt Watt.')
    + `</div><p class="mt-2 text-xs" style="color:var(--mute)">Lässt sich später unter Einstellungen → Herzfrequenz und Leistungsmesser ändern.</p>`;
}
function pwMixHr(d){
  const le = lthrEst();
  return `<div class="mt-3 p-3" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><p class="text-sm font-semibold">Für Tage ohne Wattmesser: dein Schwellenpuls</p><p class="mt-1 text-xs" style="color:var(--mute)">Dann zeigt die App an diesen Tagen deinen persönlichen Pulsbereich. Kennst du ihn nicht, schätzt die App ihn aus deinen Fahrten mit Puls, bis dahin gilt das Empfinden.</p>
    <div class="mt-2">${field('Schwellenpuls, falls bekannt', `<input type="number" inputmode="numeric" class="inp" value="${esc(d.lthr || '')}" placeholder="${esc(le ? le.v : 'z. B. 165')}" onchange="setHr('lthr',this.value)">`)}</div>${!d.lthr && le ? `<p class="mt-1 text-xs" style="color:var(--mute)">Aus deinen Fahrten geschätzt: etwa ${le.v}. <button class="underline" onclick="setHr('lthr',${ja(le.v)})">Übernehmen</button></p>` : ''}</div>`;
}
function ftpSrcUi(d){
  const src = d.ftpSrc || 'manual', kg = kgOf(d), a = anaCalc();
  const card = (k, t, sub, rec) => `<button onclick="setFtpSrc('${ja(k)}')" class="panel flex w-full flex-col items-start gap-0.5 p-3 text-left" style="flex-direction:column;${esc(src === k ? 'border-color:var(--ice);background:#e6f7f6' : '')}"><span class="flex flex-wrap items-center gap-2"><span class="font-semibold">${t}</span>${rec ? '<span class="recb">Empfohlen</span>' : ''}</span><span class="text-sm" style="color:var(--mute)">${sub}</span></button>`;
  const ftpF = l => field(l, `<input type="number" inputmode="numeric" class="inp" value="${esc(d.ftp)}" oninput="draft('ftp',this.value)">`) + `<p id="wk" class="mt-1 text-sm" style="color:var(--mute)">${wkgHtml(d)}</p>`;
  let inner = '';
  if (src === 'nopwr') inner = npUi(d);
  else if (src === 'manual') inner = ftpF('Dein FTP (W)') + '<p class="mt-1 text-xs" style="color:var(--mute)">Aus einem FTP-Test, Zwift, Garmin oder einer Leistungsdiagnostik. Ab Woche 5 prüft die App mit Fitness-Checks, ob du auf Kurs bist.</p>';
  else if (src === 'data') { const box = a && a.ftpV && a.best.mode && a.best.mode !== 'cp' ? ftpBox2(a, d, kg) : a && a.ftpV ? `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)">${a.best.cp ? `<div class="flex flex-wrap items-center gap-2"><p class="text-sm">Errechnet: <b>${a.ftpV} W</b> (${f1(a.ftpV / kg)} W/kg) aus deiner Leistungskurve</p>${confPill(a.best.cp.conf)}</div><p class="mt-1 text-xs" style="color:var(--mute)">Critical Power ${a.best.cp.cp} W aus deinen Bestwerten der letzten 90 Tage: <span data-noi18n>${a.best.cp.pts.map(q => Math.round(q.t / 60) + (lang() === 'en' ? ' min: ' : ' Min.: ') + q.p + ' W' + (q.ver ? ' ✓' : '')).join(', ')}</span>. Der FTP liegt im Mittel rund 6 % darunter.${(a.best.cp.drop || []).length ? ` Nicht berücksichtigt, weil offenbar nicht ausgefahren (Puls zu niedrig oder Wert deutlich unter deiner übrigen Kurve): <span data-noi18n>${a.best.cp.drop.map(q => Math.round(q.t / 60) + (lang() === 'en' ? ' min: ' : ' Min.: ') + q.p + ' W').join(', ')}</span>.` : ''}</p>` : `<p class="text-sm">Errechnet: <b>${a.ftpV} W</b> (${f1(a.ftpV / kg)} W/kg) aus „${esc(a.best.a.n)}“ vom ${fmt(a.best.a.day)}.</p>`}${Number(d.ftp) !== a.ftpV ? `<button class="btn !w-auto lbl mt-2" onclick="applyAna('ftp')">${a.ftpV} W als FTP übernehmen</button>` : '<p class="mt-1 text-sm" style="color:var(--ok)">✓ Als FTP übernommen.</p>'}<p class="mt-2 text-xs" style="color:var(--mute)">${a.best.cp ? (a.best.cp.conf === 'gering' ? 'Die Sicherheit ist gering, weil nicht sicher ist, ob die Bestwerte wirklich ausgefahren waren. Ein Fitnesstest zu Beginn macht den Wert verlässlich.' : 'Je mehr harte, gleichmäßige Anstrengungen (Intervalle, Anstiege, Rennen) in deinen Fahrten stecken, desto genauer wird der Wert.') : 'Für die genauere Methode fehlen harte Anstrengungen über etwa 3, 7 und 12 Minuten, deshalb nutzt die App hier den besten 20-Minuten-Wert. Das stimmt nur, wenn du in dieser Fahrt wirklich am Limit warst. Sonst liegt dein echter FTP höher. Dann hilft ein Fitnesstest zu Beginn.'}</p></div>` : ''; inner = gmCard('hist') + anaBody(box + (S.hist ? ftpAoList((S.hist || []).filter(r => daysAgo(r.day) <= 90)) : '') + hrBox()) + `<div class="mt-4">${ftpF('FTP im Plan (W)')}</div>`; }
  else { const w1 = t0W({...d, start:mondayOf(sdOf(d)), startDate:sdOf(d)}); inner = `<p class="text-sm">Die App plant in <b>Woche ${w1}</b> einen 20-Minuten-Test ein. Bis dahin rechnet sie mit einem Schätzwert. Nach dem Test übernimmst du dein Ergebnis mit einem Klick, dann passen sich alle Wattvorgaben und die Prognose an.</p><p class="mt-2 text-xs" style="color:var(--mute)">Mit Leistungsmesser ist der Test der genaueste Weg. Wichtig: Teil die 20 Minuten gleichmäßig ein und starte nicht zu schnell, sonst fällt der Wert zu niedrig aus. Noch genauer ist eine Leistungsdiagnostik mit Laktatmessung.</p>
      <p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Schätzwert nach deinem Niveau:</p><div class="flex flex-wrap gap-2">${Object.entries(LVL).map(([k, v]) => { const f = Math.round(v[1] * lvlF(d) * kg / 5) * 5; return chip(v[0] + ' · ' + f + ' W', Number(d.ftp) === f, `draft('ftp',${ja(f)});render()`); }).join('')}</div>
      <div class="mt-3">${ftpF('Schätzwert bis zum Test (W)')}</div>`; }
  if (src === 'nopwr') return `<section class="panel p-4">${pwAsk(d)}</section><section class="panel mt-4 p-4"><p class="font-semibold">Training nach Puls</p><div class="mt-2">${inner}</div></section>`;
  return `<section class="panel p-4">${pwAsk(d)}</section><section class="panel mt-4 p-4"><p class="font-semibold">Dein FTP: Woher soll er kommen?</p><p class="mt-1 text-sm" style="color:var(--mute)">Der FTP ist die Leistung, die du etwa eine Stunde halten kannst. Alle Wattvorgaben und die Prognose richten sich danach.</p>
    <div class="mt-3 space-y-2">${card('test', 'Fitnesstest zu Beginn', 'Am genauesten mit Leistungsmesser: in der ersten Woche, bis dahin ein Schätzwert', true)}${card('manual', 'Ich kenne meinen FTP', 'Selbst eintragen, etwa aus einem aktuellen Test')}${card('data', 'Aus meinen Fahrten errechnen', 'Aus hochgeladenen Dateien, eher zu niedrig')}</div>${src !== 'test' && src !== 'nopwr' ? `<div class="mt-3 p-3 text-sm" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><p><b>Unsere Empfehlung: ein Test zu Beginn.</b> Von den Wegen mit Leistungsmesser ist er am genauesten, weil du dabei bewusst am Limit fährst. Im Training und selbst im Rennen fährt man selten wirklich Vollgas, deshalb fällt ein FTP aus Fahrten eher zu niedrig aus. Ein Wert aus Zwift, Garmin oder einem alten Test kann veraltet sein. Noch genauer ist eine Leistungsdiagnostik mit Laktatmessung.</p><p class="mt-1 text-xs" style="color:var(--mute)">Wichtig beim Test: Teil die 20 Minuten gleichmäßig ein und starte nicht zu schnell. Ein zu schneller Start drückt den Wert, besonders bei Hobbyfahrern.</p><button class="ghost lbl mt-2 !w-auto !py-1.5 text-sm" onclick="setFtpSrc('test')">Test zu Beginn einplanen</button></div>` : ''}
    <div class="mt-4">${inner}</div>${d.pwMix ? pwMixHr(d) : ''}</section>`;
}
function anaCalc(){
  const H = S.hist || []; if (!H.length) return null;
  const now = Date.now(), DAY = 864e5, d = S.d, kg = kgOf(d), ago = a => (now - new Date(a.ts)) / DAY;
  let best = null;
  H.forEach(a => { if (ago(a) > 120) return; [['m20', .95, '20-Min-Bestwert × 0,95'], ['m60', 1, '60-Min-Bestwert']].forEach(([k, f, l]) => { if (a[k] && a[k] < 2000) { const v = Math.round(a[k] * f); if (!best || v > best.v) best = {v, a, l, raw:a[k]}; } }); });
  let cpm = null; try { cpm = cpModel(H.filter(a => ago(a) <= 90).sort((x, y) => x.ts.localeCompare(y.ts))); } catch (e) { elog(e); }
  if (cpm && cpm.ok) { const lp = cpm.pts.filter(q => q.t >= 720).sort((x, y) => y.t - x.t)[0] || cpm.pts[cpm.pts.length - 1]; const vc = r5(cpm.cp / 1.06); if (!(cpm.conf === 'gering' && best && best.v > vc)) best = {v:vc, a:lp.r, l:'Critical Power', raw:cpm.cp, cp:cpm}; } else cpm = cpm && cpm.pts && cpm.pts.length ? cpm : null;
  let fe = null; try { fe = ftpCalc(H.filter(a => ago(a) <= 90)); } catch (e) { elog(e); }
  if (fe) { if (fe.mode === 'cp' && best && best.cp) best = {...best, v:fe.v, mode:'cp', fe}; else if (fe.mode === 'cp' && fe.cp) best = {v:fe.v, a:fe.cp.pts[fe.cp.pts.length - 1].r, l:'Critical Power', raw:fe.cp.cp, cp:fe.cp, mode:'cp', fe}; else best = {v:fe.v, a:fe.r || fe.lbR || H[0], l:fe.mode === 'hr' ? 'Puls und Leistung' : fe.mode === 'v20' ? '20-Min-Bestwert × 0,95' : 'Untergrenze', raw:fe.v, mode:fe.mode, fe}; } else best = null;
  const first = Math.min(...H.map(a => +new Date(a.ts))), spanW = Math.max(1, Math.ceil((now - first) / (7 * DAY)));
  const win = Array.from({length:12}, (_, i) => H.filter(a => ago(a) >= i * 7 && ago(a) < (i + 1) * 7).reduce((q, a) => q + a.sec / 3600, 0));
  const nW = Math.min(6, Math.max(2, spanW)), avgH = win.slice(0, nW).reduce((q, x) => q + x, 0) / nW;
  const r56 = H.filter(a => ago(a) <= 56), cnt = Array(7).fill(0); r56.forEach(a => { cnt[(new Date(a.day + 'T12:00:00').getDay() + 6) % 7]++; });
  let avail = cnt.map(c => c >= 2); if (avail.filter(Boolean).length < 3) { const o = cnt.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).filter(x => x[0] > 0).map(x => x[1]); avail = avail.map((a, i) => a || o.includes(i)); }
  const lng = r56.reduce((b, a) => !b || a.sec > b.sec ? a : b, null), longMin = lng ? Math.round(lng.sec / 60 / 15) * 15 : 0, longDay = lng && lng.sec >= 5400 ? (new Date(lng.day + 'T12:00:00').getDay() + 6) % 7 : -1;
  const ftpU = best ? best.v : (d.ftp || 200), tssOf = a => a.np > 0 ? a.sec / 3600 * Math.pow(Math.min(1.3, a.np / ftpU), 2) * 100 : a.ld && a.IF > 0 ? a.sec / 3600 * a.IF * a.IF * 100 : a.sec / 3600 * 42;
  const byDay = {}; H.forEach(a => { byDay[a.day] = (byDay[a.day] || 0) + tssOf(a); });
  const day0 = new Date(Math.max(first, now - 190 * DAY)); day0.setHours(12, 0, 0, 0); let ctl = 0, atl = 0; const kc = 1 - Math.exp(-1 / 42), ka = 1 - Math.exp(-1 / 7);
  for (let t = new Date(day0); t <= new Date(now); t.setDate(t.getDate() + 1)) { const v = byDay[lstr(t)] || 0; ctl += (v - ctl) * kc; atl += (v - atl) * ka; }
  const m5 = Math.max(0, ...H.filter(a => ago(a) <= 120 && a.m5).map(a => a.m5)), m1 = Math.max(0, ...H.filter(a => ago(a) <= 120 && a.m1).map(a => a.m1));
  const top = k => H.filter(a => ago(a) <= 120 && a[k] && a[k] < 2000).reduce((b, a) => !b || a[k] > b[k] ? a : b, null), b20 = top('m20'), b60 = top('m60');
  const pw = H.filter(a => a.m5).length, ftpV = best ? best.v : 0, wkg = ftpV / kg;
  const wq = wkg / lvlF(d), lvl = !ftpV ? '' : wq < 2.5 ? 'Einsteiger bis Hobby' : wq < 3.2 ? 'ambitioniertes Hobbyniveau' : wq < 4 ? 'gut trainiert' : wq < 5 ? 'sehr gut trainiert' : 'Leistungsniveau der Lizenzklassen';
  return {cpm, fe, best, b20, b60, n:H.length, pw, win, avgH, nW, spanW, cnt, avail, longMin, longDay, ctl, atl, tsb:ctl - atl, m5, m1, ftpV, wkg, lvl, startH:Math.max(2, Math.round(avgH * 2) / 2), km6:H.filter(a => ago(a) <= 42).reduce((q, a) => q + a.km, 0)};
}
function applyAna(what){
  const a = anaCalc(); if (!a) return; const d = S.d;
  if (what === 'ftp' || what === 'all') { if (a.ftpV) d.ftp = a.ftpV; }
  if (what === 'load' || what === 'all') { d.startH = a.startH; d.longMin = a.longMin > 0 ? Math.max(60, a.longMin) : 0; }
  if (what === 'days' || what === 'all') { d.avail = [...a.avail]; if (a.longDay >= 0) { d.longDay = a.longDay; d.avail[a.longDay] = true; } }
  save(); render();
}
function offAna(){ delete S.d.startH; delete S.d.longMin; save(); render(); }

function anaWhy(a, d, planH){
  const f0 = x => Math.round(x), dn = x => new Date(x).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'}), H = S.hist || [];
  const totH = H.reduce((q, x) => q + x.sec / 3600, 0), totKm = H.reduce((q, x) => q + x.km, 0), last = H.reduce((m, x) => x.ts > m ? x.ts : m, H[0].ts);
  const row = (k, v) => `<div class="mt-3"><p class="font-semibold" style="color:var(--ink)">${k}</p><p>${v}</p></div>`;
  const wd = SD.map((x, i) => `${x} ${a.cnt[i]}`).join(', ');
  const hs = [1, 2, 3, 4, 8, 12].map(w => `Woche ${w}: ${f1(a.startH < planH ? Math.min(planH, a.startH * Math.pow(1.08, w - 1)) : planH)} Std.`).join(', ');
  const tbl = H.slice(0, 12).map(x => `<tr><td class="pr-2">${dn(x.ts)}</td><td class="pr-2">${esc(x.n).slice(0, 22)}</td><td class="pr-2">${mm(Math.round(x.sec / 60))}</td><td class="pr-2">${x.np ? x.np + ' W' : 'keine'}</td><td>${x.m20 ? x.m20 + ' W' : '-'}${a.best && a.best.a.id === x.id ? ' ◀ FTP' : ''}</td></tr>`).join('');
  return `<details class="mt-4 p-3" style="border:1px solid var(--line);background:#fff"><summary class="cursor-pointer font-semibold">So ist die App zu diesem Ergebnis gekommen</summary>
  <div class="mt-2 text-sm leading-relaxed" style="color:var(--mute)">
    ${row('1. Welche Daten sie liest', `${H.length} Fahrten vom ${dn(Math.min(...H.map(x => +new Date(x.ts))))} bis ${dn(last)}, zusammen ${f1(totH)} Std. und ${f0(totKm)} km. Quelle sind die Dateien, die du hochlädst. Pro Fahrt liest sie Zeit, Strecke, Höhenmeter und, falls vorhanden, die Leistung pro Sekunde. Herzfrequenz, Karten und GPS-Spuren werden nicht ausgewertet. Gespeichert werden nur Kennzahlen pro Fahrt (Dauer, Distanz, Höhenmeter, Leistungsbestwerte), nicht die Dateien, und nur in deinem Browser. Der Button „Hochgeladene Fahrten löschen“ entfernt alles.`)}
    ${row('2. Leistungswerte pro Fahrt', 'Aus der Sekundenreihe berechnet die App die beste Durchschnittsleistung über 1, 5, 20 und 60 Minuten (gleitendes Fenster). Pausen von mehr als 30 Sekunden zählen nicht als Fahrzeit, fehlende Leistungswerte zählen als 0 W. Die Normalized Power (NP) bildet 30-Sekunden-Mittel, hebt sie in die vierte Potenz, mittelt und zieht die vierte Wurzel. Sie gewichtet harte Phasen stärker als der einfache Durchschnitt.')}
    ${row('3. FTP-Schätzung', a.best && a.best.mode && a.best.mode !== 'cp' ? ftpText(a.best.fe, kgOf(S.d), true) : a.best && a.best.cp ? `Die App nutzt das Critical-Power-Modell: Für jede Dauer gilt Arbeit = CP × Zeit + W′. Aus deinen besten Werten der letzten 90 Tage ergibt sich eine Gerade mit CP = <b>${a.best.cp.cp} W</b> und W′ = ${f1(a.best.cp.wp)} kJ. Verwendete Bestwerte: <span data-noi18n>${a.best.cp.pts.map(q => Math.round(q.t / 60) + (lang() === 'en' ? ' min: ' : ' Min.: ') + q.p + ' W' + (q.ver ? ' ✓' : '')).join(', ')}</span>. CP liegt im Mittel rund 6 % über dem FTP aus dem 20-Minuten-Test (${pLink('McGrath et al. 2021', 'mcgrath')}), daraus folgt ein FTP von <b>${a.best.v} W</b>. Weil mehrere Dauern zusammen ausgewertet werden, verfälscht ein einzelner lockerer Tag das Ergebnis weniger als beim 20-Minuten-Wert. ${(a.best.cp.drop || []).length ? ` Nicht berücksichtigt, weil offenbar nicht ausgefahren (Puls zu niedrig oder Wert deutlich unter deiner übrigen Kurve): <span data-noi18n>${a.best.cp.drop.map(q => Math.round(q.t / 60) + (lang() === 'en' ? ' min: ' : ' Min.: ') + q.p + ' W').join(', ')}</span>.` : ''} Sicherheit: <b>${a.best.cp.conf}</b>. Mit ✓ markierte Werte sind durch hohen Puls, hohes Empfinden oder einen Test als maximal belegt.` : a.best ? `Für das Critical-Power-Modell fehlen harte Anstrengungen über etwa 3, 7 und 12 Minuten. Verwendet werden nur Fahrten der letzten 120 Tage. Bester 20-Minuten-Wert: ${a.b20 ? a.b20.m20 + ' W (' + dn(a.b20.ts) + ')' : 'keiner'}, multipliziert mit 0,95 ergibt ${a.b20 ? f0(a.b20.m20 * .95) : '-'} W. Bester 60-Minuten-Wert: ${a.b60 ? a.b60.m60 + ' W' : 'keiner'}. Der höhere der beiden Werte gilt: <b>${a.best.v} W</b>. Der Faktor 0,95 stammt aus dem 20-Minuten-Test nach Allen und Coggan. Er gilt nur, wenn du die 20 Minuten wirklich ausgefahren hast. Ein lockerer Tag liefert einen zu niedrigen FTP, deshalb sagt die App ausdrücklich „Schätzung“.` : 'Es gab keine Fahrt mit mindestens 20 Minuten Leistungsdaten in den letzten 120 Tagen. Deshalb schätzt die App keinen FTP und nutzt deinen eingetragenen Wert.')}
    ${row('4. Trainingsumfang', `Die Fahrten werden in 7-Tage-Fenstern bis heute gezählt. Der Durchschnitt der letzten ${a.nW} Wochen (bei kurzer Historie mindestens 2) beträgt ${hStd(a.avgH)} Std. pro Woche, auf halbe Stunden gerundet ${hStd(a.startH)} Std. Das ist dein Startumfang. Bis zum Zielumfang von ${hStd(planH)} Std. steigert der Plan um 8 % pro Woche, in jeder vierten Woche gibt es eine Entlastung. So ergibt sich: ${a.startH < planH ? hs : 'Dein Startumfang liegt auf Zielniveau, deshalb gibt es keine Anlaufphase'}. Moderate Wochensteigerungen sind ein Erfahrungswert aus der Belastungssteuerung (zum Beispiel Gabbett 2016), kein fester Grenzwert.`)}
    ${row('5. Trainingstage und Long Ride', `Gezählt werden die Fahrten der letzten 8 Wochen je Wochentag: ${wd}. Als Trainingstag gilt ein Tag mit mindestens 2 Fahrten, mindestens aber die 3 häufigsten Tage. Die längste Fahrt in diesem Zeitraum${a.longMin ? ' dauerte ' + mm(a.longMin) : ' ist nicht bekannt'}. Der Long Ride im Plan darf davon aus um 12 % pro Woche wachsen. Liegt sie über 90 Minuten, wird ihr Wochentag dein Long-Ride-Tag.`)}
    ${row('6. Form (Fitness, Ermüdung, Frische)', `Jede Fahrt bekommt einen Belastungswert: TSS = Stunden × (NP ÷ FTP)² × 100. Dabei diente ${a.best ? 'dein geschätzter FTP von ' + a.best.v + ' W' : 'dein eingetragener FTP'}. Fahrten ohne Leistungsdaten schätzt die App aus dem Durchschnittspuls im Verhältnis zum Schwellenpuls, sonst aus deinem Empfinden nach der Fahrt (1 bis 10), sonst pauschal mit 42 TSS pro Stunde (lockeres Tempo). Die Fitness (CTL = ${f0(a.ctl)}) ist der exponentiell gewichtete Mittelwert der Tagesbelastung über 42 Tage, die Ermüdung (ATL = ${f0(a.atl)}) über 7 Tage. Frische = CTL − ATL = ${f0(a.tsb)}. Das Modell geht auf Banister (1975) und Coggan zurück. Die Berechnung beginnt bei 0, deshalb sind die Werte bei weniger als 6 Wochen Daten zu niedrig.`)}
    ${row('7. Einstufung', `Sie beruht nur auf FTP durch Körpergewicht (${f1(a.wkg)} W/kg bei ${f1(kgOf(d))} kg). Die Grenzen 2,5, 3,2, 4 und 5 W/kg sind grobe Faustwerte, kein Test deiner Leistungsfähigkeit.`)}
    <p class="mt-3 font-semibold" style="color:var(--ink)">Deine Fahrten im Überblick (neueste 12)</p>
    <div class="mt-1 overflow-x-auto"><table class="text-xs"><thead><tr style="color:var(--ink)"><th class="pr-2 text-left">Datum</th><th class="pr-2 text-left">Fahrt</th><th class="pr-2 text-left">Dauer</th><th class="pr-2 text-left">NP</th><th class="text-left">Best 20 Min.</th></tr></thead><tbody>${tbl}</tbody></table></div>
    ${row('Grenzen', 'Die Analyse ist eine Schätzung aus den hochgeladenen Fahrten. Fehlende Fahrten, Wattmessfehler (etwa Ausreißer oder nicht kalibrierte Powermeter), Indoor-Fahrten mit anderem Gerät und Krankheitspausen verfälschen sie. Wenn ein Wert nicht zu deinem Gefühl passt, trage ihn selbst ein. Die Analyse ersetzt keinen Leistungstest und keine ärztliche Untersuchung.')}
    ${row('Quellen', 'Allen und Coggan: Training and Racing with a Power Meter (NP, TSS, FTP-Test, CTL und ATL). Banister et al. 1975: Impulse-Response-Modell. Gabbett 2016, British Journal of Sports Medicine: Belastungssteigerung und Verletzungsrisiko.')}
  </div></details>`;
}
function anaBody(box = ''){
  const a = anaCalc(), d = S.d, msgs = histMsg.map(([n, t, ok]) => `<p class="text-sm" style="color:${esc(ok ? 'var(--ok)' : '#c0392b')}">${ok ? '✓' : '⚠'} <b>${esc(n)}</b>: ${esc(t)}</p>`).join('');
  let inner = `<p class="text-sm" style="color:var(--mute)">Lade Fahrten der letzten Monate hoch (FIT, GPX oder TCX, auch als ZIP oder GZ). Die App errechnet daraus deinen FTP und zusätzlich deinen aktuellen Trainingsumfang und deine Form, damit der Plan dort startet, wo du wirklich stehst. Für den FTP braucht es Leistungsdaten (Powermeter oder smarter Rollentrainer), ideal sind 6 bis 12 Wochen. Alles bleibt in deinem Browser.</p>
    <label class="btn mt-3 inline-block cursor-pointer">${histBusy ? 'Wird ausgewertet …' : 'Fahrten wählen'}<input type="file" multiple accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="uploadHist(this)"></label>
    <div class="mt-3 space-y-1">${msgs}</div>${box}`;
  if (a) {
    const f0 = x => Math.round(x), mx = Math.max(1, ...a.win), bars = [...a.win].reverse().map((v, i) => `<div class="flex-1" title="${f1(v)} Std."><div style="height:${Math.max(2, Math.round(56 * v / mx))}px;background:var(--ice)"></div></div>`).join('');
    const tile = (v, l) => `<div class="rounded-lg p-2" style="background:var(--tint)"><div class="hd text-lg font-semibold">${v}</div><div class="text-xs" style="color:var(--mute)">${l}</div></div>`;
    const form = a.spanW < 6 ? 'Noch wenig Daten, die Formwerte sind grob.' : a.tsb > 10 ? 'frisch, du bist gut erholt' : a.tsb > -10 ? 'ausgewogen' : a.tsb > -25 ? 'müde, in einem Trainingsblock' : 'sehr müde, Erholung einplanen';
    const tbS = d.tb && d.tb.on && tbOk(d.tb) ? tbOf(d.tb, dOnly(d.startDate && d.startDate > iso(0) ? d.startDate : iso(0)).getMonth()).h : 0;
    const planH = tbS || (d.perDay ? d.avail.reduce((q, x, i) => q + (x ? (d.dayMin[i] || 0) : 0), 0) / 60 : d.hours), ramp = 1.08; /* B6: mit Zeitbudget das des Startmonats */
    const wksN = a.startH < planH ? Math.ceil(Math.log(planH / a.startH) / Math.log(ramp)) : 0;
    const wksAvail = Math.max(0, Math.ceil((new Date(d[d.goal === 'event' ? 'eventDate' : 'endDate']) - new Date(d.startDate && d.startDate > iso(0) ? d.startDate : iso(0))) / 6048e5));
    const eff = !(planH > 0) ? '' : a.startH >= planH * .9 ? `Dein bisheriger Umfang (${hStd(a.avgH)} Std. pro Woche) passt zu den geplanten ${hStd(planH)} Std. Der Plan startet direkt auf diesem Niveau.`
      : `Du trainierst bisher etwa ${hStd(a.avgH)} Std. pro Woche, geplant sind ${hStd(planH)} Std. Der Plan startet bei etwa ${hStd(a.startH)} Std. und steigert sich um rund 8 % pro Woche. Das Ziel erreicht er nach etwa ${wksN} Wochen.${wksN > wksAvail - 2 && wksAvail > 0 ? ' <b style="color:#9a6a00">Bis zum Zieltermin wird das eng. Etwas weniger Wochenstunden oder ein späterer Termin geben dir mehr Ruhe beim Aufbau.</b>' : ''}`;
    const dayNames = SD.filter((x, i) => a.avail[i]).join(', ');
    const on = d.startH > 0;
    inner += `<p class="mt-5 font-semibold">Was deine Fahrten außerdem zeigen</p><div class="mt-2 grid grid-cols-3 gap-2">${tile(a.ftpV ? a.ftpV + ' W' : 'offen', a.ftpV ? 'FTP-Schätzung, ' + f1(a.wkg) + ' W/kg' : 'FTP-Schätzung')}${tile(f1(a.avgH) + ' h', 'pro Woche, Ø ' + a.nW + ' Wochen')}${tile(f0(a.ctl), 'Fitness (CTL)')}</div>
    <div class="mt-4"><p class="text-sm font-semibold">Wochenstunden, letzte 12 Wochen</p><div class="mt-2 flex h-16 items-end gap-1">${bars}</div></div>
    <ul class="mt-4 space-y-2 text-sm" style="color:var(--mute)">
      <li><b style="color:var(--ink)">Auswertung:</b> ${a.n} ${a.n === 1 ? 'Fahrt' : 'Fahrten'}, davon ${a.pw} mit Leistungsdaten.${a.lvl ? ' Mit ' + f1(a.wkg) + ' W/kg bist du als ' + a.lvl + ' einzustufen (Faustwerte).' : ''}</li>
      <li><b style="color:var(--ink)">FTP:</b> ${a.best && a.best.mode === 'lb' ? `mindestens ${a.best.v} W. Weil nicht belegt ist, dass deine Bestwerte ausgefahren waren, liegt dein echter FTP wahrscheinlich höher.` : a.best && a.best.mode === 'hr' ? `${a.best.v} W, hochgerechnet aus Puls und Leistung auf deinen Schwellenpuls. Sicher erreicht sind mindestens ${a.best.fe.lb} W.` : a.best && a.best.mode === 'v20' ? `${a.best.v} W aus deinem belegten 20-Minuten-Wert.` : a.best && a.best.cp ? `${a.best.v} W aus deiner Leistungskurve (Critical Power ${a.best.cp.cp} W). Je mehr ausgefahrene Anstrengungen über 3 bis 20 Minuten in deinen Fahrten stecken, desto genauer.` : a.best ? `${a.best.v} W aus ${a.best.l} (${a.best.raw} W) vom ${fmt(a.best.a.day)}. Der Wert stimmt nur, wenn du in dieser Fahrt wirklich am Limit warst, etwa im Test oder Rennen. Sonst liegt der echte FTP höher.` : 'Ohne Leistungsdaten kann die App keinen FTP schätzen. Trage deinen FTP selbst ein oder mache in der ersten Woche einen 20-Minuten-Test.'}</li>
      ${a.m5 ? `<li><b style="color:var(--ink)">Leistungsprofil:</b> Bestwerte 1 Min. ${a.m1} W, 5 Min. ${a.m5} W${a.best ? ` (das ${f1(a.m5 / a.best.v)}-Fache des FTP${a.m5 / a.best.v < 1.12 ? ', eher niedrig: VO2max-Intervalle bringen dir viel' : a.m5 / a.best.v > 1.3 ? ', hoch: Schwelle und Grundlagenausdauer sind dein Hebel' : ', ausgewogen'})` : ''}.</li>` : ''}
      <li><b style="color:var(--ink)">Form:</b> Fitness ${f0(a.ctl)}, Ermüdung ${f0(a.atl)}, Frische ${a.tsb >= 0 ? '+' : ''}${f0(a.tsb)}: ${form}.</li>
      <li><b style="color:var(--ink)">Trainingstage:</b> Du fährst meist ${dayNames || 'unregelmäßig'}${a.longDay >= 0 ? ', die längste Fahrt war ' + mm(a.longMin) + ' am ' + DAYS[a.longDay] : ''}.</li>
      <li><b style="color:var(--ink)">Folge für den Plan:</b> ${eff}${a.longMin > 0 ? ` Der Long Ride wächst von deiner bisher längsten Fahrt (${mm(a.longMin)}) aus um etwa 12 % pro Woche.` : ''}</li>
    </ul>
    <div class="mt-4 flex flex-wrap gap-2"><button class="btn" onclick="applyAna('all')">Alles übernehmen</button>${a.ftpV ? '<button class="ghost" onclick="applyAna(\'ftp\')">Nur FTP</button>' : ''}<button class="ghost" onclick="applyAna('days')">Nur Trainingstage</button><button class="ghost" onclick="applyAna('load')">Nur Startumfang</button></div>
    ${on ? `<p class="mt-3 text-sm" style="color:var(--ok)">✓ Startumfang ${hStd(d.startH)} Std. pro Woche${d.longMin ? ', Long Ride ab ' + mm(d.longMin) : ''} wird im Plan genutzt. <button class="underline" onclick="offAna()">Nicht verwenden</button></p>` : ''}
    ${anaWhy(a, d, planH)}
    <button class="ghost mt-3 !py-2 text-sm" onclick="clearHist()">Hochgeladene Fahrten löschen</button>`;
  }
  return inner;
}


/* Abgleich der echten Fahrten mit dem Plan der aktuellen Woche */
function analyze(){
  if (!S.p || !S.plan || !hasStarted(S.p)) return null;
  const t = todayIdx(), prev = S.wk > 1 ? genWeek(S.p, S.wk - 1) : null, res = {done:0, miss:0, hard:false};
  S.actual = {}; S.handled = S.handled || [];
  for (let i = -1; i <= t; i++) {
    const as = allActs().filter(a => a.day === dstr(i)), pl = i >= 0 ? S.plan[i] : prev && prev[7 + i];
    if (!as.length) { if (i >= 0 && i < t && pl.m > 0 && !S.done[i]) res.miss++; continue; }
    const sec = as.reduce((q, a) => q + a.sec, 0), ts = as.reduce((q, a) => q + a.tss, 0);
    if (i >= 0) { S.actual[i] = {sec, tss:ts, ids:as.map(a => a.id)}; if (pl.m > 0 && sec >= pl.m * 60 * .6 && !(pl.parts && as.length < pl.parts.length) && !(v0 => v0.verdict === 'wrong' || (v0.verdict === 'nodata' && pl.t === 'test'))((S.p.exe || {})[S.wk + '-' + i] || {})) { S.done[i] = true; res.done++; } }
    const pt = pl && pl.m ? tss(pl) : 0, key = as.map(a => a.id).join('-');
    if (i >= t - 1 && ts >= 100 && ts >= 1.5 * Math.max(pt, 40) && !S.handled.includes(key)) {
      const top = as.reduce((a, b) => b.tss > a.tss ? b : a);
      S.pending = true; S.pendInfo = {key, n:top.n, tss:ts, planned:pt, when:rel(top)}; res.hard = true;
    }
  }
  cheerScan(res.miss); rcArchSync();
  return res;
}
function checkin(lv){
  S.pending = false; const t = todayIdx(), i = S.plan.findIndex((x, k) => k >= t && HARD.includes(x.t) && !S.done[k]), old = i >= 0 ? S.plan[i] : null;
  const pi = S.pendInfo || {n:'Deine letzte Fahrt', tss:0, planned:0, when:''}; S.handled = S.handled || []; if (pi.key) S.handled.push(pi.key); S.pendInfo = null;
  const base = `„${pi.n}“ (${pi.when}) hatte TSS ${pi.tss}, ${pi.planned ? 'geplant waren etwa TSS ' + pi.planned : 'an dem Tag war keine Einheit geplant'}. Eine einzelne harte Fahrt ist noch kein Übertraining: Nach dem ECSS/ACSM-Konsens zählen Belastung und Erholung zusammen, und es gibt keinen einzelnen verlässlichen Messwert dafür. Dein Befinden ist ein guter Indikator.`;
  if (lv === 'fit' || !old) { S.log.unshift({title:'Check-in: Plan bleibt', day:-1, text: base + (old ? ' Du fühlst dich erholt, deshalb bleibt der Plan unverändert. Die Fahrt zählt als zusätzlicher Reiz.' : ' In dieser Woche stehen keine harten Einheiten mehr an, der Plan bleibt unverändert.')}); S.note = 'Check-in gespeichert, Plan unverändert.'; }
  else if (lv === 'mid') { S.plan[i] = old.parts ? {...old, n: old.n + ' (reduziert)', parts:[old.parts[0], {...old.parts[1], iv:null, lo:45, hi:55, st:'Locker zurückfahren (Z1–Z2), die Intervalle entfallen.'}], adapted:true, orig:old} : {...old, m: Math.max(45, Math.round(old.m * .75 / 5) * 5), n: old.n + ' (reduziert)', st: old.st + ' Reduziert: ein Intervall weniger, Leistung unverändert.', adapted:true, orig:old}; flashIdx = i; S.log.unshift({title:'Check-in: Einheit reduziert', day:i, text: base + ` Du fühlst dich etwas müde. „${old.n}“ am ${DAYS[i]} bleibt, wird aber gekürzt: Die Intensität bleibt, der Umfang sinkt.`}); S.note = 'Check-in gespeichert, 1 Einheit reduziert.'; }
  else { S.plan[i] = old.parts ? {...REC, n:'Rekom-Fahrt (Arbeitsweg locker)', m:old.m, parts:old.parts.map(q => ({lbl:q.lbl, m:q.m, lo:45, hi:55, st:'Sehr locker im kleinen Gang, Puls unter 60 % HFmax.'})), adapted:true, orig:old} : {...REC, adapted:true, orig:old}; flashIdx = i; queueCheer({key:'low|' + S.p.start + '|' + S.wk + '|' + i, kind:'low'}); S.log.unshift({title:'Check-in: Erholung eingeplant', day:i, text: base + ` Du fühlst dich ausgelaugt. Deshalb wird „${old.n}“ am ${DAYS[i]} durch eine Rekom-Fahrt ersetzt. Halten Müdigkeit, Leistungseinbruch oder gedrückte Stimmung länger als ein paar Tage an, sprich mit Trainer oder Arzt.`}); S.note = 'Check-in gespeichert, 1 Einheit ersetzt.'; }
  save(); render();
}
const pendingCard = () => { if (!S.pending) return ''; const pi = S.pendInfo || {n:'Deine letzte Fahrt', tss:0, when:''};
  return `<div class="panel p-4"><h3 class="hd text-xl font-semibold">Wie fühlst du dich heute?</h3><p class="mb-3 mt-1 text-sm" style="color:var(--mute)">Deine Fahrt „${esc(pi.n)}“ (${pi.when}, TSS ${pi.tss}) war deutlich härter als geplant. Ob der Plan angepasst wird, entscheidet dein Befinden: Schlaf, Beinschwere, Stimmung.</p>
  <div class="grid gap-2">${[['fit','Erholt und motiviert'],['mid','Etwas müde'],['low','Ausgelaugt, schwere Beine, schlechter Schlaf']].map(([k, l]) => `<button onclick="checkin('${ja(k)}')" class="ghost text-left">${l}</button>`).join('')}</div></div>`; };
const band = hi => hi <= 75 ? 'niedrig' : hi <= 105 ? 'moderat' : 'hoch';
const dist = pl => { let lo = 0, mo = 0, hi = 0; pl.forEach(x => { const m = x.m || 0, a = x.wm || 0, b = x.wh || 0; mo += a; hi += b; lo += Math.max(0, m - a - b); }); const t = lo + mo + hi || 1; return `${Math.round(lo / t * 100)} % niedrig, ${Math.round(mo / t * 100)} % moderat, ${Math.round(hi / t * 100)} % hoch`; };
const sources = () => fold('src', 'Wissenschaftliche Grundlage', `<div class="text-sm">
  <ul class="mt-3 list-disc space-y-2 pl-5" style="color:var(--mute)">
  <li>Pendeltage: Intervalle zuerst und am Stück, danach locker. Das folgt <a class="underline" target="_blank" rel="noopener" href="https://acuresearchbank.acu.edu.au/item/88y4v/skeletal-muscle-adaptation-and-performance-responses-to-once-a-day-versus-twice-every-second-day-endurance-training-regimens">Hansen et al.</a>: Wer hart nach einer lockeren Fahrt trainierte, hatte eine geringere Intensitätskapazität. Es ist eine Ableitung, keine direkte Studie zum Pendeln.</li>
  <li>Intensitätsverteilung: Überwiegend niedrige Intensität plus wenige harte Einheiten ist bei Ausdauersportlern gut belegt (<a class="underline" target="_blank" rel="noopener" href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4621419/">Stöggl und Sperlich 2015</a>). Ob polarisiert oder pyramidal besser ist, ist offen, ein Modell ist nicht grundsätzlich überlegen (<a class="underline" target="_blank" rel="noopener" href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11329428/">Meta-Analyse 2024</a>, <a class="underline" target="_blank" rel="noopener" href="https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1657892/full">Review 2025</a>). Der Plan zeigt dir deshalb die Zeit nach Belastungsbereich.</li>
  <li>Tapering: etwa 2 Wochen, Umfang um 41 bis 60 % senken, Intensität und Häufigkeit beibehalten (<a class="underline" target="_blank" rel="noopener" href="https://pubmed.ncbi.nlm.nih.gov/17762369/">Bosquet et al. 2007</a>, <a class="underline" target="_blank" rel="noopener" href="https://doi.org/10.1371/journal.pone.0282838">Wang et al. 2023</a>).</li>
  <li>Überlastung und Erholung: Funktionelles Overreaching ist normal, für Übertraining gibt es keinen einzelnen verlässlichen Marker (<a class="underline" target="_blank" rel="noopener" href="https://doi.org/10.1249/MSS.0b013e318279a10a">ECSS/ACSM-Konsens 2013</a>). Das Befinden misst die Reaktion auf Training besser als die meisten objektiven Werte (<a class="underline" target="_blank" rel="noopener" href="https://bjsm.bmj.com/content/50/5/281">Saw et al. 2016</a>). Das Verhältnis aus akuter und chronischer Last (ACWR) sagt Verletzungen nicht verlässlich voraus (<a class="underline" target="_blank" rel="noopener" href="https://doi.org/10.1123/ijspp.2019-0864">Impellizzeri et al. 2020</a>), deshalb nutzt die App es nicht.</li>
  <li>Periodisierung: Blockperiodisierung zeigt kleine Vorteile, die Studienqualität ist aber gering (<a class="underline" target="_blank" rel="noopener" href="https://doi.org/10.2147/OAJSM.S180408">Mølmen et al. 2019</a>). Dieser Plan nutzt klassische Phasen.</li>
  <li>Garmin-Export: Aufbau der Trainingsdatei nach der <a class="underline" target="_blank" rel="noopener" href="https://developer.garmin.com/fit/articles/file-types/workout.html">FIT-SDK-Beschreibung für Workouts</a> (Zeitschritte, Wiederholungen, Leistungsziele in Watt).</li>
  <li>Eventspezifisches Training: Die Intervalle und der Long Ride richten sich nach dem Streckentyp (lange Anstiege, kurze Rampen, flach und schnell, Ultra). Kurze Intervalle (30/15) brachten bei trainierten Radfahrern größere Verbesserungen als lange Intervalle gleicher Belastung (Rønnestad et al. 2020, Scandinavian Journal of Medicine &amp; Science in Sports).</li>
  <li>Mobilität und Stabilität: Statisches Dehnen direkt vor Belastung kann die Leistung leicht senken, getrennt davon verbessert es die Beweglichkeit (<a class="underline" target="_blank" rel="noopener" href="https://ro.ecu.edu.au/ecuworkspost2013/2642/">Behm et al. 2016</a>). Deshalb liegen die Routinen nach der Radeinheit oder an Ruhetagen. Dass Mobilität und Rumpfstabilität Beschwerden bei Radfahrern vorbeugen, ist vor allem Praxiserfahrung, die Studienlage ist dünn.</li>
  <li>Krafttraining: Schweres Krafttraining ergänzt Ausdauertraining bei Radfahrern sinnvoll, in der Saison genügt eine Einheit zur Erhaltung (<a class="underline" target="_blank" rel="noopener" href="https://lida.sport-iat.de/ta/Record/4032491">Rønnestad und Mujika 2014, Übersichtsarbeit</a>; praktische Umsetzung nach <a class="underline" target="_blank" rel="noopener" href="https://roadmancycling.com/blog/what-experts-say-about-strength-training-cyclists">Roadman</a>). Kein Beinkrafttraining in den 48 Stunden vor harten Einheiten ist eine Praxisregel.</li>
  <li>Verpflegung: 30 bis 60 g Kohlenhydrate pro Stunde, bei sehr langen Einheiten bis 90 g (<a class="underline" target="_blank" rel="noopener" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4008807/">Jeukendrup 2014</a>, ACSM/AND/DC Position 2016).</li></ul>
  <p class="mt-3 text-xs" style="color:var(--mute)">Grenzen: FTP-Prozentzonen sind Näherungen, individuelle Laktatschwellen weichen ab. Die Drei-Wochen-Belastung plus Erholungswoche ist eine Praxisregel mit begrenzter Evidenz. Viele Studien nutzen trainierte, meist männliche Probanden. Schwellenwerte der Auswirkungskarte sind Faustwerte. Der Zielzeit-Check ist ein physikalisches Faustmodell mit etwa ±10 % Genauigkeit. Kein Ersatz für Trainer- oder ärztlichen Rat.</p></div>`, false);
function undo(i){
  const x = S.plan[i]; if (!x || !x.orig) return;
  if (x.orig.t === 'test' && S.p && S.p.testDue && S.p.testDue.w === S.wk) { delete S.p.testDue; if (S.d) delete S.d.testDue; }
  S.plan[i] = x.orig; S.log = S.log.filter(l => l.day !== i); [i + 1, i + 2].forEach(k => { const z = S.plan[k]; if (z && z.fu === i && z.orig) { S.plan[k] = z.orig; S.log = S.log.filter(l => l.day !== k); } }); save(); render();
}
function tick(i){ S.done[i] = !S.done[i]; try { if (S.plan[i] && S.plan[i].t === 'test' && S.p) { S.p.testDone = (S.p.testDone || []).filter(q => q !== S.wk); if (S.done[i]) S.p.testDone.push(S.wk); } } catch (e) { elog(e); } if (S.done[i]) cheerScan(0); save(); render(); }
function tog(i){ open = open === i ? null : i; render(); }
let askReset = false;
function reset(){ askReset = true; render(); }
function cancelReset(){ askReset = false; render(); }
function doReset(){ bkPre('Vor dem Zurücksetzen'); try { localStorage.removeItem(LIBK); } catch (e) { elog(e); } S = load(true); save(); open = null; vw = null; askReset = false; render(); bkMirrorSoon(); }

