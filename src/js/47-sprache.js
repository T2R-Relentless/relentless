/* ---------- Sprache: Deutsch ist die Quelle. Englisch entsteht nach jedem Seitenaufbau satzweise aus dem Wörterbuch I18N.
   Zahlen, Daten, Wochentage und Namen in „…“ sind Platzhalter {0}, {1} … und werden passend umformatiert. ---------- */
const lang = () => (S && S.lang === 'en') ? 'en' : 'de';
function setLang(l){ S.lang = l || (lang() === 'en' ? 'de' : 'en'); save(); render(); }
const langBtn = ml => `<button onclick="setLang()" class="ghost ${esc(ml ? 'ml-auto ' : '')}!px-2.5 !py-1.5 text-sm" data-noi18n aria-label="${esc(lang() === 'en' ? 'Auf Deutsch umschalten' : 'Switch to English')}">${lang() === 'en' ? 'DE' : 'EN'}</button>`;
const I_WD = {Montag:'Monday', Dienstag:'Tuesday', Mittwoch:'Wednesday', Donnerstag:'Thursday', Freitag:'Friday', Samstag:'Saturday', Sonntag:'Sunday', Mo:'Mon', Di:'Tue', Mi:'Wed', Do:'Thu', Fr:'Fri', Sa:'Sat', So:'Sun'};
const I_MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], I_MONEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const I_RE = new RegExp('„([^“]{1,90})“|((?:(?:Mo|Di|Mi|Do|Fr|Sa|So)\\.,\\s)?\\d{1,2}\\.\\s(?:' + I_MON.join('|') + ')(?:\\s\\d{4})?)|(\\d{1,2}\\.\\d{1,2}\\.(?:\\d{4})?)|\\b(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\\b|\\b(Mo|Di|Mi|Do|Fr|Sa|So)\\b(?=\\s?[+\\d→·,)]|\\s*$)|(\\d+(?:[.,:]\\d+)*)', 'g');
function iNorm(s){ const v = []; const k = s.replace(I_RE, (m, q, ld, nd, wd, sd, n) => { v.push(q != null ? ['q', q] : ld ? ['L', ld] : nd ? ['D', nd] : wd ? ['d', wd] : sd ? ['d', sd] : ['n', n]); return '{' + (v.length - 1) + '}'; }); return {k, v}; }
function iVal(x){
  const [t, r] = x;
  if (t === 'n') return /^\d{1,3}(\.\d{3})+$/.test(r) ? r.replace(/\./g, ',') : r.replace(/,/g, '.');
  if (t === 'd') return I_WD[r] || r;
  if (t === 'D') { const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/.exec(r); return m ? `${m[1]}/${m[2]}${m[3] ? '/' + m[3] : ''}` : r; }
  if (t === 'L') { const m = /(?:(Mo|Di|Mi|Do|Fr|Sa|So)\.,\s)?(\d{1,2})\.\s(\S+)(?:\s(\d{4}))?/.exec(r); return m ? `${m[1] ? I_WD[m[1]] + ', ' : ''}${+m[2]} ${I_MONEN[I_MON.indexOf(m[3])] || m[3]}${m[4] ? ' ' + m[4] : ''}` : r; }
  if (t === 't') return trS(r);
  if (t === 'q') return '“' + trS(r) + '”';
  return r;
}
let I18N = {};
/* Englisch: Einzahl, wo das deutsche Wort für Ein- und Mehrzahl gleich ist („1 Riegel“ → „1 bar“, nicht „1 bars“) */
const iSing = s => s.replace(/(^|[^\d.,])1 (bars|bottles|gels)\b/g, (m, a, w) => a + '1 ' + w.slice(0, -1));
/* Englisches Wörterbuch: Quelle ist src/i18n/en.json („deutscher Satz“: „englischer Satz“, Platzhalter {0}, {1} … für
   Zahlen, Daten und Namen). Beim Bauen wird es komprimiert in die Seite gelegt und erst bei Bedarf entpackt. */
