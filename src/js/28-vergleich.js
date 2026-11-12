/* ---------- F21: „Wusstest du schon?“ – Vergleich mit dem Durchschnitt und mit dir selbst ----------
   Referenzwerte (CMP_REF) mit Quelle und Sicherheit. Die Vergleichsgruppe wählt der Nutzer (Einstellungen → Gewicht und
   FTP: Männer, Frauen, keine Angabe); ohne Wahl gilt die Angabe „Geschlecht“ aus der Planung, sonst „keine Angabe“
   (Erwachsene allgemein, keine geschlechtsbezogenen Sätze). Nichts wird erraten.
   Ton: ermutigend und ehrlich, gerundete Werte mit „etwa“. Liegt die eigene FTP unter dem Wert untrainierter Erwachsener,
   steht der eigene Fortschritt im Vordergrund statt des Vergleichs.
   Wiederholung wie bei den Tipps (F20): ein Vergleich erscheint frühestens nach 60 Tagen wieder (S.cmp). */
const CMP_REF = {
  /* FTP in W/kg: untere Grenzen der Kategorien der Leistungsprofil-Tabelle nach Coggan. Sicherheit: mittel – eine
     Erfahrungstabelle aus der Trainingspraxis, keine repräsentative Bevölkerungsstudie. */
  cat:{src:'Allen H, Coggan A: Training and Racing with a Power Meter (Power Profile, FTP W/kg); Sicherheit mittel',
    m:[[0, 'untrainiert', 'untrained'], [2.6, 'Einsteiger', 'fair'], [3.1, 'Freizeitsportler', 'moderate'], [3.6, 'gut trainiert', 'good'], [4.2, 'sehr gut trainiert', 'very good'], [4.7, 'Amateur-Elite', 'excellent'], [5.3, 'nationale Spitze', 'exceptional'], [5.8, 'Weltklasse', 'world class']],
    f:[[0, 'untrainiert', 'untrained'], [2.1, 'Einsteigerin', 'fair'], [2.6, 'Freizeitsportlerin', 'moderate'], [3.1, 'gut trainiert', 'good'], [3.6, 'sehr gut trainiert', 'very good'], [4.1, 'Amateur-Elite', 'excellent'], [4.6, 'nationale Spitze', 'exceptional'], [5.2, 'Weltklasse', 'world class']]},
  /* Mitte der Kategorie „untrainiert“ (Coggan: Männer etwa 1,9–2,6, Frauen 1,5–2,1 W/kg); Erwachsene allgemein = Mittel.
     Sicherheit: niedrig bis mittel (breite Spanne, abhängig von Alter und Gewicht). */
  untr:{m:2.2, f:1.8, a:2.0, src:'Coggan Power Profile, Kategorie „untrained“ (Mitte der Spanne); Sicherheit niedrig bis mittel'}
};
/* Luftlinien zwischen Städten (Koordinaten, Abstand per Haversine; Sicherheit hoch) */
const CMP_CITY = {Köln:[50.94, 6.96], München:[48.14, 11.58], Hamburg:[53.55, 9.99], Berlin:[52.52, 13.40], Frankfurt:[50.11, 8.68], Stuttgart:[48.78, 9.18], Düsseldorf:[51.23, 6.78], Leipzig:[51.34, 12.37], Dresden:[51.05, 13.74], Hannover:[52.37, 9.74], Nürnberg:[49.45, 11.08], Bremen:[53.08, 8.80], Wien:[48.21, 16.37], Zürich:[47.37, 8.54], Paris:[48.86, 2.35], Rom:[41.90, 12.50], Kopenhagen:[55.68, 12.57], Mailand:[45.46, 9.19], Amsterdam:[52.37, 4.90], Bonn:[50.74, 7.10]};
const CMP_EN = {Köln:'Cologne', München:'Munich', Wien:'Vienna', Zürich:'Zurich', Rom:'Rome', Kopenhagen:'Copenhagen', Mailand:'Milan', Nürnberg:'Nuremberg', Hannover:'Hanover'};
const CMP_PAIRS = [['Köln', 'Bonn'], ['Düsseldorf', 'Köln'], ['Köln', 'Frankfurt'], ['Leipzig', 'Dresden'], ['Hamburg', 'Bremen'], ['Hamburg', 'Hannover'], ['Stuttgart', 'München'], ['Berlin', 'Leipzig'], ['Frankfurt', 'Nürnberg'], ['Hamburg', 'Berlin'], ['Köln', 'Hamburg'], ['Köln', 'München'], ['Hamburg', 'München'], ['Berlin', 'Wien'], ['Köln', 'Wien'], ['Hamburg', 'Zürich'], ['Paris', 'Wien'], ['Hamburg', 'Rom'], ['Kopenhagen', 'Rom']];
const cmpKm = (a, b) => { const A = CMP_CITY[a], B = CMP_CITY[b], R = 6371, r = Math.PI / 180, q = Math.sin((B[0] - A[0]) * r / 2) ** 2 + Math.cos(A[0] * r) * Math.cos(B[0] * r) * Math.sin((B[1] - A[1]) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); };
/* Vergleichsgruppe: ausdrücklich gewählt (cmpG), sonst „Geschlecht“ aus der Planung, sonst keine */
const cmpGroup = p => { p = p || S.p || {}; const g = p.cmpG != null ? p.cmpG : p.sex; return g === 'm' || g === 'f' ? g : ''; };
function cmpSetG(g){ ['p', 'd'].forEach(k => { if (S[k]) S[k].cmpG = g; }); save(); render(); }
const cmpR = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('de-DE');
const cmpRe = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('en-GB');
/* Kategorie zur W/kg (nur mit Vergleichsgruppe) */
function cmpCat(wkg, g){ const T = CMP_REF.cat[g]; if (!T) return null; let c = T[0]; T.forEach(x => { if (wkg >= x[0]) c = x; }); return c; }
/* Alle Vergleichssätze für den Moment: [{id, de, en, go}] */
function cmpFacts(p){
  p = p || S.p; if (!p) return []; const out = [], g = cmpGroup(p), kg = kgOf(p), ftp = p.ftp > 0 ? p.ftp : 0, wkg = ftp && kg ? ftp / kg : 0;
  const ref = CMP_REF.untr[g || 'a'], above = wkg >= ref * 1.05;
  if (wkg && above) {
    const pct = Math.round((wkg / ref - 1) * 10) * 10, who = g === 'm' ? ['ein untrainierter Mann', 'an untrained man'] : g === 'f' ? ['eine untrainierte Frau', 'an untrained woman'] : ['untrainierte Erwachsene im Mittel', 'untrained adults on average'];
    if (pct >= 10) out.push({id:'cmp-wkg', de:`Mit ${cmpR(wkg)} W/kg trittst du etwa ${pct} % mehr als ${who[0]} (etwa ${cmpR(ref)} W/kg).`, en:`At ${cmpRe(wkg)} W/kg you put out about ${pct}% more than ${who[1]} (about ${cmpRe(ref)} W/kg).`, go:'set-wf'});
    const c = g && cmpCat(wkg, g); if (c && c[0] > 0) out.push({id:'cmp-cat', de:`Deine FTP von ${cmpR(wkg)} W/kg liegt im Bereich „${c[1]}“ der Leistungsprofil-Tabellen für ${g === 'm' ? 'Männer' : 'Frauen'}.`, en:`Your FTP of ${cmpRe(wkg)} W/kg falls into the “${c[2]}” range of the power profile tables for ${g === 'm' ? 'men' : 'women'}.`, go:'set-wf'});
  }
  /* Mit sich selbst: FTP seit Planstart */
  const f0 = p.ftpStart > 0 ? p.ftpStart : 0, gain = ftp && f0 ? Math.round(ftp - f0) : 0;
  if (gain >= 3) out.push({id:'cmp-ftp', de:`+${gain} W FTP seit Planstart${kg ? `, das sind ${cmpR(gain / kg, 2)} W/kg mehr` : ''}.`, en:`+${gain} W FTP since the start of your plan${kg ? `, that is ${cmpRe(gain / kg, 2)} W/kg more` : ''}.`, go:'set-wf'});
  /* Strecke diesen Monat als Luftlinie zwischen Städten */
  let km = 0; try { const s = lbSums('m', {roll:true, all:false}), k = iso(0).slice(0, 7); km = s[k] ? s[k].km : 0; } catch (e) { elog(e); }
  if (km >= 25) { const L = CMP_PAIRS.map(([a, b]) => ({a, b, d:cmpKm(a, b)})).filter(x => x.d <= km).sort((x, y) => y.d - x.d)[0];
    if (L) { const ea = CMP_EN[L.a] || L.a, eb = CMP_EN[L.b] || L.b;
      out.push({id:'cmp-km', de:`Du bist diesen Monat ${Math.round(km).toLocaleString('de-DE')} km gefahren, so weit wie von ${L.a} nach ${L.b} (Luftlinie, etwa ${Math.round(L.d / 10) * 10} km).`, en:`You have ridden ${Math.round(km).toLocaleString('en-GB')} km this month, as far as from ${ea} to ${eb} (as the crow flies, about ${Math.round(L.d / 10) * 10} km).`, go:'logbook'}); } }
  /* Fortschritt in Einheiten, wenn sonst wenig zu vergleichen ist oder die Leistung unter dem Durchschnitt liegt */
  let n = 0; try { n = Object.values(S.lb || {}).filter(l => l && l.pid === S.pid && (l.k === 'p' || l.k === 's')).length + Object.keys(S.done || {}).filter(k => S.done[k]).length; } catch (e) { elog(e); }
  if (n >= 3 && (!above || !out.length)) out.push({id:'cmp-done', de:`Du hast schon ${n} Einheiten deines Plans geschafft. Jede davon macht dich fitter als beim Start.`, en:`You have already completed ${n} sessions of your plan. Each one makes you fitter than when you started.`, go:'logbook'});
  return out;
}
/* Einträge für „Wusstest du schon?“: wie DYK-Zeilen [id, Text, Knopf, Aktion, Bedingung], dazu .en und .go;
   ein Vergleich erscheint frühestens nach 60 Tagen wieder (S.cmp: id → Tag der letzten Anzeige) */
