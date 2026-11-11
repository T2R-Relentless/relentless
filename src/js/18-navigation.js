/* ---------- Trainingszustand ---------- */
/* Ursprünglich geplante Einheit eines Tages: Anpassungen (Befinden, Krankheit, Kürzen, Pendeln) zurückverfolgen.
   Ein gesperrter Tag zählt mit seiner Einheit, wenn sie auf keinen anderen Tag verschoben werden konnte. */
function pOrig(plan, i){
  let y = plan && plan[i], g = 0; while (y && y.orig && g++ < 6) y = y.orig;
  if (y && y.blocked && y.held && !plan.some(z => z && z.moved && z.from === i)) y = y.held;
  return y;
}
function stateCard(){
  const p = S.p, ph = phases(p), tot = ph[ph.length - 1].to, cw = S.wk, P = ph.find(x => cw >= x.from && cw <= x.to), t = todayIdx(), plan = S.plan || [], dn = S.done || {}, ac = S.actual || {};
  let pm = 0, dm = 0, pt = 0, dt = 0, n = 0, nd = 0, ex = 0, miss = 0, sk = 0, nxt = -1;
  plan.forEach((xc, i) => {
    const x = pOrig(plan, i); if (!x || !x.m) return; n++; pm += x.m; pt += tss(x); const a = ac[i], ok = !!(dn[i] || a), gone = !(xc && xc.m);
    if (ok) { nd++; dm += a ? Math.round(a.sec / 60) : (xc && xc.m) || x.m; dt += a ? a.tss : tss(xc && xc.m ? xc : x); }
    if (i < t || (gone && i <= t)) { ex += x.m; if (!ok) { miss++; if (gone && xc && xc.feel === 'sick') sk++; } }
    if (i >= t && !ok && !gone && nxt < 0) nxt = i;
  });
  const bar = (v, mx, c) => `<div class="mt-1 h-2 overflow-hidden rounded-full" style="background:var(--line)"><div class="h-full rounded-full" style="width:${esc(mx ? Math.min(100, Math.round(100 * v / mx)) : 0)}%;background:${esc(c || 'var(--ice)')}"></div></div>`;
  const tile = (v, l, sub) => `<div class="rounded-lg p-2" style="background:var(--tint)"><div class="hd text-lg font-semibold">${v}</div><div class="text-xs" style="color:var(--mute)">${l}</div>${sub || ''}</div>`;
  const state = !n ? ['Kein Training geplant', 'var(--mute)'] : sk && miss === sk ? ['Krankheitspause', '#9a6a00'] : miss === 0 && dm >= ex * .9 ? ['Im Plan', 'var(--ok)'] : miss <= 1 ? ['Leicht im Rückstand', '#9a6a00'] : ['Im Rückstand', '#c0392b'];
  const pr = Math.round(100 * (cw - 1 + (t + 1) / 7) / tot);
  const acts = allActs().filter(a => Date.now() - new Date(a.ts) < 7 * 864e5), s7 = acts.reduce((a, x) => ({n:a.n + 1, sec:a.sec + x.sec, tss:a.tss + x.tss, km:a.km + x.km}), {n:0, sec:0, tss:0, km:0});
  const nx = nxt >= 0 ? plan[nxt] : null, last = S.log && S.log[0];
  return fold('state', foldFlat ? 'Diese Woche' : 'Trainingszustand', `    <div class="grid grid-cols-3 gap-2">${tile(nd + '/' + n, 'Einheiten')}${tile(mm(dm), 'von ' + mm(pm))}${tile(dt, 'TSS von ' + pt)}</div>
    ${bar(dm, pm)}
    <p class="mt-2 text-sm" style="color:var(--mute)">${miss ? (sk ? sk + (sk === 1 ? ' Einheit ist wegen Krankheit entfallen.' : ' Einheiten sind wegen Krankheit entfallen.') : '') + (miss - sk ? ' ' + (miss - sk) + (miss - sk === 1 ? ' Einheit wurde nicht erledigt.' : ' Einheiten wurden nicht erledigt.') : '') + ' Nachholen musst du sie nicht.' : nd && !nx && nd === n ? 'Alle Einheiten dieser Woche sind erledigt.' : nd ? 'Alle bisherigen Einheiten dieser Woche sind erledigt.' : ''}${nx ? ' Als Nächstes: <b style="color:var(--ink)">' + (nxt === t ? 'Heute' : DAYS[nxt]) + ', ' + esc(nx.n) + '</b> (' + mm(nx.m) + ').' : (n && !(nd === n && !miss) ? ' Diese Woche steht keine Einheit mehr an.' : '')}</p>
    <div class="mt-4"><div class="flex items-baseline justify-between text-sm"><span class="font-semibold">Plan-Fortschritt</span><span style="color:var(--mute)">Woche ${cw} von ${tot}, ${P.name}-Phase</span></div>${bar(pr, 100, P.color)}</div>
    <div class="mt-4 text-sm" style="color:var(--mute)"><b style="color:var(--ink)">Fahrten, letzte 7 Tage:</b> ${(S.man || []).length ? (s7.n ? `${s7.n} ${s7.n === 1 ? 'Fahrt' : 'Fahrten'}, ${mm(Math.round(s7.sec / 60))}, ${Math.round(s7.km)} km, TSS ${s7.tss}` : 'keine Fahrten') : 'keine. Lade Fahrten als Datei hoch, damit die App sie mit dem Plan abgleicht.'}</div>
    ${last ? `<div class="mt-2 text-sm" style="color:var(--mute)"><b style="color:var(--ink)">Letzte Anpassung:</b> ${last.title}</div>` : ''}`, true, `<b style="color:${esc(state[1])}">${state[0]}</b>`);
}
/* ---------- Navigation: Startseite mit Kacheln, Unterseiten je Thema ---------- */
let pg = null, foldFlat = false;
let PGP = {};
function goPg(k){ if (pg && !TABS.includes(pg) && k && k !== pg) PGP[k] = pg; else if (k) delete PGP[k]; if (pg == null || TABS.includes(pg)) pgFrom = pg; pg = k || null; open = null; render(); window.scrollTo(0, 0); }
const ICO = {
  week:'<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  state:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  event:'<path d="M5 21V4h11l-2 4 2 4H5"/>',
  overview:'<path d="M3 18h18M5 18V9M10 18V5M15 18v-7M20 18v-4"/>',
  rides:'<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l5-8h4l3 8M9 8h4"/>',
  ex:'<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>',
  export:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  plans:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  science:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
  ms:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  cycle:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 7.4 5"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/>'
};
const tile = (k, t, sub, warn) => `<button class="tile" onclick="goPg('${ja(k)}')"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" style="color:var(--teal)">${ICO[k]}</svg><span class="hd text-lg font-semibold leading-tight">${t}</span><span class="text-xs" style="color:${esc(warn ? warn : 'var(--mute)')}">${sub}</span></button>`;
function chkHead(p){ try { const c = planCheck(p, true); if (c.noDist) return ['Strecke eintragen', 'var(--mute)']; if (c.verdict) return c.ack ? ['Ziel bewusst gewählt', '#9a6a00'] : c.verdict === 'ok' ? ['Auf Kurs', 'var(--ok)'] : c.verdict === 'mid' ? ['Ziel in Reichweite', '#9a6a00'] : ['Ziel braucht Anpassung', '#c2410c']; return c.notes.some(n => n.lv === 2) ? ['Luft nach oben', '#c2410c'] : c.notes.length ? ['Feinschliff möglich', '#9a6a00'] : ['Plan passt', 'var(--ok)']; } catch (e) { elog(e); return ['öffnen', null]; } }
const EXGROUPS = [['Kraft', ['squat', 'rdl', 'bss', 'thrust', 'calf', 'stepup', 'slrdl', 'bridge']], ['Rumpf und Stabilität', ['deadbug', 'pallof', 'sidep', 'plank', 'birddog', 'clam']], ['Mobilität', ['catcow', 'tspine', 'hipflex', 'ham', 'fig4']]];
const exLibrary = () => EXGROUPS.map(([g, ids]) => `<section class="panel p-4"><h2 class="hd text-xl font-semibold">${g}</h2><div class="tgrid mt-3">${ids.filter(id => EXI[id]).map(id => `<button class="tile !p-2" onclick="openEx('${ja(id)}')"><span class="exf">${exAnimSvg(id)}</span><span class="text-sm font-semibold leading-tight">${esc(EXI[id].t)}</span></button>`).join('')}</div></section>`).join('');

