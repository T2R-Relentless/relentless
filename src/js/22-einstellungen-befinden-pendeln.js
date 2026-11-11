/* ---------- Sicherungs-Erinnerung ---------- */
function bkHintV1(){
  const now = Date.now(); if (!S.bkAt0) { S.bkAt0 = now; try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { elog(e); } }
  const last = Math.max(S.bkAt || 0, (S.bkSnooze || 0) - 7 * 864e5, S.bkAt0); if (now - last < 14 * 864e5) return '';
  return `<section class="panel p-4" style="border-left:4px solid var(--ice)"><p class="font-semibold">Zeit für eine Sicherung</p><p class="mt-1 text-sm" style="color:var(--mute)">${S.bkAt ? `Deine letzte Sicherung ist ${Math.floor((now - S.bkAt) / 864e5)} Tage alt.` : 'Deine Pläne liegen nur in diesem Browser.'} Speichere eine Sicherungsdatei, damit nichts verloren geht.</p><div class="mt-3 flex gap-2"><button class="btn !py-2" onclick="exportPlans()">Jetzt sichern</button><button class="ghost !py-2" onclick="S.bkSnooze=Date.now();save();render()">Später</button></div></section>`;
}

/* ---------- Darstellung: hell, dunkel, automatisch ---------- */
const isDark = () => S && S.theme === 'dark' || (!(S && S.theme === 'light') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
const DK_BG = {'#fff':'#111d33', '#ffffff':'#111d33', '#e3f6f0':'#0f3a33', '#e0f4ef':'#0f3a33', '#fff6dc':'#3a3013', '#fcf0d9':'#3a3013', '#fff1e6':'#40250f', '#fdeceb':'#421b1d', '#fde8ee':'#421b1d', '#fdf2f8':'#3a1a2c', '#e6f7f6':'#0f3436', '#eef2f4':'#16243d', '#eeeafa':'#25204a', '#e6e2f4':'#25204a', '#f2f7f8':'#16243d', '#0b1c49':'#2a3f7a', '#071747':'#0f2154', '#ffd45c':'#5a4710'};
const DK_FG = {'#9a6a00':'#e0b54a', '#7a1f17':'#f2a49b', '#064e3b':'#7fe0c0', '#04231a':'#7fe0c0', '#04231f':'#7fe0c0', '#6b4e00':'#ecc76a', '#3b2a00':'#ecc76a', '#7c2d12':'#f6ad7b', '#c2410c':'#fb8a4c', '#c0392b':'#f2766a', '#0a8f6a':'#34c79a', '#0b1c49':'#e6edf6', '#071747':'#e6edf6', '#5a48a0':'#b3a6f0', '#007f8d':'#3cc7c0', '#5b6f80':'#93a5bb', '#11907b':'#4fd1b5', '#c27f0c':'#e8a640', '#d6456b':'#f08aa3', '#e11d74':'#f472b6'};
const DK_SVG = {'#0b1c49':'#e6edf6', '#071747':'#e6edf6', '#e6f7f6':'#16343a', '#5b6f80':'#93a5bb', '#007f8d':'#3cc7c0'};
function themeApply(){ document.documentElement.dataset.theme = isDark() ? 'dark' : 'light'; }
function darkFix(root){
  if (!root || !isDark()) return;
  root.querySelectorAll('[style]').forEach(el => {
    const s = el.getAttribute('style'), bgm = /background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})\b/.exec(s), bgh = bgm ? bgm[1].toLowerCase() : null;
    const ice = /background:\s*var\(--ice\)/.test(s) || (bgh && !DK_BG[bgh] && hexLight(bgh));
    const n = s.replace(/(^|[;\s])(background(?:-color)?|color|border(?:-left|-top|-bottom|-right)?(?:-color)?)\s*:\s*([^;]*?)(#[0-9a-fA-F]{3,6})\b(?![0-9a-fA-F])/g, (m, pre, prop, mid, hex) => {
      const h = hex.toLowerCase(), map = prop.startsWith('background') ? DK_BG : DK_FG;
      if (prop === 'color' && ice) return m; return map[h] ? `${pre}${prop}:${mid}${map[h]}` : m; });
    if (n !== s) el.setAttribute('style', n);
  });
  darkSvg(root);
}
function hexLight(h){ let x = h.slice(1); if (x.length === 3) x = x.split('').map(c => c + c).join(''); const n = parseInt(x, 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 140; }
function darkSvg(root){ root.querySelectorAll('[fill],[stroke]').forEach(el => ['fill', 'stroke'].forEach(a => { const v = (el.getAttribute(a) || '').toLowerCase(); if (DK_SVG[v]) el.setAttribute(a, DK_SVG[v]); })); }
if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S && S.theme !== 'light' && S.theme !== 'dark') render(); }); } catch (e) { elog(e); }

/* ---------- Herzfrequenz: maximale HF aus den Fahrten, Schwellenpuls, Pulsbereiche ---------- */
function hrRides(){ const m = new Map(); [...(S.hist || []), ...(S.man || [])].forEach(r => { if (r && r.day && daysAgo(r.day) <= 365) m.set(r.id, r); }); return [...m.values()]; }
const hrMaxOf = () => (S.p && S.p.hrMax) || (S.d && S.d.hrMax) || 0;
const lthrOf = () => (S.p && S.step === 0 ? S.p.lthr : S.d && S.d.lthr) || 0;
/* ---------- Mal mit, mal ohne Wattmesser ----------
   Modus „Mal mit, mal ohne“ (S.p.pwMix): Die Einheiten zeigen Watt und Puls. Pro Tag lässt sich „Ohne Wattmesser“ wählen,
   dann zeigt diese Einheit Pulsbereiche und Empfinden statt Watt (wie im Modus ohne Leistungsmesser). Die Bewertung erkennt
   ohnehin an der Datei, ob Watt aufgezeichnet wurden. */
