/* ---------- F29: Reisemodus (Dienstreise, Zeitzonen, Reisen vor dem Rennen) ----------
   Abschaltbar: S.rz.mode 'on' | 'off' | 'unset' (unset wirkt wie aus, es wurde nur noch nie gefragt). Alle Stellen fragen
   rzOn(). Ist der Reisemodus aus und gibt es keine behaltenen Anpassungen, verändert dieses Modul nichts.
   Reise: {id, from, to, departDay, returnDay, tzHome, tzDest (IANA), dest, mode, travelHours, facilities[], freeMinPerDay,
   note, status 'planned' | 'applied' | 'hidden'}. Zeitzonen rechnet die Intl-API des Browsers, ohne Netz.
   Der Plan wird nie von selbst geändert: Eine Reise wirkt erst im Plan, wenn ihr Vorschlag angenommen ist (status
   'applied'). Dann legt rzApply() die Regeln beim Erzeugen jeder Woche an (genWeek), dadurch rechnen Wochensummen,
   Formkurve und Event-Prognosen automatisch mit. Vor dem Annehmen entsteht ein Schnappschuss (bkPre, „Rückgängig“).
   Quellen (geprüft am 14.11.2026):
   - Janse van Rensburg DC et al. (2021): Managing Travel Fatigue and Jet Lag in Athletes: A Review and Consensus Statement.
     Sports Med 51(10):2029–2050. doi:10.1007/s40279-021-01502-0 – Reisemüdigkeit und Jetlag, Jetlag ab etwa 3 Zeitzonen,
     Licht als stärkstes Werkzeug, Anpassung nach Osten langsamer als nach Westen.
   - Waterhouse J, Reilly T, Atkinson G, Edwards B (2007): Jet lag: trends and coping strategies. Lancet 369(9567):1117–1129.
     doi:10.1016/S0140-6736(07)60529-7 – Faustregel etwa 1 Tag je Zeitzone, nach Westen schneller.
   - Mujika I, Padilla S (2000): Detraining, Part I. Sports Med 30(2):79–87. doi:10.2165/00007256-200030020-00002
   - Bosquet L et al. (2007): Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 39(8):1358–1365.
     doi:10.1249/mss.0b013e31806010e0 – Umfang senken, Intensität halten.
   - Spiering BA, Mujika I, Sharp MA, Foulis SA (2021): Maintaining Physical Performance: The Minimal Dose of Exercise.
     J Strength Cond Res 35(5):1449–1458. doi:10.1519/JSC.0000000000003964 – Ausdauer bleibt bei weniger Umfang und
     Häufigkeit erhalten, wenn die Intensität bleibt.
   Richtwerte ohne eigene Quelle: höchstens 5 Tage ohne harte Intervalle nach dem Zeitzonenwechsel, 1–2 lockere Tage nach
   der Rückkehr, Grenze 4 Std. Reisedauer, Dauer und Aufbau der Hotel-Einheiten. */