/* ---------- Übersicht: anstehende Einheit groß darstellen ---------- */
function openDay(i){ vw = null; pg = 'week'; open = i; render(); setTimeout(() => { const el = document.querySelectorAll('.panel.overflow-hidden')[i]; if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); }, 30); }

let heroTab = null, heroIdx = -1;
function heroOpen(k){ heroTab = heroTab === k ? null : k; render(); }

/* Aktiver Plan oben auf der Übersicht, mit direktem Wechsel */
function planBar(){
  const lib = readLib(), ids = Object.keys(lib.plans), nm = S.pname || planName(S.p);
  const sel = ids.length > 1 ? `<div class="mt-2 flex items-center gap-2"><select class="inp !py-2 text-sm" style="flex:1;min-width:0" aria-label="Plan wechseln" onchange="switchTo(this.value)" data-noi18n>${ids.map(id => `<option value="${esc(id)}"${id === S.pid ? ' selected' : ''}>${esc(lib.plans[id].name)}</option>`).join('')}</select><button class="ghost shrink-0 !px-3 !py-2 text-sm" onclick="goPg('plans')">Verwalten</button></div>` : '';
  return `<div class="p-3" style="background:#fff;border:1px solid var(--line);border-left:4px solid var(--ice)"><div class="flex items-center gap-2"><span class="min-w-0 flex-1"><span class="block text-xs font-semibold" style="color:var(--mute);letter-spacing:.08em;text-transform:uppercase">${ids.length > 1 ? 'Aktiver Plan · ' + ids.length + ' gespeichert' : 'Dein Plan'}</span><span class="block font-semibold" data-noi18n>${esc(nm)}</span></span>${ids.length > 1 ? '' : `<button class="ghost shrink-0 !px-3 !py-1.5 text-sm" onclick="goPg('plans')">Pläne</button>`}</div>${sel}</div>`;
}
function openTab(i, k){ open = i; dtab[strWeek + '-' + i] = k; render(); }