let i18nReady = false, i18nLoading = null;
function i18nLoad(){
  if (i18nReady) return Promise.resolve(true);
  if (!i18nLoading) i18nLoading = (async () => { try { const el = document.getElementById('i18n-en'), b = Uint8Array.from(atob(el.textContent.trim()), c => c.charCodeAt(0)); const st = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')); I18N = JSON.parse(await new Response(st).text()); i18nReady = true; } catch (e) { elog(e); i18nReady = false; } document.documentElement.classList.remove('i18nwait'); return i18nReady; })();
  return i18nLoading;
}

/* Fallback: Einheiten- und Phasennamen als Platzhalter, damit Sätze mit wechselnden Namen ein gemeinsamer Eintrag sind */
const I_TERM = '(?:Long Ride(?:, (?:wellig|Ultra-Tempo|gekürzt \\(Mini-Tapering\\))| mit (?:Anstiegen|Rampen|Gruppentempo))?|Grundlage Z\\d|Sweet Spot \\d+×\\d+|Lange Schwelle \\d+×\\d+|Schwelle \\d+×\\d+|Tempo \\d+×\\d+|VO2max(?: Auffrischung)? \\d+[×/]\\d+|Antritte \\d+×\\d+ Sek\\.|Rampen \\d+×\\d+ Min\\.|Wettkampftempo \\d+×\\d+|Rekom-Fahrt(?: \\(Arbeitsweg locker\\))?|Pendeln mit dem Rad|Locker statt hart|Eventsimulation|Fitness-Check: [\\w-]+|Krafttraining(?:: [\\wäöüß ]+)?|Mobilität|Stabilität|Ruhetag|(?:Basis|Aufbau|Spitze|Spitzen|Tapering)(?:-Phase)?|Test und Entlastung|Abschluss)';
const I_RET = new RegExp('(?<![\\wäöüß-])(' + I_TERM + ')(?![\\wäöüß-])|' + I_RE.source, 'g');
function iNormT(s){ const v = []; const k = s.replace(I_RET, (m, t, q, ld, nd, wd, sd, n) => { v.push(t != null ? ['t', t] : q != null ? ['q', q] : ld ? ['L', ld] : nd ? ['D', nd] : wd ? ['d', wd] : sd ? ['d', sd] : ['n', n]); return '{' + (v.length - 1) + '}'; }); return {k, v}; }
/* Listen mit wechselnder Länge (Tage, Wochen, Anstiege): Musterregeln statt fester Einträge */
const I18A = /^(?:Plan bestmöglich|Plan so anpassen|Du fährst meist|So ergibt sich|Lange Anstiege|Gezählt werden|Training: |Radpendeln: |(?:Mo|Di|Mi|Do|Fr|Sa|So) \d)/;
const I18P = [
 [/^Plan bestmöglich verbessern: /, 'Improve the plan as far as possible: '],
 [/^Plan so anpassen, dass das Ziel erreichbar wird: /, 'Adjust the plan so the goal becomes reachable: '],
 [/^Du fährst meist /, 'You mostly ride '],
 [/, die längste Fahrt war (\S+) Std\. am /, '; your longest ride was $1 h on '],
 [/^So ergibt sich: /, 'This gives: '],
 [/\bWoche (\d+):/g, 'week $1:'],
 [/^Lange Anstiege: /, 'Long climbs: '],
 [/\bbei km\b/g, 'at km'], [/km lang, etwa/g, 'km long, about'],
 [/^Gezählt werden die Fahrten der letzten (\S+) Wochen je Wochentag: /, 'The rides of the last $1 weeks are counted per weekday: '],
 [/^Radpendeln: /, 'Bike commuting: '], [/\(Dauer aus der Tageszeit\)/, "(duration from the day's time)"],
 [/\bstatt\b/g, 'instead of'], [/\bzusammen\b/g, 'total'],
 [/ Std\. pro Woche/g, ' h per week'], [/ Std\.\.?(?=[\s,)]|$)/g, ' h'], [/ Min\.(?=[\s,)=]|$)/g, ' min'],
 [/\b(Mo|Di|Mi|Do|Fr|Sa|So)\b(?= ?\()/g, d => I_WD[d]]
];
const I18X = [
 [/^Tage bis (.+)$/, 'Days until $1'],
 [/^Heute: (.+), (\S+) Std\.$/, (m, a, h) => 'Today: ' + trS(a) + ', ' + h + ' h'],
 [/^Heute: (.+), (\S+) Min\.$/, (m, a, n) => 'Today: ' + trS(a) + ', ' + n + ' min'],
 [/^Heute, (.+)$/, (m, a) => 'Today, ' + trS(a)],
 [/^(.+?) \+ (.+)$/, (m, a, b) => trS(a) + ' + ' + trS(b)],
 [/^(.+), (draußen|mit Trittfrequenz|mit Fahrtechnik|neue Runde|mit Einteilung|auf der Rolle|mit hoher Trittfrequenz|Kaffeerunde)$/, (m, a, b) => trS(a) + ', ' + ({'draußen':'outdoors', 'mit Trittfrequenz':'with cadence work', 'mit Fahrtechnik':'with bike handling', 'neue Runde':'new route', 'mit Einteilung':'with pacing', 'auf der Rolle':'on the trainer', 'mit hoher Trittfrequenz':'high cadence', 'Kaffeerunde':'coffee ride'})[b]],
 [/^Aktivierung vor (.+)$/, 'Activation before $1'],
 [/^A-Event: (.+)$/, 'A event: $1'],
 [/^Erholung nach (.+)$/, 'Recovery after $1'],
 [/^Locker nach (.+)$/, 'Easy ride after $1'],
 [/^Zwischenevent \(([ABC])\): (.+)$/, 'Intermediate event ($1): $2'],
 [/^Woche (\d+) von (\d+), (.+?) · ([ABC])-Rennen: (.+)$/, (m, a, b, c, p, d) => 'Week ' + a + ' of ' + b + ', ' + trS(c) + ' · ' + p + ' race: ' + d],
 [/^So kommst du gut versorgt durch (.+): etwa$/, 'This is how you get through $1 well fuelled: about'],
 [/^Dein Eventtag: (.+), etwa (\S+) Std\.$/, 'Your event day: $1, about $2 h'],
 [/^(.+), (\S+) km, (\S+) hm\.$/, '$1, $2 km, $3 m climbing.'],
 [/^(.+), (\S+) km\.$/, '$1, $2 km.'],
 [/^Tipp: (.+)$/, (m, a) => 'Tip: ' + trS(a)],
 [/^Eventtag: (.+)$/, 'Event day: $1'],
 [/^Export nicht möglich \((\w+)\)\.$/, 'Export not possible ($1).'],
 [/^(.+) Auf deine verfügbare Zeit angepasst\.$/, (m, a) => trS(a) + '. Adjusted to your available time.'],
 [/^(.+) · danach (\d+) Min\. locker in Zone (\d) \(statt des Rückwegs\)$/, (m, a, n, z) => trS(a) + ' · then ' + n + ' min easy in zone ' + z + ' (instead of the ride home)'],
 [/^Ließ sich nicht verlegen: (.+)\.$/, (m, a) => 'Could not be moved: ' + a.split(' · ').map(f => f.replace(/^(\S+): (.+)$/, (x, d, n) => (I_WD[d] || d) + ': ' + trS(n))).join(' · ') + '.']
];
function trP(t){ const x = I18X.find(([a]) => a.test(t)); if (x) { const {k, v} = iNorm(t.replace(x[0], x[1])); return k.replace(/\{(\d+)\}/g, (m, i) => v[i] ? iVal(v[i]) : m); }
  if (!I18A.test(t)) return null; let r = t; I18P.forEach(([a, b]) => { r = r.replace(a, b); }); const {k, v} = iNorm(r); return k.replace(/\{(\d+)\}/g, (m, i) => v[i] ? iVal(v[i]) : m); }

function trS(s){
  const t = s.trim(); if (!t || !/[A-Za-zÄÖÜäöüß]|\d\.\d{1,2}\.\d/.test(t)) return s;
  const {k, v} = iNorm(t), e = I18N[k];
  if (e == null) { const p = trP(t); if (p != null) return s.replace(t, p); const T2 = iNormT(t), e2 = T2.k !== k && T2.k !== '{0}' ? I18N[T2.k] : null; if (e2 != null) return s.replace(t, e2.replace(/\{(\d+)\}/g, (m, i) => T2.v[i] ? iVal(T2.v[i]) : m)); const mk = T2.k === '{0}' ? k : T2.k; if (window.__iMiss && !window.__iMiss.has(mk)) window.__iMiss.set(mk, t); return s; }
  return s.replace(t, e.replace(/\{(\d+)\}/g, (m, i) => v[i] ? iVal(v[i]) : m));
}
const I_ABBR = /(?:\b(?:Std|Min|Sek|ca|bzw|Nr|evtl|inkl|ggf|vgl|etc|Mo|Di|Mi|Do|Fr|Sa|So|B|h|z|d|u|a|o|Jan|Feb|Okt|Nov|Dez|Dr|Prof|al)|\d)\.$/;
function trText(s){
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim(); if (!core) return s;
  if (I18N[iNorm(core).k] != null) return lead + iSing(trS(core)) + trail;
  const re = /[.!?]\s+(?=[A-ZÄÖÜ„(\d])/g, out = []; let st = 0, m;
  while ((m = re.exec(core))) { const end = m.index + 1; if (I_ABBR.test(core.slice(Math.max(0, end - 5), end))) continue; out.push(trS(core.slice(st, end)), m[0].slice(1)); st = re.lastIndex; }
  out.push(trS(core.slice(st)));
  return lead + iSing(out.join('')) + trail;
}
const trTxt = s => lang() === 'en' ? trText(s) : s;
function i18nDom(root){
  if (!root) return; document.documentElement.lang = lang(); if (lang() !== 'en') return; if (!i18nReady) { document.documentElement.classList.add('i18nwait'); i18nLoad().then(ok => { if (ok) render(); }); return; }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n => { const p = n.parentElement; return !p || p.closest('[data-noi18n],script,style,textarea') || !/[A-Za-zÄÖÜäöüß]|\d\.\d{1,2}\.\d/.test(n.nodeValue) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }});
  const ns = []; while (w.nextNode()) ns.push(w.currentNode);
  ns.forEach(n => { const t = trText(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; });
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => { if (el.closest('[data-noi18n]')) return; ['placeholder', 'aria-label', 'title'].forEach(a => { const v = el.getAttribute(a); if (v && /[A-Za-zÄÖÜäöüß]/.test(v)) { const t = trText(v); if (t !== v) el.setAttribute(a, t); } }); });
}
