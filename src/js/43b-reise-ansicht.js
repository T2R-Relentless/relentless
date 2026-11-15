/* ---------- F29: Reisemodus – Oberfläche ----------
   Alle Karten stehen in data-noi18n-Bereichen und wählen ihre Texte selbst (wkL), Namen von Einheiten laufen durch trTxt.
   Bei ausgeschaltetem Reisemodus liefert jede Funktion hier eine leere Zeichenkette, außer der Zeile in den Einstellungen
   (dort wird eingeschaltet) und der Frage in der Planerstellung. */
Object.assign(IC_P, {
  plane:'<path d="M3 13.5l18-7-5.5 13-3.2-5.3z"/><path d="M12.3 14.2L21 6.5"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/>',
  bed:'<path d="M3 18v-8M3 14h18v4M21 14v-1.5a3 3 0 0 0-3-3h-7V14"/><circle cx="7" cy="11" r="1.6"/>'
});
IA_ICO.rz = '<path d="M3 13.5l18-7-5.5 13-3.2-5.3z"/><path d="M12.3 14.2L21 6.5"/>';
const rzL = (de, en) => wkL(de, en);
const rzDn = j => rzL(SD[j], I_WD[SD[j]]);
const rzDs = ds => fmt(ds).slice(0, 6);
const rzN = x => !x ? '' : x.m > 0 ? `${esc(trTxt(x.n))} · ${mm(x.m)}` : esc(trTxt(x.n || 'Ruhetag'));
const rzFacTxt = t => rzFacs(t).map(k => { const f = RZ_FAC.find(x => x[0] === k); return rzL(f[1], f[2]); }).join(', ');
function rzTzTxt(t, ds){ const d = rzDiffH(t, ds); return !t.tzDest ? '' : d === 0 ? rzL('gleiche Zeit wie zu Hause', 'same time as at home') : `${rzHTxt(d)} ${rzL('Std.', 'h')}`; }
function rzSub1(){ const z = S.rz || {}; if (z.mode !== 'on') return rzL('Aus', 'Off'); const n = rzTrips().filter(t => rzRet(t) >= iso(0)).length; return rzL(`An · ${n} ${n === 1 ? 'Reise' : 'Reisen'} eingetragen`, `On · ${n} ${n === 1 ? 'trip' : 'trips'} entered`); }
/* ---- Schalter und Liste (Einstellungen → Reisemodus, Saisonplanung) ---- */
function rzSwitch(){ const on = rzOn(); return `<button class="rzsw" role="switch" aria-checked="${on}" aria-label="${esc(rzL('Reisemodus', 'Travel mode'))}" onclick="rzSetMode('${on ? 'off' : 'on'}')"><span class="rzsw-k"></span></button>`; }
function rzTzSel(id, val, fn, withUtc){
  const zones = [...new Map(RZ_CITY.map(c => [c[2], c])).values()], has = zones.some(c => c[2] === val), opt = (v, l, s) => `<option value="${esc(v)}"${s ? ' selected' : ''}>${esc(l)}</option>`;
  return `<select id="${id}" class="inp" style="min-height:44px" onchange="${fn}">${withUtc ? opt('', rzL('Zeitzone wählen', 'Choose time zone'), !val) : ''}${!has && val && !/^Etc\//.test(val) ? opt(val, val.replace(/_/g, ' '), true) : ''}${zones.map(c => opt(c[2], `${rzL(c[0], c[1] || c[0])} (${c[2].split('/').pop().replace(/_/g, ' ')})`, c[2] === val)).join('')}</select>`;
}
function rzStat(t){ return t.status === 'applied' ? [rzL('Im Plan berücksichtigt', 'Applied to the plan'), 'var(--ok)'] : t.declined ? [rzL('Plan nicht angepasst', 'Plan not adjusted'), 'var(--mute)'] : S.p && S.plan ? [rzL('Vorschlag offen', 'Proposal open'), '#c2410c'] : [rzL('Eingetragen', 'Entered'), 'var(--mute)']; }
function rzTripRow(t){
  const st = rzStat(t), past = rzRet(t) < iso(0), b = (fn, l, main) => `<button class="${main ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}">${l}</button>`, id = ja(t.id);
  const ask = rzDelAsk === t.id ? `<div class="mt-2 p-2.5 text-sm" style="background:var(--tint);border:1px solid var(--line)"><p>${rzL('Die Reise ist im Plan berücksichtigt. Beim Löschen wird die Anpassung zurückgenommen.', 'This trip is applied to your plan. Deleting it takes the adjustment back.')}</p><div class="mt-2 flex flex-wrap gap-2">${b(`rzDel('${id}',true)`, rzL('Löschen und zurücknehmen', 'Delete and take back'), true)}${b('rzDelAsk=null;render()', rzL('Abbrechen', 'Cancel'))}</div></div>` : '';
  return `<div class="py-3" style="border-top:1px solid var(--line)" data-rz="${esc(t.id)}"><div class="flex items-start gap-2"><span style="color:var(--teal)">${ic('plane', 20)}</span><span class="min-w-0 flex-1"><b>${esc(rzCityOf(t))}</b><span class="block text-sm">${fmt(t.from)} – ${fmt(t.to)}${t.tzDest ? ' · ' + esc(rzTzTxt(t)) : ''}</span><span class="block text-xs" style="color:var(--mute)">${esc(rzFacTxt(t))} · ${rzFree(t)} ${rzL('Min. pro Tag', 'min per day')}${t.note ? ' · ' + esc(t.note) : ''}</span><span class="block text-xs font-semibold" style="color:${st[1]}">${st[0]}</span></span></div>
    ${past ? '' : `<div class="mt-2 flex flex-wrap gap-2">${S.p && S.plan && t.status !== 'applied' ? b(`rzOpen=rzOpen==='${id}'?null:'${id}';render()`, rzOpen === t.id ? rzL('Vorschlag schließen', 'Close proposal') : rzL('Vorschlag ansehen', 'View proposal'), !t.declined && rzOpen !== t.id) : ''}${t.status === 'applied' ? b(`rzRevert('${id}')`, rzL('Anpassung zurücknehmen', 'Take adjustment back')) : ''}${b(`rzEdit('${id}')`, rzL('Bearbeiten', 'Edit'))}${b(`rzDel('${id}')`, rzL('Löschen', 'Delete'))}</div>`}${ask}${rzOpen === t.id && t.status !== 'applied' ? rzPropUi(t) : ''}${t.status === 'applied' && !past ? rzJetUi(t) + rzEvWarnUi(t) : ''}</div>`;
}
function rzForm(){
  const f = rzF; if (!f) return ''; const today = iso(0), ch = (l, on, fn) => `<button class="${on ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${!!on}" onclick="${fn}">${l}</button>`;
  const utc = [-11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => { const v = n === 0 ? 'Etc/GMT' : 'Etc/GMT' + (n > 0 ? '-' : '+') + Math.abs(n); return `<option value="${v}"${f.utc === v ? ' selected' : ''}>UTC${n === 0 ? '' : (n > 0 ? '+' : '−') + Math.abs(n)}</option>`; }).join('');
  const d = f.tzDest ? rzDiffTz(f.tzDest, rzHomeTz(), f.from) : null;
  return `<div id="fx-rzform" class="mt-3 p-3" style="border:1px solid var(--ice);background:var(--tint)"><p class="font-semibold">${f.id ? rzL('Reise bearbeiten', 'Edit trip') : rzL('Neue Reise', 'New trip')}</p>
    <div class="mt-3 grid grid-cols-2 gap-3">${field(rzL('Von', 'From'), `<input type="date" class="inp" style="min-height:44px" min="${esc(today)}" value="${esc(f.from)}" onchange="rzFSet('from',this.value)">`)}${field(rzL('Bis', 'To'), `<input id="rzTo" type="date" class="inp" style="min-height:44px" min="${esc(f.from || today)}" value="${esc(f.to)}" onchange="rzFSet('to',this.value)">`)}</div>
    <div class="mt-2">${ch(rzL('Hin- oder Rückreise an einem anderen Tag', 'Outbound or return on a different day'), f.sep, `rzFChip('sep',${!f.sep})`)}</div>
    ${f.sep ? `<div class="mt-2 grid grid-cols-2 gap-3">${field(rzL('Hinreise am', 'Outbound on'), `<input type="date" class="inp" style="min-height:44px" max="${esc(f.from)}" value="${esc(f.departDay || f.from)}" onchange="rzFSet('departDay',this.value)">`)}${field(rzL('Rückreise am', 'Return on'), `<input type="date" class="inp" style="min-height:44px" min="${esc(f.to)}" value="${esc(f.returnDay || f.to)}" onchange="rzFSet('returnDay',this.value)">`)}</div>` : ''}
    <div class="mt-3 grid grid-cols-2 gap-3">${field(rzL('Ziel (Stadt)', 'Destination (city)'), `<select class="inp" style="min-height:44px" onchange="rzFSet('dest',this.value)"><option value="">${rzL('Bitte wählen', 'Please choose')}</option>${RZ_CITY.map(c => `<option value="${esc(c[0])}"${f.dest === c[0] ? ' selected' : ''}>${esc(rzL(c[0], c[1] || c[0]))}</option>`).join('')}</select>`)}${field(rzL('oder Abstand zu UTC', 'or offset from UTC'), `<select class="inp" style="min-height:44px" onchange="rzFSet('utc',this.value)"><option value="">–</option>${utc}</select>`)}</div>
    <p class="mt-1 text-xs" style="color:var(--mute)">${d == null ? rzL('Ohne Ziel rechnet die App ohne Zeitverschiebung. Die Liste ist in der App gespeichert, es wird nichts im Netz gesucht.', 'Without a destination the app assumes no time difference. The list is stored in the app, nothing is looked up online.') : d === 0 ? rzL('Keine Zeitverschiebung gegenüber zu Hause.', 'No time difference from home.') : rzL(`Zeitverschiebung: ${rzHTxt(d)} Std. gegenüber zu Hause (${d > 0 ? 'Osten' : 'Westen'}).`, `Time difference: ${rzHTxt(d)} h from home (${d > 0 ? 'east' : 'west'}).`)}</p>
    <p class="mb-2 mt-3 text-sm" style="color:var(--mute)">${rzL('Reiseart', 'Mode of travel')}</p><div class="flex flex-wrap gap-2">${RZ_MODE.map(m => ch(rzL(m[1], m[2]), f.mode === m[0], `rzFChip('mode','${m[0]}')`)).join('')}</div>
    <div class="mt-3">${field(rzL('Reisedauer je Strecke (Std., ungefähr)', 'Travel time each way (hours, roughly)'), `<input type="text" inputmode="decimal" class="inp" style="min-height:44px;max-width:8rem" value="${esc(f.travelHours)}" oninput="rzFSet('travelHours',this.value)">`)}</div>
    <p class="mb-2 mt-3 text-sm" style="color:var(--mute)">${rzL('Was gibt es vor Ort? (Mehrfachauswahl)', 'What is available there? (multiple choice)')}</p><div class="flex flex-wrap gap-2">${RZ_FAC.map(m => ch(rzL(m[1], m[2]), rzFacs(f).includes(m[0]), `rzFChip('fac','${m[0]}')`)).join('')}</div>
    <p class="mb-2 mt-3 text-sm" style="color:var(--mute)">${rzL('Freie Zeit pro Tag', 'Free time per day')}</p><div class="flex flex-wrap gap-2">${RZ_MIN.map(n => ch(`${n} Min.`, rzFree(f) === n, `rzFChip('freeMinPerDay',${n})`)).join('')}</div>
    <div class="mt-3">${field(rzL('Notiz (optional)', 'Note (optional)'), `<input class="inp" style="min-height:44px" maxlength="200" value="${esc(f.note)}" oninput="rzFSet('note',this.value)">`)}</div>
    ${rzMsg ? `<p class="mt-2 text-sm" role="alert" style="color:#c0392b">${ic('warn', 16)} <span>${esc(rzMsg)}</span></p>` : ''}
    <div class="mt-3 flex flex-wrap gap-2"><button class="btn !w-auto !px-4" style="min-height:44px" onclick="${rzWiz ? 'rzSaveWiz()' : 'rzSaveF()'}">${rzL('Reise speichern', 'Save trip')}</button><button class="ghost !w-auto !px-4" style="min-height:44px" onclick="rzF=null;rzMsg='';render()">${rzL('Abbrechen', 'Cancel')}</button></div>
    ${S.p && S.plan && !rzWiz ? `<p class="mt-2 text-xs" style="color:var(--mute)">${rzL('Nach dem Speichern siehst du einen Vorschlag für deinen Plan. Geändert wird erst, wenn du zustimmst.', 'After saving you see a proposal for your plan. Nothing changes until you agree.')}</p>` : ''}</div>`;
}
function rzCard(wiz){
  const z = S.rz || {}, on = rzOn(), T = rzTrips(), up = T.filter(t => rzRet(t) >= iso(0)), old = T.filter(t => rzRet(t) < iso(0));
  const ask = rzOffAsk ? `<div class="mt-3 p-3 text-sm" role="alertdialog" aria-label="${esc(rzL('Reisemodus ausschalten', 'Switch travel mode off'))}" style="border:1px solid var(--ice);background:var(--tint)"><p class="font-semibold">${rzL('Anpassungen für kommende Reisen zurücknehmen?', 'Take back adjustments for upcoming trips?')}</p><p class="mt-1">${rzL('Deine Reisen bleiben gespeichert und kommen zurück, wenn du den Reisemodus wieder einschaltest.', 'Your trips stay saved and come back when you switch travel mode on again.')}</p><div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzOffDo(false)">${rzL('Ja, zurücknehmen', 'Yes, take back')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzOffDo(true)">${rzL('Nein, Plan so lassen', 'No, keep the plan')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzOffAsk=false;render()">${rzL('Abbrechen', 'Cancel')}</button></div></div>` : '';
  const body = !on ? '' : `<div class="mt-3">${field(rzL('Deine Heimat-Zeitzone', 'Your home time zone'), rzTzSel('rzHome', rzHomeTz(), 'rzTzSet(this.value)'))}</div>
    <p class="eyebrow mt-4">${rzL('Reisen', 'Trips')}</p>${up.length ? up.map(rzTripRow).join('') : `<p class="mt-1 text-sm" style="color:var(--mute)">${rzL('Noch keine Reise eingetragen.', 'No trip entered yet.')}</p>`}
    ${rzF ? rzForm() : `<button class="btn mt-3 !w-auto !px-4" style="min-height:44px" onclick="rzNew()"><span class="inline-flex items-center gap-2">${ic('plane', 18)}<span>${rzL('Reise eintragen', 'Add trip')}</span></span></button>`}
    ${old.length ? `<p class="mt-3 text-xs" style="color:var(--mute)">${rzL(`${old.length} vergangene ${old.length === 1 ? 'Reise' : 'Reisen'} gespeichert.`, `${old.length} past ${old.length === 1 ? 'trip' : 'trips'} saved.`)}</p>` : ''}`;
  return `<section class="panel p-4" id="fx-rz" data-noi18n><div class="flex items-center gap-3"><span class="min-w-0 flex-1"><span class="block font-semibold">${rzL('Reisemodus', 'Travel mode')}</span><span class="block text-sm" style="color:var(--mute)">${rzL('Plan passt sich an Reisen und Zeitzonen an. Aus = du siehst nichts davon.', 'The plan adapts to trips and time zones. Off = you see none of it.')}</span></span>${rzSwitch()}</div>${ask}${body}</section>`;
}
/* ---- Vorschlag je Reise: Begründung, vorher und nachher, Annehmen / Ablehnen / Anpassen ---- */
function rzPropUi(t){
  let R = []; try { R = rzRows(t); } catch (e) { elog(e); }
  const id = ja(t.id), mini = x => { try { return x && x.m > 0 ? wkSvg(x, {mode:'mini'}) : ''; } catch (e) { elog(e); return ''; } };
  const rows = R.map(r => `<div class="rzr"><span class="rzr-d">${rzDn(r.j)}<br><span style="color:var(--mute)">${rzDs(r.ds)}</span></span><span class="rzr-a"><span class="text-xs" style="color:var(--mute)">${rzL('vorher', 'before')}</span><span class="block text-sm">${rzN(r.a)}</span>${mini(r.a)}</span><span aria-hidden="true" style="color:var(--mute)">→</span><span class="rzr-a"><span class="text-xs" style="color:var(--teal)">${rzL('nachher', 'after')}</span><span class="block text-sm font-semibold">${rzN(r.b)}</span>${mini(r.b)}</span></div>`).join('');
  const mA = R.reduce((a, r) => a + (r.a && r.a.m || 0), 0), mB = R.reduce((a, r) => a + (r.b && r.b.m || 0), 0);
  return `<div class="mt-3 p-3" style="border:1px solid var(--line);border-left:3px solid var(--teal);background:var(--panel)" data-rzprop="${esc(t.id)}"><p class="font-semibold">${rzL('Vorschlag für deinen Plan', 'Proposal for your plan')}</p>
    <ul class="mt-1 list-disc pl-5 text-sm">${rzWhy(t).map(s => `<li>${esc(trTxt(s))}</li>`).join('')}</ul>
    ${rows ? `<div class="mt-2">${rows}</div><p class="mt-2 text-xs" style="color:var(--mute)">${rzL(`Radzeit an diesen Tagen: ${mm(mA)} → ${mm(mB)} – dein Zeitbudget wird nicht überschritten.`, `Riding time on these days: ${mm(mA)} → ${mm(mB)} – your time budget is not exceeded.`)}</p>` : `<p class="mt-2 text-sm">${rzL('An den geplanten Einheiten ändert sich nichts.', 'Nothing changes in the planned sessions.')}</p>`}
    ${rzEvWarnUi(t)}${rzJetUi(t)}
    <p class="mt-2 text-xs" style="color:var(--mute)">${rzL('Geändert wird erst, wenn du zustimmst. Vorher sichert die App den Stand, danach kannst du es rückgängig machen.', 'Nothing changes until you agree. The app saves the current state first, and you can undo it afterwards.')}</p>
    <div class="mt-2 flex flex-wrap gap-2"><button class="btn !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzAccept('${id}')">${rzL('Annehmen', 'Accept')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzDecline('${id}')">${rzL('Ablehnen', 'Decline')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzEdit('${id}')">${rzL('Anpassen', 'Adjust')}</button></div></div>`;
}
/* ---- Zeitzonen: Hinweis ab 3 Stunden ---- */
function rzJetTips(d, days){
  const east = d > 0, a = Math.abs(d), short = days <= 3;
  if (short) return [rzL('Kurzer Aufenthalt (bis etwa 3 Tage): Bleib möglichst im Rhythmus von zu Hause. Schlaf, Mahlzeiten und Training nach Heimatzeit, soweit es geht.', 'Short stay (up to about 3 days): stay on your home rhythm where you can. Sleep, meals and training by home time as far as possible.')];
  return [
    east ? rzL('Licht: Geh am Vormittag und Mittag ans Tageslicht. Abends helles Licht und Bildschirme meiden.' + (a >= 8 ? ' In den ersten zwei Tagen sehr frühes Morgenlicht meiden, sonst verstellt sich die innere Uhr in die falsche Richtung.' : ''), 'Light: get daylight in the late morning and around midday. Avoid bright light and screens in the evening.' + (a >= 8 ? ' For the first two days avoid very early morning light, otherwise the body clock shifts the wrong way.' : ''))
      : rzL('Licht: Geh am Nachmittag und frühen Abend ans Tageslicht und bleib bis zur örtlichen Schlafenszeit wach.', 'Light: get daylight in the afternoon and early evening and stay awake until local bedtime.'),
    east ? rzL('Vor der Abreise: Geh 2 bis 3 Tage lang jeden Abend 30 bis 60 Min. früher ins Bett und steh früher auf.', 'Before you leave: for 2 to 3 days go to bed 30 to 60 min earlier each night and get up earlier.') : rzL('Vor der Abreise: Geh 2 bis 3 Tage lang jeden Abend 30 bis 60 Min. später ins Bett.', 'Before you leave: for 2 to 3 days go to bed 30 to 60 min later each night.'),
    rzL('Mahlzeiten ab dem Abflug nach der Zeit am Ziel. Koffein nur am Morgen und Vormittag der Zielzeit, nicht mehr am Nachmittag.', 'Eat by destination time from departure on. Caffeine only in the destination morning, none in the afternoon.'),
    rzL('Training: locker und möglichst draußen bei Tageslicht. Harte Intervalle erst, wenn du wieder normal schläfst.', 'Training: easy and outdoors in daylight if you can. Hard intervals only once you sleep normally again.'),
    rzL('Melatonin oder Schlafmittel nur nach ärztlicher Abklärung.', 'Melatonin or sleeping pills only after talking to a doctor.')];
}
function rzJetUi(t){
  const d = rzDiffH(t), n = rzAdapt(d); if (!n) return '';
  const days = ddiff(t.from, t.to) + 1;
  return `<div class="mt-3 p-3 text-sm" style="background:var(--tint);border:1px solid var(--line)" data-rzjet="${esc(t.id)}"><p class="font-semibold"><span class="inline-flex items-center gap-2">${ic('globe', 18)}<span>${rzL(`Zeitverschiebung ${rzHTxt(d)} Std. nach ${d > 0 ? 'Osten' : 'Westen'}`, `Time difference ${rzHTxt(d)} h to the ${d > 0 ? 'east' : 'west'}`)}</span></span></p>
    <p class="mt-1">${rzL(`Die innere Uhr braucht geschätzt ${n} ${n === 1 ? 'Tag' : 'Tage'}, um sich umzustellen. Nach Osten dauert es meist länger als nach Westen.`, `Your body clock needs an estimated ${n} ${n === 1 ? 'day' : 'days'} to adjust. Eastward usually takes longer than westward.`)}</p>
    <ul class="mt-1 list-disc pl-5">${rzJetTips(d, days).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="mt-1 text-xs" style="color:var(--mute)">${rzL('Faustregel nach Janse van Rensburg et al. 2021 und Waterhouse et al. 2007. Wie schnell du dich umstellst, ist individuell.', 'Rule of thumb after Janse van Rensburg et al. 2021 and Waterhouse et al. 2007. How fast you adjust is individual.')}</p></div>`;
}
/* ---- Reise kurz vor einem Event ---- */
function rzEvWarnUi(t){
  let W = []; try { W = rzEvWarn(t); } catch (e) { elog(e); } if (!W.length) return '';
  const sg = v => (v > 0 ? '+' : '') + v;
  return W.map(q => `<div class="mt-3 p-3 text-sm" style="background:var(--tint);border:1px solid var(--line);border-left:3px solid #c2410c" data-rzev="${esc(q.id)}"><p class="font-semibold"><span class="inline-flex items-center gap-2">${ic('warn', 18)}<span>${q.at ? rzL('Reise zum Event', 'Trip to the event') : rzL(`Reise ${q.days} ${q.days === 1 ? 'Tag' : 'Tage'} vor dem ${q.prio}-Event`, `Trip ${q.days} ${q.days === 1 ? 'day' : 'days'} before the ${q.prio} event`)}</span></span></p>
    <p class="mt-1"><b>${esc(q.name)}</b>, ${fmt(q.date)}. ${q.a && q.b ? rzL(`Form am Renntag ohne Reise ${sg(q.a.tsb)} bei Fitness ${q.a.ctl}, mit Reise ${sg(q.b.tsb)} bei Fitness ${q.b.ctl}.`, `Form on race day without the trip ${sg(q.a.tsb)} at fitness ${q.a.ctl}, with the trip ${sg(q.b.tsb)} at fitness ${q.b.ctl}.`) : ''}</p>
    <p class="mt-1">${q.at ? rzL('Plane den Anreisetag und den Tag danach locker. Am Vortag eine kurze Einheit mit ein paar Antritten vor Ort.', 'Keep the arrival day and the day after easy. On the day before, a short session with a few efforts on site.') : rzL('In der Tapering-Zeit ist eine Reise oft unproblematisch, weil der Umfang ohnehin sinkt. Wichtig ist die letzte harte Einheit: Der Vorschlag legt sie wenn möglich vor die Reise.', 'During the taper a trip is often no problem because volume drops anyway. What matters is the last hard session: the proposal moves it before the trip where possible.')}</p></div>`).join('');
}
/* Event in anderer Zeitzone: Zeile in „Alle Events der Saison“ */
function rzEvUi(o){
  if (!rzOn() || !o || o.past) return ''; const e = rzEv(o.id), d = e.tz ? rzDiffTz(e.tz, rzHomeTz(), o.date) : 0, n = rzAdapt(d), id = ja(o.id), body = e.start && d ? rzBodyTime(e.start, d) : '';
  return `<details class="evfuel mt-2" data-noi18n${e.tz ? ' open' : ''}><summary>${rzL('Anreise und Zeitzone', 'Travel and time zone')}</summary><div class="mt-2 text-sm">
    <div class="grid grid-cols-2 gap-3">${field(rzL('Zeitzone des Events', 'Event time zone'), rzTzSel('rzEvTz-' + esc(o.id), e.tz || '', `rzEvSet('${id}','tz',this.value)`, true))}${field(rzL('Startzeit vor Ort', 'Local start time'), `<input type="time" class="inp" style="min-height:44px" value="${esc(e.start || '')}" onchange="rzEvSet('${id}','start',this.value)">`)}</div>
    ${e.tz && d ? `<p class="mt-2">${rzL(`Zeitverschiebung ${rzHTxt(d)} Std.`, `Time difference ${rzHTxt(d)} h.`)} ${body ? rzL(`Start ${e.start} Ortszeit = ${body} für deinen Körper.`, `Start ${e.start} local time = ${body} for your body.`) : ''}</p>` : ''}
    ${n ? `<p class="mt-1">${rzL(`Empfehlung: etwa ${n} ${n === 1 ? 'Tag' : 'Tage'} vor dem Start anreisen, damit sich die innere Uhr umstellen kann. Geht das nicht und du bleibst nur bis etwa 3 Tage, bleib im Rhythmus von zu Hause.`, `Recommendation: arrive about ${n} ${n === 1 ? 'day' : 'days'} before the start so your body clock can adjust. If that is not possible and you stay only up to about 3 days, keep your home rhythm.`)}</p>` : e.tz ? `<p class="mt-1">${rzL('Unter 3 Std. Zeitverschiebung ist keine besondere Anpassung nötig.', 'Below 3 h time difference no special adjustment is needed.')}</p>` : ''}
    <p class="mt-2">${rzL('Anreisetag und der Tag danach locker, am Vortag des Starts eine kurze Einheit mit ein paar Antritten vor Ort.', 'Arrival day and the day after easy, on the day before the start a short session with a few efforts on site.')}</p>
    <p class="mt-2 font-semibold">${rzL('Packliste Rad', 'Bike packing list')}</p><ul class="mt-1 list-disc pl-5">${[['Radtasche oder Karton, Polster für Schaltwerk und Rahmen', 'Bike bag or box, padding for derailleur and frame'], ['Werkzeug: Inbus, Drehmomentschlüssel, Pedalschlüssel, Pumpe', 'Tools: hex keys, torque wrench, pedal wrench, pump'], ['Nach dem Aufbau: Schrauben an Vorbau, Sattelstütze und Laufrädern prüfen', 'After assembly: check bolts on stem, seatpost and wheels'], ['Kurze Probefahrt vor Ort, Schaltung und Bremsen testen', 'Short test ride on site, check gears and brakes'], ['Gewohnte Rennverpflegung mitnehmen, vor dem Rennen nichts Neues', 'Bring your usual race nutrition, nothing new before the race']].map(x => `<li>${rzL(x[0], x[1])}</li>`).join('')}</ul></div></details>`;
}
/* ---- Sequenzen „Unterwegs“ starten (läuft über die frei gestarteten Routinen, F23) ---- */
function rzRt(kind, min){ const r = RZ_RT[kind]; if (!r) return null; const m = r.v[min] ? min : +Object.keys(r.v)[0]; return {n:r.n, m, intro:r.intro, ex:r.v[m], rt:'rz-' + kind + '-' + m, rv:0}; }
function rzSeqOpen(kind, min){ const s = rzRt(kind, +min); if (!s) return; rtSel = s; sqOpen('rt', -1); }
function rzSeqDone(kind, min, ds){ const r = rzRt(kind, +min); return !!(r && S.lb && S.lb['sq|rt|' + r.rt + '|' + ds]); }
function rzSeqBtn(kind, min, ds, live){
  const done = rzSeqDone(kind, min, ds), r = rzRt(kind, min); if (!r) return '';
  return `<div class="mt-2">${done ? `<p class="text-sm font-semibold" style="color:var(--ok)"><span class="inline-flex items-center gap-2">${ic('check', 18)}<span>${rzL('Reise – Ersatzprogramm erfüllt', 'Trip – substitute programme done')}</span></span></p>` : ''}${live ? `<button class="${done ? 'ghost' : 'btn'} mt-1 w-full" style="min-height:48px" onclick="rzSeqOpen('${kind}',${+min})"><span class="inline-flex items-center justify-center gap-2">${ic('play', 20)}<span>${esc(rzL(r.n, trTxt(r.n)))} · ${r.m} Min.</span></span></button>` : `<p class="text-xs" style="color:var(--mute)">${esc(rzL(r.n, trTxt(r.n)))} · ${r.m} Min. ${rzL('Starten kannst du die Übungen am Tag selbst.', 'You can start the exercises on the day itself.')}</p>`}</div>`;
}
/* ---- Woche: Band am Tag, Ortszeit, Ersatzprogramm ---- */
function rzBadge(x, ds){
  if (!rzOn()) return ''; const t = ds ? rzAt(ds) : null, mv = x && x.rz && x.rz.k === 'mv', post = x && x.rz && x.rz.k === 'post';
  if (!t && !mv && !post) return '';
  const l = mv ? rzL(`wegen Reise von ${rzDn(x.rz.from)}`, `moved from ${rzDn(x.rz.from)} for trip`) : post ? rzL('Wiedereinstieg nach Reise', 'Back from trip') : rzL('Reise', 'Trip');
  return `<b class="rzb" data-noi18n>${ic('plane', 12)}<span>${l}</span></b>`;
}
function rzDayUi(x, i, cur, ds){
  if (!rzOn() || !ds) return ''; const t = rzAt(ds), k = x && x.rz; if (!t && !k) return '';
  const live = cur && i === todayIdx(), L = [];
  if (t) { const d = rzDiffH(t, ds), dest = esc(rzCityOf(t));
    L.push(`<p class="text-sm"><span class="inline-flex items-center gap-2" style="color:var(--teal)">${ic('plane', 16)}<b>${ds === rzDep(t) ? rzL('Hinreise', 'Outbound') : ds === rzRet(t) ? rzL('Rückreise', 'Return') : rzL('Unterwegs', 'Away')}: ${dest}</b></span>${t.tzDest && d ? `<span class="block text-xs" style="color:var(--mute)">${live ? rzL(`Ortszeit ${rzClock(Date.now(), t.tzDest)} Uhr · Heimat: ${rzClock(Date.now(), t.tzHome || rzHomeTz())} Uhr`, `Local time ${rzClock(Date.now(), t.tzDest)} · home: ${rzClock(Date.now(), t.tzHome || rzHomeTz())}`) : rzL(`Ortszeit ${rzHTxt(d)} Std. gegenüber zu Hause. Zeiten gelten in Ortszeit.`, `Local time ${rzHTxt(d)} h from home. Times are local.`)}</span>` : ''}</p>`); }
  if (k && k.rpe && k.opt === 'mill') L.push(`<p class="text-xs" style="color:var(--mute)">${rzL('Auf dem Laufband gibt es keine Wattwerte. Geh oder lauf nach Gefühl und Puls.', 'There are no watt figures on the treadmill. Walk or run by feel and heart rate.')}</p>`);
  else if (k && k.rpe && k.sub !== 'run') L.push(`<p class="text-xs" style="color:var(--mute)">${rzL('Die Wattwerte sind nur Orientierung: Hotel-Geräte messen ungenau. Fahr nach Gefühl und Puls.', 'The watt figures are only a guide: hotel machines measure inaccurately. Go by feel and heart rate.')}</p>`);
  if (k && k.seq) L.push(rzSeqBtn(k.seq[0], k.seq[1], ds, live));
  else if (t && x && !(x.m > 0) && !rzFix(x)) L.push(rzSeqBtn('mob', 15, ds, live));
  if (k && k.sub === 'run') L.push(`<p class="text-xs" style="color:var(--mute)">${rzL('Laufen ist nur eine lockere Alternative. Steig vorsichtig ein, wenn du es nicht gewohnt bist.', 'Running is only an easy alternative. Start carefully if you are not used to it.')}</p>`);
  if (t && k && k.k === 'stay' && k.opt && t.status === 'applied' && ds >= iso(0)) L.push(rzPickUi(t, k, ds, live));
  return L.length ? `<div class="rzday" data-noi18n>${L.join('')}</div>` : '';
}
/* Tageswahl: an jedem Tag des Aufenthalts selbst wählen, was im Rahmen der angegebenen Möglichkeiten geht */
const RZ_OPT = {own:['Rad wie geplant', 'Bike as planned'], bike:['Hotel-Ergometer', 'Hotel bike'], mill:['Laufband', 'Treadmill'], run:['Lauf draußen', 'Run outdoors'], kraft:['Kraft im Zimmer', 'Strength in the room'], stabi:['Stabilität', 'Core stability'], mob:['Mobilität', 'Mobility'], rest:['Pause', 'Rest day']};
function rzPickUi(t, k, ds, live){
  const own = !!(t.days && t.days[ds]), id = ja(t.id);
  return `<div class="rzpick" data-rzpick="${ds}"><p class="text-xs font-semibold">${live ? rzL('Heute lieber etwas anderes?', 'Prefer something else today?') : rzL('An diesem Tag lieber etwas anderes?', 'Prefer something else on this day?')}</p><div class="mt-1 flex flex-wrap gap-2" role="group" aria-label="${rzL('Einheit für diesen Reisetag wählen', 'Choose the session for this travel day')}">${rzOpts(t).map(o => `<button type="button" class="${k.opt === o ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" aria-pressed="${k.opt === o}" onclick="rzDayPick('${id}','${ds}','${o}')">${rzL(RZ_OPT[o][0], RZ_OPT[o][1])}</button>`).join('')}</div>${own ? `<button type="button" class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzDayPick('${id}','${ds}','')">${rzL('Vorschlag der App wiederherstellen', 'Restore the app’s suggestion')}</button>` : `<p class="mt-1 text-xs" style="color:var(--mute)">${rzL('Zur Wahl steht, was du für die Reise angegeben hast. Übungen und Pause gehen immer.', 'You can choose from what you entered for the trip. Exercises and rest are always possible.')}</p>`}</div>`;
}
/* ---- Start: offene Vorschläge, Reise heute, Schlaf vor der Abreise ---- */
function rzHome(){
  if (!rzOn() || !S.p || !S.plan) return ''; const today = iso(0), out = [];
  rzTrips().filter(t => t.status === 'planned' && !t.declined && rzRet(t) >= today).forEach(t => out.push(`<section class="panel p-4" style="border-left:4px solid var(--teal)" data-noi18n><p class="font-semibold"><span class="inline-flex items-center gap-2">${ic('plane', 18)}<span>${rzL('Reise', 'Trip')}: ${esc(rzCityOf(t))}, ${rzDs(t.from)}–${fmt(t.to)}</span></span></p><p class="mt-1 text-sm">${rzL('Die App hat einen Vorschlag, wie dein Plan zur Reise passt.', 'The app has a proposal for fitting your plan to the trip.')}</p><button class="btn mt-3 !w-auto !px-3" style="min-height:44px" onclick="rzGo('${ja(t.id)}')">${rzL('Vorschlag ansehen', 'View proposal')}</button></section>`));
  const t = rzAt(today);
  if (t) { const d = rzDiffH(t, today), far = (+t.travelHours || 0) > 4;
    out.push(`<section class="panel p-4" data-noi18n data-rzhome="1"><p class="font-semibold"><span class="inline-flex items-center gap-2" style="color:var(--teal)">${ic('plane', 18)}<span style="color:var(--ink)">${today === rzDep(t) ? rzL('Heute: Hinreise', 'Today: outbound') : today === rzRet(t) ? rzL('Heute: Rückreise', 'Today: return') : rzL('Du bist unterwegs', 'You are away')} · ${esc(rzCityOf(t))}</span></span></p>${t.tzDest && d ? `<p class="mt-1 text-sm">${rzL(`Ortszeit ${rzClock(Date.now(), t.tzDest)} Uhr · Heimat: ${rzClock(Date.now(), t.tzHome || rzHomeTz())} Uhr`, `Local time ${rzClock(Date.now(), t.tzDest)} · home: ${rzClock(Date.now(), t.tzHome || rzHomeTz())}`)}</p>` : ''}
      ${(today === rzDep(t) || today === rzRet(t)) && far ? rzSeqBtn('flug', 10, today, true) : ''}${rzAdapt(d) && ddiff(rzDep(t), today) <= rzAdapt(d) ? rzJetUi(t) : ''}</section>`); }
  /* 2–3 Tage vor der Abreise: Schlafenszeit schrittweise verschieben (nur ab 3 Zeitzonen und mindestens 3 Tagen Reise) */
  rzTrips().forEach(q => { const d = rzDiffH(q), n = ddiff(today, rzDep(q)); if (n < 1 || n > 3 || Math.abs(d) < 3 || ddiff(q.from, q.to) + 1 < 3) return;
    out.push(`<section class="panel p-4" data-noi18n data-rzsleep="1"><p class="font-semibold"><span class="inline-flex items-center gap-2">${ic('bed', 18)}<span>${rzL(`In ${n} ${n === 1 ? 'Tag' : 'Tagen'}: ${esc(rzCityOf(q))}`, `In ${n} ${n === 1 ? 'day' : 'days'}: ${esc(rzCityOf(q))}`)}</span></span></p><p class="mt-1 text-sm">${d > 0 ? rzL('Schlafenszeit schrittweise verschieben: Geh heute 30 bis 60 Min. früher ins Bett und steh morgen früher auf. So fällt die Umstellung nach Osten leichter.', 'Shift your bedtime step by step: go to bed 30 to 60 min earlier tonight and get up earlier tomorrow. That makes the eastward shift easier.') : rzL('Schlafenszeit schrittweise verschieben: Geh heute 30 bis 60 Min. später ins Bett. So fällt die Umstellung nach Westen leichter.', 'Shift your bedtime step by step: go to bed 30 to 60 min later tonight. That makes the westward shift easier.')}</p></section>`); });
  return out.join('');
}
function rzGo(id){ rzOpen = id || null; navGo('more'); goPg('settings'); goPg('set-rz'); dykFocus('fx-rz'); }
function dykRzDay(){ navGo('week'); setTimeout(() => { try { const e = document.querySelector('.rzpick'); if (e) { e.scrollIntoView({block:'center'}); const b = e.querySelector('button'); if (b) b.focus({preventScroll:true}); } } catch (x) { elog(x); } }, 60); }
function dykRz(){ navGo('more'); goPg('settings'); goPg('set-rz'); dykFocus('fx-rz', '#fx-rz .rzsw'); }
/* ---- Woche: Knopf „Ich bin unterwegs“ ---- */
function rzWeekBtn(w){ if (!rzOn() || !S.p || !S.p.start) return ''; const from = addD(S.p.start, ((w || S.wk) - 1) * 7), d0 = from < iso(0) ? iso(0) : from; return `<button class="ghost !w-auto !px-3 text-sm" data-noi18n style="min-height:44px" onclick="rzGo();rzNew('${d0}')"><span class="inline-flex items-center gap-2">${ic('plane', 16)}<span>${rzL('Ich bin unterwegs', 'I am away')}</span></span></button>`; }
/* ---- Planerstellung: Frage nach dem Zeitbudget ---- */
function rzWizSet(v){ const z = rzS(); if (v === 'no') { if (z.mode === 'on') rzOffDo(true); else { z.mode = 'off'; rzF = null; save(); render(); } return; } if (z.mode !== 'on') rzSetMode('on'); if (v === 'now') rzNew(); else { rzF = null; render(); } }
function rzWizard(){
  const z = S.rz || {}, m = z.mode || 'unset';
  if (m === 'off') return `<div data-noi18n id="fx-rzwiz"><p class="text-sm" style="color:var(--mute)"><span class="inline-flex items-center gap-2">${ic('plane', 16)}<span>${rzL('Reisemodus ist aus – in den Einstellungen änderbar.', 'Travel mode is off – you can change this in the settings.')}</span></span></p></div>`;
  const T = rzTrips().filter(t => rzRet(t) >= iso(0)), b = (l, fn, on) => `<button class="${on ? 'btn' : 'ghost'} !w-auto !px-3 text-sm" style="min-height:44px" onclick="${fn}">${l}</button>`;
  rzWiz = !(S.p && S.plan && S.edit);
  let h = '';
  try { h = `<div data-noi18n id="fx-rzwiz"><p class="mb-2 font-semibold">${rzL('Bist du in der Saison unterwegs?', 'Will you be travelling during the season?')}</p><p class="mb-2 text-sm" style="color:var(--mute)">${rzL('Dienstreisen und Urlaube ohne Rad: Der Plan berücksichtigt sie von Anfang an. Alles ist optional und später änderbar.', 'Business trips and holidays without a bike: the plan takes them into account from the start. Everything is optional and can be changed later.')}</p>
    <div class="flex flex-wrap gap-2">${b(rzL('Ja, Reisen eintragen', 'Yes, add trips'), "rzWizSet('now')", m === 'on' && (!!rzF || T.length > 0))}${b(rzL('Ja, aber später', 'Yes, but later'), "rzWizSet('later')", m === 'on' && !rzF && !T.length)}${b(rzL('Nein, brauche ich nicht', 'No, I don\'t need it'), "rzWizSet('no')", false)}</div>
    ${m === 'on' ? `${T.map(t => `<div class="mt-2 flex items-center gap-2 text-sm" style="border-top:1px solid var(--line);padding-top:.5rem"><span style="color:var(--teal)">${ic('plane', 16)}</span><span class="min-w-0 flex-1"><b>${esc(rzCityOf(t))}</b> · ${rzDs(t.from)}–${fmt(t.to)}</span><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzEdit('${ja(t.id)}')">${rzL('Bearbeiten', 'Edit')}</button><button class="ghost !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzDel('${ja(t.id)}',true)" aria-label="${esc(rzL('Reise löschen', 'Delete trip'))}">${ic('close', 16)}</button></div>`).join('')}${rzF ? rzForm() : T.length ? `<button class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzNew()">${rzL('Weitere Reise', 'Another trip')}</button>` : ''}` : ''}</div>`; } finally { rzWiz = false; }
  return h;
}
function rzSaveWiz(){ rzWiz = !(S.p && S.plan && S.edit); try { rzSaveF(); } finally { rzWiz = false; } }
/* ---- Saisonplanung: Liste und Band ---- */
function rzSeason(){
  if (!rzOn()) return ''; const T = rzTrips().filter(t => rzRet(t) >= iso(0)), p = S.p; let bar = '';
  try { if (p && p.start && T.length) { const tot = rzTot(p), a = p.start, n = tot * 7, pos = ds => Math.max(0, Math.min(100, ddiff(a, ds) / n * 100));
    bar = `<div class="rzbar" role="img" aria-label="${esc(rzL('Reisen in der Saison', 'Trips in the season'))}: ${esc(T.map(t => `${rzCityOf(t)} ${fmt(t.from)}–${fmt(t.to)}`).join(', '))}">${T.map(t => `<span style="left:${pos(rzDep(t)).toFixed(2)}%;width:${Math.max(1.2, pos(addD(rzRet(t), 1)) - pos(rzDep(t))).toFixed(2)}%"></span>`).join('')}<i style="left:${pos(iso(0)).toFixed(2)}%"></i></div><p class="mt-1 flex justify-between text-xs" style="color:var(--mute)"><span>${fmt(a)}</span><span>${fmt(addD(a, n - 1))}</span></p>`; } } catch (e) { elog(e); }
  return `<section class="panel p-4" data-noi18n id="fx-rzs"><p class="eyebrow">${rzL('Reisen', 'Trips')}</p>${bar}${T.length ? T.map(t => { const st = rzStat(t); return `<div class="flex items-center gap-2 py-2 text-sm" style="border-top:1px solid var(--line)"><span style="color:var(--teal)">${ic('plane', 16)}</span><span class="min-w-0 flex-1"><b>${esc(rzCityOf(t))}</b> · ${rzDs(t.from)}–${fmt(t.to)}<span class="block text-xs" style="color:${st[1]}">${st[0]}</span></span></div>`; }).join('') : `<p class="mt-1 text-sm" style="color:var(--mute)">${rzL('Noch keine Reise eingetragen.', 'No trip entered yet.')}</p>`}
    <button class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="rzGo()">${rzL('Reisen hinzufügen und bearbeiten', 'Add and edit trips')}</button></section>`;
}
/* ---- Logbuch: Kennzeichnung „Reise“ ---- */
function rzLbMark(id, e){ if (!rzOn() || !e) return ''; const seq = /^sq\|rt\|rz-/.test(String(id)); if (!seq && !(e.day && rzAt(e.day))) return ''; return `<b class="rzb" data-noi18n>${ic('plane', 12)}<span>${rzL('Reise', 'Trip')}</span></b>`; }
/* ---- Tipps: Reisekontext des Tages (leer bei ausgeschaltetem Reisemodus) ---- */
function rzTipCtx(day){
  if (!rzOn()) return []; const out = [];
  rzTrips().forEach(t => { const dep = rzDep(t), ret = rzRet(t), d = Math.abs(rzDiffH(t));
    if (day >= dep && day <= ret) { out.push('day'); if (day === dep || day === ret) out.push('move'); if (d >= 3) out.push('jet'); }
    else if (day < dep && ddiff(day, dep) <= 3) { out.push('pre'); if (d >= 3) out.push('jet'); }
    else if (day > ret && ddiff(ret, day) <= 2) { out.push('post'); if (d >= 3) out.push('jet'); } });
  return [...new Set(out)];
}
/* ---- Einstellungen: eigene Unterseite ---- */
SET_PAGES['set-rz'] = () => rzCard();
SET_T['set-rz'] = 'Reisemodus';
IA_PAR['set-rz'] = 'settings';
DYK_AT.rz = ['set-rz', 'fx-rz', '#fx-rz .rzsw'];
/* ---- Formkurve (F28): Reisen als blasses Band hinter den Linien, „Reise: …“ im Infofeld ---- */
function rzVzBands(vis, X, y, h){
  if (!rzOn() || !vis || vis.length < 2) return ''; const n = vis.length, a = vis[0].day, b = vis[n - 1].day, half = (X(1) - X(0)) / 2;
  return rzTrips().map(t => { const d0 = rzDep(t), d1 = rzRet(t); if (d1 < a || d0 > b) return ''; let i0 = vis.findIndex(r => r.day >= d0), i1 = -1; for (let i = n - 1; i >= 0; i--) if (vis[i].day <= d1) { i1 = i; break; } if (i0 < 0 || i1 < i0) return '';
    const x0 = Math.max(X(0), X(i0) - half), x1 = Math.min(X(n - 1), X(i1) + half); return `<rect x="${x0.toFixed(1)}" y="${y}" width="${Math.max(2, x1 - x0).toFixed(1)}" height="${h}" class="vz-rz" data-rz="${esc(t.id)}"/>`; }).join('');
}
function rzVzNames(add, a, b){ if (!rzOn()) return; rzTrips().forEach(t => { const nm = rzL('Reise', 'Trip') + ': ' + rzCityOf(t); for (let d = rzDep(t) < a ? a : rzDep(t), k = 0; d <= rzRet(t) && d <= b && k < 70; d = addD(d, 1), k++) add(d, nm); }); }
