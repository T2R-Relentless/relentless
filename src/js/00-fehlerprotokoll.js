/* ---------- Fehlerprotokoll: abgefangene Fehler sichtbar machen ----------
   Viele Stellen fangen Fehler bewusst ab, damit die App weiterläuft (z. B. gesperrter Speicher im privaten Modus oder eine
   kaputte Fahrtdatei). Damit solche Fehler nicht spurlos verschwinden, landen sie hier: je Fehlerart ein Eintrag mit Anzahl,
   letztem Auftreten und der Stelle im Code. Höchstens 40 Einträge, nur auf diesem Gerät (relentless.errlog), nie in
   Sicherungen, in der Statistik oder auf einem Server. Ansehen, kopieren, leeren: Einstellungen → Sprache, Darstellung, Hilfen.
   Steht ganz oben (mit var), damit es schon beim Start bereitsteht. Darf selbst nie einen Fehler auslösen. */
var ELOG = null, elogT = 0, elogMsg = '';
function elogRead(){
  if (ELOG) return ELOG;
  try { const o = JSON.parse(localStorage.getItem('relentless.errlog') || '[]'); ELOG = Array.isArray(o) ? o.filter(x => x && typeof x.m === 'string' && typeof x.k === 'string').slice(-40) : []; } catch (_) { ELOG = []; }
  return ELOG;
}
function elog(e, where){
  try {
    const m = String((e && e.message) || e || 'Unbekannter Fehler').slice(0, 300), n = String((e && e.name) || '').slice(0, 40);
    const fr = String((e && e.stack) || '').split('\n').map(q => q.trim()).filter(q => /^at |@/.test(q))[0] || '';
    const at = String(where || fr.replace(/\(?(?:https?|about|blob|file):[^\s)]*?:(\d+):\d+\)?/, 'Zeile $1')).slice(0, 160);
    const L = elogRead(), k = n + '|' + m + '|' + at, t = Date.now(), x = L.find(q => q.k === k);
    if (x) { x.c++; x.t = t; } else { L.push({k, n, m, at, c:1, t}); if (L.length > 40) L.splice(0, L.length - 40); }
    if (!elogT) elogT = setTimeout(elogFlush, 1000);
  } catch (_) { /* das Protokoll selbst darf nie scheitern */ }
}
function elogFlush(){ elogT = 0; try { if (ELOG) localStorage.setItem('relentless.errlog', JSON.stringify(ELOG)); } catch (_) { /* Speicher voll oder gesperrt */ } }
try {
  window.addEventListener('error', ev => elog(ev.error || ev.message, ev.error ? '' : 'Seite'));
  window.addEventListener('unhandledrejection', ev => elog(ev.reason));
  window.addEventListener('pagehide', () => { if (elogT) { clearTimeout(elogT); elogFlush(); } });
} catch (_) { /* sehr alte Browser */ }
const elogWhen = t => { try { return new Date(t).toLocaleString('de-DE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); } catch (_) { return ''; } };
function elogText(){
  const L = elogRead().slice().reverse(); let v = '';
  try { v = 'Relentless ' + APP_VERSION + ' (' + APP_BUILD + ')'; } catch (_) { v = 'Relentless'; }
  return [v, navigator.userAgent, ...L.map(x => `${new Date(x.t).toISOString()} · ${x.c}× · ${x.n ? x.n + ': ' : ''}${x.m}${x.at ? ' · ' + x.at : ''}`)].join('\n');
}
function elogCopy(){
  const t = elogText(), done = ok => { elogMsg = ok ? 'Kopiert. Du kannst es jetzt z. B. in eine Nachricht einfügen.' : 'Kopieren ist hier nicht möglich.'; render(); };
  try { navigator.clipboard.writeText(t).then(() => done(true), () => done(false)); } catch (e) { elog(e); done(false); }
}
function elogClear(){ ELOG = []; elogMsg = ''; try { localStorage.removeItem('relentless.errlog'); } catch (e) { elog(e); } render(); }
function elogUi(){
  const L = elogRead().slice().reverse(), n = L.length;
  const row = x => `<li class="py-2" style="border-top:1px solid var(--line)"><p class="text-sm font-semibold" data-noi18n>${esc((x.n ? x.n + ': ' : '') + x.m)}</p><p class="text-xs" style="color:var(--mute)"><span>${esc(x.c)}×</span><span> · zuletzt </span><span data-noi18n>${esc(elogWhen(x.t))}${x.at ? ' · ' + esc(x.at) : ''}</span></p></li>`;
  const body = n ? `<ul class="mt-2">${L.slice(0, 15).map(row).join('')}</ul>${n > 15 ? `<p class="mt-1 text-xs" style="color:var(--mute)">und ${n - 15} weitere</p>` : ''}
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 !py-1.5 text-sm" onclick="elogCopy()">Kopieren</button><button class="ghost !px-3 !py-1.5 text-sm" onclick="elogClear()">Leeren</button></div>` : '<p class="mt-2 text-sm" style="color:var(--mute)">Keine Fehler aufgezeichnet.</p>';
  return fold('elog', 'Fehlerprotokoll', `<p class="text-sm">Hier hält die App Fehler fest, die sie im Hintergrund abgefangen hat. Sie bleiben auf diesem Gerät. Wenn etwas nicht wie erwartet funktioniert, kopiere das Protokoll und schick es mit deiner Beschreibung.</p>${body}${elogMsg ? `<p class="mt-2 text-sm" role="status">${esc(elogMsg)}</p>` : ''}`, false, n ? n + (n === 1 ? ' Eintrag' : ' Einträge') : 'leer');
}

