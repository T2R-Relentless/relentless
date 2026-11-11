/* ---------- Aktionen ---------- */
function draft(k, v){ if (k === 'eventDate') S.d.evDateEst = false; if ((k === 'dist' || k === 'hm') && S.d.course) { if (S.d.course.builtin) S.d.noBuiltin = true; delete S.d.course; } S.d[k] = (['ftp','ftpTarget','hours','commuteMin','weight','dist','hm','startH','longMin'].includes(k)) ? Number(v) : v; save(); evUpd(); rngHint(k, v); if (formMsg && !rngFirst(S.d)) { formMsg = ''; render(); } }
const kgOf = p => p.weight > 0 ? p.weight : 75;
const isComm = p => p.commuter === undefined ? p.commute.some(Boolean) : !!p.commuter;
const legOf = (p, i) => comLeg(p);
const capOf = (p, i) => p.perDay && p.dayMin ? (p.dayMin[i] || 0) : 999;
const f1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const hm2 = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
/* DACH-Eventvorschläge: Stand Okt. 2026. d = bestätigtes Datum, dn = Hinweis zum Termin, hm null = Höhenmeter nicht bestätigt. Immer beim Veranstalter prüfen. */
const EVS = [
 {id:'oetz', ty:'alpin', cp:[[0,1368],[13,1180],[22,1030],[31,820],[40,1530],[49.5,2020],[61,1240],[78,610],[91,575],[103,1010],[109,990],[114,1050],[120,1160],[126,1370],[141,948],[156.5,2094],[177,689],[185,1010],[205.5,2474],[209,2050],[211,2170],[220,1470],[227,1368]], src:'Pässe und Höhen laut tirol.at, Zwischenpunkte geschätzt', n:'Ötztaler Radmarathon', v:'', c:'AT', d:'2027-08-29', km:227, hm:5500, o:'Sölden · Start 06:30 · Quelle: radsport-events.de'},
 {id:'tann214', cp:[[0,1100],[9,1180],[17,915],[28,800],[37,800],[45,730],[52,900],[58,760],[64,870],[70,860],[73,800],[81.7,1407],[88,1044],[100,750],[108,600],[113,560],[118,700],[122,640],[134,690],[140,800],[145,800],[158,1676],[162,1495],[172,1120],[185,1040],[198,880],[202.4,1095],[207,1140],[213.8,1100]], src:'Orte, Pässe und Anstiegslängen laut tirol.at, Zwischenhöhen geschätzt', n:'Rad-Marathon Tannheimer Tal', v:'214 km', c:'AT', d:'2027-07-04', km:214, hm:3500, o:'Tannheimer Tal (Tirol) · Quelle: tirol.at'},
 {id:'tann138', n:'Rad-Marathon Tannheimer Tal', v:'138 km', c:'AT', d:'2027-07-04', km:138, hm:870, o:'Quelle: tirol.at'},
 {id:'tann103', n:'Rad-Marathon Tannheimer Tal', v:'103 km', c:'AT', d:'2027-07-04', km:103.5, hm:760, o:'Quelle: tirol.at'},
 {id:'tann66', n:'Rad-Marathon Tannheimer Tal', v:'66 km', c:'AT', d:'2027-07-04', km:66, hm:null, o:'Höhenmeter nicht gefunden, bitte nachtragen'},
 {id:'rar75', ty:'punch', race:1, cp:[[0,610],[2.5,600],[4,575],[6,590],[8,560],[9.5,530],[11,420],[12,450],[13,430],[14,360],[14.8,320],[15.3,330],[16.2,390],[17.2,450],[18.6,500],[19.3,530],[20.2,616],[20.8,600],[21.5,570],[22,540],[22.8,560],[24.4,610]], src:'grob nach der Streckenbeschreibung von radamring.de (Runde mit etwa 560 hm, Hohe Acht bis 17 %), Zwischenhöhen geschätzt', laps:3, est:'2027-07-25', n:'Rad am Ring Nürburgring', v:'Jedermann 75 km', c:'DE', d:'', dn:'Eventwochenende 23.–25.07.2027, Renntag beim Veranstalter prüfen', km:75, hm:1700, o:'Nürburgring'},
 {id:'rar150', ty:'punch', race:1, cp:[[0,610],[2.5,600],[4,575],[6,590],[8,560],[9.5,530],[11,420],[12,450],[13,430],[14,360],[14.8,320],[15.3,330],[16.2,390],[17.2,450],[18.6,500],[19.3,530],[20.2,616],[20.8,600],[21.5,570],[22,540],[22.8,560],[24.4,610]], src:'grob nach der Streckenbeschreibung von radamring.de (Runde mit etwa 560 hm, Hohe Acht bis 17 %), Zwischenhöhen geschätzt', laps:6, est:'2027-07-25', n:'Rad am Ring Nürburgring', v:'Jedermann 150 km', c:'DE', d:'', dn:'Eventwochenende 23.–25.07.2027, Renntag beim Veranstalter prüfen', km:150, hm:3400, o:'Nürburgring'},
 {id:'rar24', ty:'ultra', dur:1440, race:1, cp:[[0,610],[2.5,600],[4,575],[6,590],[8,560],[9.5,530],[11,420],[12,450],[13,430],[14,360],[14.8,320],[15.3,330],[16.2,390],[17.2,450],[18.6,500],[19.3,530],[20.2,616],[20.8,600],[21.5,570],[22,540],[22.8,560],[24.4,610]], src:'grob nach der Streckenbeschreibung von radamring.de (Runde mit etwa 560 hm, Hohe Acht bis 17 %), Zwischenhöhen geschätzt', laps:1, est:'2027-07-24', n:'24h Nürburgring (Rad am Ring)', v:'eine Runde', c:'DE', d:'', dn:'Eventwochenende 23.–25.07.2027', km:26, hm:560, o:'Werte gelten pro Runde (selbst berechnet). Beim 24-Stunden-Rennen zählen viele Runden, die Zielzeit-Prüfung ist hier nur ein Anhaltspunkt.'},
 {id:'zus', ty:'punch', race:1, py:'2026-04-12', n:'Schwarzbräupreis Zusmarshausen', v:'Jedermann 81 km', c:'DE', d:'', dn:'2026 war am 12.04. (51. Auflage). Termin 2027 noch nicht veröffentlicht', km:81, hm:null, o:'Rundkurs mit Anstieg zum Kaiserberg, Höhenmeter nicht bestätigt, bitte nachtragen'},
 {id:'brzl111', race:1, n:'Brezel Race', v:'Lang ca. 111 km', c:'DE', d:'2027-09-19', km:111, hm:null, o:'6. Auflage, Region Stuttgart. Strecken werden Ende 2026 veröffentlicht, Werte aus früheren Ausgaben'},
 {id:'brzl65', race:1, n:'Brezel Race', v:'Kurz ca. 65 km', c:'DE', d:'2027-09-19', km:65, hm:null, o:'Strecken werden Ende 2026 veröffentlicht, Werte aus früheren Ausgaben'},
 {id:'lilaR', race:1, py:'2026-10-03', pyRule:'date', n:'Lila Logistik Charity Bike Cup', v:'Lila Race 76 km', c:'DE', d:'', dn:'2026 war am 03.10. in Heimerdingen. Termin 2027 noch offen', km:76, hm:null, o:'4 Runden à 19,1 km, davon 3 gewertet. Höhenmeter nicht veröffentlicht'},
 {id:'lilaT', py:'2026-10-03', pyRule:'date', n:'Lila Logistik Charity Bike Cup', v:'Lila Tour bis 57 km', c:'DE', d:'', dn:'2026 war am 03.10. in Heimerdingen. Termin 2027 noch offen', km:57.3, hm:null, o:'bis zu 3 Runden à 19,1 km. Höhenmeter nicht veröffentlicht'},
 {id:'esf40', race:1, n:'Eschborn-Frankfurt ADAC Velotour', v:'Skyline ca. 40 km', c:'DE', d:'2027-05-01', km:40, hm:null, o:'Start und Ziel Eschborn, durch Frankfurt. Höhenmeter nicht veröffentlicht. Quelle: timeto.com'},
 {id:'esf92', race:1, ty:'huegel', n:'Eschborn-Frankfurt ADAC Velotour', v:'Taunus Express ca. 92 km', c:'DE', d:'2027-05-01', km:92, hm:null, o:'Durch den Taunus, Distanz je nach Angabe 85 bis 92 km, Höhenmeter nicht veröffentlicht. Quelle: timeto.com'},
 {id:'esf103', race:1, ty:'huegel', n:'Eschborn-Frankfurt ADAC Velotour', v:'Taunus Classic ca. 103 km', c:'DE', d:'2027-05-01', km:103, hm:null, o:'Durch den Taunus, Distanz je nach Angabe 97 bis 103 km, Höhenmeter nicht veröffentlicht. Quelle: timeto.com'},
 {id:'ruk30', race:1, n:'Rund um Köln', v:'Velodom 30 (26 km)', c:'DE', d:'2027-05-23', km:26, hm:150, o:'Start Bergisch Gladbach-Heidkamp. Quelle: hdsports.org'},
 {id:'ruk60', race:1, n:'Rund um Köln', v:'Velodom 60 (67 km)', c:'DE', d:'2027-05-23', km:67, hm:480, o:'Start Kölner Rheinauhafen, Rückkehr über den Königsforst. Quelle: hdsports.org'},
 {id:'ruk120', race:1, n:'Rund um Köln', v:'Velodom 120 (121 km)', c:'DE', d:'2027-05-23', km:121, hm:1180, o:'Start Kölner Rheinauhafen, durchs Bergische Land. Quelle: hdsports.org'},
 {id:'cyc60', race:1, ty:'flach', n:'ADAC Cyclassics Hamburg', v:'The Experience 60 km', c:'DE', d:'2027-08-15', km:60, hm:null, o:'Start Alsterglacis, durch den Hamburger Westen und Pinneberg mit Kösterberg und Elbchaussee, Ziel Mönckebergstraße. Weitgehend flach, Höhenmeter nicht veröffentlicht. Quellen: tour-magazin.de, timeto.com'},
 {id:'cyc110', race:1, ty:'flach', n:'ADAC Cyclassics Hamburg', v:'The Challenge 110 km', c:'DE', d:'2027-08-15', km:110, hm:null, o:'Start HafenCity, zweimal über die Köhlbrandbrücke, Altes Land, Anstieg Rosengartenstraße, Ziel Mönckebergstraße. Weitgehend flach, Höhenmeter nicht veröffentlicht. Quellen: tour-magazin.de, timeto.com'},
 {id:'arb100', py:'2026-07-26', n:'Arber Radmarathon', v:'100 km', c:'DE', d:'', dn:'Ende Juli 2027 (2026: 26.07.), Regensburg', km:100, hm:900, o:'Quelle: finishers.com'},
 {id:'arb170', py:'2026-07-26', n:'Arber Radmarathon', v:'170 km', c:'DE', d:'', dn:'Ende Juli 2027 (2026: 26.07.), Regensburg', km:170, hm:2400, o:'Quelle: finishers.com'},
 {id:'arb250', py:'2026-07-26', n:'Arber Radmarathon', v:'250 km', c:'DE', d:'', dn:'Ende Juli 2027 (2026: 26.07.), Regensburg', km:250, hm:3750, o:'Quelle: finishers.com'},
 {id:'dlg120', ty:'alpin', py:'2026-06-28', n:'Dreiländergiro Nauders', v:'Stelvio Vinschgau 120 km', c:'AT', d:'', dn:'2026 war am 28.06. Termin 2027 noch offen', km:120, hm:3000, o:'Quelle: tour-magazin.de'},
 {id:'dlg168', ty:'alpin', cp:[[0,1394],[9,1504],[20,1470],[28,1215],[31,1050],[36,920],[45,915],[69.3,2757],[72,2501],[85,1375],[98.5,2149],[121,1471],[130,1430],[145,1244],[160,1035],[165,1405],[168,1394]], src:'Orte und Pässe laut tirol.at, Höhen und Kilometer geschätzt', py:'2026-06-28', n:'Dreiländergiro Nauders', v:'Stelvio Engadin 168 km', c:'AT', d:'', dn:'2026 war am 28.06. Termin 2027 noch offen', km:168, hm:3600, o:'Quelle: tour-magazin.de'},
 {id:'abr267', ty:'alpin', py:'2025-09-06', n:'Swiss Cycling Alpenbrevet', v:'Platin 267 km', c:'CH', d:'', dn:'Daten von 2025 (06.09.2025). Termin 2027 prüfen', km:267, hm:6800, o:'Andermatt · Quelle: tour-magazin.de'},
 {id:'abr212', ty:'alpin', py:'2025-09-06', n:'Swiss Cycling Alpenbrevet', v:'Gold 212 km', c:'CH', d:'', dn:'Daten von 2025 (06.09.2025). Termin 2027 prüfen', km:212, hm:5000, o:'Andermatt · Quelle: tour-magazin.de'},
 {id:'abr108', ty:'alpin', py:'2025-09-06', n:'Swiss Cycling Alpenbrevet', v:'Silber 108 km', c:'CH', d:'', dn:'Daten von 2025 (06.09.2025). Termin 2027 prüfen', km:108, hm:3100, o:'Andermatt · Quelle: tour-magazin.de'},
 {id:'sb137', ty:'punch', race:1, py:'2026-03-08', n:'Gran Fondo Strade Bianche', v:'Lang 137,7 km', c:'IT', d:'', dn:'Anfang März 2027 (2026: 08.03.), Siena', km:137.7, hm:2200, o:'10 Schotterabschnitte (strade bianche), kurze steile Anstiege · Quelle: finishers.com, cetilar.com'},
 {id:'sb87', ty:'punch', race:1, py:'2026-03-08', n:'Gran Fondo Strade Bianche', v:'Kurz 87 km', c:'IT', d:'', dn:'Anfang März 2027 (2026: 08.03.), Siena', km:87, hm:1350, o:'6 Schotterabschnitte · Quelle: finishers.com, cetilar.com'},
 {id:'rid113', ty:'huegel', race:1, py:'2026-09-06', n:'RiderMan Bad Dürrheim', v:'Etappenrennen, längste Etappe 113 km', c:'DE', d:'', dn:'Anfang September 2027 (2026: 04.–06.09.), drei Tage', km:113, hm:1515, o:'Drei Etappen: Einzelzeitfahren (ca. 16 bis 22 km) und zwei Straßenetappen mit 113 km/1515 hm und 96 km/1230 hm. Geplant wird auf die längste Etappe · Quelle: finishers.com, granfondodailynews.com'},
 {id:'kitz216', ty:'alpin', race:1, py:'2026-09-06', n:'Kitzbüheler Radmarathon', v:'216 km mit Ziel Kitzbüheler Horn', c:'AT', d:'', dn:'2026 war am 06.09. Termin 2027 noch offen', km:216, hm:4600, o:'Start in der Vorderstadt Kitzbühel, Ziel auf dem Kitzbüheler Horn · Quelle: tour-magazin.de'},
 {id:'kitz209', ty:'alpin', race:1, py:'2026-09-06', n:'Kitzbüheler Radmarathon', v:'209 km mit Ziel Kitzbühel', c:'AT', d:'', dn:'2026 war am 06.09. Termin 2027 noch offen', km:209, hm:3800, o:'Wechsel von der langen Strecke unterwegs möglich · Quelle: tour-magazin.de'}
];
/* Vorläufiges Eventdatum, solange der Veranstalter noch keinen Termin veröffentlicht hat: Vorjahrestermin, gleicher Wochentag (+364 Tage) bzw. gleiches Kalenderdatum bei festen Terminen */
function evDateGuess(e){
  if (!e || e.d) return null; if (e.est) return e.est >= iso(14) ? e.est : null; if (!e.py) return null;
  const d = new Date(e.py + 'T12:00:00'); let n = 0;
  while (lstr(d) < iso(14) && n++ < 5) { if (e.pyRule === 'date') d.setFullYear(d.getFullYear() + 1); else d.setDate(d.getDate() + 364); }
  return lstr(d);
}
function pickEv(id){
  const e = EVS.find(x => x.id === id); S.d.evId = id || ''; delete S.d.course;
  if (e) {
    S.d.eventName = e.n + (e.v ? ' ' + e.v : ''); S.d.dist = e.km; S.d.hm = e.hm == null ? 0 : e.hm; delete S.d.noBuiltin; if (e.cp) S.d.course = courseFromCP(e);
    S.d.evDateEst = false; if (e.d && e.d >= iso(14)) S.d.eventDate = e.d; else { const g = evDateGuess(e); if (g) { S.d.eventDate = g; S.d.evDateEst = true; } }
    /* Zielzeit passend zum neuen Event vorschlagen, solange sie nicht selbst eingegeben wurde */
    if (e.dur) S.d.targetTime = hm2(e.dur);
    else if (!S.d.tgtMan) { try { const a = ambTarget({...S.d, goal:'event', targetTime:'5:00'}); if (a && (a.tPlan || a.t)) S.d.targetTime = hm2(a.tPlan || a.t); } catch (x) { elog(x); } }
  }
  save(); render();
}
function evPick(d){
  const groups = []; EVS.forEach(e => { let g = groups.find(x => x.n === e.n); if (!g) groups.push(g = {n:e.n, c:e.c, l:[]}); g.l.push(e); });
  const cur = EVS.find(x => x.id === d.evId);
  const opts = '<option value="">Eigenes Event / manuell eintragen</option>' + groups.map(g => `<optgroup label="${esc(g.n)} (${g.c})">${g.l.map(e => `<option value="${esc(e.id)}"${d.evId === e.id ? ' selected' : ''}>${esc(e.v || f1(e.km) + ' km')}${e.hm != null ? ' · ' + e.hm.toLocaleString('de-DE') + ' hm' : ' · hm offen'}</option>`).join('')}</optgroup>`).join('');
  let info = '';
  if (cur) {
    const dt = cur.d ? 'Termin: ' + dOnly(cur.d).toLocaleDateString('de-DE', {day:'2-digit', month:'long', year:'numeric'}) : (cur.dn || 'Termin beim Veranstalter prüfen');
    info = `<div class="p-3 text-sm" style="background:#e6f7f6;border:1px solid var(--ice);color:var(--ink)"><b><span data-noi18n>${esc(cur.n)}</span>${cur.v ? ', <span>' + esc(cur.v) + '</span>' : ''}</b><br>${esc(dt)}${cur.d && cur.dn ? '<br>' + esc(cur.dn) : ''}<br>${f1(cur.km)} km${cur.hm != null ? ', ' + cur.hm.toLocaleString('de-DE') + ' hm' : ', Höhenmeter bitte selbst eintragen'}<br><span style="color:var(--mute)">${esc(cur.o || '')}</span>${cur.d ? '' : evDateGuess(cur) ? `<br><b>Vorläufig übernommen: ${new Date(evDateGuess(cur) + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})}</b> (${cur.est ? 'aus dem bekannten Eventwochenende' : cur.pyRule === 'date' ? 'Vorjahrestermin, gleiches Datum' : 'Vorjahrestermin, gleicher Wochentag'}). <b>Bitte Eventdatum unten selbst setzen, sobald der Termin feststeht.</b>` : '<br><b>Bitte Eventdatum unten selbst setzen.</b>'}</div>`;
  }
  return field('Event-Vorschlag (DACH-Jedermannrennen)', `<select class="inp" onchange="pickEv(this.value)">${opts}</select>`) + info + '<p class="text-xs" style="color:var(--mute)">Stand Oktober 2026. Termine und Strecken ändern sich, bitte vor der Anmeldung beim Veranstalter prüfen.</p>';
}
/* Zielzeit-Check: Leistungsbilanz nach Martin et al. 1998, siehe modelInfo() */

