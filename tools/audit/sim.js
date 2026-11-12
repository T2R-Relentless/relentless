/* Audit Trainingslogik: Pläne für fünf Profile erzeugen und auswerten. Liest nur, ändert die App nicht. */
const NOW = new Date(2026, 10, 12, 9, 30, 0).getTime();
const TB = (hw, hs, days, avail) => ({on:true, prof:{w:{h:hw, days, avail:[...avail]}, s:{h:hs, days, avail:[...avail]}}, mon:['w','w','w','s','s','s','s','s','s','s','w','w'], dev:{}});
const AV = s => [0,1,2,3,4,5,6].map(i => s.includes(i));
const PROFILES = {
  A:{label:'Nutzerprofil 3,6 W/kg, 76 km Jedermann-Rennen 03.10.2027, Ziel unter 2:00, Winter 5 h / Sommer 8 h, 4 Tage', ctl0:45,
     d:{goal:'event', eventName:'Jedermann-Rennen 76 km', eventDate:'2027-10-03', dist:76, hm:450, targetTime:'2:00', fmt:'race', draft:'pel', ftp:305, weight:85, hours:8, avail:AV([1,3,5,6]), longDay:6, strN:2, tb:TB(5, 8, 4, AV([1,3,5,6]))}},
  B:{label:'Einsteiger 2,2 W/kg, 5 h/Woche, Gran Fondo 120 km / 1.500 Hm in 24 Wochen', ctl0:20,
     d:{goal:'event', eventName:'Gran Fondo 120', eventDate:'2027-05-02', dist:120, hm:1500, targetTime:'', fmt:'mara', draft:'grp', ftp:165, weight:75, hours:5, avail:AV([1,3,5,6]), longDay:6, strN:1}},
  C:{label:'Ambitioniert 4,2 W/kg, 12 h/Woche, Saison mit A/B/C-Rennen', ctl0:75,
     d:{goal:'event', season:true, eventName:'Hauptrennen 150 km', eventDate:'2027-08-29', dist:150, hm:2200, targetTime:'', fmt:'race', draft:'pel', ftp:294, weight:70, hours:12, avail:AV([1,2,3,4,5,6]), longDay:5, strN:2, strLvl:'exp'},
     subs:[{name:'Frühjahrsrennen C', date:'2027-04-11', prio:'C', dist:70, hm:500}, {name:'Rundfahrt B', date:'2027-05-09', prio:'B', dist:100, hm:1200}, {name:'Klassiker A', date:'2027-06-13', prio:'A', dist:120, hm:1500}, {name:'Kriterium C', date:'2027-07-25', prio:'C', dist:50, hm:200}]},
  D:{label:'Masters 55+, 3,0 W/kg, 7 h/Woche, Radmarathon 150 km / 2.000 Hm in 29 Wochen', ctl0:40,
     d:{goal:'event', eventName:'Radmarathon 150', eventDate:'2027-06-06', dist:150, hm:2000, targetTime:'', fmt:'mara', draft:'grp', ftp:234, weight:78, hours:7, avail:AV([1,3,4,5,6]), longDay:5, strN:2}},
  E:{label:'Wenig Zeit: 4 h/Woche nur Samstag und Sonntag, Event 100 km / 800 Hm in 12 Wochen', ctl0:22,
     d:{goal:'event', eventName:'Frühjahrsklassiker 100', eventDate:'2027-02-07', dist:100, hm:800, targetTime:'', fmt:'mara', draft:'grp', ftp:210, weight:75, hours:4, avail:AV([5,6]), longDay:6}},
  E2:{label:'wie E, mit Option „Intensität statt Umfang“ und 80 km (unter 3 Std.)', ctl0:22,
     d:{goal:'event', eventName:'Frühjahrsklassiker 80', eventDate:'2027-02-07', dist:80, hm:500, targetTime:'', fmt:'mara', draft:'grp', ftp:210, weight:75, hours:4, avail:AV([5,6]), longDay:6, intF:true}}
};
/* Realistischere Belastung einer Einheit aus ihrer Struktur (die App rechnet mit einem festen IF je Typ über die ganze Dauer).
   Rückgabe: Minuten in drei Bereichen (lo ≤ 75 % FTP, mid 76–94 %, hi ≥ 95 %), IF und TSS. Annahmen: Ein-/Ausfahren 60 %,
   lockere Pausen 50 %, Arbeitsphasen in der Mitte des Zielbereichs; Mikrointervalle unter 1 Min. als Mittel der Serie
   (30-Sek.-Glättung der Normalized Power); Grundlage, Long Ride, Rekom, Pendeln: Mitte des Zielbereichs; Long Rides mit
   Tempoanteilen (obere Grenze ≥ 82 %): 25 % der Zeit, höchstens 60 Min., bei 83 %. Renntage: IF = 1 − 0,1·ln(Std.). */
