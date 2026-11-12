/* ---------- Begriffe erklären: Hover am Rechner, Tippen am Handy ---------- */
const GL = {
de:[[/\bFTP\b/, 'FTP (Functional Threshold Power)', 'Die Leistung in Watt, die du etwa eine Stunde lang halten kannst. Alle Trainingsbereiche und Wattvorgaben richten sich danach.'],
 [/\bTSS\b/, 'TSS (Training Stress Score)', 'Maß für die Belastung einer Einheit aus Dauer und Intensität. Eine Stunde genau an deinem FTP ergibt 100 TSS, eine lockere Stunde etwa 40 bis 50.'],
 [/\bSweet Spot\b/, 'Sweet Spot', 'Intensität knapp unter der Schwelle, etwa 88 bis 94 % FTP. Bringt viel Trainingsreiz bei vertretbarer Ermüdung.'],
 [/\bVO2max\b/, 'VO2max', 'Maximale Sauerstoffaufnahme. VO2max-Intervalle (etwa 106 bis 120 % FTP, 3 bis 8 Minuten) heben deine Leistungsobergrenze an.'],
 [/\bSchwelle\b/, 'Schwelle', 'Der Bereich um deinen FTP, etwa 95 bis 105 %. Darüber steigt die Ermüdung schnell an.'],
 [/\bZ[1-5]\b|\bZone [1-5]\b/, 'Trainingszonen', 'Z1 sehr locker (unter 55 % FTP), Z2 Grundlage (56 bis 75 %), Z3 Tempo (76 bis 90 %), Z4 Schwelle (91 bis 105 %), Z5 VO2max (über 105 %).'],
 [/\bGrundlage(?:nausdauer)?\b/, 'Grundlage', 'Lockeres Ausdauertraining in Zone 2, bei dem du dich noch unterhalten kannst. Die Basis für alles andere.'],
 [/\bNP\b|\bNormalized Power\b/, 'NP (Normalized Power)', 'Gewichtete Durchschnittsleistung, die harte Phasen stärker zählt. Bildet die echte Belastung besser ab als der einfache Durchschnitt.'],
 [/\bCTL\b/, 'CTL (Fitness)', 'Durchschnittliche Tagesbelastung der letzten etwa 6 Wochen. Steigt, wenn du regelmäßig trainierst.'],
 [/\bATL\b/, 'ATL (Ermüdung)', 'Durchschnittliche Tagesbelastung der letzten etwa 7 Tage. Ist sie deutlich höher als die CTL, bist du müde.'],
 [/\bW\/kg\b/, 'W/kg', 'Leistung pro Kilogramm Körpergewicht. Am Berg entscheidend.'],
 [/\bTapering\b/, 'Tapering', 'Entlastung vor dem Event: weniger Umfang, kurze intensive Reize bleiben. So kommst du frisch an den Start.'],
 [/\bRekom(?:-Fahrt)?\b/, 'Rekom', 'Regenerationsfahrt, sehr locker im kleinen Gang. Fördert die Erholung.'],
 [/\bU\/min\b/, 'U/min (Trittfrequenz)', 'Kurbelumdrehungen pro Minute, auch Kadenz genannt.'],
 [/\bEventsimulation\b/, 'Eventsimulation', 'Long Ride mit Profil, Tempo und Verpflegung wie am Eventtag. Die Generalprobe für Körper und Material.'],
 [/\bPacing\b/, 'Pacing', 'Die Einteilung deiner Kräfte über die Strecke: gleichmäßig fahren und am Anfang nicht überziehen.'],
 [/\bWindschatten\b/, 'Windschatten', 'Hinter anderen Fahrern sparst du je nach Position 30 bis über 50 % Kraft, weil der Luftwiderstand sinkt.'],
 [/\bDarmtraining\b/, 'Darmtraining', 'Den Magen-Darm-Trakt im Training schrittweise an größere Kohlenhydratmengen gewöhnen, damit du sie im Rennen verträgst.'],
 [/\bRampentest\b/, 'Rampentest', 'Test, bei dem die Leistung jede Minute steigt, bis du nicht mehr kannst. FTP ≈ 75 % der besten Minute.'],
 [/\bLutealphase\b/, 'Lutealphase', 'Zweite Zyklushälfte nach dem Eisprung. Körpertemperatur und Energiebedarf sind leicht erhöht.'],
 [/\bFollikelphase\b/, 'Follikelphase', 'Erste Zyklushälfte von der Periode bis zum Eisprung. Viele fühlen sich jetzt frisch.'],
 [/\bREDs\b/, 'REDs', 'Relativer Energiemangel im Sport: zu wenig Energie für Training und Alltag. Schadet Gesundheit und Leistung.'],
 [/\bErholungswoche\b|\bEntlastungswoche\b/, 'Erholungswoche', 'Jede vierte Woche mit etwa einem Drittel weniger Umfang. In der Erholung passt sich dein Körper an das Training an.'],
 [/\bHFmax\b/, 'HFmax', 'Deine maximale Herzfrequenz.'],
 [/\b[Ll]ange[nr]? Ride\b|\bLong Ride\b/, 'Long Ride', 'Die längste Einheit der Woche, meist am Wochenende. Baut Ausdauer und Ermüdungsresistenz auf.'],
 [/\bFitness-Check\b/, 'Fitness-Check', '20-Minuten-Test, mit dem die App prüft, ob du auf Kurs bist.'],
 [/\b[BC]-Rennen\b/, 'B- und C-Rennen', 'B-Rennen: wichtiges Zwischenevent mit Mini-Tapering davor. C-Rennen: Rennen als hartes Training, nur der Tag davor ist locker.'],
 [/\bKohlenhydrat-Laden\b|\bKohlenhydrate laden\b/, 'Kohlenhydrat-Laden', 'In den 1 bis 2 Tagen vor einem langen Event 10 bis 12 g Kohlenhydrate pro kg essen, damit die Speicher voll sind.']],
en:[[/\bFTP\b/, 'FTP (Functional Threshold Power)', 'The power in watts you can hold for about one hour. All training zones and power targets are based on it.'],
 [/\bTSS\b/, 'TSS (Training Stress Score)', 'Measures the load of a session from duration and intensity. One hour exactly at your FTP equals 100 TSS, an easy hour about 40 to 50.'],
 [/\bSweet Spot\b/i, 'Sweet Spot', 'Intensity just below threshold, about 88 to 94% of FTP. Lots of training stimulus with manageable fatigue.'],
 [/\bVO2max\b/, 'VO2max', 'Maximum oxygen uptake. VO2max intervals (about 106 to 120% of FTP, 3 to 8 minutes) raise your performance ceiling.'],
 [/\b[Tt]hreshold\b/, 'Threshold', 'The range around your FTP, about 95 to 105%. Above it, fatigue builds quickly.'],
 [/\bZ[1-5]\b|\bZone [1-5]\b/, 'Training zones', 'Z1 very easy (below 55% FTP), Z2 endurance (56 to 75%), Z3 tempo (76 to 90%), Z4 threshold (91 to 105%), Z5 VO2max (above 105%).'],
 [/\b[Ee]ndurance\b/, 'Endurance', 'Easy aerobic riding in zone 2 where you can still hold a conversation. The foundation for everything else.'],
 [/\bNP\b|\bNormalized Power\b/, 'NP (Normalized Power)', 'Weighted average power that counts hard efforts more. Reflects the real load better than the plain average.'],
 [/\bCTL\b/, 'CTL (fitness)', 'Average daily training load over roughly the last 6 weeks. Rises when you train consistently.'],
 [/\bATL\b/, 'ATL (fatigue)', 'Average daily training load over roughly the last 7 days. If it is clearly above CTL, you are tired.'],
 [/\bW\/kg\b/, 'W/kg', 'Power per kilogram of body weight. Decisive on climbs.'],
 [/\b[Tt]aper(?:ing)?\b/, 'Taper', 'Easing off before the event: less volume, short intense efforts stay. You arrive fresh at the start.'],
 [/\b[Rr]ecovery ride\b/, 'Recovery ride', 'Very easy spin in a light gear. Supports recovery.'],
 [/\brpm\b/, 'rpm (cadence)', 'Crank revolutions per minute.'],
 [/\b[Ee]vent simulation\b/, 'Event simulation', 'Long ride with profile, pace and fueling like on event day. A dress rehearsal for body and kit.'],
 [/\b[Pp]acing\b/, 'Pacing', 'How you spread your effort over the course: ride evenly and do not overdo the start.'],
 [/\b[Dd]rafting\b|\b[Dd]raft\b/, 'Drafting', 'Riding behind others saves 30 to over 50% of your effort depending on position, because air resistance drops.'],
 [/\b[Gg]ut training\b/, 'Gut training', 'Gradually getting your gut used to larger carbohydrate amounts in training so you tolerate them in the race.'],
 [/\b[Rr]amp test\b/, 'Ramp test', 'A test where power increases every minute until you cannot go on. FTP ≈ 75% of your best minute.'],
 [/\b[Ll]uteal phase\b/, 'Luteal phase', 'Second half of the cycle after ovulation. Body temperature and energy needs are slightly higher.'],
 [/\b[Ff]ollicular phase\b/, 'Follicular phase', 'First half of the cycle from the period to ovulation. Many feel fresh now.'],
 [/\bRED-?S\b/, 'RED-S', 'Relative energy deficiency in sport: too little energy for training and daily life. Harms health and performance.'],
 [/\b[Rr]ecovery week\b/, 'Recovery week', 'Every fourth week with about a third less volume. Your body adapts to training during recovery.'],
 [/\bmax HR\b|\bHRmax\b/, 'Max HR', 'Your maximum heart rate.'],
 [/\b[Ll]ong ride\b/, 'Long ride', 'The longest session of the week, usually at the weekend. Builds endurance and fatigue resistance.'],
 [/\b[Ff]itness check\b/, 'Fitness check', '20-minute test the app uses to check whether you are on track.'],
 [/\b[BC] race\b/, 'B and C races', 'B race: important interim event with a mini taper before it. C race: a race used as hard training, only the day before is easy.'],
 [/\b[Cc]arb loading\b/, 'Carb loading', 'Eating 10 to 12 g of carbohydrates per kg in the 1 to 2 days before a long event so your stores are full.']]};
