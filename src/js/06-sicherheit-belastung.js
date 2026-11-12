/* ---------- Audit 12.11.2026, M9: Gesundheitshinweis und Warnung bei anhaltender Überlastung ----------
   Gesundheitshinweis: einmal auf der Startseite bis zur Bestätigung, danach jederzeit unter Einstellungen → Gesundheitshinweis
   (Empfehlungen zur sportmedizinischen Vorsorge: DGSP-Leitlinie Vorsorgeuntersuchung im Sport; ESC-Leitlinie Sportkardiologie 2020).
   Überlastung: Hinweis, wenn mindestens zwei Zeichen zusammenkommen. Übertraining lässt sich nicht an einem einzelnen Wert festmachen
   (Meeusen et al. 2013, ECSS/ACSM), darum zählt die Kombination. Zeichen: Form an 10 von 14 Tagen unter −25; an 4 von 10 Tagen „müde“ oder
   „platt“; zwei harte Einheiten in 14 Tagen unter Soll; an 3 der letzten 5 Tage auffällige Morgenwerte (Ruhepuls ab +5, schlechter Schlaf). */
const HLTH_T = ['Relentless ersetzt keine ärztliche Beratung.', 'Lass dich vor dem Start ärztlich untersuchen, wenn du Vorerkrankungen hast (zum Beispiel Herz, Kreislauf, Blutdruck, Diabetes), regelmäßig Medikamente nimmst, länger keinen Sport gemacht hast oder ab etwa 35 Jahren neu mit intensivem Training beginnst.', 'Hör sofort auf und hol ärztlichen Rat bei Schmerzen oder Druck in der Brust, ungewöhnlicher Atemnot, Herzstolpern oder Herzrasen, Schwindel oder Ohnmacht.', 'Mit Fieber oder einem Infekt mit Gliederschmerzen nicht trainieren.'];
function hlthBody(){ return `<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">${HLTH_T.map(t => `<li>${t}</li>`).join('')}</ul><p class="mt-2 text-xs" style="color:var(--mute)">Grundlage: Empfehlungen zur sportmedizinischen Vorsorgeuntersuchung (DGSP) und die Leitlinie Sportkardiologie der Europäischen Gesellschaft für Kardiologie (2020).</p>`; }
function hlthCard(){ if (S.hlthOk) return ''; return `<section class="panel p-4" style="border-left:4px solid var(--teal)"><p class="font-semibold">Bevor du loslegst</p>${hlthBody()}<button class="btn mt-3 !w-auto !px-4" style="min-height:44px" onclick="S.hlthOk=iso(0);save();render()">Verstanden</button></section>`; }
function hlthPage(){ return `<section class="panel p-4"><p class="font-semibold">Gesundheitshinweis</p>${hlthBody()}${S.hlthOk ? `<p class="mt-2 text-xs" style="color:var(--mute)">Bestätigt am ${fmt(S.hlthOk)}.</p>` : ''}</section>`; }
function ovlSignals(){
  const p = S.p, out = []; if (!p || !hasStarted(p)) return out; const today = iso(0);
  try { const R = vzRows(); if (R) { const L = R.rows.filter(r => r.day <= today && r.day > iso(-14)); if (L.length >= 10 && L.filter(r => r.tsb < -25).length >= 10) out.push('Deine Form lag an mindestens 10 der letzten 14 Tage unter −25.'); } } catch (e) { elog(e); }
  try { const days = []; (S.plan || []).forEach((x, i) => { if (x && (x.feel === 'tired' || x.feel === 'heavy')) days.push(dstr(i)); });
    if (S.prevPlan && S.prevPlan.plan) S.prevPlan.plan.forEach((x, i) => { if (x && (x.feel === 'tired' || x.feel === 'heavy')) days.push(addD(p.start, (S.prevPlan.w - 1) * 7 + i)); });
    if (days.filter(d => d > iso(-10) && d <= today).length >= 4) out.push('Du warst in den letzten 10 Tagen an 4 oder mehr Tagen müde oder platt.'); } catch (e) { elog(e); }
  try { if (Object.values(p.exe || {}).filter(v => v && v.verdict === 'under' && Date.now() - v.at < 14 * 864e5).length >= 2) out.push('Zwei harte Einheiten in 14 Tagen liefen nicht wie geplant.'); } catch (e) { elog(e); }
  try { const st = morStat(), mo = S.mo || {}; let n = 0; for (let k = 0; k < 5; k++) { const v = mo[iso(-k)]; if (v && ((st.hrBase && v.hr >= st.hrBase + 5) || v.sleep === 'bad')) n++; } if (n >= 3) out.push('An 3 der letzten 5 Tage waren deine Morgenwerte auffällig.'); } catch (e) { elog(e); }
  return out;
}
function ovlCard(){
  const p = S.p; if (!p || (S.ovlSeen && S.ovlSeen > iso(-7)) || (p.recW || []).includes(S.wk + 1)) return '';
  const L = ovlSignals(); if (L.length < 2) return '';
  return `<section class="panel p-4" style="border-left:4px solid #d9a400"><p class="font-semibold">Viel Belastung, wenig Erholung</p><ul class="mt-1 list-disc space-y-1 pl-5 text-sm">${L.map(t => `<li>${t}</li>`).join('')}</ul><p class="mt-2 text-sm">Zusammen kann das ein Zeichen sein, dass die Erholung nicht mehr mitkommt. Eine Erholungswoche hilft meistens. Halten Müdigkeit, Leistungseinbruch oder gedrückte Stimmung trotzdem an, sprich mit einer Ärztin oder einem Arzt.</p>
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-3" style="min-height:44px" onclick="S.ovlSeen=iso(0);addRecW()">Erholungswoche einlegen</button><button class="ghost !w-auto !px-3" style="min-height:44px" onclick="S.ovlSeen=iso(0);save();render()">In einer Woche wieder prüfen</button></div></section>`;
}
