/* ---------- Wissen: strukturierte Theorie mit persönlichem Verpflegungsrechner ---------- */
function wGo(id){ if (!document.getElementById(id) && id !== 'w-src' && pg === 'science' && wGrpOf(id) !== (wGrp || 'ern')) { wGrp = wGrpOf(id); render(); } const el = document.getElementById(id); if (el) { el.open = true; el.scrollIntoView({behavior:'smooth', block:'start'}); } }
const wsec = (id, title, sub, inner, open) => `<details id="${esc(id)}" class="wsec panel"${open ? ' open' : ''}><summary><span><span class="hd block text-xl font-semibold">${title}</span><span class="text-xs" style="color:var(--mute)">${sub}</span></span><span class="wchev" aria-hidden="true">▾</span></summary><div class="wbody">${inner}</div></details>`;
const wtbl = (head, rows) => `<div class="overflow-x-auto"><table class="wtab"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const wsrc = (t, u) => `<a class="underline" target="_blank" rel="noopener" href="${esc(u)}">${t}</a>`;
const SRC = {acsm:wsrc('ACSM/AND/DC 2016', 'https://acuresearchbank.acu.edu.au/item/880yy/position-of-the-academy-of-nutrition-and-dietetics-dietitians-of-canada-and-the-american-college-of-sports-medicine-nutrition-and-athletic-performance'), jeuk:wsrc('Jeukendrup 2014', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4008807/'), caf:wsrc('ISSN 2021', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7777221/'), ioc:wsrc('IOC-Konsens 2018', 'https://pubmed.ncbi.nlm.nih.gov/29540367/'), reds:wsrc('IOC-Konsens REDs 2023', 'https://pubmed.ncbi.nlm.nih.gov/37752011/')};
function fuelCalc(p){
  const kg = kgOf(p), t = todayIdx(), started = hasStarted(p), x = started && S.plan ? S.plan[t] : null, m = x ? x.m || 0 : 0;
  const band = x && x.feel === 'sick' ? [3, 5, 'krank: nach Appetit, auf keinen Fall Diät'] : m === 0 ? [3, 5, 'Ruhetag oder sehr leicht'] : m < 75 ? [5, 7, 'etwa 1 Std. Training'] : m <= 240 ? [6, 10, '1 bis 4 Std. Training'] : [8, 12, 'mehr als 4 Std. Training'];
  const kcal = x && m ? Math.round(p.ftp * (TYPES[x.t] ? TYPES[x.t].IF : .65) * m * 60 / 1000 / 10) * 10 : 0;
  const rate = mm => mm < 75 ? [0, 30] : mm <= 150 ? [30, 60] : [60, 90], dur = p.goal === 'event' ? ((evProfile(p) || {}).tev || 0) : 0, r = rate(dur), hrs = dur / 60;
  const hourly = m >= 75 ? rate(m) : null;
  let ev = '';
  if (dur) ev = `<div class="wcalc"><p class="font-semibold">Dein Eventtag: ${p.eventName ? '<span data-noi18n>' + esc(p.eventName) + '</span>' : 'Event'}, etwa ${hm2(dur)} Std.</p>
    ${wtbl(['Was', 'Menge'], [
      ['Kohlenhydrat-Laden', dur > 90 ? `36 bis 48 Std. vorher ${Math.round(kg * 10)} bis ${Math.round(kg * 12)} g pro Tag (10 bis 12 g/kg)` : 'nicht nötig, normal kohlenhydratreich essen'],
      ['Frühstück 3 Std. vorher', `${Math.round(kg * 1)} bis ${Math.round(kg * 3)} g Kohlenhydrate (1 bis 3 g/kg), bekannt und leicht verdaulich`],
      ['Unterwegs pro Stunde', r[1] ? `${r[0]} bis ${r[1]} g Kohlenhydrate${r[1] >= 90 ? ' (Glukose und Fruktose gemischt)' : ''}` : 'Wasser genügt, eventuell kleine Mengen'],
      ['Unterwegs gesamt', r[1] ? `etwa ${Math.round(r[0] * hrs / 10) * 10} bis ${Math.round(r[1] * hrs / 10) * 10} g, zum Beispiel ${Math.ceil(hrs)} Flaschen Sportgetränk (je 40 g) und ${Math.max(0, Math.round((r[1] * hrs - Math.ceil(hrs) * 40) / 25))} Gels (je 25 g)` : '–'],
      ['Trinken pro Stunde', 'etwa 400 bis 800 ml, nach Durst und Hitze; Schweißrate vorher im Training messen'],
      ['Natrium pro Stunde', 'etwa 300 bis 600 mg, bei Hitze und starkem Schwitzen mehr (Praxiswert)']])}<button class="wnav mt-2" onclick="goPg('event');setTimeout(() => wGo('evfuel'), 50)">Ausführliche Ernährungsstrategie fürs Event ›</button></div>`;
  return `<div class="wcalc"><p class="font-semibold">Heute${x ? ': ' + esc(x.n) + (m ? ', ' + mm(m) : '') : ''}</p>
    ${wtbl(['Was', 'Menge für ' + f1(kg) + ' kg'], [
      ['Kohlenhydrate am Tag', `${Math.round(kg * band[0])} bis ${Math.round(kg * band[1])} g (${band[0]} bis ${band[1]} g/kg, ${band[2]})`],
      ['Eiweiß am Tag', `${Math.round(kg * 1.2)} bis ${Math.round(kg * 2)} g, verteilt auf 4 bis 5 Mahlzeiten mit je etwa ${Math.round(kg * .3)} g`],
      ['Energie der Einheit', kcal ? `etwa ${kcal} kcal (Faustregel: geleistete kJ entsprechen ungefähr den verbrauchten kcal)` : '–'],
      ['Unterwegs pro Stunde', hourly ? `${hourly[0]} bis ${hourly[1]} g Kohlenhydrate` : 'nicht nötig, Wasser reicht'],
      ['Danach', m >= 90 ? `${Math.round(kg * 1)} bis ${Math.round(kg * 1.2)} g Kohlenhydrate pro Stunde in den ersten Stunden, wenn morgen wieder trainiert wird, dazu etwa ${Math.round(kg * .3)} g Eiweiß` : `normale Mahlzeit mit etwa ${Math.round(kg * .3)} g Eiweiß`]])}
    <p class="mt-2 text-xs" style="color:var(--mute)">Richtwerte nach ${SRC.acsm} und ${SRC.jeuk}, berechnet mit deinem Gewicht und dem heutigen Plan. Individuelle Verträglichkeit geht vor.</p></div>${ev}`;
}
function wissenPage(p){
  const ftp = p.ftp, Z = [['Z1', 'Aktive Erholung', '< 55 %', 0, 55], ['Z2', 'Grundlage', '56–75 %', 56, 75], ['Z3', 'Tempo', '76–90 %', 76, 90], ['Z4', 'Schwelle', '91–105 %', 91, 105], ['Z5', 'VO2max', '106–120 %', 106, 120], ['Z6', 'Anaerobe Kapazität', '121–150 %', 121, 150], ['Z7', 'Sprint, neuromuskulär', '> 150 %', 151, 0]];
  const nav = [['w-calc', 'Verpflegungsrechner'], ['w-alltag', 'Ernährung im Alltag'], ['w-vor', 'Vor dem Training'], ['w-waehrend', 'Während der Fahrt'], ['w-nach', 'Nach dem Training'], ['w-supp', 'Supplemente'], ['w-energie', 'Energieverfügbarkeit'], ['w-sex', 'Frauen und Männer'], ['w-zeit', 'Wenig Zeit?'], ['w-train', 'Trainingsgrundlagen'], ['w-zonen', 'Zonen und Kennzahlen'], ['w-erh', 'Erholung und Schlaf'], ['w-race', 'Renntaktik'], ['w-src', 'Quellen']];
  return `<p class="text-sm" style="color:var(--mute)">Das Wichtigste aus Trainingslehre und Sporternährung, kurz erklärt. Der Schwerpunkt liegt auf Verpflegung, weil sie bei langen Ausfahrten oft über Erfolg oder Einbruch entscheidet.</p>
    <div class="flex flex-wrap gap-2">${nav.map(([id, l]) => `<button class="wnav" onclick="wGo('${ja(id)}')">${l}</button>`).join('')}</div>
    ${wsec('w-calc', 'Dein Verpflegungsrechner', 'Persönliche Mengen für heute und dein Event', fuelCalc(p), true)}
    ${wsec('w-alltag', 'Ernährung im Alltag', 'Kohlenhydrate nach Trainingslast, Eiweiß, Mikronährstoffe', `
      <p><b>Kohlenhydrate nach Belastung dosieren.</b> Der Bedarf richtet sich nach dem Training des Tages, nicht nach einer festen Diät. An lockeren Tagen reicht weniger, an langen Tagen deutlich mehr.</p>
      ${wtbl(['Trainingstag', 'Kohlenhydrate pro kg Körpergewicht'], [['leicht oder Ruhetag', '3–5 g'], ['moderat, etwa 1 Std.', '5–7 g'], ['1–3 Std. mit Intensität', '6–10 g'], ['mehr als 4–5 Std.', '8–12 g']])}
      <p><b>Eiweiß:</b> 1,2 bis 2,0 g pro kg und Tag, am besten gleichmäßig verteilt, etwa 0,3 g pro kg je Mahlzeit (meist 20 bis 40 g). Gute Quellen: Milchprodukte, Eier, Fisch, Fleisch, Hülsenfrüchte, Tofu.</p>
      <p><b>Fett:</b> deckt den Rest. Nicht dauerhaft unter etwa 20 % der Energie gehen, weil sonst fettlösliche Vitamine und Hormone leiden.</p>
      <p><b>Mikronährstoffe:</b> Eisen (vor allem bei Frauen und vegetarischer Ernährung, Ferritin beim Arzt prüfen lassen), Vitamin D im Winter, Kalzium. Bei veganer Ernährung Vitamin B12 ergänzen.</p>
      <p class="text-xs" style="color:var(--mute)">Quelle: ${SRC.acsm}.</p>`)}
    ${wsec('w-vor', 'Vor dem Training und am Renntag', 'Frühstück, Kohlenhydrat-Laden, Timing', `
      <p><b>1 bis 4 Std. vorher:</b> 1 bis 4 g Kohlenhydrate pro kg. Je näher am Start, desto kleiner und leichter verdaulich: wenig Fett, Ballaststoffe und Eiweiß. Beispiele: Haferflocken mit Banane und Honig, Weißbrot mit Marmelade, Reis.</p>
      <p><b>Kohlenhydrat-Laden:</b> Für Events über 90 Minuten 36 bis 48 Std. vorher 10 bis 12 g pro kg und Tag. Das füllt die Glykogenspeicher. Praktisch: mehr Reis, Nudeln, Brot, Saft, dafür weniger Rohkost und Ballaststoffe.</p>
      <p><b>Nichts Neues am Renntag.</b> Frühstück, Gels und Getränke vorher im Training testen.</p>
      <p><b>Lockere Einheiten nüchtern?</b> Kurze, lockere Fahrten ohne Frühstück sind möglich. Harte oder lange Einheiten fährt man besser mit vollen Speichern.</p>
      <p class="text-xs" style="color:var(--mute)">Quelle: ${SRC.acsm}.</p>`)}
    ${wsec('w-waehrend', 'Während der Fahrt', 'Wie viel, was und wann: Kohlenhydrate, Trinken, Salz', `
      ${wtbl(['Dauer der Belastung', 'Kohlenhydrate pro Stunde', 'Art'], [['unter 45 Min.', 'nicht nötig', 'Wasser'], ['45–75 Min.', 'kleine Mengen oder Mundspülung', 'Getränk'], ['1–2 Std.', 'bis 30 g', 'Getränk, Gel, Riegel'], ['2–3 Std.', 'bis 60 g', 'Glukose-haltig'], ['über 2,5 Std.', 'bis 90 g', 'Glukose und Fruktose gemischt']])}
      <p><b>Früh anfangen, regelmäßig nachlegen:</b> ab der ersten halben Stunde alle 15 bis 20 Minuten etwas. Wer erst bei Hunger isst, ist zu spät.</p>
      <p><b>Der Darm ist trainierbar.</b> Hohe Mengen (60 bis 90 g pro Stunde) in langen Trainingseinheiten üben, wöchentlich um etwa 10 bis 20 g steigern. Wer das nicht übt, bekommt im Rennen oft Magenprobleme.</p>
      ${wtbl(['Lebensmittel', 'Kohlenhydrate etwa'], [['Gel', '20–30 g'], ['Sportriegel', '25–45 g'], ['Banane', '25 g'], ['500 ml Sportgetränk (6–8 %)', '30–40 g'], ['Reiskuchen, Laugengebäck', '20–40 g'], ['Gummibärchen, 50 g', '40 g']])}
      <p><b>Trinken:</b> meist 400 bis 800 ml pro Stunde, je nach Hitze und Schweißrate. Ziel ist, nicht mehr als etwa 2 % Körpergewicht zu verlieren, aber auch nicht mehr zu trinken, als man ausschwitzt. Schweißrate messen: vor und nach einer Stunde Fahrt nackt wiegen, getrunkene Menge dazurechnen.</p>
      <p><b>Salz:</b> etwa 300 bis 600 mg Natrium pro Stunde ist ein gängiger Praxiswert, bei Hitze und salzigen Schweißrändern auf der Kleidung mehr. Bei Ultra-Events nie nur reines Wasser in großen Mengen trinken.</p>
      <p class="text-xs" style="color:var(--mute)">Quellen: ${SRC.jeuk}, ${SRC.acsm}.</p>`)}
    ${wsec('w-nach', 'Nach dem Training', 'Regeneration und Auffüllen', `
      <p><b>Eiweiß:</b> etwa 0,3 g pro kg in den ersten Stunden, zum Beispiel Quark, Joghurt, Milchshake, Eier oder eine normale Mahlzeit.</p>
      <p><b>Kohlenhydrate:</b> Nur wenn weniger als 8 Std. bis zur nächsten harten Einheit bleiben, zählt Tempo: 1,0 bis 1,2 g pro kg pro Stunde über etwa 4 Std. Sonst reichen die normalen Mahlzeiten.</p>
      <p><b>Flüssigkeit:</b> etwa 1,25 bis 1,5 Liter je kg Gewichtsverlust, mit etwas Salz (zum Beispiel salzige Mahlzeit oder Brühe).</p>
      <p class="text-xs" style="color:var(--mute)">Quelle: ${SRC.acsm}.</p>`)}
    ${wsec('w-supp', 'Supplemente mit Evidenz', 'Koffein, Nitrat und worauf du achten solltest', `
      <p><b>Koffein:</b> 3 bis 6 mg pro kg etwa 60 Min. vor dem Start verbessern die Ausdauerleistung messbar. Auch kleinere Mengen später im Rennen wirken. Über 6 mg pro kg nehmen Nebenwirkungen zu (Zittern, Magen, Schlaf). Vorher testen.</p>
      <p><b>Nitrat (Rote-Bete-Saft):</b> etwa 5 bis 9 mmol 2 bis 3 Std. vor der Belastung. Der Effekt ist bei Freizeitsportlern eher größer als bei Profis.</p>
      <p><b>Vorsicht bei Nahrungsergänzung:</b> Viele Produkte sind wirkungslos, manche verunreinigt. Bei Wettkämpfen mit Dopingkontrollen nur geprüfte Produkte (zum Beispiel aus der Kölner Liste) verwenden.</p>
      <p class="text-xs" style="color:var(--mute)">Quellen: ${SRC.caf}, ${SRC.ioc}.</p>`)}

    ${wsec('w-sex', 'Frauen und Männer', 'Was beim Training wirklich anders ist und was nicht', `
      <p><b>Gleiches Grundprinzip:</b> Frauen und Männer passen sich auf Ausdauer- und Krafttraining sehr ähnlich an. Deshalb nutzt die App für beide denselben Planaufbau. Unterschiede gibt es bei Einordnung, Ernährung und Gesundheit.</p>
      <p><b>Leistungswerte einordnen:</b> Bei gleichem Trainingsstand liegen die W/kg-Werte von Frauen im Mittel etwa 10 bis 15 % niedriger. Die App berücksichtigt das bei der Einstufung deines Niveaus. Die Zielzeit rechnet sie direkt aus deinen Watt und deinem Gewicht.</p>
      <p><b>Menstruationszyklus:</b> Eine große Übersichtsarbeit fand im Mittel nur eine sehr kleine Leistungsminderung in der frühen Follikelphase (während der Periode), mit großen Unterschieden zwischen Frauen. Empfehlung: den eigenen Zyklus und das Befinden beobachten und flexibel reagieren, statt den Plan starr nach Phasen auszurichten (${wsrc('McNulty et al. 2020', 'https://nrl.northumbria.ac.uk/id/eprint/43759')}).</p>
      <p><b>Eisen:</b> Frauen haben durch die Menstruation einen höheren Eisenbedarf und häufiger einen Eisenmangel, auch ohne Blutarmut. Müdigkeit und stagnierende Leistung können ein Zeichen sein. Ferritin ärztlich prüfen lassen und eisenreich essen (Fleisch, Hülsenfrüchte, Vollkorn, kombiniert mit Vitamin C) (${wsrc('Alaunyte et al. 2015', 'https://pubmed.ncbi.nlm.nih.gov/26448737/')}).</p>
      <p><b>Energiemangel (REDs):</b> betrifft beide Geschlechter. Warnzeichen bei Frauen: ausbleibende oder unregelmäßige Periode. Bei Männern: weniger Lust auf Sex, anhaltende Müdigkeit, häufige Infekte. Dann ärztlich abklären lassen.</p>
      <p><b>Kohlenhydrat-Laden:</b> Frauen brauchen dafür, wie Männer, wirklich 10 bis 12 g pro kg. Das ist oft mehr, als sich normal anfühlt. Der Verpflegungsrechner rechnet mit deinem Gewicht.</p>
      <p><b>Wechseljahre und Alter:</b> Mit sinkendem Östrogen (Frauen) und allgemein ab etwa 40 werden Krafttraining, ausreichend Eiweiß und Erholung wichtiger, auch für die Knochen.</p>
      <p><b>Schwangerschaft und nach der Geburt:</b> Training ist meist möglich und sinnvoll, sollte aber mit Ärztin oder Arzt abgestimmt werden. Die App ist dafür nicht ausgelegt.</p>
      <p class="text-xs" style="color:var(--mute)">Grenze: Die meisten Studien zur Trainingssteuerung wurden mit Männern gemacht. Für Frauen ist die Datenlage dünner.</p>`)}
    ${wsec('w-energie', 'Energieverfügbarkeit', 'Warum zu wenig essen der Leistung schadet', `
      <p>Wer dauerhaft weniger isst, als Training und Alltag verbrauchen, riskiert eine relative Energiemangel-Situation (REDs): schlechtere Erholung, häufigere Infekte und Verletzungen, Knochenschwäche, Zyklusstörungen, Leistungsabfall. Das betrifft Frauen und Männer.</p>
      <p>Warnzeichen sind anhaltende Müdigkeit, stagnierende Leistung trotz Training, häufige Krankheit und bei Frauen ausbleibende Periode. Dann ärztlich abklären lassen und die Energiezufuhr nicht weiter einschränken.</p>
      <p>Die App gibt bewusst keine Diät- oder Abnehmempfehlungen. Wenn Essen und Gewicht dich belasten, sprich mit einer Ärztin, einem Arzt oder einer Ernährungsfachkraft.</p>
      <p class="text-xs" style="color:var(--mute)">Quelle: ${SRC.reds}.</p>`)}
    ${wsec('w-zeit', 'Wenig Zeit?', 'Intensität statt Umfang und Hebel am Renntag', `
      <p><b>Intensität kann Umfang teilweise ersetzen.</b> Intervalltraining verbessert VO2max und FTP mit wenig Zeitaufwand ähnlich stark wie deutlich mehr lockeres Training, besonders bei Hobbyfahrern (${wsrc('Gibala et al. 2006', 'https://coachsci.sdsu.edu/csa/vol191/gibala.htm')}). Auch bei trainierten Radfahrern bringen gezielte Intervallblöcke weiter Leistung (${wsrc('Meta-Analyse 2024', 'https://researchonline.ljmu.ac.uk/24748/1/Physiological%20and%20Performance%20Adaptations%20to%20Interval%20Training%20in%20Endurance%20Trained%20Cyclists%20An%20Exploratory%20Systematic%20Review%20and%20Meta%20Analysis.pdf')}).</p>
      <p><b>Die Grenzen:</b> Mehr als 2 bis 3 harte Einheiten pro Woche verkraften die meisten nicht dauerhaft. Und die Fähigkeit, nach vielen Stunden noch Leistung abzurufen, kommt vor allem aus langen Fahrten. Darum bietet die App „Intensität statt Umfang“ für FTP-Ziele und Events bis etwa 3 Std. an. Bei langen Events bleibt der Long Ride wichtig.</p>
      <p><b>Krafttraining:</b> Schweres Krafttraining verbessert bei Radfahrern Ökonomie und Leistung am Ende langer Fahrten (${wsrc('Frontiers in Physiology 2019', 'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.01132/pdf')}). Für Zeitknappe ein guter Tausch.</p>
      <p><b>Am Renntag:</b> Verpflegung (60 bis 90 g Kohlenhydrate pro Stunde, im Training geübt), gleichmäßiges Pacing und Koffein (etwa 3 mg pro kg, ${wsrc('Meta-Analyse Radsport', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12832238/')}) bringen oft mehr Minuten als ein paar Watt FTP. Im Plan-Check kannst du diese Hebel in deinen Plan übernehmen.</p>
      <p><b>Außerdem:</b> Tapering vor dem Event, Regelmäßigkeit, Schlaf und genug Essen. Im Flachen und in der Gruppe zählen Sitzposition, Kleidung, Reifen und Windschattenfahren oft mehr als Training. Bei Sommerevents helfen ein bis zwei Wochen Training in der Wärme.</p>`)}
    ${wsec('w-train', 'Trainingsgrundlagen', 'Belastung und Anpassung, Periodisierung, Intensitätsverteilung', `
      <p><b>Belastung plus Erholung ergibt Anpassung.</b> Training ist der Reiz, stärker wirst du in der Erholung. Das Modell der „Superkompensation“ veranschaulicht das, ist aber eine Vereinfachung.</p>
      <p><b>Progressive Steigerung:</b> Umfang und Intensität wachsen schrittweise. Die App steigert um etwa 8 % pro Woche und legt jede vierte Woche eine Entlastungswoche ein.</p>
      <p><b>Periodisierung:</b> Basis (Grundlage), Aufbau (Schwelle und VO2max), Spitze (eventspezifisch), Tapering (Umfang runter, Intensität bleibt). So baut eine Fähigkeit auf der anderen auf.</p>
      <p><b>Intensitätsverteilung:</b> Etwa 80 % der Zeit locker, 20 % moderat bis hart. Zu viele mittelharte Einheiten machen müde, ohne viel zu bringen.</p>
      <p><b>Spezifität:</b> Je näher das Ziel, desto ähnlicher wird das Training der Belastung des Events (lange Anstiege, kurze Rampen, Tempo im Feld).</p>`)}
    ${wsec('w-zonen', 'Zonen und Kennzahlen', 'Deine Wattbereiche und was FTP, TSS und CTL bedeuten', `
      ${wtbl(['Zone', 'Bereich', '% FTP', 'Deine Watt'], Z.map(z => [z[0], z[1], z[2], z[4] ? (z[3] ? Math.round(ftp * z[3] / 100) + '–' + Math.round(ftp * z[4] / 100) + ' W' : 'bis ' + Math.round(ftp * z[4] / 100) + ' W') : '> ' + Math.round(ftp * 1.5) + ' W']))}
      <p><b>FTP:</b> die Leistung, die du etwa eine Stunde halten kannst. Test: 20 Min. maximal fahren, Durchschnitt × 0,95.</p>
      <p><b>W/kg:</b> FTP geteilt durch Körpergewicht, am Berg die entscheidende Größe.</p>
      <p><b>Normalized Power (NP):</b> gewichtet harte Phasen stärker als der Durchschnitt und beschreibt die tatsächliche Belastung besser.</p>
      <p><b>TSS:</b> Belastung einer Einheit. 1 Std. an der FTP sind 100 Punkte.</p>
      <p><b>Fitness, Ermüdung, Frische (CTL, ATL, TSB):</b> gleitende Mittel der täglichen Belastung über 42 und 7 Tage. Frische ist die Differenz, vor einem Event soll sie leicht positiv sein.</p>`)}
    ${wsec('w-erh', 'Erholung und Schlaf', 'Was die Anpassung möglich macht', `
      <p><b>Schlaf:</b> 7 bis 9 Std. Er ist die wirksamste Erholungsmaßnahme. Nach harten Tagen eher mehr.</p>
      <p><b>Warnzeichen für Überlastung:</b> anhaltende Müdigkeit, schlechter Schlaf, erhöhter Ruhepuls, Lustlosigkeit, Leistung sinkt trotz Training. Dann 2 bis 3 lockere Tage oder Pause einlegen. Die App fragt nach harten Fahrten nach deinem Befinden und passt den Plan an.</p>
      <p><b>Krank?</b> Faustregel: Bei leichten Beschwerden oberhalb des Halses höchstens locker fahren. Bei Fieber, Gliederschmerzen oder Beschwerden in Brust und Bauch kein Training, auch keine lockere Runde.</p>
      <p><b>Ruhetage</b> sind Teil des Plans und kein verlorenes Training.</p>`)}
    ${wsec('w-race', 'Renntaktik und Pacing', 'Gleichmäßig fahren, Windschatten nutzen, richtig verpflegen', `
      <p><b>Gleichmäßig pacen:</b> Die erste Stunde bewusst kontrolliert fahren. Wer am Anfang überzieht, verliert hinten ein Vielfaches.</p>
      <p><b>Am Berg:</b> lange Anstiege eher bei 80 bis 90 % FTP (je nach Renndauer), kurze Rampen dürfen kurz darüber liegen. Im Flachen und bergab erholen.</p>
      <p><b>Windschatten:</b> In der Gruppe sparst du viel Kraft. Positionierung im vorderen Drittel vermeidet Ziehharmonika-Effekte nach Kurven.</p>
      <p><b>Verpflegungsplan:</b> vorher festlegen, wann du isst und trinkst (zum Beispiel alle 20 Min.), und am Rad oder Vorbau notieren. Labestationen vorher anschauen.</p>
      <p><b>Material:</b> nichts Neues am Renntag. Reifendruck, Ersatzschlauch, Werkzeug, Licht bei Ultra-Events.</p>`)}
    ${wsec('w-src', 'Wissenschaftliche Grundlage', 'Quellen der App und ihre Grenzen', (sources().match(/<div class="px-4 pb-4">([\s\S]*)<\/div><\/section>$/) || [, ''])[1])}`;
}
/* ---------- Ernährungstipps zum Trainingstag und Event-Ernährungsstrategie (praktisch formuliert) ---------- */
MINI.fuel = '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>';
const tAdd = (hhmm, min) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); if (!m) return null; let t = (+m[1] * 60 + +m[2] + min + 1440) % 1440; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

const FIC = {
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bag:'<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  bottle:'<path d="M10 2h4v3l2 3v13H8V8l2-3V2z"/><path d="M8 12h8"/>',
  gel:'<path d="M8 3h8l-1 4v12a3 3 0 0 1-6 0V7L8 3z"/><path d="M10 11h4"/>',
  bar:'<rect x="3" y="9" width="18" height="6"/><path d="M8 9v6M13 9v6"/>',
  meal:'<path d="M6 3v8a2 2 0 0 0 4 0V3M8 3v18M16 3c-2 2-2 6 0 8v10"/>',
  plate:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 12h9"/>',
  snack:'<path d="M12 7c-4-3-8 0-7 5 1 6 5 9 7 8 2 1 6-2 7-8 1-5-3-8-7-5z"/><path d="M12 7c0-2 1-3 3-4"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  salt:'<path d="M8 9h8l-1 12H9L8 9z"/><path d="M9 9c0-3 1-5 3-5s3 2 3 5"/><path d="M11 6h.01M13 6h.01"/>',
  mountain:'<path d="M2 20l7-12 4 6 3-4 6 10H2z"/>',
  moon:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  battery:'<rect x="2" y="7" width="18" height="10"/><path d="M22 10v4M6 10v4M10 10v4M14 10v4"/>',
  flag:'<path d="M5 21V4h11l-2 4 2 4H5"/>',
  dumbbell:'<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>',
  alert:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
  drop:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  scale:'<rect x="3" y="4" width="18" height="17"/><path d="M8 9a6 6 0 0 1 8 0M12 9l1 3"/>',
  check:'<path d="M4 12l5 5L20 6"/>'
};
const fic = (k, sz = 20) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">${FIC[k] || ''}</svg>`;
const fstrip = items => `<div class="fstrip">${items.filter(Boolean).map(([k, v]) => `<span class="fsi">${fic(k, 18)}<span>${v}</span></span>`).join('')}</div>`;
Object.assign(FIC, {
  gauge:'<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  repeat:'<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  chat:'<path d="M4 5h16v11H9l-5 4V5z"/>',
  cadence:'<circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 12l4-3"/>',
  pause:'<path d="M8 5v14M16 5v14"/>'
});
const ZTXT = {Z1:'sehr locker', Z2:'locker, Unterhaltung möglich', Z3:'zügig, kurze Sätze', Z4:'hart, an der Schwelle', Z5:'sehr hart, kaum sprechen'};
function fuelNums(x){
  const m = x.m || 0, hard = ['sst', 'thr', 'vo2'].includes(x.t), onT = m <= 60 ? 0 : m <= 90 ? (hard ? 30 : 0) : m <= 150 ? Math.round(m / 60 * 45 / 5) * 5 : Math.round(m / 60 * 70 / 10) * 10;
  return {onT, bott:Math.min(2, Math.max(1, Math.round(m / 60))), gels:m > 150 ? Math.round(m / 60) : m > 90 ? 1 : 0, bars:m > 150 ? Math.ceil(m / 60 / 2) : m > 90 ? 1 : 0, every:m > 90, salt:m > 150, drink:hard && m <= 90 ? 'Sportgetränk' : m > 90 ? 'Sportgetränk' : 'Wasser'};
}
function heroIcons(x){
  const z = zone(x.hi), v = x.iv, f = fuelNums(x);
  const row = (k, main, sub) => `<div class="hrow">${fic(k, 20)}<div><p class="hrm">${main}</p>${sub ? `<p class="hrs">${sub}</p>` : ''}</div></div>`;
  const zt = x.t === 'sst' ? 'Sweet Spot: fordernd, aber kontrolliert' : x.t === 'race' ? 'Rennen: nach Gefühl und Rennverlauf' : ZTXT[z] ? ZTXT[z][0].toUpperCase() + ZTXT[z].slice(1) : z;
  const ride = [v ? row('repeat', `${(v.sets || 1) > 1 ? v.sets + ' Serien à ' : ''}${v.reps}× ${durT(v.work)} bei ${noPwr() ? (hrRng(v.lo, v.hi) ? 'Puls ' + hrTxt(hrRng(v.lo, v.hi)) : 'Empfinden ' + rpeTxt(x)) : v.lo + '–' + v.hi + ' %'}`, `${v.reps > 1 ? durT(v.rest) + ' locker dazwischen · ' : ''}${v.wu} Min. ein- und ${v.cd} Min. ausfahren`) : null,
    row('gauge', zt, [!v && (z === 'Z1' || z === 'Z2') ? 'Du kannst dich in ganzen Sätzen unterhalten' : '', x.cad ? x.cad : ''].filter(Boolean).join(' · ')),
    x.parts ? row('flag', x.parts.map(q => `${q.lbl} ${mm(q.m)}`).join(' · '), '') : null].filter(Boolean);
  const pack = [`${f.bott} Flasche${f.bott > 1 ? 'n' : ''} ${f.drink}`, f.gels ? `${f.gels} Gel${f.gels > 1 ? 's' : ''}` : '', f.bars ? `${f.bars} Riegel` : ''].filter(Boolean).join(' · ');
  const fuel = [row('drop', f.onT ? `≈ ${f.onT} g Kohlenhydrate unterwegs` : 'Unterwegs musst du nichts essen', f.every ? 'ab Minute 20 alle 20 Min. etwas' + (f.salt ? ', bei Wärme mit Salz' : '') : ''), row('bag', pack, '')];
  return `<div class="hsec"><p class="hgl">So fährst du</p>${ride.join('')}${typeof npToggle === 'function' && x.m > 0 ? npToggle(heroIdx, true) : ''}${S.p ? cycHero(S.p, x, heroIdx, hasStarted(S.p)) : ''}</div><div class="hsec"><p class="hgl">Das brauchst du</p>${fuel.join('')}</div>`;
}