function real(x){
  const z = {lo:0, mid:0, hi:0}, segs = [], add = (m, pct) => { if (m > 0) { segs.push([m, pct]); z[pct <= 75 ? 'lo' : pct < 95 ? 'mid' : 'hi'] += m; } };
  if (!x || !x.m) return {z, IF:0, tss:0};
  const one = (iv, total) => {
    const sets = iv.sets || 1, w = (iv.lo + iv.hi) / 2, r = iv.rlo ? (iv.rlo + iv.rhi) / 2 : 50;
    add(iv.wu, 60);
    if (iv.seq) iv.seq.forEach((m, k) => { add(m, w); if (k < iv.seq.length - 1) add(iv.rest, r); });
    else for (let s = 0; s < sets; s++) {
      if (iv.work < 1 && iv.rest < 1) { const tot = iv.reps * iv.work + (iv.reps - 1) * iv.rest, avg = (iv.reps * iv.work * w + (iv.reps - 1) * iv.rest * r) / tot; add(tot, Math.round(avg * 1.03)); }
      else for (let k = 0; k < iv.reps; k++) { add(iv.work, w); if (k < iv.reps - 1) add(iv.rest, r); }
      if (s < sets - 1) add(iv.sr || 0, 50);
    }
    add(iv.cd, 60); const used = segs.reduce((a, s) => a + s[0], 0); if (total > used + .5) add(total - used, 55);
  };
  if (x.parts) x.parts.forEach(q => { if (q.iv) { const b = segs.length; one(q.iv, q.m); } else add(q.m, ((q.lo || x.lo || 56) + (q.hi || x.hi || 72)) / 2); });
  else if (x.iv) one(x.iv, x.m);
  else if (x.t === 'race' || /^Eventtag/.test(x.n || '')) { const f = Math.max(.6, 1 - .1 * Math.log(Math.max(1, x.m / 60))) * (x.subPrio === 'C' ? .93 : 1); segs.push([x.m, f * 100]); z.mid += x.m * .5; z.hi += x.m * .25; z.lo += x.m * .25; }
  else if (x.t === 'long' && x.hi >= 82) { const t = Math.min(60, x.m * .25); add(t, 83); add(x.m - t, 66); }
  else add(x.m, (x.lo + x.hi) / 2);
  const tot = segs.reduce((a, s) => a + s[0], 0), np = Math.pow(segs.reduce((a, s) => a + s[0] * Math.pow(s[1], 4), 0) / tot, .25) / 100;
  return {z, IF:np, tss:tot / 60 * np * np * 100};
}
async function simulate(key){
  const P = PROFILES[key], a = await boot({now:NOW}); makePlan(a, P.d, P.subs); const w = a.w, $ = a.$;
  const tssF = $("tss"), p = $("S.p"), ph = w.phases(p), tot = ph[ph.length - 1].to, weeks = [], days = [];
  const isHard = x => x && x.m > 0 && (['sst','thr','vo2','race','test'].includes(x.t) || /^Eventtag/.test(x.n || ''));
  const isKey = x => isHard(x) || (x && x.t === 'long' && x.m > 0);
  for (let k = 1; k <= tot; k++) {
    const pl = w.genWeek(p, k), F = ph.find(x => k >= x.from && k <= x.to) || ph[ph.length - 1], pw = w.tbApply(p, k);
    let str = {}; try { str = w.strOf(p, k, pl); } catch (e) { str = {}; }
    const R = pl.map(real), min = pl.reduce((s, x) => s + (x.m || 0), 0), z = R.reduce((s, r) => ({lo:s.lo + r.z.lo, mid:s.mid + r.z.mid, hi:s.hi + r.z.hi}), {lo:0, mid:0, hi:0});
    const ev = pl.findIndex(x => /^Eventtag/.test(x.n || ''));
    pl.forEach((x, i) => days.push({w:k, i, t:x.t, n:x.n, m:x.m || 0, app:x.m ? tssF(x) : 0, real:R[i].tss, hard:isHard(x), key:isKey(x), ev:/^Eventtag/.test(x.n || '') || (x.t === 'race' && x.subPrio === 'A'), str:str[i] ? str[i].kind : ''}));
    weeks.push({w:k, ph:F.key, phName:F.name, rec:(k % 4 === 0 || !!F.rec) && F.key !== 'taper', budget:pw.hours, nDays:pw.avail.filter(Boolean).length, h:min / 60,
      tssApp:pl.reduce((s, x) => s + (x.m ? tssF(x) : 0), 0), tssReal:R.reduce((s, r) => s + r.tss, 0), z, hard:pl.filter(isHard).length, key:pl.filter(isKey).length, rides:pl.filter(x => x.m > 0).length,
      long:Math.max(0, ...pl.filter(x => x.t === 'long' || x.t === 'race').map(x => x.m)), maxSes:Math.max(0, ...pl.map(x => x.m || 0)), test:pl.some(x => x.t === 'test'),
      str:Object.values(str).map(s => s.kind).join('+'), strDays:Object.keys(str).map(Number),
      ses:pl.map((x, i) => (x.m ? `${x.n} ${x.m}′` : '–') + (str[i] ? ' +Kraft' : ''))});
  }
  /* Form (CTL 42 Tage, ATL 7 Tage) wie in der App (vzRows), einmal mit der App-Belastung, einmal mit der Struktur-Schätzung */
  const pmc = f => { let ctl = P.ctl0, atl = P.ctl0; const kC = 1 - Math.exp(-1 / 42), kA = 1 - Math.exp(-1 / 7); return days.map(d => { const tsb = ctl - atl; ctl += (d[f] - ctl) * kC; atl += (d[f] - atl) * kA; return {ctl, atl, tsb}; }); };
  const A = pmc('app'), Rr = pmc('real');
  weeks.forEach((W, k) => { const e = k * 7 + 6, b = k ? k * 7 - 1 : -1; W.ctlApp = A[e].ctl; W.ctlReal = Rr[e].ctl; W.rampApp = A[e].ctl - (b < 0 ? P.ctl0 : A[b].ctl); W.rampReal = Rr[e].ctl - (b < 0 ? P.ctl0 : Rr[b].ctl); W.tsbMinApp = Math.min(...A.slice(k * 7, k * 7 + 7).map(r => r.tsb)); W.tsbMinReal = Math.min(...Rr.slice(k * 7, k * 7 + 7).map(r => r.tsb)); });
  const evs = days.map((d, i) => d.ev ? {w:d.w, i:d.i, n:d.n, tsbApp:A[i].tsb, tsbReal:Rr[i].tsb, ctlApp:A[i].ctl, ctlReal:Rr[i].ctl, peakApp:Math.max(...A.slice(0, i + 1).map(r => r.ctl)), peakReal:Math.max(...Rr.slice(0, i + 1).map(r => r.ctl))} : null).filter(Boolean);
  /* harte Tage in Folge (auch über die Wochengrenze), Schlüsseltage in Folge, Kraft am Tag vor einer harten Einheit */
  let hh = 0, kk = 0, sBefore = 0, sSame = 0, sN = 0; const pairs = [];
  days.forEach((d, i) => { const n = days[i + 1]; if (n && d.hard && n.hard) { hh++; pairs.push(`W${d.w} ${d.n} → ${n.n}`); } if (n && d.key && n.key) kk++; if (d.str) { sN++; if (n && n.hard) sBefore++; if (d.hard) sSame++; } });
  let st = null, pc = null, fc = null, ec = null;
  try { st = w.planStats(p); } catch (e) {}
  try { const c = w.planCheck(p, false); pc = {verdict:c.verdict, notes:(c.notes || []).map(n => String(n.t).replace(/<[^>]+>/g, ''))}; } catch (e) { pc = {err:String(e)}; }
  try { ec = w.evCheck(p); if (ec) ec = {ftpNeed:ec.ftpNeed, real:ec.real, verdict:ec.verdict, kmh:ec.kmh, np:ec.np, P:ec.P}; } catch (e) {}
  try { fc = w.seasonForecast(p).map(o => ({name:o.name, date:o.date, prio:o.prio, kind:o.kind, ftp:o.ftp, ftpLo:o.ftpLo, ftpHi:o.ftpHi, t:o.t, tAmb:o.tAmb, kmh:o.kmh})); } catch (e) { fc = {err:String(e)}; }
  const pj = [4, 8, 12, 24, tot].map(n => { const r = w.ftpProj(p, st ? st.hAvg : p.hours, n); return {weeks:n, lo:r.lo, mid:r.mid, hi:r.hi}; });
  const prof = w.evProfile(p);
  a.noErrors('Simulation ' + key);
  return {key, label:P.label, ctl0:P.ctl0, start:p.start, startDate:p.startDate, tot, phases:ph.map(x => ({key:x.key, name:x.name, from:x.from, to:x.to})), testWeeks:w.testWeeks(p), stats:st, planCheck:pc, evCheck:ec, forecast:fc, ftpProj:pj,
    evProfile:prof ? {ty:prof.ty, race:prof.race, tev:prof.tev, lbP:prof.lbP, sc:prof.sc} : null, consec:{hardHard:hh, keyKey:kk, pairs:pairs.slice(0, 40)}, strength:{n:sN, dayBeforeHard:sBefore, sameDayHard:sSame}, events:evs, weeks};
}
(async () => {
  const log = document.getElementById('log'), out = {};
  for (const k of Object.keys(PROFILES)) { try { out[k] = await simulate(k); log.textContent += `${k}: ${out[k].tot} Wochen\n`; } catch (e) { out[k] = {err:String(e && e.stack || e)}; log.textContent += `${k}: FEHLER ${e}\n`; } }
  const r = await fetch('/tools/audit/out/simulation.json', {method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(out)});
  log.textContent += r.ok ? 'gespeichert: tools/audit/out/simulation.json\n' : 'Speichern fehlgeschlagen: ' + r.status + '\n'; window.AUDIT_DONE = r.ok; window.AUDIT = out;
})();