let npOver = null;
const pwMix = () => !!(S.p && S.step === 0 ? S.p.pwMix : S.d && S.d.pwMix);
function npFlag(i){ try { if (!pwMix() || !S.p || i == null || i < 0) return null; return !!(S.npDays || {})[dstr(i)]; } catch (e) { elog(e); return null; } }
function npDaySet(i, off){ const d = dstr(i); S.npDays = {...(S.npDays || {})}; if (off) S.npDays[d] = true; else delete S.npDays[d]; Object.keys(S.npDays).forEach(k => { if (k < iso(-14)) delete S.npDays[k]; }); save(); render(); }
function npToggle(i, dark){
  if (!pwMix() || i == null || i < 0) return '';
  const off = !!(S.npDays || {})[dstr(i)], c = (on, l, fn) => `<button onclick="${fn}" class="text-sm font-semibold" style="padding:6px 12px;border:1px solid ${esc(dark ? 'rgba(255,255,255,.35)' : 'var(--line)')};background:${esc(on ? 'var(--ice)' : 'transparent')};color:${esc(on ? '#071747' : 'inherit')}">${l}</button>`;
  return `<div class="mt-3 flex flex-wrap items-center gap-2"><span class="text-xs" style="opacity:.8">Wattmesser ${i === todayIdx() ? 'heute' : 'an dem Tag'}:</span>${c(!off, 'Mit', `npDaySet(${ja(i)}, false)`)}${c(off, 'Ohne', `npDaySet(${ja(i)}, true)`)}</div>${off && !lthrOf() && !hrMaxOf() ? `<p class="mt-1 text-xs" style="opacity:.8">Ohne Wattmesser richtet sich die Einheit nach dem Empfinden. Mit Schwellenpuls oder maximaler Herzfrequenz (Einstellungen → Herzfrequenz und Leistungsmesser) zeigt sie Pulsbereiche.</p>` : ''}`;
}
function setPwMode(m){ S.d.noPwr = m === 'off'; S.d.pwMix = m === 'mix'; if (S.p && S.step === 0) { S.p.noPwr = S.d.noPwr; S.p.pwMix = S.d.pwMix; } save(); render(); }
const noPwr = () => npOver !== null ? npOver : !!(S.p && S.step === 0 ? S.p.noPwr : S.d && S.d.noPwr);
function hrMaxEst(){
  const c = hrRides().filter(r => r.hrPk >= 120 && r.hrPk <= 215); if (!c.length) return null;
  const b = c.reduce((a, r) => r.hrPk > a.hrPk ? r : a); return {v:b.hrPk, r:b, n:c.length};
}
function lthrEst(){
  const hm = hrMaxOf(), c = hrRides().filter(r => r.h20 > 100), b = c.length ? c.reduce((a, r) => r.h20 > a.h20 ? r : a) : null;
  if (b && (!hm || b.h20 >= .86 * hm)) return {v:Math.round(b.h20 * .95), src:'20', r:b};
  if (hm) return {v:Math.round(hm * .88), src:'max'};
  return null;
}
/* Pulsbereiche nach Coggan in % der Schwellenherzfrequenz, über die %-FTP-Vorgabe der Einheit */
const HRMAP = [[0, 50], [55, 68], [75, 83], [90, 94], [105, 105], [120, 110], [150, 115]];
function hrPct(p){ for (let i = 1; i < HRMAP.length; i++) if (p <= HRMAP[i][0]) { const [a, x] = HRMAP[i - 1], [b, y] = HRMAP[i]; return x + (y - x) * (p - a) / (b - a); } return 115; }
/* Für Antritte und Sprints (ab 120 % FTP) ist der Puls zu träge, dort gibt es keinen Pulsbereich */
function hrRng(lo, hi){ const L = lthrOf(); if (!L || lo >= 120) return null; const mx = hrMaxOf() || 999; return [Math.min(Math.round(L * hrPct(lo) / 100), mx), Math.min(Math.round(L * hrPct(hi) / 100), mx)]; }
function heroInt(x){ const h = hrRng(x.lo, x.hi), w = `<b>${watt(x.lo)}–${watt(x.hi)} W</b>`, hp = h ? `<b>Puls ${hrTxt(h)}</b>` : ''; return noPwr() ? (hp || `<b>Empfinden ${rpeTxt(x)}</b>`) : w + hp; }
const rpeTxt = x => { const r = (typeof RPEX !== 'undefined' && RPEX[x.t]) || [3, 6]; return `${r[0]}–${r[1]}/10`; };
const hrTxt = h => h[1] - h[0] < 3 ? `ab ${h[0]}` : `${h[0]}–${h[1]}`;
function intTiles(x, tl){
  const h = hrRng(x.lo, x.hi), T = (v, l) => tl(v, l);
  if (noPwr()) return (h ? T(hrTxt(h), 'Puls (Schläge/Min.)') : x.lo >= 120 ? T('Vollgas', 'Intensität') : T(`${x.lo}–${x.hi} %`, 'FTP')) + T(rpeTxt(x), 'Empfinden');
  return (h ? '' : T(`${x.lo}–${x.hi} %`, 'FTP')) + T(`${watt(x.lo)}–${watt(x.hi)} W`, 'Leistung') + (h ? T(hrTxt(h), 'Puls') : '');
}
function intDesc(x){ const h = hrRng(x.lo, x.hi); return noPwr() ? (h ? `Puls ${hrTxt(h)}` : `Empfinden ${rpeTxt(x)}`) : `${watt(x.lo)}–${watt(x.hi)} W${h ? `, Puls ${hrTxt(h)}` : ''}`; }
function setHr(k, v){
  const n = v === true || v === false ? v : Math.round(Number(v) || 0);
  if (typeof n === 'number' && n && (n < 90 || n > 230)) { hrMsg = 'Bitte einen Wert zwischen 90 und 230 eintragen.'; return render(); }
  hrMsg = ''; S.d[k] = n || (n === false ? false : null); if (S.p && S.step === 0) S.p[k] = S.d[k];
  save(); render();
}
let hrMsg = '';
const hrInp = (id, k, val, ph) => `<div class="flex flex-wrap items-end gap-2"><input id="${esc(id)}" aria-label="${esc(({hrMax:'Maximalpuls in Schlägen pro Minute', lthr:'Schwellenpuls in Schlägen pro Minute'})[k] || 'Wert')}" type="number" inputmode="numeric" class="inp !w-28" value="${esc(val || '')}" placeholder="${esc(ph || '')}"><button class="ghost !py-2" onclick="setHr('${ja(k)}', document.getElementById('${ja(id)}').value)">Speichern</button></div>`;
function hrBox(){
  const e = hrMaxEst(), hm = hrMaxOf(), lt = lthrEst(), anyP = hrRides().some(r => r.np > 0 || r.m20 > 0);
  if (!e && !hm) return '';
  const hmPart = hm ? `<p class="text-sm">Maximale Herzfrequenz: <b>${hm}</b>${e && e.v > hm ? ` <span style="color:#9a6a00">(in deinen Fahrten schon ${e.v} gemessen)</span>` : ''}</p>${e && e.v > hm ? `<button class="ghost lbl mt-2 !py-1.5" onclick="setHr('hrMax', ${ja(e.v)})">${e.v} übernehmen</button>` : ''}`
    : `<p class="text-sm">Höchster Puls in deinen Fahrten: <b>${e.v}</b> am ${fmt(e.r.day)}.</p><button class="btn !w-auto lbl mt-2 !py-2" onclick="setHr('hrMax', ${ja(e.v)})">${e.v} als maximale Herzfrequenz übernehmen</button>`;
  const noP = !anyP && lt ? `<div class="mt-3 pt-3" style="border-top:1px solid var(--line)"><p class="text-sm">Deine Fahrten haben Pulsdaten, aber keine Leistungsdaten. Die App kann deinen Plan deshalb mit Pulsbereichen statt Watt anzeigen. Geschätzter Schwellenpuls: <b>${lt.v}</b>.</p>${noPwr() ? '<p class="mt-1 text-sm" style="color:var(--ok)">✓ Pulsbereiche sind eingeschaltet.</p>' : `<button class="btn !w-auto lbl mt-2 !py-2" onclick="setHr('lthr', ${ja(lt.v)});setHr('noPwr', true)">Mit Pulsbereichen trainieren</button>`}</div>` : '';
  return `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="font-semibold">Herzfrequenz</p><div class="mt-1">${hmPart}</div><p class="mt-2 text-xs" style="color:var(--mute)">Damit erkennt die App, welche Bestwerte wirklich ausgefahren waren: Lag dein Puls im Schnitt über 88 % der maximalen Herzfrequenz, zählt der Wert als belegt, unter 80 % als nicht ausgefahren. Der höchste gemessene Puls ist eine Untergrenze. Warst du in keiner Fahrt ganz am Limit, liegt deine echte maximale Herzfrequenz höher, dann trag sie selbst ein.</p>${noP}</div>`;
}
function hrHint(){
  if (hrMaxOf()) return ''; const e = hrMaxEst(); if (!e) return '';
  return `<section class="panel p-4" style="border-left:4px solid var(--ice)"><p class="font-semibold">Maximale Herzfrequenz übernehmen?</p><p class="mt-1 text-sm" style="color:var(--mute)">Der höchste Puls in deinen Fahrten war ${e.v} am ${fmt(e.r.day)}. Mit diesem Wert erkennt die Analyse, welche Bestwerte wirklich ausgefahren waren.</p><div class="mt-3 flex flex-wrap gap-2"><button class="btn !py-2" onclick="setHr('hrMax', ${ja(e.v)})">${e.v} übernehmen</button><button class="ghost !py-2" onclick="navGo('more');goPg('settings')">Selbst eintragen</button></div></section>`;
}
function hrSettings(){
  const e = hrMaxEst(), lt = lthrEst(), hm = hrMaxOf(), L = lthrOf();
  const zr = L ? [['Z1', 'Erholung', 0, 55], ['Z2', 'Grundlage', 56, 75], ['Z3', 'Tempo', 76, 90], ['Z4', 'Schwelle', 91, 105], ['Z5', 'VO2max', 106, 120]].map(([z, n, a, b]) => { const r = hrRng(a, b); return [z, n, a ? `${r[0]}–${r[1]}` : `bis ${r[1]}`]; }) : null;
  return fold('hr', 'Herzfrequenz und Leistungsmesser', `<p class="text-sm font-semibold">Maximale Herzfrequenz</p>${hrInp('hrMaxI', 'hrMax', hm, e ? String(e.v) : 'z. B. 185')}${e && e.v !== hm ? `<p class="mt-1 text-xs" style="color:var(--mute)">Höchster Wert in deinen Fahrten: ${e.v} (${fmt(e.r.day)}). <button class="exl" onclick="setHr('hrMax', ${ja(e.v)})">Übernehmen</button></p>` : ''}
    <p class="mt-4 text-sm font-semibold">Schwellenpuls</p>${hrInp('lthrI', 'lthr', L, lt ? String(lt.v) : '')}${lt && lt.v !== L ? `<p class="mt-1 text-xs" style="color:var(--mute)">${lt.src === '20' ? `Geschätzt aus deinem höchsten 20-Minuten-Puls (${lt.r.h20}, ${fmt(lt.r.day)}) × 0,95: ${lt.v}.` : `Grob geschätzt als 88 % der maximalen Herzfrequenz: ${lt.v}. Genauer wird es mit einer harten 20-Minuten-Fahrt mit Puls.`} <button class="exl" onclick="setHr('lthr', ${ja(lt.v)})">Übernehmen</button></p>` : ''}
    ${hrMsg ? `<p class="mt-2 text-sm" style="color:#c0392b">${esc(hrMsg)}</p>` : ''}
    <p class="mt-4 text-sm font-semibold">Leistungsmesser</p><div class="mt-1 flex flex-wrap gap-2">${chip('Immer mit Wattmessung', !noPwr() && !pwMix(), "setPwMode('on')")}${chip('Mal mit, mal ohne', pwMix() && !noPwr(), "setPwMode('mix')")}${chip('Ohne, nur Puls', noPwr(), "setPwMode('off')")}</div>
    <p class="mt-2 text-xs" style="color:var(--mute)">${noPwr() ? (L ? 'Die Einheiten zeigen Pulsbereiche und das passende Empfinden statt Watt.' : 'Trag deinen Schwellenpuls ein, dann zeigen die Einheiten Pulsbereiche. Bis dahin richtet sich die Intensität nach dem Empfinden.') : pwMix() ? 'Die Einheiten zeigen Watt' + (L ? ' und den passenden Pulsbereich' : '') + '. Fährst du an einem Tag ohne Wattmesser, tippe bei der Einheit auf „Wattmesser: Ohne“. Dann zeigt sie ' + (L ? 'Pulsbereiche' : 'das Empfinden') + ' statt Watt. Die Bewertung erkennt an der Datei, ob Watt aufgezeichnet wurden, und bewertet sonst nach Puls.' + (L ? '' : ' Trag dafür am besten deinen Schwellenpuls ein.') : L ? 'Die Einheiten zeigen Watt und zusätzlich den passenden Pulsbereich.' : 'Mit Schwellenpuls zeigen die Einheiten zusätzlich Pulsbereiche.'}</p>
    ${zr ? `<div class="mt-3">${wtbl(['Zone', 'Bereich', 'Puls'], zr)}</div>` : ''}
    <p class="mt-2 text-xs" style="color:var(--mute)">Pulsbereiche nach Coggan in Prozent der Schwellenherzfrequenz. Puls reagiert verzögert und schwankt mit Hitze, Müdigkeit und Koffein: Bei kurzen Intervallen zählt deshalb vor allem das Empfinden. Exporte für Garmin und Zwift nutzen weiter Watt.</p>`, false, [hm ? 'HFmax ' + hm : '', L ? 'Schwelle ' + L : '', noPwr() ? 'ohne Wattmessung' : ''].filter(Boolean).join(' · ') || 'noch nicht eingetragen');
}

