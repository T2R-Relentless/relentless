/* ---------- Audit 12.11.2026, M7: Alter, Wochenrhythmus und Abstand zwischen harten Einheiten ----------
   Geburtsjahr (freiwillig) → Alter. Ab 50 Jahren schlägt die App in der Planung einen ruhigeren Rhythmus vor:
   2 Wochen Belastung und 1 Woche Entlastung (statt 3:1) und mehr Abstand zwischen harten Einheiten. Beides kann jede
   und jeder selbst wählen, unabhängig vom Alter. Die Studienlage zur langsameren Erholung im Alter ist nicht eindeutig
   (Borges et al. 2016; Fell & Williams 2008), darum ist es ein Vorschlag und keine feste Regel.
   Im Plan gespeichert: birthYear, dazu rhythm ('3:1' | '2:1') und gap2 (true/false) nur bei eigener Wahl; ohne Wahl gilt der
   Vorschlag nach Alter (rhyOf, gapOf). Bestehende Pläne ohne Geburtsjahr bleiben unverändert (3:1, normaler Abstand). Das
   Geburtsjahr lässt sich nur in der Planung bzw. über „Plan anpassen“ eintragen, eine Änderung braucht also die Zustimmung. */
const AGE_M = 50;
const ageOf = p => { const y = Math.round(Number(p && p.birthYear)), now = new Date().getFullYear(); return y >= 1920 && y <= now - 10 ? now - y : 0; };
/* Länge eines Blocks in Wochen: 4 bei 3:1, 3 bei 2:1 */
const rhyN = p => p && rhyOf(p) === '2:1' ? 3 : 4;
const recWk = (p, w) => w % rhyN(p) === 0;
const rampOf = (p, w) => (rhyN(p) === 3 ? [.94, 1, .65] : [.88, .94, 1, .65])[(w - 1) % rhyN(p)];
/* laufende Nummer der Belastungswoche (Entlastungswochen nicht mitgezählt) */
const loadWk = (p, w) => w - Math.floor(w / rhyN(p));
/* Im Entwurf: gewählter Wert, sonst der Vorschlag nach Alter */
const rhyOf = d => d.rhythm === '2:1' || d.rhythm === '3:1' ? d.rhythm : ageOf(d) >= AGE_M ? '2:1' : '3:1';
const gapOf = d => d.gap2 === true || d.gap2 === false ? d.gap2 : ageOf(d) >= AGE_M;
function setAge(v){ const y = Math.round(Number(v)), now = new Date().getFullYear(); if (y >= 1920 && y <= now - 10) S.d.birthYear = y; else delete S.d.birthYear; save(); render(); }
function setRhy(v){ S.d.rhythm = v === '2:1' ? '2:1' : '3:1'; save(); render(); }
function setGap(v){ S.d.gap2 = !!v; save(); render(); }
function ageUi(d, light){
  const a = ageOf(d), r = rhyOf(d), g = gapOf(d), old = a >= AGE_M, now = new Date().getFullYear();
  return `<div><p class="mb-2 ${esc(light ? 'text-sm' : 'font-semibold')}" style="${esc(light ? 'color:var(--mute)' : '')}">Alter und Erholung (optional)</p>
    <div class="grid grid-cols-2 items-end gap-3">${field('Geburtsjahr', `<input type="number" inputmode="numeric" min="1920" max="${esc(now - 10)}" class="inp" style="min-height:44px" placeholder="z. B. 1975" value="${esc(d.birthYear || '')}" onchange="setAge(this.value)">`)}${a ? `<p class="pb-3 text-sm">Alter: <b>${a} Jahre</b></p>` : ''}</div>
    <p class="mt-3 mb-2 text-sm" style="color:var(--mute)">Wochenrhythmus</p><div class="flex flex-wrap gap-2">${chip('3 Wochen Belastung, 1 Woche Entlastung', r === '3:1', "setRhy('3:1')")}${chip('2 Wochen Belastung, 1 Woche Entlastung', r === '2:1', "setRhy('2:1')")}</div>
    <p class="mt-3 mb-2 text-sm" style="color:var(--mute)">Abstand zwischen harten Einheiten</p><div class="flex flex-wrap gap-2">${chip('Normal', !g, 'setGap(false)')}${chip('Mehr Abstand', g, 'setGap(true)')}</div>
    ${old ? `<p class="mt-3 p-2.5 text-sm" style="background:var(--tint);border:1px solid var(--line)">${r === '2:1' && g ? 'Für dein Alter vorgeschlagen und eingestellt: jede dritte Woche Entlastung und mehr Abstand zwischen harten Einheiten.' : 'Für dein Alter schlägt die App vor: jede dritte Woche Entlastung und mehr Abstand zwischen harten Einheiten. Du hast etwas anderes gewählt, das ist in Ordnung.'}${!light && !(d.strN > 0) ? ' Krafttraining ist ab 50 besonders wertvoll, weil es Muskelmasse und Kraft erhält. Du kannst es in der Planung dazunehmen.' : ''}</p>` : ''}
    <p class="mt-2 text-xs" style="color:var(--mute)">Mit den Jahren braucht der Körper nach harten Einheiten meist länger, um sich zu erholen. Mit mehr Abstand legt die App harte Einheiten möglichst so, dass zwei lockere Tage dazwischen liegen. Die Studienlage dazu ist nicht eindeutig, darum entscheidest du selbst. Die Intensität der Einheiten bleibt gleich. Die Angabe bleibt nur auf deinem Gerät.</p></div>`;
}
