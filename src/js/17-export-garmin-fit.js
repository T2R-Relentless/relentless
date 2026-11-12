/* ---------- Garmin-Export (.fit-Trainingsdatei, Format laut FIT-SDK "Workout") ---------- */
let viewPlan = [], exMsg = null;
/* Abzeichen für geänderte Einheiten: sagt, warum die Einheit anders ist als geplant (vorher pauschal „KI-angepasst“) */
const adLabel = x => x.feel ? 'Nach Befinden' : x.fu != null || x.sickC ? 'Schontag' : /\((reduziert|gekürzt)\)/.test(x.n || '') ? 'Reduziert' : 'Angepasst';
const crcT = [0x0000,0xCC01,0xD801,0x1400,0xF001,0x3C00,0x2800,0xE401,0xA001,0x6C00,0x7800,0xB401,0x5000,0x9C01,0x8801,0x4400];
function fitCrc(b, c = 0){ for (const v of b) { let t = crcT[c & 15]; c = (c >> 4) & 0x0FFF; c = c ^ t ^ crcT[v & 15]; t = crcT[c & 15]; c = (c >> 4) & 0x0FFF; c = c ^ t ^ crcT[(v >> 4) & 15]; } return c; }
const asc = t => String(t).replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue').replace(/ß/g,'ss').replace(/×/g,'x').replace(/[^\x20-\x7E]/g,'');
function fitSteps(p, x, part){
  const st = [], pw = pct => Math.round(p.ftp * pct / 100) + 1000, T = m => Math.round(m * 60000);
  const add = (name, min, lo, hi, it) => st.push({name, dur:0, dv:T(min), tt:4, tv:0, lo:pw(lo), hi:pw(hi), it});
  const iv = part ? part.iv : x.iv;
  if (iv && iv.reps) {
    const total = part ? part.m : x.m, core = ivCore(iv), rem = Math.max(10, total - core - (iv.pad || 0));
    const w0 = iv.wu || 15, c0 = iv.cd || 10, wu = Math.max(5, Math.round(rem * w0 / (w0 + c0))), cd = Math.max(5, rem - wu) + (iv.pad || 0);
    add('Einfahren', wu, 50, 65, 2);
    if (iv.seq) iv.seq.forEach((wk, q) => { add('Intervall', wk, iv.lo, iv.hi, 0); if (q < iv.seq.length - 1) add('Pause', iv.rest, 40, 55, 1); });
    else for (let s = 0; s < (iv.sets || 1); s++) {
      add('Intervall', iv.work, iv.lo, iv.hi, 0);
      if (iv.reps >= 2) {
        add(iv.rlo ? 'Unter Schwelle' : 'Pause', iv.rest, iv.rlo || 40, iv.rhi || 55, iv.rlo ? 0 : 1);
        if (iv.reps - 1 >= 2) st.push({name:'', dur:6, dv:st.length - 2, tt:2, tv:iv.reps - 1, lo:0, hi:0, it:0});
        add('Intervall', iv.work, iv.lo, iv.hi, 0);
      }
      if (s < (iv.sets || 1) - 1) add('Serienpause', iv.sr || 3, 40, 55, 1);
    }
    add('Ausfahren', cd, 45, 55, 3);
  } else add(x.t === 'rec' ? 'Rekom' : 'Grundlage', part ? part.m : x.m, (part && part.lo) || x.lo, (part && part.hi) || x.hi, 0);
  return st;
}
function fitBytes(name, steps){
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const str = (t, n) => { const a = Array.from(new TextEncoder().encode(t)).slice(0, n - 1); while (a.length < n) a.push(0); return a; };
  const def = (loc, num, f) => [0x40 | loc, 0, 0, ...u16(num), f.length, ...f.flat()];
  let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = [];
  r.push(...def(0, 0, [[0,1,0x00],[1,2,0x84],[2,2,0x84],[3,4,0x8C],[4,4,0x86]]), 0, 5, ...u16(255), ...u16(1), ...u32(h || 1), ...u32(Math.floor(Date.now() / 1000) - 631065600));
  r.push(...def(1, 26, [[4,1,0x00],[6,2,0x84],[8,16,0x07]]), 1, 2, ...u16(steps.length), ...str(name, 16));
  r.push(...def(2, 27, [[254,2,0x84],[0,16,0x07],[1,1,0x00],[2,4,0x86],[3,1,0x00],[4,4,0x86],[5,4,0x86],[6,4,0x86],[7,1,0x00]]));
  steps.forEach((q, i) => r.push(2, ...u16(i), ...str(q.name, 16), q.dur, ...u32(q.dv), q.tt, ...u32(q.tv), ...u32(q.lo), ...u32(q.hi), q.it));
  const hd = [14, 0x20, ...u16(2132), ...u32(r.length), 0x2E, 0x46, 0x49, 0x54];
  hd.push(...u16(fitCrc(hd)));
  const all = [...hd, ...r]; all.push(...u16(fitCrc(all)));
  return new Uint8Array(all);
}
function zwoXml(p, x, part, name){
  const E = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), r2 = v => (Math.round(v) / 100).toFixed(2), sec = m => Math.round(m * 60);
  const iv = part ? part.iv : x.iv, b = [];
  if (iv && iv.reps) {
    const total = part ? part.m : x.m, core = ivCore(iv), rem = Math.max(10, total - core - (iv.pad || 0));
    const w0 = iv.wu || 15, c0 = iv.cd || 10, wu = Math.max(5, Math.round(rem * w0 / (w0 + c0))), cd = Math.max(5, rem - wu) + (iv.pad || 0), mid = (iv.lo + iv.hi) / 2;
    b.push(`<Warmup Duration="${sec(wu)}" PowerLow="${r2(50)}" PowerHigh="${r2(65)}"/>`);
    if (iv.seq) iv.seq.forEach((wk, q) => { b.push(`<SteadyState Duration="${sec(wk)}" Power="${r2(mid)}"/>`); if (q < iv.seq.length - 1) b.push(`<SteadyState Duration="${sec(iv.rest)}" Power="${r2(50)}"/>`); });
    else for (let s = 0; s < (iv.sets || 1); s++) {
      /* IntervalsT hängt an jede Wiederholung eine Pause an. Darum reps − 1 im Block und das letzte Intervall einzeln, so stimmt die Dauer mit dem Plan überein. */
      if (iv.reps >= 2) b.push(`<IntervalsT Repeat="${iv.reps - 1}" OnDuration="${sec(iv.work)}" OffDuration="${sec(iv.rest)}" OnPower="${r2(mid)}" OffPower="${r2(iv.rlo ? (iv.rlo + iv.rhi) / 2 : 50)}"/>`);
      b.push(`<SteadyState Duration="${sec(iv.work)}" Power="${r2(mid)}"/>`);
      if (s < (iv.sets || 1) - 1) b.push(`<SteadyState Duration="${sec(iv.sr || 3)}" Power="${r2(50)}"/>`);
    }
    b.push(`<Cooldown Duration="${sec(cd)}" PowerLow="${r2(60)}" PowerHigh="${r2(45)}"/>`);
  } else { const lo = (part && part.lo) || x.lo, hi = (part && part.hi) || x.hi; b.push(`<SteadyState Duration="${sec(part ? part.m : x.m)}" Power="${r2((lo + hi) / 2)}"/>`); }
  const desc = (part ? part.st : x.st) || '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<workout_file>\n  <author>Relentless</author>\n  <name>${E(name)}</name>\n  <description>${E(desc)}</description>\n  <sportType>bike</sportType>\n  <tags/>\n  <workout>\n    ${b.join('\n    ')}\n  </workout>\n</workout_file>\n`;
}
function exportFit(i, k, fmt){
  const x = viewPlan[i]; if (!x || !x.m || !S.p) return;
  const part = k >= 0 && x.parts ? x.parts[k] : null, w = vw ?? S.wk;
  const label = (part ? (part.lbl === 'Hinweg' ? 'Hin ' : 'Rueck ') : '') + x.n, name = asc(label).trim().slice(0, 15).trim();
  const zw = fmt === 'zwo', zx = zw && x.parts ? (x.unsplit || x) : x, bytes = zw ? new TextEncoder().encode(zwoXml(S.p, zx, null, asc(x.n).trim())) : fitBytes(name, fitSteps(S.p, x, part));
  const file = `relentless-w${w}-${SD[i].toLowerCase()}-${asc(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${zw ? 'zwo' : 'fit'}`;
  saveFile(file, bytes).then(f2 => { exMsg = {i, f:f2}; render(); }).catch(e => { if (e && e.code === 'declined') return; exMsg = {i, f:null, err:true}; render(); });
}
const crc32 = b => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
function zipOne(name, data){
  const n = new TextEncoder().encode(name), c = crc32(data), le = (v, k) => Array.from({length:k}, (_, j) => (v >>> (8 * j)) & 255);
  const lh = [0x50,0x4B,3,4, ...le(20,2), ...le(0,2), ...le(0,2), ...le(0,2), ...le(0x21,2), ...le(c,4), ...le(data.length,4), ...le(data.length,4), ...le(n.length,2), ...le(0,2), ...n];
  const cd = [0x50,0x4B,1,2, ...le(20,2), ...le(20,2), ...le(0,2), ...le(0,2), ...le(0,2), ...le(0x21,2), ...le(c,4), ...le(data.length,4), ...le(data.length,4), ...le(n.length,2), ...le(0,2), ...le(0,2), ...le(0,2), ...le(0,2), ...le(0,4), ...le(0,4), ...n];
  const end = [0x50,0x4B,5,6, 0,0,0,0, 1,0,1,0, ...le(cd.length,4), ...le(lh.length + data.length,4), 0,0];
  return new Uint8Array([...lh, ...data, ...cd, ...end]);
}
async function saveFile(file, bytes){
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { elog(e); }
  if (dl && /\.(json|zip)$/.test(file)) { await dl.save({filename:file, data:bytes}); return file; }
  if (dl) { const zn = file.replace(/\.(fit|zwo)$/, '.zip'); await dl.save({filename:zn, data:zipOne(file, bytes)}); return zn + ' (ZIP: vor dem Kopieren entpacken)'; }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && navigator.canShare && typeof File === 'function') { const mt = /\.json$/.test(file) ? 'application/json' : /\.zip$/.test(file) ? 'application/zip' : /\.ics$/.test(file) ? 'text/calendar' : /\.csv$/.test(file) ? 'text/csv' : 'application/octet-stream', fl = new File([bytes], file, {type:mt});
    if (navigator.canShare({files:[fl]})) { try { await navigator.share({files:[fl]}); return file; } catch (e) { if (e && e.name === 'AbortError') { const er = new Error('declined'); er.code = 'declined'; throw er; } } } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], {type:'application/octet-stream'})); a.download = file;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return file;
}
const exportBtns = (x, i) => {
  if (!x.m) return '';
  const g = (x.parts ? x.parts.map((q, k) => [k, q.lbl + ' ']) : [[-1, '']]).map(([k, l]) => `<button onclick="exportFit(${ja(i)},${ja(k)},'fit')" class="ghost !py-2 text-sm">${l}Garmin (.fit)</button>`).join('');
  const z = x.parts ? `<button onclick="exportFit(${ja(i)},-1,'zwo')" class="mt-1 w-full text-left text-sm underline" style="color:var(--mute)">Doch lieber auf der Rolle fahren? Ganze Einheit als Zwift-Training (.zwo)</button>` : `<button onclick="exportFit(${ja(i)},-1,'zwo')" class="ghost !py-2 text-sm">Zwift (.zwo)</button>`;
  return g + z;
};
const garminHelp = () => fold('exp', 'Export: Garmin und Zwift', `<div class="text-sm">
  <ol class="mt-3 list-decimal space-y-1.5 pl-5" style="color:var(--mute)">
  <li>Öffne eine Einheit und tippe auf „Garmin (.fit)“ oder „Zwift (.zwo)“. Die .fit-Datei ist ein Trainingsplan (Workout), keine Strecke. Importiere sie deshalb nicht bei Garmin Connect unter „Strecken“. An Pendeltagen exportierst du Hinweg und Rückweg einzeln.</li>
  <li>Verbinde dein Garmin-Gerät per USB. Edge und Forerunner erscheinen als Laufwerk. Neuere Uhren mit Musikspeicher laufen über MTP, am Mac z. B. mit OpenMTP.</li>
  <li>Kopiere die Datei in den Ordner <b>GARMIN/NewFiles</b>. Bei manchen Geräten gehört sie direkt nach <b>GARMIN/Workouts</b>.</li>
  <li>Gerät auswerfen. Die Einheit liegt dann unter Training &gt; Workouts. Erscheint sie nicht, starte das Gerät neu.</li></ol>
  <p class="mt-3" style="color:var(--mute)"><b>Zwift:</b> Kopiere die .zwo-Datei in den Ordner Dokumente/Zwift/Workouts (Windows) bzw. Dokumente/Zwift/Workouts (Mac). Die Leistung steht dort in Prozent deines FTP, die Datei passt sich also automatisch an deinen Zwift-FTP an. Bei Wattbereichen nimmt die Datei die Mitte des Bereichs.</p><p class="mt-3" style="color:var(--mute)">Die Leistungsziele (Garmin) sind absolute Watt-Werte aus deinem FTP (${S.p.ftp} W) zum Zeitpunkt des Exports. Ändert sich dein FTP, exportiere die Einheit neu. Manche Geräte speichern nur wenige Trainings oder eines nach dem anderen. Garmin Connect selbst nimmt FIT-Trainingsdateien laut <a class="underline" target="_blank" rel="noopener" href="https://help.trainingpeaks.com/hc/en-us/articles/115001076908-Structured-Workout-Export-for-Garmin-Devices">TrainingPeaks-Hilfe</a> nicht an, der Weg läuft über das Gerät.</p></div>`, false);