/* ---------- Befinden am Tag: Einheit anpassen, wenn man müde oder angeschlagen ist ---------- */
let feelOpen = null;
const FEELS = [['tired', 'Etwas müde', 'Kurzer Schlaf, stressiger Tag, Beine nicht ganz frisch'], ['heavy', 'Richtig platt', 'Schwere Beine, schlecht geschlafen, Puls morgens erhöht'], ['neck', 'Leicht erkältet', 'Nur oberhalb des Halses: Schnupfen, Halskratzen, kein Fieber'], ['sick', 'Krank', 'Fieber, Gliederschmerzen, Husten oder Magen-Darm']];
const FEELT = {tired:'etwas müde', heavy:'richtig platt', neck:'leicht erkältet', sick:'krank'};
const isHardS = x => x && (HARD.includes(x.t) || x.t === 'test' || x.t === 'race');
function feelPlan(b, lv){
  const recR = (m, extra) => ({...REC, m, st:`${m} Min. im kleinen Gang, Puls unter 60 % HFmax, flach.${extra || ''}`});
  if (lv === 'sick') return {...REST, n:'Ruhetag (krank)', st:'Heute kein Training, auch keine Kraft- oder Mobilitätsübungen. Viel trinken, schlafen, gesund werden. Wieder einsteigen, wenn du 24 Stunden fieberfrei bist, und dann zwei Tage locker fahren.', tip:'Training mit Fieber belastet Herz und Kreislauf und kann gefährlich werden.'};
  if (b.parts) {
    const tot = b.parts.reduce((a, q) => a + q.m, 0);
    if (lv === 'tired') return {...b, t:b.t === 'com' ? 'com' : 'base', n:(b.t === 'com' ? b.n : 'Grundlage Z2') + ' (locker)', iv:null, lo:50, hi:65, m:tot, parts:b.parts.map(q => ({lbl:q.lbl, m:q.m, lo:50, hi:65, st:'Locker in Zone 2, heute ohne Intervalle.'}))};
    return {...REC, n:'Rekom-Fahrt (Arbeitsweg locker)', m:tot, parts:b.parts.map(q => ({lbl:q.lbl, m:q.m, lo:45, hi:55, st:'Sehr locker im kleinen Gang, Puls unter 60 % HFmax.'})), tip:lv === 'neck' ? 'Nur wenn du dich auf dem Rad gut fühlst, sonst lieber Bahn oder Auto.' : REC.tip};
  }
  if (!b.m) return {...b};
  if (lv === 'tired') {
    if (b.iv) { const v = {...b.iv, reps:Math.max(2, b.iv.reps - 1)}, m = v.wu + ivCore(v) + v.cd; return {...b, iv:v, m, n:b.n.replace(/(\d+)×(\d+)/, v.reps + '×$2') + ' (leichter)', st:ivTxt(v) + '. Heute ein Intervall weniger und am unteren Ende des Zielbereichs.'}; }
    if (isHardS(b)) return {...b, n:b.n + ' (leichter)', m:Math.max(30, Math.round(b.m * .75 / 5) * 5), hi:Math.max(b.lo, b.hi - 5), st:b.st + ' Heute etwas kürzer und am unteren Ende des Zielbereichs.'};
    return {...b, n:b.n + ' (kürzer)', m:Math.max(30, Math.round(b.m * .75 / 5) * 5), hi:Math.min(b.hi, 70), st:b.st + ' Heute etwa ein Viertel kürzer und betont locker.'};
  }
  if (lv === 'heavy') {
    if (b.t === 'rec') return {...b, m:Math.min(b.m, 30), st:recR(Math.min(b.m, 30)).st};
    if (isHardS(b) || b.t === 'long') return {...D('base', 'Grundlage Z2', Math.min(60, b.m), 50, 65, '90 U/min', `Statt „${b.n}“ heute ${mm(Math.min(60, b.m))} locker in Zone 2, Gespräch muss leicht möglich sein.`, 'Heute bringt dich Erholung weiter als Härte. Die harte Einheit holst du nicht nach.')};
    return recR(Math.min(45, b.m));
  }
  return recR(Math.min(45, b.m), ' Fühlt es sich nach 15 Min. schlechter an, abbrechen. Kein Krafttraining heute.');
}
function feelDay(i, lv){
  const cur = S.plan[i]; if (!cur) return; const b = cur.adapted && cur.orig ? cur.orig : cur;
  if (b.t === 'test' && S.p) { if (lv === 'sick') { const from = addD(dstr(i), 7); S.p.testDue = {from, w:S.wk}; setTimeout(() => { S.log.unshift({title:'Fitness-Check verschoben', day:i, text:`Wegen Krankheit fällt der Fitness-Check heute aus. Er wird frühestens am ${fmt(from)} nachgeholt, wenn du wieder ganz fit bist. Ausfallen lassen kann man ihn nicht: Nur mit aktuellem Wert stimmen deine Trainingsbereiche.`}); save(); render(); }, 0); } else if (S.p.testDue && S.p.testDue.w === S.wk) delete S.p.testDue; }
  [i + 1, i + 2].forEach(k => { const z = S.plan[k]; if (z && z.fu === i && z.orig) { S.plan[k] = z.orig; S.log = S.log.filter(l => l.day !== k); } });
  const y = feelPlan(b, lv); S.plan[i] = {...y, adapted:true, orig:b, feel:lv};
  const what = lv === 'sick' ? 'Heute ist Ruhetag. Erst wieder trainieren, wenn du 24 Stunden fieberfrei bist.' : y.t === b.t && y.m === b.m && !y.iv === !b.iv ? 'Die Einheit bleibt, aber betont locker.' : `Statt „${b.n}“ (${mm(b.m)}) steht jetzt „${y.n}“ (${mm(y.m)}) im Plan.`;
  note(`${DAYS[i]}: ${FEELT[lv]}`, `${what} Du kannst das jederzeit mit „Originaleinheit wiederherstellen“ zurücknehmen.`, i);
  /* Nach Krankheit oder großer Müdigkeit langsam wieder einsteigen */
  const ease = (j, m, st) => { const o = S.plan[j]; S.plan[j] = {...D('base', 'Grundlage Z2', m, 50, 65, '90 U/min', st, 'Die harte Einheit holst du nicht nach, der Plan läuft danach normal weiter.'), adapted:true, orig:o, fu:i}; return o; };
  const free = j => j < 7 && S.plan[j] && S.plan[j].m > 0 && !S.done[j] && S.plan[j].t !== 'race' && !S.plan[j].feel;
  if (lv === 'sick') {
    if (free(i + 1)) { const o = ease(i + 1, Math.min(45, S.plan[i + 1].m), 'Nur wenn du seit 24 Stunden fieberfrei bist, sonst ebenfalls Ruhetag. Locker in Zone 2, höchstens 45 Min.'); note(`${DAYS[i + 1]}: sanfter Wiedereinstieg`, `„${o.n}“ wurde zu höchstens 45 Min. lockerer Grundlage, damit du nach dem kranken Tag nicht zu früh belastest.`, i + 1); }
    if (free(i + 2) && isHardS(S.plan[i + 2])) { const o = ease(i + 2, Math.min(60, S.plan[i + 2].m), 'Zweiter Tag nach der Krankheit: noch locker in Zone 2.'); note(`${DAYS[i + 2]}: locker statt hart`, `„${o.n}“ wurde zu lockerer Grundlage. Zwei lockere Tage nach einer Krankheit senken das Risiko für einen Rückfall.`, i + 2); }
  } else if ((lv === 'heavy' || lv === 'neck') && free(i + 1) && isHardS(S.plan[i + 1])) {
    const o = ease(i + 1, Math.min(60, S.plan[i + 1].m), `Nach einem ${lv === 'heavy' ? 'sehr müden' : 'angeschlagenen'} Tag erst locker wieder einsteigen: ${mm(Math.min(60, S.plan[i + 1].m))} in Zone 2.`);
    note(`${DAYS[i + 1]}: locker statt hart`, `„${o.n}“ wurde zu lockerer Grundlage, damit du nach dem ${lv === 'heavy' ? 'müden' : 'angeschlagenen'} Tag nicht zu früh wieder hart fährst.`, i + 1);
  }
  feelOpen = null; if (heroTab === 'feel') heroTab = null; flashIdx = i; save(); render();
}
/* ---------- Befinden: bei Müdigkeit nachfragen, woher sie kommt ----------
   Müdigkeit kann von wenig Schlaf, Stress oder dem Training kommen, aber auch davon, dass man nach einer Krankheit noch
   angeschlagen ist. Die App fragt nach und passt Einheit, Folgetage und Hinweis an. Nach einer kürzlichen Krankheit
   schlägt sie „Noch angeschlagen“ zuerst vor. */