function glDom(root){
  if (!root || S.gloss === false) return; const L = GL[lang()], seen = new Set();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n => { const p = n.parentElement; return !p || p.closest('button,a,select,option,label,input,textarea,svg,script,style,.gl,[data-noi18n],.gltip') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }});
  const ns = []; while (w.nextNode()) ns.push(w.currentNode);
  ns.forEach(n => {
    let best = null; L.forEach((g, i) => { if (seen.has(i)) return; const m = g[0].exec(n.nodeValue); if (m && (!best || m.index < best.m.index)) best = {m, i}; });
    if (!best) return; seen.add(best.i);
    const a = n.splitText(best.m.index); a.splitText(best.m[0].length);
    const sp = document.createElement('span'); sp.className = 'gl'; sp.tabIndex = 0; sp.dataset.g = best.i; sp.setAttribute('role', 'button'); sp.textContent = a.nodeValue; a.replaceWith(sp);
  });
}
let glTip = null;
function glShow(el){
  const g = GL[lang()][+el.dataset.g]; if (!g) return;
  if (!glTip) { glTip = document.createElement('div'); glTip.className = 'gltip'; glTip.setAttribute('role', 'tooltip'); document.body.appendChild(glTip); }
  glTip.innerHTML = `<b>${g[1]}</b><br>${g[2]}`; glTip.style.display = 'block';
  const r = el.getBoundingClientRect(), W = Math.min(300, window.innerWidth - 24); glTip.style.width = W + 'px';
  const x = Math.max(12, Math.min(r.left + r.width / 2 - W / 2, window.innerWidth - W - 12)), h = glTip.offsetHeight; let y = r.bottom + 8; if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 8);
  const sx = scEl() ? 0 : window.scrollX, sy = scEl() ? 0 : window.scrollY; glTip.style.left = (x + sx) + 'px'; glTip.style.top = (y + sy) + 'px';
}
const glHide = () => { if (glTip) glTip.style.display = 'none'; };
document.addEventListener('mouseover', e => { const g = e.target.closest && e.target.closest('.gl'); if (g) glShow(g); });
document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('.gl')) glHide(); });
document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.gl'); if (g) { e.stopPropagation(); glShow(g); } else glHide(); }, true);
document.addEventListener('keydown', e => { const g = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('gl') ? document.activeElement : null; if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); glShow(g); } if (e.key === 'Escape') glHide(); });
document.addEventListener('scroll', glHide, {passive:true, capture:true}); /* auch beim Scrollen in #sc (B8) */
function postRender(root){ i18nDom(root); glDom(root); }

