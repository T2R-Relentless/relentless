/* ---------- Planung überspringen: gespeicherten Plan aus einer Sicherungsdatei laden ---------- */
function importStart(inp){
  const f = inp.files && inp.files[0]; if (!f) return; if (f.size > BK_MAX) { impMsg = 'Die Datei ist zu groß für eine Relentless-Sicherung.'; inp.value = ''; return render(); } const r = new FileReader();
  r.onload = () => {
    let id = null;
    try {
      const o = bkParse(r.result);
      const lib = readLib(); let first = null;
      o.plans.forEach(e => { if (e && e.snap && e.snap.p && e.snap.p.goal) { const nid = uid(); lib.plans[nid] = {id:nid, name:String(e.name || planName(e.snap.p)).slice(0, 60), manual:!!e.manual, created:e.created || Date.now(), updated:Date.now(), snap:e.snap}; if (!first) first = nid; if (e.id === o.active) id = nid; } });
      if (!first) throw 0; id = id || first; lib.active = id; localStorage.setItem(LIBK, JSON.stringify(lib));
    } catch (e) { elog(e); impMsg = 'Die Datei ist keine gültige Relentless-Sicherung. Sie heißt normalerweise „relentless-plaene-…json“.'; inp.value = ''; render(); return; }
    inp.value = ''; impMsg = ''; switchTo(id); S.bkAt = Date.now(); save();
  };
  r.readAsText(f);
}
const importCard = () => `<div class="panel p-5" style="border-width:2px"><b class="rounded-full px-2 text-xs" style="background:var(--tint);color:var(--ink)">Schon einen Plan?</b>
  <span class="hd mt-2 block text-2xl font-semibold">Plan aus Sicherung laden</span><span class="mt-1 block text-sm" style="color:var(--mute)">Du hast deinen Plan schon einmal gesichert, zum Beispiel auf einem anderen Gerät? Lade die Datei hoch und mach direkt dort weiter, wo du warst. Die Planung entfällt.</span>
  <label class="ghost mt-4 inline-block cursor-pointer">Sicherungsdatei wählen<input type="file" accept=".json,application/json" style="display:none" onchange="importStart(this)"></label>
  ${impMsg ? `<p class="mt-2 text-sm" style="color:#c0392b">${esc(impMsg)}</p>` : ''}<p class="mt-2 text-xs" style="color:var(--mute)">Eine Sicherung erstellst du in der App unter Mehr › Meine Pläne › Sicherung speichern.</p></div>`;
const importLink = () => `<p class="mt-6 text-center text-xs" style="color:var(--mute)">Schon einen Plan gesichert? <label class="cursor-pointer underline">Sicherung laden<input type="file" accept=".json,application/json" style="display:none" onchange="importStart(this)"></label></p>${impMsg ? `<p class="mt-1 text-center text-xs" style="color:#c0392b">${esc(impMsg)}</p>` : ''}`;