let feelAsk = null;
const FEELWHY = [['ill', 'Noch angeschlagen von einer Krankheit', 'Erkältung oder Infekt liegt erst ein paar Tage zurück'], ['sleep', 'Wenig oder schlecht geschlafen', ''], ['stress', 'Stress, langer Tag', 'Arbeit, Familie, wenig Zeit für dich'], ['load', 'Das Training steckt in den Beinen', 'Schwere Beine von den letzten Einheiten'], ['unk', 'Weiß nicht genau', '']];
function feelRecentIll(i){
  try { const here = (S.plan || []).some((x, k) => k < i && x && (x.feel === 'sick' || x.feel === 'neck'));
    const prev = S.prevPlan && S.prevPlan.w === S.wk - 1 && (S.prevPlan.plan || []).some((x, k) => x && (x.feel === 'sick' || x.feel === 'neck') && k >= i);
    return here || prev; } catch (e) { elog(e); return false; }
}
function feelAskWhy(i, lv){ feelAsk = {i, lv}; render(); }
function feelDayWhy(i, lv, why){
  feelAsk = null;
  const lvA = why === 'ill' ? 'heavy' : lv, ht = heroTab, fo = typeof feelOpen !== 'undefined' ? feelOpen : null; feelDay(i, lvA); heroTab = ht; try { feelOpen = fo; } catch (e) { elog(e); }
  const x = S.plan[i]; if (x) { x.feel = lv; x.feelWhy = why; }
  const ease = (j, m, st) => { const o = S.plan[j]; S.plan[j] = {...D('base', 'Grundlage Z2', m, 50, 65, '90 U/min', st, 'Die harte Einheit holst du nicht nach, der Plan läuft danach normal weiter.'), adapted:true, orig:o, fu:i}; return o; };
  const free = j => j < 7 && S.plan[j] && S.plan[j].m > 0 && !S.done[j] && S.plan[j].t !== 'race' && !S.plan[j].feel && !S.plan[j].fu;
  if (why === 'ill') [i + 1, i + 2].forEach((j, n) => { if (free(j) && isHardS(S.plan[j])) { const o = ease(j, Math.min(60, S.plan[j].m), `${n ? 'Zweiter' : 'Erster'} Tag nach dem angeschlagenen Tag: noch locker in Zone 2.`); note(`${DAYS[j]}: locker statt hart`, `„${o.n}“ wurde zu lockerer Grundlage. Nach einer Krankheit braucht der Körper oft noch ein paar Tage, auch wenn das Fieber weg ist.`, j); } });
  const adv = {
    ill:'Nach einer Krankheit ist der Körper oft noch einige Tage geschwächt, auch ohne Fieber. Deshalb heute nur locker und die nächsten zwei Tage ohne harte Einheit. Kommen Fieber, Husten oder Gliederschmerzen dazu, wechsle auf „Krank“.',
    sleep:'Schlaf ist der wichtigste Erholungsfaktor. Geh heute früher ins Bett, meist geht es morgen wieder normal weiter.',
    stress:'Stress belastet den Körper ähnlich wie Training. Locker fahren hilft beim Abschalten, hart fahren käme heute noch obendrauf.',
    load:'Das ist im Aufbau normal. Iss heute genug Kohlenhydrate und Eiweiß und schlaf ausreichend. Fühlst du dich mehrere Tage so, plan eine Erholungswoche ein.',
    unk:''}[why] || '';
  const tiredN = (S.plan || []).filter(z => z && (z.feel === 'tired' || z.feel === 'heavy')).length;
  const more = tiredN >= 3 ? ' Du warst diese Woche schon mehrmals müde. Das ist ein Zeichen, mehr Erholung einzuplanen oder die Wochenzeit zu senken.' : '';
  const l = (S.log || []).find(z => z.user && z.day === -2 && z.d === i); if (l) { l.title = `${DAYS[i]}: ${FEELT[lv]}${why !== 'unk' ? ' (' + {ill:'noch angeschlagen', sleep:'wenig Schlaf', stress:'Stress', load:'Trainingsmüdigkeit'}[why] + ')' : ''}`; l.text = l.text + (adv ? ' ' + adv : '') + more; }
  feelMsg = {i, t:adv + more}; save(); render();
}
let feelMsg = null;
function feelBox(i){
  const x = S.plan[i];
  return `<div class="feelb"><p class="font-semibold">Wie geht es dir ${i === todayIdx() ? 'heute' : 'am ' + DAYS[i]}?</p><p class="mt-0.5 text-sm" style="color:var(--mute)">Die App passt die Einheit an. Du kannst das jederzeit zurücknehmen.</p>
    ${x && x.feel ? `<p class="mt-2 text-sm" style="color:var(--ok)">✓ Angepasst: ${FEELT[x.feel]}.</p><button class="ghost mt-2 !py-1.5 text-sm" onclick="undo(${ja(i)})">${x.feel === 'sick' ? 'Wieder gesund: Originaleinheit zurück' : 'Anpassung zurücknehmen'}</button>` : ''}
    ${feelMsg && feelMsg.i === i && feelMsg.t ? `<p class="mt-2 p-2.5 text-sm" style="background:var(--tint);border:1px solid var(--line)">${esc(feelMsg.t)}</p>` : ''}
    ${feelAsk && feelAsk.i === i ? (() => { const ill = feelRecentIll(i), list = ill ? FEELWHY : [...FEELWHY.slice(1, 4), FEELWHY[0], FEELWHY[4]]; return `<div class="mt-3"><p class="font-semibold">${FEELT[feelAsk.lv][0].toUpperCase() + FEELT[feelAsk.lv].slice(1)}: Was steckt vermutlich dahinter?</p><p class="mt-0.5 text-sm" style="color:var(--mute)">Dann passt die App die Einheit und die nächsten Tage genauer an.${ill ? ' Du warst vor Kurzem krank oder erkältet. Oft steckt das noch in den Knochen.' : ''}</p><div class="mt-2 grid gap-2">${list.map(([k, l, d]) => `<button class="feelo${esc(ill && k === 'ill' ? ' on' : '')}" onclick="feelDayWhy(${ja(i)}, '${ja(feelAsk.lv)}', '${ja(k)}')"><b>${l}</b>${d ? `<span>${d}</span>` : ''}</button>`).join('')}</div><button class="mt-2 text-sm underline" style="color:var(--mute);background:none;border:0" onclick="feelAsk=null;render()">Zurück</button></div>`; })() : `<div class="mt-2 grid gap-2">${FEELS.map(([k, l, s]) => `<button class="feelo${esc(x && x.feel === k ? ' on' : '')}" onclick="${k === 'tired' || k === 'heavy' ? `feelAskWhy(${ja(i)}, '${ja(k)}')` : `feelMsg=null;feelDay(${ja(i)}, '${ja(k)}')`}"><b>${l}</b><span>${s}</span></button>`).join('')}</div>`}
    <p class="mt-2 text-xs" style="color:var(--mute)">Faustregel bei Erkältung („Neck Check“): Symptome nur oberhalb des Halses erlauben lockeres Bewegen, Fieber oder Symptome unterhalb des Halses heißen Pause. Hohe Belastung bei Krankheit erhöht das Risiko für längere Ausfälle (${pLink('IOC-Konsens 2016', 'iocill')}). Bei Brustschmerzen, Atemnot oder Herzstolpern ärztlich abklären lassen.</p></div>`;
}
function feelCtl(x, i, cur){
  if (!cur || i < todayIdx() || x.blocked || S.done[i] || (!x.m && !strMap[i] && !mobMap[i] && !x.feel)) return '';
  return `<button onclick="feelOpen=feelOpen===${ja(i)}?null:${ja(i)};render()" class="ghost !py-2 text-sm" aria-expanded="${feelOpen === i}">${x.feel ? 'Befinden ändern' : 'Nicht fit?'}</button>${feelOpen === i ? `<div class="w-full">${feelBox(i)}</div>` : ''}`;
}
PSRC.iocill = 'https://pubmed.ncbi.nlm.nih.gov/27535991/';