/* Planname im Kopfbereich, antippen öffnet die Planliste */
let planMenu = false;
function planLine(){
  const lib = readLib(), ids = Object.keys(lib.plans), nm = S.pname || planName(S.p);
  const menu = planMenu ? `<div style="width:100%;margin-top:8px;background:#0f2160;border:1px solid rgba(255,255,255,.18)">${ids.map(id => `<button onclick="planMenu=false;${id === S.pid ? 'render()' : `switchTo('${ja(id)}')`}" style="display:flex;width:100%;align-items:center;gap:8px;padding:10px 12px;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;text-align:left;font-size:.9rem"><span style="width:16px;color:var(--ice);font-weight:800">${id === S.pid ? '✓' : ''}</span><span data-noi18n style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${esc(id === S.pid ? 'font-weight:700' : '')}">${esc(lib.plans[id].name)}</span></button>`).join('')}
    <div style="display:flex;gap:16px;padding:10px 12px"><button onclick="planMenu=false;goPg('plans')" style="background:none;border:0;padding:0;color:var(--ice);font-weight:700;font-size:.85rem">Pläne verwalten</button><button onclick="planMenu=false;newPlan()" style="background:none;border:0;padding:0;color:var(--ice);font-weight:700;font-size:.85rem">+ Neuer Plan</button></div></div>` : '';
  return `<div style="width:100%;margin-top:4px"><button onclick="planMenu=!planMenu;render()" aria-expanded="${planMenu}" aria-haspopup="true" style="background:none;border:0;padding:2px 0;color:#9fe3df;font-weight:600;font-size:.85rem;text-align:left;max-width:100%"><span data-noi18n>${esc(nm)}</span> ${planMenu ? '▴' : '▾'}<span style="color:#9fb4c8;font-weight:400"> · ${ids.length} ${ids.length === 1 ? 'Plan' : 'Pläne'}</span></button>${menu}</div>`;
}
/* Kraft- und Mobilitätsübungen als Fenster */
let wkShow = null;
function wkOpen(i, k){ wkShow = {i, k}; render(); }
function wkClose(){ wkShow = null; render(); }
function wkDone(t, i){ const was = t === 'Str' ? (S.strDone || {})[strKey(i)] : (S.mobDone || {})[mobKey(i)]; if (!was) wkShow = null; t === 'Str' ? togStr(i) : togMob(i); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && wkShow && !exOpen) wkClose(); });
function wkModal(){
  if (!wkShow || !S.p) return ''; const {i, k} = wkShow, cur = hasStarted(S.p), inner = k === 'str' ? strBlock(i, cur, true) : mobBlock(i, cur, true);
  if (!inner) { wkShow = null; return ''; }
  const inner2 = inner.replace(/onclick="tog(Str|Mob)\((\d+)\)"/g, (m, t, n) => `onclick="wkDone('${ja(t)}',${ja(n)})"`);
  return `<div class="exov" onclick="if(event.target===this)wkClose()" role="dialog" aria-modal="true"><div class="exbox"><div style="display:flex;justify-content:flex-end;margin-bottom:4px"><button class="ghost !px-3 !py-1.5" onclick="wkClose()">Schließen</button></div><div class="space-y-2 text-sm">${inner2}</div></div></div>`;
}
function wkHero(i, x, sm, mb){
  const ks = [sm ? 'str' : null, mb ? 'mob' : null].filter(Boolean); if (!ks.length) return '';
  if (x.m) return `<div class="mt-3 flex flex-wrap items-center gap-2 text-sm"><span style="opacity:.75">Dazu:</span>${ks.map(k => { const w = wkInfo(i, k); return `<button class="hchip" onclick="wkOpen(${ja(i)},'${ja(k)}')">${mini(k === 'str' ? 'str' : (mb.n === 'Mobilität' ? 'mob' : 'stab'), '#fff')}<span>${esc(w.n)} ${w.m} Min. · Übungen${w.dn ? ' ✓' : ' ›'}</span></button>`; }).join('')}</div>`;
  return `<p class="mt-2 text-sm" style="opacity:.85">${ks.map(k => { const w = wkInfo(i, k); return `${w.c} Übungen · etwa ${w.m} Min.${w.eq}${w.dn ? ' · ✓ erledigt' : ''}`; }).join('<br>')}</p><div class="mt-3 flex flex-wrap gap-2">${ks.map((k, n) => `<button class="hbtn${esc(n ? ' hbtn2' : '')}" onclick="wkOpen(${ja(i)},'${ja(k)}')">${ks.length > 1 ? (k === 'str' ? 'Kraftübungen starten' : esc(mb.n) + ' starten') : 'Übungen starten'}</button>`).join('')}</div>`;
}
const wkInfo = (i, k) => { if (k === 'str') { const s = strMap[i]; return s ? {n:'Kraft', m:s.m, c:s.lines.length + s.core.length, eq:'', dn:(S.strDone || {})[strKey(i)]} : null; } const b = mobMap[i]; return b ? {n:b.n, m:b.m, c:b.ex.length, eq:' · ohne Geräte', dn:(S.mobDone || {})[mobKey(i)]} : null; };