function cmpDyk(){
  let F = []; try { F = cmpFacts(S.p); } catch (e) { elog(e); return []; }
  const seen = (S.cmp && typeof S.cmp === 'object') ? S.cmp : {}, today = iso(0), cur = (dykGet() || {}).cur;
  return F.filter(f => f.id === cur || !seen[f.id] || (dOnly(today) - dOnly(seen[f.id])) / 864e5 >= 60).map(f => { const t = [f.id, f.de, f.go === 'logbook' ? 'Logbuch' : 'Gewicht und FTP', '', () => true]; t.en = f.en; t.go = f.go; t.fact = 1; return t; });
}
function cmpShown(id){ if (!/^cmp-/.test(id)) return; S.cmp = S.cmp && typeof S.cmp === 'object' ? S.cmp : {}; if (S.cmp[id] !== iso(0)) { S.cmp[id] = iso(0); setTimeout(() => { try { save(); } catch (e) { elog(e); } }, 0); } }
function cmpGo(k){ try { track('tipp-genutzt'); } catch (e) { elog(e); } if (k === 'set-wf') { goPg('settings'); goPg('set-wf'); } else goPg(k); }
/* Einstellung: Vergleichsgruppe */
function cmpUi(){
  const p = S.p || S.d || {}, g = p.cmpG != null ? p.cmpG : '';
  return `<section class="panel p-4"><p class="font-semibold">Vergleichsgruppe</p><p class="mt-1 text-sm" style="color:var(--mute)">Für Vergleiche wie „du trittst etwa 40 % mehr als ein untrainierter Erwachsener“ in „Wusstest du schon?“. Freiwillig. Ohne Angabe vergleicht die App mit Erwachsenen allgemein${p.sex === 'm' || p.sex === 'f' ? ', solange du hier nichts wählst gilt deine Angabe aus der Planung' : ''}.</p>
    <div class="mt-3 flex flex-wrap gap-2">${chip('Männer', g === 'm', "cmpSetG('m')")}${chip('Frauen', g === 'f', "cmpSetG('f')")}${chip('Keine Angabe', g === '', "cmpSetG('')")}</div></section>`;
}