/* ---------- Pendeln und Zeit pro Tag: Arbeitsweg (einfache Strecke) ist fest, an Pendeltagen gilt mindestens Hin- plus Rückweg ---------- */
const comOn = (d, i) => !!(d && d.commuter && d.commute && d.commute[i] && d.avail && d.avail[i]);
const comLeg = d => d && d.commuteMin > 0 ? d.commuteMin : 20;
const comFix = (d, i) => comOn(d, i) ? 2 * comLeg(d) : 0;
function normDays(d){
  if (!d || !d.dayMin || !d.avail) return;
  if (!d.comV2) {
    /* Früher war an Pendeltagen die Tageszeit selbst der Arbeitsweg (je zur Hälfte). Daraus die einfache Strecke ableiten. */
    if (d.perDay && d.commuter) { const ls = d.commute.map((c, i) => c && d.avail[i] && d.dayMin[i] > 0 ? d.dayMin[i] / 2 : null).filter(Boolean).sort((a, b) => a - b); if (ls.length) d.commuteMin = Math.max(5, Math.floor(ls[0] / 5) * 5); }
    d.comV2 = true;
  }
  if (d.perDay) { d.dayMin = d.dayMin.map((m, i) => comOn(d, i) ? Math.max(m || 0, comFix(d, i)) : m); d.hours = Math.max(.5, dsum(d) / 60); }
}
function setComX(i, v){
  const d = S.d; d.dayMin[i] = comFix(d, i) + Math.max(0, Math.round(Number(v) || 0)); d.hours = dsum(d) / 60; save();
  const e = document.getElementById('dt' + i); if (e) e.textContent = mm(d.dayMin[i]);
  const t = document.getElementById('dtot'); if (t) { t.innerHTML = dayTotal(d); postRender(t); }
}
function setComMin(v){
  const d = S.d, ov = comLeg(d), nv = Math.max(5, Math.min(180, Math.round(Number(v) || 0)));
  if (d.perDay) d.dayMin = d.dayMin.map((m, i) => comOn(d, i) ? Math.max(2 * nv, (m || 0) + 2 * (nv - ov)) : m);
  d.commuteMin = nv; normDays(d); save(); render();
}
/* Tag wird Pendeltag oder hört auf, einer zu sein: Tageszeit sinnvoll mitführen */
function comToggled(d, i, on){
  if (!d.perDay) return; d.dayPre = d.dayPre || [];
  if (on) { d.dayPre[i] = d.dayMin[i] || 0; d.dayMin[i] = Math.max(d.dayMin[i] || 0, 2 * comLeg(d)); }
  else { const rest = (d.dayMin[i] || 0) - 2 * comLeg(d), pre = d.dayPre[i]; d.dayMin[i] = pre >= 30 ? pre : rest >= 30 ? rest : 60; d.dayPre[i] = null; }
  d.hours = dsum(d) / 60;
}
/* Wochenstunden auf Tage verteilen: zuerst der Arbeitsweg an Pendeltagen, der Rest auf die übrigen Tage, der Long-Ride-Tag bekommt am meisten */
function spreadH(d, H){
  const idx = [0, 1, 2, 3, 4, 5, 6].filter(i => d.avail[i]), a = [...d.dayMin]; if (!idx.length) return a;
  const fixed = idx.filter(i => comOn(d, i)), free = idx.filter(i => !comOn(d, i)), tot = Math.round(H * 60);
  fixed.forEach(i => { a[i] = 2 * comLeg(d); });
  let left = tot - fixed.reduce((q, i) => q + a[i], 0);
  if (!free.length) { if (left > 0 && fixed.length) { const ld = fixed.includes(d.longDay) ? d.longDay : fixed[fixed.length - 1]; a[ld] += Math.floor(left / 15) * 15; } return a; }
  const ld = free.includes(d.longDay) ? d.longDay : free[free.length - 1], n = free.length + 1;
  free.forEach(i => { a[i] = i === ld ? 0 : Math.max(30, Math.floor(Math.max(0, left) / n / 15) * 15); });
  a[ld] = Math.max(45, left - free.reduce((q, i) => q + (i === ld ? 0 : a[i]), 0));
  return a;
}
/* Vorschau: So verteilt die App deine Zeit in einer typischen Aufbauwoche */
function weekPrev(d){
  if (!d.avail.some(Boolean)) return '';
  let pv, wk, tot; try { pv = mkPrev(d); const ph = phases(pv); tot = ph[ph.length - 1].to; wk = genWeek(pv, Math.min(tot, 2), true); } catch (e) { elog(e); return ''; }
  const sum = wk.reduce((a, x) => a + (x.m || 0), 0), cs = wk.reduce((a, x, i) => a + (comOn(pv, i) ? 2 * comLeg(pv) : 0), 0);
  const cells = wk.map((x, i) => { const c = comOn(pv, i), T = TYPES[x.t] || TYPES.rest, ex = c && x.m > 2 * comLeg(pv) ? x.m - 2 * comLeg(pv) : 0;
    return `<div class="wsd${esc(!d.avail[i] ? ' pre' : '')}" style="cursor:default"><span>${SD[i]}</span><i class="bar" style="background:${esc(x.m ? T.c : 'var(--line)')}"></i><b>${x.m ? shortM(x.m) : '–'}</b><em style="color:var(--mute);font-weight:600;font-size:.62rem">${c ? (ex ? 'P+' + ex : 'Pendeln') : ''}</em></div>`; }).join('');
  return `<div class="mt-3 p-3" style="background:var(--tint);border:1px solid var(--line)"><p class="text-sm font-semibold">So verteilt die App deine Zeit (Beispiel: Woche 2)</p><div class="wstrip mt-2">${cells}</div>
    <p class="mt-2 text-xs" style="color:var(--mute)">Zusammen pro Woche: <b>${mm(sum)}</b>.${cs ? ` Davon Arbeitsweg: ${mm(cs)} (${wk.filter((x, i) => comOn(pv, i)).length} × Hin- und Rückweg à ${comLeg(pv)} Min.). „Pendeln“ ist nur der Arbeitsweg, „P+30“ der Arbeitsweg plus 30 Min. Training, etwa als Intervalle auf dem Hinweg oder als Umweg auf dem Heimweg.` : ''} Aufbauwochen sind etwas länger, jede vierte Woche ist kürzer.</p></div>`;
}