/* ---------- Kleidung zum Wetter: Temperaturstufen nach dem Radklamotten-Guide von pedalieri.de, Wetter von Open-Meteo ---------- */
const CLO = [
  {lo:-99, hi:0, l:'unter 0 °C', dry:['Atmungsaktives Langarm-Unterhemd, vorn mit Windschutz für Brust und Bauch', 'Langarmtrikot, innen angeraut', 'Atmungsaktive Windjacke, innen angeraut, mit hohem Kragen', 'Lange Trägerhose mit gepolsterten Knien und hohem Bauchteil', 'Zusätzlich lange Unterhose', 'Sehr warme Handschuhe, am besten Ski- oder Hummerhandschuhe', 'Warme Helmmütze', 'Gut abschließende Brille', 'Neopren-Überschuhe', 'Lange, warme Socken', 'Schlauchschal vor Mund und Nase'],
    extra:['Beheizbare Einlegesohlen, wenn du leicht kalte Füße bekommst'], note:'Eisig: Mehr als 1,5 Stunden sind nur etwas für Hartgesottene. Hände, Füße und Bauch kühlen zuerst aus. Bei harter Belastung reizt die kalte Luft die Bronchien, deshalb Mund und Nase schützen.',
    wet:['Regenjacke statt Windjacke', 'Eng anliegende Regenhose', 'Regenüberzug für den Helm'], wetNote:'Bei Nässe und Frost ist das normale Rennrad zu gefährlich. Draußen nur mit Crossrad und Spikes, besser auf der Rolle trainieren.', indoor:true},
  {lo:0, hi:5, l:'0 bis 5 °C', dry:['Langarm-Unterhemd', 'Thermo-Langarmtrikot', 'Atmungsaktive Windjacke, innen angeraut, mit hohem Kragen', 'Halstuch oder Schlauchschal', 'Lange Trägerhose mit gepolsterten Knien und hohem Bauchteil', 'Warme Langfingerhandschuhe, am besten Hummerhandschuhe', 'Warme Helmmütze', 'Gut abschließende Brille', 'Neopren-Überschuhe', 'Lange, warme Socken'],
    extra:[], note:'An sonnigen Tagen sind etwa 1,5 Stunden gut machbar. Ohne Sonne und mit Wind lieber kürzer. Auf Glätte und Eisplatten achten.',
    wet:['Regenjacke statt Windjacke', 'Eng anliegende Regenhose', 'Regenüberzug für den Helm'], wetNote:'Mit dem normalen Rennrad besteht jetzt Sturzgefahr. Wenn draußen, dann mit Steckschutzblechen und komplett eingepackt. Die Rolle ist heute die bessere Wahl.', indoor:true},
  {lo:5, hi:10, l:'5 bis 10 °C', dry:['Langarm-Unterhemd', 'Langarmtrikot, innen angeraut', 'Atmungsaktive Windjacke, innen angeraut', 'Lange Trägerhose mit gepolsterten Knien und hohem Bauchteil', 'Langfingerhandschuhe', 'Warme Helmmütze', 'Gut abschließende Brille', 'Neopren-Überschuhe', 'Lange, warme Socken'],
    extra:[], note:'An guten Tagen sind 2 Stunden gut drin. Schichten nicht zu früh ablegen, auch wenn du schwitzt: Du kühlst sonst schnell aus.',
    wet:['Regenjacke', 'Eng anliegende Regenhose', 'Regenüberzug für den Helm'], wetNote:'Vorsicht vor nassem Laub: Es ist so rutschig wie Schnee oder Eis.'},
  {lo:10, hi:15, l:'10 bis 15 °C', dry:['Kurz- oder Langarm-Unterhemd', 'Kurzarmtrikot mit Armlingen', '3/4-Hose oder kurze Hose mit Beinlingen', 'Winddichte Überschuhe', 'Langfingerhandschuhe'],
    extra:['Windjacke', 'Helmmütze'], note:'Zwiebelprinzip: Es kann schnell wärmer werden. Arm- und Beinlinge lassen sich unterwegs leicht an- und ausziehen. Für Abfahrten immer eine Windjacke dabeihaben.',
    wet:['Regenjacke', 'Eng anliegende Regenhose', 'Regenüberzug für den Helm', 'Regen- oder Neopren-Überschuhe'], wetNote:'Unter der Regenkleidung wirst du auch vom Schwitzen nass. Trotzdem anlassen, sonst kühlst du aus.'},
  {lo:15, hi:20, l:'15 bis 20 °C', dry:['Kurzarm-Unterhemd', 'Langarmtrikot', 'Kurze Radhose', 'Kurzfingerhandschuhe'],
    extra:['Windweste', 'Armlinge'], note:'Typisches Frühjahrs- und Herbstwetter. Je näher an 15 °C, desto eher langärmlig. Auch hier gilt das Zwiebelprinzip.',
    wet:['Regenjacke', 'Regenüberzug für den Helm', 'Regen-Überschuhe', 'Bei Dauerregen eng anliegende Regenhose'], wetNote:'Ohne Regenhose die Überschuhe oben gut abdichten, etwa mit Tape. Sonst läuft das Wasser von oben hinein.'},
  {lo:20, hi:25, l:'20 bis 25 °C', dry:['Kurzarm-Unterhemd', 'Kurzarmtrikot', 'Kurze Radhose', 'Kurzfingerhandschuhe'],
    extra:[], note:'Ideales Rennradwetter: nutze jede Stunde.',
    wet:['Leichte Regenjacke', 'Regen-Überschuhe', 'Bei Stark- oder Dauerregen eng anliegende Regenhose'], wetNote:'Die Regenhose nur bei starkem oder langem Regen anziehen, sonst bist du vom Schwitzen genauso nass.'},
  {lo:25, hi:30, l:'25 bis 30 °C', dry:['Kurzarmtrikot', 'Kurze Radhose', 'Kurzfingerhandschuhe'],
    extra:[], note:'Der Fahrtwind kühlt noch gut. Das ausgeschwitzte Salz kann am Trikot scheuern: Bei langen Fahrten hilft Tape auf empfindlichen Stellen.',
    wet:['Bei stundenlangem Regen leichte Regenjacke und Regen-Überschuhe'], wetNote:'Nach langer Trockenheit sind Straßen bei einsetzendem Regen durch Staub und Pollen besonders rutschig. Dann einen Gang zurückschalten.'},
  {lo:30, hi:99, l:'über 30 °C', dry:['Ärmelloses oder sehr leichtes Trikot', 'Kurze Radhose', 'Kurzfingerhandschuhe', 'Radmütze unter dem Helm, Schirm nach hinten', 'Sonnencreme'],
    extra:[], note:'Heiß: Sonnenschutz und viel trinken, gern mit Salz oder Elektrolyten. Lange Anstiege und harte Einheiten lieber in die kühlen Morgenstunden legen. Bei hohen Ozonwerten (ab 180 µg/m³) kürzer fahren oder drinnen bleiben.',
    wet:[], wetNote:'Auch im Regen schwitzt du viel, also trotzdem genug trinken.'}
];
const cloBand = t => CLO.find(b => t < b.hi) || CLO[CLO.length - 1];
let wxBusy = false, wxMsg = '';
const WXI = '<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4 4 0 0 1-1 8.9z"/>', CLI = '<path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-1 2-2.5 3-4 3S9 5 8 3z"/>';
async function wxFetch(force){
  const L = S.wx; if (!L || L.lat == null || wxBusy) return;
  if (!force && S.wxData && S.wxData.lat === L.lat && S.wxData.lon === L.lon && Date.now() - S.wxData.at < 3 * 36e5) return;
  if (!force && S.wxFail && Date.now() - S.wxFail < 36e5) return;
  wxBusy = true;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=auto&forecast_days=8`);
    if (!r.ok) throw new Error('http'); const j = await r.json(), h = j.hourly;
    S.wxData = {at:Date.now(), lat:L.lat, lon:L.lon, t:h.time, T:h.temperature_2m, P:h.precipitation_probability, R:h.precipitation, W:h.wind_speed_10m}; S.wxFail = 0; wxMsg = '';
  } catch (e) { elog(e); S.wxFail = Date.now(); wxMsg = 'Die Wettervorhersage ließ sich nicht abrufen. In der Ansicht innerhalb von Claude ist das meist gesperrt. Tippe stattdessen beim Training an, wie warm es wird.'; }
  wxBusy = false; save(); render();
}
async function wxCity(){
  const el = document.getElementById('wxQ'), q = el ? el.value.trim() : ''; if (!q) return;
  wxBusy = true; wxMsg = 'Ort wird gesucht …'; render();
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=de&format=json`); const j = await r.json(), g = j.results && j.results[0];
    if (!g) { wxMsg = `„${q}“ wurde nicht gefunden. Versuch es mit Ort und Land, zum Beispiel „Freiburg, Deutschland“.`; wxBusy = false; return render(); }
    S.wx = {lat:Math.round(g.latitude * 100) / 100, lon:Math.round(g.longitude * 100) / 100, name:secTxt(String(g.name || '') + (g.admin1 ? ', ' + g.admin1 : '')).slice(0, 80)}; wxMsg = ''; wxBusy = false; S.wxFail = 0; save(); wxFetch(true);
  } catch (e) { elog(e); wxBusy = false; S.wxFail = Date.now(); wxMsg = 'Die Ortssuche ist hier nicht erreichbar. In der Ansicht innerhalb von Claude ist der Abruf meist gesperrt. Tippe stattdessen beim Training an, wie warm es wird.'; render(); }
}
function wxHere(){
  if (!navigator.geolocation) { wxMsg = 'Dein Gerät gibt keinen Standort frei. Gib stattdessen deinen Ort ein.'; return render(); }
  wxMsg = 'Standort wird ermittelt …'; render();
  navigator.geolocation.getCurrentPosition(p => { S.wx = {lat:Math.round(p.coords.latitude * 100) / 100, lon:Math.round(p.coords.longitude * 100) / 100, name:'Dein Standort'}; wxMsg = ''; S.wxFail = 0; save(); wxFetch(true); },
    () => { wxMsg = 'Der Standort wurde nicht freigegeben oder ist hier nicht verfügbar. Gib stattdessen deinen Ort ein.'; render(); }, {timeout:10000, maximumAge:36e5});
}
/* Wetter im Zeitfenster der Einheit: Start zur gewohnten Trainingszeit, so lang wie die Einheit */
function wxDay(date, i, x){
  const man = (S.wxMan || {})[date];
  if (man) return {eff:CLO[man.b].lo + 2.5, band:CLO[man.b], wet:!!man.wet, src:'man'};
  const D = S.wxData; if (!D || !S.wx) return null;
  const sh = i >= 5 ? (S.wxHe ?? 10) : (S.wxH ?? 17), n = Math.max(1, Math.ceil((x.m || 60) / 60)), idx = [];
  for (let k = 0; k < n; k++) { const hh = sh + k; if (hh > 23) break; const j = D.t.indexOf(`${date}T${String(hh).padStart(2, '0')}:00`); if (j >= 0) idx.push(j); }
  if (!idx.length) return null;
  const T = idx.map(j => D.T[j]), tmin = Math.min(...T), tmax = Math.max(...T), tavg = T.reduce((a, b) => a + b, 0) / T.length;
  const p = Math.max(...idx.map(j => D.P[j] || 0)), r = idx.reduce((a, j) => a + (D.R[j] || 0), 0), wnd = Math.max(...idx.map(j => D.W[j] || 0));
  const hard = HARD.includes(x.t) || x.t === 'test' || x.t === 'race', long = x.t === 'long' || x.m >= 150;
  const eff = (long ? tmin : tavg) + (hard ? 3 : 0) - (wnd >= 25 ? 2 : 0);
  return {eff, band:cloBand(eff), tmin, tmax, tavg, p, r, wnd, wet:p >= 50 || r >= .5, maybe:p >= 30 && p < 50, hard, long, sh, eh:sh + n, src:'api'};
}
function wxSetMan(date, b, wet){ S.wxMan = {...(S.wxMan || {})}; if (b == null) delete S.wxMan[date]; else S.wxMan[date] = {b, wet:!!wet}; Object.keys(S.wxMan).forEach(k => { if (k < iso(-7)) delete S.wxMan[k]; }); save(); render(); }
function cloBox(x, i, date){
  const w = wxDay(date, i, x), man = (S.wxMan || {})[date];
  const pick = `<div class="mt-2 flex flex-wrap gap-1.5">${CLO.map((b, k) => `<button class="cloc${esc(man && man.b === k ? ' on' : '')}" onclick="wxSetMan('${ja(date)}', ${ja(k)}, ${ja(man ? man.wet : false)})">${b.l.replace(' °C', '°')}</button>`).join('')}</div>
    <div class="mt-2 flex flex-wrap gap-1.5"><button class="cloc${esc(man && man.wet ? ' on' : '')}" onclick="wxSetMan('${ja(date)}', ${ja(man ? man.b : 3)}, ${ja(!(man && man.wet))})">Regen</button>${man ? `<button class="cloc" onclick="wxSetMan('${ja(date)}', null)">${S.wx ? 'Vorhersage verwenden' : 'Zurücksetzen'}</button>` : ''}</div>`;
  if (!w) return `<p class="text-sm">Wie warm wird es beim Training?</p>${pick}<p class="mt-2 text-xs" style="color:var(--mute)">${S.wx ? (S.wxFail ? 'Die Vorhersage ist hier nicht abrufbar.' : 'Für diesen Tag gibt es noch keine Vorhersage (nur 7 Tage im Voraus).') : 'Mit deinem Ort zeigt die App den Tipp automatisch passend zur Vorhersage.'} ${!S.wx ? `<button class="exl" onclick="navGo('more');goPg('settings')">Ort festlegen</button>` : ''}</p>`;
  const b = w.band, items = b.dry, extra = b.extra, li = l => `<ul class="mt-1 space-y-1 text-sm">${l.map(t => `<li class="flex gap-2"><span style="color:var(--teal)">•</span><span>${t}</span></li>`).join('')}</ul>`;
  const head = w.src === 'api' ? `<p class="text-sm"><b>${Math.round(w.tmin)}${Math.round(w.tmax) !== Math.round(w.tmin) ? '–' + Math.round(w.tmax) : ''} °C</b> zwischen ${w.sh} und ${Math.min(24, w.eh)} Uhr${w.p >= 20 ? `, Regenrisiko ${w.p} %` : ''}${w.wnd >= 20 ? `, Wind bis ${Math.round(w.wnd)} km/h` : ''}. Kleidung für <b>${b.l}</b>${w.hard ? ' (harte Einheit: etwas leichter, du wirst schnell warm)' : w.long ? ' (lange Fahrt: für die kühlste Phase)' : ''}${w.wet ? ', mit Regen' : ''}.</p>`
    : `<p class="text-sm">Kleidung für <b>${b.l}</b>${w.wet ? ', mit Regen' : ''} (von dir gewählt).</p>`;
  return `${head}<div class="mt-1">${li(items)}</div>
    ${extra.length ? `<p class="mt-2 text-sm"><b>Zusätzlich mitnehmen:</b> ${extra.join(', ')}</p>` : ''}${w.wet && b.wet.length ? `<p class="mt-2 text-sm font-semibold">Wegen Regen:</p>${li(b.wet)}` : ''}${w.maybe ? '<p class="mt-2 text-sm"><b>Regen möglich:</b> leichte Regenjacke einpacken.</p>' : ''}
    <p class="mt-2 text-sm" style="color:var(--mute)">${w.wet ? b.wetNote : b.note}</p>${w.wet && b.indoor && x.m ? '<p class="mt-1 text-sm"><b>Alternative:</b> die Einheit auf der Rolle fahren. Unter Details findest du sie als Zwift-Training.</p>' : ''}
    <details class="mt-2 text-xs"><summary class="cursor-pointer" style="color:var(--teal)">Andere Temperatur wählen</summary>${pick}</details>
    <p class="mt-2 text-xs" style="color:var(--mute)">Kleidungstipps nach dem <a class="underline" target="_blank" rel="noopener" href="https://www.pedalieri.de/2012/03/19/der-radklamotten-guide-anziehen-was-zum-wetter-passt/">Radklamotten-Guide von pedalieri.de</a>${w.src === 'api' ? `, Wetter: <a class="underline" target="_blank" rel="noopener" href="https://open-meteo.com">Open-Meteo</a> (<span data-noi18n>${esc(S.wx.name)}</span>)` : ''}.</p>`;
}
const cloShort = (x, i, date) => { const w = wxDay(date, i, x); return w ? (w.src === 'api' ? Math.round(w.tavg) + '°' : w.band.l.replace(' °C', '°').replace('unter ', '<').replace('über ', '>')) : ''; };
function cloDetails(x, i, cur){ if (!cur || !x.m || i < todayIdx()) return ''; const d = dstr(i), s = cloShort(x, i, d); return `<details class="evfuel"><summary>Kleidung für diesen Tag${s ? ' (' + s + ')' : ''}</summary><div class="mt-2">${cloBox(x, i, d)}</div></details>`; }
function wxSettings(){
  const D = S.wxData, hrs = h => Array.from({length:17}, (_, k) => k + 5).map(v => `<option value="${esc(v)}"${v === h ? ' selected' : ''}>${v}:00</option>`).join('');
  return fold('wx', 'Wetter und Kleidung', `<p class="text-sm" style="color:var(--mute)">Für jeden Trainingstag zeigt die App, was du anziehen solltest, passend zur Wettervorhersage an deinem Ort.</p>
    ${S.wx ? `<p class="mt-3 text-sm">Ort: <b>${esc(S.wx.name)}</b>${D && D.lat === S.wx.lat ? ` · Vorhersage von ${new Date(D.at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr` : ''}</p>` : ''}
    <div class="mt-3 flex flex-wrap items-end gap-2"><input id="wxQ" aria-label="Ort für die Wettervorhersage" class="inp" style="max-width:15rem" placeholder="Ort, z. B. München" value="" onkeydown="if(event.key==='Enter')wxCity()"><button class="btn !py-2" onclick="wxCity()">Ort suchen</button><button class="ghost !py-2" onclick="wxHere()">Meinen Standort verwenden</button></div>
    ${wxMsg ? `<p class="mt-2 text-sm" style="color:${esc(/gesucht|ermittelt/.test(wxMsg) ? 'var(--mute)' : '#c0392b')}">${esc(wxMsg)}</p>` : ''}
    <p class="mt-4 text-sm font-semibold">Wann fährst du meistens los?</p><div class="mt-1 grid grid-cols-2 gap-3"><label class="text-sm">Mo bis Fr<select class="inp mt-1" onchange="S.wxH=+this.value;save();render()">${hrs(S.wxH ?? 17)}</select></label><label class="text-sm">Sa und So<select class="inp mt-1" onchange="S.wxHe=+this.value;save();render()">${hrs(S.wxHe ?? 10)}</select></label></div>
    <p class="mt-2 text-xs" style="color:var(--mute)">Die App nimmt die Temperatur in dem Zeitraum, in dem du fährst. Bei harten Einheiten rechnet sie etwas wärmer, weil du mehr Wärme erzeugst, bei langen Fahrten mit der kühlsten Phase. Starker Wind zählt kälter. Kleidungstipps nach dem Radklamotten-Guide von pedalieri.de, Wetter von Open-Meteo.</p>
    ${S.wx ? '<button class="ghost mt-3 !py-1.5 text-sm" onclick="S.wx=null;S.wxData=null;save();render()">Ort entfernen</button>' : ''}`, false, S.wx ? esc(S.wx.name) : 'kein Ort');
}

