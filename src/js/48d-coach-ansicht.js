/* ---------- F39 (18b): Persönlicher Coach, Teil 4: Karte auf Heute und Einstellungen ----------
   Standardmäßig aus (S.coach fehlt oder on:false, ältere Sicherungen laden unverändert). Der Bericht entsteht bei jedem
   Aufbau der Startseite neu (V-5); „Neu formulieren“ nimmt einmal pro Tag andere Varianten. Höchstens ein Vorschlag pro
   Tag, nur per Knopf, mit Schnappschuss und „Rückgängig“ (coTake). Verlauf: höchstens 7 Kurzformen zu je 120 Zeichen.
   Speicher S.coach = {on, name, ton, hist, lv (letzte Variante je Tabelle), alt (Neu formulieren), act (Knopf heute),
   inj {last, ok}, r01 (letzter Tag im ruhigen Modus wegen R0/R1), r10w}. Kein Server, keine Daten nach außen. */
const CO_TONL = {kumpel:['Kumpel mit trockenem Humor', 'Locker, mit einem Augenzwinkern'], antreiber:['Frecher Antreiber', 'Direkt und fordernd, nie bei Krankheit oder Schmerzen'], sachlich:['Sachlicher Trainer', 'Kurz und nüchtern, mit Begründung']};
const CO_IC = '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9h8M8 12h5"/>';
/* Verlauf und Variantenstand für heute festhalten (nur bei Änderung speichern) */
function coCommit(pk, r, rep){
  const c = S.coach; if (!c) return; const today = iso(0), before = JSON.stringify([c.hist, c.lv, c.r01]);
  const kurz = `${pk.wochentag} | ${r.id}${pk.form && pk.form.frische != null ? ' F' + coFS(pk.form.frische) : ''}${rep.anr ? ' A:' + rep.anr : ''} | Spruch: ${rep.spruch || '–'}`.slice(0, 120);
  const H = (Array.isArray(c.hist) ? c.hist : []).filter(h => !String(h).startsWith(pk.wochentag + ' |')); c.hist = [...H, kurz].slice(-7);
  c.lv = {...(c.lv || {}), ...rep.used};
  if (/^R0|^R1/.test(r.id)) c.r01 = today;
  if (JSON.stringify([c.hist, c.lv, c.r01]) !== before) { try { save(); } catch (e) { elog(e); } }
}
function coBtn(kn, main){ return `<button class="${main ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="coTake('${ja(kn)}')">${CO_KN[kn]}</button>`; }
function coCard(){
  if (!coOn() || !coMemo || !coMemo.r) return '';
  const {pk, r, rep} = coMemo; if (!rep) return '';
  try { coCommit(pk, r, rep); } catch (e) { elog(e); }
  const today = iso(0), c = S.coach || {}, done = pk._i.act && !/^R0/.test(r.id), L = pk.sprache;
  let btns = '';
  if (pk._i.act && pk._i.act.k === 'ack' && /^R0[ke]/.test(r.id)) btns = '';
  else if (r.kn === 'feel') btns = coBtn('feel', true);
  else if (r.kn === 'ack') btns = done || (pk._i.act && pk._i.act.k === 'ack') ? '' : coBtn('ack', false);
  else if (r.kn && !(done && CO_PLAN.includes(r.kn))) btns = coBtn(r.kn, true) + (r.kn2 ? '' : coBtn('keep', false));
  if (r.kn2 && !(c.inj && c.inj.ok === today) && !(pk._i.act && pk._i.act.k === 'ack' && /^R0[ke]/.test(r.id))) btns += coBtn(r.kn2, !r.kn);
  const alt = !rep.calm && !(c.alt && c.alt.d === today);
  const p = (t, st) => t ? `<p class="mt-2 text-sm" style="${st || ''}">${esc(t)}</p>` : '';
  return `<section class="panel p-4" id="fx-cocard" style="border-left:4px solid ${esc(rep.calm ? '#d9a400' : 'var(--teal)')}"><div class="flex items-center gap-2"><span aria-hidden="true" style="color:var(--teal);display:flex">${svgI(CO_IC, 22)}</span><p class="min-w-0 flex-1 font-semibold">Dein Coach</p>${alt ? `<button class="text-sm font-semibold" style="background:none;border:0;color:var(--teal);min-height:44px;padding:0 4px" onclick="coAlt()">Neu formulieren</button>` : ''}</div>
    <div data-noi18n lang="${esc(L)}">${p(rep.insight)}${p(rep.einheit)}${p(rep.spruch, 'font-style:italic;color:var(--mute)')}</div>
    ${btns ? `<div class="mt-3 flex flex-wrap gap-2">${btns}</div>` : ''}${coMsg ? `<p class="mt-2 text-sm" role="status" style="color:#9a6a00">${esc(coMsg)}</p>` : ''}</section>`;
}
function coAlt(){ S.coach = S.coach || {on:false}; S.coach.alt = {d:iso(0), n:1}; save(); render(); }
/* ---------- Einstellungen ---------- */
function coSet(k, v){
  S.coach = S.coach || {on:false};
  if (k === 'on') S.coach.on = !!v;
  else if (k === 'name') S.coach.name = String(v || '').replace(/[^\p{L}\p{M} .’'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  else if (k === 'ton' && CO_TON.includes(v)) S.coach.ton = v;
  if (k === 'on' && v && !S.coach.ton) S.coach.ton = 'kumpel';
  save(); render();
}
function coSetRow(){ const c = S.coach || {}; return iaRow('set-coach', 'coach', 'Persönlicher Coach', c.on ? `An · ${CO_TONL[CO_TON.includes(c.ton) ? c.ton : 'kumpel'][0]}` : 'Aus'); }
function coSetPage(){
  const c = S.coach || {}, on = !!c.on, ton = CO_TON.includes(c.ton) ? c.ton : 'kumpel';
  return `<section class="panel p-4" id="fx-coach"><p class="text-sm" style="color:var(--mute)">Der Coach schreibt dir auf Heute jeden Tag drei kurze Absätze: was sich bei dir tut, was heute ansteht und einen Spruch. Spricht etwas gegen die Einheit, schlägt er eine Änderung vor. Den Plan ändert er nur, wenn du auf den Knopf tippst, und du kannst es rückgängig machen.</p>
    <label class="mt-3 flex items-center gap-3 font-semibold" style="min-height:44px"><input id="coOn" type="checkbox" style="width:22px;height:22px" ${on ? 'checked' : ''} onchange="coSet('on', this.checked)"> Coach auf Heute zeigen</label>
    <div class="mt-3">${field('Vorname (optional)', `<input id="coName" class="inp" maxlength="30" autocomplete="given-name" value="${esc(c.name || '')}" placeholder="z. B. Alex" onchange="coSet('name', this.value)">`)}</div>
    <p class="mt-4 text-sm font-semibold">Ton</p><div class="mt-2 grid gap-2">${CO_TON.map(k => `<button class="feelo${esc(ton === k ? ' on' : '')}" style="min-height:44px" aria-pressed="${ton === k}" onclick="coSet('ton', '${ja(k)}')"><b>${CO_TONL[k][0]}</b><span>${CO_TONL[k][1]}</span></button>`).join('')}</div>
    <p class="mt-3 text-xs" style="color:var(--mute)">Der Coach rechnet nur auf deinem Gerät, es verlassen keine Daten das Gerät. Form und Fitness beschreibt er in Worten. Bei Krankheit oder Schmerzen gibt es keine Sprüche und keinen Leistungsdruck, nur einen ruhigen Hinweis zur Erholung.</p></section>`;
}
SET_PAGES['set-coach'] = () => coSetPage();
SET_T['set-coach'] = 'Persön&shy;licher Coach'; /* bricht bei 320 pt sauber um */
IA_PAR['set-coach'] = 'settings';
IA_ICO.coach = CO_IC;
DYK_AT.coach = ['set-coach', 'fx-coach', '#coOn'];
