/* ---------- Audit 12.11.2026, M14: Training bei Hitze ----------
   Ab etwa 28 °C in der Trainingszeit (Vorhersage) zeigt die Startseite vor einer harten oder langen Einheit Hinweise: früh oder spät fahren,
   Intensität etwas senken (der Puls liegt bei gleicher Leistung höher), mehr trinken mit Salz, Warnzeichen kennen. Die Einheit lässt sich auf
   einen kühleren Tag verschieben (F9, mit Prüfung). Grundlage: Racinais et al. 2015 (Konsens zu Training und Wettkampf bei Hitze),
   Périard et al. 2021. */
const HEAT_T = 28;
function heatCard(){
  const p = S.p; if (!p || !S.plan || !hasStarted(p) || S.heatSeen === iso(0)) return '';
  const t = todayIdx(), x = S.plan[t]; if (!x || !x.m || S.done[t] || !(HARD.includes(x.t) || x.t === 'test' || x.t === 'long' || x.t === 'race')) return '';
  let w = null; try { w = wxDay(iso(0), t, x); } catch (e) { elog(e); } if (!w || w.src !== 'api' || !(w.tmax >= HEAT_T)) return '';
  const mv = x.t !== 'race' && !/^Eventtag/.test(x.n || '');
  return `<section class="panel p-4" style="border-left:4px solid #c2410c"><p class="font-semibold">Heute wird es heiß: bis ${Math.round(w.tmax)} °C</p><ul class="mt-1 list-disc space-y-1 pl-5 text-sm"><li>Wenn möglich früh am Morgen oder am Abend fahren.</li><li>Die Intensität etwa 5 % niedriger ansetzen oder nach Gefühl fahren. Der Puls liegt bei gleicher Leistung höher.</li><li>Pro Stunde 500 bis 1000 ml trinken, mit Salz (Elektrolyte).</li><li>Bei Schwindel, Kopfschmerz, Gänsehaut oder Übelkeit sofort abbrechen, in den Schatten und trinken.</li></ul>
    <div class="mt-3 flex flex-wrap gap-2">${mv ? `<button class="btn !w-auto !px-3" style="min-height:44px" onclick="mvAskGo(${ja(t)})">Auf einen anderen Tag legen</button>` : ''}<button class="ghost !w-auto !px-3" style="min-height:44px" onclick="S.heatSeen=iso(0);save();render()">Verstanden</button></div></section>`;
}
