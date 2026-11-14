/* ---------- Garmin Connect (Personal API): Fahrten direkt abrufen ----------
   Garmin erlaubt keine Zugriffe aus Webseiten (CORS, im Browser geprüft). In Claude läuft die Verbindung deshalb über eine kleine
   Erweiterung für die Claude-Desktop-App („Garmin für Relentless“, Datei garmin-relentless.mcpb). Sie fragt den Schlüssel
   einmalig ab, speichert ihn im Schlüsselbund und liefert Aktivitätsliste und Original-FIT-Dateien.
   In der Web-App (Netlify) übernimmt das die Netlify Function /api/garmin (Ordner netlify/functions).
   Die Fahrten laufen danach durch dieselbe Auswertung wie hochgeladene FIT-Dateien. */
const GM_HOSTS = ['host:Garmin_f_r_Relentless', 'host:garmin'];
let gmBusy = false, gmMsg = null, gmProg = '', gmNews = [];
const gmMode = () => (S.gm && (S.gm.mode === 'mcp' || S.gm.mode === 'web')) ? S.gm.mode : null;
/* Web-App (z. B. auf Netlify): Garmin über den eigenen Vermittler /api/garmin (Netlify Function) erreichen.
   Der Schlüssel liegt nur im Browser dieses Geräts (nicht im Plan, nicht in Sicherungen) und geht nur an diese Adresse. */
