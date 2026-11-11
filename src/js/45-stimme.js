/* ---------- F16: natürliche Stimme für die Übungsansagen ----------
   Die Sätze werden beim Build einmalig mit einer neuronalen Stimme (Piper) als MP3 erzeugt (build/tts/generate.py)
   und unter audio/voice/<sprache>/<hash>.mp3 mit audio/voice/manifest.json ausgeliefert. Auf dem Gerät wird nichts
   synthetisiert, solange eine Datei vorhanden ist; sonst spricht die Systemstimme denselben Satz (Rückfall).
   Abgespielt wird über den AudioContext der Pieptöne (gleiche Lautstärke, Mischen mit Musik, audioSession „ambient“).
   Schlüssel je Satz: FNV-1a-32 über „<stimme>|<sprache>|<text>“, identisch in generate.py. */
const VC_VOICE = {"de": "piper:de_DE-thorsten-high", "en": "piper:en_GB-cori-high"};
let vcMan = null, vcManP = null, vcSrc = null;
const vcBuf = new Map(), vcBad = new Set();
const vcLog = (t, x) => { try { (window.__vcLog = window.__vcLog || []).push({t, x, at:Date.now()}); if (window.__vcLog.length > 600) window.__vcLog.shift(); } catch (e) { elog(e); } };
function vcHash(s){ let h = 0x811c9dc5; const b = new TextEncoder().encode(s); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
const vcL = en => en ? 'en' : 'de';
const vcKey = (t, en) => VC_VOICE[vcL(en)] ? vcHash(`${VC_VOICE[vcL(en)]}|${vcL(en)}|${t}`) : '';
/* Nur über http(s) (Netlify, Artifact); als lokale Datei gibt es keine Sprachdateien */
const vcWeb = () => { try { return /^https?:$/.test(location.protocol); } catch (e) { elog(e); return false; } };
const vcOn = () => { const c = sqCfg(); return c.voice && c.vs !== 'sys'; };
function vcManifest(){
  if (vcMan) return Promise.resolve(vcMan);
  if (!vcWeb()) { vcMan = {items:{}}; return Promise.resolve(vcMan); }
  if (!vcManP) vcManP = fetch('audio/voice/manifest.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null)
    .then(j => { vcMan = j && j.items && j.voice && j.voice.de === VC_VOICE.de ? j : {items:{}}; vcLog('man', Object.keys(vcMan.items).length); return vcMan; });
  return vcManP;
}
const vcEntry = (t, en) => { const k = vcKey(t, en), m = vcMan && vcMan.items && vcMan.items[vcL(en)]; return k && m && m[k] ? {k, f:m[k][0], ms:m[k][1]} : null; };
/* Echte Sprechdauer aus dem Manifest (für den Zeitplan), nur wenn die natürliche Stimme gilt und die Datei taugt */
const VC_GAP = 180;
function vcMs(t, en){ try { if (!vcMan || !vcOn()) return 0; let ms = 0; for (const x of vcSegs(t, en)) { const e = vcEntry(x, en); if (!e || vcBad.has(e.k)) return 0; ms += e.ms; } return ms + VC_GAP * (vcSegs(t, en).length - 1); } catch (e) { elog(e); return 0; } }
function vcDecode(ab){ const c = sqAudio(); if (!c) return Promise.reject(new Error('kein AudioContext'));
  return new Promise((res, rej) => { try { const p = c.decodeAudioData(ab, res, rej); if (p && typeof p.then === 'function') p.then(res, rej); } catch (e) { rej(e); } }); }
function vcLoad(t, en){
  const e = vcEntry(t, en); if (!e) { vcLog('miss', t); return Promise.resolve(false); }
  if (vcBuf.has(e.k)) return Promise.resolve(true); if (vcBad.has(e.k)) return Promise.resolve(false);
  vcLog('get', e.f);
  return fetch('audio/voice/' + vcL(en) + '/' + e.f).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(vcDecode)
    .then(b => { vcBuf.set(e.k, b); return true; }).catch(er => { vcBad.add(e.k); vcLog('bad', e.f + ' ' + (er && er.message)); return false; });
}
/* Sätze einer Sequenz (Lang- und Kurzfassungen) in der App-Sprache vorladen; höchstens 4 gleichzeitig */
function vcPreload(texts, en){
  return vcManifest().then(() => { const L = [...new Set(texts.filter(Boolean))]; let i = 0;
    const run = () => i < L.length ? vcLoad(L[i++], en).then(run) : Promise.resolve();
    return Promise.all([run(), run(), run(), run()]).then(() => true); });
}
/* Lange Ansagen bestehen aus zwei ganzen Teilen: „Als Nächstes: Name, Dosis.“ und dem Ausführungshinweis. Jeder Teil
   ist eine eigene Datei, so gibt es jeden Hinweis nur einmal statt je Satz-, Pausen- und Übergangsvariante (Größe). */
let vcHs = null;
function vcHints(){ if (vcHs) return vcHs; const o = {de:[], en:[]}; try { Object.keys(EXI).forEach(id => { const h = sqHint(id); if (h[0]) o.de.push(h[0]); if (h[1]) o.en.push(h[1]); }); } catch (e) { elog(e); }
  ['de', 'en'].forEach(l => o[l] = [...new Set(o[l])].sort((a, b) => b.length - a.length)); return (vcHs = o); }
/* Zusätzlich wird der Einleitungsteil („Als Nächstes:“, „Pause – als Nächstes:“, „Erste Übung:“) abgetrennt; der Rest
   („Katze-Kuh, 10 Wiederholungen.“) gilt dann für alle drei Fälle. Ein Name vor dem Hinweis steht ohne Schlusspunkt. */
const VC_PRE = {de:['Pause – als Nächstes:', 'Als Nächstes:', 'Erste Übung:'], en:['Rest – next:', 'Next:', 'First exercise:']};
function vcSegs(t, en){ t = String(t || ''); const H = vcHints()[vcL(en)]; let o = [t];
  for (const h of H) if (t.length > h.length + 1 && t.endsWith(' ' + h)) { let a = t.slice(0, -h.length - 1); if (!a.includes(':')) a = a.replace(/\.$/, ''); o = [a, h]; break; }
  const p = VC_PRE[vcL(en)].find(x => o[0].startsWith(x + ' ')); if (p) o = [p, o[0].slice(p.length + 1), ...o.slice(1)];
  return o; }
function vcSessionTexts(se, cfg, en){ const o = new Set(); try { sqSays(se, cfg).forEach(p => vcSegs(en ? p[1] : p[0], en).forEach(x => o.add(x))); } catch (e) { elog(e); } return [...o]; }
/* Abspielen; false, wenn keine Datei bereitsteht (dann spricht die Systemstimme) */
function vcPlay(t, en, vol){
  try { if (!vcOn() || !vcMan) return false; const B = [];
    for (const x of vcSegs(t, en)) { const e = vcEntry(x, en); if (!e) { vcLog('miss', x); return false; } const b = vcBuf.get(e.k); if (!b) { vcLog('nobuf', x); return false; } B.push(b); }
    const c = sqAudio(); if (!c) return false; vcStop();
    const g = c.createGain(); g.gain.value = vol; g.connect(c.destination); let at = c.currentTime; const L = [];
    B.forEach(b => { const s = c.createBufferSource(); s.buffer = b; s.connect(g); s.start(at); at += b.duration + VC_GAP / 1000; L.push(s); });
    L[L.length - 1].onended = () => { if (vcSrc === L) vcSrc = null; }; vcSrc = L; vcLog('play', t); return true; } catch (er) { vcLog('err', String(er && er.message)); return false; }
}
function vcStop(){ const L = vcSrc; vcSrc = null; if (L) { L.forEach(s => { try { s.stop(); } catch (e) { elog(e); } }); vcLog('stop', ''); } }
/* Katalog aller Sätze, die die Ansage-Logik sprechen kann (Build: build/tts/catalog.js, Test f28) */
function sqCatalog(){
  const de = new Set(), en = new Set(), add = p => { if (p && p[0]) vcSegs(p[0], false).forEach(x => de.add(x)); if (p && p[1]) vcSegs(p[1], true).forEach(x => en.add(x)); };
  const S0 = S.p, M0 = mobMap, T0 = strMap;
  try { if (!S.p) S.p = {start:'catalog'};
    const ses = [];
    mobMap = {0:MOB.mob, 1:MOB.stab}; ses.push(sqSession('mob', 0), sqSession('mob', 1));
    ['tech', 'base', 'build', 'erh', 'leicht'].forEach(k => [false, true].forEach(home => { strMap = {0:strSession({strPlace:home ? 'home' : 'gym'}, k)}; ses.push(sqSession('str', 0)); }));
    ses.filter(Boolean).forEach(se => [true, false].forEach(hints => [5, 10, 15, 20].forEach(tr => sqSays(se, {...SQ_DEF, voice:true, hints, tr}).forEach(add))));
    sqFixed().forEach(add);
  } finally { S.p = S0; mobMap = M0; strMap = T0; }
  const srt = s => [...s].sort();
  return {de:srt(de), en:srt(en)};
}
function heroDay(p){
  t0Fix(p); tdFix(p);
  if (hasStarted(p) && endOf(p) && iso(0) > endOf(p)) return seasonOver(p);
  const started = hasStarted(p), plan = S.plan || [], t = started ? todayIdx() : 0, so = started ? 0 : startOff(p);
  const has = j => plan[j] && (plan[j].m > 0 || strMap[j] || mobMap[j]), done = j => (!plan[j].m || S.done[j] || (S.actual && S.actual[j] && !(plan[j].parts && exePNext(j) != null))) && (!strMap[j] || (S.strDone || {})[strKey(j)]) && (!mobMap[j] || (S.mobDone || {})[mobKey(j)]);
  let i = -1; for (let j = Math.max(t, so); j < 7; j++) if ((has(j) && !(started && done(j))) || (started && j === t && plan[j] && plan[j].feel)) { i = j; break; }
  if (i < 0) { const nx = genWeek(p, Math.min(S.wk + 1, phases(p).slice(-1)[0].to)), k = nx.findIndex(x => x.m > 0);
    return `<section class="hero"><p class="eyebrow" style="color:var(--ice)">Diese Woche</p><p class="hd mt-1 text-3xl font-semibold">Alles erledigt. Stark.</p><p class="mt-2 text-sm" style="opacity:.8">${k >= 0 ? `Nächste Einheit: ${DAYS[k]}, ${esc(nx[k].n)} (${mm(nx[k].m)}).` : 'Genieße die freien Tage.'}</p></section>`; }
  const x = plan[i], T = TYPES[x.t], sm = strMap[i], mb = mobMap[i], cur = started, rideDn = cur && (S.done[i] || (S.actual && S.actual[i] && !(x.parts && exePNext(i) != null)));
  const lbl = !started ? `Erste Einheit · ${DAYS[i]}, ${fmt(dstr(i))}` : i === t ? 'Heute' : i === t + 1 ? 'Morgen · ' + DAYS[i] : 'Nächste Einheit · ' + DAYS[i];
  const stat = (v, l) => `<div class="hstat"><div class="hd text-xl font-semibold">${v}</div><div class="text-xs" style="opacity:.75">${l}</div></div>`;
  if ((heroTab === 'str' && !sm) || (heroTab === 'mob' && !mb)) heroTab = null;
  const testChip = x.t === 'test' ? ['test', `<span>${(S.p.res || {})[S.wk] ? 'Ergebnis ✓' : 'Ergebnis eintragen'}</span>`] : null;
  if (heroTab === 'test' && !testChip) heroTab = null;
  const fuelChip = ['fuel', `${mini('fuel', heroTab === 'fuel' ? '#071747' : '#fff')}<span>Essen: Tipps und Beispiele</span>`];
  const extras = [sm ? ['str', `${mini('str', heroTab === 'str' ? '#071747' : '#fff')}<span>Kraft ${sm.m} Min. · Übungen${(S.strDone || {})[strKey(i)] ? ' ✓' : ''}</span>`] : null, mb ? ['mob', `${mini(mb.n === 'Mobilität' ? 'mob' : 'stab', heroTab === 'mob' ? '#071747' : '#fff')}<span>${mb.n} ${mb.m} Min. · Übungen${(S.mobDone || {})[mobKey(i)] ? ' ✓' : ''}</span>`] : null].filter(Boolean);
  const st = x.parts ? x.parts.map(q => q.lbl + ': ' + q.st).join(' ') : x.st; heroIdx = i; npOver = npFlag(i);
  return `<section class="hero" style="border-left-color:${esc(x.m ? T.c : 'var(--ice)')}"><p class="eyebrow" style="color:var(--ice)">${lbl}</p>
    <p class="hd mt-1 text-3xl font-semibold leading-tight ${esc(rideDn ? 'line-through' : '')}">${x.feel === 'sick' ? esc(x.n) : x.m ? esc(x.n) : sm || mb ? 'Radfrei · ' + esc([sm ? 'Kraft' : '', mb ? mb.n : ''].filter(Boolean).join(' und ')) : 'Radfrei'}</p>
    ${x.m ? `<div class="hmeta"><b>${mm(x.m)}</b>${heroInt(x)}<span>${zone(x.hi)} · TSS ~${tss(x)}</span></div>
      ${heroIcons(x)}` : x.feel === 'sick' ? `<p class="mt-2 text-sm" style="opacity:.85">${esc(x.st)}</p>` : wkHero(i, x, strMap[i], mobMap[i])}

    ${x.m ? wkHero(i, x, sm, mb) : ''}
    <div class="hact">${cur && x.m ? `<button class="hbtn" onclick="tick(${ja(i)})">${rideDn ? '✓ Erledigt' : 'Als erledigt markieren'}</button>` : ''}${cur && x.m && x.parts && exePNext(i) != null ? `<label class="hib">${svgI('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', 18)}<span>${exeBusy === i ? '…' : x.parts[exePNext(i)].lbl}</span><input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeUpload(this, ${ja(i)}, ${ja(exePNext(i))})"></label>` : ''}${cur && x.m && !(x.parts && exePNext(i) != null && !exeGet(S.wk, i)) ? (exeGet(S.wk, i) ? `<button class="hib" onclick="exeShow='${ja(S.wk)}-${ja(i)}';render()">${svgI('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', 18)}<span>${exeGet(S.wk, i).score}/100</span></button>` : `<label class="hib">${svgI('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', 18)}<span>${exeBusy === i ? '…' : 'Hochladen'}</span><input type="file" accept=".fit,.gpx,.tcx,.zip,.gz,.xml" style="display:none" onchange="exeUpload(this, ${ja(i)})"></label>`) : ''}${testChip ? `<button class="hib${esc(heroTab === 'test' ? ' on' : '')}" aria-expanded="${heroTab === 'test'}" onclick="heroOpen('test')">${svgI('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', 18)}<span>${(S.p.res || {})[S.wk] ? 'Ergebnis ✓' : 'Ergebnis'}</span></button>` : ''}${cur && (x.m || sm || mb || x.feel) && !(S.done[i] || (S.actual && S.actual[i])) ? `<button class="hib${esc(heroTab === 'feel' ? ' on' : '')}${esc(x.feel ? ' fe' : '')}" aria-expanded="${heroTab === 'feel'}" onclick="heroOpen('feel')">${svgI('<path d=\"M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z\"/>', 18)}<span>${x.feel === 'sick' ? 'Wieder fit?' : x.feel ? 'Angepasst' : 'Befinden'}</span></button>` : ''}${cur && x.m ? `<button class="hib${esc(heroTab === 'clo' ? ' on' : '')}" aria-expanded="${heroTab === 'clo'}" onclick="heroOpen('clo')">${svgI(CLI, 18)}<span>${cloShort(x, i, dstr(i)) ? 'Kleidung ' + cloShort(x, i, dstr(i)) : 'Kleidung'}</span></button>` : ''}<button class="hib${esc(heroTab === 'fuel' ? ' on' : '')}" aria-expanded="${heroTab === 'fuel'}" onclick="heroOpen('fuel')">${svgI('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', 18)}<span>Essen</span></button><button class="hib" onclick="openDay(${ja(i)})">${svgI('<path d="M4 6h16M4 12h16M4 18h10"/>', 18)}<span>Details</span></button></div>${heroTab ? `<div class="hpane">${heroTab === 'test' ? testBox(S.wk, i, cur) : heroTab === 'str' ? strBlock(i, cur, true) : heroTab === 'mob' ? mobBlock(i, cur, true) : heroTab === 'feel' ? feelBox(i) : heroTab === 'clo' ? '<p class="font-semibold">Kleidung</p><div class="mt-1">' + cloBox(x, i, dstr(i)) + '</div>' : '<p class="font-semibold">Verpflegung</p>' + fuelTip(x, i, p)}</div>` : ''}</section>`;
}
