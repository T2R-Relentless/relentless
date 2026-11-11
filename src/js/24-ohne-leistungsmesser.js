/* ---------- Ohne Leistungsmesser: Schwellenpuls-Test und FTP-Schätzung aus einem Bergzeitfahren ---------- */
/* Leistung am Berg aus Physik (Martin et al. 1998): Hubarbeit + Rollwiderstand + Luftwiderstand, geteilt durch den Antriebswirkungsgrad */
function climbCalc(c, kg){
  if (!c) return null; const len = Number(String(c.len || '').replace(',', '.')), hm = Number(c.hm), sec = mmssSec(c.t), bike = Number(String(c.bike || 9).replace(',', '.')) || 9;
  if (!(len >= .5 && hm >= 30 && sec >= 120 && kg > 30)) return null;
  const gr = hm / (len * 1000); if (gr > .25) return null;
  const th = Math.atan(gr), v = len * 1000 / sec, m = kg + bike, g = 9.81;
  const p = (m * g * v * Math.sin(th) + m * g * v * Math.cos(th) * .005 + .5 * 1.2 * .4 * v ** 3) / .975;
  const ftp = r5(p * Math.pow(Math.min(3600, Math.max(480, sec)) / 3600, .05)), warn = [];
  if (gr < .05) warn.push('Unter 5 % Steigung zählen Wind und Sitzposition stark mit. Die Schätzung ist dann ungenau.');
  if (sec < 480) warn.push('Unter 8 Minuten ist der Anstieg zu kurz für eine verlässliche FTP-Schätzung.');
  if (sec > 3600) warn.push('Über 60 Minuten unterschätzt die Rechnung den FTP eher.');
  return {p:Math.round(p), ftp, gr:Math.round(gr * 1000) / 10, kmh:Math.round(v * 36) / 10, sec, warn};
}
function mmssSec(t){ if (t == null || t === '') return 0; const s = String(t).trim().replace(',', '.'); if (s.includes(':')) { const [a, b] = s.split(':'); return (Number(a) || 0) * 60 + (Number(b) || 0); } return Math.round((Number(s) || 0) * 60); }
function npSet(k, v){ S.d[k] = v; if (k === 'npTest') S.d.test0 = !!v; save(); render(); }
function npClimb(k, v){ S.d.climb = {...(S.d.climb || {}), [k]:v}; save(); render(); }
const npInp = (lbl, k, val, ph, fn, mode) => field(lbl, `<input type="text" inputmode="${mode || 'decimal'}" class="inp" value="${val != null ? esc(String(val)) : ''}" placeholder="${esc(ph)}" onchange="${ja(fn)}('${ja(k)}',this.value)">`);
function climbRes(r, btn){
  if (!r) return '';
  return `<div class="mt-2 p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="text-sm">Geschätzte Leistung am Anstieg: <b>${r.p} W</b> im Schnitt (${exeNum(r.gr)} % Steigung, ${exeNum(r.kmh)} km/h).</p><p class="mt-1 text-sm">Daraus geschätzter FTP: <b>${r.ftp} W</b></p>${r.warn.map(x => `<p class="mt-1 text-xs" style="color:#9a6a00">⚠ ${x}</p>`).join('')}${btn || ''}<p class="mt-2 text-xs" style="color:var(--mute)">Die Rechnung nutzt das physikalische Modell von ${pLink('Martin et al. 1998', 'martin')}: Hubarbeit, Rollwiderstand und Luftwiderstand. Am steilen Berg mit wenig Wind liegt sie meist wenige Prozent neben einem Leistungsmesser. Gegen- oder Rückenwind, Windschatten, ungenaue Höhenmeter und falsches Gewicht verfälschen sie.</p></div>`;
}
function npUi(d){
  const kg = kgOf(d), L = d.lthr || 0, t = d.npTest !== false, c = d.climb || {}, r = climbCalc(c, kg), le = lthrEst();
  return `<p class="text-sm">Ohne Leistungsmesser zeigt die App jede Einheit mit Pulsbereich und Empfinden statt Watt. Dafür braucht sie deinen Schwellenpuls.</p>
    <p class="mt-4 text-sm font-semibold">1. Schwellenpuls</p><div class="mt-1 flex flex-wrap gap-2">${chip('Test in der ersten Woche', t, "npSet('npTest',true)")}${chip('Ich kenne ihn', !t, "npSet('npTest',false)")}</div>
    ${t ? `<p class="mt-2 text-xs" style="color:var(--mute)">So geht der Test nach Joe Friel: Nach gutem Einfahren fährst du 30 Minuten allein so hart, wie du es gleichmäßig durchhalten kannst, am besten an einem langen Anstieg oder auf einer ruhigen Strecke ohne Ampeln. Dein Schwellenpuls ist der Durchschnittspuls der letzten 20 Minuten (${pLink('Friel', 'friel')}). Starte nicht zu schnell, die meisten überziehen am Anfang. Bis zum Test richtet sich die Intensität nach dem Empfinden.</p>`
      : `<div class="mt-2">${field('Schwellenpuls (Schläge/Min.)', `<input type="number" inputmode="numeric" class="inp" value="${esc(L || '')}" placeholder="${esc(le ? le.v : 'z. B. 165')}" onchange="setHr('lthr',this.value)">`)}</div>${!L && le ? `<p class="mt-1 text-xs" style="color:var(--mute)">Aus deinen Fahrten geschätzt: etwa ${le.v}. <button class="underline" onclick="setHr('lthr',${ja(le.v)})">Übernehmen</button></p>` : ''}`}
    <p class="mt-5 text-sm font-semibold">2. FTP-Schätzung für die Prognose (optional): Bergzeitfahren</p>
    <p class="mt-1 text-xs" style="color:var(--mute)">Für die Prognose und den Trainingsumfang rechnet die App intern mit einem FTP. Am Berg hängt die Leistung vor allem von Gewicht, Höhenmetern und Zeit ab, deshalb lässt sie sich dort gut berechnen. Fahr einen Anstieg von etwa 10 bis 30 Minuten mit mindestens 5 % Steigung gleichmäßig am Limit, allein und bei wenig Wind. Länge und Höhenmeter findest du etwa in Strava oder Komoot.</p>
    <div class="mt-2 grid grid-cols-2 gap-2">${npInp('Länge (km)', 'len', c.len, 'z. B. 6,5', 'npClimb')}${npInp('Höhenmeter', 'hm', c.hm, 'z. B. 450', 'npClimb', 'numeric')}${npInp('Zeit (Min.:Sek.)', 't', c.t, 'z. B. 24:30', 'npClimb', 'text')}${npInp('Rad und Ausrüstung (kg)', 'bike', c.bike, '9', 'npClimb')}</div>
    <p class="mt-1 text-xs" style="color:var(--mute)">Dein Körpergewicht (${f1(kg)} kg) kommt von oben.</p>
    ${climbResD(d, r)}`;
}
const climbResD = (d, r) => r ? climbRes(r, Number(d.ftp) !== r.ftp ? `<button class="btn !w-auto lbl mt-2" onclick="draft('ftp',${ja(r.ftp)});S.d.ftpClimb=${ja(r.ftp)};render()">${r.ftp} W als FTP übernehmen</button>` : '<p class="mt-1 text-sm" style="color:var(--ok)">✓ Als FTP übernommen.</p>')
  : `<p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Ohne Bergzeitfahren nimmt die App einen Schätzwert nach deinem Niveau:</p><div class="flex flex-wrap gap-2">${Object.entries(LVL).map(([k, v]) => { const f = Math.round(v[1] * lvlF(d) * kgOf(d) / 5) * 5; return chip(v[0] + ' · ' + f + ' W', Number(d.ftp) === f, `draft('ftp',${ja(f)});render()`); }).join('')}</div>`;