const GM_KEY = 'relentless.garmin.key';
let gmWebOk = null, gmKeyIn = '';
const gmInClaude = () => !!(window.claude && window.claude.use);
const gmKey = () => { try { return localStorage.getItem(GM_KEY) || ''; } catch (e) { elog(e); return ''; } };
function gmKeySet(k){ try { k ? localStorage.setItem(GM_KEY, k) : localStorage.removeItem(GM_KEY); } catch (e) { elog(e); } }
async function gmProbe(){
  if (gmInClaude() || gmWebOk !== null) return;
  try { if (!/^https?:$/.test(location.protocol)) { gmWebOk = false; return; }
    const r = await fetch('/api/garmin', {method:'POST', headers:{'content-type':'application/json'}, body:'{"action":"ping"}'}); const j = r.ok ? await r.json() : null; gmWebOk = !!(j && j.service === 'relentless-garmin'); }
  catch (e) { elog(e); gmWebOk = false; }
  try { render(); } catch (e) { elog(e); }
}
async function gmWeb(tool, input){
  const key = gmKey(); if (!key) throw new GmErr('nokey', 'Es ist noch kein Garmin-API-Schlüssel eingetragen.');
  const act = {list_activities:'list', get_activity_recording:'file', check_connection:'check'}[tool];
  const ac = typeof AbortController === 'function' ? new AbortController() : null, to = ac ? setTimeout(() => ac.abort(), act === 'file' ? 40000 : 25000) : null;
  let r; try { r = await fetch('/api/garmin', {method:'POST', headers:{'content-type':'application/json', 'x-garmin-key':key}, body:JSON.stringify({...input, action:act}), signal:ac ? ac.signal : undefined}); }
  catch (e) { if (e && e.name === 'AbortError') throw new GmErr('timeout', 'Garmin antwortet gerade nicht rechtzeitig. Versuch es später noch einmal.'); throw new GmErr('net', 'Keine Internetverbindung oder der Server antwortet nicht.'); }
  finally { if (to) clearTimeout(to); }
  let j = null; try { j = await r.json(); } catch (e) { elog(e); }
  if (r.ok && j) return j;
  if (r.status === 404 && !(j && j.error)) throw new GmErr('noproxy', 'Auf dieser Seite ist der Garmin-Vermittler nicht eingerichtet.');
  const c = j && j.error;
  if (c === 'auth') throw new GmErr('auth', 'Garmin hat deinen API-Schlüssel abgelehnt. Er ist abgelaufen, widerrufen oder falsch kopiert.');
  if (c === 'nokey') throw new GmErr('nokey', 'Der eingetragene Schlüssel ist ungültig.');
  if (c === 'rate' || r.status === 429) throw new GmErr('rate', 'Zu viele Abrufe in kurzer Zeit. Bitte in einer Minute noch einmal versuchen.');
  if (c === 'timeout' || r.status === 504) throw new GmErr('timeout', 'Garmin antwortet gerade nicht rechtzeitig. Versuch es später noch einmal.');
  if (c === 'notfound' || c === 'large' || c === 'input') throw new GmErr('tool', (j && j.message) || 'Diese Fahrt ließ sich nicht laden.');
  throw new GmErr('net', (j && j.message) || 'Garmin ist gerade nicht erreichbar. Versuch es später noch einmal.');
}
const gmBike = t => { t = String(t || '').toLowerCase(); return /(cycl|biking|ride|bmx)/.test(t) && !/e_?bike|e_?mountain|e_?enduro/.test(t); };
class GmErr extends Error { constructor(code, msg){ super(msg); this.code = code; } }
async function gmMcp(){ let m = null; try { m = window.claude && window.claude.use ? await window.claude.use('mcp') : null; } catch (e) { elog(e); } if (!m) throw new GmErr('nomcp', 'Die Verbindung zu Garmin geht nur, wenn du die App in der Claude-Desktop-App öffnest.'); return m; }
const gmPay = r => { let p = r && r.payload; if (p == null && r && r.content) { const b = r.content.find(c => c.type === 'text'); if (b) try { p = JSON.parse(b.text); } catch (e) { elog(e); p = b.text; } } return p; };
/* Ruft ein Werkzeug der Erweiterung auf. Der Name, unter dem Claude die Erweiterung führt, wird einmal ermittelt und gemerkt. */
async function gmCall(tool, input){
  if (gmMode() === 'web' || (!gmInClaude() && gmWebOk)) return gmWeb(tool, input);
  const m = await gmMcp(), hosts = S.gm && S.gm.host ? [S.gm.host, ...GM_HOSTS.filter(h => h !== S.gm.host)] : GM_HOSTS; let last = null;
  for (const h of hosts) {
    try { const r = await Promise.race([m.callTool(h, tool, input), new Promise((_, rej) => setTimeout(() => rej(new GmErr('timeout', 'Garmin antwortet gerade nicht rechtzeitig. Versuch es später noch einmal.')), 120000))]); if (S.gm && S.gm.host !== h) S.gm = {...S.gm, host:h}; return gmPay(r); }
    catch (e) {
      if (e instanceof GmErr) throw e;
      const c = e && e.code, msg = String((e && e.message) || '');
      if (c === 'server_not_connected' || c === 'not_in_manifest' || c === 'server_not_found') { last = e; continue; }
      if (c === 'cancelled' || c === 'not_granted' || c === 'blocked_by_policy') throw new GmErr('denied', 'Der Zugriff auf Garmin wurde in der Claude-App nicht erlaubt.');
      if (/AUTH:/.test(msg)) throw new GmErr('auth', 'Garmin hat deinen API-Schlüssel abgelehnt. Er ist abgelaufen, widerrufen oder falsch kopiert.');
      if (/Kein Garmin-API-Schlüssel/.test(msg)) throw new GmErr('nokey', 'In der Erweiterung ist noch kein Garmin-Schlüssel hinterlegt.');
      throw new GmErr('tool', msg.replace(/^AUTH:\s*/, '') || 'Die Garmin-Erweiterung meldet einen Fehler.');
    }
  }
  throw new GmErr('nohost', 'Die Erweiterung „Garmin für Relentless“ antwortet nicht.');
}
/* Aktivitäten im Zeitraum (nur Radfahrten) */
async function gmList(from, to){
  const out = []; let start = 0;
  for (let k = 0; k < 8; k++) {
    const p = await gmCall('list_activities', {start, limit:50, startDate:from, endDate:to}), rows = (p && p.activities) || [];
    rows.forEach(a => { const ty = typeof a.activityType === 'string' ? a.activityType : a.activityType && a.activityType.typeKey; if (gmBike(ty)) out.push({id:String(a.activityId), n:a.activityName || 'Radfahrt', ts:String(a.startTimeGMT || a.startTimeLocal || '').replace(' ', 'T') + 'Z', ty}); });
    if (rows.length < 50) break; start += 50;
  }
  return out;
}
const gmB64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
/* Eine Fahrt holen: Original-FIT-Datei (jede Sekunde). Nur bei einem anderen Garmin-Baustein ohne dieses Werkzeug: ausgedünnte Aufzeichnung. */
async function gmRide(g){
  const p = await gmCall('get_activity_recording', {activityId:g.id, maxSamples:5000});
  /* Erweiterung „Garmin für Relentless“: Original-FIT-Datei (jede Sekunde) */
  if (p && p.data) { const u = gmB64(p.data), {data} = await unpack(u.buffer, p.fileName || g.id + '.zip'); const r = parseFIT(data); r.name = g.n; r.ty = g.ty; return {r, name:g.n}; }
  /* Anderer Garmin-Baustein (garmin-personal-mcp): ausgedünnte Aufzeichnung */
  if (!p || !p.records) throw new GmErr('tool', 'Die Fahrt enthält keine Aufzeichnung.');
  const num = v => v == null || v === '' || isNaN(+v) ? null : +v, se = p.session || {}, sp = String(se.sport || '').toLowerCase();
  const pts = (p.records.samples || []).map(q => ({t:q.timestamp ? Date.parse(q.timestamp) / 1000 : null, d:num(q.distance), a:num(q.enhancedAltitude != null ? q.enhancedAltitude : q.altitude), p:num(q.power), h:num(q.heartRate), tc:num(q.temperature), lat:null, lon:null}));
  return {r:{pts, ses:p.session ? [{sport:sp.includes('cycling') ? 2 : sp ? 99 : null, sec:num(se.totalTimerTime), km:se.totalDistance != null ? se.totalDistance / 1000 : null, hm:num(se.totalAscent), np:num(se.normalizedPower)}] : [], name:g.n, ty:g.ty}, name:g.n};
}
/* Abgleich: hist = Fahrten für die Auswertung beim Einstieg (90 Tage), man = Fahrten im laufenden Plan (42 Tage, mit Bewertung) */
/* Schon gespeicherte Garmin-Fahrten nachträglich als Rolle kennzeichnen, wenn Garmin sie als Indoor- oder virtuelle Fahrt führt */
function gmInFix(list){
  const ids = new Set((list || []).filter(g => rideIndoorTy(g.ty)).map(g => g.id)); if (!ids.size) return 0; let n = 0;
  ['man', 'arch', 'hist'].forEach(k => (S[k] || []).forEach(a => { if (a && a.gid && ids.has(String(a.gid)) && !a.in) { a.in = 1; n++; } }));
  if (n) save(); return n;
}
async function gmSync(target, quiet){
  if (gmBusy || !gmMode()) return; gmBusy = true; gmMsg = null; gmProg = 'Verbinde mit Garmin …'; if (!quiet) render();
  const days = target === 'hist' ? 90 : 42, to = iso(0), from = iso(-days), seen = new Set((S.gm.ids || []));
  let n = 0, skip = 0, fail = 0, nPl = 0, nX = 0;
  try {
    const all = await gmList(from, to); gmInFix(all);
    const list = all.filter(g => !seen.has(g.id)).sort((a, b) => a.ts.localeCompare(b.ts)).slice(-40);
    for (const g of list) {
      gmProg = `Lade Fahrt ${n + skip + fail + 1} von ${list.length} …`; if (!quiet) render();
      try {
        const {r, name} = await gmRide(g); const a = summarize(r, name); a.src = 'garmin'; a.gid = g.id; try { vzAttach(a, r); } catch (e) { elog(e); }
        if (target === 'hist') {
          S.hist = S.hist || []; if (S.hist.some(m => m.id === a.id)) skip++;
          else { S.hist.push({...Object.fromEntries(Object.entries(a).filter(([k, v]) => v == null || typeof v !== 'object')), np:a.np || 0, m1:a.m1 || null, m5:a.m5 || null, m20:a.m20 || null, m60:a.m60 || null}); n++; }
        } else {
          S.man = S.man || []; if (S.man.some(m => m.id === a.id)) skip++;
          else { const hw = hrHist(r, 600); if (hw) a.hrW = hw; S.man.push(a); const sv = exeShow, st = streamOf(r), hh = hrHist(r); const e0 = exeAuto(a, st, hh), isX = !!(e0 && String(e0.k || '').startsWith('x-')), e = isX ? null : e0 || gmPrevWeek(a, st, hh); if (e) { nPl++; gmNews.push({k:e.k || exeShow, n:e.plan || e.n, s:e.score, pr:!!(e.pr && e.pr.length)}); } else if (isX) { nX++; gmNews.push({x:e0.id, n:e0.n, pr:!!(e0.pr && e0.pr.length)}); } if (quiet || !e) exeShow = sv; n++; }
        }
        seen.add(g.id);
      } catch (e) { if (e instanceof GmErr && e.code !== 'tool') throw e; fail++; }
    }
    S.gm = {...S.gm, ids:[...seen].slice(-400), last:new Date().toISOString(), ok:true};
    gmMsg = {ok:true, t:gmSum(target, n, nPl, nX, skip, fail, days)}; if (n) S.gm = {...S.gm, lastNew:{at:Date.now(), n, auto:!!quiet}};
  } catch (e) { gmMsg = {ok:false, code:e.code, t:e.message}; }
  if (target === 'hist') S.hist = (S.hist || []).sort((a, b) => b.ts.localeCompare(a.ts));
  else { S.man = (S.man || []).filter(a => Date.now() - new Date(a.ts) < 42 * 864e5).sort((a, b) => b.ts.localeCompare(a.ts)); if (S.p && S.plan) analyze(); }
  gmBusy = false; gmProg = ''; save(); render();
}
async function gmConnect(target){
  if (!gmInClaude()) {
    const k = String(gmKeyIn || '').replace(/\s+/g, ''); if (!k) { gmMsg = {ok:false, code:'nokey', t:'Bitte zuerst deinen Garmin-API-Schlüssel einfügen.'}; return render(); }
    gmKeySet(k); gmKeyIn = ''; S.gm = {...(S.gm || {}), mode:'web'}; save(); await gmSync(target);
    if (gmMsg && !gmMsg.ok && (gmMsg.code === 'auth' || gmMsg.code === 'nokey' || gmMsg.code === 'noproxy')) { gmKeySet(''); S.gm = {...S.gm, mode:null}; save(); render(); }
    else if (gmMsg && !gmMsg.ok) { gmMsg = {...gmMsg, t:gmMsg.t + ' Dein Schlüssel bleibt gespeichert, du kannst es später erneut versuchen.'}; render(); }
    else { try { track('garmin-verbunden'); } catch (e) { elog(e); } }
    return;
  }
  S.gm = {...(S.gm || {}), mode:'mcp'}; save(); await gmSync(target);
  if (gmMsg && !gmMsg.ok) { S.gm = {...S.gm, mode:null}; save(); render(); }
}
function gmOff(){ gmKeySet(''); S.gm = {}; gmMsg = null; save(); render(); }
function gmHelp(code){
  if (!gmInClaude()) {
    if (code === 'auth' || code === 'nokey') return 'Erstelle unter connect.garmin.com → Einstellungen → Persönlicher API-Schlüssel einen neuen Schlüssel und füge ihn hier ein.';
    if (code === 'noproxy') return 'Die Web-App muss mit dem Ordner „netlify/functions“ veröffentlicht werden (über GitHub oder die Netlify-Kommandozeile, nicht per Drag-and-drop).';
    if (code === 'net') return 'Prüfe die Internetverbindung und tippe dann auf „Jetzt abgleichen“.';
    return '';
  }
  if (code === 'nomcp') return 'Im Browser oder in der Handy-App kann die App Garmin nicht erreichen, weil Garmin Zugriffe aus Webseiten sperrt. Lade Fahrten dort als Datei hoch.';
  if (code === 'nohost') return 'Ist die Erweiterung installiert und eingeschaltet (Claude → Einstellungen → Erweiterungen)? Nach dem Installieren die Claude-App einmal neu starten.';
  if (code === 'auth' || code === 'nokey') return 'Erstelle unter connect.garmin.com einen neuen Schlüssel und trag ihn in Claude unter Einstellungen → Erweiterungen → Garmin für Relentless → Konfigurieren ein.';
  if (code === 'denied') return 'Tippe noch einmal auf „Verbinden“ und erlaube den Zugriff in der Abfrage der Claude-App.';
  return '';
}
function gmCard(target){
  /* Außerhalb von Claude (z. B. als Web-App auf dem iPhone) gibt es keine Garmin-Verbindung: Garmin sperrt Webseiten */
  if (!gmInClaude() && !gmMode()) {
    if (gmWebOk === null) gmProbe();
    if (!gmWebOk) return `<div class="mt-3 p-3" style="border:1px solid var(--line)"><p class="text-sm font-semibold">Fahrten aus Garmin Connect</p><p class="mt-1 text-xs" style="color:var(--mute)">Lade Fahrten als Datei hoch: Im Browser <a class="underline" target="_blank" rel="noopener" href="https://connect.garmin.com/modern/activities">connect.garmin.com</a> öffnen, Fahrt antippen, Zahnrad → „Original exportieren“, dann unten „Dateien wählen“ und die ZIP-Datei aus den Downloads nehmen.</p></div>`;
    const msg = gmMsg ? `<p class="mt-2 text-sm" style="color:${esc(gmMsg.ok ? 'var(--ok)' : '#c0392b')}">${gmMsg.ok ? '✓' : '⚠'} ${esc(gmMsg.t)}</p>${!gmMsg.ok && gmHelp(gmMsg.code) ? `<p class="mt-1 text-xs" style="color:var(--mute)">${gmHelp(gmMsg.code)}</p>` : ''}` : '', busy = gmBusy ? `<p class="mt-2 text-sm" style="color:var(--mute)">${esc(gmProg)}</p>` : '';
    return `<div class="mt-3 p-3" style="border:1px solid var(--line)"><p class="text-sm font-semibold">Fahrten direkt aus Garmin Connect holen</p>
    <p class="mt-1 text-xs" style="color:var(--mute)">Die App holt deine Radfahrten mit Watt, Puls und Höhenprofil selbst aus Garmin Connect. Einmalig einrichten:</p>
    <ol class="mt-2 space-y-1 text-xs" style="list-style:decimal;padding-left:1.2rem;color:var(--mute)">
      <li>Bei Garmin einen persönlichen API-Schlüssel erstellen: <a class="underline" target="_blank" rel="noopener" href="https://connect.garmin.com/app/settings/personalApiToken">connect.garmin.com → Einstellungen → Persönlicher API-Schlüssel</a>, Gültigkeit am besten 1 Jahr.</li>
      <li>Den Schlüssel kopieren, hier einfügen und auf „Verbinden“ tippen.</li></ol>
    <input type="password" autocomplete="off" spellcheck="false" class="inp mt-2" placeholder="Garmin-API-Schlüssel" aria-label="Garmin-API-Schlüssel" oninput="gmKeyIn=this.value">
    <p class="mt-2 text-xs" style="color:var(--mute)">Der Schlüssel bleibt nur auf diesem Gerät und geht nur an Garmin, über den Server dieser App. Er landet nicht in Sicherungen und nicht im Plan. Die App liest nur deine Aktivitätsliste und die Originaldateien, sie schreibt nichts in dein Garmin-Konto.</p>
    <button class="btn mt-2 !w-auto !py-2 text-sm" ${gmBusy ? 'disabled' : ''} onclick="gmConnect('${ja(target)}')">${gmBusy ? 'Verbinde …' : 'Verbinden'}</button>${busy}${msg}</div>`;
  }
  const md = gmMode(), g = S.gm || {}, msg = gmMsg ? `<p class="mt-2 text-sm" style="color:${esc(gmMsg.ok ? 'var(--ok)' : '#c0392b')}">${gmMsg.ok ? '✓' : '⚠'} ${esc(gmMsg.t)}</p>${!gmMsg.ok && gmHelp(gmMsg.code) ? `<p class="mt-1 text-xs" style="color:var(--mute)">${gmHelp(gmMsg.code)}</p>` : ''}` : '';
  const busy = gmBusy ? `<p class="mt-2 text-sm" style="color:var(--mute)">${esc(gmProg)}</p>` : '';
  if (md) return `<div class="mt-3 p-3" style="border:1px solid var(--line);border-left:3px solid var(--teal)"><p class="text-sm font-semibold">Garmin Connect verbunden</p>
    <p class="mt-1 text-xs" style="color:var(--mute)">${g.last ? `Zuletzt abgeglichen: ${fmt(lstr(new Date(g.last)))}, ${new Date(g.last).toTimeString().slice(0, 5)} Uhr. ` : ''}Neue Radfahrten werden beim Öffnen der App${md === 'mcp' ? ' in der Claude-Desktop-App' : ''} automatisch übernommen und ${target === 'hist' ? 'für die Auswertung genutzt' : 'der Einheit am selben Tag zugeordnet und bewertet'}.</p>
    <div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !py-2 text-sm" ${gmBusy ? 'disabled' : ''} onclick="gmSync('${ja(target)}')">${gmBusy ? 'Gleicht ab …' : 'Jetzt abgleichen'}</button><button class="ghost !py-2 text-sm" onclick="gmOff()">Trennen</button></div>${busy}${msg}</div>`;
  return `<div class="mt-3 p-3" style="border:1px solid var(--line)"><p class="text-sm font-semibold">Fahrten direkt aus Garmin Connect holen</p>
    <p class="mt-1 text-xs" style="color:var(--mute)">Die App holt deine Radfahrten mit Watt, Puls und Höhenprofil selbst aus Garmin Connect. Garmin sperrt Zugriffe aus Webseiten, deshalb läuft die Verbindung über eine kleine Erweiterung in der Claude-Desktop-App. Einmalig einrichten:</p>
    <ol class="mt-2 space-y-1 text-xs" style="list-style:decimal;padding-left:1.2rem;color:var(--mute)">
      <li>Bei Garmin einen persönlichen API-Schlüssel erstellen: <a class="underline" target="_blank" rel="noopener" href="https://connect.garmin.com/app/settings/personalApiToken">connect.garmin.com → Einstellungen → Persönlicher API-Schlüssel</a>, Gültigkeit am besten 1 Jahr.</li>
      <li>Die Datei <b data-noi18n>garmin-relentless.mcpb</b> doppelklicken (du bekommst sie von Claude im Chat). Die Claude-Desktop-App installiert die Erweiterung „Garmin für Relentless“ und fragt <b>einmalig</b> nach dem Schlüssel. Er wird im Schlüsselbund deines Rechners gespeichert, die App sieht ihn nie.</li>
      <li>Diese App in der Claude-Desktop-App öffnen und auf „Verbinden“ tippen. Beim ersten Mal fragt Claude, ob die App die Erweiterung nutzen darf.</li></ol>
    <p class="mt-2 text-xs" style="color:var(--mute)">Die Erweiterung liest nur: Aktivitätsliste und Original-FIT-Dateien. Sie schreibt nichts in dein Garmin-Konto und sendet die Daten nur an diese App.</p>
    <button class="btn mt-2 !w-auto !py-2 text-sm" ${gmBusy ? 'disabled' : ''} onclick="gmConnect('${ja(target)}')">Verbinden</button>${busy}${msg}</div>`;
}
/* Beim Öffnen: neue Fahrten still nachholen (höchstens alle 3 Stunden) */
function gmAuto(force){
  try { if (S.gm && S.gm.mode && !['mcp', 'web'].includes(S.gm.mode)) S.gm = {}; if (S.gm && S.gm.mode === 'web' && (gmInClaude() || !gmKey())) S.gm = {}; const g = S.gm || {}; if (!g.mode || !g.ok || gmBusy) return; if (g.last && Date.now() - new Date(g.last) < (force ? 10 : 20) * 60e3) return;
    setTimeout(() => gmSync(S.p && S.step === 0 ? 'man' : 'hist', true), force ? 300 : 1500); } catch (e) { elog(e); }
}
/* Auch wenn die App aus dem Hintergrund zurückkommt (iPhone: Home-Bildschirm-Apps bleiben oft tagelang geöffnet) */
try { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') gmAuto(true); }); } catch (e) { elog(e); }
/* Fahrten der Vorwoche: Wurde die App erst nach dem Wochenwechsel geöffnet, gehört die Fahrt zur gespeicherten Vorwoche.
   Sie wird gegen die damals geplante Einheit bewertet; der aktuelle Plan bleibt unverändert. */
function gmPrevWeek(a, st, hr){
  try {
    const pw = S.prevPlan; if (!S.p || !pw || !pw.plan || pw.w !== S.wk - 1 || !a || !a.day) return null;
    const base = new Date(S.p.start + 'T12:00:00'), k = [0, 1, 2, 3, 4, 5, 6].find(j => { const d = new Date(base); d.setDate(d.getDate() + (pw.w - 1) * 7 + j); return lstr(d) === a.day; });
    const x = k == null ? null : pw.plan[k]; if (!x || !(x.m > 0) || x.t === 'rest') return null;
    const key = pw.w + '-' + k, note = 'Die Fahrt gehört zur Vorwoche. Sie ist bewertet und fließt in deine Form ein, am aktuellen Plan ändert sich dadurch nichts.';
    S.p.exe = S.p.exe || {}; let e;
    if (x.parts) {
      const arr = (S.p.exeP || {})[key] || [], h = a.ts ? new Date(a.ts).getHours() : 12, pref = h < 12 ? 0 : x.parts.length - 1, p = !arr[pref] ? pref : x.parts.findIndex((q, j) => !arr[j]); if (p < 0) return null;
      const pe = exeEval(partX(x, p), a, st, S.p.ftp, hr); pe.part = p; pe.lbl = x.parts[p].lbl; pe.adj = note; try { vzKeep(pe, a); } catch (er) { elog(er); }
      S.p.exeP = S.p.exeP || {}; const na = S.p.exeP[key] = [...(arr.length ? arr : x.parts.map(() => null))]; na[p] = pe; e = exeCombine(pw.w, k); if (e) { e.plan = x.n; e.x = {t:x.t, n:x.n, m:x.m, lo:x.lo, hi:x.hi}; }
    } else {
      if (S.p.exe[key]) return null;
      e = exeEval(x, a, st, S.p.ftp, hr); e.adj = note; try { vzKeep(e, a); } catch (er) { elog(er); } S.p.exe[key] = e;
    }
    if (!e) return null;
    pw.done = {...(pw.done || {})}; if (e.dr >= .6 && e.verdict !== 'wrong') pw.done[k] = true;
    try { if (S.p.wh && S.p.wh[pw.w]) S.p.wh[pw.w] = whSum(S.p, pw.w, pw.plan, pw.done, {}); } catch (er) { elog(er); }
    e.k = key; return e;
  } catch (er) { elog(er); return null; }
}
/* Hinweis auf dem Startbildschirm: neu von Garmin übernommene und bewertete Fahrten */
function gmNewsBar(){
  if (!gmNews.length || !S.p || S.step !== 0) return '';
  const l = gmNews[gmNews.length - 1], more = gmNews.length - 1;
  return `<div class="flex items-center gap-2 text-sm" role="status" style="background:var(--tint);border:1px solid var(--ice);border-left:3px solid var(--teal);padding:8px 10px 8px 12px;margin:10px 16px 0;color:var(--ink)"><span class="min-w-0 flex-1"><b>${l.x ? 'Zusätzliche Fahrt von Garmin:' : 'Neu von Garmin:'}</b> <span data-noi18n>${esc(l.n || 'Fahrt')}</span>${l.s != null ? ` · ${l.s}/100` : ''}${gmNews.some(q => q.pr) ? ' · <b style="color:#b7791f">neue Bestleistung</b>' : ''}${more > 0 ? ` <span style="color:var(--mute)">(+${more} weitere)</span>` : ''}</span><button class="ghost !px-3 !py-1 text-sm" onclick="${l.x ? `gmNews=[];lbOpenRide('${ja(l.x)}')` : `exeShow='${ja(l.k)}';gmNews=[];render()`}">Ansehen</button><button class="text-sm" style="color:var(--mute);padding:4px 6px;background:none;border:0" aria-label="Hinweis schließen" onclick="gmNews=[];render()">✕</button></div>`;
}

/* ---------- Gelegentlicher Hinweis: persönlichen Garmin-API-Schlüssel holen ----------
   Erscheint frühestens 2 Tage nach dem ersten Öffnen, danach höchstens alle 14 Tage, nur wenn Garmin hier verbunden werden kann
   und noch nicht verbunden ist. „Nicht mehr anzeigen“ schaltet ihn dauerhaft ab (in Einstellungen → Sprache und Hilfen wieder an). */
const GT_KEY = 'relentless.gmtip', GT_GAP = 14 * 864e5;
let gtOpen = false, gtStep = 0;
const gtGet = () => { try { return JSON.parse(localStorage.getItem(GT_KEY) || '{}') || {}; } catch (e) { elog(e); return {}; } };
const gtPut = o => { try { localStorage.setItem(GT_KEY, JSON.stringify({...gtGet(), ...o})); } catch (e) { elog(e); } };
const gtOff = () => !!gtGet().off;
function gtSet(on){ gtPut(on ? {off:false, next:Date.now()} : {off:true}); render(); }
const gtCan = () => !gmMode() && (gmInClaude() || gmWebOk === true);
async function gtInit(){
  try {
    const st = gtGet(); if (st.off) return;
    if (!st.next) { gtPut({next:Date.now() + 2 * 864e5}); return; }
    if (Date.now() < st.next) return;
    if (!gmInClaude()) await gmProbe();
    setTimeout(() => {
      if (gtOpen || !gtCan() || !S.p || S.step !== 0 || typeof exeShow !== 'undefined' && exeShow) return;
      gtOpen = true; gtStep = 0; gtPut({next:Date.now() + GT_GAP, n:(gtGet().n || 0) + 1}); try { track('garmin-tipp-gezeigt'); } catch (e) { elog(e); } render();
    }, 5000);
  } catch (e) { elog(e); }
}
function gtClose(never){ gtOpen = false; gtStep = 0; if (never) { gtPut({off:true}); try { track('garmin-tipp-aus'); } catch (e) { elog(e); } } render(); }
function gtYes(){ gtStep = 1; gmMsg = null; try { track('garmin-tipp-interesse'); } catch (e) { elog(e); } render(); }
async function gtConnect(){ await gmConnect('man'); if (gmMode()) { gtOpen = false; gtStep = 0; render(); } }
function gtModal(){
  if (!gtOpen) return '';
  const never = `<button class="mt-3 block w-full text-center text-xs underline" style="color:var(--mute);background:none;border:0" onclick="gtClose(true)">Nicht mehr anzeigen</button>`;
  if (!gtStep) return `<div class="exov" onclick="if(event.target===this)gtClose()" role="dialog" aria-modal="true" aria-label="Fahrten automatisch aus Garmin holen"><div class="exbox" style="max-width:420px">
    <p class="eyebrow mb-2">Tipp</p><h3 class="hd text-2xl font-semibold">Fahrten automatisch aus Garmin holen?</h3>
    <p class="mt-2 text-sm">Mit einem persönlichen API-Schlüssel von Garmin holt die App deine Radfahrten selbst ab und bewertet sie, ohne dass du Dateien exportieren musst. Das Einrichten dauert etwa 2 Minuten und ist kostenlos.</p>
    <div class="mt-4 flex flex-wrap gap-2"><button class="btn !w-auto" onclick="gtYes()">Ja, zeig mir wie</button><button class="ghost" onclick="gtClose()">Später</button></div>${never}</div></div>`;
  const msg = gmMsg ? `<p class="mt-2 text-sm" style="color:${esc(gmMsg.ok ? 'var(--ok)' : '#c0392b')}">${gmMsg.ok ? '✓' : '⚠'} ${esc(gmMsg.t)}</p>${!gmMsg.ok && gmHelp(gmMsg.code) ? `<p class="mt-1 text-xs" style="color:var(--mute)">${gmHelp(gmMsg.code)}</p>` : ''}` : '';
  const busy = gmBusy ? `<p class="mt-2 text-sm" style="color:var(--mute)">${esc(gmProg)}</p>` : '';
  const li = (n, t) => `<li class="flex gap-3"><span class="hd flex-none text-center font-semibold" style="width:26px;height:26px;line-height:26px;background:var(--teal);color:#071747">${n}</span><span class="min-w-0 flex-1 text-sm">${t}</span></li>`;
  const steps = [
    li(1, `<b>Garmin Connect öffnen:</b> <a class="underline" target="_blank" rel="noopener" href="https://connect.garmin.com/app/settings/personalApiToken">connect.garmin.com → Einstellungen → Persönlicher API-Schlüssel</a> im Browser öffnen und mit deinem Garmin-Konto anmelden.`),
    li(2, `<b>Schlüssel erstellen:</b> Einen neuen Schlüssel anlegen. Als Gültigkeit empfehlen wir <b>1 Jahr</b>.`),
    li(3, `<b>Kopieren:</b> Den angezeigten Schlüssel vollständig kopieren.`),
    gmInClaude()
      ? li(4, `<b>Erweiterung einrichten:</b> Die Datei <b data-noi18n>garmin-relentless.mcpb</b> aus dem Chat doppelklicken. Claude installiert „Garmin für Relentless“ und fragt einmalig nach dem Schlüssel. Danach hier auf „Verbinden“ tippen.`)
      : li(4, `<b>Hier einfügen und verbinden:</b> Den Schlüssel unten einfügen und auf „Verbinden“ tippen. Er bleibt nur auf diesem Gerät.`)
  ].join('');
  const input = gmInClaude() ? '' : `<input type="password" autocomplete="off" spellcheck="false" class="inp mt-3" placeholder="Garmin-API-Schlüssel" aria-label="Garmin-API-Schlüssel" oninput="gmKeyIn=this.value">`;
  return `<div class="exov" onclick="if(event.target===this)gtClose()" role="dialog" aria-modal="true" aria-label="Garmin-API-Schlüssel einrichten"><div class="exbox" style="max-width:460px">
    <p class="eyebrow mb-2">In 4 Schritten</p><h3 class="hd text-2xl font-semibold">Garmin verbinden</h3>
    <ol class="mt-3 space-y-3" style="list-style:none;padding:0">${steps}</ol>${input}
    <p class="mt-3 text-xs" style="color:var(--mute)">Die App liest nur deine Aktivitätsliste und die Originaldateien. Sie schreibt nichts in dein Garmin-Konto. Du kannst die Verbindung jederzeit unter Fahrten trennen und den Schlüssel bei Garmin widerrufen.</p>
    <div class="mt-4 flex flex-wrap gap-2"><button class="btn !w-auto" ${gmBusy ? 'disabled' : ''} onclick="gtConnect()">${gmBusy ? 'Verbinde …' : 'Verbinden'}</button><button class="ghost" onclick="gtClose()">Später</button></div>${busy}${msg}${never}</div></div>`;
}

/* Android/Chrome: Installieren als App anbieten (das Ereignis kommt nur, wenn der Browser die Seite für installierbar hält) */
let instEvt = null, instHide = false;
try { window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instEvt = e; try { render(); } catch (er) { elog(er); } }); window.addEventListener('appinstalled', () => { instEvt = null; try { render(); } catch (er) { elog(er); } }); } catch (e) { elog(e); }
async function instGo(){ if (!instEvt) return; track('app-installieren-getippt'); const e = instEvt; instEvt = null; try { await e.prompt(); } catch (er) { elog(er); } render(); }
const INST_KEY = 'relentless.inst.hide';
try { if (localStorage.getItem(INST_KEY) === '1') instHide = true; } catch (e) { elog(e); }
let instHelp = false;
const instOs = () => { try { const u = navigator.userAgent || ''; return /android/i.test(u) ? 'android' : (/iphone|ipad|ipod/i.test(u) || (/macintosh/i.test(u) && navigator.maxTouchPoints > 1)) ? 'ios' : ''; } catch (e) { elog(e); return ''; } };
const instAlone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { elog(e); return false; } };
const instWeb = () => { try { return /^https?:$/.test(location.protocol) && !(window.claude && window.claude.use) && !/claude|anthropic/.test(location.hostname); } catch (e) { elog(e); return false; } };
function instClose(){ instHide = true; instHelp = false; try { localStorage.setItem(INST_KEY, '1'); } catch (e) { elog(e); } render(); }
function instTap(){ if (instEvt) return instGo(); instHelp = !instHelp; render(); }
function instSteps(){
  const u = navigator.userAgent || '', li = t => `<li style="margin-top:4px">${t}</li>`;
  if (instOs() === 'ios') return li('Seite in <b>Safari</b> öffnen') + li('Unten auf <b>Teilen</b> tippen (Quadrat mit Pfeil)') + li('<b>Zum Home-Bildschirm</b> wählen und <b>Hinzufügen</b> tippen');
  if (/SamsungBrowser/i.test(u)) return li('Unten rechts auf <b>☰</b> (Menü) tippen') + li('<b>Seite hinzufügen zu</b> → <b>Startbildschirm</b> wählen');
  if (/Firefox/i.test(u)) return li('Oben rechts auf <b>⋮</b> tippen') + li('<b>Installieren</b> oder <b>Zum Startbildschirm hinzufügen</b> wählen');
  return li('Oben rechts auf <b>⋮</b> tippen') + li('<b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b> wählen') + li('Mit <b>Installieren</b> bestätigen');
}
const instBanner = () => {
  if (instHide || instAlone()) return '';
  if (!instEvt && !(instWeb() && instOs())) return '';
  const help = instHelp && !instEvt ? `<ol style="margin:10px 0 2px;padding-left:20px;color:#cfdaf0;font-size:13px;line-height:1.45">${instSteps()}</ol>` : '';
  return `<div class="text-sm" style="background:#071747;color:#fff;padding:10px 12px 10px 16px;position:fixed;left:12px;right:12px;bottom:calc(84px + var(--nlb, env(safe-area-inset-bottom,0px)));z-index:60;box-shadow:0 10px 30px rgba(7,23,71,.35);max-width:560px;margin:0 auto"><div class="flex items-center gap-2"><span class="min-w-0 flex-1 font-semibold">Relentless als App installieren</span><button class="text-sm font-semibold" style="background:#00c2b2;color:#071747;padding:8px 14px" onclick="instTap()">${instEvt ? 'Installieren' : instHelp ? 'Schließen' : 'So geht’s'}</button><button class="text-sm" style="color:#cfdaf0;padding:8px 6px" aria-label="Hinweis ausblenden" onclick="instClose()">✕</button></div>${help}</div>`;
};
const instBannerOld = () => instEvt && !instHide ? `<div class="flex items-center gap-2 text-sm" style="background:#071747;color:#fff;padding:10px 12px 10px 16px;position:fixed;left:12px;right:12px;bottom:calc(84px + var(--nlb, env(safe-area-inset-bottom,0px)));z-index:60;box-shadow:0 10px 30px rgba(7,23,71,.35);max-width:560px;margin:0 auto"><span class="min-w-0 flex-1 font-semibold">Relentless als App installieren</span><button class="text-sm font-semibold" style="background:#00c2b2;color:#071747;padding:8px 14px" onclick="instGo()">Installieren</button><button class="text-sm" style="color:#cfdaf0;padding:8px 6px" aria-label="Hinweis schließen" onclick="instHide=true;render()">✕</button></div>` : '';