const fblk = (lbl, txt, ic) => `<div class="fblk">${ic ? `<span class="fic">${fic(ic)}</span>` : ''}<div><p class="fl">${lbl}</p><p>${txt}</p></div></div>`;
function fuelTip(x, i, p){
  const kg = kgOf(p), m = x.m || 0, hard = ['sst', 'thr', 'vo2'].includes(x.t), plan = S.plan || [], tm = plan[i + 1], out = [];
  const big = tm && (tm.t === 'race' || /^Eventtag/.test(tm.n || '') || (tm.t === 'long' && tm.m >= 180));
  const heavy = kg >= 80, brot = heavy ? 3 : 2;
  let head;
  if (/^Eventtag/.test(x.n || '')) {
    head = 'Renntag: Es gilt deine Event-Strategie.';
    out.push(fblk('Kurz gesagt', 'Frühstück 3 Std. vor dem Start, ab Minute 20 alle 20 Min. etwas essen oder trinken, nichts Neues ausprobieren. Den genauen Ablauf mit Uhrzeiten findest du auf der Event-Seite unter „Ernährungsstrategie“.', 'flag'));
  } else if (x.feel === 'sick') {
    head = 'Krank: Dein Körper braucht jetzt Energie zum Gesundwerden. Kein Sparprogramm wie am Ruhetag und auf keinen Fall Diät.';
    out.push(fblk('Trinken', 'Viel trinken, über den Tag 2 bis 3 Liter, bei Fieber mehr: Wasser, warmer Tee, Brühe. Der Urin sollte hell sein.', 'bottle'));
    out.push(fblk('Essen', 'Iss nach Appetit, aber iss: lieber mehrere kleine Mahlzeiten wie Suppe, Eintopf, Haferbrei, Obst und Gemüse. Eiweiß (Joghurt, Eier, Fisch, Linsen) unterstützt die Erholung. Ein Energiedefizit schwächt das Immunsystem.', 'meal'));
    out.push(fblk('Bei Magen-Darm', 'Flüssigkeit und Salz ersetzen, zum Beispiel mit Brühe oder einer Elektrolytlösung aus der Apotheke. Dazu Leichtes wie Zwieback, Banane oder Reis, dann langsam wieder normal essen.', 'drop'));
    out.push(fblk('Lieber nicht', 'Kein Alkohol, er stört Schlaf und Abwehr. Hochdosierte Nahrungsergänzung braucht es nicht. Bei Erkältung können Zink-Lutschtabletten, früh genommen, die Dauer etwas verkürzen.', 'alert'));
  } else if (!m) {
    head = 'Ruhetag: normal und ausgewogen essen, die Speicher füllen sich von selbst.';
    out.push(fblk('Teller-Prinzip', 'Eine Hälfte Gemüse oder Salat, ein Viertel Eiweiß (Fisch, Fleisch, Eier, Tofu, Linsen), ein Viertel Beilage (Kartoffeln, Reis, Nudeln, Brot).', 'plate'));
    out.push(fblk('Zwischendurch', 'Joghurt oder Quark mit Obst, eine Handvoll Nüsse. Trinken nach Durst, ein Glas Wasser zu jeder Mahlzeit.', 'snack'));
  } else {
    const dur = mm(m), onT = m <= 60 ? 0 : m <= 90 ? (hard ? 30 : 0) : m <= 150 ? Math.round(m / 60 * 45 / 5) * 5 : Math.round(m / 60 * 70 / 10) * 10;
    head = x.t === 'race' ? `Heute ist Rennen (${dur}): Fahr mit vollen Speichern los und iss ab Minute 20 regelmäßig, sonst fehlt dir hinten raus die Energie.`
      : x.t === 'com' ? `Pendeltag, insgesamt ${dur} locker. Wasser reicht, wichtig sind ein ordentliches Frühstück und Mittagessen, damit du auf dem Heimweg nicht leer bist.`
      : hard ? `${esc(x.n)}, ${dur}: Die Intervalle kosten viel Energie. Iss 2 bis 3 Std. vorher eine Kohlenhydrat-Mahlzeit, dann gelingen die harten Minuten${onT ? ', und nimm ein Sportgetränk mit' : ''}.`
      : m < 60 ? `${esc(x.n)}, nur ${dur} locker: Hier musst du nicht extra essen, eine Flasche Wasser genügt.`
      : m <= 90 ? `${esc(x.n)}, ${dur} in ruhigem Tempo: normal essen, Wasser mitnehmen, mehr braucht es nicht.`
      : m <= 150 ? `${esc(x.n)}, ${dur}: Ab der zweiten Stunde gehen die Speicher zur Neige. Iss deshalb ab Minute 20 regelmäßig, insgesamt etwa ${onT} g Kohlenhydrate.`
      : `${esc(x.n)}, ${dur} in Zone 2: Entscheidend ist, früh und regelmäßig zu essen, damit dir in der letzten Stunde nicht die Energie ausgeht. Insgesamt etwa ${onT} g Kohlenhydrate unterwegs, ideal zum Üben fürs Event.`;
    if (m >= 90 || hard) out.push(fblk('Vorher (2–3 Std.)', `Zum Beispiel eine Schüssel Haferflocken (80 g) mit Banane und einem Löffel Honig oder ${brot} Brötchen mit Marmelade, dazu ein Glas Saft. Das sind etwa ${heavy ? 110 : 90} g Kohlenhydrate. Wenig Fett, wenig Vollkorn, damit der Magen ruhig bleibt.`, 'clock'));
    else out.push(fblk('Vorher', 'Normal essen, wie es in deinen Tag passt. Eine kurze, lockere Runde geht auch vor dem Frühstück.', 'clock'));
    const bott = Math.min(2, Math.max(1, Math.round(m / 60))), gels = m > 150 ? Math.round(m / 60) : m > 90 ? 1 : 0, bars = m > 150 ? Math.ceil(m / 60 / 2) : m > 90 ? 1 : 0;
    out.push(fblk('Einpacken', m < 60 ? '1 Flasche Wasser.' : m <= 90 ? `1 Flasche ${hard ? 'Sportgetränk (oder Wasser mit einem Schuss Saft und einer Prise Salz)' : 'Wasser oder Saftschorle'}.` : `${bott} Flasche${bott > 1 ? 'n' : ''} Sportgetränk${m > 120 ? ' (unterwegs nachfüllen)' : ''}${gels ? `, ${gels} Gel${gels > 1 ? 's' : ''}` : ''}${bars ? `, ${bars} Riegel oder Banane${bars > 1 ? 'n' : ''}` : ''}${m > 150 ? ', etwas Salziges (Brezel, Salztablette)' : ''}.`, 'bag'));
    if (m > 90) out.push(fblk('Unterwegs', `Ab Minute 20 alle 15 bis 20 Min. ein paar große Schlucke, alle 40 Min. ein Gel, ein halber Riegel oder eine halbe Banane. Tipp: einen Erinnerungsalarm am Radcomputer stellen. Wer erst bei Hunger isst, ist zu spät. ${m > 150 ? 'Insgesamt etwa ' + Math.round(m / 60 * 70 / 10) * 10 + ' g Kohlenhydrate, das entspricht etwa ' + Math.round(m / 60 * 70 / 25) + ' Bananen.' : ''}`, 'bottle'));
    else if (m >= 60) out.push(fblk('Unterwegs', 'Regelmäßig trinken, etwa eine Flasche pro Stunde. Essen ist nicht nötig.', 'bottle'));
    out.push(fblk('Danach', hard || m >= 90 ? `Innerhalb von 1 bis 2 Std. zum Beispiel 500 ml Kakao und ein Käsebrötchen oder ein Teller Nudeln mit Hähnchen, Tofu oder Ei. Das liefert etwa 25 g Eiweiß und füllt die Speicher.${tm && ['sst', 'thr', 'vo2', 'long', 'race'].includes(tm.t) ? ' Morgen wird es wieder fordernd: am Abend eine ordentliche Portion Kohlenhydrate (Reis, Kartoffeln, Nudeln) einplanen.' : ''}` : 'Eine normale Mahlzeit mit etwas Eiweiß, zum Beispiel Joghurt, Eier oder Hülsenfrüchte.', 'meal'));
  }
  if (x.feel === 'neck') out.push(fblk('Leicht erkältet', 'Trink heute mehr als sonst, auch während der Fahrt, und fahr nicht nüchtern. Warme Getränke danach tun gut.', 'alert'));
  else if (x.fu != null && S.plan && S.plan[x.fu] && (S.plan[x.fu].feel === 'sick' || S.plan[x.fu].feelWhy === 'ill')) out.push(fblk('Nach der Krankheit', 'Iss wieder normal und ausreichend, dein Körper holt noch auf. Nüchtern fahren und ein Kaloriendefizit vorerst vermeiden, viel trinken.', 'alert'));
  if (big) out.push(fblk('Morgen wird es lang', `Morgen steht „${esc(tm.n)}“ an. Heute über den Tag mehr Kohlenhydrate: zum Frühstück Haferflocken, mittags eine große Portion Nudeln oder Reis, abends noch einmal Nudeln statt großem Salat, dazu Saft. Rohkost, Vollkorn und Fettiges sparsam.`, 'alert'));
  { const c = cycInfo(p, dstrW(i)); if (c && (c.ph === 'mens' || c.ph === 'late' || c.ph === 'lut')) out.push(fblk(c.ph === 'mens' ? 'Periode' : 'Zweite Zyklushälfte', c.ph === 'mens' ? 'Eisenreich essen, zum Beispiel Linsen, Fleisch oder Haferflocken, dazu Vitamin C (Paprika, Orangensaft). Warme Getränke und Wärme helfen vielen bei Krämpfen.' : 'Die Körpertemperatur ist leicht erhöht und der Energiebedarf etwas größer: ausreichend essen, etwas mehr trinken und bei Wärme an Salz denken. Heißhunger ist normal, plane einen Snack ein.', 'drop')); }
  if (strMap[i]) out.push(fblk('Krafttraining', 'Danach Eiweiß: ein Becher Quark oder Skyr, ein Glas Milch mit Brot oder ein Proteinshake.', 'dumbbell'));
  const kgv = kgOf(p), dB = m === 0 ? [3, 5] : m < 75 ? [5, 7] : m <= 240 ? [6, 10] : [8, 12], onTot = !m ? 0 : m <= 60 ? 0 : m <= 90 ? (hard ? 30 : 0) : m <= 150 ? Math.round(m / 60 * 45 / 5) * 5 : Math.round(m / 60 * 70 / 10) * 10;
  const strip = /^Eventtag/.test(x.n || '') || x.feel === 'sick' ? '' : fstrip([['drop', `Tag gesamt ${Math.round(kgv * dB[0] / 10) * 10}–${Math.round(kgv * dB[1] / 10) * 10} g KH`], onTot ? ['drop', `unterwegs ≈ ${onTot} g KH`] : null].concat(!m ? [] : [[ 'bottle', Math.min(2, Math.max(1, Math.round(m / 60))) + ' Flasche' + (Math.min(2, Math.max(1, Math.round(m / 60))) > 1 ? 'n' : '') ], m > 90 ? ['gel', (m > 150 ? Math.round(m / 60) : 1) + ' Gel' + (m > 150 && Math.round(m / 60) > 1 ? 's' : '')] : null, m > 90 ? ['bar', (m > 150 ? Math.ceil(m / 60 / 2) : 1) + ' Riegel'] : null, m > 90 ? ['clock', 'alle 20 Min.'] : null, m > 150 ? ['salt', 'Salz'] : null]));
  return `<p class="font-semibold">${head}</p>${strip}<div class="mt-2 space-y-2">${out.join('')}</div><p class="mt-2 text-xs" style="color:var(--mute)">Mengen grob für ${f1(kg)} kg. Mehr dazu unter Wissen.</p>`;
}
function setStartTime(v){ S.p.startTime = v; S.d.startTime = v; save(); render(); }
function eventFuelPlan(p){
  const pr = evProfile(p); if (!pr) return '';
  const kg = kgOf(p), g = v => Math.round(kg * v), tev = pr.tev, hrs = Math.max(1, Math.ceil(tev / 60)), ultra = pr.ty === 'ultra';
  const ev = EVS.find(x => x.id === p.evId), defStart = ev && /Start (\d{2}:\d{2})/.test(ev.o || '') ? /Start (\d{2}:\d{2})/.exec(ev.o)[1] : '09:00', st = p.startTime || defStart;
  const tgt = tev > 150 ? 80 : tev > 75 ? 45 : 20, end = tAdd(st, tev);
  /* Gramm pro Stunde laut Tabelle, letzte angefangene Stunde anteilig: Gesamtmenge = Summe der Tabelle */
  const hG = h => { const full = tgt < 60 ? (h === 1 ? 30 : 45) : h === 1 ? 65 : 80, fr = Math.min(1, Math.max(0, tev - (h - 1) * 60) / 60); return Math.round(full * fr / 5) * 5; };
  const tot = Math.round(Array.from({length:Math.max(1, Math.ceil(tev / 60))}, (_, k) => hG(k + 1)).reduce((q, x) => q + x, 0) / 10) * 10;
  const H = Array.from({length:hrs}, (_, k) => k + 1), gelsN = tgt >= 60 ? H.filter(h => h === 1 || h % 3 !== 0).length : 0, bars = tgt >= 60 ? Math.ceil(H.filter(h => h > 1 && h % 3 === 0).length + H.filter(h => h > 1 && h % 3 !== 0).length / 2) : 0;
  const caf = Math.round(kg * 3 / 10) * 10, coffee = Math.max(1, Math.round(caf / 80));
  const long = (pr.climbs || []).filter(c => c.min >= 12).sort((a, b) => a.km - b.km), L = (p.course && p.course.laps) || 1;
  const step = (when, title, what, ic) => (p._noLoad && /laden/i.test(title)) || (typeof evFTon !== 'undefined' && evFTon && evPh(when, title) !== evFT) ? '' : `<div class="evstep">${ic ? `<span class="fic">${fic(ic, 22)}</span>` : ''}<div class="min-w-0 flex-1"><p class="text-xs font-semibold" style="color:var(--teal)">${when}</p><p class="font-semibold">${title}</p><div class="mt-1">${what}</div></div></div>`;
  const hourRow = h => { const t0 = tAdd(st, (h - 1) * 60), rest = tev - (h - 1) * 60, pt = rest < 55 && h > 1 ? ` (nur noch ${rest} Min. bis ins Ziel, entsprechend weniger)` : '', g = '≈ ' + hG(h) + ' g';
    return tgt < 60 ? [`${t0} Uhr`, (h === 1 ? 'ab Minute 20 Sportgetränk in kleinen Schlucken' : '1 Flasche Sportgetränk, bei Bedarf eine halbe Banane') + pt, g]
    : h === 1 ? [`${t0} Uhr`, 'ab Minute 20 trinken (1 Flasche Sportgetränk), nach 40 Min. das erste Gel', g]
    : h % 3 === 0 ? [`${t0} Uhr`, '1 Flasche Sportgetränk + 1 Riegel' + (tev > 150 ? ', bei Hitze 1 Salztablette' : '') + pt, g]
    : [`${t0} Uhr`, '1 Flasche Sportgetränk + 1 Gel + ½ Banane oder ½ Riegel' + (tev > 150 ? ', bei Hitze 1 Salztablette' : '') + pt, g]; };
  const loadDay = [['Frühstück', 'Schüssel Haferflocken (100 g) mit Banane und 2 Löffeln Honig, großes Glas Saft', 130], ['Vormittag', '2 Laugenbrezeln, 500 ml Sportgetränk oder Saftschorle', 120], ['Mittag', 'großer Teller Nudeln (150 g roh) mit Tomatensoße, 2 Scheiben Weißbrot', 150], ['Nachmittag', 'Milchreis (250 g) und eine Banane', 85], ['Abend', 'Reis (125 g roh) mit Hähnchen oder Tofu und etwas Gemüse, Glas Saft', 130], ['Später', '2 Toasts mit Marmelade', 50]];
  const ldSum = loadDay.reduce((q, r) => q + r[2], 0);
  return `<p>So kommst du gut versorgt durch ${p.eventName ? '<span data-noi18n>' + esc(p.eventName) + '</span>' : 'dein Event'}: etwa <b>${hm2(tev)} Std.</b> Fahrzeit, Start um <input type="time" class="inp inline-block !w-auto !py-1 !px-2" value="${esc(st)}" onchange="setStartTime(this.value)" aria-label="Startzeit">, Ziel gegen ${end || '–'} Uhr. Alle Uhrzeiten unten richten sich nach deiner Startzeit.</p>
    <div class="wcalc"><p class="font-semibold">Die drei wichtigsten Regeln</p>${fstrip([['clock', hm2(tev) + ' Std.'], ['drop', tgt + ' g KH pro Std.'], ['drop', '≈ ' + tot + ' g KH gesamt unterwegs'], ['bottle', hrs + ' Füllungen'], gelsN ? ['gel', gelsN + ' Gels'] : null, bars ? ['bar', bars + ' Riegel'] : null, tev > 150 ? ['salt', 'Salz'] : null])}<ol class="rules mt-2 space-y-1.5"><li>${fic('check', 18)}<span>Nichts Neues am Renntag: alles vorher im Training testen.</span></li><li>${fic('clock', 18)}<span>Früh anfangen: ab Minute 20 alle 20 Min. etwas, nicht erst bei Hunger.</span></li><li>${fic('drop', 18)}<span>${tgt >= 60 ? `Etwa ${tgt} g Kohlenhydrate pro Stunde, das sind ungefähr 3 Bananen pro Stunde. Klingt viel, ist aber mit Getränk, Gel und Riegel gut machbar, wenn du es geübt hast.` : `Etwa ${tgt} g Kohlenhydrate pro Stunde, das ist ungefähr eine Flasche Sportgetränk.`}</span></li></ol></div>
    ${step('Wochen davor', 'Verpflegung trainieren', `Bei jedem Long Ride dieselben Gels, Riegel und Getränke wie im Rennen nutzen und die Menge langsam steigern. Einmal an einem warmen Tag vor und nach einer Stunde Fahrt nackt wiegen: Jedes verlorene Kilo (plus Getrunkenes) ist ein Liter Schweiß pro Stunde.${pr.race ? ' Essen bei Tempo und in der Gruppe üben.' : ''}`, 'calendar')}
    ${tev > 90 ? step('2 Tage vorher', 'Kohlenhydrate laden', `Für dich etwa ${g(10)} bis ${g(12)} g Kohlenhydrate pro Tag. So kann ein Ladetag aussehen:${wtbl(['Wann', 'Was', 'KH'], loadDay.map(r => [r[0], r[1], '≈ ' + r[2] + ' g']).concat([['', '<b>Summe</b>', '<b>≈ ' + ldSum + ' g</b>']]))}<p class="mt-1">${ldSum < g(10) ? `Dir fehlen noch etwa ${g(10) - ldSum} g: ${Math.ceil((g(10) - ldSum) / 40)} zusätzliche Flasche${Math.ceil((g(10) - ldSum) / 40) > 1 ? 'n' : ''} Saft oder Sportgetränk über den Tag sind der einfachste Weg.` : 'Das reicht für dich.'} Weniger Salat, Vollkorn und Fett, damit Platz bleibt. 1 bis 2 kg mehr auf der Waage sind normal: gespeicherte Energie und Wasser.</p>`, 'battery') : step('Tag vorher', 'Normal und kohlenhydratreich essen', 'Kein extra Laden nötig. Abends Nudeln, Reis oder Kartoffeln, nichts Schweres.', 'battery')}
    ${step('Vorabend', 'Bekanntes, leichtes Kohlenhydrat-Essen', 'Zum Beispiel Nudeln mit Tomatensoße oder Reis mit wenig Gemüse, nicht zu spät essen. Kein Alkohol. Ein Glas Wasser mit einer Prise Salz oder eine Brühe dazu.', 'moon')}
    ${step(tAdd(st, -180) + ' Uhr', 'Frühstück, 3 Std. vor dem Start', `Etwa ${g(1.5)} bis ${g(2.5)} g Kohlenhydrate, zum Beispiel ${kg >= 75 ? 'eine große Schüssel Haferflocken mit Banane und Honig plus ein Brötchen mit Marmelade' : 'eine Schüssel Haferflocken mit Banane und Honig oder zwei Brötchen mit Marmelade'}, dazu 500 ml Wasser oder Tee. Wenn du nervös bist und wenig runterbekommst: ein Glas Saft und ein Weißbrot gehen fast immer.`, 'meal')}
    ${step(tAdd(st, -60) + ' Uhr', p.lev && p.lev.caf ? 'Koffein (Teil deines Plans)' : 'Optional: Koffein', `Etwa ${caf} mg, das entspricht ${coffee} Tasse${coffee > 1 ? 'n' : ''} Kaffee oder einem Koffeingel. Nur, wenn du das kennst und gut verträgst.`, 'bolt')}
    ${step(tAdd(st, -15) + ' Uhr', 'Kurz vor dem Start', `Ein Gel oder eine halbe Banane, ein paar Schlucke trinken. Gels für unterwegs in die Trikottasche, die Lasche vorher leicht einreißen. Riegel in Stücke schneiden.`, 'gel')}
    ${step(st + ' bis ' + (end || '') + ' Uhr', 'Unterwegs', `${wtbl(['Ab', 'Was', 'Kohlenhydrate'], H.slice(0, 12).map(hourRow).concat(hrs > 12 ? [['danach', 'weiter wie oben, dazu herzhaftes Essen an den Verpflegungsstellen', '≈ ' + tgt + ' g']] : []))}
      <p class="mt-2">Trinken: etwa eine Flasche (500 bis 750 ml) pro Stunde, bei Hitze mehr, mit Salz (Sportgetränk, Salztabletten oder salzige Brezeln). Faustregel für Wärme: Wenn sich weiße Salzränder auf dem Trikot zeigen, brauchst du mehr Salz.${tev > 150 ? ' In der zweiten Hälfte hilft ein koffeinhaltiges Gel gegen das Tief.' : ''}</p>
      ${long.length ? `<p class="mt-2 flex gap-2"><span style="color:var(--teal)">${fic('mountain', 18)}</span><span><b>Rund um die Anstiege:</b> 10 Min. vor jedem langen Anstieg etwas essen, am Berg vor allem trinken, in Abfahrten Hände an den Lenker und nichts essen. Lange Anstiege${L > 1 ? ' (pro Runde)' : ''}: ${long.map(c => `bei km ${f1(c.km)} (${f1(c.len / 1000)} km lang, etwa ${Math.round(c.min)} Min.)`).join(', ')}.</span></p>` : ''}
      ${ultra ? '<p class="mt-2"><b>Ultra/24 Std.:</b> Nach einigen Stunden schmeckt Süßes oft nicht mehr. Herzhaftes einplanen (Brühe, Salzkartoffeln, Wraps), nachts warm essen und Koffein für die Tiefpunkte aufsparen.</p>' : ''}`, 'bottle')}
    ${step('Packliste', 'Das kommt ans Rad und in die Taschen', `<ul class="list-disc space-y-1 pl-5"><li>${Math.min(2, hrs)} Flaschen Sportgetränk${hrs > 2 ? `, insgesamt etwa ${hrs} Füllungen: Pulver in Portionsbeuteln mitnehmen und an Verpflegungsstellen nachfüllen` : ''}</li>${gelsN ? `<li>${gelsN} Gels${tev > 150 ? ', davon 1 bis 2 mit Koffein' : ''}</li>` : ''}${bars ? `<li>${bars} Riegel (oder teils Bananen und Laugenbrezeln)</li>` : ''}${tev > 150 ? '<li>Salztabletten oder eine Tüte Salzbrezeln</li>' : ''}<li>Reserve: 1 Gel extra für Pannen oder Umwege</li></ul>`, 'bag')}
    ${step(end ? end + ' Uhr' : 'Im Ziel', 'Danach', `In der ersten Stunde zum Beispiel 500 ml Kakao, ein Brötchen und ein Joghurt (etwa ${g(.3)} g Eiweiß). Abends eine richtige Mahlzeit mit Nudeln, Reis oder Kartoffeln. Für jedes Kilo, das du verloren hast, etwa 1,5 Liter trinken.`, 'flag')}
    <p class="text-xs" style="color:var(--mute)">Richtwerte nach ${SRC.acsm}, ${SRC.jeuk} und ${SRC.caf}, umgerechnet in Alltagsportionen. Kohlenhydratmengen der Lebensmittel sind gerundet. Deine Verträglichkeit geht vor, bei Vorerkrankungen ärztlich abklären.</p>`;
}
function dashboard(){
  const p = S.p, ph = phases(p), tot = ph[ph.length-1].to, cw = S.wk, page = pg || 'home', w = page === 'home' ? cw : (vw ?? cw), cur = w === cw && hasStarted(p);
  const plan = cur ? S.plan : genWeek(p, w), P = ph.find(x => w >= x.from && w <= x.to), rec = (w % 4 === 0 || (p.recW || []).includes(w)) && P.key !== 'taper';
  viewPlan = plan; strWeek = w; strMap = strOf(p, w, plan); mobMap = mobOf(p, w, plan, strMap); if (cur) plan.forEach((x, k) => { if (x && (x.feel === 'sick' || x.feel === 'neck')) { delete strMap[k]; if (x.feel === 'sick') { delete mobMap[k]; delete strMap[k + 1]; } } });
  const tm = plan.reduce((a, x) => a + x.m, 0), tt = plan.reduce((a, x) => a + tss(x), 0);
  const col = n => ph.find(x => n >= x.from && n <= x.to).color;
  const dots = Array.from({length: tot}, (_, i) => i + 1).map(n => `<button onclick="goWeek(${ja(n)});goPg('week')" aria-label="Woche ${esc(n)}" class="hd h-8 w-8 rounded-lg text-sm font-semibold" style="background:${esc(col(n))}${esc(n===w?'':'33')};color:${esc(n===w?'#06202f':'var(--ink)')};border:${esc(n===cw?'2px solid #0b1c49':n%4===0&&n<tot?'1px dashed var(--mute)':'1px solid transparent')}">${n}</button>`).join('');
  const list = ph.map(x => `<div class="flex items-start gap-3 rounded-xl p-2.5" style="${esc(x.from<=cw&&cw<=x.to?'background:var(--tint);border:1px solid var(--line)':'')}"><span class="mt-1.5 h-3 w-3 shrink-0 rounded-full" style="background:${esc(x.color)}"></span><div><div class="font-semibold">${x.name} <span class="font-normal" style="color:var(--mute)">Woche ${x.from===x.to?x.from:x.from+'–'+x.to}, ab ${wd(p,x.from)}</span></div><div class="text-sm" style="color:var(--mute)">${x.desc}</div></div></div>`).join('');
  const nm = a => a.map((v,i) => v ? SD[i] : null).filter(Boolean).join(', ') || 'keine';
  const resetBox = askReset ? `<div class="rounded-2xl p-4" style="background:#fdeceb;border:1px solid #c0392b"><p class="mb-3 text-sm" style="color:#7a1f17">ALLE gespeicherten Pläne, Einstellungen und Anpassungen in diesem Browser löschen und neu starten? Speichere vorher eine Sicherung.</p><div class="flex gap-2"><button onclick="doReset()" class="btn !bg-red-700 flex-1">Ja, alles löschen</button><button onclick="cancelReset()" class="ghost flex-1">Abbrechen</button></div></div>` : '';
  const weekSec = `<section><div class="mb-2 flex items-center gap-2"><button class="ghost !px-3.5 !py-1.5" onclick="goWeek(${ja(w-1)})" aria-label="Vorherige Woche" ${w<=1?'disabled style="opacity:.3"':''}>‹</button>
      <div class="flex-1 text-center"><h2 class="hd text-2xl font-semibold">${cur?'Diese Woche':!hasStarted(p)&&w===1?'Startwoche':w===cw+1?'Nächste Woche':'Woche '+w}</h2><div class="text-sm" style="color:var(--mute)">Woche ${w} von ${tot}, ${P.name}${rec?', Erholungswoche':''}${subsInWeek(p, w).map(s => (s.prio === 'A' ? ' · A-Event: ' : ' · ' + (s.prio || 'C') + '-Rennen: ') + esc(s.name)).join('')}</div></div>
      <button class="ghost !px-3.5 !py-1.5" onclick="goWeek(${ja(w+1)})" aria-label="Nächste Woche" ${w>=tot?'disabled style="opacity:.3"':''}>›</button></div>
      <p class="text-center text-sm" style="color:var(--mute)">${mm(tm)} geplant von ${hStd(tbWkH(p, w))} Std. verfügbar${tm > tbWkH(p, w) * 60 + 1 ? ' (mehr, weil Event- oder Pendeltage feststehen)' : ''}, TSS ~${tt}${Object.keys(strMap).length ? ', zusätzlich ' + Object.keys(strMap).length + ' × Krafttraining' : ''}${Object.keys(mobMap).length ? (Object.keys(strMap).length ? ' und ' : ', zusätzlich ') + Object.keys(mobMap).length + ' × Mobilität/Stabilität' : ''}${cur?'':'. Vorschau, wird zur Woche hin aktualisiert.'}</p><p class="mb-2 text-center text-xs" style="color:var(--mute)">Zeit nach Belastungsbereich: ${dist(plan)}</p>
      ${weekPanel(w, cur)}${impactCard()}${cycWeek(p, w, plan)}
      ${mvModal()}${vaModal()}${blWeekSum(w)}${woNote(plan, w)}<div class="space-y-2.5">${plan.map((x, i) => dayCard(x, i, cur) + xrDayRows(w, i)).join('')}</div></section>`;
  const T = {...ST_T, ...RC_T, ...PP_T, ...SET_T, ...EXP_T, ...EV_T, more:'Mehr', week:'Wochenplan', logbook:'Logbuch', 'lb-ride':'Fahrt', state:'Fortschritt', check:'Plan-Check', event:'Event', overview:'Gesamtplan', rides:'Fahrten bewerten', ex:'Übungen', export:'Export', plans:'Meine Pläne', settings:'Einstellungen', science:'Wissen', cycle:'Zyklus', ms:'Fitness-Checks'};
  foldFlat = page !== 'home';
  let body = '';
  if (page === 'home') {
    body = homePage();
  } else {
    const PAGES_MAP = {
      week:() => weekSec,
      logbook:() => lbPage(),
      'lb-ride':() => lbRidePage(),
      more:() => morePage(),
      state:() => statePage(),
      ...ST_PAGES,
      ...RC_PAGES,
      ...PP_PAGES,
      check:() => checkCard(p, 'dash'),
      event:() => evPage(),
      ...EV_PAGES,
      overview:() => tbSeason() + fold('ov', '', `<div class="mb-3 flex gap-1">${ph.map(x => `<div class="h-3 rounded-full" style="flex:${esc(x.weeks)};background:${esc(x.color)}${esc(x.from<=cw&&cw<=x.to?'':'55')}"></div>`).join('')}</div><div class="mb-3 flex flex-wrap gap-1.5">${dots}</div><div class="space-y-1">${list}</div><p class="mt-2 text-xs" style="color:var(--mute)">Dick umrandet: aktuelle Woche. Gestrichelt: Erholungswoche. Tippe eine Woche an, um sie anzusehen.</p>`, true, `${tot} Wochen bis ${fmt(endOf(p))}`),
      rides:() => pendingCard() + exeList() + xrCard() + uploadCard() + ridesGm(),
      ex:() => exPage(),
      export:() => expPage(),
      ...EXP_PAGES,
      plans:() => plansCard(),
      settings:() => { SETTINGS_ALL = PAGES_MAP.settingsAll; return setPage(); },
      ...Object.fromEntries(Object.keys(SET_PAGES).map(k => [k, () => { SETTINGS_ALL = PAGES_MAP.settingsAll; return SET_PAGES[k](); }])),
      settingsAll:() => fold('lang', 'Sprache und Hilfen', `<div class="flex flex-wrap gap-2" data-noi18n>${chip('Deutsch', lang() === 'de', "setLang('de')")}${chip('English', lang() === 'en', "setLang('en')")}</div><p class="mb-2 mt-3 text-sm" style="color:var(--mute)">Fachbegriffe wie FTP oder TSS sind gepunktet unterstrichen. Fahr mit der Maus darüber oder tippe darauf, dann erscheint eine kurze Erklärung.</p><div class="flex flex-wrap gap-2">${chip('Begriffe erklären', S.gloss !== false, 'S.gloss=true;save();render()')}${chip('Aus', S.gloss === false, 'S.gloss=false;save();render()')}</div><p class="mb-2 mt-4 text-sm" style="color:var(--mute)">Ab und zu ein Hinweis, wie du Fahrten automatisch aus Garmin Connect holen kannst.</p><div class="flex flex-wrap gap-2">${chip('Garmin-Tipp anzeigen', !gtOff(), 'gtSet(true)')}${chip('Nie anzeigen', gtOff(), 'gtSet(false)')}</div><p class="mb-2 mt-4 text-sm" style="color:var(--mute)">„Wusstest du schon?“: Auf der Startseite jeden Tag ein Tipp zu einer Funktion der App.</p><div class="flex flex-wrap gap-2">${chip('Tipps anzeigen', !dykIsOff(), 'dykOff(true)')}${chip('Aus', dykIsOff(), 'dykOff(false)')}</div>`, false, lang() === 'en' ? 'English' : 'Deutsch') + fold('shift', 'Planstart verschieben', `<p class="mb-2 text-sm" style="color:var(--mute)">${hasStarted(p) ? 'Pause, Urlaub oder Krankheit? Lass den Plan später neu beginnen.' : 'Der Plan startet am ' + fmt(p.startDate) + '.'}</p>${shiftUi(p)}`, false, hasStarted(p) ? 'läuft seit ' + fmt(p.startDate || p.start) : 'Start ' + fmt(p.startDate)) + fold('ali', 'Dein Alltag', `<div class="text-sm"><p style="color:var(--mute)">Training: ${nm(p.avail)}${p.perDay ? ' (' + SD.map((x, i) => p.avail[i] ? x + ' ' + (p.dayMin[i] || 0) + ' Min.' : null).filter(Boolean).join(', ') + ', zusammen ' + hStd(p.hours) + ' Std.)' : ', ' + hStd(p.hours) + ' Std. pro Woche'}<br>Radpendeln: ${isComm(p) ? nm(p.commute) + ' (' + comLeg(p) + ' Min. einfach, ' + 2 * comLeg(p) + ' Min. pro Pendeltag)' : 'nein'}<br>Long Ride: ${DAYS[p.longDay]}<br>Krafttraining: ${p.strN ? p.strN + '× pro Woche' : 'nein'}, Mobilität und Stabilität: ${p.mobN ? p.mobN + '× pro Woche' : 'nein'}<br>Körpergewicht: ${f1(kgOf(p))} kg, FTP ${p.ftp} W (${f1(p.ftp / kgOf(p))} W/kg)</p></div><div class="mt-4 flex flex-wrap gap-2"><button class="btn" onclick="editOnly(3)">Alltag bearbeiten</button><button class="ghost" onclick="edit()">Ganzen Plan anpassen</button></div><p class="mt-2 text-xs" style="color:var(--mute)">Trainingstage, Zeit pro Woche oder Tag, Pendeln, Long-Ride-Tag, Kraft und Mobilität. Dein Fortschritt und die bisherigen Einheiten bleiben erhalten.</p>`, true) + hrSettings() + wxSettings() + privSettings() + fold('theme', 'Darstellung', `<div class="flex flex-wrap gap-2">${chip('Automatisch', !S.theme, 'S.theme=null;save();render()')}${chip('Hell', S.theme === 'light', "S.theme='light';save();render()")}${chip('Dunkel', S.theme === 'dark', "S.theme='dark';save();render()")}</div><p class="mt-2 text-sm" style="color:var(--mute)">Automatisch folgt der Einstellung deines Geräts.</p>`, false, !S.theme ? 'Automatisch' : S.theme === 'dark' ? 'Dunkel' : 'Hell') + `<details class="dzone"${askReset ? ' open' : ''}><summary>Gefahrenzone</summary><div class="mt-2 p-3" style="border:1px dashed #c0392b"><p class="text-sm" style="color:var(--mute)">Löscht alle Pläne und Einstellungen in diesem Browser.</p>${askReset ? '<div class="mt-3">' + resetBox + '</div>' : `<button class="ghost mt-3 !py-1.5 text-sm" style="border-color:#c0392b;color:#c0392b" onclick="reset()">Alles zurücksetzen</button>`}</div></details>`,
      science:() => wissenGrouped(p),
      cycle:() => cyclePage(p),
      ms:() => msPage(p)
    }; const inner = PAGES_MAP[page];
    const isTab = TABS.includes(page);
    body = `${isTab ? (page === 'week' ? '' : `<h1 class="hd text-2xl font-semibold">${T[page] || ''}</h1>`) : `<div class="flex items-center gap-2"><button class="ghost shrink-0 whitespace-nowrap !px-3 !py-1.5 text-sm" onclick="goBack()"><span aria-hidden="true">‹</span> <span>${(() => { const par = PGP[page] || PG_PAR[page] || IA_PAR[page]; return par ? T[par] : (TABL[pgFrom] || 'Heute'); })()}</span></button><h1 class="hd ml-1 min-w-0 text-xl font-semibold sm:text-2xl">${T[page] || ''}</h1></div>`}${inner ? inner() : ''}`;
  }
  foldFlat = false;
  return `<div class="space-y-4">
    <header class="brand flex flex-wrap items-center gap-2"><button onclick="goPg(null)" class="hd text-2xl" style="color:#fff;background:none;border:0;padding:0">Relentless<span style="color:var(--ice)">.</span></button><span aria-hidden="true" style="width:1px;height:20px;background:rgba(255,255,255,.35);margin:0 2px 0 4px"></span><img src="data:image/png;base64,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" alt="T2R – Team Relentless Riders" title="Team Relentless Riders" onclick="goPg(null)" style="cursor:pointer;height:20px;width:auto;display:block">
      ${langBtn(true)}${planLine()}</header>${gmNewsBar()}
    ${page === 'home' ? resetBox : ''}${body}${navBar(page)}
    </div>`;
}

/* Plantitel automatisch nachführen, solange der Titel nicht selbst vergeben wurde (auch für ältere gespeicherte Pläne) */
const isAutoName = n => !n || n === 'Event-Plan' || /^FTP-Ziel \d+ W$/.test(n) || /^(Fitness|Ausdauer: .*|Schneller werden|Fit und gesund|Wiedereinstieg) bis /.test(n) || EVS.some(e => n === e.n || n === e.n + (e.v ? ' ' + e.v : ''));
function syncNames(){
  try {
    if (S.p && S.pid && !S.pnameManual && isAutoName(S.pname) && S.pname !== planName(S.p)) S.pname = planName(S.p);
    const lib = readLib(); let ch = false;
    Object.values(lib.plans).forEach(e => { const pp = e.snap && e.snap.p; if (pp && !e.manual && isAutoName(e.name) && e.name !== planName(pp)) { e.name = planName(pp); ch = true; } });
    if (ch) localStorage.setItem(LIBK, JSON.stringify(lib));
  } catch (e) { elog(e); }
}