/* Fitness-Check ohne Leistungsmesser: Schwellenpuls-Test oder Bergzeitfahren */
let npKind = 'hr';
function npTestBox(w, i, cur){
  const p = S.p, hr = (p.hrRes || {})[w]; if (hr) return `<div class="p-3" style="background:#fdf2f8;border:1px solid #e11d74"><p class="font-semibold">Fitness-Check: Schwellenpuls</p><p class="mt-1 text-sm">Dein Schwellenpuls: <b>${hr.lthr}</b>${hr.prev ? ` (vorher ${hr.prev})` : ''}. Die Pulsbereiche aller Einheiten sind angepasst.</p>${hr.prev && hr.lthr < hr.prev - 3 ? '<p class="mt-1 text-xs" style="color:var(--mute)">Ein niedrigerer Schwellenpuls ist nicht automatisch ein Rückschritt: Mit besserer Form sinkt oft der Puls bei gleicher Anstrengung. Entscheidend ist, wie schnell du dabei warst.</p>' : ''}</div>`;
  const day = addD(p.start, (w - 1) * 7 + i), due = cur && day <= iso(0), c = p.climbT || {}, r = climbCalc(c, kgOf(p));
  return `<div class="p-3" style="background:#fdf2f8;border:1px solid #e11d74"><p class="font-semibold">Fitness-Check ohne Leistungsmesser</p>
    <p class="mt-1 text-sm">Wähl, was du heute misst: den Schwellenpuls für deine Pulsbereiche oder ein Bergzeitfahren für die FTP-Schätzung.</p>
    ${due ? `<div class="mt-2 flex flex-wrap gap-2">${chip('Schwellenpuls-Test', npKind === 'hr', "npKind='hr';render()")}${chip('Bergzeitfahren', npKind === 'climb', "npKind='climb';render()")}</div>
      ${npKind === 'hr' ? `<p class="mt-2 text-xs" style="color:var(--mute)">30 Minuten allein so hart, wie du es gleichmäßig durchhalten kannst. Trag den Durchschnittspuls der letzten 20 Minuten ein.</p><div class="mt-2 flex items-end gap-2"><label class="flex-1 text-xs" style="color:var(--mute)">Durchschnittspuls der letzten 20 Minuten<input id="npv${esc(w)}" type="number" inputmode="numeric" class="inp mt-1" placeholder="${esc(p.lthr || 165)}"></label><button class="btn !w-auto" onclick="npSaveHr(${ja(w)}, ${ja(i)})">Auswerten</button></div>`
        : `<div class="mt-2 grid grid-cols-2 gap-2">${npInp('Länge (km)', 'len', c.len, 'z. B. 6,5', 'npClimbT')}${npInp('Höhenmeter', 'hm', c.hm, 'z. B. 450', 'npClimbT', 'numeric')}${npInp('Zeit (Min.:Sek.)', 't', c.t, 'z. B. 24:30', 'npClimbT', 'text')}${npInp('Rad und Ausrüstung (kg)', 'bike', c.bike, '9', 'npClimbT')}</div>${climbRes(r, r ? `<button class="btn !w-auto lbl mt-2" onclick="npSaveClimb(${ja(w)}, ${ja(i)})">Auswerten</button>` : '')}${!r ? '<p class="mt-2 text-xs" style="color:var(--mute)">Trag Länge, Höhenmeter und Zeit deines Anstiegs ein.</p>' : ''}`}
      ${testMsg ? `<p class="mt-1 text-sm" style="color:#c0392b">⚠ ${esc(testMsg)}</p>` : ''}` : '<p class="mt-2 text-xs" style="color:var(--mute)">Das Ergebnis kannst du am Testtag hier eintragen.</p>'}</div>`;
}
function npClimbT(k, v){ S.p.climbT = {...(S.p.climbT || {}), [k]:v}; save(); render(); }
function npSaveHr(w, i){
  const el = document.getElementById('npv' + w), v = Math.round(Number(el && el.value) || 0); if (v < 100 || v > 220) { testMsg = 'Bitte einen Puls zwischen 100 und 220 eintragen.'; return render(); }
  const prev = S.p.lthr || S.d.lthr || 0; S.p.lthr = S.d.lthr = v; S.p.hrRes = {...(S.p.hrRes || {}), [w]:{date:iso(0), lthr:v, prev}};
  if (i != null && i >= 0 && S.wk === w) S.done[i] = true; note('Schwellenpuls eingetragen', `Schwellenpuls ${v}${prev ? `, vorher ${prev}` : ''}. Die Pulsbereiche sind angepasst.`, -2);
  testMsg = ''; save(); render(); track('fitness-check-schwellenpuls');
}
function npSaveClimb(w, i){
  const r = climbCalc(S.p.climbT, kgOf(S.p)); if (!r) { testMsg = 'Bitte Länge, Höhenmeter und Zeit eintragen.'; return render(); }
  const k = testKind, el = document.createElement('input'); el.id = 'tv' + w; el.value = r.ftp; el.style.display = 'none'; document.body.appendChild(el);
  testKind = 'ftp'; try { saveTest(w, i); } finally { testKind = k; el.remove(); }
  if (S.p.res && S.p.res[w]) { S.p.res[w] = {...S.p.res[w], kind:'climb', val:r.p}; S.d.res = S.p.res; save(); render(); }
}

