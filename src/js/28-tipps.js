/* ---------- „Wusstest du schon?“: täglich ein Tipp zu einer Funktion der App ----------
   Pro Tag ein neuer Tipp (zuerst die noch nicht gesehenen), passend zum Plan: Tipps zu Funktionen, die schon genutzt werden,
   fallen weg. „Weiter“ zeigt den nächsten, ✕ blendet ihn bis morgen aus. In Einstellungen → Sprache und Hilfen abschaltbar. */
const DYK_KEY = 'relentless.dyk';
const dykGet = () => { try { return JSON.parse(localStorage.getItem(DYK_KEY) || '{}') || {}; } catch (e) { elog(e); return {}; } };
const dykPut = o => { try { localStorage.setItem(DYK_KEY, JSON.stringify({...dykGet(), ...o})); } catch (e) { elog(e); } };
const dykWeb = () => { try { return /^https?:$/.test(location.protocol) && !(window.claude && window.claude.use); } catch (e) { elog(e); return false; } };
const dykAlone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { elog(e); return false; } };
/* [id, Text, Knopf, Aktion, Bedingung] */
const DYK = [
  ['up', 'Lade nach jeder Einheit deine Fahrt hoch (FIT, GPX oder TCX). Die App ordnet sie dem Tag zu, gibt Punkte, lobt, was gut lief, und sagt, was du beim nächsten Mal besser machen kannst.', 'Fahrt hochladen', "goPg('rides')", () => !Object.keys((S.p && S.p.exe) || {}).length],
  /* Neue Funktionen (Versionen 172 bis 188) */
  ['logbook', 'Im Logbuch stehen alle deine Fahrten und Übungseinheiten mit Bewertung an einem Ort. Die Verlaufsgrafik darüber zeigt Kilometer, Zeit und Höhenmeter je Woche und Monat.', 'Logbuch öffnen', "navGo('logbook')", () => true],
  ['commute', 'Fährst du an einem Trainingstag doch mit dem Rad zur Arbeit? Tippe in der Woche bei der Einheit auf „Pendeln“. Sie wird auf Hin- und Rückweg verteilt, die Intervalle liegen auf dem Hinweg.', 'Woche ansehen', "navGo('week')", () => hasStarted(S.p) && isComm(S.p)],
  ['move', 'Passt eine Einheit an einem anderen Tag besser? Tippe in der Woche auf „Verschieben“, auch für „heute statt Sonntag“. Die App achtet darauf, dass harte Einheiten nicht direkt hintereinander liegen.', 'Woche ansehen', "navGo('week')", () => hasStarted(S.p)],
  ['variant', 'Lust auf Abwechslung? Mit „Andere Variante“ tauschst du eine Einheit gegen eine gleichwertige mit demselben Trainingsreiz, auch in kommenden Wochen.', 'Woche ansehen', "navGo('week')", () => true],
  ['seasonchk', 'Der Plan-Check bewertet deine ganze Saison: Jedes Event bekommt eine Ampel, und bei jeder Maßnahme siehst du, wie viele Minuten sie dir bei welchem Rennen bringt.', 'Plan-Check öffnen', "goPg('check')", () => S.p && S.p.goal === 'event' && (S.p.subs || []).length > 0],
  ['evall', 'Nicht nur für dein Hauptevent: Für jedes Rennen der Saison zeigt die App Zielzeit, Form am Renntag und eine Empfehlung zum Pacing.', 'Saison ansehen', "navGo('event')", () => S.p && S.p.goal === 'event' && (S.p.subs || []).length > 0],
  ['vac', 'Urlaub oder Reise ohne Rad? Trag den Zeitraum unter Einstellungen → Alltag und Planstart ein. Die App plant drumherum und danach einen sanften Wiedereinstieg.', 'Urlaub eintragen', "dykSet('settings','ali')", () => hasStarted(S.p)],
  ['tb', 'Im Winter weniger Zeit als im Sommer? Unter Einstellungen → Alltag und Planstart legst du ein Zeitbudget je Jahreszeit fest. Der Plan richtet seinen Umfang danach.', 'Zeitbudget festlegen', "dykSet('settings','ali')", () => true],
  ['age', 'Mit deinem Geburtsdatum stimmt die App die Erholung auf dein Alter ab: Ab 50 schlägt sie jede dritte Woche eine Entlastungswoche und mehr Abstand zwischen harten Einheiten vor. Ob du das übernimmst, entscheidest du.', 'Alter und Erholung', "dykSet('settings','age')", () => !(S.p && ageOf(S.p))],
  ['seq', 'Kraft- und Mobilitätsübungen laufen als Ablauf mit Tönen und Ansagen. Du musst nicht aufs Handy sehen: Die App sagt dir, wann die nächste Übung oder Satzpause beginnt.', 'Ablauf einstellen', "dykSet('settings','sq')", () => true],
  ['mob', 'Unter Mehr → Übungen findest du Mobilitätsroutinen für vor und nach der Fahrt, für Ruhetage und für den Schreibtisch.', 'Übungen ansehen', "goPg('ex')", () => true],
  ['tire', 'Unter Mehr → Werkzeuge berechnet der Reifendruckrechner einen Startwert für vorn und hinten, passend zu Gewicht, Reifenbreite, Felge und Untergrund.', 'Reifendruck berechnen', "navGo('more');goPg('tool-tire')", () => true],
  ['trace', 'In jeder Fahrtbewertung siehst du den Verlauf deiner Fahrt mit dem Zielbereich der Intervalle und darunter, wie viel Zeit du in welcher Zone warst.', 'Fahrten ansehen', "dykRides()", () => true],
  ['garmin', 'Mit einem persönlichen API-Schlüssel von Garmin holt die App deine Fahrten selbst ab und bewertet sie. Kein Exportieren mehr.', 'Einrichten', "dykGarmin()", () => !(S.gm && S.gm.mode) && typeof gmWebOk !== 'undefined' && (gmWebOk === true || !!(window.claude && window.claude.use))],
  ['rpe', 'Nach jeder bewerteten Fahrt fragt die App, wie anstrengend es war und wie du dich fühlst. Dein Empfinden fließt in die Anpassung ein: Fühlt sich eine leichte Einheit hart an, nimmt die App Tempo raus.', '', '', () => true],
  ['feel', 'Schlecht geschlafen oder Beine schwer? Tippe heute bei deiner Einheit auf „Befinden“. Die App passt die Einheit an deinen Zustand an.', 'Befinden öffnen', "heroTab='feel';goPg(null)", () => hasStarted(S.p)],
  ['clo', 'Unter „Kleidung“ bei der heutigen Einheit siehst du, was du bei dem Wetter anziehen solltest, von kurz-kurz bis Winterjacke.', 'Kleidung ansehen', "heroTab='clo';goPg(null)", () => hasStarted(S.p)],
  ['fuel', 'Unter „Essen“ bei der heutigen Einheit steht, was du vorher, währenddessen und danach essen solltest, abgestimmt auf Dauer und Intensität.', 'Essen ansehen', "heroTab='fuel';goPg(null)", () => hasStarted(S.p)],
  ['wx', 'Schalte das Wetter ein: Dann richtet sich der Kleidungstipp nach der Vorhersage an deinem Ort.', 'Wetter einschalten', "dykSet('settings','wx')", () => !S.wx],
  ['hr', 'Trag deine maximale Herzfrequenz oder deinen Schwellenpuls ein. Dann prüft die App bei lockeren Fahrten, ob du wirklich in Zone 2 geblieben bist.', 'Puls eintragen', "dykSet('settings','hr')", () => !(S.p && (S.p.hrMax || S.p.lthr))],
  ['ms', 'Alle paar Wochen steht ein Fitness-Check im Plan. Danach passt die App deine Wattbereiche an, so trainierst du immer im richtigen Bereich.', 'Fitness-Checks', "goPg('ms')", () => true],
  ['form', 'Unter Fortschritt → Formkurve siehst du deine Fitness und Ermüdung. Die App rechnet hoch, wie frisch du am Renntag bist.', 'Formkurve ansehen', "goPg('sform')", () => true],
  ['pb', 'Fährst du eine neue Bestleistung über 1, 5 oder 20 Minuten, zeigt die App sie in der Bewertung an. Alle Bestwerte findest du unter Fortschritt.', 'Bestwerte ansehen', "goPg('spb')", () => true],
  ['day', 'Kein Training möglich an einem Tag? Öffne ihn in der Woche und tippe auf „Tag nicht möglich“. Die App verlegt die Einheit auf einen passenden anderen Tag.', 'Woche ansehen', "goPg('week')", () => true],
  ['shift', 'Urlaub, Krankheit oder Pause? Unter Einstellungen kannst du den Planstart verschieben, dann beginnt der Plan später neu.', 'Planstart verschieben', "dykSet('settings','shift')", () => true],
  ['ex', 'Kraft- und Mobilitätsübungen sind mit Grafik erklärt. Du findest sie bei der Einheit und unter Mehr → Übungen.', 'Übungen ansehen', "goPg('ex')", () => true],
  ['sci', 'Unter Mehr → Wissen erklärt die App kurz Training, Ernährung und Gesundheit, mit Quellen.', 'Wissen öffnen', "goPg('science')", () => true],
  ['exp', 'Exportiere deine Einheiten in den Kalender oder als Workout für Garmin und Zwift. Dann fährst du die Intervalle direkt vom Radcomputer oder auf der Rolle.', 'Export öffnen', "goPg('export')", () => true],
  ['check', 'Der Plan-Check zeigt, ob du dein Ziel mit dem aktuellen Plan erreichst, und schlägt Anpassungen vor, falls nicht.', 'Plan-Check öffnen', "goPg('check')", () => true],
  ['subs', 'Plane deine ganze Saison: Trag alle Rennen ein, beliebig viele. A-Events bekommen einen eigenen Formhöhepunkt, B- und C-Rennen sind Bausteine auf dem Weg zum Hauptevent.', 'Event öffnen', "goPg('event')", () => S.p && S.p.goal === 'event'],
  ['backup', 'Deine Pläne liegen nur auf diesem Gerät. Speichere ab und zu eine Sicherung, dann kannst du sie auf einem neuen Handy wieder laden.', 'Sicherung speichern', "goPg('plans')", () => true],
  ['plans', 'Du kannst mehrere Pläne anlegen, z. B. für zwei Rennen, und zwischen ihnen wechseln. Den aktiven Plan passt du unter Mehr → Meine Pläne an.', 'Meine Pläne', "goPg('plans')", () => true],
  ['gloss', 'Fachbegriffe wie FTP oder TSS sind gepunktet unterstrichen. Tippe darauf, dann erscheint eine kurze Erklärung.', '', '', () => S.gloss !== false],
  ['dark', 'Die App gibt es auch im dunklen Design, angenehm am Abend.', 'Darstellung', "dykSet('settings','theme')", () => S.theme !== 'dark'],
  ['en', 'Die App spricht auch Englisch: Tippe oben auf „EN“.', '', '', () => true],
  ['inst', 'Leg die App auf deinen Home-Bildschirm. Dann startet sie wie eine echte App, ohne Browserleiste und auch offline.', 'So geht’s', "instHide=false;instHelp=true;try{localStorage.removeItem('relentless.inst.hide')}catch(e){elog(e)};render()", () => dykWeb() && !dykAlone() && typeof instOs === 'function' && !!instOs()],
  ['team', 'Neuigkeiten, Ausfahrten und Termine des Teams findest du auf teamrelentlessriders.de, verlinkt unter Mehr → Team.', 'Zur Homepage', "window.open('https://teamrelentlessriders.de','_blank','noopener')", () => true],
];
function dykSet(p, k){ const sub = {wx:'set-wx', hr:'set-hr', age:'set-age', sq:'set-sq', shift:'set-ali', ali:'set-ali', theme:'set-lang', lang:'set-lang'}[k]; if (p === 'settings' && sub) { goPg('settings'); goPg(sub); return; } goPg(p); setTimeout(() => { const el = document.getElementById('fx-' + k); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); }, 80); }
function dykGarmin(){ try { if (typeof gtOpen !== 'undefined') { gtOpen = true; gtStep = 1; render(); return; } } catch (e) { elog(e); } goPg('rides'); }
const dykList = () => DYK.filter(t => { try { return t[4](); } catch (e) { elog(e); return false; } }).concat(typeof cmpDyk === 'function' ? cmpDyk() : []); /* F21: Vergleiche */
function dykPick(force){
  const st = dykGet(), list = dykList(); if (!list.length) return null;
  const today = iso(0); let cur = list.find(t => t[0] === st.cur);
  if (!cur || force || st.day !== today) {
    const seen = st.seen || [], fresh = list.filter(t => !seen.includes(t[0]) && t[0] !== st.cur), pool = fresh.length ? fresh : list.filter(t => t[0] !== st.cur);
    cur = pool[0] || list[0]; dykPut({cur:cur[0], day:today, seen:[...seen.filter(k => k !== cur[0]), cur[0]].slice(-40)});
  }
  if (cur && cur.fact) cmpShown(cur[0]);
  return cur;
}
function dykNext(){ dykPick(true); try { track('tipp-weiter'); } catch (e) { elog(e); } render(); }
function dykClose(){ dykPut({hide:iso(0)}); render(); }
function dykOff(on){ dykPut({off:!on}); render(); }
const dykIsOff = () => !!dykGet().off;
function dykGo(a){ try { track('tipp-genutzt'); } catch (e) { elog(e); } try { (new Function(a))(); } catch (e) { elog(e); } }
function dykCard(){
  try {
    const st = dykGet(); if (st.off || st.hide === iso(0) || !S.p || (S.plan && hasStarted(S.p) && (S.plan[todayIdx()] || {}).feel === 'sick')) return '';
    const t = dykPick(false); if (!t) return '';
    const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/></svg>';
    const act = DYK.indexOf(t);
    return `<section class="panel p-4" style="border-left:4px solid var(--ice)"><div class="flex items-start gap-3"><span style="color:var(--teal);margin-top:2px">${ICON}</span><div class="min-w-0 flex-1">
      <div class="flex items-center gap-2"><p class="eyebrow flex-1">Wusstest du schon?</p><button class="text-sm" style="color:var(--mute);background:none;border:0;padding:0 2px;min-width:44px;min-height:44px" aria-label="Tipp für heute ausblenden" onclick="dykClose()">✕</button></div>
      ${t.fact ? `<p class="mt-1 text-sm" data-noi18n>${esc(lang() === 'en' ? t.en : t[1])}</p>` : `<p class="mt-1 text-sm">${t[1]}</p>`}
      <div class="mt-3 flex flex-wrap items-center gap-2">${t.fact ? `<button class="btn !w-auto !px-3 !py-1.5 text-sm" onclick="cmpGo('${ja(t.go)}')">${t[2]}</button>` : t[2] ? `<button class="btn !w-auto !px-3 !py-1.5 text-sm" onclick="dykGo(DYK[${ja(act)}][3])">${t[2]}</button>` : ''}<button class="ghost !px-3 !py-1.5 text-sm" onclick="dykNext()">Nächster Tipp</button></div></div></div></section>`;
  } catch (e) { elog(e); return ''; }
}