var rzSim = null;
const RZ_FAC = [['none', 'Nichts', 'Nothing'], ['room', 'Platz im Zimmer', 'Space in the room'], ['gym_bike', 'Hotel-Ergometer', 'Hotel bike'], ['treadmill', 'Laufband', 'Treadmill'], ['own_bike', 'Eigenes Rad dabei', 'Own bike with me'], ['running', 'Laufen draußen', 'Running outdoors']];
const RZ_MODE = [['flight', 'Flug', 'Flight'], ['train', 'Bahn', 'Train'], ['car', 'Auto', 'Car']];
const RZ_MIN = [15, 30, 45, 60];
/* Offline-Liste gängiger Ziele: [Deutsch, Englisch, IANA-Zeitzone] */
const RZ_CITY = [['Amsterdam', '', 'Europe/Amsterdam'], ['Athen', 'Athens', 'Europe/Athens'], ['Barcelona', '', 'Europe/Madrid'], ['Berlin', '', 'Europe/Berlin'], ['Brüssel', 'Brussels', 'Europe/Brussels'], ['Dublin', '', 'Europe/Dublin'], ['Helsinki', '', 'Europe/Helsinki'], ['Istanbul', '', 'Europe/Istanbul'], ['Kopenhagen', 'Copenhagen', 'Europe/Copenhagen'], ['Lissabon', 'Lisbon', 'Europe/Lisbon'], ['London', '', 'Europe/London'], ['Madrid', '', 'Europe/Madrid'], ['Mailand', 'Milan', 'Europe/Rome'], ['Mallorca', 'Majorca', 'Europe/Madrid'], ['Oslo', '', 'Europe/Oslo'], ['Paris', '', 'Europe/Paris'], ['Prag', 'Prague', 'Europe/Prague'], ['Rom', 'Rome', 'Europe/Rome'], ['Stockholm', '', 'Europe/Stockholm'], ['Warschau', 'Warsaw', 'Europe/Warsaw'], ['Wien', 'Vienna', 'Europe/Vienna'], ['Zürich', 'Zurich', 'Europe/Zurich'],
  ['Kanarische Inseln', 'Canary Islands', 'Atlantic/Canary'], ['Reykjavik', '', 'Atlantic/Reykjavik'], ['Kairo', 'Cairo', 'Africa/Cairo'], ['Johannesburg', '', 'Africa/Johannesburg'], ['Kapstadt', 'Cape Town', 'Africa/Johannesburg'], ['Nairobi', '', 'Africa/Nairobi'], ['Lagos', '', 'Africa/Lagos'], ['Casablanca', '', 'Africa/Casablanca'],
  ['Dubai', '', 'Asia/Dubai'], ['Doha', '', 'Asia/Qatar'], ['Riad', 'Riyadh', 'Asia/Riyadh'], ['Tel Aviv', '', 'Asia/Jerusalem'], ['Mumbai', '', 'Asia/Kolkata'], ['Delhi', '', 'Asia/Kolkata'], ['Bangalore', '', 'Asia/Kolkata'], ['Bangkok', '', 'Asia/Bangkok'], ['Singapur', 'Singapore', 'Asia/Singapore'], ['Kuala Lumpur', '', 'Asia/Kuala_Lumpur'], ['Jakarta', '', 'Asia/Jakarta'], ['Hongkong', 'Hong Kong', 'Asia/Hong_Kong'], ['Shanghai', '', 'Asia/Shanghai'], ['Peking', 'Beijing', 'Asia/Shanghai'], ['Seoul', '', 'Asia/Seoul'], ['Tokio', 'Tokyo', 'Asia/Tokyo'], ['Taipeh', 'Taipei', 'Asia/Taipei'], ['Manila', '', 'Asia/Manila'],
  ['Sydney', '', 'Australia/Sydney'], ['Melbourne', '', 'Australia/Melbourne'], ['Perth', '', 'Australia/Perth'], ['Auckland', '', 'Pacific/Auckland'], ['Honolulu', '', 'Pacific/Honolulu'],
  ['New York', '', 'America/New_York'], ['Boston', '', 'America/New_York'], ['Washington', '', 'America/New_York'], ['Miami', '', 'America/New_York'], ['Toronto', '', 'America/Toronto'], ['Chicago', '', 'America/Chicago'], ['Dallas', '', 'America/Chicago'], ['Denver', '', 'America/Denver'], ['Los Angeles', '', 'America/Los_Angeles'], ['San Francisco', '', 'America/Los_Angeles'], ['Seattle', '', 'America/Los_Angeles'], ['Vancouver', '', 'America/Vancouver'], ['Mexiko-Stadt', 'Mexico City', 'America/Mexico_City'], ['Bogotá', '', 'America/Bogota'], ['Lima', '', 'America/Lima'], ['São Paulo', '', 'America/Sao_Paulo'], ['Buenos Aires', '', 'America/Argentina/Buenos_Aires'], ['Santiago de Chile', 'Santiago, Chile', 'America/Santiago']];
const rzISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const rzP2 = n => String(n).padStart(2, '0');
/* ---- Schalter ---- */
function rzOn(){ return !!(S && S.rz && S.rz.mode === 'on'); }
function rzS(){ if (!S.rz || typeof S.rz !== 'object') S.rz = {mode:'unset', trips:[]}; if (!Array.isArray(S.rz.trips)) S.rz.trips = []; return S.rz; }
const rzOk = t => !!t && rzISO(t.from) && rzISO(t.to) && t.to >= t.from;
const rzDep = t => rzISO(t.departDay) && t.departDay <= t.from ? t.departDay : t.from;
const rzRet = t => rzISO(t.returnDay) && t.returnDay >= t.to ? t.returnDay : t.to;
/* sichtbare Reisen (nur bei eingeschaltetem Reisemodus) */
function rzTrips(){ return rzOn() ? (S.rz.trips || []).filter(t => rzOk(t) && t.status !== 'hidden').sort((a, b) => a.from.localeCompare(b.from)) : []; }
/* Reisen, die im Plan wirken: angenommene, außerdem behaltene Anpassungen nach dem Ausschalten */
function rzPlanTrips(){
  const z = S && S.rz; if (!z || !Array.isArray(z.trips) || !z.trips.length) return [];
  return z.trips.filter(t => rzOk(t) && (rzSim && rzSim.id === t.id ? rzSim.on : z.mode === 'on' ? t.status === 'applied' : t.status === 'hidden' && !!t.keep));
}
function rzWith(id, on, fn){ const o = rzSim; rzSim = {id, on}; try { return fn(); } finally { rzSim = o; } }
/* ---- Zeitzonen (Intl, offline) ---- */
function rzDevTz(){ try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'; } catch (e) { elog(e); return 'Europe/Berlin'; } }
function rzTzOk(tz){ try { if (!tz) return false; new Intl.DateTimeFormat('en-US', {timeZone:tz}); return true; } catch (e) { return false; } }
function rzHomeTz(){ const z = S && S.rz; return z && rzTzOk(z.tzHome) ? z.tzHome : rzDevTz(); }
const _rzFmt = {};
function rzParts(tz, ms){ const f = _rzFmt[tz] || (_rzFmt[tz] = new Intl.DateTimeFormat('en-US', {timeZone:tz, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'})), o = {}; f.formatToParts(new Date(ms)).forEach(p => { if (p.type !== 'literal') o[p.type] = +p.value; }); o.hour = o.hour % 24; return o; }
/* Abstand einer Zeitzone zu UTC in Minuten zu einem Zeitpunkt (berücksichtigt Sommer- und Winterzeit) */
function rzOffMin(tz, ms){ try { const o = rzParts(tz, ms); return Math.round((Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - Math.floor(ms / 1000) * 1000) / 60000); } catch (e) { elog(e); return 0; } }
function rzDayIn(ms, tz){ const o = rzParts(tz, ms); return o.year + '-' + rzP2(o.month) + '-' + rzP2(o.day); }
function rzClock(ms, tz){ try { const o = rzParts(tz, ms); return rzP2(o.hour) + ':' + rzP2(o.minute); } catch (e) { elog(e); return ''; } }
/* Zeitverschiebung in Stunden: Ziel minus Heimat (+ = Osten). Über 12 Std. zählt der kürzere Weg. */
function rzDiffTz(tzD, tzH, ds){ if (!rzTzOk(tzD) || !rzTzOk(tzH)) return 0; const ms = Date.parse((rzISO(ds) ? ds : iso(0)) + 'T12:00:00Z'); let d = (rzOffMin(tzD, ms) - rzOffMin(tzH, ms)) / 60; if (d > 12) d -= 24; if (d < -12) d += 24; return d; }
function rzDiffH(t, ds){ return t && t.tzDest ? rzDiffTz(t.tzDest, t.tzHome || rzHomeTz(), ds || t.from) : 0; }
/* Geschätzte Anpassung in Tagen: unter 3 Std. kein Jetlag; nach Osten etwa 1 Tag je Zeitzone, nach Westen etwa halb so lang */
function rzAdapt(d){ const a = Math.abs(d); return a < 3 ? 0 : Math.ceil(a * (d > 0 ? 1 : .5)); }
const rzHTxt = d => { const a = Math.abs(d), s = Number.isInteger(a) ? String(a) : String(a).replace('.', wkL(',', '.')); return (d > 0 ? '+' : '−') + s; };
/* Tag einer Fahrt: liegt sie in einer Reise mit Zeitzone, zählt der Kalendertag am Reiseziel, sonst der des Geräts */
function rzDay(ms){
  const def = lstr(new Date(ms));
  try { if (!rzOn()) return def; for (const t of rzTrips()) { if (!rzTzOk(t.tzDest)) continue; const d = rzDayIn(ms, t.tzDest); if (d >= t.from && d <= t.to) return d; } } catch (e) { elog(e); }
  return def;
}
function rzCityOf(t){ const c = RZ_CITY.find(x => x[0] === t.dest); return c ? (wkL(c[0], c[1] || c[0])) : (t.dest || (t.tzDest || '').split('/').pop().replace(/_/g, ' ') || wkL('Reise', 'Trip')); }
/* ---- Planregeln ---- */
const rzFacs = t => { const f = (Array.isArray(t.facilities) ? t.facilities : []).filter(k => RZ_FAC.some(x => x[0] === k)); return f.length ? f : ['none']; };
const rzFree = t => RZ_MIN.includes(+t.freeMinPerDay) ? +t.freeMinPerDay : 30;
const rzFar = t => (+t.travelHours || 0) > 4 || Math.abs(rzDiffH(t)) >= 3;
const rzLen = t => ddiff(rzDep(t), rzRet(t)) + 1;
/* Art jedes Tages der Woche w für eine Reise: dep (Hinreise), ret (Rückreise), stay, pre (Vortag einer langen Reise), post (Wiedereinstieg) */
function rzKinds(t, p, w){
  const dep = rzDep(t), ret = rzRet(t), d = rzDiffH(t), nA = Math.min(5, rzAdapt(d)), nB = Math.min(5, rzAdapt(-d)), far = rzFar(t), nP0 = rzLen(t) >= 7 || Math.abs(d) >= 3 ? 2 : 1, nPost = Math.max(nP0, nB);
  return [0, 1, 2, 3, 4, 5, 6].map(j => { const ds = addD(p.start, (w - 1) * 7 + j);
    if (ds === dep) return {k:'dep', ds}; if (ds === ret) return {k:'ret', ds};
    if (ds > dep && ds < ret) return {k:'stay', ds, jet:nA > 0 && ddiff(dep, ds) <= nA};
    if (far && ds === addD(dep, -1)) return {k:'pre', ds};
    if (ds > ret && ddiff(ret, ds) <= nPost) return {k:'post', ds, jet:nB > 0 && ddiff(ret, ds) <= nB, soft:ddiff(ret, ds) > nP0}; /* soft: nur noch wegen der Zeitumstellung, Long Ride bleibt */
    return null; });
}
const rzFix = x => !x || x.t === 'race' || !!x.vac || /^Eventtag|^Aktivierung|^Erholung nach dem Event|^Deine Zieltour/.test(x.n || '');
const rzHardT = x => !!x && x.m > 0 && (HARD.includes(x.t) || x.t === 'test');
const rzKey = x => rzHardT(x) || (!!x && x.m > 0 && x.t === 'long');
const rzHeavy = x => rzKey(x) || (!!x && x.t === 'race');
const RZ_RPE = 'Hotel-Räder zeigen Watt oft ungenau oder gar nicht. Steuere deshalb nach Gefühl und Puls statt nach Watt.';
/* Ersatz auf Hotel-Ergometer oder Laufband: erhält den Kernreiz der ersetzten Einheit */
function rzErgo(x, F, mill, hard){
  const dev = mill ? 'Laufband' : 'Hotel-Ergometer', tip = mill ? 'Auf dem Laufband zählt das Gefühl: Steuere nach Atmung und Puls. Bergauf gehen schont Gelenke, die das Laufen nicht gewohnt sind.' : RZ_RPE;
  if (hard && F >= 30 && x.t === 'vo2') { const n = F >= 45 ? 5 : 4;
    return D('vo2', `${dev}: ${n}×3 Min. hart`, F >= 45 ? 45 : 30, 106, 118, mill ? '' : '90–100 U/min', mill ? `Einlaufen ${F >= 45 ? 10 : 6} Min. locker gehen. Dann ${n}×3 Min. zügig bergauf gehen (8 bis 12 % Steigung, Anstrengung 8 bis 9 von 10), dazwischen 3 Min. flach und locker. Am Ende 3 bis 5 Min. locker auslaufen.` : `Einfahren ${F >= 45 ? 10 : 6} Min. locker. Dann ${n}×3 Min. hart (Anstrengung 8 bis 9 von 10, Sprechen kaum möglich), dazwischen 3 Min. locker. Am Ende 3 bis 5 Min. ausfahren.`, tip + ' Kurz und hart reicht, um die Form über die Reise zu halten.'); }
  if (hard && F >= 30) { const n = F >= 45 ? 3 : 2;
    return D('thr', `${dev}: ${n}×8 Min. zügig`, F >= 45 ? 45 : 30, 88, 98, mill ? '' : '85–95 U/min', mill ? `Einlaufen ${F >= 45 ? 10 : 6} Min. locker gehen. Dann ${n}×8 Min. zügig bergauf gehen (6 bis 10 % Steigung, Anstrengung 7 von 10), dazwischen 3 Min. flach und locker. Am Ende 3 Min. locker auslaufen.` : `Einfahren ${F >= 45 ? 10 : 6} Min. locker. Dann ${n}×8 Min. zügig (Anstrengung 7 von 10, nur kurze Sätze möglich), dazwischen 3 Min. locker. Am Ende 3 Min. ausfahren.`, tip + ' Kurz und zügig reicht, um die Form über die Reise zu halten.'); }
  const m = Math.max(15, Math.min(F, 45, x.m > 0 ? Math.max(20, x.m) : 45));
  return D('base', `${dev} locker`, m, 56, 68, mill ? '' : '90 U/min', mill ? 'Zügig gehen oder locker laufen, ein Gespräch muss möglich sein (Anstrengung 3 bis 4 von 10).' : 'Gleichmäßig locker, ein Gespräch muss möglich sein (Anstrengung 3 bis 4 von 10).', tip);
}
const rzRun = F => D('rec', 'Lockerer Lauf', F >= 30 ? 30 : F >= 20 ? 20 : 15, 50, 60, '', 'Locker laufen oder zügig gehen, ein Gespräch muss möglich sein. Laufen ist für Radfahrer ungewohnt: beim ersten Mal höchstens 20 Min., gern im Wechsel 2 Min. laufen und 1 Min. gehen.', 'Laufen belastet Muskeln und Sehnen anders als Radfahren. Langsam einsteigen schützt vor Muskelkater und Reizungen.');
const rzHill = () => D('sst', 'Lauf mit Bergauf-Reizen: 4×2 Min.', 30, 84, 92, '', 'Einlaufen 10 Min. locker. Dann 4×2 Min. zügig bergauf gehen oder laufen (Anstrengung 8 von 10), bergab locker gehen. Am Ende 5 Min. locker auslaufen. Auch eine lange Treppe eignet sich.', 'Auf einer längeren Reise halten ein bis zwei kurze, harte Reize pro Woche die Form. Bergauf ist die Belastung für die Beine schonender als schnelles Laufen im Flachen.');
const RZ_SEQ_N = {kraft:'Unterwegs: Kraft ohne Geräte', stabi:'Unterwegs: Stabilität ohne Geräte', mob:'Unterwegs: Mobilität', flug:'Nach dem Flug: Kurzroutine'};
function rzSeqDay(kind, min, st, tip){ return {...REST, n:RZ_SEQ_N[kind], st, tip, rzSeq:[kind, min]}; }
/* Ersatz für einen Reisetag. c: {nInt} zählt harte Reize der Woche */
function rzSub(x, k, t, c){
  const F = rzFree(t), fac = rzFacs(t), own = fac.includes('own_bike'), ergo = fac.includes('gym_bike') ? 'bike' : fac.includes('treadmill') ? 'mill' : null, run = fac.includes('running');
  const tag = (o, sub, opt) => ({...o, rz:{k:k.k, id:t.id, sub, ...(opt ? {opt} : {}), ...(o.rzSeq ? {seq:o.rzSeq} : {}), ...(sub === 'ergo' || sub === 'run' ? {rpe:1} : {})}, ...(x.m > 0 && (o.n !== x.n || o.m !== x.m) ? {orig:x.orig || x} : {})});
  const seqMin = n => [15, 20, 30, 45].filter(v => v <= Math.max(15, n)).pop();
  if (k.k === 'dep' || k.k === 'ret') {
    const long = (+t.travelHours || 0) > 4;
    if (!long && own && x.m > 0) return tag(rzKey(x) || x.m > 60 ? D('rec', 'Locker am Reisetag', Math.min(x.m, 60), 50, 60, '90 U/min', 'Locker rollen, höchstens Zone 1 bis 2. Nichts Hartes am Reisetag.', 'Ein Reisetag zählt selbst als Belastung.') : x, 'easy');
    return tag({...(long ? rzSeqDay('flug', 10, 'Lange Reise: heute keine Einheit. Steh unterwegs jede Stunde kurz auf und trink regelmäßig. Nach der Ankunft lockert die Kurzroutine Hüfte, Rücken und Beine.', 'Ein Reisetag zählt selbst als Belastung.') : rzSeqDay('mob', 15, 'Heute keine Radeinheit. Wenn Zeit bleibt, lockern 15 Min. Mobilität Hüfte und Rücken nach dem Sitzen.', 'Ein Reisetag zählt selbst als Belastung.')), n:'Reisetag'}, 'travel');
  }
  if (k.k === 'pre') return rzKey(x) ? tag(D('base', 'Grundlage Z2', Math.min(x.m, 60), 56, 70, '90 U/min', 'Locker in Zone 2. Am Tag vor einer langen Reise nichts Hartes mehr.', 'Ausgeruht reisen: Du kommst besser an und erholst dich schneller.'), 'easy') : x;
  if (k.k === 'post') return (k.soft ? rzHardT(x) : rzKey(x)) ? tag(D('base', 'Grundlage Z2', Math.min(x.m, 60), 56, 70, '90 U/min', 'Locker in Zone 2. Nach der Rückkehr erst wieder reinkommen, harte Einheiten folgen danach.' + (k.jet ? ' Fahr möglichst bei Tageslicht, das hilft der inneren Uhr.' : ''), 'Wiedereinstieg nach der Reise.'), 'easy') : x.m > 0 ? tag(x, 'keep') : x;
  /* Aufenthalt */
  if (!(x.m > 0)) return tag(x, 'rest');
  /* Tageswahl: Die Person kann an jedem Tag des Aufenthalts selbst wählen, was im Rahmen der angegebenen Möglichkeiten geht */
  const pk = t.days && t.days[k.ds], pick = pk && rzOpts(t).includes(pk) ? pk : null, want = pick || (own ? 'own' : ergo || null);
  const seq = kind => kind === 'kraft' ? rzSeqDay('kraft', seqMin(F), 'Statt der Radeinheit: Kraft für Beine und Rumpf ohne Geräte, leise und auf kleiner Fläche.', 'Kraft in den Beinen bleibt auch ohne Rad erhalten, wenn du sie regelmäßig forderst.')
    : kind === 'stabi' ? rzSeqDay('stabi', seqMin(F), 'Statt der Radeinheit: Rumpf und Hüfte stabilisieren, ohne Geräte und leise.', 'Ein stabiler Rumpf hilft dir auf langen Fahrten.')
    : rzSeqDay('mob', seqMin(Math.min(F, 20)), x.t === 'rec' ? 'Statt der lockeren Fahrt: Mobilität gegen das lange Sitzen.' : 'Statt der Radeinheit: Mobilität gegen das lange Sitzen.', 'Bewegung hilft bei der Erholung von der Reise.');
  if (want === 'own') return rzHardT(x) && k.jet ? tag(D('base', 'Grundlage Z2', Math.min(x.m, 90), 56, 70, '90 U/min', 'Locker in Zone 2, möglichst bei Tageslicht. In den ersten Tagen nach einem Zeitzonenwechsel keine harten Intervalle.', 'Die innere Uhr braucht ein paar Tage.'), 'easy', 'own') : tag(x, 'keep', 'own');
  if (want === 'bike' || want === 'mill') { const hard = rzHardT(x) && !k.jet && F >= 30 && c.nInt < 2; if (hard) c.nInt++; return tag(rzErgo(x, F, want === 'mill', hard), 'ergo', want); }
  if (want === 'rest') return tag({...REST, st:'Heute Pause, von dir gewählt. Wenn du magst, geh spazieren und beweg dich locker.', tip:'Ein Ruhetag auf der Reise kostet keine Form.'}, 'rest', 'rest');
  if (want === 'run' || (!pick && run)) {
    if (rzHardT(x) && rzLen(t) > 7 && !k.jet && F >= 30 && c.nInt < 1) { c.nInt++; return tag(rzHill(), 'run', 'run'); }
    if (pick || x.t === 'base' || x.t === 'long') return tag(rzRun(F), 'run', 'run');
  }
  if (pick) return tag(seq(pick), 'seq', pick);
  const kind = rzHardT(x) ? 'kraft' : x.t === 'base' || x.t === 'long' ? 'stabi' : 'mob';
  return tag(seq(kind), 'seq', kind);
}
/* Laufband und Lauf sind keine Radeinheit: keine Wattwerte, keine Trittfrequenz, keine Workout-Dateien fürs Rad */
const rzNoBike = x => !!(x && x.rz && (x.rz.sub === 'run' || x.rz.opt === 'mill'));
/* Was an einem Tag des Aufenthalts zur Wahl steht: Geräte nur, wenn sie für die Reise angegeben sind; Übungen und Pause gehen immer */
function rzOpts(t){ const f = rzFacs(t); return [f.includes('own_bike') && 'own', f.includes('gym_bike') && 'bike', f.includes('treadmill') && 'mill', f.includes('running') && 'run', 'kraft', 'stabi', 'mob', 'rest'].filter(Boolean); }
/* Tageswahl setzen ('' = wieder der Vorschlag der App). Nur für angenommene Reisen, nur ab heute. */
function rzDayPick(id, ds, key){
  const t = rzGet(id); if (!t || !rzOn() || t.status !== 'applied' || !rzISO(ds) || ds < iso(0) || ds <= rzDep(t) || ds >= rzRet(t)) return;
  if (key && !rzOpts(t).includes(key)) return;
  const d = {...(t.days || {})}; if (key) d[ds] = key; else delete d[ds];
  if (Object.keys(d).length) t.days = d; else delete t.days;
  rzReweek(); save(); render();
}
function rzApply1(P, p, w, t){
  const K = rzKinds(t, p, w); if (!K.some(Boolean)) return P;
  const R = P.slice(), fac = rzFacs(t), own = fac.includes('own_bike'), ergo = fac.includes('gym_bike') || fac.includes('treadmill');
  /* in der laufenden Woche bleibt alles vor heute unberührt */
  const cur = p === S.p && w === S.wk && S.plan ? todayIdx() : 0;
  const lost = (x, k) => k.k === 'stay' ? (k.jet ? (own ? rzHardT(x) : true) : x.t === 'long' ? !own : !own && !ergo) : k.k === 'post' && k.soft ? rzHardT(x) : true;
  /* 1. Schlüsseleinheiten (harte Einheit, Long Ride) vor oder nach die Reise legen statt streichen */
  for (let j = cur; j < 7; j++) {
    const k = K[j], x = R[j]; if (!k || rzFix(x) || !rzKey(x) || !lost(x, k) || (x.rz && x.rz.k === 'mv')) continue;
    const ok = c => c >= cur && !K[c] && !rzFix(R[c]) && !rzKey(R[c]) && !(R[c] && (R[c].moved || R[c].varOf || R[c].blocked || R[c].rz)) && ((R[c] && R[c].m > 0) || !p.avail || p.avail[c]) && x.m <= capOf(p, c)
      && !(c > 0 && c - 1 !== j && rzHeavy(R[c - 1])) && !(c < 6 && c + 1 !== j && rzHeavy(R[c + 1]));
    const C = [0, 1, 2, 3, 4, 5, 6].filter(ok).sort((a, b) => Math.abs(a - j) - Math.abs(b - j) || a - b); if (!C.length) continue;
    const c = C[0], y = R[c];
    R[c] = {...x, rz:{k:'mv', id:t.id, from:j}, tip:(x.tip || '') + ` Wegen deiner Reise vom ${DAYS[j]} hierher verlegt.`}; R[j] = y;
  }
  /* 2. Reisetage ersetzen */
  const c = {nInt:0};
  for (let j = cur; j < 7; j++) { const k = K[j], x = R[j]; if (!k || rzFix(x) || (x.rz && x.rz.k === 'mv') || x.moved || x.varOf || x.blocked) continue; R[j] = rzSub(x, k, t, c); }
  return R;
}
function rzApply(P, p, w){
  try { const T = rzPlanTrips(); if (!T.length || !p || !p.start || !Array.isArray(P)) return P; let R = P; T.forEach(t => { R = rzApply1(R, p, w, t); }); return R; } catch (e) { elog(e); return P; }
}
/* Reise, in der ein Kalendertag liegt (für Band, Tipps, Ortszeit) */
function rzAt(ds){ return rzTrips().find(t => ds >= rzDep(t) && ds <= rzRet(t)) || null; }
function rzWeekOf(p, ds){ return Math.floor(ddiff(p.start, ds) / 7) + 1; }
function rzTot(p){ try { return phases(p).slice(-1)[0].to; } catch (e) { elog(e); return 0; } }
/* ---- Vorschlag: betroffene Tage vorher und nachher ---- */
function rzRows(t){
  const p = S.p; if (!p || !p.start || !rzOk(t)) return [];
  const tot = rzTot(p), w0 = Math.max(1, rzWeekOf(p, addD(rzDep(t), -1))), w1 = Math.min(tot, rzWeekOf(p, addD(rzRet(t), 6))), out = [], today = iso(0);
  for (let w = w0; w <= w1; w++) {
    const A = rzWith(t.id, false, () => genWeek(p, w)), B = rzWith(t.id, true, () => genWeek(p, w));
    for (let j = 0; j < 7; j++) { const ds = addD(p.start, (w - 1) * 7 + j); if (ds < today) continue; const a = w === S.wk && S.plan && t.status !== 'applied' ? S.plan[j] : A[j], b = B[j];
      if (paSig(a) !== paSig(b)) out.push({w, j, ds, a, b}); }
  }
  return out;
}
function rzWhy(t){
  const d = rzDiffH(t), n = rzAdapt(d), fac = rzFacs(t), L = [];
  L.push(fac.includes('own_bike') ? 'Du hast dein Rad dabei: Die Einheiten bleiben, nur die Reisetage werden leicht.' : fac.includes('gym_bike') || fac.includes('treadmill') ? 'Vor Ort gibt es ein Ergometer oder Laufband: Kurze Einheiten erhalten den Kernreiz, gesteuert nach Gefühl und Puls.' : fac.includes('running') ? 'Ohne Rad: lockere Läufe und Übungen ohne Geräte ersetzen die Radeinheiten.' : 'Ohne Rad: Übungen ohne Geräte ersetzen die Radeinheiten.');
  L.push('Harte Einheiten und der Long Ride rücken wenn möglich vor oder hinter die Reise. Reisetage zählen als Belastung.');
  if (n) L.push(`${Math.abs(d)} Std. Zeitverschiebung nach ${d > 0 ? 'Osten' : 'Westen'}: In den ersten Tagen nach der Ankunft sind keine harten Intervalle geplant.`);
  L.push(rzLen(t) >= 7 || Math.abs(d) >= 3 ? 'Nach der Rückkehr sind zwei Tage locker, dann läuft der Plan normal weiter.' : 'Der Tag nach der Rückkehr ist locker, dann läuft der Plan normal weiter.');
  return L;
}
function rzReweek(){ try { if (S.p && S.plan && hasStarted(S.p)) reweekFrom(todayIdx()); } catch (e) { elog(e); } try { if (S.p && S.plan) analyze(); } catch (e) { elog(e); } }
function rzGet(id){ return ((S.rz && S.rz.trips) || []).find(t => t.id === id) || null; }
function rzAccept(id){
  const t = rzGet(id); if (!t || !rzOn()) return; bkPre('Vor der Anpassung an deine Reise');
  t.status = 'applied'; delete t.declined; rzReweek();
  S.log.unshift({user:1, title:'Reise: Plan angepasst', day:-2, text:`${esc(rzCityOf(t))}, ${fmt(t.from)} bis ${fmt(t.to)}.`}); if (S.log.length > 20) S.log.length = 20;
  rzOpen = null; save(); render();
}
function rzDecline(id){ const t = rzGet(id); if (!t) return; t.declined = 1; t.status = 'planned'; rzOpen = null; save(); render(); }
/* angenommene Anpassung zurücknehmen: Die Wochen entstehen wieder ohne die Reise */
function rzRevert(id){ const t = rzGet(id); if (!t || t.status !== 'applied') return; bkPre('Vor dem Zurücknehmen der Reise-Anpassung'); t.status = 'planned'; t.declined = 1; rzReweek(); save(); render(); }
/* ---- Reise eintragen ---- */
var rzF = null, rzMsg = '', rzOpen = null, rzOffAsk = false, rzDelAsk = null, rzWiz = false;
function rzNew(from){ rzF = {id:'', from:from || '', to:from || '', departDay:'', returnDay:'', dest:'', tzDest:'', utc:'', mode:'flight', travelHours:'', facilities:['room'], freeMinPerDay:30, note:'', sep:false}; rzMsg = ''; render(); setTimeout(() => { try { const el = document.getElementById('fx-rzform'); if (el) el.scrollIntoView({block:'start'}); } catch (e) { elog(e); } }, 0); }
function rzEdit(id){ const t = rzGet(id); if (!t) return; rzF = {...t, facilities:rzFacs(t), utc:/^Etc\/GMT/.test(t.tzDest || '') ? t.tzDest : '', dest:t.dest || '', sep:rzDep(t) !== t.from || rzRet(t) !== t.to, departDay:rzDep(t), returnDay:rzRet(t)}; rzMsg = ''; render(); }
function rzFSet(k, v){ if (!rzF) return; rzF[k] = v;
  if (k === 'from') { if (!rzF.to || rzF.to < v) { rzF.to = v; try { const el = document.getElementById('rzTo'); if (el) { el.min = v; el.value = v; } } catch (e) { elog(e); } } }
  if (k === 'dest') { const c = RZ_CITY.find(x => x[0] === v); rzF.tzDest = c ? c[2] : ''; rzF.utc = ''; render(); }
  if (k === 'utc') { rzF.tzDest = v; rzF.dest = ''; render(); } }
function rzFChip(k, v){ if (!rzF) return; if (k === 'fac') { const a = new Set(rzF.facilities || []); if (v === 'none') { a.clear(); a.add('none'); } else { a.delete('none'); a.has(v) ? a.delete(v) : a.add(v); } rzF.facilities = a.size ? [...a] : ['none']; } else rzF[k] = v; render(); }
function rzSaveF(){
  const f = rzF; if (!f) return; const z = rzS();
  if (!rzISO(f.from) || !rzISO(f.to) || f.to < f.from) { rzMsg = wkL('Bitte Beginn und Ende der Reise wählen.', 'Please choose the start and end of the trip.'); return render(); }
  if (f.to < iso(0)) { rzMsg = wkL('Die Reise liegt in der Vergangenheit.', 'The trip is in the past.'); return render(); }
  if (ddiff(f.from, f.to) > 60) { rzMsg = wkL('Höchstens 60 Tage am Stück.', 'At most 60 days in a row.'); return render(); }
  const dep = f.sep && rzISO(f.departDay) && f.departDay <= f.from ? f.departDay : f.from, ret = f.sep && rzISO(f.returnDay) && f.returnDay >= f.to ? f.returnDay : f.to, h = Math.max(0, Math.min(48, Math.round((parseFloat(String(f.travelHours).replace(',', '.')) || 0) * 2) / 2));
  const old = f.id ? rzGet(f.id) : null, was = old && old.status === 'applied', live = !!(S.p && S.plan && !rzWiz);
  const t = {id:f.id || uid(), from:f.from, to:f.to, departDay:dep, returnDay:ret, tzHome:rzHomeTz(), tzDest:rzTzOk(f.tzDest) ? f.tzDest : '', dest:String(f.dest || '').slice(0, 40), mode:RZ_MODE.some(m => m[0] === f.mode) ? f.mode : 'flight', travelHours:h, facilities:rzFacs(f), freeMinPerDay:rzFree(f), note:String(f.note || '').slice(0, 200), status:live ? 'planned' : 'applied'};
  if (was) bkPre('Vor dem Ändern der Reise');
  z.trips = [...z.trips.filter(x => x.id !== t.id), t].sort((a, b) => String(a.from).localeCompare(String(b.from)));
  if (was) rzReweek();
  rzF = null; rzMsg = ''; rzOpen = live ? t.id : null; save(); render();
}
function rzDel(id, sure){
  const t = rzGet(id); if (!t) return; if (t.status === 'applied' && !sure) { rzDelAsk = id; return render(); }
  if (t.status === 'applied') bkPre('Vor dem Löschen der Reise');
  S.rz.trips = S.rz.trips.filter(x => x.id !== id); rzDelAsk = null; if (rzOpen === id) rzOpen = null; if (t.status === 'applied') rzReweek(); save(); render();
}
/* ---- Ein- und Ausschalten ---- */
function rzSetMode(m){
  const z = rzS();
  if (m === 'on') { if (z.mode === 'on') return; z.mode = 'on'; if (!rzTzOk(z.tzHome)) z.tzHome = rzDevTz(); const back = z.trips.some(t => t.status === 'hidden' && !t.keep && t.st0 === 'applied');
    z.trips.forEach(t => { if (t.status === 'hidden') { t.status = t.keep ? 'applied' : t.st0 === 'applied' ? 'planned' : (t.st0 || 'planned'); delete t.keep; delete t.st0; } }); rzOffAsk = false; if (back) rzReweek(); save(); return render(); }
  if (z.mode !== 'on') { z.mode = 'off'; rzOffAsk = false; save(); return render(); }
  if (z.trips.some(t => t.status === 'applied' && rzRet(t) >= iso(0)) && !rzOffAsk) { rzOffAsk = true; return render(); }
  rzOffDo(true);
}
/* keep: angenommene Anpassungen bleiben im Plan (true) oder werden mit Schnappschuss zurückgenommen (false) */
function rzOffDo(keep){
  const z = rzS(), today = iso(0), any = z.trips.some(t => t.status === 'applied' && rzRet(t) >= today);
  if (!keep && any) bkPre('Vor dem Zurücknehmen der Reise-Anpassungen');
  z.trips.forEach(t => { if (t.status === 'hidden') return; const ap = t.status === 'applied', fut = rzRet(t) >= today; t.st0 = ap && !keep && fut ? 'planned' : t.status; t.keep = ap && (keep || !fut) ? 1 : 0; t.status = 'hidden'; });
  z.mode = 'off'; rzOffAsk = false; rzF = null; rzOpen = null; if (!keep && any) rzReweek(); save(); render();
}
function rzTzSet(v){ if (rzTzOk(v)) { rzS().tzHome = v; save(); render(); } }
/* ---- Event in anderer Zeitzone (Bezug F17): Angaben je Event in S.rz.ev ---- */
function rzEv(id){ return (S.rz && S.rz.ev && S.rz.ev[id]) || {}; }
function rzEvSet(id, k, v){ const z = rzS(); z.ev = z.ev || {}; const e = {...(z.ev[id] || {})}; if (k === 'tz') { if (v && rzTzOk(v)) e.tz = v; else delete e.tz; } if (k === 'start') { if (/^\d{1,2}:\d{2}$/.test(v)) e.start = v; else delete e.start; } z.ev[id] = e; save(); render(); }
/* Startzeit am Eventort in Körperzeit (Heimatzeit) */
function rzBodyTime(start, d){ const m = /^(\d{1,2}):(\d{2})$/.exec(start || ''); if (!m) return ''; const t = ((+m[1] * 60 + +m[2] - Math.round(d * 60)) % 1440 + 1440) % 1440; return rzP2(Math.floor(t / 60)) + ':' + rzP2(t % 60); }
/* Reisen kurz vor einem Event: A-Event 21 Tage, B-Event 14 Tage. Liefert Form am Renntag mit und ohne Reise. */
function rzEvWarn(t){
  const p = S.p, out = []; if (!p || p.goal !== 'event' || !rzOk(t)) return out;
  let L = []; try { L = efList(p); } catch (e) { elog(e); }
  const hit = L.filter(q => { const lim = q.prio === 'A' ? 21 : q.prio === 'B' ? 14 : 0; return lim && q.date >= iso(0) && rzDep(t) <= q.date && rzRet(t) >= addD(q.date, -lim); });
  if (!hit.length) return out;
  let F0 = [], F1 = []; try { F0 = rzWith(t.id, false, () => seasonForecast(p)); F1 = rzWith(t.id, true, () => seasonForecast(p)); } catch (e) { elog(e); }
  hit.forEach(q => { const a = (F0.find(o => o.id === q.id) || {}).form, b = (F1.find(o => o.id === q.id) || {}).form; out.push({id:q.id, name:q.name, prio:q.prio, date:q.date, at:q.date <= rzRet(t), days:ddiff(rzRet(t), q.date), a, b}); });
  return out;
}