let dtab = {};
function setTab(i, k){ dtab[strWeek + '-' + i] = k; render(); }
const MINI = {ride:'<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l5-8h4l3 8"/>', str:'<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>', mob:'<path d="M4 18c3-9 13-9 16 0M12 4v4"/>', stab:'<path d="M3 17h18M5 17l3-5h10"/>'};
const mini = (k, c) => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="square" aria-hidden="true" style="flex:none">${MINI[k]}</svg>`;
function dayCard(x, i, cur = true){ try { /* npOver gilt nur während dieses Aufbaus, siehe finally */
  npOver = cur ? npFlag(i) : null;
  const T = TYPES[x.t], t = cur ? todayIdx() : -1, dn = cur && S.done[i], isOpen = open === i, past = i < t;
  const sm = strMap[i], mb = mobMap[i], sDn = cur && sm && S.strDone && S.strDone[strKey(i)], mDn = cur && mb && S.mobDone && S.mobDone[mobKey(i)];
  const mk = mb ? (mb.n === 'Mobilität' ? 'mob' : 'stab') : null, extras = !!(sm || mb), total = (x.m || 0) + (sm ? sm.m : 0) + (mb ? mb.m : 0);
  const comp = [x.m ? ['ride', x.n, x.m, dn, T.c] : null, sm ? ['str', 'Kraft', sm.m, sDn, '#0b1c49'] : null, mb ? [mk, mb.n, mb.m, mDn, '#007f8d'] : null].filter(Boolean);
  const chips = extras ? `<span class="mt-2 flex flex-wrap gap-1.5">${comp.map(([k, l, m, d, c]) => `<span class="dchip" role="link" tabindex="0" style="cursor:pointer;${esc(d ? 'border-color:var(--ok);color:var(--ok)' : '')}" onclick="event.stopPropagation();openTab(${ja(i)},'${k === 'ride' ? 'ride' : k === 'str' ? 'str' : 'mob'}')">${mini(k, d ? 'var(--ok)' : c)}<span>${k === 'ride' ? 'Rad' : esc(l)} ${mm(m)}${k === 'ride' ? '' : ' · Übungen'}</span>${d ? '<b>✓</b>' : '<b aria-hidden="true">›</b>'}</span>`).join('')}</span>` : '';
  const head = `<button onclick="tog(${ja(i)})" class="flex w-full items-center gap-3 p-3.5 text-left">
    <span class="w-1.5 self-stretch rounded-full" style="background:${esc(x.m ? T.c : extras ? '#007f8d' : T.c)}"></span>
    <span class="min-w-0 flex-1"><span class="flex flex-wrap items-center gap-2 text-sm" style="color:var(--mute)">${DAYS[i]}${i===t?'<b class="rounded-full px-2 text-xs" style="background:var(--ice);color:#071747">Heute</b>':''}${(cur || (typeof strWeek === 'number' && strWeek > S.wk)) && x.moved && x.from != null ? `<b class="rounded-full px-2 text-xs" style="background:var(--tint);color:var(--teal);border:1px solid var(--line)">verschoben von ${SD[x.from]}</b>` : ''}${(cur || (typeof strWeek === 'number' && strWeek > S.wk)) && x.varOf ? `<b class="rounded-full px-2 text-xs" style="background:var(--tint);color:var(--teal);border:1px solid var(--line)">Variante</b>` : ''}${x.feel==='sick'?'<b class="rounded-full px-2 text-xs" style="background:#fca5a5;color:#450a0a">Krank</b>':x.adapted?`<b class="rounded-full px-2 text-xs" style="background:#34d399;color:#04231a">${adLabel(x)}</b>`:''}${(() => { const c = cycInfo(S.p, dstrW(i)); return c ? `<b class="rounded-full px-2 text-xs" style="background:${esc(c.bg)};color:${esc(c.col)}">Zyklustag ${c.day} · ${c.label}</b>` : ''; })()}${x.cycMoved && x.cycMoved.from !== undefined ? `<b class="rounded-full px-2 text-xs" style="background:#7a64c6;color:#fff">vom ${SD[x.cycMoved.from]} verlegt</b>` : ''}${bdg(x)}${x.parts ? '<b class="rounded-full px-2 text-xs" style="background:#2dd4bf;color:#04231f">Hin- und Rückweg</b>' : ''}${cur && S.actual && S.actual[i] ? '<b class="rounded-full px-2 text-xs" style="background:#FC4C02;color:#fff">gefahren</b>' : ''}</span>
      <span class="hd block text-xl font-semibold ${esc(dn?'line-through opacity-60':'')}">${x.orig?`<s class="mr-1 text-base font-medium" style="color:var(--mute)">${esc(x.orig.n)}</s>`:''}${x.m || !extras ? esc(x.n) : 'Radfrei · ' + esc([sm ? 'Kraft' : '', mb ? mb.n : ''].filter(Boolean).join(' und '))}</span>${chips}</span>
    <span class="shrink-0 text-right"><span class="hd block text-lg font-semibold" style="color:${esc(T.c)}">${x.m ? mm(x.m) : extras ? '' : 'frei'}</span><span class="text-xs" style="color:var(--mute)">${x.m ? 'TSS ~' + tss(x) : ''}${extras && total ? `<br>Tag gesamt ${mm(total)}` : ''}</span></span></button>`;
  let det = '';
  if (isOpen) {
    const tabs = [x.m || !extras ? ['ride', 'Rad'] : null, sm ? ['str', 'Kraft'] : null, mb ? ['mob', mb.n] : null].filter(Boolean);
    let tab = dtab[strWeek + '-' + i]; if (!tabs.some(q => q[0] === tab)) tab = tabs[0][0];
    const ride = `${x.m ? `<div class="grid grid-cols-3 gap-2 text-center">
      ${intTiles(x, (v, l) => `<div class="rounded-lg p-2" style="background:var(--tint)"><div class="hd text-lg font-semibold">${v}</div><div class="text-xs" style="color:var(--mute)">${l}</div></div>`)}
      <div class="rounded-lg p-2" style="background:var(--tint)"><div class="hd text-lg font-semibold">${zone(x.hi)}</div><div class="text-xs" style="color:var(--mute)">Zone, ${band(x.hi)}</div></div></div>
      <p><b>Trittfrequenz:</b> ${x.cad}</p>${cur && typeof npToggle === 'function' ? npToggle(i, false) : ''}` : ''}
    ${cur && S.actual && S.actual[i] && !exeGet(exeWk(), i) ? `<p><b>Gefahren:</b> ${mm(Math.round(S.actual[i].sec / 60))}, TSS ${S.actual[i].tss}</p>` : ''}${exeBlock(x, i, cur)}${x.parts ? x.parts.map(q => `<p><b>${q.lbl} (${mm(q.m)}):</b> ${q.st}</p>`).join('') : `<p><b>Ablauf:</b> ${x.st}</p>`}${x.t === 'test' ? testBox(typeof strWeek === 'number' ? strWeek : S.wk, i, cur) : ''}<p style="color:var(--mute)">Tipp: ${x.tip}</p>${cloDetails(x, i, cur)}<details class="evfuel"><summary>Verpflegung für diesen Tag</summary><div class="mt-2">${fuelTip(x, i, S.p)}</div></details>
    <div class="flex flex-wrap gap-2">${x.m && cur ? `<button onclick="tick(${ja(i)})" class="ghost !py-2 text-sm" style="${esc(dn?'color:var(--ok);border-color:var(--ok)':'')}">${dn?'✓ Erledigt':'Als erledigt markieren'}</button>` : ''}
    ${x.adapted && cur ? `<button onclick="undo(${ja(i)})" class="ghost !py-2 text-sm">Originaleinheit wiederherstellen</button>` : ''}${ctl(x, i, cur)}</div>${x.m ? `<div class="-mx-4 border-t px-4 pt-3" style="border-color:var(--line)"><p class="eyebrow mb-2">Downloads</p><div class="flex flex-wrap gap-2">${exportBtns(x, i)}</div></div>` : ''}${exMsg && exMsg.i === i && cur === (vw === null) ? `<p class="text-sm" style="color:var(--ok)">${exMsg.err ? '⚠ Download nicht möglich.' : '✓ ' + esc(exMsg.f) + ' gespeichert. ' + (/zwo/.test(exMsg.f) ? 'Lege die .zwo-Datei in Dokumente/Zwift/Workouts.' : 'Kopiere die .fit-Datei per USB nach GARMIN/NewFiles.')}</p>` : ''}`;
    const order = tabs.length > 1 ? `<p class="text-xs" style="color:var(--mute)"><b style="color:var(--ink)">Tagesablauf:</b> ${[x.m ? 'zuerst Rad' : '', sm ? (x.m ? (['sst','thr','vo2','long','race'].includes(x.t) ? 'Kraft mit einigen Stunden Abstand, zum Beispiel abends' : 'danach Kraft') : 'Kraft') : '', mb ? (mb.n === 'Mobilität' ? 'Mobilität zum Schluss oder abends' : 'Stabilität im Anschluss oder abends') : ''].filter(Boolean).join(', ')}.</p>` : '';
    const tmin = k => k === 'ride' ? x.m : k === 'str' ? sm.m : mb.m;
    const tabBar = tabs.length > 1 ? `<p class="text-xs font-semibold" style="color:var(--mute)">An diesem Tag ${tabs.length === 2 ? 'zwei Teile' : 'drei Teile'}. Tippe auf einen Teil für Ablauf und Übungen:</p><div class="dtabs" role="tablist">${tabs.map(([k, l]) => { const d = k === 'ride' ? dn : k === 'str' ? sDn : mDn; return `<button role="tab" aria-selected="${tab === k}" class="${esc(tab === k ? 'on' : '')}" style="flex-direction:column;gap:2px;padding:.6rem .3rem" onclick="setTab(${ja(i)},'${ja(k)}')"><span style="display:flex;align-items:center;gap:6px">${mini(k === 'mob' ? mk : k, tab === k ? '#fff' : undefined)}${esc(l)}${d ? ' ✓' : ''}</span><span style="font-size:.7rem;font-weight:500;opacity:.8">${mm(tmin(k))}</span></button>`; }).join('')}</div>${order}` : '';
    const more = tab === 'ride' && extras ? `<div class="flex flex-wrap items-center gap-2 p-2.5" style="background:#e6f7f6;border:1px solid var(--ice)"><span class="text-sm font-semibold">Zusätzlich an diesem Tag:</span>${sm ? `<button class="ghost !px-3 !py-1.5 text-sm" onclick="setTab(${ja(i)},'str')">Kraft ${mm(sm.m)} · Übungen ›</button>` : ''}${mb ? `<button class="ghost !px-3 !py-1.5 text-sm" onclick="setTab(${ja(i)},'mob')">${esc(mb.n)} ${mm(mb.m)} · Übungen ›</button>` : ''}</div>` : '';
    const pane = tab === 'str' ? strBlock(i, cur, true) : tab === 'mob' ? mobBlock(i, cur, true) : more + ride;
    det = `<div class="space-y-3 border-t px-4 pb-4 pt-3 text-sm" style="border-color:var(--line)">${tabBar}${pane}</div>`;
  }
  return `<div data-day="${esc((cur && i >= todayIdx() && !S.done[i] && x.m > 0) || (!cur && typeof strWeek === 'number' && S.wk && strWeek > S.wk && x.m > 0 && !mvLocked(x)) ? i : '')}" class="panel overflow-hidden ${esc((cur && flashIdx===i)?'flash':'')}" style="${esc(x.adapted?'border-color:#0a8f6a':'')}${esc(past?';opacity:.72':'')}">${head}${det}</div>`;
} finally { npOver = null; } }
